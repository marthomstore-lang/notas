import { getDb } from '../src/config/db';

async function checkDup() {
    const db = await getDb();
    const users = await db.all("SELECT id, run, name, password_plain FROM users WHERE run LIKE '%15%972%595%2%'");
    console.log(users);
}

checkDup();
