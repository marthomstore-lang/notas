import db from './src/config/db';

async function check() {
    const assignmentId = 'homeroom_32'; // I need to get the real level id for Kinder.
    
    const levels = await db.query(`SELECT id, name FROM levels WHERE homeroom_teacher_id = '19fc8523-acea-4545-80d9-75d0c94df4b2'`);
    if (levels.rows.length === 0) return;
    
    const level_id = levels.rows[0].id;
    const academic_year = 2026;
    
    console.log("Level ID:", level_id);

    const studentsRes = await db.query(`
        SELECT s.id, s.run, s.full_name, e.list_number, s.status
        FROM enrollments e
        JOIN students s ON e.student_id = s.id
        WHERE e.level_id = $1 AND e.academic_year = $2
        ORDER BY COALESCE(e.list_number, 999999) ASC, s.full_name ASC
    `, [level_id, academic_year]);

    console.log("Returned students:", studentsRes.rows.length);
    process.exit(0);
}
check();
