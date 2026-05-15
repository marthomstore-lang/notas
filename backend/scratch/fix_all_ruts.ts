import { getDb } from '../src/config/db';

async function fixAllRuts() {
    try {
        const db = await getDb();
        const users = await db.all("SELECT id, run FROM users");
        
        let updated = 0;
        let skipped = 0;
        for (const user of users) {
            if (user.run.includes('.')) {
                const cleanRun = user.run.replace(/\./g, '');
                try {
                    await db.run("UPDATE users SET run = ? WHERE id = ?", [cleanRun, user.id]);
                    updated++;
                } catch (err) {
                    console.log(`Skipping duplicate RUT: ${cleanRun} for ID: ${user.id}`);
                    skipped++;
                }
            }
        }
        
        console.log(`Successfully cleaned ${updated} RUTs (removed dots). Skipped ${skipped} duplicates.`);
    } catch (e) {
        console.error("Error fixing RUTs:", e);
    }
}

fixAllRuts();
