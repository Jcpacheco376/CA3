// src/index.ts
import express from 'express';
import cors from 'cors';
import sql from 'mssql';
import jwt from 'jsonwebtoken';

// --- CONFIGURACIÓN ---
const app = express();
const PORT = 3001;
const tu_ip_local = '192.168.0.10';

app.use(cors({ origin: `http://${tu_ip_local}:5173` }));
app.use(express.json());


const dbConfig = {
    user: 'sa',
    password: 'sist3m4sSQL',
    server: '192.168.0.223',
    database: 'CA',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};
/*
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    // ...
};*/
//const JWT_SECRET = process.env.JWT_SECRET;
const JWT_SECRET = 'TU_SECRETO_JWT_SUPER_SEGURO_CAMBIAME';

// --- MIDDLEWARE DE AUTENTICACIÓN ---
const authMiddleware = async (req: any, res: any, next: any) => {
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
        const permissionsResult = await pool.request()
            .input('UsuarioId', sql.Int, decoded.usuarioId)
            .execute('sp_Usuario_ObtenerPermisos');
        
        const permissions: { [key: string]: any[] } = {};
        permissionsResult.recordset.forEach(p => {
            permissions[p.NombrePermiso] = p.NombrePolitica ? [p.NombrePolitica] : [];
        });
        
        req.user = { usuarioId: decoded.usuarioId, permissions };
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Token inválido.' });
    }
};


// --- ENDPOINT DE AUTENTICACIÓN (Devuelve Token y Perfil Completo) ---
app.post('/api/auth/login', async (req, res) => {
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
});

app.get('/api/users/next-id', authMiddleware, async (req: any, res) => {
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
});

app.post('/api/users', authMiddleware, async (req: any, res) => {
    if (!req.user.permissions['usuarios.create'] && !req.user.permissions['usuarios.update']) {
        return res.status(403).json({ message: 'Acceso denegado.' });
    }
    const { UsuarioId, NombreCompleto, NombreUsuario, Email, Password, EstaActivo, Roles, Departamentos, GruposNomina } = req.body;
    
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
            .execute('sp_Usuarios_Upsert');
            
        res.status(200).json({ message: 'Usuario guardado correctamente.', user: result.recordset[0] });

    } catch (err: any) {
        console.error('Error al guardar el usuario:', err.message);
        // Usamos un código 409 (Conflict) para errores de duplicados y otros errores de negocio.
        res.status(409).json({ message: err.message });
    }
});

// --- ENDPOINTS DE GESTIÓN (Protegidos con Middleware) ---

app.get('/api/users', authMiddleware, async (req: any, res) => {
    if (!req.user.permissions['usuarios.read']) return res.status(403).json({ message: 'Acceso denegado.' });
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().execute('sp_Usuarios_GetAll');
        const users = (result.recordset || []).map(user => ({
            ...user,
            Roles: user.Roles ? JSON.parse(user.Roles) : [],
            Departamentos: user.Departamentos ? JSON.parse(user.Departamentos) : [],
            GruposNomina: user.GruposNomina ? JSON.parse(user.GruposNomina) : []
        }));
        res.json(users); // Siempre responde con un arreglo, aunque esté vacío
    } catch (err) {
        console.error('Error en /api/users:', err);
        res.status(500).json({ 
            message: 'Error al obtener usuarios.', 
            error: (err && typeof err === 'object' && 'message' in err) ? (err as any).message : String(err)
        });
    }
});

app.put('/api/users/:userId/preferences', authMiddleware, async (req: any, res) => {
    const { userId } = req.params;
    const { theme, animationsEnabled } = req.body;
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request().input('UsuarioId', sql.Int, userId).input('Theme', sql.NVarChar, theme)
            .input('AnimationsEnabled', sql.Bit, animationsEnabled).execute('sp_Usuario_ActualizarPreferencias');
        res.status(200).json({ message: 'Preferencias actualizadas.' });
    } catch (err) { res.status(500).json({ message: 'Error al guardar las preferencias.' }); }
});

