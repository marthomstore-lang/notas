import db from '../config/db';

async function migrate() {
    try {
        console.log("Creando tabla personality_reports...");
        
        await db.query(`
            CREATE TABLE IF NOT EXISTS personality_reports (
                id TEXT PRIMARY KEY,
                student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
                teacher_id TEXT REFERENCES users(id),
                level_id INTEGER REFERENCES levels(id),
                academic_year INTEGER,
                semester INTEGER,
                report_type TEXT,
                evaluation_data JSONB,
                observations TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(student_id, academic_year, semester, report_type)
            );
        `);
        
        console.log("Migración completada con éxito.");
        process.exit(0);
    } catch (error) {
        console.error("Error en la migración:", error);
        process.exit(1);
    }
}

migrate();
