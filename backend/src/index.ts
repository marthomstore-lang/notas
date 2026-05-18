// Liceo Pro Backend Central Entrypoint
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import { login, updateProfile } from './controllers/authController';
import { getAssignments, getGrades, addColumn, saveGrade } from './controllers/teacherController';
import { registerEnrollment } from './controllers/enrollmentController';
import { getTeachers, createTeacher, updateTeacher, deleteTeacher, getSubjects, createSubject, getLevels, updateLevelCapacity, getAssignmentsAdmin, createAssignment, deleteAssignment, getStudents, getStudentById, updateStudent, deleteStudent, reincorporateStudent, getStudentObservations, addObservation, exportData, importDataWeb } from './controllers/adminController';
import { getFiltersData, getGradesSheet, saveGradesSheet, updateStudentPosition, bulkUpdateStudentPositions, toggleLockAssignment, getAuditLogs } from './controllers/gradesController';
import { getStudentGradesReport, getLevelGradesReport, updateInstitutionalSettings, setHomeroomTeacher } from './controllers/reportsController';
import multer from 'multer';
import db from './config/db';

const upload = multer({ storage: multer.memoryStorage() });
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'super-secret-key-liceo-pro';

app.use(cors());
app.use(helmet());
app.use(express.json());

// Auth Middleware
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    let token = '';
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    } else if (req.query.token) {
        token = req.query.token as string;
    }

    if (!token) return res.status(401).json({ error: 'No token provided' });
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        (req as any).user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
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
router.get('/admin/levels', authMiddleware, getLevels);
router.put('/admin/levels/:id/capacity', authMiddleware, updateLevelCapacity);
router.get('/admin/assignments', authMiddleware, getAssignmentsAdmin);
router.post('/admin/assignments', authMiddleware, createAssignment);
router.delete('/admin/assignments/:id', authMiddleware, deleteAssignment);
router.post('/admin/set-homeroom', authMiddleware, setHomeroomTeacher);
router.get('/admin/students', authMiddleware, getStudents);
router.get('/admin/export', authMiddleware, exportData);
router.post('/admin/import', authMiddleware, upload.single('file'), importDataWeb);
router.get('/admin/students/:id', authMiddleware, getStudentById);
router.put('/admin/students/:id', authMiddleware, updateStudent);
router.delete('/admin/students/:id', authMiddleware, deleteStudent);
router.post('/admin/students/:id/reincorporate', authMiddleware, reincorporateStudent);
router.get('/admin/students/:id/observations', authMiddleware, getStudentObservations);
router.post('/admin/students/:id/observations', authMiddleware, addObservation);

// Rutas Calificaciones (Notas)
router.get('/admin/grades/filters', authMiddleware, getFiltersData);
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

// Rutas Docente (Fase 3)
router.get('/teacher/assignments', authMiddleware, getAssignments);
router.get('/teacher/grades/:assignmentId', authMiddleware, getGrades);
router.post('/teacher/grades/:assignmentId/columns', authMiddleware, addColumn);
router.post('/teacher/grades/save', authMiddleware, saveGrade);

router.get('/debug/db', async (req, res) => {
    try {
        const isPostgres = !!process.env.DATABASE_URL;
        const result = await db.all('SELECT COUNT(*) as count FROM users');
        res.json({
            status: 'ok',
            database: isPostgres ? 'PostgreSQL (Supabase)' : 'SQLite (Local)',
            userCount: result[0]?.count || 0,
            env: {
                hasDatabaseUrl: !!process.env.DATABASE_URL,
                nodeEnv: process.env.NODE_ENV
            }
        });
    } catch (err: any) {
        res.status(500).json({ status: 'error', message: err.message });
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