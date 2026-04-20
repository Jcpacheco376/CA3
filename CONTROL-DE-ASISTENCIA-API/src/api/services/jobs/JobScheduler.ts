import * as cron from 'node-cron';
import sql from 'mssql';
import { dbConfig } from '../../../config/database';
import { BaseTask } from './tasks/BaseTask';
import { SyncChecadoresTask } from './tasks/SyncChecadoresTask';
import { RecalcularVacacionesTask } from './tasks/RecalcularVacacionesTask';
import { GeneracionAsistenciaTask } from './tasks/GeneracionAsistenciaTask';

class JobScheduler {
    // Mapa interno para guardar los jobs corriendo y su Task (para ejecutarlos manualmente si se requiere)
    private scheduledTasks: Map<string, { job: cron.ScheduledTask, taskInstance: BaseTask }> = new Map();

    public async initialize(): Promise<void> {
        console.log('🔄 Inicializando JobScheduler desde Base de Datos...');

        try {
            // Eliminar jobs previos si estamos recargando
            this.scheduledTasks.forEach(({ job }) => job.stop());
            this.scheduledTasks.clear();

            const pool = await sql.connect(dbConfig);
            const result = await pool.request().execute('sp_CatalogoProcesosAutomaticos_GetAll');

            const procesos = result.recordset;
            let activos = 0;

            for (const proceso of procesos) {
                if (proceso.Activo) {
                    const taskInstance = this.getTaskInstance(proceso.KeyInterna);
                    if (taskInstance) {
                        if (cron.validate(proceso.CronExpression)) {
                            const job = cron.schedule(proceso.CronExpression, () => {
                                taskInstance.execute();
                            });

                            this.scheduledTasks.set(proceso.KeyInterna, { job, taskInstance });
                            activos++;
                            console.log(`   ✔️ Proceso Programado: [${proceso.KeyInterna}] (${proceso.CronExpression})`);
                        } else {
                            console.warn(`   ⚠️ Expresion Cron Invalida para [${proceso.KeyInterna}]: ${proceso.CronExpression}`);
                        }
                    } else {
                        console.warn(`   ⚠️ Tarea No Implementada para KeyInterna: [${proceso.KeyInterna}]`);
                    }
                }
            }

            console.log(`✅ JobScheduler Listo. Total Procesos Activos: ${activos}`);
        } catch (error) {
            console.error('❌ Error al inicializar JobScheduler:', error);
        }
    }

    public async reload(): Promise<void> {
        console.log('🔄 Recargando JobScheduler a peticion...');
        await this.initialize();
    }

    public async executeManual(keyInterna: string): Promise<void> {
        const entry = this.scheduledTasks.get(keyInterna);
        if (entry) {
            // Ya esta en el mapa pero ejecutamos ahora independientemente del cron
            entry.taskInstance.execute();
        } else {
            // Puede que el job no este activo pero igual queramos ejecutarlo
            const taskInstance = this.getTaskInstance(keyInterna);
            if (taskInstance) {
                taskInstance.execute();
            } else {
                throw new Error(`Tarea no encontrada o no implementada para: ${keyInterna}`);
            }
        }
    }

    private getTaskInstance(keyInterna: string): BaseTask | null {
        switch (keyInterna) {
            case 'SYNC_CHECADORES':
                return new SyncChecadoresTask();
            case 'CALCULO_ANIVERSARIOS':
                return new RecalcularVacacionesTask();
            case 'GENERACION_ASISTENCIA':
                return new GeneracionAsistenciaTask();
            default:
                return null;
        }
    }
}

export const jobScheduler = new JobScheduler();
