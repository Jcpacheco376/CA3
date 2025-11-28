import { Request, Response } from 'express';
import sql from 'mssql';
import { dbConfig } from '../../config/database';

// --- 1. MOTOR DE ANÁLISIS ---
export const analyzeIncidents = async (req: any, res: Response) => {
    if (!req.user.permissions['reportesAsistencia.assign']) {
        return res.status(403).json({ message: 'No tienes permiso para ejecutar el análisis.' });
    }

    const { startDate, endDate } = req.body;

    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('FechaInicio', sql.Date, startDate)
            .input('FechaFin', sql.Date, endDate)
            .input('UsuarioId', sql.Int, req.user.usuarioId)
            .execute('sp_Incidencias_DetectarDiscrepancias');
        
        const count = result.recordset && result.recordset[0] ? result.recordset[0].IncidenciasGeneradas : 0;
        res.status(200).json({ message: 'Análisis completado.', IncidenciasGeneradas: count });

    } catch (err: any) {
        console.error("Error al analizar incidencias:", err);
        res.status(500).json({ message: 'Error al ejecutar el análisis.', error: err.message });
    }
};

// --- 2. TABLERO PRINCIPAL ---
export const getIncidents = async (req: any, res: Response) => {
    if (!req.user.permissions['reportesAsistencia.read']) {
        return res.status(403).json({ message: 'Acceso denegado.' });
    }

    const { startDate, endDate } = req.query;

    try {
        const pool = await sql.connect(dbConfig);
        // NOTA: Asegúrate de actualizar también este SP en la BD si usaba los nombres viejos internamente.
        // Por ahora asumimos que el SP maneja los joins y devuelve nombres genéricos.
        const result = await pool.request()
            .input('UsuarioId', sql.Int, req.user.usuarioId)
            .input('FechaInicio', sql.Date, startDate)
            .input('FechaFin', sql.Date, endDate)
            .execute('sp_Incidencias_GetByPeriodo');

        res.json(result.recordset);

    } catch (err: any) {
        console.error("Error al obtener incidencias:", err);
        res.status(500).json({ message: 'Error al cargar las incidencias.' });
    }
};

// --- 3. DETALLES COMPLETOS (Modal) ---
export const getIncidentDetails = async (req: any, res: Response) => {
    const { id } = req.params;
    try {
        const pool = await sql.connect(dbConfig);
        
        // A) Header (ACTUALIZADO CON NUEVOS NOMBRES)
        const header = await pool.request().input('Id', sql.Int, id).query(`
            SELECT 
                i.IncidenciaId, i.EmpleadoId, i.Fecha, i.Estado, i.AsignadoAUsuarioId, i.NivelCriticidad, i.RequiereAutorizacion,
                
                -- Nombres actualizados: Sistema vs Manual
                ISNULL(s_chec.Abreviatura, 'F') as EstatusChecadorOriginal,
                ISNULL(s_man.Abreviatura, '-') as EstatusManualOriginal,
                
                e.NombreCompleto as Empleado, e.CodRef, 
                d.Nombre as Departamento,
                u.NombreCompleto as AsignadoA,
                t.Nombre as TipoIncidencia
            FROM Incidencias i
            JOIN Empleados e ON i.EmpleadoId = e.EmpleadoId
            JOIN CatalogoTiposIncidencia t ON i.TipoIncidenciaId = t.TipoIncidenciaId
            LEFT JOIN CatalogoEstatusAsistencia s_chec ON i.EstatusChecadorId = s_chec.EstatusId
            
            -- Join con el nuevo nombre de columna
            LEFT JOIN CatalogoEstatusAsistencia s_man ON i.EstatusManualId = s_man.EstatusId
            
            LEFT JOIN CatalogoDepartamentos d ON e.DepartamentoId = d.DepartamentoId
            LEFT JOIN Usuarios u ON i.AsignadoAUsuarioId = u.UsuarioId
            WHERE i.IncidenciaId = @Id
        `);

        // B) Timeline
        const timeline = await pool.request().input('Id', sql.Int, id).query(`
            SELECT b.*, u.NombreCompleto as UsuarioNombre
            FROM IncidenciasBitacora b
            JOIN Usuarios u ON b.UsuarioId = u.UsuarioId
            WHERE b.IncidenciaId = @Id
            ORDER BY b.FechaMovimiento ASC
        `);

        // C) Autorizaciones
        const authorizations = await pool.request().input('Id', sql.Int, id).query(`
            SELECT 
                ia.AutorizacionId, 
                ia.RolRequeridoId,
                r.NombreRol as RolRequerido, 
                ia.Estatus, 
                ia.FechaRespuesta,
                u.NombreCompleto as UsuarioNombre,
                (SELECT STRING_AGG(usr.NombreCompleto, ', ') 
                 FROM Usuarios usr 
                 JOIN UsuariosRoles ur ON usr.UsuarioId = ur.UsuarioId
                 WHERE ur.RoleId = ia.RolRequeridoId AND usr.EstaActivo = 1) as PosiblesFirmantes
            FROM IncidenciasAutorizaciones ia
            JOIN Roles r ON ia.RolRequeridoId = r.RoleId
            LEFT JOIN Usuarios u ON ia.UsuarioAutorizoId = u.UsuarioId
            WHERE ia.IncidenciaId = @Id
        `);

        if (!header.recordset[0]) return res.status(404).json({ message: 'Incidencia no encontrada' });

        res.json({ 
            header: header.recordset[0], 
            timeline: timeline.recordset,
            authorizations: authorizations.recordset 
        });

    } catch (err: any) { 
        console.error("Error en getIncidentDetails:", err);
        res.status(500).json({ error: err.message }); 
    }
};

