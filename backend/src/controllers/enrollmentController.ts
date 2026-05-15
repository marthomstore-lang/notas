import { Request, Response } from 'express';
import db from '../config/db';
import { v4 as uuidv4 } from 'uuid';

export const registerEnrollment = async (req: Request, res: Response) => {
    try {
        const { studentData, guardiansData, healthData, levelId, academicYear } = req.body;
        
        const client = await db.connect();
        
        // 1. Verificar cupos disponibles (Simulado para SQLite)
        const levelRes = await client.query('SELECT * FROM levels WHERE id = ?', [levelId]);
        const level = levelRes.rows[0];
        if (!level || level.current_enrolled >= level.total_capacity) {
            return res.status(400).json({ error: 'No hay cupos disponibles en este nivel' });
        }

        // 2. Transacción manual en SQLite (no soporta BEGIN automáticamente en node-sqlite3 si no usamos execute, pero podemos simularlo)
        const studentId = uuidv4();
        
        await client.query(`
            INSERT INTO students (
                id, run, full_name, birth_date, gender, nationality, marital_status, religion, ethnicity,
                address, region, commune, previous_school, phone, email, health_system, enrollment_number,
                lives_with, family_members, total_siblings, school_siblings, liceo_siblings, sibling_position
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            studentId, studentData.run, studentData.full_name, studentData.birth_date, studentData.gender,
            studentData.nationality, studentData.marital_status, studentData.religion, studentData.ethnicity,
            studentData.address, studentData.region, studentData.commune, studentData.previous_school,
            studentData.phone, studentData.email, studentData.health_system, studentData.enrollment_number,
            studentData.lives_with, studentData.family_members, studentData.total_siblings,
            studentData.school_siblings, studentData.liceo_siblings, studentData.sibling_position
        ]);

        if (guardiansData && guardiansData.length > 0) {
            for (const g of guardiansData) {
                await client.query(`
                    INSERT INTO guardians (id, student_id, guardian_type, run, full_name, relationship, phone, email, address)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [uuidv4(), studentId, g.guardian_type, g.run, g.full_name, g.relationship, g.phone, g.email, g.address]);
            }
        }

        if (healthData) {
            await client.query(`
                INSERT INTO health_records (id, student_id, blood_type, allergies, chronic_diseases, general_observations)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [uuidv4(), studentId, healthData.blood_type, healthData.allergies, healthData.chronic_diseases, healthData.general_observations]);
        }

        // Matrícula
        await client.query(`
            INSERT INTO enrollments (id, student_id, level_id, academic_year)
            VALUES (?, ?, ?, ?)
        `, [uuidv4(), studentId, levelId, academicYear || 2026]);

        // Actualizar cupo
        await client.query('UPDATE levels SET current_enrolled = current_enrolled + 1 WHERE id = ?', [levelId]);

        res.status(201).json({ message: 'Matrícula Oficial registrada exitosamente', studentId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Fallo al registrar la matrícula oficial. Verifique si el RUT ya existe.' });
    }
};
