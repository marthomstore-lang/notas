import { getDb } from '../src/config/db';

async function fixAlejandra() {
    const db = await getDb();
    await db.run("DELETE FROM users WHERE id = '79627b1f-5ed2-4da4-8a35-4761ae43cf04'");
    await db.run("UPDATE users SET run = '15972595-2' WHERE id = 't-1778102954692-12'");
    console.log("Fixed Alejandra");
}

fixAlejandra();
