import React, { useState, useEffect, useCallback } from 'react';
import debounce from 'lodash.debounce';
import { Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useParams } from 'react-router-dom';
import './GradesGrid.css';

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


interface Student {
    id: string;
    run: string;
    full_name: string;
}

interface GradeColumn {
    id: string;
    title: string;
}

export const GradesGrid: React.FC = () => {
    const { assignmentId } = useParams();
    const { token } = useAuth();
    
    const [students, setStudents] = useState<Student[]>([]);
    const [columns, setColumns] = useState<GradeColumn[]>([]);
    const [grades, setGrades] = useState<Record<string, number>>({});
    
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token || !assignmentId) return;
        
        fetch(`/_/backend/api/teacher/grades/${assignmentId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
            setStudents(data.students || []);
            setColumns(data.columns || []);
            
            const initialGrades: Record<string, number> = {};
            if (data.grades) {
                data.grades.forEach((g: any) => {
                    initialGrades[`${g.student_id}_${g.grade_column_id}`] = g.grade_value;
                });
            }
            setGrades(initialGrades);
            setLoading(false);
        })
        .catch(console.error);
    }, [token, assignmentId]);

    const addColumn = async () => {
        const title = prompt("Nombre de la evaluación:", `Nota ${columns.length + 1}`);
        if (!title) return;

        try {
            const res = await fetch(`/_/backend/api/teacher/grades/${assignmentId}/columns`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ title })
            });
            const data = await res.json();
            setColumns([...columns, { id: data.id, title: data.title }]);
        } catch (err) {
            console.error(err);
        }
    };

    // Auto-save via API
    const saveGrade = useCallback(
        debounce(async (studentId: string, columnId: string, gradeValue: number | null) => {
            setSaving(true);
            try {
                await fetch('/_/backend/api/teacher/grades/save', {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ studentId, columnId, gradeValue })
                });
            } catch (err) {
                console.error("Error al guardar", err);
            } finally {
                setSaving(false);
            }
        }, 1000),
        [token]
    );

    const handleGradeChange = (studentId: string, columnId: string, value: string) => {
        const key = `${studentId}_${columnId}`;
        const numericValue = parseFloat(value);
        if (!isNaN(numericValue) && numericValue >= 1.0 && numericValue <= 7.0) {
            setGrades(prev => ({ ...prev, [key]: numericValue }));
            saveGrade(studentId, columnId, numericValue);
        } else if (value === '') {
            const newGrades = { ...grades };
            delete newGrades[key];
            setGrades(newGrades);
            saveGrade(studentId, columnId, null);
        }
    };

    const calculateAverage = (studentId: string) => {
        let sum = 0;
        let count = 0;
        columns.forEach(col => {
            const val = grades[`${studentId}_${col.id}`];
            if (val) {
                sum += val;
                count++;
            }
        });
        return count > 0 ? (sum / count).toFixed(1) : '-';
    };

    if (loading) return <div>Cargando...</div>;

    return (
        <div className="grades-panel">
            <header className="panel-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <h2>Calificaciones</h2>
                    <button onClick={addColumn} className="primary-btn" style={{ padding: '6px 12px', fontSize: '0.9rem' }}>
                        <Plus size={16} /> Añadir Evaluación
                    </button>
                </div>
                {saving && <span className="saving-indicator">Guardando...</span>}
            </header>
            <div style={{ overflowX: 'auto' }}>
                <table className="agile-grid">
                    <thead>
                        <tr>
                            <th style={{ width: '120px' }}>RUN</th>
                            <th style={{ width: '250px' }}>Nombre Alumno</th>
                            {columns.map(col => (
                                <th key={col.id} style={{ textAlign: 'center' }}>
                                    {col.title}
                                </th>
                            ))}
                            <th style={{ textAlign: 'center' }}>Promedio</th>
                        </tr>
                    </thead>
                    <tbody>
                        {students.map(student => (
                            <tr key={student.id}>
                                <td className="run-col">{student.run}</td>
                                <td>{formatName(student.full_name)}</td>
                                {columns.map(col => (
                                    <td key={col.id} style={{ textAlign: 'center' }}>
                                        <input 
                                            type="number" 
                                            step="0.1"
                                            min="1.0" 
                                            max="7.0"
                                            className={`grade-input ${grades[`${student.id}_${col.id}`] < 4.0 ? 'fail' : ''}`}
                                            value={grades[`${student.id}_${col.id}`] || ''}
                                            onChange={(e) => handleGradeChange(student.id, col.id, e.target.value)}
                                        />
                                    </td>
                                ))}
                                <td className={`average-col ${parseFloat(calculateAverage(student.id)) < 4.0 ? 'fail-text' : ''}`} style={{ textAlign: 'center', fontWeight: 'bold' }}>
                                    {calculateAverage(student.id)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
