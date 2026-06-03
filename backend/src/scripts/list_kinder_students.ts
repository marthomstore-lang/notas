import db from '../config/db';

async function main() {
    try {
        console.log("Students in level 34 (Kínder):");
        const list34 = await db.all(`
            SELECT s.full_name, s.run, e.list_number, e.status, s.status as student_status
            FROM students s
            JOIN enrollments e ON s.id = e.student_id
            WHERE e.level_id = 34 AND e.academic_year = 2026
            ORDER BY e.list_number ASC
        `);
        console.log(list34);

        console.log("\nStudents in level 45 (2° NIVEL DE TRANSICIÓN (KINDER)):");
        const list45 = await db.all(`
            SELECT s.full_name, s.run, e.list_number, e.status, s.status as student_status
            FROM students s
            JOIN enrollments e ON s.id = e.student_id
            WHERE e.level_id = 45 AND e.academic_year = 2026
            ORDER BY e.list_number ASC
        `);
        console.log(list45);
    } catch (err) {
        console.error(err);
    } finally {
        setTimeout(() => process.exit(0), 1000);
    }
}

main();
