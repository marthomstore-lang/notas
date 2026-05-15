
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcrypt';
import path from 'path';

async function resetPasswords() {
    const dbPath = path.join(__dirname, '..', '..', 'liceopro.db');
    console.log('Opening database at:', dbPath);
    
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    const newPlainPassword = '123456';
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPlainPassword, saltRounds);

    console.log(`Starting password reset for all teachers to "${newPlainPassword}"...`);

    const result = await db.run(`
        UPDATE users 
        SET password_hash = ?, password_plain = ?
        WHERE role = 'Docente'
    `, [hashedPassword, newPlainPassword]);

    console.log(`Success! Updated ${result.changes} teachers.`);
    
    await db.close();
}

resetPasswords().catch(err => {
    console.error('Error resetting passwords:', err);
    process.exit(1);
});
