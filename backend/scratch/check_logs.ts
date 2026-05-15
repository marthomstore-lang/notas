import { getDb } from '../src/config/db';

async function checkLogs() {
    const db = await getDb();
    const logs = await db.all('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10');
    console.log('Total logs:', (await db.get('SELECT COUNT(*) as count FROM audit_logs')).count);
    console.log('Last 10 logs:', JSON.stringify(logs, null, 2));
}

checkLogs();
