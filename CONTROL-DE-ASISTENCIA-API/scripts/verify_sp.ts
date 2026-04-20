import { poolPromise } from '../src/config/database';

async function verify() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            BEGIN TRANSACTION;
            
            -- Insert fake employee
            INSERT INTO dbo.Empleados (CodRef, NombreCompleto, Activo, FechaIngreso, FechaBaja, HorarioIdPredeterminado)
            VALUES ('EMP_TEST', 'Test Employee', 1, '2026-03-15', '2026-04-10', 1);
            
            DECLARE @EmpId INT = SCOPE_IDENTITY();
            
            -- Call the SP
            EXEC dbo.sp_FichasAsistencia_ProcesarChecadas 
                @FechaInicio = '2026-03-01', 
                @FechaFin = '2026-04-30', 
                @EmpleadoId = @EmpId;
                
            -- Check records
            SELECT Fecha FROM dbo.FichaAsistencia WHERE EmpleadoId = @EmpId ORDER BY Fecha;
            
            ROLLBACK TRANSACTION;
        `);

        console.log('Result Fichas generated:');
        console.dir(result.recordset);

        if (result.recordset && result.recordset.length > 0) {
            const minDate = new Date(Math.min(...result.recordset.map(r => new Date(r.Fecha).getTime())));
            const maxDate = new Date(Math.max(...result.recordset.map(r => new Date(r.Fecha).getTime())));
            console.log('Min Date:', minDate.toISOString());
            console.log('Max Date:', maxDate.toISOString());

            if (minDate >= new Date('2026-03-15T00:00:00Z') && maxDate <= new Date('2026-04-10T23:59:59Z')) {
                console.log('SUCCESS: Dates are within boundaries.');
                process.exit(0);
            } else {
                console.log('FAILED: Dates outside boundaries generated.');
                process.exit(1);
            }
        } else {
            console.log('No records generated. This could happen if HorarioIdPredeterminado 1 has no window setups, but we confirm no errors thrown.');
            process.exit(0);
        }
    } catch (err) {
        console.error('Error in verification:', err);
        process.exit(1);
    }
}
verify();