app.put('/api/users/:userId/password', authMiddleware, async (req: any, res) => {
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
});

app.get('/api/roles', authMiddleware, async (req: any, res) => {
    if (!req.user.permissions['roles.assign']) return res.status(403).json({ message: 'Acceso denegado.' });
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().execute('sp_Roles_GetAll');
        res.json(result.recordset.map(role => ({ ...role, Permisos: role.Permisos ? JSON.parse(role.Permisos) : [] })));
    } catch (err) { res.status(500).json({ message: 'Error al obtener roles.' }); }
});

app.post('/api/roles', authMiddleware, async (req: any, res) => {
    if (!req.user.permissions['roles.assign']) return res.status(403).json({ message: 'Acceso denegado.' });
    const { RoleId, NombreRol, Descripcion, Permisos } = req.body;
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request() // Capturamos el resultado
            .input('RoleId', sql.Int, RoleId || 0)
            .input('NombreRol', sql.NVarChar, NombreRol)
            .input('Descripcion', sql.NVarChar, Descripcion)
            .input('PermisosJSON', sql.NVarChar, JSON.stringify(Permisos || []))
            .execute('sp_Roles_Upsert');
        
        // --- MEJORA: Devolvemos el rol guardado para la notificación ---
        const savedRole = { RoleId: result.recordset[0].RoleId, NombreRol };
        res.status(200).json({ message: 'Rol guardado correctamente.', role: savedRole });
    } catch (err: any) { 
        console.error("Error al guardar rol:", err.message);
        res.status(409).json({ message: err.message });
    }
});

app.get('/api/permissions', authMiddleware, async (req: any, res) => {
    if (!req.user.permissions['roles.assign']) return res.status(403).json({ message: 'Acceso denegado.' });
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().execute('sp_Permisos_GetAll');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: 'Error al obtener permisos.' }); }
});

// --- CATÁLOGOS ---
app.get('/api/departamentos', authMiddleware, async (req: any, res) => {
    if (!req.user.permissions['catalogo.departamentos.read']) return res.status(403).json({ message: 'No tienes permiso para ver los departamentos.' });
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query('SELECT departamento, nombre FROM [192.168.0.141,9000].bmsjs.dbo.Departamentos WHERE status = \'V\'');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: 'Error al obtener departamentos.' }); }
});

app.get('/api/grupos-nomina', authMiddleware, async (req: any, res) => {
    if (!req.user.permissions['catalogo.gruposNomina.read']) return res.status(403).json({ message: 'No tienes permiso para ver los grupos de nómina.' });
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query('SELECT grupo_nomina, nombre FROM [192.168.0.141,9000].bmsjs.dbo.grupos_nomina WHERE status = \'V\'');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: 'Error al obtener grupos de nómina.' }); }
});

app.get('/api/departamentos/management', authMiddleware, async (req: any, res) => {
    if (!req.user.permissions['catalogo.departamentos.manage']) return res.status(403).json({ message: 'No tienes permiso para gestionar departamentos.' });
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().execute('sp_Departamentos_GetAllManagement');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: 'Error al obtener datos de gestión de deptos.' }); }
});

app.post('/api/departamentos', authMiddleware, async (req: any, res) => {
    if (!req.user.permissions['catalogo.departamentos.manage']) return res.status(403).json({ message: 'Acceso denegado.' });
    const { departamento, nombre, abreviatura, status } = req.body;
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request().input('DepartamentoId', sql.NVarChar, departamento).input('Nombre', sql.NVarChar, nombre)
            .input('Abreviatura', sql.NVarChar, abreviatura).input('Status', sql.NVarChar, status).execute('sp_Departamentos_Save');
        res.status(201).json({ message: 'Departamento guardado con éxito' });
    } catch (err) { res.status(500).json({ message: 'Error al guardar el departamento.' }); }
});

