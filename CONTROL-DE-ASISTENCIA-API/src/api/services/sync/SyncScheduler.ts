import cron from 'node-cron';
import sql from 'mssql';
import { dbConfig } from '../../../config/database';
import { ZkDeviceService } from './ZkDeviceService';

let isRunning = false;
let lastRunTime = 0;

export const startSyncScheduler = () => {
    // Verificación cada minuto
    cron.schedule('* * * * *', async () => {
        
        if (isRunning) return;

        try {
            const pool = await sql.connect(dbConfig);
            
            // --- CORRECCIÓN: Usamos tus campos reales ---
            const configResult = await pool.request()
                .input('Key', sql.NVarChar, 'SyncChecadorMinutos') // <--- Tu llave correcta
                .query("SELECT ConfigValue FROM SISConfiguracion WHERE ConfigKey = @Key");

            const valorConfig = configResult.recordset[0]?.ConfigValue || '0'; // <--- Tu campo correcto
            const intervaloMinutos = parseInt(valorConfig, 10);

            // Si es 0, está apagado la descarga automática
            if (isNaN(intervaloMinutos) || intervaloMinutos <= 0) {
                return;
            }

            // Verificar tiempo transcurrido
            const ahora = Date.now();
            const tiempoTranscurridoMinutos = (ahora - lastRunTime) / 1000 / 60;

            if (tiempoTranscurridoMinutos < intervaloMinutos) {
                return;
            }

            // ==========================================
            // EJECUTAR: DESCARGA DE CHECADAS
            // ==========================================
            // Nota: Según tu definición, esto es "Descarga", no "Sincronización Compleja".
            isRunning = true;
            console.log(`⏰ Iniciando Descarga Automática de Checadas (Intervalo: ${intervaloMinutos} min)`);
            
            const result = await pool.request()
                .query("SELECT * FROM Dispositivos WHERE Activo = 1 AND TipoConexion = 'SDK'");
            
            const dispositivos = result.recordset;

            if (dispositivos.length > 0) {
                for (const device of dispositivos) {
                    // Llamamos a la función de descarga (que actualmente se llama syncDevice, 
                    // pronto deberíamos renombrarla a downloadLogs para ser consistentes)
                    await ZkDeviceService.downloadLogs(device);
                }
            }

            lastRunTime = Date.now();

        } catch (err) {
            console.error('❌ Error en Scheduler:', err);
        } finally {
            isRunning = false;
        }
    });
    
    console.log('✅ Scheduler Iniciado (Controlado por DB: SyncChecadorMinutos)');
};