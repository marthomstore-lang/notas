import { getDb } from '../src/config/db';

async function moveAssignments() {
    try {
        const db = await getDb();
        const oldId = '79627b1f-5ed2-4da4-8a35-4761ae43cf04';
        const newId = 't-1778102954692-12';
        
        console.log(`Moving assignments from ${oldId} to ${newId}...`);
        const result = await db.run("UPDATE teacher_assignments SET teacher_id = ? WHERE teacher_id = ?", [newId, oldId]);
        console.log("Changes:", result.changes);

    } catch (e) {
        console.error(e);
    }
}

moveAssignments();
