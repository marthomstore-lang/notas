import React, { Fragment } from 'react';
import './GradesReport.css';

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

export const swapSurnamesAndNames = (name: string | undefined | null): string => {
    if (!name || name === 'No asignado' || name === '________________________') return name || '';
    
    const cleanName = name.replace(/\s+/g, ' ').trim();
    const words = cleanName.split(' ');
    
    if (words.length >= 3) {
        const surnames = words.slice(0, 2).join(' ');
        const firstNames = words.slice(2).join(' ');
        return formatName(`${firstNames} ${surnames}`);
    } else if (words.length === 2) {
        return formatName(`${words[1]} ${words[0]}`);
    }
    
    return formatName(cleanName);
};

export const formatPrintName = (student: any): string => {
    if (!student) return '';
    if (student.first_name) {
        const first = student.first_name.trim();
        const paternal = student.paternal_surname ? student.paternal_surname.trim() : '';
        const maternal = student.maternal_surname ? student.maternal_surname.trim() : '';
        return formatName(`${first} ${paternal} ${maternal}`.replace(/\s+/g, ' ').trim());
    }
    return swapSurnamesAndNames(student.full_name);
};

export const isFailingGrade = (val: any): boolean => {
    if (val === undefined || val === null || val === '' || val === '-') return false;
    if (val === 'I') return true;
    const num = parseFloat(String(val).replace(',', '.'));
    return !isNaN(num) && num < 4.0;
};

interface Props {
    data: any[]; 
    period: string;
    year: string;
    onClose: () => void;
}

