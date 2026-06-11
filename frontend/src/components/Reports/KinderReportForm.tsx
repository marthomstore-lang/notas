import React, { useState, useEffect } from 'react';
import { KINDER_REPORT_STRUCTURE, PREKINDER_REPORT_STRUCTURE } from './kinderReportData';
import { PrintableKinderReport } from './PrintableKinderReport';
import { Printer, Save, FileText } from 'lucide-react';
import Swal from 'sweetalert2';

interface KinderReportFormProps {
    studentId: string;
    studentName: string;
    token: string;
    teacherName: string;
    levelName?: string;
}

export const KinderReportForm: React.FC<KinderReportFormProps> = ({ studentId, studentName, token, teacherName, levelName }) => {
    const [evaluationData, setEvaluationData] = useState<Record<string, string>>({});
    const [observations, setObservations] = useState('');
    const [semester, setSemester] = useState(1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [isLoading, setIsLoading] = useState(true);
    const [isPrinting, setIsPrinting] = useState(false);
    const [reportStructure, setReportStructure] = useState<any[]>([]);
    const [templateId, setTemplateId] = useState<number | null>(null);

    useEffect(() => {
        loadReport();
    }, [studentId, semester, year]);

    const loadReport = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/_/backend/api/teacher/reports/personality/${studentId}/${semester}?year=${year}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                
                if (data.template) {
                    setReportStructure(typeof data.template.structure_json === 'string' ? JSON.parse(data.template.structure_json) : data.template.structure_json);
                    setTemplateId(data.template.id);
                } else {
                    const nameLower = (levelName || '').toLowerCase();
                    const isPreKinder = nameLower.includes('pre') || nameLower.includes('transición 1') || nameLower.includes('transicion 1') || nameLower.includes('primer nivel');
                    setReportStructure(isPreKinder ? PREKINDER_REPORT_STRUCTURE : KINDER_REPORT_STRUCTURE);
                }

                if (data.report) {
                    setEvaluationData(data.report.evaluation_data ? JSON.parse(data.report.evaluation_data) : {});
                    setObservations(data.report.observations || '');
                } else {
                    setEvaluationData({});
                    setObservations('');
                }
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudo cargar el informe', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            const res = await fetch(`/_/backend/api/teacher/reports/personality`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    studentId,
                    semester,
                    year,
                    evaluation_data: evaluationData,
                    observations,
                    template_id: templateId
                })
            });
            if (res.ok) {
                Swal.fire({
                    title: 'Guardado',
                    text: 'El informe se ha guardado correctamente',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                throw new Error('Error saving');
            }
        } catch (error) {
            Swal.fire('Error', 'No se pudo guardar el informe', 'error');
        }
    };

    const handlePrint = () => {
        setIsPrinting(true);
        setTimeout(() => {
            window.print();
            setIsPrinting(false);
        }, 500);
    };

    const handleOptionChange = (oaId: string, value: string) => {
        setEvaluationData(prev => ({ ...prev, [oaId]: value }));
    };

    if (isLoading) return <p>Cargando informe...</p>;

    return (
        <div className="report-container">
            <style>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .printable-section, .printable-section * {
                        visibility: visible;
                    }
                    .printable-section {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
            `}</style>
            
            <div className="no-print">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div>
                        <h3 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <FileText size={20} />
                            Informe al Hogar: {studentName}
                        </h3>
                        <div style={{ display: 'flex', gap: '15px' }}>
                            <div>
                                <label style={{ marginRight: '5px', fontSize: '14px', fontWeight: 'bold' }}>Semestre:</label>
                                <select value={semester} onChange={e => setSemester(Number(e.target.value))} style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ccc' }}>
                                    <option value={1}>1er Semestre</option>
                                    <option value={2}>2do Semestre</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ marginRight: '5px', fontSize: '14px', fontWeight: 'bold' }}>Año:</label>
                                <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} style={{ width: '80px', padding: '5px', borderRadius: '4px', border: '1px solid #ccc' }} />
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={handleSave} className="primary-btn" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Save size={18} /> Guardar
                        </button>
                        <button onClick={handlePrint} className="secondary-btn" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Printer size={18} /> Imprimir
                        </button>
                    </div>
                </div>

                <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div style={{ marginBottom: '20px', padding: '10px', background: '#eff6ff', borderRadius: '6px', fontSize: '14px' }}>
                        <strong>Calificadores:</strong> L = Logrado | M/L = Medianamente Logrado | P/L = Por Lograr | N/E = No Evaluado
                    </div>
                    
                    {reportStructure.map((ambito, index) => (
                        <div key={index} style={{ marginBottom: '30px' }}>
                            <h4 style={{ background: '#1e293b', color: '#fff', padding: '10px', borderRadius: '4px', margin: '0 0 10px 0' }}>{ambito.ambito}</h4>
                            {ambito.nucleos.map((nucleo: any, nIndex: number) => (
                                <div key={nIndex} style={{ marginBottom: '20px', paddingLeft: '15px' }}>
                                    <h5 style={{ color: '#334155', borderBottom: '2px solid #e2e8f0', paddingBottom: '5px', marginBottom: '10px' }}>{nucleo.name}</h5>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                        <thead>
                                            <tr>
                                                <th style={{ textAlign: 'left', padding: '8px', width: '80px' }}>OA</th>
                                                <th style={{ textAlign: 'left', padding: '8px' }}>Descripción</th>
                                                <th style={{ width: '40px', textAlign: 'center' }}>L</th>
                                                <th style={{ width: '40px', textAlign: 'center' }}>M/L</th>
                                                <th style={{ width: '40px', textAlign: 'center' }}>P/L</th>
                                                <th style={{ width: '40px', textAlign: 'center' }}>N/E</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {nucleo.oas.map((oa: any) => (
                                                <tr key={oa.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '8px', fontWeight: 'bold' }}>{oa.label}</td>
                                                    <td style={{ padding: '8px', color: '#475569' }}>{oa.text}</td>
                                                    {['L', 'M/L', 'P/L', 'N/E'].map(opt => (
                                                        <td key={opt} style={{ textAlign: 'center', padding: '8px' }}>
                                                            <input 
                                                                type="radio" 
                                                                name={oa.id} 
                                                                value={opt}
                                                                checked={evaluationData[oa.id] === opt}
                                                                onChange={() => handleOptionChange(oa.id, opt)}
                                                                style={{ cursor: 'pointer' }}
                                                            />
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ))}
                        </div>
                    ))}

                    <div style={{ marginTop: '20px' }}>
                        <h4 style={{ marginBottom: '10px' }}>Observaciones</h4>
                        <textarea 
                            value={observations}
                            onChange={e => setObservations(e.target.value)}
                            style={{ width: '100%', minHeight: '120px', padding: '15px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }}
                            placeholder="Escriba aquí las observaciones para el estudiante..."
                        />
                    </div>
                </div>
            </div>

            {/* Hidden printable section */}
            <div className="printable-section" style={{ display: isPrinting ? 'block' : 'none' }}>
                <PrintableKinderReport 
                    studentName={studentName}
                    semester={semester}
                    year={year}
                    evaluationData={evaluationData}
                    observations={observations}
                    teacherName={teacherName}
                    reportStructure={reportStructure}
                />
            </div>
        </div>
    );
};