// --- 4. ACCIONES DEL FLUJO ---

// Asignar
export const assignIncident = async (req: any, res: Response) => {
    const { id } = req.params;
    const { targetUserId, comment } = req.body;
    const myId = req.user.usuarioId;

    try {
        const pool = await sql.connect(dbConfig);
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            await new sql.Request(transaction)
                .input('Id', sql.Int, id)
                .input('Target', sql.Int, targetUserId)
                .query("UPDATE Incidencias SET AsignadoAUsuarioId = @Target, Estado = 'Asignada' WHERE IncidenciaId = @Id");

            await new sql.Request(transaction)
                .input('Id', sql.Int, id)
                .input('User', sql.Int, myId)
                .input('Comment', sql.NVarChar, comment)
                .input('Target', sql.Int, targetUserId)
                .query(`INSERT INTO IncidenciasBitacora (IncidenciaId, UsuarioId, Accion, Comentario, AsignadoA_Nuevo, EstadoNuevo) VALUES (@Id, @User, 'Asignar', @Comment, @Target, 'Asignada')`);

            await transaction.commit();
            res.json({ message: 'Asignada.' });
        } catch (e) { await transaction.rollback(); throw e; }
    } catch (err: any) { res.status(500).json({ error: err.message }); }
};

// Resolver (ACTUALIZADO CON NUEVOS NOMBRES)
export const resolveIncident = async (req: any, res: Response) => {
    const { id } = req.params;
    const { newStatus, comment } = req.body; 
    const myId = req.user.usuarioId;

    try {
        const pool = await sql.connect(dbConfig);
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const inc = await new sql.Request(transaction).input('Id', id).query("SELECT EmpleadoId, Fecha FROM Incidencias WHERE IncidenciaId = @Id");
            const { EmpleadoId, Fecha } = inc.recordset[0];

            const st = await new sql.Request(transaction).input('Ab', newStatus).query("SELECT EstatusId FROM CatalogoEstatusAsistencia WHERE Abreviatura = @Ab");
            const newStatusId = st.recordset[0]?.EstatusId;
            if(!newStatusId) throw new Error("Estatus inválido");

            // Actualizar Ficha usando el nuevo nombre de columna
            await new sql.Request(transaction)
                .input('Emp', EmpleadoId).input('Fec', Fecha).input('St', newStatusId)
                .query("UPDATE FichaAsistencia SET EstatusManualId = @St, IncidenciaActivaId = NULL WHERE EmpleadoId = @Emp AND Fecha = @Fec");

            await new sql.Request(transaction)
                .input('Id', id).input('User', myId)
                .query("UPDATE Incidencias SET Estado = 'Resuelta', FechaCierre = GETDATE(), ResueltoPorUsuarioId = @User WHERE IncidenciaId = @Id");

            await new sql.Request(transaction)
                .input('Id', id).input('User', myId).input('Comment', comment)
                .query("INSERT INTO IncidenciasBitacora (IncidenciaId, UsuarioId, Accion, Comentario, EstadoNuevo) VALUES (@Id, @User, 'Resolver', @Comment, 'Resuelta')");

            await transaction.commit();
            res.json({ message: 'Resuelta.' });
        } catch (e) { await transaction.rollback(); throw e; }
    } catch (err: any) { res.status(500).json({ error: err.message }); }
};

