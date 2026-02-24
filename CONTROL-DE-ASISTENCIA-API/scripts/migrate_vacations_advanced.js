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

async function migrate() {
    try {
        const pool = await sql.connect(dbConfig);
        console.log('Connected to DB');

        // 1. Crear tabla CatalogoReglasVacaciones
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[CatalogoReglasVacaciones]') AND type in (N'U'))
            BEGIN
                CREATE TABLE [dbo].[CatalogoReglasVacaciones](
                    [ReglaId] [int] IDENTITY(1,1) NOT NULL,
                    [Esquema] [varchar](50) NOT NULL, -- 'Pre-2023' o 'Ley-2023'
                    [AniosAntiguedad] [int] NOT NULL,
                    [DiasOtorgados] [int] NOT NULL,
                    CONSTRAINT [PK_CatalogoReglasVacaciones] PRIMARY KEY CLUSTERED ([ReglaId] ASC)
                )
                
                -- Poblar tabla con datos de Ley Federal del Trabajo MX
                -- Esquema Ley antigua (Pre 2023)
                INSERT INTO CatalogoReglasVacaciones (Esquema, AniosAntiguedad, DiasOtorgados) VALUES
                ('Pre-2023', 1, 6), ('Pre-2023', 2, 8), ('Pre-2023', 3, 10), ('Pre-2023', 4, 12),
                ('Pre-2023', 5, 14), ('Pre-2023', 6, 14), ('Pre-2023', 7, 14), ('Pre-2023', 8, 14), ('Pre-2023', 9, 14),
                ('Pre-2023', 10, 16), ('Pre-2023', 11, 16), ('Pre-2023', 12, 16), ('Pre-2023', 13, 16), ('Pre-2023', 14, 16),
                ('Pre-2023', 15, 18), ('Pre-2023', 16, 18), ('Pre-2023', 17, 18), ('Pre-2023', 18, 18), ('Pre-2023', 19, 18),
                ('Pre-2023', 20, 20), ('Pre-2023', 21, 20), ('Pre-2023', 22, 20), ('Pre-2023', 23, 20), ('Pre-2023', 24, 20),
                ('Pre-2023', 25, 22), ('Pre-2023', 26, 22), ('Pre-2023', 27, 22), ('Pre-2023', 28, 22), ('Pre-2023', 29, 22),
                ('Pre-2023', 30, 24);

                -- Esquema Vacaciones Dignas (2023+)
                INSERT INTO CatalogoReglasVacaciones (Esquema, AniosAntiguedad, DiasOtorgados) VALUES
                ('Ley-2023', 1, 12), ('Ley-2023', 2, 14), ('Ley-2023', 3, 16), ('Ley-2023', 4, 18), ('Ley-2023', 5, 20),
                ('Ley-2023', 6, 22), ('Ley-2023', 7, 22), ('Ley-2023', 8, 22), ('Ley-2023', 9, 22), ('Ley-2023', 10, 22),
                ('Ley-2023', 11, 24), ('Ley-2023', 12, 24), ('Ley-2023', 13, 24), ('Ley-2023', 14, 24), ('Ley-2023', 15, 24),
                ('Ley-2023', 16, 26), ('Ley-2023', 17, 26), ('Ley-2023', 18, 26), ('Ley-2023', 19, 26), ('Ley-2023', 20, 26),
                ('Ley-2023', 21, 28), ('Ley-2023', 22, 28), ('Ley-2023', 23, 28), ('Ley-2023', 24, 28), ('Ley-2023', 25, 28),
                ('Ley-2023', 26, 30), ('Ley-2023', 27, 30), ('Ley-2023', 28, 30), ('Ley-2023', 29, 30), ('Ley-2023', 30, 30),
                ('Ley-2023', 31, 32), ('Ley-2023', 32, 32), ('Ley-2023', 33, 32), ('Ley-2023', 34, 32), ('Ley-2023', 35, 32);
            END
        `);
        console.log('Tabla CatalogoReglasVacaciones verificada/creada');

        // 2. Crear tabla VacacionesAprobadoresConfig
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[VacacionesAprobadoresConfig]') AND type in (N'U'))
            BEGIN
                CREATE TABLE [dbo].[VacacionesAprobadoresConfig](
                    [ConfigId] [int] IDENTITY(1,1) NOT NULL,
                    [Orden] [int] NOT NULL,
                    [RolAprobador] [varchar](50) NOT NULL, -- e.g., 'JefeDirecto', 'RecursosHumanos', 'Gerencia'
                    [EsObligatorio] [bit] DEFAULT 1,
                    CONSTRAINT [PK_VacacionesAprobadoresConfig] PRIMARY KEY CLUSTERED ([ConfigId] ASC)
                )

                -- Insert default approvals structure
                INSERT INTO VacacionesAprobadoresConfig (Orden, RolAprobador, EsObligatorio) VALUES
                (1, 'JefeDirecto', 1),
                (2, 'RecursosHumanos', 1),
                (3, 'Gerencia', 1);
            END
        `);
        console.log('Tabla VacacionesAprobadoresConfig verificada/creada');

        // 3. Crear tabla SolicitudesVacacionesFirmas para rastrear multi-firmas por cada solicitud
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[SolicitudesVacacionesFirmas]') AND type in (N'U'))
            BEGIN
                CREATE TABLE [dbo].[SolicitudesVacacionesFirmas](
                    [FirmaId] [int] IDENTITY(1,1) NOT NULL,
                    [SolicitudId] [int] NOT NULL,
                    [ConfigId] [int] NOT NULL, -- Que rol aprueba
                    [EstatusFirma] [varchar](20) DEFAULT 'Pendiente', -- 'Pendiente', 'Aprobado', 'Rechazado'
                    [UsuarioFirmaId] [int] NULL, -- Quien firmó
                    [FechaFirma] [datetime] NULL,
                    [Comentarios] [nvarchar](250) NULL,
                    CONSTRAINT [PK_SolicitudesVacacionesFirmas] PRIMARY KEY CLUSTERED ([FirmaId] ASC),
                    CONSTRAINT [FK_SolicitudesVacacionesFirmas_Solicitud] FOREIGN KEY([SolicitudId]) REFERENCES [dbo].[SolicitudesVacaciones] ([SolicitudId]),
                    CONSTRAINT [FK_SolicitudesVacacionesFirmas_Config] FOREIGN KEY([ConfigId]) REFERENCES [dbo].[VacacionesAprobadoresConfig] ([ConfigId])
                )
            END
        `);
        console.log('Tabla SolicitudesVacacionesFirmas verificada/creada');


        // 4. Modificar SolicitudesVacaciones para agregar UsuarioSolicitanteId (para distinguir entre el empleado q toma las vacaciones vs el que las pide "A nombre de")
        try {
            await pool.request().query(`
                IF COL_LENGTH('dbo.SolicitudesVacaciones', 'UsuarioSolicitanteId') IS NULL
                BEGIN
                    ALTER TABLE [dbo].[SolicitudesVacaciones] ADD [UsuarioSolicitanteId] [int] NULL;
                END
            `);
            console.log('Columna UsuarioSolicitanteId añadida a SolicitudesVacaciones');
        } catch (e) {
            console.log('Columna UsuarioSolicitanteId ya existe o hubo error: ', e.message);
        }

        console.log('Migracion Base de Datos completada exitosamente.');
        await sql.close();
    } catch (err) {
        console.error('Error en migracion: ', err);
    }
}

migrate();
