import { Request, Response } from 'express';
import db from '../config/db';
import * as xlsx from 'xlsx';

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
    let subjects = await dbInstance.all(`
        SELECT DISTINCT sub.id, sub.name, sub.influences_gpa, sub.tributes_to_subject_id, sub.is_qualitative
        FROM teacher_assignments ta
        JOIN subjects sub ON ta.subject_id = sub.id
        WHERE ta.level_id = ? AND ta.academic_year = ?
    `, [student.level_id, year]);

    // Ensure parent subjects are included if child subjects tribute to them
    const parentSubjectIds = subjects.map((s: any) => s.tributes_to_subject_id).filter(Boolean);
    for (const pId of parentSubjectIds) {
        if (!subjects.some((s: any) => String(s.id) === String(pId))) {
            const parentSub = await dbInstance.get("SELECT id, name, influences_gpa, tributes_to_subject_id, is_qualitative FROM subjects WHERE id = ?", [pId]);
            if (parentSub) {
                subjects.push(parentSub);
            }
        }
    }

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

    // Fetch level subject settings and student subject exemptions for hierarchy resolution
    const levelSettings = await dbInstance.all("SELECT * FROM level_subject_settings WHERE level_id = ?", [student.level_id]);
    const studentExemptions = await dbInstance.all("SELECT * FROM student_subject_exemptions WHERE student_id = ? AND academic_year = ?", [studentId, year]);

    const reportData: any[] = [];
    const isAnnual = period === 'Finalización de año';

    const isQualitativeSubject = (sub: any): boolean => {
        if (sub.is_qualitative !== undefined && sub.is_qualitative !== null) {
            if (sub.is_qualitative === true || sub.is_qualitative === 1 || sub.is_qualitative === '1') return true;
        }
        const lower = String(sub.name || '').toLowerCase();
        return lower.includes('religión') || lower.includes('religion') || lower.includes('orientación') || lower.includes('orientacion');
    };

    for (const sub of subjects) {
        const isQual = isQualitativeSubject(sub);
        
        const stuEx = studentExemptions.find((e: any) => String(e.subject_id) === String(sub.id));
        const lvlSet = levelSettings.find((l: any) => String(l.subject_id) === String(sub.id));

        let influencesGpa = true;
        if (stuEx && stuEx.influences_gpa !== undefined && stuEx.influences_gpa !== null) {
            influencesGpa = stuEx.influences_gpa === true || stuEx.influences_gpa === 1 || stuEx.influences_gpa === '1';
        } else if (lvlSet && lvlSet.influences_gpa !== undefined && lvlSet.influences_gpa !== null) {
            influencesGpa = lvlSet.influences_gpa === true || lvlSet.influences_gpa === 1 || lvlSet.influences_gpa === '1';
        } else {
            influencesGpa = sub.influences_gpa === undefined || sub.influences_gpa === null || sub.influences_gpa === true || sub.influences_gpa === 1 || sub.influences_gpa === '1';
        }

        let tributesToSubjectId = null;
        if (lvlSet && lvlSet.tributes_to_subject_id !== undefined && lvlSet.tributes_to_subject_id !== null) {
            tributesToSubjectId = lvlSet.tributes_to_subject_id;
        } else {
            tributesToSubjectId = sub.tributes_to_subject_id;
        }

        if (isAnnual) {
            const format = (v: number | null) => {
                if (v === null || isNaN(v)) return '-';
                if (isQual) {
                    if (v >= 6.0) return 'MB';
                    if (v >= 5.0) return 'B';
                    if (v >= 4.0) return 'S';
                    return 'I';
                }
                return (Math.round((Number(v) + 1e-9) * 10) / 10).toFixed(1).replace('.', ',');
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
                        const gradeVal = parseFloat(grade.grade_value) || 0;
                        const colWeight = parseFloat(col!.weighting) || 0;
                        sum += gradeVal * colWeight;
                        weight += colWeight;
                        sSum += gradeVal;
                        sCount++;
                        return format(grade.grade_value);
                    }
                    return null;
                });

                let avg: number | null = null;
                if (isQual) {
                    const avgCol = cols.find(c => c.position === 11);
                    const avgGrade = avgCol ? gData.find(g => g.grade_column_id === avgCol.id) : null;
                    avg = avgGrade ? parseFloat(avgGrade.grade_value) : null;
                } else {
                    if (weight > 0) avg = sum / weight;
                    else if (sCount > 0) avg = sSum / sCount;
                }

                return { partials, avg };
            };

            const s1 = await getSemData('1er Semestre');
            const s2 = await getSemData('2do Semestre');

            let finalAvg: number | null = null;
            if (s1.avg !== null && s2.avg !== null) {
                const r1 = Math.round((s1.avg + 1e-9) * 10) / 10;
                const r2 = Math.round((s2.avg + 1e-9) * 10) / 10;
                finalAvg = (r1 + r2) / 2;
            }
            else if (s1.avg !== null) finalAvg = Math.round((s1.avg + 1e-9) * 10) / 10;
            else if (s2.avg !== null) finalAvg = Math.round((s2.avg + 1e-9) * 10) / 10;

            reportData.push({
                subjectId: sub.id,
                subjectName: sub.name,
                influencesGpa,
                tributesToSubjectId: sub.tributes_to_subject_id,
                isQualitative: isQual,
                rawAvgS1: s1.avg,
                rawAvgS2: s2.avg,
                rawFinalAvg: finalAvg,
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
                    const gradeVal = parseFloat(grade.grade_value) || 0;
                    const colWeight = parseFloat(col.weighting) || 0;
                    sum += gradeVal * colWeight;
                    totalWeight += colWeight;
                    simpleSum += gradeVal;
                    simpleCount++;
                }
            });

            const formatGrade = (val: any) => {
                if (val === null || val === undefined || val === '') return '-';
                const numVal = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
                if (isNaN(numVal)) return '-';
                if (isQual) {
                    if (numVal >= 6.0) return 'MB';
                    if (numVal >= 5.0) return 'B';
                    if (numVal >= 4.0) return 'S';
                    return 'I';
                }
                return (Math.round((numVal + 1e-9) * 10) / 10).toFixed(1).replace('.', ',');
            };

            let averageVal: number | null = null;
            let average = '-';
            if (isQual) {
                const avgCol = columns.find(col => col.position === 11);
                const avgGrade = avgCol ? grades.find(g => g.grade_column_id === avgCol.id) : null;
                averageVal = avgGrade ? parseFloat(avgGrade.grade_value) : null;
                average = avgGrade ? formatGrade(averageVal) : '-';
            } else {
                if (totalWeight > 0) {
                    averageVal = sum / totalWeight;
                    average = formatGrade(averageVal);
                } else if (simpleCount > 0) {
                    averageVal = simpleSum / simpleCount;
                    average = formatGrade(averageVal);
                }
            }

            reportData.push({
                subjectId: sub.id,
                subjectName: sub.name,
                influencesGpa,
                tributesToSubjectId: sub.tributes_to_subject_id,
                isQualitative: isQual,
                rawAverageVal: averageVal,
                grades: columns.filter(col => col.position <= 10).map(col => {
                    const g = grades.find(grade => grade.grade_column_id === col.id);
                    return g ? formatGrade(g.grade_value) : null;
                }),
                gradeDetails: columns.filter(col => col.position <= 10).map(col => {
                    const g = grades.find(grade => grade.grade_column_id === col.id);
                    return {
                        position: col.position,
                        weighting: col.weighting,
                        title: col.title,
                        value: g ? formatGrade(g.grade_value) : '-'
                    };
                }),
                average,
                isAnnual: false
            });
        }
    }

    // Post-process tributing subjects (Calculate parent subject averages from child subjects)
    for (const item of reportData) {
        const childSubjects = reportData.filter(c => String(c.tributesToSubjectId) === String(item.subjectId));
        if (childSubjects.length > 0) {
            if (isAnnual) {
                const s1Vals = childSubjects.map(c => c.rawAvgS1).filter(v => v !== null && !isNaN(v)) as number[];
                const s2Vals = childSubjects.map(c => c.rawAvgS2).filter(v => v !== null && !isNaN(v)) as number[];
                
                let s1Avg: number | null = s1Vals.length > 0 ? s1Vals.reduce((a, b) => a + b, 0) / s1Vals.length : null;
                let s2Avg: number | null = s2Vals.length > 0 ? s2Vals.reduce((a, b) => a + b, 0) / s2Vals.length : null;
                
                let finalAvg: number | null = null;
                if (s1Avg !== null && s2Avg !== null) {
                    const r1 = Math.round((s1Avg + 1e-9) * 10) / 10;
                    const r2 = Math.round((s2Avg + 1e-9) * 10) / 10;
                    finalAvg = (r1 + r2) / 2;
                } else if (s1Avg !== null) {
                    finalAvg = Math.round((s1Avg + 1e-9) * 10) / 10;
                } else if (s2Avg !== null) {
                    finalAvg = Math.round((s2Avg + 1e-9) * 10) / 10;
                }

                const format = (v: number | null) => {
                    if (v === null || isNaN(v)) return '-';
                    if (item.isQualitative) {
                        if (v >= 6.0) return 'MB';
                        if (v >= 5.0) return 'B';
                        if (v >= 4.0) return 'S';
                        return 'I';
                    }
                    return (Math.round((Number(v) + 1e-9) * 10) / 10).toFixed(1).replace('.', ',');
                };

                item.avgS1 = format(s1Avg);
                item.avgS2 = format(s2Avg);
                item.average = format(finalAvg);
                item.rawAvgS1 = s1Avg;
                item.rawAvgS2 = s2Avg;
                item.rawFinalAvg = finalAvg;
            } else {
                const childVals = childSubjects.map(c => c.rawAverageVal).filter(v => v !== null && !isNaN(v)) as number[];
                if (childVals.length > 0) {
                    const avgVal = childVals.reduce((a, b) => a + b, 0) / childVals.length;
                    const formatGrade = (val: number | null) => {
                        if (val === null || isNaN(val)) return '-';
                        if (item.isQualitative) {
                            if (val >= 6.0) return 'MB';
                            if (val >= 5.0) return 'B';
                            if (val >= 4.0) return 'S';
                            return 'I';
                        }
                        return (Math.round((val + 1e-9) * 10) / 10).toFixed(1).replace('.', ',');
                    };
                    item.rawAverageVal = avgVal;
                    item.average = formatGrade(avgVal);
                }
            }
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
            ORDER BY COALESCE(e.list_number, 999999) ASC, s.full_name ASC
        `, [levelId, yearStr]);

        const reportsPromises = students.map(s => generateStudentReport(db, s.student_id, yearStr, periodStr));
        const reportsResults = await Promise.all(reportsPromises);
        const reports = reportsResults.filter(Boolean);

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

export const getHomeroomData = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const year = req.query.year || new Date().getFullYear();
    try {
        const level = await db.get(`SELECT id, name, report_template_id FROM levels WHERE homeroom_teacher_id = ?`, [userId]);
        if (!level) return res.json({ isHomeroomTeacher: false });

        const students = await db.all(`
            SELECT s.id, s.run, s.full_name, s.status, e.list_number 
            FROM enrollments e 
            JOIN students s ON e.student_id = s.id 
            WHERE e.level_id = ? AND e.academic_year = ?
            ORDER BY COALESCE(e.list_number, 999999) ASC, s.full_name ASC
        `, [level.id, year]);

        res.json({ isHomeroomTeacher: true, level, students });
    } catch (error: any) {
        console.error("Error in getHomeroomData", error);
        res.status(500).json({ error: error.message });
    }
};

export const getPersonalityReport = async (req: Request, res: Response) => {
    const { studentId, semester } = req.params;
    const year = req.query.year || new Date().getFullYear();
    try {
        const enrollment = await db.get(`SELECT level_id FROM enrollments WHERE student_id = ? AND academic_year = ?`, [studentId, year]);
        const level = enrollment ? await db.get(`SELECT report_template_id FROM levels WHERE id = ?`, [enrollment.level_id]) : null;
        
        let template = null;
        if (level && level.report_template_id) {
            template = await db.get(`SELECT id, name, structure_json FROM report_templates WHERE id = ?`, [level.report_template_id]);
        }

        const report = await db.get(`SELECT * FROM personality_reports WHERE student_id = ? AND semester = ? AND academic_year = ?`, [studentId, semester, year]);
        res.json({ report: report || null, template: template || null });
    } catch (error: any) {
        console.error("Error in getPersonalityReport", error);
        res.status(500).json({ error: error.message });
    }
};

export const savePersonalityReport = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { studentId, semester, year, evaluation_data, observations, template_id } = req.body;
    try {
        const existing = await db.get(`SELECT id FROM personality_reports WHERE student_id = ? AND semester = ? AND academic_year = ?`, [studentId, semester, year]);
        if (existing) {
            await db.run(`UPDATE personality_reports SET evaluation_data = ?, observations = ?, template_id = ? WHERE id = ?`, [JSON.stringify(evaluation_data), observations, template_id || null, existing.id]);
        } else {
            const crypto = require('crypto');
            const newId = crypto.randomUUID();
            const enrollment = await db.get(`SELECT level_id FROM enrollments WHERE student_id = ? AND academic_year = ?`, [studentId, year]);
            const levelId = enrollment ? enrollment.level_id : null;
            await db.run(`INSERT INTO personality_reports (id, student_id, teacher_id, level_id, academic_year, semester, report_type, evaluation_data, observations, template_id) VALUES (?, ?, ?, ?, ?, ?, 'Dynamic', ?, ?, ?)`, [newId, studentId, userId, levelId, year, semester, JSON.stringify(evaluation_data), observations, template_id || null]);
        }
        res.json({ success: true });
    } catch (error: any) {
        console.error("Error in savePersonalityReport", error);
        res.status(500).json({ error: error.message });
    }
};

export const getPersonalityReportsByLevel = async (req: Request, res: Response) => {
    const { levelId, semester } = req.params;
    const year = req.query.year || new Date().getFullYear();
    try {
        const level = await db.get(`SELECT report_template_id FROM levels WHERE id = ?`, [levelId]);
        let template = null;
        if (level && level.report_template_id) {
            template = await db.get(`SELECT id, name, structure_json FROM report_templates WHERE id = ?`, [level.report_template_id]);
        }

        const reports = await db.all(`
            SELECT student_id, evaluation_data, observations 
            FROM personality_reports 
            WHERE level_id = ? AND semester = ? AND academic_year = ?
        `, [levelId, semester, year]);

        res.json({ reports: reports || [], template: template || null });
    } catch (error: any) {
        console.error("Error in getPersonalityReportsByLevel", error);
        res.status(500).json({ error: error.message });
    }
};

export const exportPendingGradesReport = async (req: Request, res: Response) => {
    const { year, period, levelId, subjectId } = req.query;
    const yearNum = year ? parseInt(String(year), 10) : 2026;
    const periodStr = String(period || '1er Semestre');

    try {
        const excludedLevelNames = ['Pre-Kinder', 'Kínder', 'Taller Laboral'];
        
        let levelsQuery = "SELECT id, name FROM levels WHERE name NOT IN ('Pre-Kinder', 'Kínder', 'Taller Laboral')";
        const levelParams: any[] = [];
        if (levelId && levelId !== 'all') {
            levelsQuery += " AND id = ?";
            levelParams.push(parseInt(String(levelId), 10));
        }
        levelsQuery += " ORDER BY id ASC";
        const levels = await db.all(levelsQuery, levelParams);

        const pendingStudentsRows: any[] = [];
        const summaryRows: any[] = [];

        for (const lvl of levels) {
            if (excludedLevelNames.includes(lvl.name)) continue;

            const students = await db.all(`
                SELECT s.id, s.full_name, s.run, e.list_number
                FROM students s
                JOIN enrollments e ON s.id = e.student_id
                WHERE e.level_id = ? AND e.academic_year = ? AND s.status = 'Active'
                ORDER BY COALESCE(e.list_number, 999999) ASC, s.full_name ASC
            `, [lvl.id, yearNum]);

            if (students.length === 0) continue;

            let subjectsQuery = `
                SELECT sub.id, sub.name, string_agg(DISTINCT u.name, ', ') as teacher_name
                FROM teacher_assignments ta
                JOIN subjects sub ON ta.subject_id = sub.id
                LEFT JOIN users u ON ta.teacher_id = u.id
                WHERE ta.level_id = ? AND ta.academic_year = ?
            `;
            const subParams: any[] = [lvl.id, yearNum];
            if (subjectId && subjectId !== 'all' && subjectId !== '') {
                subjectsQuery += " AND sub.id = ?";
                subParams.push(parseInt(String(subjectId), 10));
            }
            subjectsQuery += " GROUP BY sub.id, sub.name";

            const subjects = await db.all(subjectsQuery, subParams);

            for (const sub of subjects) {
                // Get defined grade columns
                const dbCols = await db.all(`
                    SELECT id, position, title, weighting
                    FROM grade_columns
                    WHERE level_id = ? AND subject_id = ? AND period = ? AND academic_year = ?
                    ORDER BY position ASC
                `, [lvl.id, sub.id, periodStr, yearNum]);

                const dbColIds = dbCols.map(c => c.id);
                let allGrades: any[] = [];
                if (dbColIds.length > 0) {
                    allGrades = await db.all(`
                        SELECT student_id, grade_column_id, grade_value
                        FROM grades
                        WHERE grade_column_id IN (${dbColIds.map(() => '?').join(',')})
                    `, [...dbColIds]);
                }

                // Determine active columns:
                // A column is active if it has a non-default title, non-zero weighting, OR at least one recorded grade
                const activeCols = dbCols.filter((col: any) => {
                    const hasTitle = col.title && col.title.trim() !== '' && !col.title.startsWith('N');
                    const hasWeighting = col.weighting && col.weighting > 0;
                    const hasAnyGrade = allGrades.some((g: any) => String(g.grade_column_id) === String(col.id) && g.grade_value !== null && g.grade_value !== undefined && String(g.grade_value).trim() !== '');
                    return hasTitle || hasWeighting || hasAnyGrade;
                });

                // If no active cols configured via title/weighting/grades, check max position with existing grades
                let evalCols = activeCols;
                if (evalCols.length === 0 && allGrades.length > 0) {
                    const gradedColIds = new Set(allGrades.filter(g => g.grade_value !== null && String(g.grade_value).trim() !== '').map(g => String(g.grade_column_id)));
                    evalCols = dbCols.filter(col => gradedColIds.has(String(col.id)));
                }

                // If no evaluations are active or created for this subject/period, skip
                if (evalCols.length === 0) continue;

                let pendingInSubCount = 0;
                let completeInSubCount = 0;

                for (const stu of students) {
                    const stuGrades = allGrades.filter((g: any) => String(g.student_id) === String(stu.id));
                    const missingCols: string[] = [];
                    let hasGrades = 0;

                    for (const col of evalCols) {
                        const gradeObj = stuGrades.find((g: any) => String(g.grade_column_id) === String(col.id));
                        if (gradeObj && gradeObj.grade_value !== null && gradeObj.grade_value !== undefined && String(gradeObj.grade_value).trim() !== '') {
                            hasGrades++;
                        } else {
                            missingCols.push(col.title || `Nota ${col.position}`);
                        }
                    }

                    if (missingCols.length > 0) {
                        pendingInSubCount++;
                        pendingStudentsRows.push({
                            'Curso': lvl.name,
                            'N° Lista': stu.list_number || '-',
                            'RUT': stu.run,
                            'Nombre Estudiante': stu.full_name,
                            'Asignatura': sub.name,
                            'Docente': sub.teacher_name || 'No asignado',
                            'Evaluaciones Creadas': evalCols.length,
                            'Evaluaciones Rendidas': hasGrades,
                            'Notas Pendientes': missingCols.length,
                            'Detalle Casilleros Pendientes': missingCols.join(', ')
                        });
                    } else {
                        completeInSubCount++;
                    }
                }

                summaryRows.push({
                    'Curso': lvl.name,
                    'Asignatura': sub.name,
                    'Docente': sub.teacher_name || 'No asignado',
                    'Matrícula Activa': students.length,
                    'Alumnos Al Día (100% notas)': completeInSubCount,
                    'Alumnos con Pendientes': pendingInSubCount,
                    '% Cumplimiento': Math.round((completeInSubCount / students.length) * 100) + '%'
                });
            }
        }

        const workbook = xlsx.utils.book_new();

        const sheet1 = xlsx.utils.json_to_sheet(pendingStudentsRows.length > 0 ? pendingStudentsRows : [{ 'Estado': 'No existen notas pendientes en la selección' }]);
        xlsx.utils.book_append_sheet(workbook, sheet1, "Notas Pendientes Alumnos");

        const sheet2 = xlsx.utils.json_to_sheet(summaryRows.length > 0 ? summaryRows : [{ 'Estado': 'Sin datos de resumen' }]);
        xlsx.utils.book_append_sheet(workbook, sheet2, "Resumen por Asignatura");

        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Reporte_Notas_Pendientes_${yearNum}_${periodStr.replace(/\s+/g, '_')}.xlsx`);
        res.send(buffer);
    } catch (error: any) {
        console.error("Error generating pending grades report:", error);
        res.status(500).json({ error: 'Error al generar reporte de notas pendientes', details: error.message });
    }
};
