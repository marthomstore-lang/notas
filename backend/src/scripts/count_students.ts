import db from '../config/db';

async function count() {
    try {
        console.log("Conectando al pool...");
        const students = await db.all("SELECT COUNT(*) as count FROM students");
        console.log("Estudiantes en base de datos:", students[0].count);
        
        const firstFew = await db.all("SELECT run, full_name FROM students LIMIT 5");
        console.log("Primeros 5 estudiantes en la DB:", firstFew);
        
        const levels = await db.all("SELECT id, name FROM levels");
        console.log("Niveles existentes en la DB:", levels);
    } catch (error) {
        console.error("Error al contar estudiantes:", error);
    } finally {
        // Wait a bit to ensure log output finishes before process exits
        setTimeout(() => process.exit(0), 1000);
    }
}

count();
