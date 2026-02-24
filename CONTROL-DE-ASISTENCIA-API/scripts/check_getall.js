const sql = require('mssql');
require('dotenv').config({ path: '../.env' }); // Adjust if needed

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER || 'localhost',
    port: Number(process.env.DB_PORT) || 1433,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true'
    }
};

async function fix() {
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request().query(`
            ALTER PROCEDURE [dbo].[sp_Usuarios_GetAll]
            AS
            BEGIN
                SET NOCOUNT ON;
                
                SELECT 
                    u.UsuarioId,
                    u.NombreUsuario,
                    u.NombreCompleto,
                    u.Email,
                    u.EstaActivo,
                    u.FechaCreacion,
                    u.Theme,
                    u.AnimationsEnabled,
                    u.DebeCambiarPassword,
                    u.EmpleadoId,
                    roles = (
                        SELECT r.NombreRol, r.RoleId, ur.EsPrincipal
                        FROM dbo.UsuariosRoles ur
                        INNER JOIN dbo.Roles r ON ur.RoleId = r.RoleId
                        WHERE ur.UsuarioId = u.UsuarioId
                        FOR JSON PATH
                    ),
                    Departamentos = (
                        SELECT d.DepartamentoId, d.Nombre
                        FROM dbo.UsuariosDepartamentos ud
                        INNER JOIN dbo.CatalogoDepartamentos d ON ud.DepartamentoId = d.DepartamentoId
                        WHERE ud.UsuarioId = u.UsuarioId
                        FOR JSON PATH
                    ),
                    GruposNomina = (
                        SELECT gn.GrupoNominaId, gn.Nombre, gn.Periodo
                        FROM dbo.UsuariosGruposNomina ugn
                        INNER JOIN dbo.CatalogoGruposNomina gn ON ugn.GrupoNominaId = gn.GrupoNominaId
                        WHERE ugn.UsuarioId = u.UsuarioId
                        FOR JSON PATH
                    ),
                    Puestos = (
                        SELECT p.PuestoId, p.Nombre
                        FROM dbo.UsuariosPuestos up
                        INNER JOIN dbo.CatalogoPuestos p ON up.PuestoId = p.PuestoId
                        WHERE up.UsuarioId = u.UsuarioId
                        FOR JSON PATH
                    ),
                    Establecimientos = (
                        SELECT e.EstablecimientoId, e.Nombre
                        FROM dbo.UsuariosEstablecimientos ue
                        INNER JOIN dbo.CatalogoEstablecimientos e ON ue.EstablecimientoId = e.EstablecimientoId
                        WHERE ue.UsuarioId = u.UsuarioId
                        FOR JSON PATH
                    )
                FROM dbo.Usuarios u;
            END
        `);
        console.log("Fixed sp_Usuarios_GetAll 2");
        await sql.close();
    } catch (err) {
        console.error('Error: ', err);
    }
}

fix();
