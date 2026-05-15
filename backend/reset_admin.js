const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

async function reset() {
    const db = new sqlite3.Database('liceopro.db');
    const hash = await bcrypt.hash('Liceo2026', 10);
    db.run('UPDATE users SET password_hash = ? WHERE email = ?', [hash, 'admin@liceo.cl'], (err) => {
        if (err) console.error(err);
        else console.log('Admin password reset to Liceo2026');
        db.close();
    });
}

reset();
