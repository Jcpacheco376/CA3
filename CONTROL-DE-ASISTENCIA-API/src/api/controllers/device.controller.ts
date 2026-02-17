import { Request, Response } from 'express';
import sql from 'mssql';
import fs from 'fs';
import path from 'path';
import { dbConfig } from '../../config/database';
import { ZkDeviceService } from '../services/sync/ZkDeviceService';

// ==================================================================================
// 🛠️ HELPER
// ==================================================================================
export const getDeviceById = async (id: number) => {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
        .input('Id', sql.Int, id)
        .query('SELECT * FROM Dispositivos WHERE DispositivoId = @Id');
    return result.recordset[0];
};

// ==================================================================================
// 📦 CRUD DISPOSITIVOS Y ZONAS (ADMINISTRACIÓN)
// ==================================================================================

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
        res.json(newZone);
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
        await pool.request().input('Id', sql.Int, id).query('UPDATE Zonas SET Activo = 0 WHERE ZonaId = @Id');
        res.json({ message: 'Zona desactivada correctamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al desactivar la zona' });
    }
};

export const createDevice = async (req: Request, res: Response) => {
    const { Nombre, IpAddress, Puerto, ZonaId, PasswordCom, TipoConexion, BorrarChecadas, Activo } = req.body;
    try {
        const pool = await sql.connect(dbConfig);
        const checkResult = await pool.request()
            .input('Nombre', sql.NVarChar, Nombre)
            .input('IpAddress', sql.NVarChar, IpAddress)
            .query(`SELECT Nombre, IpAddress FROM Dispositivos WHERE (Nombre = @Nombre OR IpAddress = @IpAddress) AND Activo = 1`);

        if (checkResult.recordset.length > 0) {
            const existing = checkResult.recordset[0];
            if (existing.Nombre === Nombre) return res.status(409).json({ message: `El nombre "${Nombre}" ya está en uso.` });
            if (existing.IpAddress === IpAddress) return res.status(409).json({ message: `La IP "${IpAddress}" ya está en uso.` });
        }

        await pool.request()
            .input('Nombre', sql.NVarChar, Nombre)
            .input('IpAddress', sql.NVarChar, IpAddress)
            .input('Puerto', sql.Int, Puerto)
            .input('ZonaId', sql.Int, ZonaId)
            .input('PasswordCom', sql.NVarChar, String(PasswordCom || '0'))
            .input('TipoConexion', sql.NVarChar, TipoConexion || 'SDK') 
            .input('BorrarChecadas', sql.Bit, !!BorrarChecadas)
            .input('Activo', sql.Bit, Activo !== undefined ? !!Activo : 1)
            .query(`INSERT INTO Dispositivos (Nombre, IpAddress, Puerto, ZonaId, PasswordCom, TipoConexion, Activo, Estado, BorrarChecadas) VALUES (@Nombre, @IpAddress, @Puerto, @ZonaId, @PasswordCom, @TipoConexion, @Activo, 'Desconocido', @BorrarChecadas)`);
        res.json({ message: 'Dispositivo creado' });
    } catch (error: any) {
        res.status(500).json({ message: 'Error al crear dispositivo: ' + error.message });
    }
};

