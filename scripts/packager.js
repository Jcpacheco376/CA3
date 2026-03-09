const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { execSync } = require('child_process');

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
const OUTPUT_FILE = path.join(OUTPUT_DIR, `Instalador_Asistencia_v${appVersion}.zip`);
const FRONT_DIST = path.join(FRONTEND_WS, 'dist');
const BACK_DIST = path.join(BACKEND_WS, 'dist');

console.log(`\n📦 deploy:installer — Generando paquete v${appVersion}...\n`);

// 1. Limpiar Release (Smart Cleanup)
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
} else {
    // Eliminar solo archivos zip antiguos que compartan la misma versión Mayor y Menor (Sub-Segmento)
    const [genMajor, genMinor, genPatch] = appVersion.split('.').map(Number);

    const files = fs.readdirSync(OUTPUT_DIR);
    for (const file of files) {
        if (file.startsWith('Instalador_Asistencia_v') && file.endsWith('.zip')) {
            const fileVerStr = file.replace('Instalador_Asistencia_v', '').replace('.zip', '');
            const [fMajor, fMinor, fPatch] = fileVerStr.split('.').map(Number);

            if (fMajor === genMajor && fMinor === genMinor) {
                // Es el mismo sub-segmento. Si es estrictamente menor al nuevo, lo borramos.
                if (fPatch < genPatch) {
                    console.log(`🧹 Eliminando versión anterior obsoleta: ${file}`);
                    fs.unlinkSync(path.join(OUTPUT_DIR, file));
                }
            }
        }
    }
}

// 2. Compilar proyectos (solo si no se llamó desde deploy:installer que ya compiló)
try {
    console.log('🔨 Compilando Frontend...');
    execSync('npm run build --workspace=CONTROL-DE-ASISTENCIA', { stdio: 'inherit', cwd: REPO_ROOT });
    console.log('🔨 Compilando Backend (TypeScript)...');
    execSync('tsc', { stdio: 'inherit', cwd: BACKEND_WS });
    console.log('📦 Empaquetando Backend como Ejecutable (pkg)...');
    execSync('npx pkg . --targets node18-win-x64 --output dist/ca3-api.exe', { stdio: 'inherit', cwd: BACKEND_WS });

    const installerPath = path.join(REPO_ROOT, 'installer');
    console.log('📦 Empaquetando Instalador como Ejecutable (pkg)...');
    execSync('npx pkg . --targets node18-win-x64 --output instalar.exe', { stdio: 'inherit', cwd: installerPath });
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
    console.log('🚀 Listo para entregar al cliente.\n');
});
archive.pipe(output);

// ── version.json → versión del paquete para control de versiones ─────────
archive.append(
    JSON.stringify({ version: appVersion, generatedAt: new Date().toISOString() }),
    { name: 'database/version.json' }
);
console.log(`✅ Versión ${appVersion} inyectada en database/version.json`);

// ── A. Frontend → app/frontend-asistencia/ ──────────────────────────────
if (fs.existsSync(FRONT_DIST)) {
    archive.directory(FRONT_DIST, 'app/frontend-asistencia');
    console.log('✅ Frontend incluido.');
} else {
    throw new Error('No se encontró la carpeta dist del frontend.');
}

// ── B. Backend → app/api-asistencia/ ────────────────────────────────────
const apiExe = path.join(BACK_DIST, 'ca3-api.exe');
if (fs.existsSync(apiExe)) {
    archive.file(apiExe, { name: 'app/api-asistencia/ca3-api.exe' });
    console.log('✅ Backend (EXE) incluido.');
} else {
    throw new Error('No se encontró el ejecutable del backend (ca3-api.exe).');
}

// ── C. web.config (si existe) ────────────────────────────────────────────
const webConfigPath = path.join(REPO_ROOT, 'CONTROL-DE-ASISTENCIA', 'web.config');
if (fs.existsSync(webConfigPath)) {
    archive.file(webConfigPath, { name: 'app/frontend-asistencia/web.config' });
}

// ── D. Scripts SQL (procedimientos + tablas) → database/sql/ ─────────────
const sqlDir = path.join(REPO_ROOT, 'SQL');
if (fs.existsSync(sqlDir)) {
    archive.directory(sqlDir, 'database/sql');
    console.log('✅ Scripts SQL incluidos (database/sql/).');
} else {
    console.warn('⚠️  Carpeta SQL/ no encontrada. La migración de BD no funcionará correctamente.');
}

// ── E. Lista de exclusiones de SPs → database/ ──────────────────────────
const exclusionsFile = path.join(__dirname, 'sp-exclusions.json');
if (fs.existsSync(exclusionsFile)) {
    archive.file(exclusionsFile, { name: 'database/sp-exclusions.json' });
}

// ── F. Wizard de instalación (EXE) ──────────────────────────────────────
const installerExe = path.join(REPO_ROOT, 'installer', 'instalar.exe');
if (fs.existsSync(installerExe)) {
    archive.file(installerExe, { name: 'instalar.exe' });
    console.log('✅ Wizard de instalación incluido (EXE).');
} else {
    console.warn('⚠️  No se encontró el ejecutable del instalador.');
}

// ── G. Systray launcher → launcher/ (con node_modules pre-instalados) ────
const launcherDir = path.join(REPO_ROOT, 'launcher');
if (fs.existsSync(launcherDir)) {
    // Pre-instalar dependencias del launcher para que el cliente no necesite npm ni conexión
    try {
        console.log('📦 Instalando dependencias del launcher (systray2)...');
        execSync('npm install --production', { cwd: launcherDir, stdio: 'inherit' });
        console.log('✅ Dependencias del launcher instaladas.');
    } catch (e) {
        console.warn('⚠️  No se pudieron instalar las dependencias del launcher. El launcher puede no funcionar.');
    }
    archive.directory(launcherDir, 'launcher');
    console.log('✅ Launcher systray incluido con dependencias (launcher/).');
} else {
    console.warn('⚠️  Carpeta launcher/ no encontrada.');
}

// ── H. ZkBridge.exe → zkbridge/ ─────────────────────────────────────────
const zkBridgeExe = path.join(BACKEND_WS, 'src', 'bin', 'zk-bridge', 'ZkBridge.exe');
if (fs.existsSync(zkBridgeExe)) {
    archive.file(zkBridgeExe, { name: 'zkbridge/ZkBridge.exe' });
    console.log('✅ ZkBridge.exe incluido (zkbridge/).');
} else {
    console.warn('⚠️  ZkBridge.exe no encontrado en: ' + zkBridgeExe);
}

// ── I. SDK ZK (DLLs) → sdk/ ─────────────────────────────────────────────
const sdkDir = path.join(REPO_ROOT, 'sdk');
if (fs.existsSync(sdkDir)) {
    archive.directory(sdkDir, 'sdk');
    console.log('✅ SDK ZK (DLLs) incluido (sdk/).');
} else {
    console.warn('⚠️  Carpeta sdk/ no encontrada. Los checadores ZK no estarán disponibles.');
}

// ── J. instalar.bat → raíz del ZIP ─────────────────────────────────────
const instalarBat = path.join(REPO_ROOT, 'instalar.bat');
if (fs.existsSync(instalarBat)) {
    archive.file(instalarBat, { name: 'instalar.bat' });
    console.log('✅ instalar.bat incluido.');
} else {
    console.warn('⚠️  instalar.bat no encontrado.');
}

archive.finalize();