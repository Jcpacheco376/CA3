import sql from 'mssql';
import { dbConfig } from '../../../../config/database';
import { BaseTask } from './BaseTask';

// Config con timeout extendido para este proceso (8 minutos)
const dbConfigLarga = { ...dbConfig, requestTimeout: 8 * 60 * 1000 };

export class GeneracionAsistenciaTask extends BaseTask {

    // Mutex estático: evita ejecuciones concurrentes si el SP tarda más que el intervalo del cron
    private static isRunning = false;

    protected keyInterna(): string {
        return 'GENERACION_ASISTENCIA';
    }

    protected async doExecute(): Promise<string | undefined> {
        if (GeneracionAsistenciaTask.isRunning) {
            return 'Omitido: una ejecución anterior todavía está en progreso.';
        }

        GeneracionAsistenciaTask.isRunning = true;
        let pool: sql.ConnectionPool | null = null;
        try {
            // Instanciar un pool aislado para no chocar ni reconfigurar el pool global
            pool = await new sql.ConnectionPool(dbConfigLarga).connect();

            // Definir periodo de procesamiento (ej. ventana de los últimos 2 días para cubrir cierres nocturnos)
            const hoy = new Date();
            const fechaInicio = new Date();
            fechaInicio.setDate(hoy.getDate() - 2);

            // 1. Regenerar asistencia para todos los empleados activos
            // Ejecutamos el SP principal de regeneración masiva con 0 (para todos)
            await pool.request()
                .input('FechaInicio', sql.Date, fechaInicio)
                .input('FechaFin', sql.Date, hoy)
                .input('UsuarioId', sql.Int, 1) // 1=Sistema
                .input('EmpleadoId', sql.Int, 0) // 0=Todos
                .execute('sp_FichasAsistencia_ProcesarChecadas');

            return 'Fichas de asistencia procesadas correctamente.';
        } finally {
            if (pool) {
                try { await pool.close(); } catch (e) { console.error('Error cerrando pool largo', e); }
            }
            GeneracionAsistenciaTask.isRunning = false;
        }
    }
}
