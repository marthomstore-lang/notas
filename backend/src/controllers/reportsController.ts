import { Request, Response } from 'express';
import db from '../config/db';

async function generateStudentReport(dbInstance: any, studentId: any, year: any, period: any) {
    // 1. Get Student and Level Info
    const student = await dbInstance.get(`
        SELECT s.*, l.name as level_name, l.homeroom_teacher_id, e.level_id
        FROM students s
        JOIN enrollments e ON s.id = e.student_id
        JOIN levels l ON e.level_id = l.id
        WHERE s.id = ? AND e.academic_year = ?
    `, [studentId, year]);

    if (!student) return null;

    // 2. Get Homeroom Teacher (Profesor Jefe)
    let homeroomTeacherName = 'No asignado';
    if (student.homeroom_teacher_id) {
        const teacher = await dbInstance.get("SELECT name FROM users WHERE id = ?", [student.homeroom_teacher_id]);
        if (teacher) homeroomTeacherName = teacher.name;
    }

    // 3. Get Director Name
    const directorSetting = await dbInstance.get("SELECT value FROM institutional_settings WHERE key = 'director_name'");
    const directorName = directorSetting ? directorSetting.value : 'Nombre del Director';

    // 4. Get Subjects and Grades
    const subjects = await dbInstance.all(`
        SELECT DISTINCT sub.id, sub.name
        FROM teacher_assignments ta
        JOIN subjects sub ON ta.subject_id = sub.id
        WHERE ta.level_id = ? AND ta.academic_year = ?
    `, [student.level_id, year]);

    // Apply custom subject order if configured
    try {
        const orderSetting = await dbInstance.get("SELECT value FROM institutional_settings WHERE key = ?", [`subject_order_${student.level_id}`]);
        if (orderSetting && orderSetting.value) {
            const orderedIds = JSON.parse(orderSetting.value);
            if (Array.isArray(orderedIds)) {
                subjects.sort((a: any, b: any) => {
                    const idxA = orderedIds.indexOf(Number(a.id));
                    const idxB = orderedIds.indexOf(Number(b.id));
                    if (idxA === -1 && idxB === -1) return 0;
                    if (idxA === -1) return 1;
                    if (idxB === -1) return -1;
                    return idxA - idxB;
                });
            }
        }
    } catch (err) {
        console.error("Error sorting subjects in generateStudentReport:", err);
    }

    const reportData = [];
    const isAnnual = period === 'Finalización de año';

    const isQualitativeSubject = (name: string): boolean => {
        const lower = name.toLowerCase();
        return lower.includes('religión') || lower.includes('religion') || lower.includes('orientación') || lower.includes('orientacion');
    };

    for (const sub of subjects) {
        const isQual = isQualitativeSubject(sub.name);

        if (isAnnual) {
            const format = (v: number | null) => {
                if (v === null || isNaN(v)) return '-';
                if (isQual) {
                    if (v >= 6.0) return 'MB';
                    if (v >= 5.0) return 'B';
                    if (v >= 4.0) return 'S';
                    return 'I';
                }
                return v.toFixed(1).replace('.', ',');
            };

            const getSemData = async (p: string) => {
                const cols = await dbInstance.all("SELECT id, weighting, position FROM grade_columns WHERE level_id=? AND subject_id=? AND period=? AND academic_year=?", [student.level_id, sub.id, p, year]);
                const colIds = cols.map(c => c.id);
                const gData = colIds.length > 0 ? await dbInstance.all(`SELECT grade_value, grade_column_id FROM grades WHERE student_id=? AND grade_column_id IN (${colIds.map(()=>'?').join(',')})`, [studentId, ...colIds]) : [];
                
                let sum = 0, weight = 0, sSum = 0, sCount = 0;
                const partials = Array.from({ length: 10 }).map((_, i) => {
                    const col = cols.find(c => c.position === i + 1);
                    const grade = col ? gData.find(g => g.grade_column_id === col.id) : null;
                    if (grade) {
                        sum += grade.grade_value * (col!.weighting || 0);
                        weight += (col!.weighting || 0);
                        sSum += grade.grade_value;
                        sCount++;
                        return format(grade.grade_value);
                    }
                    return null;
                });

                let avg: number | null = null;
                if (isQual) {
                    const avgCol = cols.find(c => c.position === 11);
                    const avgGrade = avgCol ? gData.find(g => g.grade_column_id === avgCol.id) : null;
                    avg = avgGrade ? avgGrade.grade_value : null;
                } else {
                    if (weight > 0) avg = sum / weight;
                    else if (sCount > 0) avg = sSum / sCount;
                }

                return { partials, avg };
            };

            const s1 = await getSemData('1er Semestre');
            const s2 = await getSemData('2do Semestre');

            let finalAvg: number | null = null;
            if (s1.avg !== null && s2.avg !== null) finalAvg = (s1.avg + s2.avg) / 2;
            else if (s1.avg !== null) finalAvg = s1.avg;
            else if (s2.avg !== null) finalAvg = s2.avg;

            reportData.push({
                subjectName: sub.name,
                s1: s1.partials,
                avgS1: format(s1.avg),
                s2: s2.partials,
                avgS2: format(s2.avg),
                average: format(finalAvg),
                isAnnual: true
            });
        } else {
            const columns = await dbInstance.all(`
                SELECT id, position, weighting, title
                FROM grade_columns
                WHERE level_id = ? AND subject_id = ? AND period = ? AND academic_year = ?
                ORDER BY position ASC
            `, [student.level_id, sub.id, period, year]);

            const columnIds = columns.map(c => c.id);
            let grades = [];
            if (columnIds.length > 0) {
                const placeholders = columnIds.map(() => '?').join(',');
                grades = await dbInstance.all(`
                    SELECT grade_column_id, grade_value
                    FROM grades
                    WHERE student_id = ? AND grade_column_id IN (${placeholders})
                `, [studentId, ...columnIds]);
            }

            let sum = 0;
            let totalWeight = 0;
            let simpleSum = 0;
            let simpleCount = 0;

            columns.filter(col => col.position <= 10).forEach(col => {
                const grade = grades.find(g => g.grade_column_id === col.id);
                if (grade) {
                    sum += grade.grade_value * (col.weighting || 0);
                    totalWeight += (col.weighting || 0);
                    simpleSum += grade.grade_value;
                    simpleCount++;
                }
            });

            const formatGrade = (val: number | null | undefined) => {
                if (val === null || val === undefined || isNaN(val)) return '-';
                if (isQual) {
                    if (val >= 6.0) return 'MB';
                    if (val >= 5.0) return 'B';
                    if (val >= 4.0) return 'S';
                    return 'I';
                }
                return val.toFixed(1).replace('.', ',');
            };

            let average = '-';
            if (isQual) {
                const avgCol = columns.find(col => col.position === 11);
                const avgGrade = avgCol ? grades.find(g => g.grade_column_id === avgCol.id) : null;
                average = avgGrade ? formatGrade(avgGrade.grade_value) : '-';
            } else {
                if (totalWeight > 0) {
                    average = formatGrade(sum / totalWeight);
                } else if (simpleCount > 0) {
                    average = formatGrade(simpleSum / simpleCount);
                }
            }

            reportData.push({
                subjectName: sub.name,
                grades: columns.filter(col => col.position <= 10).map(col => {
                    const g = grades.find(grade => grade.grade_column_id === col.id);
                    return g ? formatGrade(g.grade_value) : null;
                }),
                average,
                isAnnual: false
            });
        }
    }

    return {
        student,
        homeroomTeacherName,
        directorName,
        periodData: reportData,
        isAnnual
    };
}

