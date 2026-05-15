const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');

async function check() {
    const db = await open({
        filename: path.join(__dirname, '../liceopro.db'),
        driver: sqlite3.Database
    });
    const info = await db.all("PRAGMA table_info(teacher_assignments)");
    console.log(JSON.stringify(info, null, 2));
}

check().catch(console.error);
