using System;
using System.Text;
using System.IO;
using System.Collections.Generic;

namespace ZkBridge
{
    class Program
    {
        public static zkemkeeper.CZKEM axCZKEM1 = new zkemkeeper.CZKEM();
        // Buffer grande para lectura de datos
        public static byte[] map = new byte[1024 * 1024];

        static void Main(string[] args)
        {
            // Forzar codificación UTF8 para nombres con acentos y salida JSON limpia
            Console.OutputEncoding = Encoding.UTF8;

            if (args.Length < 4)
            {
                Console.WriteLine("{\"error\": \"Args insuficientes\"}");
                return;
            }

            string ip = args[0];
            int port = int.Parse(args[1]);
            int commKey = int.Parse(args[2]);
            string command = args[3];

            axCZKEM1.SetCommPassword(commKey);

            if (axCZKEM1.Connect_Net(ip, port))
            {
                try
                {
                    switch (command)
                    {
                        // --- COMANDOS BÁSICOS ---
                        case "test_connection":
                            Console.WriteLine("{\"status\": \"OK\"}");
                            break;

                        case "get_info":
                            GetDeviceInfo(1);
                            break;

                        case "get_all_users":
                            GetAllUsers(1);
                            break;

                        case "download_logs":
                            DownloadLogs(1);
                            break;

                        case "clear_logs":
                            ClearLogs(1);
                            break;

                        case "sync_time":
                            SyncTime(1);
                            break;

                        // --- CARGAS MASIVAS (BATCH) ---
                        case "upload_users_file":
                            if (args.Length >= 5) UploadUsersFromFile(1, args[4]);
                            else Console.WriteLine("{\"error\": \"Falta archivo\"}");
                            break;

                        case "upload_faces_file":
                            if (args.Length >= 5) UploadFacesFromFile(1, args[4]);
                            else Console.WriteLine("{\"error\": \"Falta archivo\"}");
                            break;
                        case "upload_fingerprints_file":
                            if (args.Length >= 5) UploadFingerprintsFromFile(1, args[4]);
                            else Console.WriteLine("{\"error\": \"Falta archivo\"}");
                            break;
                        case "upload_biotemplates":
                            if (args.Length >= 5) UploadBioTemplates(1, args[4]);
                            else Console.WriteLine("{\"error\": \"Falta archivo\"}");
                            break;

                        case "delete_users_file":
                            if (args.Length >= 5) DeleteUsersFromFile(1, args[4]);
                            else Console.WriteLine("{\"error\": \"Falta archivo\"}");
                            break;

                        // --- COMANDOS INDIVIDUALES (LEGACY) ---
                        case "upload_user":
                            if (args.Length >= 5) UploadUser(1, args[4]);
                            else Console.WriteLine("{\"error\": \"Missing data for user\"}");
                            break;

                        case "delete_user":
                            if (args.Length >= 5) DeleteUser(1, args[4]);
                            else Console.WriteLine("{\"error\": \"Missing UID\"}");
                            break;

                        // --- COMANDO DE DIAGNÓSTICO ---
                        case "debug_faces":
                            if (args.Length >= 5) DebugFaces(1, args[4]);
                            else Console.WriteLine("{\"error\": \"Falta UID\"}");
                            break;

                        // --- NUEVO COMANDO: Consulta directa a tabla biométrica ---
                        case "get_biodata":
                            if (args.Length >= 5) GetBioData(1, args[4]);
                            else Console.WriteLine("{\"error\": \"Falta UID para consultar\"}");
                            break;

                        // --- COMANDOS ADICIONALES (Mantenidos) ---
                        case "dump_config":
                            DumpConfig(1);
                            break;

                        case "capture_image":
                            if (args.Length >= 5) CaptureScreenshot(1, args[4]);
                            else Console.WriteLine("{\"error\": \"Falta ruta de destino\"}");
                            break;

                        case "set_param":
                            if (args.Length >= 6) SetParam(1, args[4], args[5]);
                            else Console.WriteLine("{\"error\": \"Faltan parametros\"}");
                            break;

                        case "get_param":
                            if (args.Length >= 5) GetParam(1, args[4]);
                            else Console.WriteLine("{\"error\": \"Falta el nombre del parametro\"}");
                            break;

                        case "download_photos":
                            if (args.Length >= 5) DownloadPhotos(1, args[4]);
                            else Console.WriteLine("{\"error\": \"Falta la ruta de destino\"}");
                            break;

                        // --- COMANDOS DE LIMPIEZA ESPECÍFICA ---
                        case "clear_faces":
                            ClearFaces(1);
                            break;

                        case "clear_fingerprints":
                            ClearFingerprints(1);
                            break;

                        case "clear_data":
                            ClearAllData(1);
                            break;

                        default:
                            Console.WriteLine("{\"error\": \"Comando desconocido\"}");
                            break;
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine("{\"error\": \"" + CleanString(ex.Message) + "\"}");
                }
                finally
                {
                    axCZKEM1.Disconnect();
                    Console.Out.Flush();
                }
            }
            else
            {
                int err = 0; axCZKEM1.GetLastError(ref err);
                Console.WriteLine("{\"error\": \"No conecta (Error " + err + ")\"}");
            }

            Environment.Exit(0);
        }

        // --- CONSULTA DE DATOS BIOMÉTRICOS CRUDOS (NUEVO) ---
        static void GetBioData(int iMachineNumber, string uid)
        {
            axCZKEM1.EnableDevice(iMachineNumber, false);

            string tableName = "Pers_Biotemplate";
            string fields = "*"; // Traer todo: Version, Tipo, Formato, etc.
            string filter = "Pin=" + uid; // Filtramos solo el usuario que nos interesa
            string options = "";
            string buffer = "";

            // Buffer grande (10MB) para asegurar que quepan los rostros
            int bufferSize = 10 * 1024 * 1024;

            // Esta función lee la tabla interna tal cual la tiene el reloj
            if (axCZKEM1.SSR_GetDeviceData(iMachineNumber, out buffer, bufferSize, tableName, fields, filter, options))
            {
                // El buffer viene como texto separado por \r\n y \t. 
                // Lo escapamos para meterlo en un JSON y que tú lo veas en el frontend.
                string safeData = buffer.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\r", "\\r").Replace("\n", "\\n");

                Console.WriteLine($"{{\"status\": \"OK\", \"uid\": \"{uid}\", \"raw_data\": \"{safeData}\"}}");
            }
            else
            {
                int err = 0; axCZKEM1.GetLastError(ref err);
                // Si da error -4 o similar, puede que el reloj no soporte esta tabla (modelos muy viejos)
                // Pero si es Visible Light (nuevo), debe soportarla.
                Console.WriteLine($"{{\"error\": \"Error leyendo Pers_Biotemplate. Code: {err}\"}}");
            }

            axCZKEM1.EnableDevice(iMachineNumber, true);
            Console.Out.Flush();
        }

        // --- INYECCIÓN DIRECTA DE TABLA BIOMÉTRICA ---
        static void UploadBioTemplates(int iMachineNumber, string filePath)
        {
            if (!File.Exists(filePath)) { Console.WriteLine("{\"error\": \"Archivo no encontrado\"}"); return; }

            string buffer = File.ReadAllText(filePath, Encoding.UTF8);

            if (string.IsNullOrEmpty(buffer)) { Console.WriteLine("{\"status\": \"OK\", \"message\": \"Archivo vacio\"}"); return; }

            axCZKEM1.EnableDevice(iMachineNumber, false);

            if (axCZKEM1.SSR_SetDeviceData(iMachineNumber, "Pers_Biotemplate", buffer, ""))
            {
                axCZKEM1.RefreshData(iMachineNumber);
                Console.WriteLine("{\"status\": \"OK\", \"message\": \"Datos biométricos inyectados correctamente\"}");
            }
            else
            {
                int err = 0; axCZKEM1.GetLastError(ref err);
                Console.WriteLine($"{{\"error\": \"Fallo SSR_SetDeviceData. Code: {err}\"}}");
            }

            axCZKEM1.EnableDevice(iMachineNumber, true);
            Console.Out.Flush();
        }

        // --- FUNCIÓN DE DIAGNÓSTICO BIOMÉTRICO ---
        static void DebugFaces(int iMachineNumber, string uid)
        {
            axCZKEM1.EnableDevice(iMachineNumber, false);
            List<string> foundFaces = new List<string>();

            int[] indicesToCheck = { 50, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 };

            foreach (int idx in indicesToCheck)
            {
                string tmp = "";
                int len = 0;

                if (axCZKEM1.GetUserFaceStr(iMachineNumber, uid, idx, ref tmp, ref len))
                {
                    string cleanData = tmp.Replace("\"", "\\\"");
                    foundFaces.Add($"{{\"index\":{idx}, \"type\":\"String\", \"len\":{len}, \"data\":\"{cleanData}\"}}");
                }

                byte[] buffer = new byte[256 * 1024];
                int blen = 0;
                if (axCZKEM1.GetUserFace(iMachineNumber, uid, idx, ref buffer[0], ref blen))
                {
                    string b64 = Convert.ToBase64String(buffer, 0, blen);
                    foundFaces.Add($"{{\"index\":{idx}, \"type\":\"Binary\", \"len\":{blen}, \"data\":\"{b64}\"}}");
                }
            }

            axCZKEM1.EnableDevice(iMachineNumber, true);
            Console.WriteLine($"[{string.Join(",", foundFaces)}]");
            Console.Out.Flush();
        }

        // --- SYNC TIME ---
        static void SyncTime(int iMachineNumber)
        {
            DateTime now = DateTime.Now;
            if (axCZKEM1.SetDeviceTime2(iMachineNumber, now.Year, now.Month, now.Day, now.Hour, now.Minute, now.Second))
            {
                axCZKEM1.RefreshData(iMachineNumber);
                Console.WriteLine("{\"status\": \"OK\"}");
            }
            else
            {
                int err = 0; axCZKEM1.GetLastError(ref err);
                Console.WriteLine($"{{\"error\": \"Error Time: {err}\"}}");
            }
        }

        // --- FUNCIONES DE CARGA MASIVA ---

        static void UploadUsersFromFile(int iMachineNumber, string filePath)
        {
            if (!File.Exists(filePath)) { Console.WriteLine("{\"error\": \"No file\"}"); return; }

            axCZKEM1.EnableDevice(iMachineNumber, false);

            int successCount = 0;
            int failCount = 0;

            foreach (string line in File.ReadAllLines(filePath))
            {
                if (string.IsNullOrWhiteSpace(line)) continue;
                try
                {
                    string[] p = line.Split('|');
                    if (p.Length < 5) continue;

                    if (axCZKEM1.SSR_SetUserInfo(iMachineNumber, p[0], p[1], p[3], int.Parse(p[2]), p[4] == "1"))
                    {
                        if (p.Length > 5 && p[5].Length > 50 && p[5] != "null")
                        {
                            if (!axCZKEM1.SetUserFaceStr(iMachineNumber, p[0], 50, p[5], p[5].Length))
                            {
                                try
                                {
                                    byte[] b = Convert.FromBase64String(p[5]);
                                    axCZKEM1.SetUserFace(iMachineNumber, p[0], 50, ref b[0], b.Length);
                                }
                                catch { }
                            }
                        }

                        for (int k = 6; k < p.Length; k++)
                        {
                            if (string.IsNullOrEmpty(p[k])) continue;
                            string[] fd = p[k].Split(':');
                            if (fd.Length == 2)
                                axCZKEM1.SetUserTmpExStr(iMachineNumber, p[0], int.Parse(fd[0]), 1, fd[1]);
                        }
                        successCount++;
                    }
                    else failCount++;
                }
                catch { failCount++; }
            }

            axCZKEM1.RefreshData(iMachineNumber);
            axCZKEM1.EnableDevice(iMachineNumber, true);

            Console.WriteLine($"{{\"status\": \"OK\", \"processed\": {successCount + failCount}, \"success\": {successCount}, \"failed\": {failCount}}}");
            Console.Out.Flush();
        }

        static void UploadFacesFromFile(int iMachineNumber, string filePath)
        {
            if (!File.Exists(filePath)) { Console.WriteLine("{\"error\": \"Archivo no encontrado\"}"); return; }

            axCZKEM1.EnableDevice(iMachineNumber, false);
            int success = 0, fail = 0;
            string[] lines = File.ReadAllLines(filePath);

            foreach (string line in lines)
            {
                if (string.IsNullOrWhiteSpace(line)) continue;
                string[] parts = line.Split('|');

                if (parts.Length < 2) continue;

                string uid = parts[0];
                string face = parts[1];
                int faceIdx = 50;

                if (parts.Length > 2) int.TryParse(parts[2], out faceIdx);

                if (string.IsNullOrEmpty(face) || face == "null") continue;

                axCZKEM1.DelUserFace(iMachineNumber, uid, faceIdx);

                bool uploaded = false;

                if (axCZKEM1.SetUserFaceStr(iMachineNumber, uid, faceIdx, face, face.Length))
                {
                    uploaded = true;
                }
                else
                {
                    try
                    {
                        byte[] b = Convert.FromBase64String(face);
                        if (axCZKEM1.SetUserFace(iMachineNumber, uid, faceIdx, ref b[0], b.Length))
                            uploaded = true;
                    }
                    catch { }
                }

                if (uploaded) success++;
                else
                {
                    fail++;
                    int err = 0; axCZKEM1.GetLastError(ref err);
                    Console.Error.WriteLine($"[ERROR] Face UID {uid} Index {faceIdx} falló. Código SDK: {err}");
                }
            }

            axCZKEM1.RefreshData(iMachineNumber);
            axCZKEM1.EnableDevice(iMachineNumber, true);
            Console.WriteLine($"{{\"status\": \"OK\", \"processed\": {lines.Length}, \"success\": {success}, \"failed\": {fail}}}");
            Console.Out.Flush();
        }

        static void DeleteUsersFromFile(int iMachineNumber, string filePath)
        {
            if (!File.Exists(filePath)) { Console.WriteLine("{\"error\": \"Archivo no encontrado\"}"); return; }

            axCZKEM1.EnableDevice(iMachineNumber, false);
            int deleted = 0;

            foreach (string u in File.ReadAllLines(filePath))
            {
                if (string.IsNullOrWhiteSpace(u)) continue;
                if (axCZKEM1.SSR_DeleteEnrollData(iMachineNumber, u.Trim(), 12))
                    deleted++;
            }

            axCZKEM1.RefreshData(iMachineNumber);
            axCZKEM1.EnableDevice(iMachineNumber, true);
            Console.WriteLine($"{{\"status\":\"OK\",\"deleted\":{deleted}}}");
            Console.Out.Flush();
        }

        // --- FUNCIONES LEGACY ---

        static void GetAllUsers(int iMachineNumber)
        {
            axCZKEM1.EnableDevice(iMachineNumber, false);
            axCZKEM1.ReadAllUserID(iMachineNumber);
            axCZKEM1.ReadAllTemplate(iMachineNumber);

            List<string> usersJson = new List<string>();
            string sEnrollNumber = "", sName = "", sPassword = "";
            int iPrivilege = 0;
            bool bEnabled = false;

            while (axCZKEM1.SSR_GetAllUserInfo(iMachineNumber, out sEnrollNumber, out sName, out sPassword, out iPrivilege, out bEnabled))
            {
                List<string> fingers = new List<string>();
                for (int k = 0; k < 10; k++)
                {
                    string t = ""; int l = 0; int fl = 0;
                    if (axCZKEM1.GetUserTmpExStr(iMachineNumber, sEnrollNumber, k, out fl, out t, out l))
                        fingers.Add($"{{\"fingerIndex\":{k},\"template\":\"{t}\"}}");
                }

                string fa = ""; int flen = 0; string fJ = "null";
                if (axCZKEM1.GetUserFaceStr(iMachineNumber, sEnrollNumber, 50, ref fa, ref flen))
                    fJ = $"\"{fa}\"";

                usersJson.Add($"{{\"uid\":\"{sEnrollNumber}\",\"name\":\"{CleanString(sName)}\",\"privilege\":{iPrivilege},\"password\":\"{sPassword}\",\"fingers\":[{string.Join(",", fingers)}],\"face\":{fJ}}}");
            }

            axCZKEM1.EnableDevice(iMachineNumber, true);
            Console.WriteLine($"[{string.Join(",", usersJson)}]");
            Console.Out.Flush();
        }

        static void DownloadLogs(int iMachineNumber)
        {
            axCZKEM1.EnableDevice(iMachineNumber, false);
            if (axCZKEM1.ReadGeneralLogData(iMachineNumber))
            {
                List<string> logs = new List<string>();
                string sE = "";
                int v = 0, m = 0, Y = 0, M = 0, D = 0, H = 0, mm = 0, s = 0, w = 0;

                while (axCZKEM1.SSR_GetGeneralLogData(iMachineNumber, out sE, out v, out m, out Y, out M, out D, out H, out mm, out s, ref w))
                {
                    logs.Add($"{{\"uid\":\"{sE}\",\"timestamp\":\"{Y}-{M:D2}-{D:D2} {H:D2}:{mm:D2}:{s:D2}\",\"verifyMode\":{v},\"inOutMode\":{m}}}");
                }
                Console.WriteLine($"[{string.Join(",", logs)}]");
            }
            else
            {
                Console.WriteLine("[]");
            }
            Console.Out.Flush();
            axCZKEM1.EnableDevice(iMachineNumber, true);
        }

        static void ClearLogs(int iMachineNumber)
        {
            axCZKEM1.EnableDevice(iMachineNumber, false);
            if (axCZKEM1.ClearGLog(iMachineNumber))
            {
                axCZKEM1.RefreshData(iMachineNumber);
                Console.WriteLine("{\"status\":\"OK\"}");
            }
            else
            {
                Console.WriteLine("{\"error\":\"Fail\"}");
            }
            Console.Out.Flush();
            axCZKEM1.EnableDevice(iMachineNumber, true);
        }

        // --- FUNCIONES ADICIONALES MANTENIDAS ---

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

            StringBuilder json = new StringBuilder();
            json.Append("{");
            json.Append($"\"status\": \"OK\",");
            json.Append($"\"firmware\": \"{CleanString(sFirmware)}\",");
            json.Append($"\"serial\": \"{CleanString(sSerial)}\",");
            json.Append($"\"platform\": \"{CleanString(sPlatform)}\",");
            json.Append($"\"deviceTime\": \"{sDeviceTime}\",");
            json.Append($"\"userCount\": {iUserCount},");
            json.Append($"\"fingers\": {iFingerCount},");
            json.Append($"\"faces\": {iFaceCount},");
            json.Append($"\"records\": {iRecordCount}");
            json.Append("}");
            Console.WriteLine(json.ToString());
        }

