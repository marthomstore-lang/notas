import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Book, Calendar, Menu, X, ClipboardCheck, User, LayoutGrid, LayoutList, ListOrdered, Users, BarChart3, Globe } from 'lucide-react';
import { StudentWindow } from '../components/StudentWindow';
import { ReorderStudentsModal } from '../components/ReorderStudentsModal';
import { KinderReportForm } from '../components/Reports/KinderReportForm';
import { CoursePerformanceTable } from '../components/Reports/CoursePerformanceTable';
import { GradesOverview } from '../components/Grades/GradesOverview';
import Swal from 'sweetalert2';
import './Dashboard.css';

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

export const getSubjectImageUrl = (subjectName: string): string => {
    const name = (subjectName || '').toLowerCase().trim();
    
    // Matemática / Medición
    if (name.includes('matemát') || name.includes('medición') || name.includes('cálculo') || name.includes('verificación')) {
        return 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=300&auto=format&fit=crop&q=60';
    }
    // Ciencias Naturales / Ciencias para la Ciudadanía
    if (name.includes('naturales') || name.includes('ciudadanía') || name.includes('química') || name.includes('física') || name.includes('biología') || name.includes('ciencias')) {
        return 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=300&auto=format&fit=crop&q=60';
    }
    // Lenguaje / Literatura / Lengua / Inglés / Idioma Extranjero
    if (name.includes('lenguaje') || name.includes('literatura') || name.includes('lengua') || name.includes('expresión literaria') || name.includes('inglés') || name.includes('ingles') || name.includes('extranjero')) {
        return 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=300&auto=format&fit=crop&q=60';
    }
    // Historia / Cs. Sociales / Ciudadana / Filosofía
    if (name.includes('historia') || name.includes('geografía') || name.includes('sociales') || name.includes('ciudadana') || name.includes('filosofía')) {
        return 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=300&auto=format&fit=crop&q=60';
    }
    // Música / Expresión Musical
    if (name.includes('música') || name.includes('musica') || name.includes('musical')) {
        return 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=60';
    }
    // Artes Visuales / Material Didáctico / Ambientación
    if (name.includes('artes') || name.includes('visuales') || name.includes('didáctico') || name.includes('ambientación')) {
        return 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=300&auto=format&fit=crop&q=60';
    }
    // Educación Física / Recreación
    if (name.includes('física') || name.includes('fisica') || name.includes('deporte') || name.includes('recreación') || name.includes('bienestar')) {
        return 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=300&auto=format&fit=crop&q=60';
    }
    // Tecnología / Electrotecnia / Procesos / Control / Automación / Robótica
    if (name.includes('tecnolog') || name.includes('electrotecnia') || name.includes('procesos') || name.includes('control')) {
        return 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=300&auto=format&fit=crop&q=60';
    }
    // Mecánica / Soldadura / Herramientas / Mantenimiento / Montaje / Maestranza / Banco / Planos
    if (name.includes('mecán') || name.includes('mecan') || name.includes('soldadura') || name.includes('herramientas') || name.includes('mantenimiento') || name.includes('montaje') || name.includes('maestranza') || name.includes('banco') || name.includes('planos')) {
        return 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=300&auto=format&fit=crop&q=60';
    }
    // Párvulos / Familia / Actividades Educativas / Orientación
    if (name.includes('párvulo') || name.includes('parvulo') || name.includes('actividades educativas') || name.includes('orientación') || name.includes('orientacion') || name.includes('familia')) {
        return 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=300&auto=format&fit=crop&q=60';
    }
    // Salud / Alimentación / Higiene / Seguridad
    if (name.includes('salud') || name.includes('alimentación') || name.includes('higiene') || name.includes('seguridad')) {
        return 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=300&auto=format&fit=crop&q=60';
    }
    // Religión
    if (name.includes('religión') || name.includes('religion')) {
        return 'https://images.unsplash.com/photo-1438032005730-c779502df39b?w=300&auto=format&fit=crop&q=60';
    }
    // Jefatura / Emprendimiento / Empleabilidad
    if (name.includes('jefatura') || name.includes('emprendimiento') || name.includes('empleabilidad')) {
        return 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=300&auto=format&fit=crop&q=60';
    }
    
    // Default
    return 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300&auto=format&fit=crop&q=60';
};

interface Assignment {
    assignment_id: string;
    level_id: string;
    level_name: string;
    subject_name: string;
    academic_year: number;
}

