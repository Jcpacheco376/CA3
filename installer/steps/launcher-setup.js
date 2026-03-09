/**
 * launcher-setup.js — Configura el systray launcher para iniciar con Windows.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Raíz del paquete instalador
const PKG_ROOT = (process.pkg)
    ? path.dirname(process.execPath)
    : path.join(__dirname, '..', '..');

async function setupLauncher(appConfig, baseDir, log) {
    // Respetar INSTALL_DIR igual que file-installer
    const installBase = (appConfig.INSTALL_DIR && appConfig.INSTALL_DIR.trim())
        ? appConfig.INSTALL_DIR.trim()
        : path.join(PKG_ROOT, 'app');

    const apiDir = path.join(installBase, 'api-asistencia');
    const launcherSrc = path.join(PKG_ROOT, 'launcher');
    const launcherDst = path.join(apiDir, 'launcher');

    // ── Copiar archivos del launcher ─────────────────────────────────────
    if (!fs.existsSync(launcherSrc)) {
        log('⚠️ Carpeta launcher/ no encontrada en el paquete. El inicio automático no se configurará.');
        return;
    }

    copyDirSync(launcherSrc, launcherDst);
    log('✅ Gestor de servicio copiado.');

    // ── Instalar dependencias del launcher ────────────────────────────────
    const launcherNodeModules = path.join(launcherDst, 'node_modules');
    if (!fs.existsSync(launcherNodeModules)) {
        try {
            log('Instalando dependencias del gestor de servicio...');
            execSync('npm install --production', { cwd: launcherDst, stdio: ['ignore', 'ignore', 'ignore'] });
            log('✅ Dependencias instaladas.');
        } catch (err) {
            log(`⚠️ No se pudieron instalar las dependencias del gestor: ${err.message}`);
        }
    } else {
        log('✅ Dependencias del gestor ya incluidas en el paquete.');
    }

    // ── Escribir configuración del launcher ───────────────────────────────
    const launcherConfig = {
        apiDir: apiDir,
        apiPort: appConfig.API_PORT || 3001,
        autoRestart: true,
        maxRestarts: 5,
        restartDelay: 3000,
    };
    fs.writeFileSync(
        path.join(launcherDst, 'launcher-config.json'),
        JSON.stringify(launcherConfig, null, 2),
        'utf8'
    );
    log('✅ Configuración del gestor guardada.');

    // ── Crear .vbs wrapper para evitar ventana de CMD ───────────────────────
    // IMPORTANTE: Si corremos como instalar.exe (pkg), process.execPath es el instalador.
    // El launcher (como es un .js) requiere un node.exe real. Intentamos encontrarlo.
    let nodeEngine = 'node';
    try {
        const found = execSync('where node', { encoding: 'utf8' }).split('\r\n')[0].trim();
        if (found && fs.existsSync(found)) {
            nodeEngine = found;
        }
    } catch (_) {
        // Si 'where' falla, confiamos en 'node' global (si está en PATH)
    }

    const launcherJs = path.join(launcherDst, 'ca3-launcher.js');
    const launcherVbs = path.join(launcherDst, 'CA3-Launcher.vbs');

    // Un VBScript permite ejecutar un comando completamente oculto (WindowStyle 0)
    const vbsContent = [
        'Set oShell = CreateObject("WScript.Shell")',
        `oShell.Run """" & "${nodeEngine}" & """ """ & "${launcherJs}" & """", 0, False`
    ].join('\r\n');

    fs.writeFileSync(launcherVbs, vbsContent, 'utf8');
    log('✅ Acceso directo de inicio silencioso creado (CA3-Launcher.vbs).');

    // Mantenemos un .bat también por compatibilidad
    const launcherBat = path.join(launcherDst, 'CA3-Launcher.bat');
    const launcherBatContent = [
        '@echo off',
        ':: CA3 - Gestor de Servicio',
        `wscript.exe "${launcherVbs}"`,
    ].join('\r\n');
    fs.writeFileSync(launcherBat, launcherBatContent, 'ascii');

    // ── Registrar el .vbs en inicio de Windows (HKCU) ────────────────────
    const runValue = `wscript.exe "${launcherVbs}"`;
    try {
        const regCmd = `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "CA3-Asistencia" /t REG_SZ /d "${runValue.replace(/"/g, '\\"')}" /f`;
        execSync(regCmd, { stdio: 'ignore' });
        log('✅ Inicio automático con Windows configurado.');
    } catch (err) {
        log(`⚠️ No se pudo configurar el inicio automático: ${err.message}`);
    }

    log(`ℹ️ Para iniciar manualmente: ${launcherBat}`);
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

module.exports = { setupLauncher };
