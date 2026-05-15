const http = require('http');
const jwt = require('jsonwebtoken');

async function testFetch() {
    const JWT_SECRET = 'super-secret-key-liceo-pro';
    const token = jwt.sign({ id: 'admin', role: 'Admin' }, JWT_SECRET);

    const postData = JSON.stringify({
        name: "GUTIÉRREZ CID ALEJANDRA XIMENA",
        email: "gutiérrez.alejandra@liceopro.cl",
        password: "182011",
        role: "Docente"
    });

    const req = http.request(`http://localhost:3000/api/admin/teachers/t-1778102954692-12`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
            'Authorization': `Bearer ${token}` 
        }
    }, (res) => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => console.log("Status:", res.statusCode, "Response:", body));
    });
    
    req.write(postData);
    req.end();
}

testFetch();
