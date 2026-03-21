/**
 * file-installer.js — Instala archivos de la aplicación y genera el .env
 *
 * Pasos:
 *  1. Crear la carpeta de destino (INSTALL_DIR) si no existe
 *  2. Copiar frontend-asistencia/ → INSTALL_DIR/frontend-asistencia/
 *  3. Copiar api-asistencia/      → INSTALL_DIR/api-asistencia/
 *  4. Generar el archivo .env de la API con los datos del wizard
 *  5. Copiar ZkBridge.exe y los DLLs del SDK ZK
 *  6. Registrar los DLLs del SDK ZK con regsvr32
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// Raíz del paquete instalador (donde están las carpetas app/, sdk/, zkbridge/)
const PKG_ROOT = (process.pkg)
    ? path.dirname(process.execPath)
    : path.join(__dirname, '..', '..');

async function installFiles(appConfig, baseDir, log, onProgress) {
    // ── Resolver rutas ───────────────────────────────────────────────────
    // INSTALL_DIR es la carpeta que el usuario eligió en el wizard
    const installBase = (appConfig.INSTALL_DIR && appConfig.INSTALL_DIR.trim())
        ? appConfig.INSTALL_DIR.trim()
        : path.join(PKG_ROOT, 'app');

    const destApiDir = path.join(installBase, 'api-asistencia');
    const destFrontDir = path.join(installBase, 'frontend-asistencia');

    // Fuentes dentro del ZIP/paquete
    const srcApiDir = path.join(PKG_ROOT, 'app', 'api-asistencia');
    const srcFrontDir = path.join(PKG_ROOT, 'app', 'frontend-asistencia');
    const sdkDir = path.join(PKG_ROOT, 'sdk');
    const zkbDir = path.join(PKG_ROOT, 'zkbridge');

    // ── PASO 1: Crear estructura de destino ─────────────────────────────
    log(`Carpeta de instalación: ${installBase}`);
    fs.mkdirSync(destApiDir, { recursive: true });
    fs.mkdirSync(destFrontDir, { recursive: true });
    onProgress(0.05);

    // ── PASO 2: Copiar Frontend ──────────────────────────────────────────
    if (fs.existsSync(srcFrontDir)) {
        log('Copiando archivos del sistema (interfaz web)...');
        copyDirSync(srcFrontDir, destFrontDir);
        log(`✅ Interfaz web copiada a: ${destFrontDir}`);
    } else {
        log('⚠️  No se encontró la carpeta del frontend en el paquete.');
    }
    onProgress(0.25);

    // ── PASO 3: Copiar Backend (API) ────────────────────────────────────
    if (fs.existsSync(srcApiDir)) {
        log('Copiando archivos del servidor (API)...');
        copyDirSync(srcApiDir, destApiDir);
        log(`✅ Servidor copiado a: ${destApiDir}`);

        log('✅ Servidor (EXE) copiado.');
    } else {
        log('⚠️ No se encontró la carpeta de la API en el paquete.');
    }
    onProgress(0.45);

    // ── PASO 4: Generar .env ─────────────────────────────────────────────
    log('Generando archivo de configuración...');
    const localIPs = getLocalIPs();
    const port = appConfig.API_PORT || 3001;
    const allowedOrigins = localIPs.map(ip => `http://${ip}:${port}`).join(',');
    const mainIP = localIPs.find(ip => ip !== 'localhost') || 'localhost';

    let jwtSecret = appConfig.JWT_SECRET;
    if (!jwtSecret) {
        jwtSecret = require('crypto').randomBytes(32).toString('hex');
        log('Clave de seguridad generada automáticamente.');
    }

    const envLines = [
        `DB_SERVER=${appConfig.DB_SERVER}`,
        `DB_USER=${appConfig.DB_USER}`,
        `DB_PASSWORD=${appConfig.DB_PASSWORD}`,
        `DB_DATABASE=${appConfig.DB_DATABASE}`,
        `DB_PORT=${appConfig.DB_PORT || 1433}`,
        `PORT=${port}`,
        `JWT_SECRET=${jwtSecret}`,
        `NODE_ENV=production`,
        `LOCAL_IP=${mainIP}`,
        `ALLOWED_ORIGINS=${allowedOrigins}`,
        `ZK_BRIDGE_PATH=bin/ZkBridge.exe`,
    ].join('\n');

    fs.writeFileSync(path.join(destApiDir, '.env'), envLines, 'utf8');
    log('✅ Configuración guardada.');
    onProgress(0.60);

    // ── PASO 5: Copiar ZkBridge.exe ──────────────────────────────────────
    if (fs.existsSync(zkbDir)) {
        const zkExe = path.join(zkbDir, 'ZkBridge.exe');
        const destBinDir = path.join(destApiDir, 'bin');
        const dest = path.join(destBinDir, 'ZkBridge.exe');

        if (!fs.existsSync(destBinDir)) fs.mkdirSync(destBinDir, { recursive: true });

        if (fs.existsSync(zkExe)) {
            fs.copyFileSync(zkExe, dest);
            // También copiar el config si existe
            const zkConfig = zkExe + '.config';
            if (fs.existsSync(zkConfig)) fs.copyFileSync(zkConfig, dest + '.config');

            log('✅ Módulo de checadores ZK copiado a bin/.');
        } else {
            log('⚠️  Módulo ZkBridge.exe no encontrado en el paquete.');
        }
    }
    onProgress(0.72);

    // ── PASO 6: Copiar y registrar DLLs del SDK ZK ───────────────────────
    if (fs.existsSync(sdkDir)) {
        const sdkDest = path.join(destApiDir, 'sdk');
        copyDirSync(sdkDir, sdkDest);
        log(`✅ Componentes SDK ZK copiados a la carpeta de la API.`);

        // Identificar carpeta de sistema para DLLs
        const isX64 = process.arch === 'x64' || process.env.PROCESSOR_ARCHITECTURE === 'AMD64';
        const systemDir = isX64 ? path.join(process.env.windir, 'SysWOW64') : path.join(process.env.windir, 'System32');

        log(`Instalando componentes en el sistema (${isX64 ? 'x64' : 'x86'})...`);

        try {
            const files = fs.readdirSync(sdkDir);
            const dllFiles = files.filter(f => f.toLowerCase().endsWith('.dll'));

            for (const dll of dllFiles) {
                const srcPath = path.join(sdkDir, dll);
                const destPath = path.join(systemDir, dll);
                try {
                    fs.copyFileSync(srcPath, destPath);
                } catch (err) {
                    log(`  ⚠️  No se pudo copiar ${dll} a ${systemDir}: ${err.message}`);
                }
            }
            log(`✅ DLLs copiadas a ${systemDir}.`);

            const zkemkeeperPath = path.join(systemDir, 'zkemkeeper.dll');
            if (fs.existsSync(zkemkeeperPath)) {
                log('Registrando zkemkeeper.dll...');
                execSync(`regsvr32 /s "${zkemkeeperPath}"`, { stdio: 'ignore' });
                log('✅ zkemkeeper.dll registrado con éxito.');
            } else {
                log('⚠️  No se encontró zkemkeeper.dll en la carpeta del sistema para su registro.');
            }
        } catch (err) {
            log(`❌ Error durante la instalación del SDK: ${err.message}`);
        }
    } else {
        log('⚠️  SDK de checadores ZK no encontrado. El módulo de checadores no estará disponible.');
    }
    onProgress(1.0);
}

// ── Helpers ───────────────────────────────────────────────────────────────

function getLocalIPs() {
    const interfaces = os.networkInterfaces();
    const addresses = ['localhost'];
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) addresses.push(iface.address);
        }
    }
    return addresses;
}

function copyDirSync(src, dest) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
        const srcPath = path.join(src, entry);
        const destPath = path.join(dest, entry);
        const stat = fs.statSync(srcPath);
        if (stat.isDirectory()) {
            copyDirSync(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

module.exports = { installFiles };
