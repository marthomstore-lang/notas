import db from '../config/db';

async function main() {
    try {
        console.log("Checking Pre-Kinder students...");
        // Get Pre-Kinder level id
        const levelRes = await db.get("SELECT id, name FROM levels WHERE name ILIKE '%Pre-Kinder%'");
        if (!levelRes) {
            console.log("Pre-Kinder level not found.");
            return;
        }
        const levelId = levelRes.id;
        console.log(`Pre-Kinder Level ID: ${levelId}`);

        // Get enrollments and students
        const studentsRes = await db.all(`
            SELECT s.id, s.full_name, s.run, e.list_number, e.status, s.entry_date, s.created_at
            FROM students s
            JOIN enrollments e ON s.id = e.student_id
            WHERE e.level_id = ? AND e.academic_year = 2026
            ORDER BY e.list_number ASC
        `, [levelId]);

        console.log(`Found ${studentsRes.length} students in Pre-Kinder:`);
        studentsRes.forEach(row => {
            console.log(`List: ${row.list_number} | RUN: ${row.run} | Name: ${row.full_name} | Entry: ${row.entry_date} | Status: ${row.status}`);
        });

    } catch (err) {
        console.error(err);
    }
}

main();
