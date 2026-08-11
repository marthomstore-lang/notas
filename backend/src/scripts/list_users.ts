import db from '../config/db';

async function listUsers() {
    try {
        console.log("=== USUARIOS (PROFESORES / ADMINISTRADORES) EN LA DB ===");
        const users = await db.all("SELECT run, name, role FROM users ORDER BY role, name");
        for (const u of users) {
            console.log(`- [${u.role}] RUN: ${u.run} | Nombre: ${u.name}`);
        }
    } catch (error) {
        console.error("Error al obtener usuarios:", error);
    } finally {
        setTimeout(() => process.exit(0), 1000);
    }
}

listUsers();
