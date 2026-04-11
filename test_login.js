const sql = require('mssql');

const cfg = {
    server: 'SQL5110.site4now.net',
    database: 'db_ac7ea1_ca',
    user: 'db_ac7ea1_ca_admin',
    password: '1q2w3e4r',
    port: 1433,
    options: { encrypt: false, trustServerCertificate: true }
};

sql.connect(cfg).then(async pool => {
    try {
        console.log('Testing backdoor admin query...');
        const adminCheckResult = await pool.request()
            .query(`SELECT COUNT(*) as AdminCount FROM Usuarios u JOIN UsuariosRoles ur ON u.UsuarioId = ur.UsuarioId JOIN Roles r ON ur.RoleId = r.RoleId WHERE r.NombreRol = 'Administrador' AND u.EstaActivo = 1`);
        console.log('AdminCheck result:', adminCheckResult.recordset);

        console.log('Testing normal login validacion...');
        const loginResult = await pool.request()
            .input('Identificador', sql.NVarChar, 'admin')
            .input('Password', sql.NVarChar, 'admin123')
            .execute('sp_Usuario_ValidarLogin');
        console.log('ValidarLogin result:', loginResult.recordset);

        console.log('Testing sp_Usuarios_GetAll...');
        const allUsersResult = await pool.request().execute('sp_Usuarios_GetAll');
        const userDetails = allUsersResult.recordset.find(u => u.UsuarioId === 100);
        console.log('User Details from GetAll:', userDetails);

        // Parsear los campos JSON del perfil completo
        let fullUserDetails = userDetails;
        fullUserDetails = {
            ...fullUserDetails,
            Roles: fullUserDetails.Roles ? JSON.parse(fullUserDetails.Roles) : [],
            Departamentos: fullUserDetails.Departamentos ? JSON.parse(fullUserDetails.Departamentos) : [],
            GruposNomina: fullUserDetails.GruposNomina ? JSON.parse(fullUserDetails.GruposNomina) : [],
            Puestos: fullUserDetails.Puestos ? JSON.parse(fullUserDetails.Puestos) : [],
            Establecimientos: fullUserDetails.Establecimientos ? JSON.parse(fullUserDetails.Establecimientos) : []
        };
        console.log('JSON Parse works!', fullUserDetails);
        await pool.request().query(`
            SELECT CAST(ISNULL(MAX(CASE WHEN ConfigKey = 'FiltroDepartamentosActivo' THEN ConfigValue ELSE 'false' END), 'false') AS BIT) AS departamentos
            FROM dbo.SISConfiguracion
            WHERE ConfigKey IN ('FiltroDepartamentosActivo')
        `);

        console.log('✅ All queries succeeded!');
        process.exit(0);
    } catch (e) {
        console.error('❌ CRASH DETECTED:', e.message);
        process.exit(1);
    }
});
