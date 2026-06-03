import React from 'react';
import './OfficialForm.css';

export const formatName = (name: string | undefined | null): string => {
    if (!name || name === 'No asignado' || name === '________________________') return name || '';
    
    // Si contiene minúsculas, asumimos que ya está en formato "Nombre Apellidos"
    const isAllUppercase = name === name.toUpperCase() && /[A-Z]/.test(name);
    if (!isAllUppercase) {
        return name;
    }
    
    const parts = name.trim().split(/\s+/);
    if (parts.length < 2) return name;
    
    let paternal = '';
    let maternal = '';
    let firstNames = '';
    
    if (parts.length >= 3) {
        paternal = parts[0];
        maternal = parts[1];
        firstNames = parts.slice(2).join(' ');
    } else if (parts.length === 2) {
        paternal = parts[0];
        firstNames = parts[1];
    }
    
    const toCamelCase = (str: string) => {
        return str.toLowerCase().split(' ').map(word => {
            if (!word) return '';
            return word.charAt(0).toUpperCase() + word.slice(1);
        }).join(' ');
    };
    
    const formattedName = `${firstNames} ${paternal} ${maternal}`.trim().replace(/\s+/g, ' ');
    return toCamelCase(formattedName);
};


interface OfficialEnrollmentFormProps {
    data: any; // Contains { student, guardians, health }
}

