import { getDb } from './config/db';

async function checkStudent() {
    try {
        const db = await getDb();
        const id = 'd3095699-8558-44fb-a727-08c08b91c60d';
        const student = await db.get("SELECT id, full_name, status FROM students WHERE id = ?", [id]);
        
        console.log("\n=== ESTADO DEL ESTUDIANTE TRAS ELIMINACIÓN ===");
        console.log(student);
        console.log("============================================\n");
    } catch (error) {
        console.error("Error:", error);
    }
}

checkStudent();
