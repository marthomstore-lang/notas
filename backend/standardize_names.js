const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'liceopro.db');
const db = new sqlite3.Database(dbPath);

console.log("Standardizing Name Order: Paternal Maternal Names...");

db.all("SELECT id, first_name, paternal_surname, maternal_surname, full_name FROM students", (err, rows) => {
    if (err) {
        console.error("Error reading DB:", err);
        return;
    }

    db.serialize(() => {
        const stmt = db.prepare("UPDATE students SET full_name = ? WHERE id = ?");
        let count = 0;

        rows.forEach(row => {
            let newFullName = row.full_name;
            
            if (row.first_name || row.paternal_surname) {
                // Reconstruct using Chilean standard: Paternal Maternal Names
                newFullName = `${row.paternal_surname || ''} ${row.maternal_surname || ''} ${row.first_name || ''}`.replace(/\s+/g, ' ').trim();
            }

            if (newFullName !== row.full_name) {
                stmt.run([newFullName, row.id]);
                count++;
            }
        });

        stmt.finalize(() => {
            console.log(`Finished. Standardized ${count} student names.`);
            db.close();
        });
    });
});
