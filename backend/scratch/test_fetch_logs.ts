import axios from 'axios';

async function testFetchLogs() {
    try {
        // 1. Login as 'hola' or 'admin'
        const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
            rut: '12345678-9',
            password: '123'
        });
        const token = loginRes.data.token;
        console.log('Logged in.');

        // 2. Fetch logs
        const res = await axios.get('http://localhost:3000/api/admin/audit-logs', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('Logs returned by API:', JSON.stringify(res.data, null, 2));
    } catch (e: any) {
        console.error('Fetch logs failed:', e.response?.data || e.message);
    }
}

testFetchLogs();