export const updateDevice = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { Nombre, IpAddress, Puerto, ZonaId, PasswordCom, BorrarChecadas, Activo } = req.body;
    try {
        const pool = await sql.connect(dbConfig);
        const checkResult = await pool.request()
            .input('Nombre', sql.NVarChar, Nombre)
            .input('IpAddress', sql.NVarChar, IpAddress)
            .input('Id', sql.Int, id)
            .query(`SELECT Nombre, IpAddress FROM Dispositivos WHERE (Nombre = @Nombre OR IpAddress = @IpAddress) AND Activo = 1 AND DispositivoId <> @Id`);

        if (checkResult.recordset.length > 0) {
            const existing = checkResult.recordset[0];
            if (existing.Nombre === Nombre) return res.status(409).json({ message: `El nombre "${Nombre}" ya está en uso.` });
            if (existing.IpAddress === IpAddress) return res.status(409).json({ message: `La IP "${IpAddress}" ya está en uso.` });
        }

        const request = pool.request()
            .input('Id', sql.Int, id)
            .input('Nombre', sql.NVarChar, Nombre)
            .input('IpAddress', sql.NVarChar, IpAddress)
            .input('Puerto', sql.Int, Puerto)
            .input('ZonaId', sql.Int, ZonaId)
            .input('BorrarChecadas', sql.Bit, !!BorrarChecadas)
            .input('Activo', sql.Bit, !!Activo);

        let passwordSetClause = "";
        if (PasswordCom !== undefined) {
            request.input('PasswordCom', sql.NVarChar, String(PasswordCom || '0'));
            passwordSetClause = ", PasswordCom=@PasswordCom";
        }

        await request.query(`UPDATE Dispositivos SET Nombre=@Nombre, IpAddress=@IpAddress, Puerto=@Puerto, ZonaId=@ZonaId, BorrarChecadas=@BorrarChecadas, Activo=@Activo ${passwordSetClause} WHERE DispositivoId = @Id`);
        res.json({ message: 'Dispositivo actualizado' });
    } catch (error: any) {
        res.status(500).json({ message: 'Error al actualizar: ' + error.message });
    }
};

