/**
 * ca3-launcher.js — Gestor de Servicio CA3 (System Tray)
 * Compatible con systray2 v2.x (API: item.click, .ready() promise, icono .ico)
 *
 * Funcionalidades:
 *  - Inicia la API automáticamente al arrancar Windows
 *  - Ícono en el área de notificaciones
 *  - Menú contextual: Abrir, Detener/Iniciar, Reiniciar, Ver Logs, Salir
 *  - Auto-reinicio si la API cae inesperadamente
 *  - Detecta puerto ocupado y lo libera antes de iniciar
 *  - Fallback a modo consola si systray2 no está disponible
 */
'use strict';

const path = require('path');
const fs = require('fs');
const { spawn, exec, execSync } = require('child_process');
const net = require('net');

// ── Configuración ──────────────────────────────────────────────────────────
const CONFIG_FILE = path.join(__dirname, 'launcher-config.json');
let config = {
    apiDir: path.join(__dirname, '..'),
    apiPort: 3001,
    autoRestart: true,
    maxRestarts: 5,
    restartDelay: 3000,
};
try {
    if (fs.existsSync(CONFIG_FILE)) {
        config = { ...config, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) };
    }
} catch (_) { }

const API_MAIN = path.join(config.apiDir, 'dist', 'index.js');
const LOG_FILE = path.join(config.apiDir, 'logs', 'ca3-api.log');
const ICO_FILE = path.join(__dirname, 'ca3.ico');
const APP_URL = `http://localhost:${config.apiPort}`;