export const GradesReport: React.FC<Props> = ({ data, period, year, onClose }) => {
    const reports = Array.isArray(data) ? data : [data];

    if (!reports || reports.length === 0) {
        return (
            <div className="report-overlay no-print">
                <div className="report-actions">
                    <p style={{ color: 'white' }}>No hay datos para mostrar</p>
                    <button className="secondary-btn" onClick={onClose}>Cerrar</button>
                </div>
            </div>
        );
    }

    return (
        <div className="report-overlay">
            <div className="report-actions no-print">
                <button 
                    className="primary-btn" 
                    onClick={() => window.print()}
                    style={{ background: '#4f46e5', color: 'white', padding: '14px 28px', borderRadius: '8px', fontWeight: '900', fontSize: '1.1rem', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}
                >
                    IMPRIMIR / DESCARGAR PDF ({reports.length} REPORTES)
                </button>
                <button className="secondary-btn" onClick={onClose} style={{ padding: '14px 28px' }}>CERRAR</button>
            </div>
            
            <div className="all-reports-container">
                {reports.map((report, rIdx) => {
                    const { student, homeroomTeacherName, directorName, periodData, isAnnual } = report;

                    const isExcludedSubject = (row: any): boolean => {
                        if (row.influencesGpa === false || row.influencesGpa === 0 || row.influencesGpa === '0' || row.influencesGpa === 'false') return true;
                        if (row.isQualitative) return true;
                        const lower = String(row.subjectName || '').toLowerCase();
                        return lower.includes('religión') || lower.includes('religion') || lower.includes('orientación') || lower.includes('orientacion');
                    };

                    // Calcular promedios generales
                    let generalAverage = '-';
                    let generalAvgS1 = '-';
                    let generalAvgS2 = '-';
                    let generalAvgFinal = '-';

                    const roundGradeStr = (val: number): string => {
                        return (Math.round((val + 1e-9) * 10) / 10).toFixed(1).replace('.', ',');
                    };

                    if (periodData && Array.isArray(periodData)) {
                        if (isAnnual) {
                            const numericAvgS1 = periodData
                                .filter((row: any) => !isExcludedSubject(row))
                                .map((row: any) => {
                                    if (!row.avgS1 || row.avgS1 === '-') return null;
                                    const val = parseFloat(String(row.avgS1).replace(',', '.'));
                                    return isNaN(val) ? null : val;
                                })
                                .filter((val: number | null) => val !== null) as number[];
                            generalAvgS1 = numericAvgS1.length > 0
                                ? roundGradeStr(numericAvgS1.reduce((sum, val) => sum + val, 0) / numericAvgS1.length)
                                : '-';

                            const numericAvgS2 = periodData
                                .filter((row: any) => !isExcludedSubject(row))
                                .map((row: any) => {
                                    if (!row.avgS2 || row.avgS2 === '-') return null;
                                    const val = parseFloat(String(row.avgS2).replace(',', '.'));
                                    return isNaN(val) ? null : val;
                                })
                                .filter((val: number | null) => val !== null) as number[];
                            generalAvgS2 = numericAvgS2.length > 0
                                ? roundGradeStr(numericAvgS2.reduce((sum, val) => sum + val, 0) / numericAvgS2.length)
                                : '-';

                            const numericFinal = periodData
                                .filter((row: any) => !isExcludedSubject(row))
                                .map((row: any) => {
                                    if (!row.average || row.average === '-') return null;
                                    const val = parseFloat(String(row.average).replace(',', '.'));
                                    return isNaN(val) ? null : val;
                                })
                                .filter((val: number | null) => val !== null) as number[];
                            generalAvgFinal = numericFinal.length > 0
                                ? roundGradeStr(numericFinal.reduce((sum, val) => sum + val, 0) / numericFinal.length)
                                : '-';
                        } else {
                            const numericAverages = periodData
                                .filter((row: any) => !isExcludedSubject(row))
                                .map((row: any) => {
                                    if (!row.average || row.average === '-') return null;
                                    const val = parseFloat(String(row.average).replace(',', '.'));
                                    return isNaN(val) ? null : val;
                                })
                                .filter((val: number | null) => val !== null) as number[];
                            generalAverage = numericAverages.length > 0
                                ? roundGradeStr(numericAverages.reduce((sum, val) => sum + val, 0) / numericAverages.length)
                                : '-';
                        }
                    }

                    return (
                        <div key={student.id || rIdx} className="report-page-wrapper">
                            <div className="report-paper A4">
                                <header className="report-header">
                                    <div className="institutional-header">
                                        <img src="/assets/logo.png" alt="Logo" className="header-logo" />
                                        <div className="school-info">
                                            <h2>LICEO T.P. CAMPANARIO</h2>
                                            <p>Yungay, Región de Ñuble</p>
                                        </div>
                                    </div>
                                </header>

                                <div className="report-title-centered">
                                    <h1>{isAnnual ? 'INFORME ANUAL DE CALIFICACIONES' : 'INFORME DE CALIFICACIONES'}</h1>
                                    <p>{period} - Año Escolar {year}</p>
                                </div>

                                <section className="student-info-section">
                                    <div className="info-grid">
                                        <div className="info-item">
                                            <label>ESTUDIANTE :</label>
                                            <span className="info-value">{formatPrintName(student) || 'N/A'}</span>
                                        </div>
                                        <div className="info-item">
                                            <label>RUT :</label>
                                            <span className="info-value">{student?.run || 'N/A'}</span>
                                        </div>
                                        <div className="info-item">
                                            <label>CURSO :</label>
                                            <span className="info-value">{student?.level_name || 'N/A'}</span>
                                        </div>
                                        <div className="info-item">
                                            <label>FECHA :</label>
                                            <span className="info-value">{new Date().toLocaleDateString('es-CL')}</span>
                                        </div>
                                    </div>
                                </section>

                                <table className="report-table">
                                    <thead>
                                        {isAnnual ? (
                                            <tr>
                                                <th>ASIGNATURA / PERIODO</th>
                                                {Array.from({ length: 10 }).map((_, i) => (
                                                    <th key={i} className="grade-cell">N{i + 1}</th>
                                                ))}
                                                <th>PROM. SEM.</th>
                                                <th>PROM. FINAL</th>
                                            </tr>
                                        ) : (
                                            <tr>
                                                <th>ASIGNATURA</th>
                                                <th colSpan={10}>CALIFICACIONES PARCIALES</th>
                                                <th>PROMEDIO</th>
                                            </tr>
                                        )}
                                    </thead>
                                    <tbody>
                                        {periodData && periodData.map((row: any, idx: number) => (
                                            <Fragment key={idx}>
                                                {isAnnual ? (
                                                    <>
                                                        <tr>
                                                            <td className="subject-name" style={{ borderBottom: 'none' }}>{row.subjectName}</td>
                                                            {row.s1 && row.s1.map((g: any, i: number) => (
                                                                <td key={i} className={`grade-cell ${isFailingGrade(g) ? 'grade-fail' : ''}`}>{g || ''}</td>
                                                            ))}
                                                            <td className={`average-cell ${isFailingGrade(row.avgS1) ? 'grade-fail' : ''}`}>{row.avgS1}</td>
                                                            <td className={`average-cell ${isFailingGrade(row.average) ? 'grade-fail' : ''}`} rowSpan={2} style={{ verticalAlign: 'middle', fontSize: '1.2rem' }}>{row.average}</td>
                                                        </tr>
                                                        <tr>
                                                            <td className="subject-name" style={{ fontSize: '0.7rem', color: '#64748b', paddingTop: 0 }}>2DO SEMESTRE</td>
                                                            {row.s2 && row.s2.map((g: any, i: number) => (
                                                                <td key={i} className={`grade-cell ${isFailingGrade(g) ? 'grade-fail' : ''}`}>{g || ''}</td>
                                                            ))}
                                                            <td className={`average-cell ${isFailingGrade(row.avgS2) ? 'grade-fail' : ''}`}>{row.avgS2}</td>
                                                        </tr>
                                                        <tr className="subject-divider"><td colSpan={13}></td></tr>
                                                    </>
                                                ) : (
                                                    <tr>
                                                        <td className="subject-name">{row.subjectName}</td>
                                                        {Array.from({ length: 10 }).map((_, i) => (
                                                            <td key={i} className={`grade-cell ${isFailingGrade(row.grades && row.grades[i]) ? 'grade-fail' : ''}`}>
                                                                {row.grades && row.grades[i] || ''}
                                                            </td>
                                                        ))}
                                                        <td className={`average-cell ${isFailingGrade(row.average) ? 'grade-fail' : ''}`}>{row.average}</td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        ))}
                                        {isAnnual ? (
                                            <>
                                                <tr className="general-average-row" style={{ background: '#f8fafc' }}>
                                                    <td className="subject-name" style={{ borderBottom: 'none', fontWeight: 'bold' }}>PROMEDIO GENERAL</td>
                                                    {Array.from({ length: 10 }).map((_, i) => (
                                                        <td key={i} className="grade-cell" style={{ background: '#f8fafc' }}></td>
                                                    ))}
                                                    <td className={`average-cell ${isFailingGrade(generalAvgS1) ? 'grade-fail' : ''}`} style={{ fontWeight: 'bold' }}>{generalAvgS1}</td>
                                                    <td className={`average-cell ${isFailingGrade(generalAvgFinal) ? 'grade-fail' : ''}`} rowSpan={2} style={{ verticalAlign: 'middle', fontSize: '1.1rem', fontWeight: 'bold', background: '#f1f5f9' }}>{generalAvgFinal}</td>
                                                </tr>
                                                <tr className="general-average-row" style={{ background: '#f8fafc' }}>
                                                    <td className="subject-name" style={{ fontSize: '0.7rem', color: '#64748b', paddingTop: 0, fontWeight: 'bold' }}>2DO SEMESTRE</td>
                                                    {Array.from({ length: 10 }).map((_, i) => (
                                                        <td key={i} className="grade-cell" style={{ background: '#f8fafc' }}></td>
                                                    ))}
                                                    <td className={`average-cell ${isFailingGrade(generalAvgS2) ? 'grade-fail' : ''}`} style={{ fontWeight: 'bold' }}>{generalAvgS2}</td>
                                                </tr>
                                            </>
                                        ) : (
                                            <tr className="general-average-row" style={{ background: '#f8fafc' }}>
                                                <td className="subject-name" style={{ fontWeight: 'bold' }}>PROMEDIO GENERAL</td>
                                                {Array.from({ length: 10 }).map((_, i) => (
                                                    <td key={i} className="grade-cell" style={{ background: '#f8fafc' }}></td>
                                                ))}
                                                <td className={`average-cell ${isFailingGrade(generalAverage) ? 'grade-fail' : ''}`} style={{ fontWeight: 'bold', fontSize: '1.1rem', background: '#f1f5f9' }}>{generalAverage}</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>

                                <footer className="report-footer">
                                    <div className="signatures">
                                        <div className="signature-box">
                                            <div className="line"></div>
                                            <p className="name">
                                                {(!homeroomTeacherName || homeroomTeacherName === 'No asignado') 
                                                    ? '________________________' 
                                                    : swapSurnamesAndNames(homeroomTeacherName)}
                                            </p>
                                            <p className="title">Profesor(a) Jefe</p>
                                        </div>
                                        <div className="signature-box">
                                            <div className="line"></div>
                                            <p className="name">{formatName(directorName) || '________________________'}</p>
                                            <p className="title">Director(a)</p>
                                        </div>
                                    </div>
                                    <div className="footer-notes">
                                        <p>Documento oficial generado por el Sistema de Gestión Educacional <strong>Liceo Pro</strong>.</p>
                                        <p>La información contenida en este informe es de carácter confidencial y para fines académicos.</p>
                                    </div>
                                </footer>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
