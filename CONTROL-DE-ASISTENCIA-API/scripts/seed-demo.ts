import sql from 'mssql';
import { faker } from '@faker-js/faker/locale/es_MX';
import { dbConfig, poolPromise } from '../src/config/database'; // Adjust path depending on root

async function seedDemo() {
    console.log('🌱 Iniciando Seeder para Demo...');
    let pool;
    try {
        pool = await poolPromise;

        // 1. Limpiar o asegurar un Departamento Default
        await pool.request().query("IF NOT EXISTS (SELECT 1 FROM dbo.CatalogoDepartamentos WHERE DepartamentoId = 1) INSERT INTO dbo.CatalogoDepartamentos (DepartamentoId, NombreClave, Descripcion, Activo) VALUES (1, 'GEN', 'General', 1);");

        // 2. Limpiar o asegurar un Grupo de Nomina
        await pool.request().query("IF NOT EXISTS (SELECT 1 FROM dbo.CatalogoGruposNomina WHERE GrupoNominaId = 1) INSERT INTO dbo.CatalogoGruposNomina (GrupoNominaId, NombreClave, Descripcion, Activo) VALUES (1, 'QNA', 'Quincenal', 1);");

        // 3. Establecimiento Default
        await pool.request().query("IF NOT EXISTS (SELECT 1 FROM dbo.CatalogoEstablecimientos WHERE EstablecimientoId = 1) INSERT INTO dbo.CatalogoEstablecimientos (EstablecimientoId, NombreClave, Descripcion, Activo) VALUES (1, 'MAT', 'Matriz', 1);");

        // 4. Puesto Default
        await pool.request().query("IF NOT EXISTS (SELECT 1 FROM dbo.CatalogoPuestos WHERE PuestoId = 1) INSERT INTO dbo.CatalogoPuestos (PuestoId, NombreClave, Descripcion, Activo) VALUES (1, 'EMP', 'Empleado', 1);");

        // 5. Horario Default (Asumimos ID 1 existe, si no, lo dejamos null o insertamos uno minimalista)
        await pool.request().query(`
            IF NOT EXISTS (SELECT 1 FROM dbo.CatalogoHorarios WHERE HorarioId = 1) 
            INSERT INTO dbo.CatalogoHorarios (HorarioId, NombreClave, Descripcion, HoraGeneracionFaltas, EsFlexible) 
            VALUES (1, 'FLEX', 'Flexible (Demo)', '10:00:00', 1);
        `);

        // 6. CREAR EMPLEADOS DUMMY
        console.log('👤 Generando 20 empleados estocásticos...');
        const usersToCreate = 20;

        for (let i = 1; i <= usersToCreate; i++) {
            const isMale = faker.datatype.boolean();
            const sexo = isMale ? 'H' : 'M';
            const sexType = isMale ? 'male' : 'female';

            const nombres = faker.person.firstName(sexType);
            const apellidoPaterno = faker.person.lastName(sexType);
            const apellidoMaterno = faker.person.lastName(sexType);

            // Generar avatar URL o usar buffer (Para la demo tal vez dejemos la imagen nula, o descarguemos un buffer si es necesario)
            // Para simplicidad en la BD la imagen en VarBinary se deja NULL y el Frontend usará placeholder si es NULL

            const req = pool.request();
            req.input('CodRef', sql.NVarChar, `DEMO-${i.toString().padStart(4, '0')}`);
            req.input('Pim', sql.NVarChar, null);
            req.input('Nombres', sql.NVarChar, nombres);
            req.input('ApellidoPaterno', sql.NVarChar, apellidoPaterno);
            req.input('ApellidoMaterno', sql.NVarChar, apellidoMaterno);
            req.input('FechaNacimiento', sql.Date, faker.date.birthdate({ min: 18, max: 65, mode: 'age' }));
            req.input('FechaIngreso', sql.Date, faker.date.past({ years: 3 }));
            req.input('DepartamentoId', sql.Int, 1);
            req.input('GrupoNominaId', sql.Int, 1);
            req.input('PuestoId', sql.Int, 1);
            req.input('HorarioIdPredeterminado', sql.Int, 1);
            req.input('EstablecimientoId', sql.Int, 1);
            req.input('Sexo', sql.NChar, sexo);
            req.input('NSS', sql.NVarChar, faker.string.numeric(11));
            req.input('CURP', sql.NVarChar, faker.string.alphanumeric({ length: 18, casing: 'upper' }));
            req.input('RFC', sql.NVarChar, faker.string.alphanumeric({ length: 13, casing: 'upper' }));
            req.input('UsuarioId', sql.Int, 1); // Creado por admin
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
