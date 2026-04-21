import { Request, Response } from 'express';
import sql from 'mssql';
import { dbConfig } from '../../config/database';

export const getEmployeeProfile = async (req: any, res: Response) => {
    res.setHeader('X-API-Version', 'DEBUG-1');
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

        const employee = result.recordset[0];
        if (employee.Zonas) {
            try {
                employee.Zonas = JSON.parse(employee.Zonas);
            } catch (e) {
                console.error("Error parsing Zonas JSON", e);
                employee.Zonas = [];
            }
        } else {
            employee.Zonas = [];
        }

        // Condese massive SQL VarBinary Buffers to Base64 strings explicitly before transmission.
        // Prevents Network payload bloating (34,000 int arrays) which hangs the Render interface
        if (employee.Imagen && Buffer.isBuffer(employee.Imagen)) {
            employee.Imagen = employee.Imagen.toString('base64');
        }

        res.json(employee);
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
        const includeInactive = req.query.includeInactive === 'true' ? 1 : 0;

        const result = await pool.request()
            .input('UsuarioId', sql.Int, req.user.usuarioId) // Aplicar filtro universal de seguridad
            .input('IncluirInactivos', sql.Bit, includeInactive)
            .execute('dbo.sp_Empleados_GetAllManagement');

        res.json(result.recordset);
    } catch (err: any) {
        console.error('ERROR EN getEmployees:', err);
        res.status(500).json({ message: err.message || 'Error al obtener empleados.' });
    }
};

export const getEmployeeStats = async (req: any, res: Response) => {
    if (!req.user.permissions['catalogo.empleados.read'] && !req.user.permissions['catalogo.empleados.manage']) {
        return res.status(403).json({ message: 'No tienes permiso.' });
    }
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().execute('dbo.sp_Empleados_GetStats');
        res.json(result.recordset[0]);
    } catch (err: any) {
        res.status(500).json({ message: err.message || 'Error al obtener estadísticas.' });
    }
};

export const getEmployeePhoto = async (req: any, res: Response) => {
    // Both read and manage permissions can view photos
    if (!req.user.permissions['catalogo.empleados.read'] && !req.user.permissions['catalogo.empleados.manage']) {
        return res.status(403).json({ message: 'No tienes permiso.' });
    }
    const { employeeId } = req.params;
    if (!employeeId) return res.status(400).send('El ID del empleado es requerido.');

    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('EmpleadoId', sql.Int, employeeId)
            .query('SELECT Imagen FROM dbo.Empleados WHERE EmpleadoId = @EmpleadoId');

        if (result.recordset.length === 0 || !result.recordset[0].Imagen) {
            return res.status(404).send('Foto no encontrada.');
        }

        const imageBuffer = result.recordset[0].Imagen;
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
        res.send(imageBuffer);
    } catch (err: any) {
        console.error('Error fetching photo:', err);
        res.status(500).send('Error al obtener la foto.');
    }
};

