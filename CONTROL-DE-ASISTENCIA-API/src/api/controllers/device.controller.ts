// src/api/controllers/device.controller.ts
import { Request, Response } from 'express';
import sql from 'mssql';
import fs from 'fs';
import path from 'path';
import { dbConfig } from '../../config/database';
import { ZkDeviceService } from '../services/sync/ZkDeviceService';



// --- Helper para obtener dispositivo (Reutilizable) ---
export const getDeviceById = async (id: number) => {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
        .input('Id', sql.Int, id)
        .query('SELECT * FROM Dispositivos WHERE DispositivoId = @Id');
    return result.recordset[0];
};

export const getDevices = async (req: Request, res: Response) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
           SELECT d.DispositivoId, d.Nombre, d.IpAddress, d.Puerto, d.ZonaId, 
                   d.Activo, d.Estado, d.UltimaSincronizacion, d.BorrarChecadas, 
                   z.Nombre as ZonaNombre, z.ColorUI as ZonaColor,
                   CASE WHEN d.PasswordCom IS NOT NULL AND d.PasswordCom <> '0' AND d.PasswordCom <> '' THEN 1 ELSE 0 END as TieneContrasena
            FROM Dispositivos d
            LEFT JOIN Zonas z ON d.ZonaId = z.ZonaId
           
        `);
        res.json(result.recordset);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener dispositivos' });
    }
};

export const getZones = async (req: Request, res: Response) => {
    try {
        const pool = await sql.connect(dbConfig);
        // Hacemos un LEFT JOIN para contar dispositivos activos por zona
        const result = await pool.request().query(`
            SELECT z.ZonaId, z.Nombre, z.Descripcion, z.ColorUI, z.Activo,
                   COUNT(d.DispositivoId) as DispositivosCount
            FROM Zonas z
            LEFT JOIN Dispositivos d ON z.ZonaId = d.ZonaId AND d.Activo = 1
            GROUP BY z.ZonaId, z.Nombre, z.Descripcion, z.ColorUI, z.Activo
            ORDER BY z.Activo DESC, z.Nombre
        `);
        res.json(result.recordset);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener zonas' });
    }
};
export const createZone = async (req: Request, res: Response) => {
    const { Nombre, Descripcion, ColorUI } = req.body;
    try {
        const pool = await sql.connect(dbConfig);
        
        // Insertar y devolver el ID creado para que el frontend lo seleccione automáticamente
        const result = await pool.request()
            .input('Nombre', sql.NVarChar, Nombre)
            .input('Descripcion', sql.NVarChar, Descripcion || '')
            .input('ColorUI', sql.NVarChar, ColorUI || null)
            .query(`
                INSERT INTO Zonas (Nombre, Descripcion, ColorUI, Activo)
                OUTPUT INSERTED.ZonaId, INSERTED.Nombre, INSERTED.ColorUI
                VALUES (@Nombre, @Descripcion, @ColorUI, 1)
            `);
        
        const newZone = result.recordset[0];
        res.json(newZone); // { ZonaId: 10, Nombre: "Nueva Zona" }

    } catch (error) {
        console.error("Error creating zone:", error);
        res.status(500).json({ message: 'Error al crear la zona' });
    }
};

export const updateZone = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { Nombre, Descripcion, ColorUI, Activo } = req.body;
    try {
        const pool = await sql.connect(dbConfig);
        const request = pool.request()
            .input('Id', sql.Int, id)
            .input('Nombre', sql.NVarChar, Nombre)
            .input('Descripcion', sql.NVarChar, Descripcion || '')
            .input('ColorUI', sql.NVarChar, ColorUI || null);
        
        let query = 'UPDATE Zonas SET Nombre=@Nombre, Descripcion=@Descripcion, ColorUI=@ColorUI';
        if (Activo !== undefined) {
            request.input('Activo', sql.Bit, Activo);
            query += ', Activo=@Activo';
        }
        query += ' WHERE ZonaId=@Id';

        await request.query(query);
        res.json({ message: 'Zona actualizada' });
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar la zona' });
    }
};

export const deleteZone = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('Id', sql.Int, id)
            .query('UPDATE Zonas SET Activo = 0 WHERE ZonaId = @Id');
        res.json({ message: 'Zona desactivada correctamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al desactivar la zona' });
    }
};

export const createDevice = async (req: Request, res: Response) => {
    const { Nombre, IpAddress, Puerto, ZonaId, PasswordCom, TipoConexion, BorrarChecadas, Activo } = req.body;
    try {
        const pool = await sql.connect(dbConfig);

        // --- VALIDACIÓN DE DUPLICADOS (Solo contra activos) ---
        const checkResult = await pool.request()
            .input('Nombre', sql.NVarChar, Nombre)
            .input('IpAddress', sql.NVarChar, IpAddress)
            .query(`
                SELECT Nombre, IpAddress FROM Dispositivos 
                WHERE (Nombre = @Nombre OR IpAddress = @IpAddress) AND Activo = 1
            `);

        if (checkResult.recordset.length > 0) {
            const existing = checkResult.recordset[0];
            if (existing.Nombre === Nombre) return res.status(409).json({ message: `El nombre "${Nombre}" ya está en uso por un dispositivo activo.` });
            if (existing.IpAddress === IpAddress) return res.status(409).json({ message: `La IP "${IpAddress}" ya está en uso por un dispositivo activo.` });
        }
        // -----------------------------------------------------

        await pool.request()
            .input('Nombre', sql.NVarChar, Nombre)
            .input('IpAddress', sql.NVarChar, IpAddress)
            .input('Puerto', sql.Int, Puerto)
            .input('ZonaId', sql.Int, ZonaId)
            .input('PasswordCom', sql.NVarChar, String(PasswordCom || '0')) // Asegurar string
            .input('TipoConexion', sql.NVarChar, TipoConexion || 'SDK') 
            .input('BorrarChecadas', sql.Bit, !!BorrarChecadas) // Asegurar boolean
            .input('Activo', sql.Bit, Activo !== undefined ? !!Activo : 1)
            .query(`
                INSERT INTO Dispositivos (Nombre, IpAddress, Puerto, ZonaId, PasswordCom, TipoConexion, Activo, Estado, BorrarChecadas)
                VALUES (@Nombre, @IpAddress, @Puerto, @ZonaId, @PasswordCom, @TipoConexion, @Activo, 'Desconocido', @BorrarChecadas)
            `);
        res.json({ message: 'Dispositivo creado' });
    } catch (error: any) {
        console.error('Error creating device:', error);
        res.status(500).json({ message: 'Error al crear dispositivo: ' + error.message });
    }
};

export const updateDevice = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { Nombre, IpAddress, Puerto, ZonaId, PasswordCom, BorrarChecadas, Activo } = req.body;
    try {
        const pool = await sql.connect(dbConfig);

        // --- VALIDACIÓN DE DUPLICADOS (Solo contra activos, excluyendo el actual) ---
        const checkResult = await pool.request()
            .input('Nombre', sql.NVarChar, Nombre)
            .input('IpAddress', sql.NVarChar, IpAddress)
            .input('Id', sql.Int, id)
            .query(`
                SELECT Nombre, IpAddress FROM Dispositivos 
                WHERE (Nombre = @Nombre OR IpAddress = @IpAddress) 
                AND Activo = 1 AND DispositivoId <> @Id
            `);

        if (checkResult.recordset.length > 0) {
            const existing = checkResult.recordset[0];
            if (existing.Nombre === Nombre) return res.status(409).json({ message: `El nombre "${Nombre}" ya está en uso por un dispositivo activo.` });
            if (existing.IpAddress === IpAddress) return res.status(409).json({ message: `La IP "${IpAddress}" ya está en uso por un dispositivo activo.` });
        }
        // -----------------------------------------------------

        const request = pool.request()
            .input('Id', sql.Int, id)
            .input('Nombre', sql.NVarChar, Nombre)
            .input('IpAddress', sql.NVarChar, IpAddress)
            .input('Puerto', sql.Int, Puerto)
            .input('ZonaId', sql.Int, ZonaId)
            .input('BorrarChecadas', sql.Bit, !!BorrarChecadas) // Asegurar boolean
            .input('Activo', sql.Bit, !!Activo);

        // Construcción dinámica: Solo actualizar password si se envía
        let passwordSetClause = "";
        if (PasswordCom !== undefined) {
            request.input('PasswordCom', sql.NVarChar, String(PasswordCom || '0'));
            passwordSetClause = ", PasswordCom=@PasswordCom";
        }

        await request.query(`
                UPDATE Dispositivos 
                SET Nombre=@Nombre, IpAddress=@IpAddress, Puerto=@Puerto, ZonaId=@ZonaId, 
                    BorrarChecadas=@BorrarChecadas, Activo=@Activo
                    ${passwordSetClause}
                WHERE DispositivoId = @Id
            `);
        res.json({ message: 'Dispositivo actualizado' });
    } catch (error: any) {
        console.error('Error updating device:', error);
        res.status(500).json({ message: 'Error al actualizar: ' + error.message });
    }
}

// --- AQUÍ ESTÁ LA LÓGICA CORE DE SINCRONIZACIÓN ---
export const getLogs = async (req: Request, res: Response) => {
    const { id } = req.params;
    let pool;
    let transaction;

    try {
        const device = await getDeviceById(parseInt(id));
        if (!device) return res.status(404).json({ message: 'Dispositivo no encontrado' });

        // 1. Descargar Logs
        const logs = await ZkDeviceService.downloadLogs(device);

        if (!logs || logs.length === 0) {
            return res.json({ success: true, message: 'No hay registros nuevos.', count: 0 });
        }

        // 2. Guardar en BD
        pool = await sql.connect(dbConfig);
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        let insertedCount = 0;

        for (const log of logs) {
            const request = new sql.Request(transaction);
            await request
                .input('CodRef', sql.NVarChar, log.uid)
                .input('FechaHora', sql.VarChar, log.time)
                .input('Checador', sql.NVarChar, device.Nombre)
                .query(`
                    INSERT INTO dbo.Checadas (EmpleadoId, FechaHora, Checador)
                    SELECT E.EmpleadoId, @FechaHora, @Checador
                    FROM dbo.Empleados E
                    WHERE E.CodRef = @CodRef
                    AND NOT EXISTS (
                        SELECT 1 
                        FROM dbo.Checadas C 
                        WHERE C.EmpleadoId = E.EmpleadoId 
                        AND C.FechaHora = @FechaHora
                    )
                `);
            insertedCount++;
        }

        await transaction.commit();

        // 3. Decisión de borrado
        let logMessage = `Sincronización finalizada. Procesados: ${logs.length}.`;

        if (device.BorrarChecadas) {
            await ZkDeviceService.clearLogs(device);
            logMessage += " Registros borrados del dispositivo.";
        }

        // 4. Actualizar estado
        await pool.request()
            .input('Id', sql.Int, device.DispositivoId)
            .query("UPDATE Dispositivos SET UltimaSincronizacion = GETDATE(), Estado='Conectado' WHERE DispositivoId = @Id");

        res.json({ success: true, message: logMessage, count: logs.length });

    } catch (error: any) {
        if (transaction) await transaction.rollback();
        console.error('Error Sync:', error);
        res.status(500).json({ message: 'Error en sincronización: ' + error.message });
    }
};
export const testDeviceConnection = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const device = await getDeviceById(parseInt(id));
        if (!device) return res.status(404).json({ message: 'Dispositivo no encontrado' });

        const result = await ZkDeviceService.testConnection(device);

        // Si conecta, actualizamos el estado en BD
        if (result.status === 'OK') {
            const pool = await sql.connect(dbConfig);
            await pool.request()
                .input('Id', sql.Int, device.DispositivoId)
                .query("UPDATE Dispositivos SET Estado='Conectado', UltimaSincronizacion=GETDATE() WHERE DispositivoId=@Id");
        }

        res.json({ message: 'Conexión Exitosa' });
    } catch (error: any) {
        console.error('Error testing connection:', error);
        res.status(500).json({ message: 'Error de conexión: ' + error.message });
    }
};
export const testConnectionManual = async (req: Request, res: Response) => {
    // 1. Recibir parámetros del frontend (Modal)
    const { IpAddress, Puerto, Password, DeviceId } = req.body;

    if (!IpAddress || !Puerto) {
        return res.status(400).json({ message: 'Faltan datos de conexión (IP/Puerto)' });
    }

    try {
        let finalPassword = Password;

        // Si viene un DeviceId y la contraseña está vacía (indicador del front), usamos la guardada
        if (DeviceId && Password === "") {
             const device = await getDeviceById(parseInt(DeviceId));
             if (device) {
                 finalPassword = device.PasswordCom;
             }
        }

        // 2. Crear dispositivo "Dummy" en memoria
        // ZkDeviceService espera un objeto con estas propiedades para conectar
        const dummyDevice = {
            Nombre: 'Test Device',
            IpAddress: IpAddress,
            Puerto: parseInt(Puerto),
            PasswordCom: finalPassword || 0, // Usamos la contraseña resuelta
            DispositivoId: 0 // ID falso, no se usará para guardar
        };

        console.log(`🔌 Probando conexión manual a ${IpAddress}:${Puerto}...`);

        // 3. Reutilizar la lógica del Servicio existente
        const result = await ZkDeviceService.testConnection(dummyDevice);

        // 4. Responder al frontend
        if (result.status === 'OK') {
            res.json({ message: 'Conexión Exitosa' });
        } else {
            // Si el servicio devuelve status no OK
            res.status(400).json({ message: 'No se pudo conectar al dispositivo' });
        }

    } catch (error: any) {
        console.error('Error Test Manual:', error.message);
        res.status(500).json({ message: 'Fallo al conectar: ' + error.message });
    }
};
export const diagnoseDevice = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const device = await getDeviceById(parseInt(id));
        if (!device) return res.status(404).json({ message: 'Dispositivo no encontrado' });

        const info = await ZkDeviceService.getDebugInfo(device);
        res.json(info);
    } catch (error: any) {
        console.error(`Error diagnóstico:`, error);
        res.status(500).json({ message: error.message });
    }
};
// ==================================================================================
// 🧠 SINCRONIZACIÓN MAESTRA DE EMPLEADOS (BIDIRECCIONAL)
// ==================================================================================
export const syncEmployeesFull = async (req: Request, res: Response) => {
    const { id } = req.params;
    console.log(`🔄 [SYNC FULL] Iniciando Sincronización Completa. ID: ${id}`);
    
    let importedCount = 0;
    let sentUsersCount = 0;
    let sentFacesCount = 0;

    try {
        const pool = await sql.connect(dbConfig);
        const devRes = await pool.request().input('Id', sql.Int, id).query(`SELECT * FROM Dispositivos WHERE DispositivoId = @Id`);
        const dbDevice = devRes.recordset[0];

        if (!dbDevice || !dbDevice.Activo || !dbDevice.ZonaId) return res.status(400).json({ error: 'Dispositivo inválido o sin zona.' });
        const device = { Nombre: dbDevice.Nombre, IpAddress: dbDevice.IpAddress, Puerto: dbDevice.Puerto, PasswordCom: dbDevice.PasswordCom, ZonaId: dbDevice.ZonaId };
        const zonaId = dbDevice.ZonaId;

        // ------------------------------------------------------------
        // 1. COSECHA (HARVEST): Recuperar Usuarios y Huellas del Reloj
        // ------------------------------------------------------------
        console.log(`📥 [PASO 1] Cosechando usuarios del dispositivo...`);
        const deviceUsers = await ZkDeviceService.getAllUsersFromDevice(device);
        importedCount = deviceUsers.length;

        if (deviceUsers.length > 0) {
            for (const dUser of deviceUsers) {
                const uid = dUser.uid;
                // Verificar si existe en BD y vincular a la Zona
                const empResult = await pool.request().input('Uid', sql.VarChar, uid).input('ZonaId', sql.Int, zonaId)
                    .query(`SELECT E.EmpleadoId, (SELECT COUNT(*) FROM EmpleadosZonas WHERE EmpleadoId = E.EmpleadoId AND ZonaId = @ZonaId) as EnZona FROM Empleados E WHERE E.CodRef = @Uid AND E.Activo = 1`);

                if (empResult.recordset.length > 0) {
                    const emp = empResult.recordset[0];
                    if (emp.EnZona === 0) await pool.request().input('EmpId', sql.Int, emp.EmpleadoId).input('ZId', sql.Int, zonaId).query(`INSERT INTO EmpleadosZonas (EmpleadoId, ZonaId) VALUES (@EmpId, @ZId)`);
                    
                    // Guardar Huellas (Las huellas suelen venir bien en getAllUsers)
                    if (dUser.fingers?.length) {
                        for (const f of dUser.fingers) {
                            await pool.request().input('EmpId', sql.Int, emp.EmpleadoId).input('Idx', sql.Int, f.fingerIndex).input('Tmp', sql.NVarChar(sql.MAX), f.template)
                                .query(`MERGE BiometriaHuellas AS T USING (SELECT @EmpId as Eid, @Idx as Didx) AS S ON (T.EmpleadoId=S.Eid AND T.DedoIndice=S.Didx) WHEN MATCHED THEN UPDATE SET Template=@Tmp, UltimaActualizacion=GETDATE() WHEN NOT MATCHED THEN INSERT (EmpleadoId,DedoIndice,Template,Algoritmo,UltimaActualizacion) VALUES (@EmpId,@Idx,@Tmp,'10.0',GETDATE());`);
                        }
                    }
                    // NOTA: No cosechamos rostros aquí porque getAllUsers suele traer formato incorrecto (Type 2).
                    // Para bajar rostros, se debe usar syncFacesOnly.
                }
            }
        }

        // ------------------------------------------------------------
        // 2. SIEMBRA DE USUARIOS (PUSH USERS): Datos Básicos + Huellas
        // ------------------------------------------------------------
        console.log(`📤 [PASO 2] Enviando usuarios y huellas...`);
        const queryUsers = `
            SELECT E.CodRef as uid, E.NombreCompleto as name, 
                   CASE WHEN E.Admindisp = 1 THEN 3 ELSE 0 END as privilege, 
                   '0' as password, 1 as enabled,
                   (SELECT DedoIndice as [index], Template as template FROM BiometriaHuellas WHERE EmpleadoId = E.EmpleadoId FOR JSON PATH) as fingersJson
            FROM Empleados E 
            INNER JOIN EmpleadosZonas EZ ON E.EmpleadoId = EZ.EmpleadoId 
            WHERE E.Activo = 1 AND EZ.ZonaId = @ZonaId
        `;
        const dbUsers = await pool.request().input('ZonaId', sql.Int, zonaId).query(queryUsers);
        const usersList = dbUsers.recordset;
        sentUsersCount = usersList.length;

        if (sentUsersCount > 0) {
            const usersFile = path.join(process.cwd(), `sync_users_${Date.now()}.txt`);
            const uStream = fs.createWriteStream(usersFile, { encoding: 'utf8' });
            
            for (const u of usersList) {
                // Importante: Enviamos 'null' en el rostro para que upload_users_file no intente usar SetUserFaceStr
                // y cause el error -103. Los rostros van en el Paso 3.
                let line = `${u.uid}|${u.name.substring(0, 24)}|${u.privilege}|${u.password}|${u.enabled}|null`;
                if (u.fingersJson) {
                    const fs = JSON.parse(u.fingersJson);
                    for (const f of fs) line += `|${f.index}:${f.template}`;
                }
                uStream.write(line + '\n');
            }
            uStream.end();
            await new Promise<void>(r => uStream.on('finish', r));

            await ZkDeviceService.uploadUsersFromFile(device, usersFile);
            try { if (fs.existsSync(usersFile)) fs.unlinkSync(usersFile); } catch {}
        }

        // ------------------------------------------------------------
        // 3. SIEMBRA DE ROSTROS (PUSH FACES): Inyección de Tabla
        // ------------------------------------------------------------
        console.log(`📤 [PASO 3] Inyectando rostros (Type 9)...`);
        const queryFaces = `
            SELECT E.CodRef as uid, BR.Template, BR.Version, BR.IndiceRostro
            FROM Empleados E
            JOIN EmpleadosZonas EZ ON E.EmpleadoId = EZ.EmpleadoId
            JOIN BiometriaRostros BR ON E.EmpleadoId = BR.EmpleadoId
            WHERE EZ.ZonaId = @ZonaId AND E.Activo = 1 AND BR.Template IS NOT NULL AND DATALENGTH(BR.Template) > 100
        `;
        
        const facesRes = await pool.request().input('ZonaId', sql.Int, zonaId).query(queryFaces);
        const facesList = facesRes.recordset;
        sentFacesCount = facesList.length;

        if (sentFacesCount > 0) {
            const bioFile = path.join(process.cwd(), `sync_bio_${Date.now()}.txt`);
            const bStream = fs.createWriteStream(bioFile, { encoding: 'utf8' });

            for (const face of facesList) {
                const versionStr = face.Version || "35.4"; 
                const [major, minor] = versionStr.split('.');
                const tmpData = face.Template.replace(/[\r\n\s]+/g, '');

                // Formato SDKHelper: Type=9 (Visible Light)
                const line = `Pin=${face.uid}\tValid=1\tDuress=0\tType=9\tMajorVer=${major || 35}\tMinorVer=${minor || 4}\tFormat=0\tNo=0\tIndex=${face.IndiceRostro || 0}\tTmp=${tmpData}`;
                bStream.write(line + '\r\n');
            }
            bStream.end();
            await new Promise<void>(r => bStream.on('finish', r));

            await ZkDeviceService.uploadBioTemplates(device, bioFile);
            try { if (fs.existsSync(bioFile)) fs.unlinkSync(bioFile); } catch {}
        }

        return res.json({ 
            status: 'OK', 
            message: 'Sincronización completa (Usuarios + Huellas + Rostros).',
            stats: { 
                imported: importedCount, 
                usersSent: sentUsersCount, 
                facesSent: sentFacesCount 
            } 
        });

    } catch (error: any) {
        console.error("❌ Error en Sync Full:", error);
        return res.status(500).json({ error: error.message });
    }
};
export const pushFacesToDevice = async (req: Request, res: Response) => {
    const { id } = req.params;
    console.log(`🔄 [PUSH ROSTROS] Iniciando subida aislada. ID Dispositivo: ${id}`);
    
    try {
        const pool = await sql.connect(dbConfig);
        const devRes = await pool.request().input('Id', sql.Int, id).query(`SELECT * FROM Dispositivos WHERE DispositivoId = @Id`);
        const dbDevice = devRes.recordset[0];

        if (!dbDevice || !dbDevice.Activo || !dbDevice.ZonaId) return res.status(400).json({ error: 'Dispositivo inválido' });
        const device = { Nombre: dbDevice.Nombre, IpAddress: dbDevice.IpAddress, Puerto: dbDevice.Puerto, PasswordCom: dbDevice.PasswordCom };
        const zonaId = dbDevice.ZonaId;

        const facesQuery = `
            SELECT E.CodRef as uid, BR.Template, BR.Version, BR.IndiceRostro
            FROM Empleados E
            JOIN EmpleadosZonas EZ ON E.EmpleadoId = EZ.EmpleadoId
            JOIN BiometriaRostros BR ON E.EmpleadoId = BR.EmpleadoId
            WHERE EZ.ZonaId = @ZonaId AND E.Activo = 1 AND BR.Template IS NOT NULL AND DATALENGTH(BR.Template) > 100
        `;
        
        const facesRes = await pool.request().input('ZonaId', sql.Int, zonaId).query(facesQuery);
        const faces = facesRes.recordset;

        if (faces.length === 0) return res.json({ status: 'OK', message: 'No hay rostros.' });

        const tempFile = path.join(process.cwd(), `push_bio_only_${Date.now()}.txt`);
        const stream = fs.createWriteStream(tempFile, { encoding: 'utf8' });
        
        for (const face of faces) {
            const versionStr = face.Version || "35.4";
            const [major, minor] = versionStr.split('.');
            const tmpData = face.Template.replace(/[\r\n\s]+/g, '');
            const line = `Pin=${face.uid}\tValid=1\tDuress=0\tType=9\tMajorVer=${major || 35}\tMinorVer=${minor || 4}\tFormat=0\tNo=0\tIndex=${face.IndiceRostro || 0}\tTmp=${tmpData}`;
            stream.write(line + '\r\n');
        }
        stream.end();
        await new Promise<void>(r => stream.on('finish', r));

        const result = await ZkDeviceService.uploadBioTemplates(device, tempFile);
        try { if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile); } catch {}

        return res.json({ status: 'OK', bridgeResult: result });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};
export const syncFacesOnly = async (req: Request, res: Response) => {
    const { id } = req.params;
    console.log(`📥 [BAJAR ROSTROS MASIVO] Disp ID: ${id}`);

    try {
        const pool = await sql.connect(dbConfig);
        const devRes = await pool.request().input('Id', sql.Int, id).query(`SELECT * FROM Dispositivos WHERE DispositivoId = @Id`);
        const dbDevice = devRes.recordset[0];
        
        if (!dbDevice) return res.status(404).json({ error: 'Dispositivo no encontrado' });

        const device = { Nombre: dbDevice.Nombre, IpAddress: dbDevice.IpAddress, Puerto: dbDevice.Puerto, PasswordCom: dbDevice.PasswordCom };
        
        // 1. Obtener lista de TODOS los usuarios del dispositivo
        console.log("   -> Obteniendo lista de usuarios del dispositivo...");
        const users = await ZkDeviceService.getAllUsersFromDevice(device);

        if (users.length === 0) {
            return res.json({ status: 'OK', message: 'El dispositivo no tiene usuarios.' });
        }

        console.log(`   -> Se encontraron ${users.length} usuarios. Iniciando descarga de rostros...`);

        let totalSaved = 0;
        let errors = 0;

        // 2. Iterar por cada usuario para bajar su biometría (Tabla Pers_Biotemplate)
        for (const user of users) {
            const targetUid = user.uid;
            
            try {
                // Obtener datos crudos
                const result = await ZkDeviceService.getBioData(device, targetUid);
                
                if (!result.raw_data) continue;

                const lines = result.raw_data.split(/\r?\n/);

                for (const line of lines) {
                    const cleanLine = line.trim();
                    if (!cleanLine || cleanLine.startsWith('Pin,Valid') || cleanLine.startsWith('Could not')) continue;

                    const parts = cleanLine.split(',');
                    if (parts.length < 10) continue;

                    // Pin,Valid,Duress,Type,MajorVer,MinorVer,Format,No,Index,Tmp
                    // 0   1     2      3    4        5        6      7  8     9
                    
                    const type = parts[3];      
                    const majorVer = parts[4];  
                    const minorVer = parts[5];  
                    const index = parts[8];     
                    const template = parts[9];  

                    // Filtrar rostros: Tipo 2 (Antiguo) o Tipo 9 (Visible Light)
                    if (type !== '2' && type !== '9') continue;

                    const versionStr = `${majorVer}.${minorVer}`;
                    const indiceVal = parseInt(index, 10);

                    // Buscar ID interno
                    const empRes = await pool.request().input('Uid', sql.VarChar, targetUid).query('SELECT EmpleadoId FROM Empleados WHERE CodRef = @Uid');
                    
                    if (empRes.recordset.length > 0) {
                        const empId = empRes.recordset[0].EmpleadoId;

                        // Guardar en BiometriaRostros
                        await pool.request()
                            .input('EmpId', sql.Int, empId)
                            .input('Indice', sql.Int, indiceVal)
                            .input('Tmp', sql.NVarChar(sql.MAX), template)
                            .input('Ver', sql.VarChar, versionStr)
                            .input('Len', sql.Int, template.length)
                            .query(`
                                MERGE BiometriaRostros AS T
                                USING (SELECT @EmpId AS Eid, @Indice AS Idx) AS S
                                ON (T.EmpleadoId = S.Eid AND T.IndiceRostro = S.Idx)
                                WHEN MATCHED THEN
                                    UPDATE SET 
                                        Template = @Tmp, 
                                        Version = @Ver, 
                                        Longitud = @Len,
                                        UltimaActualizacion = GETDATE()
                                WHEN NOT MATCHED THEN
                                    INSERT (EmpleadoId, IndiceRostro, Template, Version, Longitud, UltimaActualizacion)
                                    VALUES (@EmpId, @Indice, @Tmp, @Ver, @Len, GETDATE());
                            `);
                        
                        totalSaved++;
                    }
                }
            } catch (err) {
                // Error puntual con un usuario, seguimos con los demás
                // console.error(`Error procesando UID ${targetUid}:`, err);
                errors++;
            }
        }

        console.log(`✅ [EXITO] Sincronización de rostros finalizada. Guardados: ${totalSaved}, Errores: ${errors}`);

        return res.json({
            status: 'OK',
            message: `Descarga masiva completada. ${totalSaved} rostros guardados.`,
            stats: { 
                usersProcessed: users.length, 
                facesSaved: totalSaved,
                errors: errors
            }
        });

    } catch (e: any) { 
        console.error("❌ Error General Bajando Rostros:", e);
        return res.status(500).json({ error: e.message }); 
    }
};

export const deleteEmployeesFromDevice = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { uids } = req.body;

    if (!uids || !Array.isArray(uids) || uids.length === 0) {
        return res.status(400).json({ error: 'Se requiere un array de UIDs (uids) en el cuerpo.' });
    }

    console.log(`🗑️ [CONTROLLER] Borrando ${uids.length} usuarios del Disp ID: ${id}`);

    try {
        const pool = await sql.connect(dbConfig);
        const devRes = await pool.request().input('Id', sql.Int, id).query(`SELECT * FROM Dispositivos WHERE DispositivoId = @Id`);
        const dbDevice = devRes.recordset[0];
        
        if (!dbDevice) return res.status(404).json({ error: 'Dispositivo no encontrado' });
        
        const device = { 
            Nombre: dbDevice.Nombre, 
            IpAddress: dbDevice.IpAddress, 
            Puerto: dbDevice.Puerto, 
            PasswordCom: dbDevice.PasswordCom 
        };

        // Generar archivo de borrado
        const tempFile = path.join(process.cwd(), `del_${Date.now()}.txt`);
        const stream = fs.createWriteStream(tempFile);
        
        for (const uid of uids) {
            // Limpieza básica del UID para seguridad
            const cleanUid = String(uid).trim();
            if (cleanUid) stream.write(`${cleanUid}\n`);
        }
        stream.end();
        await new Promise<void>(r => stream.on('finish', r));

        // Ejecutar borrado masivo
        const result = await ZkDeviceService.deleteUsersFromFile(device, tempFile);
        
        try { if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile); } catch {}

        return res.json(result);

    } catch (error: any) {
        console.error("❌ Error Delete Users:", error);
        return res.status(500).json({ error: error.message });
    }
};
// =================================================================
// 🧠 NUEVO: Borrar TODOS los Usuarios (Nivel Usuario)
// =================================================================



// Helper interno para borrar por privilegio
const deleteByPrivilege = async (req: Request, res: Response, targetPriv: number) => {
    const { id } = req.params;
    try {
        const pool = await sql.connect(dbConfig);
        const devRes = await pool.request().input('Id', sql.Int, id).query(`SELECT * FROM Dispositivos WHERE DispositivoId = @Id`);
        const dbDevice = devRes.recordset[0];
        if (!dbDevice) return res.status(404).json({ error: 'Dispositivo no encontrado' });

        const device = { Nombre: dbDevice.Nombre, IpAddress: dbDevice.IpAddress, Puerto: dbDevice.Puerto, PasswordCom: dbDevice.PasswordCom };
        
        // 1. Descargar todos
        const users = await ZkDeviceService.getAllUsersFromDevice(device);
        
        // 2. Filtrar
        const uidsToDelete = users
            .filter((u: any) => targetPriv === 0 ? u.privilege === 0 : u.privilege > 0)
            .map((u: any) => u.uid);

        if (uidsToDelete.length === 0) return res.json({ status: 'OK', message: 'Nada que borrar.' });

        // 3. Borrar
        const tempFile = path.join(process.cwd(), `del_mass_${Date.now()}.txt`);
        const stream = fs.createWriteStream(tempFile);
        uidsToDelete.forEach((uid: string) => stream.write(`${uid}\n`));
        stream.end();
        await new Promise<void>(r => stream.on('finish', r));

        const result = await ZkDeviceService.deleteUsersFromFile(device, tempFile);
        try { if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile); } catch {}

        return res.json(result);
    } catch (e: any) { return res.status(500).json({ error: e.message }); }
};
export const deleteAllAdminsFromDevice = async (req: Request, res: Response) => {
    return deleteByPrivilege(req, res, 1); // 1 = Admins (Filtro > 0)
};
// =================================================================
// 🧠 NUEVO: Borrar TODOS los Administradores
// =================================================================
export const deleteAllUsersFromDevice = async (req: Request, res: Response) => {
    return deleteByPrivilege(req, res, 0); // 0 = Usuarios
};

export const captureSnapshot = async (req: Request, res: Response) => {
    res.status(501).json({ message: "Función de captura deshabilitada temporalmente por limitaciones de hardware." });
};

export const syncDeviceTime = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const device = await getDeviceById(parseInt(id));
        if (!device) return res.status(404).json({ message: 'Dispositivo no encontrado' });

        const result = await ZkDeviceService.syncTime(device);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};