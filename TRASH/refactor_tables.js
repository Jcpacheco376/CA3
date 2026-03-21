const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();

const replacements = [
    { target: 'SISConfiguracion', replacement: 'SISConfiguracion', isExact: false },
    { target: 'SISTiposCalculo', replacement: 'SISTiposCalculo', isExact: false },
    { target: 'SISTiposEventoCalendario', replacement: 'SISSISTiposEventoCalendario', isExact: false },
    // SISPermisos is tricky because of RolesPermisos and sp_Permisos_GetAll. We only want exact 'SISPermisos' or 'dbo.SISPermisos' or '[dbo].[SISPermisos]' or '[SISPermisos]'
    // We will handle SISPermisos with a regex to ensure word boundaries and specific prefixes.
];

const fileExtensions = ['.js', '.ts', '.sql', '.html', '.md'];
const excludeDirs = ['node_modules', '.git', 'dist', 'build', 'release', 'TRASH', 'LEGACY'];

function processDirectory(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            if (!excludeDirs.includes(file)) {
                processDirectory(fullPath);
            }
        } else {
            const ext = path.extname(file);
            if (fileExtensions.includes(ext)) {
                processFile(fullPath);
            }
        }
    }
}

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let modified = false;

    // Easy replacements
    for (const rule of replacements) {
        if (!rule.isExact) {
            // Replace globally using regex to ensure we don't accidentally match parts of words, though these names are very long and specific.
            // Using a simple split/join for the highly specific names works perfectly.
            if (content.includes(rule.target)) {
                content = content.split(rule.target).join(rule.replacement);
                modified = true;
            }
        }
    }

    // Special handling for 'SISPermisos'
    // We want to match: " SISPermisos ", "dbo.SISPermisos", "[dbo].[SISPermisos]", "[SISPermisos]", " SISPermisos\n", "'SISPermisos'"
    // We DO NOT want to match: "RolesPermisos", "sp_Permisos_GetAll", "PermisosAsignados"

    // Regex explanation:
    // (?<![a-zA-Z0-9_]) : Negative lookbehind to ensure no alphanumeric character or underscore precedes "SISPermisos"
    // (?:dbo\.)? : Optional 'dbo.' prefix
    // (?:\[dbo\]\.\[)? : Optional '[dbo].[' prefix
    // \[? : Optional '[' prefix
    // SISPermisos
    // \]? : Optional ']' suffix
    // (?![a-zA-Z0-9_]) : Negative lookahead to ensure no alphanumeric character or underscore follows

    const permisosRegex = /(?<![a-zA-Z0-9_])(\[?dbo\]?\.\[?)?SISPermisos(\]?)(?![a-zA-Z0-9_])/g;

    if (permisosRegex.test(content)) {
        content = content.replace(permisosRegex, (match, prefix, suffix) => {
            // If it had dbo. or brackets, reconstruct it safely, otherwise just return SISPermisos
            if (match === 'SISPermisos') return 'SISPermisos';
            if (match === '[SISPermisos]') return '[SISPermisos]';
            if (match === 'dbo.SISPermisos') return 'dbo.SISPermisos';
            if (match === '[dbo].[SISPermisos]') return '[dbo].[SISPermisos]';
            return match.replace('SISPermisos', 'SISPermisos');
        });
        modified = true;
    }

    if (modified && content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Modified: ${filePath}`);
    }
}

// 1. Process all file contents
console.log('--- Starting Content Replacements ---');
processDirectory(rootDir);

// 2. Rename files in SQL/tablas
console.log('\n--- Renaming SQL Table Files ---');
const tablasDir = path.join(rootDir, 'SQL', 'tablas');
if (fs.existsSync(tablasDir)) {
    const tableFiles = fs.readdirSync(tablasDir);
    for (const file of tableFiles) {
        let newFile = file;

        for (const rule of replacements) {
            if (newFile.includes(`dbo.${rule.target}.sql`)) {
                newFile = newFile.replace(`dbo.${rule.target}.sql`, `dbo.${rule.replacement}.sql`);
            }
        }

        if (newFile.includes('dbo.SISPermisos.sql')) {
            newFile = newFile.replace('dbo.SISPermisos.sql', 'dbo.SISPermisos.sql');
        }

        if (newFile !== file) {
            fs.renameSync(path.join(tablasDir, file), path.join(tablasDir, newFile));
            console.log(`Renamed SQL file: ${file} -> ${newFile}`);
        }
    }
}

// 3. Rename JSON seed files
console.log('\n--- Renaming JSON Seed Files ---');
const seedsDir = path.join(rootDir, 'installer', 'database', 'seeds');
if (fs.existsSync(seedsDir)) {
    const seedFiles = fs.readdirSync(seedsDir);
    for (const file of seedFiles) {
        let newFile = file;

        for (const rule of replacements) {
            if (newFile === `${rule.target}.json`) {
                newFile = `${rule.replacement}.json`;
            }
        }

        if (newFile === 'SISPermisos.json') {
            newFile = 'SISPermisos.json';
        }

        if (newFile !== file) {
            fs.renameSync(path.join(seedsDir, file), path.join(seedsDir, newFile));
            console.log(`Renamed Seed file: ${file} -> ${newFile}`);
        }
    }
}

console.log('\n✅ Refactoring completed successfully.');
