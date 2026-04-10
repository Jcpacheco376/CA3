import sql from 'mssql';
import { dbConfig } from '../../../../config/database';

export abstract class BaseTask {
    protected abstract keyInterna(): string;
    protected abstract doExecute(): Promise<string | undefined>;

    public async execute(): Promise<void> {
        let bitacoraId: number | null = null;
        try {
            console.log(`⏱️ Iniciando Proceso: ${this.keyInterna()}...`);

            const pool = await sql.connect(dbConfig);

            // Log Start
            const request = pool.request()
                .input('KeyInterna', sql.NVarChar, this.keyInterna())
                .input('MensajeLog', sql.NVarChar, `Ejecución iniciada por JobScheduler`)
                .output('BitacoraId', sql.Int);

            const logResult = await request.execute('sp_BitacoraProcesosAutomaticos_LogStart');
            bitacoraId = request.parameters.BitacoraId.value;

            // Do the specific work
            const logMessage = await this.doExecute();

            // Log Success
            if (bitacoraId) {
                await pool.request()
                    .input('BitacoraId', sql.Int, bitacoraId)
                    .input('Estatus', sql.NVarChar, 'Exito')
                    .input('MensajeLog', sql.NVarChar, logMessage || 'Proceso finalizado con exito.')
                    .execute('sp_BitacoraProcesosAutomaticos_LogEnd');
            }

            console.log(`✅ Proceso Finalizado: ${this.keyInterna()}`);

        } catch (error: any) {
            console.error(`❌ Error en Proceso ${this.keyInterna()}:`, error);

            if (bitacoraId) {
                try {
                    const pool = await sql.connect(dbConfig);
                    await pool.request()
                        .input('BitacoraId', sql.Int, bitacoraId)
                        .input('Estatus', sql.NVarChar, 'Error')
                        .input('MensajeLog', sql.NVarChar, `Error: ${error.message || error}`)
                        .execute('sp_BitacoraProcesosAutomaticos_LogEnd');
                } catch (e) {
                    console.error('Failed to log error to bitacora:', e);
                }
            }
        }
    }
}
