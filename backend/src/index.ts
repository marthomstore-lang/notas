// Liceo Pro Backend Central Entrypoint
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import { login, updateProfile } from './controllers/authController';
import { getAssignments, getGrades, addColumn, saveGrade } from './controllers/teacherController';
import { registerEnrollment } from './controllers/enrollmentController';
import { getTeachers, createTeacher, updateTeacher, deleteTeacher, getSubjects, createSubject, updateSubject, deleteSubject, checkSubjectGrades, getLevels, updateLevelCapacity, getAssignmentsAdmin, createAssignment, updateAssignment, deleteAssignment, getStudents, getStudentById, updateStudent, deleteStudent, reincorporateStudent, getStudentObservations, addObservation, exportData, importDataWeb, changeStudentLevel } from './controllers/adminController';
import { getFiltersData, getGradesSheet, saveGradesSheet, updateStudentPosition, bulkUpdateStudentPositions, toggleLockAssignment, getAuditLogs, getGradesOverview } from './controllers/gradesController';
import { getStudentGradesReport, getLevelGradesReport, updateInstitutionalSettings, setHomeroomTeacher, getSubjectOrder, updateSubjectOrder } from './controllers/reportsController';
import multer from 'multer';
import db from './config/db';

const upload = multer({ storage: multer.memoryStorage() });
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'super-secret-key-liceo-pro';

app.use(cors());
app.use(helmet());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Auth Middleware
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Token no provisto' });
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        (req as any).user = decoded;
        
        // Evitar modificaciones por parte de usuarios con rol "Visita"
        if (decoded.role === 'Visita' && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
            return res.status(403).json({ error: 'El perfil de visita no tiene permisos para realizar modificaciones.' });
        }
        
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token inválido' });
    }
};

const router = express.Router();

// Rutas Públicas
router.post('/auth/login', login);
router.put('/auth/me', authMiddleware, updateProfile);

// Rutas Estudiantes (Fase 1)
router.post('/enrollments', authMiddleware, registerEnrollment);

// Rutas Admin (Fase 4)
router.get('/admin/teachers', authMiddleware, getTeachers);
router.post('/admin/teachers', authMiddleware, createTeacher);
router.put('/admin/teachers/:id', authMiddleware, updateTeacher);
router.delete('/admin/teachers/:id', authMiddleware, deleteTeacher);
router.get('/admin/subjects', authMiddleware, getSubjects);
router.post('/admin/subjects', authMiddleware, createSubject);
router.put('/admin/subjects/:id', authMiddleware, updateSubject);
router.delete('/admin/subjects/:id', authMiddleware, deleteSubject);
router.get('/admin/subjects/:id/check-delete', authMiddleware, checkSubjectGrades);
router.get('/admin/levels', authMiddleware, getLevels);
router.put('/admin/levels/:id/capacity', authMiddleware, updateLevelCapacity);
router.get('/admin/assignments', authMiddleware, getAssignmentsAdmin);
router.post('/admin/assignments', authMiddleware, createAssignment);
router.put('/admin/assignments/:id', authMiddleware, updateAssignment);
router.delete('/admin/assignments/:id', authMiddleware, deleteAssignment);
router.post('/admin/set-homeroom', authMiddleware, setHomeroomTeacher);
router.get('/admin/students', authMiddleware, getStudents);
router.get('/admin/export', authMiddleware, exportData);
router.post('/admin/import', authMiddleware, upload.single('file'), importDataWeb);
router.get('/admin/students/:id', authMiddleware, getStudentById);
router.put('/admin/students/:id', authMiddleware, updateStudent);
router.delete('/admin/students/:id', authMiddleware, deleteStudent);
router.post('/admin/students/:id/reincorporate', authMiddleware, reincorporateStudent);
router.post('/admin/students/:id/change-level', authMiddleware, changeStudentLevel);
router.get('/admin/students/:id/observations', authMiddleware, getStudentObservations);
router.post('/admin/students/:id/observations', authMiddleware, addObservation);

// Rutas Calificaciones (Notas)
router.get('/admin/grades/filters', authMiddleware, getFiltersData);
router.get('/admin/grades/overview', authMiddleware, getGradesOverview);
router.get('/admin/grades/sheet', authMiddleware, getGradesSheet);
router.post('/admin/grades/sheet', authMiddleware, saveGradesSheet);
router.post('/admin/grades/student-position', authMiddleware, updateStudentPosition);
router.post('/admin/grades/bulk-position', authMiddleware, bulkUpdateStudentPositions);
router.post('/admin/grades/toggle-lock', authMiddleware, toggleLockAssignment);
router.get('/admin/system/audit-logs', authMiddleware, getAuditLogs);

