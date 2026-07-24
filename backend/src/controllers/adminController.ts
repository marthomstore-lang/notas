import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db from '../config/db';
import * as xlsx from 'xlsx';

export const getStudents = async (req: Request, res: Response) => {
    let client;
    try {
        client = await db.connect();
        const result = await client.query(`
            SELECT s.*, l.name as level_name, e.list_number, e.level_id 
            FROM students s 
            LEFT JOIN enrollments e ON s.id = e.student_id 
            LEFT JOIN levels l ON e.level_id = l.id
            ORDER BY l.name ASC, COALESCE(e.list_number, 999999) ASC, s.full_name ASC
        `);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener estudiantes' });
    } finally {
        if (client) client.release();
    }
};

export const getStudentById = async (req: Request, res: Response) => {
    let client;
    try {
        const { id } = req.params;
        client = await db.connect();
        
        const studentRes = await client.query("SELECT s.*, l.name as level_name FROM students s LEFT JOIN enrollments e ON s.id = e.student_id LEFT JOIN levels l ON e.level_id = l.id WHERE s.id = ?", [id]);
        const guardiansRes = await client.query("SELECT * FROM guardians WHERE student_id = ?", [id]);
        const healthRes = await client.query("SELECT * FROM health_records WHERE student_id = ?", [id]);
        
        if (studentRes.rows.length === 0) return res.status(404).json({ error: "Estudiante no encontrado" });
        
        res.json({
            student: studentRes.rows[0],
            guardians: guardiansRes.rows,
            health: healthRes.rows[0] || {}
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener expediente del estudiante' });
    } finally {
        if (client) client.release();
    }
};

export const deleteStudent = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { withdrawalDate } = req.body;
        const user = (req as any).user;
        
        const student = await db.get("SELECT full_name, status FROM students WHERE id = ?", [id]);
        if (!student) return res.status(404).json({ error: 'Estudiante no encontrado' });

        if (student.status !== 'RETIRADO') {
            // Cambiamos a Soft Delete con Fecha de Retiro por solicitud del usuario
            await db.run("UPDATE students SET status = 'RETIRADO', withdrawal_date = ? WHERE id = ?", [withdrawalDate || new Date().toISOString().split('T')[0], id]);

            // Decrementar el contador del curso en la tabla levels
            const enrollment = await db.get("SELECT level_id FROM enrollments WHERE student_id = ? AND academic_year = 2026", [id]);
            if (enrollment) {
                await db.run("UPDATE levels SET current_enrolled = current_enrolled - 1 WHERE id = ?", [enrollment.level_id]);
            }
        }

        // Audit Log
        try {
            await db.run(`
                INSERT INTO audit_logs (id, user_id, user_name, action, details)
                VALUES (?, ?, ?, ?, ?)
            `, [crypto.randomUUID(), user?.id, user?.name || user?.run || 'Sistema', 'WITHDRAW_STUDENT', `Retiro de estudiante: ${student.full_name} - Fecha: ${withdrawalDate}`]);
        } catch (logErr) { console.error("Audit log error:", logErr); }

        res.json({ message: 'Estudiante retirado correctamente' });
    } catch (error: any) {
        console.error("Error withdrawing student:", error);
        res.status(500).json({ error: 'Error al retirar estudiante', details: error.message });
    }
};

export const reincorporateStudent = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        console.log(`[reincorporateStudent] Intentando reincorporar ID: ${id}`);
        const user = (req as any).user;
        
        const student = await db.get("SELECT full_name, status FROM students WHERE id = ?", [id]);
        if (!student) {
            console.warn(`[reincorporateStudent] Estudiante no encontrado: ${id}`);
            return res.status(404).json({ error: 'Estudiante no encontrado' });
        }

        if (student.status === 'RETIRADO') {
            await db.run("UPDATE students SET status = 'Active', withdrawal_date = NULL WHERE id = ?", [id]);

            // Incrementar el contador del curso en la tabla levels
            const enrollment = await db.get("SELECT level_id FROM enrollments WHERE student_id = ? AND academic_year = 2026", [id]);
            if (enrollment) {
                await db.run("UPDATE levels SET current_enrolled = current_enrolled + 1 WHERE id = ?", [enrollment.level_id]);
            }
        }

        // Audit Log
        try {
            await db.run(`
                INSERT INTO audit_logs (id, user_id, user_name, action, details)
                VALUES (?, ?, ?, ?, ?)
            `, [crypto.randomUUID(), user?.id, user?.name || user?.run || 'Sistema', 'REINCORPORATE_STUDENT', `Reincorporación de estudiante: ${student.full_name}`]);
        } catch (logErr) { console.error("Audit log error:", logErr); }

        res.json({ message: 'Estudiante reincorporado correctamente' });
    } catch (error: any) {
        console.error("Error reincorporating student:", error);
        res.status(500).json({ error: 'Error al reincorporar estudiante', details: error.message });
    }
};

