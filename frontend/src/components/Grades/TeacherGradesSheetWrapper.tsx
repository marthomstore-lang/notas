import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { GradesSheet } from './GradesSheet';
import { ChevronLeft } from 'lucide-react';

export const TeacherGradesSheetWrapper: React.FC = () => {
    const { assignmentId } = useParams();
    const { token } = useAuth();
    const navigate = useNavigate();
    const [assignment, setAssignment] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token || !assignmentId) return;
        
        // Fetch assignment details to get levelId and subjectId
        fetch(`/_/backend/api/teacher/assignments`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
            const found = data.find((a: any) => a.assignment_id === assignmentId);
            if (found) {
                setAssignment(found);
            }
            setLoading(false);
        })
        .catch(err => {
            console.error(err);
            setLoading(false);
        });
    }, [token, assignmentId]);

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando información del curso...</div>;
    if (!assignment) return <div style={{ padding: '40px', textAlign: 'center', color: 'red' }}>Error: No se encontró la asignación.</div>;

    return (
        <div className="teacher-grades-wrapper" style={{ padding: '20px', fontFamily: 'Inter, sans-serif' }}>
            <div className="no-print" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <button 
                    onClick={() => navigate('/teacher')} 
                    style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '5px',
                        padding: '8px 16px', 
                        borderRadius: '6px', 
                        border: '1px solid #cbd5e1', 
                        background: 'white', 
                        cursor: 'pointer',
                        color: '#64748b',
                        fontWeight: 500
                    }}
                >
                    <ChevronLeft size={18} /> Volver a Mis Cursos
                </button>
                <div style={{ flex: 1 }}>
                    <h2 style={{ margin: 0, color: '#1e293b' }}>{assignment.level_name}</h2>
                    <p style={{ margin: 0, color: '#64748b' }}>Asignatura: {assignment.subject_name}</p>
                </div>
            </div>
            
            <GradesSheet 
                initialLevelId={assignment.level_id} 
                initialSubjectId={assignment.subject_id} 
            />
        </div>
    );
};