// ==================================================================================
// 🧠 ORQUESTADOR DE SINCRONIZACIÓN (MASTER SYNC)
// ==================================================================================
export const syncDevice = async (req: Request, res: Response) => {
    const { id } = req.params;
    
    // Opciones por defecto (Si el frontend no envía nada, hace una sync inteligente)
    let options = req.body.options || {
        harvestUsers: true,     // 1. Bajar usuarios nuevos del reloj
        pushUsers: true,        // 2. Subir usuarios corregidos de BD
        pushBiometrics: true,   // 3. Subir rostros
        pushFingerprints: true, // 4. Subir huellas
        deleteInvalid: false,   // 4. Borrar usuarios no válidos (Peligroso, default off)
        syncTime: true          // 0. Ajustar hora
    };

    // Compatibilidad con nombres de opciones del frontend (Master Sync vs Tool Buttons)
    if (options.syncUsers !== undefined) options.pushUsers = options.syncUsers;
    if (options.syncFaces !== undefined) options.pushBiometrics = options.syncFaces;
    if (options.syncFingerprints !== undefined) options.pushFingerprints = options.syncFingerprints;

    console.log(`🔄 [SYNC MASTER] Disp ID: ${id} | Ops:`, options);
    
    let stats = { harvested: 0, usersSent: 0, facesSent: 0, deleted: 0, errors: [] as string[] };

    try {
        const device = await getDeviceById(parseInt(id));
        if (!device || !device.Activo || !device.ZonaId) return res.status(400).json({ error: 'Dispositivo inválido' });
        
        const zkDev = { Nombre: device.Nombre, IpAddress: device.IpAddress, Puerto: device.Puerto, PasswordCom: device.PasswordCom };
        const pool = await sql.connect(dbConfig);

        // PASO 1: HORA
        if (options.syncTime) await ZkDeviceService.syncTime(zkDev);

        // PASO 2: COSECHA (HARVEST)
        if (options.harvestUsers) {
            console.log(`📥 Cosechando usuarios...`);
            const users = await ZkDeviceService.getAllUsers(zkDev);
            stats.harvested = users.length;
            
            for (const u of users) {
                const uid = u.uid;
                const emp = await pool.request().input('Uid', sql.VarChar, uid).query('SELECT EmpleadoId FROM Empleados WHERE CodRef=@Uid');
                
                if (emp.recordset.length > 0) {
                    const empId = emp.recordset[0].EmpleadoId;
                    // Vincular a Zona si hace falta
                    await pool.request().input('EId', sql.Int, empId).input('ZId', sql.Int, device.ZonaId)
                        .query(`IF NOT EXISTS (SELECT 1 FROM EmpleadosZonas WHERE EmpleadoId=@EId AND ZonaId=@ZId) INSERT INTO EmpleadosZonas VALUES (@EId, @ZId)`);
                    
                    // Guardar Huellas (si vienen en getAllUsers)
                    if (u.fingers?.length) {
                        for (const f of u.fingers) {
                             await pool.request().input('EId', sql.Int, empId).input('Idx', sql.Int, f.fingerIndex).input('Tmp', sql.NVarChar(sql.MAX), f.template)
                                .query(`MERGE BiometriaHuellas AS T USING (SELECT @EId AS E, @Idx AS I) AS S ON (T.EmpleadoId=S.E AND T.DedoIndice=S.I) WHEN MATCHED THEN UPDATE SET Template=@Tmp WHEN NOT MATCHED THEN INSERT (EmpleadoId,DedoIndice,Template) VALUES (@EId,@Idx,@Tmp);`);
                        }
                    }
                }
            }
        }

        // PASO 3: SIEMBRA DE USUARIOS (PUSH USERS)
        if (options.pushUsers) {
            console.log(`📤 Enviando usuarios...`);
            const qUsers = `
                SELECT E.CodRef as uid, E.NombreCompleto as name, 
                       CASE WHEN E.Admindisp = 1 THEN 3 ELSE 0 END as privilege, 
                       '0' as password, 1 as enabled,
                       (SELECT DedoIndice as [index], Template as template FROM BiometriaHuellas WHERE EmpleadoId = E.EmpleadoId FOR JSON PATH) as fingersJson
                FROM Empleados E 
                JOIN EmpleadosZonas EZ ON E.EmpleadoId = EZ.EmpleadoId 
                WHERE EZ.ZonaId = @ZId AND E.Activo = 1
            `;
            const dbUsers = await pool.request().input('ZId', sql.Int, device.ZonaId).query(qUsers);
            
            if (dbUsers.recordset.length > 0) {
                const fName = path.join(process.cwd(), `users_${Date.now()}.txt`);
                const s = fs.createWriteStream(fName, { encoding: 'utf8' });
                
                for (const u of dbUsers.recordset) {
                    // Enviamos rostro como null para no romper el flujo con formatos viejos
                    let line = `${u.uid}|${u.name.substring(0, 24)}|${u.privilege}|${u.password}|${u.enabled}|null`;
                    if (options.pushFingerprints && u.fingersJson) {
                        const fs = JSON.parse(u.fingersJson);
                        for (const f of fs) line += `|${f.index}:${f.template}`;
                    }
                    s.write(line + '\n');
                }
                s.end();
                await new Promise<void>(r => s.on('finish', r));

                const res = await ZkDeviceService.uploadUsersBatch(zkDev, fName);
                stats.usersSent = res.success || 0;
                if (res.failed > 0) stats.errors.push(`Fallaron ${res.failed} usuarios.`);
                try { fs.unlinkSync(fName); } catch {}
            }
        }

        // PASO 4: SIEMBRA DE ROSTROS (PUSH BIO TABLE)
        if (options.pushBiometrics) {
            console.log(`🧬 Inyectando tabla de rostros (Visible Light)...`);
            const qFaces = `
                SELECT E.CodRef as uid, BR.Template, BR.Version, BR.IndiceRostro
                FROM Empleados E
                JOIN EmpleadosZonas EZ ON E.EmpleadoId = EZ.EmpleadoId
                JOIN BiometriaRostros BR ON E.EmpleadoId = BR.EmpleadoId
                WHERE EZ.ZonaId = @ZId AND E.Activo = 1 AND DATALENGTH(BR.Template) > 100
            `;
            const dbFaces = await pool.request().input('ZId', sql.Int, device.ZonaId).query(qFaces);

            if (dbFaces.recordset.length > 0) {
                const fName = path.join(process.cwd(), `bio_tbl_${Date.now()}.txt`);
                const s = fs.createWriteStream(fName, { encoding: 'utf8' });

                for (const f of dbFaces.recordset) {
                    const verStr = f.Version || "35.4";
                    const [maj, min] = verStr.split('.');
                    const tmp = f.Template.replace(/[\r\n\s]+/g, '');
                    // Formato SDKHelper: Pin=... Type=9 ...
                    const line = `Pin=${f.uid}\tValid=1\tDuress=0\tType=9\tMajorVer=${maj||35}\tMinorVer=${min||4}\tFormat=0\tNo=0\tIndex=${f.IndiceRostro||0}\tTmp=${tmp}`;
                    s.write(line + '\r\n');
                }
                s.end();
                await new Promise<void>(r => s.on('finish', r));

                await ZkDeviceService.uploadBioTable(zkDev, fName);
                stats.facesSent = dbFaces.recordset.length;
                try { fs.unlinkSync(fName); } catch {}
            }
        }

        res.json({ status: 'OK', message: 'Sincronización finalizada.', stats });

    } catch (e: any) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
};