export const updateStudent = async (req: Request, res: Response) => {
    let client;
    try {
        const { id } = req.params;
        const { student, guardians, health } = req.body;
        client = await db.connect();

        // Función para calcular y formatear RUT con DV si falta
        const ensureDV = (rutStr: string) => {
            if (!rutStr) return rutStr;
            const clean = rutStr.replace(/[^0-9kK]/g, '');
            if (clean.includes('-') || clean.length <= 1) return rutStr;
            
            // Si no tiene guion y tiene longitud de RUT, calculamos DV
            const body = clean.slice(0, -1);
            const dv = clean.slice(-1);
            return `${body}-${dv}`; // Por ahora simplemente asumimos que el último es el DV si viene pegado
        };
        
        if (student.run) student.run = ensureDV(student.run);
        
        const fullName = `${student.paternal_surname || ''} ${student.maternal_surname || ''} ${student.first_name || ''}`.replace(/\s+/g, ' ').trim() || student.full_name;

        // 1. Update Students table
        await client.query(`
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
                    await client.query(`
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
                } else if (g.run) {
                    await client.query(`
                        INSERT INTO guardians (
                            id, student_id, guardian_type, run, full_name, relationship, phone, email, address,
                            first_name, paternal_surname, maternal_surname, birth_date,
                            gender, marital_status, region, commune, postal_code,
                            education_level, occupation, health_system, 
                            is_health_load, is_financial_guardian, is_main_guardian
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        crypto.randomUUID(), id, g.guardian_type, g.run, gFullName, g.relationship, g.phone, g.email, g.address,
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
            const healthExists = await client.query("SELECT id FROM health_records WHERE student_id = ?", [id]);
            if (healthExists.rows.length > 0) {
                await client.query(`
                    UPDATE health_records SET 
                        blood_type = ?, allergies = ?, chronic_diseases = ?, general_observations = ?
                    WHERE student_id = ?
                `, [health.blood_type, health.allergies, health.chronic_diseases, health.general_observations, id]);
            } else {
                await client.query(`
                    INSERT INTO health_records (id, student_id, blood_type, allergies, chronic_diseases, general_observations)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [crypto.randomUUID(), id, health.blood_type, health.allergies, health.chronic_diseases, health.general_observations]);
            }
        }

        res.json({ message: 'Expediente actualizado exitosamente' });
    } catch (error: any) {
        console.error("Error updating student:", error);
        res.status(500).json({ error: 'Error al actualizar expediente del estudiante', details: error.message });
    } finally {
        if (client) client.release();
    }
};

