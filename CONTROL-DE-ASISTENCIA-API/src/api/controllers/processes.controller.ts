import { Request, Response } from 'express';
import sql from 'mssql';
import { poolPromise } from '../../config/database';
import { jobScheduler } from '../services/jobs/JobScheduler';

export const getAllProcesses = async (req: any, res: Response) => {
    // Both manage and read roles might need to see them
    if (!req.user.permissions['procesos.read'] && !req.user.permissions['procesos.manage']) {
        return res.status(403).json({ message: 'No tienes permiso para ver procesos automáticos.' });
    }

    try {
        const pool = await poolPromise;
        const result = await pool.request().execute('sp_CatalogoProcesosAutomaticos_GetAll');
        res.json(result.recordset);
    } catch (err: any) {
        res.status(500).json({ message: err.message || 'Error al obtener procesos.' });
    }
};

export const getProcessHistory = async (req: any, res: Response) => {
    if (!req.user.permissions['procesos.read'] && !req.user.permissions['procesos.manage']) {
        return res.status(403).json({ message: 'No tienes permiso para ver bitácora de procesos.' });
    }

    const { procesoId } = req.params;

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('ProcesoId', sql.Int, procesoId)
            .execute('sp_BitacoraProcesosAutomaticos_GetByProceso');

        res.json(result.recordset);
    } catch (err: any) {
        res.status(500).json({ message: err.message || 'Error al obtener historial del proceso.' });
    }
};

export const updateProcess = async (req: any, res: Response) => {
    if (!req.user.permissions['procesos.manage']) {
        return res.status(403).json({ message: 'No tienes permiso para editar procesos.' });
    }

    const { procesoId } = req.params;
    const { Nombre, KeyInterna, Descripcion, CronExpression, Activo } = req.body;

    try {
        const pool = await poolPromise;
        await pool.request()
            .input('ProcesoId', sql.Int, procesoId)
            .input('Nombre', sql.NVarChar, Nombre)
            .input('KeyInterna', sql.NVarChar, KeyInterna)
            .input('Descripcion', sql.NVarChar, Descripcion)
            .input('CronExpression', sql.NVarChar, CronExpression)
            .input('Activo', sql.Bit, Activo)
            .execute('sp_CatalogoProcesosAutomaticos_Upsert');

        // Recargar los jobs programados usando la nueva configuración
        await jobScheduler.reload();

        res.json({ message: 'Proceso actualizado correctamente.' });
    } catch (err: any) {
        res.status(500).json({ message: err.message || 'Error al actualizar el proceso.' });
    }
};

export const executeProcessManual = async (req: any, res: Response) => {
    if (!req.user.permissions['procesos.manage']) {
        return res.status(403).json({ message: 'No tienes permiso para ejecutar procesos manualmente.' });
    }

    const { keyInterna } = req.body;

    if (!keyInterna) {
        return res.status(400).json({ message: 'La clave interna del proceso (KeyInterna) es requerida.' });
    }

    try {
        // Lanzarlo a correr asincronamente
        // Nota: Aca esta desvinculado de await intencionalmente para no colapsar la respuesta web
        // En el mejor caso se puede await la confirmacion de inicio, o dejar un estado intermedio
        jobScheduler.executeManual(keyInterna).catch(e => {
            console.error('Manual execution failed for', keyInterna, e);
        });

        res.json({ message: `Proceso ${keyInterna} mandado a ejecución manual mediante background.` });
    } catch (err: any) {
        res.status(500).json({ message: err.message || 'Error al intentar arrancar proceso.' });
    }
};
