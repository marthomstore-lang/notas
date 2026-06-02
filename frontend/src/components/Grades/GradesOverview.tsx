import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BarChart3, Users, AlertTriangle, Check, X, Printer, RefreshCw, BookOpen } from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import './GradesOverview.css';

const MySwal = withReactContent(Swal);

export const GradesOverview: React.FC = () => {
    const { token } = useAuth();
    const [levels, setLevels] = useState<any[]>([]);
    
    const [filters, setFilters] = useState(() => {
        const saved = localStorage.getItem('overviewFilters');
        const parsed = saved ? JSON.parse(saved) : null;
        return {
            year: parsed?.year || '2026',
            levelId: parsed?.levelId || '',
            period: parsed?.period || '1er Semestre'
        };
    });

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        localStorage.setItem('overviewFilters', JSON.stringify(filters));
    }, [filters]);

    // Fetch levels for filter
    useEffect(() => {
        if (!token) return;
        fetch('/_/backend/api/admin/grades/filters', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
            const levelOrder = [
                'Pre-Kinder', 'Kínder', 
                '1° Básico', '2° Básico', '3° Básico', '4° Básico', 
                '5° Básico', '6° Básico', '7° Básico', '8° Básico',
                '1° Medio', '2° Medio A', '2° Medio B',
                '3° Mecánica', '3° Medio Párvulo', 
                '4° Mecánica', '4° Medio Párvulo',
                'Taller Laboral'
            ];

            const sortedLevels = (Array.isArray(data.levels) ? data.levels : [])
                .filter((l: any) => levelOrder.includes(l.name))
                .sort((a: any, b: any) => levelOrder.indexOf(a.name) - levelOrder.indexOf(b.name));

            setLevels(sortedLevels);
            if (sortedLevels.length > 0 && !filters.levelId) {
                setFilters(f => ({ ...f, levelId: sortedLevels[0].id }));
            }
        })
        .catch(err => console.error("Error fetching levels:", err));
    }, [token]);

    // Fetch overview statistics
    const fetchOverview = async () => {
        if (!filters.levelId || !token) return;
        setLoading(true);
        try {
            const res = await fetch(`/_/backend/api/admin/grades/overview?levelId=${filters.levelId}&year=${filters.year}&period=${filters.period}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const result = await res.json();
                setData(result);
            } else {
                const err = await res.json();
                MySwal.fire('Error', err.error || 'No se pudo obtener el panorama', 'error');
            }
        } catch (error) {
            console.error("Error fetching overview data:", error);
            MySwal.fire('Error', 'Error de conexión con el servidor', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOverview();
    }, [filters, token]);

    const isGpaRed = (gpaStr: string) => {
        const val = parseFloat(gpaStr.replace(',', '.'));
        return !isNaN(val) && val < 4.0;
    };

    return (
        <div className="overview-container">
            {/* Filters Bar */}
            <div className="card overview-filters-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <div className="filter-item">
                            <label>Año:</label>
                            <select value={filters.year} onChange={e => setFilters({...filters, year: e.target.value})}>
                                <option value="2026">2026</option>
                                <option value="2025">2025</option>
                            </select>
                        </div>
                        <div className="filter-item">
                            <label>Curso:</label>
                            <select value={filters.levelId} onChange={e => setFilters({...filters, levelId: e.target.value})}>
                                <option value="">Seleccione Curso</option>
                                {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                        </div>
                        <div className="filter-item">
                            <label>Período:</label>
                            <select value={filters.period} onChange={e => setFilters({...filters, period: e.target.value})}>
                                <option value="1er Semestre">1er Semestre</option>
                                <option value="2do Semestre">2do Semestre</option>
                            </select>
                        </div>
                    </div>
                    <button className="secondary-btn" onClick={fetchOverview} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <RefreshCw size={16} className={loading ? 'spin' : ''} /> Actualizar
                    </button>
                </div>
            </div>

            {loading && (
                <div style={{ padding: '60px', textAlign: 'center', color: '#6366f1', fontWeight: '600' }}>
                    Cargando panorama general del curso...
                </div>
            )}

            {!loading && data && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {/* KPI Stats Cards */}
                    <div className="stats-kpis-grid">
                        <div className="kpi-card gpa-kpi">
                            <div className="kpi-icon-wrapper">
                                <BarChart3 size={24} />
                            </div>
                            <div className="kpi-content">
                                <h3>Promedio del Curso</h3>
                                <p className={`kpi-value ${isGpaRed(data.stats.courseGpa) ? 'red' : 'blue'}`}>{data.stats.courseGpa}</p>
                            </div>
                        </div>

                        <div className="kpi-card students-kpi">
                            <div className="kpi-icon-wrapper">
                                <Users size={24} />
                            </div>
                            <div className="kpi-content">
                                <h3>Alumnos Registrados</h3>
                                <p className="kpi-value">{data.students.length}</p>
                            </div>
                        </div>

                        <div className="kpi-card grades-count-kpi">
                            <div className="kpi-icon-wrapper">
                                <BookOpen size={24} />
                            </div>
                            <div className="kpi-content">
                                <h3>Calificaciones Totales</h3>
                                <p className="kpi-value">{data.stats.totalGrades}</p>
                                <span className="kpi-subtext">
                                    <span className="text-blue">{data.stats.blueCount} azules ({data.stats.bluePercentage}%)</span> / <span className="text-red">{data.stats.redCount} rojas ({data.stats.redPercentage}%)</span>
                                </span>
                            </div>
                        </div>

                        <div className="kpi-card risk-kpi">
                            <div className="kpi-icon-wrapper">
                                <AlertTriangle size={24} />
                            </div>
                            <div className="kpi-content">
                                <h3>Alumnos en Riesgo</h3>
                                <p className="kpi-value red">{data.stats.studentsWithRedCount}</p>
                                <span className="kpi-subtext">
                                    {data.stats.atRiskCount} alumnos con promedio bajo 4,0
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Main Layout Grid */}
                    <div className="overview-layout-grid">
                        
                        {/* Left Column: Subjects Status */}
                        <div className="card subjects-summary-card">
                            <h3 style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '15px' }}>Asignaturas del Curso</h3>
                            <div className="scroll-y-container" style={{ maxHeight: '450px' }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Asignatura</th>
                                            <th style={{ textAlign: 'center' }}>Estado</th>
                                            <th style={{ textAlign: 'center' }}>Notas Registradas</th>
                                            <th style={{ textAlign: 'center' }}>Promedio Curso</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.subjects.map((sub: any) => (
                                            <tr key={sub.id}>
                                                <td style={{ fontWeight: '600' }}>{sub.name}</td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span className={`status-pill ${sub.hasGrades ? 'active' : 'inactive'}`}>
                                                        {sub.hasGrades ? 'Con Notas' : 'Sin Notas'}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'center', fontWeight: '500' }}>{sub.gradesCount}</td>
                                                <td style={{ textAlign: 'center', fontWeight: '700' }} className={sub.average !== '-' && isGpaRed(sub.average) ? 'text-red' : 'text-blue'}>
                                                    {sub.average}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Right Column: Students Breakdown */}
                        <div className="card students-summary-card">
                            <h3 style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '15px' }}>Rendimiento por Alumno</h3>
                            <div className="scroll-y-container" style={{ maxHeight: '450px' }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '40px', textAlign: 'center' }}>N°</th>
                                            <th>Estudiante</th>
                                            <th style={{ width: '70px', textAlign: 'center' }}>Azules</th>
                                            <th style={{ width: '70px', textAlign: 'center' }}>Rojas</th>
                                            <th style={{ width: '70px', textAlign: 'center' }}>Promedio</th>
                                            <th>Detalle Alertas / Asignaturas Reprobadas</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.students.map((stu: any) => (
                                            <tr key={stu.id} className={stu.gpaNum && stu.gpaNum < 4.0 ? 'danger-row' : ''}>
                                                <td style={{ textAlign: 'center', color: '#64748b' }}>{stu.listNumber || '-'}</td>
                                                <td style={{ fontWeight: '600' }}>{stu.name}</td>
                                                <td style={{ textAlign: 'center', fontWeight: '700', color: '#166534' }}>{stu.blueCount}</td>
                                                <td style={{ textAlign: 'center', fontWeight: '700', color: '#991b1b' }}>{stu.redCount}</td>
                                                <td style={{ textAlign: 'center', fontWeight: '800' }} className={stu.gpa !== '-' && isGpaRed(stu.gpa) ? 'text-red' : 'text-blue'}>
                                                    {stu.gpa}
                                                </td>
                                                <td>
                                                    {stu.failingSubjects.length > 0 ? (
                                                        <div className="alert-tags">
                                                            {stu.failingSubjects.map((subText: string, i: number) => (
                                                                <span key={i} className="failing-subject-tag">{subText}</span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="no-alert-tag"><Check size={12} /> Al día</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};
