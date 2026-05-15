import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

async function init() {
    const dbPath = path.join(__dirname, '../liceopro.db');
    
    // Eliminar la BD antigua si existe para asegurar que se creen las nuevas tablas
    if (fs.existsSync(dbPath)) {
        console.log("Eliminando base de datos antigua...");
        fs.unlinkSync(dbPath);
    }

    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });
    
    console.log("Ejecutando schema.sql nuevo...");
    const schema = fs.readFileSync(path.join(__dirname, '../schema.sql'), 'utf8');
    
    const statements = schema.split(';').filter(s => s.trim().length > 0);
    for (let stmt of statements) {
        await db.run(stmt);
    }

    console.log("Insertando datos de prueba...");
    
    const adminId = uuidv4();
    const teacherId = 't1'; 
    const hashedPass = await bcrypt.hash('123', 10);

    // Solo creamos el administrador principal y un docente de prueba (o ninguno si prefieres)
    await db.run(`INSERT INTO users (id, run, name, email, password_hash, password_plain, role) VALUES 
        (?, 'admin', 'Administrador Principal', 'admin@liceo.cl', ?, '123', 'Admin'),
        (?, 'docente', 'Profesor Juan Pérez', 'juan@liceo.cl', ?, '123', 'Docente')
    `, [adminId, hashedPass, teacherId, hashedPass]);

    // Estructura básica de ejemplo (Opcional, se pueden crear desde el panel)
    await db.run(`INSERT INTO levels (id, name, total_capacity, current_enrolled) VALUES (1, '1° Medio A', 40, 0)`);
    await db.run(`INSERT INTO subjects (id, name) VALUES (101, 'Matemáticas')`);

    console.log("Base de datos de Liceo Pro inicializada con éxito (Versión Limpia).");
}

init().catch(console.error);
