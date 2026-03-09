/**
 * CA3 Installer — Servidor HTTP del Wizard de Instalación
 * Levanta un servidor local y abre el browser con la UI del instalador.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync, exec, spawn } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const os = require('os');

const PORT = 19876; // Puerto fijo para el wizard
const UI_DIR = path.join(__dirname, 'ui');

// Raíz externa del paquete (donde están app/, database/, etc.)
const ROOT_DIR = process.pkg ? path.dirname(process.execPath) : path.join(__dirname, '..');

// ── Silenciar errores EIO de stdout/stderr ──────────────────────────────────
// En Windows 8.1/Server 2012, el pipe del console colapsa al escribir muchos
// mensajes rápido (e.g. durante aplicación de 94 SPs). Sin esto, Node crashea.
if (process.stdout && typeof process.stdout.on === 'function') {
    process.stdout.on('error', (err) => { if (err.code === 'EIO') return; });
}
if (process.stderr && typeof process.stderr.on === 'function') {
    process.stderr.on('error', (err) => { if (err.code === 'EIO') return; });
}

// ── Referencia global al estado de la instalación ──────────────────────────
let installState = {
    step: 'idle',
    dbConfig: null,
    appConfig: null,
    analysis: null,
    logs: [],
    progress: 0,
    error: null,
};

function log(msg) {
    const line = `[${new Date().toISOString()}] ${msg}`;
    installState.logs.push(line);
    // Usar write directo para evitar el crash EIO en consolas de Windows 8.1
    try { process.stdout.write(line + '\n'); } catch (_) { }
}

// ── Servir archivos estáticos de la UI ────────────────────────────────────
const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.ico': 'image/x-icon',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
};

function serveFile(res, filePath) {
    const ext = path.extname(filePath);
    const mime = MIME[ext] || 'application/octet-stream';
    if (fs.existsSync(filePath)) {
        res.writeHead(200, { 'Content-Type': mime });
        fs.createReadStream(filePath).pipe(res);
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
}

// ── Rutas de la API del wizard ────────────────────────────────────────────
async function handleAPI(req, res) {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const endpoint = url.pathname;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    let body = '';
    if (req.method === 'POST') {
        await new Promise(resolve => {
            req.on('data', chunk => { body += chunk; });
            req.on('end', resolve);
        });
    }

    try {
        // ── GET /api/version ──────────────────────────────────────────────────
        if (endpoint === '/api/version' && req.method === 'GET') {
            let version = '0.0.0';
            const vFile = path.join(ROOT_DIR, 'database', 'version.json');
            if (fs.existsSync(vFile)) {
                try { version = JSON.parse(fs.readFileSync(vFile, 'utf8')).version || '0.0.0'; } catch (_) { }
            }
            res.writeHead(200);
            return res.end(JSON.stringify({ version }));
        }

        // ── GET /api/registry-info ────────────────────────────────────────────
        if (endpoint === '/api/registry-info' && req.method === 'GET') {
            try {
                // Leer el registro usando PowerShell y devolver texto plano para evitar escape JSON
                const ps = `
                    $key = 'HKCU:\\Software\\CA3_System';
                    if (Test-Path $key) {
                        $dir = (Get-ItemProperty -Path $key -Name 'InstallDir' -ErrorAction SilentlyContinue).InstallDir;
                        if ($dir) { Write-Output $dir };
                    }
                `;
                const result = execSync(`powershell -NoProfile -Command "${ps.replace(/\n/g, ' ')}"`, { timeout: 10000 }).toString().trim();
                const data = result ? { InstallDir: result } : {};
                res.writeHead(200);
                return res.end(JSON.stringify({ ok: true, data }));
            } catch (err) {
                res.writeHead(200);
                return res.end(JSON.stringify({ ok: false, error: err.message }));
            }
        }

        // ── POST /api/list-dir (Para el explorador HTML hecho en casa) ──────────
        if (endpoint === '/api/list-dir' && req.method === 'POST') {
            const { lookupPath } = JSON.parse(body || '{}');
            try {
                let dirs = [];
                if (!lookupPath) {
                    // Devolver unidades lógicas (C:\, D:\, etc) individuales
                    const ps = "(Get-PSDrive -PSProvider FileSystem).Root";
                    const output = execSync(`powershell -NoProfile -Command "${ps}"`, { timeout: 10000 }).toString().trim();
                    const drives = output.split(/\r?\n/);
                    dirs = drives.map(d => d.trim()).filter(Boolean).map(d => ({ name: d, path: d, isDrive: true }));
                } else {
                    const items = fs.readdirSync(lookupPath, { withFileTypes: true });
                    dirs = items
                        .filter(i => i.isDirectory() && !i.name.startsWith('$') && !i.name.toLowerCase().includes('system volume'))
                        .map(i => {
                            const p = path.join(lookupPath, i.name);
                            let isCA3 = false;
                            try {
                                if (fs.existsSync(path.join(p, '.env')) && fs.existsSync(path.join(p, 'installer'))) {
                                    isCA3 = true;
                                }
                            } catch (_) { }
                            return { name: i.name, path: p, isCA3 };
                        });
                }
                res.writeHead(200);
                return res.end(JSON.stringify({ ok: true, lookupPath: lookupPath || '', dirs }));
            } catch (err) {
                res.writeHead(200);
                return res.end(JSON.stringify({ ok: false, error: err.message }));
            }
        }

        // ── POST /api/pick-folder ─────────────────────────────────────────────
        if (endpoint === '/api/pick-folder' && req.method === 'POST') {
            const { initialPath } = JSON.parse(body || '{}');
            try {
                // BUGFIX: NO escapar las barras inclinadas. PowerShell con comillas simples trata C:\ como C:\
                // Escapar barras dobles generaba C:\\CA3, y OpenFileDialog caía a Mis Documentos por ruta inválida.
                const safeInit = (initialPath && fs.existsSync(initialPath))
                    ? initialPath.trim().replace(/'/g, "''") : '';

                const ps = [
                    `Add-Type -AssemblyName System.Windows.Forms | Out-Null;`,
                    `$f = New-Object System.Windows.Forms.OpenFileDialog;`,
                    `$f.Title = 'Seleccione la carpeta de instalacion de Control de Asistencia';`,
                    `$f.Filter = 'Carpetas|*.none';`,
                    `$f.CheckFileExists = $false;`,
                    `$f.CheckPathExists = $false;`,
                    `$f.FileName = 'Seleccione_Carpeta';`,
                    `$f.ValidateNames = $false;`,
                    safeInit ? `[System.Environment]::CurrentDirectory = '${safeInit}'; $f.InitialDirectory = '${safeInit}';` : '',
                    `if ($f.ShowDialog() -eq 'OK') { Write-Output ([System.IO.Path]::GetDirectoryName($f.FileName)) } else { Write-Output '' }`
                ].filter(Boolean).join(' ');

                // CRÍTICO: -Sta previene crashes de hilos COM en fondo
                const selected = execSync(`powershell -Sta -NoProfile -Command "${ps}"`, { timeout: 60000 }).toString().trim();
                res.writeHead(200);
                return res.end(JSON.stringify({ ok: true, folderPath: selected || null }));
            } catch (err) {
                res.writeHead(200);
                return res.end(JSON.stringify({ ok: false, error: err.message }));
            }
        }

        // ── POST /api/detect-install ──────────────────────────────────────────
        // Detecta si una carpeta ya tiene el sistema instalado (más robusto que solo buscar .env)
        if (endpoint === '/api/detect-install' && req.method === 'POST') {
            const { folderPath } = JSON.parse(body || '{}');
            if (!folderPath) { res.writeHead(400); return res.end(JSON.stringify({ ok: false })); }

            // ── Señales que indican instalación existente ─────────────────────
            const signatures = [
                { path: path.join(folderPath, 'api-asistencia', 'dist', 'index.js'), weight: 3 },
                { path: path.join(folderPath, 'api-asistencia', '.env'), weight: 3 },
                { path: path.join(folderPath, 'api-asistencia', 'package.json'), weight: 2 },
                { path: path.join(folderPath, 'api-asistencia'), weight: 1 },
                { path: path.join(folderPath, 'frontend-asistencia', 'index.html'), weight: 2 },
                { path: path.join(folderPath, 'frontend-asistencia'), weight: 1 },
                // Estructura antigua (por compatibilidad)
                { path: path.join(folderPath, '.env'), weight: 2 },
                { path: path.join(folderPath, 'api', '.env'), weight: 2 },
            ];
            let score = 0;
            for (const s of signatures) {
                if (fs.existsSync(s.path)) score += s.weight;
            }
            const installed = score >= 3; // Umbral razonable

            // ── Si parece instalado, intentar leer el .env ────────────────────
            let env = null, envPath = null;
            const envCandidates = [
                path.join(folderPath, 'api-asistencia', '.env'),
                path.join(folderPath, '.env'),
                path.join(folderPath, 'api', '.env'),
            ];
            for (const p of envCandidates) {
                if (fs.existsSync(p)) {
                    try {
                        const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
                        const vars = {};
                        for (const line of lines) {
                            const t = line.trim();
                            if (!t || t.startsWith('#')) continue;
                            const idx = t.indexOf('=');
                            if (idx === -1) continue;
                            vars[t.slice(0, idx).trim()] = t.slice(idx + 1).trim();
                        }
                        env = {
                            DB_SERVER: vars.DB_SERVER || vars.DB_HOST || '',
                            DB_PORT: vars.DB_PORT || '1433',
                            DB_DATABASE: vars.DB_DATABASE || vars.DB_NAME || '',
                            DB_USER: vars.DB_USER || vars.DB_USERNAME || '',
                            DB_PASSWORD: vars.DB_PASSWORD || '',
                            API_PORT: vars.PORT || vars.API_PORT || '3001',
                            JWT_SECRET: vars.JWT_SECRET || '',
                            INSTALL_DIR: folderPath,
                        };
                        envPath = p;
                        break;
                    } catch (_) { }
                }
            }

            res.writeHead(200);
            return res.end(JSON.stringify({ ok: true, installed, score, env, envPath }));
        }

        // ── POST /api/read-env (mantenido para compatibilidad, delega a detect-install) ──
        if (endpoint === '/api/read-env' && req.method === 'POST') {
            const { folderPath } = JSON.parse(body || '{}');
            if (!folderPath) { res.writeHead(400); return res.end(JSON.stringify({ ok: false })); }
            const candidates = [
                path.join(folderPath, 'api-asistencia', '.env'),
                path.join(folderPath, '.env'),
                path.join(folderPath, 'api', '.env'),
            ];
            let found = null;
            for (const p of candidates) { if (fs.existsSync(p)) { found = p; break; } }
            if (!found) {
                res.writeHead(200);
                return res.end(JSON.stringify({ ok: false, message: 'Sin instalación previa en esta carpeta.' }));
            }
            const lines = fs.readFileSync(found, 'utf8').split(/\r?\n/);
            const vars = {};
            for (const line of lines) {
                const t = line.trim();
                if (!t || t.startsWith('#')) continue;
                const idx = t.indexOf('=');
                if (idx === -1) continue;
                vars[t.slice(0, idx).trim()] = t.slice(idx + 1).trim();
            }
            res.writeHead(200);
            return res.end(JSON.stringify({
                ok: true,
                envPath: found,
                env: {
                    DB_SERVER: vars.DB_SERVER || vars.DB_HOST || '',
                    DB_PORT: vars.DB_PORT || '1433',
                    DB_DATABASE: vars.DB_DATABASE || vars.DB_NAME || '',
                    DB_USER: vars.DB_USER || vars.DB_USERNAME || '',
                    DB_PASSWORD: vars.DB_PASSWORD || '',
                    API_PORT: vars.PORT || vars.API_PORT || '3001',
                    JWT_SECRET: vars.JWT_SECRET || '',
                    INSTALL_DIR: folderPath,
                },
            }));
        }

        // ── GET /api/status ───────────────────────────────────────────────────
        if (endpoint === '/api/status' && req.method === 'GET') {
            res.writeHead(200);
            return res.end(JSON.stringify({ ok: true, state: installState }));
        }


        // ── POST /api/test-db ─────────────────────────────────────────────────
        if (endpoint === '/api/test-db' && req.method === 'POST') {
            const cfg = JSON.parse(body);
            const { testConnection } = require('./steps/db-analyzer');
            const result = await testConnection(cfg);
            installState.dbConfig = result.ok ? cfg : null;
            res.writeHead(200);
            return res.end(JSON.stringify(result));
        }

        // ── POST /api/analyze ─────────────────────────────────────────────────
        if (endpoint === '/api/analyze' && req.method === 'POST') {
            const cfg = JSON.parse(body);
            installState.dbConfig = cfg;
            installState.step = 'analyzing';
            log('Iniciando análisis de base de datos...');
            const { analyzeDatabase, checkSystemRequirements } = require('./steps/db-analyzer');

            const sysReq = await checkSystemRequirements();
            if (!sysReq.ok) log(`⚠️ AVISO: ${sysReq.message}`);

            const analysis = await analyzeDatabase(cfg, ROOT_DIR);
            installState.analysis = analysis;
            installState.step = 'analyzed';
            log(`Análisis completo: ${analysis.tablesToCreate.length} tablas, ${analysis.columnsToAdd.length} columnas, ${analysis.spsToApply.length} procedimientos.`);
            res.writeHead(200);
            return res.end(JSON.stringify({ ok: true, analysis }));
        }

        // ── POST /api/install ─────────────────────────────────────────────────
        if (endpoint === '/api/install' && req.method === 'POST') {
            const { appConfig } = JSON.parse(body);
            installState.appConfig = appConfig;
            installState.step = 'installing';
            installState.progress = 0;
            installState.error = null;

            // Lanzamos la instalación en background para que el request no bloquee
            setImmediate(async () => {
                try {
                    const { applyDatabase } = require('./steps/db-apply');
                    const { seedDatabase } = require('./steps/db-seed');
                    const { installFiles } = require('./steps/file-installer');
                    const { setupLauncher } = require('./steps/launcher-setup');

                    log('== PASO 1/4: Aplicando estructura de base de datos ==');
                    await applyDatabase(installState.dbConfig, installState.analysis, ROOT_DIR, log, (p) => { installState.progress = p * 0.3; });

                    log('== PASO 1.5/4: Sembrando datos iniciales (Data Seeder) ==');
                    await seedDatabase(installState.dbConfig, ROOT_DIR, log);
                    installState.progress = 40;

                    log('== PASO 2/4: Instalando archivos de la aplicación ==');
                    await installFiles(appConfig, ROOT_DIR, log, (p) => { installState.progress = 40 + p * 0.3; });

                    log('== PASO 3/4: Entorno API autoconfigurable ==');
                    installState.progress = 75;

                    log('== PASO 4/4: Configurando inicio automático ==');
                    await setupLauncher(appConfig, ROOT_DIR, log);
                    installState.progress = 100;
                    installState.step = 'done';
                    log('✅ INSTALACIÓN COMPLETADA');
                } catch (err) {
                    installState.step = 'error';
                    installState.error = err.message;
                    log(`❌ ERROR: ${err.message}`);
                    // Escribir log de error
                    const logDir = path.join(ROOT_DIR, 'logs');
                    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
                    const logFile = path.join(logDir, `install-${Date.now()}.log`);
                    fs.writeFileSync(logFile, installState.logs.join('\n'), 'utf8');
                    log(`Log de error guardado en: ${logFile}`);
                }
            });

            res.writeHead(200);
            return res.end(JSON.stringify({ ok: true, message: 'Instalación iniciada' }));
        }

        // ── POST /api/start-launcher ──────────────────────────────────────────
        if (endpoint === '/api/start-launcher' && req.method === 'POST') {
            const installBase = (installState.appConfig?.INSTALL_DIR || path.join(ROOT_DIR, 'app')).trim();
            const launcherVbs = path.join(installBase, 'api-asistencia', 'launcher', 'CA3-Launcher.vbs');
            if (fs.existsSync(launcherVbs)) {
                log('Empezando Launcher silenciosamente...');
                // detached: true y unref() para que subprocess no bloquee a Node
                const subprocess = spawn('wscript.exe', [`"${launcherVbs}"`], {
                    detached: true,
                    stdio: 'ignore',
                    windowsVerbatimArguments: true
                });
                subprocess.unref();
            } else {
                log('⚠️ No se pudo iniciar el launcher automáticamente.');
            }
            res.writeHead(200);
            return res.end(JSON.stringify({ ok: true }));
        }

        // ── POST /api/open-url ────────────────────────────────────────────────
        if (endpoint === '/api/open-url' && req.method === 'POST') {
            const port = installState.appConfig?.API_PORT || 3001;
            exec(`start http://localhost:${port}`);
            res.writeHead(200);
            return res.end(JSON.stringify({ ok: true }));
        }

        // ── POST /api/finish ──────────────────────────────────────────────────
        if (endpoint === '/api/finish' && req.method === 'POST') {
            log('Finalizando instalación...');
            const installBase = (installState.appConfig?.INSTALL_DIR || path.join(__dirname, '..', 'app')).trim();
            try {
                let pkgVersion = '1.0.0'; // Default version
                const vFile = path.join(installBase, 'database', 'version.json'); // Correct path for version.json
                if (fs.existsSync(vFile)) {
                    try { pkgVersion = JSON.parse(fs.readFileSync(vFile, 'utf8')).version || '0.0.0'; } catch (_) { }
                }
                const regKey = 'HKCU\\Software\\CA3_System';
                execSync(`reg add "${regKey}" /v "InstallDir" /t REG_SZ /d "${installBase.replace(/"/g, '\\"')}" /f`, { stdio: 'ignore' });
                execSync(`reg add "${regKey}" /v "Version" /t REG_SZ /d "${pkgVersion}" /f`, { stdio: 'ignore' });
                log('✅ Rutas de instalación guardadas en el registro de Windows.');
            } catch (err) {
                log(`⚠️  No se pudo guardar la info en el registro: ${err.message}`);
            }

            // Dar 1s y cerrar el servidor
            setTimeout(() => {
                log('Cerrando wizard de instalación.');
                process.exit(0);
            }, 1000); // Changed to 1000ms as per user's snippet
            res.writeHead(200);
            return res.end(JSON.stringify({ ok: true }));
        }

        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Endpoint no encontrado' }));

    } catch (err) {
        log(`Error en API [${endpoint}]: ${err.message}`);
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
    }
}

// ── Servidor principal ───────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    if (url.pathname.startsWith('/api/')) {
        return handleAPI(req, res);
    }

    // Serve UI estática
    let filePath = path.join(UI_DIR, url.pathname === '/' ? 'index.html' : url.pathname);
    serveFile(res, filePath);
});

server.listen(PORT, '127.0.0.1', () => {
    const wizardUrl = `http://localhost:${PORT}`;
    console.log(`\n🚀 CA3 Installer iniciado en ${wizardUrl}\n`);
    // Abrir el browser
    try {
        const openMod = require('open');
        if (typeof openMod === 'function') {
            openMod(wizardUrl);
        } else if (openMod && typeof openMod.default === 'function') {
            openMod.default(wizardUrl);
        } else {
            exec(`start ${wizardUrl}`);
        }
    } catch {
        exec(`start ${wizardUrl}`);
    }
});

server.on('error', (err) => {
    console.error(`\n❌ Error al iniciar el servidor del wizard: ${err.message}`);
    if (err.code === 'EADDRINUSE') {
        console.error(`El puerto ${PORT} ya está en uso. Cierra otras instancias del instalador.`);
    }
    process.exit(1);
});
