const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'liceopro.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run("ALTER TABLE students ADD COLUMN first_name TEXT", (err) => {
        if (err) console.log("first_name already exists or error:", err.message);
    });
    db.run("ALTER TABLE students ADD COLUMN paternal_surname TEXT", (err) => {
        if (err) console.log("paternal_surname already exists or error:", err.message);
    });
    db.run("ALTER TABLE students ADD COLUMN maternal_surname TEXT", (err) => {
        if (err) console.log("maternal_surname already exists or error:", err.message);
    });
    console.log("Migration finished.");
});

db.close();
