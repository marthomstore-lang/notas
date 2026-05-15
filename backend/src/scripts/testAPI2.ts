import jwt from 'jsonwebtoken';
import http from 'http';

const token = jwt.sign({ id: 'admin', role: 'Admin' }, 'super-secret-key-liceo-pro');

const makeRequest = (path: string): Promise<any> => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        };
        const req = http.request(options, res => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                if(res.statusCode === 200) resolve(JSON.parse(data));
                else reject(new Error(`Status ${res.statusCode}: ${data}`));
            });
        });
        req.on('error', reject);
        req.end();
    });
};

async function testAll() {
    try {
        console.log("Testing /api/admin/teachers");
        console.log((await makeRequest('/api/admin/teachers')).length);
        console.log("Testing /api/admin/subjects");
        console.log((await makeRequest('/api/admin/subjects')).length);
        console.log("Testing /api/admin/levels");
        console.log((await makeRequest('/api/admin/levels')).length);
        console.log("Testing /api/admin/students");
        console.log((await makeRequest('/api/admin/students')).length);
    } catch(e) {
        console.error("Error:", e.message);
    }
}
testAll();
