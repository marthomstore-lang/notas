import { getDb } from './config/db';
import bcrypt from 'bcrypt';

async function testUpdate() {
    try {
        const sqlite = await getDb();
        const users = await sqlite.all("SELECT id FROM users LIMIT 1");
        if (users.length === 0) return;
        const id = users[0].id;

        const password = '182011';
        const name = 'Test Name';
        const email = 'test@liceo.cl';
        const role = 'Docente';

        const hashedPass = await bcrypt.hash(password, 10);
        
        console.log("Updating with array...");
        const result = await sqlite.run(`
            UPDATE users 
            SET name = ?, email = ?, password_hash = ?, password_plain = ?, role = ? 
            WHERE id = ?
        `, [name, email, hashedPass, password, role, id]);
        
        console.log("Changes (Array):", result.changes);

        console.log("Updating with spread...");
        const result2 = await sqlite.run(`
            UPDATE users 
            SET name = ?, email = ?, password_hash = ?, password_plain = ?, role = ? 
            WHERE id = ?
        `, ...[name, email, hashedPass, password, role, id]);
        
        console.log("Changes (Spread):", result2.changes);

    } catch (error) {
        console.error("Error:", error);
    }
}

testUpdate();
