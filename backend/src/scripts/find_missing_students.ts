import db from '../config/db';
import * as xlsx from 'xlsx';

function cleanRun(run: any): string {
    if (run === undefined || run === null) return '';
    const clean = String(run).replace(/[^0-9kK]/g, '');
    if (clean.length > 1) {
        const body = clean.slice(0, -1);
        const dv = clean.slice(-1).toUpperCase();
        return `${body}-${dv}`;
    }
    return clean.toUpperCase();
}

async function findMissing() {
    try {
        console.log("Conectando al pool y obteniendo alumnos de la DB...");
        const dbStudents = await db.all("SELECT run, full_name FROM students");
        const dbRunSet = new Set(dbStudents.map(s => cleanRun(s.run)));
        console.log(`Encontrados ${dbStudents.length} estudiantes en la base de datos.`);

        const filePath = 'C:\\Users\\david\\Downloads\\bd_2026.xlsx';
        console.log(`Cargando Excel desde ${filePath}...`);
        const workbook = xlsx.readFile(filePath);
        const sheetName = 'Base de Datos';
        const worksheet = workbook.Sheets[sheetName];
        
        if (!worksheet) {
            console.error(`Hoja "${sheetName}" no encontrada en el Excel.`);
            return;
        }

        const excelRows = xlsx.utils.sheet_to_json<any>(worksheet);
        console.log(`Encontrados ${excelRows.length} filas en la hoja "${sheetName}".`);

        const missingStudents: any[] = [];
        const foundStudents: any[] = [];

        for (const row of excelRows) {
            // Find key that contains "rut" or "run" (case-insensitive, trimmed)
            const rutKey = Object.keys(row).find(k => k.trim().toUpperCase() === 'RUT');
            const nameKey = Object.keys(row).find(k => k.trim().toUpperCase() === 'NOMBRE');
            const cursoKey = Object.keys(row).find(k => k.trim().toUpperCase() === 'CURSO');
            
            if (!rutKey) continue;
            
            const rawRun = row[rutKey];
            const cleanExcelRun = cleanRun(rawRun);
            if (!cleanExcelRun) continue;

            const name = nameKey ? row[nameKey] : 'Sin Nombre';
            const curso = cursoKey ? row[cursoKey] : 'Sin Curso';

            if (!dbRunSet.has(cleanExcelRun)) {
                missingStudents.push({
                    run: cleanExcelRun,
                    originalRun: rawRun,
                    name,
                    curso
                });
            } else {
                foundStudents.push({
                    run: cleanExcelRun,
                    name
                });
            }
        }

        console.log(`\nComparación completada:`);
        console.log(`- Estudiantes en Excel: ${excelRows.length}`);
        console.log(`- Estudiantes ya en la DB: ${foundStudents.length}`);
        console.log(`- Estudiantes faltantes en la DB: ${missingStudents.length}`);
        
        if (missingStudents.length > 0) {
            console.log("\nEstudiantes faltantes (primeros 20):");
            missingStudents.slice(0, 20).forEach((s, idx) => {
                console.log(`${idx + 1}. [RUT: ${s.run}] ${s.name} (${s.curso})`);
            });
            if (missingStudents.length > 20) {
                console.log(`... y ${missingStudents.length - 20} más.`);
            }
        } else {
            console.log("¡Todos los estudiantes del Excel ya están en la base de datos!");
        }

    } catch (error) {
        console.error("Error al buscar estudiantes faltantes:", error);
    } finally {
        setTimeout(() => process.exit(0), 1000);
    }
}

findMissing();
