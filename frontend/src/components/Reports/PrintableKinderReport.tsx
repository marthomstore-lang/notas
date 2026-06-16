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
    const structure = reportStructure || KINDER_REPORT_STRUCTURE;

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

            {/* Cuadro de Rendimiento por Núcleo */}
            <div style={{ marginTop: '20px', marginBottom: '20px', pageBreakInside: 'avoid' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000', fontSize: '10px' }}>
                    <thead>
                        <tr>
                            <th colSpan={11} style={{ border: '1.5px solid #000', padding: '6px', backgroundColor: '#f3f4f6', color: '#000', textAlign: 'center', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                CUADRO DE RENDIMIENTO POR NÚCLEO
                            </th>
                        </tr>
                        <tr>
                            <th rowSpan={2} style={{ position: 'relative', border: '1px solid #000', height: '60px', width: '120px', padding: 0, backgroundColor: '#f9fafb' }}>
                                <div style={{ position: 'absolute', top: '4px', right: '4px', textAlign: 'right', fontWeight: 'bold', fontSize: '9px' }}>NÚCLEOS</div>
                                <div style={{ position: 'absolute', bottom: '4px', left: '4px', textAlign: 'left', fontWeight: 'bold', fontSize: '9px' }}>ÁMBITOS</div>
                                <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                                    <line x1="0" y1="0" x2="100%" y2="100%" style={{ stroke: '#000', strokeWidth: 1 }} />
                                </svg>
                            </th>
                            <th rowSpan={2} style={{ border: '1px solid #000', padding: '4px', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle', backgroundColor: '#f9fafb' }}>NÚCLEOS</th>
                            <th colSpan={2} style={{ border: '1px solid #000', padding: '4px', fontWeight: 'bold', textAlign: 'center', backgroundColor: '#f9fafb' }}>LOGRADO</th>
                            <th colSpan={2} style={{ border: '1px solid #000', padding: '4px', fontWeight: 'bold', textAlign: 'center', backgroundColor: '#f9fafb' }}>MEDIANAMENTE LOGRADO</th>
                            <th colSpan={2} style={{ border: '1px solid #000', padding: '4px', fontWeight: 'bold', textAlign: 'center', backgroundColor: '#f9fafb' }}>POR LOGRAR</th>
                            <th colSpan={2} style={{ border: '1px solid #000', padding: '4px', fontWeight: 'bold', textAlign: 'center', backgroundColor: '#f9fafb' }}>NO EVALUADO</th>
                            <th rowSpan={2} style={{ border: '1px solid #000', padding: '4px', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle', width: '25%', backgroundColor: '#f9fafb' }}>OBSERVACIONES</th>
                        </tr>
                        <tr style={{ backgroundColor: '#f9fafb' }}>
                            <th style={{ border: '1px solid #000', padding: '3px', fontWeight: 'bold', textAlign: 'center', width: '35px' }}>Cant.</th>
                            <th style={{ border: '1px solid #000', padding: '3px', fontWeight: 'bold', textAlign: 'center', width: '35px', backgroundColor: '#dbeafe' }}>%</th>
                            <th style={{ border: '1px solid #000', padding: '3px', fontWeight: 'bold', textAlign: 'center', width: '35px' }}>Cant.</th>
                            <th style={{ border: '1px solid #000', padding: '3px', fontWeight: 'bold', textAlign: 'center', width: '35px', backgroundColor: '#dbeafe' }}>%</th>
                            <th style={{ border: '1px solid #000', padding: '3px', fontWeight: 'bold', textAlign: 'center', width: '35px' }}>Cant.</th>
                            <th style={{ border: '1px solid #000', padding: '3px', fontWeight: 'bold', textAlign: 'center', width: '35px', backgroundColor: '#dbeafe' }}>%</th>
                            <th style={{ border: '1px solid #000', padding: '3px', fontWeight: 'bold', textAlign: 'center', width: '35px' }}>Cant.</th>
                            <th style={{ border: '1px solid #000', padding: '3px', fontWeight: 'bold', textAlign: 'center', width: '35px', backgroundColor: '#dbeafe' }}>%</th>
                        </tr>
                    </thead>
                    <tbody>
                        {structure.map((ambito: any, aIdx: number) => {
                            return ambito.nucleos.map((nucleo: any, nIdx: number) => {
                                const oas = nucleo.oas || [];
                                const totalOAs = oas.length;
                                let countL = 0;
                                let countML = 0;
                                let countPL = 0;
                                
                                oas.forEach((oa: any) => {
                                    const val = evaluationData[oa.id];
                                    if (val === 'L') countL++;
                                    else if (val === 'M/L') countML++;
                                    else if (val === 'P/L') countPL++;
                                });
                                
                                const countNE = totalOAs - (countL + countML + countPL);
                                
                                const pctL = totalOAs > 0 ? Math.round((countL / totalOAs) * 100) : 0;
                                const pctML = totalOAs > 0 ? Math.round((countML / totalOAs) * 100) : 0;
                                const pctPL = totalOAs > 0 ? Math.round((countPL / totalOAs) * 100) : 0;
                                const pctNE = totalOAs > 0 ? Math.round((countNE / totalOAs) * 100) : 0;
                                
                                const obsKey = `obs_${ambito.ambito}_${nucleo.name}`;
                                const obsValue = evaluationData[obsKey] || '';
                                
                                return (
                                    <tr key={`${aIdx}_${nIdx}`}>
                                        {nIdx === 0 && (
                                            <td 
                                                rowSpan={ambito.nucleos.length} 
                                                style={{ border: '1px solid #000', padding: '5px', fontWeight: 'bold', textTransform: 'uppercase', verticalAlign: 'middle', backgroundColor: '#f9fafb', width: '100px' }}
                                            >
                                                {ambito.ambito}
                                            </td>
                                        )}
                                        <td style={{ border: '1px solid #000', padding: '5px', fontWeight: '500', textTransform: 'uppercase' }}>
                                            {nucleo.name}
                                        </td>
                                        {/* LOGRADO */}
                                        <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{countL}</td>
                                        <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', backgroundColor: '#eff6ff', fontWeight: 'bold' }}>{pctL}%</td>
                                        {/* MED. LOGRADO */}
                                        <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{countML}</td>
                                        <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', backgroundColor: '#eff6ff', fontWeight: 'bold' }}>{pctML}%</td>
                                        {/* POR LOGRAR */}
                                        <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{countPL}</td>
                                        <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', backgroundColor: '#eff6ff', fontWeight: 'bold' }}>{pctPL}%</td>
                                        {/* NO EVALUADO */}
                                        <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{countNE}</td>
                                        <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', backgroundColor: '#eff6ff', fontWeight: 'bold' }}>{pctNE}%</td>
                                        {/* OBSERVACIONES */}
                                        <td style={{ border: '1px solid #000', padding: '5px', whiteSpace: 'pre-wrap' }}>
                                            {obsValue || ''}
                                        </td>
                                    </tr>
                                );
                            });
                        })}
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
