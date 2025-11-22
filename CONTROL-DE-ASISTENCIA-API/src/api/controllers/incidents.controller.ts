// src-api/api/controllers/incidents.controller.ts
import { Request, Response } from 'express';
import sql from 'mssql';
import { dbConfig } from '../../config/database';

// Generar incidencias (Ejecuta el motor de análisis)
export const analyzeIncidents = async (req: any, res: Response) => {
    if (!req.user.permissions['reportesAsistencia.assign']) {
        return res.status(403).json({ message: 'No tienes permiso para ejecutar el análisis.' });
    }

    const { startDate, endDate } = req.body;

    try {
        const pool = await sql.connect(dbConfig);
        // Llamamos al SP actualizado que usa IDs
        const result = await pool.request()
            .input('FechaInicio', sql.Date, startDate)
            .input('FechaFin', sql.Date, endDate)
            .input('UsuarioId', sql.Int, req.user.usuarioId)
            .execute('sp_Incidencias_DetectarDiscrepancias'); // <--- Nombre corregido
        
        // Nota: El SP devuelve un resultset con 'IncidenciasGeneradas'
        const count = result.recordset && result.recordset[0] ? result.recordset[0].IncidenciasGeneradas : 0;
        
        res.status(200).json({ message: 'Análisis completado.', IncidenciasGeneradas: count });

    } catch (err: any) {
        console.error("Error al analizar incidencias:", err);
        res.status(500).json({ message: 'Error al ejecutar el análisis.', error: err.message });
    }
};

// Obtener incidencias para el tablero
export const getIncidents = async (req: any, res: Response) => {
    if (!req.user.permissions['reportesAsistencia.read']) {
        return res.status(403).json({ message: 'Acceso denegado.' });
    }

    const { startDate, endDate } = req.query;

    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('UsuarioId', sql.Int, req.user.usuarioId)
            .input('FechaInicio', sql.Date, startDate)
            .input('FechaFin', sql.Date, endDate)
            .execute('sp_Incidencias_GetByPeriodo'); // SP actualizado con JOINs

        res.json(result.recordset);

    } catch (err: any) {
        console.error("Error al obtener incidencias:", err);
        res.status(500).json({ message: 'Error al cargar las incidencias.' });
    }
};
export const updateIncidentStatus = async (req: any, res: Response) => {
    // Mantenido por compatibilidad si alguna parte vieja del código lo llama
    res.status(501).json({ message: 'Usar endpoints específicos (assign/resolve)' });
};

