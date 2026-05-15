"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const xlsx = __importStar(require("xlsx"));
const sqlite3_1 = __importDefault(require("sqlite3"));
const sqlite_1 = require("sqlite");
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1KYJREA44_c_v1VABCwWAOlEIVfLwiK9zrsNLnJ5VPwA/export?format=xlsx';
function importData() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        const dbPath = path_1.default.join(__dirname, '../../liceopro.db');
        const db = yield (0, sqlite_1.open)({
            filename: dbPath,
            driver: sqlite3_1.default.Database
        });
        console.log("Descargando XLSX completo desde Google Sheets...");
        const response = yield (0, axios_1.default)({
            method: 'get',
            url: SHEET_URL,
            responseType: 'arraybuffer'
        });
        console.log("Parseando XLSX...");
        const workbook = xlsx.read(response.data, { type: 'buffer' });
        console.log("Limpiando base de datos...");
        yield db.run("DELETE FROM observations");
        yield db.run("DELETE FROM enrollments");
        yield db.run("DELETE FROM health_records");
        yield db.run("DELETE FROM guardians");
        yield db.run("DELETE FROM students");
        const levelMap = {};
        const existingLevels = yield db.all("SELECT id, name FROM levels");
        for (const lvl of existingLevels) {
            levelMap[lvl.name.toUpperCase()] = lvl.id;
        }
        let studentsCount = 0;
        let titularesCount = 0;
        let suplentesCount = 0;
        // --- 1. Importar Estudiantes (bd_2026) ---
        console.log("Procesando hoja principal (Estudiantes)...");
        const mainSheetName = workbook.SheetNames[0]; // Usually 'bd_2026'
        const mainData = xlsx.utils.sheet_to_json(workbook.Sheets[mainSheetName], { defval: "" });
        for (const row of mainData) {
            // Clean keys
            const cleanRow = {};
            for (let key in row) {
                cleanRow[key.trim()] = typeof row[key] === 'string' ? row[key].trim() : row[key];
            }
            const run = cleanRow[''] || cleanRow['RUN'] || cleanRow['RUT ALUMNO'];
            if (!run)
                continue;
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
            const cursoStr = (_a = cleanRow['CURSO']) === null || _a === void 0 ? void 0 : _a.toUpperCase();
            let levelId = 1;
            if (cursoStr) {
                if (levelMap[cursoStr]) {
                    levelId = levelMap[cursoStr];
                }
                else {
                    const result = yield db.run("INSERT INTO levels (name, total_capacity, current_enrolled) VALUES (?, 40, 0)", [cleanRow['CURSO']]);
                    levelId = result.lastID;
                    levelMap[cursoStr] = levelId;
                }
            }
            try {
                const studentId = (0, uuid_1.v4)();
                yield db.run(`
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
                yield db.run(`
                INSERT INTO health_records (id, student_id, blood_type, allergies, chronic_diseases)
                VALUES (?, ?, ?, ?, ?)
            `, [
                    (0, uuid_1.v4)(), studentId, cleanRow['Grupo Sanguíneo'] || '', cleanRow['Alergias'] || '', cleanRow['Enfermedades'] || ''
                ]);
                yield db.run(`
                INSERT INTO enrollments (id, student_id, level_id, academic_year)
                VALUES (?, ?, ?, 2026)
            `, [(0, uuid_1.v4)(), studentId, levelId]);
                studentsCount++;
            }
            catch (e) {
                console.error(`Error importando estudiante RUN ${run}:`, e);
            }
        }
        // --- 2. Importar Apoderados Titulares ---
        if (workbook.SheetNames.includes('bd_titulares')) {
            console.log("Procesando hoja bd_titulares...");
            const titularesData = xlsx.utils.sheet_to_json(workbook.Sheets['bd_titulares'], { defval: "" });
            for (const row of titularesData) {
                const studentRun = (_b = row['RUN Estudiante']) === null || _b === void 0 ? void 0 : _b.trim();
                if (!studentRun)
                    continue;
                const existingStudent = yield db.get("SELECT id FROM students WHERE run = ?", [studentRun]);
                if (existingStudent) {
                    yield db.run(`
                    INSERT INTO guardians (id, student_id, guardian_type, run, full_name, relationship, phone, email, address)
                    VALUES (?, ?, 'Titular', ?, ?, ?, ?, ?, ?)
                `, [
                        (0, uuid_1.v4)(), existingStudent.id, row['RUN/IPA'] || 'S/R', row['Nombre Apoderado Titular'] || 'Sin Nombre',
                        row['Parentesco'] || '', row['Teléfono Titular'] || '', row['Email'] || '', row['Dirección'] || ''
                    ]);
                    titularesCount++;
                }
            }
        }
        // --- 3. Importar Apoderados Suplentes ---
        if (workbook.SheetNames.includes('bd_suplentes')) {
            console.log("Procesando hoja bd_suplentes...");
            const suplentesData = xlsx.utils.sheet_to_json(workbook.Sheets['bd_suplentes'], { defval: "" });
            for (const row of suplentesData) {
                const studentRun = (_c = row['RUN Estudiante']) === null || _c === void 0 ? void 0 : _c.trim();
                if (!studentRun)
                    continue;
                const existingStudent = yield db.get("SELECT id FROM students WHERE run = ?", [studentRun]);
                if (existingStudent) {
                    yield db.run(`
                    INSERT INTO guardians (id, student_id, guardian_type, run, full_name, relationship, phone, email, address)
                    VALUES (?, ?, 'Suplente', ?, ?, ?, ?, ?, ?)
                `, [
                        (0, uuid_1.v4)(), existingStudent.id, row['RUN/IPA'] || 'S/R', row['Nombre Apoderado Suplente'] || 'Sin Nombre',
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
        yield db.close();
        process.exit(0);
    });
}
importData().catch(console.error);
