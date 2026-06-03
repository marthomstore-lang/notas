import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Plus, Users, BookOpen, GraduationCap, Menu, X, Printer, User, Upload, Edit2, Trash2, BarChart3, Settings, ListOrdered, PieChart } from 'lucide-react';
import { EnrollmentForm } from '../components/OfficialForm/EnrollmentForm';
import { OfficialEnrollmentForm } from '../components/OfficialForm/OfficialEnrollmentForm';
import { StudentWindow } from '../components/StudentWindow';
import { ReorderStudentsModal } from '../components/ReorderStudentsModal';
import { GradesSheet } from '../components/Grades/GradesSheet';
import { GradesOverview } from '../components/Grades/GradesOverview';
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
    const [activeTab, setActiveTab] = useState<'config' | 'students' | 'grades' | 'overview' | 'audit' | 'profile'>(() => {
        const saved = localStorage.getItem('adminActiveTab');
        return (['config', 'students', 'grades', 'overview', 'audit', 'profile'].includes(saved as string)) ? (saved as any) : 'grades';
    });
    const [configSubTab, setConfigSubTab] = useState<'teachers' | 'courses' | 'subjects' | 'assignments' | 'homeroom' | 'subject_order'>(() => {
        const saved = localStorage.getItem('adminConfigSubTab');
        return (['teachers', 'courses', 'subjects', 'assignments', 'homeroom', 'subject_order'].includes(saved as string)) ? (saved as any) : 'teachers';
    });
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);

    const handleNavClick = (tab: 'config' | 'students' | 'grades' | 'overview' | 'audit' | 'profile', subTab?: 'teachers' | 'courses' | 'subjects' | 'assignments' | 'homeroom' | 'subject_order') => {
        setActiveTab(tab);
        if (subTab) setConfigSubTab(subTab);
        if (window.innerWidth < 768) {
            setIsSidebarOpen(false);
        }
    };

    useEffect(() => {
        localStorage.setItem('adminActiveTab', activeTab);
    }, [activeTab]);

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
    const [assignmentTeacherFilter, setAssignmentTeacherFilter] = useState('');
    const [assignmentLevelFilter, setAssignmentLevelFilter] = useState('');

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
        const { value: name } = await MySwal.fire({
            title: 'Nueva Asignatura Global',
            input: 'text',
            inputPlaceholder: 'Nombre de la asignatura',
            showCancelButton: true
        });
        if (name) {
            await fetch('/_/backend/api/admin/subjects', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            fetchData();
            MySwal.fire('Éxito', 'Asignatura creada', 'success');
        }
    };

    const handleEditSubject = async (subject: any) => {
        const { value: name } = await MySwal.fire({
            title: 'Editar Asignatura Global',
            input: 'text',
            inputValue: subject.name,
            inputPlaceholder: 'Nombre de la asignatura',
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar'
        });
        if (name && name !== subject.name) {
            const res = await fetch(`/_/backend/api/admin/subjects/${subject.id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            if (res.ok) {
                fetchData();
                MySwal.fire('Actualizado', 'La asignatura ha sido renombrada.', 'success');
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

    const handleAssign = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const data = {
            teacherId: form.teacherId.value,
            levelId: form.levelId.value,
            subjectId: form.subjectId.value,
            academicYear: new Date().getFullYear()
        };
        const res = await fetch('/_/backend/api/admin/assignments', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            fetchData();
            MySwal.fire('Éxito', "Asignación creada con éxito.", 'success');
        } else {
            MySwal.fire('Error', "Asignación ya existe o datos inválidos.", 'error');
        }
    };

    const handleDeleteAssignment = async (id: string) => {
        const result = await MySwal.fire({
            title: '¿Eliminar asignación?',
            text: "Esto quitará al profesor de la asignatura en este curso.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            const res = await fetch(`/_/backend/api/admin/assignments/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                fetchData();
                MySwal.fire('Eliminado', 'Asignación eliminada', 'success');
            }
        }
    };

    const handleEditAssignment = async (assignment: any) => {
        const teacherOptionsHtml = teachers.map((t: any) => 
            `<option value="${t.id}" ${t.id === assignment.teacher_id ? 'selected' : ''}>${t.name}</option>`
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
                        <label style="font-weight: 500; font-size: 0.9rem; color: #475569; display: block; margin-bottom: 5px;">Docente:</label>
                        <select id="swal-teacher-select" class="swal2-select" style="width: 100%; margin: 0; box-sizing: border-box;">
                            ${teacherOptionsHtml}
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
                const teacherId = (document.getElementById('swal-teacher-select') as HTMLSelectElement).value;
                const levelId = (document.getElementById('swal-level-select') as HTMLSelectElement).value;
                const subjectId = (document.getElementById('swal-subject-select') as HTMLSelectElement).value;
                return { teacherId, levelId, subjectId };
            }
        });
        
        if (formValues) {
            const res = await fetch(`/_/backend/api/admin/assignments/${assignment.id}`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${token}`, 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify(formValues)
            });
            if (res.ok) {
                fetchData();
                MySwal.fire('Éxito', "Asignación actualizada con éxito.", 'success');
            } else {
                const err = await res.json();
                MySwal.fire('Error', err.error || "No se pudo actualizar la asignación.", 'error');
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
                            {activeTab === 'config' && (
                                <>
                                    Configuración de Sistema: {
                                        configSubTab === 'teachers' ? 'Usuarios del Sistema' :
                                        configSubTab === 'courses' ? 'Cursos' :
                                        configSubTab === 'subjects' ? 'Asignaturas' :
                                        configSubTab === 'assignments' ? 'Asignaciones' :
                                        configSubTab === 'homeroom' ? 'Profesores Jefe' :
                                        configSubTab === 'subject_order' ? 'Orden de Asignaturas en Informes' : ''
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
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                        <h3 style={{ margin: 0 }}>Asignaturas Globales</h3>
                                        {!isVisita && <button className="primary-btn" onClick={handleCreateSubject}><Plus size={18} /> Nueva Asignatura</button>}
                                    </div>
                                </div>
                                <div className="card-split-content">
                                    <table className="data-table">
                                        <thead><tr><th>Nombre</th>{!isVisita && <th>Acciones</th>}</tr></thead>
                                        <tbody>
                                            {subjects.map(s => (
                                                <tr key={s.id}>
                                                    <td>{s.name}</td>
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
                                            ))}
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
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                                                <div>
                                                    <label>Docente:</label>
                                                    <select name="teacherId" required>
                                                        <option value="">Seleccione Docente...</option>
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
                                        <thead><tr><th>Curso</th><th>Asignatura</th><th>Docente</th>{!isVisita && <th style={{ textAlign: 'center' }}>Acciones</th>}</tr></thead>
                                        <tbody>
                                            {assignments
                                                .filter(a => !assignmentLevelFilter || String(a.level_id) === assignmentLevelFilter)
                                                .filter(a => !assignmentTeacherFilter || String(a.teacher_id) === assignmentTeacherFilter)
                                                .map(a => (
                                                    <tr key={a.id}>
                                                        <td>{a.level_name}</td>
                                                        <td>{a.subject_name}</td>
                                                        <td>{formatName(a.teacher_name)}</td>
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
                                                                        onClick={() => handleDeleteAssignment(a.id)}
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
