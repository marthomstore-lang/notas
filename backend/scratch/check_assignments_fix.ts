import { getDb } from '../src/config/db';

async function checkAssignments() {
    try {
        const db = await getDb();
        const id1 = 't-1778102954692-12';
        const id2 = '79627b1f-5ed2-4da4-8a35-4761ae43cf04';
        
        console.log("Assignments for REAL ID (Alejandra):");
        const a1 = await db.all("SELECT * FROM teacher_assignments WHERE teacher_id = ?", [id1]);
        console.table(a1);
        
        console.log("Assignments for DELETED ID (aleee):");
        const a2 = await db.all("SELECT * FROM teacher_assignments WHERE teacher_id = ?", [id2]);
        console.table(a2);

    } catch (e) {
        console.error(e);
    }
}

checkAssignments();
