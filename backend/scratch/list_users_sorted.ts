import { getDb } from '../src/config/db';

async function listUsers() {
    const db = await getDb();
    const users = await db.all("SELECT id, name, run, role FROM users ORDER BY role, name LIMIT 50");
    console.table(users);
}

listUsers();
