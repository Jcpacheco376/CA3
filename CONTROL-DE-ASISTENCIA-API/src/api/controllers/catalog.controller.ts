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
    if (!req.user.permissions['catalogo.departamentos.read'] && !req.user.permissions['catalogo.departamentos.manage']) {
        return res.status(403).json({ message: 'No tienes permiso para ver este catálogo.' });
    }try {
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
    if (!req.user.permissions['catalogo.gruposNomina.read'] && !req.user.permissions['catalogo.gruposNomina.manage']) {
        return res.status(403).json({ message: 'No tienes permiso para ver este catálogo.' });
    }try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().execute('sp_GruposNomina_GetAllManagement');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: 'Error al obtener datos de gestión de grupos.' }); }
};

export const saveGrupoNomina = async (req: any, res: Response) => {
    if (!req.user.permissions['catalogo.gruposNomina.manage']) return res.status(403).json({ message: 'Acceso denegado.' });
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
    if (!req.user.permissions['catalogo.estatusAsistencia.read'] && !req.user.permissions['catalogo.estatusAsistencia.manage']) {
        return res.status(403).json({ message: 'No tienes permiso para ver este catálogo.' });
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
        EsDescanso,
        EsEntradaSalidaIncompleta,
        EsAsistencia,
        DiasRegistroFuturo,
        PermiteComentario,
        Esdefault,
        SinHorario 
    } = req.body;

    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('EstatusId', sql.Int, EstatusId || 0)
            .input('Abreviatura', sql.NVarChar, Abreviatura)
            .input('Descripcion', sql.NVarChar, Descripcion)
            .input('ColorUI', sql.NVarChar, ColorUI)
            .input('ValorNomina', sql.Decimal(5, 2), ValorNomina) 
            .input('VisibleSupervisor', sql.Bit, VisibleSupervisor)
            .input('Activo', sql.Bit, Activo)
            .input('Tipo', sql.NVarChar, Tipo)
            .input('EsFalta', sql.Bit, EsFalta)
            .input('EsRetardo', sql.Bit, EsRetardo)
            .input('EsDescanso', sql.Bit, EsDescanso)
            .input('EsEntradaSalidaIncompleta', sql.Bit, EsEntradaSalidaIncompleta)
            .input('EsAsistencia', sql.Bit, EsAsistencia)
            .input('DiasRegistroFuturo', sql.Int, DiasRegistroFuturo)
            .input('PermiteComentario', sql.Bit, PermiteComentario)
            .input('Esdefault', sql.Bit, Esdefault) 
            .input('SinHorario',sql.Bit, SinHorario)
            .execute('sp_CatalogoEstatusAsistencia_Upsert');
            
        res.status(200).json({ message: 'Estatus guardado correctamente.' });
    } catch (err: any) {
        res.status(409).json({ message: err.message });
    }
};

export const getSchedulesCatalog = async (req: any, res: Response) => {
    if (!req.user.permissions['catalogo.horarios.read'] && !req.user.permissions['catalogo.horarios.manage']) {
        return res.status(403).json({ message: 'Acceso denegado.' });
    }try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().execute('sp_CatalogoHorarios_GetForManagement');
        const horarios = result.recordset.map(h => ({ ...h, Detalles: h.Detalles ? JSON.parse(h.Detalles) : [] }));
        res.json(horarios);
    } catch (err: any) { res.status(500).json({ message: 'Error al obtener el catálogo de horarios.', error: err.message }); }
};

