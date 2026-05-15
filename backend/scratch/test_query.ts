import { getDb } from '../src/config/db';

async function testQuery() {
    const db = await getDb();
    const levelId = 27;
    const year = 2026;
    
    console.log(`Testing query for Level: ${levelId}, Year: ${year}`);
    const res = await db.all(`
        SELECT s.id, s.run, s.full_name, e.list_number
        FROM enrollments e
        JOIN students s ON e.student_id = s.id
        WHERE e.level_id = ? AND e.academic_year = ?
        ORDER BY e.list_number ASC
    `, [levelId, year]);
    
    console.log("Result Count:", res.length);
    if (res.length > 0) {
        console.log("First row:", res[0]);
    }
}

testQuery();
