import { getDb } from '../src/config/db';

async function checkEnrollments() {
    try {
        const db = await getDb();
        const level27 = 27; // 4 Básico
        const level35 = 35; // 5 Básico
        
        console.log("Enrollments for Level 27 (4 Básico):");
        const e27 = await db.all("SELECT * FROM enrollments WHERE level_id = ?", [level27]);
        console.log("Count:", e27.length);
        
        console.log("Enrollments for Level 35 (5 Básico):");
        const e35 = await db.all("SELECT * FROM enrollments WHERE level_id = ?", [level35]);
        console.log("Count:", e35.length);

    } catch (e) {
        console.error(e);
    }
}

checkEnrollments();
