using System;
using System.Text;
using System.IO;
using System.Collections.Generic; 

namespace ZkBridge
{
    class Program
    {
        public static zkemkeeper.CZKEM axCZKEM1 = new zkemkeeper.CZKEM();

        // Buffer necesario para capturas de imagen (1MB)
        public static byte[] map = new byte[1024 * 1024];

        static void Main(string[] args)
        {
            if (args.Length < 4) { Console.WriteLine("{\"error\": \"Args insuficientes\"}"); return; }

            string ip = args[0];
            int port = int.Parse(args[1]);
            int commKey = int.Parse(args[2]);
            string command = args[3];

            // Configurar password antes de conectar
            axCZKEM1.SetCommPassword(commKey);

            if (axCZKEM1.Connect_Net(ip, port))
            {
                try
                {
                    switch (command)
                    {
                        case "dump_config":
                            DumpConfig(1);
                            break;
                        case "download_logs": 
                            DownloadLogs(1); 
                            break;

                        case "clear_logs":
                            ClearLogs(1);
                            break;
                        case "get_all_users": GetAllUsers(1); break;

                        case "upload_user":
                            // Usage: ZkBridge.exe IP Port Key upload_user JSON_DATA
                            // JSON_DATA must be a stringified JSON passed as the 5th argument
                            if (args.Length >= 5) UploadUser(1, args[4]);
                            else Console.WriteLine("{\"error\": \"Missing JSON data for user\"}");
                            break;

                        case "delete_user":
                            // Usage: ZkBridge.exe IP Port Key delete_user UID
                            if (args.Length >= 5) DeleteUser(1, args[4]);
                            else Console.WriteLine("{\"error\": \"Missing UID\"}");
                            break;
                        case "test_connection": Console.WriteLine("{\"status\": \"OK\", \"message\": \"Conexión Exitosa\"}"); break;

                        case "get_info": GetDeviceInfo(1); break;

                        case "capture_image":
                            if (args.Length >= 5) CaptureScreenshot(1, args[4]);
                            else Console.WriteLine("{\"error\": \"Falta ruta de destino\"}");
                            break;

                        case "set_param":
                            if (args.Length >= 6) SetParam(1, args[4], args[5]);
                            else Console.WriteLine("{\"error\": \"Faltan parametros\"}");
                            break;

                        case "download_photos":
                            if (args.Length >= 5) DownloadPhotos(1, args[4]);
                            else Console.WriteLine("{\"error\": \"Falta la ruta de destino\"}");
                            break;
                        case "get_param":
                            // Uso: ZkBridge.exe IP Port Key get_param CaptureErrorImage
                            if (args.Length >= 5) GetParam(1, args[4]);
                            else Console.WriteLine("{\"error\": \"Falta el nombre del parametro\"}");
                            break;

                        case "sync_time":
                            if (axCZKEM1.SetDeviceTime(1)) // Sincroniza con la hora del PC (Servidor)
                            {
                                axCZKEM1.RefreshData(1);
                                Console.WriteLine("{\"status\": \"OK\", \"message\": \"Hora sincronizada con el servidor\"}");
                            }
                            else
                            {
                                int err = 0; axCZKEM1.GetLastError(ref err);
                                Console.WriteLine($"{{\"error\": \"Fallo al sincronizar hora. Error: {err}\"}}");
                            }
                            break;

                        default: Console.WriteLine("{\"error\": \"Comando desconocido: " + command + "\"}"); break;
                    }
                }
                catch (Exception ex) { Console.WriteLine("{\"error\": \"" + CleanString(ex.Message) + "\"}"); }
                finally { axCZKEM1.Disconnect(); }
            }
            else
            {
                int err = 0; axCZKEM1.GetLastError(ref err);
                Console.WriteLine("{\"error\": \"No conecta. ErrorCode: " + err + "\"}");
            }
        }

        // --- FUNCIONES ---