// Solicitar Autorización
export const requestAuth = async (req: any, res: Response) => {
    const { id } = req.params;
    const { comment } = req.body;
    const myId = req.user.usuarioId;

    try {
        const pool = await sql.connect(dbConfig);
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const incData = await new sql.Request(transaction).input('Id', id).query("SELECT NivelCriticidad FROM Incidencias WHERE IncidenciaId = @Id");
            const nivel = incData.recordset[0]?.NivelCriticidad || 1;

            const config = await new sql.Request(transaction).input('Nivel', nivel).query("SELECT RoleId FROM CatalogoNivelesAutorizacion WHERE NivelCriticidad = @Nivel");
            
            let rolesRequeridos = config.recordset;
            if (rolesRequeridos.length === 0) {
                 const fallback = await new sql.Request(transaction).query("SELECT TOP 1 RoleId FROM Roles WHERE NombreRol LIKE '%Admin%' OR NombreRol LIKE '%RH%'");
                 rolesRequeridos = fallback.recordset;
            }

            for (const row of rolesRequeridos) {
                await new sql.Request(transaction)
                    .input('IncId', id)
                    .input('RolId', row.RoleId)
                    .query("INSERT INTO IncidenciasAutorizaciones (IncidenciaId, RolRequeridoId, Estatus) VALUES (@IncId, @RolId, 'Pendiente')");
            }

            await new sql.Request(transaction).input('Id', id).query("UPDATE Incidencias SET Estado = 'PorAutorizar', RequiereAutorizacion = 1 WHERE IncidenciaId = @Id");
            
            await new sql.Request(transaction)
                .input('Id', id).input('User', myId).input('Comment', comment)
                .query("INSERT INTO IncidenciasBitacora (IncidenciaId, UsuarioId, Accion, Comentario, EstadoNuevo) VALUES (@Id, @User, 'SolicitarAutorizacion', @Comment, 'PorAutorizar')");

            await transaction.commit();
            res.json({ message: 'Solicitud enviada.' });
        } catch (e) { await transaction.rollback(); throw e; }
    } catch (err: any) { res.status(500).json({ error: err.message }); }
};

// Cancelar Solicitud
export const cancelAuthRequest = async (req: any, res: Response) => {
    const { id } = req.params;
    const { comment } = req.body;
    const myId = req.user.usuarioId;
    const isAdmin = req.user.permissions['incidencias.manage'];

    try {
        const pool = await sql.connect(dbConfig);
        const check = await pool.request().input('Id', id).query("SELECT AsignadoAUsuarioId FROM Incidencias WHERE IncidenciaId = @Id");
        if (!check.recordset[0]) return res.status(404).json({ message: 'No encontrado' });
        
        if (!isAdmin && check.recordset[0].AsignadoAUsuarioId !== myId) {
            return res.status(403).json({ message: 'No puedes cancelar esta solicitud.' });
        }

        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            await new sql.Request(transaction).input('Id', id).query("DELETE FROM IncidenciasAutorizaciones WHERE IncidenciaId = @Id");
            await new sql.Request(transaction).input('Id', id).query("UPDATE Incidencias SET Estado = 'Asignada', RequiereAutorizacion = 0 WHERE IncidenciaId = @Id");

            await new sql.Request(transaction)
                .input('Id', id).input('User', myId).input('Comment', comment || 'Cancelación de solicitud.')
                .query("INSERT INTO IncidenciasBitacora (IncidenciaId, UsuarioId, Accion, Comentario, EstadoNuevo) VALUES (@Id, @User, 'CancelarSolicitud', @Comment, 'Asignada')");

            await transaction.commit();
            res.json({ message: 'Solicitud cancelada.' });
        } catch (e) { await transaction.rollback(); throw e; }
    } catch (err: any) { res.status(500).json({ error: err.message }); }
};

