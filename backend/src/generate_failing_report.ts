import dbWrapper from './config/db';
import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

interface FailingRecord {
    num: number;
    levelName: string;
    studentRun: string;
    studentName: string;
    subjectName: string;
    failingAverage: number;
}

interface StudentSummary {
    num: number;
    levelName: string;
    studentRun: string;
    studentName: string;
    failingCount: number;
    failingSubjects: string;
    generalAverage: number;
}

async function generateFailingReport() {
    console.log('Iniciando generación de informe de estudiantes con promedios rojos...');

    // 1. Obtener todas las matrículas activas con datos de alumno y nivel
    const studentsQuery = `
        SELECT 
            s.id as student_id,
            s.run as student_run,
            s.full_name as student_name,
            l.id as level_id,
            l.name as level_name
        FROM students s
        JOIN enrollments e ON s.id = e.student_id
        JOIN levels l ON e.level_id = l.id
        WHERE s.status = 'Active'
        ORDER BY l.name ASC, s.full_name ASC
    `;

    const students = await dbWrapper.all(studentsQuery);
    console.log(`Total de estudiantes activos encontrados: ${students.length}`);

    // 2. Obtener todas las columnas de notas y sus calificaciones
    const gradeColumns = await dbWrapper.all(`
        SELECT id, level_id, subject_id, weighting 
        FROM grade_columns
    `);

    const subjects = await dbWrapper.all(`SELECT id, name FROM subjects`);
    const subjectMap = new Map<number, string>();
    subjects.forEach((sub: any) => subjectMap.set(sub.id, sub.name));

    const grades = await dbWrapper.all(`
        SELECT student_id, grade_column_id, grade_value 
        FROM grades 
        WHERE grade_value IS NOT NULL AND grade_value > 0
    `);

    // Organizar notas por student_id -> subject_id -> lista de notas (con peso)
    const columnMap = new Map<string, { level_id: number; subject_id: number; weighting: number }>();
    gradeColumns.forEach((col: any) => {
        columnMap.set(col.id, {
            level_id: col.level_id,
            subject_id: col.subject_id,
            weighting: Number(col.weighting || 0)
        });
    });

    // Structure: studentGrades[student_id][subject_id] = Array<{ val: number, weight: number }>
    const studentGrades = new Map<string, Map<number, Array<{ val: number; weight: number }>>>();

    grades.forEach((g: any) => {
        const colInfo = columnMap.get(g.grade_column_id);
        if (!colInfo) return;

        if (!studentGrades.has(g.student_id)) {
            studentGrades.set(g.student_id, new Map());
        }
        const subjMap = studentGrades.get(g.student_id)!;
        if (!subjMap.has(colInfo.subject_id)) {
            subjMap.set(colInfo.subject_id, []);
        }
        subjMap.get(colInfo.subject_id)!.push({
            val: Number(g.grade_value),
            weight: colInfo.weighting
        });
    });

    const failingRecords: FailingRecord[] = [];
    const studentSummariesMap = new Map<string, {
        levelName: string;
        studentRun: string;
        studentName: string;
        failingSubjects: Array<{ name: string; avg: number }>;
        allAverages: number[];
    }>();

    let detailCounter = 1;

    for (const student of students) {
        const subjMap = studentGrades.get(student.student_id);
        if (!subjMap) continue;

        const failingList: Array<{ name: string; avg: number }> = [];
        const allAverages: number[] = [];

        subjMap.forEach((gradeList, subjectId) => {
            if (gradeList.length === 0) return;

            let average = 0;
            const hasWeights = gradeList.some(item => item.weight > 0);

            if (hasWeights) {
                let totalWeight = 0;
                let weightedSum = 0;
                gradeList.forEach(item => {
                    const w = item.weight > 0 ? item.weight : 0;
                    weightedSum += item.val * w;
                    totalWeight += w;
                });
                if (totalWeight > 0) {
                    average = weightedSum / totalWeight;
                } else {
                    const sum = gradeList.reduce((acc, curr) => acc + curr.val, 0);
                    average = sum / gradeList.length;
                }
            } else {
                const sum = gradeList.reduce((acc, curr) => acc + curr.val, 0);
                average = sum / gradeList.length;
            }

            // Redondear a 1 decimal
            const roundedAvg = Math.round(average * 10) / 10;
            allAverages.push(roundedAvg);

            const subjectName = subjectMap.get(subjectId) || `Asignatura #${subjectId}`;

            // Si el promedio es estrictamente menor a 4.0 (promedio rojo)
            if (roundedAvg < 4.0) {
                failingList.push({ name: subjectName, avg: roundedAvg });
                failingRecords.push({
                    num: detailCounter++,
                    levelName: student.level_name,
                    studentRun: student.student_run,
                    studentName: student.student_name,
                    subjectName: subjectName,
                    failingAverage: roundedAvg
                });
            }
        });

        if (failingList.length > 0) {
            studentSummariesMap.set(student.student_id, {
                levelName: student.level_name,
                studentRun: student.student_run,
                studentName: student.student_name,
                failingSubjects: failingList,
                allAverages: allAverages
            });
        }
    }

    console.log(`Total de registros de promedios rojos individuales: ${failingRecords.length}`);
    console.log(`Total de estudiantes con al menos 1 promedio rojo: ${studentSummariesMap.size}`);

    // Construir tabla de resumen por estudiante
    const studentSummaries: StudentSummary[] = [];
    let summaryCounter = 1;

    studentSummariesMap.forEach((data) => {
        const failingSubjectsStr = data.failingSubjects
            .map(s => `${s.name} (${s.avg.toFixed(1)})`)
            .join(', ');

        const genAvg = data.allAverages.length > 0
            ? Math.round((data.allAverages.reduce((a, b) => a + b, 0) / data.allAverages.length) * 10) / 10
            : 0;

        studentSummaries.push({
            num: summaryCounter++,
            levelName: data.levelName,
            studentRun: data.studentRun,
            studentName: data.studentName,
            failingCount: data.failingSubjects.length,
            failingSubjects: failingSubjectsStr,
            generalAverage: genAvg
        });
    });

    // 3. Crear Workbook de Excel
    const wb = XLSX.utils.book_new();

    // Hoja 1: Detalle por Asignatura y Estudiante
    const detailDataForExcel = failingRecords.map(r => ({
        'N°': r.num,
        'Curso': r.levelName,
        'RUT Estudiante': r.studentRun,
        'Nombre Estudiante': r.studentName,
        'Asignatura': r.subjectName,
        'Promedio Rojo': r.failingAverage
    }));

    const wsDetail = XLSX.utils.json_to_sheet(detailDataForExcel);

    // Ajustar ancho de columnas para la hoja de detalle
    wsDetail['!cols'] = [
        { wch: 6 },  // N°
        { wch: 18 }, // Curso
        { wch: 15 }, // RUT
        { wch: 35 }, // Nombre
        { wch: 30 }, // Asignatura
        { wch: 15 }  // Promedio Rojo
    ];

    XLSX.utils.book_append_sheet(wb, wsDetail, 'Detalle Promedios Rojos');

    // Hoja 2: Resumen por Estudiante
    const summaryDataForExcel = studentSummaries.map(s => ({
        'N°': s.num,
        'Curso': s.levelName,
        'RUT Estudiante': s.studentRun,
        'Nombre Estudiante': s.studentName,
        'Cant. Asignaturas Reprobadas': s.failingCount,
        'Detalle Asignaturas y Promedios': s.failingSubjects,
        'Promedio General Alumno': s.generalAverage
    }));

    const wsSummary = XLSX.utils.json_to_sheet(summaryDataForExcel);

    wsSummary['!cols'] = [
        { wch: 6 },  // N°
        { wch: 18 }, // Curso
        { wch: 15 }, // RUT
        { wch: 35 }, // Nombre
        { wch: 28 }, // Cant. Asignaturas
        { wch: 60 }, // Detalle Asignaturas
        { wch: 22 }  // Promedio General
    ];

    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen por Estudiante');

    // Guardar archivo Excel en la raíz del proyecto
    const outputPath = 'c:\\proyectos\\base de datos\\Reporte_Estudiantes_Promedios_Rojos_2026.xlsx';
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    fs.writeFileSync(outputPath, excelBuffer);

    console.log(`\n==========================================================`);
    console.log(`¡Archivo Excel generado exitosamente!`);
    console.log(`Ubicación: ${outputPath}`);
    console.log(`Estudiantes afectados: ${studentSummaries.length}`);
    console.log(`Total de asignaturas reprobadas: ${failingRecords.length}`);
    console.log(`==========================================================\n`);

    process.exit(0);
}

generateFailingReport().catch(err => {
    console.error('Error al generar el informe:', err);
    process.exit(1);
});
