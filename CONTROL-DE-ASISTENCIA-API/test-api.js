
const http = require('http');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const port = process.env.API_PORT || 3001;

// Obtenemos un token primero (usando admin/admin si es posible o asumiendo uno)
// En este caso, para no depender de login, intentaremos asumiendo que el server está arriba.

async function testApi() {
    console.log(`Testing API on port ${port}...`);

    // Aquí necesitaríamos un token válido. 
    // Como no lo tenemos fácil, vamos a intentar ver si el endpoint responde algo (aunque sea 401).
    // Pero espera, puedo hacer el login primero en el script!

    const loginData = JSON.stringify({ username: 'admin', password: 'admin' });

    const loginOptions = {
        hostname: 'localhost',
        port: port,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': loginData.length
        }
    };

    const req = http.request(loginOptions, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
            try {
                const data = JSON.parse(body);
                const token = data.token;
                console.log('Login successful, token obtained.');

                // Ahora probamos el catálogo
                const catOptions = {
                    hostname: 'localhost',
                    port: port,
                    path: '/api/catalogs/departamentos',
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                };

                const catReq = http.request(catOptions, (catRes) => {
                    let catBody = '';
                    catRes.on('data', (chunk) => catBody += chunk);
                    catRes.on('end', () => {
                        console.log('Catalog Response Status:', catRes.statusCode);
                        console.log('Catalog Response Body:', catBody);
                    });
                });
                catReq.end();

            } catch (e) {
                console.error('Error parsing login response:', body);
            }
        });
    });

    req.on('error', (e) => console.error('Request error:', e));
    req.write(loginData);
    req.end();
}

testApi();
