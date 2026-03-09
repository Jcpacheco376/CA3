/* ── CA3 Wizard — Lógica del Instalador v3 (con carpeta de instalación) ──── */
(function () {
    'use strict';

    // ── Pantallas: los índices ahora son 0-7 ──────────────────────────────
    const SCREEN_META = [
        { title: 'Bienvenido', subtitle: 'Sistema de Control de Asistencia' },
        { title: 'Carpeta de Instalación', subtitle: 'Seleccione dónde se instalará el sistema.' },
        { title: 'Conexión a Base de Datos', subtitle: 'Ingrese los datos de su servidor SQL Server.' },
        { title: 'Analizando...', subtitle: 'Comparando el paquete con la instalación actual.' },
        { title: 'Cambios Detectados', subtitle: 'Revise lo que se aplicará en la base de datos.' },
        { title: 'Configuración', subtitle: 'Defina el puerto y seguridad de la aplicación.' },
        { title: 'Instalando', subtitle: 'Por favor espere. No cierre esta ventana.' },
        { title: 'Instalación Completada', subtitle: 'El sistema está listo para usarse.' },
    ];

    const TOTAL_SCREENS = SCREEN_META.length;  // 8

    // ── Estado ────────────────────────────────────────────────────────────
    let currentScreen = 0;
    let installDir = '';    // Carpeta elegida por el usuario
    let loadedEnv = null;  // Vars del .env cargado desde la carpeta
    let dbConfig = {};
    let analysis = null;
    let appConfig = {};
    let pollTimer = null;
    let dbConnected = false;
    let lastLogCount = 0;

    const btnNext = document.getElementById('btn-next');
    const btnBack = document.getElementById('btn-back');
    const logConsole = document.getElementById('log-console');

    // ── Inicialización ────────────────────────────────────────────────────
    async function init() {
        const res = await api('GET', '/api/status');
        if (res && res.state && res.state.step === 'done') { goTo(7); return; }
        // Versión del paquete
        try {
            const vr = await fetch('/api/version');
            if (vr.ok) {
                const { version } = await vr.json();
                const welcomeEl = document.getElementById('welcome-version');
                const sidebarEl = document.getElementById('sidebar-version');
                if (welcomeEl && version) welcomeEl.textContent = `v${version}`;
                if (sidebarEl && version) sidebarEl.textContent = `v${version}`;
            }
        } catch (_) { }

        // Intentar leer la ruta del registro (instalación previa)
        try {
            const regRes = await api('GET', '/api/registry-info');
            if (regRes && regRes.ok && regRes.data && regRes.data.InstallDir) {
                document.getElementById('install-dir').value = regRes.data.InstallDir;
                registryKnownInstallDir = regRes.data.InstallDir; // Guardar valor oficial para Badge
                // Auto-validar la ruta encontrada
                tryInstallDir(regRes.data.InstallDir);
            }
        } catch (_) { }

        // ── Explorador Principal (HTML con Smart Fallback a Nativo) ────────────
        document.getElementById('btn-browse-html').addEventListener('click', openExplorerSmart);
        document.getElementById('fe-close-btn').addEventListener('click', closeHtmlBrowser);
        document.getElementById('fe-cancel-btn').addEventListener('click', closeHtmlBrowser);
        document.getElementById('fe-up-btn').addEventListener('click', () => {
            if (!currentFePath) return;
            // Remover trailing slash y subir
            const parts = currentFePath.replace(/\\$/, '').split('\\');
            if (parts.length > 0) parts.pop();
            const parent = parts.join('\\');
            loadFeDir(parent ? parent + '\\' : '');
        });
        document.getElementById('fe-select-btn').addEventListener('click', async () => {
            if (!currentFePath) return;
            closeHtmlBrowser();
            document.getElementById('install-dir').value = currentFePath;
            installDir = currentFePath;
            await tryInstallDir(currentFePath);
        });

        // Permitir escribir la ruta a mano también
        document.getElementById('install-dir').addEventListener('change', () => {
            const val = document.getElementById('install-dir').value.trim();
            if (val) tryInstallDir(val);
        });

        updateUI();
    }

    // ── Navegación ────────────────────────────────────────────────────────
    function goTo(n) {
        document.getElementById(`screen-${currentScreen}`)?.classList.remove('active');
        const prevStep = document.querySelector(`#step-${currentScreen}`);
        if (prevStep) { prevStep.classList.remove('active'); prevStep.classList.add('done'); }

        currentScreen = n;

        document.getElementById(`screen-${currentScreen}`)?.classList.add('active');
        const nextStep = document.querySelector(`#step-${currentScreen}`);
        if (nextStep) { nextStep.classList.remove('done'); nextStep.classList.add('active'); }

        for (let i = 0; i < currentScreen; i++) document.querySelector(`#step-${i}`)?.classList.add('done');
        for (let i = currentScreen + 1; i < TOTAL_SCREENS; i++) {
            const el = document.querySelector(`#step-${i}`);
            if (el) { el.classList.remove('done'); el.classList.remove('active'); }
        }

        const meta = SCREEN_META[currentScreen];
        if (meta) {
            document.getElementById('main-title').textContent = meta.title;
            document.getElementById('main-subtitle').textContent = meta.subtitle;
        }

        updateUI();

        // Acciones automáticas por pantalla
        if (currentScreen === 3) runAnalysis();
        if (currentScreen === 7) api('POST', '/api/start-launcher');

        const content = document.querySelector('.wizard-content');
        if (content) content.scrollTop = 0;
    }

    function updateUI() {
        // Botón Atrás: visible en 1, 2, 4, 5 — NO en 3 (análisis), 6 (instalando), 7 (listo)
        const backVisible = [1, 2, 4, 5].includes(currentScreen);
        btnBack.style.display = backVisible ? '' : 'none';

        switch (currentScreen) {
            case 0:
                btnNext.innerHTML = 'Comenzar <svg class="btn-icon" viewBox="0 0 20 20"><path d="M8 15l5-5-5-5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
                btnNext.disabled = false; break;
            case 1:
                btnNext.innerHTML = 'Siguiente <svg class="btn-icon" viewBox="0 0 20 20"><path d="M8 15l5-5-5-5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
                btnNext.disabled = !installDir; break;
            case 2:
                btnNext.innerHTML = dbConnected
                    ? 'Siguiente <svg class="btn-icon" viewBox="0 0 20 20"><path d="M8 15l5-5-5-5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>'
                    : 'Probar Conexión';
                btnNext.disabled = false; break;
            case 3:
                btnNext.innerHTML = '<span class="spinner"></span>&nbsp; Analizando...';
                btnNext.disabled = true; break;
            case 4:
                btnNext.innerHTML = 'Continuar <svg class="btn-icon" viewBox="0 0 20 20"><path d="M8 15l5-5-5-5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
                btnNext.disabled = analysis?.versionBlocked || false; break;
            case 5:
                btnNext.innerHTML = 'Instalar Ahora';
                btnNext.disabled = false; break;
            case 6:
                btnNext.innerHTML = '<span class="spinner"></span>&nbsp; Instalando...';
                btnNext.disabled = true; break;
            case 7:
                btnNext.textContent = 'Finalizar';
                btnNext.disabled = false;
                document.getElementById('step7-check').style.display = '';
                document.getElementById('step7-num').style.display = 'none';
                break;
        }

        btnBack.onclick = () => handleBack();
    }

    // ── Botón Atrás ───────────────────────────────────────────────────────
    function handleBack() {
        if (currentScreen === 1) { goTo(0); return; }
        if (currentScreen === 2) { goTo(1); dbConnected = false; return; }  // Volver a carpeta
        if (currentScreen === 3) { goTo(2); dbConnected = false; return; }  // Volver desde Error de Análisis
        if (currentScreen === 4) { goTo(2); dbConnected = false; return; }  // Volver para modificar config BD
        if (currentScreen === 5) { goTo(4); return; }
    }

    // ── Botón Siguiente ───────────────────────────────────────────────────
    btnNext.addEventListener('click', handleNext);

    async function handleNext() {
        switch (currentScreen) {
            case 0: goTo(1); break;
            case 1:
                let currentDir = document.getElementById('install-dir').value.trim();
                if (!currentDir) { showFolderStatus('err', 'Seleccione una carpeta antes de continuar.'); return; }

                btnNext.disabled = true;
                const pathCheck = await api('POST', '/api/list-dir', { lookupPath: currentDir });
                if (!pathCheck || !pathCheck.ok) {
                    showFolderStatus('err', 'La carpeta de instalación especificada no es válida o no existe.');
                    btnNext.disabled = false;
                    return;
                }
                btnNext.disabled = false;

                // Si hay datos cargados del .env, pre-llenar los campos de BD
                if (loadedEnv) prefillDBFields(loadedEnv);
                goTo(2);
                break;
            case 2:
                if (dbConnected) { goTo(3); }
                else { await stepTestDB(); }
                break;
            case 4: goTo(5); break;
            case 5: await stepInstall(); break;
            case 6: goTo(7); break;
            case 7:
                btnNext.disabled = true;
                btnNext.innerHTML = '<span class="spinner"></span>&nbsp; Finalizando...';
                await api('POST', '/api/open-url');
                await api('POST', '/api/finish');
                setTimeout(() => window.close(), 500);
                break;
        }
    }

    // ── File Explorer Modal Logic ─────────────────────────────────────────
    let currentFePath = '';
    let registryKnownInstallDir = '';

    async function openExplorerSmart() {
        const btn = document.getElementById('btn-browse-html');
        btn.disabled = true;
        const ogText = btn.innerHTML;
        btn.innerHTML = '<span class="spinner"></span> &nbsp;Abriendo...';

        const initDir = document.getElementById('install-dir').value.trim();
        let targetDir = initDir || '';

        try {
            // "Pinging" the API to see if it responds fast and correctly
            let testApi = await api('POST', '/api/list-dir', { lookupPath: targetDir });

            if (!testApi || !testApi.ok) {
                // Ruta no existe o inválida. Usar fallback predeterminado seguro.
                targetDir = registryKnownInstallDir || 'C:\\';
                testApi = await api('POST', '/api/list-dir', { lookupPath: targetDir });
                if (!testApi || !testApi.ok) {
                    throw new Error("HTML API Fallo Crítico -> Native Fallback");
                }
            }

            // Si la API respondió bien, abrimos el modal HTML
            document.getElementById('file-explorer-modal').style.display = 'flex';
            await loadFeDir(targetDir);
        } catch (error) {
            console.warn("Iniciando Smart Fallback a Windows Native Picker:", error);
            // El backend no jaló (o está bloqueado o lento). Disparar Fallback Nativo Híbrido
            handleNativeBrowse();
        } finally {
            btn.innerHTML = ogText;
            btn.disabled = false;
        }
    }

    function closeHtmlBrowser() {
        document.getElementById('file-explorer-modal').style.display = 'none';
    }

    function renderBreadcrumbs(pathStr) {
        const bc = document.getElementById('fe-breadcrumbs');
        bc.innerHTML = `
            <div id="fe-bc-hidden-menu" style="display:none; position:absolute; top:calc(100% + 4px); left:0; background:var(--surface); border:1px solid var(--border); box-shadow:var(--shadow-lg); border-radius:var(--r); z-index:100; flex-direction:column; padding:4px; min-width:180px;"></div>
            <button id="fe-bc-more" class="fe-crumb" style="display:none; flex-shrink:0; font-weight:bold; background:none; border:none; margin-right:4px;">«</button>
            <div id="fe-bc-list" style="display:flex; align-items:center; overflow:hidden; flex:1; min-width:0; gap: 4px;"></div>
        `;

        const list = document.getElementById('fe-bc-list');
        const menu = document.getElementById('fe-bc-hidden-menu');
        const btnMore = document.getElementById('fe-bc-more');

        btnMore.onclick = (e) => {
            e.stopPropagation();
            menu.style.display = menu.style.display === 'none' ? 'flex' : 'none';
        };
        // Ocultar al hacer clic fuera
        setTimeout(() => document.addEventListener('click', () => { if (menu) menu.style.display = 'none'; }, { once: true }), 50);

        const wrap = (name, p) => {
            const el = document.createElement('span');
            el.className = 'fe-crumb';
            el.textContent = name;
            el.onclick = () => loadFeDir(p);
            return el;
        };

        const sep = () => {
            const el = document.createElement('span');
            el.className = 'fe-crumb-sep';
            el.textContent = '>';
            return el;
        };

        const allItems = [{ name: 'Este Equipo', path: '' }];

        if (pathStr) {
            let normalized = pathStr.replace(/\\$/, '');
            const parts = normalized.split('\\');
            let currentStr = '';
            for (let i = 0; i < parts.length; i++) {
                currentStr += parts[i] + '\\';
                let isLast = i === parts.length - 1;
                allItems.push({ name: parts[i], path: isLast ? pathStr : currentStr });
            }
        }

        // Render everything first
        allItems.forEach((item, idx) => {
            list.appendChild(wrap(item.name, item.path));
            if (idx < allItems.length - 1) list.appendChild(sep());
        });

        // Smart Truncation
        setTimeout(() => {
            const containerWidth = list.clientWidth;
            let hiddenItems = [];

            while (list.scrollWidth > list.clientWidth && list.children.length > 2) {
                const c = list.firstElementChild; // crumb
                if (!c) break;
                // si es un breadcrumb
                if (c.className === 'fe-crumb') {
                    hiddenItems.push({ name: c.textContent, onclick: c.onclick });
                }
                list.removeChild(c);
            }

            if (hiddenItems.length > 0) {
                btnMore.style.display = 'block';
                // Añadir un poco de espacio extra que ocupó el botón "más", por si fue desbordado
                while (list.scrollWidth > list.clientWidth && list.children.length > 2) {
                    const c = list.firstElementChild; // crumb
                    if (c && c.className === 'fe-crumb') {
                        hiddenItems.push({ name: c.textContent, onclick: c.onclick });
                    }
                    list.removeChild(c);
                }

                // Invertir el orden para que la carpeta más pegada a "Este Equipo" sea primero
                hiddenItems.reverse().forEach(hi => {
                    const mi = document.createElement('div');
                    mi.className = 'fe-item';
                    mi.style.padding = '6px 12px';
                    mi.style.borderBottom = 'none';
                    mi.textContent = hi.name;
                    mi.onclick = hi.onclick;
                    menu.appendChild(mi);
                });
            }
        }, 10);
    }

    async function loadFeDir(pathStr) {
        currentFePath = pathStr;
        renderBreadcrumbs(pathStr);
        const list = document.getElementById('fe-list');
        list.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text3);font-size:.8rem;"><span class="spinner"></span> Cargando...</div>';

        const res = await api('POST', '/api/list-dir', { lookupPath: pathStr });
        if (!res || !res.ok) {
            list.innerHTML = `<div style="padding:24px;text-align:center;color:var(--danger);font-size:.8rem;">Error: ${res?.error || 'Desconocido'}</div>`;
            return;
        }

        list.innerHTML = '';
        if (res.dirs.length === 0) {
            list.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text3);font-size:.8rem;">La carpeta está vacía (sin subcarpetas)</div>';
            return;
        }

        const frag = document.createDocumentFragment();

        // Cache the SVG markup to avoid parsing it n times
        const folderSvg = '<svg class="fe-icon" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/></svg>';
        const driveSvg = '<svg class="fe-icon" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"><line x1="22" y1="12" x2="2" y2="12"></line><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path><line x1="6" y1="16" x2="6.01" y2="16"></line><line x1="10" y1="16" x2="10.01" y2="16"></line></svg>';
        const ca3Badge = '<span style="background:var(--primary); color:white; font-size:0.6rem; padding:2px 6px; border-radius:10px; margin-left:8px; font-weight:bold;">CA3 Instalado</span>';

        for (let i = 0; i < res.dirs.length; i++) {
            const d = res.dirs[i];
            const div = document.createElement('div');

            // Smart CA3 Detection by Registry Known String
            const amIKnown = registryKnownInstallDir && d.path.toLowerCase() === registryKnownInstallDir.toLowerCase();

            div.className = 'fe-item';
            div.innerHTML = `${d.isDrive ? driveSvg : folderSvg} <span style="flex:1;">${d.name}</span> ${amIKnown ? ca3Badge : ''}`;

            // Clic selecciona
            div.onclick = () => {
                const active = list.querySelector('.fe-item.selected');
                if (active) active.classList.remove('selected');
                div.classList.add('selected');
                currentFePath = d.path;
                renderBreadcrumbs(d.path);
            };
            // Doble clic navega dentro
            div.ondblclick = () => {
                if (currentFePath !== d.path) currentFePath = d.path;
                loadFeDir(d.path);
            };
            frag.appendChild(div);
        }

        list.appendChild(frag);
    }

    // ── Paso 1: Examinar carpeta (Variante Nativa de Windows / Smart Fallback) ─────────────
    async function handleNativeBrowse() {
        showFolderStatus('info', 'Fallando a explorador nativo seguro...');
        try {
            const currentPath = document.getElementById('install-dir').value.trim();
            const res = await api('POST', '/api/pick-folder', { initialPath: currentPath });
            if (res && res.ok && res.folderPath) {
                document.getElementById('install-dir').value = res.folderPath;
                installDir = res.folderPath;
                await tryInstallDir(res.folderPath);
            } else if (res && res.ok && !res.folderPath) {
                showFolderStatus('warn', 'Operación cancelada en el explorador de Windows.');
            } else {
                showFolderStatus('err', 'No se pudo abrir el explorador alternativo de Windows.');
            }
        } finally { }
    }

    // Usa /api/detect-install para detectar si la carpeta tiene el sistema instalado
    // y muestra mensajes amigables al usuario según el caso.
    async function tryInstallDir(folderPath) {
        installDir = folderPath;
        const banner = document.getElementById('env-loaded-banner');

        showFolderStatus('info', '<span class="spinner"></span>&nbsp; Verificando carpeta...');

        const res = await api('POST', '/api/detect-install', { folderPath });

        if (!res) {
            showFolderStatus('warn', 'No se pudo verificar la carpeta. Puede continuar manualmente.');
            banner.style.display = 'none';
            return;
        }

        if (res.installed && res.env) {
            // ── Instalación EXISTENTE encontrada ─────────────────────────
            loadedEnv = res.env;
            document.getElementById('pre-db-server').value = res.env.DB_SERVER || '';
            document.getElementById('pre-db-name').value = res.env.DB_DATABASE || '';
            document.getElementById('pre-db-user').value = res.env.DB_USER || '';
            document.getElementById('pre-api-port').value = res.env.API_PORT || '';
            document.getElementById('env-path-hint').textContent = res.envPath || '.env';
            document.getElementById('env-loaded-msg').innerHTML =
                `${checkSVG()} <span>Instalación existente detectada — se actualizará el sistema.</span>`;
            banner.style.display = '';
            showFolderStatus('ok', '✔ Esta carpeta ya tiene el sistema instalado. Se realizará una actualización.');
        } else if (res.installed && !res.env) {
            // ── Archivos detectados pero sin .env legible ─────────────────
            loadedEnv = null;
            banner.style.display = 'none';
            showFolderStatus('warn', '⚠ Se detectaron archivos del sistema pero sin configuración previa. Ingrese los datos manualmente.');
        } else {
            // ── Carpeta nueva / vacía ─────────────────────────────────────
            loadedEnv = null;
            banner.style.display = 'none';
            showFolderStatus('info', 'ℹ Carpeta seleccionada para instalación nueva. El sistema se instalará aquí.');
        }
    }

    // Mantener tryReadEnv como alias por si se usa en otro lugar
    async function tryReadEnv(folderPath) {
        return tryInstallDir(folderPath);
    }

    function prefillDBFields(env) {
        if (env.DB_SERVER) document.getElementById('db-server').value = env.DB_SERVER;
        if (env.DB_PORT) document.getElementById('db-port').value = env.DB_PORT;
        if (env.DB_DATABASE) document.getElementById('db-name').value = env.DB_DATABASE;
        if (env.DB_USER) document.getElementById('db-user').value = env.DB_USER;
        if (env.DB_PASSWORD) document.getElementById('db-pass').value = env.DB_PASSWORD;
        if (env.API_PORT) document.getElementById('app-port').value = env.API_PORT;
        if (env.JWT_SECRET) document.getElementById('jwt-secret').value = env.JWT_SECRET;
        // Si hay contraseña cargada, marcar como conectado anticipadamente
        if (env.DB_SERVER && env.DB_DATABASE && env.DB_USER && env.DB_PASSWORD) {
            dbConfig = {
                DB_SERVER: env.DB_SERVER,
                DB_PORT: env.DB_PORT || '1433',
                DB_DATABASE: env.DB_DATABASE,
                DB_USER: env.DB_USER,
                DB_PASSWORD: env.DB_PASSWORD,
            };
            // NO marcamos dbConnected=true aquí — que el usuario lo verifique explícitamente
        }
    }

    // ── Paso 2: Probar conexión ───────────────────────────────────────────
    async function stepTestDB() {
        const newCfg = {
            DB_SERVER: v('db-server'),
            DB_PORT: v('db-port') || '1433',
            DB_DATABASE: v('db-name'),
            DB_USER: v('db-user'),
            DB_PASSWORD: v('db-pass'),
        };
        if (!newCfg.DB_SERVER || !newCfg.DB_DATABASE || !newCfg.DB_USER || !newCfg.DB_PASSWORD) {
            showStatus('err', 'Complete todos los campos antes de continuar.');
            return;
        }
        showStatus('info', '<span class="spinner"></span>&nbsp; Probando conexión...');
        btnNext.disabled = true;
        const res = await api('POST', '/api/test-db', newCfg);
        if (res && res.ok) {
            dbConfig = newCfg;
            dbConnected = true;
            showStatus('ok', 'Conexión exitosa con el servidor SQL.');
            setTimeout(() => goTo(3), 700);
        } else {
            dbConnected = false;
            showStatus('err', res ? res.message : 'No se pudo conectar. Verifique los datos.');
            btnNext.disabled = false;
        }
    }

    // ── Paso 3: Análisis BD ───────────────────────────────────────────────
    async function runAnalysis() {
        const spinner = document.querySelector('#screen-3 .spinner-ring');
        if (spinner) spinner.style.display = '';
        document.getElementById('analysis-status').innerHTML = 'Conectando con la base de datos...';

        const res = await api('POST', '/api/analyze', dbConfig);

        if (!res || !res.ok) {
            if (spinner) spinner.style.display = 'none';
            document.getElementById('analysis-status').innerHTML = `
                <div style="color:var(--danger); display:flex; flex-direction:column; align-items:center; gap:16px;">
                    <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="stroke:var(--warning);">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    <div style="font-weight:600; text-align:center;">${res?.error || 'Error desconocido al analizar la BD'}</div>
                </div>
            `;

            btnBack.style.display = '';
            btnNext.innerHTML = 'Regresar y Corregir';
            btnNext.disabled = false;
            btnNext.onclick = () => {
                btnNext.onclick = null;
                dbConnected = false;
                goTo(2);
            };
            return;
        }

        analysis = res.analysis;
        fillReviewScreen(analysis);
        setTimeout(() => goTo(4), 350);
    }

    // ── Pantalla 4: revisión ──────────────────────────────────────────────
    function fillReviewScreen(a) {
        const wrap = document.getElementById('version-banner-wrap');
        if (a.versionInfo) {
            const { pkgVersion, installedVersion, status } = a.versionInfo;
            let cls = 'ok', icon = checkSVG(), msg = '';
            if (status === 'first_install') {
                msg = `Instalación nueva — Versión a instalar: <strong>v${pkgVersion}</strong>`;
            } else if (status === 'upgrade') {
                msg = `Actualización: <strong>v${installedVersion}</strong> → <strong>v${pkgVersion}</strong>`;
            } else if (status === 'same') {
                cls = 'warn'; icon = warnSVG();
                msg = `Ya tiene instalada la versión <strong>v${pkgVersion}</strong>. Puede reinstalar para reparar.`;
            } else if (status === 'downgrade') {
                cls = 'danger'; icon = errSVG();
                msg = `<strong>Advertencia:</strong> El paquete (v${pkgVersion}) es más antiguo que la versión instalada (v${installedVersion}). No se permite esta operación.`;
                a.versionBlocked = true;
            }
            wrap.innerHTML = `<div class="version-banner ${cls}">${icon}<span>${msg}</span></div>`;
        } else { wrap.innerHTML = ''; }

        fillList('list-tables', 'badge-tables', a.tablesToCreate, t => `${t.schema}.${t.table}`, 'Ninguna — base de datos al día');
        fillList('list-cols', 'badge-cols', a.columnsToAdd, c => `${c.schema}.${c.table} → [${c.column}]`, 'Ninguna — todas las columnas presentes');
        fillList('list-sps', 'badge-sps', a.spsToApply, s => s.name, 'Ninguno');
    }

    function fillList(listId, badgeId, items, labelFn, emptyText) {
        const list = document.getElementById(listId);
        const badge = document.getElementById(badgeId);
        badge.textContent = items.length;
        badge.classList.toggle('zero', items.length === 0);
        list.innerHTML = '';
        if (items.length === 0) {
            const li = document.createElement('li');
            li.className = 'diff-empty'; li.textContent = emptyText;
            list.appendChild(li); return;
        }
        const MAX = 10;
        items.slice(0, MAX).forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `<span class="dot"></span>${labelFn(item)}`;
            list.appendChild(li);
        });
        if (items.length > MAX) {
            const li = document.createElement('li');
            li.className = 'diff-empty';
            li.textContent = `... y ${items.length - MAX} más.`;
            list.appendChild(li);
        }
    }

    // ── Paso 5: Instalar ──────────────────────────────────────────────────
    async function stepInstall() {
        appConfig = {
            INSTALL_DIR: installDir,
            API_PORT: v('app-port') || '3001',
            JWT_SECRET: v('jwt-secret'),
            DB_SERVER: dbConfig.DB_SERVER,
            DB_USER: dbConfig.DB_USER,
            DB_PASSWORD: dbConfig.DB_PASSWORD,
            DB_DATABASE: dbConfig.DB_DATABASE,
            DB_PORT: dbConfig.DB_PORT,
        };
        const res = await api('POST', '/api/install', { appConfig });
        if (res && res.ok) { goTo(6); startPolling(); }
        else { alert('Error al iniciar instalación: ' + (res?.error || 'Sin respuesta')); }
    }

    // ── Polling progreso ──────────────────────────────────────────────────
    const PROGRESS_LABELS = [
        'Aplicando cambios en la base de datos...',
        'Instalando archivos...',
        'Instalando dependencias...',
        'Configurando inicio automático...',
        'Finalizando...',
    ];

    function startPolling() {
        if (pollTimer) clearInterval(pollTimer);
        pollTimer = setInterval(async () => {
            const res = await api('GET', '/api/status');
            if (!res) return;
            const state = res.state;
            const pct = Math.round(state.progress || 0);
            document.getElementById('progress-fill').style.width = pct + '%';
            document.getElementById('progress-pct').textContent = pct + '%';
            document.getElementById('progress-step-label').textContent =
                PROGRESS_LABELS[Math.min(Math.floor(pct / 25), PROGRESS_LABELS.length - 1)];

            const newLines = state.logs.slice(lastLogCount);
            if (newLines.length) {
                lastLogCount = state.logs.length;
                newLines.forEach(appendLogLine);
                logConsole.scrollTop = logConsole.scrollHeight;
            }

            if (state.step === 'done') {
                clearInterval(pollTimer);
                document.getElementById('progress-fill').style.width = '100%';
                document.getElementById('progress-pct').textContent = '100%';
                document.getElementById('progress-step-label').textContent = '✅ Instalación completada correctamente';
                const port = appConfig.API_PORT || 3001;
                const url = `http://localhost:${port}`;
                document.getElementById('app-url-text').textContent = url;
                document.getElementById('app-url-chip').onclick = async () => {
                    await api('POST', '/api/open-url');
                };

                btnNext.textContent = 'Siguiente';
                btnNext.disabled = false;
            } else if (state.step === 'error') {
                clearInterval(pollTimer);
                appendLogLine('La instalación terminó con errores. Revise la carpeta logs/.');
                document.getElementById('progress-step-label').textContent = 'Error';
                btnNext.innerHTML = 'Reintentar desde el inicio';
                btnNext.disabled = false;
                btnNext.onclick = () => location.reload();
            }
        }, 1200);
    }

    function appendLogLine(line) {
        const div = document.createElement('div');
        if (line.includes('✅') || line.includes('COMPLETADA')) div.className = 'log-ok';
        else if (line.includes('⚠️') || line.includes('ADVERTENCIA')) div.className = 'log-warn';
        else if (line.includes('❌') || line.includes('ERROR')) div.className = 'log-err';
        else if (line.includes('==')) div.className = 'log-head';
        div.textContent = line;
        logConsole.appendChild(div);
    }

    // ── Helpers ───────────────────────────────────────────────────────────
    function v(id) { return (document.getElementById(id) || {}).value || ''; }

    function showStatus(type, html) {
        const el = document.getElementById('conn-status');
        el.className = `conn-status ${type}`;
        el.innerHTML = html;
    }

    function showFolderStatus(type, msg) {
        const el = document.getElementById('folder-status');
        el.className = `conn-status ${type}`;
        el.textContent = msg;
    }

    async function api(method, endpoint, body) {
        try {
            const opts = { method, headers: { 'Content-Type': 'application/json' } };
            if (body) opts.body = JSON.stringify(body);
            return await (await fetch(endpoint, opts)).json();
        } catch { return null; }
    }

    function checkSVG() { return '<svg viewBox="0 0 20 20"><path d="M16.7 5.3a1 1 0 010 1.4L9 14.4l-5.7-5.7a1 1 0 111.4-1.4L9 11.6l6.3-6.3a1 1 0 011.4 0z"/></svg>'; }
    function warnSVG() { return '<svg viewBox="0 0 20 20"><path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 4a1 1 0 011 1v4a1 1 0 01-2 0V7a1 1 0 011-1zm0 9a1 1 0 110-2 1 1 0 010 2z"/></svg>'; }
    function errSVG() { return '<svg viewBox="0 0 20 20"><path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm-1 5a1 1 0 012 0v4a1 1 0 01-2 0V7zm1 8a1 1 0 110-2 1 1 0 010 2z"/></svg>'; }

    // ── Arrancar ──────────────────────────────────────────────────────────
    init();

})();
