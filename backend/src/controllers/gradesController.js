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
exports.getAuditLogs = exports.toggleLockAssignment = exports.getFiltersData = exports.bulkUpdateStudentPositions = exports.updateStudentPosition = exports.updateGradeColumns = exports.saveGradesSheet = exports.getGradesSheet = void 0;
const db_1 = __importDefault(require("../config/db"));
const uuid_1 = require("uuid");
const getGradesSheet = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { levelId, subjectId, period, year } = req.query;
    const user = req.user;
    try {
        // Security check for teachers: Only assigned subjects OR Homeroom Teacher of the level
        if (user.role === 'Docente') {
            const isHomeroomTeacher = yield db_1.default.get('SELECT id FROM levels WHERE id = ? AND homeroom_teacher_id = ?', [levelId, user.id]);
            if (!isHomeroomTeacher) {
                const assignment = yield db_1.default.get(`
                    SELECT id FROM teacher_assignments 
                    WHERE teacher_id = ? AND level_id = ? AND subject_id = ? AND academic_year = ?
                `, [user.id, levelId, subjectId, year]);
                if (!assignment) {
                    return res.status(403).json({ error: 'No tienes permiso para ver este curso/asignatura' });
                }
            }
        }
        const levelIdStr = String(levelId || '');
        const subjectIdStr = String(subjectId || '');
        const yearStr = String(year || '');
        const periodStr = String(period || '');
        // 1. Get Students in the level (Include Active and Retired)
        const students = yield db_1.default.all(`
            SELECT s.id, s.full_name, s.run, e.status, e.list_number
            FROM students s
            JOIN enrollments e ON s.id = e.student_id
            WHERE e.level_id = ? AND e.academic_year = ?
            ORDER BY e.list_number ASC
        `, [levelIdStr, yearStr]);
        // 2. Get Grade Columns settings
        const columns = yield db_1.default.all(`
            SELECT * FROM grade_columns 
            WHERE level_id = ? AND subject_id = ? AND period = ? AND academic_year = ?
            ORDER BY position ASC
        `, [levelIdStr, subjectIdStr, periodStr, yearStr]);
        // 3. Get All Grades for these columns
        const columnIds = columns.map(c => c.id);
        let grades = [];
        if (columnIds.length > 0) {
            const placeholders = columnIds.map(() => '?').join(',');
            grades = yield db_1.default.all(`
                SELECT * FROM grades 
                WHERE grade_column_id IN (${placeholders})
            `, [...columnIds]);
        }
        // 4. Get Lock Status
        const lockInfo = yield db_1.default.get(`
            SELECT is_locked FROM grades_locks 
            WHERE level_id = ? AND subject_id = ? AND academic_year = ? AND period = ?
        `, [levelIdStr, subjectIdStr, yearStr, periodStr]);
        res.json({ students, columns, grades, isLocked: !!(lockInfo === null || lockInfo === void 0 ? void 0 : lockInfo.is_locked) });
    }
    catch (error) {
        console.error("Error in getGradesSheet", error);
        res.status(500).json({ error: error.message });
    }
});
exports.getGradesSheet = getGradesSheet;
const saveGradesSheet = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const { levelId, subjectId, period, year, grades, columns } = req.body;
    const user = req.user;
    try {
        // Log individual changes to compare later
        const specificLogs = [];
        // 1. Fetch current data to detect changes
        const existingGradesRes = yield db_1.default.all(`
            SELECT g.* 
            FROM grades g
            JOIN grade_columns gc ON g.grade_column_id = gc.id
            WHERE gc.level_id = ? AND gc.subject_id = ? AND gc.period = ? AND gc.academic_year = ?
        `, [levelId, subjectId, period, year]);
        const studentRes = yield db_1.default.all(`
            SELECT s.id, s.full_name as name 
            FROM students s 
            JOIN enrollments e ON s.id = e.student_id 
            WHERE e.level_id = ? AND e.academic_year = ?
        `, [levelId, year]);
        const studentMap = new Map(studentRes.map(s => [s.id, s]));
        // 2. Update/Insert each grade
        for (const g of grades) {
            const columnId = g.grade_column_id;
            const newValue = g.grade_value;
            const col = columns.find((c) => c.id === columnId);
            const existingGrade = existingGradesRes.find(eg => eg.student_id === g.student_id && eg.grade_column_id === columnId);
            if (existingGrade) {
                const dbValue = existingGrade.grade_value;
                if (dbValue !== newValue) {
                    if (newValue === null || newValue === '') {
                        // Delete if empty
                        specificLogs.push({
                            action: 'DELETE_GRADE',
                            details: `Nota eliminada: ${dbValue} -> (vacío) - Estudiante: ${((_a = studentMap.get(g.student_id)) === null || _a === void 0 ? void 0 : _a.name) || g.student_id} - Columna: ${(col === null || col === void 0 ? void 0 : col.title) || g.position}`
                        });
                        yield db_1.default.run('DELETE FROM grades WHERE id = ?', [existingGrade.id]);
                    }
                    else {
                        // Update
                        specificLogs.push({
                            action: 'UPDATE_GRADE',
                            details: `Cambio de nota: ${dbValue} -> ${newValue} - Estudiante: ${((_b = studentMap.get(g.student_id)) === null || _b === void 0 ? void 0 : _b.name) || g.student_id} - Columna: ${(col === null || col === void 0 ? void 0 : col.title) || g.position}`
                        });
                        yield db_1.default.run('UPDATE grades SET grade_value = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newValue, existingGrade.id]);
                    }
                }
            }
            else if (newValue !== null && newValue !== '') {
                // Insert
                specificLogs.push({
                    action: 'ADD_GRADE',
                    details: `Ingreso de nota (${newValue}) - Estudiante: ${((_c = studentMap.get(g.student_id)) === null || _c === void 0 ? void 0 : _c.name) || g.student_id} - Columna: ${(col === null || col === void 0 ? void 0 : col.title) || g.position}`
                });
                yield db_1.default.run('INSERT INTO grades (id, student_id, grade_column_id, grade_value) VALUES (?, ?, ?, ?)', [(0, uuid_1.v4)(), g.student_id, columnId, newValue]);
            }
        }
        // Audit Logs
        try {
            const levelName = yield db_1.default.get('SELECT name FROM levels WHERE id = ?', [levelId]);
            const subjectName = yield db_1.default.get('SELECT name FROM subjects WHERE id = ?', [subjectId]);
            yield db_1.default.run(`
                INSERT INTO audit_logs (id, user_id, user_name, action, details, level_id, subject_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                (0, uuid_1.v4)(),
                user === null || user === void 0 ? void 0 : user.id,
                (user === null || user === void 0 ? void 0 : user.name) || (user === null || user === void 0 ? void 0 : user.run) || 'Sistema',
                'SAVE_GRADES',
                `Guardado de planilla: ${(levelName === null || levelName === void 0 ? void 0 : levelName.name) || levelId} - ${(subjectName === null || subjectName === void 0 ? void 0 : subjectName.name) || subjectId} (${period || 'N/A'})`,
                levelId, subjectId
            ]);
            for (const log of specificLogs) {
                yield db_1.default.run(`
                    INSERT INTO audit_logs (id, user_id, user_name, action, details, level_id, subject_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                    (0, uuid_1.v4)(),
                    user === null || user === void 0 ? void 0 : user.id,
                    (user === null || user === void 0 ? void 0 : user.name) || (user === null || user === void 0 ? void 0 : user.run) || 'Sistema',
                    log.action, log.details, levelId, subjectId
                ]);
            }
        }
        catch (logError) {
            console.error("Audit log error:", logError);
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error("Save grades error:", error);
        res.status(500).json({ error: error.message });
    }
});
exports.saveGradesSheet = saveGradesSheet;
const updateGradeColumns = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { levelId, subjectId, period, year, columns } = req.body;
    try {
        const newColumnIds = columns.filter((c) => c.id).map((c) => c.id);
        if (newColumnIds.length > 0) {
            const placeholders = newColumnIds.map(() => '?').join(',');
            yield db_1.default.run(`
                DELETE FROM grade_columns 
                WHERE level_id = ? AND subject_id = ? AND period = ? AND academic_year = ?
                AND id NOT IN (${placeholders})
            `, [levelId, subjectId, period, year, ...newColumnIds]);
        }
        else {
            yield db_1.default.run(`
                DELETE FROM grade_columns 
                WHERE level_id = ? AND subject_id = ? AND period = ? AND academic_year = ?
            `, [levelId, subjectId, period, year]);
        }
        for (const col of columns) {
            const id = col.id || (0, uuid_1.v4)();
            yield db_1.default.run(`
                INSERT INTO grade_columns (id, level_id, subject_id, academic_year, period, title, position, weighting)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET 
                    title = excluded.title, 
                    position = excluded.position,
                    weighting = excluded.weighting
            `, [id, levelId, subjectId, year, period, col.title, col.position, col.weighting]);
        }
        res.json({ message: 'Columnas actualizadas correctamente' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.updateGradeColumns = updateGradeColumns;
const updateStudentPosition = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { studentId, levelId, academicYear, newListNumber } = req.body;
    try {
        yield db_1.default.run(`
            UPDATE enrollments 
            SET list_number = ? 
            WHERE student_id = ? AND level_id = ? AND academic_year = ?
        `, [newListNumber, studentId, levelId, academicYear]);
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.updateStudentPosition = updateStudentPosition;
const bulkUpdateStudentPositions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { levelId, academicYear, positions } = req.body;
    try {
        for (const pos of positions) {
            yield db_1.default.run(`
                UPDATE enrollments 
                SET list_number = ? 
                WHERE student_id = ? AND level_id = ? AND academic_year = ?
            `, [pos.listNumber, pos.studentId, levelId, academicYear]);
        }
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.bulkUpdateStudentPositions = bulkUpdateStudentPositions;
const getFiltersData = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.user;
    try {
        if (user.role === 'Admin') {
            const levels = yield db_1.default.all('SELECT * FROM levels');
            const subjects = yield db_1.default.all('SELECT * FROM subjects');
            return res.json({ levels, subjects });
        }
        const levels = yield db_1.default.all(`
            SELECT DISTINCT l.* 
            FROM levels l
            LEFT JOIN teacher_assignments ta ON l.id = ta.level_id
            WHERE l.homeroom_teacher_id = ? OR ta.teacher_id = ?
        `, [user.id, user.id]);
        const subjects = yield db_1.default.all(`
            SELECT DISTINCT s.* 
            FROM subjects s
            JOIN teacher_assignments ta ON s.id = ta.subject_id
            WHERE ta.teacher_id = ?
            UNION
            SELECT DISTINCT s.*
            FROM subjects s
            JOIN teacher_assignments ta ON s.id = ta.subject_id
            JOIN levels l ON ta.level_id = l.id
            WHERE l.homeroom_teacher_id = ?
        `, [user.id, user.id]);
        res.json({ levels, subjects });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getFiltersData = getFiltersData;
const toggleLockAssignment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { levelId, subjectId, academicYear, lock, period } = req.body;
    const user = req.user;
    if (user.role !== 'Admin')
        return res.status(403).json({ error: 'Solo administradores pueden bloquear notas' });
    try {
        yield db_1.default.run(`
            INSERT INTO grades_locks (level_id, subject_id, academic_year, period, is_locked)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(level_id, subject_id, academic_year, period) 
            DO UPDATE SET is_locked = excluded.is_locked
        `, [levelId, subjectId, academicYear, period, lock ? 1 : 0]);
        try {
            const levelName = yield db_1.default.get('SELECT name FROM levels WHERE id = ?', [levelId]);
            const subjectName = yield db_1.default.get('SELECT name FROM subjects WHERE id = ?', [subjectId]);
            yield db_1.default.run(`
                INSERT INTO audit_logs (id, user_id, user_name, action, details, level_id, subject_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                (0, uuid_1.v4)(),
                (user === null || user === void 0 ? void 0 : user.id) || 'unknown',
                (user === null || user === void 0 ? void 0 : user.name) || (user === null || user === void 0 ? void 0 : user.run) || 'Sistema',
                lock ? 'LOCK_GRADES' : 'UNLOCK_GRADES',
                `${lock ? 'Bloqueo' : 'Desbloqueo'} de notas: ${(levelName === null || levelName === void 0 ? void 0 : levelName.name) || levelId} - ${(subjectName === null || subjectName === void 0 ? void 0 : subjectName.name) || subjectId}`,
                levelId,
                subjectId
            ]);
        }
        catch (logError) {
            console.error("Audit log error (LOCK/UNLOCK):", logError);
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error("Toggle lock error:", error);
        res.status(500).json({ error: error.message });
    }
});
exports.toggleLockAssignment = toggleLockAssignment;
const getAuditLogs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const logs = yield db_1.default.all(`
            SELECT * FROM audit_logs 
            ORDER BY created_at DESC 
            LIMIT 500
        `);
        res.json(logs);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getAuditLogs = getAuditLogs;