// Rutas Reportes y Configuración
router.get('/reports/grades/:studentId', authMiddleware, getStudentGradesReport);
router.get('/reports/grades/level/:levelId', authMiddleware, getLevelGradesReport);
router.post('/admin/settings', authMiddleware, updateInstitutionalSettings);
router.post('/admin/homeroom-teacher', authMiddleware, setHomeroomTeacher);
router.get('/admin/settings/subject-order/:levelId', authMiddleware, getSubjectOrder);
router.post('/admin/settings/subject-order', authMiddleware, updateSubjectOrder);

// Rutas Docente (Fase 3)
router.get('/teacher/assignments', authMiddleware, getAssignments);
router.get('/teacher/grades/:assignmentId', authMiddleware, getGrades);
router.post('/teacher/grades/:assignmentId/columns', authMiddleware, addColumn);
router.post('/teacher/grades/save', authMiddleware, saveGrade);

router.get('/debug/db', async (req, res) => {
    try {
        const isPostgres = !!(process.env.DATABASE_URL || process.env.POSTGRES_URL);
        const result = await db.all('SELECT COUNT(*) as count FROM users');
        res.json({
            status: 'ok',
            database: isPostgres ? 'PostgreSQL (Supabase)' : 'SQLite (Local)',
            userCount: result[0]?.count || 0,
            env: {
                hasDatabaseUrl: !!(process.env.DATABASE_URL || process.env.POSTGRES_URL),
                nodeEnv: process.env.NODE_ENV
            }
        });
    } catch (err: any) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

router.post('/debug/migrate-data', async (req, res) => {
    const { secret, data } = req.body;
    if (secret !== 'liceopro-migration-2026-super-secret') {
        return res.status(403).json({ error: 'Forbidden' });
    }

    let client;
    try {
        console.log('[Migration] Iniciando DDL e inicialización estructural en Supabase...');
        client = await db.connect();

        // 0. Eliminar tablas vacías existentes en Supabase para evitar conflictos de columnas obsoletas
        const tablesToDrop = [
            'grades', 'grade_columns', 'enrollments', 'health_records', 'students',
            'observations', 'attendance', 'regulatory_acceptances', 'audit_logs', 'grades_locks',
            'teacher_assignments', 'guardians', 'subjects', 'levels', 'users',
            'institutional_settings', 'homeroom_teachers'
        ];

        for (const table of tablesToDrop) {
            await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
            console.log(`[Migration] Eliminada tabla física: ${table}`);
        }

        // 1. Sentencias DDL compatibles con PostgreSQL
        const ddlStatements = [
            `CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                run TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                email TEXT UNIQUE,
                password_hash TEXT NOT NULL,
                password_plain TEXT,
                role TEXT CHECK (role IN ('Admin', 'Docente', 'Administrativo', 'Apoderado', 'Visita')) NOT NULL,
                temp_password BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS levels (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                total_capacity INTEGER NOT NULL,
                current_enrolled INTEGER DEFAULT 0,
                homeroom_teacher_id TEXT REFERENCES users(id)
            )`,
            `CREATE TABLE IF NOT EXISTS subjects (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL
            )`,
            `CREATE TABLE IF NOT EXISTS teacher_assignments (
                id TEXT PRIMARY KEY,
                teacher_id TEXT REFERENCES users(id),
                level_id INTEGER REFERENCES levels(id),
                subject_id INTEGER REFERENCES subjects(id),
                academic_year INTEGER NOT NULL,
                is_locked INTEGER DEFAULT 0,
                UNIQUE(teacher_id, level_id, subject_id, academic_year)
            )`,
            `CREATE TABLE IF NOT EXISTS students (
                id TEXT PRIMARY KEY,
                run TEXT UNIQUE NOT NULL,
                document_type TEXT,
                full_name TEXT NOT NULL,
                first_name TEXT,
                paternal_surname TEXT,
                maternal_surname TEXT,
                birth_date TEXT,
                gender TEXT,
                nationality TEXT,
                marital_status TEXT,
                religion TEXT,
                has_religion BOOLEAN DEFAULT FALSE,
                ethnicity TEXT,
                address TEXT,
                region TEXT,
                commune TEXT,
                postal_code TEXT,
                previous_school TEXT,
                phone TEXT,
                mobile_phone TEXT,
                phone_type TEXT,
                email TEXT,
                email_type TEXT,
                health_system TEXT,
                emergency_contact_name TEXT,
                emergency_contact_phone TEXT,
                enrollment_number TEXT,
                enrollment_date TEXT,
                incorporation_date TEXT,
                entry_year INTEGER,
                pie_program BOOLEAN DEFAULT FALSE,
                pie_diagnosis TEXT,
                differential_group BOOLEAN DEFAULT FALSE,
                is_repeater BOOLEAN DEFAULT FALSE,
                uses_mineduc_texts BOOLEAN DEFAULT TRUE,
                indigenous_origin TEXT,
                is_priority BOOLEAN DEFAULT FALSE,
                is_preferential BOOLEAN DEFAULT FALSE,
                is_vulnerable BOOLEAN DEFAULT FALSE,
                is_high_vulnerability BOOLEAN DEFAULT FALSE,
                scholarship_indigenous BOOLEAN DEFAULT FALSE,
                scholarship_president BOOLEAN DEFAULT FALSE,
                scholarship_retention BOOLEAN DEFAULT FALSE,
                scholarship_junaeb BOOLEAN DEFAULT FALSE,
                scholarship_other TEXT,
                lives_with TEXT,
                lives_with_other TEXT,
                family_members INTEGER,
                total_siblings INTEGER,
                school_siblings INTEGER,
                school_age_siblings INTEGER,
                liceo_siblings INTEGER,
                sibling_position INTEGER,
                status TEXT DEFAULT 'Active',
                entry_date TEXT,
                observaciones TEXT,
                withdrawal_date TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS guardians (
                id TEXT PRIMARY KEY,
                student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
                guardian_type TEXT NOT NULL,
                run TEXT NOT NULL,
                full_name TEXT NOT NULL,
                first_name TEXT,
                paternal_surname TEXT,
                maternal_surname TEXT,
                birth_date TEXT,
                gender TEXT,
                marital_status TEXT,
                relationship TEXT,
                phone TEXT,
                email TEXT,
                address TEXT,
                region TEXT,
                commune TEXT,
                postal_code TEXT,
                education_level TEXT,
                occupation TEXT,
                health_system TEXT,
                is_health_load BOOLEAN DEFAULT FALSE,
                is_financial_guardian BOOLEAN DEFAULT FALSE,
                is_main_guardian BOOLEAN DEFAULT FALSE
            )`,
            `CREATE TABLE IF NOT EXISTS health_records (
                id TEXT PRIMARY KEY,
                student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
                blood_type TEXT,
                allergies TEXT,
                chronic_diseases TEXT,
                general_observations TEXT
            )`,
            `CREATE TABLE IF NOT EXISTS enrollments (
                id TEXT PRIMARY KEY,
                student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
                level_id INTEGER REFERENCES levels(id),
                academic_year INTEGER NOT NULL,
                status TEXT DEFAULT 'Active',
                list_number INTEGER,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(student_id, academic_year)
            )`,
            `CREATE TABLE IF NOT EXISTS grade_columns (
                id TEXT PRIMARY KEY,
                level_id INTEGER REFERENCES levels(id),
                subject_id INTEGER REFERENCES subjects(id),
                academic_year INTEGER NOT NULL,
                title TEXT NOT NULL,
                period TEXT,
                position INTEGER,
                weighting NUMERIC(5,2) DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS grades (
                id TEXT PRIMARY KEY,
                student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
                grade_column_id TEXT REFERENCES grade_columns(id) ON DELETE CASCADE,
                grade_value NUMERIC(3,1) CHECK (grade_value >= 1.0 AND grade_value <= 7.0),
                is_locked INTEGER DEFAULT 0,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(student_id, grade_column_id)
            )`,
            `CREATE TABLE IF NOT EXISTS regulatory_acceptances (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                accepted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                ip_address TEXT NOT NULL,
                regulation_version TEXT NOT NULL
            )`,
            `CREATE TABLE IF NOT EXISTS observations (
                id TEXT PRIMARY KEY,
                student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
                teacher_id TEXT REFERENCES users(id),
                content TEXT NOT NULL,
                type TEXT CHECK (type IN ('Positive', 'Negative')) DEFAULT 'Positive',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS attendance (
                id TEXT PRIMARY KEY,
                student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
                level_id INTEGER REFERENCES levels(id),
                status TEXT CHECK (status IN ('Present', 'Absent', 'Justified')) DEFAULT 'Present',
                date TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(student_id, date)
            )`,
            `CREATE TABLE IF NOT EXISTS audit_logs (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                user_name TEXT,
                action TEXT,
                details TEXT,
                level_id TEXT,
                subject_id TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS grades_locks (
                level_id INTEGER,
                subject_id INTEGER,
                academic_year INTEGER,
                period TEXT,
                is_locked INTEGER DEFAULT 0,
                PRIMARY KEY (level_id, subject_id, academic_year, period)
            )`,
            `CREATE TABLE IF NOT EXISTS institutional_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )`,
            `CREATE TABLE IF NOT EXISTS homeroom_teachers (
                id SERIAL PRIMARY KEY,
                level_id INTEGER REFERENCES levels(id),
                teacher_id TEXT REFERENCES users(id),
                academic_year INTEGER NOT NULL,
                UNIQUE(level_id, academic_year)
            )`
        ];

        for (const statement of ddlStatements) {
            await client.query(statement);
        }
        console.log('[Migration] Estructura de base de datos verificada/creada exitosamente.');

        // 2. Limpieza de tablas (hijas primero)
        const tablesToDelete = [
            'grades', 'grade_columns', 'enrollments', 'health_records', 'students',
            'observations', 'attendance', 'regulatory_acceptances', 'audit_logs', 'grades_locks',
            'teacher_assignments', 'guardians', 'subjects', 'levels', 'users',
            'institutional_settings', 'homeroom_teachers'
        ];

        for (const table of tablesToDelete) {
            await client.query(`DELETE FROM ${table}`);
            console.log(`[Migration] Limpiada tabla: ${table}`);
        }

        // 3. Inserción de datos (padres primero)
        const tablesToInsert = [
            'users', 'levels', 'subjects', 'teacher_assignments', 'students',
            'guardians', 'health_records', 'enrollments', 'grade_columns', 'grades',
            'observations', 'attendance', 'regulatory_acceptances', 'audit_logs', 'grades_locks',
            'institutional_settings', 'homeroom_teachers'
        ];

        for (const table of tablesToInsert) {
            const rows = data[table];
            if (!rows || rows.length === 0) continue;

            console.log(`[Migration] Insertando ${rows.length} filas en '${table}' usando Bulk Insert...`);

            if (rows.length > 0) {
                const keys = Object.keys(rows[0]);
                const columnsStr = keys.map(k => `"${k}"`).join(', ');
                
                const chunkSize = 500;
                for (let i = 0; i < rows.length; i += chunkSize) {
                    const chunk = rows.slice(i, i + chunkSize);
                    
                    const values = [];
                    const placeholdersArray = [];
                    
                    let paramIndex = 1;
                    for (const row of chunk) {
                        const rowPlaceholders = [];
                        for (const key of keys) {
                            values.push(row[key]);
                            rowPlaceholders.push(`$${paramIndex++}`);
                        }
                        placeholdersArray.push(`(${rowPlaceholders.join(', ')})`);
                    }
                    
                    const queryText = `INSERT INTO ${table} (${columnsStr}) VALUES ${placeholdersArray.join(', ')}`;
                    await client.query(queryText, values);
                }
            }
            console.log(`[Migration] Tabla '${table}' insertada exitosamente.`);
        }

        // 4. Sincronizar secuencias serial de PostgreSQL
        const serialTables = ['levels', 'subjects', 'homeroom_teachers'];
        for (const table of serialTables) {
            try {
                await client.query(`
                    SELECT setval(
                        pg_get_serial_sequence('${table}', 'id'),
                        COALESCE(MAX(id), 1),
                        MAX(id) IS NOT NULL
                    ) FROM ${table}
                `);
                console.log(`[Migration] Secuencias sincronizadas para '${table}'.`);
            } catch (seqErr: any) {
                console.warn(`[Migration] Advertencia al sincronizar secuencias de '${table}':`, seqErr.message);
            }
        }

        res.json({ status: 'ok', message: '¡Migración estructural y de datos completada exitosamente!' });
    } catch (err: any) {
        console.error('[Migration] Error:', err);
        res.status(500).json({ status: 'error', message: err.message, stack: err.stack });
    } finally {
        if (client) client.release();
    }
});

// Mount router for both local and Vercel environments
app.use('/api', router);
app.use('/_/backend/api', router);

app.listen(PORT, () => {
    console.log('=========================================');
    console.log(`Liceo Pro Backend v2.1 (RESTARTED)`);
    console.log(`Running on http://localhost:${PORT}`);
    console.log('=========================================');
});

export default app;
module.exports = app;