// src/api/services/sync/ZkDeviceService.ts
import { execFile } from 'child_process';
import path from 'path';

// Ruta al ejecutable compilado
const BRIDGE_PATH = path.join(process.cwd(), 'src', 'bin', 'zk-bridge', 'ZkBridge.exe');

export class ZkDeviceService {

    // Método genérico para llamar al puente C#
    private static executeBridge(device: any, command: string, extraArgs: string[] = []): Promise<any> {
        return new Promise((resolve, reject) => {
            const commKey = parseInt(device.PasswordCom) || 0;
            const args = [device.IpAddress, device.Puerto.toString(), commKey.toString(), command, ...extraArgs];
            
            execFile(BRIDGE_PATH, args, (error, stdout, stderr) => {
                // --- DEBUGGING EXTREMO ---
                if (stderr) {
                    console.log(`🔴 [BRIDGE INTERNO]: \n${stderr}`); // Veremos los logs RAW del C#
                }
                // -------------------------

                if (error) {
                    console.error(`❌ Error ZkBridge Exec: ${error.message}`);
                    return reject(new Error('Error interno al ejecutar el puente.'));
                }
                try {
                    console.log(`📦 [BRIDGE JSON]: ${stdout.substring(0, 100)}...`); // Veremos el principio del JSON
                    const response = JSON.parse(stdout.trim());
                    if (response.error) return reject(new Error(`ZKTeco: ${response.error}`));
                    resolve(response);
                } catch (e) {
                    console.error(`❌ JSON Inválido: ${stdout}`);
                    reject(new Error('Respuesta corrupta.'));
                }
            });
        });
    }
    static async syncTime(device: any) {
        console.log(`⏱️ Sincronizando hora de ${device.Nombre} con el servidor...`);
        // Llama al comando nuevo del Bridge
        return await this.executeBridge(device, 'sync_time');
    }
    // Obtener logs crudos (El controlador decidirá qué hacer con ellos)
    static async downloadLogs(device: any): Promise<any[]> {
        console.log(`📡 Conectando a ${device.Nombre} (${device.IpAddress}) para descargar logs...`);
        const result = await this.executeBridge(device, 'download_logs');

        // Validamos que sea un array
        if (Array.isArray(result)) {
            return result;
        }
        return [];
    }

    // Borrar logs del dispositivo (Solo si el controlador lo ordena)
    static async clearLogs(device: any) {
        return await this.executeBridge(device, 'clear_logs');
    }

    static async testConnection(device: any) {
        return await this.executeBridge(device, 'test_connection');
    }

    static async getDebugInfo(device: any) {
        return await this.executeBridge(device, 'get_info');
    }
    static async getAllUsersFromDevice(device: any): Promise<any[]> {
        console.log(`📡 Downloading users from ${device.Nombre}...`);
        const users = await this.executeBridge(device, 'get_all_users');
        if (Array.isArray(users)) return users;
        return [];
    }
    static async deleteUsersFromDevice(device: any, uids: string[]) {
        for (const uid of uids) {
            await this.executeBridge(device, 'delete_user', [uid]);
        }
    }

    // Upload users (Push to device)
    static async uploadUsersToDevice(device: any, users: any[]) {
        console.log(`📤 Uploading ${users.length} users to ${device.Nombre}...`);

        for (const user of users) {
            // FORMAT: UID|NAME|PRIVILEGE|PASSWORD|FACE_TMP|FINGER_0:TMP|FINGER_1:TMP...

            let dataString = `${user.uid}|${user.name}|${user.privilege}|${user.password}`;

            // Add Face (or null)
            dataString += `|${user.face || 'null'}`;

            // Add Fingers
            if (user.fingers && Array.isArray(user.fingers)) {
                for (const f of user.fingers) {
                    dataString += `|${f.index}:${f.template}`;
                }
            }

            // Execute one by one
            try {
                await this.executeBridge(device, 'upload_user', [dataString]);
            } catch (e) {
                console.error(`   ❌ Failed to upload user ${user.uid}:`, e);
            }
        }
    }
}