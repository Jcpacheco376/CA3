import sql from 'mssql';
import { dbConfig } from '../../../../config/database';
import { BaseTask } from './BaseTask';

export class GeneracionAsistenciaTask extends BaseTask {

    protected keyInterna(): string {
        return 'GENERACION_ASISTENCIA';
    }

    protected async doExecute(): Promise<string | undefined> {
        const pool = await sql.connect(dbConfig);

        await pool.request().execute('sp_Job_GeneracionDiaria_Asistencia');

        return "Fichas de asistencia procesadas correctamente.";
    }
}
