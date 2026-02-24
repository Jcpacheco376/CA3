//src/api/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import sql from 'mssql';
import { poolPromise } from '../../config/database';
import { JWT_SECRET } from '../../config';

export const authMiddleware = async (req: any, res: Response, next: NextFunction) => {
    let token;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    } else if (req.query.token) {
        token = req.query.token as string;
    }

    if (!token) {
        return res.status(401).json({ message: 'Acceso no autorizado: Token no proporcionado.' });
    }
    try {
        const decoded: any = jwt.verify(token, JWT_SECRET);

        // Si es el super admin temporal, asigna todos los permisos
        if (decoded.usuarioId === 0) {
            const pool = await poolPromise;
            const permissionsResult = await pool.request().execute('sp_Permisos_GetAll');
            const permissions: { [key: string]: any[] } = {};
            permissionsResult.recordset.forEach(p => { permissions[p.NombrePermiso] = [true]; });
            req.user = { usuarioId: 0, permissions };
            return next();
        }
        const pool = await poolPromise;

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


        const [permissionsResult, dimensionsResult, activeFiltersResult] = await Promise.all([
            pool.request()
                .input('UsuarioId', sql.Int, decoded.usuarioId)
                .execute('sp_Usuario_ObtenerPermisos'),
            pool.request()
                .input('UsuarioId', sql.Int, decoded.usuarioId)
                .query(`
                    SELECT 
                        (SELECT DepartamentoId FROM UsuariosDepartamentos WHERE UsuarioId = @UsuarioId FOR JSON PATH) as Departamentos,
                        (SELECT GrupoNominaId FROM UsuariosGruposNomina WHERE UsuarioId = @UsuarioId FOR JSON PATH) as GruposNomina,
                        (SELECT PuestoId FROM UsuariosPuestos WHERE UsuarioId = @UsuarioId FOR JSON PATH) as Puestos,
                        (SELECT EstablecimientoId FROM UsuariosEstablecimientos WHERE UsuarioId = @UsuarioId FOR JSON PATH) as Establecimientos
                `),
            pool.request().query(`
                SELECT ConfigKey, ConfigValue FROM ConfiguracionSistema 
                WHERE ConfigKey IN ('FiltroDepartamentosActivo', 'FiltroGruposNominaActivo', 'FiltroPuestosActivo', 'FiltroEstablecimientosActivo')
            `)
        ]);

        const permissions: Record<string, boolean> = {};
        permissionsResult.recordset.forEach((row: any) => {
            permissions[row.NombrePermiso] = true;
        });

        const activeFilters = {
            departamentos: activeFiltersResult.recordset.some(r => r.ConfigKey === 'FiltroDepartamentosActivo' && (r.ConfigValue === '1' || r.ConfigValue === 'true')),
            gruposNomina: activeFiltersResult.recordset.some(r => r.ConfigKey === 'FiltroGruposNominaActivo' && (r.ConfigValue === '1' || r.ConfigValue === 'true')),
            puestos: activeFiltersResult.recordset.some(r => r.ConfigKey === 'FiltroPuestosActivo' && (r.ConfigValue === '1' || r.ConfigValue === 'true')),
            establecimientos: activeFiltersResult.recordset.some(r => r.ConfigKey === 'FiltroEstablecimientosActivo' && (r.ConfigValue === '1' || r.ConfigValue === 'true'))
        };

        const dims = dimensionsResult.recordset[0];
        req.user = {
            usuarioId: decoded.usuarioId,
            UsuarioId: decoded.usuarioId,
            permissions,
            activeFilters,
            Departamentos: dims.Departamentos ? JSON.parse(dims.Departamentos) : [],
            GruposNomina: dims.GruposNomina ? JSON.parse(dims.GruposNomina) : [],
            Puestos: dims.Puestos ? JSON.parse(dims.Puestos) : [],
            Establecimientos: dims.Establecimientos ? JSON.parse(dims.Establecimientos) : []
        };
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Token inválido o expirado.' });
    }
};