export const getStudentObservations = async (req: Request, res: Response) => {
    let client;
    try {
        const { id } = req.params;
        client = await db.connect();
        const result = await client.query(`
            SELECT o.*, u.name as teacher_name 
            FROM observations o
            JOIN users u ON o.teacher_id = u.id
            WHERE o.student_id = ?
            ORDER BY o.created_at DESC
        `, [id]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener observaciones' });
    } finally {
        if (client) client.release();
    }
};

export const addObservation = async (req: Request, res: Response) => {
    let client;
    try {
        const { id } = req.params;
        const { content, type } = req.body; // type: 'Positive' | 'Negative'
        const teacherId = (req as any).user.id;
        client = await db.connect();
        const obsId = crypto.randomUUID();
        await client.query(`
            INSERT INTO observations (id, student_id, teacher_id, content, type)
            VALUES (?, ?, ?, ?, ?)
        `, [obsId, id, teacherId, content, type]);
        res.status(201).json({ message: 'Observación agregada' });
    } catch (error) {
        res.status(500).json({ error: 'Error al agregar observación' });
    } finally {
        if (client) client.release();
    }
};

export const getTeachers = async (req: Request, res: Response) => {
    let client;
    try {
        client = await db.connect();
        const result = await client.query("SELECT id, run, name, email, password_plain, role FROM users WHERE role IN ('Docente', 'Admin', 'Visita') ORDER BY role, name");
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener usuarios' });
    } finally {
        if (client) client.release();
    }
};
export const createTeacher = async (req: Request, res: Response) => {
    let client;
    try {
        const { run, name, email, password, role } = req.body;
        client = await db.connect();
        
        // Formatear RUT con guion si viene solo números
        let finalRun = run;
        if (run && !run.includes('-')) {
            const clean = run.replace(/[^0-9kK]/g, '');
            if (clean.length > 1) {
                const body = clean.slice(0, -1);
                const dv = clean.slice(-1);
                finalRun = `${body}-${dv}`;
            }
        }

        const id = crypto.randomUUID();
        const plainPass = password || '123';
        const hashedPass = await bcrypt.hash(plainPass, 10);

        await client.query(`
            INSERT INTO users (id, run, name, email, password_hash, password_plain, role) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [id, finalRun, name, email, hashedPass, plainPass, role || 'Docente']);

        res.status(201).json({ message: `Docente creado correctamente${!password ? ' con contraseña por defecto 123' : ''}` });
    } catch (error) {
        res.status(500).json({ error: 'Error al crear docente' });
    } finally {
        if (client) client.release();
    }
};

export const updateTeacher = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, email, password, role } = req.body;
        console.log(`[updateTeacher] Recibido PUT para ID: ${id}. Body:`, { name, email, password, role });
        
        if (password && password.trim() !== "") {
            console.log(`[updateTeacher] Actualizando CON contraseña: ${password}`);
            const hashedPass = await bcrypt.hash(password, 10);
            const result = await db.run(`
                UPDATE users 
                SET name = ?, email = ?, password_hash = ?, password_plain = ?, role = ? 
                WHERE id = ?
            `, [name, email, hashedPass, password, role, id]);
            
            if (result.changes === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
        } else {
            const result = await db.run(`
                UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?
            `, [name, email, role, id]);
            
            if (result.changes === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({ message: 'Docente actualizado correctamente' });
    } catch (error: any) {
        console.error("Error updating teacher:", error);
        res.status(500).json({ error: 'Error al actualizar docente', details: error.message });
    }
};

export const deleteTeacher = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = (req as any).user;
        
        // Fetch teacher name for audit log
        const teacher = await db.get("SELECT name FROM users WHERE id = ?", [id]);
        if (!teacher) return res.status(404).json({ error: 'Docente no encontrado' });

        // NOTE: Postgres handles transactions differently. 
        // For simplicity, we execute sequential queries as the wrapper doesn't support complex transactions across both.
        // On Supabase, this is usually fast enough.

        // 1. Delete assignments
        await db.run("DELETE FROM teacher_assignments WHERE teacher_id = ?", [id]);
        
        // 2. Clear homeroom teacher in levels
        await db.run("UPDATE levels SET homeroom_teacher_id = NULL WHERE homeroom_teacher_id = ?", [id]);

        // 3. Clear teacher in observations
        await db.run("UPDATE observations SET teacher_id = NULL WHERE teacher_id = ?", [id]);

        // 4. Clear user_id in audit_logs
        await db.run("UPDATE audit_logs SET user_id = NULL WHERE user_id = ?", [id]);

        // 5. Delete regulatory acceptances
        await db.run("DELETE FROM regulatory_acceptances WHERE user_id = ?", [id]);

        // 6. Delete the user
        const result = await db.run("DELETE FROM users WHERE id = ?", [id]);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Docente no encontrado' });
        }

        // 7. Audit Log
        await db.run(`
            INSERT INTO audit_logs (id, user_id, user_name, action, details)
            VALUES (?, ?, ?, ?, ?)
        `, [crypto.randomUUID(), user?.id, user?.name || user?.run || 'Sistema', 'DELETE_USER', `Eliminación de usuario/docente: ${teacher.name}`]);

        res.json({ message: 'Docente eliminado correctamente' });
    } catch (error: any) {
        res.status(500).json({ error: 'Error interno', details: error.message });
    }
};

export const getSubjects = async (req: Request, res: Response) => {
    let client;
    try {
        client = await db.connect();
        const result = await client.query("SELECT * FROM subjects");
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener asignaturas' });
    } finally {
        if (client) client.release();
    }
};

export const createSubject = async (req: Request, res: Response) => {
    let client;
    try {
        const { name } = req.body;
        client = await db.connect();
        
        await client.query("INSERT INTO subjects (name) VALUES (?)", [name]);
        res.status(201).json({ message: 'Asignatura creada' });
    } catch (error) {
        res.status(500).json({ error: 'Error al crear asignatura' });
    } finally {
        if (client) client.release();
    }
};

export const updateSubject = async (req: Request, res: Response) => {
    let client;
    try {
        const { id } = req.params;
        const { name } = req.body;
        client = await db.connect();
        
        await client.query("UPDATE subjects SET name = ? WHERE id = ?", [name, id]);
        res.json({ message: 'Asignatura actualizada correctamente' });
    } catch (error: any) {
        res.status(500).json({ error: 'Error al actualizar asignatura', details: error.message });
    } finally {
        if (client) client.release();
    }
};

export const checkSubjectGrades = async (req: Request, res: Response) => {
    let client;
    try {
        const { id } = req.params;
        client = await db.connect();
        
        const result = await client.query(`
            SELECT DISTINCT l.name as level_name
            FROM grades g
            JOIN grade_columns gc ON g.grade_column_id = gc.id
            JOIN levels l ON gc.level_id = l.id
            WHERE gc.subject_id = ?
        `, [id]);
        
        const levels = result.rows.map((r: any) => r.level_name);
        
        res.json({
            hasGrades: levels.length > 0,
            levels
        });
    } catch (error: any) {
        res.status(500).json({ error: 'Error al verificar notas de la asignatura', details: error.message });
    } finally {
        if (client) client.release();
    }
};

export const deleteSubject = async (req: Request, res: Response) => {
    let client;
    try {
        const { id } = req.params;
        client = await db.connect();
        
        // 1. Delete grades
        await client.query(`
            DELETE FROM grades 
            WHERE grade_column_id IN (
                SELECT id FROM grade_columns WHERE subject_id = ?
            )
        `, [id]);
        
        // 2. Delete grade columns
        await client.query("DELETE FROM grade_columns WHERE subject_id = ?", [id]);
        
        // 3. Delete assignments
        await client.query("DELETE FROM teacher_assignments WHERE subject_id = ?", [id]);
        
        // 4. Delete the subject itself
        await client.query("DELETE FROM subjects WHERE id = ?", [id]);
        
        res.json({ message: 'Asignatura eliminada correctamente' });
    } catch (error: any) {
        res.status(500).json({ error: 'Error al eliminar asignatura', details: error.message });
    } finally {
        if (client) client.release();
    }
};

export const getLevels = async (req: Request, res: Response) => {
    let client;
    try {
        client = await db.connect();
        const result = await client.query(`
            SELECT 
                l.id, 
                l.name, 
                l.total_capacity,
                l.report_template_id,
                (SELECT COUNT(*) FROM enrollments e JOIN students s ON e.student_id = s.id WHERE e.level_id = l.id AND e.academic_year = 2026 AND s.status = 'Active') as current_enrolled,
                u.name as homeroom_teacher_name 
            FROM levels l
            LEFT JOIN users u ON l.homeroom_teacher_id = u.id
            ORDER BY l.id
        `);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener niveles' });
    } finally {
        if (client) client.release();
    }
};

export const updateLevelCapacity = async (req: Request, res: Response) => {
    let client;
    try {
        const { id } = req.params;
        const { capacity } = req.body;
        client = await db.connect();
        await client.query("UPDATE levels SET total_capacity = ? WHERE id = ?", [capacity, id]);
        res.json({ message: 'Capacidad del curso actualizada' });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar capacidad' });
    } finally {
        if (client) client.release();
    }
};

export const setHomeroomTeacher = async (req: Request, res: Response) => {
    let client;
    try {
        const { levelId, teacherId } = req.body;
        client = await db.connect();
        await client.query("UPDATE levels SET homeroom_teacher_id = ? WHERE id = ?", [teacherId, levelId]);
        res.json({ message: 'Profesor Jefe asignado correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al asignar Profesor Jefe' });
    } finally {
        if (client) client.release();
    }
};

export const getAssignmentsAdmin = async (req: Request, res: Response) => {
    let client;
    try {
        client = await db.connect();
        const result = await client.query(`
            SELECT ta.id, ta.teacher_id, ta.level_id, ta.subject_id, u.name as teacher_name, l.name as level_name, s.name as subject_name, ta.academic_year
            FROM teacher_assignments ta
            JOIN users u ON ta.teacher_id = u.id
            JOIN levels l ON ta.level_id = l.id
            JOIN subjects s ON ta.subject_id = s.id
            ORDER BY l.name, s.name
        `);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener asignaciones' });
    } finally {
        if (client) client.release();
    }
};

export const deleteAssignment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = (req as any).user;
        
        // Fetch details for audit log
        const info = await db.get(`
            SELECT u.name as teacher_name, l.name as level_name, s.name as subject_name
            FROM teacher_assignments ta
            JOIN users u ON ta.teacher_id = u.id
            JOIN levels l ON ta.level_id = l.id
            JOIN subjects s ON ta.subject_id = s.id
            WHERE ta.id = ?
        `, [id]);

        await db.run("DELETE FROM teacher_assignments WHERE id = ?", [id]);

        if (info) {
            try {
                await db.run(`
                    INSERT INTO audit_logs (id, user_id, user_name, action, details)
                    VALUES (?, ?, ?, ?, ?)
                `, [crypto.randomUUID(), user?.id, user?.name || user?.run || 'Sistema', 'DELETE_ASSIGNMENT', `Eliminación de carga: ${info.teacher_name} - ${info.level_name} - ${info.subject_name}`]);
            } catch (logErr) { console.error("Audit log error:", logErr); }
        }

        res.json({ message: 'Asignación eliminada' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar asignación' });
    }
};

export const createAssignment = async (req: Request, res: Response) => {
    let client;
    try {
        const { teacherId, levelId, subjectId, academicYear } = req.body;
        client = await db.connect();
        
        const id = crypto.randomUUID();
        await client.query(`
            INSERT INTO teacher_assignments (id, teacher_id, level_id, subject_id, academic_year) 
            VALUES (?, ?, ?, ?, ?)
        `, [id, teacherId, levelId, subjectId, academicYear || new Date().getFullYear()]);

        res.status(201).json({ message: 'Asignación creada correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al crear asignación (es posible que ya exista)' });
    } finally {
        if (client) client.release();
    }
};

export const updateAssignment = async (req: Request, res: Response) => {
    let client;
    try {
        const { id } = req.params;
        const { teacherId, levelId, subjectId } = req.body;
        const user = (req as any).user;
        
        client = await db.connect();
        
        // Fetch old details for audit log
        const oldInfo = await client.query(`
            SELECT u.name as teacher_name, l.name as level_name, s.name as subject_name
            FROM teacher_assignments ta
            JOIN users u ON ta.teacher_id = u.id
            JOIN levels l ON ta.level_id = l.id
            JOIN subjects s ON ta.subject_id = s.id
            WHERE ta.id = ?
        `, [id]);
        
        await client.query(`
            UPDATE teacher_assignments 
            SET teacher_id = ?, level_id = ?, subject_id = ?
            WHERE id = ?
        `, [teacherId, levelId, subjectId, id]);
        
        // Fetch new details for audit log
        const newInfo = await client.query(`
            SELECT u.name as teacher_name, l.name as level_name, s.name as subject_name
            FROM teacher_assignments ta
            JOIN users u ON ta.teacher_id = u.id
            JOIN levels l ON ta.level_id = l.id
            JOIN subjects s ON ta.subject_id = s.id
            WHERE ta.id = ?
        `, [id]);
        
        if (oldInfo.rows[0] && newInfo.rows[0]) {
            try {
                const oldText = `${oldInfo.rows[0].teacher_name} - ${oldInfo.rows[0].level_name} - ${oldInfo.rows[0].subject_name}`;
                const newText = `${newInfo.rows[0].teacher_name} - ${newInfo.rows[0].level_name} - ${newInfo.rows[0].subject_name}`;
                await db.run(`
                    INSERT INTO audit_logs (id, user_id, user_name, action, details)
                    VALUES (?, ?, ?, ?, ?)
                `, [crypto.randomUUID(), user?.id, user?.name || user?.run || 'Sistema', 'UPDATE_ASSIGNMENT', `Edición de carga: de [${oldText}] a [${newText}]`]);
            } catch (logErr) { console.error("Audit log error:", logErr); }
        }
        
        res.json({ message: 'Asignación actualizada correctamente' });
    } catch (error) {
        console.error("Error updating assignment:", error);
        res.status(500).json({ error: 'Error al actualizar asignación' });
    } finally {
        if (client) client.release();
    }
};


export const exportData = async (req: Request, res: Response) => {
    let client;
    try {
        client = await db.connect();
        // Fetch all students, their guardians, and health records
        const result = await client.query(`
            SELECT 
                s.run as "Rut", 
                s.full_name as "Nombre",
                l.name as "CURSO",
                s.gender as "Sexo",
                s.birth_date as "Fechas Nacimiento",
                s.nationality as "Nacionalidad",
                s.marital_status as "Estado Civil",
                s.address as "Dirección",
                s.region as "Región",
                s.commune as "Comuna",
                s.email as "Email",
                s.phone as "Teléfono Estudiante",
                hr.blood_type as "Grupo Sanguíneo",
                hr.allergies as "Alergias",
                hr.chronic_diseases as "Enfermedades",
                s.religion as "Religión",
                s.health_system as "Sistema Salud",
                s.observaciones as "Observaciones",
                s.entry_date as "Fecha de Ingreso",
                s.previous_school as "Colegio Procedencia",
                s.ethnicity as "Pueblo Indígena",
                s.lives_with as "Vive Con",
                s.family_members as "Grupo Familiar",
                s.total_siblings as "Total Hermanos",
                s.sibling_position as "Lugar Hermanos",
                s.school_siblings as "Hermanos Escolares",
                s.liceo_siblings as "Hermanos Colegio",
                s.enrollment_number as "N° Matrícula",
                s.status as "estado"
            FROM students s 
            LEFT JOIN enrollments e ON s.id = e.student_id 
            LEFT JOIN levels l ON e.level_id = l.id
            LEFT JOIN health_records hr ON s.id = hr.student_id
            WHERE s.status = 'Active'
            ORDER BY l.name ASC, COALESCE(e.list_number, 999999) ASC, s.full_name ASC
        `);

        if (!result.rows || result.rows.length === 0) {
            return res.status(404).json({ error: 'No hay datos para exportar' });
        }

        const titularesResult = await client.query(`
            SELECT s.run as "RUN Estudiante", g.run as "RUN/IPA", g.full_name as "Nombre Apoderado Titular", g.relationship as "Parentesco", g.phone as "Teléfono Titular", g.email as "Email", g.address as "Dirección"
            FROM guardians g JOIN students s ON g.student_id = s.id WHERE g.guardian_type = 'Titular'
        `);

        const suplentesResult = await client.query(`
            SELECT s.run as "RUN Estudiante", g.run as "RUN/IPA", g.full_name as "Nombre Apoderado Suplente", g.relationship as "Parentesco", g.phone as "Teléfono Suplente", g.email as "Email", g.address as "Dirección"
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
    } catch (error) {
        console.error('Error exportando:', error);
        res.status(500).json({ error: 'Error al exportar base de datos' });
    } finally {
        if (client) client.release();
    }
};

export const importDataWeb = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });

        const cleanRun = (runVal: any): string => {
            if (runVal === undefined || runVal === null) return '';
            const clean = String(runVal).replace(/[^0-9kK]/g, '');
            if (clean.length > 1) {
                const body = clean.slice(0, -1);
                const dv = clean.slice(-1).toUpperCase();
                return `${body}-${dv}`;
            }
            return clean.toUpperCase();
        };

        const levelMap: Record<string, number> = {};
        const existingLevels = await db.all("SELECT id, name FROM levels");
        for (const lvl of existingLevels) {
            levelMap[lvl.name.toUpperCase()] = lvl.id;
        }

        // Fetch existing students mapped by clean RUN to check for updates
        const existingStudents = await db.all("SELECT id, run FROM students");
        const studentMap: Record<string, string> = {}; // run -> id
        for (const st of existingStudents) {
            const cleanSrun = cleanRun(st.run);
            if (cleanSrun) {
                studentMap[cleanSrun] = st.id;
            }
        }

        let studentsCount = 0;
        let titularesCount = 0;
        let suplentesCount = 0;

        const parseExcelDate = (dateVal: any): string | null => {
            if (!dateVal) return null;
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
                        y = parts[0]; m = parts[1]; d = parts[2];
                    } else if (p0 > 12) {
                        // DD-MM-YYYY
                        d = parts[0]; m = parts[1]; y = parts[2];
                    } else if (p1 > 12) {
                        // MM-DD-YYYY
                        m = parts[0]; d = parts[1]; y = parts[2];
                    } else {
                        // Ambiguous, assume DD-MM-YYYY (Chilean standard)
                        d = parts[0]; m = parts[1]; y = parts[2];
                    }
                    
                    if (y && y.length === 2) y = '20' + y;
                    if (d && m && y) {
                        return `${y}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
                    }
                }
            }
            return String(dateVal);
        };

        const mainSheetName = workbook.SheetNames[0];
        const mainSheet = workbook.Sheets[mainSheetName];
        const rows = xlsx.utils.sheet_to_json<any[]>(mainSheet, { header: 1, defval: "" });
        
        if (rows.length < 2) {
            return res.status(400).json({ error: 'La hoja de estudiantes está vacía o no tiene encabezados.' });
        }

        const headers = rows[0].map(h => String(h).trim().toUpperCase());
        const dataRows = rows.slice(1);

        const findCol = (row: any[], possibleNames: string[], fallbackIndex?: number) => {
            for (const name of possibleNames) {
                const idx = headers.indexOf(name.toUpperCase());
                if (idx !== -1 && row[idx] !== undefined && row[idx] !== "") return row[idx];
            }
            if (fallbackIndex !== undefined && row[fallbackIndex] !== undefined && row[fallbackIndex] !== "") return row[fallbackIndex];
            return null;
        };

        for (const rowArr of dataRows) {
            const rawRun = findCol(rowArr, ['RUT', 'RUN', 'RUT ALUMNO', 'RUT_ALUMNO', 'RUN_ALUMNO']);
            if (!rawRun) continue;
            const run = cleanRun(rawRun);
            if (!run) continue;

            const fullName = findCol(rowArr, ['NOMBRE', 'NOMBRE COMPLETO', 'NOMBRE_COMPLETO', 'ALUMNO', 'ESTUDIANTE'], 1);
            
            let firstName = '', paternalSurname = '', maternalSurname = '';
            if (fullName) {
                const parts = String(fullName).trim().split(/\s+/);
                if (parts.length >= 3) {
                    paternalSurname = parts[0];
                    maternalSurname = parts[1];
                    firstName = parts.slice(2).join(' ');
                } else if (parts.length === 2) {
                    paternalSurname = parts[0];
                    firstName = parts[1];
                } else {
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
            const rawRetiro = findCol(rowArr, ['FECHA DE RETIRO', 'FECHA RETIRO', 'FECHA_DE_RETIRO', 'FECHA_RETIRO', 'RETIRADO_FECHA']);
            const rawStatus = (findCol(rowArr, ['ESTADO', 'estado']) || 'Active').toString().trim().toUpperCase();
            let status = 'Active';
            let withdrawalDate: string | null = null;
            if (rawStatus.startsWith('RET') || rawStatus.startsWith('INAC') || rawStatus === 'INACTIVE' || rawStatus === 'INACTIVO' || (rawRetiro && String(rawRetiro).trim() !== '')) {
                status = 'RETIRADO';
                withdrawalDate = parseExcelDate(rawRetiro) || new Date().toISOString().split('T')[0];
            }
            const observaciones = findCol(rowArr, ['OBSERVACIONES']);
            const entryDate = parseExcelDate(findCol(rowArr, ['FECHA DE INGRESO', 'FECHA INGRESO', 'FECHA_DE_INGRESO', 'FECHA_INGRESO', 'FECHA INGRESO']));
            
            const livesWith = findCol(rowArr, ['VIVE CON', 'VIVE_CON']);
            const familyMembers = parseInt(findCol(rowArr, ['GRUPO FAMILIAR', 'NUMERO_GRUPO_FAMILIAR', 'NÚMERO GRUPO FAMILIAR']) || "0") || null;
            const totalSiblings = parseInt(findCol(rowArr, ['TOTAL HERMANOS', 'TOTAL_HERMANOS']) || "0") || null;
            const schoolSiblings = parseInt(findCol(rowArr, ['HERMANOS ESCOLARES', 'HERMANOS_ESCOLARES']) || "0") || null;
            const liceoSiblings = parseInt(findCol(rowArr, ['HERMANOS COLEGIO', 'HERMANOS_COLEGIO', 'HERMANOS LICEO']) || "0") || null;
            const siblingPosition = parseInt(findCol(rowArr, ['LUGAR HERMANOS', 'LUGAR_ENTRE_HERMANOS', 'LUGAR ENTRE HERMANOS']) || "0") || null;
            const enrollmentNumber = findCol(rowArr, ['N° MATRÍCULA', 'NUMERO_MATRICULA']);
            const cursoStr = findCol(rowArr, ['CURSO', 'Curso'])?.toString().toUpperCase();

            let levelId = 1;
            if (cursoStr) {
                if (levelMap[cursoStr]) {
                    levelId = levelMap[cursoStr];
                } else {
                    const result = await db.run("INSERT INTO levels (name, total_capacity, current_enrolled) VALUES (?, 40, 0)", [cursoStr]);
                    levelId = result.lastID!;
                    levelMap[cursoStr] = levelId;
                }
            }

            let studentId = studentMap[run];

            if (studentId) {
                // Update student
                await db.run(`
                    UPDATE students SET 
                        full_name = ?, first_name = ?, paternal_surname = ?, maternal_surname = ?,
                        birth_date = ?, gender = ?, nationality = ?, religion = ?, marital_status = ?, ethnicity = ?,
                        address = ?, region = ?, commune = ?, email = ?, phone = ?, previous_school = ?, health_system = ?, enrollment_number = ?,
                        lives_with = ?, family_members = ?, total_siblings = ?, school_siblings = ?, liceo_siblings = ?, sibling_position = ?, status = ?, entry_date = ?, observaciones = ?, withdrawal_date = ?
                    WHERE id = ?
                `, [
                    cleanFullName, firstName, paternalSurname, maternalSurname,
                    birthDate, gender, nationality, religion, maritalStatus, ethnicity,
                    address, region, commune, studentEmail, studentPhone, previousSchool, healthSystem, enrollmentNumber,
                    livesWith, familyMembers, totalSiblings, schoolSiblings, liceoSiblings, siblingPosition, status, entryDate, observaciones, withdrawalDate,
                    studentId
                ]);

                // Update or Insert Health Records
                const healthExists = await db.get("SELECT id FROM health_records WHERE student_id = ?", [studentId]);
                if (healthExists) {
                    await db.run(`
                        UPDATE health_records SET 
                            blood_type = ?, allergies = ?, chronic_diseases = ?
                        WHERE student_id = ?
                    `, [
                        findCol(rowArr, ['GRUPO SANGUÍNEO', 'GRUPO_SANGUINEO']) || '', 
                        findCol(rowArr, ['ALERGIAS']) || '', 
                        findCol(rowArr, ['ENFERMEDADES', 'ENFERMEDADES_CRONICAS']) || '',
                        studentId
                    ]);
                } else {
                    await db.run(`
                        INSERT INTO health_records (id, student_id, blood_type, allergies, chronic_diseases)
                        VALUES (?, ?, ?, ?, ?)
                    `, [
                        crypto.randomUUID(), studentId, findCol(rowArr, ['GRUPO SANGUÍNEO', 'GRUPO_SANGUINEO']) || '', findCol(rowArr, ['ALERGIAS']) || '', findCol(rowArr, ['ENFERMEDADES', 'ENFERMEDADES_CRONICAS']) || ''
                    ]);
                }

                // Update or Insert Enrollment for 2026
                const enrollmentExists = await db.get("SELECT id FROM enrollments WHERE student_id = ? AND academic_year = 2026", [studentId]);
                if (enrollmentExists) {
                    await db.run(`
                        UPDATE enrollments SET level_id = ?
                        WHERE id = ?
                    `, [levelId, enrollmentExists.id]);
                } else {
                    await db.run(`
                        INSERT INTO enrollments (id, student_id, level_id, academic_year)
                        VALUES (?, ?, ?, 2026)
                    `, [crypto.randomUUID(), studentId, levelId]);
                }

            } else {
                // Insert new student
                studentId = crypto.randomUUID();
                studentMap[run] = studentId;

                await db.run(`
                    INSERT INTO students (
                        id, run, full_name, first_name, paternal_surname, maternal_surname,
                        birth_date, gender, nationality, religion, marital_status, ethnicity,
                        address, region, commune, email, phone, previous_school, health_system, enrollment_number,
                        lives_with, family_members, total_siblings, school_siblings, liceo_siblings, sibling_position, status, entry_date, observaciones, withdrawal_date
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    studentId, run, cleanFullName, firstName, paternalSurname, maternalSurname,
                    birthDate, gender, nationality, religion, maritalStatus, ethnicity,
                    address, region, commune, studentEmail, studentPhone, previousSchool, healthSystem, enrollmentNumber,
                    livesWith, familyMembers, totalSiblings, schoolSiblings, liceoSiblings, siblingPosition, status, entryDate, observaciones, withdrawalDate
                ]);

                await db.run(`
                    INSERT INTO health_records (id, student_id, blood_type, allergies, chronic_diseases)
                    VALUES (?, ?, ?, ?, ?)
                `, [
                    crypto.randomUUID(), studentId, findCol(rowArr, ['GRUPO SANGUÍNEO', 'GRUPO_SANGUINEO']) || '', findCol(rowArr, ['ALERGIAS']) || '', findCol(rowArr, ['ENFERMEDADES', 'ENFERMEDADES_CRONICAS']) || ''
                ]);

                await db.run(`
                    INSERT INTO enrollments (id, student_id, level_id, academic_year)
                    VALUES (?, ?, ?, 2026)
                `, [crypto.randomUUID(), studentId, levelId]);
            }
            studentsCount++;
        }

        // Import/Update Guardians
        if (workbook.SheetNames.includes('bd_titulares')) {
            const titularesData = xlsx.utils.sheet_to_json<any>(workbook.Sheets['bd_titulares'], { defval: "" });
            for (const row of titularesData) {
                const sRun = cleanRun(row['RUN Estudiante']);
                if (!sRun) continue;
                const studentId = studentMap[sRun];
                if (studentId) {
                    const gRun = row['RUN/IPA'] || 'S/R';
                    const gFullName = row['Nombre Apoderado Titular'] || 'Sin Nombre';
                    
                    const existingGuardian = await db.get("SELECT id FROM guardians WHERE student_id = ? AND guardian_type = 'Titular'", [studentId]);
                    if (existingGuardian) {
                        await db.run(`
                            UPDATE guardians SET run = ?, full_name = ?, relationship = ?, phone = ?, email = ?, address = ?
                            WHERE id = ?
                        `, [gRun, gFullName, row['Parentesco'] || '', row['Teléfono Titular'] || '', row['Email'] || '', row['Dirección'] || '', existingGuardian.id]);
                    } else {
                        await db.run(`
                            INSERT INTO guardians (id, student_id, guardian_type, run, full_name, relationship, phone, email, address)
                            VALUES (?, ?, 'Titular', ?, ?, ?, ?, ?, ?)
                        `, [crypto.randomUUID(), studentId, gRun, gFullName, row['Parentesco'] || '', row['Teléfono Titular'] || '', row['Email'] || '', row['Dirección'] || '']);
                    }
                    titularesCount++;
                }
            }
        }
        if (workbook.SheetNames.includes('bd_suplentes')) {
            const suplentesData = xlsx.utils.sheet_to_json<any>(workbook.Sheets['bd_suplentes'], { defval: "" });
            for (const row of suplentesData) {
                const sRun = cleanRun(row['RUN Estudiante']);
                if (!sRun) continue;
                const studentId = studentMap[sRun];
                if (studentId) {
                    const gRun = row['RUN/IPA'] || 'S/R';
                    const gFullName = row['Nombre Apoderado Suplente'] || 'Sin Nombre';
                    
                    const existingGuardian = await db.get("SELECT id FROM guardians WHERE student_id = ? AND guardian_type = 'Suplente'", [studentId]);
                    if (existingGuardian) {
                        await db.run(`
                            UPDATE guardians SET run = ?, full_name = ?, relationship = ?, phone = ?, email = ?, address = ?
                            WHERE id = ?
                        `, [gRun, gFullName, row['Parentesco'] || '', row['Teléfono Suplente'] || '', row['Email'] || '', row['Dirección'] || '', existingGuardian.id]);
                    } else {
                        await db.run(`
                            INSERT INTO guardians (id, student_id, guardian_type, run, full_name, relationship, phone, email, address)
                            VALUES (?, ?, 'Suplente', ?, ?, ?, ?, ?, ?)
                        `, [crypto.randomUUID(), studentId, gRun, gFullName, row['Parentesco'] || '', row['Teléfono Suplente'] || '', row['Email'] || '', row['Dirección'] || '']);
                    }
                    suplentesCount++;
                }
            }
        }

        res.json({ message: 'Importación exitosa', students: studentsCount, titulares: titularesCount, suplentes: suplentesCount });
    } catch (error: any) {
        console.error('Error importing:', error);
        res.status(500).json({ error: 'Error al importar datos', details: error.message });
    }
};

