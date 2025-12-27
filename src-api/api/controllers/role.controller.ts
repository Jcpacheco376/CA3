import { Request, Response } from 'express';
import sql from 'mssql';
import { dbConfig } from '../../config/database';

export const getAllRoles = async (req: any, res: Response) => {
    if (!req.user.permissions['roles.assign']) return res.status(403).json({ message: 'Acceso denegado.' });
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().execute('sp_Roles_GetAll');
        res.json(result.recordset.map(role => ({ ...role, Permisos: role.Permisos ? JSON.parse(role.Permisos) : [] })));
    } catch (err) { res.status(500).json({ message: 'Error al obtener roles.' }); }
};

export const upsertRole = async (req: any, res: Response) => {
    if (!req.user.permissions['roles.manage']) return res.status(403).json({ message: 'Acceso denegado.' }); // Corregido a 'manage'
    
    const { RoleId, NombreRol, Descripcion, Permisos } = req.body;
    
    let pool: sql.ConnectionPool | undefined;

    try {
        pool = await sql.connect(dbConfig);
        
        // 1. Guardar el Rol
        const result = await pool.request() 
            .input('RoleId', sql.Int, RoleId || 0)
            .input('NombreRol', sql.NVarChar, NombreRol)
            .input('Descripcion', sql.NVarChar, Descripcion)
            .input('PermisosJSON', sql.NVarChar, JSON.stringify(Permisos || []))
            .execute('sp_Roles_Upsert');
        
        const savedRole = { RoleId: result.recordset[0].RoleId, NombreRol };

        // 2. --- NUEVO: Invalidar sesiones de usuarios afectados ---
        // Si es una actualización (RoleId > 0), incrementamos la versión del token
        if (RoleId > 0) {
            await pool.request()
                .input('RoleId', sql.Int, RoleId)
                .execute('sp_Roles_UpdateTokenVersion');
            //console.log(`Sesiones invalidadas para usuarios del rol ${RoleId}`);
        }

        res.status(200).json({ message: 'Rol guardado correctamente.', role: savedRole });

    } catch (err: any) { 
        console.error("Error al guardar rol:", err.message);
        res.status(409).json({ message: err.message });
    } finally {
        if (pool) pool.close();
    }
};

export const getAllPermissions = async (req: any, res: Response) => {
    if (!req.user.permissions['roles.assign']) return res.status(403).json({ message: 'Acceso denegado.' });
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().execute('sp_Permisos_GetAll');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: 'Error al obtener permisos.' }); }
};
