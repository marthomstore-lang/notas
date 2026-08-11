import db from '../config/db';
import * as xlsx from 'xlsx';
import * as crypto from 'crypto';

// Mode toggle: Set to false to perform actual writes
const DRY_RUN = process.env.DRY_RUN !== 'false';

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

async function sync() {
    console.log(`\n=== INICIANDO SINCRONIZACIÓN DE ESTUDIANTES ===`);
    console.log(`Modo: ${DRY_RUN ? 'DRY RUN (Simulación)' : 'REAL WRITE (Escritura en Base de Datos)'}`);

    let client;
    try {
        // 1. Conectar a la base de datos
        client = await db.connect();
        console.log("[DB] Conexión establecida.");

        // 2. Obtener cursos (levels) de la DB para mapearlos
        const levelsRes = await client.query("SELECT id, name FROM levels");
        const levelMap: Record<string, number> = {};
        for (const lvl of levelsRes.rows) {
            levelMap[lvl.name.toUpperCase()] = lvl.id;
        }

        // 3. Obtener RUTs de estudiantes existentes en la DB
        const studentsRes = await client.query("SELECT run FROM students");
        const existingStudentRuns = new Set(studentsRes.rows.map((s: any) => cleanRun(s.run)));
        console.log(`[DB] Encontrados ${existingStudentRuns.size} estudiantes en la base de datos.`);

        // 4. Cargar y parsear archivo Excel
        const filePath = 'C:\\Users\\david\\Downloads\\bd_2026.xlsx';
        console.log(`[Excel] Cargando archivo ${filePath}...`);
        const workbook = xlsx.readFile(filePath);

        // Cargar hoja de estudiantes
        const mainSheetName = 'Base de Datos';
        const mainSheet = workbook.Sheets[mainSheetName];
        if (!mainSheet) {
            throw new Error(`Hoja "${mainSheetName}" no encontrada en el archivo Excel.`);
        }
        const studentRows = xlsx.utils.sheet_to_json<any[]>(mainSheet, { header: 1, defval: "" });
        if (studentRows.length < 2) {
            throw new Error("La hoja de estudiantes está vacía o no tiene encabezados.");
        }
        const headers = studentRows[0].map(h => String(h).trim().toUpperCase());
        const dataRows = studentRows.slice(1);

        // Cargar apoderados titulares
        let titularesByStudentRun: Record<string, any> = {};
        if (workbook.SheetNames.includes('bd_titulares')) {
            const titularesData = xlsx.utils.sheet_to_json<any>(workbook.Sheets['bd_titulares'], { defval: "" });
            for (const row of titularesData) {
                const sRun = cleanRun(row['RUN Estudiante']);
                if (sRun) {
                    titularesByStudentRun[sRun] = row;
                }
            }
        }

        // Cargar apoderados suplentes
        let suplentesByStudentRun: Record<string, any> = {};
        if (workbook.SheetNames.includes('bd_suplentes')) {
            const suplentesData = xlsx.utils.sheet_to_json<any>(workbook.Sheets['bd_suplentes'], { defval: "" });
            for (const row of suplentesData) {
                const sRun = cleanRun(row['RUN Estudiante']);
                if (sRun) {
                    suplentesByStudentRun[sRun] = row;
                }
            }
        }

        const findCol = (row: any[], possibleNames: string[], fallbackIndex?: number) => {
            for (const name of possibleNames) {
                const idx = headers.indexOf(name.toUpperCase());
                if (idx !== -1 && row[idx] !== undefined && row[idx] !== "") return row[idx];
            }
            if (fallbackIndex !== undefined && row[fallbackIndex] !== undefined && row[fallbackIndex] !== "") return row[fallbackIndex];
            return null;
        };

        const studentsToAdd: any[] = [];

        // Identificar cuáles estudiantes del Excel faltan en la DB
        for (const rowArr of dataRows) {
            const run = findCol(rowArr, ['RUT', 'RUN', 'RUT ALUMNO', 'RUT_ALUMNO', 'RUN_ALUMNO']);
            if (!run) continue;
            const cleanSrun = cleanRun(run);
            if (!cleanSrun) continue;

            if (!existingStudentRuns.has(cleanSrun)) {
                studentsToAdd.push({
                    cleanRun: cleanSrun,
                    rowArr: rowArr
                });
            }
        }

        console.log(`\n[Resultado] Estudiantes en el Excel: ${dataRows.length}`);
        console.log(`[Resultado] Estudiantes que faltan en la DB: ${studentsToAdd.length}`);

        if (studentsToAdd.length === 0) {
            console.log("\n¡No hay estudiantes faltantes que agregar!");
            return;
        }

        console.log(`\nProcesando estudiantes faltantes...`);

        for (const item of studentsToAdd) {
            const { cleanRun: studentRun, rowArr } = item;

            const fullName = findCol(rowArr, ['NOMBRE', 'NOMBRE COMPLETO', 'NOMBRE_COMPLETO', 'ALUMNO', 'ESTUDIANTE'], 1);
            const { firstName, paternalSurname, maternalSurname, cleanFullName } = parseFullName(fullName);

            const birthDate = parseExcelDate(findCol(rowArr, ['FECHA NACIMIENTO', 'FECHAS NACIMIENTO', 'FECHA DE NACIMIENTO', 'FECHAS DE NACIMIENTO', 'F. NACIMIENTO', 'NACIMIENTO'], 4));
            const gender = findCol(rowArr, ['SEXO']);
            const nationality = findCol(rowArr, ['NACIONALIDAD']);
            const address = findCol(rowArr, ['DIRECCIÓN', 'DIRECCION']);
            const region = findCol(rowArr, ['REGIÓN', 'REGION']);
            const commune = findCol(rowArr, ['COMUNA']);
            const previousSchool = findCol(rowArr, ['COLEGIO PROCEDENCIA', 'COLEGIO_PROCEDENCIA']);
            const healthSystem = findCol(rowArr, ['SISTEMA SALUD', 'PREVISION_SALUD']);
            const religion = findCol(rowArr, ['RELIGIÓN', 'RELIGION']);
            const maritalStatus = findCol(rowArr, ['ESTADO CIVIL', 'ESTADO_CIVIL']);
            const ethnicity = findCol(rowArr, ['PUEBLO INDÍGENA', 'PUEBLO_INDIGENA']);
            const studentEmail = findCol(rowArr, ['EMAIL']);
            const studentPhone = findCol(rowArr, ['TELÉFONO ESTUDIANTE', 'TELEFONO_ESTUDIANTE']);
            
            const rawStatus = (findCol(rowArr, ['ESTADO', 'estado']) || 'Active').toString().trim().toUpperCase();
            let status = 'Active';
            if (rawStatus.startsWith('RET') || rawStatus.startsWith('INAC') || rawStatus === 'INACTIVE' || rawStatus === 'INACTIVO') {
                status = 'RETIRADO';
            }
            const observaciones = findCol(rowArr, ['OBSERVACIONES']);
            const entryDate = parseExcelDate(findCol(rowArr, ['FECHA DE INGRESO', 'FECHA INGRESO', 'FECHA_DE_INGRESO', 'FECHA_INGRESO', 'FECHA INGRESO']));
            
            const livesWith = findCol(rowArr, ['VIVE CON', 'VIVE_CON']);
            const familyMembers = parseInt(findCol(rowArr, ['GRUPO FAMILIAR', 'NUMERO_GRUPO_FAMILIAR', 'NÚMERO GRUPO FAMILIAR']) || "0") || null;
            const totalSiblings = parseInt(findCol(rowArr, ['TOTAL HERMANOS', 'TOTAL_HERMANOS']) || "0") || null;
            const schoolSiblings = parseInt(findCol(rowArr, ['HERMANOS ESCOLARES', 'HERMANOS_ESCOLARES']) || "0") || null;
            const liceoSiblings = parseInt(findCol(rowArr, ['HERMANOS COLEGIO', 'HERMANOS_COLEGIO', 'HERMANOS LICEO']) || "0") || null;
            const siblingPosition = parseInt(findCol(rowArr, ['LUGAR HERMANOS', 'LUGAR_ENTRE_HERMANOS', 'LUGAR ENTRE HERMANOS']) || "0") || null;
            const enrollmentNumber = findCol(rowArr, ['N° MATRÍCULA', 'NUMERO_MATRICULA']);
            const cursoStr = findCol(rowArr, ['CURSO', 'Curso'])?.toString().toUpperCase();

            // Mapear o crear curso
            let levelId: number | null = null;
            if (cursoStr) {
                if (levelMap[cursoStr]) {
                    levelId = levelMap[cursoStr];
                } else {
                    console.log(`[Curso] Curso "${cursoStr}" no existe en la DB.`);
                    if (!DRY_RUN) {
                        const result = await client.query("INSERT INTO levels (name, total_capacity, current_enrolled) VALUES (?, 40, 0) RETURNING id", [cursoStr]);
                        levelId = result.rows[0].id;
                        levelMap[cursoStr] = levelId;
                        console.log(`[Curso] Creado curso "${cursoStr}" con ID ${levelId}`);
                    } else {
                        console.log(`[Curso] [DRY RUN] Se crearía el curso "${cursoStr}"`);
                        levelId = 9999; // ID temporal
                    }
                }
            }

            console.log(`\n--------------------------------------------------`);
            console.log(`Agregar Estudiante: [RUT: ${studentRun}] ${cleanFullName}`);
            console.log(`  - Curso: ${cursoStr} (ID: ${levelId})`);
            console.log(`  - F. Nac: ${birthDate}, Sexo: ${gender}, Comuna: ${commune}, Celular: ${studentPhone}`);

            const titular = titularesByStudentRun[studentRun];
            if (titular) {
                console.log(`  - Apoderado Titular: [RUT: ${titular['RUN/IPA']}] ${titular['Nombre Apoderado Titular']} (${titular['Parentesco']})`);
            }
            const suplente = suplentesByStudentRun[studentRun];
            if (suplente) {
                console.log(`  - Apoderado Suplente: [RUT: ${suplente['RUN/IPA']}] ${suplente['Nombre Apoderado Suplente']} (${suplente['Parentesco']})`);
            }

            if (!DRY_RUN) {
                // Ejecutar transacción para este estudiante
                await client.query('BEGIN');
                try {
                    const studentId = crypto.randomUUID();

                    // 1. Insertar Estudiante
                    await client.query(`
                        INSERT INTO students (
                            id, run, full_name, first_name, paternal_surname, maternal_surname,
                            birth_date, gender, nationality, religion, marital_status, ethnicity,
                            address, region, commune, email, phone, previous_school, health_system, enrollment_number,
                            lives_with, family_members, total_siblings, school_siblings, liceo_siblings, sibling_position, status, entry_date, observaciones
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        studentId, studentRun, cleanFullName, firstName, paternalSurname, maternalSurname,
                        birthDate, gender, nationality, religion, maritalStatus, ethnicity,
                        address, region, commune, studentEmail, studentPhone, previousSchool, healthSystem, enrollmentNumber,
                        livesWith, familyMembers, totalSiblings, schoolSiblings, liceoSiblings, siblingPosition, status, entryDate, observaciones
                    ]);

                    // 2. Insertar Ficha de Salud
                    await client.query(`
                        INSERT INTO health_records (id, student_id, blood_type, allergies, chronic_diseases)
                        VALUES (?, ?, ?, ?, ?)
                    `, [
                        crypto.randomUUID(), studentId, findCol(rowArr, ['GRUPO SANGUÍNEO', 'GRUPO_SANGUINEO']) || '', findCol(rowArr, ['ALERGIAS']) || '', findCol(rowArr, ['ENFERMEDADES', 'ENFERMEDADES_CRONICAS']) || ''
                    ]);

                    // 3. Insertar Matrícula (año académico 2026)
                    if (levelId) {
                        await client.query(`
                            INSERT INTO enrollments (id, student_id, level_id, academic_year)
                            VALUES (?, ?, ?, 2026)
                        `, [crypto.randomUUID(), studentId, levelId]);
                    }

                    // 4. Insertar Apoderado Titular
                    if (titular) {
                        await client.query(`
                            INSERT INTO guardians (id, student_id, guardian_type, run, full_name, relationship, phone, email, address)
                            VALUES (?, ?, 'Titular', ?, ?, ?, ?, ?, ?)
                        `, [
                            crypto.randomUUID(), 
                            studentId, 
                            titular['RUN/IPA'] || 'S/R', 
                            titular['Nombre Apoderado Titular'] || 'Sin Nombre', 
                            titular['Parentesco'] || '', 
                            titular['Teléfono Titular'] || '', 
                            titular['Email'] || '', 
                            titular['Dirección'] || ''
                        ]);
                    }

                    // 5. Insertar Apoderado Suplente
                    if (suplente) {
                        await client.query(`
                            INSERT INTO guardians (id, student_id, guardian_type, run, full_name, relationship, phone, email, address)
                            VALUES (?, ?, 'Suplente', ?, ?, ?, ?, ?, ?)
                        `, [
                            crypto.randomUUID(), 
                            studentId, 
                            suplente['RUN/IPA'] || 'S/R', 
                            suplente['Nombre Apoderado Suplente'] || 'Sin Nombre', 
                            suplente['Parentesco'] || '', 
                            suplente['Teléfono Suplente'] || '', 
                            suplente['Email'] || '', 
                            suplente['Dirección'] || ''
                        ]);
                    }

                    await client.query('COMMIT');
                    console.log(`[OK] Estudiante ${cleanFullName} insertado exitosamente con su matrícula y apoderados.`);
                } catch (err: any) {
                    await client.query('ROLLBACK');
                    console.error(`[ERROR] Error al insertar estudiante ${cleanFullName}:`, err.message);
                    throw err;
                }
            }
        }

        console.log(`\n==================================================`);
        if (DRY_RUN) {
            console.log(`[FIN] Ejecutado en modo DRY RUN. No se realizaron cambios en la base de datos.`);
            console.log(`[TIP] Para realizar los cambios reales, ejecuta: DRY_RUN=false npx ts-node src/scripts/sync_students.ts`);
        } else {
            console.log(`[FIN] Sincronización realizada exitosamente. Se agregaron ${studentsToAdd.length} estudiantes.`);
        }

    } catch (error) {
        console.error("Error crítico durante la sincronización:", error);
    } finally {
        if (client) {
            client.release();
        }
        // Asegurar que el log se imprima y cerrar el pool
        setTimeout(() => process.exit(0), 1000);
    }
}

sync();
