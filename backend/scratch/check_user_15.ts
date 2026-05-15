import { getDb } from '../src/config/db';

async function check() {
    const db = await getDb();
    const user = await db.get("SELECT run, name, password_plain FROM users WHERE run LIKE '%15%972%595%2%'");
    console.log(user);
}

check();
