import sql from 'mssql';

const demoDbConfig = {
    user: 'db_ac7ea1_ca_admin',
    password: '1q2w3e4r',
    server: 'SQL5110.site4now.net',
    database: 'db_ac7ea1_ca',
    options: {
        encrypt: false,
        trustServerCertificate: true,
    },
};

async function debugChecadas() {
    try {
        const pool = await new sql.ConnectionPool(demoDbConfig).connect();

        console.log("--- HorarioDetalle Sample ---");
        const hRes = await pool.request().query('SELECT TOP 10 * FROM CatalogoHorariosDetalle ORDER BY HorarioId, DiaSemana');
        console.table(hRes.recordset);

        console.log("--- Checadas Sample ---");
        const cRes = await pool.request().query(`
            SELECT TOP 10 c.ChecadaId, c.EmpleadoId, c.FechaHora, c.Checador 
            FROM Checadas c 
            ORDER BY c.ChecadaId ASC
        `);
        console.table(cRes.recordset);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debugChecadas();
