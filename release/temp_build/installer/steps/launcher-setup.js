/**
 * launcher-setup.js — Configura el systray launcher para iniciar con Windows.
 *
 * Copia el launcher a INSTALL_DIR/api-asistencia/launcher/ y lo registra
 * en el Registro de Windows usando un .bat wrapper (evita el error de WSH
 * que ocurre cuando Windows ejecuta .js con wscript en vez de node).
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const util = require('util');
const execAsync = util.promisify(require('child_process').exec);

// Raíz del paquete instalador
const PKG_ROOT = path.join(__dirname, '..', '..');

async function setupLauncher(appConfig, installerDir, log) {
    // Respetar INSTALL_DIR igual que file-installer
    const installBase = (appConfig.INSTALL_DIR && appConfig.INSTALL_DIR.trim())
        ? appConfig.INSTALL_DIR.trim()
        : path.join(PKG_ROOT, 'app');

    const apiDir = path.join(installBase, 'api-asistencia');
    const launcherSrc = path.join(PKG_ROOT, 'launcher');
    const launcherDst = path.join(apiDir, 'launcher');

    // ── Limpiar carpeta launcher anterior para eliminar .exe viejos ──────
    // Evitar que Windows la bloquee si el proceso está corriendo
    try { execSync('taskkill /F /IM CA3-Launcher.exe', { stdio: 'ignore' }); } catch (_) { }
    try { execSync('taskkill /F /FI "WINDOWTITLE eq CA3 - Gestor de Servicio"', { stdio: 'ignore' }); } catch (_) { }

    if (fs.existsSync(launcherDst)) {
        try { fs.rmSync(launcherDst, { recursive: true, force: true }); } catch (_) { }
    }

    copyDirSync(launcherSrc, launcherDst);
    log('✅ Gestor de servicio copiado.');

    // ── Instalar dependencias del launcher ────────────────────────────────
    const launcherNodeModules = path.join(launcherDst, 'node_modules');
    if (!fs.existsSync(launcherNodeModules)) {
        log('Instalando dependencias del gestor de servicio...');
        try {
            await execAsync('npm install --omit=dev', { cwd: launcherDst });
            log('✅ Dependencias instaladas.');
        } catch (err) {
            log(`⚠️  Error instalando dependencias del gestor: ${err.message}`);
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
    const nodeExe = process.execPath;
    const launcherJs = path.join(launcherDst, 'ca3-launcher.js');
    const launcherVbs = path.join(launcherDst, 'CA3-Launcher.vbs');

    // Un VBScript permite ejecutar el .js con Node pero completamente oculto (WindowStyle 0)
    const vbsContent = [
        'Set oShell = CreateObject("WScript.Shell")',
        `oShell.CurrentDirectory = "${launcherDst}"`,
        `oShell.Run """" & "${nodeExe}" & """ """ & "${launcherJs}" & """", 0, False`
    ].join('\r\n');

    fs.writeFileSync(launcherVbs, vbsContent, 'utf8');
    log('✅ Acceso directo de inicio silencioso creado (CA3-Launcher.vbs).');

    // Mantenemos un .bat también por compatibilidad / uso manual
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
        log(`⚠️  No se pudo configurar el inicio automático: ${err.message}`);
        log('   Puede configurarlo manualmente: ejecute CA3-Launcher.bat al iniciar sesión.');
    }

    log(`ℹ️  Para iniciar manualmente: ${launcherBat}`);
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
