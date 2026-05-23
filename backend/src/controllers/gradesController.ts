import { Request, Response } from 'express';
import db from '../config/db';
import { v4 as uuidv4 } from 'uuid';

export const getGradesSheet = async (req: Request, res: Response) => {
    const { levelId, subjectId, period, year } = req.query;
    const user = (req as any).user;

    try {
        const levelIdNum = levelId ? parseInt(String(levelId), 10) : 0;
        const subjectIdNum = subjectId ? parseInt(String(subjectId), 10) : 0;
        const yearNum = year ? parseInt(String(year), 10) : 0;
        const periodStr = String(period || '');

        // Security check for teachers: Only assigned subjects OR Homeroom Teacher of the level
        if (user.role === 'Docente') {
            const isHomeroomTeacher = await db.get('SELECT id FROM levels WHERE id = ? AND homeroom_teacher_id = ?', [levelIdNum, user.id]);
            
            if (!isHomeroomTeacher) {
                const assignment = await db.get(`
                    SELECT id FROM teacher_assignments 
                    WHERE teacher_id = ? AND level_id = ? AND subject_id = ? AND academic_year = ?
                `, [user.id, levelIdNum, subjectIdNum, yearNum]);
                
                if (!assignment) {
                    return res.status(403).json({ error: 'No tienes permiso para ver este curso/asignatura' });
                }
            }
        }

        // 1. Get Students in the level (Include Active and Retired)
        const students = await db.all(`
            SELECT s.id, s.full_name, s.run, e.status, e.list_number
            FROM students s
            JOIN enrollments e ON s.id = e.student_id
            WHERE e.level_id = ? AND e.academic_year = ?
            ORDER BY e.list_number ASC
        `, [levelIdNum, yearNum]);

        // 2. Get Grade Columns settings
        const columns = await db.all(`
            SELECT * FROM grade_columns 
            WHERE level_id = ? AND subject_id = ? AND period = ? AND academic_year = ?
            ORDER BY position ASC
        `, [levelIdNum, subjectIdNum, periodStr, yearNum]);

        // 3. Get All Grades for these columns
        const columnIds = columns.map(c => c.id);
        let grades: any[] = [];
        if (columnIds.length > 0) {
            const placeholders = columnIds.map(() => '?').join(',');
            grades = await db.all(`
                SELECT * FROM grades 
                WHERE grade_column_id IN (${placeholders})
            `, [...columnIds]);
        }

        // 4. Get Lock Status
        const lockInfo = await db.get(`
            SELECT is_locked FROM grades_locks 
            WHERE level_id = ? AND subject_id = ? AND academic_year = ? AND period = ?
        `, [levelIdNum, subjectIdNum, yearNum, periodStr]);

        res.json({ students, columns, grades, isLocked: !!(lockInfo?.is_locked) });
    } catch (error: any) {
        console.error("Error in getGradesSheet", error);
        res.status(500).json({ error: error.message });
    }
};

