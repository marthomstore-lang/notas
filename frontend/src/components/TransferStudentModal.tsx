import React, { useState, useEffect } from 'react';
import { RefreshCw, ArrowRight, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { formatName } from '../views/AdminDashboard';

const MySwal = withReactContent(Swal);

interface TransferStudentModalProps {
    student: any;
    levels: any[];
    token: string;
    onClose: () => void;
    onSuccess: () => void;
}

export const TransferStudentModal: React.FC<TransferStudentModalProps> = ({
    student,
    levels,
    token,
    onClose,
    onSuccess
}) => {
    const [targetLevelId, setTargetLevelId] = useState<string>('');
    const [loadingSubjects, setLoadingSubjects] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const [sourceLevel, setSourceLevel] = useState<any>(null);
    const [targetLevel, setTargetLevel] = useState<any>(null);
    const [sourceSubjects, setSourceSubjects] = useState<any[]>([]);
    const [targetSubjects, setTargetSubjects] = useState<any[]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});

    const currentLevelId = student.level_id || (student.enrollment ? student.enrollment.level_id : null);

    const availableTargetLevels = levels.filter(l => String(l.id) !== String(currentLevelId));

    useEffect(() => {
        if (targetLevelId) {
            fetchSubjects(targetLevelId);
        } else {
            setSourceSubjects([]);
            setTargetSubjects([]);
            setMapping({});
        }
    }, [targetLevelId]);

    const fetchSubjects = async (lvlId: string) => {
        setLoadingSubjects(true);
        try {
            const srcLvlId = currentLevelId || student.level_id || (student.enrollment ? student.enrollment.level_id : '');
            const res = await fetch(`/_/backend/api/admin/students/${student.id}/transfer-subjects?targetLevelId=${lvlId}&sourceLevelId=${srcLvlId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setSourceLevel(data.sourceLevel);
                setTargetLevel(data.targetLevel);
                const srcSubs = Array.isArray(data.sourceSubjects) ? data.sourceSubjects : [];
                const tgtSubs = Array.isArray(data.targetSubjects) ? data.targetSubjects : [];
                setSourceSubjects(srcSubs);
                setTargetSubjects(tgtSubs);

                // Auto-match subjects by exact name or lowercase match
                const autoMap: Record<string, string> = {};
                srcSubs.forEach((src: any) => {
                    const exactMatch = tgtSubs.find((tgt: any) => tgt.name.trim().toLowerCase() === src.name.trim().toLowerCase());
                    if (exactMatch) {
                        autoMap[src.id] = String(exactMatch.id);
                    } else {
                        // Partial match check
                        const partialMatch = tgtSubs.find((tgt: any) => 
                            tgt.name.toLowerCase().includes(src.name.toLowerCase()) || 
                            src.name.toLowerCase().includes(tgt.name.toLowerCase())
                        );
                        autoMap[src.id] = partialMatch ? String(partialMatch.id) : 'none';
                    }
                });
                setMapping(autoMap);
            } else {
                MySwal.fire('Error', data.error || 'No se pudieron cargar las asignaturas', 'error');
            }
        } catch (error) {
            console.error("Error fetching transfer subjects:", error);
            MySwal.fire('Error', 'Error de conexión con el servidor', 'error');
        } finally {
            setLoadingSubjects(false);
        }
    };

    const handleMappingChange = (sourceSubId: string, targetSubId: string) => {
        setMapping(prev => ({
            ...prev,
            [sourceSubId]: targetSubId
        }));
    };

    const handleSubmit = async () => {
        if (!targetLevelId) {
            MySwal.fire('Seleccione Curso', 'Debe seleccionar el curso de destino', 'warning');
            return;
        }

        const confirm = await MySwal.fire({
            title: '¿Confirmar Traspaso Normativo?',
            html: `
                <div style="text-align: left; font-size: 0.95rem; color: #334155;">
                    <p><strong>Estudiante:</strong> ${formatName(student.full_name)}</p>
                    <p><strong>Curso Origen:</strong> ${sourceLevel?.name || 'Actual'} <span style="color: #dc2626;">(Quedará RETIRADO)</span></p>
                    <p><strong>Curso Destino:</strong> ${targetLevel?.name || 'Nuevo'} <span style="color: #16a34a;">(Nueva Matrícula ACTIVA)</span></p>
                    <p style="margin-top: 10px; font-size: 0.85rem; color: #64748b;">
                        Las calificaciones asignadas se transferirán a las materias seleccionadas.
                    </p>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, Traspasar Estudiante',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#ea580c'
        });

        if (!confirm.isConfirmed) return;

        setIsSubmitting(true);
        try {
            const res = await fetch(`/_/backend/api/admin/students/${student.id}/transfer-mapping`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    targetLevelId,
                    subjectMapping: mapping
                })
            });

            const data = await res.json();
            if (res.ok) {
                await MySwal.fire({
                    icon: 'success',
                    title: 'Traspaso Exitoso',
                    text: data.message || 'El estudiante ha sido traspasado de curso correctamente.',
                    confirmButtonColor: '#16a34a'
                });
                onSuccess();
                onClose();
            } else {
                MySwal.fire('Error', data.error || 'No se pudo realizar el traspaso', 'error');
            }
        } catch (error) {
            console.error("Error transferring student:", error);
            MySwal.fire('Error', 'Error de comunicación al traspasar estudiante', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 99999, padding: '20px'
        }}>
            <div style={{
                background: '#ffffff',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '780px',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {/* Header Modal */}
                <div style={{
                    padding: '20px 24px',
                    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                    color: '#ffffff',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTopLeftRadius: '16px',
                    borderTopRightRadius: '16px'
                }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <RefreshCw size={20} style={{ color: '#f97316' }} /> Traspaso Normativo de Curso y Calificaciones
                        </h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', opacity: 0.85 }}>
                            Estudiante: <strong>{formatName(student.full_name)}</strong> (RUT: {student.run})
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                        <X size={22} />
                    </button>
                </div>

                {/* Body Content */}
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* Select Target Level */}
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                            1. Seleccione Curso de Destino:
                        </label>
                        <select 
                            value={targetLevelId} 
                            onChange={(e) => setTargetLevelId(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.95rem',
                                background: '#ffffff',
                                fontWeight: 600,
                                color: '#1e293b'
                            }}
                        >
                            <option value="">-- Seleccionar Curso de Destino --</option>
                            {availableTargetLevels.map(l => (
                                <option key={l.id} value={l.id}>{l.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Normative Notice */}
                    {targetLevelId && (
                        <div style={{ background: '#fffbebfb', padding: '14px 18px', borderRadius: '10px', border: '1px solid #fde68a', color: '#92400e', fontSize: '0.85rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, marginBottom: '4px' }}>
                                <AlertTriangle size={16} /> Normativa Escolar MINEDUC
                            </div>
                            En el curso origen (<strong>{sourceLevel?.name || 'Actual'}</strong>), la matrícula se marcará como <strong style={{ color: '#dc2626' }}>RETIRADO</strong> con fecha de hoy. Se creará una <strong style={{ color: '#16a34a' }}>NUEVA MATRÍCULA ACTIVA</strong> en <strong>{targetLevel?.name || 'Destino'}</strong>.
                        </div>
                    )}

                    {/* Mapping Table */}
                    {loadingSubjects ? (
                        <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                            <RefreshCw size={24} className="spin" style={{ margin: '0 auto 8px' }} />
                            <p style={{ margin: 0 }}>Cargando asignaturas de origen y destino...</p>
                        </div>
                    ) : targetLevelId && sourceSubjects.length > 0 ? (
                        <div>
                            <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                2. Mapeo Seleccionable de Asignaturas y Calificaciones:
                            </h4>
                            <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                    <thead>
                                        <tr style={{ background: '#f1f5f9', color: '#475569', textAlign: 'left' }}>
                                            <th style={{ padding: '10px 14px', width: '45%' }}>Asignatura en {sourceLevel?.name} (Origen)</th>
                                            <th style={{ padding: '10px 8px', width: '10%', textAlign: 'center' }}><ArrowRight size={16} /></th>
                                            <th style={{ padding: '10px 14px', width: '45%' }}>Asignatura en {targetLevel?.name} (Destino)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sourceSubjects.map((src, idx) => (
                                            <tr key={src.id} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                                                <td style={{ padding: '10px 14px', fontWeight: 600, color: '#334155' }}>
                                                    {src.name}
                                                </td>
                                                <td style={{ textAlign: 'center', color: '#94a3b8' }}>➔</td>
                                                <td style={{ padding: '8px 14px' }}>
                                                    <select
                                                        value={mapping[src.id] || 'none'}
                                                        onChange={(e) => handleMappingChange(String(src.id), e.target.value)}
                                                        style={{
                                                            width: '100%',
                                                            padding: '6px 10px',
                                                            borderRadius: '6px',
                                                            border: mapping[src.id] && mapping[src.id] !== 'none' ? '1px solid #86efac' : '1px solid #cbd5e1',
                                                            background: mapping[src.id] && mapping[src.id] !== 'none' ? '#f0fdf4' : '#ffffff',
                                                            fontSize: '0.85rem',
                                                            color: mapping[src.id] && mapping[src.id] !== 'none' ? '#166534' : '#64748b',
                                                            fontWeight: mapping[src.id] && mapping[src.id] !== 'none' ? 600 : 400
                                                        }}
                                                    >
                                                        <option value="none">🚫 (No traspasar notas de esta asignatura)</option>
                                                        {targetSubjects.map(tgt => (
                                                            <option key={tgt.id} value={tgt.id}>
                                                                {tgt.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : targetLevelId && sourceSubjects.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '20px', background: '#f8fafc', borderRadius: '8px', color: '#64748b' }}>
                            El curso de origen no posee asignaturas asignadas. Se realizará el traspaso de matrícula únicamente.
                        </div>
                    ) : null}

                </div>

                {/* Modal Footer */}
                <div style={{
                    padding: '16px 24px',
                    background: '#f8fafc',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px',
                    borderBottomLeftRadius: '16px',
                    borderBottomRightRadius: '16px'
                }}>
                    <button 
                        onClick={onClose} 
                        style={{
                            padding: '9px 18px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            color: '#475569',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSubmit}
                        disabled={!targetLevelId || isSubmitting}
                        style={{
                            padding: '9px 20px',
                            borderRadius: '8px',
                            border: 'none',
                            background: !targetLevelId || isSubmitting ? '#cbd5e1' : 'linear-gradient(135deg, #ea580c 0%, #ca8a04 100%)',
                            color: '#ffffff',
                            fontWeight: 700,
                            cursor: !targetLevelId || isSubmitting ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: !targetLevelId || isSubmitting ? 'none' : '0 4px 6px -1px rgba(234, 88, 12, 0.25)'
                        }}
                    >
                        {isSubmitting ? 'Realizando traspaso...' : <><CheckCircle2 size={18} /> Confirmar Traspaso Normativo</>}
                    </button>
                </div>
            </div>
        </div>
    );
};
