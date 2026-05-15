import { getDb } from '../src/config/db';

async function checkAdminList() {
    const db = await getDb();
    const users = await db.all("SELECT id, name, role FROM users WHERE role = 'Admin'");
    console.log("Admin Users in DB:", users);
}

checkAdminList();
