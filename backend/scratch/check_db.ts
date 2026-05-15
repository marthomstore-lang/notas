import { getDb } from '../src/config/db';

async function check() {
    const db = await getDb();
    const user = await db.get("SELECT name, password_plain FROM users WHERE name LIKE '%GUTI%'");
    console.log(user);
}

check();
