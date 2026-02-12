// src/api/controllers/device.controller.ts
import { Request, Response } from 'express';
import sql from 'mssql';
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
    
    // Variables para estadísticas
    let imported = 0;
    let sent = 0;
    let deleted = 0;

    console.log(`🚀 [SYNC-FULL] Iniciando para Dispositivo ID: ${id}`);

    try {
        // ------------------------------------------------------------
        // 1. VALIDACIONES (Lectura rápida, sin transacción)
        // ------------------------------------------------------------
        const pool = await sql.connect(dbConfig);
        const deviceResult = await pool.request()
            .input('Id', sql.Int, id)
            .query('SELECT * FROM Dispositivos WHERE DispositivoId = @Id');

        const device = deviceResult.recordset[0];
        if (!device) return res.status(404).json({ message: 'Dispositivo no encontrado' });
        if (!device.ZonaId) return res.status(400).json({ message: 'Sin Zona asignada.' });

        // ------------------------------------------------------------
        // FASE A (RED): Descargar usuarios (SIN TRANSACCIÓN SQL)
        // ------------------------------------------------------------
        console.log(`   ⬇️  Fase A (Red): Descargando usuarios...`);
        const deviceUsers = await ZkDeviceService.getAllUsersFromDevice(device);
        
        if (!Array.isArray(deviceUsers)) {
             throw new Error("Error de comunicación: El dispositivo no devolvió una lista válida.");
        }

        // ------------------------------------------------------------
        // FASE A (BD): Guardar en SQL (TRANSACCIÓN CORTA Y ATÓMICA)
        // ------------------------------------------------------------
        console.log(`   💾 Fase A (BD): Guardando ${deviceUsers.length} usuarios...`);
        
        const transaction = new sql.Transaction(pool);
        try {
            await transaction.begin(); // Abrimos
            
            // Usamos un loop rápido. Al no haber 'awaits' de red aquí, esto vuela.
            for (const u of deviceUsers) {
                if (!u.uid) continue;

                // 1. Upsert Empleado
                // Usamos lógica de "Si existe dame ID, si no crea"
                const requestEmp = new sql.Request(transaction);
                const empResult = await requestEmp
                    .input('CodRef', sql.NVarChar, u.uid)
                    .input('Nombre', sql.NVarChar, u.name || `Emp ${u.uid}`)
                    .input('ZonaId', sql.Int, device.ZonaId)
                    .query(`
                        DECLARE @EmpId INT;
                        SELECT @EmpId = EmpleadoId FROM Empleados WHERE CodRef = @CodRef;
                        
                        IF @EmpId IS NULL
                        BEGIN
                            INSERT INTO Empleados (CodRef, NombreCompleto, Activo, FechaAlta)
                            VALUES (@CodRef, @Nombre, 1, GETDATE());
                            SET @EmpId = SCOPE_IDENTITY();
                            
                            -- Vincular a Zona por defecto al crearse
                            INSERT INTO EmpleadosZonas (EmpleadoId, ZonaId) VALUES (@EmpId, @ZonaId);
                        END
                        
                        SELECT @EmpId as EmpleadoId;
                    `);
                
                const empleadoId = empResult.recordset[0]?.EmpleadoId;

                if (empleadoId) {
                    // 2. Upsert Huellas
                    if (u.fingers && Array.isArray(u.fingers)) {
                        for (const huella of u.fingers) {
                            await new sql.Request(transaction)
                                .input('EmpId', sql.Int, empleadoId)
                                .input('Dedo', sql.Int, huella.fingerIndex)
                                .input('Tmp', sql.VarChar(sql.MAX), huella.template)
                                .query(`
                                    MERGE BiometriaHuellas AS target
                                    USING (SELECT @EmpId, @Dedo) AS source (EmpleadoId, IndiceDedo)
                                    ON (target.EmpleadoId = source.EmpleadoId AND target.IndiceDedo = source.IndiceDedo)
                                    WHEN MATCHED THEN UPDATE SET Template = @Tmp
                                    WHEN NOT MATCHED THEN INSERT (EmpleadoId, IndiceDedo, Template) VALUES (@EmpId, @Dedo, @Tmp);
                                `);
                        }
                    }
                    // 3. Upsert Rostro
                    if (u.face) {
                        await new sql.Request(transaction)
                            .input('EmpId', sql.Int, empleadoId)
                            .input('Tmp', sql.VarChar(sql.MAX), u.face)
                            .query(`
                                MERGE BiometriaRostros AS target
                                USING (SELECT @EmpId) AS source (EmpleadoId)
                                ON (target.EmpleadoId = source.EmpleadoId)
                                WHEN MATCHED THEN UPDATE SET Template = @Tmp
                                WHEN NOT MATCHED THEN INSERT (EmpleadoId, Template) VALUES (@EmpId, @Tmp);
                            `);
                    }
                    imported++;
                }
            }

            await transaction.commit(); // Cerramos inmediatamente
            console.log("   ✅ Transacción SQL completada exitosamente.");

        } catch (dbError) {
            await transaction.rollback(); // Rollback inmediato si falla SQL
            throw dbError; // Rebotamos el error para salir
        }

        // ------------------------------------------------------------
        // FASE B: Preparar Datos para Envío (Lectura SQL Rápida)
        // ------------------------------------------------------------
        console.log(`   ⬆️  Fase B: Consultando autorizados...`);
        
        // Obtenemos lista AUTORIZADA e incluimos el campo EsAdminChecador
        const autorizadosResult = await pool.request()
            .input('ZonaId', sql.Int, device.ZonaId)
            .query(`
                SELECT E.EmpleadoId, E.CodRef, E.NombreCompleto, E.Activo, 
                       E.PasswordDevice, E.admindisp -- <--- CAMPO NUEVO
                FROM Empleados E
                INNER JOIN EmpleadosZonas EZ ON E.EmpleadoId = EZ.EmpleadoId
                WHERE EZ.ZonaId = @ZonaId AND E.Activo = 1
            `);

        const payloadToUpload = [];

        for (const emp of autorizadosResult.recordset) {
            // Biometría (Lecturas rápidas)
            const huellas = await pool.request().input('EmpId', sql.Int, emp.EmpleadoId).query("SELECT * FROM BiometriaHuellas WHERE EmpleadoId = @EmpId");
            const rostro = await pool.request().input('EmpId', sql.Int, emp.EmpleadoId).query("SELECT * FROM BiometriaRostros WHERE EmpleadoId = @EmpId");

            // LÓGICA DE PRIVILEGIO ZKTECO
            // 14 = Super Admin / 0 = Usuario Normal
            const zktecoPrivilege = emp.admindisp ? 14 : 0;

            payloadToUpload.push({
                uid: emp.CodRef,
                name: emp.NombreCompleto,
                privilege: zktecoPrivilege, // <--- Asignamos el rol
                password: emp.PasswordDevice || "",
                fingers: huellas.recordset.map(h => ({ index: h.IndiceDedo, template: h.Template })),
                face: rostro.recordset.length > 0 ? rostro.recordset[0].Template : null
            });
        }

        // ------------------------------------------------------------
        // FASE B (RED): Enviar al Dispositivo
        // ------------------------------------------------------------
        if (payloadToUpload.length > 0) {
            await ZkDeviceService.uploadUsersToDevice(device, payloadToUpload);
            sent = payloadToUpload.length;
        }

        // ------------------------------------------------------------
        // FASE C (RED): Limpieza Segura
        // ------------------------------------------------------------
        const uidsAutorizados = payloadToUpload.map(x => x.uid);
        const uidsBorrar = deviceUsers
            .filter(u => !uidsAutorizados.includes(u.uid)) 
            .map(u => u.uid);

        if (uidsBorrar.length > 0) {
            // SAFEGUARD: No borrar más del 50% si son muchos usuarios
            const totalUsers = deviceUsers.length;
            const porcentaje = (uidsBorrar.length / totalUsers) * 100;

            if (totalUsers > 5 && porcentaje > 50) {
                console.warn(`   🛑 BLOQUEO DE SEGURIDAD: Se intentó borrar ${porcentaje}% de usuarios.`);
            } else {
                console.log(`   🗑️  Eliminando ${uidsBorrar.length} usuarios obsoletos...`);
                await ZkDeviceService.deleteUsersFromDevice(device, uidsBorrar);
                deleted = uidsBorrar.length;
            }
        }

        res.json({
            success: true,
            message: 'Sincronización Completada',
            stats: { imported, sent, deleted }
        });

    } catch (error: any) {
        console.error('❌ Error Sincronización:', error);
        res.status(500).json({ message: 'Error: ' + error.message });
    }
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