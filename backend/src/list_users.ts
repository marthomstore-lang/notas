import { getDb } from './config/db';

async function listUsers() {
    try {
        const db = await getDb();
        const users = await db.all("SELECT id, run, name, email, role, password_plain FROM users");
        
        console.log("\n=== LISTADO DE USUARIOS EN LA BASE DE DATOS ===");
        console.table(users);
        console.log("===============================================\n");
    } catch (error) {
        console.error("Error al leer la base de datos:", error);
    }
}

listUsers();
