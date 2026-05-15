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

// Rutas Públicas
app.post('/api/auth/login', login);
app.put('/api/auth/me', authMiddleware, updateProfile);

// Rutas Estudiantes (Fase 1)
app.post('/api/enrollments', authMiddleware, registerEnrollment);

// Rutas Admin (Fase 4)
app.get('/api/admin/teachers', authMiddleware, getTeachers);
app.post('/api/admin/teachers', authMiddleware, createTeacher);
app.put('/api/admin/teachers/:id', authMiddleware, updateTeacher);
app.delete('/api/admin/teachers/:id', authMiddleware, deleteTeacher);
app.get('/api/admin/subjects', authMiddleware, getSubjects);
app.post('/api/admin/subjects', authMiddleware, createSubject);
app.get('/api/admin/levels', authMiddleware, getLevels);
app.put('/api/admin/levels/:id/capacity', authMiddleware, updateLevelCapacity);
app.get('/api/admin/assignments', authMiddleware, getAssignmentsAdmin);
app.post('/api/admin/assignments', authMiddleware, createAssignment);
app.delete('/api/admin/assignments/:id', authMiddleware, deleteAssignment);
app.post('/api/admin/set-homeroom', authMiddleware, setHomeroomTeacher);
app.get('/api/admin/students', authMiddleware, getStudents);
app.get('/api/admin/export', authMiddleware, exportData);
app.post('/api/admin/import', authMiddleware, upload.single('file'), importDataWeb);
app.get('/api/admin/students/:id', authMiddleware, getStudentById);
app.put('/api/admin/students/:id', authMiddleware, updateStudent);
app.delete('/api/admin/students/:id', authMiddleware, deleteStudent);
app.post('/api/admin/students/:id/reincorporate', authMiddleware, reincorporateStudent);
app.get('/api/admin/students/:id/observations', authMiddleware, getStudentObservations);
app.post('/api/admin/students/:id/observations', authMiddleware, addObservation);

// Rutas Calificaciones (Notas)
app.get('/api/admin/grades/filters', authMiddleware, getFiltersData);
app.get('/api/admin/grades/sheet', authMiddleware, getGradesSheet);
app.post('/api/admin/grades/sheet', authMiddleware, saveGradesSheet);
app.post('/api/admin/grades/student-position', authMiddleware, updateStudentPosition);
app.post('/api/admin/grades/bulk-position', authMiddleware, bulkUpdateStudentPositions);
app.post('/api/admin/grades/toggle-lock', authMiddleware, toggleLockAssignment);
app.get('/api/admin/system/audit-logs', authMiddleware, getAuditLogs);

// Rutas Reportes y Configuración
app.get('/api/reports/grades/:studentId', authMiddleware, getStudentGradesReport);
app.get('/api/reports/grades/level/:levelId', authMiddleware, getLevelGradesReport);
app.post('/api/admin/settings', authMiddleware, updateInstitutionalSettings);
app.post('/api/admin/homeroom-teacher', authMiddleware, setHomeroomTeacher);

// Rutas Docente (Fase 3)
app.get('/api/teacher/assignments', authMiddleware, getAssignments);
app.get('/api/teacher/grades/:assignmentId', authMiddleware, getGrades);
app.post('/api/teacher/grades/:assignmentId/columns', authMiddleware, addColumn);
app.post('/api/teacher/grades/save', authMiddleware, saveGrade);
app.post('/api/teacher/grades/save', authMiddleware, saveGrade);

app.listen(PORT, () => {
    console.log('=========================================');
    console.log(`Liceo Pro Backend v2.1 (RESTARTED)`);
    console.log(`Running on http://localhost:${PORT}`);
    console.log('=========================================');
});

export default app;
