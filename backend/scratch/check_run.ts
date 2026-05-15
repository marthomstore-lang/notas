import { getDb } from '../src/config/db';

async function check() {
    const db = await getDb();
    const user = await db.get("SELECT run FROM users WHERE run LIKE '18%803%735%6'");
    console.log(user);
}

check();