// Asegurar carpeta de logs
const logDir = path.join(config.apiDir, 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

// ── Log ────────────────────────────────────────────────────────────────────
function appendLog(msg) {
    try {
        const line = `[${new Date().toISOString()}] ${msg}\n`;
        fs.appendFileSync(LOG_FILE, line, 'utf8');
        console.log(msg);
    } catch (_) { }
}

// ── Verificar si el puerto está en uso ─────────────────────────────────────
function isPortInUse(port) {
    return new Promise((resolve) => {
        const srv = net.createServer();
        srv.once('error', (e) => resolve(e.code === 'EADDRINUSE'));
        srv.once('listening', () => { srv.close(); resolve(false); });
        srv.listen(port, '127.0.0.1');
    });
}

// ── Liberar el puerto matando el proceso que lo ocupa (Windows) ────────────
async function freePort(port) {
    try {
        const out = execSync('netstat -ano -p TCP', { timeout: 5000 }).toString();
        for (const line of out.split('\n')) {
            if (line.includes(`:${port} `) && line.includes('LISTENING')) {
                const parts = line.trim().split(/\s+/);
                const pid = parts[parts.length - 1];
                if (pid && pid !== '0') {
                    appendLog(`Puerto ${config.apiPort} ocupado por PID ${pid}. Liberando...`);
                    execSync(`taskkill /PID ${pid} /F`, { timeout: 5000 });
                    await new Promise(r => setTimeout(r, 1500));
                    return;
                }
            }
        }
    } catch (_) { }
}

// ── Estado del proceso ─────────────────────────────────────────────────────
let apiProcess = null;
let systray = null;
let restartCount = 0;
let manualStop = false;

function isRunning() { return apiProcess !== null; }

// ── Control del proceso API ─────────────────────────────────────────────────
async function startAPI() {
    if (apiProcess) return;

    if (!fs.existsSync(API_MAIN)) {
        appendLog(`Error: no se encontro el servidor en: ${API_MAIN}`);
        appendLog('Verifique que la instalacion este completa.');
        return;
    }

    const busy = await isPortInUse(config.apiPort);
    if (busy) await freePort(config.apiPort);

    manualStop = false;

    // Node v22: usar openSync para obtener fd real (WriteStream tiene fd:null hasta 'open')
    let logFd = 'ignore';
    try { logFd = fs.openSync(LOG_FILE, 'a'); } catch (_) { }

    apiProcess = spawn(process.execPath, [API_MAIN], {
        cwd: config.apiDir,
        detached: false,
        stdio: ['ignore', logFd, logFd],
        env: { ...process.env },
    });

    apiProcess.on('exit', (code) => {
        if (typeof logFd === 'number') { try { fs.closeSync(logFd); } catch (_) { } }
        appendLog(`API detenida (codigo ${code}).`);
        apiProcess = null;
        updateMenuItems();

        if (!manualStop && config.autoRestart && restartCount < config.maxRestarts) {
            restartCount++;
            appendLog(`Auto-reiniciando en ${config.restartDelay / 1000}s... (${restartCount}/${config.maxRestarts})`);
            setTimeout(startAPI, config.restartDelay);
        } else if (restartCount >= config.maxRestarts) {
            appendLog('Limite de reinicios alcanzado. Use el menu para iniciar manualmente.');
            restartCount = 0;
        }
    });

    apiProcess.on('error', (err) => {
        if (typeof logFd === 'number') { try { fs.closeSync(logFd); } catch (_) { } }
        appendLog(`Error al iniciar API: ${err.message}`);
        apiProcess = null;
        updateMenuItems();
    });

    restartCount = 0;
    appendLog(`API iniciada (PID=${apiProcess.pid}) en ${APP_URL}`);
    updateMenuItems();

    // Abrir navegador la primera vez
    setTimeout(() => exec(`start ${APP_URL}`), 2500);
}

function stopAPI() {
    manualStop = true;
    if (!apiProcess) return;
    try { apiProcess.kill('SIGTERM'); } catch (_) { }
    apiProcess = null;
    appendLog('API detenida manualmente.');
    updateMenuItems();
}

async function restartAPI() {
    appendLog('Reiniciando API...');
    manualStop = true;
    if (apiProcess) { try { apiProcess.kill('SIGTERM'); } catch (_) { } apiProcess = null; }
    await new Promise(r => setTimeout(r, 1200));
    if (await isPortInUse(config.apiPort)) await freePort(config.apiPort);
    manualStop = false;
    startAPI();
}

// ── Actualizar texto/icono del menú según estado ───────────────────────────
function updateMenuItems() {
    if (!systray || !toggleItem) return;
    try {
        toggleItem.title = isRunning() ? 'Detener API' : 'Iniciar API';
        systray.sendAction({ type: 'update-item', item: toggleItem });
        systray.sendAction({
            type: 'update-tooltip',
            tooltip: `Control de Asistencia | ${isRunning() ? 'Activo' : 'Detenido'} | ${APP_URL}`,
        });
    } catch (_) { }
}

// ── Items del menú (la API v2.x usa funciones click en cada item) ──────────
let toggleItem;

function buildMenu() {
    const SysTray = require('systray2').default;

    toggleItem = {
        title: 'Iniciar API',
        tooltip: 'Iniciar o detener el servidor',
        checked: false,
        enabled: true,
        click: () => { isRunning() ? stopAPI() : startAPI(); },
    };

    const menu = {
        icon: fs.existsSync(ICO_FILE) ? fs.readFileSync(ICO_FILE).toString('base64') : '',
        isTemplateIcon: false,
        title: 'CA3',
        tooltip: `Control de Asistencia | ${APP_URL}`,
        items: [
            {
                title: 'Abrir en Navegador',
                tooltip: 'Abrir el sistema en el navegador',
                checked: false, enabled: true,
                click: () => exec(`start ${APP_URL}`),
            },
            toggleItem,
            {
                title: 'Reiniciar API',
                tooltip: 'Reiniciar el servidor de la aplicacion',
                checked: false, enabled: true,
                click: () => restartAPI(),
            },
            SysTray.separator,
            {
                title: 'Ver Registro de Eventos',
                tooltip: 'Abrir el archivo de log',
                checked: false, enabled: true,
                click: () => exec(`start "" "${LOG_FILE}"`),
            },
            SysTray.separator,
            {
                title: 'Salir',
                tooltip: 'Detener API y cerrar el gestor',
                checked: false, enabled: true,
                click: () => {
                    stopAPI();
                    systray.kill(false);
                    process.exit(0);
                },
            },
        ],
    };

    systray = new SysTray({ menu, debug: false, copyDir: true });

    // En v2.x el click de cada item se llama directamente
    systray.onClick((action) => {
        if (action.item && typeof action.item.click === 'function') {
            action.item.click();
        }
    });

    // .ready() es una Promise en v2.x
    systray.ready().then(() => {
        appendLog('=== CA3 Launcher listo ===');
        startAPI();
    }).catch((err) => {
        appendLog(`Error al iniciar systray: ${err.message}`);
        appendLog('Iniciando en modo consola...');
        startAPI();
    });
}

// ── Main ───────────────────────────────────────────────────────────────────
appendLog('=== Iniciando CA3 Launcher ===');

try {
    buildMenu();
} catch (err) {
    appendLog(`systray2 no disponible (${err.message}). Iniciando en modo consola.`);
    appendLog(`El servidor seguira corriendo; cierre esta ventana para detenerlo.`);
    startAPI();
}

process.on('SIGINT', () => { stopAPI(); process.exit(0); });
process.on('SIGTERM', () => { stopAPI(); process.exit(0); });