        static void GetDeviceInfo(int iMachineNumber)
        {
            string sFirmware = "", sSerial = "", sPlatform = "";
            axCZKEM1.GetFirmwareVersion(iMachineNumber, ref sFirmware);
            axCZKEM1.GetSerialNumber(iMachineNumber, out sSerial);
            axCZKEM1.GetPlatform(iMachineNumber, ref sPlatform);

            int iUserCount = 0, iFingerCount = 0, iFaceCount = 0, iRecordCount = 0;
            int val = 0;
            if (axCZKEM1.GetDeviceStatus(iMachineNumber, 6, ref val)) iUserCount = val;
            if (axCZKEM1.GetDeviceStatus(iMachineNumber, 2, ref val)) iFingerCount = val;
            if (axCZKEM1.GetDeviceStatus(iMachineNumber, 21, ref val)) iFaceCount = val;
            if (axCZKEM1.GetDeviceStatus(iMachineNumber, 12, ref val)) iRecordCount = val;

            string sDeviceTime = "";
            int idwYear = 0, idwMonth = 0, idwDay = 0, idwHour = 0, idwMinute = 0, idwSecond = 0;
            if (axCZKEM1.GetDeviceTime(iMachineNumber, ref idwYear, ref idwMonth, ref idwDay, ref idwHour, ref idwMinute, ref idwSecond))
            {
                sDeviceTime = $"{idwYear}-{idwMonth:D2}-{idwDay:D2} {idwHour:D2}:{idwMinute:D2}:{idwSecond:D2}";
            }

            // CORRECCIÓN JSON: Usamos camelCase para coincidir con tu Frontend (React)
            StringBuilder json = new StringBuilder();
            json.Append("{");
            json.Append($"\"status\": \"OK\",");
            json.Append($"\"firmware\": \"{CleanString(sFirmware)}\",");
            json.Append($"\"serial\": \"{CleanString(sSerial)}\",");
            json.Append($"\"platform\": \"{CleanString(sPlatform)}\",");

            // Aquí arreglamos los UNDEFINED:
            json.Append($"\"deviceTime\": \"{sDeviceTime}\","); // Antes device_time
            json.Append($"\"userCount\": {iUserCount},");       // Antes users

            json.Append($"\"fingers\": {iFingerCount},");
            json.Append($"\"faces\": {iFaceCount},");
            json.Append($"\"records\": {iRecordCount}");
            json.Append("}");
            Console.WriteLine(json.ToString());
        }

        static void DownloadLogs(int iMachineNumber)
        {
            axCZKEM1.EnableDevice(iMachineNumber, false);
            string sdwEnrollNumber = "";
            int idwVerifyMode = 0, idwInOutMode = 0, idwYear = 0, idwMonth = 0, idwDay = 0, idwHour = 0, idwMinute = 0, idwSecond = 0, idwWorkcode = 0;

            if (axCZKEM1.ReadGeneralLogData(iMachineNumber))
            {
                StringBuilder json = new StringBuilder();
                json.Append("[");
                bool first = true;
                while (axCZKEM1.SSR_GetGeneralLogData(iMachineNumber, out sdwEnrollNumber, out idwVerifyMode,
                           out idwInOutMode, out idwYear, out idwMonth, out idwDay, out idwHour, out idwMinute, out idwSecond, ref idwWorkcode))
                {
                    if (!first) json.Append(",");
                    string dt = $"{idwYear}-{idwMonth:D2}-{idwDay:D2} {idwHour:D2}:{idwMinute:D2}:{idwSecond:D2}";
                    // status = InOutMode (0=Entrada, 1=Salida, etc), verify = Metodo (Huella, Rostro)
                    json.Append($"{{\"uid\":\"{sdwEnrollNumber}\",\"time\":\"{dt}\",\"status\":{idwInOutMode},\"verify\":{idwVerifyMode}}}");
                    first = false;
                }
                json.Append("]");
                Console.WriteLine(json.ToString());
            }
            else { Console.WriteLine("[]"); }
            axCZKEM1.EnableDevice(iMachineNumber, true);
        }
        static void ClearLogs(int iMachineNumber)
        {
            axCZKEM1.EnableDevice(iMachineNumber, false);
            // ClearGLog borra SOLO los registros de asistencia, no borra usuarios ni huellas.
            if (axCZKEM1.ClearGLog(iMachineNumber))
            {
                axCZKEM1.RefreshData(iMachineNumber);
                Console.WriteLine("{\"status\": \"OK\", \"message\": \"Registros borrados correctamente\"}");
            }
            else
            {
                int err = 0; axCZKEM1.GetLastError(ref err);
                Console.WriteLine($"{{\"error\": \"No se pudieron borrar los registros. Error: {err}\"}}");
            }
            axCZKEM1.EnableDevice(iMachineNumber, true);
        }
        static void CaptureScreenshot(int iMachineNumber, string destPath)
        {
            try
            {
                // CORRECCIÓN BUFFER: Pasamos ref map[0]
                if (axCZKEM1.CaptureImage(false, 0, 0, ref map[0], destPath))
                    Console.WriteLine($"{{\"status\": \"OK\", \"message\": \"Captura exitosa\", \"path\": \"{CleanString(destPath)}\"}}");
                else
                {
                    int err = 0; axCZKEM1.GetLastError(ref err);
                    Console.WriteLine($"{{\"error\": \"Fallo captura. ErrorCode: {err}\"}}");
                }
            }
            catch (Exception ex) { Console.WriteLine($"{{\"error\": \"Excepción: {CleanString(ex.Message)}\"}}"); }
        }

