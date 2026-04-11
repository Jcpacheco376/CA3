import sql from 'mssql';
import { faker } from '@faker-js/faker/locale/es_MX';
import { dbConfig, poolPromise } from '../src/config/database'; // Adjust path depending on root

async function seedDemo() {
    console.log('🌱 Iniciando Seeder para Demo...');
    let pool;
    try {
        pool = await poolPromise;

        // 1. Limpiar o asegurar un Departamento Default
        await pool.request().query("IF NOT EXISTS (SELECT 1 FROM dbo.CatalogoDepartamentos) INSERT INTO dbo.CatalogoDepartamentos (CodRef, Nombre, Abreviatura, Activo) VALUES ('DP-01', 'General', 'GEN', 1);");

        // 2. Limpiar o asegurar un Grupo de Nomina
        await pool.request().query("IF NOT EXISTS (SELECT 1 FROM dbo.CatalogoGruposNomina) INSERT INTO dbo.CatalogoGruposNomina (CodRef, Nombre, Abreviatura, Activo, Periodo) VALUES ('GN-01', 'Quincenal', 'QNA', 1, 'Quincenal');");

        // 3. Establecimiento Default
        await pool.request().query("IF NOT EXISTS (SELECT 1 FROM dbo.CatalogoEstablecimientos) INSERT INTO dbo.CatalogoEstablecimientos (CodRef, Nombre, Abreviatura, Activo) VALUES ('ES-01', 'Matriz', 'MAT', 1);");

        // 4. Puesto Default
        await pool.request().query("IF NOT EXISTS (SELECT 1 FROM dbo.CatalogoPuestos) INSERT INTO dbo.CatalogoPuestos (CodRef, Nombre, Activo) VALUES ('PT-01', 'Empleado', 1);");

        // 5. Horario Default 
        await pool.request().query(`
            IF NOT EXISTS (SELECT 1 FROM dbo.CatalogoHorarios) 
            INSERT INTO dbo.CatalogoHorarios (CodRef, Abreviatura, Nombre, MinutosTolerancia, ColorUI, Activo) 
            VALUES ('HR-01', 'FLEX', 'Flexible (Demo)', 15, 'slate', 1);
        `);

        // Necesitamos saber qué IDs se crearon para asociarlos a los empleados
        console.log('🔍 Extrayendo IDs predeterminados...');
        const deptId = (await pool.request().query('SELECT TOP 1 DepartamentoId FROM dbo.CatalogoDepartamentos')).recordset[0].DepartamentoId;
        const gnoId = (await pool.request().query('SELECT TOP 1 GrupoNominaId FROM dbo.CatalogoGruposNomina')).recordset[0].GrupoNominaId;
        const estId = (await pool.request().query('SELECT TOP 1 EstablecimientoId FROM dbo.CatalogoEstablecimientos')).recordset[0].EstablecimientoId;
        const ptoId = (await pool.request().query('SELECT TOP 1 PuestoId FROM dbo.CatalogoPuestos')).recordset[0].PuestoId;
        const horId = (await pool.request().query('SELECT TOP 1 HorarioId FROM dbo.CatalogoHorarios')).recordset[0].HorarioId;

        // Validar que el usuario Admin exista (es necesario que la migración o el portal haya creado el Rol)
        // Para simplificar, asumiremos que sp_Empleados_Save asignará UsuarioId generico o fallará si referenciamos un ID no existente
        // pero Usuarios_Save usa UsuarioId para Bitacora. Le pasaremos un 1.

        console.log('👤 Generando 20 empleados estocásticos...');
        const usersToCreate = 20;

        for (let i = 1; i <= usersToCreate; i++) {
            const isMale = faker.datatype.boolean();
            const sexo = isMale ? 'H' : 'M';
            const sexType = isMale ? 'male' : 'female';

            const nombres = faker.person.firstName(sexType);
            const apellidoPaterno = faker.person.lastName(sexType);
            const apellidoMaterno = faker.person.lastName(sexType);

            const req = pool.request();
            req.input('CodRef', sql.NVarChar, `DEMO-${i.toString().padStart(4, '0')}`);
            req.input('Pim', sql.NVarChar, (1000 + i).toString());
            req.input('Nombres', sql.NVarChar, nombres);
            req.input('ApellidoPaterno', sql.NVarChar, apellidoPaterno);
            req.input('ApellidoMaterno', sql.NVarChar, apellidoMaterno);
            req.input('FechaNacimiento', sql.Date, faker.date.birthdate({ min: 18, max: 65, mode: 'age' }));
            req.input('FechaIngreso', sql.Date, faker.date.past({ years: 3 }));
            req.input('DepartamentoId', sql.Int, deptId);
            req.input('GrupoNominaId', sql.Int, gnoId);
            req.input('PuestoId', sql.Int, ptoId);
            req.input('HorarioIdPredeterminado', sql.Int, horId);
            req.input('EstablecimientoId', sql.Int, estId);
            req.input('Sexo', sql.NChar, sexo);
            req.input('NSS', sql.NVarChar, faker.string.numeric(11));
            req.input('CURP', sql.NVarChar, faker.string.alphanumeric({ length: 18, casing: 'upper' }));
            req.input('RFC', sql.NVarChar, faker.string.alphanumeric({ length: 13, casing: 'upper' }));
            req.input('UsuarioId', sql.Int, null); // Dejamos nulo para que el Procedimiento asigne el sistema o null en auditoría
            req.input('Imagen', sql.VarBinary, null);
            req.input('Activo', sql.Bit, 1);
            req.input('FechaBaja', sql.Date, null);

            req.output('EmpleadoId', sql.Int);

            // Ejecutamos sp_Empleados_Save
            await req.execute('dbo.sp_Empleados_Save');
        }

        console.log('✅ Empleados generados. Fin del Seed.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error ejecutando seed:', error);
        process.exit(1);
    }
}

seedDemo();
