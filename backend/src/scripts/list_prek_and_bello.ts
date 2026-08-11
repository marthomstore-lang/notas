import db from '../config/db';

async function main() {
    try {
        console.log("Listing all levels:");
        const levels = await db.all("SELECT id, name FROM levels");
        console.log(levels);

        console.log("\nSearching for Isabella Bello enrollments:");
        const enrollments = await db.all(`
            SELECT e.*, l.name as level_name 
            FROM enrollments e 
            JOIN levels l ON e.level_id = l.id 
            WHERE e.student_id = 'c8acdafc-855a-4d4c-87a8-2482a9cf5716'
        `);
        console.log(enrollments);
    } catch (err) {
        console.error(err);
    }
}

main();