export const createEmployee = async (req: any, res: Response) => {
    if (!req.user.permissions['catalogo.empleados.manage']) {
        return res.status(403).json({ message: 'No tienes permiso para crear empleados.' });
    }
    try {
        const pool = await sql.connect(dbConfig);
        const request = pool.request();

        // New Fields
        request.input('CodRef', sql.NVarChar, req.body.CodRef);
        request.input('Pim', sql.NVarChar, req.body.Pim ? String(req.body.Pim) : null);
        request.input('Nombres', sql.NVarChar, req.body.Nombres);
        request.input('ApellidoPaterno', sql.NVarChar, req.body.ApellidoPaterno);
        request.input('ApellidoMaterno', sql.NVarChar, req.body.ApellidoMaterno || '');
        // NombreCompleto is calculated in SP

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
        request.input('UsuarioId', sql.Int, req.user.usuarioId);

        // Image handling
        if (req.body.Imagen) {
            request.input('Imagen', sql.VarBinary, Buffer.from(req.body.Imagen, 'base64'));
        } else {
            request.input('Imagen', sql.VarBinary, null);
        }

        request.input('Activo', sql.Bit, req.body.Activo ?? true);
        request.input('FechaBaja', sql.Date, req.body.FechaBaja || null);

        // EmpleadoId is OUTPUT for Insert (NULL input, New ID output)
        request.output('EmpleadoId', sql.Int);

        const result = await request.execute('dbo.sp_Empleados_Save');
        res.status(201).json({ message: 'Empleado creado correctamente.', id: result.output.EmpleadoId });
    } catch (err: any) {
        if (err.number === 2627) return res.status(409).json({ message: 'El Código ya existe.' });
        // Custom error from SP
        if (err.message && err.message.includes('El código de referencia ya existe')) {
            return res.status(409).json({ message: err.message });
        }
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
        request.input('Pim', sql.NVarChar, req.body.Pim ? String(req.body.Pim) : null);
        request.input('Nombres', sql.NVarChar, req.body.Nombres);
        request.input('ApellidoPaterno', sql.NVarChar, req.body.ApellidoPaterno);
        request.input('ApellidoMaterno', sql.NVarChar, req.body.ApellidoMaterno || '');
        // NombreCompleto calculated

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
        request.input('UsuarioId', sql.Int, req.user.usuarioId);

        if (req.body.Imagen) {
            request.input('Imagen', sql.VarBinary, Buffer.from(req.body.Imagen, 'base64'));
        } else {
            // Logic for image update: if undefined, often we don't send it to SP if SP supports optional update
            // But our SP updates everything. So we must decide.
            // If the user didn't change image, frontend usually sends nothing or existing?
            // Let's assume passed null = delete, undefined = keep?
            // Actually, for simplicity and safety: if not provided (undefined), pass null (erase) OR verify stored proc logic
            // The SP `UPDATE ... SET Imagen = @Imagen` will erase it if we pass NULL.
            // So if req.body.Imagen is missing, we might be erasing it unintentionally if we are not careful.
            // However, usually detailed forms fetch everything and send everything back.
            // Let's pass NULL if missing for now, mimicking previous behavior logic (sort of).
            // Better: Check if `Imagen` key exists in body. 
            if (req.body.Imagen === null) request.input('Imagen', sql.VarBinary, null);
            // If undefined, do we pass null? Yes, let's stick to safe "send what we have"
        }

        request.input('Activo', sql.Bit, req.body.Activo);
        request.input('FechaBaja', sql.Date, req.body.FechaBaja || null);

        // Pass EmpleadoId as Input for Update. 
        // Note: SP defines it as OUTPUT but accepts input value. 
        // We don't need to read it back for update, so just Input is fine in mssql usually.
        // However, to be safe and match the signature, we can use output with value?
        // Actually, request.input works fine for loading the parameter.

        await request.execute('dbo.sp_Empleados_Save');
        res.json({ message: 'Empleado actualizado correctamente.' });
    } catch (err: any) {
        // Custom error from SP
        if (err.message && err.message.includes('El código de referencia ya existe')) {
            return res.status(409).json({ message: err.message });
        }
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

export const getBirthdays = async (req: Request, res: Response) => {
    try {
        const { months } = req.query;
        if (!months) return res.status(400).json({ message: 'Meses no especificados.' });

        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('Months', sql.NVarChar, months.toString())
            .execute('sp_Empleados_GetBirthdays');

        res.json(result.recordset);
    } catch (err: any) {
        console.error('Error al obtener cumpleaños:', err);
        res.status(500).json({ message: err.message || 'Error del servidor.' });
    }
};

export const getAnniversaries = async (req: Request, res: Response) => {
    try {
        const { months } = req.query;
        if (!months) return res.status(400).json({ message: 'Meses no especificados.' });

        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('Months', sql.NVarChar, months.toString())
            .execute('sp_Empleados_GetAnniversaries');

        res.json(result.recordset);
    } catch (err: any) {
        console.error('Error al obtener aniversarios:', err);
        res.status(500).json({ message: err.message || 'Error del servidor.' });
    }
};

export const getEmployeeCalendarSchedule = async (req: any, res: Response) => {
    const { employeeId } = req.params;
    const { start, end } = req.query;

    if (!employeeId || !start || !end) {
        return res.status(400).json({ message: 'employeeId, start, y end son requeridos.' });
    }

    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('EmpleadoId', sql.Int, employeeId)
            .input('FechaInicio', sql.Date, start as string)
            .input('FechaFin', sql.Date, end as string)
            .execute('dbo.sp_Empleados_GetCalendarioDescansos');

        res.json(result.recordset);
    } catch (err: any) {
        res.status(500).json({ message: err.message || 'Error al obtener descansos del calendario.' });
    }
};

export const getPermittedEmployees = async (req: any, res: Response) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('UsuarioId', sql.Int, req.user.usuarioId)
            .input('IncluirInactivos', sql.Bit, 0)
            .execute('dbo.sp_Empleados_GetAllManagement');
        res.json(result.recordset);
    } catch (err: any) {
        res.status(500).json({ message: err.message || 'Error al obtener empleados permitidos.' });
    }
};

export const getEmployeeSchedulePattern = async (req: any, res: Response) => {
    const { employeeId } = req.params;
    if (!employeeId) return res.status(400).json({ message: 'El ID del empleado es requerido.' });

    try {
        const pool = await sql.connect(dbConfig);

        // 1. Obtener el HorarioIdPredeterminado del empleado
        const empRes = await pool.request()
            .input('EmpleadoId', sql.Int, employeeId)
            .query('SELECT HorarioIdPredeterminado FROM dbo.Empleados WHERE EmpleadoId = @EmpleadoId');

        if (empRes.recordset.length === 0) return res.status(404).json({ message: 'Empleado no encontrado.' });

        const horarioId = empRes.recordset[0].HorarioIdPredeterminado;
        if (!horarioId) return res.json([]); // No tiene horario base

        // 2. Obtener los detalles del horario
        const scheduleRes = await pool.request()
            .input('HorarioId', sql.Int, horarioId)
            .query(`
                SELECT DiaSemana, EsDiaLaboral 
                FROM dbo.CatalogoHorariosDetalle 
                WHERE HorarioId = @HorarioId
            `);

        res.json(scheduleRes.recordset);
    } catch (err: any) {
        res.status(500).json({ message: err.message || 'Error al obtener patrón de horario.' });
    }
};
