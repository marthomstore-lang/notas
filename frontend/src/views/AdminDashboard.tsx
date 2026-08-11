import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Plus, Users, BookOpen, GraduationCap, Menu, X, Printer, User, Upload, Edit2, Trash2, BarChart3, Settings, ListOrdered, PieChart, FileText, Lock, Unlock, Globe, Home, AlertTriangle, FileSpreadsheet, Download } from 'lucide-react';
import { getLinkImageUrl, footerColors } from './TeacherDashboard';
import { EnrollmentForm } from '../components/OfficialForm/EnrollmentForm';
import { OfficialEnrollmentForm } from '../components/OfficialForm/OfficialEnrollmentForm';
import { StudentWindow } from '../components/StudentWindow';
import { KinderReportForm } from '../components/Reports/KinderReportForm';
import { CoursePerformanceTable } from '../components/Reports/CoursePerformanceTable';
import { ReorderStudentsModal } from '../components/ReorderStudentsModal';
import { GradesSheet } from '../components/Grades/GradesSheet';
import { GradesOverview } from '../components/Grades/GradesOverview';
import { PrintableKinderReport } from '../components/Reports/PrintableKinderReport';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import './Dashboard.css';

const MySwal = withReactContent(Swal);

export const formatName = (name: string | undefined | null): string => {
    if (!name || name === 'No asignado' || name === '________________________') return name || '';
    
    const toCamelCase = (str: string) => {
        return str.toLowerCase().split(' ').map(word => {
            if (!word) return '';
            return word.charAt(0).toUpperCase() + word.slice(1);
        }).join(' ');
    };
    
    return toCamelCase(name);
};

