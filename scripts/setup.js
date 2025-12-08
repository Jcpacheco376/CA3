const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const API_DIR = path.join(__dirname, 'api-asistencia');

// --- FUNCIÓN PARA DETECTAR IPS LOCALES ---
const getNetworkAddresses = () => {
    const interfaces = os.networkInterfaces();
    const addresses = [];
    const hostname = os.hostname();

    // Agregar localhost y nombre de equipo
    addresses.push('localhost');
    if (hostname) addresses.push(hostname);

    // Buscar IPs IPv4 reales
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Saltamos las internas y las no IPv4
            if (iface.family === 'IPv4' && !iface.internal) {
                addresses.push(iface.address);
            }
        }
    }
    return addresses;
};

console.log('=========================================');
console.log('   CONFIGURACIÓN DEL SISTEMA ASISTENCIA   ');
console.log('=========================================');

const questions = [
    { key: 'DB_SERVER', q: '1. IP/Nombre Servidor SQL (Enter para localhost): ',def: 'localhost' },
    { key: 'DB_USER', q: '2. Usuario SQL (Enter para sa): ', def: 'sa'},
    { key: 'DB_PASSWORD', q: '3. Contraseña SQL: ' },
    { key: 'DB_DATABASE', q: '4. Nombre de la Base de Datos (Enter para CA): ', def: 'CA' },
    { key: 'DB_PORT', q: '5. Puerto SQL Server (Enter para 1433): ', def: '1433' },
    { key: 'API_PORT', q: '6. Puerto para la PÁGINA WEB (Enter para 3001): ', def: '3001' },
    { key: 'JWT_SECRET', q: '7. JWT Secret (Enter para auto-generar): ' }
];

const config = {};

const ask = (i) => {
    if (i === questions.length) return finish();
    const { key, q, def } = questions[i];
    rl.question(q, (ans) => {
        let val = ans.trim() || def;
        if (key === 'JWT_SECRET' && !val) {
            val = require('crypto').randomBytes(32).toString('hex');
            console.log(`   -> Secreto generado automáticamente.`);
        }
        if (!val) { console.log('   ❌ Dato requerido.'); return ask(i); }
        config[key] = val;
        ask(i + 1);
    });
};

const finish = () => {
    rl.close();
    console.log('\n... Generando configuración inteligente ...');

    // 1. Detectar IPs para CORS automáticamente
    const localIPs = getNetworkAddresses();
    const port = config.API_PORT;
    
    // Generar lista de orígenes permitidos
    // Ej: http://localhost:3001,http://SERVIDOR:3001,http://192.168.1.50:3001
    const allowedOrigins = localIPs.map(ip => `http://${ip}:${port}`).join(',');

    // 2. Construir .env
    let envContent = '';
    for (const [key, value] of Object.entries(config)) {
        envContent += `${key}=${value}\n`;
    }
    
    envContent += `NODE_ENV=production\n`;
    // Usamos la primera IP real encontrada como LOCAL_IP preferida, o localhost
    const mainIP = localIPs.find(ip => ip !== 'localhost' && !ip.includes('127.0.0.1')) || 'localhost';
    envContent += `LOCAL_IP=${mainIP}\n`;
    envContent += `ALLOWED_ORIGINS=${allowedOrigins}\n`;

    if (!fs.existsSync(API_DIR)) {
        console.error(`❌ ERROR: No se encuentra la carpeta "${API_DIR}".`);
        process.exit(1);
    }

    fs.writeFileSync(path.join(API_DIR, '.env'), envContent);
    console.log('✅ Archivo .env configurado con IPs locales detectadas.');

    // 3. Instalar
    console.log('\n... Instalando dependencias ...');
    try {
        execSync('npm install --production', { cwd: API_DIR, stdio: 'inherit' });
        console.log('\n=========================================');
        console.log('      INSTALACIÓN COMPLETADA    ');
        console.log('=========================================');
        console.log('1. Entra a la carpeta "api-asistencia"');
        console.log('2. Ejecuta: npm start');
        console.log(`3. Tu sistema estará disponible en:`);
        localIPs.forEach(ip => console.log(`   - http://${ip}:${port}`));
    } catch (e) {
        console.error('❌ Error instalando dependencias.');
    }
    
    console.log('\n(Presiona cualquier tecla para salir)');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', process.exit.bind(process, 0));
};

ask(0);