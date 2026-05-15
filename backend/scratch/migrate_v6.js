const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function migrate() {
    const db = await open({
        filename: path.join(__dirname, '../liceopro.db'),
        driver: sqlite3.Database
    });
    
    console.log("Iniciando migración V6 - Sistema de bloqueos independiente (JS)...");

    try {
        await db.run(`
            CREATE TABLE IF NOT EXISTS grades_locks (
                level_id INTEGER,
                subject_id INTEGER,
                academic_year INTEGER,
                period TEXT,
                is_locked INTEGER DEFAULT 0,
                PRIMARY KEY (level_id, subject_id, academic_year, period)
            )
        `);
        console.log("Tabla grades_locks creada/verificada.");

        // Opcional: Migrar bloqueos existentes de teacher_assignments
        const existingLocks = await db.all("SELECT level_id, subject_id, academic_year, is_locked FROM teacher_assignments WHERE is_locked = 1");
        for (const lock of existingLocks) {
            await db.run(`INSERT OR IGNORE INTO grades_locks (level_id, subject_id, academic_year, period, is_locked) VALUES (?, ?, ?, '1er Semestre', 1)`, 
                [lock.level_id, lock.subject_id, lock.academic_year]);
            await db.run(`INSERT OR IGNORE INTO grades_locks (level_id, subject_id, academic_year, period, is_locked) VALUES (?, ?, ?, '2do Semestre', 1)`, 
                [lock.level_id, lock.subject_id, lock.academic_year]);
        }

        console.log("Migración V6 completada.");
    } catch (error) {
        console.error("Error en migración V6:", error);
    }
}

migrate();
