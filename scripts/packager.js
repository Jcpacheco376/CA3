const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { execSync } = require('child_process');

// Rutas Reales de tu Monorepo
const REPO_ROOT = path.join(__dirname, '../');
const FRONTEND_WS = path.join(REPO_ROOT, 'CONTROL-DE-ASISTENCIA');
const BACKEND_WS = path.join(REPO_ROOT, 'CONTROL-DE-ASISTENCIA-API');

// --- EXTRACCIÓN DE VERSIÓN ---
let appVersion = '1.0.0'; // Valor por defecto
try {
    const versionFilePath = path.join(FRONTEND_WS, 'src/features/auth/AuthContext.tsx');
    if (fs.existsSync(versionFilePath)) {
        const content = fs.readFileSync(versionFilePath, 'utf8');
        // Busca: export const APP_DATA_VERSION = '0.9.14';
        const match = content.match(/export const APP_DATA_VERSION = ['"]([^'"]+)['"]/);
        if (match && match[1]) {
            appVersion = match[1];
        }
    }
} catch (e) {
    console.warn('⚠️ No se pudo leer la versión de AuthContext.tsx, usando default.');
}

// --- CONFIGURACIÓN ---
const OUTPUT_DIR = path.join(__dirname, '../release');
const OUTPUT_FILE = path.join(OUTPUT_DIR, `Instalador_Asistencia_v${appVersion}.zip`);

// Carpetas de salida de compilación (dist)
const FRONT_DIST = path.join(FRONTEND_WS, 'dist');
const BACK_DIST = path.join(BACKEND_WS, 'dist'); 

console.log(`📦 GESTOR DE DESPLIEGUE: Generando paquete v${appVersion}...`);

// 1. Limpiar Release
if (fs.existsSync(OUTPUT_DIR)) fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUTPUT_DIR);

// 2. Construir Proyectos
try {
    console.log('\n🔨 Compilando Frontend...');
    execSync('npm run build --workspace=CONTROL-DE-ASISTENCIA', { stdio: 'inherit', cwd: REPO_ROOT });

    console.log('\n🔨 Compilando Backend...');
    execSync('tsc', { stdio: 'inherit', cwd: BACKEND_WS });
} catch (e) {
    console.error('❌ Error compilando. Revisa los logs.');
    process.exit(1);
}

// 3. Crear ZIP
const output = fs.createWriteStream(OUTPUT_FILE);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => console.log(`\n✅ PAQUETE CREADO: ${OUTPUT_FILE}\n🚀 Listo para instalar.`));
archive.pipe(output);

// --- ESTRUCTURA DEL ZIP ---

// A. Frontend -> carpeta "frontend-asistencia"
if (fs.existsSync(FRONT_DIST)) {
    archive.directory(FRONT_DIST, 'frontend-asistencia');
} else {
    throw new Error('No se encontró la carpeta dist del frontend.');
}

// B. Backend -> carpeta "api-asistencia"
if (fs.existsSync(BACK_DIST)) {
    // --- CORRECCIÓN CRÍTICA AQUÍ ---
    // Antes: archive.directory(BACK_DIST, 'api-asistencia');  <-- ERROR: Aplanaba la carpeta
    // Ahora: Lo metemos explícitamente en 'api-asistencia/dist'
    archive.directory(BACK_DIST, 'api-asistencia/dist'); 
    
    // El package.json se queda en la raíz de api-asistencia
    archive.file(path.join(BACKEND_WS, 'package.json'), { name: 'api-asistencia/package.json' });
} else {
    throw new Error('No se encontró la carpeta dist del backend.');
}

// C. Scripts SQL
const sqlDir = path.join(REPO_ROOT, 'SQL');
if (fs.existsSync(sqlDir)) {
    archive.directory(sqlDir, 'database_scripts');
}

// D. Archivos de Instalación
archive.file(path.join(__dirname, 'setup.js'), { name: 'setup.js' });
archive.file(path.join(__dirname, 'install.bat'), { name: 'install.bat' });

// E. WEB.CONFIG
const webConfigPath = path.join(REPO_ROOT, 'web.config');
if (fs.existsSync(webConfigPath)) {
    archive.file(webConfigPath, { name: 'web.config' });
} else {
    // Generación dinámica si no existe
    const webConfigContent = `<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <rewrite>
            <rules>
                <rule name="ProxyAPI" stopProcessing="true">
                    <match url="^api/(.*)" />
                    <action type="Rewrite" url="http://localhost:3001/api/{R:1}" />
                </rule>
                <rule name="ReactRoutes" stopProcessing="true">
                    <match url=".*" />
                    <conditions logicalGrouping="MatchAll">
                        <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
                        <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
                    </conditions>
                    <action type="Rewrite" url="/" />
                </rule>
            </rules>
        </rewrite>
    </system.webServer>
</configuration>`;
    archive.append(webConfigContent, { name: 'web.config' });
}

archive.finalize();