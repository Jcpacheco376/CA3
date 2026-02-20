
const sql = require('mssql');
require('dotenv').config();

const dbConfig = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'P*V3NT4', // Updated from .env
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

        // 1. Add Pim column if not exists
        console.log('Checking Pim column...');
        await pool.query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Empleados' AND COLUMN_NAME = 'Pim')
            BEGIN
                ALTER TABLE Empleados ADD Pim NVARCHAR(50) NULL;
                PRINT 'Columna Pim agregada.';
            END
            ELSE
            BEGIN
                PRINT 'Columna Pim ya existe.';
            END
        `);

        // 2. Update sp_Empleados_Insert
        console.log('Updating sp_Empleados_Insert...');
        await pool.query(`
            ALTER PROCEDURE [dbo].[sp_Empleados_Insert]
                @CodRef NVARCHAR(50),
                @NombreCompleto NVARCHAR(150),
                @FechaNacimiento DATE = NULL,
                @FechaIngreso DATE = NULL,
                @DepartamentoId INT = NULL,
                @GrupoNominaId INT = NULL,
                @PuestoId INT = NULL,
                @HorarioIdPredeterminado INT = NULL,
                @EstablecimientoId INT = NULL,
                @Sexo NCHAR(1) = 'M',
                @NSS NVARCHAR(20) = NULL,
                @CURP NVARCHAR(20) = NULL,
                @RFC NVARCHAR(20) = NULL,
                @Imagen VARBINARY(MAX) = NULL,
                @Activo BIT = 1,
                @Zonas NVARCHAR(MAX) = NULL,
                @Pim NVARCHAR(50) = NULL -- NEW PARAM
            AS
            BEGIN
                SET NOCOUNT ON;

                -- If Pim is not provided, default to CodRef (optional fallback, mostly for transition)
                -- IF @Pim IS NULL SET @Pim = @CodRef; 
                -- Better keep it null if not provided to respect user intent, or handle in app logic.
                -- User request: "busco que este sea el pim para sincronizar con el checador, actualmente uso CodRef"
                -- we will let the app logic decide defaults.

                INSERT INTO Empleados (
                    CodRef, NombreCompleto, FechaNacimiento, FechaIngreso, 
                    DepartamentoId, GrupoNominaId, PuestoId, 
                    HorarioIdPredeterminado, EstablecimientoId, 
                    Sexo, NSS, CURP, RFC, Imagen, Activo, Pim
                )
                VALUES (
                    @CodRef, @NombreCompleto, @FechaNacimiento, @FechaIngreso,
                    @DepartamentoId, @GrupoNominaId, @PuestoId,
                    @HorarioIdPredeterminado, @EstablecimientoId,
                    @Sexo, @NSS, @CURP, @RFC, @Imagen, @Activo, @Pim
                );

                DECLARE @NewId INT = SCOPE_IDENTITY();

                -- Insert Zonas if provided
                IF @Zonas IS NOT NULL
                BEGIN
                    INSERT INTO EmpleadosZonas (EmpleadoId, ZonaId)
                    SELECT @NewId, [value]
                    FROM OPENJSON(@Zonas) WITH ([value] INT '$');
                END

                SELECT @NewId AS EmpleadoId;
            END
        `);

        // 3. Update sp_Empleados_Update
        console.log('Updating sp_Empleados_Update...');
        await pool.query(`
            ALTER PROCEDURE [dbo].[sp_Empleados_Update]
                @EmpleadoId INT,
                @CodRef NVARCHAR(50),
                @NombreCompleto NVARCHAR(150),
                @FechaNacimiento DATE = NULL,
                @FechaIngreso DATE = NULL,
                @DepartamentoId INT = NULL,
                @GrupoNominaId INT = NULL,
                @PuestoId INT = NULL,
                @HorarioIdPredeterminado INT = NULL,
                @EstablecimientoId INT = NULL,
                @Sexo NCHAR(1) = 'M',
                @NSS NVARCHAR(20) = NULL,
                @CURP NVARCHAR(20) = NULL,
                @RFC NVARCHAR(20) = NULL,
                @Imagen VARBINARY(MAX) = NULL,
                @Activo BIT = 1,
                @Zonas NVARCHAR(MAX) = NULL,
                @Pim NVARCHAR(50) = NULL -- NEW PARAM
            AS
            BEGIN
                SET NOCOUNT ON;

                UPDATE Empleados
                SET 
                    CodRef = @CodRef,
                    NombreCompleto = @NombreCompleto,
                    FechaNacimiento = @FechaNacimiento,
                    FechaIngreso = @FechaIngreso,
                    DepartamentoId = @DepartamentoId,
                    GrupoNominaId = @GrupoNominaId,
                    PuestoId = @PuestoId,
                    HorarioIdPredeterminado = @HorarioIdPredeterminado,
                    EstablecimientoId = @EstablecimientoId,
                    Sexo = @Sexo,
                    NSS = @NSS,
                    CURP = @CURP,
                    RFC = @RFC,
                    Activo = @Activo,
                    Pim = @Pim -- UPDATE PIM
                WHERE EmpleadoId = @EmpleadoId;

                -- Update Image only if provided (not null)
                IF @Imagen IS NOT NULL
                BEGIN
                    UPDATE Empleados SET Imagen = @Imagen WHERE EmpleadoId = @EmpleadoId;
                END

                -- Update Zonas
                IF @Zonas IS NOT NULL
                BEGIN
                    DELETE FROM EmpleadosZonas WHERE EmpleadoId = @EmpleadoId;
                    
                    INSERT INTO EmpleadosZonas (EmpleadoId, ZonaId)
                    SELECT @EmpleadoId, [value]
                    FROM OPENJSON(@Zonas) WITH ([value] INT '$');
                    
                    -- Handle Object array format if passed as [{"ZonaId":1},...]
                    IF @@ROWCOUNT = 0
                    BEGIN
                         INSERT INTO EmpleadosZonas (EmpleadoId, ZonaId)
                         SELECT @EmpleadoId, [ZonaId]
                         FROM OPENJSON(@Zonas) WITH (ZonaId INT '$.ZonaId');
                    END
                END
            END
        `);

        // 4. Update sp_Empleados_GetDatos
        console.log('Updating sp_Empleados_GetDatos...');
        await pool.query(`
            ALTER PROCEDURE [dbo].[sp_Empleados_GetDatos]
                @EmpleadoId INT
            AS
            BEGIN
                SET NOCOUNT ON;
                
                SELECT 
                    e.*,
                    (
                        SELECT z.ZonaId, z.Nombre
                        FROM EmpleadosZonas ez
                        INNER JOIN Zonas z ON ez.ZonaId = z.ZonaId
                        WHERE ez.EmpleadoId = e.EmpleadoId
                        FOR JSON PATH
                    ) AS Zonas
                FROM Empleados e
                WHERE e.EmpleadoId = @EmpleadoId;
            END
        `);

        // 5. Update sp_Empleados_GetAll
        console.log('Updating sp_Empleados_GetAll...');
        await pool.query(`
            ALTER PROCEDURE [dbo].[sp_Empleados_GetAll]
            AS
            BEGIN
                SET NOCOUNT ON;
                SELECT 
                    e.EmpleadoId, e.CodRef, e.Pim, e.NombreCompleto, e.DepartamentoId, e.PuestoId, e.Activo, e.Imagen,
                    d.Nombre AS Departamento,
                    p.Nombre AS Puesto,
                    (SELECT COUNT(*) FROM EmpleadosZonas ez WHERE ez.EmpleadoId = e.EmpleadoId) as ZonasCount
                FROM Empleados e
                LEFT JOIN CatalogoDepartamentos d ON e.DepartamentoId = d.DepartamentoId
                LEFT JOIN CatalogoPuestos p ON e.PuestoId = p.PuestoId
                ORDER BY e.NombreCompleto;
            END
        `);

        console.log('Migration completed successfully.');
        process.exit(0);

    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

runMigration();
