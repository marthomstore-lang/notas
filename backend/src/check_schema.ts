import { getDb } from './config/db';

async function check() {
    const db = await getDb();
    const info = await db.all("PRAGMA table_info(audit_logs)");
    console.log(JSON.stringify(info, null, 2));
}

check();
