const http = require('http');

function post(url, data) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const options = {
            hostname: u.hostname,
            port: u.port,
            path: u.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(JSON.stringify(data))
            }
        };
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(body)); } catch (e) { resolve({ error: body }); }
            });
        });
        req.on('error', reject);
        req.write(JSON.stringify(data));
        req.end();
    });
}

function get(url, token) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const options = {
            hostname: u.hostname,
            port: u.port,
            path: u.pathname,
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        };
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => resolve(JSON.parse(body)));
        });
        req.on('error', reject);
        req.end();
    });
}

async function test() {
    try {
        const login = await post('http://localhost:3000/api/auth/login', { rut: 'admin', password: 'Liceo2026' });
        console.log('Login result:', login.token ? 'Success' : 'Fail');
        if (!login.token) {
            console.log('Login error:', login);
            return;
        }

        const teachers = await get('http://localhost:3000/api/admin/teachers', login.token);
        console.log('Teachers result:', teachers);
    } catch (e) { console.error(e); }
}

test();
