import sql from 'mssql';
import { dbConfig } from '../../../../config/database';
import { BaseTask } from './BaseTask';
import { ZkDeviceService } from '../../sync/ZkDeviceService';

export class SyncChecadoresTask extends BaseTask {

    protected keyInterna(): string {
        return 'SYNC_CHECADORES';
    }

    protected async doExecute(): Promise<string | undefined> {
        const pool = await sql.connect(dbConfig);

        const result = await pool.request()
            .query("SELECT * FROM Dispositivos WHERE Activo = 1 AND TipoConexion = 'SDK'");

        const dispositivos = result.recordset;

        if (dispositivos.length === 0) {
            return "No se encontraron dispositivos SDK activos.";
        }

        let procesados = 0;
        let errores = 0;

        for (const device of dispositivos) {
            try {
                // Esta funcion internamente maneja sus propios catch no fatales, 
                // asegurate de que no rompa el ciclo principal.
                await ZkDeviceService.downloadLogs(device);
                procesados++;
            } catch (deviceError) {
                console.error(`Error de sincronizacion con dispositivo ID ${device.DispositivoId}:`, deviceError);
                errores++;
            }
        }

        if (errores > 0) {
            throw new Error(`Se intentaron procesar ${dispositivos.length} dispositivos. Errores encontrados: ${errores}`);
        }

        return `Dispositivos sincronizados exitosamente: ${procesados}.`;
    }
}
