import { getDb } from '../src/config/db';

async function inspectData() {
    try {
        const db = await getDb();
        
        console.log("\n=== LEVELS ===");
        const levels = await db.all("SELECT * FROM levels");
        console.table(levels);
        
        console.log("\n=== TEACHER ASSIGNMENTS ===");
        const assignments = await db.all(`
            SELECT ta.id, ta.level_id, ta.subject_id, ta.academic_year, l.name as level_name
            FROM teacher_assignments ta
            JOIN levels l ON ta.level_id = l.id
        `);
        console.table(assignments);
        
        console.log("\n=== ENROLLMENTS (Sample) ===");
        const enrollments = await db.all("SELECT * FROM enrollments LIMIT 10");
        console.table(enrollments);
        
        console.log("\n=== STUDENTS (Sample) ===");
        const students = await db.all("SELECT id, full_name FROM students LIMIT 10");
        console.table(students);

    } catch (e) {
        console.error(e);
    }
}

inspectData();
