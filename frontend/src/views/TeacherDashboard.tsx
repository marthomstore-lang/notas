import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Book, Calendar, Menu, X, ClipboardCheck, User, LayoutGrid, LayoutList } from 'lucide-react';
import { StudentWindow } from '../components/StudentWindow';
import Swal from 'sweetalert2';
import './Dashboard.css';

export const formatName = (name: string | undefined | null): string => {
    if (!name || name === 'No asignado' || name === '________________________') return name || '';
    
    // Si contiene minúsculas, asumimos que ya está en formato "Nombre Apellidos"
    const isAllUppercase = name === name.toUpperCase() && /[A-Z]/.test(name);
    if (!isAllUppercase) {
        return name;
    }
    
    const parts = name.trim().split(/\s+/);
    if (parts.length < 2) return name;
    
    let paternal = '';
    let maternal = '';
    let firstNames = '';
    
    if (parts.length >= 3) {
        paternal = parts[0];
        maternal = parts[1];
        firstNames = parts.slice(2).join(' ');
    } else if (parts.length === 2) {
        paternal = parts[0];
        firstNames = parts[1];
    }
    
    const toCamelCase = (str: string) => {
        return str.toLowerCase().split(' ').map(word => {
            if (!word) return '';
            return word.charAt(0).toUpperCase() + word.slice(1);
        }).join(' ');
    };
    
    const formattedName = `${firstNames} ${paternal} ${maternal}`.trim().replace(/\s+/g, ' ');
    return toCamelCase(formattedName);
};

interface Assignment {
    assignment_id: string;
    level_name: string;
    subject_name: string;
    academic_year: number;
}

export const TeacherDashboard = () => {
    const { user, logout, token } = useAuth();
    const navigate = useNavigate();
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
    const [activeView, setActiveView] = useState<'courses' | 'observations' | 'schedule' | 'profile'>('courses');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => (localStorage.getItem('teacherViewMode') as 'list' | 'grid') || 'list');

    const toggleViewMode = (mode: 'list' | 'grid') => {
        setViewMode(mode);
        localStorage.setItem('teacherViewMode', mode);
    };

    const handleNavClick = (view: 'courses' | 'observations' | 'schedule' | 'profile') => {
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

    useEffect(() => {
        if (token) {
            fetch('/_/backend/api/teacher/assignments', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => res.json())
            .then(data => setAssignments(data))
            .catch(err => console.error("Error fetching assignments:", err));
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
                    <button className={activeView === 'courses' ? 'active' : ''} onClick={() => handleNavClick('courses')}><Book size={18} /> Mis Cursos</button>
                    <button className={activeView === 'observations' ? 'active' : ''} onClick={() => { handleNavClick('observations'); setSelectedLevelId(null); setSelectedStudentId(null); }}><ClipboardCheck size={18} /> Libro de Vida</button>
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
                            {activeView === 'courses' && 'Mis Cursos Asignados'}
                            {activeView === 'observations' && 'Anotaciones / Libro de Vida'}
                            {activeView === 'schedule' && 'Mi Horario Semanal'}
                            {activeView === 'profile' && 'Configuración de Mi Cuenta'}
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
                                        <div className="card-icon"><Book size={24} /></div>
                                        <h3>{assignment.level_name}</h3>
                                        <p>Ver Estudiantes</p>
                                    </button>
                                ))}
                            </div>
                        ) : !selectedStudentId ? (
                            <div className="card card-split-layout">
                                <div className="card-split-header">
                                    <button onClick={() => setSelectedLevelId(null)} className="logout-btn" style={{ width: 'auto', background: '#64748b', marginBottom: '20px' }}>Volver a Cursos</button>
                                    <h3 style={{ margin: 0, marginBottom: '10px' }}>Seleccione un estudiante</h3>
                                </div>
                                <div className="card-split-content">
                                    <table className="data-table">
                                        <thead><tr><th>RUN</th><th>Nombre Alumno</th><th>Acción</th></tr></thead>
                                        <tbody>
                                            {students.map(s => (
                                                <tr key={s.id} style={s.status === 'RETIRADO' ? { color: '#ef4444', textDecoration: 'line-through', fontWeight: '500' } : {}}>
                                                    <td>{s.run}</td>
                                                    <td>{formatName(s.full_name)}</td>
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
            </main>

            {viewingStudentId && (
                <StudentWindow 
                    studentId={viewingStudentId} 
                    token={token || ''} 
                    onClose={() => setViewingStudentId(null)} 
                    onPrint={() => {}} 
                />
            )}
        </div>
    );
};
