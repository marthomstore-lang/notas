"use strict";
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
exports.saveGrade = exports.addColumn = exports.getGrades = exports.getAssignments = void 0;
const db_1 = __importDefault(require("../config/db"));
const uuid_1 = require("uuid");
const getAssignments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const client = yield db_1.default.connect();
        const result = yield client.query(`
            SELECT ta.id as assignment_id, ta.level_id, ta.subject_id, l.name as level_name, s.name as subject_name, ta.academic_year
            FROM teacher_assignments ta
            JOIN levels l ON ta.level_id = l.id
            JOIN subjects s ON ta.subject_id = s.id
            WHERE ta.teacher_id = ?
        `, [userId]);
        res.json(result.rows);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al obtener asignaciones' });
    }
});
exports.getAssignments = getAssignments;
const getGrades = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { assignmentId } = req.params;
        const client = yield db_1.default.connect();
        // 1. Obtener info de la asignación
        const assignmentRes = yield client.query('SELECT * FROM teacher_assignments WHERE id = ?', [assignmentId]);
        if (assignmentRes.rows.length === 0)
            return res.status(404).json({ error: 'No encontrado' });
        const assignment = assignmentRes.rows[0];
        // 2. Obtener estudiantes matriculados en ese nivel
        const studentsRes = yield client.query(`
            SELECT s.id, s.run, s.full_name, e.list_number
            FROM enrollments e
            JOIN students s ON e.student_id = s.id
            WHERE e.level_id = ? AND e.academic_year = ?
            ORDER BY e.list_number ASC
        `, [assignment.level_id, assignment.academic_year]);
        // 3. Obtener columnas de evaluación
        const columnsRes = yield client.query(`
            SELECT id, title FROM grade_columns
            WHERE level_id = ? AND subject_id = ? AND academic_year = ?
        `, [assignment.level_id, assignment.subject_id, assignment.academic_year]);
        // 4. Obtener notas
        const gradesRes = yield client.query(`
            SELECT g.student_id, g.grade_column_id, g.grade_value
            FROM grades g
            JOIN grade_columns gc ON g.grade_column_id = gc.id
            WHERE gc.level_id = ? AND gc.subject_id = ? AND gc.academic_year = ?
        `, [assignment.level_id, assignment.subject_id, assignment.academic_year]);
        res.json({
            students: studentsRes.rows,
            columns: columnsRes.rows,
            grades: gradesRes.rows
        });
    }
    catch (error) {
        console.error("Error en getGrades", error);
        res.status(500).json({ error: 'Error al obtener notas' });
    }
});
exports.getGrades = getGrades;
const addColumn = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { assignmentId } = req.params;
        const { title } = req.body;
        const client = yield db_1.default.connect();
        const assignmentRes = yield client.query('SELECT * FROM teacher_assignments WHERE id = ?', [assignmentId]);
        const assignment = assignmentRes.rows[0];
        const id = (0, uuid_1.v4)();
        yield client.query(`
            INSERT INTO grade_columns (id, level_id, subject_id, academic_year, title)
            VALUES (?, ?, ?, ?, ?)
        `, [id, assignment.level_id, assignment.subject_id, assignment.academic_year, title]);
        res.json({ id, title });
    }
    catch (error) {
        res.status(500).json({ error: 'Error al crear columna' });
    }
});
exports.addColumn = addColumn;
const saveGrade = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId, columnId, gradeValue } = req.body;
        const client = yield db_1.default.connect();
        const id = (0, uuid_1.v4)();
        // Simple UPSERT for SQLite
        yield client.query(`
            INSERT INTO grades (id, student_id, grade_column_id, grade_value)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(student_id, grade_column_id) 
            DO UPDATE SET grade_value = excluded.grade_value, updated_at = CURRENT_TIMESTAMP
        `, [id, studentId, columnId, gradeValue]);
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Error al guardar nota' });
    }
});
exports.saveGrade = saveGrade;