// =================================================================
// 📤 HERRAMIENTA: SUBIR ROSTROS DE BD AL CHECADOR (PUSH PURA)
// =================================================================
export const pushFacesToDevice = async (req: Request, res: Response) => {
    const { id } = req.params;
    console.log(`📤 [PUSH FACES ONLY] Disp ID: ${id}`);

    try {
        const device = await getDeviceById(parseInt(id));
        if (!device || !device.Activo || !device.ZonaId) return res.status(400).json({ error: 'Dispositivo inválido' });
        
        const zkDev = { Nombre: device.Nombre, IpAddress: device.IpAddress, Puerto: device.Puerto, PasswordCom: device.PasswordCom };
        const pool = await sql.connect(dbConfig);

        const qFaces = `
            SELECT E.CodRef as uid, BR.Template, BR.Version, BR.IndiceRostro
            FROM Empleados E
            JOIN EmpleadosZonas EZ ON E.EmpleadoId = EZ.EmpleadoId
            JOIN BiometriaRostros BR ON E.EmpleadoId = BR.EmpleadoId
            WHERE EZ.ZonaId = @ZId AND E.Activo = 1 AND DATALENGTH(BR.Template) > 100
        `;
        const dbFaces = await pool.request().input('ZId', sql.Int, device.ZonaId).query(qFaces);

        if (dbFaces.recordset.length > 0) {
            const fName = path.join(process.cwd(), `bio_tbl_push_${Date.now()}.txt`);
            const s = fs.createWriteStream(fName, { encoding: 'utf8' });

            for (const f of dbFaces.recordset) {
                const verStr = f.Version || "35.4";
                const [maj, min] = verStr.split('.');
                const tmp = f.Template.replace(/[\r\n\s]+/g, '');
                const line = `Pin=${f.uid}\tValid=1\tDuress=0\tType=9\tMajorVer=${maj||35}\tMinorVer=${min||4}\tFormat=0\tNo=0\tIndex=${f.IndiceRostro||0}\tTmp=${tmp}`;
                s.write(line + '\r\n');
            }
            s.end();
            await new Promise<void>(r => s.on('finish', r));

            await ZkDeviceService.uploadBioTable(zkDev, fName);
            try { fs.unlinkSync(fName); } catch {}
            
            res.json({ status: 'OK', message: `Se enviaron ${dbFaces.recordset.length} rostros.` });
        } else {
            res.json({ status: 'OK', message: 'No hay rostros para enviar en esta zona.' });
        }
    } catch (e: any) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
};