export const saveGradesSheet = async (req: Request, res: Response) => {
    const { levelId, subjectId, period, year, columns } = req.body;
    const gradesInput = req.body.grades || req.body.gradesData || [];
    const columnsInput = columns || [];
    const user = (req as any).user;

    try {
        const levelIdNum = levelId ? parseInt(String(levelId), 10) : 0;
        const subjectIdNum = subjectId ? parseInt(String(subjectId), 10) : 0;
        const yearNum = year ? parseInt(String(year), 10) : 0;
        const periodStr = String(period || '');

        const specificLogs = [];

        // 1. Sync Grade Columns settings first
        const dbColumns = await db.all(`
            SELECT * FROM grade_columns 
            WHERE level_id = ? AND subject_id = ? AND period = ? AND academic_year = ?
        `, [levelIdNum, subjectIdNum, periodStr, yearNum]);
        
        const dbColMap = new Map<number, any>(dbColumns.map(c => [c.position, c]));
        const positionToId = new Map<number, string>();

        for (const col of columnsInput) {
            const pos = col.position;
            const existingCol = dbColMap.get(pos);
            let colId = '';
            if (existingCol) {
                colId = existingCol.id;
                if (existingCol.title !== col.title || parseFloat(String(existingCol.weighting)) !== parseFloat(String(col.weighting || 0))) {
                    await db.run(`
                        UPDATE grade_columns 
                        SET title = ?, weighting = ? 
                        WHERE id = ?
                    `, [col.title, col.weighting || 0, colId]);
                }
            } else {
                colId = uuidv4();
                await db.run(`
                    INSERT INTO grade_columns (id, level_id, subject_id, academic_year, period, title, position, weighting)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [colId, levelIdNum, subjectIdNum, yearNum, periodStr, col.title, col.position, col.weighting || 0]);
            }
            positionToId.set(pos, colId);
        }

        // 2. Fetch current data to detect changes
        const existingGradesRes = await db.all(`
            SELECT g.* 
            FROM grades g
            JOIN grade_columns gc ON g.grade_column_id = gc.id
            WHERE gc.level_id = ? AND gc.subject_id = ? AND gc.period = ? AND gc.academic_year = ?
        `, [levelIdNum, subjectIdNum, periodStr, yearNum]);

        const studentRes = await db.all(`
            SELECT s.id, s.full_name as name 
            FROM students s 
            JOIN enrollments e ON s.id = e.student_id 
            WHERE e.level_id = ? AND e.academic_year = ?
        `, [levelIdNum, yearNum]);

        const studentMap = new Map<string, any>(studentRes.map(s => [String(s.id), s]));

        // 3. Update/Insert/Delete each grade
        for (const g of gradesInput) {
            const colId = positionToId.get(g.position);
            if (!colId) continue;
            
            const newValue = (g.grade_value === null || g.grade_value === undefined || g.grade_value === '') ? null : parseFloat(String(g.grade_value).replace(',', '.'));
            const col = columnsInput.find((c: any) => c.position === g.position);
            
            const existingGrade = existingGradesRes.find(eg => eg.student_id === g.student_id && eg.grade_column_id === colId);

            if (existingGrade) {
                const dbValue = existingGrade.grade_value === null || existingGrade.grade_value === undefined ? null : parseFloat(String(existingGrade.grade_value));
                if (dbValue !== newValue) {
                    if (newValue === null) {
                        // Delete if empty
                        specificLogs.push({
                            action: 'DELETE_GRADE',
                            details: `Nota eliminada: ${dbValue} -> (vacío) - Estudiante: ${studentMap.get(g.student_id)?.name || g.student_id} - Columna: ${col?.title || g.position}`
                        });
                        await db.run('DELETE FROM grades WHERE id = ?', [existingGrade.id]);
                    } else {
                        // Update
                        specificLogs.push({
                            action: 'UPDATE_GRADE',
                            details: `Cambio de nota: ${dbValue} -> ${newValue} - Estudiante: ${studentMap.get(g.student_id)?.name || g.student_id} - Columna: ${col?.title || g.position}`
                        });
                        await db.run('UPDATE grades SET grade_value = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newValue, existingGrade.id]);
                    }
                }
            } else if (newValue !== null) {
                // Insert
                specificLogs.push({
                    action: 'ADD_GRADE',
                    details: `Ingreso de nota (${newValue}) - Estudiante: ${studentMap.get(g.student_id)?.name || g.student_id} - Columna: ${col?.title || g.position}`
                });
                await db.run('INSERT INTO grades (id, student_id, grade_column_id, grade_value) VALUES (?, ?, ?, ?)', 
                            [uuidv4(), g.student_id, colId, newValue]);
            }
        }

        // Audit Logs
        try {
            const levelName = await db.get('SELECT name FROM levels WHERE id = ?', [levelIdNum]);
            const subjectName = await db.get('SELECT name FROM subjects WHERE id = ?', [subjectIdNum]);
            
            await db.run(`
                INSERT INTO audit_logs (id, user_id, user_name, action, details, level_id, subject_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                uuidv4(), user?.id, user?.name || user?.run || 'Sistema', 
                'SAVE_GRADES', 
                `Guardado de planilla: ${levelName?.name || levelIdNum} - ${subjectName?.name || subjectIdNum} (${period || 'N/A'})`,
                String(levelIdNum), String(subjectIdNum)
            ]);

            for (const log of specificLogs) {
                await db.run(`
                    INSERT INTO audit_logs (id, user_id, user_name, action, details, level_id, subject_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                    uuidv4(), user?.id, user?.name || user?.run || 'Sistema', 
                    log.action, log.details, String(levelIdNum), String(subjectIdNum)
                ]);
            }
        } catch (logError) {
            console.error("Audit log error:", logError);
        }

        res.json({ success: true });
    } catch (error: any) {
        console.error("Save grades error:", error);
        res.status(500).json({ error: error.message });
    }
};

export const updateGradeColumns = async (req: Request, res: Response) => {
    const { levelId, subjectId, period, year, columns } = req.body;
    
    try {
        const newColumnIds = columns.filter((c: any) => c.id).map((c: any) => c.id);
        if (newColumnIds.length > 0) {
            const placeholders = newColumnIds.map(() => '?').join(',');
            await db.run(`
                DELETE FROM grade_columns 
                WHERE level_id = ? AND subject_id = ? AND period = ? AND academic_year = ?
                AND id NOT IN (${placeholders})
            `, [levelId, subjectId, period, year, ...newColumnIds]);
        } else {
            await db.run(`
                DELETE FROM grade_columns 
                WHERE level_id = ? AND subject_id = ? AND period = ? AND academic_year = ?
            `, [levelId, subjectId, period, year]);
        }

        for (const col of columns) {
            const id = col.id || uuidv4();
            await db.run(`
                INSERT INTO grade_columns (id, level_id, subject_id, academic_year, period, title, position, weighting)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET 
                    title = excluded.title, 
                    position = excluded.position,
                    weighting = excluded.weighting
            `, [id, levelId, subjectId, year, period, col.title, col.position, col.weighting]);
        }

        res.json({ message: 'Columnas actualizadas correctamente' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateStudentPosition = async (req: Request, res: Response) => {
    const { studentId, levelId, academicYear, newListNumber } = req.body;
    try {
        await db.run(`
            UPDATE enrollments 
            SET list_number = ? 
            WHERE student_id = ? AND level_id = ? AND academic_year = ?
        `, [newListNumber, studentId, levelId, academicYear]);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const bulkUpdateStudentPositions = async (req: Request, res: Response) => {
    const { levelId, academicYear, positions } = req.body;
    try {
        for (const pos of positions) {
            await db.run(`
                UPDATE enrollments 
                SET list_number = ? 
                WHERE student_id = ? AND level_id = ? AND academic_year = ?
            `, [pos.listNumber, pos.studentId, levelId, academicYear]);
        }
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getFiltersData = async (req: Request, res: Response) => {
    const user = (req as any).user;
    try {
        if (user.role === 'Admin') {
            const levels = await db.all('SELECT * FROM levels');
            const subjects = await db.all('SELECT * FROM subjects');
            return res.json({ levels, subjects });
        }

        const levels = await db.all(`
            SELECT DISTINCT l.* 
            FROM levels l
            LEFT JOIN teacher_assignments ta ON l.id = ta.level_id
            WHERE l.homeroom_teacher_id = ? OR ta.teacher_id = ?
        `, [user.id, user.id]);

        const subjects = await db.all(`
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
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const toggleLockAssignment = async (req: Request, res: Response) => {
    const { levelId, subjectId, academicYear, lock, period } = req.body;
    const user = (req as any).user;

    if (user.role !== 'Admin') return res.status(403).json({ error: 'Solo administradores pueden bloquear notas' });

    const levelIdNum = levelId ? parseInt(String(levelId), 10) : 0;
    const subjectIdNum = subjectId ? parseInt(String(subjectId), 10) : 0;
    const academicYearNum = academicYear ? parseInt(String(academicYear), 10) : 0;

    try {
        await db.run(`
            INSERT INTO grades_locks (level_id, subject_id, academic_year, period, is_locked)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(level_id, subject_id, academic_year, period) 
            DO UPDATE SET is_locked = excluded.is_locked
        `, [levelIdNum, subjectIdNum, academicYearNum, period, lock ? 1 : 0]);

        try {
            const levelName = await db.get('SELECT name FROM levels WHERE id = ?', [levelIdNum]);
            const subjectName = await db.get('SELECT name FROM subjects WHERE id = ?', [subjectIdNum]);

            await db.run(`
                INSERT INTO audit_logs (id, user_id, user_name, action, details, level_id, subject_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                uuidv4(), 
                user?.id || 'unknown', 
                user?.name || user?.run || 'Sistema', 
                lock ? 'LOCK_GRADES' : 'UNLOCK_GRADES',
                `${lock ? 'Bloqueo' : 'Desbloqueo'} de notas: ${levelName?.name || levelIdNum} - ${subjectName?.name || subjectIdNum}`,
                String(levelIdNum), 
                String(subjectIdNum)
            ]);
        } catch (logError) {
            console.error("Audit log error (LOCK/UNLOCK):", logError);
        }

        res.json({ success: true });
    } catch (error: any) {
        console.error("Toggle lock error:", error);
        res.status(500).json({ error: error.message });
    }
};

export const getAuditLogs = async (req: Request, res: Response) => {
    try {
        const logs = await db.all(`
            SELECT * FROM audit_logs 
            ORDER BY created_at DESC 
            LIMIT 500
        `);
        res.json(logs);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
