import { getDb } from './config/db';

async function testDeleteTeacher() {
    try {
        const id = 'a7ad9c32-ab1c-4b85-b545-f18b6329bd8a'; // 'hola'
        const sqlite = await getDb();
        
        console.log(`Attempting to delete teacher ID: ${id}`);
        
        await sqlite.run("BEGIN TRANSACTION");
        try {
            await sqlite.run("DELETE FROM teacher_assignments WHERE teacher_id = ?", [id]);
            await sqlite.run("UPDATE levels SET homeroom_teacher_id = NULL WHERE homeroom_teacher_id = ?", [id]);
            await sqlite.run("UPDATE observations SET teacher_id = NULL WHERE teacher_id = ?", [id]);
            await sqlite.run("UPDATE audit_logs SET user_id = NULL WHERE user_id = ?", [id]);
            await sqlite.run("DELETE FROM regulatory_acceptances WHERE user_id = ?", [id]);
            
            const result = await sqlite.run("DELETE FROM users WHERE id = ?", [id]);
            console.log("Delete result changes:", result.changes);
            
            await sqlite.run("COMMIT");
            console.log("Transaction committed.");
        } catch (err) {
            await sqlite.run("ROLLBACK");
            console.error("Error in transaction:", err);
        }
        
        const check = await sqlite.get("SELECT * FROM users WHERE id = ?", [id]);
        console.log("User still in DB?", check ? 'Yes' : 'No');
        
    } catch (error) {
        console.error("Outer error:", error);
    }
}

testDeleteTeacher();
