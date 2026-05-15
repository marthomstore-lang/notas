import { getDb } from '../src/config/db';

async function migrate() {
    const db = await getDb();
    
    console.log("Creating audit_logs table...");
    await db.exec(`
        CREATE TABLE IF NOT EXISTS audit_logs (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            user_name TEXT,
            action TEXT,
            details TEXT,
            level_id TEXT,
            subject_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    console.log("Adding is_locked to teacher_assignments...");
    try {
        await db.exec(`ALTER TABLE teacher_assignments ADD COLUMN is_locked INTEGER DEFAULT 0`);
    } catch (e) {
        console.log("Column is_locked might already exist in teacher_assignments");
    }

    console.log("Adding is_locked to grades...");
    try {
        await db.exec(`ALTER TABLE grades ADD COLUMN is_locked INTEGER DEFAULT 0`);
    } catch (e) {
        console.log("Column is_locked might already exist in grades");
    }

    console.log("Migration completed.");
}

migrate();
