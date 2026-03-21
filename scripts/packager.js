const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { execSync } = require('child_process');

// ── Argumentos ───────────────────────────────────────────────────────────
const IS_EXE_MODE = process.argv.includes('--exe');
const editionArg = process.argv.find(arg => arg.startsWith('--edition='));
const APP_EDITION_BUILD = editionArg ? editionArg.split('=')[1].toUpperCase() : 'FULL';

// Rutas del Monorepo
const REPO_ROOT = path.join(__dirname, '../');
const FRONTEND_WS = path.join(REPO_ROOT, 'CONTROL-DE-ASISTENCIA');
const BACKEND_WS = path.join(REPO_ROOT, 'CONTROL-DE-ASISTENCIA-API');

// ── Extracción de versión ────────────────────────────────────────────────
let appVersion = '1.0.0';
try {
    const versionFilePath = path.join(FRONTEND_WS, 'src/features/auth/AuthContext.tsx');
    if (fs.existsSync(versionFilePath)) {
        const content = fs.readFileSync(versionFilePath, 'utf8');
        const match = content.match(/export const APP_DATA_VERSION = ['\"]([^'\"]+)['\"]/)
        if (match && match[1]) appVersion = match[1];
    }
} catch (e) {
    console.warn('⚠️ No se pudo leer la versión de AuthContext.tsx, usando default.');
}

// ── Configuración ────────────────────────────────────────────────────────
const OUTPUT_DIR = path.join(__dirname, '../release');
const fileNamePrefix = IS_EXE_MODE ? 'Instalador_Asistencia_EXE_v' : 'Instalador_Asistencia_v';
const OUTPUT_FILE = path.join(OUTPUT_DIR, `${fileNamePrefix}${appVersion}.zip`);
const FRONT_DIST = path.join(FRONTEND_WS, 'dist');
const BACK_DIST = path.join(BACKEND_WS, 'dist');

console.log(`\n📦 deploy:installer [MODO: ${IS_EXE_MODE ? 'EXE/PRO' : 'SCRIPT/OPEN'}] — Generando paquete v${appVersion}...\n`);

// 1. Limpiar Release y Binarios de trabajo para evitar duplicados
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
} else {
    const files = fs.readdirSync(OUTPUT_DIR);
    for (const file of files) {
        if (file.startsWith(fileNamePrefix) && file.endsWith('.zip')) {
            const fileVerStr = file.replace(fileNamePrefix, '').replace('.zip', '');
            if (fileVerStr < appVersion) {
                console.log(`🧹 Eliminando versión anterior obsoleta: ${file}`);
                fs.unlinkSync(path.join(OUTPUT_DIR, file));
            }
        }
    }
}

// Limpiar EXEs temporales del código fuente para no zippearlos por error en modo script
const workApiExe = path.join(BACK_DIST, 'ca3-api.exe');
const workInstExe = path.join(REPO_ROOT, 'installer', 'instalar.exe');
if (fs.existsSync(workApiExe)) fs.unlinkSync(workApiExe);
if (fs.existsSync(workInstExe)) fs.unlinkSync(workInstExe);

// 2. Compilar proyectos
try {
    console.log(`🔨 Compilando Frontend (Edición: ${APP_EDITION_BUILD})...`);
    // Inyectamos la variable para Vite (VITE_ prefix es necesario)
    const frontEnv = { ...process.env, VITE_APP_EDITION: APP_EDITION_BUILD };
    execSync('npm run build --workspace=CONTROL-DE-ASISTENCIA', { stdio: 'inherit', cwd: REPO_ROOT, env: frontEnv });

    console.log('🔨 Compilando Backend (TypeScript)...');
    execSync('tsc', { stdio: 'inherit', cwd: BACKEND_WS });

    if (IS_EXE_MODE) {
        console.log(`📦 Empaquetando Backend como Ejecutable (pkg) (Edición: ${APP_EDITION_BUILD})...`);
        // Para el backend, pkg no inyecta env vars en el binario de forma fácil, 
        // pero podemos crear un .env temporal o usar cross-env si fuera necesario.
        // Sin embargo, el código del backend lee process.env.APP_EDITION.
        // pkg empaqueta el entorno de construcción, pero es mejor que el código sea robusto.
        execSync('npx pkg . --targets node18-win-x64 --output dist/ca3-api.exe', {
            stdio: 'inherit',
            cwd: BACKEND_WS,
            env: { ...process.env, APP_EDITION: APP_EDITION_BUILD }
        });

        const installerPath = path.join(REPO_ROOT, 'installer');
        console.log('📦 Empaquetando Instalador como Ejecutable (pkg)...');
        execSync('npx pkg . --targets node18-win-x64 --output instalar.exe', { stdio: 'inherit', cwd: installerPath });
    }
} catch (e) {
    console.error('❌ Error compilando. Revisa los logs.');
    process.exit(1);
}

// 3. Crear ZIP
const output = fs.createWriteStream(OUTPUT_FILE);
const archive = archiver('zip', { zlib: { level: 9 } });
output.on('close', () => {
    const mb = (archive.pointer() / 1024 / 1024).toFixed(1);
    console.log(`\n✅ PAQUETE CREADO (${mb} MB): ${OUTPUT_FILE}`);
    console.log(`🚀 Modo ${IS_EXE_MODE ? 'PRO' : 'OPEN'} listo para entregar.\n`);
});
archive.pipe(output);

// ── version.json ─────────────────────────────────────────────────────────
archive.append(
    JSON.stringify({ version: appVersion, generatedAt: new Date().toISOString(), mode: IS_EXE_MODE ? 'exe' : 'script' }),
    { name: 'database/version.json' }
);

// ── A. Frontend ──────────────────────────────────────────────────────────
if (fs.existsSync(FRONT_DIST)) {
    archive.directory(FRONT_DIST, 'app/frontend-asistencia');
}

// ── B. Backend ───────────────────────────────────────────────────────────
if (IS_EXE_MODE) {
    const apiExe = path.join(BACK_DIST, 'ca3-api.exe');
    if (fs.existsSync(apiExe)) {
        archive.file(apiExe, { name: 'app/api-asistencia/ca3-api.exe' });
    }
} else {
    // Modo Script
    archive.directory(BACK_DIST, 'app/api-asistencia/dist');
    archive.file(path.join(BACKEND_WS, 'package.json'), { name: 'app/api-asistencia/package.json' });
}

// ── C. Scripts SQL ───────────────────────────────────────────────────────
const sqlDir = path.join(REPO_ROOT, 'SQL');
if (fs.existsSync(sqlDir)) archive.directory(sqlDir, 'database/sql');

// ── D. Wizard de instalación ─────────────────────────────────────────────
if (IS_EXE_MODE) {
    const installerExe = path.join(REPO_ROOT, 'installer', 'instalar.exe');
    if (fs.existsSync(installerExe)) archive.file(installerExe, { name: 'instalar.exe' });
} else {
    // Modo Script: Incluimos la carpeta installer/ (limpia de EXEs)
    archive.directory(path.join(REPO_ROOT, 'installer'), 'installer');
}

// ── E. Launcher ──────────────────────────────────────────────────────────
const launcherDir = path.join(REPO_ROOT, 'launcher');
if (fs.existsSync(launcherDir)) {
    try {
        console.log('📦 Instalando dependencias del launcher (systray2)...');
        execSync('npm install --production', { cwd: launcherDir, stdio: 'inherit' });
    } catch (e) { }
    archive.directory(launcherDir, 'launcher');
}

// ── F. Otros ─────────────────────────────────────────────────────────────
const zkBridgeExe = path.join(BACKEND_WS, 'bin', 'ZkBridge.exe');
if (fs.existsSync(zkBridgeExe)) archive.file(zkBridgeExe, { name: 'zkbridge/ZkBridge.exe' });

const sdkDir = path.join(REPO_ROOT, 'sdk');
if (fs.existsSync(sdkDir)) archive.directory(sdkDir, 'sdk');

// ── G. Seleccion de instalar.bat segun el modo ──────────────────────────
const batTemplate = IS_EXE_MODE
    ? path.join(__dirname, 'templates', 'instalar-exe.bat')
    : path.join(__dirname, 'templates', 'instalar-open.bat');

if (fs.existsSync(batTemplate)) {
    archive.file(batTemplate, { name: 'instalar.bat' });
    console.log(`✅ Incluido instalar.bat (Versión ${IS_EXE_MODE ? 'EXE' : 'OPEN'})`);
} else {
    console.warn('⚠️ No se encontro la plantilla para instalar.bat en ' + batTemplate);
}

const exclusionsFile = path.join(__dirname, 'sp-exclusions.json');
if (fs.existsSync(exclusionsFile)) archive.file(exclusionsFile, { name: 'database/sp-exclusions.json' });

// ── H. Finalizar ──────────────────────────────────────────────────────────
async function finalizeArchive() {
    console.log('Finalizando archivo ZIP, por favor espere...');
    await archive.finalize();
}
finalizeArchive();