const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

async function setAdmin() {
    const db = new sqlite3.Database('liceopro.db');
    const rut = '18803735-6';
    const pass = '182011';
    const hash = await bcrypt.hash(pass, 10);
    
    // Update the admin user
    db.run('UPDATE users SET run = ?, password_hash = ?, role = \'Admin\' WHERE email = ?', [rut, hash, 'admin@liceo.cl'], function(err) {
        if (err) console.error(err);
        else {
            if (this.changes === 0) {
                // If no user with that email, just insert new one
                db.run('INSERT INTO users (id, run, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)', 
                    ['admin-new', rut, 'Administrador', 'admin@liceo.cl', hash, 'Admin'], (err2) => {
                        if (err2) console.error(err2);
                        else console.log('New Admin created');
                        db.close();
                    });
            } else {
                console.log(`Admin user updated to RUT ${rut}`);
                db.close();
            }
        }
    });
}

setAdmin();
