import { execFile } from 'child_process';
import path from 'path';
import sql from 'mssql';
import { dbConfig } from '../../../config/database';
import fs from 'fs'; // Necesitamos fs para manejar carpetas si hace falta

const BRIDGE_PATH = path.join(process.cwd(), 'src', 'bin', 'zk-bridge', 'ZkBridge.exe');

export class ZkDeviceService {

    private static executeBridge(device: any, command: string, extraArgs: string[] = []): Promise<any> {
        return new Promise((resolve, reject) => {
            const commKey = parseInt(device.PasswordCom) || 0;
            const args = [device.IpAddress, device.Puerto.toString(), commKey.toString(), command, ...extraArgs];
            
            execFile(BRIDGE_PATH, args, (error, stdout, stderr) => {
                // Si hay error de ejecución del EXE
                if (error) {
                    console.error(`❌ Error ZkBridge: ${error.message}`);
                    return reject(new Error('Error interno del puente C#'));
                }
                try {
                    // El bridge siempre devuelve JSON, incluso en error lógico
                    const response = JSON.parse(stdout.trim());
                    if (response.error) return reject(new Error(`ZKTeco: ${response.error}`));
                    resolve(response);
                } catch (e) {
                    console.error(`❌ JSON Inválido: ${stdout}`);
                    reject(new Error('Respuesta corrupta del equipo.'));
                }
            });
        });
    }

    // =======================================================================
    // 🧪 TEST CONEXIÓN
    // =======================================================================
    static async testConnection(device: any) {
        try {
            console.log(`\n🕵️‍♂️ [TEST] Conectando a: ${device.Nombre} (Vía SDK Oficial)...`);

            // Pasamos el objeto 'device' completo para sacar la pass adentro
            const result = await this.executeBridge(device, 'test_connection');

            console.log(`   ✅ Conexión Exitosa: ${result.message}`);
            await this.updateStatus(device.DispositivoId, 'Conectado');
            return true;
        } catch (error: any) {
            console.error(`   🔴 Error Test: ${error.message}`);
            await this.updateStatus(device.DispositivoId, 'Error');
            throw error;
        }
    }

    // =======================================================================
    // 📥 DESCARGA DE LOGS
    // =======================================================================
    static async downloadLogs(device: any) {
        try {
            console.log(`\n📥 [DESCARGA] Iniciando para: ${device.Nombre} (Vía SDK Oficial)`);

            const logsData = await this.executeBridge(device, 'download_logs');

            console.log(`   ✅ ÉXITO: Recibidos ${logsData.length} registros.`);

            if (logsData.length > 0) {
                console.log(`   🔎 Ejemplo: ${JSON.stringify(logsData[0])}`);
                await this.saveLogs(device.DispositivoId, logsData);
            } else {
                console.log("   ℹ️ 0 registros nuevos.");
            }

            await this.updateStatus(device.DispositivoId, 'Conectado');

        } catch (error: any) {
            console.error(`   ❌ Error Descarga: ${error.message}`);
            await this.updateStatus(device.DispositivoId, 'Error');
            throw error;
        }
    }

    // ... (El resto de métodos getDebugInfo, updateStatus, saveLogs igual que antes) ...
    // Solo asegurate de copiar los métodos helpers que ya tenías.

    // Helper saveLogs (simplificado para el ejemplo)
    private static async saveLogs(deviceId: number, logsData: any[]) {
        const pool = await sql.connect(dbConfig);
        let count = 0;
        for (const log of logsData) {
            const uid = parseInt(log.uid);
            const date = new Date(log.time);
            if (!isNaN(uid)) {
                await pool.request()
                    .input('UID', uid).input('DT', date)
                    .query(`IF NOT EXISTS(SELECT 1 FROM Checadas WHERE UsuarioId=@UID AND FechaHora=@DT) 
                            INSERT INTO Checadas(UsuarioId, FechaHora, Origen) VALUES(@UID, @DT, 'Reloj')`);
                count++;
            }
        }
        if (count > 0) console.log(`   💾 Guardados ${count} registros.`);
    }