app.get('/api/grupos-nomina/management', authMiddleware, async (req: any, res) => {
    if (!req.user.permissions['catalogo.gruposNomina.manage']) return res.status(403).json({ message: 'No tienes permiso para gestionar grupos.' });
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().execute('sp_GruposNomina_GetAllManagement');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: 'Error al obtener datos de gestión de grupos.' }); }
});

app.post('/api/grupos-nomina', authMiddleware, async (req: any, res) => {
    if (!req.user.permissions['catalogo.grupos_nomina.manage']) return res.status(403).json({ message: 'Acceso denegado.' });
    const { grupo_nomina, nombre, abreviatura, status } = req.body;
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request().input('GrupoNominaId', sql.NVarChar, grupo_nomina).input('Nombre', sql.NVarChar, nombre)
            .input('Abreviatura', sql.NVarChar, abreviatura).input('Status', sql.NVarChar, status).execute('sp_GruposNomina_Save');
        res.status(201).json({ message: 'Grupo de nómina guardado con éxito' });
    } catch (err) { res.status(500).json({ message: 'Error al guardar el grupo de nómina.' }); }
});

// Endpoint para obtener los datos de la semana de un supervisor
app.get('/api/attendance/weekly-data', authMiddleware, async (req: any, res) => {
    if (!req.user.permissions['reportesAsistencia.read.own'] && !req.user.permissions['reportesAsistencia.read.all']) {
        return res.status(403).json({ message: 'No tienes permiso para ver los reportes de asistencia.' });
    }
    const { weekStartDate } = req.query;
    if (!weekStartDate || typeof weekStartDate !== 'string') {
        return res.status(400).json({ message: 'La fecha de inicio de semana es requerida.' });
    }

    try {
        const pool = await sql.connect(dbConfig);
        // --- USA EL PROCEDIMIENTO ACTUALIZADO ---
        const result = await pool.request()
            .input('UsuarioId', sql.Int, req.user.usuarioId)
            .input('FechaInicioSemana', sql.Date, new Date(weekStartDate))
            .execute('sp_FichasAsistencia_GetSemana');

        // Parseamos el JSON de las fichas para cada empleado
        const data = result.recordset.map(emp => ({
            ...emp,
            FichasSemana: emp.FichasSemana ? JSON.parse(emp.FichasSemana) : []
        }));

        res.json(data);
    } catch (err: any) {
        console.error('Error al obtener datos de asistencia semanal:', err);
        res.status(500).json({ message: err.message || 'Error al obtener los datos de asistencia.' });
    }
});

app.post('/api/attendance', authMiddleware, async (req: any, res) => {
    if (!req.user.permissions['reportesAsistencia.update']) {
        return res.status(403).json({ message: 'No tienes permiso para registrar la asistencia.' });
    }
    
    const { empleadoId, fecha, estatusSupervisor, comentarios } = req.body;
    if (!empleadoId || !fecha || !estatusSupervisor) {
        return res.status(400).json({ message: 'Faltan parámetros requeridos.' });
    }

    try {
        const pool = await sql.connect(dbConfig);
        // --- USA EL PROCEDIMIENTO DE GUARDADO DEL SUPERVISOR ACTUALIZADO ---
        await pool.request()
            .input('EmpleadoId', sql.NVarChar, empleadoId)
            .input('Fecha', sql.Date, new Date(fecha))
            .input('EstatusSupervisorAbrev', sql.NVarChar, estatusSupervisor) // Envía la abreviatura
            .input('Comentarios', sql.NVarChar, comentarios || null)
            .input('SupervisorId', sql.Int, req.user.usuarioId)
            .execute('sp_FichasAsistencia_SaveSupervisor');

        res.status(200).json({ message: 'Registro guardado con éxito.' });
    } catch (err: any) {
        console.error('Error al guardar registro de asistencia:', err);
        res.status(500).json({ message: err.message || 'Error al guardar el registro.' });
    }
});

