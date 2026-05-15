import { getDb } from '../src/config/db';

async function checkRoles() {
    const db = await getDb();
    const roles = await db.all("SELECT DISTINCT role FROM users");
    console.log("Roles in DB:", roles);
    
    const admins = await db.all("SELECT id, name, role FROM users WHERE role LIKE 'Admin%'");
    console.log("Admin Users:", admins);
}

checkRoles();
