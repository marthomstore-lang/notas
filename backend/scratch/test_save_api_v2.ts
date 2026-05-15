import axios from 'axios';

async function testSave() {
    try {
        // 1. Login as 'hola'
        const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
            rut: '12345678-9',
            password: '123'
        });
        const token = loginRes.data.token;
        console.log('Logged in as:', loginRes.data.user.name);

        // 2. Call save-grades-sheet
        const res = await axios.post('http://localhost:3000/api/admin/grades/sheet', {
            levelId: 1,
            subjectId: 101,
            period: '1er Semestre',
            year: '2026',
            columns: [],
            gradesData: []
        }, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('Save result:', res.data);
    } catch (e: any) {
        console.error('Test failed:', e.response?.data || e.message);
    }
}

testSave();