export const AdminDashboard = () => {
    const { user, logout, token } = useAuth();
    const isVisita = user?.role === 'Visita';
    const [activeTab, setActiveTab] = useState<'home' | 'config' | 'students' | 'grades' | 'overview' | 'audit' | 'profile' | 'reports'>('home');
    const [configSubTab, setConfigSubTab] = useState<'teachers' | 'courses' | 'subjects' | 'assignments' | 'homeroom' | 'subject_order' | 'templates' | 'grades_lock' | 'external_links'>(() => {
        const saved = localStorage.getItem('adminConfigSubTab');
        return (['teachers', 'courses', 'subjects', 'assignments', 'homeroom', 'subject_order', 'templates', 'grades_lock', 'external_links'].includes(saved as string)) ? (saved as any) : 'teachers';
    });
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);

    const handleNavClick = (
        tab: 'home' | 'config' | 'students' | 'grades' | 'overview' | 'audit' | 'profile' | 'reports', 
        subTab?: 'teachers' | 'courses' | 'subjects' | 'assignments' | 'homeroom' | 'subject_order' | 'templates' | 'grades_lock' | 'external_links'
    ) => {
        setActiveTab(tab);
        if (subTab) setConfigSubTab(subTab);
        if (window.innerWidth < 768) {
            setIsSidebarOpen(false);
        }
    };

    useEffect(() => {
        localStorage.setItem('adminConfigSubTab', configSubTab);
    }, [configSubTab]);
    
    // Data states
    const [teachers, setTeachers] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [levels, setLevels] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [showEnrollmentForm, setShowEnrollmentForm] = useState(false);
    const [printingStudentData, setPrintingStudentData] = useState<any>(null);
    const [selectedStudentForObs, setSelectedStudentForObs] = useState<any>(null);
    const [observations, setObservations] = useState<any[]>([]);
    const [newObs, setNewObs] = useState({ content: '', type: 'Positive' });
    const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);
    const [showReorderModal, setShowReorderModal] = useState(false);
    const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>(() => {
        return localStorage.getItem('adminStudentLevelFilter') || '';
    });

    useEffect(() => {
        localStorage.setItem('adminStudentLevelFilter', selectedLevelFilter);
    }, [selectedLevelFilter]);
    const [isUploading, setIsUploading] = useState(false);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [auditFilters, setAuditFilters] = useState({ teacher: '', action: '' });
    const [subjectSearchQuery, setSubjectSearchQuery] = useState('');
    const [subjectLevelFilter, setSubjectLevelFilter] = useState('');
    const [assignmentTeacherFilter, setAssignmentTeacherFilter] = useState('');
    const [assignmentLevelFilter, setAssignmentLevelFilter] = useState('');
    const [reportTemplates, setReportTemplates] = useState<any[]>([]);
    const [selectedStudentReport, setSelectedStudentReport] = useState<string | null>(null);
    const [reportsLevelId, setReportsLevelId] = useState<string>('');
    const [reportsSemester, setReportsSemester] = useState(1);
    const [levelReports, setLevelReports] = useState<any[]>([]);
    const [levelTemplate, setLevelTemplate] = useState<any>(null);
    const [isPrintingAll, setIsPrintingAll] = useState(false);
    const [externalLinks, setExternalLinks] = useState<any[]>([]);

    // States for Grades Locks
    const [globalLock, setGlobalLock] = useState<boolean>(false);
    const [levelsLocksStatus, setLevelsLocksStatus] = useState<any[]>([]);
    const [locksPeriod, setLocksPeriod] = useState<string>('1er Semestre');
    const [locksYear, setLocksYear] = useState<number>(2026);
    const [locksLoading, setLocksLoading] = useState<boolean>(false);

    // States and handlers for detailed subjects lock modal
    const [selectedLevelForLocksDetail, setSelectedLevelForLocksDetail] = useState<{ id: number, name: string } | null>(null);
    const [levelLocksDetail, setLevelLocksDetail] = useState<any[]>([]);
    const [locksDetailLoading, setLocksDetailLoading] = useState<boolean>(false);

    const fetchLevelLocksDetail = async (levelId: number) => {
        if (!token) return;
        setLocksDetailLoading(true);
        try {
            const res = await fetch(`/_/backend/api/admin/grades/locks/level/${levelId}?period=${encodeURIComponent(locksPeriod)}&year=${locksYear}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setLevelLocksDetail(data);
            }
        } catch (err) {
            console.error("Error fetching level locks detail:", err);
        } finally {
            setLocksDetailLoading(false);
        }
    };

    const handleViewLevelSubjectsLocks = (levelId: number, levelName: string) => {
        setSelectedLevelForLocksDetail({ id: levelId, name: levelName });
        fetchLevelLocksDetail(levelId);
    };

    const handleToggleSubjectLock = async (subjectId: number, currentLocked: boolean) => {
        if (isVisita || !selectedLevelForLocksDetail) return;
        const shouldLock = !currentLocked;
        
        try {
            const res = await fetch('/_/backend/api/admin/grades/toggle-lock', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    levelId: selectedLevelForLocksDetail.id, 
                    subjectId, 
                    academicYear: locksYear, 
                    period: locksPeriod, 
                    lock: shouldLock 
                })
            });
            if (res.ok) {
                MySwal.fire({
                    icon: 'success',
                    title: shouldLock ? 'Asignatura Bloqueada' : 'Asignatura Desbloqueada',
                    text: `Se actualizó el estado de la asignatura correctamente.`,
                    timer: 1500,
                    showConfirmButton: false
                });
                fetchLevelLocksDetail(selectedLevelForLocksDetail.id);
                fetchLocksStatus();
            } else {
                const err = await res.json();
                MySwal.fire('Error', err.error || 'No se pudo actualizar el bloqueo', 'error');
            }
        } catch (err) {
            MySwal.fire('Error', 'Error de conexión', 'error');
        }
    };

    const fetchLocksStatus = async () => {
        if (!token) return;
        setLocksLoading(true);
        try {
            const res = await fetch(`/_/backend/api/admin/grades/locks/status?period=${encodeURIComponent(locksPeriod)}&year=${locksYear}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setGlobalLock(data.globalLock);
                const levelOrder = [
                    'Pre-Kinder', 'Kínder', 
                    '1° Básico', '2° Básico', '3° Básico', '4° Básico', 
                    '5° Básico', '6° Básico', '7° Básico', '8° Básico',
                    '1° Medio', '2° Medio A', '2° Medio B',
                    '3° Mecánica', '3° Medio Párvulo', 
                    '4° Mecánica', '4° Medio Párvulo',
                    'Taller Laboral'
                ];
                const sortedLevelsLocks = (data.levelsStatus || [])
                    .filter((l: any) => levelOrder.includes(l.name))
                    .sort((a: any, b: any) => levelOrder.indexOf(a.name) - levelOrder.indexOf(b.name));
                setLevelsLocksStatus(sortedLevelsLocks);
            }
        } catch (err) {
            console.error("Error fetching locks status:", err);
        } finally {
            setLocksLoading(false);
        }
    };

    const handleToggleGlobalLock = async () => {
        if (isVisita) return;
        const actionText = globalLock ? 'desbloquear' : 'bloquear';
        const confirmText = globalLock ? 'Esto permitirá el ingreso de notas de forma predeterminada.' : 'Esto bloqueará el ingreso de notas para todos los cursos del liceo.';
        
        const result = await MySwal.fire({
            title: `¿Confirmas ${actionText} todas las notas?`,
            text: confirmText,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: globalLock ? '#10b981' : '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: globalLock ? 'Sí, desbloquear todo' : 'Sí, bloquear todo',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                const res = await fetch('/_/backend/api/admin/grades/locks/global', {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ lock: !globalLock })
                });
                if (res.ok) {
                    MySwal.fire({
                        icon: 'success',
                        title: globalLock ? 'Notas Desbloqueadas' : 'Notas Bloqueadas',
                        text: `Se ha realizado el cambio de bloqueo global correctamente.`,
                        timer: 2000,
                        showConfirmButton: false
                    });
                    fetchLocksStatus();
                } else {
                    const err = await res.json();
                    MySwal.fire('Error', err.error || 'No se pudo actualizar el bloqueo', 'error');
                }
            } catch (err) {
                MySwal.fire('Error', 'Error de conexión', 'error');
            }
        }
    };

    const handleToggleLevelLock = async (levelId: number, currentStatus: string) => {
        if (isVisita) return;
        const shouldLock = !(currentStatus === 'Locked' || currentStatus === 'Partially Locked');
        const actionText = shouldLock ? 'bloquear' : 'desbloquear';
        
        const result = await MySwal.fire({
            title: `¿Confirmas ${actionText} el curso?`,
            text: `Esto aplicará el estado de ${actionText} a todas las asignaturas de este curso.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: shouldLock ? '#ef4444' : '#10b981',
            cancelButtonColor: '#64748b',
            confirmButtonText: shouldLock ? 'Sí, bloquear curso' : 'Sí, desbloquear curso',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                const res = await fetch('/_/backend/api/admin/grades/locks/level', {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        levelId, 
                        lock: shouldLock, 
                        period: locksPeriod, 
                        year: locksYear 
                    })
                });
                if (res.ok) {
                    MySwal.fire({
                        icon: 'success',
                        title: shouldLock ? 'Curso Bloqueado' : 'Curso Desbloqueado',
                        text: `Se actualizó el estado del curso correctamente.`,
                        timer: 2000,
                        showConfirmButton: false
                    });
                    fetchLocksStatus();
                } else {
                    const err = await res.json();
                    MySwal.fire('Error', err.error || 'No se pudo actualizar el bloqueo del curso', 'error');
                }
            } catch (err) {
                MySwal.fire('Error', 'Error de conexión', 'error');
            }
        }
    };

    useEffect(() => {
        if (token && activeTab === 'config' && configSubTab === 'grades_lock') {
            fetchLocksStatus();
        }
    }, [token, activeTab, configSubTab, locksPeriod, locksYear]);

    const fetchLevelReports = async (levelId: number | string, sem: number) => {
        try {
            const res = await fetch(`/_/backend/api/reports/personality/level/${levelId}/${sem}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setLevelReports(data.reports || []);
                setLevelTemplate(data.template || null);
            }
        } catch (err) {
            console.error("Error fetching level reports:", err);
        }
    };

    const handlePrintAll = () => {
        setIsPrintingAll(true);
        setTimeout(() => {
            window.print();
            setIsPrintingAll(false);
        }, 500);
    };

    useEffect(() => {
        if (token && reportsLevelId) {
            fetchLevelReports(reportsLevelId, reportsSemester);
        }
    }, [token, reportsLevelId, reportsSemester]);

    const getStudentProgress = (studentId: string) => {
        if (!levelTemplate) return 0;
        const report = levelReports.find(r => r.student_id === studentId);
        if (!report) return 0;
        
        const evaluationData = typeof report.evaluation_data === 'string' ? JSON.parse(report.evaluation_data) : (report.evaluation_data || {});
        let totalOAs = 0;
        let filledOAs = 0;
        
        const structure = typeof levelTemplate.structure_json === 'string' ? JSON.parse(levelTemplate.structure_json) : levelTemplate.structure_json;
        if (structure && Array.isArray(structure)) {
            structure.forEach(ambito => {
                if (ambito.nucleos && Array.isArray(ambito.nucleos)) {
                    ambito.nucleos.forEach((nucleo: any) => {
                        if (nucleo.oas && Array.isArray(nucleo.oas)) {
                            totalOAs += nucleo.oas.length;
                            nucleo.oas.forEach((oa: any) => {
                                if (evaluationData[oa.id]) {
                                    filledOAs += 1;
                                }
                            });
                        }
                    });
                }
            });
        }
        return totalOAs > 0 ? Math.round((filledOAs / totalOAs) * 100) : 0;
    };
    // Subject ordering states
    const [selectedLevelIdOrder, setSelectedLevelIdOrder] = useState<string>('');
    const [orderedSubjects, setOrderedSubjects] = useState<any[]>([]);
    const [isLoadingOrder, setIsLoadingOrder] = useState<boolean>(false);

    useEffect(() => {
        const fetchSubjectOrder = async () => {
            if (!selectedLevelIdOrder || !token) {
                setOrderedSubjects([]);
                return;
            }
            setIsLoadingOrder(true);
            try {
                // Get all subjects assigned to this level from assignments
                const levelAssignments = assignments.filter(a => String(a.level_id) === String(selectedLevelIdOrder));
                // Get unique subjects
                const uniqueSubjectsInLevel = Array.from(
                    new Map(levelAssignments.map(a => [a.subject_id, { id: a.subject_id, name: a.subject_name }])).values()
                );

                // Fetch custom order from backend
                const res = await fetch(`/_/backend/api/admin/settings/subject-order/${selectedLevelIdOrder}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    const savedOrder = data.subjectOrder || [];
                    
                    // Sort unique subjects by custom order position
                    uniqueSubjectsInLevel.sort((a, b) => {
                        const idxA = savedOrder.indexOf(Number(a.id));
                        const idxB = savedOrder.indexOf(Number(b.id));
                        if (idxA === -1 && idxB === -1) return 0;
                        if (idxA === -1) return 1;
                        if (idxB === -1) return -1;
                        return idxA - idxB;
                    });
                }
                setOrderedSubjects(uniqueSubjectsInLevel);
            } catch (err) {
                console.error("Error fetching subject order:", err);
            } finally {
                setIsLoadingOrder(false);
            }
        };

        fetchSubjectOrder();
    }, [selectedLevelIdOrder, assignments, token]);

    // Group teacher assignments by level and subject to support co-teaching (multiple teachers per subject)
    const groupedAssignments = React.useMemo(() => {
        const groups: any[] = [];
        assignments.forEach((a: any) => {
            const key = `${a.level_id}_${a.subject_id}`;
            const existing = groups.find(g => `${g.level_id}_${g.subject_id}` === key);
            if (existing) {
                existing.teachers.push({ id: a.teacher_id, name: a.teacher_name });
                existing.ids.push(a.id);
            } else {
                groups.push({
                    ...a,
                    teachers: [{ id: a.teacher_id, name: a.teacher_name }],
                    ids: [a.id]
                });
            }
        });
        return groups;
    }, [assignments]);

    const filteredGroupedAssignments = React.useMemo(() => {
        return groupedAssignments.filter(a => {
            const matchLevel = !assignmentLevelFilter || String(a.level_id) === String(assignmentLevelFilter);
            const matchTeacher = !assignmentTeacherFilter || a.teachers.some((t: any) => String(t.id) === String(assignmentTeacherFilter));
            return matchLevel && matchTeacher;
        });
    }, [groupedAssignments, assignmentLevelFilter, assignmentTeacherFilter]);

    const handleMoveSubject = (index: number, direction: 'up' | 'down') => {
        const newSubjects = [...orderedSubjects];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        
        if (targetIndex >= 0 && targetIndex < newSubjects.length) {
            // Swap
            const temp = newSubjects[index];
            newSubjects[index] = newSubjects[targetIndex];
            newSubjects[targetIndex] = temp;
            setOrderedSubjects(newSubjects);
        }
    };

    const handleSaveSubjectOrder = async () => {
        if (!selectedLevelIdOrder || orderedSubjects.length === 0) return;
        
        try {
            const subjectIds = orderedSubjects.map(s => Number(s.id));
            const res = await fetch('/_/backend/api/admin/settings/subject-order', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    levelId: Number(selectedLevelIdOrder),
                    subjectOrder: subjectIds
                })
            });
            
            if (res.ok) {
                MySwal.fire({
                    icon: 'success',
                    title: 'Guardado',
                    text: 'El orden de las asignaturas ha sido guardado exitosamente.',
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                const err = await res.json();
                MySwal.fire('Error', err.error || 'No se pudo guardar el orden', 'error');
            }
        } catch (error) {
            MySwal.fire('Error', 'Error de conexión al servidor', 'error');
        }
    };
    const fileInputRef = useRef<HTMLInputElement>(null);
    const fetchData = async () => {
        if (!token) return;
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            
            const [tRes, sRes, lRes, stuRes, aRes] = await Promise.all([
                fetch('/_/backend/api/admin/teachers', { headers }),
                fetch('/_/backend/api/admin/subjects', { headers }),
                fetch('/_/backend/api/admin/levels', { headers }),
                fetch('/_/backend/api/admin/students', { headers }),
                fetch('/_/backend/api/admin/assignments', { headers })
            ]);
            
            const handleRes = async (res: Response, label: string) => {
                if (!res.ok) {
                    const text = await res.text();
                    console.error(`${label} fetch failed:`, text);
                    return [];
                }
                const data = await res.json();
                return Array.isArray(data) ? data : [];
            };

            const teachersData = await handleRes(tRes, 'Teachers');
            const subjectsData = await handleRes(sRes, 'Subjects');
            const levelsData = await handleRes(lRes, 'Levels');
            const stuData = await handleRes(stuRes, 'Students');
            const assignmentsData = await handleRes(aRes, 'Assignments');
            
            try {
                const rtRes = await fetch('/_/backend/api/admin/report-templates', { headers });
                if (rtRes.ok) {
                    setReportTemplates(await rtRes.json());
                }
            } catch (err) {
                console.error("Error fetching report templates:", err);
            }

            try {
                const linksRes = await fetch('/_/backend/api/external-links', { headers });
                if (linksRes.ok) {
                    setExternalLinks(await linksRes.json());
                }
            } catch (err) {
                console.error("Error fetching external links:", err);
            }

            // Orden y Filtrado de Niveles
            const levelOrder = [
                'Pre-Kinder', 'Kínder', 
                '1° Básico', '2° Básico', '3° Básico', '4° Básico', 
                '5° Básico', '6° Básico', '7° Básico', '8° Básico',
                '1° Medio', '2° Medio A', '2° Medio B',
                '3° Mecánica', '3° Medio Párvulo', 
                '4° Mecánica', '4° Medio Párvulo',
                'Taller Laboral'
            ];

            const sortedLevels = levelsData
                .filter(l => levelOrder.includes(l.name))
                .sort((a, b) => levelOrder.indexOf(a.name) - levelOrder.indexOf(b.name));

            setTeachers(teachersData);
            setSubjects(subjectsData);
            setLevels(sortedLevels);
            setStudents(stuData);
            setAssignments(assignmentsData);

            if (activeTab === 'audit') {
                try {
                    const aLogRes = await fetch('/_/backend/api/admin/system/audit-logs', { headers });
                    if (aLogRes.ok) {
                        const logs = await aLogRes.json();
                        setAuditLogs(logs);
                    } else {
                        console.error("Audit logs fetch failed:", aLogRes.status);
                    }
                } catch (err) {
                    console.error("Error fetching audit logs:", err);
                }
            }
        } catch (error) {
            console.error("Error in fetchData:", error);
        }
    };

    const handleListNumberChange = async (studentId: string, value: string) => {
        const num = parseInt(value);
        if (isNaN(num)) {
            // Update local state to allow clearing the input
            setStudents(students.map(s => s.id === studentId ? { ...s, list_number: null } : s));
            return;
        }

        // Optimistic update
        setStudents(students.map(s => s.id === studentId ? { ...s, list_number: num } : s));

        try {
            const lvl = levels.find(l => l.name === selectedLevelFilter);
            if (!lvl) return;

            await fetch('/_/backend/api/admin/grades/student-position', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    studentId, 
                    levelId: lvl.id, 
                    academicYear: 2026, 
                    newListNumber: num 
                })
            });
        } catch (error) {
            console.error("Error updating list number:", error);
        }
    };



    useEffect(() => {
        fetchData();
    }, [token, activeTab, configSubTab]);

    // Handle Forms
    const handleCreateTeacher = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const { value: formValues } = await MySwal.fire({
            title: 'Nuevo Usuario',
            html:
                '<div class="swal-form">' +
                '<label>RUT</label><input id="swal-input1" class="swal2-input" placeholder="Ej: 12345678-9">' +
                '<label>Nombre Completo</label><input id="swal-input2" class="swal2-input" placeholder="Nombre completo">' +
                '<label>Email</label><input id="swal-input3" class="swal2-input" type="email" placeholder="email@ejemplo.com">' +
                '<label>Contraseña (Opcional)</label><input id="swal-input4" class="swal2-input" type="password" placeholder="Mínimo 6 caracteres (Defecto: 123)">' +
                '<label>Rol del Usuario</label>' +
                '<select id="swal-input5" class="swal2-input">' +
                '<option value="Docente">Docente / Profesor</option>' +
                '<option value="Admin">Administrador</option>' +
                '<option value="Visita">Visita (Solo Lectura)</option>' +
                '</select>' +
                '</div>',
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Crear Usuario',
            cancelButtonText: 'Cancelar',
            didOpen: () => {
                const rutInput = document.getElementById('swal-input1') as HTMLInputElement;
                if (rutInput) {
                    rutInput.addEventListener('input', (e: any) => {
                        const val = e.target.value.replace(/[^0-9kK]/g, '');
                        if (val.length > 1) {
                            const body = val.slice(0, -1);
                            const dv = val.slice(-1).toUpperCase();
                            e.target.value = `${body}-${dv}`;
                        } else {
                            e.target.value = val;
                        }
                    });
                }
            },
            preConfirm: () => {
                return {
                    run: (document.getElementById('swal-input1') as HTMLInputElement).value,
                    name: (document.getElementById('swal-input2') as HTMLInputElement).value,
                    email: (document.getElementById('swal-input3') as HTMLInputElement).value,
                    password: (document.getElementById('swal-input4') as HTMLInputElement).value,
                    role: (document.getElementById('swal-input5') as HTMLSelectElement).value
                }
            }
        });

        if (formValues) {
            const { run, name, email, password, role } = formValues;
            if (run && name && email) {
                try {
                    const res = await fetch('/_/backend/api/admin/teachers', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ run, name, email, password, role })
                    });
                    
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Error al crear usuario');

                    fetchData();
                    MySwal.fire({
                        title: '¡Éxito!',
                        text: "Usuario creado correctamente.",
                        icon: 'success'
                    });
                } catch (error: any) {
                    console.error("Fetch error:", error);
                    MySwal.fire('Error', error.message, 'error');
                }
            }
        }
    };

    const handleCreateExternalLink = async () => {
        const { value: formValues } = await MySwal.fire({
            title: 'Agregar Enlace de Interés',
            html:
                '<div style="text-align:left; margin-bottom:8px;"><label style="font-weight:bold;">Nombre de la Plataforma/Página:</label></div>' +
                '<input id="link-name" class="swal2-input" placeholder="Ej. Google Classroom" style="margin: 0 0 16px 0; width: 100%;">' +
                '<div style="text-align:left; margin-bottom:8px;"><label style="font-weight:bold;">URL / Dirección Web:</label></div>' +
                '<input id="link-url" class="swal2-input" placeholder="Ej. https://classroom.google.com" style="margin: 0; width: 100%;">',
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const name = (document.getElementById('link-name') as HTMLInputElement).value.trim();
                let url = (document.getElementById('link-url') as HTMLInputElement).value.trim();
                
                if (!name || !url) {
                    Swal.showValidationMessage('Todos los campos son obligatorios');
                    return false;
                }
                if (!/^https?:\/\//i.test(url)) {
                    url = 'https://' + url;
                }
                return { name, url };
            }
        });

        if (formValues) {
            try {
                const res = await fetch('/_/backend/api/admin/external-links', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formValues)
                });
                if (res.ok) {
                    const data = await res.json();
                    setExternalLinks(prev => [...prev, data.link]);
                    MySwal.fire('Guardado', 'Enlace agregado con éxito', 'success');
                } else {
                    const err = await res.json();
                    MySwal.fire('Error', err.error || 'No se pudo guardar el enlace', 'error');
                }
            } catch (error) {
                MySwal.fire('Error', 'Error de conexión al servidor', 'error');
            }
        }
    };

    const handleDeleteExternalLink = async (id: string, name: string) => {
        const confirm = await MySwal.fire({
            title: '¿Eliminar enlace?',
            text: `¿Está seguro de que desea eliminar el enlace a "${name}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (confirm.isConfirmed) {
            try {
                const res = await fetch(`/_/backend/api/admin/external-links/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    setExternalLinks(prev => prev.filter(l => l.id !== id));
                    MySwal.fire('Eliminado', 'Enlace eliminado correctamente', 'success');
                } else {
                    const err = await res.json();
                    MySwal.fire('Error', err.error || 'No se pudo eliminar el enlace', 'error');
                }
            } catch (error) {
                MySwal.fire('Error', 'Error de conexión', 'error');
            }
        }
    };

    const handleEditExternalLink = async (link: { id: string; name: string; url: string }) => {
        const { value: formValues } = await MySwal.fire({
            title: 'Editar Enlace de Interés',
            html:
                '<div style="text-align:left; margin-bottom:8px;"><label style="font-weight:bold;">Nombre de la Plataforma/Página:</label></div>' +
                `<input id="link-name" class="swal2-input" placeholder="Ej. Google Classroom" value="${link.name.replace(/"/g, '&quot;')}" style="margin: 0 0 16px 0; width: 100%; font-size: 0.95rem;">` +
                '<div style="text-align:left; margin-bottom:8px;"><label style="font-weight:bold;">URL / Dirección Web:</label></div>' +
                `<input id="link-url" class="swal2-input" placeholder="Ej. https://classroom.google.com" value="${link.url.replace(/"/g, '&quot;')}" style="margin: 0; width: 100%; font-size: 0.95rem;">`,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Guardar Cambios',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const name = (document.getElementById('link-name') as HTMLInputElement).value.trim();
                let url = (document.getElementById('link-url') as HTMLInputElement).value.trim();
                
                if (!name || !url) {
                    Swal.showValidationMessage('Todos los campos son obligatorios');
                    return false;
                }
                if (!/^https?:\/\//i.test(url)) {
                    url = 'https://' + url;
                }
                return { name, url };
            }
        });

        if (formValues) {
            try {
                const res = await fetch(`/_/backend/api/admin/external-links/${link.id}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formValues)
                });
                if (res.ok) {
                    setExternalLinks(prev => prev.map(l => l.id === link.id ? { ...l, name: formValues.name, url: formValues.url } : l));
                    MySwal.fire('Guardado', 'Enlace actualizado con éxito', 'success');
                } else {
                    const err = await res.json();
                    MySwal.fire('Error', err.error || 'No se pudo actualizar el enlace', 'error');
                }
            } catch (error) {
                MySwal.fire('Error', 'Error de conexión al servidor', 'error');
            }
        }
    };

    const handleEditTeacher = async (teacher: any) => {
        const { value: formValues } = await MySwal.fire({
            title: 'Editar Usuario',
            html:
                '<div class="swal-form">' +
                `<label>Nombre Completo</label><input id="swal-input1" class="swal2-input" placeholder="Nombre" value="${teacher.name}">` +
                `<label>Email</label><input id="swal-input2" class="swal2-input" placeholder="Email" value="${teacher.email}">` +
                `<label>Contraseña Actual / Nueva</label>` +
                `<div style="position: relative;">` +
                `<input id="swal-input3" class="swal2-input" type="text" placeholder="Escribe aquí la nueva clave" value="${teacher.password_plain || ''}">` +
                `<small style="display: block; color: #64748b; margin-top: 5px;">Si el campo está vacío, la clave no se actualizará. Escribe una clave para guardarla.</small>` +
                `</div>` +
                `<label>Rol del Usuario</label>` +
                `<select id="swal-input4" class="swal2-input">` +
                `<option value="Docente" ${teacher.role === 'Docente' ? 'selected' : ''}>Docente / Profesor</option>` +
                `<option value="Admin" ${teacher.role === 'Admin' ? 'selected' : ''}>Administrador</option>` +
                `<option value="Visita" ${teacher.role === 'Visita' ? 'selected' : ''}>Visita (Solo Lectura)</option>` +
                `</select>` +
                '</div>',
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Guardar Cambios',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                return {
                    name: (document.getElementById('swal-input1') as HTMLInputElement).value,
                    email: (document.getElementById('swal-input2') as HTMLInputElement).value,
                    password: (document.getElementById('swal-input3') as HTMLInputElement).value,
                    role: (document.getElementById('swal-input4') as HTMLSelectElement).value
                }
            }
        });

        if (formValues) {
            const { name, email, password, role } = formValues;
            try {
                const res = await fetch(`/_/backend/api/admin/teachers/${teacher.id}`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password, role })
                });
                
                const data = await res.json();
                
                if (!res.ok) {
                    throw new Error(data.error || 'Error al actualizar');
                }
                
                fetchData();
                MySwal.fire('Éxito', 'Usuario actualizado correctamente', 'success');
            } catch (error: any) {
                console.error("Fetch error:", error);
                MySwal.fire('Error', error.message, 'error');
            }
        }
    };

    const handleDeleteTeacher = async (id: string) => {
        console.log('Deleting teacher with ID:', id);
        const result = await MySwal.fire({
            title: '¿Estás seguro?',
            text: "No podrás revertir esto y el docente no debe tener cursos asignados.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            const res = await fetch(`/_/backend/api/admin/teachers/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                MySwal.fire('Eliminado', 'El docente ha sido eliminado.', 'success');
                fetchData();
            } else {
                MySwal.fire('Error', data.error || 'Error al eliminar', 'error');
            }
        }
    };

    const handleCreateSubject = async () => {
        const otherSubjectsOptions = subjects.map((s: any) => `<option value="${s.id}">${s.name}</option>`).join('');

        const { value: formValues } = await MySwal.fire({
            title: 'Nueva Asignatura Global',
            html: `
                <div style="text-align: left; display: flex; flex-direction: column; gap: 14px;">
                    <div>
                        <label style="font-weight: 600; font-size: 0.9rem;">Nombre de la Asignatura *</label>
                        <input id="swal-subject-name" class="swal2-input" placeholder="Ej: Física" style="width: 100%; margin-top: 5px;" />
                    </div>
                    <div>
                        <label style="font-weight: 600; font-size: 0.9rem;">Tributa a Asignatura Padre</label>
                        <select id="swal-subject-tributes" class="swal2-input" style="width: 100%; margin-top: 5px;">
                            <option value="">Ninguna (Independiente)</option>
                            ${otherSubjectsOptions}
                        </select>
                        <small style="color: #64748b; font-size: 0.8rem; display: block; margin-top: 4px;">
                            Ejemplo: Física, Química y Biología tributan a Ciencias Naturales.
                        </small>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 5px;">
                        <label style="display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 0.9rem; cursor: pointer;">
                            <input type="checkbox" id="swal-subject-gpa" checked style="width: 18px; height: 18px;" />
                            ¿Influye en el Promedio General del Alumno?
                        </label>
                        <small style="color: #64748b; font-size: 0.8rem; margin-left: 26px;">
                            Desmarcar si esta asignatura debe descartarse del cálculo del promedio general.
                        </small>

                        <label style="display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 0.9rem; cursor: pointer; margin-top: 8px;">
                            <input type="checkbox" id="swal-subject-qual" style="width: 18px; height: 18px;" />
                            ¿Evaluación Cualitativa (MB, B, S, I)?
                        </label>
                    </div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Crear',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const name = (document.getElementById('swal-subject-name') as HTMLInputElement).value;
                const tributes_to_subject_id = (document.getElementById('swal-subject-tributes') as HTMLSelectElement).value;
                const influences_gpa = (document.getElementById('swal-subject-gpa') as HTMLInputElement).checked;
                const is_qualitative = (document.getElementById('swal-subject-qual') as HTMLInputElement).checked;

                if (!name.trim()) {
                    Swal.showValidationMessage('Por favor ingrese el nombre de la asignatura');
                    return false;
                }
                return {
                    name: name.trim(),
                    tributes_to_subject_id: tributes_to_subject_id ? parseInt(tributes_to_subject_id, 10) : null,
                    influences_gpa,
                    is_qualitative
                };
            }
        });

        if (formValues) {
            const res = await fetch('/_/backend/api/admin/subjects', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(formValues)
            });
            if (res.ok) {
                fetchData();
                MySwal.fire('Éxito', 'Asignatura creada correctamente', 'success');
            } else {
                const err = await res.json();
                MySwal.fire('Error', err.error || 'Error al crear la asignatura', 'error');
            }
        }
    };

    const handleEditSubject = async (subject: any) => {
        const otherSubjects = subjects.filter((s: any) => String(s.id) !== String(subject.id));
        const otherSubjectsOptions = otherSubjects.map((s: any) => 
            `<option value="${s.id}" ${String(s.id) === String(subject.tributes_to_subject_id) ? 'selected' : ''}>${s.name}</option>`
        ).join('');

        const isGpaChecked = subject.influences_gpa === undefined || subject.influences_gpa === null || subject.influences_gpa === true || subject.influences_gpa === 1 || subject.influences_gpa === '1';
        const isQualChecked = subject.is_qualitative === true || subject.is_qualitative === 1 || subject.is_qualitative === '1';

        const { value: formValues } = await MySwal.fire({
            title: 'Editar Asignatura Global',
            html: `
                <div style="text-align: left; display: flex; flex-direction: column; gap: 14px;">
                    <div>
                        <label style="font-weight: 600; font-size: 0.9rem;">Nombre de la Asignatura *</label>
                        <input id="swal-subject-name" class="swal2-input" value="${subject.name.replace(/"/g, '&quot;')}" style="width: 100%; margin-top: 5px;" />
                    </div>
                    <div>
                        <label style="font-weight: 600; font-size: 0.9rem;">Tributa a Asignatura Padre</label>
                        <select id="swal-subject-tributes" class="swal2-input" style="width: 100%; margin-top: 5px;">
                            <option value="">Ninguna (Independiente)</option>
                            ${otherSubjectsOptions}
                        </select>
                        <small style="color: #64748b; font-size: 0.8rem; display: block; margin-top: 4px;">
                            Ejemplo: Física, Química y Biología tributan a Ciencias Naturales.
                        </small>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 5px;">
                        <label style="display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 0.9rem; cursor: pointer;">
                            <input type="checkbox" id="swal-subject-gpa" ${isGpaChecked ? 'checked' : ''} style="width: 18px; height: 18px;" />
                            ¿Influye en el Promedio General del Alumno?
                        </label>
                        <small style="color: #64748b; font-size: 0.8rem; margin-left: 26px;">
                            Desmarcar si esta asignatura debe descartarse del cálculo del promedio general.
                        </small>

                        <label style="display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 0.9rem; cursor: pointer; margin-top: 8px;">
                            <input type="checkbox" id="swal-subject-qual" ${isQualChecked ? 'checked' : ''} style="width: 18px; height: 18px;" />
                            ¿Evaluación Cualitativa (MB, B, S, I)?
                        </label>
                    </div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const name = (document.getElementById('swal-subject-name') as HTMLInputElement).value;
                const tributes_to_subject_id = (document.getElementById('swal-subject-tributes') as HTMLSelectElement).value;
                const influences_gpa = (document.getElementById('swal-subject-gpa') as HTMLInputElement).checked;
                const is_qualitative = (document.getElementById('swal-subject-qual') as HTMLInputElement).checked;

                if (!name.trim()) {
                    Swal.showValidationMessage('Por favor ingrese el nombre de la asignatura');
                    return false;
                }
                return {
                    name: name.trim(),
                    tributes_to_subject_id: tributes_to_subject_id ? parseInt(tributes_to_subject_id, 10) : null,
                    influences_gpa,
                    is_qualitative
                };
            }
        });

        if (formValues) {
            const res = await fetch(`/_/backend/api/admin/subjects/${subject.id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(formValues)
            });
            if (res.ok) {
                fetchData();
                MySwal.fire('Actualizado', 'La asignatura ha sido actualizada.', 'success');
            } else {
                const err = await res.json();
                MySwal.fire('Error', err.error || 'Error al actualizar', 'error');
            }
        }
    };

    const handleDeleteSubject = async (subject: any) => {
        try {
            const checkRes = await fetch(`/_/backend/api/admin/subjects/${subject.id}/check-delete`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!checkRes.ok) throw new Error("Error checking grades");
            const checkData = await checkRes.json();

            let warningHtml = '¿Está seguro de que desea eliminar esta asignatura?';
            if (checkData.hasGrades) {
                warningHtml = `
                    <div style="text-align: left;">
                        <p style="color: #d97706; font-weight: bold; margin-bottom: 10px;">
                            ⚠️ ATENCIÓN: Esta asignatura tiene calificaciones registradas.
                        </p>
                        <p>Si la elimina, se borrarán de forma permanente todas las notas asociadas.</p>
                        <p style="font-weight: 600; margin-top: 10px;">Cursos afectados:</p>
                        <ul style="padding-left: 20px; margin-top: 5px;">
                            ${checkData.levels.map((lvl: string) => `<li>${lvl}</li>`).join('')}
                        </ul>
                    </div>
                `;
            }

            const result = await MySwal.fire({
                title: checkData.hasGrades ? '¡Advertencia de Calificaciones!' : 'Eliminar Asignatura',
                html: warningHtml,
                icon: checkData.hasGrades ? 'warning' : 'question',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#64748b',
                confirmButtonText: 'Sí, eliminar',
                cancelButtonText: 'Cancelar'
            });

            if (result.isConfirmed) {
                const deleteRes = await fetch(`/_/backend/api/admin/subjects/${subject.id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (deleteRes.ok) {
                    MySwal.fire('Eliminado', 'La asignatura y todos sus datos relacionados han sido eliminados.', 'success');
                    fetchData();
                } else {
                    const err = await deleteRes.json();
                    MySwal.fire('Error', err.error || 'Error al eliminar', 'error');
                }
            }
        } catch (error) {
            console.error("Error deleting subject:", error);
            MySwal.fire('Error', 'No se pudo completar la operación.', 'error');
        }
    };

    const handleConfigureLevelSubjects = async (level: any) => {
        try {
            const res = await fetch(`/_/backend/api/admin/levels/${level.id}/subject-settings`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const settings = res.ok ? await res.json() : [];

            // Get subjects assigned to this level from assignments
            const levelAssignments = assignments.filter((a: any) => String(a.level_id) === String(level.id));
            const levelSubjectIds = Array.from(new Set(levelAssignments.map((a: any) => String(a.subject_id))));
            
            let courseSubjects = subjects.filter((s: any) => levelSubjectIds.includes(String(s.id)));

            // Include parent subjects if any assigned subject tributes to them
            const parentIds = courseSubjects.map((s: any) => s.tributes_to_subject_id).filter(Boolean);
            for (const pId of parentIds) {
                if (!courseSubjects.some((s: any) => String(s.id) === String(pId))) {
                    const parentSub = subjects.find((s: any) => String(s.id) === String(pId));
                    if (parentSub) courseSubjects.push(parentSub);
                }
            }

            if (courseSubjects.length === 0) {
                courseSubjects = subjects;
            }

            let htmlForm = `
                <div style="text-align: left; max-height: 450px; overflow-y: auto; padding-right: 5px;">
                    <p style="color: #64748b; font-size: 0.85rem; margin-bottom: 15px;">
                        Define si una asignatura influye en el promedio o tributa a otra <strong>específicamente para ${level.name}</strong> (${courseSubjects.length} asignaturas asignadas al curso).
                    </p>
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                        <thead>
                            <tr style="border-bottom: 2px solid #e2e8f0; text-align: left;">
                                <th style="padding: 6px;">Asignatura</th>
                                <th style="padding: 6px;">Promedio del Curso</th>
                                <th style="padding: 6px;">Tributación Curso</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            courseSubjects.forEach((s: any) => {
                const setting = settings.find((set: any) => String(set.subject_id) === String(s.id));
                const infGpa = setting ? (setting.influences_gpa === true || setting.influences_gpa === 1 || setting.influences_gpa === '1') : (s.influences_gpa === undefined || s.influences_gpa === true || s.influences_gpa === 1 || s.influences_gpa === '1');
                const tribId = setting ? (setting.tributes_to_subject_id || '') : (s.tributes_to_subject_id || '');

                const otherSubjectsOptions = courseSubjects
                    .filter((other: any) => String(other.id) !== String(s.id))
                    .map((other: any) => `<option value="${other.id}" ${String(other.id) === String(tribId) ? 'selected' : ''}>${other.name}</option>`)
                    .join('');

                htmlForm += `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 8px; font-weight: 600;">${s.name}</td>
                        <td style="padding: 8px;">
                            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                                <input type="checkbox" id="lvl-sub-gpa-${s.id}" ${infGpa ? 'checked' : ''} />
                                Influye
                            </label>
                        </td>
                        <td style="padding: 8px;">
                            <select id="lvl-sub-trib-${s.id}" style="padding: 4px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.8rem; width: 100%;">
                                <option value="">Independiente</option>
                                ${otherSubjectsOptions}
                            </select>
                        </td>
                    </tr>
                `;
            });

            htmlForm += `
                        </tbody>
                    </table>
                </div>
            `;

            const { isConfirmed } = await MySwal.fire({
                title: `Reglas de Asignaturas: ${level.name}`,
                html: htmlForm,
                width: '650px',
                showCancelButton: true,
                confirmButtonText: 'Guardar Reglas',
                cancelButtonText: 'Cancelar',
                preConfirm: async () => {
                    for (const s of courseSubjects) {
                        const infGpaEl = document.getElementById(`lvl-sub-gpa-${s.id}`) as HTMLInputElement;
                        const tribEl = document.getElementById(`lvl-sub-trib-${s.id}`) as HTMLSelectElement;

                        if (infGpaEl && tribEl) {
                            const influences_gpa = infGpaEl.checked;
                            const tributes_to_subject_id = tribEl.value ? parseInt(tribEl.value, 10) : null;

                            await fetch(`/_/backend/api/admin/levels/${level.id}/subject-settings`, {
                                method: 'POST',
                                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    subjectId: s.id,
                                    influences_gpa,
                                    tributes_to_subject_id
                                })
                            });
                        }
                    }
                    return true;
                }
            });

            if (isConfirmed) {
                MySwal.fire('Guardado', `Reglas del curso ${level.name} actualizadas correctamente.`, 'success');
            }
        } catch (err: any) {
            console.error("Error en handleConfigureLevelSubjects:", err);
            MySwal.fire('Error', 'No se pudieron cargar o guardar las reglas del curso', 'error');
        }
    };

    const handleConfigureStudentExemptions = async (student: any) => {
        try {
            const res = await fetch(`/_/backend/api/admin/students/${student.id}/exemptions?year=2026`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const exemptions = res.ok ? await res.json() : [];

            // Find level for student
            const stuLevel = levels.find((l: any) => String(l.name) === String(student.level_name) || String(l.id) === String(student.level_id));
            const levelId = stuLevel ? stuLevel.id : student.level_id;

            const levelAssignments = assignments.filter((a: any) => String(a.level_id) === String(levelId));
            const levelSubjectIds = Array.from(new Set(levelAssignments.map((a: any) => String(a.subject_id))));
            
            let studentCourseSubjects = subjects.filter((s: any) => levelSubjectIds.includes(String(s.id)));

            const parentIds = studentCourseSubjects.map((s: any) => s.tributes_to_subject_id).filter(Boolean);
            for (const pId of parentIds) {
                if (!studentCourseSubjects.some((s: any) => String(s.id) === String(pId))) {
                    const parentSub = subjects.find((s: any) => String(s.id) === String(pId));
                    if (parentSub) studentCourseSubjects.push(parentSub);
                }
            }

            if (studentCourseSubjects.length === 0) {
                studentCourseSubjects = subjects;
            }

            let htmlForm = `
                <div style="text-align: left; max-height: 450px; overflow-y: auto;">
                    <p style="color: #64748b; font-size: 0.85rem; margin-bottom: 15px;">
                        Marca las asignaturas asignadas a <strong>${student.level_name || 'su curso'}</strong> (${studentCourseSubjects.length} asignaturas) de las que <strong>${formatName(student.full_name || student.name)}</strong> está eximido o descartado en su promedio general.
                    </p>
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                        <thead>
                            <tr style="border-bottom: 2px solid #e2e8f0; text-align: left;">
                                <th style="padding: 6px;">Asignatura</th>
                                <th style="padding: 6px;">Promedio Alumno</th>
                                <th style="padding: 6px;">Motivo Exención</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            studentCourseSubjects.forEach((s: any) => {
                const ex = exemptions.find((e: any) => String(e.subject_id) === String(s.id));
                const isExempt = ex ? (ex.influences_gpa === false || ex.influences_gpa === 0 || ex.influences_gpa === '0' || ex.influences_gpa === 'false') : false;
                const reasonVal = ex ? (ex.reason || '') : '';

                htmlForm += `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 8px; font-weight: 600;">${s.name}</td>
                        <td style="padding: 8px;">
                            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; color: ${isExempt ? '#dc2626' : '#1e293b'}; font-weight: ${isExempt ? '700' : 'normal'};">
                                <input type="checkbox" id="stu-ex-check-${s.id}" ${isExempt ? 'checked' : ''} />
                                Eximido (No Promedia)
                            </label>
                        </td>
                        <td style="padding: 8px;">
                            <input type="text" id="stu-ex-reason-${s.id}" value="${reasonVal.replace(/"/g, '&quot;')}" placeholder="Ej. Exención Mineduc" style="padding: 4px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.8rem; width: 100%;" />
                        </td>
                    </tr>
                `;
            });

            htmlForm += `
                        </tbody>
                    </table>
                </div>
            `;

            const { isConfirmed } = await MySwal.fire({
                title: `Exenciones de Alumno: ${formatName(student.full_name || student.name)}`,
                html: htmlForm,
                width: '650px',
                showCancelButton: true,
                confirmButtonText: 'Guardar Exenciones',
                cancelButtonText: 'Cancelar',
                preConfirm: async () => {
                    for (const s of studentCourseSubjects) {
                        const checkEl = document.getElementById(`stu-ex-check-${s.id}`) as HTMLInputElement;
                        const reasonEl = document.getElementById(`stu-ex-reason-${s.id}`) as HTMLInputElement;

                        if (checkEl) {
                            if (checkEl.checked) {
                                await fetch(`/_/backend/api/admin/students/${student.id}/exemptions`, {
                                    method: 'POST',
                                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        subjectId: s.id,
                                        academic_year: 2026,
                                        influences_gpa: false,
                                        reason: reasonEl ? reasonEl.value : ''
                                    })
                                });
                            } else {
                                await fetch(`/_/backend/api/admin/students/${student.id}/exemptions/${s.id}?year=2026`, {
                                    method: 'DELETE',
                                    headers: { 'Authorization': `Bearer ${token}` }
                                });
                            }
                        }
                    }
                    return true;
                }
            });

            if (isConfirmed) {
                fetchData();
                MySwal.fire('Guardado', 'Exenciones del alumno actualizadas correctamente.', 'success');
            }
        } catch (err: any) {
            console.error("Error en handleConfigureStudentExemptions:", err);
            MySwal.fire('Error', 'No se pudieron guardar las exenciones del alumno', 'error');
        }
    };

    const handleAssign = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const teacherId1 = form.teacherId.value;
        const teacherId2 = form.teacherId2.value;
        const levelId = form.levelId.value;
        const subjectId = form.subjectId.value;
        const academicYear = new Date().getFullYear();

        if (teacherId2 && teacherId1 === teacherId2) {
            MySwal.fire('Error', "El Docente 1 y el Docente 2 deben ser diferentes.", 'error');
            return;
        }

        try {
            // Save Teacher 1
            const res1 = await fetch('/_/backend/api/admin/assignments', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ teacherId: teacherId1, levelId, subjectId, academicYear })
            });

            if (!res1.ok) {
                const err = await res1.json();
                MySwal.fire('Error', err.error || "No se pudo crear la asignación para el Docente 1.", 'error');
                return;
            }

            if (teacherId2) {
                // Save Teacher 2
                const res2 = await fetch('/_/backend/api/admin/assignments', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ teacherId: teacherId2, levelId, subjectId, academicYear })
                });
                if (!res2.ok) {
                    const err = await res2.json();
                    MySwal.fire('Error', err.error || "No se pudo crear la asignación para el Docente 2.", 'error');
                    fetchData();
                    return;
                }
            }

            fetchData();
            form.reset();
            MySwal.fire('Éxito', "Asignación creada con éxito.", 'success');
        } catch (error) {
            console.error("Error creating assignments:", error);
            MySwal.fire('Error', "Ocurrió un error al procesar las asignaciones.", 'error');
        }
    };

    const handleDeleteAssignment = async (groupedItem: any) => {
        const result = await MySwal.fire({
            title: '¿Eliminar asignación?',
            text: `Esto quitará a los docentes de la asignatura ${groupedItem.subject_name} en este curso.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                for (const id of groupedItem.ids) {
                    await fetch(`/_/backend/api/admin/assignments/${id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                }
                fetchData();
                MySwal.fire('Eliminado', 'Asignación eliminada con éxito', 'success');
            } catch (error) {
                console.error("Error deleting assignment group:", error);
                MySwal.fire('Error', 'No se pudo eliminar la asignación.', 'error');
            }
        }
    };

    const handleEditAssignment = async (assignment: any) => {
        const teacherOptionsHtml = teachers.map((t: any) => 
            `<option value="${t.id}" ${t.id === assignment.teachers[0]?.id ? 'selected' : ''}>${t.name}</option>`
        ).join('');
        
        const teacher2OptionsHtml = `<option value="">Ninguno</option>` + teachers.map((t: any) => 
            `<option value="${t.id}" ${t.id === assignment.teachers[1]?.id ? 'selected' : ''}>${t.name}</option>`
        ).join('');
        
        const levelOptionsHtml = levels.map((l: any) => 
            `<option value="${l.id}" ${l.id === assignment.level_id ? 'selected' : ''}>${l.name}</option>`
        ).join('');
        
        const subjectOptionsHtml = subjects.map((s: any) => 
            `<option value="${s.id}" ${s.id === assignment.subject_id ? 'selected' : ''}>${s.name}</option>`
        ).join('');
        
        const { value: formValues } = await MySwal.fire({
            title: 'Editar Asignación de Asignatura',
            html: `
                <div style="text-align: left; display: flex; flex-direction: column; gap: 15px;">
                    <div>
                        <label style="font-weight: 500; font-size: 0.9rem; color: #475569; display: block; margin-bottom: 5px;">Docente 1:</label>
                        <select id="swal-teacher-select-1" class="swal2-select" style="width: 100%; margin: 0; box-sizing: border-box;">
                            ${teacherOptionsHtml}
                        </select>
                    </div>
                    <div>
                        <label style="font-weight: 500; font-size: 0.9rem; color: #475569; display: block; margin-bottom: 5px;">Docente 2 (Opcional):</label>
                        <select id="swal-teacher-select-2" class="swal2-select" style="width: 100%; margin: 0; box-sizing: border-box;">
                            ${teacher2OptionsHtml}
                        </select>
                    </div>
                    <div>
                        <label style="font-weight: 500; font-size: 0.9rem; color: #475569; display: block; margin-bottom: 5px;">Curso (Nivel):</label>
                        <select id="swal-level-select" class="swal2-select" style="width: 100%; margin: 0; box-sizing: border-box;">
                            ${levelOptionsHtml}
                        </select>
                    </div>
                    <div>
                        <label style="font-weight: 500; font-size: 0.9rem; color: #475569; display: block; margin-bottom: 5px;">Asignatura:</label>
                        <select id="swal-subject-select" class="swal2-select" style="width: 100%; margin: 0; box-sizing: border-box;">
                            ${subjectOptionsHtml}
                        </select>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const teacherId1 = (document.getElementById('swal-teacher-select-1') as HTMLSelectElement).value;
                const teacherId2 = (document.getElementById('swal-teacher-select-2') as HTMLSelectElement).value;
                const levelId = (document.getElementById('swal-level-select') as HTMLSelectElement).value;
                const subjectId = (document.getElementById('swal-subject-select') as HTMLSelectElement).value;
                return { teacherId1, teacherId2, levelId, subjectId };
            }
        });
        
        if (formValues) {
            const { teacherId1, teacherId2, levelId, subjectId } = formValues;

            if (teacherId2 && teacherId1 === teacherId2) {
                MySwal.fire('Error', "El Docente 1 y el Docente 2 deben ser diferentes.", 'error');
                return;
            }

            try {
                // Delete old ones first
                for (const id of assignment.ids) {
                    await fetch(`/_/backend/api/admin/assignments/${id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                }

                const academicYear = assignment.academic_year || new Date().getFullYear();

                // Save Teacher 1
                const res1 = await fetch('/_/backend/api/admin/assignments', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ teacherId: teacherId1, levelId, subjectId, academicYear })
                });

                if (!res1.ok) {
                    const err = await res1.json();
                    MySwal.fire('Error', err.error || "No se pudo actualizar la asignación para el Docente 1.", 'error');
                    fetchData();
                    return;
                }

                if (teacherId2) {
                    // Save Teacher 2
                    const res2 = await fetch('/_/backend/api/admin/assignments', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ teacherId: teacherId2, levelId, subjectId, academicYear })
                    });
                    if (!res2.ok) {
                        const err = await res2.json();
                        MySwal.fire('Error', err.error || "No se pudo actualizar la asignación para el Docente 2.", 'error');
                        fetchData();
                        return;
                    }
                }

                fetchData();
                MySwal.fire('Éxito', "Asignación actualizada con éxito.", 'success');
            } catch (error) {
                console.error("Error editing assignment:", error);
                MySwal.fire('Error', "No se pudo actualizar la asignación.", 'error');
            }
        }
    };

    const handleUpdateCapacity = async (level: any) => {
        const { value: capacity } = await MySwal.fire({
            title: `Capacidad para ${level.name}`,
            input: 'number',
            inputValue: level.total_capacity,
            showCancelButton: true,
            confirmButtonText: 'Actualizar',
            cancelButtonText: 'Cancelar',
            inputAttributes: {
                min: '1',
                max: '100'
            }
        });

        if (capacity) {
            try {
                const res = await fetch(`/_/backend/api/admin/levels/${level.id}/capacity`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ capacity: parseInt(capacity) })
                });
                if (res.ok) {
                    fetchData();
                    MySwal.fire('Éxito', 'Capacidad actualizada', 'success');
                }
            } catch (error) {
                console.error("Error updating capacity:", error);
            }
        }
    };

    const handleExport = async () => {
        if (!token) return;
        try {
            const response = await fetch(`/_/backend/api/admin/export`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al exportar');
            }

            const blobData = await response.blob();
            const blob = new Blob([blobData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `BASE_DATOS_ESTUDIANTES_${new Date().getFullYear()}.xlsx`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }, 100);
            
            MySwal.fire({
                icon: 'success',
                title: 'Descarga Iniciada',
                text: 'La base de datos se ha exportado correctamente.',
                timer: 2000,
                showConfirmButton: false
            });
        } catch (error: any) {
            console.error("Error exporting data:", error);
            MySwal.fire('Error', error.message || "Error al descargar planilla", 'error');
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !token) return;

        const resultConfirm = await MySwal.fire({
            title: 'ATENCIÓN',
            text: 'Esto reemplazará TODOS los datos actuales de los estudiantes con la información de este archivo. ¿Estás seguro de que deseas continuar?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, reemplazar',
            cancelButtonText: 'Cancelar'
        });

        if (!resultConfirm.isConfirmed) {
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/_/backend/api/admin/import', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const result = await response.json();
            if (response.ok) {
                MySwal.fire({
                    title: 'Importación exitosa',
                    html: `Estudiantes: ${result.students}<br>Titulares: ${result.titulares}<br>Suplentes: ${result.suplentes}`,
                    icon: 'success'
                });
                fetchData(); // Reload table
            } else {
                MySwal.fire('Error al importar', result.error || result.details, 'error');
            }
        } catch (error) {
            console.error("Error importing file:", error);
            MySwal.fire('Error', "Hubo un error de conexión al subir el archivo.", 'error');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleEnrollSubmit = async (payload: any) => {
        const res = await fetch('/_/backend/api/enrollments', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            MySwal.fire('Éxito', "Matrícula Oficial Registrada con éxito.", 'success');
            setShowEnrollmentForm(false);
            fetchData();
        } else {
            const err = await res.json();
            MySwal.fire('Error', err.error, 'error');
        }
    };

    const handlePrintOfficial = async (studentId: string) => {
        const res = await fetch(`/_/backend/api/admin/students/${studentId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            setPrintingStudentData(data);
        } else {
            MySwal.fire('Error', "Error al obtener expediente para impresión.", 'error');
        }
    };

    const handleViewObservations = async (student: any) => {
        setSelectedStudentForObs(student);
        const res = await fetch(`/_/backend/api/admin/students/${student.id}/observations`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            setObservations(await res.json());
        }
    };

    const handleAddObservation = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch(`/_/backend/api/admin/students/${selectedStudentForObs.id}/observations`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(newObs)
        });
        if (res.ok) {
            handleViewObservations(selectedStudentForObs);
            setNewObs({ content: '', type: 'Positive' });
        }
    };

    const handleDeleteStudent = async (id: string) => {
        const { value: withdrawalDate } = await MySwal.fire({
            title: 'Retirar Estudiante',
            html: '<p>¿Seguro que desea retirar a este estudiante? Ingrese la fecha de retiro:</p>',
            input: 'date',
            inputValue: new Date().toISOString().split('T')[0],
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Sí, retirar',
            cancelButtonText: 'Cancelar'
        });

        if (withdrawalDate) {
            const res = await fetch(`/_/backend/api/admin/students/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ withdrawalDate })
            });
            if (res.ok) {
                fetchData();
                MySwal.fire('Retirado', 'El estudiante ha sido marcado como retirado.', 'success');
            }
        }
    };

    const handleAssignTemplate = async (levelId: string, templateId: string) => {
        try {
            const res = await fetch(`/_/backend/api/admin/levels/${levelId}/template`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ report_template_id: templateId || null })
            });
            if (res.ok) {
                MySwal.fire({ icon: 'success', title: 'Plantilla Asignada', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
                fetchData();
            } else {
                MySwal.fire('Error', 'No se pudo asignar la plantilla', 'error');
            }
        } catch (error) {
            console.error(error);
            MySwal.fire('Error', 'Error de red', 'error');
        }
    };

    const handleCreateTemplate = async () => {
        const { value: formValues } = await MySwal.fire({
            title: 'Nueva Plantilla (JSON)',
            html: `
                <div style="text-align: left; display: flex; flex-direction: column; gap: 15px;">
                    <div><label>Nombre:</label><input id="swal-tpl-name" class="swal2-input" /></div>
                    <div><label>Estructura (JSON):</label><textarea id="swal-tpl-json" class="swal2-textarea" style="height:200px;font-family:monospace;"></textarea></div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            preConfirm: () => {
                const name = (document.getElementById('swal-tpl-name') as HTMLInputElement).value;
                const jsonStr = (document.getElementById('swal-tpl-json') as HTMLTextAreaElement).value;
                if (!name || !jsonStr) return Swal.showValidationMessage('Ambos campos son requeridos');
                try {
                    return { name, structure_json: JSON.parse(jsonStr) };
                } catch (e) {
                    return Swal.showValidationMessage('El JSON proporcionado no es válido');
                }
            }
        });

        if (formValues) {
            const res = await fetch('/_/backend/api/admin/report-templates', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(formValues)
            });
            if (res.ok) { MySwal.fire('Éxito', 'Plantilla creada', 'success'); fetchData(); }
        }
    };

    const handleEditTemplate = async (template: any) => {
        const { value: formValues } = await MySwal.fire({
            title: 'Editar Plantilla (JSON)',
            html: `
                <div style="text-align: left; display: flex; flex-direction: column; gap: 15px;">
                    <div><label>Nombre:</label><input id="swal-tpl-name" class="swal2-input" value="${template.name}" /></div>
                    <div><label>Estructura (JSON):</label><textarea id="swal-tpl-json" class="swal2-textarea" style="height:200px;font-family:monospace;">${JSON.stringify(template.structure_json, null, 2)}</textarea></div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            preConfirm: () => {
                const name = (document.getElementById('swal-tpl-name') as HTMLInputElement).value;
                const jsonStr = (document.getElementById('swal-tpl-json') as HTMLTextAreaElement).value;
                if (!name || !jsonStr) return Swal.showValidationMessage('Ambos campos son requeridos');
                try {
                    return { name, structure_json: JSON.parse(jsonStr) };
                } catch (e) {
                    return Swal.showValidationMessage('El JSON proporcionado no es válido');
                }
            }
        });

        if (formValues) {
            const res = await fetch(`/_/backend/api/admin/report-templates/${template.id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(formValues)
            });
            if (res.ok) { MySwal.fire('Éxito', 'Plantilla actualizada', 'success'); fetchData(); }
        }
    };

    const handleDeleteTemplate = async (id: number) => {
        const result = await MySwal.fire({ title: '¿Eliminar plantilla?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, eliminar', confirmButtonColor: '#ef4444' });
        if (result.isConfirmed) {
            const res = await fetch(`/_/backend/api/admin/report-templates/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) { MySwal.fire('Eliminada', 'Plantilla eliminada', 'success'); fetchData(); }
            else MySwal.fire('Error', 'No se pudo eliminar, es posible que esté en uso.', 'error');
        }
    };

    if (printingStudentData) {
        return (
            <div style={{ background: '#f5f5f5', minHeight: '100vh', padding: '20px 0' }}>
                <div className="no-print" style={{ 
                    width: '210mm', 
                    margin: '0 auto 20px auto', 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'white',
                    padding: '12px 25px',
                    borderRadius: '12px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
                    position: 'sticky',
                    top: '20px',
                    zIndex: 100
                }}>
                    <div style={{ display: 'flex', gap: '15px' }}>
                        <button className="secondary-btn" onClick={() => setPrintingStudentData(null)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <X size={18} /> Volver al Listado
                        </button>
                        <button className="primary-btn" onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Printer size={18} /> Imprimir Documento
                        </button>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '0.85rem', color: '#666', fontWeight: '500' }}>Vista Previa Oficial</span>
                        <div style={{ height: '24px', width: '1px', background: '#eee' }}></div>
                        <button className="primary-btn" onClick={() => {
                            setViewingStudentId(printingStudentData.student.id);
                            setPrintingStudentData(null);
                        }} style={{ background: '#059669', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Edit2 size={18} /> Editar Datos en Base de Datos
                        </button>
                    </div>
                </div>
                <div className="printable">
                    <OfficialEnrollmentForm data={printingStudentData} />
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-layout">
            <div className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} onClick={() => setIsSidebarOpen(false)}></div>
            <aside className={`sidebar ${isSidebarOpen ? 'open' : 'collapsed'}`}>
                <div className="sidebar-header">
                    <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                        <img src="/assets/logo.png" alt="Logo" style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'white', padding: '5px' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2>Administración</h2>
                        {isSidebarOpen && (
                            <button className="sidebar-close-btn" title="Ocultar Menú" onClick={() => setIsSidebarOpen(false)}>
                                <X size={20} />
                            </button>
                        )}
                    </div>
                    <p>{formatName(user?.name)} {isVisita && <span className="badge warning" style={{ display: 'inline-block', marginLeft: '5px', fontSize: '0.7rem', padding: '2px 6px', background: '#d97706', color: 'white', borderRadius: '4px' }}>Visita</span>}</p>
                </div>
                <nav className="sidebar-nav">
                    <button className={activeTab === 'home' ? 'active' : ''} onClick={() => handleNavClick('home')}>
                        <Home size={18} /> Inicio
                    </button>
                    <button className={activeTab === 'grades' ? 'active' : ''} onClick={() => handleNavClick('grades')}>
                        <BookOpen size={18} /> Notas (Libro de Clases)
                    </button>
                    <button className={activeTab === 'students' ? 'active' : ''} onClick={() => handleNavClick('students')}>
                        <Users size={18} /> Matrícula y Alumnos
                    </button>
                    <button className={activeTab === 'audit' ? 'active' : ''} onClick={() => handleNavClick('audit')}>
                        <BarChart3 size={18} /> Bitácora de Actividad
                    </button>
                    <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => handleNavClick('overview')}>
                        <PieChart size={18} /> Panorama de Notas
                    </button>
                    <button className={activeTab === 'profile' ? 'active' : ''} onClick={() => handleNavClick('profile')}>
                        <User size={18} /> Mi Cuenta
                    </button>
                    <button className={activeTab === 'reports' ? 'active' : ''} onClick={() => handleNavClick('reports')}>
                        <FileText size={18} /> Generar Informes al Hogar
                    </button>
                    
                    <div className="sidebar-divider">Configuración de Sistema</div>
                    
                    <button className={activeTab === 'config' && configSubTab === 'courses' ? 'active' : ''} onClick={() => handleNavClick('config', 'courses')}>
                        <BookOpen size={16} /> Niveles / Cursos
                    </button>
                    <button className={activeTab === 'config' && configSubTab === 'subjects' ? 'active' : ''} onClick={() => handleNavClick('config', 'subjects')}>
                        <Settings size={16} /> Asignaturas
                    </button>
                    <button className={activeTab === 'config' && configSubTab === 'teachers' ? 'active' : ''} onClick={() => handleNavClick('config', 'teachers')}>
                        <Users size={16} /> Usuarios / Docentes
                    </button>
                    <button className={activeTab === 'config' && configSubTab === 'assignments' ? 'active' : ''} onClick={() => handleNavClick('config', 'assignments')}>
                        <Plus size={16} /> Asignación de Carga
                    </button>
                    <button className={activeTab === 'config' && configSubTab === 'homeroom' ? 'active' : ''} onClick={() => handleNavClick('config', 'homeroom')}>
                        <User size={16} /> Profesores Jefe
                    </button>
                    <button className={activeTab === 'config' && configSubTab === 'subject_order' ? 'active' : ''} onClick={() => handleNavClick('config', 'subject_order')}>
                        <ListOrdered size={16} /> Orden Asignaturas
                    </button>
                    <button className={activeTab === 'config' && configSubTab === 'templates' ? 'active' : ''} onClick={() => handleNavClick('config', 'templates')}>
                        <FileText size={16} /> Plantillas Informes
                    </button>
                    <button className={activeTab === 'config' && configSubTab === 'grades_lock' ? 'active' : ''} onClick={() => handleNavClick('config', 'grades_lock')}>
                        <Lock size={16} /> Bloqueo de Notas
                    </button>
                    <button className={activeTab === 'config' && configSubTab === 'external_links' ? 'active' : ''} onClick={() => handleNavClick('config', 'external_links')}>
                        <Globe size={16} /> Enlaces de Interés
                    </button>
                </nav>
                <div className="sidebar-footer">
                    <button onClick={logout} className="logout-btn">
                        <LogOut size={18} /> Salir
                    </button>
                </div>
            </aside>
            <main className="dashboard-content">
                <header className="content-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button className="sidebar-toggle-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                            <Menu size={24} />
                        </button>
                        <h1>
                            {activeTab === 'home' && 'Inicio'}
                            {activeTab === 'config' && (
                                <>
                                    Configuración de Sistema: {
                                        configSubTab === 'teachers' ? 'Usuarios del Sistema' :
                                        configSubTab === 'courses' ? 'Cursos' :
                                        configSubTab === 'subjects' ? 'Asignaturas' :
                                        configSubTab === 'assignments' ? 'Asignaciones' :
                                        configSubTab === 'homeroom' ? 'Profesores Jefe' :
                                        configSubTab === 'subject_order' ? 'Orden de Asignaturas en Informes' : 
                                        configSubTab === 'templates' ? 'Plantillas de Informes al Hogar' : 
                                        configSubTab === 'grades_lock' ? 'Bloqueo General y por Curso' : 
                                        configSubTab === 'external_links' ? 'Enlaces de Interés' : ''
                                    }
                                </>
                            )}
                            {activeTab === 'students' && 'Matrícula'}
                            {activeTab === 'grades' && 'Libro de Clases: Calificaciones'}
                            {activeTab === 'audit' && 'Control y Auditoría del Sistema'}
                            {activeTab === 'profile' && 'Configuración de Mi Cuenta (Admin)'}
                        </h1>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {!isVisita && (
                            <button className="secondary-btn" onClick={async () => {
                                const { value: formValues } = await MySwal.fire({
                                    title: 'Configuración Institucional',
                                    html:
                                        '<label>Nombre del Director</label><input id="swal-director" class="swal2-input" placeholder="Nombre Director">' +
                                        '<label>Nombre del Colegio</label><input id="swal-school" class="swal2-input" placeholder="Nombre Colegio">',
                                    focusConfirm: false,
                                    showCancelButton: true,
                                    preConfirm: () => {
                                        return {
                                            directorName: (document.getElementById('swal-director') as HTMLInputElement).value,
                                            schoolName: (document.getElementById('swal-school') as HTMLInputElement).value
                                        }
                                    }
                                });
                                if (formValues) {
                                    await fetch('/_/backend/api/admin/settings', {
                                        method: 'POST',
                                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                                        body: JSON.stringify(formValues)
                                    });
                                    MySwal.fire('Éxito', 'Configuración actualizada', 'success');
                                }
                            }}><Settings size={18} /> Institución</button>
                        )}
                    </div>
                </header>
                
                {activeTab === 'home' && (
                    <div style={{ padding: '24px 0' }}>
                        {/* Banner de Bienvenida */}
                        <div style={{
                            background: 'linear-gradient(135deg, #ea580c 0%, #ca8a04 50%, #16a34a 100%)',
                            borderRadius: '24px',
                            padding: '40px',
                            color: '#ffffff',
                            marginBottom: '40px',
                            boxShadow: '0 10px 25px -5px rgba(234, 88, 12, 0.2), 0 8px 10px -6px rgba(22, 163, 74, 0.2)',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                position: 'absolute',
                                top: '-50%',
                                right: '-10%',
                                width: '400px',
                                height: '400px',
                                background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)',
                                borderRadius: '50%',
                                pointerEvents: 'none'
                            }}></div>
                            <h2 style={{ fontSize: '2.5rem', fontWeight: '800', margin: '0 0 10px 0', letterSpacing: '-0.02em' }}>
                                ¡Hola, {formatName(user?.name)}!
                            </h2>
                            <p style={{ margin: 0, opacity: 0.95, fontSize: '1.25rem', fontWeight: '500' }}>
                                Panel de Administración • Liceo Pro
                            </p>
                        </div>

                        {/* Widget de Descarga de Notas Pendientes */}
                        <div className="card" style={{ marginBottom: '30px', padding: '24px', borderRadius: '16px', background: '#fffbeb', border: '1px solid #fde68a', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                                <div>
                                    <h3 style={{ margin: '0 0 6px 0', color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem' }}>
                                        <FileSpreadsheet size={22} style={{ color: '#d97706' }} /> Reporte de Notas Pendientes (Excel)
                                    </h3>
                                    <p style={{ margin: 0, color: '#b45309', fontSize: '0.95rem' }}>
                                        Descargue la planilla con el detalle de estudiantes pendientes por curso y asignatura (excluye Pre-Kinder, Kínder y Taller Laboral).
                                    </p>
                                </div>
                                <button 
                                    className="primary-btn"
                                    style={{ background: '#d97706', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '0.95rem', borderRadius: '10px' }}
                                    onClick={async () => {
                                        try {
                                            const res = await fetch(`/_/backend/api/admin/reports/pending-grades/export?year=2026&period=1er Semestre`, {
                                                headers: { 'Authorization': `Bearer ${token}` }
                                            });
                                            if (!res.ok) throw new Error("Error al generar reporte Excel");
                                            const blob = await res.blob();
                                            const url = window.URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = `Reporte_Notas_Pendientes_2026_1er_Semestre.xlsx`;
                                            document.body.appendChild(a);
                                            a.click();
                                            a.remove();
                                        } catch (err: any) {
                                            console.error("Error descargando reporte:", err);
                                            MySwal.fire('Error', 'No se pudo descargar el reporte de notas pendientes', 'error');
                                        }
                                    }}
                                >
                                    <Download size={18} /> Descargar Reporte Excel
                                </button>
                            </div>
                        </div>

                        {/* Plataformas de Interés */}
                        <div className="card" style={{ border: 'none', background: 'transparent', padding: 0, boxShadow: 'none' }}>
                            <h3 style={{ margin: '0 0 25px 0', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.4rem', color: '#1e293b' }}>
                                <Globe size={24} style={{ color: '#ea580c' }} /> Plataformas de Interés
                            </h3>
                            
                            {externalLinks.length === 0 ? (
                                <p style={{ color: '#64748b', fontStyle: 'italic' }}>No se han configurado enlaces de interés todavía.</p>
                            ) : (
                                <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                                    gap: '24px',
                                    marginTop: '10px'
                                }}>
                                    {externalLinks.map((l: any, idx: number) => {
                                        const footerColor = footerColors[idx % footerColors.length];
                                        return (
                                            <a 
                                                key={l.id}
                                                href={l.url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="quick-link-card-premium"
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    borderRadius: '16px',
                                                    overflow: 'hidden',
                                                    border: 'none',
                                                    textDecoration: 'none',
                                                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
                                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    cursor: 'pointer',
                                                    height: '100%',
                                                    position: 'relative'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(-8px)';
                                                    e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.1)';
                                                    const img = e.currentTarget.querySelector('img') as HTMLImageElement;
                                                    if (img) img.style.transform = 'scale(1.08)';
                                                    const arrow = e.currentTarget.querySelector('.card-arrow') as HTMLElement;
                                                    if (arrow) arrow.style.transform = 'translateX(6px)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.transform = 'none';
                                                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)';
                                                    const img = e.currentTarget.querySelector('img') as HTMLImageElement;
                                                    if (img) img.style.transform = 'none';
                                                    const arrow = e.currentTarget.querySelector('.card-arrow') as HTMLElement;
                                                    if (arrow) arrow.style.transform = 'none';
                                                }}
                                            >
                                                <div style={{ 
                                                    width: '100%', 
                                                    height: '160px', 
                                                    overflow: 'hidden', 
                                                    position: 'relative',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
                                                }}>
                                                    <img 
                                                        src={getLinkImageUrl(l.name, idx)} 
                                                        alt={l.name}
                                                        style={{
                                                            width: '100%',
                                                            height: '100%',
                                                            objectFit: 'cover',
                                                            transition: 'transform 0.5s ease'
                                                        }}
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none';
                                                            const fallback = e.currentTarget.parentElement?.querySelector('.fallback-placeholder') as HTMLElement;
                                                            if (fallback) fallback.style.display = 'flex';
                                                        }}
                                                    />
                                                    <div className="fallback-placeholder" style={{
                                                        display: 'none',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexDirection: 'column',
                                                        gap: '8px',
                                                        color: '#64748b',
                                                        width: '100%',
                                                        height: '100%'
                                                    }}>
                                                        <Globe size={40} style={{ opacity: 0.8 }} />
                                                        <span style={{ fontSize: '0.85rem', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                                            Acceso Directo
                                                        </span>
                                                    </div>
                                                </div>
                                                <div style={{
                                                    backgroundColor: footerColor,
                                                    padding: '20px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    flexGrow: 1,
                                                    justifyContent: 'space-between',
                                                    gap: '15px'
                                                }}>
                                                    <h4 style={{ 
                                                        color: '#ffffff', 
                                                        fontSize: '1.2rem', 
                                                        fontWeight: '700',
                                                        lineHeight: '1.4',
                                                        margin: 0,
                                                        letterSpacing: '-0.01em'
                                                    }}>
                                                        {l.name}
                                                    </h4>
                                                    <div style={{ 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        color: '#ffffff', 
                                                        fontSize: '1rem', 
                                                        fontWeight: '600',
                                                        gap: '8px'
                                                    }}>
                                                        <span>Acceder</span>
                                                        <span className="card-arrow" style={{ 
                                                            fontSize: '1.2rem', 
                                                            transition: 'transform 0.3s ease',
                                                            display: 'inline-block'
                                                        }}>&rarr;</span>
                                                    </div>
                                                </div>
                                            </a>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'grades' && <GradesSheet />}

                {activeTab === 'overview' && <GradesOverview />}
                
                {activeTab === 'audit' && (
                    <div className="card card-split-layout">
                        <div className="card-split-header">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <h3 style={{ margin: 0 }}>Historial de Acciones</h3>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <button 
                                        className="secondary-btn" 
                                        style={{ height: '35px', padding: '0 12px' }}
                                        onClick={() => fetchData()}
                                        title="Actualizar Historial"
                                    >
                                        Actualizar
                                    </button>
                                    <select 
                                        className="swal2-input" 
                                        style={{ margin: 0, fontSize: '0.8rem', height: '35px' }}
                                        value={auditFilters.teacher}
                                        onChange={(e) => setAuditFilters({...auditFilters, teacher: e.target.value})}
                                    >
                                        <option value="">Todos los Docentes</option>
                                        {teachers.map(t => <option key={t.id} value={t.name}>{formatName(t.name)}</option>)}
                                    </select>
                                    <select 
                                        className="swal2-input" 
                                        style={{ margin: 0, fontSize: '0.8rem', height: '35px' }}
                                        value={auditFilters.action}
                                        onChange={(e) => setAuditFilters({...auditFilters, action: e.target.value})}
                                    >
                                        <option value="">Todas las Acciones</option>
                                        <option value="SAVE_GRADES">Guardado de Planilla</option>
                                        <option value="ADD_GRADE">Ingreso de Nota</option>
                                        <option value="UPDATE_GRADE">Actualización de Nota</option>
                                        <option value="DELETE_GRADE">Eliminación de Nota</option>
                                        <option value="LOCK_GRADES">Bloqueo de Notas</option>
                                        <option value="UNLOCK_GRADES">Desbloqueo de Notas</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="card-split-content" style={{ marginTop: 0 }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Fecha / Hora</th>
                                        <th>Usuario</th>
                                        <th>Acción</th>
                                        <th>Detalle</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {auditLogs
                                        .filter(log => !auditFilters.teacher || log.user_name === auditFilters.teacher)
                                        .filter(log => !auditFilters.action || log.action === auditFilters.action)
                                        .map(log => (
                                        <tr key={log.id}>
                                            <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                                {new Date(log.created_at.replace(' ', 'T') + 'Z').toLocaleString()}
                                            </td>
                                            <td style={{ fontWeight: '600' }}>{log.user_name}</td>
                                            <td>
                                                <span className={`badge ${
                                                    log.action.includes('LOCK') ? 'admin' : 
                                                    log.action === 'SAVE_GRADES' ? 'docente' : 'secondary'
                                                }`}>
                                                    {log.action === 'SAVE_GRADES' ? 'GUARDADO' : 
                                                     log.action === 'LOCK_GRADES' ? 'BLOQUEO' : 
                                                     log.action === 'UNLOCK_GRADES' ? 'DESBLOQUEO' : 
                                                     log.action === 'DELETE_GRADE' ? 'ELIMINACIÓN' : 
                                                     log.action === 'UPDATE_GRADE' ? 'ACTUALIZACIÓN' :
                                                     log.action === 'ADD_GRADE' ? 'INGRESO' : log.action}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: '0.9rem' }}>{log.details}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                
                {activeTab === 'config' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {configSubTab === 'teachers' && (
                            <div className="card card-split-layout">
                                <div className="card-split-header">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                        <h3 style={{ margin: 0 }}>Gestión de Usuarios</h3>
                                        {!isVisita && <button className="primary-btn" onClick={handleCreateTeacher}><Plus size={18} /> Nuevo Usuario</button>}
                                    </div>
                                </div>
                                <div className="card-split-content">
                                    <table className="data-table">
                                        <thead><tr><th>RUT</th><th>NOMBRE</th><th>ROL</th><th>EMAIL</th>{!isVisita && <th>ACCIONES</th>}</tr></thead>
                                        <tbody>
                                            {teachers.map(t => (
                                                <tr key={t.id}>
                                                    <td>{t.run}</td>
                                                    <td>{formatName(t.name)}</td>
                                                    <td>
                                                        <span className={`badge ${t.role === 'Admin' ? 'admin' : t.role === 'Visita' ? 'visita' : 'docente'}`}>
                                                            {t.role === 'Admin' ? 'Administrador' : t.role === 'Visita' ? 'Visita (Solo Lectura)' : 'Docente'}
                                                        </span>
                                                    </td>
                                                    <td>{t.email}</td>
                                                    {!isVisita && (
                                                        <td>
                                                            <div style={{ display: 'flex', gap: '15px' }}>
                                                                <button 
                                                                    type="button"
                                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', padding: '5px' }}
                                                                    onClick={(e) => { e.stopPropagation(); handleEditTeacher(t); }}
                                                                    title="Editar"
                                                                >
                                                                    <Edit2 size={20} />
                                                                </button>
                                                                <button 
                                                                    type="button"
                                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '5px' }}
                                                                    onClick={(e) => { e.stopPropagation(); handleDeleteTeacher(t.id); }}
                                                                    title="Eliminar"
                                                                >
                                                                    <Trash2 size={20} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {configSubTab === 'courses' && (
                            <div className="card card-split-layout">
                                <div className="card-split-header">
                                    <h3 style={{ margin: 0, marginBottom: '10px' }}>Gestión de Cursos (Niveles)</h3>
                                    <p style={{ color: '#64748b', margin: 0 }}>Los cursos se configuran automáticamente según la estructura del liceo.</p>
                                </div>
                                <div className="card-split-content">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Nombre</th>
                                                <th>Capacidad</th>
                                                <th>Matriculados</th>
                                                <th>Cupos Disponibles (SAE)</th>
                                                <th>Plantilla Informe</th>
                                                {!isVisita && <th>Reglas Asignaturas</th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {levels.map(l => (
                                                <tr key={l.id}>
                                                    <td>{l.name}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            {l.total_capacity}
                                                            {!isVisita && (
                                                                <button 
                                                                    onClick={() => handleUpdateCapacity(l)}
                                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', padding: '4px' }}
                                                                    title="Editar Capacidad"
                                                                >
                                                                    <Edit2 size={16} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td style={{ fontWeight: '600', color: '#1e293b' }}>{l.current_enrolled}</td>
                                                    <td style={{ 
                                                        fontWeight: '700', 
                                                        color: (l.total_capacity - l.current_enrolled) > 5 ? '#059669' : 
                                                               (l.total_capacity - l.current_enrolled) > 0 ? '#d97706' : '#dc2626'
                                                    }}>
                                                        {l.total_capacity - l.current_enrolled}
                                                    </td>
                                                    <td>
                                                        <select
                                                            value={l.report_template_id || ''}
                                                            onChange={(e) => handleAssignTemplate(l.id, e.target.value)}
                                                            disabled={isVisita}
                                                            style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                                        >
                                                            <option value="">Sin Plantilla (Oculto)</option>
                                                            {reportTemplates.map(t => (
                                                                <option key={t.id} value={t.id}>{t.name}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    {!isVisita && (
                                                        <td>
                                                            <button 
                                                                type="button"
                                                                onClick={() => handleConfigureLevelSubjects(l)}
                                                                style={{ padding: '5px 10px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', color: '#1e293b', cursor: 'pointer', fontWeight: '600' }}
                                                                title="Configurar promedios y tributaciones para este curso"
                                                            >
                                                                <BookOpen size={14} /> Reglas del Curso
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {configSubTab === 'subjects' && (
                            <div className="card card-split-layout">
                                <div className="card-split-header">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                        <h3 style={{ margin: 0 }}>Asignaturas Globales</h3>
                                        {!isVisita && <button className="primary-btn" onClick={handleCreateSubject}><Plus size={18} /> Nueva Asignatura</button>}
                                    </div>
                                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <div style={{ flex: 1, minWidth: '220px' }}>
                                            <input 
                                                type="text" 
                                                placeholder="🔍 Buscar asignatura por nombre..." 
                                                value={subjectSearchQuery} 
                                                onChange={(e) => setSubjectSearchQuery(e.target.value)} 
                                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} 
                                            />
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <label style={{ fontWeight: '600', fontSize: '0.85rem', color: '#475569' }}>Filtrar por Curso:</label>
                                            <select 
                                                value={subjectLevelFilter} 
                                                onChange={(e) => setSubjectLevelFilter(e.target.value)} 
                                                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                                            >
                                                <option value="">Todos los Cursos</option>
                                                {levels.map(l => (
                                                    <option key={l.id} value={String(l.id)}>{l.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="card-split-content">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Nombre</th>
                                                <th>Influye en Promedio</th>
                                                <th>Tributación</th>
                                                <th>Tipo Evaluación</th>
                                                {!isVisita && <th>Acciones</th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {subjects
                                                .filter(s => {
                                                    const matchesSearch = subjectSearchQuery === '' || s.name.toLowerCase().includes(subjectSearchQuery.toLowerCase());
                                                    let matchesLevel = true;
                                                    if (subjectLevelFilter !== '') {
                                                        const levelAssignedSubjectIds = assignments
                                                            .filter(a => String(a.level_id) === String(subjectLevelFilter))
                                                            .map(a => String(a.subject_id));
                                                        
                                                        const levelAssignedSubs = subjects.filter(sub => levelAssignedSubjectIds.includes(String(sub.id)));
                                                        const parentIds = levelAssignedSubs.map(sub => String(sub.tributes_to_subject_id)).filter(Boolean);

                                                        matchesLevel = levelAssignedSubjectIds.includes(String(s.id)) || parentIds.includes(String(s.id));
                                                    }
                                                    return matchesSearch && matchesLevel;
                                                })
                                                .map(s => {
                                                const infGpa = s.influences_gpa === undefined || s.influences_gpa === null || s.influences_gpa === true || s.influences_gpa === 1 || s.influences_gpa === '1';
                                                const isQual = s.is_qualitative === true || s.is_qualitative === 1 || s.is_qualitative === '1';

                                                return (
                                                    <tr key={s.id}>
                                                        <td style={{ fontWeight: '600' }}>{s.name}</td>
                                                        <td>
                                                            {infGpa ? (
                                                                <span style={{ color: '#16a34a', background: '#dcfce7', padding: '3px 8px', borderRadius: '4px', fontSize: '0.82rem', fontWeight: '600' }}>Sí</span>
                                                            ) : (
                                                                <span style={{ color: '#dc2626', background: '#fee2e2', padding: '3px 8px', borderRadius: '4px', fontSize: '0.82rem', fontWeight: '600' }}>No (Descartada)</span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            {s.tributes_to_name ? (
                                                                <span style={{ color: '#2563eb', background: '#dbeafe', padding: '3px 8px', borderRadius: '4px', fontSize: '0.82rem', fontWeight: '600' }}>
                                                                    Tributa a {s.tributes_to_name}
                                                                </span>
                                                            ) : (
                                                                <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Independiente</span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            {isQual ? (
                                                                <span style={{ color: '#9333ea', background: '#f3e8ff', padding: '3px 8px', borderRadius: '4px', fontSize: '0.82rem', fontWeight: '600' }}>Cualitativa (MB/B/S/I)</span>
                                                            ) : (
                                                                <span style={{ color: '#475569', fontSize: '0.85rem' }}>Numérica (1,0 - 7,0)</span>
                                                            )}
                                                        </td>
                                                        {!isVisita && (
                                                            <td>
                                                                <div style={{ display: 'flex', gap: '15px' }}>
                                                                    <button 
                                                                        type="button"
                                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', padding: '5px' }}
                                                                        onClick={(e) => { e.stopPropagation(); handleEditSubject(s); }}
                                                                        title="Editar Asignatura"
                                                                    >
                                                                        <Edit2 size={20} />
                                                                    </button>
                                                                    <button 
                                                                        type="button"
                                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '5px' }}
                                                                        onClick={(e) => { e.stopPropagation(); handleDeleteSubject(s); }}
                                                                        title="Eliminar Asignatura"
                                                                    >
                                                                        <Trash2 size={20} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        )}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {configSubTab === 'assignments' && (
                            <div className="card card-split-layout">
                                <div className="card-split-header">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                                        <h3 style={{ margin: 0, color: '#1e293b' }}>Crear Asignación de Asignaturas</h3>
                                    </div>
                                    {!isVisita && (
                                        <form onSubmit={handleAssign} className="admin-form">
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                                                <div>
                                                    <label>Docente 1:</label>
                                                    <select name="teacherId" required>
                                                        <option value="">Seleccione Docente...</option>
                                                        {teachers.map(t => <option key={t.id} value={t.id}>{formatName(t.name)}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label>Docente 2 (Opcional):</label>
                                                    <select name="teacherId2">
                                                        <option value="">Ninguno</option>
                                                        {teachers.map(t => <option key={t.id} value={t.id}>{formatName(t.name)}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label>Curso (Nivel):</label>
                                                    <select name="levelId" required>
                                                        <option value="">Seleccione Curso...</option>
                                                        {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label>Asignatura:</label>
                                                    <select name="subjectId" required>
                                                        <option value="">Seleccione Asignatura...</option>
                                                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                    </select>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '0' }}>
                                                    <div style={{ width: '100%' }}>
                                                        <label style={{ visibility: 'hidden' }}>Botón</label>
                                                        <button type="submit" className="primary-btn" style={{ width: '100%', height: '42px', justifyContent: 'center' }}>Guardar Asignación</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </form>
                                    )}

                                    <div style={{ marginTop: '20px', marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <h4 style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Listado de Asignaturas por Curso</h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Filtrar por Curso:</label>
                                                <select 
                                                    value={assignmentLevelFilter} 
                                                    onChange={(e) => setAssignmentLevelFilter(e.target.value)}
                                                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: 'white' }}
                                                >
                                                    <option value="">Todos los Cursos...</option>
                                                    {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Filtrar por Docente:</label>
                                                <select 
                                                    value={assignmentTeacherFilter} 
                                                    onChange={(e) => setAssignmentTeacherFilter(e.target.value)}
                                                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: 'white' }}
                                                >
                                                    <option value="">Todos los Docentes...</option>
                                                    {teachers.map(t => <option key={t.id} value={t.id}>{formatName(t.name)}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="card-split-content">
                                    <table className="data-table" style={{ fontSize: '0.9rem' }}>
                                        <thead><tr><th>Curso</th><th>Asignatura</th><th>Docentes</th>{!isVisita && <th style={{ textAlign: 'center' }}>Acciones</th>}</tr></thead>
                                        <tbody>
                                            {filteredGroupedAssignments.map(a => (
                                                <tr key={`${a.level_id}_${a.subject_id}`}>
                                                    <td>{a.level_name}</td>
                                                    <td>{a.subject_name}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            {a.teachers.map((t: any, i: number) => (
                                                                <span key={t.id} style={{ display: 'inline-block', fontSize: '0.85rem' }}>
                                                                    <strong>{i + 1}.</strong> {formatName(t.name)}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    {!isVisita && (
                                                        <td style={{ textAlign: 'center' }}>
                                                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                                                <button 
                                                                    onClick={() => handleEditAssignment(a)}
                                                                    style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer' }}
                                                                    title="Editar Asignación"
                                                                >
                                                                    <Edit2 size={16} />
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleDeleteAssignment(a)}
                                                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                                                    title="Eliminar Asignación"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {configSubTab === 'homeroom' && (
                            <div className="card card-split-layout">
                                <div className="card-split-header">
                                    <h3 style={{ margin: 0, marginBottom: '20px' }}>Asignación de Profesor Jefe</h3>
                                    {!isVisita && (
                                        <form onSubmit={async (e) => {
                                            e.preventDefault();
                                            const form = e.target as HTMLFormElement;
                                            const levelId = form.levelId.value;
                                            const teacherId = form.teacherId.value;
                                            const res = await fetch('/_/backend/api/admin/set-homeroom', {
                                                method: 'POST',
                                                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ levelId, teacherId })
                                            });
                                            if (res.ok) {
                                                fetchData();
                                                MySwal.fire('Éxito', "Profesor Jefe asignado.", 'success');
                                            }
                                        }} className="admin-form">
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                                                <div>
                                                    <label>Curso (Nivel):</label>
                                                    <select name="levelId" required>
                                                        <option value="">Seleccione Curso...</option>
                                                        {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label>Profesor Jefe:</label>
                                                    <select name="teacherId" required>
                                                        <option value="">Seleccione Docente...</option>
                                                        {teachers.map(t => <option key={t.id} value={t.id}>{formatName(t.name)}</option>)}
                                                    </select>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '0' }}>
                                                    <div style={{ width: '100%' }}>
                                                        <label style={{ visibility: 'hidden' }}>Botón</label>
                                                        <button type="submit" className="primary-btn" style={{ width: '100%', height: '42px', justifyContent: 'center' }}>Asignar P. Jefe</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </form>
                                    )}

                                    <div style={{ marginTop: '20px', marginBottom: '10px' }}>
                                        <h4 style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Listado Actual de Profesores Jefe</h4>
                                    </div>
                                </div>

                                <div className="card-split-content">
                                    <table className="data-table" style={{ fontSize: '0.9rem' }}>
                                        <thead><tr><th>Curso</th><th>Profesor Jefe</th></tr></thead>
                                        <tbody>
                                            {levels.map(l => (
                                                <tr key={l.id}>
                                                    <td>{l.name}</td>
                                                    <td style={{ color: l.homeroom_teacher_name ? 'inherit' : '#94a3b8', fontStyle: l.homeroom_teacher_name ? 'normal' : 'italic' }}>
                                                        {l.homeroom_teacher_name ? formatName(l.homeroom_teacher_name) : 'Sin asignar'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {configSubTab === 'subject_order' && (
                            <div className="card card-split-layout">
                                <div className="card-split-header">
                                    <h3 style={{ margin: 0, marginBottom: '20px' }}>Ordenación de Asignaturas</h3>
                                    <div className="admin-form" style={{ marginBottom: '20px' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                                            <div>
                                                <label>Seleccione Curso (Nivel) para Configurar:</label>
                                                <select 
                                                    value={selectedLevelIdOrder} 
                                                    onChange={e => setSelectedLevelIdOrder(e.target.value)}
                                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                                >
                                                    <option value="">Seleccione un Curso...</option>
                                                    {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {selectedLevelIdOrder && orderedSubjects.length > 0 && !isVisita && (
                                        <button 
                                            onClick={handleSaveSubjectOrder} 
                                            className="primary-btn"
                                            style={{ width: '100%', padding: '12px', background: '#2563eb', fontWeight: 'bold', justifyContent: 'center' }}
                                        >
                                            Guardar Orden de Asignaturas
                                        </button>
                                    )}
                                </div>

                                <div className="card-split-content">
                                    {!selectedLevelIdOrder ? (
                                        <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                                            Por favor seleccione un curso para visualizar y ordenar sus asignaturas.
                                        </div>
                                    ) : isLoadingOrder ? (
                                        <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                                            Cargando configuración...
                                        </div>
                                    ) : orderedSubjects.length === 0 ? (
                                        <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                                            No se encontraron asignaturas asignadas a este curso.
                                            <br />
                                            <small style={{ display: 'block', marginTop: '10px', color: '#64748b' }}>
                                                Asigne asignaturas a docentes en la pestaña "Asignación de Carga" primero.
                                            </small>
                                        </div>
                                    ) : (
                                        <div>
                                            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '15px' }}>
                                                Utilice los botones <span style={{ fontWeight: 'bold' }}>Subir</span> y <span style={{ fontWeight: 'bold' }}>Bajar</span> para definir la posición que tendrán las asignaturas en el reporte final, luego guarde los cambios.
                                            </p>
                                            <table className="data-table">
                                                <thead>
                                                    <tr>
                                                        <th style={{ width: '80px', textAlign: 'center' }}>Posición</th>
                                                        <th>Asignatura</th>
                                                        {!isVisita && <th style={{ width: '180px', textAlign: 'center' }}>Acciones</th>}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {orderedSubjects.map((sub, index) => (
                                                        <tr key={sub.id}>
                                                            <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#475569' }}>
                                                                {index + 1}
                                                            </td>
                                                            <td style={{ fontWeight: '500' }}>
                                                                {sub.name}
                                                            </td>
                                                            {!isVisita && (
                                                                <td style={{ textAlign: 'center' }}>
                                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                                        <button
                                                                            type="button"
                                                                            className="secondary-btn"
                                                                            style={{ padding: '5px 10px', fontSize: '0.8rem', opacity: index === 0 ? 0.3 : 1, cursor: index === 0 ? 'not-allowed' : 'pointer' }}
                                                                            onClick={() => handleMoveSubject(index, 'up')}
                                                                            disabled={index === 0}
                                                                        >
                                                                            ▲ Subir
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            className="secondary-btn"
                                                                            style={{ padding: '5px 10px', fontSize: '0.8rem', opacity: index === orderedSubjects.length - 1 ? 0.3 : 1, cursor: index === orderedSubjects.length - 1 ? 'not-allowed' : 'pointer' }}
                                                                            onClick={() => handleMoveSubject(index, 'down')}
                                                                            disabled={index === orderedSubjects.length - 1}
                                                                        >
                                                                            ▼ Bajar
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {configSubTab === 'templates' && (
                            <div className="card card-split-layout">
                                <div className="card-split-header">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                        <h3 style={{ margin: 0 }}>Plantillas de Informes al Hogar</h3>
                                        {!isVisita && (
                                            <button className="primary-btn" onClick={handleCreateTemplate}>
                                                <Plus size={18} /> Nueva Plantilla
                                            </button>
                                        )}
                                    </div>
                                    <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
                                        Gestiona las plantillas dinámicas que determinan qué campos se evalúan en cada informe (Ámbitos, Núcleos e Indicadores).
                                    </p>
                                </div>
                                <div className="card-split-content">
                                    <table className="data-table">
                                        <thead><tr><th>ID</th><th>Nombre Plantilla</th><th>Estructura (JSON)</th>{!isVisita && <th>Acciones</th>}</tr></thead>
                                        <tbody>
                                            {reportTemplates.map(tpl => (
                                                <tr key={tpl.id}>
                                                    <td style={{ fontWeight: 'bold' }}>#{tpl.id}</td>
                                                    <td>{tpl.name}</td>
                                                    <td><span className="badge secondary">Configuración Interna</span></td>
                                                    {!isVisita && (
                                                        <td>
                                                            <div style={{ display: 'flex', gap: '15px' }}>
                                                                <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', padding: '5px' }} title="Editar JSON" onClick={() => handleEditTemplate(tpl)}>
                                                                    <Edit2 size={20} />
                                                                </button>
                                                                <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '5px' }} title="Eliminar Plantilla" onClick={() => handleDeleteTemplate(tpl.id)}>
                                                                    <Trash2 size={20} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {configSubTab === 'grades_lock' && (
                            <div className="card card-split-layout">
                                <div className="card-split-header">
                                    <h3 style={{ margin: 0, marginBottom: '20px' }}>Bloqueo de Calificaciones</h3>
                                    
                                    <div style={{ display: 'flex', gap: '15px', marginBottom: '25px', flexWrap: 'wrap' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>Semestre:</label>
                                            <select 
                                                value={locksPeriod} 
                                                onChange={e => setLocksPeriod(e.target.value)} 
                                                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#fff' }}
                                            >
                                                <option value="1er Semestre">1er Semestre</option>
                                                <option value="2do Semestre">2do Semestre</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>Año:</label>
                                            <select 
                                                value={locksYear} 
                                                onChange={e => setLocksYear(Number(e.target.value))} 
                                                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#fff' }}
                                            >
                                                <option value="2026">2026</option>
                                                <option value="2025">2025</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Global Lock Card Banner */}
                                    <div style={{ 
                                        padding: '20px', 
                                        borderRadius: '8px', 
                                        background: globalLock ? '#fef2f2' : '#f0fdf4',
                                        border: `1px solid ${globalLock ? '#fee2e2' : '#dcfce7'}`,
                                        marginBottom: '20px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '12px'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '16px', fontWeight: 'bold', color: globalLock ? '#991b1b' : '#166534' }}>
                                                    Estado de Bloqueo General: {globalLock ? 'ACTIVADO' : 'DESACTIVADO'}
                                                </span>
                                                <span style={{ fontSize: '12px', color: globalLock ? '#b91c1c' : '#15803d', marginTop: '2px' }}>
                                                    {globalLock 
                                                        ? 'Todas las planillas de notas del liceo están bloqueadas para los docentes, excepto los cursos desbloqueados individualmente.'
                                                        : 'Las planillas están habilitadas para ingreso por defecto, a menos que existan bloqueos particulares por curso.'
                                                    }
                                                </span>
                                            </div>
                                            {!isVisita && (
                                                <button 
                                                    onClick={handleToggleGlobalLock}
                                                    className="primary-btn" 
                                                    style={{ 
                                                        background: globalLock ? '#10b981' : '#ef4444',
                                                        padding: '10px 16px',
                                                        fontWeight: 'bold',
                                                        border: 'none'
                                                    }}
                                                >
                                                    {globalLock ? 'Desbloquear Todo' : 'Bloquear Todo'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="card-split-content">
                                    {locksLoading ? (
                                        <p>Cargando información de bloqueos...</p>
                                    ) : (
                                        <div>
                                            <h4 style={{ margin: '0 0 15px 0', color: '#1e293b' }}>Control Parcial de Bloqueos por Curso</h4>
                                            <table className="data-table">
                                                <thead>
                                                    <tr>
                                                        <th>Curso</th>
                                                        <th>Asignaturas</th>
                                                        <th>Estado</th>
                                                        {!isVisita && <th style={{ textAlign: 'center' }}>Acciones</th>}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {levelsLocksStatus.map(lvl => (
                                                        <tr key={lvl.id}>
                                                            <td style={{ fontWeight: '600' }}>{lvl.name}</td>
                                                            <td>
                                                                <span 
                                                                    className="badge secondary" 
                                                                    style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s' }}
                                                                    onClick={() => handleViewLevelSubjectsLocks(lvl.id, lvl.name)}
                                                                    title="Ver desglose y bloquear por asignatura"
                                                                >
                                                                    {lvl.subjectCount} asignaturas <BookOpen size={12} />
                                                                </span>
                                                            </td>
                                                            <td>
                                                                {lvl.status === 'Locked' && (
                                                                    <span style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>Bloqueado</span>
                                                                )}
                                                                {lvl.status === 'Unlocked' && (
                                                                    <span style={{ background: '#f0fdf4', color: '#10b981', border: '1px solid #dcfce7', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>Desbloqueado</span>
                                                                )}
                                                                {lvl.status === 'Partially Unlocked' && (
                                                                    <span style={{ background: '#eff6ff', color: '#3b82f6', border: '1px solid #dbeafe', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>Desbloqueado Parcial</span>
                                                                )}
                                                                {lvl.status === 'Partially Locked' && (
                                                                    <span style={{ background: '#fff7ed', color: '#f97316', border: '1px solid #ffedd5', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>Bloqueado Parcial</span>
                                                                )}
                                                            </td>
                                                            {!isVisita && (
                                                                <td style={{ textAlign: 'center' }}>
                                                                    <button 
                                                                        className={lvl.status === 'Locked' || lvl.status === 'Partially Locked' ? 'primary-btn' : 'secondary-btn'}
                                                                        style={{ 
                                                                            padding: '6px 12px', 
                                                                            fontSize: '0.8rem',
                                                                            background: lvl.status === 'Locked' || lvl.status === 'Partially Locked' ? '#10b981' : '#64748b',
                                                                            color: '#fff',
                                                                            border: 'none'
                                                                        }}
                                                                        onClick={() => handleToggleLevelLock(lvl.id, lvl.status)}
                                                                    >
                                                                        {lvl.status === 'Locked' || lvl.status === 'Partially Locked' ? 'Desbloquear Curso' : 'Bloquear Curso'}
                                                                    </button>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {selectedLevelForLocksDetail && (
                            <div className="modal-overlay" style={{
                                position: 'fixed',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                zIndex: 9999,
                                padding: '20px'
                            }}>
                                <div className="modal-content" style={{
                                    background: '#fff',
                                    borderRadius: '12px',
                                    width: '100%',
                                    maxWidth: '650px',
                                    maxHeight: '85vh',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                                    overflow: 'hidden'
                                }}>
                                    {/* Header */}
                                    <div style={{
                                        padding: '20px',
                                        borderBottom: '1px solid #e2e8f0',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        background: '#f8fafc'
                                    }}>
                                        <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>
                                            Bloqueo por Asignatura: {selectedLevelForLocksDetail.name}
                                        </h3>
                                        <button 
                                            onClick={() => setSelectedLevelForLocksDetail(null)}
                                            style={{
                                                border: 'none',
                                                background: 'none',
                                                cursor: 'pointer',
                                                color: '#64748b',
                                                padding: '4px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            <X size={24} />
                                        </button>
                                    </div>

                                    {/* Subtitle / Period info */}
                                    <div style={{
                                        padding: '12px 20px',
                                        background: '#f1f5f9',
                                        borderBottom: '1px solid #e2e8f0',
                                        fontSize: '13px',
                                        color: '#475569',
                                        display: 'flex',
                                        gap: '15px'
                                    }}>
                                        <span><strong>Semestre:</strong> {locksPeriod}</span>
                                        <span><strong>Año:</strong> {locksYear}</span>
                                        <span>
                                            <strong>Bloqueo Global:</strong> {globalLock ? (
                                                <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Activo</span>
                                            ) : (
                                                <span style={{ color: '#10b981', fontWeight: 'bold' }}>Inactivo</span>
                                            )}
                                        </span>
                                    </div>

                                    {/* Body / Table */}
                                    <div style={{
                                        padding: '20px',
                                        overflowY: 'auto',
                                        flex: 1
                                    }}>
                                        {locksDetailLoading ? (
                                            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                                                <p>Cargando asignaturas...</p>
                                            </div>
                                        ) : levelLocksDetail.length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                                                <p>No hay asignaturas registradas para este curso en el año seleccionado.</p>
                                            </div>
                                        ) : (
                                            <table className="data-table" style={{ width: '100%' }}>
                                                <thead>
                                                    <tr>
                                                        <th>Asignatura</th>
                                                        <th>Docente</th>
                                                        <th>Estado</th>
                                                        {!isVisita && <th style={{ textAlign: 'center', width: '120px' }}>Acción</th>}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {levelLocksDetail.map((sub: any) => (
                                                        <tr key={sub.subjectId}>
                                                            <td style={{ fontWeight: '500' }}>{sub.subjectName}</td>
                                                            <td style={{ fontSize: '13px', color: '#475569' }}>{formatName(sub.teacherName)}</td>
                                                            <td>
                                                                {sub.isLocked ? (
                                                                    <span style={{
                                                                        background: '#fef2f2',
                                                                        color: '#ef4444',
                                                                        border: '1px solid #fee2e2',
                                                                        padding: '3px 6px',
                                                                        borderRadius: '4px',
                                                                        fontSize: '11px',
                                                                        fontWeight: 'bold',
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: '4px'
                                                                    }}>
                                                                        <Lock size={10} /> Bloqueado
                                                                        {sub.hasOverride && globalLock === false && (
                                                                            <span style={{ fontSize: '9px', fontWeight: 'normal', color: '#b91c1c' }}>(Manual)</span>
                                                                        )}
                                                                    </span>
                                                                ) : (
                                                                    <span style={{
                                                                        background: '#f0fdf4',
                                                                        color: '#10b981',
                                                                        border: '1px solid #dcfce7',
                                                                        padding: '3px 6px',
                                                                        borderRadius: '4px',
                                                                        fontSize: '11px',
                                                                        fontWeight: 'bold',
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: '4px'
                                                                    }}>
                                                                        <Unlock size={10} /> Abierto
                                                                        {sub.hasOverride && globalLock === true && (
                                                                            <span style={{ fontSize: '9px', fontWeight: 'normal', color: '#15803d' }}>(Manual)</span>
                                                                        )}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            {!isVisita && (
                                                                <td style={{ textAlign: 'center' }}>
                                                                    <button
                                                                        onClick={() => handleToggleSubjectLock(sub.subjectId, sub.isLocked)}
                                                                        className={sub.isLocked ? 'primary-btn' : 'secondary-btn'}
                                                                        style={{
                                                                            padding: '4px 10px',
                                                                            fontSize: '11px',
                                                                            background: sub.isLocked ? '#10b981' : '#ef4444',
                                                                            color: '#fff',
                                                                            border: 'none',
                                                                            borderRadius: '4px',
                                                                            fontWeight: 'bold',
                                                                            cursor: 'pointer'
                                                                        }}
                                                                    >
                                                                        {sub.isLocked ? 'Desbloquear' : 'Bloquear'}
                                                                    </button>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>

                                    {/* Footer */}
                                    <div style={{
                                        padding: '15px 20px',
                                        borderTop: '1px solid #e2e8f0',
                                        display: 'flex',
                                        justifyContent: 'flex-end',
                                        background: '#f8fafc'
                                    }}>
                                        <button 
                                            className="secondary-btn"
                                            onClick={() => setSelectedLevelForLocksDetail(null)}
                                            style={{ padding: '8px 16px' }}
                                        >
                                            Cerrar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Closing configSubTab === 'grades_lock' */}
                        
                        {configSubTab === 'external_links' && (
                            <div className="card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <h3 style={{ margin: 0 }}>Enlaces de Interés (Plataformas externas)</h3>
                                    {!isVisita && (
                                        <button className="primary-btn" onClick={handleCreateExternalLink}>
                                            <Plus size={18} /> Nuevo Enlace
                                        </button>
                                    )}
                                </div>
                                <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '20px' }}>
                                    Configure los accesos a plataformas de uso frecuente que les aparecerán a los docentes en su panel principal.
                                </p>
                                <div className="table-responsive">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Nombre del Sitio</th>
                                                <th>Enlace (URL)</th>
                                                {!isVisita && <th style={{ textAlign: 'center', width: '120px' }}>Acción</th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {externalLinks.length === 0 ? (
                                                <tr>
                                                    <td colSpan={isVisita ? 2 : 3} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                                                        No se han configurado enlaces externos de interés.
                                                    </td>
                                                </tr>
                                            ) : (
                                                externalLinks.map(l => (
                                                    <tr key={l.id}>
                                                        <td style={{ fontWeight: '600' }}>{l.name}</td>
                                                        <td>
                                                            <a href={l.url} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'underline', wordBreak: 'break-all' }}>
                                                                {l.url}
                                                            </a>
                                                        </td>
                                                        {!isVisita && (
                                                            <td style={{ textAlign: 'center' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                                                    <button 
                                                                        className="action-btn edit" 
                                                                        onClick={() => handleEditExternalLink(l)}
                                                                        title="Editar Enlace"
                                                                    >
                                                                        <Edit2 size={16} />
                                                                    </button>
                                                                    <button 
                                                                        className="action-btn delete" 
                                                                        onClick={() => handleDeleteExternalLink(l.id, l.name)}
                                                                        title="Eliminar Enlace"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                        
                    </div>
                )}

                {activeTab === 'reports' && (
                    <div className="card">
                        {selectedStudentReport ? (
                            <div style={{ padding: '20px' }}>
                                <button 
                                    className="secondary-btn" 
                                    onClick={() => {
                                        setSelectedStudentReport(null);
                                        if (reportsLevelId) {
                                            fetchLevelReports(reportsLevelId, reportsSemester);
                                        }
                                    }} 
                                    style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}
                                >
                                    <X size={18} /> Volver a la Lista de Estudiantes
                                </button>
                                <KinderReportForm 
                                    studentId={selectedStudentReport}
                                    studentName={formatName(students.find(s => s.id === selectedStudentReport)?.full_name)}
                                    token={token || ''}
                                    teacherName={user?.name || ''}
                                    levelName={levels.find(l => String(l.id) === String(reportsLevelId))?.name}
                                />
                            </div>
                        ) : (
                            <div style={{ padding: '20px' }}>
                                <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Generación de Informes al Hogar</h3>
                                <div style={{ marginBottom: '20px', display: 'flex', gap: '20px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <div>
                                            <label style={{ fontWeight: 'bold' }}>Seleccione Curso:</label>
                                            <select 
                                                className="swal2-input" 
                                                style={{ maxWidth: '250px', display: 'inline-block', margin: '0 0 0 10px' }}
                                                value={reportsLevelId}
                                                onChange={(e) => setReportsLevelId(e.target.value)}
                                            >
                                                <option value="">-- Seleccionar Nivel --</option>
                                                {levels.filter(l => l.report_template_id).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ fontWeight: 'bold' }}>Semestre:</label>
                                            <select 
                                                className="swal2-input" 
                                                style={{ maxWidth: '150px', display: 'inline-block', margin: '0 0 0 10px' }}
                                                value={reportsSemester}
                                                onChange={(e) => setReportsSemester(Number(e.target.value))}
                                            >
                                                <option value={1}>1er Semestre</option>
                                                <option value={2}>2do Semestre</option>
                                            </select>
                                        </div>
                                    </div>
                                    {reportsLevelId && (
                                        <button 
                                            className="primary-btn" 
                                            onClick={handlePrintAll}
                                            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f97316' }}
                                        >
                                            <Printer size={18} /> Imprimir Todos los Informes
                                        </button>
                                    )}
                                </div>
                                {reportsLevelId && (() => {
                                    const lvlStudents = students.filter(s => String(s.level_id) === reportsLevelId && !s.withdrawal_date);
                                    const selectedLvl = levels.find(l => String(l.id) === String(reportsLevelId));
                                    return (
                                        <div>
                                            {selectedLvl && selectedLvl.report_template_id && (
                                                <CoursePerformanceTable 
                                                    levelReports={levelReports}
                                                    levelTemplate={levelTemplate}
                                                    levelName={selectedLvl.name}
                                                />
                                            )}
                                            <table className="data-table">
                                                <thead>
                                                    <tr>
                                                        <th>N° Lista</th>
                                                        <th>Estudiante</th>
                                                        <th>Estado de Avance</th>
                                                        <th style={{ textAlign: 'center' }}>Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {lvlStudents.length === 0 ? (
                                                        <tr><td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>No hay estudiantes activos en este curso.</td></tr>
                                                    ) : (
                                                        lvlStudents.map(s => {
                                                            const progress = getStudentProgress(s.id);
                                                            return (
                                                                <tr key={s.id}>
                                                                    <td style={{ fontWeight: 'bold', color: '#64748b' }}>{s.list_number || '-'}</td>
                                                                    <td style={{ fontWeight: '500' }}>{formatName(s.full_name)}</td>
                                                                    <td>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '150px' }}>
                                                                            <div style={{ flex: 1, height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                                                                <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)', borderRadius: '4px' }} />
                                                                            </div>
                                                                            <span style={{ fontSize: '12px', fontWeight: '600', color: '#475569', minWidth: '35px', textAlign: 'right' }}>{progress}%</span>
                                                                        </div>
                                                                    </td>
                                                                    <td style={{ textAlign: 'center' }}>
                                                                        <button 
                                                                            className="primary-btn" 
                                                                            style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center' }}
                                                                            onClick={() => setSelectedStudentReport(s.id)}
                                                                        >
                                                                            <FileText size={14} style={{ marginRight: '5px' }} />
                                                                            Generar Informe
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                        {/* Hidden printable section for all reports */}
                        {isPrintingAll && (
                            <style>{`
                                @media print {
                                    body * {
                                        visibility: hidden;
                                    }
                                    .printable-section, .printable-section * {
                                        visibility: visible;
                                    }
                                    .printable-section {
                                        position: absolute;
                                        left: 0;
                                        top: 0;
                                        width: 100%;
                                    }
                                    .no-print {
                                        display: none !important;
                                    }
                                }
                            `}</style>
                        )}
                        <div className="printable-section" style={{ display: isPrintingAll ? 'block' : 'none' }}>
                            {(() => {
                                const lvlStudents = students.filter(s => String(s.level_id) === reportsLevelId && !s.withdrawal_date);
                                const selectedLvl = levels.find(l => String(l.id) === String(reportsLevelId));
                                const teacherName = selectedLvl?.homeroom_teacher_name || user?.name || '';
                                const struct = levelTemplate ? (typeof levelTemplate.structure_json === 'string' ? JSON.parse(levelTemplate.structure_json) : levelTemplate.structure_json) : [];
                                return lvlStudents.map((s, sIdx) => {
                                    const report = levelReports.find(r => r.student_id === s.id);
                                    const evalData = report ? (typeof report.evaluation_data === 'string' ? JSON.parse(report.evaluation_data) : report.evaluation_data) : {};
                                    const obs = report ? (report.observations || '') : '';
                                    return (
                                        <div key={s.id} style={{ pageBreakAfter: sIdx === lvlStudents.length - 1 ? 'auto' : 'always' }}>
                                            <PrintableKinderReport 
                                                studentName={s.full_name}
                                                semester={reportsSemester}
                                                year={new Date().getFullYear()}
                                                evaluationData={evalData}
                                                observations={obs}
                                                teacherName={teacherName}
                                                reportStructure={struct}
                                                levelName={selectedLvl?.name}
                                            />
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>
                )}

                {activeTab === 'profile' && (
                    <div className="card" style={{ maxWidth: '600px' }}>
                        <h3>Datos de Cuenta Administrador</h3>
                        <p style={{ color: '#64748b', marginBottom: '20px' }}>Actualice su información personal o cambie su clave de acceso maestro.</p>
                        
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            const form = e.target as any;
                            const email = form.email.value;
                            const password = form.password.value;
                            const confirm = form.confirm.value;

                            if (password && password !== confirm) {
                                return MySwal.fire('Error', 'Las contraseñas no coinciden', 'error');
                            }

                            try {
                                const res = await fetch('/_/backend/api/auth/me', {
                                    method: 'PUT',
                                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ email, password })
                                });
                                if (res.ok) {
                                    MySwal.fire('Éxito', 'Perfil actualizado correctamente', 'success');
                                    form.password.value = '';
                                    form.confirm.value = '';
                                } else {
                                    const data = await res.json();
                                    MySwal.fire('Error', data.error || 'Error al procesar la solicitud', 'error');
                                }
                            } catch (err) {
                                MySwal.fire({
                                    title: 'Error de Conexión',
                                    text: 'No se pudo establecer comunicación con la base de datos. Por favor, verifique su conexión.',
                                    icon: 'error',
                                    confirmButtonColor: '#6366f1'
                                });
                            }
                        }}>
                            <div className="form-group" style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Nombre Administrador</label>
                                <input type="text" className="swal2-input" style={{ width: '100%', margin: 0, background: '#f1f5f9' }} value={formatName(user?.name)} disabled />
                            </div>
                            <div className="form-group" style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Correo Electrónico</label>
                                <input name="email" type="email" className="swal2-input" style={{ width: '100%', margin: 0 }} defaultValue={(user as any)?.email} required disabled={isVisita} />
                            </div>
                            <hr style={{ margin: '25px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />
                            <div className="form-group" style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Nueva Contraseña Maestro</label>
                                <input name="password" type="password" className="swal2-input" style={{ width: '100%', margin: 0 }} placeholder={isVisita ? "No permitido en modo visita" : "Dejar en blanco para no cambiar"} disabled={isVisita} />
                            </div>
                            <div className="form-group" style={{ marginBottom: '25px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Confirmar Nueva Contraseña</label>
                                <input name="confirm" type="password" className="swal2-input" style={{ width: '100%', margin: 0 }} placeholder={isVisita ? "No permitido en modo visita" : "Confirmar contraseña"} disabled={isVisita} />
                            </div>
                            {!isVisita && (
                                <button type="submit" className="primary-btn" style={{ width: '100%', padding: '12px' }}>
                                    Guardar Cambios de Perfil
                                </button>
                            )}
                        </form>
                    </div>
                )}

                {activeTab === 'students' && (
                    <div className={!showEnrollmentForm && selectedLevelFilter !== '' ? "card card-split-layout" : "card"}>
                        <div className={!showEnrollmentForm && selectedLevelFilter !== '' ? "card-split-header" : ""}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <h3>Base de Datos de Estudiantes</h3>
                                {!showEnrollmentForm && (
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button className="primary-btn" style={{ background: '#10b981' }} onClick={handleExport} disabled={isUploading}>
                                            Descargar Planilla
                                        </button>
                                        {!isVisita && (
                                            <>
                                                <input 
                                                    type="file" 
                                                    ref={fileInputRef} 
                                                    style={{ display: 'none' }} 
                                                    accept=".xlsx" 
                                                    onChange={handleFileChange} 
                                                />
                                                <button 
                                                    className="primary-btn" 
                                                    style={{ background: '#6366f1' }} 
                                                    onClick={() => fileInputRef.current?.click()}
                                                    disabled={isUploading}
                                                >
                                                    {isUploading ? 'Subiendo...' : <><Upload size={18} /> Subir Planilla</>}
                                                </button>
                                                <button className="primary-btn" onClick={() => setShowEnrollmentForm(true)} disabled={isUploading}>
                                                    <Plus size={18} /> Nueva Matrícula Oficial
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            {showEnrollmentForm ? (
                                <EnrollmentForm levels={levels} onSubmit={handleEnrollSubmit} onCancel={() => setShowEnrollmentForm(false)} />
                            ) : (
                                <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <label style={{ fontWeight: 'bold', marginRight: '10px' }}>Filtrar por Curso:</label>
                                        <select 
                                            value={selectedLevelFilter} 
                                            onChange={(e) => setSelectedLevelFilter(e.target.value)}
                                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                        >
                                            <option value="">Seleccione un curso...</option>
                                            {levels.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                                        </select>
                                    </div>
                                    {selectedLevelFilter !== '' && !isVisita && (
                                        <button 
                                            className="primary-btn" 
                                            style={{ background: '#0284c7', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '0.9rem', boxShadow: '0 4px 6px -1px rgba(2, 132, 199, 0.2)' }}
                                            onClick={() => setShowReorderModal(true)}
                                        >
                                            <ListOrdered size={18} /> Ordenar Alumnos
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {!showEnrollmentForm && (
                            <>
                                {selectedLevelFilter === '' ? (
                                    <div style={{ padding: '40px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                                        <GraduationCap size={48} style={{ color: '#94a3b8', margin: '0 auto 10px' }} />
                                        <p style={{ color: '#64748b' }}>Seleccione un curso en el menú desplegable para ver el listado de estudiantes.</p>
                                    </div>
                                ) : (
                                    <div className="card-split-content">
                                        <table className="data-table">
                                            <thead><tr><th>N°</th><th>RUT</th><th>Nombre</th><th>Curso</th><th>Registrado</th><th>Acciones</th></tr></thead>
                                            <tbody>
                                                {students
                                                    .filter(s => s.level_name === selectedLevelFilter)
                                                    .sort((a, b) => {
                                                        const listA = a.list_number ?? 999999;
                                                        const listB = b.list_number ?? 999999;
                                                        if (listA !== listB) {
                                                            return listA - listB;
                                                        }
                                                        return a.full_name.localeCompare(b.full_name, 'es', { sensitivity: 'base' });
                                                    })
                                                    .map((s) => (
                                                    <tr key={s.id} style={s.status === 'RETIRADO' ? { color: '#ef4444', textDecoration: 'line-through', fontWeight: '500' } : {}}>
                                                        <td>
                                                            <input 
                                                                type="number"
                                                                defaultValue={s.list_number || ''}
                                                                onBlur={(e) => handleListNumberChange(s.id, e.target.value)}
                                                                disabled={isVisita}
                                                                style={{ width: '50px', padding: '4px', textAlign: 'center', borderRadius: '4px', border: '1px solid #cbd5e1', background: isVisita ? '#f1f5f9' : 'white' }}
                                                            />
                                                        </td>
                                                        <td>{s.run}</td>
                                                        <td title={s.status === 'RETIRADO' ? "Estudiante retirado" : undefined}>{formatName(s.full_name)}</td>
                                                        <td>{s.level_name}</td>
                                                        <td>{new Date(s.created_at).toLocaleDateString()}</td>
                                                        <td style={{ display: 'flex', gap: '5px' }}>
                                                            {!isVisita && (
                                                                <button onClick={() => setViewingStudentId(s.id)} title="Editar Datos Base de Datos" style={{ padding: '6px', background: '#059669', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                                                    <Edit2 size={14} />
                                                                </button>
                                                            )}
                                                            <button onClick={() => handlePrintOfficial(s.id)} title="Ver/Imprimir Ficha Oficial" style={{ padding: '6px', background: '#38bdf8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                                                <Printer size={14} />
                                                            </button>
                                                            <button onClick={() => handleViewObservations(s)} title="Libro de Vida" style={{ padding: '6px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                                                <BookOpen size={14} />
                                                            </button>
                                                            {!isVisita && (
                                                                <button onClick={() => handleConfigureStudentExemptions(s)} title="Exenciones / Exclusión de Asignaturas del Promedio Alumno" style={{ padding: '6px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                                                    <AlertTriangle size={14} />
                                                                </button>
                                                            )}
                                                            {!isVisita && (
                                                                <button onClick={() => handleDeleteStudent(s.id)} title="Dar de baja" style={{ padding: '6px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                                                    <X size={14} />
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {students.filter(s => s.level_name === selectedLevelFilter).length === 0 && (
                                                    <tr>
                                                        <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                                                            No hay estudiantes registrados en este curso.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {viewingStudentId && (
                    <StudentWindow 
                        studentId={viewingStudentId} 
                        token={token || ''} 
                        onClose={() => { setViewingStudentId(null); fetchData(); }} 
                        onPrint={handlePrintOfficial}
                    />
                )}

                {showReorderModal && selectedLevelFilter && (
                    <ReorderStudentsModal
                        isOpen={showReorderModal}
                        onClose={() => setShowReorderModal(false)}
                        levelName={selectedLevelFilter}
                        levelId={String(levels.find(l => l.name === selectedLevelFilter)?.id || '')}
                        students={students.filter(s => s.level_name === selectedLevelFilter)}
                        token={token || ''}
                        onSaveSuccess={fetchData}
                    />
                )}

                {selectedStudentForObs && (
                    <div className="card" style={{ marginTop: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3>Libro de Vida: {formatName(selectedStudentForObs.full_name)}</h3>
                            <button onClick={() => setSelectedStudentForObs(null)} className="logout-btn" style={{ width: 'auto', background: '#64748b' }}>Cerrar</button>
                        </div>
                        
                        {!isVisita && (
                            <form onSubmit={handleAddObservation} style={{ margin: '20px 0', padding: '15px', background: '#f1f5f9', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <textarea 
                                        style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                        placeholder="Nueva observación..."
                                        value={newObs.content}
                                        onChange={e => setNewObs({ ...newObs, content: e.target.value })}
                                        required
                                    />
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                        <select 
                                            value={newObs.type}
                                            onChange={e => setNewObs({ ...newObs, type: e.target.value as any })}
                                            style={{ padding: '8px', borderRadius: '6px' }}
                                        >
                                            <option value="Positive">Positiva</option>
                                            <option value="Negative">Negativa</option>
                                        </select>
                                        <button type="submit" className="primary-btn">Agregar</button>
                                    </div>
                                </div>
                            </form>
                        )}

                        <div className="observations-list">
                            {observations.length === 0 ? <p>No hay observaciones registradas.</p> : observations.map(obs => (
                                <div key={obs.id} style={{ 
                                    padding: '12px', 
                                    borderLeft: `4px solid ${obs.type === 'Positive' ? '#10b981' : '#ef4444'}`,
                                    background: '#fff',
                                    marginBottom: '10px',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b', marginBottom: '5px' }}>
                                        <span>{formatName(obs.teacher_name)}</span>
                                        <span>{new Date(obs.created_at).toLocaleString()}</span>
                                    </div>
                                    <p style={{ margin: 0 }}>{obs.content}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};
