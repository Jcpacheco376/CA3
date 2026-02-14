// src/api/services/sync/ZkDeviceService.ts
import { execFile } from 'child_process';
import path from 'path';

// Ruta al ejecutable compilado
const BRIDGE_PATH = path.join(process.cwd(), 'src', 'bin', 'zk-bridge', 'ZkBridge.exe');

export class ZkDeviceService {
    private static executeBridge(device: any, command: string, extraArgs: string[] = []): Promise<any> {
        return new Promise((resolve, reject) => {
            const commKey = parseInt(device.PasswordCom) || 0;
            const args = [device.IpAddress, device.Puerto.toString(), commKey.toString(), command, ...extraArgs];
            const options = { maxBuffer: 10 * 1024 * 1024, timeout: 60000 };

            // 1. LOG DE INICIO: Confirmamos que Node.js intenta lanzar el proceso
            console.log(`🚀 [BRIDGE START] Comando: ${command} | IP: ${device.IpAddress}`);

            execFile(BRIDGE_PATH, args, options, (error, stdout, stderr) => {
                // 2. LOG DE TERMINACIÓN: El proceso C# terminó (bien o mal)
                console.log(`🏁 [BRIDGE END] Comando: ${command} | Error: ${error ? 'SÍ' : 'NO'} | Stdout Len: ${stdout.length}`);

                if (stderr) console.error(`⚠️ [BRIDGE STDERR]: ${stderr}`);
                
                if (error) {
                    if ((error as any).code === 'ENOBUFS') return reject(new Error('Buffer Exceeded (Demasiados datos).'));
                    if ((error as any).killed) return reject(new Error('Timeout: El checador no respondió en 60s.'));
                    return reject(new Error(`Error de ejecución: ${error.message}`));
                }

                try {
                    const cleanOutput = stdout.trim();
                    
                    // 3. VALIDACIÓN DE RESPUESTA VACÍA
                    if (!cleanOutput) {
                        console.warn(`⚠️ [BRIDGE WARNING] Respuesta vacía del ejecutable.`);
                        return reject(new Error('El Bridge se ejecutó pero no devolvió ninguna respuesta (vacío).'));
                    }

                    // Parseo flexible para JSON o salida raw
                    const firstBrace = cleanOutput.indexOf('{');
                    if (firstBrace !== -1) {
                        const jsonStr = cleanOutput.substring(firstBrace);
                        // Intentamos parsear. Si falla, mostramos el string crudo para debug.
                        try {
                            const response = JSON.parse(jsonStr);
                            if (response.error && !Array.isArray(response)) return reject(new Error(`ZKTeco Error: ${response.error}`));
                            return resolve(response);
                        } catch (parseError) {
                            console.error(`❌ [JSON PARSE ERROR] String recibido: ${jsonStr.substring(0, 100)}...`);
                            // En lugar de rechazar, devolvemos raw para que tú veas qué llegó
                            return resolve({ status: 'RawData', raw: cleanOutput });
                        }
                    }
                    
                    // Si no tiene llaves JSON, devolvemos raw
                    resolve({ status: 'RawOutput', raw: cleanOutput });
                } catch (e) { 
                    reject(new Error('Error procesando respuesta del Bridge.')); 
                }
            });
        });
    }


    // Método genérico para llamar al puente C#
    // private static executeBridge(device: any, command: string, extraArgs: string[] = []): Promise<any> {
    //     return new Promise((resolve, reject) => {
    //         const commKey = parseInt(device.PasswordCom) || 0;
    //         const args = [device.IpAddress, device.Puerto.toString(), commKey.toString(), command, ...extraArgs];

    //         execFile(BRIDGE_PATH, args, (error, stdout, stderr) => {
    //             // --- DEBUGGING EXTREMO ---
    //             if (stderr) {
    //                 console.log(`🔴 [BRIDGE INTERNO]: \n${stderr}`); // Veremos los logs RAW del C#
    //             }
    //             // -------------------------

    //             if (error) {
    //                 console.error(`❌ Error ZkBridge Exec: ${error.message}`);
    //                 return reject(new Error('Error interno al ejecutar el puente.'));
    //             }
    //             try {
    //                 console.log(`📦 [BRIDGE JSON]: ${stdout.substring(0, 100)}...`); // Veremos el principio del JSON
    //                 const response = JSON.parse(stdout.trim());
    //                 if (response.error) return reject(new Error(`ZKTeco: ${response.error}`));
    //                 resolve(response);
    //             } catch (e) {
    //                 console.error(`❌ JSON Inválido: ${stdout}`);
    //                 reject(new Error('Respuesta corrupta.'));
    //             }
    //         });
    //     });
    // }
    static async syncTime(device: any) {
        console.log(`⏱️ Sincronizando hora de ${device.Nombre} con el servidor...`);
        // Llama al comando nuevo del Bridge
        return await this.executeBridge(device, 'sync_times');
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
    static async uploadUsersFromFile(device: any, filePath: string) {
        return await this.executeBridge(device, 'upload_users_file', [filePath]);
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
    static async uploadFacesFromFile(device: any, filePath: string) {
        console.log(`📡 Subiendo rostros a ${device.Nombre}...`);
        return await this.executeBridge(device, 'upload_faces_file', [filePath]);
    }
    static async deleteUsersFromFile(device: any, filePath: string) {
        console.log(`🗑️ Eliminando usuarios de ${device.Nombre}...`);
        return await this.executeBridge(device, 'delete_users_file', [filePath]);
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
        static async uploadBioTemplates(device: any, filePath: string) {
        console.log(`🧬 Inyectando tabla biométrica a ${device.Nombre}...`);
        return await this.executeBridge(device, 'upload_biotemplates', [filePath]);
    }
        static async getFaceDebug(device: any, uid: string): Promise<any[]> {
        console.log(`🕵️‍♀️ Investigando rostros para UID ${uid} en ${device.Nombre}...`);
        const faces = await this.executeBridge(device, 'debug_faces', [uid]);
        return Array.isArray(faces) ? faces : [];
    }
static async getBioData(device: any, uid: string) {
        console.log(`🔍 [SERVICE] Solicitando get_biodata para UID ${uid}...`);
        try {
            const result = await this.executeBridge(device, 'get_biodata', [uid]);
            
            // --- AGREGADO: MOSTRAR LOS DATOS ---
            if (result.raw_data) {
                console.log(`📦 [DATA RAW] Longitud: ${result.raw_data.length}`);
                console.log(`👇 --- INICIO DE DATOS DEL CHECADOR --- 👇`);
                // Imprimimos los primeros 2000 caracteres para no saturar, pero suficiente para ver el formato
                console.log(result.raw_data.substring(0, 5000) + (result.raw_data.length > 5000 ? '... [TRUNCADO]' : ''));
                console.log(`👆 --- FIN DE DATOS DEL CHECADOR --- 👆`);
            } else {
                console.log(`📦 [DATA OBJECT]`, JSON.stringify(result, null, 2));
            }
            // -----------------------------------

            console.log(`✅ [SERVICE] Respuesta recibida. Status: ${result.status || 'OK'}`);
            return result;
        } catch (error: any) {
            console.error(`❌ [SERVICE ERROR] Falló getBioData: ${error.message}`);
            throw error; // Re-lanzar para que el controller lo capture
        }
    }

}