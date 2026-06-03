import db from '../config/db';

async function getSummary() {
    try {
        console.log("=== RESUMEN DE ESTUDIANTES EN LA BASE DE DATOS ===");
        
        // 1. Total general
        const total = await db.get("SELECT COUNT(*) as count FROM students");
        
        // 2. Total matriculados (Activos)
        const matriculados = await db.get("SELECT COUNT(*) as count FROM students WHERE status = 'Active'");
        
        // 3. Total retirados
        const retirados = await db.get("SELECT COUNT(*) as count FROM students WHERE status = 'RETIRADO'");
        
        // 4. Detalle por nivel de alumnos activos (matriculados)
        const porNivel = await db.all(`
            SELECT l.name as level_name, COUNT(e.id) as active_count
            FROM levels l
            LEFT JOIN enrollments e ON l.id = e.level_id
            LEFT JOIN students s ON e.student_id = s.id
            WHERE s.status = 'Active' AND e.academic_year = 2026
            GROUP BY l.name, l.id
            ORDER BY l.id
        `);

        console.log(`\n* Estudiantes Totales Registrados: ${total.count}`);
        console.log(`* Estudiantes Activos (Matriculados): ${matriculados.count}`);
        console.log(`* Estudiantes Retirados: ${retirados.count}`);
        
        console.log("\n--- DETALLE DE MATRICULADOS POR CURSO ---");
        for (const lvl of porNivel) {
            console.log(`  - ${lvl.level_name}: ${lvl.active_count} alumnos activos`);
        }

    } catch (error) {
        console.error("Error al obtener el resumen:", error);
    } finally {
        setTimeout(() => process.exit(0), 1000);
    }
}

getSummary();
