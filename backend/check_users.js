const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'liceopro.db');
const db = new sqlite3.Database(dbPath);

db.all("SELECT id, run, role FROM users", (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.table(rows);
    }
    db.close();
});
