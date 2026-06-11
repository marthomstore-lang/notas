import { Request, Response } from 'express';
import db from '../config/db';
import crypto from 'crypto';

export const getAssignments = async (req: Request, res: Response) => {
    let client;
    try {
        const userId = (req as any).user.id;
        client = await db.connect();
        
        const result = await client.query(`
            SELECT ta.id as assignment_id, ta.level_id, ta.subject_id, l.name as level_name, s.name as subject_name, ta.academic_year
            FROM teacher_assignments ta
            JOIN levels l ON ta.level_id = l.id
            JOIN subjects s ON ta.subject_id = s.id
            WHERE ta.teacher_id = $1
            UNION
            SELECT 
                'homeroom_' || l.id as assignment_id,
                l.id as level_id,
                NULL as subject_id,
                l.name as level_name,
                'Jefatura de Curso' as subject_name,
                EXTRACT(YEAR FROM CURRENT_DATE) as academic_year
            FROM levels l
            WHERE l.homeroom_teacher_id = $1
        `, [userId]);

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener asignaciones' });
    } finally {
        if (client) client.release();
    }
};

export const getGrades = async (req: Request, res: Response) => {
    let client;
    try {
        const assignmentId = req.params.assignmentId as string;
        client = await db.connect();
        
        let level_id, subject_id, academic_year;

        if (assignmentId.startsWith('homeroom_')) {
            level_id = parseInt(assignmentId.replace('homeroom_', ''));
            subject_id = null;
            academic_year = new Date().getFullYear();
        } else {
            const assignmentRes = await client.query('SELECT * FROM teacher_assignments WHERE id = $1', [assignmentId]);
            if (assignmentRes.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
            const assignment = assignmentRes.rows[0];
            level_id = assignment.level_id;
            subject_id = assignment.subject_id;
            academic_year = assignment.academic_year;
        }

        // 2. Obtener estudiantes matriculados en ese nivel
        const studentsRes = await client.query(`
            SELECT s.id, s.run, s.full_name, e.list_number, s.status
            FROM enrollments e
            JOIN students s ON e.student_id = s.id
            WHERE e.level_id = $1 AND e.academic_year = $2
            ORDER BY COALESCE(e.list_number, 999999) ASC, s.full_name ASC
        `, [level_id, academic_year]);

        // 3. Obtener columnas de evaluación
        let columnsRows = [];
        let gradesRows = [];
        if (subject_id) {
            const columnsRes = await client.query(`
                SELECT id, title FROM grade_columns
                WHERE level_id = $1 AND subject_id = $2 AND academic_year = $3
            `, [level_id, subject_id, academic_year]);
            columnsRows = columnsRes.rows;

            // 4. Obtener notas
            const gradesRes = await client.query(`
                SELECT g.student_id, g.grade_column_id, g.grade_value
                FROM grades g
                JOIN grade_columns gc ON g.grade_column_id = gc.id
                WHERE gc.level_id = $1 AND gc.subject_id = $2 AND gc.academic_year = $3
            `, [level_id, subject_id, academic_year]);
            gradesRows = gradesRes.rows;
        }

        res.json({
            students: studentsRes.rows,
            columns: columnsRows,
            grades: gradesRows
        });
    } catch (error) {
        console.error("Error en getGrades", error);
        res.status(500).json({ error: 'Error al obtener notas' });
    } finally {
        if (client) client.release();
    }
};

export const addColumn = async (req: Request, res: Response) => {
    let client;
    try {
        const { assignmentId } = req.params;
        const { title } = req.body;
        client = await db.connect();
        
        const assignmentRes = await client.query('SELECT * FROM teacher_assignments WHERE id = ?', [assignmentId]);
        const assignment = assignmentRes.rows[0];

        const id = crypto.randomUUID();
        await client.query(`
            INSERT INTO grade_columns (id, level_id, subject_id, academic_year, title)
            VALUES (?, ?, ?, ?, ?)
        `, [id, assignment.level_id, assignment.subject_id, assignment.academic_year, title]);

        res.json({ id, title });
    } catch (error) {
        res.status(500).json({ error: 'Error al crear columna' });
    } finally {
        if (client) client.release();
    }
};

export const saveGrade = async (req: Request, res: Response) => {
    let client;
    try {
        const { studentId, columnId, gradeValue } = req.body;
        client = await db.connect();
        const id = crypto.randomUUID();

        if (gradeValue === null || gradeValue === undefined || gradeValue === '') {
            await client.query(`
                DELETE FROM grades 
                WHERE student_id = ? AND grade_column_id = ?
            `, [studentId, columnId]);
        } else {
            // Simple UPSERT
            await client.query(`
                INSERT INTO grades (id, student_id, grade_column_id, grade_value)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(student_id, grade_column_id) 
                DO UPDATE SET grade_value = excluded.grade_value, updated_at = CURRENT_TIMESTAMP
            `, [id, studentId, columnId, gradeValue]);
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al guardar nota' });
    } finally {
        if (client) client.release();
    }
};
