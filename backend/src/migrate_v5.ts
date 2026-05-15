import { getDb } from './config/db';

async function migrate() {
    const db = await getDb();
    
    console.log("Iniciando migración V5 - Soporte para visualización de contraseña (Administrativo)...");

    try {
        try {
            await db.run(`ALTER TABLE users ADD COLUMN password_plain TEXT`);
            console.log("Columna password_plain añadida a la tabla users.");
        } catch (e) {
            console.log("La columna password_plain ya existe.");
        }

        // Actualizar el admin por defecto si es posible (opcional)
        await db.run(`UPDATE users SET password_plain = '123' WHERE run = 'admin'`);

        console.log("Migración V5 completada.");
    } catch (error) {
        console.error("Error en migración V5:", error);
    }
}

migrate();
