import { Request, Response } from 'express';
import sql from 'mssql';
import { dbConfig } from '../../config/database';

export const getEventTypes = async (req: any, res: Response) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .execute('sp_TiposEventoCalendario_GetAll');

        res.json(result.recordset);
    } catch (err: any) {
        console.error('Error al obtener tipos de evento:', err);
        res.status(500).json({ message: err.message || 'Error al obtener tipos de evento.' });
    }
};

export const getAllEvents = async (req: any, res: Response) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .execute('sp_EventosCalendario_GetAll');

        // El SP devuelve 2 recordsets: eventos y filtros
        const events = (result.recordsets as any[])[0] || [];
        const filters = (result.recordsets as any[])[1] || [];

        // Agrupar filtros por EventoId
        const filtersByEvent: Record<number, any[]> = {};
        filters.forEach((f: any) => {
            if (!filtersByEvent[f.EventoId]) filtersByEvent[f.EventoId] = [];
            filtersByEvent[f.EventoId].push({
                filtroId: f.FiltroId,
                grupoRegla: f.GrupoRegla || 0,
                dimension: f.Dimension,
                valorId: f.ValorId,
                valorNombre: f.ValorNombre
            });
        });

        // Enriquecer eventos con sus filtros
        const enrichedEvents = events.map((ev: any) => ({
            ...ev,
            Filtros: filtersByEvent[ev.EventoId] || []
        }));

        res.json(enrichedEvents);
    } catch (err: any) {
        console.error('Error al obtener eventos:', err);
        res.status(500).json({ message: err.message || 'Error al obtener eventos.' });
    }
};

export const upsertEvent = async (req: any, res: Response) => {
    const {
        eventoId,
        fecha,
        nombre,
        descripcion,
        tipoEventoId,
        aplicaATodos,
        filtros   // Array: [{ grupoRegla: 0, dimension: 'DEPARTAMENTO', valores: [1, 3] }, ...]
    } = req.body;

    if (!fecha || !nombre || !tipoEventoId) {
        return res.status(400).json({ message: 'Faltan campos requeridos (fecha, nombre, tipoEventoId).' });
    }

    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('EventoId', sql.Int, eventoId || null)
            .input('Fecha', sql.Date, fecha)
            .input('Nombre', sql.NVarChar, nombre)
            .input('Descripcion', sql.NVarChar, descripcion || null)
            .input('TipoEventoId', sql.VarChar, tipoEventoId)
            .input('AplicaATodos', sql.Bit, aplicaATodos !== undefined ? aplicaATodos : true)
            .input('Activo', sql.Bit, 1)
            .input('UsuarioId', sql.Int, req.user.usuarioId)
            .input('FiltrosJSON', sql.NVarChar, filtros ? JSON.stringify(filtros) : null)
            .execute('sp_EventosCalendario_Upsert');

        res.json({ message: 'Evento guardado correctamente.', eventoId: result.recordset?.[0]?.EventoId });
    } catch (err: any) {
        console.error('Error al guardar evento:', err);
        if (err.number === 50001) {
            return res.status(409).json({ message: err.message });
        }
        res.status(500).json({ message: err.message || 'Error al guardar evento.' });
    }
};

export const deleteEvent = async (req: any, res: Response) => {
    const { id } = req.params;

    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('EventoId', sql.Int, id)
            .execute('sp_EventosCalendario_Delete');

        res.json({ message: 'Evento eliminado correctamente.' });
    } catch (err: any) {
        console.error('Error al eliminar evento:', err);
        res.status(500).json({ message: err.message || 'Error al eliminar evento.' });
    }
};

// Cuenta empleados activos que coinciden con los grupos de filtros
export const countMatchingEmployees = async (req: any, res: Response) => {
    const { filterGroups, aplicaATodos } = req.body; // filterGroups: DimensionFilter[][] (array of groups, each containing array of filters)

    try {
        const pool = await sql.connect(dbConfig);

        if (aplicaATodos || !filterGroups || filterGroups.length === 0) {
            // Sin filtros: contar todos los empleados activos
            const result = await pool.request().query(
                'SELECT COUNT(*) as total FROM dbo.Empleados WHERE Activo = 1'
            );
            return res.json({ total: result.recordset[0].total });
        }

        const dimensionMap: Record<string, string> = {
            'DEPARTAMENTO': 'DepartamentoId',
            'GRUPO_NOMINA': 'GrupoNominaId',
            'PUESTO': 'PuestoId',
            'ESTABLECIMIENTO': 'EstablecimientoId'
        };

        const request = pool.request();
        let paramIdx = 0;
        const subQueries: string[] = [];

        // Build a query for each group
        for (const group of filterGroups) {
            const conditions: string[] = ['Activo = 1'];

            for (const filtro of group) {
                const col = dimensionMap[filtro.dimension];
                if (!col || !filtro.valores || filtro.valores.length === 0) continue;

                const paramNames: string[] = [];
                for (const val of filtro.valores) {
                    const pName = `p${paramIdx++}`;
                    paramNames.push(`@${pName}`);
                    request.input(pName, sql.Int, val);
                }
                conditions.push(`${col} IN (${paramNames.join(',')})`);
            }
            subQueries.push(`SELECT EmpleadoId FROM dbo.Empleados WHERE ${conditions.join(' AND ')}`);
        }

        // Get total matching union
        const unionQuery = `
            WITH CTE_Matching AS (
                ${subQueries.join('\n                UNION\n                ')}
            )
            SELECT COUNT(*) as total FROM CTE_Matching;
        `;
        const totalResult = await request.query(unionQuery);

        // Get individual counts
        const byGroup = [];
        for (const subQuery of subQueries) {
            const countQuery = `SELECT COUNT(*) as count FROM (${subQuery}) as T`;
            // Wait, actually using the same request object is perfectly fine as all params p0, p1... are already added to `request`.
            const sqRes = await request.query(countQuery);
            byGroup.push(sqRes.recordset[0].count);
        }

        res.json({ total: totalResult.recordset[0].total, byGroup });
    } catch (err: any) {
        console.error('Error al contar empleados:', err);
        res.status(500).json({ message: err.message || 'Error al contar empleados.' });
    }
};
