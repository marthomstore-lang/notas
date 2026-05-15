const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('liceopro.db');

db.all("SELECT run, name, role FROM users", [], (err, rows) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log(JSON.stringify(rows, null, 2));
    db.close();
});
