import { Request, Response } from 'express';
import sql from 'mssql';
import { dbConfig } from '../../config/database';

export const getDepartamentos = async (req: any, res: Response) => {
    if (!req.user.permissions['catalogo.departamentos.read']) return res.status(403).json({ message: 'No tienes permiso para ver los departamentos.' });
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query('SELECT DepartamentoId, Nombre FROM CatalogoDepartamentos WHERE Activo=1');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: 'Error al obtener departamentos.' }); }
};

export const getGruposNomina = async (req: any, res: Response) => {
    if (!req.user.permissions['catalogo.gruposNomina.read']) return res.status(403).json({ message: 'No tienes permiso para ver los grupos de nómina.' });
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query('SELECT GrupoNominaId, Nombre FROM CatalogoGruposNomina WHERE Activo=1');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: 'Error al obtener grupos de nómina.' }); }
};

export const getDepartamentosManagement = async (req: any, res: Response) => {
    if (!req.user.permissions['catalogo.departamentos.manage']) return res.status(403).json({ message: 'No tienes permiso para gestionar departamentos.' });
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().execute('sp_Departamentos_GetAllManagement');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: 'Error al obtener datos de gestión de deptos.' }); }
};

export const saveDepartamento = async (req: any, res: Response) => {
    if (!req.user.permissions['catalogo.departamentos.manage']) return res.status(403).json({ message: 'Acceso denegado.' });
    const { departamento, nombre, abreviatura, status } = req.body;
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request().input('DepartamentoId', sql.NVarChar, departamento).input('Nombre', sql.NVarChar, nombre)
            .input('Abreviatura', sql.NVarChar, abreviatura).input('Status', sql.NVarChar, status).execute('sp_Departamentos_Save');
        res.status(201).json({ message: 'Departamento guardado con éxito' });
    } catch (err) { res.status(500).json({ message: 'Error al guardar el departamento.' }); }
};

export const getGruposNominaManagement = async (req: any, res: Response) => {
    if (!req.user.permissions['catalogo.gruposNomina.manage']) return res.status(403).json({ message: 'No tienes permiso para gestionar grupos.' });
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().execute('sp_GruposNomina_GetAllManagement');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: 'Error al obtener datos de gestión de grupos.' }); }
};

export const saveGrupoNomina = async (req: any, res: Response) => {
    if (!req.user.permissions['catalogo.grupos_nomina.manage']) return res.status(403).json({ message: 'Acceso denegado.' });
    const { grupo_nomina, nombre, abreviatura, status } = req.body;
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request().input('GrupoNominaId', sql.NVarChar, grupo_nomina).input('Nombre', sql.NVarChar, nombre)
            .input('Abreviatura', sql.NVarChar, abreviatura).input('Activo', sql.Bit, status).execute('sp_GruposNomina_Save');
        res.status(201).json({ message: 'Grupo de nómina guardado con éxito' });
    } catch (err) { res.status(500).json({ message: 'Error al guardar el grupo de nómina.' }); }
};

export const getAttendanceStatuses = async (req: any, res: Response) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query('SELECT * FROM dbo.CatalogoEstatusAsistencia WHERE Activo = 1');
        res.json(result.recordset);
    } catch (err) {
        console.error('Error al obtener el catálogo de estatus:', err);
        res.status(500).json({ message: 'Error al obtener el catálogo de estatus.' });
    }
};

export const getAttendanceStatusesManagement = async (req: any, res: Response) => {
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
};

export const upsertAttendanceStatus = async (req: any, res: Response) => {
    if (!req.user.permissions['catalogo.estatusAsistencia.manage']) {
        return res.status(403).json({ message: 'No tienes permiso para gestionar este catálogo.' });
    }
    
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
        PermiteComentario
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
            .input('PermiteComentario', sql.Bit, PermiteComentario)
            .execute('sp_CatalogoEstatusAsistencia_Upsert');
            
        res.status(200).json({ message: 'Estatus guardado correctamente.' });
    } catch (err: any) {
        res.status(409).json({ message: err.message });
    }
};

export const getSchedulesCatalog = async (req: any, res: Response) => {
    if (!req.user.permissions['catalogo.horarios.read']) return res.status(403).json({ message: 'Acceso denegado.' });
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().execute('sp_CatalogoHorarios_GetForManagement');
        const horarios = result.recordset.map(h => ({ ...h, Detalles: h.Detalles ? JSON.parse(h.Detalles) : [] }));
        res.json(horarios);
    } catch (err: any) { res.status(500).json({ message: 'Error al obtener el catálogo de horarios.', error: err.message }); }
};

export const upsertScheduleCatalog = async (req: any, res: Response) => {
    if (!req.user.permissions['catalogo.horarios.manage']) return res.status(403).json({ message: 'Acceso denegado.' });
    const { HorarioId, Abreviatura, Nombre, MinutosTolerancia, ColorUI, Activo, Detalles } = req.body;
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('HorarioId', sql.Int, HorarioId || 0)
            .input('Abreviatura', sql.NVarChar, Abreviatura)
            .input('Nombre', sql.NVarChar, Nombre)
            .input('MinutosTolerancia', sql.Int, MinutosTolerancia)
            .input('ColorUI', sql.NVarChar, ColorUI)
            .input('Activo', sql.Bit, Activo)
            .input('DetallesJSON', sql.NVarChar, JSON.stringify(Detalles || [])).execute('sp_CatalogoHorarios_Upsert');
        res.status(200).json({ message: 'Horario guardado correctamente.', horarioId: result.recordset[0].HorarioId });
    } catch (err: any) { res.status(409).json({ message: err.message }); }
};

export const deleteScheduleCatalog = async (req: any, res: Response) => {
    if (!req.user.permissions['catalogo.horarios.manage']) return res.status(403).json({ message: 'Acceso denegado.' });
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request().input('HorarioId', sql.Int, req.params.horarioId).execute('sp_CatalogoHorarios_Delete');
        res.status(200).json({ message: 'Horario desactivado correctamente.' });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
};
