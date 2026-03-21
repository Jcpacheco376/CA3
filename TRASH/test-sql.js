const fs = require('fs');
const sqlTextOrig = fs.readFileSync('c:/Users/SISTEMAS/Documents/VSC-PROJECTS/CA3/SQL/procedimientos/dbo.sp_CatalogoConceptosNomina_GetAll.sql', 'utf8');

function stripHeader(sqlText) {
    if (sqlText.charCodeAt(0) === 0xFEFF) {
        sqlText = sqlText.slice(1);
    }
    const lines = sqlText.split(/\r?\n/);
    let firstCode = 0;
    for (let i = 0; i < lines.length; i++) {
        const t = lines[i].trim();
        if (t !== '' && !t.startsWith('--')) {
            firstCode = i;
            break;
        }
    }
    return lines.slice(firstCode).join('\n').trim();
}

function forceCreateOrAlter(sqlText) {
    return sqlText
        .replace(/\bCREATE\s+OR\s+ALTER\s+PROCEDURE\b/gi, 'CREATE OR ALTER PROCEDURE')
        .replace(/\bCREATE\s+OR\s+ALTER\s+PROC\b/gi, 'CREATE OR ALTER PROC')
        .replace(/\bALTER\s+PROCEDURE\b/gi, 'CREATE OR ALTER PROCEDURE')
        .replace(/\bALTER\s+PROC\b/gi, 'CREATE OR ALTER PROC')
        .replace(/\bCREATE\s+PROCEDURE\b/gi, 'CREATE OR ALTER PROCEDURE')
        .replace(/\bCREATE\s+PROC\b/gi, 'CREATE OR ALTER PROC');
}

const stripped = stripHeader(sqlTextOrig);
const forced = forceCreateOrAlter(stripped);

console.log('--- STRIPPED LENGTH ---', stripped.length);
console.log('--- FORCED FIRST 100 CHARS ---');
console.log(JSON.stringify(forced.slice(0, 100)));

const batches = forced.split(/^\s*GO\s*$/im).map(b => b.trim()).filter(b => b.length > 0);
console.log('--- BATCHES ---', batches.length);
if (batches.length > 0) {
    console.log('Batch 0 start:', JSON.stringify(batches[0].slice(0, 50)));
}