// =================================================================
// 🖐️ HERRAMIENTA: SUBIR HUELLAS DE BD AL CHECADOR (PUSH PURA)
// =================================================================
export const pushFingerprintsToDevice = async (req: Request, res: Response) => {
    const { id } = req.params;
    console.log(`📤 [PUSH FINGERPRINTS] Disp ID: ${id}`);

    try {
        const device = await getDeviceById(parseInt(id));
        if (!device || !device.Activo || !device.ZonaId) return res.status(400).json({ error: 'Dispositivo inválido o sin zona.' });
        
        const zkDev = { Nombre: device.Nombre, IpAddress: device.IpAddress, Puerto: device.Puerto, PasswordCom: device.PasswordCom };
        const pool = await sql.connect(dbConfig);

        // 1. Obtener huellas de empleados ACTIVOS en la ZONA
        const qFingers = `
            SELECT E.CodRef as uid, BH.DedoIndice, BH.Template
            FROM Empleados E
            JOIN EmpleadosZonas EZ ON E.EmpleadoId = EZ.EmpleadoId
            JOIN BiometriaHuellas BH ON E.EmpleadoId = BH.EmpleadoId
            WHERE EZ.ZonaId = @ZId AND E.Activo = 1
            ORDER BY E.CodRef
        `;
        const dbFingers = await pool.request().input('ZId', sql.Int, device.ZonaId).query(qFingers);

        if (dbFingers.recordset.length > 0) {
            // 2. Agrupar por Usuario: UID|Idx:Tmp|Idx:Tmp
            const usersMap = new Map<string, string[]>();
            
            for (const row of dbFingers.recordset) {
                if (!usersMap.has(row.uid)) usersMap.set(row.uid, []);
                usersMap.get(row.uid)?.push(`${row.DedoIndice}:${row.Template}`);
            }

            const fName = path.join(process.cwd(), `fingers_push_${Date.now()}.txt`);
            const s = fs.createWriteStream(fName, { encoding: 'utf8' });

            for (const [uid, fingers] of usersMap) {
                if (fingers) {
                    s.write(`${uid}|${fingers.join('|')}\n`);
                }
            }
            s.end();
            await new Promise<void>(r => s.on('finish', r));

            // 3. Enviar al Bridge
            const result = await ZkDeviceService.uploadFingerprintsBatch(zkDev, fName);
            try { fs.unlinkSync(fName); } catch {}
            
            res.json({ status: 'OK', message: `Se procesaron huellas de ${usersMap.size} usuarios.`, result });
        } else {
            res.json({ status: 'OK', message: 'No hay huellas para enviar en esta zona.' });
        }
    } catch (e: any) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
};

// =================================================================
// 🕵️ HERRAMIENTA: BAJAR ROSTROS DEL CHECADOR A LA BD (COSECHA PURA)
// =================================================================
export const downloadFacesFromDevice = async (req: Request, res: Response) => {
    const { id } = req.params;
    console.log(`📥 [DOWNLOAD FACES] Disp ID: ${id}`);

    try {
        const device = await getDeviceById(parseInt(id));
        if (!device) return res.status(404).json({ error: 'Dispositivo no encontrado' });
        
        const zkDev = { Nombre: device.Nombre, IpAddress: device.IpAddress, Puerto: device.Puerto, PasswordCom: device.PasswordCom };
        const pool = await sql.connect(dbConfig);

        // 1. Obtener lista de usuarios para iterar
        const users = await ZkDeviceService.getAllUsers(zkDev);
        if (!users.length) return res.json({ status: 'OK', message: 'Reloj vacío.' });
        
        let saved = 0;

        for (const user of users) {
            // 2. Obtener datos crudos (Tabla Pers_Biotemplate) para cada usuario
            const result = await ZkDeviceService.getBioData(zkDev, user.uid);

            console.log(`👤 Procesando UID ${user.uid} - Resultado:`, result);
             if (result.raw_data) {
                const lines = result.raw_data.split(/\r?\n/);
                
                console.log(`👤 Procesando UID ${user.uid} - ${lines.length} líneas de datos biométricos crudos.`);
                for (const line of lines) {
                    const parts = line.trim().split(',');
                    if (parts.length < 10 || line.startsWith('Pin')) continue;

                    // Pin,Valid,Duress,Type,MajorVer,MinorVer,Format,No,Index,Tmp
                    const [pPin, pValid, pDuress, pType, pMaj, pMin, pFmt, pNo, pIdx, pTmp] = parts;

                    // Solo Rostros (2 o 9)
                    if (pType !== '9' && pType !== '9') continue;

                    const faceIndex = parseInt(pIdx);
                    if (isNaN(faceIndex)) continue;

                    const emp = await pool.request()
                        .input('U', sql.VarChar, pPin)
                        .input('ZId', sql.Int, device.ZonaId)
                        .query(`
                            SELECT E.EmpleadoId 
                            FROM Empleados E
                            INNER JOIN EmpleadosZonas EZ ON E.EmpleadoId = EZ.EmpleadoId
                            WHERE E.CodRef = @U AND E.Activo = 1 AND EZ.ZonaId = @ZId
                        `);

                    if (emp.recordset.length > 0) {
                        await pool.request()
                            .input('EId', sql.Int, emp.recordset[0].EmpleadoId)
                            .input('Idx', sql.Int, faceIndex)
                            .input('Tmp', sql.NVarChar(sql.MAX), pTmp || '')
                            .input('Ver', sql.VarChar, `${pMaj}.${pMin}`)
                            .input('Len', sql.Int, (pTmp || '').length)
                            .query(`MERGE BiometriaRostros AS T USING (SELECT @EId AS E, @Idx AS I) AS S ON (T.EmpleadoId=S.E AND T.IndiceRostro=S.I) WHEN MATCHED THEN UPDATE SET Template=@Tmp, Version=@Ver, Longitud=@Len, UltimaActualizacion=GETDATE() WHEN NOT MATCHED THEN INSERT (EmpleadoId,IndiceRostro,Template,Version,Longitud,UltimaActualizacion) VALUES (@EId,@Idx,@Tmp,@Ver,@Len,GETDATE());`);
                        saved++;
                    }
                }
            }
        }
        res.json({ status: 'OK', message: `Descarga completada. ${saved} rostros procesados.` });
    } catch (e: any) { 
        console.error("Error downloadFacesFromDevice:", e);
        res.status(500).json({ error: e.message }); 
    }
};

