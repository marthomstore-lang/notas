import db from '../config/db';

async function main() {
    try {
        const row = await db.get("SELECT s.*, e.level_id, e.status as enrollment_status, e.list_number FROM students s LEFT JOIN enrollments e ON s.id = e.student_id WHERE s.full_name ILIKE '%bello%'");
        console.log("Bello search result:", row);
    } catch (err) {
        console.error(err);
    }
}

main();