        static void SetParam(int iMachineNumber, string paramName, string paramValue)
        {
            try
            {
                if (axCZKEM1.SetSysOption(iMachineNumber, paramName, paramValue))
                {
                    axCZKEM1.RefreshData(iMachineNumber);
                    Console.WriteLine($"{{\"status\": \"OK\", \"message\": \"Parámetro {paramName} actualizado a {paramValue}\"}}");
                }
                else
                {
                    int err = 0; axCZKEM1.GetLastError(ref err);
                    Console.WriteLine($"{{\"error\": \"No se pudo establecer {paramName}. Error: {err}\"}}");
                }
            }
            catch (Exception ex) { Console.WriteLine($"{{\"error\": \"Excepción: {CleanString(ex.Message)}\"}}"); }
        }

        static void DownloadPhotos(int iMachineNumber, string destFolder)
        {
            try
            {
                if (!Directory.Exists(destFolder)) Directory.CreateDirectory(destFolder);

                // PASO 0: HACK DE CONFIGURACIÓN (Forzar persistencia)
                // Desactivamos UploadPhoto silenciosamente para asegurar que las SIGUIENTES fotos se guarden
                axCZKEM1.SetSysOption(iMachineNumber, "UploadPhoto", "0");
                axCZKEM1.RefreshData(iMachineNumber);

                axCZKEM1.EnableDevice(iMachineNumber, false);
                Console.WriteLine("{\"message\": \"[MODO FUERZA BRUTA] 1. UploadPhoto desactivado. 2. Leyendo TODOS los logs...\"}");

                string sdwEnrollNumber = "";
                int idwVerifyMode = 0, idwInOutMode = 0, idwYear = 0, idwMonth = 0, idwDay = 0, idwHour = 0, idwMinute = 0, idwSecond = 0, idwWorkcode = 0;
                int found = 0;

                // PASO 1: Usamos ReadAllGLogData (Más lento pero compatible con todos los firmwares)
                if (axCZKEM1.ReadAllGLogData(iMachineNumber))
                {
                    while (axCZKEM1.SSR_GetGeneralLogData(iMachineNumber, out sdwEnrollNumber, out idwVerifyMode,
                               out idwInOutMode, out idwYear, out idwMonth, out idwDay, out idwHour, out idwMinute, out idwSecond, ref idwWorkcode))
                    {
                        // Solo nos interesan los registros RECIENTES (ej. último mes) para no tardar años
                        DateTime logTime = new DateTime(idwYear, idwMonth, idwDay, idwHour, idwMinute, idwSecond);
                        if (logTime < DateTime.Now.AddDays(-1)) continue; // Solo logs de HOY y AYER

                        // PASO 2: Generador de Nombres con Compensación de Hora (Fuzzy Search)
                        // Probamos la hora exacta y variaciones de zona horaria (UTC vs Local)
                        List<DateTime> timeCandidates = new List<DateTime> {
                            logTime,
                            logTime.AddHours(6),  // UTC+6
                            logTime.AddHours(5),
                            logTime.AddHours(-6), // UTC-6
                            logTime.AddHours(-5)
                        };

                        foreach (var t in timeCandidates)
                        {
                            string ts = $"{t.Year}{t.Month:D2}{t.Day:D2}{t.Hour:D2}{t.Minute:D2}{t.Second:D2}";

                            // Lista de formatos posibles
                            string[] filenames = { $"{ts}.jpg", $"{sdwEnrollNumber}_{ts}.jpg", $"{ts}_{sdwEnrollNumber}.jpg" };

                            foreach (string fname in filenames)
                            {
                                string localPath = Path.Combine(destFolder, fname);
                                if (File.Exists(localPath)) continue;

                                // PASO 3: Intento de Descarga
                                if (axCZKEM1.GetPhotoByNameToFile(iMachineNumber, fname, localPath))
                                {
                                    Console.WriteLine($"{{\"status\": \"found\", \"file\": \"{fname}\", \"log_time\": \"{logTime}\"}}");
                                    found++;
                                    goto NextLog; // Salimos de los bucles de nombre y hora si encontramos la foto
                                }
                            }
                        }
                    NextLog:;
                    }

                    if (found > 0)
                        Console.WriteLine($"{{\"status\": \"OK\", \"message\": \"¡ÉXITO! Se recuperaron {found} fotos.\", \"path\": \"{CleanString(destFolder)}\"}}");
                    else
                        Console.WriteLine("{\"status\": \"OK\", \"message\": \"Logs leídos correctamente, pero 0 fotos encontradas. Reinicia el equipo y genera fallos NUEVOS ahora que UploadPhoto=0.\", \"count\": 0}");
                }
                else
                {
                    int err = 0; axCZKEM1.GetLastError(ref err);
                    Console.WriteLine($"{{\"error\": \"Fallo al leer logs (ReadAllGLogData). ErrorCode: {err}\"}}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"{{\"error\": \"Error Critico: {CleanString(ex.Message)}\"}}");
            }
            finally
            {
                axCZKEM1.EnableDevice(iMachineNumber, true);
            }
        }
        static void GetParam(int iMachineNumber, string paramName)
        {
            try
            {
                string value = "";
                // GetSysOption lee la configuración interna del sistema de archivos del reloj
                if (axCZKEM1.GetSysOption(iMachineNumber, paramName, out value))
                {
                    Console.WriteLine($"{{\"status\": \"OK\", \"param\": \"{paramName}\", \"value\": \"{CleanString(value)}\"}}");
                }
                else
                {
                    int err = 0; axCZKEM1.GetLastError(ref err);
                    Console.WriteLine($"{{\"error\": \"No se pudo leer '{paramName}'. ErrorCode: {err}\"}}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"{{\"error\": \"Excepción: {CleanString(ex.Message)}\"}}");
            }
        }
        static void DumpConfig(int iMachineNumber)
        {
            // Lista de posibles parámetros en equipos ZKTeco (Linux, TFT, VL)
            List<string> paramsToCheck = new List<string>()
            {
                // Básicos
                "~SerialNumber", "~DeviceName", "~Platform", "~OS", "FirmwareVersion", "~ZKFPVersion",
                // Red
                "IPAddress", "NetMask", "GATEIPAddress", "RS232BaudRate",
                // Capacidades
                "UserCount", "FaceCount", "FingerCount", "AttLogCount", "PhotoCount",
                // Cámara y Fotos (Lo que te interesa)
                "CameraOn", "CaptureErrorImage", "SaveUserPhoto",
                "FaceFunOn", "FaceIdentify", "FaceVerify", "CaptureFace",
                "UploadPhoto", "TakeUserPhoto", "ShowPicture",
                // Control
                "LockFunOn", "Door1ForcePassWord", "ReaderTeacher","ParametroTrampa"
            };

            Console.WriteLine("["); // Iniciar Array JSON
            bool first = true;

            foreach (string param in paramsToCheck)
            {
                string val = "";
                // Intentamos leer el parámetro
                if (axCZKEM1.GetSysOption(iMachineNumber, param, out val))
                {
                    if (!first) Console.WriteLine(",");
                    Console.Write($"{{\"param\": \"{param}\", \"value\": \"{CleanString(val)}\", \"status\": \"OK\"}}");
                    first = false;
                }
                else
                {
                    // Opcional: Si quieres ver también los que fallan para confirmar que no existen
                    // int err = 0; axCZKEM1.GetLastError(ref err);
                    // if (!first) Console.WriteLine(",");
                    // Console.Write($"{{\"param\": \"{param}\", \"error\": {err}, \"status\": \"FAIL\"}}");
                    // first = false;
                }
            }
            Console.WriteLine("]"); // Cerrar Array JSON
        }
        static void GetAllUsers(int iMachineNumber)
        {
            axCZKEM1.EnableDevice(iMachineNumber, false);
            axCZKEM1.ReadAllUserID(iMachineNumber); // Read basic info into memory
            axCZKEM1.ReadAllTemplate(iMachineNumber); // Read Fingerprints into memory

            List<string> usersJson = new List<string>();

            string sEnrollNumber = "", sName = "", sPassword = "", sPrivilege = "";
            bool bEnabled = false;

            // 1. Iterate through all users
            while (axCZKEM1.SSR_GetAllUserInfo(iMachineNumber, out sEnrollNumber, out sName, out sPassword, out int iPrivilege, out bEnabled))
            {
                // 2. Get Fingerprints for this user (0-9)
                List<string> fingers = new List<string>();
                for (int i = 0; i < 10; i++)
                {
                    string tmpData = "";
                    int tmpLen = 0;
                    // Try getting standard template (Algorithm 10)
                    if (axCZKEM1.GetUserTmpExStr(iMachineNumber, sEnrollNumber, i, out int flag, out tmpData, out tmpLen))
                    {
                        fingers.Add($"{{\"fingerIndex\": {i}, \"template\": \"{tmpData}\"}}");
                    }
                }

                // 3. Get Face Template (Index 50 is main face)
                string faceTmp = "";
                int faceLen = 0;
                string faceJson = "null";

                // Try getting Face (Standard ZKFace)
                if (axCZKEM1.GetUserFaceStr(iMachineNumber, sEnrollNumber, 50, ref faceTmp, ref faceLen))
                {
                    faceJson = $"\"{faceTmp}\"";
                }

                string userEntry = $"{{\"uid\": \"{sEnrollNumber}\", \"name\": \"{CleanString(sName)}\", \"privilege\": {iPrivilege}, \"password\": \"{sPassword}\", \"enabled\": {(bEnabled ? "true" : "false")}, \"fingers\": [{string.Join(",", fingers)}], \"face\": {faceJson}}}";
                usersJson.Add(userEntry);
            }

            axCZKEM1.EnableDevice(iMachineNumber, true);
            Console.WriteLine($"[{string.Join(",", usersJson)}]");
        }

        static void UploadUser(int iMachineNumber, string jsonString)
        {
            // Simple manual JSON parsing (to avoid external dependencies like Newtonsoft)
            // We assume the Node.js side sends a clean, simple object string.
            // Format expected: "uid|name|privilege|password" 
            // Note: For complex structure like arrays, passing JSON via CLI args is risky due to escaping.
            // BETTER APPROACH: Node passes data separated by pipes '|' for basic info, 
            // and we handle templates separately or we improve parsing.

            // FOR ROBUSTNESS: Let's assume input format: UID|NAME|PRIVILEGE|PASSWORD|FACE_TMP|FINGER_0|FINGER_1...

            string[] parts = jsonString.Split('|');
            if (parts.Length < 4) { Console.WriteLine("{\"error\": \"Invalid data format\"}"); return; }

            string uid = parts[0];
            string name = parts[1];
            int privilege = int.Parse(parts[2]);
            string password = parts[3];
            string faceTmp = (parts.Length > 4 && parts[4] != "null") ? parts[4] : "";

            axCZKEM1.EnableDevice(iMachineNumber, false);

            // 1. Set Basic User Info
            if (axCZKEM1.SSR_SetUserInfo(iMachineNumber, uid, name, password, privilege, true))
            {
                // 2. Set Face (if exists)
                if (!string.IsNullOrEmpty(faceTmp))
                {
                    axCZKEM1.SetUserFaceStr(iMachineNumber, uid, 50, faceTmp, faceTmp.Length);
                }

                // 3. Set Fingers (Remaining parts)
                for (int i = 5; i < parts.Length; i++)
                {
                    if (string.IsNullOrEmpty(parts[i])) continue;
                    // Format: Index:Template
                    string[] fingerData = parts[i].Split(':');
                    if (fingerData.Length == 2)
                    {
                        int idx = int.Parse(fingerData[0]);
                        string tmp = fingerData[1];
                        axCZKEM1.SetUserTmpExStr(iMachineNumber, uid, idx, 1, tmp);
                    }
                }

                axCZKEM1.RefreshData(iMachineNumber);
                Console.WriteLine("{\"status\": \"OK\", \"message\": \"User uploaded\"}");
            }
            else
            {
                int err = 0; axCZKEM1.GetLastError(ref err);
                Console.WriteLine($"{{\"error\": \"Failed to set user info. Error: {err}\"}}");
            }
            axCZKEM1.EnableDevice(iMachineNumber, true);
        }

        static void DeleteUser(int iMachineNumber, string uid)
        {
            axCZKEM1.EnableDevice(iMachineNumber, false);
            // 12 = Delete User (Info + Finger + Face)
            if (axCZKEM1.SSR_DeleteEnrollData(iMachineNumber, uid, 12))
            {
                axCZKEM1.RefreshData(iMachineNumber);
                Console.WriteLine("{\"status\": \"OK\", \"message\": \"User deleted\"}");
            }
            else
            {
                int err = 0; axCZKEM1.GetLastError(ref err);
                Console.WriteLine($"{{\"error\": \"Failed to delete user. Error: {err}\"}}");
            }
            axCZKEM1.EnableDevice(iMachineNumber, true);
        }
        static string CleanString(string s) { if (string.IsNullOrEmpty(s)) return ""; return s.Replace("\"", "'").Replace("\\", "/").Trim(); }
    }
}