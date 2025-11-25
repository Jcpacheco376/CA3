import { Request, Response } from 'express';
import sql from 'mssql';
import jwt from 'jsonwebtoken';
import { dbConfig } from '../../config/database';
import { JWT_SECRET } from '../../config';

export const login = async (req: Request, res: Response) => {
    const { username, password } = req.body;

    // Lógica del "super admin"
    if (username === 'admin' && password === 'admin') {
        try {
            const pool = await sql.connect(dbConfig);
            const adminCheckResult = await pool.request()
                .query(`SELECT COUNT(*) as AdminCount FROM Usuarios u JOIN UsuariosRoles ur ON u.UsuarioId = ur.UsuarioId JOIN Roles r ON ur.RoleId = r.RoleId WHERE r.NombreRol = 'Administrador' AND u.EstaActivo = 1`);

            if (adminCheckResult.recordset[0].AdminCount === 0) {
                const permissionsResult = await pool.request().execute('sp_Permisos_GetAll');
                const permissions: { [key: string]: any[] } = {};
                permissionsResult.recordset.forEach(p => { permissions[p.NombrePermiso] = [true]; }); // <-- Cambiado aquí
                const token = jwt.sign({ usuarioId: 0, nombreUsuario: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
                return res.json({ token, user: { UsuarioId: 0, NombreUsuario: 'admin', NombreCompleto: 'Super Administrador (Temporal)', Email: '', permissions } });
            }
        } catch (err) { return res.status(500).json({ message: 'Error de servidor al verificar administradores.' }); }
    }

    // Lógica de login normal
    try {
        const pool = await sql.connect(dbConfig);
        const loginResult = await pool.request()
            .input('Identificador', sql.NVarChar, username)
            .input('Password', sql.NVarChar, password)
            .execute('sp_Usuario_ValidarLogin');

        if (loginResult.recordset.length === 0) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const loggedInUser = loginResult.recordset[0];
        const currentTokenVersion = loggedInUser.TokenVersion || 1; 

        const [
            allUsersResult,
            permissionsResult,
            activeFilters 
        ] = await Promise.all([
            pool.request().execute('sp_Usuarios_GetAll'),
            pool.request().input('UsuarioId', sql.Int, loggedInUser.UsuarioId).execute('sp_Usuario_ObtenerPermisos'),
            getActiveFilters(pool) // <-- Obtenemos los filtros activos
        ]);


        let fullUserDetails = allUsersResult.recordset.find(u => u.UsuarioId === loggedInUser.UsuarioId);

        if (!fullUserDetails) {
            return res.status(404).json({ message: 'No se encontró el perfil completo del usuario.' });
        }

        // Parsear los campos JSON del perfil completo
        fullUserDetails = {
            ...fullUserDetails,
            Roles: fullUserDetails.Roles ? JSON.parse(fullUserDetails.Roles) : [],
            Departamentos: activeFilters.departamentos && fullUserDetails.Departamentos ? JSON.parse(fullUserDetails.Departamentos) : [],
            GruposNomina: activeFilters.gruposNomina && fullUserDetails.GruposNomina ? JSON.parse(fullUserDetails.GruposNomina) : [],
            Puestos: activeFilters.puestos && fullUserDetails.Puestos ? JSON.parse(fullUserDetails.Puestos) : [],
            Establecimientos: activeFilters.establecimientos && fullUserDetails.Establecimientos ? JSON.parse(fullUserDetails.Establecimientos) : []
        };

        const permissions: { [key: string]: any[] } = {};
        permissionsResult.recordset.forEach(record => {
            permissions[record.NombrePermiso] = record.NombrePolitica ? [record.NombrePolitica] : [true as any];
        });

        const tokenPayload = { 
            usuarioId: loggedInUser.UsuarioId, 
            nombreUsuario: loggedInUser.NombreUsuario,
            tokenVersion: currentTokenVersion 
        };
        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h' });

        res.json({
            token,
            user: {
                ...fullUserDetails,
                DebeCambiarPassword: loggedInUser.DebeCambiarPassword,
                permissions,
                activeFilters
            }
        });

    } catch (err) {
        console.error('Error en el login:', err);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

const getActiveFilters = async (pool: sql.ConnectionPool): Promise<any> => {
    try {
        const result = await pool.request().query(`
            SELECT 
                CAST(ISNULL(MAX(CASE WHEN ConfigKey = 'FiltroDepartamentosActivo' THEN ConfigValue ELSE 'false' END), 'false') AS BIT) AS departamentos,
                CAST(ISNULL(MAX(CASE WHEN ConfigKey = 'FiltroGruposNominaActivo' THEN ConfigValue ELSE 'false' END), 'false') AS BIT) AS gruposNomina,
                CAST(ISNULL(MAX(CASE WHEN ConfigKey = 'FiltroPuestosActivo' THEN ConfigValue ELSE 'false' END), 'false') AS BIT) AS puestos,
                CAST(ISNULL(MAX(CASE WHEN ConfigKey = 'FiltroEstablecimientosActivo' THEN ConfigValue ELSE 'false' END), 'false') AS BIT) AS establecimientos
            FROM dbo.ConfiguracionSistema
            WHERE ConfigKey IN (
                'FiltroDepartamentosActivo', 
                'FiltroGruposNominaActivo', 
                'FiltroPuestosActivo', 
                'FiltroEstablecimientosActivo'
            )
        `);
        return result.recordset[0];
    } catch (e) {
        console.error("Error al leer configuración de filtros, se desactivarán todos:", e);
        // Fallback seguro: si la tabla no existe o falla, deshabilita todos.
        return { departamentos: false, gruposNomina: false, puestos: false, establecimientos: false };
    }
};

