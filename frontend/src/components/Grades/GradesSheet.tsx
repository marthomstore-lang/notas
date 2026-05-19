import React, { useState, useEffect } from 'react';
import { 
    FileText, Save, Printer, Lock, Unlock, Edit2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { GradesReport } from './GradesReport';
import { useA11y } from '../../context/A11yContext';
import { StudentWindow } from '../StudentWindow';
import './GradesSheet.css';

const MySwal = withReactContent(Swal);

interface Student {
    id: string;
    run: string;
    full_name: string;
    status: string;
    list_number: number;
}

interface GradeColumn {
    id?: string;
    position: number;
    weighting: number;
    title: string;
}

interface GradesSheetProps {
    initialLevelId?: string;
    initialSubjectId?: string;
    readOnly?: boolean;
}

export const GradesSheet: React.FC<GradesSheetProps> = ({ initialLevelId, initialSubjectId }) => {
    const { token, user } = useAuth();
    const { speak } = useA11y();
    
    // Filters
    const [filters, setFilters] = useState(() => {
        const saved = localStorage.getItem('gradesFilters');
        const parsed = saved ? JSON.parse(saved) : null;
        
        return {
            year: parsed?.year || '2026',
            levelId: initialLevelId || parsed?.levelId || '',
            subjectId: initialSubjectId || parsed?.subjectId || '',
            period: parsed?.period || '1er Semestre'
        };
    });

    useEffect(() => {
        localStorage.setItem('gradesFilters', JSON.stringify(filters));
    }, [filters]);

    const [options, setOptions] = useState({
        levels: [] as any[],
        subjects: [] as any[]
    });

    const isQualitativeSubject = (name: string) => {
        const lower = name.toLowerCase();
        return lower.includes('religión') || lower.includes('religion') || lower.includes('orientación') || lower.includes('orientacion');
    };

    const selectedSubject = options.subjects.find(s => String(s.id) === String(filters.subjectId));
    const subjectName = selectedSubject ? selectedSubject.name : '';
    const isQualitative = isQualitativeSubject(subjectName);

    // Data
    const [students, setStudents] = useState<Student[]>([]);
    const [columns, setColumns] = useState<GradeColumn[]>(
        Array.from({ length: 10 }, (_, i) => ({ position: i + 1, weighting: 0, title: `N${i + 1}` }))
    );
    const [grades, setGrades] = useState<Record<string, number | string>>({});
    const [reportData, setReportData] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [focusedCell, setFocusedCell] = useState<string | null>(null);
    const [localValue, setLocalValue] = useState<string>('');
    const [isLocked, setIsLocked] = useState(false);
    const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);

    // Autosave logic
    useEffect(() => {
        const timer = setTimeout(() => {
            if (Object.keys(grades).length >= 0) {
                autosave();
            }
        }, 2000);
        return () => clearTimeout(timer);
    }, [grades, columns]);

    const autosave = async () => {
        if (isSaving) return;
        
        const gradesData = Object.entries(grades).map(([key, val]) => {
            const [studentId, position] = key.split('_');
            return { student_id: studentId, position: parseInt(position), grade_value: val };
        });

        setIsSaving(true);
        try {
            await fetch('/_/backend/api/admin/grades/sheet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ ...filters, columns, gradesData })
            });
        } catch (error) {
            console.error("Autosave error:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handlePrint = async (studentId: string) => {
        try {
            const res = await fetch(`/_/backend/api/reports/grades/${studentId}?year=${filters.year}&period=${filters.period}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setReportData([data]); // Wrap in array
            } else {
                MySwal.fire('Error', data.error || 'No se pudo generar el reporte', 'error');
            }
        } catch (error) {
            MySwal.fire('Error', 'Error de conexión al servidor', 'error');
        }
    };

    const handlePrintCourse = async () => {
        if (!filters.levelId) return;
        
        MySwal.fire({
            title: 'Generando Informes...',
            text: 'Esto puede tardar unos segundos dependiendo del tamaño del curso.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            const res = await fetch(`/_/backend/api/reports/grades/level/${filters.levelId}?year=${filters.year}&period=${filters.period}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setReportData(data);
                Swal.close();
            } else {
                MySwal.fire('Error', data.error || 'No se pudieron generar los reportes', 'error');
            }
        } catch (error) {
            MySwal.fire('Error', 'Error de conexión al servidor', 'error');
        }
    };

    useEffect(() => {
        fetchFilters();
    }, []);

    const fetchFilters = async () => {
        try {
            const res = await fetch('/_/backend/api/admin/grades/filters', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            const levelOrder = [
                'Pre-Kinder', 'Kínder', 
                '1° Básico', '2° Básico', '3° Básico', '4° Básico', 
                '5° Básico', '6° Básico', '7° Básico', '8° Básico',
                '1° Medio', '2° Medio A', '2° Medio B',
                '3° Mecánica', '3° Medio Párvulo', 
                '4° Mecánica', '4° Medio Párvulo',
                'Taller Laboral'
            ];

            const levels = (Array.isArray(data.levels) ? data.levels : [])
                .filter((l: any) => levelOrder.includes(l.name))
                .sort((a: any, b: any) => levelOrder.indexOf(a.name) - levelOrder.indexOf(b.name));
            
            const subjects = Array.isArray(data.subjects) ? data.subjects : [];
            setOptions({ levels, subjects });

            // Only set defaults if not provided as props
            setFilters(f => ({ 
                ...f, 
                levelId: initialLevelId || f.levelId || (levels.length > 0 ? levels[0].id : ''),
                subjectId: initialSubjectId || f.subjectId || (subjects.length > 0 ? subjects[0].id : '')
            }));
        } catch (error) {
            console.error("Error fetching filters:", error);
        }
    };

    const fetchSheet = async () => {
        if (!filters.levelId || !filters.subjectId) return;
        try {
            const res = await fetch(`/_/backend/api/admin/grades/sheet?levelId=${filters.levelId}&subjectId=${filters.subjectId}&period=${filters.period}&year=${filters.year}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            const fetchedStudents = Array.isArray(data.students) ? data.students : [];
            const fetchedColumns = Array.isArray(data.columns) ? data.columns : [];
            const fetchedGrades = Array.isArray(data.grades) ? data.grades : [];

            setStudents(fetchedStudents);
            
            const selectedSub = options.subjects.find(s => String(s.id) === String(filters.subjectId));
            const subName = selectedSub ? selectedSub.name : '';
            const isQual = isQualitativeSubject(subName);

            // Map existing columns to our columns grid (11 for qualitative, 10 for quantitative)
            const newColumns = Array.from({ length: isQual ? 11 : 10 }, (_, i) => {
                const existing = fetchedColumns.find((c: any) => c.position === i + 1);
                return existing ? { ...existing } : { position: i + 1, weighting: 0, title: i === 10 ? 'Promedio' : `Nota ${i + 1}` };
            });
            setColumns(newColumns);

            // Map grades
            const initialGrades: Record<string, number | string> = {};
            fetchedGrades.forEach((g: any) => {
                const col = fetchedColumns.find((c: any) => c.id === g.grade_column_id);
                if (col) {
                    initialGrades[`${g.student_id}_${col.position}`] = g.grade_value;
                }
            });
            setGrades(initialGrades);
            setIsLocked(!!data.isLocked);
        } catch (error) {
            console.error("Error fetching sheet:", error);
        }
    };

    const handleEditColumnTitle = async (col: any) => {
        const { value: newTitle } = await MySwal.fire({
            title: 'Renombrar Evaluación',
            input: 'text',
            inputValue: col.title,
            inputPlaceholder: 'Ej: Prueba 1, Control 1, etc.',
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar'
        });
        if (newTitle !== undefined && newTitle.trim() !== '') {
            setColumns(prev => prev.map(c => c.position === col.position ? { ...c, title: newTitle.trim() } : c));
        }
    };

    const handleListNumberChange = async (studentId: string, newValue: string) => {
        const newListNumber = parseInt(newValue);
        if (isNaN(newListNumber)) return;

        // Optimistic update
        setStudents(prev => prev.map(s => s.id === studentId ? { ...s, list_number: newListNumber } : s));

        try {
            await fetch('/_/backend/api/admin/grades/student-position', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({
                    studentId,
                    levelId: filters.levelId,
                    academicYear: filters.year,
                    newListNumber
                })
            });
        } catch (error) {
            console.error('Error updating list number:', error);
        }
    };

    const handleBulkReorder = async () => {
        const sorted = [...students].sort((a, b) => a.full_name.localeCompare(b.full_name, 'es', { sensitivity: 'base' }));
        const positions = sorted.map((s, idx) => ({ studentId: s.id, listNumber: idx + 1 }));

        const result = await MySwal.fire({
            title: '¿Reordenar Alfabéticamente?',
            text: 'Esto asignará nuevos números de lista (1, 2, 3...) según el nombre de los estudiantes.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, reordenar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                const res = await fetch('/_/backend/api/admin/grades/bulk-position', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ levelId: filters.levelId, academicYear: filters.year, positions })
                });

                if (res.ok) {
                    setStudents(prev => prev.map(s => {
                        const newPos = positions.find(p => p.studentId === s.id);
                        return newPos ? { ...s, list_number: newPos.listNumber } : s;
                    }));
                    MySwal.fire('Éxito', 'Lista reordenada alfabéticamente', 'success');
                }
            } catch (error) {
                console.error("Bulk reorder error:", error);
            }
        }
    };

    useEffect(() => {
        fetchSheet();
    }, [filters]);

    const handleGradeChange = (studentId: string, position: number, value: string) => {
        if (isLocked) {
            MySwal.fire({
                icon: 'warning',
                title: 'Registro Bloqueado',
                text: 'Este periodo se encuentra cerrado. Debe desbloquearlo para realizar cambios.',
                confirmButtonColor: '#ef4444'
            });
            return;
        }
        setLocalValue(value);
        const key = `${studentId}_${position}`;

        if (value === '') {
            setGrades({ ...grades, [key]: '' });
            return;
        }

        if (isQualitative) {
            const upperVal = value.toUpperCase().trim();
            const conceptToNumeric: Record<string, number> = {
                'MB': 7.0,
                'B': 5.5,
                'S': 4.5,
                'I': 3.0
            };
            if (conceptToNumeric[upperVal] !== undefined) {
                setGrades({ ...grades, [key]: conceptToNumeric[upperVal] });
            } else if (upperVal === '') {
                setGrades({ ...grades, [key]: '' });
            }
            return;
        }

        const cleanInput = value.replace(/[^0-9.,]/g, '');
        const numericValue = parseFloat(cleanInput.replace(',', '.'));

        if (isNaN(numericValue)) return;

        let finalGrade = numericValue;

        // Auto-formato: 57 -> 5,7
        if (/^\d{2}$/.test(cleanInput)) {
            const val = parseInt(cleanInput);
            if (val >= 10 && val <= 70) {
                finalGrade = val / 10;
                setLocalValue(finalGrade.toFixed(1).replace('.', ','));
            }
        }

        if (finalGrade >= 1.0 && finalGrade <= 7.0) {
            setGrades({ ...grades, [key]: finalGrade });
        }
    };

    const handleArrowNavigation = (e: React.KeyboardEvent, studentIdx: number, colPos: number) => {
        let nextIdx = studentIdx;
        let nextPos = colPos;

        if (e.key === 'ArrowDown') nextIdx++;
        else if (e.key === 'ArrowUp') nextIdx--;
        else if (e.key === 'ArrowRight') nextPos++;
        else if (e.key === 'ArrowLeft') nextPos--;
        else return;

        e.preventDefault();
        const nextId = `grade-input-${nextIdx}-${nextPos}`;
        const nextEl = document.getElementById(nextId);
        if (nextEl) {
            (nextEl as HTMLInputElement).focus();
        }
    };

    const saveAll = async () => {
        try {
            // Prepare grades data for backend
            const gradesData = Object.entries(grades).map(([key, val]) => {
                const [studentId, position] = key.split('_');
                return { student_id: studentId, position: parseInt(position), grade_value: val };
            });

            const res = await fetch('/_/backend/api/admin/grades/sheet', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ 
                    ...filters,
                    columns,
                    gradesData
                })
            });

            if (res.ok) {
                MySwal.fire({
                    icon: 'success',
                    title: 'Guardado',
                    text: 'Las calificaciones han sido persistidas exitosamente.',
                    timer: 2000,
                    showConfirmButton: false
                });
                fetchSheet();
            }
        } catch (error) {
            MySwal.fire({ icon: 'error', title: 'Error', text: 'No se pudo guardar la información.' });
        }
    };

    const formatGrade = (val: any) => {
        if (val === null || val === undefined || val === '') return '';
        if (isQualitative) {
            const n = parseFloat(String(val));
            if (isNaN(n)) return String(val).toUpperCase();
            if (n >= 6.0) return 'MB';
            if (n >= 5.0) return 'B';
            if (n >= 4.0) return 'S';
            return 'I';
        }
        if (isNaN(Number(val))) return '';
        return Number(val).toFixed(1).replace('.', ',');
    };

    const toggleLock = async () => {
        if ((user as any).role !== 'Admin') return;
        
        try {
            const res = await fetch('/_/backend/api/admin/grades/toggle-lock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ ...filters, academicYear: filters.year, lock: !isLocked })
            });
            if (res.ok) {
                setIsLocked(!isLocked);
                MySwal.fire('Éxito', `Notas ${!isLocked ? 'bloqueadas' : 'desbloqueadas'} correctamente`, 'success');
            }
        } catch (error) {
            MySwal.fire('Error', 'No se pudo cambiar el estado de bloqueo', 'error');
        }
    };

    const calculatePP = (studentId: string) => {
        let sum = 0;
        let totalWeight = 0;
        columns.forEach(col => {
            const gradeRaw = grades[`${studentId}_${col.position}`];
            const weight = col.weighting ? parseFloat(String(col.weighting)) : 0;
            if (gradeRaw !== undefined && gradeRaw !== null && gradeRaw !== '') {
                const grade = typeof gradeRaw === 'number' ? gradeRaw : parseFloat(String(gradeRaw).replace(',', '.'));
                if (!isNaN(grade) && grade > 0) {
                    sum += grade * weight;
                    totalWeight += weight;
                }
            }
        });

        let finalAvg = 0;
        if (totalWeight === 0) {
            let count = 0;
            let total = 0;
            columns.forEach(col => {
                const gradeRaw = grades[`${studentId}_${col.position}`];
                if (gradeRaw !== undefined && gradeRaw !== null && gradeRaw !== '') {
                    const grade = typeof gradeRaw === 'number' ? gradeRaw : parseFloat(String(gradeRaw).replace(',', '.'));
                    if (!isNaN(grade) && grade > 0) {
                        total += grade;
                        count++;
                    }
                }
            });
            finalAvg = count > 0 ? (total / count) : 0;
        } else {
            finalAvg = (sum / totalWeight);
        }

        return finalAvg > 0 ? finalAvg.toFixed(1).replace('.', ',') : '-';
    };

    return (
        <div className="grades-sheet-container">
            <header className="grades-header">
                <div className="header-actions-left">
                    {/* Header title removed as requested */}
                </div>
                <div className="header-actions-right">
                    <span style={{ 
                        fontSize: '0.8rem', 
                        color: isSaving ? '#3b82f6' : '#10b981', 
                        marginRight: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                    }}>
                        {isSaving ? '⌛ Guardando cambios...' : '✓ Guardado automático activo'}
                    </span>
                    {(user as any)?.role === 'Admin' && (
                        <button 
                            className={`lock-btn ${isLocked ? 'locked' : ''}`} 
                            onClick={toggleLock} 
                            title={isLocked ? "Desbloquear Notas" : "Bloquear Notas"}
                            style={{ 
                                background: isLocked ? '#ef4444' : '#64748b',
                                color: 'white',
                                border: 'none',
                                padding: '8px',
                                borderRadius: '8px',
                                marginRight: '10px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px'
                            }}
                        >
                            {isLocked ? <Lock size={18} /> : <Unlock size={18} />}
                            <span style={{ fontSize: '0.8rem' }}>{isLocked ? 'Bloqueado' : 'Abierto'}</span>
                        </button>
                    )}
                    <button 
                        className="secondary-btn" 
                        onClick={() => fetchSheet()} 
                        title="Recargar desde Base de Datos (Limpiar Cache)"
                        style={{ marginRight: '10px' }}
                    >
                        Recargar
                    </button>
                    <button className="save-btn" onClick={saveAll} title="Guardar Manualmente" disabled={isLocked && (user as any).role !== 'Admin'}><Save size={20} /></button>
                    <button className="secondary-btn" onClick={handlePrintCourse} title="Generar informes de todo el curso">
                        <FileText size={18} /> Informes/Certificados
                    </button>
                </div>
            </header>

            <div className="filters-bar">
                {!initialLevelId && (
                    <div className="filter-item">
                        <label>Año:</label>
                        <select value={filters.year} onChange={e => setFilters({...filters, year: e.target.value})}>
                            <option value="2026">2026</option>
                            <option value="2025">2025</option>
                        </select>
                    </div>
                )}
                {!initialLevelId && (
                    <div className="filter-item">
                        <label>Curso:</label>
                        <select value={filters.levelId} onChange={e => setFilters({...filters, levelId: e.target.value})}>
                            <option value="">Seleccione Curso</option>
                            {options.levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                    </div>
                )}
                {!initialSubjectId && (
                    <div className="filter-item">
                        <label>Asignatura:</label>
                        <select value={filters.subjectId} onChange={e => setFilters({...filters, subjectId: e.target.value})}>
                            <option value="">Seleccione</option>
                            {options.subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                )}
                <div className="filter-item">
                    <label>Período:</label>
                    <select value={filters.period} onChange={e => setFilters({...filters, period: e.target.value})}>
                        <option value="1er Semestre">1er Semestre</option>
                        <option value="2do Semestre">2do Semestre</option>
                        <option value="Finalización de año">Finalización de año</option>
                    </select>
                </div>
            </div>

            <div className="grades-table-container">
                <table className="grades-table">
                    <thead>
                        <tr>
                            <th style={{ width: '85px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                    N° Lista
                                    <button 
                                        className="bulk-reorder-btn no-print" 
                                        onClick={handleBulkReorder} 
                                        title="Auto-numerar por orden alfabético"
                                        style={{ 
                                            background: '#f1f5f9', 
                                            border: '1px solid #e2e8f0', 
                                            borderRadius: '4px',
                                            padding: '2px 4px',
                                            fontSize: '10px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        A-Z
                                    </button>
                                </div>
                            </th>
                            <th className="student-name-col">Nombre alumno</th>
                            {columns.slice(0, 10).map(c => (
                                <th 
                                    key={c.position}
                                    onClick={() => !isLocked && handleEditColumnTitle(c)}
                                    style={{ cursor: isLocked ? 'default' : 'pointer' }}
                                    title={isLocked ? undefined : "Haga clic para renombrar evaluación"}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                        {c.title}
                                        {!isLocked && <Edit2 size={10} style={{ opacity: 0.4 }} />}
                                    </div>
                                </th>
                            ))}
                            <th>Promedio</th>
                            <th className="no-print">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[...students].sort((a, b) => a.list_number - b.list_number).map((s, idx) => (
                            <tr key={s.id} style={s.status === 'RETIRADO' ? { color: '#dc2626', textDecoration: 'line-through', textDecorationColor: '#000' } : {}}>
                                <td style={{ textAlign: 'center' }}>
                                    <input 
                                        type="number" 
                                        className="list-number-input"
                                        value={s.list_number}
                                        onChange={e => handleListNumberChange(s.id, e.target.value)}
                                        disabled={s.status === 'RETIRADO'}
                                    />
                                </td>
                                <td className="student-name-col">
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span 
                                            style={{ 
                                                cursor: 'pointer', 
                                                color: s.status === 'RETIRADO' ? '#ef4444' : '#2563eb', 
                                                fontWeight: '500',
                                                textDecoration: s.status === 'RETIRADO' ? 'line-through' : 'none'
                                            }}
                                            onClick={() => setViewingStudentId(s.id)}
                                            title="Ver Expediente"
                                        >
                                            {s.full_name}
                                        </span>
                                        {s.status === 'RETIRADO' && <span className="retired-badge" style={{ textDecoration: 'none', display: 'inline-block', color: '#ef4444', fontWeight: 'bold', fontSize: '0.7rem' }}>ESTUDIANTE RETIRADO</span>}
                                    </div>
                                </td>
                                {columns.slice(0, 10).map(c => (
                                    <td key={c.position}>
                                        <input 
                                            id={`grade-input-${idx}-${c.position}`}
                                            type="text"
                                            style={{ 
                                                textAlign: 'center',
                                                background: s.status === 'RETIRADO' ? '#f1f5f9' : 'transparent',
                                                color: s.status === 'RETIRADO' ? '#ef4444' : 'inherit',
                                                textDecoration: s.status === 'RETIRADO' ? 'line-through' : 'none',
                                                cursor: s.status === 'RETIRADO' ? 'not-allowed' : 'text'
                                            }}
                                            className={`grade-input-cell ${
                                                isQualitative 
                                                    ? (formatGrade(grades[`${s.id}_${c.position}`]) === 'I' ? 'grade-fail' : 'grade-pass')
                                                    : (Number(grades[`${s.id}_${c.position}`] || 0) < 4 ? 'grade-fail' : 'grade-pass')
                                            }`}
                                            value={focusedCell === `${s.id}_${c.position}` ? localValue : formatGrade(grades[`${s.id}_${c.position}`])}
                                            onChange={e => handleGradeChange(s.id, c.position, e.target.value)}
                                            onKeyDown={(e) => handleArrowNavigation(e, idx, c.position)}
                                            onFocus={(e) => {
                                                const key = `${s.id}_${c.position}`;
                                                setFocusedCell(key);
                                                setLocalValue(formatGrade(grades[key]));
                                                e.target.select();
                                                
                                                // Narración por radar
                                                speak(`${c.title} de ${s.full_name}`);
                                            }}
                                            onBlur={() => {
                                                setFocusedCell(null);
                                            }}
                                            disabled={s.status === 'RETIRADO' || isLocked}
                                        />
                                    </td>
                                ))}
                                <td className="calculated-col" style={s.status === 'RETIRADO' ? { color: '#ef4444', textDecoration: 'line-through' } : {}}>
                                    {isQualitative ? (
                                        <input
                                            id={`grade-input-${idx}-11`}
                                            type="text"
                                            style={{
                                                textAlign: 'center',
                                                background: s.status === 'RETIRADO' ? '#f1f5f9' : 'transparent',
                                                color: s.status === 'RETIRADO' ? '#ef4444' : 'inherit',
                                                textDecoration: s.status === 'RETIRADO' ? 'line-through' : 'none',
                                                cursor: s.status === 'RETIRADO' ? 'not-allowed' : 'text',
                                                width: '50px',
                                                border: 'none',
                                                fontWeight: 'bold'
                                            }}
                                            className={`grade-input-cell ${formatGrade(grades[`${s.id}_11`]) === 'I' ? 'grade-fail' : 'grade-pass'}`}
                                            value={focusedCell === `${s.id}_11` ? localValue : formatGrade(grades[`${s.id}_11`])}
                                            onChange={e => handleGradeChange(s.id, 11, e.target.value)}
                                            onKeyDown={(e) => handleArrowNavigation(e, idx, 11)}
                                            onFocus={(e) => {
                                                const key = `${s.id}_11`;
                                                setFocusedCell(key);
                                                setLocalValue(formatGrade(grades[key]));
                                                e.target.select();
                                                speak(`Promedio final de ${s.full_name}`);
                                            }}
                                            onBlur={() => setFocusedCell(null)}
                                            disabled={s.status === 'RETIRADO' || isLocked}
                                        />
                                    ) : (
                                        calculatePP(s.id)
                                    )}
                                </td>
                                <td className="no-print">
                                    <button className="icon-btn" onClick={() => handlePrint(s.id)} title="Imprimir Informe">
                                        <Printer size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {reportData && (
                <GradesReport 
                    data={reportData} 
                    period={filters.period} 
                    year={filters.year} 
                    onClose={() => setReportData(null)} 
                />
            )}

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
