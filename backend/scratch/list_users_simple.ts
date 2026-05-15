import { getDb } from '../src/config/db';

async function listUsers() {
    const db = await getDb();
    const users = await db.all('SELECT id, run, name, role FROM users');
    console.log('Users:', JSON.stringify(users, null, 2));
}

listUsers();