app.post('/api/attendance/approve-week', authMiddleware, async (req: any, res) => {
    if (!req.user.permissions['reportesAsistencia.update']) {
        return res.status(403).json({ message: 'No tienes permiso para aprobar la asistencia.' });
    }
    const { empleadoId, weekStartDate } = req.body;
    if (!empleadoId || !weekStartDate) {
        return res.status(400).json({ message: 'Faltan parámetros requeridos.' });
    }

    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('SupervisorId', sql.Int, req.user.usuarioId)
            .input('EmpleadoId', sql.NVarChar, empleadoId)
            .input('FechaInicioSemana', sql.Date, new Date(weekStartDate))
            .execute('sp_FichasAsistencia_ApproveWeek');
        
        res.status(200).json({ message: 'Semana aprobada correctamente.' });
    } catch (err: any) {
        console.error('Error en la aprobación rápida:', err);
        res.status(500).json({ message: err.message || 'Error al aprobar la semana.' });
    }
});

app.get('/api/catalogs/attendance-statuses', authMiddleware, async (req: any, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query('SELECT * FROM dbo.CatalogoEstatusAsistencia WHERE Activo = 1');
        res.json(result.recordset);
    } catch (err) {
        console.error('Error al obtener el catálogo de estatus:', err);
        res.status(500).json({ message: 'Error al obtener el catálogo de estatus.' });
    }
});

app.get('/api/catalogs/attendance-statuses/management', authMiddleware, async (req: any, res) => {
    if (!req.user.permissions['catalogo.estatusAsistencia.manage']) {
        return res.status(403).json({ message: 'No tienes permiso para gestionar este catálogo.' });
    }
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().execute('sp_CatalogoEstatusAsistencia_GetAllManagement');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: 'Error al obtener el catálogo de estatus para gestión.' });
    }
});

app.post('/api/catalogs/attendance-statuses', authMiddleware, async (req: any, res) => {
    if (!req.user.permissions['catalogo.estatusAsistencia.manage']) {
        return res.status(403).json({ message: 'No tienes permiso para gestionar este catálogo.' });
    }
    
    // Se extraen todos los campos del cuerpo de la petición, incluyendo el nuevo.
    const { 
        EstatusId, 
        Abreviatura, 
        Descripcion, 
        ColorUI, 
        ValorNomina, 
        VisibleSupervisor, 
        Activo, 
        Tipo,
        EsFalta,
        EsRetardo,
        EsEntradaSalidaIncompleta,
        EsAsistencia,
        DiasRegistroFuturo,
        PermiteComentario // Campo actualizado
    } = req.body;

    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('EstatusId', sql.Int, EstatusId || 0)
            .input('Abreviatura', sql.NVarChar, Abreviatura)
            .input('Descripcion', sql.NVarChar, Descripcion)
            .input('ColorUI', sql.NVarChar, ColorUI)
            .input('ValorNomina', sql.Decimal(3, 2), ValorNomina)
            .input('VisibleSupervisor', sql.Bit, VisibleSupervisor)
            .input('Activo', sql.Bit, Activo)
            .input('Tipo', sql.NVarChar, Tipo)
            .input('EsFalta', sql.Bit, EsFalta)
            .input('EsRetardo', sql.Bit, EsRetardo)
            .input('EsEntradaSalidaIncompleta', sql.Bit, EsEntradaSalidaIncompleta)
            .input('EsAsistencia', sql.Bit, EsAsistencia)
            .input('DiasRegistroFuturo', sql.Int, DiasRegistroFuturo)
            .input('PermiteComentario', sql.Bit, PermiteComentario) // Parámetro añadido
            .execute('sp_CatalogoEstatusAsistencia_Upsert');
            
        res.status(200).json({ message: 'Estatus guardado correctamente.' });
    } catch (err: any) {
        res.status(409).json({ message: err.message });
    }
});



