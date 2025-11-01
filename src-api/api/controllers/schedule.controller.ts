import { Request, Response } from 'express';
import sql from 'mssql';
import { dbConfig } from '../../config/database';
// No necesitas importar 'Console'

// getSchedules se mantiene igual...
export const getSchedules = async (req: any, res: Response) => {
    if (!req.user.permissions['horarios.read']) return res.status(403).json({ message: 'Acceso denegado.' });
    try {
        const pool = await sql.connect(dbConfig);
        // Asegúrate que llamas al SP correcto que devuelve los detalles/turnos
        const result = await pool.request().execute('sp_Horarios_GetAll'); // Este SP devuelve los Turnos JSON
        
        // Parsear el JSON de Turnos devuelto por el SP modificado
        const horarios = result.recordset.map(h => ({
            ...h,
            Turnos: h.Turnos ? JSON.parse(h.Turnos) : [] 
        }));

        res.json(horarios);

    } catch (err: any) { res.status(500).json({ message: 'Error al obtener catálogo de horarios.', error: err.message }); }
};

// getScheduleAssignments se mantiene igual...
export const getScheduleAssignments = async (req: any, res: Response) => {
    if (!req.user.permissions['horarios.read']) return res.status(403).json({ message: 'Acceso denegado.' });
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ message: 'Se requieren fechas de inicio y fin.' });
    console.log("Recibiendo petición para Rango:", startDate, "a", endDate, "Usuario:", req.user.usuarioId); // Log mejorado
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('UsuarioId', sql.Int, req.user.usuarioId)
            .input('FechaInicio', sql.Date, startDate as string)
            .input('FechaFin', sql.Date, endDate as string)
            .execute('sp_HorariosTemporales_GetByPeriodo'); // Este SP ya está modificado

        // Parsear el JSON solo si existe
        const processedResults = result.recordset.map(emp => ({
            ...emp,
            // Asegurarse que HorariosAsignados no es null o undefined antes de parsear
            HorariosAsignados: emp.HorariosAsignados ? JSON.parse(emp.HorariosAsignados) : []
        }));

        res.json(processedResults);
    } catch (err: any) {
        console.error("Error en getScheduleAssignments:", err); // Log del error
        res.status(500).json({ message: err.message || 'Error al obtener los datos.' });
     }
};


// saveScheduleAssignments CORREGIDO (eliminado .rolledBack)
export const saveScheduleAssignments = async (req: any, res: Response) => {
    if (!req.user.permissions['horarios.assign']) return res.status(403).json({ message: 'Acceso denegado.' });

    // El body ahora es un array de objetos con la nueva estructura
    const assignments: {
        empleadoId: number,
        fecha: string | Date, // Puede venir como string 'yyyy-MM-dd' o Date
        tipoAsignacion: 'H' | 'T' | 'D' | null,
        horarioId?: number | null,
        detalleId?: number | null
    }[] = req.body;

    if (!Array.isArray(assignments)) {
        return res.status(400).json({ message: 'Se esperaba un arreglo de asignaciones.' });
    }

    // Filtrar asignaciones inválidas (por si acaso)
    const validAssignments = assignments.filter(a => a.empleadoId && a.fecha);
    if (validAssignments.length === 0) {
        return res.status(400).json({ message: 'No hay asignaciones válidas para procesar.' });
    }

    let pool: sql.ConnectionPool | null = null; // Definir pool fuera del try para usarlo en finally
    let transaction: sql.Transaction | null = null; // Definir transaction fuera del try

    try {
        pool = await sql.connect(dbConfig);
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        console.log(`Iniciando transacción para ${validAssignments.length} asignaciones.`); // Log

        // Usar un bucle for...of con await
        for (const assignment of validAssignments) {
            const { empleadoId, fecha, tipoAsignacion, horarioId, detalleId } = assignment;

             // Log detallado de cada asignación
             console.log(`Procesando: Empleado ${empleadoId}, Fecha ${fecha}, Tipo ${tipoAsignacion}, HorarioId ${horarioId}, DetalleId ${detalleId}`);

            // Crear una NUEVA request DENTRO del bucle para cada llamada
            const request = new sql.Request(transaction);

            // Añadir inputs al SP modificado 'sp_HorariosTemporales_Upsert'
            request.input('EmpleadoId', sql.Int, empleadoId);
            // Asegurarse de que la fecha se pasa correctamente como DATE
            request.input('Fecha', sql.Date, new Date(fecha));
            request.input('SupervisorId', sql.Int, req.user.usuarioId);
            // El tipo NULL borrará la asignación
            request.input('TipoAsignacion', sql.Char(1), tipoAsignacion);
            // Pasar NULL si no aplica
            request.input('HorarioId', sql.Int, tipoAsignacion === 'H' ? horarioId : null);
            request.input('HorarioDetalleId', sql.Int, tipoAsignacion === 'T' ? detalleId : null);

            // Ejecutar el SP y esperar a que termine ANTES de continuar el bucle
            await request.execute('sp_HorariosTemporales_Upsert');
             console.log(` -> Completado: Empleado ${empleadoId}, Fecha ${fecha}`); // Log
        }

        console.log("Todas las operaciones completadas, haciendo commit..."); // Log
        await transaction.commit();
        console.log("Commit exitoso."); // Log
        res.status(200).json({ message: 'Asignaciones guardadas correctamente.' });

    } catch (err: any) {
        console.error('Error durante la transacción:', err); // Log del error
        // Intentar rollback solo si la transacción existe
        // ¡FIX! Se elimina la comprobación de '.rolledBack'
        if (transaction) {
             console.log("Intentando rollback..."); // Log
            try {
                await transaction.rollback();
                console.log("Rollback exitoso."); // Log
            } catch (rollbackErr: any) {
                // Loguear el error de rollback, pero devolver el error original
                console.error('Error durante el rollback:', rollbackErr);
            }
        }
        res.status(500).json({ message: err.message || 'Error al guardar las asignaciones.' });
    } finally {
         // Asegurarse de cerrar la conexión si se abrió
         if (pool && pool.connected) {
            try {
                await pool.close();
                console.log("Conexión cerrada."); // Log
            } catch (closeErr) {
                console.error("Error al cerrar la conexión:", closeErr);
            }
        }
    }
};

