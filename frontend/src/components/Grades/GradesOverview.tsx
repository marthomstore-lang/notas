import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BarChart3, Users, AlertTriangle, Check, RefreshCw, BookOpen, Printer, Download } from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import './GradesOverview.css';

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

interface GradesOverviewProps {
    restrictToLevelId?: number | string;
}

export const GradesOverview: React.FC<GradesOverviewProps> = ({ restrictToLevelId }) => {
    const { token } = useAuth();
    const [showOnlyFailing, setShowOnlyFailing] = useState(false);
    const [levels, setLevels] = useState<any[]>([]);
    
    const [filters, setFilters] = useState(() => {
        const saved = localStorage.getItem('overviewFilters');
        const parsed = saved ? JSON.parse(saved) : null;
        return {
            year: parsed?.year || '2026',
            levelId: restrictToLevelId ? String(restrictToLevelId) : (parsed?.levelId || ''),
            period: parsed?.period || '1er Semestre'
        };
    });

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [selectedStudentDetail, setSelectedStudentDetail] = useState<any | null>(null);
    const [studentGradesData, setStudentGradesData] = useState<any | null>(null);
    const [loadingGrades, setLoadingGrades] = useState(false);
    const [expandedSubjectId, setExpandedSubjectId] = useState<number | null>(null);
    const [selectedSubjectDetailModal, setSelectedSubjectDetailModal] = useState<any | null>(null);
    const [subjectGradesData, setSubjectGradesData] = useState<any | null>(null);
    const [loadingSubjectGrades, setLoadingSubjectGrades] = useState(false);

    useEffect(() => {
        localStorage.setItem('overviewFilters', JSON.stringify(filters));
    }, [filters]);

    useEffect(() => {
        if (restrictToLevelId) {
            setFilters(f => ({ ...f, levelId: String(restrictToLevelId) }));
        }
    }, [restrictToLevelId]);

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
                setFilters(f => ({ ...f, levelId: restrictToLevelId ? String(restrictToLevelId) : sortedLevels[0].id }));
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

    useEffect(() => {
        if (!selectedStudentDetail || !token) {
            setStudentGradesData(null);
            setExpandedSubjectId(null);
            return;
        }

        setLoadingGrades(true);
        setExpandedSubjectId(null); // Reset expanded accordion when student changes
        
        fetch(`/_/backend/api/reports/grades/${selectedStudentDetail.id}?year=${filters.year}&period=${filters.period}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => {
            if (!res.ok) throw new Error("No se pudieron cargar las calificaciones");
            return res.json();
        })
        .then(data => {
            setStudentGradesData(data);
        })
        .catch(err => {
            console.error("Error fetching student report grades:", err);
            MySwal.fire('Error', 'No se pudieron cargar las calificaciones parciales del estudiante', 'error');
        })
        .finally(() => {
            setLoadingGrades(false);
        });
    }, [selectedStudentDetail, token, filters.year, filters.period]);

    useEffect(() => {
        if (!selectedSubjectDetailModal || !token || !filters.levelId || filters.levelId === 'all') {
            setSubjectGradesData(null);
            return;
        }

        setLoadingSubjectGrades(true);
        fetch(`/_/backend/api/admin/grades/sheet?levelId=${filters.levelId}&subjectId=${selectedSubjectDetailModal.id}&year=${filters.year}&period=${filters.period}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => {
            if (!res.ok) throw new Error("No se pudieron cargar las calificaciones");
            return res.json();
        })
        .then(data => {
            setSubjectGradesData(data);
        })
        .catch(err => {
            console.error("Error fetching subject report grades:", err);
            MySwal.fire('Error', 'No se pudieron cargar las calificaciones de la asignatura', 'error');
        })
        .finally(() => {
            setLoadingSubjectGrades(false);
        });
    }, [selectedSubjectDetailModal, token, filters.levelId, filters.year, filters.period]);

    const isGpaRed = (gpaStr: string) => {
        const val = parseFloat(gpaStr.replace(',', '.'));
        return !isNaN(val) && val < 4.0;
    };

    const displayedStudents = data && data.students ? (
        showOnlyFailing 
            ? data.students.filter((stu: any) => stu.gpaNum !== null && stu.gpaNum !== undefined && stu.gpaNum < 4.0) 
            : data.students
    ) : [];

    return (
        <div className="overview-container">
            {/* Print-Only Header */}
            <div className="print-only-header">
                <h2>Liceo Pro - Panorama General de Calificaciones</h2>
                <div className="print-header-meta">
                    <span><strong>Curso:</strong> {filters.levelId === 'all' ? 'TODOS' : (levels.find(l => String(l.id) === String(filters.levelId))?.name || 'Cargando...')}</span>
                    <span><strong>Período:</strong> {filters.period}</span>
                    <span><strong>Año:</strong> {filters.year}</span>
                    <span><strong>Fecha:</strong> {new Date().toLocaleDateString('es-CL')}</span>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="card overview-filters-card no-print">
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
                             <select 
                                 value={filters.levelId} 
                                 onChange={e => setFilters({...filters, levelId: e.target.value})}
                                 disabled={!!restrictToLevelId}
                             >
                                 <option value="">Seleccione Curso</option>
                                 {!restrictToLevelId && <option value="all">TODOS</option>}
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
                        <div className="filter-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input 
                                type="checkbox" 
                                id="only-red-gpas"
                                checked={showOnlyFailing} 
                                onChange={e => setShowOnlyFailing(e.target.checked)}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <label htmlFor="only-red-gpas" style={{ margin: 0, fontWeight: 'bold', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <AlertTriangle size={16} /> Solo Promedios Rojos (&lt; 4,0)
                            </label>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button className="secondary-btn" onClick={fetchOverview} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <RefreshCw size={16} className={loading ? 'spin' : ''} /> Actualizar
                        </button>
                        <button 
                            className="primary-btn" 
                            style={{ background: '#d97706', display: 'flex', alignItems: 'center', gap: '8px' }} 
                            onClick={async () => {
                                try {
                                    const res = await fetch(`/_/backend/api/admin/reports/pending-grades/export?year=${filters.year}&period=${filters.period}&levelId=${filters.levelId}`, {
                                        headers: { 'Authorization': `Bearer ${token}` }
                                    });
                                    if (!res.ok) throw new Error("Error al generar el reporte Excel");
                                    const blob = await res.blob();
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `Reporte_Notas_Pendientes_${filters.year}_${filters.period.replace(/\s+/g, '_')}.xlsx`;
                                    document.body.appendChild(a);
                                    a.click();
                                    a.remove();
                                } catch (err: any) {
                                    console.error("Error descargando reporte de pendientes:", err);
                                    MySwal.fire('Error', 'No se pudo descargar el reporte de notas pendientes', 'error');
                                }
                            }} 
                            disabled={loading} 
                            title="Descargar planilla Excel de alumnos con notas pendientes o casilleros vacíos"
                        >
                            <Download size={16} /> Notas Pendientes (Excel)
                        </button>
                        <button className="primary-btn" onClick={() => window.print()} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Printer size={16} /> Imprimir Panorama
                        </button>
                    </div>
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

                        <div 
                            className={`kpi-card risk-kpi ${showOnlyFailing ? 'active' : ''}`}
                            onClick={() => setShowOnlyFailing(!showOnlyFailing)}
                            style={{ 
                                cursor: 'pointer', 
                                border: showOnlyFailing ? '2px solid #ef4444' : '2px solid transparent',
                                boxShadow: showOnlyFailing ? '0 0 10px rgba(239, 68, 68, 0.4)' : 'none',
                                transform: showOnlyFailing ? 'scale(1.02)' : 'none',
                                transition: 'all 0.2s ease-in-out'
                            }}
                            title="Haz clic para filtrar solo estudiantes con promedio rojo"
                        >
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
                        <div className="card subjects-summary-card no-print">
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
                                        {displayedStudents.map((stu: any) => (
                                            <tr key={stu.id} className={stu.gpaNum && stu.gpaNum < 4.0 ? 'danger-row' : ''}>
                                                <td style={{ textAlign: 'center', color: '#64748b' }}>{stu.listNumber || '-'}</td>
                                                 <td 
                                                     style={{ fontWeight: '600', cursor: 'pointer' }} 
                                                     className="student-name-clickable"
                                                     onClick={() => setSelectedStudentDetail(stu)}
                                                     title="Click para ver panorama de promedios"
                                                 >
                                                     {formatName(stu.name)}
                                                 </td>
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

                    {/* Cantidad de Notas por Asignatura Section */}
                    <div className="card subjects-grades-count-card no-print">
                        <h3 style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <BookOpen size={20} style={{ color: '#6366f1' }} /> Cantidad de Notas por Asignatura
                        </h3>
                        <div className="subjects-grades-grid">
                            {data.subjects.map((sub: any) => {
                                const maxGrades = data.students.length * 10;
                                const completionPercentage = maxGrades > 0 ? Math.min(Math.round((sub.gradesCount / maxGrades) * 100), 100) : 0;
                                const isClickable = filters.levelId && filters.levelId !== 'all';
                                const cardTitle = isClickable
                                    ? `Haz clic para ver las calificaciones de ${sub.name}`
                                    : "Selecciona un curso específico arriba para poder revisar las calificaciones";
                                    
                                return (
                                    <div 
                                        key={sub.id} 
                                        className={`subject-grade-progress-card ${isClickable ? 'clickable' : ''}`}
                                        title={cardTitle}
                                        onClick={() => {
                                            if (isClickable) {
                                                setSelectedSubjectDetailModal(sub);
                                            }
                                        }}
                                    >
                                        <div className="subject-grade-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '70%' }}>
                                                <span className="subject-grade-name" style={{ lineHeight: '1.2' }}>{sub.name}</span>
                                                <span className="subject-grade-teacher" style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>
                                                    Docente: {formatName(sub.teacherName)}
                                                </span>
                                            </div>
                                            <span className="subject-grade-count-text" style={{ flexShrink: 0 }}>
                                                <strong>{sub.gradesCount}</strong> / {maxGrades} ({completionPercentage}%)
                                            </span>
                                        </div>
                                        <div className="subject-progress-bar-bg">
                                            <div 
                                                className="subject-progress-bar-fill" 
                                                style={{ 
                                                    width: `${completionPercentage}%`
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* General Grade Matrix (Cuadro de Rendimiento) */}
                    <div className="card general-grades-matrix-card no-print">
                        <h3 style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '15px' }}>Planilla General de Calificaciones (Matriz de Notas)</h3>
                        <div className="scroll-x-container">
                            <table className="data-table matrix-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '50px', textAlign: 'center' }}>N°</th>
                                        <th style={{ minWidth: '220px', textAlign: 'left' }}>Estudiante</th>
                                        {data.subjects.map((sub: any) => (
                                            <th key={sub.id} style={{ minWidth: '130px', textAlign: 'center' }}>{sub.name}</th>
                                        ))}
                                        <th style={{ minWidth: '100px', textAlign: 'center', fontWeight: 'bold' }}>Promedio Gral.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayedStudents.map((stu: any) => (
                                        <tr key={stu.id} className={stu.gpaNum && stu.gpaNum < 4.0 ? 'danger-row' : ''}>
                                            <td style={{ textAlign: 'center', color: '#64748b' }}>{stu.listNumber || '-'}</td>
                                            <td 
                                                style={{ fontWeight: '600', textAlign: 'left', cursor: 'pointer' }}
                                                className="student-name-clickable"
                                                onClick={() => setSelectedStudentDetail(stu)}
                                                title="Click para ver panorama de promedios"
                                            >
                                                {formatName(stu.name)}
                                            </td>
                                            {data.subjects.map((sub: any) => {
                                                const gradeVal = stu.subjectAverages?.[sub.id] || '-';
                                                const isRed = gradeVal !== '-' && (
                                                    gradeVal === 'I' || 
                                                    (!isNaN(parseFloat(gradeVal.replace(',', '.'))) && parseFloat(gradeVal.replace(',', '.')) < 4.0)
                                                );
                                                const isBlue = gradeVal !== '-' && !isRed;
                                                
                                                return (
                                                    <td 
                                                        key={sub.id} 
                                                        style={{ textAlign: 'center', fontWeight: '600' }}
                                                        className={isRed ? 'text-red' : isBlue ? 'text-blue' : ''}
                                                    >
                                                        {gradeVal}
                                                    </td>
                                                );
                                            })}
                                            <td 
                                                style={{ textAlign: 'center', fontWeight: '800' }} 
                                                className={stu.gpa !== '-' && isGpaRed(stu.gpa) ? 'text-red' : 'text-blue'}
                                            >
                                                {stu.gpa}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Panorama Completo del Estudiante */}
            {selectedStudentDetail && (
                <div className="overview-modal-overlay no-print" onClick={() => setSelectedStudentDetail(null)}>
                    <div className="overview-modal-card" onClick={(e) => e.stopPropagation()}>
                        <header className="overview-modal-header">
                            <div>
                                <h2>Panorama de Promedios</h2>
                                <p className="student-name">{formatName(selectedStudentDetail.name)}</p>
                                <p className="student-run">
                                    RUN: {selectedStudentDetail.run || 'N/A'}
                                    {levels.find(l => String(l.id) === String(selectedStudentDetail.levelId)) ? ` | Curso: ${levels.find(l => String(l.id) === String(selectedStudentDetail.levelId))?.name}` : ''}
                                </p>
                            </div>
                            <button className="close-modal-btn" onClick={() => setSelectedStudentDetail(null)}>&times;</button>
                        </header>
                        
                        <div className="overview-modal-body">
                            <div className="student-summary-strip">
                                <div className="summary-stat">
                                    <span className="stat-label">Promedio General</span>
                                    <span className={`stat-val ${isGpaRed(selectedStudentDetail.gpa) ? 'red' : 'blue'}`}>
                                        {selectedStudentDetail.gpa}
                                    </span>
                                </div>
                                <div className="summary-stat">
                                    <span className="stat-label">Aprobadas (Azules)</span>
                                    <span className="summary-val-pill blue">{selectedStudentDetail.blueCount}</span>
                                </div>
                                <div className="summary-stat">
                                    <span className="stat-label">Reprobadas (Rojas)</span>
                                    <span className="summary-val-pill red">{selectedStudentDetail.redCount}</span>
                                </div>
                            </div>
                            
                            <h3 className="section-title">Detalle de Calificaciones por Asignatura</h3>
                            <div className="modal-table-wrapper">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Asignatura</th>
                                            <th style={{ textAlign: 'center' }}>Promedio</th>
                                            <th style={{ textAlign: 'center' }}>Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.subjects.map((sub: any) => {
                                            const gradeVal = selectedStudentDetail.subjectAverages?.[sub.id] || '-';
                                            const isRed = gradeVal !== '-' && (
                                                gradeVal === 'I' || 
                                                (!isNaN(parseFloat(gradeVal.replace(',', '.'))) && parseFloat(gradeVal.replace(',', '.')) < 4.0)
                                            );
                                            const isBlue = gradeVal !== '-' && !isRed;
                                            const isExpanded = expandedSubjectId === sub.id;
                                            const subjectReport = studentGradesData?.periodData?.find((p: any) => String(p.subjectId) === String(sub.id));
                                            
                                            return (
                                                <React.Fragment key={sub.id}>
                                                    <tr 
                                                        onClick={() => {
                                                            if (gradeVal === '-') return;
                                                            setExpandedSubjectId(isExpanded ? null : sub.id);
                                                        }}
                                                        style={{ cursor: gradeVal !== '-' ? 'pointer' : 'default' }}
                                                        className={isExpanded ? 'active-accordion-row' : ''}
                                                    >
                                                        <td style={{ fontWeight: '600' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                {gradeVal !== '-' && (
                                                                    <span className={`accordion-chevron ${isExpanded ? 'expanded' : ''}`}>
                                                                        ▸
                                                                    </span>
                                                                )}
                                                                {sub.name}
                                                            </div>
                                                        </td>
                                                        <td 
                                                            style={{ textAlign: 'center', fontWeight: '800' }}
                                                            className={isRed ? 'text-red' : isBlue ? 'text-blue' : ''}
                                                        >
                                                            {gradeVal}
                                                        </td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            {gradeVal === '-' ? (
                                                                <span className="status-badge gray">Sin notas</span>
                                                            ) : isRed ? (
                                                                <span className="status-badge red">Reprobado</span>
                                                            ) : (
                                                                <span className="status-badge green">Aprobado</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                    {isExpanded && (
                                                        <tr className="expanded-grades-row">
                                                            <td colSpan={3}>
                                                                {loadingGrades ? (
                                                                    <div className="loading-partials">Cargando calificaciones parciales...</div>
                                                                ) : subjectReport ? (
                                                                    <div className="partials-container">
                                                                        {subjectReport.isAnnual ? (
                                                                            <div className="annual-partials-container">
                                                                                <div className="semester-partials-col">
                                                                                    <h4>1er Semestre (Promedio: {subjectReport.avgS1 || '-'})</h4>
                                                                                    <div className="partials-list">
                                                                                        {subjectReport.s1?.filter((val: any) => val !== null && val !== '-').map((val: any, idx: number) => (
                                                                                            <div key={idx} className="partial-grade-card">
                                                                                                <span className="partial-grade-title">Nota {idx + 1}</span>
                                                                                                <span className={`partial-grade-value ${parseFloat(val.replace(',', '.')) < 4.0 ? 'red' : 'blue'}`}>{val}</span>
                                                                                            </div>
                                                                                        ))}
                                                                                        {(!subjectReport.s1 || subjectReport.s1.filter((val: any) => val !== null && val !== '-').length === 0) && (
                                                                                            <span className="no-partials-msg">Sin calificaciones registradas</span>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                                <div className="semester-partials-col">
                                                                                    <h4>2do Semestre (Promedio: {subjectReport.avgS2 || '-'})</h4>
                                                                                    <div className="partials-list">
                                                                                        {subjectReport.s2?.filter((val: any) => val !== null && val !== '-').map((val: any, idx: number) => (
                                                                                            <div key={idx} className="partial-grade-card">
                                                                                                <span className="partial-grade-title">Nota {idx + 1}</span>
                                                                                                <span className={`partial-grade-value ${parseFloat(val.replace(',', '.')) < 4.0 ? 'red' : 'blue'}`}>{val}</span>
                                                                                            </div>
                                                                                        ))}
                                                                                        {(!subjectReport.s2 || subjectReport.s2.filter((val: any) => val !== null && val !== '-').length === 0) && (
                                                                                            <span className="no-partials-msg">Sin calificaciones registradas</span>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="partials-list">
                                                                                {subjectReport.gradeDetails?.filter((d: any) => d.value !== '-').map((detail: any, idx: number) => {
                                                                                    const isGradeRed = detail.value !== '-' && (
                                                                                        detail.value === 'I' || 
                                                                                        (!isNaN(parseFloat(detail.value.replace(',', '.'))) && parseFloat(detail.value.replace(',', '.')) < 4.0)
                                                                                    );
                                                                                    return (
                                                                                        <div key={idx} className="partial-grade-card">
                                                                                            <span className="partial-grade-title" title={detail.title || `Calificación ${detail.position}`}>
                                                                                                {detail.title || `Nota ${detail.position}`}
                                                                                            </span>
                                                                                            <span className={`partial-grade-value ${isGradeRed ? 'red' : 'blue'}`}>{detail.value}</span>
                                                                                            {detail.weighting && parseFloat(detail.weighting) > 0 ? (
                                                                                                <span className="partial-grade-weight">({detail.weighting}%)</span>
                                                                                            ) : null}
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                                {(!subjectReport.gradeDetails || subjectReport.gradeDetails.filter((d: any) => d.value !== '-').length === 0) && (
                                                                                    <span className="no-partials-msg">No se registran calificaciones parciales ingresadas.</span>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <div className="no-partials-msg">No se pudieron obtener las calificaciones.</div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        <footer className="overview-modal-footer">
                            <button className="primary-btn" onClick={() => setSelectedStudentDetail(null)}>Cerrar</button>
                        </footer>
                    </div>
                </div>
            )}
            {/* Modal: Detalle de Calificaciones de la Asignatura */}
            {selectedSubjectDetailModal && (
                <div className="overview-modal-overlay no-print" onClick={() => setSelectedSubjectDetailModal(null)}>
                    <div className="overview-modal-card subject-detail-modal" onClick={(e) => e.stopPropagation()}>
                        <header className="overview-modal-header">
                            <div>
                                <h2>Detalle de Calificaciones</h2>
                                <p className="student-name" style={{ marginBottom: '2px' }}>{selectedSubjectDetailModal.name}</p>
                                <p className="student-run" style={{ fontSize: '0.9rem', color: '#4f46e5', fontWeight: '600', marginBottom: '8px' }}>
                                    Docente: {formatName(selectedSubjectDetailModal.teacherName)}
                                </p>
                                <p className="student-run">
                                    Curso: {levels.find(l => String(l.id) === String(filters.levelId))?.name || 'N/A'} | Período: {filters.period} | Año: {filters.year}
                                </p>
                            </div>
                            <button className="close-modal-btn" onClick={() => setSelectedSubjectDetailModal(null)}>&times;</button>
                        </header>

                        <div className="overview-modal-body">
                            {loadingSubjectGrades ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: '#6366f1', fontWeight: '600' }}>
                                    Cargando calificaciones de la asignatura...
                                </div>
                            ) : subjectGradesData ? (
                                <div className="modal-table-wrapper" style={{ overflowX: 'auto' }}>
                                    <table className="data-table matrix-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '50px', textAlign: 'center' }}>N°</th>
                                                <th style={{ minWidth: '220px', textAlign: 'left' }}>Estudiante</th>
                                                {/* Columns 1 to 10 */}
                                                {Array.from({ length: 10 }, (_, i) => i + 1).map(pos => {
                                                    const col = subjectGradesData.columns.find((c: any) => c.position === pos);
                                                    const weightText = col && col.weighting && parseFloat(col.weighting) > 0 ? ` (${col.weighting}%)` : '';
                                                    return (
                                                        <th key={pos} style={{ minWidth: '70px', textAlign: 'center' }} title={col?.title || `Nota ${pos}`}>
                                                            {col?.title || `N${pos}`}{weightText}
                                                        </th>
                                                    );
                                                })}
                                                <th style={{ minWidth: '90px', textAlign: 'center', fontWeight: 'bold' }}>Promedio</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {subjectGradesData.students.map((student: any) => {
                                                const isQual = selectedSubjectDetailModal.isQualitative;
                                                
                                                // Get grade for each column
                                                const getGradeText = (pos: number) => {
                                                    const col = subjectGradesData.columns.find((c: any) => c.position === pos);
                                                    if (!col) return '-';
                                                    const grade = subjectGradesData.grades.find((g: any) => 
                                                        String(g.student_id) === String(student.id) && String(g.grade_column_id) === String(col.id)
                                                    );
                                                    return grade ? grade.grade_value : '-';
                                                };

                                                // Calculate student average
                                                const calculateAvg = () => {
                                                    let sum = 0;
                                                    let totalWeight = 0;
                                                    let simpleSum = 0;
                                                    let simpleCount = 0;

                                                    subjectGradesData.columns.forEach((col: any) => {
                                                        const gradeVal = getGradeText(col.position);
                                                        if (gradeVal !== '-') {
                                                            const val = parseFloat(gradeVal.replace(',', '.'));
                                                            if (!isNaN(val) && val > 0) {
                                                                const weight = parseFloat(col.weighting) || 0;
                                                                sum += val * weight;
                                                                totalWeight += weight;
                                                                simpleSum += val;
                                                                simpleCount++;
                                                            }
                                                        }
                                                    });

                                                    let finalAvg = 0;
                                                    if (totalWeight > 0) {
                                                        finalAvg = sum / totalWeight;
                                                    } else if (simpleCount > 0) {
                                                        finalAvg = simpleSum / simpleCount;
                                                    }

                                                    if (isQual) {
                                                        if (finalAvg >= 6.0) return 'MB';
                                                        if (finalAvg >= 5.0) return 'B';
                                                        if (finalAvg >= 4.0) return 'S';
                                                        return finalAvg > 0 ? 'I' : '-';
                                                    }

                                                    return finalAvg > 0 ? (Math.round((finalAvg + 1e-9) * 10) / 10).toFixed(1).replace('.', ',') : '-';
                                                };

                                                const avg = calculateAvg();
                                                const isRed = !isQual && avg !== '-' && parseFloat(avg.replace(',', '.')) < 4.0;
                                                const isQualRed = isQual && avg === 'I';
                                                const isBlue = avg !== '-' && !isRed && !isQualRed;

                                                return (
                                                    <tr key={student.id} className={student.status === 'Retired' ? 'retired-row' : ''}>
                                                        <td style={{ textAlign: 'center', color: '#64748b' }}>{student.list_number || '-'}</td>
                                                        <td style={{ fontWeight: '600', textAlign: 'left' }}>
                                                            {formatName(student.full_name)}
                                                            {student.status === 'Retired' && <span className="retired-badge" style={{ marginLeft: '8px', fontSize: '0.7rem', backgroundColor: '#e2e8f0', color: '#64748b', padding: '2px 6px', borderRadius: '4px' }}>Retirado</span>}
                                                        </td>
                                                        {Array.from({ length: 10 }, (_, i) => i + 1).map(pos => {
                                                            const gradeText = getGradeText(pos);
                                                            const isGradeRed = gradeText !== '-' && (
                                                                gradeText === 'I' || 
                                                                (!isNaN(parseFloat(gradeText.replace(',', '.'))) && parseFloat(gradeText.replace(',', '.')) < 4.0)
                                                            );
                                                            return (
                                                                <td 
                                                                    key={pos} 
                                                                    style={{ textAlign: 'center', fontWeight: '500' }}
                                                                    className={isGradeRed ? 'text-red' : gradeText !== '-' ? 'text-blue' : ''}
                                                                >
                                                                    {gradeText}
                                                                </td>
                                                            );
                                                        })}
                                                        <td 
                                                            style={{ textAlign: 'center', fontWeight: '800' }} 
                                                            className={isRed || isQualRed ? 'text-red' : isBlue ? 'text-blue' : ''}
                                                        >
                                                            {avg}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="no-partials-msg" style={{ textAlign: 'center', padding: '20px' }}>
                                    No se pudieron obtener las calificaciones.
                                </div>
                            )}
                        </div>

                        <footer className="overview-modal-footer">
                            <button className="primary-btn" onClick={() => setSelectedSubjectDetailModal(null)}>Cerrar</button>
                        </footer>
                    </div>
                </div>
            )}
        </div>
    );
};
