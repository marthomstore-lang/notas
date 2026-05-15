import { getDb } from '../src/config/db';

async function check() {
    const db = await getDb();
    const user = await db.get("SELECT * FROM users WHERE run = '18803735-6'");
    console.log(user);
}

check();
