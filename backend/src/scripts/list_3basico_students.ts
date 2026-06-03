import db from '../config/db';

async function main() {
    try {
        console.log("Checking all levels matching '3° Básico' or similar:");
        const levels = await db.all("SELECT id, name FROM levels WHERE name ILIKE '%3°%básico%' OR name ILIKE '%3%basico%'");
        console.log(levels);

        for (const level of levels) {
            console.log(`\nStudents in level ${level.id} (${level.name}):`);
            const list = await db.all(`
                SELECT s.full_name, s.run, e.list_number, e.status, s.status as student_status, e.level_id
                FROM students s
                JOIN enrollments e ON s.id = e.student_id
                WHERE e.level_id = ? AND e.academic_year = 2026
                ORDER BY e.list_number ASC
            `, [level.id]);
            console.log(list);
        }
    } catch (err) {
        console.error(err);
    } finally {
        setTimeout(() => process.exit(0), 1000);
    }
}

main();
