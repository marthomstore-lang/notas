import { getDb } from './config/db';

const migrate = async () => {
    const db = await getDb();
    try {
        console.log('Iniciando migración v2...');

        // 1. Añadir Profesor Jefe a los niveles
        await db.run('ALTER TABLE levels ADD COLUMN homeroom_teacher_id TEXT REFERENCES users(id)');
        console.log('Columna homeroom_teacher_id añadida a levels.');

        // 2. Crear tabla de configuración institucional
        await db.run(`
            CREATE TABLE IF NOT EXISTS institutional_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        `);
        console.log('Tabla institutional_settings creada.');

        // 3. Insertar valores por defecto
        await db.run("INSERT OR IGNORE INTO institutional_settings (key, value) VALUES ('director_name', 'Nombre del Director')");
        await db.run("INSERT OR IGNORE INTO institutional_settings (key, value) VALUES ('school_name', 'Liceo Pro')");
        
        console.log('Migración v2 completada exitosamente.');
    } catch (error: any) {
        if (error.message.includes('duplicate column name')) {
            console.log('La migración ya fue aplicada anteriormente.');
        } else {
            console.error('Error en migración:', error);
        }
    }
};

migrate();