export const getIncidentDetails = async (req: any, res: Response) => {
    const { id } = req.params;
    try {
        const pool = await sql.connect(dbConfig);
        
        // Header y Timeline (Igual que antes, omitidos por brevedad, INCLÚYELOS)
        // ... (Código anterior de header y timeline) ...
        const header = await pool.request().input('Id', sql.Int, id).query(`
            SELECT 
                i.IncidenciaId, i.EmpleadoId, i.Fecha, i.Estado, i.AsignadoAUsuarioId,
                ISNULL(s_chec.Abreviatura, 'F') as EstatusChecadorOriginal,
                ISNULL(s_sup.Abreviatura, '-') as EstatusSupervisorOriginal,
                e.NombreCompleto as Empleado, e.CodRef, 
                d.Nombre as Departamento,
                u.NombreCompleto as AsignadoA,
                t.Nombre as TipoIncidencia
            FROM Incidencias i
            JOIN Empleados e ON i.EmpleadoId = e.EmpleadoId
            JOIN CatalogoTiposIncidencia t ON i.TipoIncidenciaId = t.TipoIncidenciaId
            LEFT JOIN CatalogoEstatusAsistencia s_chec ON i.EstatusChecadorId = s_chec.EstatusId
            LEFT JOIN CatalogoEstatusAsistencia s_sup ON i.EstatusSupervisorId = s_sup.EstatusId
            LEFT JOIN CatalogoDepartamentos d ON e.DepartamentoId = d.DepartamentoId
            LEFT JOIN Usuarios u ON i.AsignadoAUsuarioId = u.UsuarioId
            WHERE i.IncidenciaId = @Id
        `);

        const timeline = await pool.request().input('Id', sql.Int, id).query(`
            SELECT b.*, u.NombreCompleto as UsuarioNombre
            FROM IncidenciasBitacora b
            JOIN Usuarios u ON b.UsuarioId = u.UsuarioId
            WHERE b.IncidenciaId = @Id
            ORDER BY b.FechaMovimiento ASC
        `);

        // C) Autorizaciones MEJORADA
        // Obtenemos el Rol y una lista concatenada de usuarios que pertenecen a ese rol
        const authorizations = await pool.request().input('Id', sql.Int, id).query(`
            SELECT 
                ia.AutorizacionId, 
                r.NombreRol as RolRequerido, -- Nombre del Rol (Join)
                ia.Estatus, 
                ia.FechaRespuesta,
                u.NombreCompleto as UsuarioNombre, -- Quien firmó (si ya firmó)
                
                -- SUBQUERY: Lista de posibles firmantes (para el tooltip)
                (
                    SELECT STRING_AGG(usr.NombreCompleto, ', ') 
                    FROM Usuarios usr 
                    JOIN UsuariosRoles ur ON usr.UsuarioId = ur.UsuarioId
                    WHERE ur.RoleId = ia.RolRequeridoId AND usr.EstaActivo = 1
                ) as PosiblesFirmantes

            FROM IncidenciasAutorizaciones ia
            JOIN Roles r ON ia.RolRequeridoId = r.RoleId
            LEFT JOIN Usuarios u ON ia.UsuarioAutorizoId = u.UsuarioId
            WHERE ia.IncidenciaId = @Id
        `);

        if (!header.recordset[0]) return res.status(404).json({ message: 'No encontrado' });

        res.json({ 
            header: header.recordset[0], 
            timeline: timeline.recordset,
            authorizations: authorizations.recordset 
        });

    } catch (err: any) { res.status(500).json({ error: err.message }); }
};
export const assignIncident = async (req: any, res: Response) => {
    const { id } = req.params;
    const { targetUserId, comment } = req.body;
    const myId = req.user.usuarioId;

    try {
        const pool = await sql.connect(dbConfig);
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // Actualizar Dueño
            await new sql.Request(transaction)
                .input('Id', sql.Int, id)
                .input('Target', sql.Int, targetUserId)
                .query("UPDATE Incidencias SET AsignadoAUsuarioId = @Target, Estado = 'Asignada' WHERE IncidenciaId = @Id");

            // Bitácora
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
export const resolveIncident = async (req: any, res: Response) => {
    const { id } = req.params;
    const { newStatus, comment } = req.body; // newStatus es la ABREVIATURA (ej 'F')
    const myId = req.user.usuarioId;

    try {
        const pool = await sql.connect(dbConfig);
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const inc = await new sql.Request(transaction).input('Id', id).query("SELECT EmpleadoId, Fecha FROM Incidencias WHERE IncidenciaId = @Id");
            const { EmpleadoId, Fecha } = inc.recordset[0];

            // Buscar ID del estatus por Abreviatura
            const st = await new sql.Request(transaction).input('Ab', newStatus).query("SELECT EstatusId FROM CatalogoEstatusAsistencia WHERE Abreviatura = @Ab");
            const newStatusId = st.recordset[0]?.EstatusId;
            if(!newStatusId) throw new Error("Estatus inválido");

            // Corregir Ficha y Quitar Candado
            await new sql.Request(transaction)
                .input('Emp', EmpleadoId).input('Fec', Fecha).input('St', newStatusId)
                .query("UPDATE FichaAsistencia SET EstatusSupervisor = @St, IncidenciaActivaId = NULL WHERE EmpleadoId = @Emp AND Fecha = @Fec");

            // Cerrar Incidencia
            await new sql.Request(transaction)
                .input('Id', id).input('User', myId)
                .query("UPDATE Incidencias SET Estado = 'Resuelta', FechaCierre = GETDATE(), ResueltoPorUsuarioId = @User WHERE IncidenciaId = @Id");

            // Bitácora
            await new sql.Request(transaction)
                .input('Id', id).input('User', myId).input('Comment', comment)
                .query("INSERT INTO IncidenciasBitacora (IncidenciaId, UsuarioId, Accion, Comentario, EstadoNuevo) VALUES (@Id, @User, 'Resolver', @Comment, 'Resuelta')");

            await transaction.commit();
            res.json({ message: 'Resuelta.' });
        } catch (e) { await transaction.rollback(); throw e; }
    } catch (err: any) { res.status(500).json({ error: err.message }); }
};
export const requestAuth = async (req: any, res: Response) => {
    const { id } = req.params;
    const { comment } = req.body;
    const myId = req.user.usuarioId;

    try {
        const pool = await sql.connect(dbConfig);
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // A. Obtener Nivel de Criticidad de la incidencia
            const incData = await new sql.Request(transaction).input('Id', id).query("SELECT NivelCriticidad FROM Incidencias WHERE IncidenciaId = @Id");
            const nivel = incData.recordset[0]?.NivelCriticidad || 1;

            // B. Obtener Roles requeridos para ese nivel desde la configuración
            const config = await new sql.Request(transaction).input('Nivel', nivel).query("SELECT RoleId FROM ConfiguracionNivelesAutorizacion WHERE NivelCriticidad = @Nivel");
            
            // Si no hay configuración para este nivel, usamos un default (ej. solo RH o Admin)
            // Esto es una red de seguridad.
            let rolesRequeridos = config.recordset;
            if (rolesRequeridos.length === 0) {
                 // Fallback: Buscar rol Admin o RH
                 const fallback = await new sql.Request(transaction).query("SELECT TOP 1 RoleId FROM Roles WHERE NombreRol LIKE '%Admin%' OR NombreRol LIKE '%RH%'");
                 rolesRequeridos = fallback.recordset;
            }

            // C. Insertar solicitudes
            for (const row of rolesRequeridos) {
                await new sql.Request(transaction)
                    .input('IncId', id)
                    .input('RolId', row.RoleId)
                    .query("INSERT INTO IncidenciasAutorizaciones (IncidenciaId, RolRequeridoId, Estatus) VALUES (@IncId, @RolId, 'Pendiente')");
            }

            // D. Actualizar Estatus y Bitácora
            await new sql.Request(transaction).input('Id', id).query("UPDATE Incidencias SET Estado = 'PorAutorizar', RequiereAutorizacion = 1 WHERE IncidenciaId = @Id");
            
            await new sql.Request(transaction)
                .input('Id', id).input('User', myId).input('Comment', comment)
                .query("INSERT INTO IncidenciasBitacora (IncidenciaId, UsuarioId, Accion, Comentario, EstadoNuevo) VALUES (@Id, @User, 'SolicitarAutorizacion', @Comment, 'PorAutorizar')");

            await transaction.commit();
            res.json({ message: 'Solicitud de autorización enviada.' });
        } catch (e) { await transaction.rollback(); throw e; }
    } catch (err: any) { res.status(500).json({ error: err.message }); }
};
export const cancelAuthRequest = async (req: any, res: Response) => {
    const { id } = req.params;
    const { comment } = req.body; // Motivo de cancelación
    const myId = req.user.usuarioId;
    const isAdmin = req.user.permissions['incidencias.manage'];

    try {
        const pool = await sql.connect(dbConfig);
        
        // Validar permisos: Solo el dueño actual (quien la tenía asignada antes) o Admin
        // En estado 'PorAutorizar', el AsignadoAUsuarioId sigue siendo el supervisor que pidió el permiso.
        const check = await pool.request().input('Id', id).query("SELECT AsignadoAUsuarioId FROM Incidencias WHERE IncidenciaId = @Id");
        if (!check.recordset[0]) return res.status(404).json({ message: 'Incidencia no encontrada' });
        
        if (!isAdmin && check.recordset[0].AsignadoAUsuarioId !== myId) {
            return res.status(403).json({ message: 'Solo el solicitante o un admin pueden cancelar la solicitud.' });
        }

        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // A. Borrar las firmas (o podrías marcarlas como 'Canceladas' si prefieres historial)
            // Aquí las borramos para "limpiar" el intento.
            await new sql.Request(transaction).input('Id', id).query("DELETE FROM IncidenciasAutorizaciones WHERE IncidenciaId = @Id");

            // B. Regresar estado a 'Asignada' (Devolver la bola al supervisor)
            await new sql.Request(transaction).input('Id', id).query("UPDATE Incidencias SET Estado = 'Asignada', RequiereAutorizacion = 0 WHERE IncidenciaId = @Id");

            // C. Bitácora
            await new sql.Request(transaction)
                .input('Id', id).input('User', myId).input('Comment', comment || 'Cancelación de solicitud de autorización.')
                .query("INSERT INTO IncidenciasBitacora (IncidenciaId, UsuarioId, Accion, Comentario, EstadoNuevo) VALUES (@Id, @User, 'CancelarSolicitud', @Comment, 'Asignada')");

            await transaction.commit();
            res.json({ message: 'Solicitud cancelada. La incidencia regresa a tu bandeja.' });
        } catch (e) { await transaction.rollback(); throw e; }
    } catch (err: any) { res.status(500).json({ error: err.message }); }
};

export const getIncidentManagers = async (req: any, res: Response) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().execute('sp_Usuarios_GetGestoresIncidencias');
        res.json(result.recordset);
    } catch (err: any) {
        console.error("Error obteniendo gestores:", err);
        res.status(500).json({ message: 'Error al cargar lista.' });
    }
};
export const getResolutionOptions = async (req: any, res: Response) => {
    const { id } = req.params;
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('IncidenciaId', sql.Int, id)
            .execute('sp_Incidencias_ObtenerPosiblesSoluciones');
        res.json(result.recordset);
    } catch (err: any) {
        console.error("Error obteniendo opciones:", err);
        res.status(500).json({ message: 'Error al cargar opciones.' });
    }
};