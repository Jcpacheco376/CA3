const sql = require('mssql');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER || '',
    port: Number(process.env.DB_PORT) || 1433,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true'
    }
};

const spSql = `
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_Empleados_GetAnniversaries]') AND type in (N'P', N'PC'))
DROP PROCEDURE [dbo].[sp_Empleados_GetAnniversaries]
`;

const createSpSql = `
CREATE PROCEDURE [dbo].[sp_Empleados_GetAnniversaries]
    @Months NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        EmpleadoId,
        Nombres,
        ApellidoPaterno,
        ApellidoMaterno,
        FechaIngreso,
        DAY(FechaIngreso) AS DiaAniversario,
        MONTH(FechaIngreso) AS MesAniversario,
        YEAR(GETDATE()) - YEAR(FechaIngreso) AS AniosServicio
    FROM 
        dbo.Empleados
    WHERE 
        Activo = 1 
        AND FechaIngreso IS NOT NULL
        AND MONTH(FechaIngreso) IN (
            SELECT CAST(value AS INT) 
            FROM STRING_SPLIT(@Months, ',')
        )
        AND (YEAR(GETDATE()) - YEAR(FechaIngreso)) > 0
    ORDER BY 
        MesAniversario ASC,
        DiaAniversario ASC,
        Nombres ASC;
END
`;

async function run() {
    try {
        console.log('Connecting to database...');
        await sql.connect(dbConfig);
        console.log('Connected.');

        console.log('Dropping old SP if exists...');
        await sql.query(spSql);

        console.log('Creating new SP...');
        await sql.query(createSpSql);

        console.log('Success! Stored procedure sp_Empleados_GetAnniversaries created.');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

run();