export const upsertScheduleCatalog = async (req: any, res: Response) => {
    if (!req.user.permissions['catalogo.horarios.manage']) return res.status(403).json({ message: 'Acceso denegado.' });
    const { HorarioId, Abreviatura, Nombre, MinutosTolerancia, ColorUI, Activo, EsRotativo, DetallesJSON } = req.body;
    try {
         const pool = await sql.connect(dbConfig);
        //console.log('Received Body:', req.body); // Log the received body
        //console.log('DetallesJSON String:', DetallesJSON); // Log the string received

        const result = await pool.request()
            .input('HorarioId', sql.Int, HorarioId || 0)
            .input('Abreviatura', sql.NVarChar, Abreviatura)
            .input('Nombre', sql.NVarChar, Nombre)
            .input('MinutosTolerancia', sql.Int, MinutosTolerancia)
            .input('ColorUI', sql.NVarChar, ColorUI)
            .input('Activo', sql.Bit, Activo)
            .input('esRotativo', sql.Bit, EsRotativo ?? false) 
            .input('DetallesJSON', sql.NVarChar, DetallesJSON || '[]')
            .execute('sp_CatalogoHorarios_Upsert');

        const returnedHorarioId = result.recordset && result.recordset.length > 0 ? result.recordset[0].HorarioId : null;

        res.status(200).json({
             message: 'Horario guardado correctamente.',
             horarioId: returnedHorarioId
        });
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

export const getPuestos = async (req: any, res: Response) => {
    if (!req.user.permissions['catalogo.puestos.read']) return res.status(403).json({ message: 'No tienes permiso para ver los puestos.' });
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query('SELECT PuestoId, Nombre FROM CatalogoPuestos WHERE Activo=1');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: 'Error al obtener puestos.' }); }
};

export const getPuestosManagement = async (req: any, res: Response) => {
    // Para la página de admin (permite 'read' o 'manage')
    if (!req.user.permissions['catalogo.puestos.read'] && !req.user.permissions['catalogo.puestos.manage']) {
        return res.status(403).json({ message: 'No tienes permiso para gestionar puestos.' });
    }
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().execute('sp_Puestos_GetAllManagement'); 
        res.json(result.recordset);
    } catch (err: any) { res.status(500).json({ message: 'Error al obtener datos de gestión de puestos.', error: err.message }); }
};

export const savePuesto = async (req: any, res: Response) => {
    if (!req.user.permissions['catalogo.puestos.manage']) return res.status(403).json({ message: 'Acceso denegado.' });
    
    const { PuestoId, CodRef, Nombre, Activo } = req.body;
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('PuestoId', sql.Int, PuestoId) 
            .input('CodRef', sql.NVarChar, CodRef)
            .input('Nombre', sql.NVarChar, Nombre)
            .input('Activo', sql.Bit, Activo)
            .execute('sp_Puestos_Save'); 
        res.status(201).json({ message: 'Puesto guardado con éxito' });
    } catch (err: any) { res.status(500).json({ message: 'Error al guardar el puesto.', error: err.message }); }
};


export const getEstablecimientos = async (req: any, res: Response) => {
    if (!req.user.permissions['catalogo.establecimientos.read']) return res.status(403).json({ message: 'No tienes permiso para ver los establecimientos.' });
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query('SELECT EstablecimientoId, Nombre FROM CatalogoEstablecimientos WHERE Activo=1');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: 'Error al obtener establecimientos.' }); }
};

export const getEstablecimientosManagement = async (req: any, res: Response) => {
    if (!req.user.permissions['catalogo.establecimientos.read'] && !req.user.permissions['catalogo.establecimientos.manage']) {
        return res.status(403).json({ message: 'No tienes permiso para gestionar establecimientos.' });
    }
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().execute('sp_Establecimientos_GetAllManagement'); 
        res.json(result.recordset);
    } catch (err: any) { res.status(500).json({ message: 'Error al obtener datos de gestión de establecimientos.', error: err.message }); }
};

export const saveEstablecimiento = async (req: any, res: Response) => {
    if (!req.user.permissions['catalogo.establecimientos.manage']) return res.status(403).json({ message: 'Acceso denegado.' });

    const { EstablecimientoId, CodRef, Nombre, Abreviatura, Activo } = req.body;
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('EstablecimientoId', sql.Int, EstablecimientoId) 
            .input('CodRef', sql.NVarChar, CodRef)
            .input('Nombre', sql.NVarChar, Nombre)
            .input('Abreviatura', sql.NVarChar, Abreviatura)
            .input('Activo', sql.Bit, Activo)
            .execute('sp_Establecimientos_Save'); 
        res.status(201).json({ message: 'Establecimiento guardado con éxito' });
    } catch (err: any) { res.status(500).json({ message: 'Error al guardar el establecimiento.', error: err.message }); }
};