export const OfficialEnrollmentForm: React.FC<OfficialEnrollmentFormProps> = ({ data }) => {
    if (!data || !data.student) return null;

    const s = data.student;
    const titular = data.guardians?.find((g: any) => g.guardian_type === 'Titular') || {};
    const suplente = data.guardians?.find((g: any) => g.guardian_type === 'Suplente') || {};
    const h = data.health || {};
    
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        if (dateStr.includes('-')) {
            const parts = dateStr.split('-');
            if (parts.length === 3 && parts[0].length === 4) {
                return `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
        }
        return dateStr;
    };

    return (
        <div className="official-form-container printable">
            <header className="official-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ textAlign: 'left' }}>
                        <p style={{ fontWeight: 'bold', margin: 0 }}>MINISTERIO DE EDUCACIÓN</p>
                        <p style={{ margin: 0 }}>LICEO TÉCNICO PROFESIONAL CAMPANARIO</p>
                    </div>
                    <div style={{ width: '60px', height: '60px', border: '1px dashed #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: '#999' }}>
                        LOGO
                    </div>
                </div>
                <div style={{ color: '#333', margin: '15px 0 8px 0', fontWeight: 'bold', borderBottom: '1.5px solid #333', paddingBottom: '2px', textTransform: 'uppercase' }}>
                    <h1>FICHA DE MATRÍCULA OFICIAL</h1>
                    <h2>AÑO ESCOLAR 2026</h2>
                </div>
            </header>

            <section className="form-section">
                <div className="section-title">1. ANTECEDENTES DEL ALUMNO(A)</div>
                <div className="form-row">
                    <div className="field" style={{ flex: 1 }}><label>RUN</label><div className="value">{s.run}</div></div>
                    <div className="field" style={{ flex: 3 }}><label>Nombre Completo</label><div className="value">{formatName(s.full_name)}</div></div>
                    <div className="field" style={{ flex: 1 }}><label>Curso 2026</label><div className="value">{s.level_name}</div></div>
                    <div className="field" style={{ flex: 1 }}><label>Fecha Ingreso</label><div className="value">{formatDate(s.entry_date) || new Date(s.created_at).toLocaleDateString()}</div></div>
                </div>
                <div className="form-row">
                    <div className="field"><label>F. Nacimiento</label><div className="value">{formatDate(s.birth_date)}</div></div>
                    <div className="field"><label>Sexo</label><div className="value">{s.gender}</div></div>
                    <div className="field"><label>Nacionalidad</label><div className="value">{s.nationality}</div></div>
                    <div className="field"><label>Estado Civil</label><div className="value">{s.marital_status}</div></div>
                    <div className="field"><label>Religión</label><div className="value">{s.religion}</div></div>
                    <div className="field"><label>Etnia/Pueblo</label><div className="value">{s.ethnicity}</div></div>
                </div>
                <div className="form-row">
                    <div className="field" style={{ flex: 2 }}><label>Dirección</label><div className="value">{s.address}</div></div>
                    <div className="field" style={{ flex: 1 }}><label>Región</label><div className="value">{s.region}</div></div>
                    <div className="field" style={{ flex: 1 }}><label>Comuna</label><div className="value">{s.commune}</div></div>
                    <div className="field" style={{ flex: 2 }}><label>Colegio Procedencia</label><div className="value">{s.previous_school}</div></div>
                </div>
                <div className="form-row">
                    <div className="field"><label>Teléfono Alumno</label><div className="value">{s.phone}</div></div>
                    <div className="field"><label>Email Alumno</label><div className="value">{s.email}</div></div>
                    <div className="field"><label>Previsión (Salud)</label><div className="value">{s.health_system}</div></div>
                    <div className="field"><label>N° Matrícula</label><div className="value">{s.enrollment_number}</div></div>
                </div>
            </section>

            <section className="form-section">
                <div className="section-title">2. ANTECEDENTES FAMILIARES Y CONVIVENCIA</div>
                <div className="form-row">
                    <div className="field" style={{ flex: 2 }}><label>Vive con</label><div className="value">{s.lives_with}</div></div>
                    <div className="field" style={{ flex: 3 }}><label>Grupo Familiar (Integrantes)</label><div className="value">{s.family_members}</div></div>
                </div>
                <div className="form-row">
                    <div className="field"><label>Total Hermanos</label><div className="value">{s.total_siblings}</div></div>
                    <div className="field"><label>Hermanos Escolares</label><div className="value">{s.school_siblings}</div></div>
                    <div className="field"><label>Hermanos en este Liceo</label><div className="value">{s.liceo_siblings}</div></div>
                    <div className="field"><label>Lugar entre Hermanos</label><div className="value">{s.sibling_position}</div></div>
                </div>
            </section>

            <section className="form-section">
                <div className="section-title">3. DATOS DE APODERADOS</div>
                <h4 className="subsection-title">Apoderado Titular</h4>
                <div className="form-row">
                    <div className="field" style={{ flex: 3 }}><label>Nombre Completo</label><div className="value">{formatName(titular.full_name)}</div></div>
                    <div className="field" style={{ flex: 1 }}><label>RUT</label><div className="value">{titular.run}</div></div>
                    <div className="field" style={{ flex: 1 }}><label>Parentesco</label><div className="value">{titular.relationship}</div></div>
                </div>
                <div className="form-row">
                    <div className="field"><label>Teléfono</label><div className="value">{titular.phone}</div></div>
                    <div className="field" style={{ flex: 2 }}><label>Email</label><div className="value">{titular.email}</div></div>
                    <div className="field" style={{ flex: 2 }}><label>Dirección Apoderado</label><div className="value">{titular.address}</div></div>
                </div>
                
                <h4 className="subsection-title" style={{ marginTop: '20px' }}>Apoderado Suplente</h4>
                <div className="form-row">
                    <div className="field" style={{ flex: 3 }}><label>Nombre Completo</label><div className="value">{formatName(suplente.full_name)}</div></div>
                    <div className="field" style={{ flex: 1 }}><label>RUT</label><div className="value">{suplente.run}</div></div>
                </div>
                <div className="form-row">
                    <div className="field"><label>Parentesco</label><div className="value">{suplente.relationship}</div></div>
                    <div className="field"><label>Teléfono Suplente</label><div className="value">{suplente.phone}</div></div>
                    <div className="field" style={{ flex: 2 }}><label>Email Suplente</label><div className="value">{suplente.email || ''}</div></div>
                </div>
            </section>

            <section className="form-section">
                <div className="section-title">4. SALUD Y OBSERVACIONES</div>
                <div className="form-row">
                    <div className="field"><label>Sangre</label><div className="value">{h.blood_type}</div></div>
                    <div className="field" style={{ flex: 2 }}><label>Alergias</label><div className="value">{h.allergies}</div></div>
                    <div className="field" style={{ flex: 2 }}><label>Enfermedades/Crónicos</label><div className="value">{h.chronic_diseases}</div></div>
                </div>
                <div className="form-row">
                    <div className="field" style={{ flex: 1 }}><label>Observaciones Generales</label><div className="value">{h.general_observations || ' '}</div></div>
                </div>
            </section>

            <section className="compromise-box">
                <h4>COMPROMISO CON LA NORMATIVA DEL ESTABLECIMIENTO EDUCACIONAL</h4>
                <p>
                    Yo, <strong>{formatName(titular.full_name)}</strong>, RUN: <strong>{titular.run}</strong>, declaro conocer, respetar, cumplir, hacer cumplir y aceptar de forma integra 
                    el Proyecto Educativo Institucional, el Reglamento de Convivencia Educativa y el Reglamento de Evaluación y Promoción Escolar del Liceo 
                    CAMPANARIO. AUTORIZO LAS SALIDAS DE MI PUPILO (A) a actividades curriculares y extracurriculares programadas fuera del establecimiento (actos, 
                    ceremonias, salidas pedagógicas, compromisos deportivos, recreativos y culturales, campañas solidarias y otras...) dentro de la comuna.
                </p>
            </section>

            <div className="signatures">
                <div className="signature-box">
                    <div className="line"></div>
                    <p>Firma Apoderado Titular</p>
                    <p className="sub">{formatName(titular.full_name)}</p>
                    <p className="sub">{titular.run}</p>
                </div>
                <div className="signature-box">
                    <div className="line"></div>
                    <p>Firma Funcionario LTP</p>
                    <p className="sub">Timbre de Matrícula</p>
                </div>
            </div>
        </div>
    );
};
