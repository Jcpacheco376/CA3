import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import sql from 'mssql';
import { dbConfig } from '../../config/database';
import { JWT_SECRET } from '../../config';

export const authMiddleware = async (req: any, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Acceso no autorizado: Token no proporcionado.' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded: any = jwt.verify(token, JWT_SECRET);

        // Si es el super admin temporal, asigna todos los permisos
        if (decoded.usuarioId === 0) {
            const pool = await sql.connect(dbConfig);
            const permissionsResult = await pool.request().execute('sp_Permisos_GetAll');
            const permissions: { [key: string]: any[] } = {};
            permissionsResult.recordset.forEach(p => { permissions[p.NombrePermiso] = [true]; });
            req.user = { usuarioId: 0, permissions };
            return next();
        }
        const pool = await sql.connect(dbConfig);

        const userVersionResult = await pool.request()
            .input('UsuarioId', sql.Int, decoded.usuarioId)
            .query('SELECT TokenVersion FROM dbo.Usuarios WHERE UsuarioId = @UsuarioId');

        if (userVersionResult.recordset.length === 0) {
            return res.status(401).json({ message: 'Usuario no encontrado.' });
        }

        const currentDbVersion = userVersionResult.recordset[0].TokenVersion || 1;
        const tokenVersion = decoded.tokenVersion || 1; // Compatibilidad hacia atrás

        // Si la versión del token es menor que la de la BD, el token es inválido (obsoleto)
        if (tokenVersion < currentDbVersion) {
            return res.status(401).json({ message: 'Sesión expirada. Los permisos han cambiado. Por favor inicie sesión nuevamente.', code: 'TOKEN_EXPIRED' });
        }


        const permissionsResult = await pool.request()
            .input('UsuarioId', sql.Int, decoded.usuarioId)
            .execute('sp_Usuario_ObtenerPermisos');

        const permissions: { [key: string]: any[] } = {};
        permissionsResult.recordset.forEach(record => {
            permissions[record.NombrePermiso] = [true];
        });

        req.user = { usuarioId: decoded.usuarioId, permissions };
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Token inválido o expirado.' });
    }
};