export const getStudentGradesReport = async (req: Request, res: Response) => {
    const { studentId } = req.params;
    const { year, period } = req.query;

    try {
        const yearStr = String(year || '');
        const periodStr = String(period || '');
        const data = await generateStudentReport(db, studentId, yearStr, periodStr);
        if (!data) return res.status(404).json({ error: 'Estudiante no encontrado' });
        res.json(data);
    } catch (error: any) {
        console.error("Error in getStudentGradesReport", error);
        res.status(500).json({ error: error.message });
    }
};

export const getLevelGradesReport = async (req: Request, res: Response) => {
    const { levelId } = req.params;
    const { year, period } = req.query;

    try {
        const yearStr = String(year || '');
        const periodStr = String(period || '');
        const students = await db.all(`
            SELECT e.student_id 
            FROM enrollments e
            JOIN students s ON e.student_id = s.id
            WHERE e.level_id = ? AND e.academic_year = ? 
            AND s.status = 'Active'
            ORDER BY e.list_number ASC
        `, [levelId, yearStr]);

        const reports = [];
        for (const s of students) {
            const data = await generateStudentReport(db, s.student_id, yearStr, periodStr);
            if (data) reports.push(data);
        }

        res.json(reports);
    } catch (error: any) {
        console.error("Error in getLevelGradesReport", error);
        res.status(500).json({ error: error.message });
    }
};

export const updateInstitutionalSettings = async (req: Request, res: Response) => {
    const { directorName, schoolName } = req.body;
    try {
        if (directorName) {
            await db.run(`
                INSERT INTO institutional_settings (key, value) 
                VALUES ('director_name', ?) 
                ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value
            `, [directorName]);
        }
        if (schoolName) {
            await db.run(`
                INSERT INTO institutional_settings (key, value) 
                VALUES ('school_name', ?) 
                ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value
            `, [schoolName]);
        }
        res.json({ success: true });
    } catch (error: any) {
        console.error("Error in updateInstitutionalSettings", error);
        res.status(500).json({ error: error.message });
    }
};

export const setHomeroomTeacher = async (req: Request, res: Response) => {
    const { levelId, teacherId } = req.body;
    try {
        await db.run("UPDATE levels SET homeroom_teacher_id = ? WHERE id = ?", [teacherId, levelId]);
        res.json({ success: true });
    } catch (error: any) {
        console.error("Error in setHomeroomTeacher", error);
        res.status(500).json({ error: error.message });
    }
};

export const getSubjectOrder = async (req: Request, res: Response) => {
    const { levelId } = req.params;
    try {
        const row = await db.get("SELECT value FROM institutional_settings WHERE key = ?", [`subject_order_${levelId}`]);
        const subjectOrder = row ? JSON.parse(row.value) : [];
        res.json({ levelId: Number(levelId), subjectOrder });
    } catch (error: any) {
        console.error("Error in getSubjectOrder", error);
        res.status(500).json({ error: error.message });
    }
};

export const updateSubjectOrder = async (req: Request, res: Response) => {
    const { levelId, subjectOrder } = req.body;
    try {
        if (!levelId || !Array.isArray(subjectOrder)) {
            return res.status(400).json({ error: "Datos inválidos. Se requiere levelId y subjectOrder (arreglo de IDs)." });
        }
        await db.run(`
            INSERT INTO institutional_settings (key, value) 
            VALUES (?, ?) 
            ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value
        `, [`subject_order_${levelId}`, JSON.stringify(subjectOrder)]);
        res.json({ success: true });
    } catch (error: any) {
        console.error("Error in updateSubjectOrder", error);
        res.status(500).json({ error: error.message });
    }
};
