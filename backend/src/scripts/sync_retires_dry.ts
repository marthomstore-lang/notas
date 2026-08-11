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

function normalizeName(name: string): string {
    if (!name) return '';
    return name
        .toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^a-z0-9]/g, " ")       // Keep only alphanumeric and replace others with space
        .replace(/\s+/g, " ")             // Compress spaces
        .trim();
}

async function dryRun() {
    try {
        console.log("=== SIMULACIÓN DE ACTUALIZACIÓN CON RETIROS E IMPORTACIÓN INTELIGENTE ===");

        // 1. Cargar datos del Excel
        const filePath = 'C:\\Users\\david\\Downloads\\BASE_DATOS_REVISADA_RETIROS.xlsx';
        console.log(`Cargando Excel desde ${filePath}...`);
        const workbook = xlsx.readFile(filePath);
        const worksheet = workbook.Sheets['Estudiantes'];
        if (!worksheet) {
            console.error("No se encontró la hoja 'Estudiantes' en el Excel.");
            return;
        }
        
        const excelRows = xlsx.utils.sheet_to_json<any>(worksheet);
        console.log(`Estudiantes en Excel: ${excelRows.length}`);

        const excelRunSet = new Set<string>();
        const excelStudentMap = new Map<string, any>();
        const excelNameMap = new Map<string, any>(); // normalized_name -> row

        for (const row of excelRows) {
            const rawRun = row['Rut'];
            const clean = cleanRun(rawRun);
            const normName = normalizeName(row['Nombre']);
            
            if (clean) {
                excelRunSet.add(clean);
                excelStudentMap.set(clean, row);
            }
            if (normName) {
                excelNameMap.set(normName, row);
            }
        }

        // 2. Cargar datos de la DB
        const dbStudents = await db.all("SELECT id, run, full_name, status FROM students");
        console.log(`Estudiantes en DB: ${dbStudents.length}`);

        // 3. Emparejamiento
        const matchedDbIds = new Set<string>();
        const matchedExcelRuns = new Set<string>();

        const runCorrections: any[] = [];
        const updates: any[] = [];
        const additions: any[] = [];
        const deletions: any[] = [];
        const retires: any[] = [];

        // Fase 1: Emparejar por RUN exacto
        for (const s of dbStudents) {
            const cleanSrun = cleanRun(s.run);
            if (excelStudentMap.has(cleanSrun)) {
                matchedDbIds.add(s.id);
                matchedExcelRuns.add(cleanSrun);
                updates.push({
                    studentId: s.id,
                    run: cleanSrun,
                    name: s.full_name,
                    reason: "RUN exacto coincidente"
                });
            }
        }

        // Fase 2: Emparejar por Nombre para detectar RUNs corregidos en alumnos no emparejados
        for (const s of dbStudents) {
            if (matchedDbIds.has(s.id)) continue;

            const normDbName = normalizeName(s.full_name);
            if (excelNameMap.has(normDbName)) {
                const excelRow = excelNameMap.get(normDbName);
                const cleanExcelRun = cleanRun(excelRow['Rut']);
                
                if (cleanExcelRun && !matchedExcelRuns.has(cleanExcelRun)) {
                    matchedDbIds.add(s.id);
                    matchedExcelRuns.add(cleanExcelRun);
                    
                    // Contar notas
                    const gradesCount = await db.get("SELECT COUNT(*) as count FROM grades WHERE student_id = ?", [s.id]);

                    runCorrections.push({
                        studentId: s.id,
                        oldRun: cleanRun(s.run),
                        newRun: cleanExcelRun,
                        name: s.full_name,
                        gradesCount: gradesCount.count
                    });
                }
            }
        }

        // Fase 3: Estudiantes de la DB que quedaron sin emparejar (no están en el Excel de ninguna forma)
        for (const s of dbStudents) {
            if (matchedDbIds.has(s.id)) continue;

            const cleanSrun = cleanRun(s.run);
            const gradesCount = await db.get("SELECT COUNT(*) as count FROM grades WHERE student_id = ?", [s.id]);
            
            if (gradesCount.count > 0) {
                retires.push({
                    id: s.id,
                    run: cleanSrun,
                    name: s.full_name,
                    gradesCount: gradesCount.count
                });
            } else {
                deletions.push({
                    id: s.id,
                    run: cleanSrun,
                    name: s.full_name
                });
            }
        }

        // Fase 4: Estudiantes del Excel que no se emparejaron (nuevos)
        for (const [run, row] of excelStudentMap.entries()) {
            if (matchedExcelRuns.has(run)) continue;
            additions.push({
                run,
                name: row['Nombre'],
                curso: row['CURSO'],
                estado: row['estado'] || 'Active'
            });
        }

        console.log(`\n==================================================`);
        console.log(`--- RESUMEN DE CAMBIOS PROPUESTOS ---`);
        console.log(`- Alumnos a actualizar datos personales: ${updates.length}`);
        console.log(`- Alumnos con corrección de RUN (cambio de RUT y preservación de notas): ${runCorrections.length}`);
        runCorrections.forEach((c, idx) => {
            console.log(`   ${idx + 1}. [RUT Antiguo: ${c.oldRun} -> Nuevo: ${c.newRun}] ${c.name} (Preservando ${c.gradesCount} notas)`);
        });

        console.log(`\n- Alumnos nuevos a agregar: ${additions.length}`);
        additions.forEach((a, idx) => {
            console.log(`   ${idx + 1}. [RUT: ${a.run}] ${a.name} (${a.curso}) - Estado: ${a.estado}`);
        });

        console.log(`\n- Alumnos a marcar como 'RETIRADO' (no están en Excel pero tienen notas históricas): ${retires.length}`);
        retires.forEach((r, idx) => {
            console.log(`   ${idx + 1}. [RUT: ${r.run}] ${r.name} (Preservando ${r.gradesCount} notas)`);
        });

        console.log(`\n- Alumnos a ELIMINAR definitivamente (no están en Excel y tienen 0 notas): ${deletions.length}`);
        deletions.forEach((d, idx) => {
            console.log(`   ${idx + 1}. [RUT: ${d.run}] ${d.name}`);
        });
        console.log(`==================================================`);

    } catch (error) {
        console.error("Error en la simulación:", error);
    } finally {
        setTimeout(() => process.exit(0), 1000);
    }
}

dryRun();
