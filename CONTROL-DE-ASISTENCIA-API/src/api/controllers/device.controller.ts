// src/api/controllers/device.controller.ts
import { Request, Response } from 'express';
import sql from 'mssql';
import { dbConfig } from '../../config/database';
import { ZkDeviceService } from '../services/sync/ZkDeviceService';
//import { getDeviceById } from '../services/deviceService'; 

export const getDevices = async (req: Request, res: Response) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
            SELECT d.*, z.Nombre as ZonaNombre 
            FROM Dispositivos d
            LEFT JOIN Zonas z ON d.ZonaId = z.ZonaId
            WHERE d.Activo = 1
        `);
        res.json(result.recordset);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener dispositivos' });
    }
};
export const getDeviceById = async (id: number) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('Id', sql.Int, id)
            .query('SELECT * FROM Dispositivos WHERE DispositivoId = @Id');
        
        return result.recordset[0]; // Retorna el dispositivo o undefined
    } catch (error) {
        console.error('Error SQL getDeviceById:', error);
        throw error;
    }
};
export const getZones = async (req: Request, res: Response) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query("SELECT * FROM Zonas WHERE Activo = 1");
        res.json(result.recordset);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener zonas' });
    }
};

export const createDevice = async (req: Request, res: Response) => {
    const { Nombre, IpAddress, Puerto, ZonaId, PasswordCom, TipoConexion } = req.body;
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('Nombre', sql.NVarChar, Nombre)
            .input('IpAddress', sql.NVarChar, IpAddress)
            .input('Puerto', sql.Int, Puerto)
            .input('ZonaId', sql.Int, ZonaId)
            .input('PasswordCom', sql.NVarChar, PasswordCom)
            .input('TipoConexion', sql.NVarChar, TipoConexion || 'SDK')
            .query(`
                INSERT INTO Dispositivos (Nombre, IpAddress, Puerto, ZonaId, PasswordCom, TipoConexion, Activo, Estado)
                VALUES (@Nombre, @IpAddress, @Puerto, @ZonaId, @PasswordCom, @TipoConexion, 1, 'Desconocido')
            `);
        res.json({ message: 'Dispositivo creado' });
    } catch (error) {
        res.status(500).json({ message: 'Error al crear dispositivo' });
    }
};

export const updateDevice = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { Nombre, IpAddress, Puerto, ZonaId, PasswordCom } = req.body;
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('Id', sql.Int, id)
            .input('Nombre', sql.NVarChar, Nombre)
            .input('IpAddress', sql.NVarChar, IpAddress)
            .input('Puerto', sql.Int, Puerto)
            .input('ZonaId', sql.Int, ZonaId)
            .input('PasswordCom', sql.NVarChar, PasswordCom)
            .query(`
                UPDATE Dispositivos 
                SET Nombre=@Nombre, IpAddress=@IpAddress, Puerto=@Puerto, ZonaId=@ZonaId, PasswordCom=@PasswordCom
                WHERE DispositivoId = @Id
            `);
        res.json({ message: 'Dispositivo actualizado' });
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar' });
    }
};

export const syncDeviceManual = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('Id', sql.Int, id)
            .query("SELECT * FROM Dispositivos WHERE DispositivoId = @Id");
        
        const device = result.recordset[0];
        if (!device) return res.status(404).json({ message: 'Dispositivo no encontrado' });

        await ZkDeviceService.downloadLogs(device); 

        res.json({ message: 'Descarga de checadas ejecutada correctamente' });
    } catch (error: any) {
        res.status(500).json({ message: 'Error en sincronización: ' + error.message });
    }
};

export const testDeviceConnection = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('Id', sql.Int, id)
            .query("SELECT * FROM Dispositivos WHERE DispositivoId = @Id");
        
        const device = result.recordset[0];
        if (!device) return res.status(404).json({ message: 'Dispositivo no encontrado' });

        await ZkDeviceService.testConnection(device);

        res.json({ message: 'Conexión Exitosa' });
    } catch (error: any) {
        res.status(500).json({ message: 'Error de conexión: ' + error.message });
    }
};

// --- ESTA ES LA FUNCIÓN QUE FALTABA O ESTABA DESCONECTADA ---
export const diagnoseDevice = async (req: Request, res: Response) => {
    const { id } = req.params;
    
    // --- LOG DE TRAZABILIDAD ---
    console.log(`🚀 [API] Petición de diagnóstico recibida para ID: ${id}`);
    
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('Id', sql.Int, id)
            .query("SELECT * FROM Dispositivos WHERE DispositivoId = @Id");
        
        const device = result.recordset[0];
        if (!device) {
            console.log(`⚠️ [API] Dispositivo no encontrado en BD`);
            return res.status(404).json({ message: 'Dispositivo no encontrado' });
        }

        const info = await ZkDeviceService.getDebugInfo(device);
        res.json(info);
    } catch (error: any) {
        console.error(`❌ [API] Error crítico en controlador:`, error);
        res.status(500).json({ message: error.message });
    }
};
export const captureSnapshot = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        
        // 1. Buscamos la info del dispositivo (IP, Puerto, etc.) en la BD
        const device = await getDeviceById(id); 
        if (!device) return res.status(404).json({ error: 'Dispositivo no encontrado' });

        // 2. Llamamos a la lógica del Bridge que creamos
        const result = await ZkDeviceService.captureRemoteImage(device);
        console.log('📸 Resultado de captura de imagen:', result);
        // 3. Devolvemos la URL de la imagen o el error
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }

    } catch (error: any) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
};