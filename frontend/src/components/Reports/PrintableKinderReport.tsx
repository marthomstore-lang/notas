import React from 'react';
import { KINDER_REPORT_STRUCTURE } from './kinderReportData';

const swapSurnamesAndNames = (name: string | undefined | null): string => {
    if (!name || name === 'No asignado' || name === '________________________') return name || '';
    
    const cleanName = name.replace(/\s+/g, ' ').trim();
    const words = cleanName.split(' ');
    
    if (words.length >= 3) {
        const surnames = words.slice(0, 2).join(' ');
        const firstNames = words.slice(2).join(' ');
        return `${firstNames} ${surnames}`;
    } else if (words.length === 2) {
        return `${words[1]} ${words[0]}`;
    }
    
    return cleanName;
};

interface PrintableKinderReportProps {
    studentName: string;
    semester: number;
    year: number;
    evaluationData: Record<string, string>;
    observations: string;
    teacherName: string;
    reportStructure: any[];
    levelName?: string;
}

export const PrintableKinderReport: React.FC<PrintableKinderReportProps> = ({
    studentName, semester, year, evaluationData, observations, teacherName, reportStructure, levelName
}) => {
    const structure = reportStructure || KINDER_REPORT_STRUCTURE;
    const isPreKinder = (levelName || '').toLowerCase().includes('pre');
    const levelTitle = isPreKinder ? 'PRIMER NIVEL TRANSICIÓN' : 'SEGUNDO NIVEL TRANSICIÓN';

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
                <h3 style={{ fontSize: '14px', margin: '0 0 20px 0' }}>{levelTitle}</h3>
            </div>
            
            <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
                <p style={{ margin: 0, fontSize: '14px' }}><strong>NOMBRE:</strong> {swapSurnamesAndNames(studentName)}</p>
            </div>
            <div style={{ marginBottom: '20px', fontSize: '11px', fontWeight: 'bold' }}>
                <p style={{ margin: 0 }}>
                    CALIFICADORES: &nbsp;&nbsp; N/E: NO EVALUADO &nbsp;&nbsp; L: LOGRADO &nbsp;&nbsp; M/L: MEDIANAMENTE LOGRADO &nbsp;&nbsp; P/L: POR LOGRAR
                </p>
            </div>

            {structure.map((ambito: any, index: number) => (
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
                    <p style={{ margin: 0, fontSize: '12px' }}>{swapSurnamesAndNames(teacherName)}</p>
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
