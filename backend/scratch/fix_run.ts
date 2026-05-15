import { getDb } from '../src/config/db';

async function fixRun() {
    const db = await getDb();
    await db.run("UPDATE users SET run = '18803735-6' WHERE run = '18.803.735-6'");
    console.log("Run updated.");
}

fixRun();
