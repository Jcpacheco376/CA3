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
        await pool.request().query(`
            IF NOT EXISTS (SELECT 1 FROM Usuarios WHERE NombreUsuario = 'admin')
            INSERT INTO Usuarios (UsuarioId, NombreUsuario, PasswordHash, NombreCompleto, Email)
            VALUES (100, 'admin', PWDENCRYPT('admin123'), 'Administrador Demo', 'admin@demo.com')
        `);
        console.log('✅ Usuario ADMIN creado exitosamente (User: admin / Pass: admin123)');

        // Darle el rol de administrador 
        // Primero asegurarnos de tener un Rol "Administrador", si no lo creamos.
        let roleId = 1;
        try {
            await pool.request().query("IF NOT EXISTS (SELECT 1 FROM Roles WHERE NombreRol = 'Administrador') INSERT INTO Roles (NombreRol, Descripcion) VALUES ('Administrador', 'Acceso Total')");
            const res = await pool.request().query("SELECT RoleId FROM Roles WHERE NombreRol = 'Administrador'");
            roleId = res.recordset[0].RoleId;

            // Asignar rol al usuario
            const assign = pool.request();
            assign.input('UsuarioId', sql.Int, 100);
            assign.input('RoleId', sql.Int, roleId);
            await assign.execute('dbo.sp_Usuario_AsignarRol');
            console.log('✅ Rol Administrador asignado exitosamente.');
        } catch (rErr) {
            console.log('Aviso: No se pudo asignar rol, quizá las tablas de roles son diferentes.', rErr.message);
        }

        process.exit(0);
    } catch (e) {
        console.error('❌ Error creando admin:', e);
        process.exit(1);
    }
});