app.post('/api/attendance/ensure-week', authMiddleware, async (req: any, res) => {
    if (!req.user.permissions['reportesAsistencia.update']) {
        return res.status(403).json({ message: 'No tienes permiso para realizar esta acción.' });
    }
    const { weekStartDate } = req.body;
    if (!weekStartDate) {
        return res.status(400).json({ message: 'Falta la fecha de inicio de semana.' });
    }

    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('UsuarioId', sql.Int, req.user.usuarioId)
            .input('FechaInicioSemana', sql.Date, new Date(weekStartDate))
            // --- CAMBIO CLAVE: Llamar al nuevo procedimiento ---
            .execute('sp_FichasAsistencia_ProcessWeekForSupervisor');

        res.status(200).json({ message: 'Semana procesada y preparada correctamente.' });
    } catch (err: any) {
        console.error('Error al procesar la semana:', err);
        res.status(500).json({ message: err.message || 'Error al preparar los datos de la semana.' });
    }
});

	
app.post('/api/attendance/ensure-range', authMiddleware, async (req: any, res) => {
    if (!req.user.permissions['reportesAsistencia.update']) return res.status(403).json({ message: 'Acceso denegado.' });
    const { startDate, endDate } = req.body;
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('FechaInicio', sql.Date, startDate).input('FechaFin', sql.Date, endDate)
            .input('UsuarioId', sql.Int, req.user.usuarioId).execute('sp_FichasAsistencia_ProcesarChecadas');
        res.status(200).json({ message: 'Rango de fechas procesado.' });
    } catch (err: any) { res.status(500).json({ message: err.message || 'Error al procesar el rango.' }); }
});
app.get('/api/attendance/data-by-range', authMiddleware, async (req: any, res) => {
    if (!req.user.permissions['reportesAsistencia.read.own'] && !req.user.permissions['reportesAsistencia.read.all']) return res.status(403).json({ message: 'Acceso denegado.' });
    const { startDate, endDate } = req.query;
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('UsuarioId', sql.Int, req.user.usuarioId)
            .input('FechaInicio', sql.Date, startDate as string)
            .input('FechaFin', sql.Date, endDate as string)
            .execute('sp_FichasAsistencia_GetDataByRange');
        res.json(result.recordset.map(emp => ({ ...emp, FichasSemana: emp.FichasSemana ? JSON.parse(emp.FichasSemana) : [] })));
    } catch (err: any) { res.status(500).json({ message: err.message || 'Error al obtener los datos de asistencia.' }); }
});

app.get('/api/employees/:employeeId/profile', authMiddleware, async (req: any, res) => {
    if (!req.user.permissions['usuarios.read'] && !req.user.permissions['reportesAsistencia.read.own'] && !req.user.permissions['horarios.read']) {
        return res.status(403).json({ message: 'No tienes permiso para ver perfiles de empleado.' });
    }
    const { employeeId } = req.params;
    if (!employeeId) return res.status(400).json({ message: 'El ID del empleado es requerido.' });
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().input('EmpleadoId', sql.NVarChar, employeeId).execute('sp_Empleados_GetDatos');
        if (result.recordset.length === 0) return res.status(404).json({ message: 'Empleado no encontrado.' });
        res.json(result.recordset[0]);
    } catch (err: any) {
        res.status(500).json({ message: err.message || 'Error al obtener la información del empleado.' });
    }
});

// --- MÓDULO DE PROGRAMADOR DE HORARIOS ---
app.get('/api/schedules', authMiddleware, async (req: any, res) => {
    if (!req.user.permissions['catalogo.horarios.read']) return res.status(403).json({ message: 'Acceso denegado.' });
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().execute('sp_Horarios_GetAll');
        res.json(result.recordset);
    } catch (err: any) { res.status(500).json({ message: 'Error al obtener catálogo de horarios.', error: err.message }); }
});
app.get('/api/schedules/assignments', authMiddleware, async (req: any, res) => {
    if (!req.user.permissions['catalogo.horarios.read']) return res.status(403).json({ message: 'Acceso denegado.' });
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ message: 'Se requieren fechas de inicio y fin.' });
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('UsuarioId', sql.Int, req.user.usuarioId)
            .input('FechaInicio', sql.Date, startDate as string)
            .input('FechaFin', sql.Date, endDate as string)
            .execute('sp_HorariosTemporales_GetByPeriodo');
        res.json(result.recordset.map(emp => ({ ...emp, HorariosAsignados: emp.HorariosAsignados ? JSON.parse(emp.HorariosAsignados) : [] })));
    } catch (err: any) { res.status(500).json({ message: err.message || 'Error al obtener los datos.' }); }
});

