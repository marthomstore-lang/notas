import axios from 'axios';

async function testSave() {
    // 1. Login to get token
    const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
        rut: 'admin',
        password: '123'
    });
    const token = loginRes.data.token;
    console.log('Logged in.');

    // 2. Call save-grades-sheet
    try {
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
        console.error('Save failed:', e.response?.data || e.message);
    }
}

testSave();