    private static async updateStatus(id: number, status: string) {
        // ... tu código de siempre
    }

static async getDebugInfo(device: any) {
        try {
            console.log(`\n🔎 [DIAGNÓSTICO] Consultando a: ${device.Nombre}...`);
            
            // 1. Llamar al C# para obtener toda la info
            const info = await this.executeBridge(device, 'get_info');
            
            // 2. Actualizar la BD con lo que encontramos
            await this.updateDeviceStats(device.DispositivoId, info);

            console.log(`   ✅ Diagnóstico guardado. Firmware: ${info.firmware}, Usuarios: ${info.users}`);
            
            return info; // Retornar al frontend
        } catch (error: any) {
            console.error(`   🔴 Error Diagnóstico: ${error.message}`);
            await this.updateStatus(device.DispositivoId, 'Error');
            return { status: 'ERROR', error: error.message };
        }
    }
   private static async updateDeviceStats(id: number, info: any) {
        try {
            const pool = await sql.connect(dbConfig);
            
            // SOLUCIÓN UNIVERSAL DE HORA:
            // 1. Verificamos si vino una hora válida del C#
            // 2. Si existe, la pasamos DIRECTO como string. NO usamos new Date().
            // 3. Si no existe (string vacío), pasamos null.
            const rawTime = (info.device_time && info.device_time.length > 5) ? info.device_time : null;

            await pool.request()
                .input('Id', id)
                .input('Fw', info.firmware || '')
                .input('Sn', info.serial || '')
                .input('Plat', info.platform || '')
                .input('Users', info.users || 0)
                .input('Fingers', info.fingers || 0)
                .input('Faces', info.faces || 0)
                .input('Recs', info.records || 0)
                // ALERTA: Pasamos el string directo, SQL Server hará el cast local sin sumar horas UTC
                .input('DevTime', sql.VarChar, rawTime) 
                .query(`
                    UPDATE Dispositivos SET 
                        Estado='Conectado', 
                        UltimaSincronizacion=GETDATE(),
                        Firmware=@Fw,
                        NumeroSerie=@Sn,
                        Plataforma=@Plat,
                        TotalUsuarios=@Users,
                        TotalHuellas=@Fingers,
                        TotalRostros=@Faces,
                        TotalRegistros=@Recs,
                        HoraDispositivo=@DevTime
                    WHERE DispositivoId=@Id
                `);
                
            console.log(`   💾 Stats actualizados. Hora Reloj (Raw): ${rawTime}`);

        } catch (e: any) {
            console.error("   ⚠️ No se pudo actualizar DB stats:", e.message);
        }
    }
    // static async downloadPhotos(device: any) {
    //     try {
    //         console.log(`\n📸 [FOTOS] Buscando fotos en: ${device.Nombre}...`);

    //         // 1. Definir dónde guardarlas
    //         // Ej: src/public/photos/ID_DEVICE/
    //         const photoDir = path.join(process.cwd(), 'public', 'photos', device.DispositivoId.toString());
            
    //         // Creamos la carpeta si no existe (Node.js side)
    //         if (!fs.existsSync(photoDir)){
    //             fs.mkdirSync(photoDir, { recursive: true });
    //         }

    //         // 2. Llamar al Bridge
    //         // Enviamos la ruta absoluta al C#
    //         const result = await this.executeBridge(device, 'download_photos', [photoDir]);

    //         console.log(`   ✅ Resultado: ${result.message}`);
    //         return result;

    //     } catch (error: any) {
    //         console.error(`   ❌ Error Fotos: ${error.message}`);
    //         // No lanzamos throw para no detener otros procesos, solo logueamos
    //         return { status: 'ERROR', error: error.message };
    //     }
    // }
    static async captureRemoteImage(device: any) {
        try {
            console.log(`\n📸 [SNAPSHOT] Intentando captura en: ${device.Nombre}...`);

            // Nombre de archivo único con timestamp
            const fileName = `snap_${device.DispositivoId}_${Date.now()}.jpg`;
            const photoPath = path.join(process.cwd(), 'public', 'snapshots', fileName);
            
            // Asegurar carpeta
            const dir = path.dirname(photoPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

            // Llamar al Bridge
            const result = await this.executeBridge(device, 'capture_image', [photoPath]);

            // Devolvemos la ruta relativa para que el frontend la pueda mostrar
            return { success: true, url: `/snapshots/${fileName}` };

        } catch (error: any) {
            console.error(`   ❌ Error Snapshot: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
    static async syncEmployeesToDevice(device: any) { return true; }
}