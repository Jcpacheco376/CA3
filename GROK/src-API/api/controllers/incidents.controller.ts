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
            .execute('sp_Incidencias_Analizar');
        
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
        
        // CAMBIO AQUÍ: Agregamos ': any' después de result
        // Esto le dice a TypeScript: "Tranquilo, yo sé que esto devuelve un arreglo"
        const result: any = await pool.request()
            .input('IncidenciaId', sql.Int, id)
            .execute('sp_Incidencias_GetDetalle');

        // Ahora TypeScript ya no marcará error aquí:
        const header = result.recordsets[0]?.[0];
        const timeline = result.recordsets[1] || [];
        const authorizations = result.recordsets[2] || [];

        if (!header) {
            return res.status(404).json({ message: 'Incidencia no encontrada' });
        }

        res.json({ 
            header, 
            timeline,
            authorizations 
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
        
        await pool.request()
            .input('IncidenciaId', sql.Int, id)
            .input('UsuarioAsignadoId', sql.Int, targetUserId)
            .input('Comentario', sql.NVarChar, comment)
            .input('UsuarioAccionId', sql.Int, myId)
            .execute('sp_Incidencias_Asignar');

        res.json({ message: 'Asignada correctamente.' });

    } catch (err: any) {
        console.error("Error al asignar incidencia:", err);
        res.status(500).json({ error: err.message }); 
    }
};
// Resolver (ACTUALIZADO CON NUEVOS NOMBRES)
export const resolveIncident = async (req: any, res: Response) => {
    const { id } = req.params;
    const { newStatus, comment } = req.body; 
    const myId = req.user.usuarioId;

    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('IncidenciaId', sql.Int, id)
            .input('NuevoEstatusAbrev', sql.NVarChar, newStatus)
            .input('Comentario', sql.NVarChar, comment)
            .input('UsuarioAccionId', sql.Int, myId)
            .execute('sp_Incidencias_Resolver');

        res.json({ message: 'Resuelta correctamente.' });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
};
// Solicitar Autorización
export const requestAuth = async (req: any, res: Response) => {
    const { id } = req.params;
    const { comment } = req.body;
    const myId = req.user.usuarioId;

    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('IncidenciaId', sql.Int, id)
            .input('Comentario', sql.NVarChar, comment)
            .input('UsuarioAccionId', sql.Int, myId)
            .execute('sp_Incidencias_SolicitarAutorizacion');

        res.json({ message: 'Solicitud enviada.' });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
};

// Cancelar Solicitud
export const cancelAuthRequest = async (req: any, res: Response) => {
    const { id } = req.params;
    const { comment } = req.body;
    const myId = req.user.usuarioId;
    // Convierte booleano a bit (1/0)
    const isAdmin = req.user.permissions['incidencias.resolve'] ? 1 : 0; 

    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('IncidenciaId', sql.Int, id)
            .input('Comentario', sql.NVarChar, comment)
            .input('UsuarioAccionId', sql.Int, myId)
            .input('EsAdmin', sql.Bit, isAdmin)
            .execute('sp_Incidencias_CancelarSolicitud');

        res.json({ message: 'Solicitud cancelada.' });
    } catch (err: any) { 
        // Capturar errores de lógica de negocio (403/404)
        if (err.message.includes('permiso')) return res.status(403).json({ message: err.message });
        res.status(500).json({ error: err.message }); 
    }
};

// --- 5. Votación (REVISIÓN DE SEGURIDAD CRÍTICA) ---
export const voteAuth = async (req: any, res: Response) => {
    const { id } = req.params;
    const { authId, verdict, comment } = req.body;
    const myId = req.user.usuarioId;
    const isAdmin = req.user.permissions['incidencias.resolve'] ? 1 : 0;

    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('IncidenciaId', sql.Int, id)
            .input('AutorizacionId', sql.Int, authId)
            .input('Veredicto', sql.NVarChar, verdict) // 'Aprobado' / 'Rechazado'
            .input('Comentario', sql.NVarChar, comment)
            .input('UsuarioAccionId', sql.Int, myId)
            .input('EsAdmin', sql.Bit, isAdmin)
            .execute('sp_Incidencias_Votar');

        res.json({ message: 'Voto registrado correctamente.' });
    } catch (err: any) { 
        if (err.message.includes('rol necesario')) return res.status(403).json({ message: err.message });
        res.status(500).json({ error: err.message }); 
    }
};

// --- 6. DROPDOWNS ---
export const getIncidentManagers = async (req: any, res: Response) => {
    const { id } = req.params; 
    
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('IncidenciaId', sql.Int, id)
            .execute('sp_Usuarios_GetGestoresParaIncidencia'); 
            
        res.json(result.recordset);
    } catch (err: any) { 
        console.error("Error al cargar gestores:", err);
        res.status(500).json({ message: 'Error al cargar lista de gestores.' }); 
    }
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