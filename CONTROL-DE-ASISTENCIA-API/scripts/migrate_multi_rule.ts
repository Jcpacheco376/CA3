import sql from 'mssql';
import fs from 'fs';
import path from 'path';
import { dbConfig } from '../src/config/database';

async function run() {
    try {
        console.log('Connecting to database...');
        const pool = await sql.connect(dbConfig);

        console.log('1. Applying Table Changes...');
        try {
            await pool.request().query(`
                IF NOT EXISTS(SELECT 1 FROM sys.columns WHERE Name = N'GrupoRegla' AND Object_ID = Object_ID(N'dbo.EventosCalendarioFiltros'))
                BEGIN
                    ALTER TABLE dbo.EventosCalendarioFiltros ADD GrupoRegla INT NOT NULL DEFAULT 0;
                END
                
                IF EXISTS(SELECT 1 FROM sys.indexes WHERE name='UQ_EventosFiltros_EventoDimValor' AND object_id = OBJECT_ID('dbo.EventosCalendarioFiltros'))
                BEGIN
                    DROP INDEX UQ_EventosFiltros_EventoDimValor ON dbo.EventosCalendarioFiltros;
                END

                IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='UQ_EventosFiltros_EventoGrupoDimValor' AND object_id = OBJECT_ID('dbo.EventosCalendarioFiltros'))
                BEGIN
                    CREATE UNIQUE NONCLUSTERED INDEX UQ_EventosFiltros_EventoGrupoDimValor ON dbo.EventosCalendarioFiltros(EventoId, GrupoRegla, Dimension, ValorId);
                END
            `);
            console.log('Table updated successfully.');
        } catch (e: any) {
            console.error('Error updating table:', e.message);
        }

        console.log('2. Applying SP sp_EventosCalendario_Upsert...');
        const spUpsert = fs.readFileSync(path.join(__dirname, '../../SQL/procedimientos/dbo.sp_EventosCalendario_Upsert.sql'), 'utf8');
        await pool.request().batch(spUpsert);
        console.log('sp_EventosCalendario_Upsert updated.');

        console.log('3. Applying SP sp_EventosCalendario_GetAll...');
        const spGetAll = fs.readFileSync(path.join(__dirname, '../../SQL/procedimientos/dbo.sp_EventosCalendario_GetAll.sql'), 'utf8');
        await pool.request().batch(spGetAll);
        console.log('sp_EventosCalendario_GetAll updated.');

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

run();
