import { getDb } from '../src/config/db';

async function listAllUsers() {
    const db = await getDb();
    const users = await db.all("SELECT id, name, run, role FROM users");
    console.table(users);
}

listAllUsers();