        static void DumpConfig(int iMachineNumber)
        {
            List<string> paramsToCheck = new List<string>()
            {
                "~SerialNumber", "~DeviceName", "~Platform", "~OS", "FirmwareVersion", "~ZKFPVersion",
                "IPAddress", "NetMask", "GATEIPAddress", "RS232BaudRate",
                "UserCount", "FaceCount", "FingerCount", "AttLogCount", "PhotoCount",
                "CameraOn", "CaptureErrorImage", "SaveUserPhoto",
                "FaceFunOn", "FaceIdentify", "FaceVerify", "CaptureFace",
                "UploadPhoto", "TakeUserPhoto", "ShowPicture",
                "LockFunOn", "Door1ForcePassWord", "ReaderTeacher","ParametroTrampa"
            };

            Console.WriteLine("[");
            bool first = true;
            foreach (string param in paramsToCheck)
            {
                string val = "";
                if (axCZKEM1.GetSysOption(iMachineNumber, param, out val))
                {
                    if (!first) Console.WriteLine(",");
                    Console.Write($"{{\"param\": \"{param}\", \"value\": \"{CleanString(val)}\", \"status\": \"OK\"}}");
                    first = false;
                }
            }
            Console.WriteLine("]");
        }

        static void CaptureScreenshot(int iMachineNumber, string destPath)
        {
            try
            {
                if (axCZKEM1.CaptureImage(false, 0, 0, ref map[0], destPath))
                    Console.WriteLine($"{{\"status\": \"OK\", \"message\": \"Captura exitosa\", \"path\": \"{CleanString(destPath)}\"}}");
                else
                {
                    int err = 0; axCZKEM1.GetLastError(ref err);
                    Console.WriteLine($"{{\"error\": \"Fallo captura. ErrorCode: {err}\"}}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"{{\"error\": \"Excepción: {CleanString(ex.Message)}\"}}");
            }
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
            catch (Exception ex)
            {
                Console.WriteLine($"{{\"error\": \"Excepción: {CleanString(ex.Message)}\"}}");
            }
        }

        static void GetParam(int iMachineNumber, string paramName)
        {
            try
            {
                string value = "";
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

        static void DownloadPhotos(int iMachineNumber, string destFolder)
        {
            try
            {
                if (!Directory.Exists(destFolder)) Directory.CreateDirectory(destFolder);
                axCZKEM1.SetSysOption(iMachineNumber, "UploadPhoto", "0");
                axCZKEM1.RefreshData(iMachineNumber);
                axCZKEM1.EnableDevice(iMachineNumber, false);

                Console.WriteLine("{\"message\": \"[MODO FUERZA BRUTA] Procesando logs recientes...\"}");

                string sdwEnrollNumber = "";
                int idwVerifyMode = 0, idwInOutMode = 0, idwYear = 0, idwMonth = 0, idwDay = 0, idwHour = 0, idwMinute = 0, idwSecond = 0, idwWorkcode = 0;
                int found = 0;

                if (axCZKEM1.ReadAllGLogData(iMachineNumber))
                {
                    while (axCZKEM1.SSR_GetGeneralLogData(iMachineNumber, out sdwEnrollNumber, out idwVerifyMode,
                               out idwInOutMode, out idwYear, out idwMonth, out idwDay, out idwHour, out idwMinute, out idwSecond, ref idwWorkcode))
                    {
                        DateTime logTime = new DateTime(idwYear, idwMonth, idwDay, idwHour, idwMinute, idwSecond);
                        if (logTime < DateTime.Now.AddDays(-1)) continue;

                        List<DateTime> timeCandidates = new List<DateTime> {
                            logTime, logTime.AddHours(6), logTime.AddHours(5),
                            logTime.AddHours(-6), logTime.AddHours(-5)
                        };

                        foreach (var t in timeCandidates)
                        {
                            string ts = $"{t.Year}{t.Month:D2}{t.Day:D2}{t.Hour:D2}{t.Minute:D2}{t.Second:D2}";
                            string[] filenames = { $"{ts}.jpg", $"{sdwEnrollNumber}_{ts}.jpg", $"{ts}_{sdwEnrollNumber}.jpg" };

                            foreach (string fname in filenames)
                            {
                                string localPath = Path.Combine(destFolder, fname);
                                if (File.Exists(localPath)) continue;

                                if (axCZKEM1.GetPhotoByNameToFile(iMachineNumber, fname, localPath))
                                {
                                    Console.WriteLine($"{{\"status\": \"found\", \"file\": \"{fname}\", \"log_time\": \"{logTime}\"}}");
                                    found++;
                                    goto NextLog;
                                }
                            }
                        }
                    NextLog:;
                    }

                    Console.WriteLine(found > 0
                        ? $"{{\"status\": \"OK\", \"message\": \"¡ÉXITO! Se recuperaron {found} fotos.\", \"path\": \"{CleanString(destFolder)}\"}}"
                        : "{\"status\": \"OK\", \"message\": \"0 fotos encontradas en logs recientes.\", \"count\": 0}");
                }
                else
                {
                    int err = 0; axCZKEM1.GetLastError(ref err);
                    Console.WriteLine($"{{\"error\": \"Fallo al leer logs. ErrorCode: {err}\"}}");
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
static void UploadFingerprintsFromFile(int iMachineNumber, string filePath)
        {
            if (!File.Exists(filePath)) { Console.WriteLine("{\"error\": \"Archivo no encontrado\"}"); return; }

            axCZKEM1.EnableDevice(iMachineNumber, false);
            int success = 0, fail = 0;
            
            // Formato esperado: UID|Index:Template|Index:Template...
            foreach (string line in File.ReadAllLines(filePath))
            {
                if (string.IsNullOrWhiteSpace(line)) continue;
                try
                {
                    string[] parts = line.Split('|');
                    if (parts.Length < 2) continue;

                    string uid = parts[0];
                    bool userSuccess = true;

                    for (int i = 1; i < parts.Length; i++)
                    {
                        if (string.IsNullOrEmpty(parts[i])) continue;
                        string[] fingerData = parts[i].Split(':');
                        if (fingerData.Length == 2)
                        {
                            int idx = int.Parse(fingerData[0]);
                            string tmp = fingerData[1];
                            // 1 = Flag válido
                            if (!axCZKEM1.SetUserTmpExStr(iMachineNumber, uid, idx, 1, tmp))
                            {
                                userSuccess = false;
                            }
                        }
                    }

                    if (userSuccess) success++;
                    else fail++;
                }
                catch { fail++; }
            }

            axCZKEM1.RefreshData(iMachineNumber);
            axCZKEM1.EnableDevice(iMachineNumber, true);
            Console.WriteLine($"{{\"status\": \"OK\", \"success\": {success}, \"failed\": {fail}}}");
            Console.Out.Flush();
        }
        static void UploadUser(int iMachineNumber, string dataString)
        {
            string[] parts = dataString.Split('|');
            if (parts.Length < 4) { Console.WriteLine("{\"error\": \"Invalid data format\"}"); return; }

            string uid = parts[0];
            string name = parts[1];
            int privilege = int.Parse(parts[2]);
            string password = parts[3];
            string faceTmp = (parts.Length > 4 && parts[4] != "null") ? parts[4] : "";

            axCZKEM1.EnableDevice(iMachineNumber, false);

            if (axCZKEM1.SSR_SetUserInfo(iMachineNumber, uid, name, password, privilege, true))
            {
                if (!string.IsNullOrEmpty(faceTmp))
                {
                    axCZKEM1.DelUserFace(iMachineNumber, uid, 50);

                    bool faceUploaded = axCZKEM1.SetUserFaceStr(iMachineNumber, uid, 50, faceTmp, faceTmp.Length);
                    if (!faceUploaded)
                    {
                        try
                        {
                            byte[] faceBytes = Convert.FromBase64String(faceTmp);
                            axCZKEM1.SetUserFace(iMachineNumber, uid, 50, ref faceBytes[0], faceBytes.Length);
                        }
                        catch { }
                    }
                }

                for (int i = 5; i < parts.Length; i++)
                {
                    if (string.IsNullOrEmpty(parts[i])) continue;
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
            if (axCZKEM1.SSR_DeleteEnrollData(iMachineNumber, uid, 12))
            {
                axCZKEM1.RefreshData(iMachineNumber);
                Console.WriteLine("{\"status\": \"OK\"}");
            }
            else
            {
                Console.WriteLine("{\"error\": \"Fail\"}");
            }
            axCZKEM1.EnableDevice(iMachineNumber, true);
        }

        static void ClearFaces(int iMachineNumber)
        {
            axCZKEM1.EnableDevice(iMachineNumber, false);
            axCZKEM1.ReadAllUserID(iMachineNumber);

            string sEnrollNumber = "", sName = "", sPassword = "";
            int iPrivilege = 0;
            bool bEnabled = false;
            int count = 0;

            // Iteramos todos los usuarios y borramos su rostro (Index 50)
            while (axCZKEM1.SSR_GetAllUserInfo(iMachineNumber, out sEnrollNumber, out sName, out sPassword, out iPrivilege, out bEnabled))
            {
                if (axCZKEM1.DelUserFace(iMachineNumber, sEnrollNumber, 50))
                    count++;
            }

            axCZKEM1.RefreshData(iMachineNumber);
            axCZKEM1.EnableDevice(iMachineNumber, true);
            Console.WriteLine($"{{\"status\": \"OK\", \"deleted\": {count}}}");
            Console.Out.Flush();
        }

        static void ClearFingerprints(int iMachineNumber)
        {
            axCZKEM1.EnableDevice(iMachineNumber, false);
            // ClearData(2) borra todas las plantillas de huellas
            if (axCZKEM1.ClearData(iMachineNumber, 2))
            {
                axCZKEM1.RefreshData(iMachineNumber);
                Console.WriteLine("{\"status\": \"OK\"}");
            }
            else
            {
                int err = 0; axCZKEM1.GetLastError(ref err);
                Console.WriteLine($"{{\"error\": \"Fallo ClearData(2). Code: {err}\"}}");
            }
            axCZKEM1.EnableDevice(iMachineNumber, true);
            Console.Out.Flush();
        }

        static void ClearAllData(int iMachineNumber)
        {
            axCZKEM1.EnableDevice(iMachineNumber, false);
            // ClearData(5) borra toda la información de usuarios (Huellas, Rostros, Passwords, Tarjetas)
            if (axCZKEM1.ClearData(iMachineNumber, 5))
            {
                axCZKEM1.RefreshData(iMachineNumber);
                Console.WriteLine("{\"status\": \"OK\"}");
            }
            else
            {
                int err = 0; axCZKEM1.GetLastError(ref err);
                Console.WriteLine($"{{\"error\": \"Fallo ClearData(5). Code: {err}\"}}");
            }
            axCZKEM1.EnableDevice(iMachineNumber, true);
            Console.Out.Flush();
        }

        static string CleanString(string s)
        {
            if (string.IsNullOrEmpty(s)) return "";
            return s.Replace("\"", "'").Replace("\\", "/").Trim();
        }
    }
}