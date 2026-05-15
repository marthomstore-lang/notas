const jwt = require('jsonwebtoken');
const http = require('http');

const JWT_SECRET = 'super-secret-key-liceo-pro';
const token = jwt.sign({ id: 'admin', role: 'Admin' }, JWT_SECRET);

console.log("Token:", token);

// Get users to find ID
http.get('http://localhost:3000/api/admin/teachers', {
    headers: { 'Authorization': `Bearer ${token}` }
}, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        const users = JSON.parse(body);
        const user = users.find(u => u.name.includes('GUTIÉRREZ CID'));
        if (!user) {
            console.log("User not found!");
            return;
        }
        
        console.log(`Found user: ${user.name} with ID: ${user.id}`);
        
        // Now update
        const postData = JSON.stringify({
            name: user.name,
            email: user.email,
            password: "182011",
            role: "Docente"
        });

        const req = http.request(`http://localhost:3000/api/admin/teachers/${user.id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        }, (res2) => {
            let body2 = '';
            res2.on('data', chunk => body2 += chunk);
            res2.on('end', () => {
                console.log(`Update Status: ${res2.statusCode}`);
                console.log(`Update Response: ${body2}`);
                
                // Fetch again to verify
                http.get('http://localhost:3000/api/admin/teachers', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }, (res3) => {
                    let body3 = '';
                    res3.on('data', chunk => body3 += chunk);
                    res3.on('end', () => {
                        const updatedUsers = JSON.parse(body3);
                        const updatedUser = updatedUsers.find(u => u.id === user.id);
                        console.log(`Verified User password_plain: ${updatedUser.password_plain}`);
                    });
                });
            });
        });

        req.write(postData);
        req.end();
    });
});
