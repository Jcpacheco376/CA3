import { Request, Response } from 'express';
import sql from 'mssql';
import { dbConfig } from '../../config/database';

export const getEmployeeProfile = async (req: any, res: Response) => {
    if (!req.user.permissions['usuarios.read'] &&
        !req.user.permissions['reportesAsistencia.read.own'] &&
        !req.user.permissions['horarios.read'] &&
        !req.user.permissions['catalogo.empleados.read'] &&
        !req.user.permissions['catalogo.empleados.manage']) {
        return res.status(403).json({ message: 'No tienes permiso para ver perfiles de empleado.' });
    }
    const { employeeId } = req.params;
    if (!employeeId) return res.status(400).json({ message: 'El ID del empleado es requerido.' });
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().input('EmpleadoId', sql.Int, employeeId).execute('sp_Empleados_GetDatos');
        if (result.recordset.length === 0) return res.status(404).json({ message: 'Empleado no encontrado.' });
        res.json(result.recordset[0]);
    } catch (err: any) {
        res.status(500).json({ message: err.message || 'Error al obtener la información del empleado.' });
    }
};

export const getEmployees = async (req: any, res: Response) => {
    if (!req.user.permissions['catalogo.empleados.read'] && !req.user.permissions['catalogo.empleados.manage']) {
        return res.status(403).json({ message: 'No tienes permiso para ver los empleados.' });
    }
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().execute('dbo.sp_Empleados_GetAll');
        res.json(result.recordset);
    } catch (err: any) {
        res.status(500).json({ message: err.message || 'Error al obtener empleados.' });
    }
};

export const createEmployee = async (req: any, res: Response) => {
    if (!req.user.permissions['catalogo.empleados.manage']) {
        return res.status(403).json({ message: 'No tienes permiso para crear empleados.' });
    }
    try {
        const pool = await sql.connect(dbConfig);
        const request = pool.request();
        // Add inputs based on sp_Empleados_Insert
        request.input('CodRef', sql.NVarChar, req.body.CodRef);
        request.input('NombreCompleto', sql.NVarChar, req.body.NombreCompleto);
        request.input('FechaNacimiento', sql.Date, req.body.FechaNacimiento);
        request.input('FechaIngreso', sql.Date, req.body.FechaIngreso);
        request.input('DepartamentoId', sql.Int, req.body.DepartamentoId);
        request.input('GrupoNominaId', sql.Int, req.body.GrupoNominaId);
        request.input('PuestoId', sql.Int, req.body.PuestoId);
        request.input('HorarioIdPredeterminado', sql.Int, req.body.HorarioIdPredeterminado);
        request.input('EstablecimientoId', sql.Int, req.body.EstablecimientoId);
        request.input('Sexo', sql.NChar, req.body.Sexo);
        request.input('NSS', sql.NVarChar, req.body.NSS);
        request.input('CURP', sql.NVarChar, req.body.CURP);
        request.input('RFC', sql.NVarChar, req.body.RFC);
        // Image handling might need specific logic (base64 to binary)
        if (req.body.Imagen) {
            request.input('Imagen', sql.VarBinary, Buffer.from(req.body.Imagen, 'base64'));
        }
        request.input('Activo', sql.Bit, req.body.Activo);

        const result = await request.execute('dbo.sp_Empleados_Insert');
        res.status(201).json({ message: 'Empleado creado correctamente.', empleadoId: result.recordset[0].EmpleadoId });
    } catch (err: any) {
        res.status(500).json({ message: err.message || 'Error al crear empleado.' });
    }
};

export const updateEmployee = async (req: any, res: Response) => {
    if (!req.user.permissions['catalogo.empleados.manage']) {
        return res.status(403).json({ message: 'No tienes permiso para actualizar empleados.' });
    }
    const { employeeId } = req.params;
    try {
        const pool = await sql.connect(dbConfig);
        const request = pool.request();
        request.input('EmpleadoId', sql.Int, employeeId);
        request.input('CodRef', sql.NVarChar, req.body.CodRef);
        request.input('NombreCompleto', sql.NVarChar, req.body.NombreCompleto);
        request.input('FechaNacimiento', sql.Date, req.body.FechaNacimiento);
        request.input('FechaIngreso', sql.Date, req.body.FechaIngreso);
        request.input('DepartamentoId', sql.Int, req.body.DepartamentoId);
        request.input('GrupoNominaId', sql.Int, req.body.GrupoNominaId);
        request.input('PuestoId', sql.Int, req.body.PuestoId);
        request.input('HorarioIdPredeterminado', sql.Int, req.body.HorarioIdPredeterminado);
        request.input('EstablecimientoId', sql.Int, req.body.EstablecimientoId);
        request.input('Sexo', sql.NChar, req.body.Sexo);
        request.input('NSS', sql.NVarChar, req.body.NSS);
        request.input('CURP', sql.NVarChar, req.body.CURP);
        request.input('RFC', sql.NVarChar, req.body.RFC);
        if (req.body.Imagen) {
            request.input('Imagen', sql.VarBinary, Buffer.from(req.body.Imagen, 'base64'));
        }
        request.input('Activo', sql.Bit, req.body.Activo);

        await request.execute('dbo.sp_Empleados_Update');
        res.json({ message: 'Empleado actualizado correctamente.' });
    } catch (err: any) {
        res.status(500).json({ message: err.message || 'Error al actualizar empleado.' });
    }
};

export const deleteEmployee = async (req: any, res: Response) => {
    if (!req.user.permissions['catalogo.empleados.manage']) {
        return res.status(403).json({ message: 'No tienes permiso para eliminar empleados.' });
    }
    const { employeeId } = req.params;
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request().input('EmpleadoId', sql.Int, employeeId).execute('dbo.sp_Empleados_Delete');
        res.json({ message: 'Empleado eliminado correctamente.' });
    } catch (err: any) {
        res.status(500).json({ message: err.message || 'Error al eliminar empleado.' });
    }
};
