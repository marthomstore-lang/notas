import { Request, Response } from 'express';
import { getDb } from '../config/db';
import { v4 as uuidv4 } from 'uuid';

export const getGradesSheet = async (req: Request, res: Response) => {
    const { levelId, subjectId, period, year } = req.query;
    const user = (req as any).user;
    const db = await getDb();

    try {
        // Security check for teachers: Only assigned subjects OR Homeroom Teacher of the level
        if (user.role === 'Docente') {
            const isHomeroomTeacher = await db.get('SELECT id FROM levels WHERE id = ? AND homeroom_teacher_id = ?', [levelId, user.id]);
            
            if (!isHomeroomTeacher) {
                const assignment = await db.get(`
                    SELECT id FROM teacher_assignments 
                    WHERE teacher_id = ? AND level_id = ? AND subject_id = ? AND academic_year = ?
                `, [user.id, levelId, subjectId, year]);
                
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
        `, [levelId, year]);

        // 2. Get Grade Columns settings
        const columns = await db.all(`
            SELECT * FROM grade_columns 
            WHERE level_id = ? AND subject_id = ? AND period = ? AND academic_year = ?
            ORDER BY position ASC
        `, [levelId, subjectId, period, year]);

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
        `, [levelId, subjectId, year, period]);

        res.json({ students, columns, grades, isLocked: !!(lockInfo?.is_locked) });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const saveGradesSheet = async (req: Request, res: Response) => {
    const { levelId, subjectId, period, year, columns, gradesData } = req.body;
    const user = (req as any).user;
    const db = await getDb();

    try {
        // 0. Check for Locks
        const lockStatus = await db.get(`
            SELECT is_locked FROM grades_locks 
            WHERE level_id = ? AND subject_id = ? AND academic_year = ? AND period = ?
        `, [levelId, subjectId, year, period]);

        if (lockStatus && lockStatus.is_locked && user.role !== 'Admin') {
            return res.status(403).json({ error: 'Este registro está bloqueado. Contacte al administrador.' });
        }
        // Security check for teachers: Only assigned subjects OR Homeroom Teacher of the level
        if (user.role === 'Docente') {
            const isHomeroomTeacher = await db.get('SELECT id FROM levels WHERE id = ? AND homeroom_teacher_id = ?', [levelId, user.id]);

            if (!isHomeroomTeacher) {
                const assignment = await db.get(`
                    SELECT id FROM teacher_assignments 
                    WHERE teacher_id = ? AND level_id = ? AND subject_id = ? AND academic_year = ?
                `, [user.id, levelId, subjectId, year]);
                
                if (!assignment) {
                    return res.status(403).json({ error: 'No tienes permiso para modificar este curso/asignatura' });
                }
            }
        }

        await db.run('BEGIN TRANSACTION');

        // Pre-fetch students for detailed logging
        const studentsInLevel = await db.all(`
            SELECT s.id, s.full_name, s.status 
            FROM students s 
            JOIN enrollments e ON s.id = e.student_id 
            WHERE e.level_id = ? AND e.academic_year = ?
        `, [levelId, year]);
        const studentMap = new Map(studentsInLevel.map(s => [s.id, { name: s.full_name, status: s.status }]));
        const specificLogs: any[] = [];

        // 1. Update or Insert Columns (Ponderaciones)
        for (const col of columns) {
            const existing = await db.get('SELECT id FROM grade_columns WHERE level_id = ? AND subject_id = ? AND period = ? AND academic_year = ? AND position = ?', 
                [levelId, subjectId, period, year, col.position]);
            
            let columnId = col.id;
            if (existing) {
                columnId = existing.id;
                await db.run('UPDATE grade_columns SET weighting = ?, title = ? WHERE id = ?', [col.weighting, col.title || `N${col.position}`, columnId]);
            } else {
                columnId = col.id || uuidv4();
                await db.run(`INSERT INTO grade_columns (id, level_id, subject_id, academic_year, period, position, weighting, title) 
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
                             [columnId, levelId, subjectId, year, period, col.position, col.weighting, col.title || `N${col.position}`]);
            }
            
            // Map column IDs if they were generated
            col.newId = columnId;
        }

        // 2. Update or Insert Grades
        console.log(`Procesando ${gradesData.length} registros de notas...`);
        for (const g of gradesData) {
            const studentInfo = studentMap.get(g.student_id);
            if (studentInfo?.status === 'RETIRADO') {
                console.log(`Saltando registro: Estudiante retirado ${studentInfo.name}`);
                continue;
            }

            // Find the correct column ID based on position if not provided
            const col = columns.find((c: any) => c.position === g.position);
            const columnId = col ? col.newId : g.grade_column_id;

            if (!columnId) {
                console.log(`Saltando registro: No se encontró columnId para posición ${g.position}`);
                continue;
            }

            const existingGrade = await db.get('SELECT id, grade_value FROM grades WHERE student_id = ? AND grade_column_id = ?', [g.student_id, columnId]);
            
            // Normalizar el valor entrante
            const newValue = (g.grade_value === undefined || g.grade_value === null) ? '' : String(g.grade_value).replace(',', '.').trim();
            
            if (existingGrade) {
                if (newValue === '') {
                    // Si se borró el valor -> ELIMINAR fila y registrar
                    specificLogs.push({
                        action: 'DELETE_GRADE',
                        details: `Eliminación de nota (${existingGrade.grade_value}) - Estudiante: ${studentMap.get(g.student_id)?.name || g.student_id} - Columna: ${col?.title || g.position}`
                    });
                    await db.run('DELETE FROM grades WHERE id = ?', [existingGrade.id]);
                } else {
                    const dbValue = existingGrade.grade_value !== null ? String(existingGrade.grade_value) : '';
                    // Comparación robusta
                    if (dbValue !== newValue && parseFloat(dbValue) !== parseFloat(newValue)) {
                        console.log(`Actualizando: Est=${g.student_id} Col=${columnId} Old=${dbValue} New=${newValue}`);
                        specificLogs.push({
                            action: 'UPDATE_GRADE', // Nuevo tipo de log interno
                            details: `Cambio de nota: ${dbValue} -> ${newValue} - Estudiante: ${studentMap.get(g.student_id)?.name || g.student_id} - Columna: ${col?.title || g.position}`
                        });
                        await db.run('UPDATE grades SET grade_value = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newValue, existingGrade.id]);
                    }
                }
            } else if (newValue !== '') {
                // Log addition
                console.log(`Insertando: Est=${g.student_id} Col=${columnId} Val=${newValue}`);
                specificLogs.push({
                    action: 'ADD_GRADE',
                    details: `Ingreso de nota (${newValue}) - Estudiante: ${studentMap.get(g.student_id)?.name || g.student_id} - Columna: ${col?.title || g.position}`
                });
                await db.run('INSERT INTO grades (id, student_id, grade_column_id, grade_value) VALUES (?, ?, ?, ?)', 
                            [uuidv4(), g.student_id, columnId, newValue]);
            }
        }

        await db.run('COMMIT');
        console.log(`Guardado completado. Logs específicos generados: ${specificLogs.length}`);

        // 3. Log the Actions (In separate try-catches to not block the main save)
        try {
            const levelName = await db.get('SELECT name FROM levels WHERE id = ?', [levelId]);
            const subjectName = await db.get('SELECT name FROM subjects WHERE id = ?', [subjectId]);
            
            // Log main save
            await db.run(`
                INSERT INTO audit_logs (id, user_id, user_name, action, details, level_id, subject_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                uuidv4(), user?.id, user?.name || user?.run || 'Sistema', 
                'SAVE_GRADES', 
                `Guardado de planilla: ${levelName?.name || levelId} - ${subjectName?.name || subjectId} (${period || 'N/A'})`,
                levelId, subjectId
            ]);

            // Log specific changes
            for (const log of specificLogs) {
                await db.run(`
                    INSERT INTO audit_logs (id, user_id, user_name, action, details, level_id, subject_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                    uuidv4(), user?.id, user?.name || user?.run || 'Sistema', 
                    log.action, log.details, levelId, subjectId
                ]);
            }
        } catch (logError) {
            console.error("Audit log error:", logError);
        }

        res.json({ success: true });
    } catch (error: any) {
        if (db) await db.run('ROLLBACK');
        console.error("Save grades error:", error);
        res.status(500).json({ error: error.message });
    }
};

export const updateStudentPosition = async (req: Request, res: Response) => {
    const { studentId, levelId, academicYear, newListNumber } = req.body;
    const db = await getDb();
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
    const { levelId, academicYear, positions } = req.body; // positions: [{ studentId, listNumber }]
    const db = await getDb();
    try {
        await db.run('BEGIN TRANSACTION');
        for (const pos of positions) {
            await db.run(`
                UPDATE enrollments 
                SET list_number = ? 
                WHERE student_id = ? AND level_id = ? AND academic_year = ?
            `, [pos.listNumber, pos.studentId, levelId, academicYear]);
        }
        await db.run('COMMIT');
        res.json({ success: true });
    } catch (error: any) {
        if (db) await db.run('ROLLBACK');
        res.status(500).json({ error: error.message });
    }
};

export const getFiltersData = async (req: Request, res: Response) => {
    const user = (req as any).user;
    const db = await getDb();
    try {
        if (user.role === 'Admin') {
            const levels = await db.all('SELECT * FROM levels');
            const subjects = await db.all('SELECT * FROM subjects');
            return res.json({ levels, subjects });
        }

        // For Teachers:
        // 1. Levels where they are either Homeroom Teacher or have at least one assignment
        const levels = await db.all(`
            SELECT DISTINCT l.* 
            FROM levels l
            LEFT JOIN teacher_assignments ta ON l.id = ta.level_id
            WHERE l.homeroom_teacher_id = ? OR ta.teacher_id = ?
        `, [user.id, user.id]);

        // 2. Subjects: If they are Homeroom Teacher for the level, they see ALL subjects in that level.
        // Otherwise, only assigned subjects.
        // Note: For the initial filter load, we return all subjects they have access to across ALL their levels.
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
    const { levelId, subjectId, academicYear, lock } = req.body;
    const user = (req as any).user;
    const db = await getDb();

    if (user.role !== 'Admin') return res.status(403).json({ error: 'Solo administradores pueden bloquear notas' });

    try {
        await db.run(`
            INSERT INTO grades_locks (level_id, subject_id, academic_year, period, is_locked)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(level_id, subject_id, academic_year, period) 
            DO UPDATE SET is_locked = excluded.is_locked
        `, [levelId, subjectId, academicYear, req.body.period, lock ? 1 : 0]);

        try {
            const levelName = await db.get('SELECT name FROM levels WHERE id = ?', [levelId]);
            const subjectName = await db.get('SELECT name FROM subjects WHERE id = ?', [subjectId]);

            await db.run(`
                INSERT INTO audit_logs (id, user_id, user_name, action, details, level_id, subject_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                uuidv4(), 
                user?.id || 'unknown', 
                user?.name || user?.run || 'Sistema', 
                lock ? 'LOCK_GRADES' : 'UNLOCK_GRADES',
                `${lock ? 'Bloqueo' : 'Desbloqueo'} de notas: ${levelName?.name || levelId} - ${subjectName?.name || subjectId}`,
                levelId, 
                subjectId
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
    const db = await getDb();
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