app.post('/api/schedules/assignments', authMiddleware, async (req: any, res) => {
    if (!req.user.permissions['catalogo.horarios.assign']) return res.status(403).json({ message: 'Acceso denegado.' });
    const assignments = req.body;
    if (!Array.isArray(assignments)) return res.status(400).json({ message: 'Se esperaba un arreglo de asignaciones.' });
    const pool = await sql.connect(dbConfig);
    const transaction = new sql.Transaction(pool);
    try {
        await transaction.begin();
        await Promise.all(assignments.map(async (assignment) => {
            const { empleadoId, fecha, horarioId } = assignment;
            if (!empleadoId || !fecha) return;
            await new sql.Request(transaction)
                .input('EmpleadoId', sql.NVarChar, empleadoId).input('Fecha', sql.Date, new Date(fecha))
                .input('HorarioAbreviatura', sql.NVarChar, horarioId).input('SupervisorId', sql.Int, req.user.usuarioId)
                .execute('sp_HorariosTemporales_Upsert');
        }));
        await transaction.commit();
        res.status(200).json({ message: 'Asignaciones guardadas correctamente.' });
    } catch (err: any) {
        await transaction.rollback();
        res.status(500).json({ message: err.message || 'Error al guardar las asignaciones.' });
    }
});

app.post('/api/catalogs/schedules', authMiddleware, async (req: any, res) => {
    if (!req.user.permissions['catalogo.horarios.manage']) return res.status(403).json({ message: 'Acceso denegado.' });
    const { HorarioId, Abreviatura, Nombre, MinutosTolerancia, ColorUI, Activo, Detalles } = req.body;
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('HorarioId', sql.Int, HorarioId || 0).input('Abreviatura', sql.NVarChar, Abreviatura)
            .input('Nombre', sql.NVarChar, Nombre).input('MinutosTolerancia', sql.Int, MinutosTolerancia)
            .input('ColorUI', sql.NVarChar, ColorUI).input('Activo', sql.Bit, Activo)
            .input('DetallesJSON', sql.NVarChar, JSON.stringify(Detalles || [])).execute('sp_CatalogoHorarios_Upsert');
        res.status(200).json({ message: 'Horario guardado correctamente.', horarioId: result.recordset[0].HorarioId });
    } catch (err: any) { res.status(409).json({ message: err.message }); }
});

app.get('/api/catalogs/schedules', authMiddleware, async (req: any, res) => {
    if (!req.user.permissions['catalogo.horarios.read']) return res.status(403).json({ message: 'Acceso denegado.' });
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().execute('sp_CatalogoHorarios_GetForManagement');
        const horarios = result.recordset.map(h => ({ ...h, Detalles: h.Detalles ? JSON.parse(h.Detalles) : [] }));
        res.json(horarios);
    } catch (err: any) { res.status(500).json({ message: 'Error al obtener el catálogo de horarios.', error: err.message }); }
});

app.delete('/api/catalogs/schedules/:horarioId', authMiddleware, async (req: any, res) => {
    if (!req.user.permissions['catalogo.horarios.manage']) return res.status(403).json({ message: 'Acceso denegado.' });
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request().input('HorarioId', sql.Int, req.params.horarioId).execute('sp_CatalogoHorarios_Delete');
        res.status(200).json({ message: 'Horario desactivado correctamente.' });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor de la API corriendo en http://${tu_ip_local}:${PORT}`); // Opcional: Mejora el mensaje
});

