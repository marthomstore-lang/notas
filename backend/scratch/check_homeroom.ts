import { getDb } from '../src/config/db';

async function checkHomeroom() {
    const db = await getDb();
    const levels = await db.all(`
        SELECT l.id, l.name, l.homeroom_teacher_id, u.name as teacher_name
        FROM levels l
        LEFT JOIN users u ON l.homeroom_teacher_id = u.id
    `);
    console.table(levels);
}

checkHomeroom();