export const changeStudentLevel = async (req: Request, res: Response) => {
    let client;
    try {
        const { id } = req.params;
        const { newLevelId } = req.body;
        const user = (req as any).user;
        
        if (user.role !== 'Admin') {
            return res.status(403).json({ error: 'Solo administradores pueden cambiar a un estudiante de curso' });
        }
        
        client = await db.connect();
        
        // 1. Get student and enrollment
        const studentRes = await client.query("SELECT * FROM students WHERE id = ?", [id]);
        if (studentRes.rows.length === 0) {
            return res.status(404).json({ error: 'Estudiante no encontrado' });
        }
        const student = studentRes.rows[0];
        
        const enrollmentRes = await client.query("SELECT * FROM enrollments WHERE student_id = ? AND academic_year = 2026", [id]);
        if (enrollmentRes.rows.length === 0) {
            return res.status(400).json({ error: 'El estudiante no tiene una matrícula activa para el año escolar actual' });
        }
        const enrollment = enrollmentRes.rows[0];
        const oldLevelId = enrollment.level_id;
        
        if (parseInt(String(oldLevelId), 10) === parseInt(String(newLevelId), 10)) {
            return res.json({ message: 'El estudiante ya está en ese curso' });
        }
        
        // 2. Verify new level exists
        const newLevelRes = await client.query("SELECT * FROM levels WHERE id = ?", [newLevelId]);
        if (newLevelRes.rows.length === 0) {
            return res.status(404).json({ error: 'Curso de destino no encontrado' });
        }
        const newLevel = newLevelRes.rows[0];
        
        // Get old level details for audit log
        const oldLevelRes = await client.query("SELECT * FROM levels WHERE id = ?", [oldLevelId]);
        const oldLevel = oldLevelRes.rows[0];
        
        // Verify capacity based on active enrollments
        const activeCountRes = await client.query(`
            SELECT COUNT(*) as count 
            FROM enrollments e 
            JOIN students s ON e.student_id = s.id 
            WHERE e.level_id = ? AND e.academic_year = 2026 AND s.status = 'Active'
        `, [newLevelId]);
        const activeCount = parseInt(activeCountRes.rows[0]?.count || '0', 10);
        
        if (activeCount >= newLevel.total_capacity) {
            return res.status(400).json({ error: `El curso ${newLevel.name} no tiene cupos disponibles` });
        }
        
        // 3. Calculate list number for the new level (put at the end)
        const maxListNumRes = await client.query("SELECT MAX(list_number) as max_val FROM enrollments WHERE level_id = ? AND academic_year = 2026", [newLevelId]);
        const newListNumber = (maxListNumRes.rows[0]?.max_val || 0) + 1;
        
        // 4. Update enrollment
        await client.query("UPDATE enrollments SET level_id = ?, list_number = ? WHERE student_id = ? AND academic_year = 2026", [newLevelId, newListNumber, id]);
        
        // 5. Update attendance level_id
        await client.query("UPDATE attendance SET level_id = ? WHERE student_id = ?", [newLevelId, id]);
        
        // 6. Update capacity counters in levels
        await client.query("UPDATE levels SET current_enrolled = current_enrolled - 1 WHERE id = ?", [oldLevelId]);
        await client.query("UPDATE levels SET current_enrolled = current_enrolled + 1 WHERE id = ?", [newLevelId]);
        
        // 7. Transfer and preserve grades
        const oldGradesRes = await client.query(`
            SELECT g.id, g.grade_column_id, g.grade_value, gc.subject_id, gc.period, gc.title, gc.position, gc.weighting
            FROM grades g
            JOIN grade_columns gc ON g.grade_column_id = gc.id
            WHERE g.student_id = ? AND gc.academic_year = 2026 AND gc.level_id = ?
        `, [id, oldLevelId]);
        
        for (const grade of oldGradesRes.rows) {
            // Find corresponding column in new level
            const matchingColRes = await client.query(`
                SELECT id FROM grade_columns 
                WHERE level_id = ? AND subject_id = ? AND academic_year = 2026 AND period = ? AND position = ?
            `, [newLevelId, grade.subject_id, grade.period, grade.position]);
            
            let targetColId;
            if (matchingColRes.rows.length > 0) {
                targetColId = matchingColRes.rows[0].id;
            } else {
                // Create corresponding grade column in target level
                targetColId = crypto.randomUUID();
                await client.query(`
                    INSERT INTO grade_columns (id, level_id, subject_id, academic_year, period, title, position, weighting)
                    VALUES (?, ?, ?, 2026, ?, ?, ?, ?)
                `, [targetColId, newLevelId, grade.subject_id, grade.period, grade.title, grade.position, grade.weighting]);
            }
            
            // Check if there is already a grade for this student in the target column
            const existingGradeInTarget = await client.query("SELECT id FROM grades WHERE student_id = ? AND grade_column_id = ?", [id, targetColId]);
            if (existingGradeInTarget.rows.length > 0) {
                await client.query("UPDATE grades SET grade_value = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [grade.grade_value, existingGradeInTarget.rows[0].id]);
                await client.query("DELETE FROM grades WHERE id = ?", [grade.id]);
            } else {
                await client.query("UPDATE grades SET grade_column_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [targetColId, grade.id]);
            }
        }
        
        // 8. Log action in audit logs
        await client.query(`
            INSERT INTO audit_logs (id, user_id, user_name, action, details)
            VALUES (?, ?, ?, ?, ?)
        `, [
            crypto.randomUUID(),
            user.id,
            user.name || user.run || 'Sistema',
            'CHANGE_STUDENT_LEVEL',
            `Cambio de curso del estudiante: ${student.full_name} de ${oldLevel?.name || oldLevelId} a ${newLevel.name}`
        ]);
        
        res.json({ message: 'Estudiante cambiado de curso exitosamente' });
    } catch (error: any) {
        console.error("Error changing student level:", error);
        res.status(500).json({ error: 'Error interno al cambiar curso del estudiante', details: error.message });
    } finally {
        if (client) client.release();
    }
};

export const getExternalLinks = async (req: Request, res: Response) => {
    try {
        const links = await db.all("SELECT id, name, url FROM external_links ORDER BY created_at ASC");
        res.json(links);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al obtener enlaces externos', details: error.message });
    }
};

export const createExternalLink = async (req: Request, res: Response) => {
    const { name, url } = req.body;
    const user = (req as any).user;

    if (user.role !== 'Admin') {
        return res.status(403).json({ error: 'Solo administradores pueden crear enlaces externos' });
    }

    if (!name || !url) {
        return res.status(400).json({ error: 'Faltan parámetros requeridos: name, url' });
    }

    try {
        const id = crypto.randomUUID();
        await db.run("INSERT INTO external_links (id, name, url) VALUES (?, ?, ?)", [id, name, url]);
        res.status(201).json({ message: 'Enlace externo creado correctamente', link: { id, name, url } });
    } catch (error: any) {
        res.status(500).json({ error: 'Error al crear enlace externo', details: error.message });
    }
};

export const deleteExternalLink = async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = (req as any).user;

    if (user.role !== 'Admin') {
        return res.status(403).json({ error: 'Solo administradores pueden eliminar enlaces externos' });
    }

    try {
        await db.run("DELETE FROM external_links WHERE id = ?", [id]);
        res.json({ message: 'Enlace externo eliminado correctamente' });
    } catch (error: any) {
        res.status(500).json({ error: 'Error al eliminar enlace externo', details: error.message });
    }
};

export const updateExternalLink = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, url } = req.body;
    const user = (req as any).user;

    if (user.role !== 'Admin') {
        return res.status(403).json({ error: 'Solo administradores pueden editar enlaces externos' });
    }

    if (!name || !url) {
        return res.status(400).json({ error: 'Faltan parámetros requeridos: name, url' });
    }

    try {
        await db.run("UPDATE external_links SET name = ?, url = ? WHERE id = ?", [name, url, id]);
        res.json({ message: 'Enlace externo actualizado correctamente', link: { id, name, url } });
    } catch (error: any) {
        res.status(500).json({ error: 'Error al actualizar enlace externo', details: error.message });
    }
};
