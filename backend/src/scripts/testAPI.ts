import jwt from 'jsonwebtoken';
import http from 'http';

const token = jwt.sign({ id: 'admin', role: 'Admin' }, 'super-secret-key-liceo-pro');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/students',
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${token}`
    }
};

const req = http.request(options, res => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
        const students = JSON.parse(data);
        console.log(`Total students: ${students.length}`);
        if (students.length > 0) {
            console.log(students[0]);
        }
    });
});

req.on('error', error => {
    console.error(error);
});

req.end();
