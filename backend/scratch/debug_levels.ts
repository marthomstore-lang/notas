import { getDb } from '../src/config/db';

async function debugLevels() {
    try {
        const db = await getDb();
        
        const levels = await db.all("SELECT id, name FROM levels WHERE name LIKE '4%' OR name LIKE '5%'");
        console.log("Levels Found:", levels);

        for (const level of levels) {
            const enrollCount = await db.get("SELECT COUNT(*) as count FROM enrollments WHERE level_id = ?", [level.id]);
            const assignCount = await db.get("SELECT COUNT(*) as count FROM teacher_assignments WHERE level_id = ?", [level.id]);
            
            console.log(`\nLevel: ${level.name} (${level.id})`);
            console.log(`Enrollments: ${enrollCount.count}`);
            console.log(`Assignments: ${assignCount.count}`);
            
            if (enrollCount.count > 0) {
                const sample = await db.all("SELECT * FROM enrollments WHERE level_id = ? LIMIT 1", [level.id]);
                console.log("Enrollment Sample:", sample);
            }
            
            const assignments = await db.all("SELECT * FROM teacher_assignments WHERE level_id = ?", [level.id]);
            console.log("Assignments:", assignments);
        }

    } catch (e) {
        console.error(e);
    }
}

debugLevels();
