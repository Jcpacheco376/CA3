const sql = require('mssql');
require('dotenv').config();

const dbConfig = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'P*V3NT4',
    server: process.env.DB_SERVER || '192.168.0.141',
    database: process.env.DB_DATABASE || 'CA',
    port: 9000,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function fix() {
    try {
        const pool = await sql.connect(dbConfig);
        console.log('Connected');

        await pool.query('SET ANSI_NULLS ON');
        await pool.query('SET QUOTED_IDENTIFIER ON');

        await pool.query(`
CREATE OR ALTER PROCEDURE [dbo].[sp_Incidencias_GetDetalle]
    @IncidenciaId INT
AS
BEGIN
    SET NOCOUNT ON;

    -- RESULTSET 1: HEADER
    SELECT
        i.IncidenciaId, i.EmpleadoId, i.Fecha, i.Estado, i.AsignadoAUsuarioId,
        i.NivelSeveridad AS NivelCriticidad, i.RequiereAutorizacion,
        ISNULL(ea_sys.Abreviatura, 'F') AS EstatusChecadorOriginal,
        ISNULL(ea_man.Abreviatura, '-') AS EstatusManualOriginal,
        (SELECT TOP 1 CEA.Abreviatura
         FROM dbo.FichaAsistencia FA
         LEFT JOIN dbo.CatalogoEstatusAsistencia CEA ON FA.EstatusManualId = CEA.EstatusId
         WHERE FA.EmpleadoId = I.EmpleadoId AND FA.Fecha = I.Fecha) as EstatusManualActual,
        e.NombreCompleto AS Empleado, e.CodRef, d.Nombre AS Departamento,
        u_asig.NombreCompleto AS AsignadoA,
        ISNULL(r_asig.NombreRol, 'Usuario') AS AsignadoARol,
        u_asig.Theme as UsuarioTheme,
        ct.Nombre AS TipoIncidencia,
        (SELECT TOP 1 UsuarioId
         FROM dbo.IncidenciasBitacora
         WHERE IncidenciaId = I.IncidenciaId AND Accion = 'SolicitarAutorizacion'
         ORDER BY FechaMovimiento DESC) as SolicitadoPorUsuarioId
    FROM dbo.Incidencias i
    JOIN dbo.Empleados e ON i.EmpleadoId = e.EmpleadoId
    JOIN dbo.CatalogoTiposIncidencia ct ON i.TipoIncidenciaId = ct.TipoIncidenciaId
    LEFT JOIN dbo.CatalogoEstatusAsistencia ea_sys ON i.EstatusChecadorId = ea_sys.EstatusId
    LEFT JOIN dbo.CatalogoEstatusAsistencia ea_man ON i.EstatusManualId = ea_man.EstatusId
    LEFT JOIN dbo.CatalogoDepartamentos d ON e.DepartamentoId = d.DepartamentoId
    LEFT JOIN dbo.Usuarios u_asig ON i.AsignadoAUsuarioId = u_asig.UsuarioId
    LEFT JOIN dbo.UsuariosRoles ur_asig ON u_asig.UsuarioId = ur_asig.UsuarioId AND ur_asig.EsPrincipal = 1
    LEFT JOIN dbo.Roles r_asig ON ur_asig.RoleId = r_asig.RoleId
    WHERE i.IncidenciaId = @IncidenciaId;

    -- RESULTSET 2: TIMELINE
    SELECT
        b.BitacoraId,
        b.IncidenciaId,
        b.UsuarioId,
        b.FechaMovimiento,
        b.Accion,
        b.Comentario,
        b.EstadoNuevo,
        b.EstatusManualId_Anterior,
        b.EstatusManualId_Nuevo,
        b.EstatusChecadorId_Anterior,
        b.EstatusChecadorId_Nuevo,

        u.NombreCompleto AS UsuarioNombre,
        u_target.NombreCompleto AS AsignadoANombre,
        u.Theme as UsuarioTheme
    FROM dbo.IncidenciasBitacora b
    LEFT JOIN dbo.Usuarios u ON b.UsuarioId = u.UsuarioId
    LEFT JOIN dbo.Usuarios u_target ON b.AsignadoA_Nuevo = u_target.UsuarioId
    WHERE b.IncidenciaId = @IncidenciaId
    ORDER BY b.FechaMovimiento ASC;

    -- RESULTSET 3: AUTORIZACIONES
    SELECT
        ia.AutorizacionId, ia.RolRequeridoId, r.NombreRol as RolRequerido,
        ia.Estatus, ia.FechaRespuesta, u.NombreCompleto as UsuarioNombre,
        (SELECT STUFF((SELECT ', ' + usr.NombreCompleto
                       FROM dbo.Usuarios usr
                       JOIN dbo.UsuariosRoles ur ON usr.UsuarioId = ur.UsuarioId
                       WHERE ur.RoleId = ia.RolRequeridoId AND usr.EstaActivo = 1
                       FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 2, '')) as PosiblesFirmantes
    FROM dbo.IncidenciasAutorizaciones ia
    JOIN dbo.Roles r ON ia.RolRequeridoId = r.RoleId
    LEFT JOIN dbo.Usuarios u ON ia.UsuarioAutorizoId = u.UsuarioId
    WHERE ia.IncidenciaId = @IncidenciaId
        AND ia.Activo = 1;
END
        `);
        console.log('SP sp_Incidencias_GetDetalle fixed.');

        await sql.close();
    } catch (err) {
        console.error('Error during fix:', err.message);
    }
}

fix();