// =================================================================
// � LOGS Y CONECTIVIDAD (LEGACY)
// =================================================================

export const getLogs = async (req: Request, res: Response) => {
    const { id } = req.params;
    let pool, transaction;
    try {
        const device = await getDeviceById(parseInt(id));
        if (!device) return res.status(404).json({ message: 'Dispositivo no encontrado' });

        const zkDev = { Nombre: device.Nombre, IpAddress: device.IpAddress, Puerto: device.Puerto, PasswordCom: device.PasswordCom };
        const logs = await ZkDeviceService.downloadLogs(zkDev);

        if (!logs || logs.length === 0) return res.json({ success: true, message: 'No hay registros nuevos.', count: 0 });

        pool = await sql.connect(dbConfig);
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        for (const log of logs) {
            const request = new sql.Request(transaction);
            await request.input('CodRef', sql.NVarChar, log.uid).input('FechaHora', sql.VarChar, log.timestamp).input('Checador', sql.NVarChar, device.Nombre)
                .query(`INSERT INTO dbo.Checadas (EmpleadoId, FechaHora, Checador) SELECT E.EmpleadoId, @FechaHora, @Checador FROM dbo.Empleados E WHERE E.CodRef = @CodRef AND NOT EXISTS (SELECT 1 FROM dbo.Checadas C WHERE C.EmpleadoId = E.EmpleadoId AND C.FechaHora = @FechaHora)`);
        }
        await transaction.commit();

        let logMessage = `Sincronización finalizada. Procesados: ${logs.length}.`;
        if (device.BorrarChecadas) {
            await ZkDeviceService.clearLogs(zkDev);
            logMessage += " Registros borrados.";
        }
        
        await pool.request().input('Id', sql.Int, device.DispositivoId).query("UPDATE Dispositivos SET UltimaSincronizacion = GETDATE(), Estado='Conectado' WHERE DispositivoId = @Id");
        res.json({ success: true, message: logMessage, count: logs.length });
    } catch (error: any) {
        if (transaction) await transaction.rollback();
        res.status(500).json({ message: 'Error: ' + error.message });
    }
};

export const testDeviceConnection = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const device = await getDeviceById(parseInt(id));
        const zkDev = { Nombre: device.Nombre, IpAddress: device.IpAddress, Puerto: device.Puerto, PasswordCom: device.PasswordCom };
        const result = await ZkDeviceService.testConnection(zkDev);
        if (result.status === 'OK') {
            const pool = await sql.connect(dbConfig);
            await pool.request().input('Id', sql.Int, device.DispositivoId).query("UPDATE Dispositivos SET Estado='Conectado', UltimaSincronizacion=GETDATE() WHERE DispositivoId=@Id");
        }
        res.json({ message: 'Conexión Exitosa' });
    } catch (error: any) {
        res.status(500).json({ message: 'Error de conexión: ' + error.message });
    }
};

