import { getDb } from '../src/config/db';

async function forceUpdate() {
    try {
        const sqlite = await getDb();
        const user = await sqlite.get("SELECT id, name FROM users WHERE name LIKE '%GUTI%'");
        if (!user) {
            console.log("No se encontró el usuario.");
            return;
        }
        
        console.log(`Actualizando a: ${user.name} (ID: ${user.id})`);
        
        const result = await sqlite.run(`
            UPDATE users SET password_plain = '182011' WHERE id = ?
        `, [user.id]);
        
        console.log("Changes:", result.changes);
        
        const verify = await sqlite.get("SELECT password_plain FROM users WHERE id = ?", [user.id]);
        console.log("Verificación:", verify.password_plain);
    } catch (e) {
        console.error(e);
    }
}

forceUpdate();
