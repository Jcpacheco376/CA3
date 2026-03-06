const fs = require('fs');
let sqlTextOrig = fs.readFileSync('c:/Users/SISTEMAS/Documents/VSC-PROJECTS/CA3/SQL/procedimientos/dbo.sp_CatalogoConceptosNomina_GetAll.sql');
let t = sqlTextOrig.toString('utf8');
if (t.charCodeAt(0) === 0xFEFF) t = t.slice(1);

const lines = t.split(/\r?\n/);
let first = 0;
for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line !== '' && !line.startsWith('--')) {
        first = i; break;
    }
}
console.log('first:', first);
let stripped = lines.slice(first).join('\n').trim();
console.log('stripped length:', stripped.length);

function forceOrAlter(s) {
    return s
        .replace(/\bCREATE\s+OR\s+ALTER\s+PROCEDURE\b/gi, 'CREATE OR ALTER PROCEDURE')
        .replace(/\bCREATE\s+OR\s+ALTER\s+PROC\b/gi, 'CREATE OR ALTER PROC')
        .replace(/\bALTER\s+PROCEDURE\b/gi, 'CREATE OR ALTER PROCEDURE')
        .replace(/\bALTER\s+PROC\b/gi, 'CREATE OR ALTER PROC')
        .replace(/\bCREATE\s+PROCEDURE\b/gi, 'CREATE OR ALTER PROCEDURE')
        .replace(/\bCREATE\s+PROC\b/gi, 'CREATE OR ALTER PROC');
}

let forced = forceOrAlter(stripped);
console.log('forced length:', forced.length);

const batches = forced.split(/^\s*GO\s*$/im).map(b => b.trim()).filter(b => b.length > 0);
console.log('batches count:', batches.length);
if (batches.length > 0) {
    console.log('batch 0 start:', JSON.stringify(batches[0].slice(0, 30)));
    console.log('Batch 0 byte array:', Array.from(batches[0].slice(0, 5)).map(c => c.charCodeAt(0)));
}
