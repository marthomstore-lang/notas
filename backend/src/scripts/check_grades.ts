import db from '../config/db';

async function checkGrades() {
    try {
        console.log("=== DIAGNÓSTICO DE CALIFICACIONES EN LA DB ===");
        
        // 1. Contar estudiantes
        const studentsCount = await db.all("SELECT COUNT(*) as count FROM students");
        console.log("Total estudiantes:", studentsCount[0].count);

        // 2. Contar notas
        const gradesCount = await db.all("SELECT COUNT(*) as count FROM grades");
        console.log("Total calificaciones (grades):", gradesCount[0].count);

        // 3. Contar columnas de notas
        const columnsCount = await db.all("SELECT COUNT(*) as count FROM grade_columns");
        console.log("Total columnas de evaluación (grade_columns):", columnsCount[0].count);

        // 4. Contar asignaturas
        const subjectsCount = await db.all("SELECT COUNT(*) as count FROM subjects");
        console.log("Total asignaturas:", subjectsCount[0].count);

        // 5. Contar matrículas
        const enrollmentsCount = await db.all("SELECT COUNT(*) as count FROM enrollments");
        console.log("Total matrículas (enrollments):", enrollmentsCount[0].count);

        // 6. Obtener una muestra de las notas si existen
        if (gradesCount[0].count > 0) {
            const sampleGrades = await db.all(`
                SELECT g.grade_value, s.full_name, gc.title, sub.name as subject_name
                FROM grades g
                JOIN students s ON g.student_id = s.id
                JOIN grade_columns gc ON g.grade_column_id = gc.id
                JOIN subjects sub ON gc.subject_id = sub.id
                LIMIT 5
            `);
            console.log("Muestra de calificaciones:", sampleGrades);
        } else {
            console.log("¡ADVERTENCIA: La tabla de calificaciones (grades) está VACÍA!");
        }

    } catch (error) {
        console.error("Error al diagnosticar calificaciones:", error);
    } finally {
        setTimeout(() => process.exit(0), 1000);
    }
}

checkGrades();