export const TeacherDashboard = () => {
    const { user, logout, token } = useAuth();
    const navigate = useNavigate();
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
    const [activeView, setActiveView] = useState<'home' | 'courses' | 'observations' | 'schedule' | 'profile' | 'homeroom' | 'overview'>('home');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => (localStorage.getItem('teacherViewMode') as 'list' | 'grid') || 'list');
    const [externalLinks, setExternalLinks] = useState<any[]>([]);

    const toggleViewMode = (mode: 'list' | 'grid') => {
        setViewMode(mode);
        localStorage.setItem('teacherViewMode', mode);
    };

    const handleNavClick = (view: 'home' | 'courses' | 'observations' | 'schedule' | 'profile' | 'homeroom' | 'overview') => {
        setActiveView(view);
        if (window.innerWidth < 768) {
            setIsSidebarOpen(false);
        }
    };
    const [selectedLevelId, setSelectedLevelId] = useState<number | null>(null);

    const [students, setStudents] = useState<any[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [observations, setObservations] = useState<any[]>([]);
    const [newObs, setNewObs] = useState({ content: '', type: 'Positive' });
    const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);
    const [showReorderModal, setShowReorderModal] = useState(false);
    
    const [homeroomData, setHomeroomData] = useState<{ isHomeroomTeacher: boolean, level?: any, students?: any[] }>({ isHomeroomTeacher: false });
    const [selectedHomeroomStudent, setSelectedHomeroomStudent] = useState<any>(null);
    const [homeroomSemester, setHomeroomSemester] = useState(1);
    const [levelReports, setLevelReports] = useState<any[]>([]);
    const [levelTemplate, setLevelTemplate] = useState<any>(null);

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

    useEffect(() => {
        if (token && homeroomData.isHomeroomTeacher && homeroomData.level?.id) {
            fetchLevelReports(homeroomData.level.id, homeroomSemester);
        }
    }, [token, homeroomData.isHomeroomTeacher, homeroomData.level?.id, homeroomSemester]);

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

    useEffect(() => {
        if (token) {
            fetch('/_/backend/api/teacher/assignments', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => res.json())
            .then(data => setAssignments(data))
            .catch(err => console.error("Error fetching assignments:", err));
            
            fetch('/_/backend/api/teacher/homeroom', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => res.json())
            .then(data => setHomeroomData(data))
            .catch(err => console.error("Error fetching homeroom:", err));

            fetch('/_/backend/api/external-links', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => res.json())
            .then(data => setExternalLinks(Array.isArray(data) ? data : []))
            .catch(err => console.error("Error fetching external links:", err));
        }
    }, [token]);

    const loadStudentsForObs = async (assignmentId: string) => {
        setSelectedLevelId(assignmentId as any);
        const res = await fetch(`/_/backend/api/teacher/grades/${assignmentId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            setStudents(data.students || []);
        }
    };

    const loadObservations = async (studentId: string) => {
        setSelectedStudentId(studentId);
        const res = await fetch(`/_/backend/api/admin/students/${studentId}/observations`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            setObservations(await res.json());
        }
    };

    const handleAddObservation = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch(`/_/backend/api/admin/students/${selectedStudentId}/observations`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(newObs)
        });
        if (res.ok) {
            loadObservations(selectedStudentId!);
            setNewObs({ content: '', type: 'Positive' });
        }
    };

    const currentAssignment = assignments.find(a => String(a.assignment_id) === String(selectedLevelId));

    return (
        <div className="dashboard-layout">
            <div className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} onClick={() => setIsSidebarOpen(false)}></div>
            <aside className={`sidebar ${isSidebarOpen ? 'open' : 'collapsed'}`}>
                <div className="sidebar-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2>Docente</h2>
                        {isSidebarOpen && (
                            <button className="sidebar-close-btn" title="Ocultar Menú" onClick={() => setIsSidebarOpen(false)}>
                                <X size={20} />
                            </button>
                        )}
                    </div>
                    <p>{formatName(user?.name)}</p>
                </div>
                <nav className="sidebar-nav">
                    <button className={activeView === 'home' ? 'active' : ''} onClick={() => handleNavClick('home')}><LayoutGrid size={18} /> Inicio</button>
                    <button className={activeView === 'courses' ? 'active' : ''} onClick={() => handleNavClick('courses')}><Book size={18} /> Mis Cursos</button>
                    <button className={activeView === 'observations' ? 'active' : ''} onClick={() => { handleNavClick('observations'); setSelectedLevelId(null); setSelectedStudentId(null); }}><ClipboardCheck size={18} /> Libro de Vida</button>
                    {homeroomData.isHomeroomTeacher && homeroomData.level?.report_template_id && (
                        <button className={activeView === 'homeroom' ? 'active' : ''} onClick={() => handleNavClick('homeroom')}><Users size={18} /> Jefatura</button>
                    )}
                    {homeroomData.isHomeroomTeacher && (
                        <button className={activeView === 'overview' ? 'active' : ''} onClick={() => handleNavClick('overview')}><BarChart3 size={18} /> Panorama de Notas</button>
                    )}
                    <button className={activeView === 'schedule' ? 'active' : ''} onClick={() => handleNavClick('schedule')}><Calendar size={18} /> Horario</button>
                    <button className={activeView === 'profile' ? 'active' : ''} onClick={() => handleNavClick('profile')}><User size={18} /> Mi Cuenta</button>
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
                            {activeView === 'home' && 'Inicio'}
                            {activeView === 'courses' && 'Mis Cursos Asignados'}
                            {activeView === 'observations' && 'Anotaciones / Libro de Vida'}
                            {activeView === 'schedule' && 'Mi Horario Semanal'}
                            {activeView === 'profile' && 'Configuración de Mi Cuenta'}
                            {activeView === 'homeroom' && 'Jefatura y Reportes'}
                            {activeView === 'overview' && 'Panorama de Calificaciones'}
                        </h1>
                    </div>
                    {((activeView === 'courses') || (activeView === 'observations' && !selectedLevelId)) && (
                        <div className="view-mode-toggle">
                            <button 
                                className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                                onClick={() => toggleViewMode('list')}
                                title="Vista de Lista"
                            >
                                <LayoutList size={20} />
                            </button>
                            <button 
                                className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                                onClick={() => toggleViewMode('grid')}
                                title="Vista de Cuadrícula"
                            >
                                <LayoutGrid size={20} />
                            </button>
                        </div>
                    )}
                </header>
                
                {activeView === 'home' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div className="card" style={{ 
                            background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', 
                            color: 'white', 
                            padding: '30px',
                            borderRadius: '12px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}>
                            <h2 style={{ margin: '0 0 10px 0', fontSize: '1.8rem' }}>¡Hola, {formatName(user?.name)}!</h2>
                            <p style={{ margin: 0, opacity: 0.9, fontSize: '1.1rem' }}>Bienvenido al Portal Docente de Liceo Pro.</p>
                        </div>

                        <div className="card">
                            <h3 style={{ margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Globe size={22} style={{ color: '#3b82f6' }} /> Plataformas de Interés
                            </h3>
                            <p style={{ color: '#64748b', marginBottom: '20px' }}>
                                Acceda directamente a los sitios y recursos oficiales haciendo clic en cualquiera de los enlaces a continuación:
                            </p>
                            
                            {externalLinks.length === 0 ? (
                                <p style={{ color: '#64748b', fontStyle: 'italic' }}>No se han configurado enlaces de interés todavía.</p>
                            ) : (
                                <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
                                    gap: '15px',
                                    marginTop: '10px'
                                }}>
                                    {externalLinks.map(l => (
                                        <a 
                                            key={l.id}
                                            href={l.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="quick-link-card"
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '15px',
                                                padding: '16px 20px',
                                                borderRadius: '10px',
                                                border: '1px solid #e2e8f0',
                                                backgroundColor: '#ffffff',
                                                color: '#1e293b',
                                                textDecoration: 'none',
                                                fontWeight: '600',
                                                transition: 'all 0.2s ease-in-out',
                                                cursor: 'pointer',
                                                boxShadow: '0 2px 4px 0 rgba(0, 0, 0, 0.05)'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.borderColor = '#3b82f6';
                                                e.currentTarget.style.backgroundColor = '#eff6ff';
                                                e.currentTarget.style.transform = 'translateY(-3px)';
                                                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(59, 130, 246, 0.1), 0 4px 6px -4px rgba(59, 130, 246, 0.1)';
                                                const title = e.currentTarget.querySelector('.link-title') as HTMLElement;
                                                if (title) title.style.color = '#2563eb';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.borderColor = '#e2e8f0';
                                                e.currentTarget.style.backgroundColor = '#ffffff';
                                                e.currentTarget.style.transform = 'none';
                                                e.currentTarget.style.boxShadow = '0 2px 4px 0 rgba(0, 0, 0, 0.05)';
                                                const title = e.currentTarget.querySelector('.link-title') as HTMLElement;
                                                if (title) title.style.color = '#1e293b';
                                            }}
                                        >
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '50%',
                                                backgroundColor: '#dbeafe',
                                                color: '#2563eb',
                                                flexShrink: 0
                                            }}>
                                                <Globe size={20} />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0 }}>
                                                <span className="link-title" style={{ 
                                                    fontSize: '1.05rem', 
                                                    transition: 'color 0.2s',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis'
                                                }} title={l.name}>
                                                    {l.name}
                                                </span>
                                                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'normal' }}>
                                                    Abrir plataforma externa
                                                </span>
                                            </div>
                                            <div style={{ color: '#94a3b8', flexShrink: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>
                                                &rarr;
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeView === 'courses' && (
                    <div className={`assignments-grid view-${viewMode}`}>
                        {assignments.map(assignment => (
                            <button 
                                key={assignment.assignment_id} 
                                className="card assignment-card" 
                                onClick={() => navigate(`/teacher/grades/${assignment.assignment_id}`)}
                                aria-label={`Curso ${assignment.level_name}, Asignatura ${assignment.subject_name}`}
                                style={{ textAlign: 'left', width: '100%', border: 'none', cursor: 'pointer' }}
                            >
                                <img 
                                    src={getSubjectImageUrl(assignment.subject_name)} 
                                    alt="" 
                                    className="assignment-card-bg" 
                                />
                                <div className="card-icon"><Book size={24} /></div>
                                <h3>{assignment.level_name}</h3>
                                <p>{assignment.subject_name}</p>
                                <p className="academic-year">Año: {assignment.academic_year}</p>
                            </button>
                        ))}
                    </div>
                )}

                {activeView === 'observations' && (
                    <div>
                        {!selectedLevelId ? (
                            <div className={`assignments-grid view-${viewMode}`}>
                                {assignments.map(assignment => (
                                    <button 
                                        key={assignment.assignment_id} 
                                        className="card assignment-card" 
                                        onClick={() => loadStudentsForObs(assignment.assignment_id)}
                                        aria-label={`Libro de vida de ${assignment.level_name}`}
                                        style={{ textAlign: 'left', width: '100%', border: 'none', cursor: 'pointer' }}
                                    >
                                        <img 
                                            src={getSubjectImageUrl(assignment.subject_name)} 
                                            alt="" 
                                            className="assignment-card-bg" 
                                        />
                                        <div className="card-icon"><Book size={24} /></div>
                                        <h3>{assignment.level_name}</h3>
                                        <p>{assignment.subject_name}</p>
                                        <p className="academic-year">Ver Estudiantes</p>
                                    </button>
                                ))}
                            </div>
                        ) : !selectedStudentId ? (
                            <div className="card card-split-layout">
                                <div className="card-split-header">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                                        <button onClick={() => setSelectedLevelId(null)} className="logout-btn" style={{ width: 'auto', background: '#64748b', margin: 0 }}>Volver a Cursos</button>
                                        {currentAssignment && (
                                            <button 
                                                onClick={() => setShowReorderModal(true)} 
                                                className="secondary-btn" 
                                                style={{ display: 'flex', alignItems: 'center', gap: '6px', width: 'auto' }}
                                            >
                                                <ListOrdered size={18} /> Ordenar Alumnos
                                            </button>
                                        )}
                                    </div>
                                    <h3 style={{ margin: 0, marginBottom: '10px' }}>Seleccione un estudiante</h3>
                                </div>
                                <div className="card-split-content">
                                    <table className="data-table">
                                        <thead><tr><th>RUN</th><th>Nombre Alumno</th><th>Acción</th></tr></thead>
                                        <tbody>
                                            {[...students].sort((a, b) => {
                                                const listA = a.list_number ?? 999999;
                                                const listB = b.list_number ?? 999999;
                                                if (listA !== listB) return listA - listB;
                                                return a.full_name.localeCompare(b.full_name, 'es', { sensitivity: 'base' });
                                            }).map(s => (
                                                <tr key={s.id} style={s.status === 'RETIRADO' ? { color: '#ef4444', textDecoration: 'line-through', fontWeight: '500' } : {}}>
                                                    <td>{s.run}</td>
                                                    <td title={s.status === 'RETIRADO' ? "Estudiante retirado" : undefined}>{formatName(s.full_name)}</td>
                                                    <td style={{ display: 'flex', gap: '5px' }}>
                                                        <button className="primary-btn" onClick={() => loadObservations(s.id)}>Libro de Vida</button>
                                                        <button className="secondary-btn" title="Ver Expediente" onClick={() => setViewingStudentId(s.id)}>
                                                            <User size={16} /> Ficha
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="card">
                                <button onClick={() => setSelectedStudentId(null)} className="logout-btn" style={{ width: 'auto', background: '#64748b', marginBottom: '20px' }}>Volver a Estudiantes</button>
                                <h3>Libro de Vida</h3>
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
                                <div className="observations-list">
                                    {observations.length === 0 ? <p>No hay observaciones.</p> : observations.map(obs => (
                                        <div key={obs.id} style={{ padding: '12px', borderLeft: `4px solid ${obs.type === 'Positive' ? '#10b981' : '#ef4444'}`, background: '#fff', marginBottom: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b', marginBottom: '5px' }}>
                                                <span>{formatName(obs.teacher_name)}</span>
                                                <span>{new Date(obs.created_at.replace(' ', 'T') + 'Z').toLocaleString()}</span>
                                            </div>
                                            <p style={{ margin: 0 }}>{obs.content}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeView === 'homeroom' && (
                    <div>
                        {homeroomData.isHomeroomTeacher ? (
                            !homeroomData.level?.report_template_id ? (
                                <div className="card">
                                    <h3>Jefatura y Reportes</h3>
                                    <p style={{ color: '#64748b' }}>No hay una plantilla de informe de personalidad asignada para este curso en este momento.</p>
                                </div>
                            ) : !selectedHomeroomStudent ? (
                                <div className="card">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                                        <h3 style={{ margin: 0 }}>Mi Jefatura: {homeroomData.level?.name}</h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Semestre:</label>
                                            <select 
                                                value={homeroomSemester} 
                                                onChange={e => setHomeroomSemester(Number(e.target.value))} 
                                                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#fff' }}
                                            >
                                                <option value={1}>1er Semestre</option>
                                                <option value={2}>2do Semestre</option>
                                            </select>
                                        </div>
                                    </div>
                                    <p style={{ color: '#64748b', marginBottom: '20px' }}>Seleccione un estudiante para generar o editar su Informe al Hogar.</p>
                                    {homeroomData.level && homeroomData.level.report_template_id && (
                                        <CoursePerformanceTable 
                                            levelReports={levelReports}
                                            levelTemplate={levelTemplate}
                                            levelName={homeroomData.level.name}
                                        />
                                    )}
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>RUN</th>
                                                <th>Nombre Alumno</th>
                                                <th>Estado</th>
                                                <th>Estado de Avance</th>
                                                <th>Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {homeroomData.students?.map(s => {
                                                const progress = getStudentProgress(s.id);
                                                return (
                                                    <tr key={s.id} style={s.status === 'RETIRADO' ? { color: '#ef4444', textDecoration: 'line-through', fontWeight: '500' } : {}}>
                                                        <td>{s.run}</td>
                                                        <td>{formatName(s.full_name)}</td>
                                                        <td>{s.status}</td>
                                                        <td>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '150px' }}>
                                                                <div style={{ flex: 1, height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                                                    <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)', borderRadius: '4px' }} />
                                                                </div>
                                                                <span style={{ fontSize: '12px', fontWeight: '600', color: '#475569', minWidth: '35px', textAlign: 'right' }}>{progress}%</span>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <button className="primary-btn" onClick={() => setSelectedHomeroomStudent(s)}>Informe al Hogar ({homeroomData.level?.name || ''})</button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {(!homeroomData.students || homeroomData.students.length === 0) && (
                                                <tr><td colSpan={5} style={{ textAlign: 'center' }}>No hay estudiantes registrados.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div>
                                    <button 
                                        onClick={() => {
                                            setSelectedHomeroomStudent(null);
                                            if (homeroomData.level?.id) {
                                                fetchLevelReports(homeroomData.level.id, homeroomSemester);
                                            }
                                        }} 
                                        className="secondary-btn" 
                                        style={{ marginBottom: '20px' }}
                                    >
                                        Volver a Jefatura
                                    </button>
                                    <KinderReportForm 
                                        studentId={selectedHomeroomStudent.id} 
                                        studentName={formatName(selectedHomeroomStudent.full_name)} 
                                        token={token || ''}
                                        teacherName={formatName(user?.name)}
                                        levelName={homeroomData.level?.name}
                                    />
                                </div>
                            )
                        ) : (
                            <div className="card">
                                <h3>Jefatura</h3>
                                <p style={{ color: '#64748b' }}>No tienes una jefatura asignada en este momento.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeView === 'schedule' && (
                    <div className="card">
                        <h3>Horario Semanal</h3>
                        <p style={{ color: '#64748b' }}>La asignación de horarios estará disponible en la próxima versión del sistema centralizado.</p>
                        <div style={{ marginTop: '20px', padding: '40px', background: '#f8fafc', borderRadius: '8px', textAlign: 'center', border: '2px dashed #cbd5e1' }}>
                            <Calendar size={48} color="#94a3b8" style={{ marginBottom: '10px' }} />
                            <h4>Módulo en Construcción</h4>
                        </div>
                    </div>
                )}

                {activeView === 'profile' && (
                    <div className="card" style={{ maxWidth: '600px' }}>
                        <h3>Mis Datos Personales</h3>
                        <p style={{ color: '#64748b', marginBottom: '20px' }}>Actualice su correo electrónico o cambie su contraseña de acceso.</p>
                        
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            const form = e.target as any;
                            const email = form.email.value;
                            const password = form.password.value;
                            const confirm = form.confirm.value;

                            if (password && password !== confirm) {
                                return Swal.fire('Error', 'Las contraseñas no coinciden', 'error');
                            }

                            try {
                                const res = await fetch('/_/backend/api/auth/me', {
                                    method: 'PUT',
                                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ email, password })
                                });
                                if (res.ok) {
                                    Swal.fire('Éxito', 'Perfil actualizado correctamente', 'success');
                                    form.password.value = '';
                                    form.confirm.value = '';
                                } else {
                                    const data = await res.json();
                                    Swal.fire('Error', data.error || 'Error al procesar la solicitud', 'error');
                                }
                            } catch (err) {
                                Swal.fire({
                                    title: 'Error de Conexión',
                                    text: 'No se pudo establecer comunicación con la base de datos. Por favor, verifique su conexión.',
                                    icon: 'error',
                                    confirmButtonColor: '#6366f1'
                                });
                            }
                        }}>
                             <div className="form-group" style={{ marginBottom: '15px' }}>
                                 <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Nombre Completo</label>
                                 <input type="text" className="swal2-input" style={{ width: '100%', margin: 0, background: '#f1f5f9' }} value={formatName(user?.name)} disabled />
                             </div>
                            <div className="form-group" style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Correo Electrónico</label>
                                <input name="email" type="email" className="swal2-input" style={{ width: '100%', margin: 0 }} defaultValue={(user as any)?.email} required />
                            </div>
                            <hr style={{ margin: '25px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />
                            <div className="form-group" style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Nueva Contraseña</label>
                                <input name="password" type="password" className="swal2-input" style={{ width: '100%', margin: 0 }} placeholder="Dejar en blanco para no cambiar" />
                            </div>
                            <div className="form-group" style={{ marginBottom: '25px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Confirmar Nueva Contraseña</label>
                                <input name="confirm" type="password" className="swal2-input" style={{ width: '100%', margin: 0 }} placeholder="Confirmar contraseña" />
                            </div>
                            <button type="submit" className="primary-btn" style={{ width: '100%', padding: '12px' }}>
                                Guardar Cambios
                            </button>
                        </form>
                    </div>
                )}

                {activeView === 'overview' && (
                    <GradesOverview restrictToLevelId={homeroomData.level?.id} />
                )}
            </main>

            {viewingStudentId && (
                <StudentWindow 
                    studentId={viewingStudentId} 
                    token={token || ''} 
                    onClose={() => setViewingStudentId(null)} 
                    onPrint={() => {}} 
                />
            )}

            {showReorderModal && currentAssignment && (
                <ReorderStudentsModal
                    isOpen={showReorderModal}
                    onClose={() => setShowReorderModal(false)}
                    levelId={currentAssignment.level_id}
                    levelName={currentAssignment.level_name}
                    students={students}
                    token={token || ''}
                    onSaveSuccess={() => {
                        loadStudentsForObs(selectedLevelId as any);
                    }}
                />
            )}
        </div>
    );
};
