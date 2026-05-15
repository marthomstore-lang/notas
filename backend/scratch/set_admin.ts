import { getDb } from '../src/config/db';
import bcrypt from 'bcrypt';

async function setAdmin() {
    try {
        const sqlite = await getDb();
        const password = '182011';
        const hashedPass = await bcrypt.hash(password, 10);
        
        const result = await sqlite.run(`
            UPDATE users 
            SET name = ?, email = ?, password_hash = ?, password_plain = ?, role = ?, run = ?
            WHERE run = '18803735-6' OR run = '18.803.735-6'
        `, ['Administrador Sistema', 'admin@liceo.cl', hashedPass, password, 'Admin', '18.803.735-6']);
        
        console.log("Changes:", result.changes);
    } catch (e) {
        console.error(e);
    }
}

setAdmin();
