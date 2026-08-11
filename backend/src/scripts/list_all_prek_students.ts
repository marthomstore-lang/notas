import db from '../config/db';

async function main() {
    try {
        console.log("Students in level 30 (Pre-Kinder):");
        const pk30 = await db.all(`
            SELECT s.full_name, s.run, e.list_number, e.status, s.status as student_status
            FROM students s
            JOIN enrollments e ON s.id = e.student_id
            WHERE e.level_id = 30 AND e.academic_year = 2026
            ORDER BY e.list_number ASC
        `);
        console.log(pk30);

        console.log("\nStudents in level 41 (1ER NIVEL DE TRANSICIÓN (PRE-KINDER)):");
        const pk41 = await db.all(`
            SELECT s.full_name, s.run, e.list_number, e.status, s.status as student_status
            FROM students s
            JOIN enrollments e ON s.id = e.student_id
            WHERE e.level_id = 41 AND e.academic_year = 2026
            ORDER BY e.list_number ASC
        `);
        console.log(pk41);
    } catch (err) {
        console.error(err);
    }
}

main();
