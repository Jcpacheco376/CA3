import { Request, Response } from 'express';
import sql from 'mssql';
import { dbConfig } from '../../config/database';
import crypto from 'crypto';

export const getNextUserId = async (req: any, res: Response) => {
    if (!req.user.permissions['usuarios.create']) {
        return res.status(403).json({ message: 'Acceso denegado.' });
    }
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().execute('sp_Usuarios_GetNextId');
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ message: 'Error al obtener el siguiente ID de usuario.' });
    }
};

export const createUser = async (req: any, res: Response) => {
    if (!req.user.permissions['usuarios.create'] && !req.user.permissions['usuarios.update']) {
        return res.status(403).json({ message: 'Acceso denegado.' });
    }
    // Nuevos campos del body
    const { 
        UsuarioId, NombreCompleto, NombreUsuario, Email, Password, EstaActivo, 
        Roles, Departamentos, GruposNomina, Puestos, Establecimientos 
    } = req.body;
    
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('UsuarioId', sql.Int, UsuarioId || 0)
            .input('NombreCompleto', sql.NVarChar, NombreCompleto)
            .input('NombreUsuario', sql.NVarChar, NombreUsuario)
            .input('Email', sql.NVarChar, Email)
            .input('Password', sql.NVarChar, Password)
            .input('EstaActivo', sql.Bit, EstaActivo)
            .input('RolesJSON', sql.NVarChar, JSON.stringify(Roles || []))
            .input('DepartamentosJSON', sql.NVarChar, JSON.stringify(Departamentos || []))
            .input('GruposNominaJSON', sql.NVarChar, JSON.stringify(GruposNomina || []))
            // Nuevos inputs para el SP
            .input('PuestosJSON', sql.NVarChar, JSON.stringify(Puestos || []))
            .input('EstablecimientosJSON', sql.NVarChar, JSON.stringify(Establecimientos || []))
            .execute('sp_Usuarios_Upsert');
            
        res.status(200).json({ message: 'Usuario guardado correctamente.', user: result.recordset[0] });

    } catch (err: any) {
        console.error('Error al guardar el usuario:', err.message);
        res.status(409).json({ message: err.message });
    }
};

export const getAllUsers = async (req: any, res: Response) => {
    if (!req.user.permissions['usuarios.read']) return res.status(403).json({ message: 'Acceso denegado.' });
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().execute('sp_Usuarios_GetAll');
        const users = (result.recordset || []).map(user => ({
            ...user,
            Roles: user.Roles ? JSON.parse(user.Roles) : [],
            Departamentos: user.Departamentos ? JSON.parse(user.Departamentos) : [],
            GruposNomina: user.GruposNomina ? JSON.parse(user.GruposNomina) : [],
            // Nuevos campos para parsear
            Puestos: user.Puestos ? JSON.parse(user.Puestos) : [],
            Establecimientos: user.Establecimientos ? JSON.parse(user.Establecimientos) : []
        }));
        res.json(users); // Siempre responde con un arreglo, aunque esté vacío
    } catch (err) {
        console.error('Error en /api/users:', err);
        res.status(500).json({ 
            message: 'Error al obtener usuarios.', 
            error: (err && typeof err === 'object' && 'message' in err) ? (err as any).message : String(err)
        });
    }
}

export const updateUserPreferences = async (req: any, res: Response) => {
    const { userId } = req.params;
    const { theme, animationsEnabled } = req.body;
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request().input('UsuarioId', sql.Int, userId).input('Theme', sql.NVarChar, theme)
            .input('AnimationsEnabled', sql.Bit, animationsEnabled).execute('sp_Usuario_ActualizarPreferencias');
        res.status(200).json({ message: 'Preferencias actualizadas.' });
    } catch (err) { res.status(500).json({ message: 'Error al guardar las preferencias.' }); }
};

export const updateUserPassword = async (req: any, res: Response) => {
    const { userId } = req.params;
    const { password } = req.body;
    if (!password || password.length < 6) return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres.' });
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('UsuarioId', sql.Int, userId)
            .input('NuevoPassword', sql.NVarChar, password)
            .execute('sp_Usuario_ActualizarPassword');
        res.status(200).json({ message: 'Contraseña actualizada correctamente.' });
    } catch (err) { res.status(500).json({ message: 'Error al actualizar la contraseña.' }); }
};
export const resetPassword = async (req: any, res: Response) => {
    // Solo admins pueden resetear contraseñas
    if (!req.user.permissions['usuarios.update']) {
        return res.status(403).json({ message: 'Acceso denegado.' });
    }
    
    const { userId } = req.params;
    
    // 1. Generar contraseña aleatoria segura
    const newPassword = crypto.randomBytes(6).toString('hex'); // 12 caracteres

    try {
        // 2. Llamar al mismo SP que usa updateUserPassword
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('UsuarioId', sql.Int, userId)
            .input('NuevoPassword', sql.NVarChar, newPassword)
            .execute('sp_Usuario_ActualizarPassword');
        
        // 3. Enviar éxito. (Idealmente, aquí se enviaría un email)
        res.status(200).json({ message: `Contraseña restablecida con éxito. La nueva contraseña es: ${newPassword}` });
        // NOTA: Devolver la contraseña en la respuesta es opcional y depende de tu política de seguridad.
        // Podrías solo devolver un 200 OK y forzar al usuario a usar "olvidé mi contraseña".
        // Por ahora, la devuelvo para que el admin pueda copiarla.
    } catch (err: any) { 
        res.status(500).json({ message: err.message || 'Error al restablecer la contraseña.' }); 
    }
};
export const getPermissionsByUserId = async (req: any, res: Response) => {
    const userId = req.user.usuarioId;
    if (!userId) return res.status(400).json({ message: 'ID no proporcionado.' });

    try {
        const pool = await sql.connect(dbConfig);
        // 1. Obtener datos base
        const usersResult = await pool.request().execute('sp_Usuarios_GetAll');
        let fullUserDetails = usersResult.recordset.find((u: any) => u.UsuarioId === userId);

        if (!fullUserDetails) return res.status(404).json({ message: 'Usuario no encontrado.' });

        // 2. Obtener permisos frescos
        const permissionsResult = await pool.request()
            .input('UsuarioId', sql.Int, userId)
            .execute('sp_Usuario_ObtenerPermisos');

        const permissions: { [key: string]: any[] } = {};
        permissionsResult.recordset.forEach((record: any) => {
            permissions[record.NombrePermiso] = [true]; 
        });
        
        // 3. Obtener filtros activos
        const activeFiltersResult = await pool.request().query(`
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
        
        // Parsear JSONs
        const updatedUser = {
            ...fullUserDetails,
            Roles: fullUserDetails.Roles ? JSON.parse(fullUserDetails.Roles) : [],
            Departamentos: fullUserDetails.Departamentos ? JSON.parse(fullUserDetails.Departamentos) : [],
            GruposNomina: fullUserDetails.GruposNomina ? JSON.parse(fullUserDetails.GruposNomina) : [],
            Puestos: fullUserDetails.Puestos ? JSON.parse(fullUserDetails.Puestos) : [],
            Establecimientos: fullUserDetails.Establecimientos ? JSON.parse(fullUserDetails.Establecimientos) : [],
            permissions: permissions,
            activeFilters: activeFiltersResult.recordset[0]
        };

        res.json({ user: updatedUser });

    } catch (err: any) {
        res.status(500).json({ message: 'Error al refrescar permisos.' });
    }
};