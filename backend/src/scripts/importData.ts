import axios from 'axios';
import * as xlsx from 'xlsx';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1KYJREA44_c_v1VABCwWAOlEIVfLwiK9zrsNLnJ5VPwA/export?format=xlsx';

async function importData() {
    const dbPath = path.join(__dirname, '../../liceopro.db');
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    console.log("Descargando XLSX completo desde Google Sheets...");
    const response = await axios({
        method: 'get',
        url: SHEET_URL,
        responseType: 'arraybuffer'
    });

    console.log("Parseando XLSX...");
    const workbook = xlsx.read(response.data, { type: 'buffer' });

    console.log("Limpiando base de datos...");
    await db.run("DELETE FROM observations");
    await db.run("DELETE FROM enrollments");
    await db.run("DELETE FROM health_records");
    await db.run("DELETE FROM guardians");
    await db.run("DELETE FROM students");

    const levelMap: Record<string, number> = {};
    const existingLevels = await db.all("SELECT id, name FROM levels");
    for (const lvl of existingLevels) {
        levelMap[lvl.name.toUpperCase()] = lvl.id;
    }

    let studentsCount = 0;
    let titularesCount = 0;
    let suplentesCount = 0;

    // --- 1. Importar Estudiantes (bd_2026) ---
    console.log("Procesando hoja principal (Estudiantes)...");
    const mainSheetName = workbook.SheetNames[0]; // Usually 'bd_2026'
    const mainData = xlsx.utils.sheet_to_json<any>(workbook.Sheets[mainSheetName], { defval: "" });

    for (const row of mainData) {
        // Clean keys
        const cleanRow: any = {};
        for (let key in row) {
            cleanRow[key.trim()] = typeof row[key] === 'string' ? row[key].trim() : row[key];
        }

        const run = cleanRow[''] || cleanRow['RUN'] || cleanRow['RUT ALUMNO'];
        if (!run) continue;

        const fullName = cleanRow['Nombre'] || '';
        const birthDate = cleanRow['Fechas Nacimiento'] || null;
        const gender = cleanRow['Sexo'] || null;
        const nationality = cleanRow['Nacionalidad'] || null;
        const address = cleanRow['Dirección'] || null;
        const commune = cleanRow['Comuna'] || null;
        const previousSchool = cleanRow['Colegio Procedencia'] || null;
        const healthSystem = cleanRow['Sistema Salud'] || null;
        const religion = cleanRow['Religión'] || null;
        const livesWith = cleanRow['Vive Con'] || null;
        const familyMembers = cleanRow['Grupo Familiar'] ? parseInt(cleanRow['Grupo Familiar']) : null;
        const totalSiblings = cleanRow['Total Hermanos'] ? parseInt(cleanRow['Total Hermanos']) : null;
        const siblingPosition = cleanRow['Lugar Hermanos'] ? parseInt(cleanRow['Lugar Hermanos']) : null;
        const enrollmentNumber = cleanRow['N° Matrícula'] || null;
        const cursoStr = cleanRow['CURSO']?.toUpperCase();

        let levelId = 1;
        if (cursoStr) {
            if (levelMap[cursoStr]) {
                levelId = levelMap[cursoStr];
            } else {
                const result = await db.run("INSERT INTO levels (name, total_capacity, current_enrolled) VALUES (?, 40, 0)", [cleanRow['CURSO']]);
                levelId = result.lastID!;
                levelMap[cursoStr] = levelId;
            }
        }

        try {
            const studentId = uuidv4();
            await db.run(`
                INSERT INTO students (
                    id, run, full_name, birth_date, gender, nationality, religion, 
                    address, commune, previous_school, health_system, enrollment_number,
                    lives_with, family_members, total_siblings, sibling_position
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                studentId, run, fullName, birthDate, gender, nationality, religion,
                address, commune, previousSchool, healthSystem, enrollmentNumber,
                livesWith, familyMembers, totalSiblings, siblingPosition
            ]);

            await db.run(`
                INSERT INTO health_records (id, student_id, blood_type, allergies, chronic_diseases)
                VALUES (?, ?, ?, ?, ?)
            `, [
                uuidv4(), studentId, cleanRow['Grupo Sanguíneo'] || '', cleanRow['Alergias'] || '', cleanRow['Enfermedades'] || ''
            ]);

            await db.run(`
                INSERT INTO enrollments (id, student_id, level_id, academic_year)
                VALUES (?, ?, ?, 2026)
            `, [uuidv4(), studentId, levelId]);

            studentsCount++;
        } catch (e) {
            console.error(`Error importando estudiante RUN ${run}:`, e);
        }
    }

    // --- 2. Importar Apoderados Titulares ---
    if (workbook.SheetNames.includes('bd_titulares')) {
        console.log("Procesando hoja bd_titulares...");
        const titularesData = xlsx.utils.sheet_to_json<any>(workbook.Sheets['bd_titulares'], { defval: "" });
        
        for (const row of titularesData) {
            const studentRun = row['RUN Estudiante']?.trim();
            if (!studentRun) continue;

            const existingStudent = await db.get("SELECT id FROM students WHERE run = ?", [studentRun]);
            if (existingStudent) {
                await db.run(`
                    INSERT INTO guardians (id, student_id, guardian_type, run, full_name, relationship, phone, email, address)
                    VALUES (?, ?, 'Titular', ?, ?, ?, ?, ?, ?)
                `, [
                    uuidv4(), existingStudent.id, row['RUN/IPA'] || 'S/R', row['Nombre Apoderado Titular'] || 'Sin Nombre',
                    row['Parentesco'] || '', row['Teléfono Titular'] || '', row['Email'] || '', row['Dirección'] || ''
                ]);
                titularesCount++;
            }
        }
    }

    // --- 3. Importar Apoderados Suplentes ---
    if (workbook.SheetNames.includes('bd_suplentes')) {
        console.log("Procesando hoja bd_suplentes...");
        const suplentesData = xlsx.utils.sheet_to_json<any>(workbook.Sheets['bd_suplentes'], { defval: "" });
        
        for (const row of suplentesData) {
            const studentRun = row['RUN Estudiante']?.trim();
            if (!studentRun) continue;

            const existingStudent = await db.get("SELECT id FROM students WHERE run = ?", [studentRun]);
            if (existingStudent) {
                await db.run(`
                    INSERT INTO guardians (id, student_id, guardian_type, run, full_name, relationship, phone, email, address)
                    VALUES (?, ?, 'Suplente', ?, ?, ?, ?, ?, ?)
                `, [
                    uuidv4(), existingStudent.id, row['RUN/IPA'] || 'S/R', row['Nombre Apoderado Suplente'] || 'Sin Nombre',
                    row['Parentesco'] || '', row['Teléfono Suplente'] || '', row['Email'] || '', row['Dirección'] || ''
                ]);
                suplentesCount++;
            }
        }
    }

    console.log(`Importación finalizada con éxito.`);
    console.log(`- Estudiantes: ${studentsCount}`);
    console.log(`- Apoderados Titulares: ${titularesCount}`);
    console.log(`- Apoderados Suplentes: ${suplentesCount}`);
    await db.close();
    process.exit(0);
}

importData().catch(console.error);
