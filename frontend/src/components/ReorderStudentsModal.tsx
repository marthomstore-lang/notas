import React, { useState, useEffect } from 'react';
import { X, ArrowUp, ArrowDown, Save, ListOrdered, GripVertical } from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { formatName } from '../views/AdminDashboard'; // Import utility name formatter

const MySwal = withReactContent(Swal);

interface Student {
    id: string;
    full_name: string;
    run: string;
    list_number: number | null;
    status: string;
}

interface ReorderStudentsModalProps {
    isOpen: boolean;
    onClose: () => void;
    levelName: string;
    levelId: string;
    students: Student[];
    token: string;
    onSaveSuccess: () => void;
}

export const ReorderStudentsModal: React.FC<ReorderStudentsModalProps> = ({
    isOpen,
    onClose,
    levelName,
    levelId,
    students,
    token,
    onSaveSuccess
}) => {
    const [localStudents, setLocalStudents] = useState<Student[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const sortedAll = [...students]
                .sort((a, b) => {
                    const listA = a.list_number ?? 999999;
                    const listB = b.list_number ?? 999999;
                    if (listA !== listB) return listA - listB;
                    return a.full_name.localeCompare(b.full_name, 'es', { sensitivity: 'base' });
                });
            setLocalStudents(sortedAll);
        }
    }, [isOpen, students]);

    if (!isOpen) return null;

    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (dragOverIndex !== index) {
            setDragOverIndex(index);
        }
    };

    const handleDrop = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        const list = [...localStudents];
        const draggedItem = list[draggedIndex];
        
        list.splice(draggedIndex, 1);
        list.splice(index, 0, draggedItem);
        
        setLocalStudents(list);
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const handleMove = (index: number, direction: 'up' | 'down') => {
        const list = [...localStudents];
        if (direction === 'up' && index > 0) {
            const temp = list[index];
            list[index] = list[index - 1];
            list[index - 1] = temp;
        } else if (direction === 'down' && index < list.length - 1) {
            const temp = list[index];
            list[index] = list[index + 1];
            list[index + 1] = temp;
        } else {
            return;
        }
        setLocalStudents(list);
    };

    const handleSave = async () => {
        if (localStudents.length === 0) return;
        setIsSaving(true);
        try {
            const positions = localStudents.map((s, idx) => ({
                studentId: s.id,
                listNumber: idx + 1
            }));

            const res = await fetch('/_/backend/api/admin/grades/bulk-position', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    levelId,
                    academicYear: 2026,
                    positions
                })
            });

            if (res.ok) {
                MySwal.fire({
                    title: '¡Guardado!',
                    text: 'El nuevo orden de los estudiantes ha sido guardado exitosamente.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
                onSaveSuccess();
                onClose();
            } else {
                const err = await res.json();
                throw new Error(err.error || 'Error al guardar posiciones');
            }
        } catch (error: any) {
            console.error("Error saving positions:", error);
            MySwal.fire('Error', error.message || 'No se pudo guardar el orden', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1100,
            padding: '20px',
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <div style={{
                background: 'white',
                width: '100%',
                maxWidth: '650px',
                maxHeight: '85vh',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                overflow: 'hidden',
                animation: 'scaleUp 0.2s ease-out'
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    background: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ListOrdered size={20} style={{ color: '#6366f1' }} />
                            Reordenar Alumnos
                        </h2>
                        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                            Curso: <strong style={{ color: '#0f172a' }}>{levelName}</strong> &bull; {localStudents.filter(s => s.status !== 'RETIRADO').length} activos &bull; {localStudents.filter(s => s.status === 'RETIRADO').length} retirados
                        </p>
                    </div>
                    <button 
                        onClick={onClose} 
                        style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#94a3b8',
                            padding: '6px',
                            borderRadius: '6px',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#fee2e2';
                            e.currentTarget.style.color = '#ef4444';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = '#94a3b8';
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body List */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '16px 24px',
                    background: '#fdfdfd'
                }}>
                    <p style={{ fontSize: '0.85rem', marginBottom: '16px', background: '#f0fdf4', padding: '10px 14px', borderRadius: '8px', border: '1px solid #bbf7d0', color: '#15803d' }}>
                        💡 Arrastra a los estudiantes desde cualquier parte de la fila para cambiar su posición, o utiliza los botones ▲ y ▼ de la derecha. Al terminar presiona <strong>Guardar Orden</strong>.
                    </p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {localStudents.map((student, idx) => {
                            const isBeingDragged = draggedIndex === idx;
                            const isDragTarget = dragOverIndex === idx;
                            return (
                                <div 
                                    key={student.id} 
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, idx)}
                                    onDragOver={(e) => handleDragOver(e, idx)}
                                    onDrop={(e) => handleDrop(e, idx)}
                                    onDragEnd={handleDragEnd}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '10px 14px',
                                        background: isBeingDragged ? '#f8fafc' : (isDragTarget ? '#f5f3ff' : 'white'),
                                        borderRadius: '10px',
                                        border: isDragTarget ? '2px dashed #6366f1' : '1px solid #e2e8f0',
                                        opacity: isBeingDragged ? 0.4 : 1,
                                        transition: 'transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease',
                                        justifyContent: 'space-between',
                                        cursor: 'grab'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isBeingDragged && !isDragTarget) {
                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                                            e.currentTarget.style.borderColor = '#cbd5e1';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isBeingDragged && !isDragTarget) {
                                            e.currentTarget.style.boxShadow = 'none';
                                            e.currentTarget.style.borderColor = '#e2e8f0';
                                        }
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        {/* Drag Handle */}
                                        <div style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', cursor: 'grab' }}>
                                            <GripVertical size={18} />
                                        </div>

                                        {/* Position Badge */}
                                        <div style={{
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '50%',
                                            background: '#f1f5f9',
                                            color: '#475569',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.85rem',
                                            fontWeight: '700',
                                            border: '1px solid #cbd5e1'
                                        }}>
                                            {idx + 1}
                                        </div>
                                        
                                        {/* Student Info */}
                                        <div>
                                            <div style={{ 
                                                fontWeight: '600', 
                                                color: student.status === 'RETIRADO' ? '#ef4444' : '#1e293b', 
                                                fontSize: '0.95rem',
                                                textDecoration: student.status === 'RETIRADO' ? 'line-through' : 'none'
                                            }}>
                                                {formatName(student.full_name)}
                                                {student.status === 'RETIRADO' && (
                                                    <span style={{
                                                        marginLeft: '8px',
                                                        fontSize: '0.7rem',
                                                        background: '#fee2e2',
                                                        color: '#ef4444',
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                        textDecoration: 'none',
                                                        display: 'inline-block',
                                                        fontWeight: 'bold',
                                                        border: '1px solid #fecaca'
                                                    }}>
                                                        RETIRADO
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                                                RUN: {student.run}
                                            </div>
                                        </div>
                                    </div>

                                {/* Movement Controls */}
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <button
                                        onClick={() => handleMove(idx, 'up')}
                                        disabled={idx === 0}
                                        title="Subir"
                                        style={{
                                            border: '1px solid #e2e8f0',
                                            background: '#f8fafc',
                                            borderRadius: '6px',
                                            padding: '6px 10px',
                                            cursor: idx === 0 ? 'not-allowed' : 'pointer',
                                            opacity: idx === 0 ? 0.3 : 1,
                                            color: '#475569',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.15s'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (idx > 0) {
                                                e.currentTarget.style.background = '#6366f1';
                                                e.currentTarget.style.color = 'white';
                                                e.currentTarget.style.borderColor = '#6366f1';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (idx > 0) {
                                                e.currentTarget.style.background = '#f8fafc';
                                                e.currentTarget.style.color = '#475569';
                                                e.currentTarget.style.borderColor = '#e2e8f0';
                                            }
                                        }}
                                    >
                                        <ArrowUp size={16} />
                                    </button>
                                    
                                    <button
                                        onClick={() => handleMove(idx, 'down')}
                                        disabled={idx === localStudents.length - 1}
                                        title="Bajar"
                                        style={{
                                            border: '1px solid #e2e8f0',
                                            background: '#f8fafc',
                                            borderRadius: '6px',
                                            padding: '6px 10px',
                                            cursor: idx === localStudents.length - 1 ? 'not-allowed' : 'pointer',
                                            opacity: idx === localStudents.length - 1 ? 0.3 : 1,
                                            color: '#475569',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.15s'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (idx < localStudents.length - 1) {
                                                e.currentTarget.style.background = '#6366f1';
                                                e.currentTarget.style.color = 'white';
                                                e.currentTarget.style.borderColor = '#6366f1';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (idx < localStudents.length - 1) {
                                                e.currentTarget.style.background = '#f8fafc';
                                                e.currentTarget.style.color = '#475569';
                                                e.currentTarget.style.borderColor = '#e2e8f0';
                                            }
                                        }}
                                    >
                                        <ArrowDown size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '16px 24px',
                    background: '#f8fafc',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px'
                }}>
                    <button 
                        onClick={onClose}
                        disabled={isSaving}
                        style={{
                            padding: '10px 20px',
                            background: 'white',
                            color: '#475569',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#f1f5f9';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'white';
                        }}
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        style={{
                            padding: '10px 20px',
                            background: '#6366f1',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.2)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#4f46e5';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#6366f1';
                        }}
                    >
                        <Save size={18} />
                        {isSaving ? 'Guardando...' : 'Guardar Orden'}
                    </button>
                </div>
            </div>
            
            {/* CSS animations inject */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleUp {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
};
