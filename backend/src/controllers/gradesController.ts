import { Request, Response } from 'express';
import db from '../config/db';
import crypto from 'crypto';

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
                colId = crypto.randomUUID();
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
                            [crypto.randomUUID(), g.student_id, colId, newValue]);
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
                crypto.randomUUID(), user?.id, user?.name || user?.run || 'Sistema', 
                'SAVE_GRADES', 
                `Guardado de planilla: ${levelName?.name || levelIdNum} - ${subjectName?.name || subjectIdNum} (${period || 'N/A'})`,
                String(levelIdNum), String(subjectIdNum)
            ]);

            for (const log of specificLogs) {
                await db.run(`
                    INSERT INTO audit_logs (id, user_id, user_name, action, details, level_id, subject_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                    crypto.randomUUID(), user?.id, user?.name || user?.run || 'Sistema', 
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
            const id = col.id || crypto.randomUUID();
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
                crypto.randomUUID(), 
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

export const getGradesOverview = async (req: Request, res: Response) => {
    const { levelId, period, year } = req.query;
    const user = (req as any).user;

    // Security check: Only Admin role can access
    if (user.role !== 'Admin') {
        return res.status(403).json({ error: 'Solo los administradores pueden ver el panorama general de calificaciones' });
    }

    try {
        const levelIdNum = levelId ? parseInt(String(levelId), 10) : 0;
        const yearNum = year ? parseInt(String(year), 10) : 0;
        const periodStr = String(period || '');

        if (!levelIdNum || !yearNum || !periodStr) {
            return res.status(400).json({ error: 'Faltan parámetros requeridos: levelId, period, year' });
        }

        // 1. Get all active students in the course (level)
        const students = await db.all(`
            SELECT s.id, s.full_name, s.run, e.list_number
            FROM students s
            JOIN enrollments e ON s.id = e.student_id
            WHERE e.level_id = ? AND e.academic_year = ? AND s.status = 'Active'
            ORDER BY e.list_number ASC, s.full_name ASC
        `, [levelIdNum, yearNum]);

        // 2. Get all subjects assigned to that level
        const subjects = await db.all(`
            SELECT DISTINCT sub.id, sub.name
            FROM teacher_assignments ta
            JOIN subjects sub ON ta.subject_id = sub.id
            WHERE ta.level_id = ? AND ta.academic_year = ?
        `, [levelIdNum, yearNum]);

        // 3. Get all grade columns for this level, period and year
        const columns = await db.all(`
            SELECT id, subject_id, position, weighting
            FROM grade_columns
            WHERE level_id = ? AND academic_year = ? AND period = ?
        `, [levelIdNum, yearNum, periodStr]);

        // 4. Get all grades for these students and columns
        let grades: any[] = [];
        const studentIds = students.map(s => s.id);
        const columnIds = columns.map(c => c.id);

        if (studentIds.length > 0 && columnIds.length > 0) {
            grades = await db.all(`
                SELECT student_id, grade_column_id, grade_value
                FROM grades
                WHERE student_id IN (
                    SELECT student_id FROM enrollments 
                    WHERE level_id = ? AND academic_year = ? AND status = 'Active'
                )
                AND grade_column_id IN (
                    SELECT id FROM grade_columns 
                    WHERE level_id = ? AND academic_year = ? AND period = ?
                )
            `, [levelIdNum, yearNum, levelIdNum, yearNum, periodStr]);
        }

        const isQualitativeSubject = (name: string): boolean => {
            const lower = name.toLowerCase();
            return lower.includes('religión') || lower.includes('religion') || lower.includes('orientación') || lower.includes('orientacion');
        };

        // 5. Compute stats per subject
        const subjectsData = [];
        for (const sub of subjects) {
            const isQual = isQualitativeSubject(sub.name);
            const subCols = columns.filter(c => String(c.subject_id) === String(sub.id));
            const subColIds = subCols.map(c => String(c.id));

            const subGrades = grades.filter(g => subColIds.includes(String(g.grade_column_id)));
            const hasGrades = subGrades.length > 0;
            const gradesCount = subGrades.filter(g => {
                const col = subCols.find(c => String(c.id) === String(g.grade_column_id));
                return col && col.position <= 10;
            }).length;

            // Calculate averages for this subject across all students
            let sumAverages = 0;
            let countAverages = 0;

            for (const stu of students) {
                const stuGrades = subGrades.filter(g => String(g.student_id) === String(stu.id));
                if (stuGrades.length === 0) continue;

                if (isQual) {
                    const avgCol = subCols.find(c => c.position === 11);
                    const avgGrade = avgCol ? stuGrades.find(g => String(g.grade_column_id) === String(avgCol.id)) : null;
                    if (avgGrade) {
                        const val = parseFloat(avgGrade.grade_value);
                        if (!isNaN(val)) {
                            sumAverages += val;
                            countAverages++;
                        }
                    }
                } else {
                    let stuSum = 0;
                    let stuTotalWeight = 0;
                    let stuSimpleSum = 0;
                    let stuSimpleCount = 0;

                    subCols.filter(c => c.position <= 10).forEach(col => {
                        const g = stuGrades.find(g => String(g.grade_column_id) === String(col.id));
                        if (g) {
                            const gradeVal = parseFloat(g.grade_value) || 0;
                            const colWeight = parseFloat(col.weighting) || 0;
                            stuSum += gradeVal * colWeight;
                            stuTotalWeight += colWeight;
                            stuSimpleSum += gradeVal;
                            stuSimpleCount++;
                        }
                    });

                    if (stuTotalWeight > 0) {
                        sumAverages += (stuSum / stuTotalWeight);
                        countAverages++;
                    } else if (stuSimpleCount > 0) {
                        sumAverages += (stuSimpleSum / stuSimpleCount);
                        countAverages++;
                    }
                }
            }

            const subjectAverage = countAverages > 0 ? (sumAverages / countAverages) : null;

            subjectsData.push({
                id: sub.id,
                name: sub.name,
                hasGrades,
                gradesCount,
                average: subjectAverage !== null ? subjectAverage.toFixed(1).replace('.', ',') : '-',
                isQualitative: isQual
            });
        }

        // 6. Compute stats per student
        const formatAverage = (val: number | null | undefined, isQual: boolean): string => {
            if (val === null || val === undefined || isNaN(val)) return '-';
            if (isQual) {
                if (val >= 6.0) return 'MB';
                if (val >= 5.0) return 'B';
                if (val >= 4.0) return 'S';
                return 'I';
            }
            return Number(val).toFixed(1).replace('.', ',');
        };

        const studentsData = [];
        let courseGpaSum = 0;
        let courseGpaCount = 0;
        let totalRedGrades = 0;
        let totalBlueGrades = 0;
        let atRiskCount = 0; // GPA < 4.0
        let studentsWithRedCount = 0; // Students with at least one red grade

        for (const stu of students) {
            let studentSumAverages = 0;
            let studentCountAverages = 0;
            let redCount = 0;
            let blueCount = 0;
            const failingSubjects: string[] = [];
            const subjectAverages: Record<string, string> = {};

            // Calculate averages for this student across all subjects
            for (const sub of subjects) {
                subjectAverages[String(sub.id)] = '-';

                const isQual = isQualitativeSubject(sub.name);
                const subCols = columns.filter(c => String(c.subject_id) === String(sub.id));
                const subColIds = subCols.map(c => String(c.id));

                const stuGradesForSub = grades.filter(g => String(g.student_id) === String(stu.id) && subColIds.includes(String(g.grade_column_id)));
                if (stuGradesForSub.length === 0) continue;

                // Count red/blue grades in columns 1 to 10
                stuGradesForSub.forEach(g => {
                    const col = subCols.find(c => String(c.id) === String(g.grade_column_id));
                    if (col && col.position <= 10 && !isQual) {
                        const val = parseFloat(g.grade_value);
                        if (!isNaN(val)) {
                            if (val < 4.0) {
                                redCount++;
                                totalRedGrades++;
                            } else {
                                blueCount++;
                                totalBlueGrades++;
                            }
                        }
                    }
                });

                // Calculate average of the subject for this student
                let subAvg: number | null = null;

                if (isQual) {
                    const avgCol = subCols.find(c => c.position === 11);
                    const avgGrade = avgCol ? stuGradesForSub.find(g => String(g.grade_column_id) === String(avgCol.id)) : null;
                    if (avgGrade) {
                        subAvg = parseFloat(avgGrade.grade_value);
                    }
                } else {
                    let stuSum = 0;
                    let stuTotalWeight = 0;
                    let stuSimpleSum = 0;
                    let stuSimpleCount = 0;

                    subCols.filter(c => c.position <= 10).forEach(col => {
                        const g = stuGradesForSub.find(g => String(g.grade_column_id) === String(col.id));
                        if (g) {
                            const gradeVal = parseFloat(g.grade_value) || 0;
                            const colWeight = parseFloat(col.weighting) || 0;
                            stuSum += gradeVal * colWeight;
                            stuTotalWeight += colWeight;
                            stuSimpleSum += gradeVal;
                            stuSimpleCount++;
                        }
                    });

                    if (stuTotalWeight > 0) {
                        subAvg = stuSum / stuTotalWeight;
                    } else if (stuSimpleCount > 0) {
                        subAvg = stuSimpleSum / stuSimpleCount;
                    }
                }

                if (subAvg !== null) {
                    subjectAverages[String(sub.id)] = formatAverage(subAvg, isQual);
                    if (!isQual) {
                        studentSumAverages += subAvg;
                        studentCountAverages++;

                        if (subAvg < 4.0) {
                            failingSubjects.push(`${sub.name} (${subAvg.toFixed(1).replace('.', ',')})`);
                        }
                    }
                }
            }

            const studentGpa = studentCountAverages > 0 ? (studentSumAverages / studentCountAverages) : null;
            if (studentGpa !== null) {
                courseGpaSum += studentGpa;
                courseGpaCount++;

                if (studentGpa < 4.0) {
                    atRiskCount++;
                }
            }

            if (redCount > 0) {
                studentsWithRedCount++;
            }

            studentsData.push({
                id: stu.id,
                run: stu.run,
                name: stu.full_name,
                listNumber: stu.list_number,
                gpa: studentGpa !== null ? studentGpa.toFixed(1).replace('.', ',') : '-',
                gpaNum: studentGpa,
                redCount,
                blueCount,
                failingSubjects,
                subjectAverages
            });
        }

        const courseGpa = courseGpaCount > 0 ? (courseGpaSum / courseGpaCount) : null;
        const totalGrades = totalBlueGrades + totalRedGrades;

        const stats = {
            courseGpa: courseGpa !== null ? courseGpa.toFixed(1).replace('.', ',') : '-',
            totalGrades,
            blueCount: totalBlueGrades,
            redCount: totalRedGrades,
            bluePercentage: totalGrades > 0 ? ((totalBlueGrades / totalGrades) * 100).toFixed(1) : '0',
            redPercentage: totalGrades > 0 ? ((totalRedGrades / totalGrades) * 100).toFixed(1) : '0',
            atRiskCount, // GPA < 4.0
            studentsWithRedCount // At least one red grade
        };

        res.json({
            students: studentsData,
            subjects: subjectsData,
            stats
        });
    } catch (error: any) {
        console.error("Error in getGradesOverview", error);
        res.status(500).json({ error: error.message });
    }
};
