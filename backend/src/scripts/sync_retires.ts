import db from '../config/db';
import * as xlsx from 'xlsx';
import * as crypto from 'crypto';

const DRY_RUN = process.env.DRY_RUN !== 'false';
const BATCH_SIZE = 10; // Concurrency limit for parallel DB writes

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
        .replace(/[^a-z0-9]/g, " ")       // Keep only alphanumeric
        .replace(/\s+/g, " ")             // Compress spaces
        .trim();
}

const parseExcelDate = (dateVal: any): string | null => {
    if (!dateVal) return null;
    if (typeof dateVal === 'number') {
        const date = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
        return date.toISOString().split('T')[0];
    }
    if (typeof dateVal === 'string') {
        const parts = dateVal.trim().split(/[-/]/);
        if (parts.length === 3) {
            let d, m, y;
            const p0 = parseInt(parts[0]);
            const p1 = parseInt(parts[1]);
            
            if (parts[0].length === 4) {
                // YYYY-MM-DD
                y = parts[0]; m = parts[1]; d = parts[2];
            } else if (p0 > 12) {
                // DD-MM-YYYY
                d = parts[0]; m = parts[1]; y = parts[2];
            } else if (p1 > 12) {
                // MM-DD-YYYY
                m = parts[0]; d = parts[1]; y = parts[2];
            } else {
                // Ambiguous, assume DD-MM-YYYY (Chilean standard)
                d = parts[0]; m = parts[1]; y = parts[2];
            }
            
            if (y && y.length === 2) y = '20' + y;
            if (d && m && y) {
                return `${y}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
            }
        }
    }
    return String(dateVal);
};

function parseFullName(fullName: string) {
    let firstName = '', paternalSurname = '', maternalSurname = '';
    if (fullName) {
        const parts = String(fullName).trim().split(/\s+/);
        if (parts.length >= 3) {
            paternalSurname = parts[0];
            maternalSurname = parts[1];
            firstName = parts.slice(2).join(' ');
        } else if (parts.length === 2) {
            paternalSurname = parts[0];
            firstName = parts[1];
        } else {
            firstName = fullName;
        }
    }
    const cleanFullName = `${paternalSurname || ''} ${maternalSurname || ''} ${firstName || ''}`.replace(/\s+/g, ' ').trim() || fullName;
    return { firstName, paternalSurname, maternalSurname, cleanFullName };
}

// Concurrency helper for running tasks in parallel batches
async function runBatches<T>(items: T[], batchSize: number, worker: (item: T) => Promise<void>) {
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        await Promise.all(batch.map(item => worker(item)));
    }
}

async function runSync() {
    console.log(`\n=== INICIANDO SINCRONIZACIÓN OPTIMIZADA DE RETIROS ===`);
    console.log(`Modo: ${DRY_RUN ? 'DRY RUN (Simulación)' : 'REAL WRITE (Escritura en Base de Datos)'}`);

    try {
        // 1. Cargar niveles de la DB utilizando el pool wrapper
        const levelsRes = await db.all("SELECT id, name FROM levels");
        const levelMap: Record<string, number> = {};
        for (const lvl of levelsRes) {
            levelMap[lvl.name.toUpperCase()] = lvl.id;
        }

        // 2. Cargar Excel
        const filePath = 'C:\\Users\\david\\Downloads\\BASE_DATOS_REVISADA_RETIROS.xlsx';
        console.log(`[Excel] Cargando ${filePath}...`);
        const workbook = xlsx.readFile(filePath);
        
        const estSheet = workbook.Sheets['Estudiantes'];
        if (!estSheet) throw new Error("Hoja 'Estudiantes' no encontrada.");
        
        const excelRows = xlsx.utils.sheet_to_json<any>(estSheet);
        const excelStudentMap = new Map<string, any>();
        const excelNameMap = new Map<string, any>(); // normName -> row

        for (const row of excelRows) {
            const rawRun = row['Rut'];
            const clean = cleanRun(rawRun);
            const normName = normalizeName(row['Nombre']);
            
            if (clean) {
                excelStudentMap.set(clean, row);
            }
            if (normName) {
                excelNameMap.set(normName, row);
            }
        }

        // Cargar apoderados del Excel
        let titularesByStudentRun: Record<string, any> = {};
        if (workbook.SheetNames.includes('bd_titulares')) {
            const titularesData = xlsx.utils.sheet_to_json<any>(workbook.Sheets['bd_titulares'], { defval: "" });
            for (const row of titularesData) {
                const sRun = cleanRun(row['RUN Estudiante']);
                if (sRun) titularesByStudentRun[sRun] = row;
            }
        }

        let suplentesByStudentRun: Record<string, any> = {};
        if (workbook.SheetNames.includes('bd_suplentes')) {
            const suplentesData = xlsx.utils.sheet_to_json<any>(workbook.Sheets['bd_suplentes'], { defval: "" });
            for (const row of suplentesData) {
                const sRun = cleanRun(row['RUN Estudiante']);
                if (sRun) suplentesByStudentRun[sRun] = row;
            }
        }

        // 3. Cargar estudiantes de la DB
        const dbStudents = await db.all("SELECT id, run, full_name, status FROM students");
        
        // 4. PRE-CARGAR tablas relacionadas para evitar SELECTs individuales en bucle (Optimización crítica para Supabase)
        console.log("[DB] Pre-cargando relaciones (health_records, enrollments, guardians)...");
        
        const healthRecordsRes = await db.all("SELECT student_id, id FROM health_records");
        const dbHealthMap = new Map<string, string>(); // studentId -> healthRecordId
        for (const hr of healthRecordsRes) {
            dbHealthMap.set(hr.student_id, hr.id);
        }

        const enrollmentsRes = await db.all("SELECT student_id, id FROM enrollments WHERE academic_year = 2026");
        const dbEnrollmentMap = new Map<string, string>(); // studentId -> enrollmentId
        for (const en of enrollmentsRes) {
            dbEnrollmentMap.set(en.student_id, en.id);
        }

        const guardiansRes = await db.all("SELECT student_id, guardian_type, id FROM guardians");
        const dbGuardianMap = new Map<string, string>(); // `${studentId}_${guardianType}` -> guardianId
        for (const g of guardiansRes) {
            dbGuardianMap.set(`${g.student_id}_${g.guardian_type}`, g.id);
        }

        const studentMap: Record<string, string> = {}; // run -> id
        const matchedDbIds = new Set<string>();
        const matchedExcelRuns = new Set<string>();

        const runCorrections: any[] = [];
        const deletions: any[] = [];

        // Fase A: Emparejar por RUN exacto
        for (const s of dbStudents) {
            const cleanSrun = cleanRun(s.run);
            if (excelStudentMap.has(cleanSrun)) {
                matchedDbIds.add(s.id);
                matchedExcelRuns.add(cleanSrun);
                studentMap[cleanSrun] = s.id;
            }
        }

        // Fase B: Emparejar por Nombre para RUNs corregidos
        for (const s of dbStudents) {
            if (matchedDbIds.has(s.id)) continue;
            
            const normDbName = normalizeName(s.full_name);
            if (excelNameMap.has(normDbName)) {
                const excelRow = excelNameMap.get(normDbName);
                const cleanExcelRun = cleanRun(excelRow['Rut']);
                
                if (cleanExcelRun && !matchedExcelRuns.has(cleanExcelRun)) {
                    matchedDbIds.add(s.id);
                    matchedExcelRuns.add(cleanExcelRun);
                    studentMap[cleanExcelRun] = s.id;
                    
                    const oldRun = cleanRun(s.run);
                    runCorrections.push({
                        studentId: s.id,
                        oldRun,
                        newRun: cleanExcelRun,
                        name: s.full_name
                    });
                }
            }
        }

        // Fase C: Identificar alumnos huérfanos a eliminar (no están en Excel y tienen 0 notas)
        for (const s of dbStudents) {
            if (matchedDbIds.has(s.id)) continue;
            
            const cleanSrun = cleanRun(s.run);
            const gradesCount = await db.get("SELECT COUNT(*) as count FROM grades WHERE student_id = ?", [s.id]);
            
            if (gradesCount.count > 0) {
                console.warn(`[WARN] Estudiante ${s.full_name} (RUT: ${cleanSrun}) no está en el Excel pero tiene ${gradesCount.count} notas. ¡No se eliminará para proteger sus notas!`);
            } else {
                deletions.push({
                    id: s.id,
                    run: cleanSrun,
                    name: s.full_name
                });
            }
        }

        // 5. EJECUTAR ACCIONES DE ESCRITURA EN DB (SI NO ES DRY RUN)
        if (!DRY_RUN) {
            console.log("\n--- APLICANDO CAMBIOS INICIALES EN LA BASE DE DATOS ---");

            // Acción 1: Aplicar correcciones de RUN
            for (const c of runCorrections) {
                await db.run("UPDATE students SET run = ? WHERE id = ?", [c.newRun, c.studentId]);
                console.log(`[Corrección RUT] RUN actualizado para ${c.name}: ${c.oldRun} -> ${c.newRun}`);
            }

            // Acción 2: Eliminar huérfanos con 0 notas (en orden de clave foránea)
            for (const d of deletions) {
                await db.run("DELETE FROM observations WHERE student_id = ?", [d.id]);
                await db.run("DELETE FROM enrollments WHERE student_id = ?", [d.id]);
                await db.run("DELETE FROM health_records WHERE student_id = ?", [d.id]);
                await db.run("DELETE FROM guardians WHERE student_id = ?", [d.id]);
                await db.run("DELETE FROM students WHERE id = ?", [d.id]);
                console.log(`[Eliminación] Estudiante eliminado definitivamente (0 notas): ${d.name} (RUT: ${d.run})`);
            }
        } else {
            console.log("\n--- SIMULACIÓN (DRY RUN) ---");
            console.log(`- Se aplicarían ${runCorrections.length} correcciones de RUN.`);
            console.log(`- Se eliminarían ${deletions.length} estudiantes huérfanos con 0 notas.`);
        }

        // Acción 3: Preparar array de estudiantes para UPSERT (procesamiento en paralelo controlado)
        let updatedCount = 0;
        let addedCount = 0;
        const studentRowsToProcess: any[] = [];

        for (const [run, row] of excelStudentMap.entries()) {
            studentRowsToProcess.push({ run, row });
        }

        console.log(`\n[DB] Procesando ${studentRowsToProcess.length} estudiantes del Excel en lotes de ${BATCH_SIZE}...`);

        const writeWorker = async (item: any) => {
            const { run, row } = item;
            const fullName = row['Nombre'];
            const { firstName, paternalSurname, maternalSurname, cleanFullName } = parseFullName(fullName);
            
            const birthDate = parseExcelDate(row['Fechas Nacimiento'] || row['FECHA NACIMIENTO']);
            const gender = row['Sexo'];
            const address = row['Dirección'] || row['DIRECCIÓN'];
            const commune = row['Comuna'];
            const religion = row['Religión'] || row['RELIGIÓN'];
            const entryDate = parseExcelDate(row['Fecha de Ingreso'] || row['FECHA DE INGRESO']);
            const enrollmentNumber = row['N° Matrícula'] || row['NUMERO_MATRICULA'];
            
            const rawStatus = (row['estado'] || row['ESTADO'] || 'Active').toString().trim().toUpperCase();
            const rawRetiro = row['Fecha de Retiro'] || row['FECHA DE RETIRO'];
            let status = 'Active';
            let withdrawalDate: string | null = null;
            if (rawStatus.startsWith('RET') || rawStatus.startsWith('INAC') || rawStatus === 'INACTIVE' || rawStatus === 'INACTIVO' || (rawRetiro && String(rawRetiro).trim() !== '')) {
                status = 'RETIRADO';
                withdrawalDate = parseExcelDate(rawRetiro) || new Date().toISOString().split('T')[0];
            }
            
            const cursoStr = row['CURSO']?.toString().toUpperCase();

            // Mapear nivel
            let levelId: number | null = null;
            if (cursoStr) {
                if (levelMap[cursoStr]) {
                    levelId = levelMap[cursoStr];
                } else {
                    if (!DRY_RUN) {
                        const newLvl = await db.get("INSERT INTO levels (name, total_capacity, current_enrolled) VALUES (?, 40, 0) RETURNING id", [cursoStr]);
                        levelId = newLvl.id;
                        levelMap[cursoStr] = levelId;
                        console.log(`[Nivel] Creado nuevo curso "${cursoStr}" con ID ${levelId}`);
                    } else {
                        levelId = 9999;
                    }
                }
            }

            const existingId = studentMap[run];
            
            if (existingId) {
                // Actualizar
                if (!DRY_RUN) {
                    await db.run(`
                        UPDATE students SET 
                            full_name = ?, first_name = ?, paternal_surname = ?, maternal_surname = ?,
                            birth_date = ?, gender = ?, address = ?, commune = ?, religion = ?, status = ?, entry_date = ?, enrollment_number = ?, withdrawal_date = ?
                        WHERE id = ?
                    `, [
                        cleanFullName, firstName, paternalSurname, maternalSurname,
                        birthDate, gender, address, commune, religion, status, entryDate, enrollmentNumber, withdrawalDate,
                        existingId
                    ]);

                    // Ficha salud (desde mapa en memoria)
                    const healthId = dbHealthMap.get(existingId);
                    if (healthId) {
                        await db.run(`
                            UPDATE health_records SET blood_type = ?, allergies = ?, chronic_diseases = ? WHERE student_id = ?
                        `, [row['Grupo Sanguíneo'] || '', row['Alergias'] || '', row['Enfermedades'] || '', existingId]);
                    } else {
                        await db.run(`
                            INSERT INTO health_records (id, student_id, blood_type, allergies, chronic_diseases) VALUES (?, ?, ?, ?, ?)
                        `, [crypto.randomUUID(), existingId, row['Grupo Sanguíneo'] || '', row['Alergias'] || '', row['Enfermedades'] || '']);
                    }

                    // Matrícula 2026 (desde mapa en memoria)
                    if (levelId) {
                        const enrollmentId = dbEnrollmentMap.get(existingId);
                        if (enrollmentId) {
                            await db.run("UPDATE enrollments SET level_id = ? WHERE id = ?", [levelId, enrollmentId]);
                        } else {
                            await db.run("INSERT INTO enrollments (id, student_id, level_id, academic_year) VALUES (?, ?, ?, 2026)", [crypto.randomUUID(), existingId, levelId]);
                        }
                    }
                }
                updatedCount++;
            } else {
                // Agregar nuevo
                if (!DRY_RUN) {
                    const studentId = crypto.randomUUID();
                    studentMap[run] = studentId;

                    await db.run(`
                        INSERT INTO students (
                            id, run, full_name, first_name, paternal_surname, maternal_surname,
                            birth_date, gender, address, commune, religion, status, entry_date, enrollment_number, withdrawal_date
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        studentId, run, cleanFullName, firstName, paternalSurname, maternalSurname,
                        birthDate, gender, address, commune, religion, status, entryDate, enrollmentNumber, withdrawalDate
                    ]);

                    await db.run(`
                        INSERT INTO health_records (id, student_id, blood_type, allergies, chronic_diseases) VALUES (?, ?, ?, ?, ?)
                    `, [crypto.randomUUID(), studentId, row['Grupo Sanguíneo'] || '', row['Alergias'] || '', row['Enfermedades'] || '']);

                    if (levelId) {
                        await db.run("INSERT INTO enrollments (id, student_id, level_id, academic_year) VALUES (?, ?, ?, 2026)", [crypto.randomUUID(), studentId, levelId]);
                    }
                }
                addedCount++;
            }

            // Guardar o actualizar apoderados
            if (!DRY_RUN) {
                const sId = studentMap[run];
                const titular = titularesByStudentRun[run];
                if (titular) {
                    const gRun = titular['RUN/IPA'] || 'S/R';
                    const gName = titular['Nombre Apoderado Titular'] || 'Sin Nombre';
                    const gPhone = titular['Teléfono Titular'] || '';
                    
                    const guardianId = dbGuardianMap.get(`${sId}_Titular`);
                    if (guardianId) {
                        await db.run("UPDATE guardians SET run = ?, full_name = ?, phone = ? WHERE id = ?", [gRun, gName, gPhone, guardianId]);
                    } else {
                        await db.run("INSERT INTO guardians (id, student_id, guardian_type, run, full_name, phone) VALUES (?, ?, 'Titular', ?, ?, ?)", [crypto.randomUUID(), sId, gRun, gName, gPhone]);
                    }
                }

                const suplente = suplentesByStudentRun[run];
                if (suplente) {
                    const gRun = suplente['RUN/IPA'] || 'S/R';
                    const gName = suplente['Nombre Apoderado Suplente'] || 'Sin Nombre';
                    const gPhone = suplente['Teléfono Suplente'] || '';
                    const gRelation = suplente['Parentesco'] || '';
                    const gEmail = suplente['Email'] || '';
                    const gAddr = suplente['Dirección'] || '';

                    const guardianId = dbGuardianMap.get(`${sId}_Suplente`);
                    if (guardianId) {
                        await db.run("UPDATE guardians SET run = ?, full_name = ?, phone = ?, relationship = ?, email = ?, address = ? WHERE id = ?", [gRun, gName, gPhone, gRelation, gEmail, gAddr, guardianId]);
                    } else {
                        await db.run("INSERT INTO guardians (id, student_id, guardian_type, run, full_name, phone, relationship, email, address) VALUES (?, ?, 'Suplente', ?, ?, ?, ?, ?, ?)", [crypto.randomUUID(), sId, gRun, gName, gPhone, gRelation, gEmail, gAddr]);
                    }
                }
            }
        };

        // Ejecutar escritura en lotes paralelos controlados
        await runBatches(studentRowsToProcess, BATCH_SIZE, writeWorker);

        console.log(`\n--- RESULTADOS FINALES DE SINCRONIZACIÓN ---`);
        console.log(`- Estudiantes actualizados: ${updatedCount}`);
        console.log(`- Estudiantes agregados: ${addedCount}`);
        console.log(`- Estudiantes eliminados (0 notas): ${deletions.length}`);

        console.log(`\n==================================================`);
        if (DRY_RUN) {
            console.log(`[FIN] Simulación completada con éxito. No se hicieron cambios.`);
        } else {
            console.log(`[FIN] Base de datos actualizada con éxito con el archivo revisado.`);
        }

    } catch (error) {
        console.error("Error crítico durante la sincronización:", error);
    } finally {
        setTimeout(() => process.exit(0), 1000);
    }
}

runSync();