export const testConnectionManual = async (req: Request, res: Response) => {
    const { IpAddress, Puerto, Password, DeviceId } = req.body;
    if (!IpAddress || !Puerto) return res.status(400).json({ message: 'Faltan datos' });
    try {
        let finalPassword = Password;
        if (DeviceId && Password === "") {
            const device = await getDeviceById(parseInt(DeviceId));
            if (device) finalPassword = device.PasswordCom;
        }
        const dummyDevice = { Nombre: 'Test', IpAddress, Puerto: parseInt(Puerto), PasswordCom: finalPassword || 0 };
        const result = await ZkDeviceService.testConnection(dummyDevice);
        if (result.status === 'OK') res.json({ message: 'Conexión Exitosa' });
        else res.status(400).json({ message: 'No se pudo conectar' });
    } catch (error: any) {
        res.status(500).json({ message: 'Fallo al conectar: ' + error.message });
    }
};

export const diagnoseDevice = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const device = await getDeviceById(parseInt(id));
        const zkDev = { Nombre: device.Nombre, IpAddress: device.IpAddress, Puerto: device.Puerto, PasswordCom: device.PasswordCom };
        const info = await ZkDeviceService.getInfo(zkDev);
        res.json(info);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const captureSnapshot = async (req: Request, res: Response) => {
    res.status(501).json({ message: "Deshabilitado." });
};

export const syncDeviceTime = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const device = await getDeviceById(parseInt(id));
        const zkDev = { Nombre: device.Nombre, IpAddress: device.IpAddress, Puerto: device.Puerto, PasswordCom: device.PasswordCom };
        const result = await ZkDeviceService.syncTime(zkDev);
        res.json(result);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
};

// COMPATIBILIDAD LEGACY
export const syncEmployeesFull = syncDevice;

// =================================================================
// �🗑️ HERRAMIENTAS DE LIMPIEZA
// =================================================================

