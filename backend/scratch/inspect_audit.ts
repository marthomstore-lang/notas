import { getDb } from '../src/config/db';

async function inspectTable() {
    const db = await getDb();
    try {
        const columns = await db.all('PRAGMA table_info(audit_logs)');
        console.log('Columns in audit_logs:', JSON.stringify(columns, null, 2));
        
        const count = await db.get('SELECT COUNT(*) as count FROM audit_logs');
        console.log('Row count:', count);
    } catch (e) {
        console.error('Error inspecting table:', e);
    }
}

inspectTable();
