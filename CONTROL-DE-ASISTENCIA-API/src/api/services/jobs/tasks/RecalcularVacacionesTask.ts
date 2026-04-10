import sql from 'mssql';
import { dbConfig } from '../../../../config/database';
import { BaseTask } from './BaseTask';

export class RecalcularVacacionesTask extends BaseTask {

    protected keyInterna(): string {
        return 'CALCULO_ANIVERSARIOS';
    }

    protected async doExecute(): Promise<string | undefined> {
        const pool = await sql.connect(dbConfig);
        const anioActual = new Date().getFullYear();

        await pool.request()
            .input('AnioActual', sql.Int, anioActual)
            .execute('sp_Vacaciones_GenerarSaldosBase');

        // Tambien ejecutamos para el proximo ano en caso de que un empleado
        // requiera que se proyecten sus vacaciones si pide a futuro.
        await pool.request()
            .input('AnioActual', sql.Int, anioActual + 1)
            .execute('sp_Vacaciones_GenerarSaldosBase');

        return `Saldos base y aniversarios calculados correctamente para los anos ${anioActual} y ${anioActual + 1}.`;
    }
}
