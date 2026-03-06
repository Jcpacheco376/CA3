
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

async function runMigration() {
    try {
        console.log('Connecting to database...');
        const pool = await sql.connect(dbConfig);
        console.log('Connected.');

        // 1. Add Columns to Empleados
        console.log('Checking/Adding Name Columns...');
        await pool.query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Empleados' AND COLUMN_NAME = 'Nombres')
            BEGIN
                ALTER TABLE Empleados ADD Nombres NVARCHAR(100) NULL;
                ALTER TABLE Empleados ADD ApellidoPaterno NVARCHAR(100) NULL;
                ALTER TABLE Empleados ADD ApellidoMaterno NVARCHAR(100) NULL;
                PRINT 'Columns Nombres, ApellidoPaterno, ApellidoMaterno added.';
            END
        `);

        // 2. Add Configuration for Name Format
        console.log('Checking/Adding FormatoNombre Configuration...');
        // Check if column exists in SISConfiguracion, if not add it (assuming it's a single row table or has a key)
        // Based on previous knowledge, it seems to be a single row table.
        // Let's check columns first to be safe, or just try to update/insert.
        // Strategy: Add 'FormatoNombre' Int column if not exists.
        await pool.query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'SISConfiguracion' AND COLUMN_NAME = 'FormatoNombre')
            BEGIN
                ALTER TABLE SISConfiguracion ADD FormatoNombre INT DEFAULT 1; 
                PRINT 'Column FormatoNombre added to SISConfiguracion.';
            END
        `);
        // Ensure default value is set
        await pool.query(`UPDATE SISConfiguracion SET FormatoNombre = 1 WHERE FormatoNombre IS NULL`);


        // 3. Migrate Existing Data (The hard part)
        console.log('Migrating existing names...');
        const employees = await pool.query('SELECT EmpleadoId, NombreCompleto FROM Empleados WHERE Nombres IS NULL');

        for (const emp of employees.recordset) {
            const fullName = emp.NombreCompleto || '';
            const parts = fullName.trim().split(/\s+/);
            let nombres = '', paterno = '', materno = '';

            if (parts.length === 1) {
                nombres = parts[0];
            } else if (parts.length === 2) {
                // Assuming "Name Surname" 
                nombres = parts[0];
                paterno = parts[1];
            } else if (parts.length === 3) {
                // Assuming "Name P M" or "Name Name P" ? 
                // Classic dilemma. Let's assume "Name Paterno Materno" for 3 parts as it's common in list display? 
                // OR "Nombres Apellidos"? 
                // Given the user asked for this, the previous data is likely "Nombre Completo" mixed.
                // Strategy: First token is Name, Last two are Surnames? 
                // Better Strategy for legacy: 
                // If 3 parts: First = Name, Second = Paterno, Third = Materno
                nombres = parts[0];
                paterno = parts[1];
                materno = parts[2];
            } else {
                // > 3 parts. e.g. "Juan Carlos Perez Lopez"
                // Assume last two are surnames, rest are names.
                materno = parts[parts.length - 1];
                paterno = parts[parts.length - 2];
                nombres = parts.slice(0, parts.length - 2).join(' ');
            }

            await pool.request()
                .input('Id', sql.Int, emp.EmpleadoId)
                .input('N', sql.NVarChar, nombres)
                .input('P', sql.NVarChar, paterno)
                .input('M', sql.NVarChar, materno)
                .query('UPDATE Empleados SET Nombres=@N, ApellidoPaterno=@P, ApellidoMaterno=@M WHERE EmpleadoId=@Id');
        }
        console.log(`Migrated ${employees.recordset.length} employees.`);


        // 4. Update Stored Procedures
        console.log('Updating Stored Procedures...');

        // sp_Empleados_Insert
        await pool.query(`
            CREATE OR ALTER PROCEDURE [dbo].[sp_Empleados_Insert]
                @CodRef NVARCHAR(50),
                @Pim NVARCHAR(50) = NULL,
                @Nombres NVARCHAR(100),
                @ApellidoPaterno NVARCHAR(100),
                @ApellidoMaterno NVARCHAR(100),
                @FechaNacimiento DATE,
                @FechaIngreso DATE,
                @DepartamentoId INT,
                @PuestoId INT,
                @HorarioIdPredeterminado INT,
                @GrupoNominaId INT,
                @EstablecimientoId INT,
                @Sexo CHAR(1),
                @NSS NVARCHAR(20),
                @CURP NVARCHAR(20),
                @RFC NVARCHAR(20),
                @Imagen VARBINARY(MAX),
                @UsuarioId INT,
                @NewId INT OUTPUT
            AS
            BEGIN
                SET NOCOUNT ON;

                -- Calculate NombreCompleto based on Config
                DECLARE @FormatoNombre INT;
                SELECT TOP 1 @FormatoNombre = ISNULL(FormatoNombre, 1) FROM SISConfiguracion;
                
                DECLARE @NombreCompleto NVARCHAR(300);
                IF @FormatoNombre = 2 -- Apellidos Nombres
                    SET @NombreCompleto = TRIM(@ApellidoPaterno + ' ' + ISNULL(@ApellidoMaterno, '') + ' ' + @Nombres);
                ELSE -- Nombres Apellidos (Default)
                    SET @NombreCompleto = TRIM(@Nombres + ' ' + @ApellidoPaterno + ' ' + ISNULL(@ApellidoMaterno, ''));

                INSERT INTO Empleados (
                    CodRef, Pim, Nombres, ApellidoPaterno, ApellidoMaterno, NombreCompleto,
                    FechaNacimiento, FechaIngreso, DepartamentoId, PuestoId, HorarioIdPredeterminado,
                    GrupoNominaId, EstablecimientoId, Sexo, NSS, CURP, RFC, Imagen, Activo
                ) VALUES (
                    @CodRef, @Pim, @Nombres, @ApellidoPaterno, @ApellidoMaterno, @NombreCompleto,
                    @FechaNacimiento, @FechaIngreso, @DepartamentoId, @PuestoId, @HorarioIdPredeterminado,
                    @GrupoNominaId, @EstablecimientoId, @Sexo, @NSS, @CURP, @RFC, @Imagen, 1
                );

                SET @NewId = SCOPE_IDENTITY();
            END
        `);

        // sp_Empleados_Update
        await pool.query(`
            CREATE OR ALTER PROCEDURE [dbo].[sp_Empleados_Update]
                @EmpleadoId INT,
                @CodRef NVARCHAR(50),
                @Pim NVARCHAR(50) = NULL,
                @Nombres NVARCHAR(100),
                @ApellidoPaterno NVARCHAR(100),
                @ApellidoMaterno NVARCHAR(100),
                @FechaNacimiento DATE,
                @FechaIngreso DATE,
                @DepartamentoId INT,
                @PuestoId INT,
                @HorarioIdPredeterminado INT,
                @GrupoNominaId INT,
                @EstablecimientoId INT,
                @Sexo CHAR(1),
                @NSS NVARCHAR(20),
                @CURP NVARCHAR(20),
                @RFC NVARCHAR(20),
                @Imagen VARBINARY(MAX),
                @Activo BIT,
                @UsuarioId INT
            AS
            BEGIN
                SET NOCOUNT ON;

                DECLARE @FormatoNombre INT;
                SELECT TOP 1 @FormatoNombre = ISNULL(FormatoNombre, 1) FROM SISConfiguracion;
                
                DECLARE @NombreCompleto NVARCHAR(300);
                IF @FormatoNombre = 2
                    SET @NombreCompleto = TRIM(@ApellidoPaterno + ' ' + ISNULL(@ApellidoMaterno, '') + ' ' + @Nombres);
                ELSE
                    SET @NombreCompleto = TRIM(@Nombres + ' ' + @ApellidoPaterno + ' ' + ISNULL(@ApellidoMaterno, ''));

                UPDATE Empleados SET 
                    CodRef = @CodRef,
                    Pim = @Pim,
                    Nombres = @Nombres,
                    ApellidoPaterno = @ApellidoPaterno,
                    ApellidoMaterno = @ApellidoMaterno,
                    NombreCompleto = @NombreCompleto,
                    FechaNacimiento = @FechaNacimiento,
                    FechaIngreso = @FechaIngreso,
                    DepartamentoId = @DepartamentoId,
                    PuestoId = @PuestoId,
                    HorarioIdPredeterminado = @HorarioIdPredeterminado,
                    GrupoNominaId = @GrupoNominaId,
                    EstablecimientoId = @EstablecimientoId,
                    Sexo = @Sexo,
                    NSS = @NSS,
                    CURP = @CURP,
                    RFC = @RFC,
                    Imagen = @Imagen,
                    Activo = @Activo
                WHERE EmpleadoId = @EmpleadoId;
            END
        `);

        // sp_Empleados_GetAll (Update to return new fields)
        await pool.query(`
            CREATE OR ALTER PROCEDURE [dbo].[sp_Empleados_GetAll]
                @IncluirInactivos BIT = 0
            AS
            BEGIN
                SET NOCOUNT ON;
                SELECT 
                    e.EmpleadoId, e.CodRef, e.Pim, 
                    e.Nombres, e.ApellidoPaterno, e.ApellidoMaterno, e.NombreCompleto,
                    e.DepartamentoId, e.PuestoId, e.Activo, e.Imagen,
                    e.HorarioIdPredeterminado,
                    
                    d.Nombre AS DepartamentoNombre,
                    p.Nombre AS PuestoNombre,
                    h.Nombre AS HorarioNombre,
                    h.EsRotativo,
                    
                    (
                        SELECT z.Nombre
                        FROM EmpleadosZonas ez
                        INNER JOIN Zonas z ON ez.ZonaId = z.ZonaId
                        WHERE ez.EmpleadoId = e.EmpleadoId
                        FOR JSON PATH
                    ) AS Zonas,
                    
                    (SELECT COUNT(*) FROM EmpleadosZonas ez WHERE ez.EmpleadoId = e.EmpleadoId) as ZonasCount

                FROM Empleados e
                LEFT JOIN CatalogoDepartamentos d ON e.DepartamentoId = d.DepartamentoId
                LEFT JOIN CatalogoPuestos p ON e.PuestoId = p.PuestoId
                LEFT JOIN CatalogoHorarios h ON e.HorarioIdPredeterminado = h.HorarioId
                
                WHERE (@IncluirInactivos = 1 OR e.Activo = 1)

                ORDER BY e.NombreCompleto;
            END
        `);

        // sp_Empleados_GetDatos (For single employee fetch)
        await pool.query(`
            CREATE OR ALTER PROCEDURE [dbo].[sp_Empleados_GetDatos]
                @EmpleadoId INT
            AS
            BEGIN
                SET NOCOUNT ON;
                SELECT 
                    e.EmpleadoId, e.CodRef, e.Pim,
                    e.Nombres, e.ApellidoPaterno, e.ApellidoMaterno, e.NombreCompleto,
                    e.FechaNacimiento, e.FechaIngreso,
                    e.DepartamentoId, e.PuestoId, e.HorarioIdPredeterminado,
                    e.GrupoNominaId, e.EstablecimientoId,
                    e.Sexo, e.NSS, e.CURP, e.RFC, e.Activo, e.Imagen,

                    -- return zones IDs as simple list
                    (SELECT Ez.ZonaId FROM EmpleadosZonas Ez WHERE Ez.EmpleadoId = e.EmpleadoId FOR JSON PATH) AS Zonas

                FROM Empleados e
                WHERE e.EmpleadoId = @EmpleadoId;
            END
        `);

        console.log('Database Name Refactor Completed Successfully.');
        process.exit(0);

    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

runMigration();
