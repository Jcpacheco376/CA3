import { execFile } from 'child_process';
import path from 'path';

// Ruta al ejecutable compilado
const defaultBridgePath = path.join(process.cwd(), 'bin', 'ZkBridge.exe');
const devBridgePath = path.join(process.cwd(), 'src', 'bin', 'zk-bridge', 'ZkBridge.exe');

// Priorizar Variable de Entorno > Carpeta bin/ > Ruta Legacy (solo para asegurar transición)
const BRIDGE_PATH = process.env.ZK_BRIDGE_PATH ||
    (require('fs').existsSync(defaultBridgePath) ? defaultBridgePath : devBridgePath);

export class ZkDeviceService {

    // --- NÚCLEO DE EJECUCIÓN (Ejecuta el EXE) ---
    private static executeBridge(device: any, command: string, extraArgs: string[] = []): Promise<any> {
        return new Promise((resolve, reject) => {
            const commKey = parseInt(device.PasswordCom) || 0;
            const args = [device.IpAddress, device.Puerto.toString(), commKey.toString(), command, ...extraArgs];

            // Buffer de 10MB para soportar descargas masivas de rostros/logs y timeout de 2 min
            const options = { maxBuffer: 10 * 1024 * 1024, timeout: 120000 };

            console.log(`🚀 [BRIDGE START] Cmd: ${command} -> ${device.IpAddress}`);

            execFile(BRIDGE_PATH, args, options, (error, stdout, stderr) => {
                console.log(`🏁 [BRIDGE END] Cmd: ${command} | Err: ${error ? 'SÍ' : 'NO'} | Stdout Len: ${stdout.length}`);

                if (stderr) console.warn(`⚠️ [BRIDGE WARN]: ${stderr}`);

                if (error) {
                    if ((error as any).code === 'ENOBUFS') return reject(new Error('Buffer excedido (demasiados datos).'));
                    if ((error as any).killed) return reject(new Error('Timeout: El dispositivo no respondió a tiempo.'));
                    return reject(new Error(`Error Bridge: ${error.message}`));
                }

                try {
                    const cleanOutput = stdout.trim();

                    // Si la respuesta está vacía, resolvemos un status genérico (común en comandos void)
                    if (!cleanOutput) return resolve({ status: 'EmptyResponse' });

                    // Buscador de JSON tolerante a ruido (logs de conexión previos al JSON real)
                    const firstBrace = cleanOutput.indexOf('{');
                    const firstBracket = cleanOutput.indexOf('[');
                    let jsonStr = '';

                    // Determinar si es Objeto {} o Array [] y extraerlo limpiamente
                    if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
                        // Es Array [...]
                        const lastBracket = cleanOutput.lastIndexOf(']');
                        if (lastBracket !== -1) jsonStr = cleanOutput.substring(firstBracket, lastBracket + 1);
                    } else if (firstBrace !== -1) {
                        // Es Objeto {...}
                        const lastBrace = cleanOutput.lastIndexOf('}');
                        if (lastBrace !== -1) jsonStr = cleanOutput.substring(firstBrace, lastBrace + 1);
                    }

                    if (jsonStr) {
                        const response = JSON.parse(jsonStr);
                        // Validar error lógico reportado por el Bridge
                        if (response.error && !Array.isArray(response)) return reject(new Error(`ZK Error: ${response.error}`));
                        return resolve(response);
                    }

                    // Caso Especial: Si no es JSON (ej. get_biodata devuelve CSV crudo), devolvemos raw
                    resolve({ status: 'RawData', raw: cleanOutput });

                } catch (e) {
                    console.error(`❌ Parse Error. Raw: ${stdout.substring(0, 100)}...`);
                    reject(new Error('Respuesta corrupta del dispositivo.'));
                }
            });
        });
    }

    // =========================================================================
    // 🛠️ MÉTODOS PÚBLICOS (Mapeo a comandos del Bridge)
    // =========================================================================

    // 1. Diagnóstico y Conexión
    static async testConnection(d: any) { return this.executeBridge(d, 'test_connection'); }
    static async getDebugInfo(d: any) { return this.executeBridge(d, 'get_info'); } // Alias para controller
    static async getInfo(d: any) { return this.executeBridge(d, 'get_info'); }
    static async syncTime(d: any) { return this.executeBridge(d, 'sync_time'); }

    // 2. Gestión de Usuarios (Cosecha Básica)
    static async getAllUsersFromDevice(d: any): Promise<any[]> {
        const res = await this.executeBridge(d, 'get_all_users');
        return Array.isArray(res) ? res : [];
    }
    // Alias
    static async getAllUsers(d: any) { return this.getAllUsersFromDevice(d); }

    // 3. Operaciones Masivas por Archivo (Batch)

    // Sube usuarios (Nombre, Pass, Privilegio, Tarjeta, Huellas simples)
    static async uploadUsersFromFile(d: any, filePath: string) {
        return this.executeBridge(d, 'upload_users_file', [filePath]);
    }
    // Alias
    static async uploadUsersBatch(d: any, filePath: string) { return this.uploadUsersFromFile(d, filePath); }

    // Borra usuarios o admins según lista de UIDs
    static async deleteUsersFromFile(d: any, filePath: string) {
        return this.executeBridge(d, 'delete_users_file', [filePath]);
    }
    // Alias
    static async deleteUsersBatch(d: any, filePath: string) { return this.deleteUsersFromFile(d, filePath); }

    // 4. Gestión Biométrica Avanzada (Tablas y Rostros)

    // Obtiene la tabla Pers_Biotemplate cruda (para un usuario) - Cosecha Rostros
    static async getBioData(d: any, uid: string) {
        return this.executeBridge(d, 'get_biodata', [uid]);
    }

    // Inyecta la tabla Pers_Biotemplate cruda (Subida de Rostros V7/VL)
    static async uploadBioTemplates(d: any, filePath: string) {
        return this.executeBridge(d, 'upload_biotemplates', [filePath]);
    }
    // Alias
    static async uploadBioTable(d: any, filePath: string) { return this.uploadBioTemplates(d, filePath); }

    // Sube rostros método legacy (String/Binario simple) - Opcional/Debug
    static async uploadFacesFromFile(d: any, filePath: string) {
        return this.executeBridge(d, 'upload_faces_file', [filePath]);
    }

    // --- NUEVO: Subir solo huellas (Batch) ---
    static async uploadFingerprintsBatch(d: any, filePath: string) {
        return this.executeBridge(d, 'upload_fingerprints_file', [filePath]);
    }

    static async getFaceDebug(d: any, uid: string) {
        return this.executeBridge(d, 'debug_faces', [uid]);
    }

    // 5. Gestión de Checadas
    static async downloadLogs(d: any): Promise<any[]> {
        const res = await this.executeBridge(d, 'download_logs');
        return Array.isArray(res) ? res : [];
    }
    static async clearLogs(d: any) { return this.executeBridge(d, 'clear_logs'); }

    // 6. Limpieza Específica
    static async clearFaces(d: any) { return this.executeBridge(d, 'clear_faces'); }
    static async clearFingerprints(d: any) { return this.executeBridge(d, 'clear_fingerprints'); }
    static async clearData(d: any) { return this.executeBridge(d, 'clear_data'); }

    // 7. Legado / Compatibilidad (si aún se usan)
    static async deleteUser(d: any, uid: string) {
        return this.executeBridge(d, 'delete_user', [uid]);
    }
    // Para uploads individuales (lento, usar batch preferiblemente)
    static async uploadUserToDevice(d: any, users: any[]) {
        // Implementación legacy si se requiere, pero recomendamos usar uploadUsersFromFile
        console.warn("⚠️ Usando método lento uploadUserToDevice. Preferir uploadUsersFromFile.");
        // ...lógica iterativa...
    }
}