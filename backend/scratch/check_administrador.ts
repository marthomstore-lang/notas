import { getDb } from '../src/config/db';

async function checkAdministrador() {
    const db = await getDb();
    const admins = await db.all("SELECT id, name, role FROM users WHERE role = 'Administrador'");
    console.log("Users with role 'Administrador':", admins);
}

checkAdministrador();
