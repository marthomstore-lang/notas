import { getDb } from '../src/config/db';

async function setHomeroom() {
    const db = await getDb();
    const result = await db.run("UPDATE levels SET homeroom_teacher_id = ? WHERE id = ?", ['t-1778102954692-12', 22]);
    console.log("Changes:", result.changes);
}

setHomeroom();
