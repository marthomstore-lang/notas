import { getDb } from '../src/config/db';

async function checkDuplicates() {
    const db = await getDb();
    const users = await db.all("SELECT id, run, name FROM users WHERE run LIKE '%18%803%735%6%'");
    console.log(users);
}

checkDuplicates();
