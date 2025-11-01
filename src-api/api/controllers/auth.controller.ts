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

        // --- MEJORA CLAVE: Obtenemos el perfil completo del usuario logueado ---
        const allUsersResult = await pool.request().execute('sp_Usuarios_GetAll');
        let fullUserDetails = allUsersResult.recordset.find(u => u.UsuarioId === loggedInUser.UsuarioId);

        if (!fullUserDetails) {
             return res.status(404).json({ message: 'No se encontró el perfil completo del usuario.' });
        }

        // Parsear los campos JSON del perfil completo
        fullUserDetails = {
            ...fullUserDetails,
            Roles: fullUserDetails.Roles ? JSON.parse(fullUserDetails.Roles) : [],
            Departamentos: fullUserDetails.Departamentos ? JSON.parse(fullUserDetails.Departamentos) : [],
            GruposNomina: fullUserDetails.GruposNomina ? JSON.parse(fullUserDetails.GruposNomina) : []
        };
        
        // Obtenemos los permisos por separado
        const permissionsResult = await pool.request()
            .input('UsuarioId', sql.Int, loggedInUser.UsuarioId)
            .execute('sp_Usuario_ObtenerPermisos');
        
        const permissions: { [key: string]: any[] } = {};
        permissionsResult.recordset.forEach(record => {
            permissions[record.NombrePermiso] = record.NombrePolitica ? [record.NombrePolitica] : [true as any];
        });
        
        // Creamos el token
        const tokenPayload = { usuarioId: loggedInUser.UsuarioId, nombreUsuario: loggedInUser.NombreUsuario };
        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h' });

        // Devolvemos el token y el perfil de usuario COMPLETO
        res.json({ 
            token, 
            user: { 
                ...fullUserDetails, // Perfil con roles, deptos, etc.
                DebeCambiarPassword: loggedInUser.DebeCambiarPassword, // Del resultado del login
                permissions // Los permisos que calculamos
            } 
        });

    } catch (err) {
        console.error('Error en el login:', err);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};