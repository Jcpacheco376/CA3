// src-api/api/controllers/incidents.controller.ts
import { Request, Response } from 'express';
import sql from 'mssql';
import { dbConfig } from '../../config/database';

// Generar incidencias (Ejecuta el motor de análisis)
export const analyzeIncidents = async (req: any, res: Response) => {
    // Requiere permiso de escritura en reportes o uno específico si creamos 'incidencias.manage'
    if (!req.user.permissions['reportesAsistencia.assign']) {
        return res.status(403).json({ message: 'No tienes permiso para ejecutar el análisis.' });
    }

    const { startDate, endDate } = req.body;

    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('FechaInicio', sql.Date, startDate)
            .input('FechaFin', sql.Date, endDate)
            .input('UsuarioId', sql.Int, req.user.usuarioId)
            .execute('sp_Incidencias_Analizar');
        
        res.status(200).json({ message: 'Análisis completado. Incidencias generadas.' });

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

    const { startDate, endDate } = req.query; // Usamos query params para GET

    try {
        const pool = await sql.connect(dbConfig);
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
export const updateIncidentStatus = async (req: any, res: Response) => {
    if (!req.user.permissions['reportesAsistencia.assign']) { // O un permiso específico de incidencias
        return res.status(403).json({ message: 'No tienes permiso para gestionar incidencias.' });
    }
    console.log("updateIncidentStatus called with:", req.params, req.body);
    const { id } = req.params;
    const { status, comments } = req.body;

    try {
        const pool = await sql.connect(dbConfig);
        
        // Idealmente esto sería un SP 'sp_Incidencias_UpdateStatus', pero por ahora un query directo funciona
        await pool.request()
            .input('IncidenciaId', sql.Int, id)
            .input('Estado', sql.VarChar, status)
            .input('ComentariosAdicionales', sql.NVarChar, comments)
            .input('UsuarioId', sql.Int, req.user.usuarioId)
            .query(`
                UPDATE dbo.Incidencias 
                SET 
                    Estado = @Estado,
                    Comentarios = ISNULL(Comentarios, '') + CHAR(13) + CHAR(10) + 'Nota: ' + @ComentariosAdicionales,
                    ResueltoPorUsuarioId = @UsuarioId,
                    FechaResolucion = GETDATE()
                WHERE IncidenciaId = @IncidenciaId
            `);
        
        res.status(200).json({ message: 'Incidencia actualizada.' });

    } catch (err: any) {
        console.error("Error al actualizar incidencia:", err);
        res.status(500).json({ message: 'Error al actualizar la incidencia.' });
    }
};
