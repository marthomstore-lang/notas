const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

async function resetTeachers() {
    const db = new sqlite3.Database('liceopro.db');
    const hash = await bcrypt.hash('Liceo2026', 10);
    db.run('UPDATE users SET password_hash = ? WHERE role = \'Docente\'', [hash], (err) => {
        if (err) console.error(err);
        else console.log('All teachers passwords reset to Liceo2026');
        db.close();
    });
}

resetTeachers();
