import { getDb } from '../src/config/db';

async function findLevel() {
    const db = await getDb();
    const level = await db.get("SELECT id, name FROM levels WHERE name = '5° Básico'");
    console.log(level);
}

findLevel();
