import { getDb } from './config/db';

async function listStudents() {
    try {
        const db = await getDb();
        const students = await db.all("SELECT id, full_name, status FROM students");
        
        console.log("\n=== LISTADO DE ESTUDIANTES EN LA BASE DE DATOS ===");
        console.table(students);
        console.log("==================================================\n");
        
        const counts = await db.all("SELECT status, COUNT(*) as count FROM students GROUP BY status");
        console.log("Conteos por estado:");
        console.table(counts);
    } catch (error) {
        console.error("Error al leer la base de datos:", error);
    }
}

listStudents();
