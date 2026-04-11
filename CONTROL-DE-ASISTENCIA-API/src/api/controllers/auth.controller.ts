import { Request, Response } from 'express';
import sql from 'mssql';
import jwt from 'jsonwebtoken';
import { dbConfig } from '../../config/database';
import { JWT_SECRET } from '../../config';

export const login = async (req: Request, res: Response) => {
    const { Identificador, Password, username, password } = req.body;
    const loginUser = Identificador || username;
    const loginPass = Password || password;

    // Lógica del "super admin"
    if (loginUser === 'admin' && loginPass === 'admin') {
        try {
            const pool = await sql.connect(dbConfig);
            const adminCheckResult = await pool.request()
                .query(`SELECT COUNT(*) as AdminCount FROM Usuarios u JOIN UsuariosRoles ur ON u.UsuarioId = ur.UsuarioId JOIN Roles r ON ur.RoleId = r.RoleId WHERE r.NombreRol = 'Administrador' AND u.EstaActivo = 1`);

            if (adminCheckResult.recordset[0].AdminCount === 0) {
                const permissionsResult = await pool.request().execute('sp_Permisos_GetAll');
                const permissions: { [key: string]: any[] } = {};
                permissionsResult.recordset.forEach(p => { permissions[p.NombrePermiso] = [true]; }); // <-- Cambiado aquí
                const token = jwt.sign({ usuarioId: 0, empleadoId: null, nombreUsuario: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
                return res.json({ token, user: { UsuarioId: 0, EmpleadoId: null, NombreUsuario: 'admin', NombreCompleto: 'Super Administrador (Temporal)', Email: '', permissions } });
            }
        } catch (err) { return res.status(500).json({ message: 'Error de servidor al verificar administradores.' }); }
    }

    // Lógica de login normal
    try {
        const pool = await sql.connect(dbConfig);
        const loginResult = await pool.request()
            .input('Identificador', sql.NVarChar, loginUser)
            .input('Password', sql.NVarChar, loginPass)
            .execute('sp_Usuario_ValidarLogin');

        if (!loginResult.recordset || loginResult.recordset.length === 0) {
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
            Departamentos: fullUserDetails.Departamentos ? JSON.parse(fullUserDetails.Departamentos) : [],
            GruposNomina: fullUserDetails.GruposNomina ? JSON.parse(fullUserDetails.GruposNomina) : [],
            Puestos: fullUserDetails.Puestos ? JSON.parse(fullUserDetails.Puestos) : [],
            Establecimientos: fullUserDetails.Establecimientos ? JSON.parse(fullUserDetails.Establecimientos) : []
        };

        const permissions: { [key: string]: any[] } = {};
        permissionsResult.recordset.forEach(record => {
            permissions[record.NombrePermiso] = [true];
        });

        const tokenPayload = {
            usuarioId: loggedInUser.UsuarioId,
            empleadoId: fullUserDetails.EmpleadoId,
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
                activeFilters,
                // Devolvemos las dimensiones como objetos completos para que el frontend pueda compararlos correctamente
                Departamentos: fullUserDetails.Departamentos ? (typeof fullUserDetails.Departamentos === 'string' ? JSON.parse(fullUserDetails.Departamentos) : fullUserDetails.Departamentos) : [],
                GruposNomina: fullUserDetails.GruposNomina ? (typeof fullUserDetails.GruposNomina === 'string' ? JSON.parse(fullUserDetails.GruposNomina) : fullUserDetails.GruposNomina) : [],
                Puestos: fullUserDetails.Puestos ? (typeof fullUserDetails.Puestos === 'string' ? JSON.parse(fullUserDetails.Puestos) : fullUserDetails.Puestos) : [],
                Establecimientos: fullUserDetails.Establecimientos ? (typeof fullUserDetails.Establecimientos === 'string' ? JSON.parse(fullUserDetails.Establecimientos) : fullUserDetails.Establecimientos) : []
            }
        });

    } catch (err: any) {
        console.error('Error en el login:', err);
        res.status(500).json({ message: err.message || 'Error interno del servidor.', stack: err.stack });
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
            FROM dbo.SISConfiguracion
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

