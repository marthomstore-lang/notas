import { getDb } from '../src/config/db';
import { v4 as uuidv4 } from 'uuid';

async function forceLog() {
    const db = await getDb();
    const id = uuidv4();
    console.log('Inserting test log with ID:', id);
    await db.run(`
        INSERT INTO audit_logs (id, user_id, user_name, action, details, created_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [id, 'test-id', 'Test User', 'TEST_ACTION', 'This is a manual test log']);
    console.log('Inserted.');
}

forceLog();
