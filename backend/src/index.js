"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authController_1 = require("./controllers/authController");
const teacherController_1 = require("./controllers/teacherController");
const enrollmentController_1 = require("./controllers/enrollmentController");
const adminController_1 = require("./controllers/adminController");
const gradesController_1 = require("./controllers/gradesController");
const reportsController_1 = require("./controllers/reportsController");
const multer_1 = __importDefault(require("multer"));
const db_1 = __importDefault(require("./config/db"));
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'super-secret-key-liceo-pro';
app.use((0, cors_1.default)());
app.use((0, helmet_1.default)());
app.use(express_1.default.json());
// Auth Middleware
const authMiddleware = (req, res, next) => {
    let token = '';
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }
    else if (req.query.token) {
        token = req.query.token;
    }
    if (!token)
        return res.status(401).json({ error: 'No token provided' });
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};
const router = express_1.default.Router();
// Rutas Públicas
router.post('/auth/login', authController_1.login);
router.put('/auth/me', authMiddleware, authController_1.updateProfile);
// Rutas Estudiantes (Fase 1)
router.post('/enrollments', authMiddleware, enrollmentController_1.registerEnrollment);
// Rutas Admin (Fase 4)
router.get('/admin/teachers', authMiddleware, adminController_1.getTeachers);
router.post('/admin/teachers', authMiddleware, adminController_1.createTeacher);
router.put('/admin/teachers/:id', authMiddleware, adminController_1.updateTeacher);
router.delete('/admin/teachers/:id', authMiddleware, adminController_1.deleteTeacher);
router.get('/admin/subjects', authMiddleware, adminController_1.getSubjects);
router.post('/admin/subjects', authMiddleware, adminController_1.createSubject);
router.get('/admin/levels', authMiddleware, adminController_1.getLevels);
router.put('/admin/levels/:id/capacity', authMiddleware, adminController_1.updateLevelCapacity);
router.get('/admin/assignments', authMiddleware, adminController_1.getAssignmentsAdmin);
router.post('/admin/assignments', authMiddleware, adminController_1.createAssignment);
router.delete('/admin/assignments/:id', authMiddleware, adminController_1.deleteAssignment);
router.post('/admin/set-homeroom', authMiddleware, reportsController_1.setHomeroomTeacher);
router.get('/admin/students', authMiddleware, adminController_1.getStudents);
router.get('/admin/export', authMiddleware, adminController_1.exportData);
router.post('/admin/import', authMiddleware, upload.single('file'), adminController_1.importDataWeb);
router.get('/admin/students/:id', authMiddleware, adminController_1.getStudentById);
router.put('/admin/students/:id', authMiddleware, adminController_1.updateStudent);
router.delete('/admin/students/:id', authMiddleware, adminController_1.deleteStudent);
router.post('/admin/students/:id/reincorporate', authMiddleware, adminController_1.reincorporateStudent);
router.get('/admin/students/:id/observations', authMiddleware, adminController_1.getStudentObservations);
router.post('/admin/students/:id/observations', authMiddleware, adminController_1.addObservation);
// Rutas Calificaciones (Notas)
router.get('/admin/grades/filters', authMiddleware, gradesController_1.getFiltersData);
router.get('/admin/grades/sheet', authMiddleware, gradesController_1.getGradesSheet);
router.post('/admin/grades/sheet', authMiddleware, gradesController_1.saveGradesSheet);
router.post('/admin/grades/student-position', authMiddleware, gradesController_1.updateStudentPosition);
router.post('/admin/grades/bulk-position', authMiddleware, gradesController_1.bulkUpdateStudentPositions);
router.post('/admin/grades/toggle-lock', authMiddleware, gradesController_1.toggleLockAssignment);
router.get('/admin/system/audit-logs', authMiddleware, gradesController_1.getAuditLogs);
// Rutas Reportes y Configuración
router.get('/reports/grades/:studentId', authMiddleware, reportsController_1.getStudentGradesReport);
router.get('/reports/grades/level/:levelId', authMiddleware, reportsController_1.getLevelGradesReport);
router.post('/admin/settings', authMiddleware, reportsController_1.updateInstitutionalSettings);
router.post('/admin/homeroom-teacher', authMiddleware, reportsController_1.setHomeroomTeacher);
// Rutas Docente (Fase 3)
router.get('/teacher/assignments', authMiddleware, teacherController_1.getAssignments);
router.get('/teacher/grades/:assignmentId', authMiddleware, teacherController_1.getGrades);
router.post('/teacher/grades/:assignmentId/columns', authMiddleware, teacherController_1.addColumn);
router.post('/teacher/grades/save', authMiddleware, teacherController_1.saveGrade);
router.get('/debug/db', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const isPostgres = !!process.env.DATABASE_URL;
        const result = yield db_1.default.all('SELECT COUNT(*) as count FROM users');
        res.json({
            status: 'ok',
            database: isPostgres ? 'PostgreSQL (Supabase)' : 'SQLite (Local)',
            userCount: ((_a = result[0]) === null || _a === void 0 ? void 0 : _a.count) || 0,
            env: {
                hasDatabaseUrl: !!process.env.DATABASE_URL,
                nodeEnv: process.env.NODE_ENV
            }
        });
    }
    catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
}));
// Mount router for both local and Vercel environments
app.use('/api', router);
app.use('/_/backend/api', router);
app.listen(PORT, () => {
    console.log('=========================================');
    console.log(`Liceo Pro Backend v2.1 (RESTARTED)`);
    console.log(`Running on http://localhost:${PORT}`);
    console.log('=========================================');
});
exports.default = app;
