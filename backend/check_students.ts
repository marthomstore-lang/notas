import db from './src/config/db';

async function check() {
    const res = await db.query(`SELECT id, name FROM levels WHERE homeroom_teacher_id = '19fc8523-acea-4545-80d9-75d0c94df4b2'`);
    if (res.rows.length > 0) {
        const level = res.rows[0];
        console.log("Teacher is homeroom for:", level.name);
        const students = await db.query(`SELECT * FROM enrollments WHERE level_id = $1 AND academic_year = 2026`, [level.id]);
        console.log("Number of students enrolled in 2026:", students.rows.length);
    } else {
        console.log("Not a homeroom teacher");
    }
    process.exit(0);
}
check();
