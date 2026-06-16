import React from 'react';
import { KINDER_REPORT_STRUCTURE } from './kinderReportData';

interface PrintableKinderReportProps {
    studentName: string;
    semester: number;
    year: number;
    evaluationData: Record<string, string>;
    observations: string;
    teacherName: string;
    reportStructure: any[];
}

export const PrintableKinderReport: React.FC<PrintableKinderReportProps> = ({
    studentName, semester, year, evaluationData, observations, teacherName, reportStructure
}) => {
    // Calculate stats
    let totalOAs = 0;
    let countL = 0;
    let countML = 0;
    let countPL = 0;
    let countNE = 0;

    const structure = reportStructure || KINDER_REPORT_STRUCTURE;

    if (structure && Array.isArray(structure)) {
        structure.forEach(ambito => {
            if (ambito.nucleos && Array.isArray(ambito.nucleos)) {
                ambito.nucleos.forEach((nucleo: any) => {
                    if (nucleo.oas && Array.isArray(nucleo.oas)) {
                        totalOAs += nucleo.oas.length;
                        nucleo.oas.forEach((oa: any) => {
                            const val = evaluationData[oa.id];
                            if (val) {
                                if (val === 'L') countL += 1;
                                else if (val === 'M/L') countML += 1;
                                else if (val === 'P/L') countPL += 1;
                                else if (val === 'N/E') countNE += 1;
                            }
                        });
                    }
                });
            }
        });
    }

    const totalEvaluated = countL + countML + countPL;
    const globalAchievementPercent = totalEvaluated > 0 ? Math.round(((countL + 0.5 * countML) / totalEvaluated) * 100) : 0;
    const pctL = totalEvaluated > 0 ? Math.round((countL / totalEvaluated) * 100) : 0;
    const pctML = totalEvaluated > 0 ? Math.round((countML / totalEvaluated) * 100) : 0;
    const pctPL = totalEvaluated > 0 ? Math.round((countPL / totalEvaluated) * 100) : 0;
    const countNEPlusPending = totalOAs - totalEvaluated;

    return (
        <div style={{ padding: '40px', fontFamily: '"Arial", sans-serif', color: '#000', backgroundColor: '#fff', maxWidth: '800px', margin: '0 auto', fontSize: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>Liceo Técnico Profesional Campanario</p>
                    <p style={{ margin: 0 }}>Marcos Delucchi Fonck</p>
                    <p style={{ margin: 0 }}>Educación Parvularia</p>
                </div>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '16px', margin: '0 0 5px 0' }}>INFORME AL HOGAR {semester === 1 ? 'PRIMER' : 'SEGUNDO'} SEMESTRE {year}</h2>
                <h3 style={{ fontSize: '14px', margin: '0 0 20px 0' }}>SEGUNDO NIVEL TRANSICIÓN</h3>
            </div>
            
            <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
                <p style={{ margin: 0, fontSize: '14px' }}><strong>NOMBRE:</strong> {studentName}</p>
            </div>
            <div style={{ marginBottom: '20px', fontSize: '11px', fontWeight: 'bold' }}>
                <p style={{ margin: 0 }}>
                    CALIFICADORES: &nbsp;&nbsp; N/E: NO EVALUADO &nbsp;&nbsp; L: LOGRADO &nbsp;&nbsp; M/L: MEDIANAMENTE LOGRADO &nbsp;&nbsp; P/L: POR LOGRAR
                </p>
            </div>

            {(reportStructure || KINDER_REPORT_STRUCTURE).map((ambito: any, index: number) => (
                <div key={index} style={{ marginBottom: '20px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', marginBottom: '10px' }}>
                        <thead>
                            <tr>
                                <th colSpan={2} style={{ border: '1px solid #000', padding: '5px', backgroundColor: '#f97316', color: 'white', textAlign: 'center', fontSize: '13px' }}>
                                    ÁMBITO: {ambito.ambito}
                                </th>
                                <th style={{ border: '1px solid #000', padding: '5px', width: '30px', textAlign: 'center', backgroundColor: '#fb923c', color: 'white' }}>L</th>
                                <th style={{ border: '1px solid #000', padding: '5px', width: '40px', textAlign: 'center', backgroundColor: '#fb923c', color: 'white' }}>M/L</th>
                                <th style={{ border: '1px solid #000', padding: '5px', width: '30px', textAlign: 'center', backgroundColor: '#fb923c', color: 'white' }}>P/L</th>
                                <th style={{ border: '1px solid #000', padding: '5px', width: '30px', textAlign: 'center', backgroundColor: '#fb923c', color: 'white' }}>N/E</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ambito.nucleos.map((nucleo: any, nIndex: number) => (
                                <React.Fragment key={nIndex}>
                                    <tr>
                                        <td colSpan={6} style={{ border: '1px solid #000', padding: '5px', fontWeight: 'bold', backgroundColor: '#fafafa' }}>
                                            NÚCLEO: {nucleo.name}
                                        </td>
                                    </tr>
                                    {nucleo.oas.map((oa: any) => {
                                        const val = evaluationData[oa.id] || '';
                                        return (
                                            <tr key={oa.id}>
                                                <td style={{ border: '1px solid #000', padding: '5px', width: '60px', textAlign: 'center', fontWeight: 'bold' }}>{oa.label}</td>
                                                <td style={{ border: '1px solid #000', padding: '5px' }}>{oa.text}</td>
                                                <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{val === 'L' ? 'X' : ''}</td>
                                                <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{val === 'M/L' ? 'X' : ''}</td>
                                                <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{val === 'P/L' ? 'X' : ''}</td>
                                                <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{val === 'N/E' ? 'X' : ''}</td>
                                            </tr>
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            ))}

            {/* Tabla Resumen de Logros */}
            <div style={{ marginTop: '20px', marginBottom: '20px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000' }}>
                    <thead>
                        <tr>
                            <th colSpan={5} style={{ border: '1px solid #000', padding: '5px', backgroundColor: '#1e293b', color: 'white', textAlign: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                                RESUMEN ESTADÍSTICO DE LOGROS
                            </th>
                        </tr>
                        <tr style={{ backgroundColor: '#fafafa', fontSize: '10px' }}>
                            <th style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', fontWeight: 'bold', width: '20%' }}>Logrado (L)</th>
                            <th style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', fontWeight: 'bold', width: '20%' }}>Medianamente Logrado (M/L)</th>
                            <th style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', fontWeight: 'bold', width: '20%' }}>Por Lograr (P/L)</th>
                            <th style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', fontWeight: 'bold', width: '20%' }}>No Evaluado / Pendiente</th>
                            <th style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', fontWeight: 'bold', width: '20%', backgroundColor: '#f0fdf4' }}>Porcentaje de Logro Global</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style={{ fontSize: '11px' }}>
                            <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>
                                <strong>{countL}</strong> ({pctL}%)
                            </td>
                            <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>
                                <strong>{countML}</strong> ({pctML}%)
                            </td>
                            <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>
                                <strong>{countPL}</strong> ({pctPL}%)
                            </td>
                            <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>
                                <strong>{countNEPlusPending}</strong>
                            </td>
                            <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#f0fdf4', fontSize: '12px', color: '#16a34a' }}>
                                {globalAchievementPercent}%
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div style={{ marginTop: '30px' }}>
                <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>OBSERVACIONES:</p>
                <div style={{ minHeight: '100px', border: '1px solid #000', padding: '10px', whiteSpace: 'pre-wrap' }}>
                    {observations || 'Sin observaciones.'}
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '80px', textAlign: 'center' }}>
                <div style={{ width: '30%' }}>
                    <div style={{ borderBottom: '1px solid #000', marginBottom: '5px' }}></div>
                    <p style={{ margin: 0 }}>Firma educadora de párvulos</p>
                    <p style={{ margin: 0, fontSize: '12px' }}>{teacherName}</p>
                </div>
                <div style={{ width: '30%' }}>
                    <div style={{ borderBottom: '1px solid #000', marginBottom: '5px' }}></div>
                    <p style={{ margin: 0 }}>Firma director</p>
                </div>
                <div style={{ width: '30%' }}>
                    <div style={{ borderBottom: '1px solid #000', marginBottom: '5px' }}></div>
                    <p style={{ margin: 0 }}>Firma apoderado</p>
                </div>
            </div>
        </div>
    );
};
