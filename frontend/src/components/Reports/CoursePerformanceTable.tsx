import React from 'react';
import { KINDER_REPORT_STRUCTURE, PREKINDER_REPORT_STRUCTURE } from './kinderReportData';

interface CoursePerformanceTableProps {
    levelReports: any[];
    levelTemplate: any;
    levelName: string;
}

export const CoursePerformanceTable: React.FC<CoursePerformanceTableProps> = ({
    levelReports, levelTemplate, levelName
}) => {
    // Determine report structure
    let reportStructure = KINDER_REPORT_STRUCTURE;
    if (levelTemplate) {
        reportStructure = typeof levelTemplate.structure_json === 'string' 
            ? JSON.parse(levelTemplate.structure_json) 
            : levelTemplate.structure_json;
    } else {
        const nameLower = (levelName || '').toLowerCase();
        const isPreKinder = nameLower.includes('pre') || nameLower.includes('transición 1') || nameLower.includes('transicion 1') || nameLower.includes('primer nivel');
        reportStructure = isPreKinder ? PREKINDER_REPORT_STRUCTURE : KINDER_REPORT_STRUCTURE;
    }

    if (!reportStructure || !Array.isArray(reportStructure)) return null;

    // Parse all evaluation data objects
    const parsedReports = levelReports.map(r => {
        try {
            return typeof r.evaluation_data === 'string' 
                ? JSON.parse(r.evaluation_data) 
                : (r.evaluation_data || {});
        } catch {
            return {};
        }
    });

    const totalStudents = parsedReports.length;

    return (
        <div style={{ marginBottom: '30px', background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#1e293b', fontSize: '1.1rem', fontWeight: 'bold' }}>
                Rendimiento General del Curso ({levelName}) — Semestre Actual
            </h3>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #cbd5e1', fontSize: '13px' }}>
                    <thead>
                        <tr>
                            <th colSpan={10} style={{ border: '1px solid #cbd5e1', padding: '8px', backgroundColor: '#f1f5f9', color: '#1e293b', textAlign: 'center', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                CUADRO DE RENDIMIENTO DEL CURSO POR NÚCLEO ({totalStudents} Alumnos)
                            </th>
                        </tr>
                        <tr>
                            <th rowSpan={2} style={{ position: 'relative', border: '1px solid #cbd5e1', height: '60px', width: '150px', padding: 0, backgroundColor: '#f8fafc' }}>
                                <div style={{ position: 'absolute', top: '5px', right: '5px', textAlign: 'right', fontWeight: 'bold', fontSize: '10px', color: '#475569' }}>NÚCLEOS</div>
                                <div style={{ position: 'absolute', bottom: '5px', left: '5px', textAlign: 'left', fontWeight: 'bold', fontSize: '10px', color: '#475569' }}>ÁMBITOS</div>
                                <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                                    <line x1="0" y1="0" x2="100%" y2="100%" style={{ stroke: '#cbd5e1', strokeWidth: 1.5 }} />
                                </svg>
                            </th>
                            <th rowSpan={2} style={{ border: '1px solid #cbd5e1', padding: '8px', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle', backgroundColor: '#f8fafc', color: '#475569' }}>NÚCLEOS</th>
                            <th colSpan={2} style={{ border: '1px solid #cbd5e1', padding: '8px', fontWeight: 'bold', textAlign: 'center', backgroundColor: '#f8fafc', color: '#475569' }}>LOGRADO</th>
                            <th colSpan={2} style={{ border: '1px solid #cbd5e1', padding: '8px', fontWeight: 'bold', textAlign: 'center', backgroundColor: '#f8fafc', color: '#475569' }}>MEDIANAMENTE LOGRADO</th>
                            <th colSpan={2} style={{ border: '1px solid #cbd5e1', padding: '8px', fontWeight: 'bold', textAlign: 'center', backgroundColor: '#f8fafc', color: '#475569' }}>POR LOGRAR</th>
                            <th colSpan={2} style={{ border: '1px solid #cbd5e1', padding: '8px', fontWeight: 'bold', textAlign: 'center', backgroundColor: '#f8fafc', color: '#475569' }}>NO EVALUADO</th>
                        </tr>
                        <tr style={{ backgroundColor: '#f8fafc' }}>
                            <th style={{ border: '1px solid #cbd5e1', padding: '4px', fontSize: '11px', fontWeight: 'bold', textAlign: 'center', width: '60px' }}>Cant.</th>
                            <th style={{ border: '1px solid #cbd5e1', padding: '4px', fontSize: '11px', fontWeight: 'bold', textAlign: 'center', width: '60px', backgroundColor: '#dbeafe' }}>%</th>
                            <th style={{ border: '1px solid #cbd5e1', padding: '4px', fontSize: '11px', fontWeight: 'bold', textAlign: 'center', width: '60px' }}>Cant.</th>
                            <th style={{ border: '1px solid #cbd5e1', padding: '4px', fontSize: '11px', fontWeight: 'bold', textAlign: 'center', width: '60px', backgroundColor: '#dbeafe' }}>%</th>
                            <th style={{ border: '1px solid #cbd5e1', padding: '4px', fontSize: '11px', fontWeight: 'bold', textAlign: 'center', width: '60px' }}>Cant.</th>
                            <th style={{ border: '1px solid #cbd5e1', padding: '4px', fontSize: '11px', fontWeight: 'bold', textAlign: 'center', width: '60px', backgroundColor: '#dbeafe' }}>%</th>
                            <th style={{ border: '1px solid #cbd5e1', padding: '4px', fontSize: '11px', fontWeight: 'bold', textAlign: 'center', width: '60px' }}>Cant.</th>
                            <th style={{ border: '1px solid #cbd5e1', padding: '4px', fontSize: '11px', fontWeight: 'bold', textAlign: 'center', width: '60px', backgroundColor: '#dbeafe' }}>%</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reportStructure.map((ambito, aIdx) => {
                            return ambito.nucleos.map((nucleo: any, nIdx: number) => {
                                const oas = nucleo.oas || [];
                                const totalOAsInNucleus = oas.length;
                                
                                // Total evaluations across all students for this nucleus
                                const totalOpportunities = totalOAsInNucleus * totalStudents;
                                
                                let countL = 0;
                                let countML = 0;
                                let countPL = 0;
                                
                                // Loop through all reports to count achievements
                                parsedReports.forEach(evalData => {
                                    oas.forEach((oa: any) => {
                                        const val = evalData[oa.id];
                                        if (val === 'L') countL++;
                                        else if (val === 'M/L') countML++;
                                        else if (val === 'P/L') countPL++;
                                    });
                                });
                                
                                const countNE = totalOpportunities - (countL + countML + countPL);
                                
                                const pctL = totalOpportunities > 0 ? Math.round((countL / totalOpportunities) * 100) : 0;
                                const pctML = totalOpportunities > 0 ? Math.round((countML / totalOpportunities) * 100) : 0;
                                const pctPL = totalOpportunities > 0 ? Math.round((countPL / totalOpportunities) * 100) : 0;
                                const pctNE = totalOpportunities > 0 ? Math.round((countNE / totalOpportunities) * 100) : 0;
                                
                                return (
                                    <tr key={`${aIdx}_${nIdx}`} style={{ borderBottom: '1px solid #cbd5e1' }}>
                                        {nIdx === 0 && (
                                            <td 
                                                rowSpan={ambito.nucleos.length} 
                                                style={{ border: '1px solid #cbd5e1', padding: '8px', fontWeight: 'bold', textTransform: 'uppercase', verticalAlign: 'middle', backgroundColor: '#f8fafc', width: '130px' }}
                                            >
                                                {ambito.ambito}
                                            </td>
                                        )}
                                        <td style={{ border: '1px solid #cbd5e1', padding: '8px', fontWeight: '500', textTransform: 'uppercase' }}>
                                            {nucleo.name}
                                        </td>
                                        {/* LOGRADO */}
                                        <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center' }}>{countL}</td>
                                        <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center', backgroundColor: '#eff6ff', fontWeight: 'bold' }}>{pctL}%</td>
                                        {/* MED. LOGRADO */}
                                        <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center' }}>{countML}</td>
                                        <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center', backgroundColor: '#eff6ff', fontWeight: 'bold' }}>{pctML}%</td>
                                        {/* POR LOGRAR */}
                                        <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center' }}>{countPL}</td>
                                        <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center', backgroundColor: '#eff6ff', fontWeight: 'bold' }}>{pctPL}%</td>
                                        {/* NO EVALUADO */}
                                        <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center' }}>{countNE}</td>
                                        <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center', backgroundColor: '#eff6ff', fontWeight: 'bold' }}>{pctNE}%</td>
                                    </tr>
                                );
                            });
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