export const deleteEmployeesFromDevice = async (req: Request, res: Response) => {
    const { id } = req.params; const { uids } = req.body;
    if (!uids || !uids.length) return res.status(400).json({ error: 'Faltan UIDs' });
    try {
        const device = await getDeviceById(parseInt(id));
        const zkDev = { Nombre: device.Nombre, IpAddress: device.IpAddress, Puerto: device.Puerto, PasswordCom: device.PasswordCom };
        
        const fName = path.join(process.cwd(), `del_${Date.now()}.txt`);
        const s = fs.createWriteStream(fName);
        uids.forEach((u: string) => s.write(`${u}\n`));
        s.end();
        await new Promise<void>(r => s.on('finish', r));

        const result = await ZkDeviceService.deleteUsersBatch(zkDev, fName);
        try { fs.unlinkSync(fName); } catch {}
        res.json(result);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
};

export const deleteFaces = async (req: Request, res: Response) => {
    const { id } = req.params;
    console.log(`🗑️ [DELETE FACES] Disp ID: ${id}`);
    try {
        const device = await getDeviceById(parseInt(id));
        if (!device) return res.status(404).json({ error: 'Dispositivo no encontrado' });

        const zkDev = { Nombre: device.Nombre, IpAddress: device.IpAddress, Puerto: device.Puerto, PasswordCom: device.PasswordCom };
        
        const result = await ZkDeviceService.clearFaces(zkDev);
        res.json({ status: 'OK', message: 'Rostros eliminados del dispositivo.', result });
    } catch (e: any) {
        console.error("Error deleteFaces:", e);
        res.status(500).json({ error: e.message });
    }
};

export const deleteFingerprints = async (req: Request, res: Response) => {
    const { id } = req.params;
    console.log(`🗑️ [DELETE FINGERPRINTS] Disp ID: ${id}`);
    try {
        const device = await getDeviceById(parseInt(id));
        if (!device) return res.status(404).json({ error: 'Dispositivo no encontrado' });

        const zkDev = { Nombre: device.Nombre, IpAddress: device.IpAddress, Puerto: device.Puerto, PasswordCom: device.PasswordCom };
        
        const result = await ZkDeviceService.clearFingerprints(zkDev);
        res.json({ status: 'OK', message: 'Huellas eliminadas del dispositivo.', result });
    } catch (e: any) {
        console.error("Error deleteFingerprints:", e);
        res.status(500).json({ error: e.message });
    }
};

export const deleteAllData = async (req: Request, res: Response) => {
    const { id } = req.params;
    console.log(`🗑️ [DELETE ALL DATA] Disp ID: ${id}`);
    try {
        const device = await getDeviceById(parseInt(id));
        if (!device) return res.status(404).json({ error: 'Dispositivo no encontrado' });

        const zkDev = { Nombre: device.Nombre, IpAddress: device.IpAddress, Puerto: device.Puerto, PasswordCom: device.PasswordCom };
        
        const result = await ZkDeviceService.clearData(zkDev);
        res.json({ status: 'OK', message: 'Todos los datos han sido eliminados del dispositivo.', result });
    } catch (e: any) {
        console.error("Error deleteAllData:", e);
        res.status(500).json({ error: e.message });
    }
};

export const deleteAllUsersFromDevice = async (req: Request, res: Response) => {
    const { id } = req.params;
    console.log(`🗑️ [DELETE ALL USERS] Disp ID: ${id}`);
    try {
        const device = await getDeviceById(parseInt(id));
        const zkDev = { Nombre: device.Nombre, IpAddress: device.IpAddress, Puerto: device.Puerto, PasswordCom: device.PasswordCom };
        
        const users = await ZkDeviceService.getAllUsers(zkDev);
        // Borrar TODOS (sin filtrar por privilegio)
        const uidsToDelete = users.map((u: any) => u.uid);

        if (!uidsToDelete.length) return res.json({ status: 'OK', message: 'El dispositivo ya está vacío.' });

        const fName = path.join(process.cwd(), `del_all_users_${Date.now()}.txt`);
        const s = fs.createWriteStream(fName);
        uidsToDelete.forEach((u: string) => s.write(`${u}\n`));
        s.end();
        await new Promise<void>(r => s.on('finish', r));

        const result = await ZkDeviceService.deleteUsersBatch(zkDev, fName);
        try { fs.unlinkSync(fName); } catch {}
        res.json(result);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
};

export const deleteAllAdminsFromDevice = async (req: Request, res: Response) => {
    const { id } = req.params;
    console.log(`🛡️ [DEMOTE ADMINS] Disp ID: ${id}`);
    try {
        const device = await getDeviceById(parseInt(id));
        const zkDev = { Nombre: device.Nombre, IpAddress: device.IpAddress, Puerto: device.Puerto, PasswordCom: device.PasswordCom };
        
        // 1. Obtener usuarios del dispositivo
        const users = await ZkDeviceService.getAllUsers(zkDev);
        
        // 2. Filtrar los que son administradores (privilege > 0)
        const admins = users.filter((u: any) => u.privilege > 0);

        if (!admins.length) return res.json({ status: 'OK', message: 'No se encontraron administradores en el dispositivo.' });

        // 3. Construir archivo para re-subirlos como usuarios normales (privilege = 0)
        const fName = path.join(process.cwd(), `demote_admins_${Date.now()}.txt`);
        const s = fs.createWriteStream(fName, { encoding: 'utf8' });

        for (const u of admins) {
            // Formato esperado por UploadUsersFromFile en Program.cs:
            // uid|name|privilege|password|enabled|face|finger1|finger2...
            
            // Forzamos privilegio 0 (Usuario Normal)
            let line = `${u.uid}|${u.name}|0|${u.password}|1|${u.face || 'null'}`;
            
            if (u.fingers && Array.isArray(u.fingers)) {
                for (const f of u.fingers) {
                    line += `|${f.fingerIndex}:${f.template}`;
                }
            }
            s.write(line + '\n');
        }
        s.end();
        await new Promise<void>(r => s.on('finish', r));

        // 4. Usar uploadUsersBatch para sobrescribir la info con el nuevo privilegio
        const result = await ZkDeviceService.uploadUsersBatch(zkDev, fName);
        try { fs.unlinkSync(fName); } catch {}
        
        res.json({ 
            status: 'OK', 
            message: `Se quitaron permisos de administrador a ${admins.length} usuarios.`,
            details: result 
        });

    } catch (e: any) { 
        console.error("Error demoting admins:", e);
        res.status(500).json({ error: e.message }); 
    }
};