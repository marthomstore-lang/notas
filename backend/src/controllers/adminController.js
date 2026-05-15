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
exports.importDataWeb = exports.exportData = exports.createAssignment = exports.deleteAssignment = exports.getAssignmentsAdmin = exports.setHomeroomTeacher = exports.updateLevelCapacity = exports.getLevels = exports.createSubject = exports.getSubjects = exports.deleteTeacher = exports.updateTeacher = exports.createTeacher = exports.getTeachers = exports.addObservation = exports.getStudentObservations = exports.updateStudent = exports.reincorporateStudent = exports.deleteStudent = exports.getStudentById = exports.getStudents = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const uuid_1 = require("uuid");
const db_1 = __importDefault(require("../config/db"));
const xlsx = __importStar(require("xlsx"));
const getStudents = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const client = yield db_1.default.connect();
        const result = yield client.query(`
            SELECT s.*, l.name as level_name, e.list_number 
            FROM students s 
            LEFT JOIN enrollments e ON s.id = e.student_id 
            LEFT JOIN levels l ON e.level_id = l.id
            ORDER BY l.name, e.list_number, s.full_name
        `);
        res.json(result.rows);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al obtener estudiantes' });
    }
});
exports.getStudents = getStudents;
const getStudentById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const client = yield db_1.default.connect();
        const studentRes = yield client.query("SELECT s.*, l.name as level_name FROM students s LEFT JOIN enrollments e ON s.id = e.student_id LEFT JOIN levels l ON e.level_id = l.id WHERE s.id = ?", [id]);
        const guardiansRes = yield client.query("SELECT * FROM guardians WHERE student_id = ?", [id]);
        const healthRes = yield client.query("SELECT * FROM health_records WHERE student_id = ?", [id]);
        if (studentRes.rows.length === 0)
            return res.status(404).json({ error: "Estudiante no encontrado" });
        res.json({
            student: studentRes.rows[0],
            guardians: guardiansRes.rows,
            health: healthRes.rows[0] || {}
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Error al obtener expediente del estudiante' });
    }
});
exports.getStudentById = getStudentById;
const deleteStudent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { withdrawalDate } = req.body;
        const user = req.user;
        const student = yield db_1.default.get("SELECT full_name FROM students WHERE id = ?", [id]);
        if (!student)
            return res.status(404).json({ error: 'Estudiante no encontrado' });
        // Cambiamos a Soft Delete con Fecha de Retiro por solicitud del usuario
        yield db_1.default.run("UPDATE students SET status = 'RETIRADO', withdrawal_date = ? WHERE id = ?", [withdrawalDate || new Date().toISOString().split('T')[0], id]);
        // Audit Log
        try {
            yield db_1.default.run(`
                INSERT INTO audit_logs (id, user_id, user_name, action, details)
                VALUES (?, ?, ?, ?, ?)
            `, [(0, uuid_1.v4)(), user === null || user === void 0 ? void 0 : user.id, (user === null || user === void 0 ? void 0 : user.name) || (user === null || user === void 0 ? void 0 : user.run) || 'Sistema', 'WITHDRAW_STUDENT', `Retiro de estudiante: ${student.full_name} - Fecha: ${withdrawalDate}`]);
        }
        catch (logErr) {
            console.error("Audit log error:", logErr);
        }
        res.json({ message: 'Estudiante retirado correctamente' });
    }
    catch (error) {
        console.error("Error withdrawing student:", error);
        res.status(500).json({ error: 'Error al retirar estudiante', details: error.message });
    }
});
exports.deleteStudent = deleteStudent;
const reincorporateStudent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        console.log(`[reincorporateStudent] Intentando reincorporar ID: ${id}`);
        const user = req.user;
        const student = yield db_1.default.get("SELECT full_name FROM students WHERE id = ?", [id]);
        if (!student) {
            console.warn(`[reincorporateStudent] Estudiante no encontrado: ${id}`);
            return res.status(404).json({ error: 'Estudiante no encontrado' });
        }
        const result = yield db_1.default.run("UPDATE students SET status = 'Active', withdrawal_date = NULL WHERE id = ?", [id]);
        console.log(`[reincorporateStudent] Resultado del update:`, result);
        // Audit Log
        try {
            yield db_1.default.run(`
                INSERT INTO audit_logs (id, user_id, user_name, action, details)
                VALUES (?, ?, ?, ?, ?)
            `, [(0, uuid_1.v4)(), user === null || user === void 0 ? void 0 : user.id, (user === null || user === void 0 ? void 0 : user.name) || (user === null || user === void 0 ? void 0 : user.run) || 'Sistema', 'REINCORPORATE_STUDENT', `Reincorporación de estudiante: ${student.full_name}`]);
        }
        catch (logErr) {
            console.error("Audit log error:", logErr);
        }
        res.json({ message: 'Estudiante reincorporado correctamente' });
    }
    catch (error) {
        console.error("Error reincorporating student:", error);
        res.status(500).json({ error: 'Error al reincorporar estudiante', details: error.message });
    }
});
exports.reincorporateStudent = reincorporateStudent;
const updateStudent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { student, guardians, health } = req.body;
        const client = yield db_1.default.connect();
        const fullName = `${student.paternal_surname || ''} ${student.maternal_surname || ''} ${student.first_name || ''}`.replace(/\s+/g, ' ').trim() || student.full_name;
        // 1. Update Students table
        yield client.query(`
            UPDATE students SET 
                full_name = ?, birth_date = ?, gender = ?, nationality = ?, religion = ?, 
                marital_status = ?, ethnicity = ?, address = ?, region = ?, commune = ?, 
                email = ?, phone = ?, previous_school = ?, health_system = ?, enrollment_number = ?,
                lives_with = ?, family_members = ?, total_siblings = ?, school_siblings = ?, 
                liceo_siblings = ?, sibling_position = ?, entry_date = ?, observaciones = ?,
                document_type = ?, first_name = ?, paternal_surname = ?, maternal_surname = ?,
                postal_code = ?, phone_type = ?, mobile_phone = ?, email_type = ?,
                emergency_contact_name = ?, emergency_contact_phone = ?,
                enrollment_date = ?, incorporation_date = ?, entry_year = ?,
                pie_program = ?, differential_group = ?, indigenous_origin = ?,
                is_priority = ?, is_preferential = ?, is_vulnerable = ?, is_high_vulnerability = ?,
                scholarship_indigenous = ?, scholarship_president = ?, scholarship_retention = ?,
                scholarship_junaeb = ?, scholarship_other = ?, is_repeater = ?,
                uses_mineduc_texts = ?, lives_with_other = ?, school_age_siblings = ?,
                pie_diagnosis = ?, has_religion = ?
            WHERE id = ?
        `, [
            fullName, student.birth_date, student.gender, student.nationality, student.religion,
            student.marital_status, student.ethnicity, student.address, student.region, student.commune,
            student.email, student.phone, student.previous_school, student.health_system, student.enrollment_number,
            student.lives_with, student.family_members, student.total_siblings, student.school_siblings,
            student.liceo_siblings, student.sibling_position, student.entry_date, student.observaciones,
            student.document_type, student.first_name, student.paternal_surname, student.maternal_surname,
            student.postal_code, student.phone_type, student.mobile_phone, student.email_type,
            student.emergency_contact_name, student.emergency_contact_phone,
            student.enrollment_date, student.incorporation_date, student.entry_year,
            student.pie_program ? 1 : 0, student.differential_group ? 1 : 0, student.indigenous_origin,
            student.is_priority ? 1 : 0, student.is_preferential ? 1 : 0, student.is_vulnerable ? 1 : 0, student.is_high_vulnerability ? 1 : 0,
            student.scholarship_indigenous ? 1 : 0, student.scholarship_president ? 1 : 0, student.scholarship_retention ? 1 : 0,
            student.scholarship_junaeb ? 1 : 0, student.scholarship_other, student.is_repeater ? 1 : 0,
            student.uses_mineduc_texts ? 1 : 0, student.lives_with_other, student.school_age_siblings,
            student.pie_diagnosis, student.has_religion ? 1 : 0,
            id
        ]);
        // 2. Update Guardians
        if (guardians && Array.isArray(guardians)) {
            for (const g of guardians) {
                const gFullName = g.first_name ? `${g.first_name} ${g.paternal_surname || ''} ${g.maternal_surname || ''}`.trim() : g.full_name;
                if (g.id) {
                    yield client.query(`
                        UPDATE guardians SET 
                            run = ?, full_name = ?, relationship = ?, phone = ?, email = ?, address = ?,
                            first_name = ?, paternal_surname = ?, maternal_surname = ?, birth_date = ?,
                            gender = ?, marital_status = ?, region = ?, commune = ?, postal_code = ?,
                            education_level = ?, occupation = ?, health_system = ?, 
                            is_health_load = ?, is_financial_guardian = ?, is_main_guardian = ?
                        WHERE id = ? AND student_id = ?
                    `, [
                        g.run, gFullName, g.relationship, g.phone, g.email, g.address,
                        g.first_name, g.paternal_surname, g.maternal_surname, g.birth_date,
                        g.gender, g.marital_status, g.region, g.commune, g.postal_code,
                        g.education_level, g.occupation, g.health_system,
                        g.is_health_load ? 1 : 0, g.is_financial_guardian ? 1 : 0, g.is_main_guardian ? 1 : 0,
                        g.id, id
                    ]);
                }
                else if (g.run) {
                    yield client.query(`
                        INSERT INTO guardians (
                            id, student_id, guardian_type, run, full_name, relationship, phone, email, address,
                            first_name, paternal_surname, maternal_surname, birth_date,
                            gender, marital_status, region, commune, postal_code,
                            education_level, occupation, health_system, 
                            is_health_load, is_financial_guardian, is_main_guardian
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        (0, uuid_1.v4)(), id, g.guardian_type, g.run, gFullName, g.relationship, g.phone, g.email, g.address,
                        g.first_name, g.paternal_surname, g.maternal_surname, g.birth_date,
                        g.gender, g.marital_status, g.region, g.commune, g.postal_code,
                        g.education_level, g.occupation, g.health_system,
                        g.is_health_load ? 1 : 0, g.is_financial_guardian ? 1 : 0, g.is_main_guardian ? 1 : 0
                    ]);
                }
            }
        }
        // 3. Update Health
        if (health) {
            const healthExists = yield client.query("SELECT id FROM health_records WHERE student_id = ?", [id]);
            if (healthExists.rows.length > 0) {
                yield client.query(`
                    UPDATE health_records SET 
                        blood_type = ?, allergies = ?, chronic_diseases = ?, general_observations = ?
                    WHERE student_id = ?
                `, [health.blood_type, health.allergies, health.chronic_diseases, health.general_observations, id]);
            }
            else {
                yield client.query(`
                    INSERT INTO health_records (id, student_id, blood_type, allergies, chronic_diseases, general_observations)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [(0, uuid_1.v4)(), id, health.blood_type, health.allergies, health.chronic_diseases, health.general_observations]);
            }
        }
        res.json({ message: 'Expediente actualizado exitosamente' });
    }
    catch (error) {
        console.error("Error updating student:", error);
        res.status(500).json({ error: 'Error al actualizar expediente del estudiante', details: error.message });
    }
});
exports.updateStudent = updateStudent;
const getStudentObservations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const client = yield db_1.default.connect();
        const result = yield client.query(`
            SELECT o.*, u.name as teacher_name 
            FROM observations o
            JOIN users u ON o.teacher_id = u.id
            WHERE o.student_id = ?
            ORDER BY o.created_at DESC
        `, [id]);
        res.json(result.rows);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al obtener observaciones' });
    }
});
exports.getStudentObservations = getStudentObservations;
const addObservation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { content, type } = req.body; // type: 'Positive' | 'Negative'
        const teacherId = req.user.id;
        const client = yield db_1.default.connect();
        const obsId = (0, uuid_1.v4)();
        yield client.query(`
            INSERT INTO observations (id, student_id, teacher_id, content, type)
            VALUES (?, ?, ?, ?, ?)
        `, [obsId, id, teacherId, content, type]);
        res.status(201).json({ message: 'Observación agregada' });
    }
    catch (error) {
        res.status(500).json({ error: 'Error al agregar observación' });
    }
});
exports.addObservation = addObservation;
const getTeachers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const client = yield db_1.default.connect();
        const result = yield client.query("SELECT id, run, name, email, password_plain, role FROM users WHERE role IN ('Docente', 'Admin') ORDER BY role, name");
        res.json(result.rows);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
});
exports.getTeachers = getTeachers;
const createTeacher = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { run, name, email, password, role } = req.body;
        const client = yield db_1.default.connect();
        const id = (0, uuid_1.v4)();
        const plainPass = password || '123';
        const hashedPass = yield bcryptjs_1.default.hash(plainPass, 10);
        yield client.query(`
            INSERT INTO users (id, run, name, email, password_hash, password_plain, role) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [id, run, name, email, hashedPass, plainPass, role || 'Docente']);
        res.status(201).json({ message: `Docente creado correctamente${!password ? ' con contraseña por defecto 123' : ''}` });
    }
    catch (error) {
        res.status(500).json({ error: 'Error al crear docente' });
    }
});
exports.createTeacher = createTeacher;
const updateTeacher = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, email, password, role } = req.body;
        console.log(`[updateTeacher] Recibido PUT para ID: ${id}. Body:`, { name, email, password, role });
        if (password && password.trim() !== "") {
            console.log(`[updateTeacher] Actualizando CON contraseña: ${password}`);
            const hashedPass = yield bcryptjs_1.default.hash(password, 10);
            const result = yield db_1.default.run(`
                UPDATE users 
                SET name = ?, email = ?, password_hash = ?, password_plain = ?, role = ? 
                WHERE id = ?
            `, [name, email, hashedPass, password, role, id]);
            if (result.changes === 0)
                return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        else {
            const result = yield db_1.default.run(`
                UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?
            `, [name, email, role, id]);
            if (result.changes === 0)
                return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        res.json({ message: 'Docente actualizado correctamente' });
    }
    catch (error) {
        console.error("Error updating teacher:", error);
        res.status(500).json({ error: 'Error al actualizar docente', details: error.message });
    }
});
exports.updateTeacher = updateTeacher;
const deleteTeacher = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const user = req.user;
        // Fetch teacher name for audit log
        const teacher = yield db_1.default.get("SELECT name FROM users WHERE id = ?", [id]);
        if (!teacher)
            return res.status(404).json({ error: 'Docente no encontrado' });
        // NOTE: Postgres handles transactions differently. 
        // For simplicity, we execute sequential queries as the wrapper doesn't support complex transactions across both.
        // On Supabase, this is usually fast enough.
        // 1. Delete assignments
        yield db_1.default.run("DELETE FROM teacher_assignments WHERE teacher_id = ?", [id]);
        // 2. Clear homeroom teacher in levels
        yield db_1.default.run("UPDATE levels SET homeroom_teacher_id = NULL WHERE homeroom_teacher_id = ?", [id]);
        // 3. Clear teacher in observations
        yield db_1.default.run("UPDATE observations SET teacher_id = NULL WHERE teacher_id = ?", [id]);
        // 4. Clear user_id in audit_logs
        yield db_1.default.run("UPDATE audit_logs SET user_id = NULL WHERE user_id = ?", [id]);
        // 5. Delete regulatory acceptances
        yield db_1.default.run("DELETE FROM regulatory_acceptances WHERE user_id = ?", [id]);
        // 6. Delete the user
        const result = yield db_1.default.run("DELETE FROM users WHERE id = ?", [id]);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Docente no encontrado' });
        }
        // 7. Audit Log
        yield db_1.default.run(`
            INSERT INTO audit_logs (id, user_id, user_name, action, details)
            VALUES (?, ?, ?, ?, ?)
        `, [(0, uuid_1.v4)(), user === null || user === void 0 ? void 0 : user.id, (user === null || user === void 0 ? void 0 : user.name) || (user === null || user === void 0 ? void 0 : user.run) || 'Sistema', 'DELETE_USER', `Eliminación de usuario/docente: ${teacher.name}`]);
        res.json({ message: 'Docente eliminado correctamente' });
    }
    catch (error) {
        res.status(500).json({ error: 'Error interno', details: error.message });
    }
});
exports.deleteTeacher = deleteTeacher;
const getSubjects = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const client = yield db_1.default.connect();
        const result = yield client.query("SELECT * FROM subjects");
        res.json(result.rows);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al obtener asignaturas' });
    }
});
exports.getSubjects = getSubjects;
const createSubject = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name } = req.body;
        const client = yield db_1.default.connect();
        yield client.query("INSERT INTO subjects (name) VALUES (?)", [name]);
        res.status(201).json({ message: 'Asignatura creada' });
    }
    catch (error) {
        res.status(500).json({ error: 'Error al crear asignatura' });
    }
});
exports.createSubject = createSubject;
const getLevels = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const client = yield db_1.default.connect();
        const result = yield client.query(`
            SELECT 
                l.id, 
                l.name, 
                l.total_capacity,
                (SELECT COUNT(*) FROM enrollments e JOIN students s ON e.student_id = s.id WHERE e.level_id = l.id AND e.academic_year = 2026 AND s.status = 'Active') as current_enrolled,
                u.name as homeroom_teacher_name 
            FROM levels l
            LEFT JOIN users u ON l.homeroom_teacher_id = u.id
            ORDER BY l.id
        `);
        res.json(result.rows);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al obtener niveles' });
    }
});
exports.getLevels = getLevels;
const updateLevelCapacity = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { capacity } = req.body;
        const client = yield db_1.default.connect();
        yield client.query("UPDATE levels SET total_capacity = ? WHERE id = ?", [capacity, id]);
        res.json({ message: 'Capacidad del curso actualizada' });
    }
    catch (error) {
        res.status(500).json({ error: 'Error al actualizar capacidad' });
    }
});
exports.updateLevelCapacity = updateLevelCapacity;
const setHomeroomTeacher = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { levelId, teacherId } = req.body;
        const client = yield db_1.default.connect();
        yield client.query("UPDATE levels SET homeroom_teacher_id = ? WHERE id = ?", [teacherId, levelId]);
        res.json({ message: 'Profesor Jefe asignado correctamente' });
    }
    catch (error) {
        res.status(500).json({ error: 'Error al asignar Profesor Jefe' });
    }
});
exports.setHomeroomTeacher = setHomeroomTeacher;
const getAssignmentsAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const client = yield db_1.default.connect();
        const result = yield client.query(`
            SELECT ta.id, u.name as teacher_name, l.name as level_name, s.name as subject_name, ta.academic_year
            FROM teacher_assignments ta
            JOIN users u ON ta.teacher_id = u.id
            JOIN levels l ON ta.level_id = l.id
            JOIN subjects s ON ta.subject_id = s.id
            ORDER BY l.name, s.name
        `);
        res.json(result.rows);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al obtener asignaciones' });
    }
});
exports.getAssignmentsAdmin = getAssignmentsAdmin;
const deleteAssignment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const user = req.user;
        // Fetch details for audit log
        const info = yield db_1.default.get(`
            SELECT u.name as teacher_name, l.name as level_name, s.name as subject_name
            FROM teacher_assignments ta
            JOIN users u ON ta.teacher_id = u.id
            JOIN levels l ON ta.level_id = l.id
            JOIN subjects s ON ta.subject_id = s.id
            WHERE ta.id = ?
        `, [id]);
        yield db_1.default.run("DELETE FROM teacher_assignments WHERE id = ?", [id]);
        if (info) {
            try {
                yield db_1.default.run(`
                    INSERT INTO audit_logs (id, user_id, user_name, action, details)
                    VALUES (?, ?, ?, ?, ?)
                `, [(0, uuid_1.v4)(), user === null || user === void 0 ? void 0 : user.id, (user === null || user === void 0 ? void 0 : user.name) || (user === null || user === void 0 ? void 0 : user.run) || 'Sistema', 'DELETE_ASSIGNMENT', `Eliminación de carga: ${info.teacher_name} - ${info.level_name} - ${info.subject_name}`]);
            }
            catch (logErr) {
                console.error("Audit log error:", logErr);
            }
        }
        res.json({ message: 'Asignación eliminada' });
    }
    catch (error) {
        res.status(500).json({ error: 'Error al eliminar asignación' });
    }
});
exports.deleteAssignment = deleteAssignment;
const createAssignment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { teacherId, levelId, subjectId, academicYear } = req.body;
        const client = yield db_1.default.connect();
        const id = (0, uuid_1.v4)();
        yield client.query(`
            INSERT INTO teacher_assignments (id, teacher_id, level_id, subject_id, academic_year) 
            VALUES (?, ?, ?, ?, ?)
        `, [id, teacherId, levelId, subjectId, academicYear || new Date().getFullYear()]);
        res.status(201).json({ message: 'Asignación creada correctamente' });
    }
    catch (error) {
        res.status(500).json({ error: 'Error al crear asignación (es posible que ya exista)' });
    }
});
exports.createAssignment = createAssignment;
const exportData = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const client = yield db_1.default.connect();
        // Fetch all students, their guardians, and health records
        const result = yield client.query(`
            SELECT 
                s.run as 'Rut', 
                s.full_name as 'Nombre',
                l.name as 'CURSO',
                s.gender as 'Sexo',
                s.birth_date as 'Fechas Nacimiento',
                s.nationality as 'Nacionalidad',
                s.marital_status as 'Estado Civil',
                s.address as 'Dirección',
                s.region as 'Región',
                s.commune as 'Comuna',
                s.email as 'Email',
                s.phone as 'Teléfono Estudiante',
                hr.blood_type as 'Grupo Sanguíneo',
                hr.allergies as 'Alergias',
                hr.chronic_diseases as 'Enfermedades',
                s.religion as 'Religión',
                s.health_system as 'Sistema Salud',
                s.observaciones as 'Observaciones',
                s.entry_date as 'Fecha de Ingreso',
                s.previous_school as 'Colegio Procedencia',
                s.ethnicity as 'Pueblo Indígena',
                s.lives_with as 'Vive Con',
                s.family_members as 'Grupo Familiar',
                s.total_siblings as 'Total Hermanos',
                s.sibling_position as 'Lugar Hermanos',
                s.school_siblings as 'Hermanos Escolares',
                s.liceo_siblings as 'Hermanos Colegio',
                s.enrollment_number as 'N° Matrícula',
                s.status as 'estado'
            FROM students s 
            LEFT JOIN enrollments e ON s.id = e.student_id 
            LEFT JOIN levels l ON e.level_id = l.id
            LEFT JOIN health_records hr ON s.id = hr.student_id
            WHERE s.status = 'Active'
            ORDER BY l.name, s.full_name
        `);
        if (!result.rows || result.rows.length === 0) {
            return res.status(404).json({ error: 'No hay datos para exportar' });
        }
        const titularesResult = yield client.query(`
            SELECT s.run as 'RUN Estudiante', g.run as 'RUN/IPA', g.full_name as 'Nombre Apoderado Titular', g.relationship as 'Parentesco', g.phone as 'Teléfono Titular', g.email as 'Email', g.address as 'Dirección'
            FROM guardians g JOIN students s ON g.student_id = s.id WHERE g.guardian_type = 'Titular'
        `);
        const suplentesResult = yield client.query(`
            SELECT s.run as 'RUN Estudiante', g.run as 'RUN/IPA', g.full_name as 'Nombre Apoderado Suplente', g.relationship as 'Parentesco', g.phone as 'Teléfono Suplente', g.email as 'Email', g.address as 'Dirección'
            FROM guardians g JOIN students s ON g.student_id = s.id WHERE g.guardian_type = 'Suplente'
        `);
        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.json_to_sheet(result.rows);
        xlsx.utils.book_append_sheet(workbook, worksheet, "Estudiantes");
        if (titularesResult.rows && titularesResult.rows.length > 0) {
            const titularesSheet = xlsx.utils.json_to_sheet(titularesResult.rows);
            xlsx.utils.book_append_sheet(workbook, titularesSheet, "bd_titulares");
        }
        if (suplentesResult.rows && suplentesResult.rows.length > 0) {
            const suplentesSheet = xlsx.utils.json_to_sheet(suplentesResult.rows);
            xlsx.utils.book_append_sheet(workbook, suplentesSheet, "bd_suplentes");
        }
        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=base_datos_estudiantes.xlsx');
        return res.end(buffer);
    }
    catch (error) {
        console.error('Error exportando:', error);
        res.status(500).json({ error: 'Error al exportar base de datos' });
    }
});
exports.exportData = exportData;
const importDataWeb = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        yield db_1.default.run("DELETE FROM observations");
        yield db_1.default.run("DELETE FROM enrollments");
        yield db_1.default.run("DELETE FROM health_records");
        yield db_1.default.run("DELETE FROM guardians");
        yield db_1.default.run("DELETE FROM students");
        const levelMap = {};
        const existingLevels = yield db_1.default.all("SELECT id, name FROM levels");
        for (const lvl of existingLevels) {
            levelMap[lvl.name.toUpperCase()] = lvl.id;
        }
        let studentsCount = 0;
        let titularesCount = 0;
        let suplentesCount = 0;
        const parseExcelDate = (dateVal) => {
            if (!dateVal)
                return null;
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
                        y = parts[0];
                        m = parts[1];
                        d = parts[2];
                    }
                    else if (p0 > 12) {
                        // DD-MM-YYYY
                        d = parts[0];
                        m = parts[1];
                        y = parts[2];
                    }
                    else if (p1 > 12) {
                        // MM-DD-YYYY
                        m = parts[0];
                        d = parts[1];
                        y = parts[2];
                    }
                    else {
                        // Ambiguous, assume DD-MM-YYYY (Chilean standard)
                        d = parts[0];
                        m = parts[1];
                        y = parts[2];
                    }
                    if (y && y.length === 2)
                        y = '20' + y;
                    if (d && m && y) {
                        return `${y}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
                    }
                }
            }
            return String(dateVal);
        };
        const mainSheetName = workbook.SheetNames[0];
        const mainSheet = workbook.Sheets[mainSheetName];
        const rows = xlsx.utils.sheet_to_json(mainSheet, { header: 1, defval: "" });
        if (rows.length < 2) {
            return res.status(400).json({ error: 'La hoja de estudiantes está vacía o no tiene encabezados.' });
        }
        const headers = rows[0].map(h => String(h).trim().toUpperCase());
        const dataRows = rows.slice(1);
        const findCol = (row, possibleNames, fallbackIndex) => {
            for (const name of possibleNames) {
                const idx = headers.indexOf(name.toUpperCase());
                if (idx !== -1 && row[idx] !== undefined && row[idx] !== "")
                    return row[idx];
            }
            if (fallbackIndex !== undefined && row[fallbackIndex] !== undefined && row[fallbackIndex] !== "")
                return row[fallbackIndex];
            return null;
        };
        for (const rowArr of dataRows) {
            const run = findCol(rowArr, ['RUT', 'RUN', 'RUT ALUMNO', 'RUT_ALUMNO', 'RUN_ALUMNO']);
            if (!run)
                continue;
            const fullName = findCol(rowArr, ['NOMBRE', 'NOMBRE COMPLETO', 'NOMBRE_COMPLETO', 'ALUMNO', 'ESTUDIANTE'], 1);
            let firstName = '', paternalSurname = '', maternalSurname = '';
            if (fullName) {
                const parts = String(fullName).trim().split(/\s+/);
                if (parts.length >= 3) {
                    paternalSurname = parts[0];
                    maternalSurname = parts[1];
                    firstName = parts.slice(2).join(' ');
                }
                else if (parts.length === 2) {
                    paternalSurname = parts[0];
                    firstName = parts[1];
                }
                else {
                    firstName = fullName;
                }
            }
            const cleanFullName = `${paternalSurname || ''} ${maternalSurname || ''} ${firstName || ''}`.replace(/\s+/g, ' ').trim() || fullName;
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
            const status = findCol(rowArr, ['ESTADO', 'estado']) || 'Active';
            const observaciones = findCol(rowArr, ['OBSERVACIONES']);
            const entryDate = parseExcelDate(findCol(rowArr, ['FECHA DE INGRESO', 'FECHA INGRESO', 'FECHA_DE_INGRESO', 'FECHA_INGRESO', 'FECHA INGRESO']));
            const livesWith = findCol(rowArr, ['VIVE CON', 'VIVE_CON']);
            const familyMembers = parseInt(findCol(rowArr, ['GRUPO FAMILIAR', 'NUMERO_GRUPO_FAMILIAR', 'NÚMERO GRUPO FAMILIAR']) || "0") || null;
            const totalSiblings = parseInt(findCol(rowArr, ['TOTAL HERMANOS', 'TOTAL_HERMANOS']) || "0") || null;
            const schoolSiblings = parseInt(findCol(rowArr, ['HERMANOS ESCOLARES', 'HERMANOS_ESCOLARES']) || "0") || null;
            const liceoSiblings = parseInt(findCol(rowArr, ['HERMANOS COLEGIO', 'HERMANOS_COLEGIO', 'HERMANOS LICEO']) || "0") || null;
            const siblingPosition = parseInt(findCol(rowArr, ['LUGAR HERMANOS', 'LUGAR_ENTRE_HERMANOS', 'LUGAR ENTRE HERMANOS']) || "0") || null;
            const enrollmentNumber = findCol(rowArr, ['N° MATRÍCULA', 'NUMERO_MATRICULA']);
            const cursoStr = (_a = findCol(rowArr, ['CURSO', 'Curso'])) === null || _a === void 0 ? void 0 : _a.toString().toUpperCase();
            let levelId = 1;
            if (cursoStr) {
                if (levelMap[cursoStr]) {
                    levelId = levelMap[cursoStr];
                }
                else {
                    const result = yield db_1.default.run("INSERT INTO levels (name, total_capacity, current_enrolled) VALUES (?, 40, 0)", [cursoStr]);
                    levelId = result.lastID;
                    levelMap[cursoStr] = levelId;
                }
            }
            const studentId = (0, uuid_1.v4)();
            yield db_1.default.run(`
                INSERT INTO students (
                    id, run, full_name, first_name, paternal_surname, maternal_surname,
                    birth_date, gender, nationality, religion, marital_status, ethnicity,
                    address, region, commune, email, phone, previous_school, health_system, enrollment_number,
                    lives_with, family_members, total_siblings, school_siblings, liceo_siblings, sibling_position, status, entry_date, observaciones
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                studentId, run, cleanFullName, firstName, paternalSurname, maternalSurname,
                birthDate, gender, nationality, religion, maritalStatus, ethnicity,
                address, region, commune, studentEmail, studentPhone, previousSchool, healthSystem, enrollmentNumber,
                livesWith, familyMembers, totalSiblings, schoolSiblings, liceoSiblings, siblingPosition, status, entryDate, observaciones
            ]);
            yield db_1.default.run(`
                INSERT INTO health_records (id, student_id, blood_type, allergies, chronic_diseases)
                VALUES (?, ?, ?, ?, ?)
            `, [
                (0, uuid_1.v4)(), studentId, findCol(rowArr, ['GRUPO SANGUÍNEO', 'GRUPO_SANGUINEO']) || '', findCol(rowArr, ['ALERGIAS']) || '', findCol(rowArr, ['ENFERMEDADES', 'ENFERMEDADES_CRONICAS']) || ''
            ]);
            yield db_1.default.run(`
                INSERT INTO enrollments (id, student_id, level_id, academic_year)
                VALUES (?, ?, ?, 2026)
            `, [(0, uuid_1.v4)(), studentId, levelId]);
            studentsCount++;
        }
        if (workbook.SheetNames.includes('bd_titulares')) {
            const titularesData = xlsx.utils.sheet_to_json(workbook.Sheets['bd_titulares'], { defval: "" });
            for (const row of titularesData) {
                const studentRun = (_b = row['RUN Estudiante']) === null || _b === void 0 ? void 0 : _b.trim();
                if (!studentRun)
                    continue;
                const existingStudent = yield db_1.default.get("SELECT id FROM students WHERE run = ?", [studentRun]);
                if (existingStudent) {
                    yield db_1.default.run(`
                        INSERT INTO guardians (id, student_id, guardian_type, run, full_name, relationship, phone, email, address)
                        VALUES (?, ?, 'Titular', ?, ?, ?, ?, ?, ?)
                    `, [(0, uuid_1.v4)(), existingStudent.id, row['RUN/IPA'] || 'S/R', row['Nombre Apoderado Titular'] || 'Sin Nombre', row['Parentesco'] || '', row['Teléfono Titular'] || '', row['Email'] || '', row['Dirección'] || '']);
                    titularesCount++;
                }
            }
        }
        if (workbook.SheetNames.includes('bd_suplentes')) {
            const suplentesData = xlsx.utils.sheet_to_json(workbook.Sheets['bd_suplentes'], { defval: "" });
            for (const row of suplentesData) {
                const studentRun = (_c = row['RUN Estudiante']) === null || _c === void 0 ? void 0 : _c.trim();
                if (!studentRun)
                    continue;
                const existingStudent = yield db_1.default.get("SELECT id FROM students WHERE run = ?", [studentRun]);
                if (existingStudent) {
                    yield db_1.default.run(`
                        INSERT INTO guardians (id, student_id, guardian_type, run, full_name, relationship, phone, email, address)
                        VALUES (?, ?, 'Suplente', ?, ?, ?, ?, ?, ?)
                    `, [(0, uuid_1.v4)(), existingStudent.id, row['RUN/IPA'] || 'S/R', row['Nombre Apoderado Suplente'] || 'Sin Nombre', row['Parentesco'] || '', row['Teléfono Suplente'] || '', row['Email'] || '', row['Dirección'] || '']);
                    suplentesCount++;
                }
            }
        }
        res.json({ message: 'Importación exitosa', students: studentsCount, titulares: titularesCount, suplentes: suplentesCount });
    }
    catch (error) {
        console.error('Error importing:', error);
        res.status(500).json({ error: 'Error al importar datos', details: error.message });
    }
});
exports.importDataWeb = importDataWeb;