// --- 5. Votación (REVISIÓN DE SEGURIDAD CRÍTICA) ---
export const voteAuth = async (req: any, res: Response) => {
    const { id } = req.params;
    const { authId, verdict, comment } = req.body;
    const myId = req.user.usuarioId;
    
    // Permiso comodín para admins (útil para emergencias)
    const isAdmin = req.user.permissions['incidencias.manage'];

    try {
        const pool = await sql.connect(dbConfig);
        
        // 1. Obtener qué Rol se requiere para ESTA firma específica
        const authCheck = await pool.request()
            .input('AuthId', sql.Int, authId)
            .query(`SELECT RolRequeridoId, Estatus FROM IncidenciasAutorizaciones WHERE AutorizacionId = @AuthId`);
            
        if (!authCheck.recordset[0]) return res.status(404).json({ message: 'Autorización no encontrada.' });
        const { RolRequeridoId, Estatus } = authCheck.recordset[0];

        if (Estatus !== 'Pendiente') return res.status(400).json({ message: 'Esta solicitud ya fue procesada.' });

        // 2. Verificar si el usuario actual tiene ESE rol exacto
        const myRoles = await pool.request().input('UserId', myId).query("SELECT RoleId FROM UsuariosRoles WHERE UsuarioId = @UserId");
        
        // Comparación estricta de tipos (number === number)
        const hasRequiredRole = myRoles.recordset.some((r: any) => r.RoleId === RolRequeridoId);
        
        // CRÍTICO: Solo pasa si tiene el rol O es admin.
        // Si tu usuario de prueba "nivel 2" pudo firmar una de "nivel 3", 
        // verifica que NO tenga el permiso 'incidencias.manage' asignado.
        if (!hasRequiredRole && !isAdmin) {
            console.warn(`Intento de firma no autorizada. Usuario: ${myId}, ReqRol: ${RolRequeridoId}`);
            return res.status(403).json({ message: 'No tienes el rol necesario para autorizar esto.' });
        }

        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // Registrar la firma
            await new sql.Request(transaction)
                .input('AuthId', authId).input('UserId', myId).input('Verdict', verdict)
                .query(`UPDATE IncidenciasAutorizaciones SET Estatus = @Verdict, UsuarioAutorizoId = @UserId, FechaRespuesta = GETDATE() WHERE AutorizacionId = @AuthId`);

            if (verdict === 'Rechazado') {
                // Rechazo total
                await new sql.Request(transaction).input('Id', id).query("UPDATE Incidencias SET Estado = 'Asignada', RequiereAutorizacion = 0 WHERE IncidenciaId = @Id");
                await new sql.Request(transaction)
                    .input('Id', id).input('UserId', myId).input('Comment', comment || 'Solicitud rechazada.')
                    .query("INSERT INTO IncidenciasBitacora (IncidenciaId, UsuarioId, Accion, Comentario, EstadoNuevo) VALUES (@Id, @UserId, 'RechazarSolicitud', @Comment, 'Asignada')");
            
            } else {
                // Aprobado - Revisar si faltan más
                const pending = await new sql.Request(transaction).input('Id', id).query("SELECT COUNT(*) as Restantes FROM IncidenciasAutorizaciones WHERE IncidenciaId = @Id AND Estatus = 'Pendiente'");
                
                if (pending.recordset[0].Restantes === 0) {
                    // Todos aprobaron -> Resolución automática (ACTUALIZADO NOMBRE COLUMNA)
                    const incInfo = await new sql.Request(transaction).input('Id', id).query("SELECT EmpleadoId, Fecha FROM Incidencias WHERE IncidenciaId = @Id");
                    const { EmpleadoId, Fecha } = incInfo.recordset[0];

                    // Liberar Ficha: Se quita el candado, queda el EstatusManualId que ya tenía
                    await new sql.Request(transaction)
                        .input('Emp', EmpleadoId).input('Fec', Fecha)
                        .query("UPDATE FichaAsistencia SET IncidenciaActivaId = NULL WHERE EmpleadoId = @Emp AND Fecha = @Fec");

                    await new sql.Request(transaction)
                        .input('Id', id).input('UserId', myId)
                        .query("UPDATE Incidencias SET Estado = 'Resuelta', FechaCierre = GETDATE(), ResueltoPorUsuarioId = @UserId WHERE IncidenciaId = @Id");

                    await new sql.Request(transaction)
                        .input('Id', id).input('UserId', myId).input('Comment', comment || 'Autorización completada.')
                        .query("INSERT INTO IncidenciasBitacora (IncidenciaId, UsuarioId, Accion, Comentario, EstadoNuevo) VALUES (@Id, @UserId, 'AutorizacionTotal', @Comment, 'Resuelta')");
                } else {
                    await new sql.Request(transaction)
                        .input('Id', id).input('UserId', myId).input('Comment', comment || 'Voto aprobado.')
                        .query("INSERT INTO IncidenciasBitacora (IncidenciaId, UsuarioId, Accion, Comentario, EstadoNuevo) VALUES (@Id, @UserId, 'VotoPositivo', @Comment, 'PorAutorizar')");
                }
            }

            await transaction.commit();
            res.json({ message: 'Voto registrado correctamente.' });

        } catch (e) { await transaction.rollback(); throw e; }
    } catch (err: any) { res.status(500).json({ error: err.message }); }
};

// --- 6. DROPDOWNS ---
export const getIncidentManagers = async (req: any, res: Response) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().execute('sp_Usuarios_GetGestoresIncidencias');
        res.json(result.recordset);
    } catch (err: any) { res.status(500).json({ message: 'Error al cargar lista.' }); }
};

export const getResolutionOptions = async (req: any, res: Response) => {
    const { id } = req.params;
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().input('IncidenciaId', sql.Int, id).execute('sp_Incidencias_ObtenerPosiblesSoluciones');
        res.json(result.recordset);
    } catch (err: any) { res.status(500).json({ message: 'Error al cargar opciones.' }); }
};

export const updateIncidentStatus = async (req: any, res: Response) => {
    res.status(501).json({ message: 'Usar endpoints específicos (assign/resolve)' });
};