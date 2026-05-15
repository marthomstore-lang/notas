import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Save, Edit2, Printer, User, Home, Heart, Users as UsersIcon } from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import './StudentWindow.css';

const MySwal = withReactContent(Swal);

interface StudentWindowProps {
    studentId: string;
    token: string;
    onClose: () => void;
    onPrint: (studentId: string) => void;
}

const REGIONS = [
    "Sin Datos", "Tarapacá", "Antofagasta", "Atacama", "Coquimbo", "Valparaíso", 
    "Región del Libertador Gral. Bernardo O'Higgins", "Región del Maule", "Región del Biobío", 
    "Región de la Araucanía", "Región de Los Lagos", "Región Aisén del Gral. Carlos Ibáñez del Campo", 
    "Región de Magallanes y de la Antártica Chilena", "Región Metropolitana de Santiago", 
    "Región de Los Ríos", "Arica y Parinacota", "Región Ñuble"
];

const NATIONALITIES = [
    "Chilena", "Extranjera", "Venezolana", "Alemana", "Argentina", "Boliviana", 
    "Brasileña", "China", "Colombiana", "Coreana", "Costarricense", "Cubana", 
    "Ecuatoriana", "Española", "Estadounidense", "Francesa", "Haitiana", 
    "Hondureña", "Hindú", "Italiana"
];

const MARITAL_STATUSES = [
    "Soltero (a)", "Casado(a)", "Separado(a)", "Viudo(a)", "Divorciado(a)", "Conviviente Civil"
];

const PIE_DIAGNOSES = [
    "Sin diagnóstico PIE", "NEE NO ESPECIFICADA", "Síndrome de Down", "Trastorno del Déficit Atencional",
    "Trastorno del Lenguaje", "Dificultad Especifica de Aprendizaje Lectura", 
    "Dificultad Especifica de Aprendizaje Lecto escritura", "Dificultad Especifica de Aprendizaje Cálculo",
    "Funcionamiento Intelectual Limítrofe", "Discapacidad Auditiva", "Discapacidad Visual",
    "Discapacidad Intelectual Leve", "Discapacidad Intelectual Moderado", "Discapacidad Motora",
    "Discapacidad Intelectual Profunda/Severa", "Espectro Autista", "Disfasia", 
    "Discapacidad Múltiple", "Sordoceguera", "Graves alteraciones del comportamiento"
];

const RELATIONSHIPS = [
    "Padre", "Madre", "Abuelo(a)", "Hermano(a)", "Tio(a)", "Primo(a)", "Sin definir"
];

const EDUCATION_LEVELS = [
    "No especificado", "Básica Incompleta", "Básica Completa", "Media Incompleta", 
    "Media Completa", "Técnica Incompleta", "Técnica Completa", "Universitaria Incompleta", 
    "Universitaria Completa", "Postgrado"
];

const COMMUNES = [
    "Yungay", "Bulnes", "Campanario", "Chillán", "Chillán Viejo", "Quillón", "Pemuco", "El Carmen", "San Ignacio", "Otro"
];

const INDIGENOUS_ORIGINS = [
    "No pertenece a ninguna etnia", "Mapuche", "Aymara", "Rapa Nui", "Atacameño", "Quechua", "Colla", "Diaguita", "Kawésqar", "Yagán"
];

export const StudentWindow: React.FC<StudentWindowProps> = ({ studentId, token, onClose, onPrint }) => {
    const { user } = useAuth();
    const [student, setStudent] = useState<any>(null);
    const [guardians, setGuardians] = useState<any[]>([]);
    const [health, setHealth] = useState<any>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'personal' | 'escolar' | 'family' | 'health'>('personal');

    const fetchStudent = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/students/${studentId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setStudent(data.student);
                setGuardians(data.guardians || []);
                setHealth(data.health || {});
            }
        } catch (error) {
            console.error("Error fetching student:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudent();
    }, [studentId]);

    const handleSave = async () => {
        try {
            const updatedStudent = { ...student };
            if (student.first_name || student.paternal_surname) {
                updatedStudent.full_name = `${student.paternal_surname || ''} ${student.maternal_surname || ''} ${student.first_name || ''}`.replace(/\s+/g, ' ').trim();
            }

            const res = await fetch(`/api/admin/students/${studentId}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ student: updatedStudent, guardians, health })
            });

            if (res.ok) {
                setIsEditing(false);
                setStudent(updatedStudent);
                MySwal.fire({
                    icon: 'success',
                    title: 'Guardado',
                    text: 'El expediente se ha actualizado correctamente en la base de datos.',
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                throw new Error("Error en la respuesta del servidor");
            }
        } catch (error) {
            MySwal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo guardar la información en el servidor.',
            });
        }
    };

    const formatRut = (value: string) => {
        const cleanValue = value.replace(/[^0-9kK]/g, '');
        if (cleanValue.length <= 1) return cleanValue;
        const body = cleanValue.slice(0, -1);
        const dv = cleanValue.slice(-1).toUpperCase();
        return `${body}-${dv}`;
    };

    const handleRetireInWindow = async () => {
        const { value: date } = await MySwal.fire({
            title: 'Confirmar Retiro',
            text: `¿Estás seguro de que deseas retirar a ${student.full_name}? Por favor ingresa la fecha de retiro:`,
            input: 'date',
            inputValue: new Date().toISOString().split('T')[0],
            showCancelButton: true,
            confirmButtonText: 'Retirar Estudiante',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#d33'
        });

        if (date) {
            try {
                const res = await fetch(`/api/admin/students/${studentId}`, {
                    method: 'DELETE',
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ withdrawalDate: date })
                });

                if (res.ok) {
                    MySwal.fire('Éxito', 'Estudiante retirado correctamente', 'success');
                    fetchStudent(); // Refresh data
                } else {
                    const err = await res.json();
                    MySwal.fire('Error', err.error || 'No se pudo procesar el retiro', 'error');
                }
            } catch (error) {
                MySwal.fire('Error', 'Error de conexión', 'error');
            }
        }
    };

    const updateStudentField = (field: string, value: any) => {
        let finalValue = value;
        if (field === 'run') {
            finalValue = formatRut(value);
        }
        setStudent({ ...student, [field]: finalValue });
    };

    const updateGuardianField = (type: string, field: string, value: any) => {
        let finalValue = value;
        if (field === 'run') {
            finalValue = formatRut(value);
        }
        const exists = guardians.some(g => g.guardian_type === type);
        if (!exists) {
            setGuardians([...guardians, { guardian_type: type, [field]: finalValue }]);
        } else {
            setGuardians(guardians.map(g => g.guardian_type === type ? { ...g, [field]: finalValue } : g));
        }
    };

    const updateHealthField = (field: string, value: any) => {
        setHealth({ ...health, [field]: value });
    };

    if (loading) return <div className="student-window-overlay"><div className="loader">Cargando...</div></div>;
    if (!student) return null;

    const titular = guardians?.find((g: any) => g.guardian_type === 'Titular') || { guardian_type: 'Titular' };
    const suplente = guardians?.find((g: any) => g.guardian_type === 'Suplente') || { guardian_type: 'Suplente' };

    const GuardianForm = ({ type, data }: { type: string, data: any }) => (
        <div className="enrollment-grid" style={{ marginBottom: '40px', borderBottom: '1px solid #e2e8f0', paddingBottom: '20px' }}>
            <div className="grid-section">
                <h3>Apoderado {type}</h3>
                <div className="two-col-layout">
                    <div className="form-col">
                        <h4>Datos Personales</h4>
                        <div className="field-group">
                            <label>Nombres</label>
                            <input value={data.first_name || ''} onChange={(e) => updateGuardianField(type, 'first_name', e.target.value)} readOnly={!isEditing} />
                        </div>
                        <div className="field-group">
                            <label>Apellido Paterno</label>
                            <input value={data.paternal_surname || ''} onChange={(e) => updateGuardianField(type, 'paternal_surname', e.target.value)} readOnly={!isEditing} />
                        </div>
                        <div className="field-group">
                            <label>Apellido Materno</label>
                            <input value={data.maternal_surname || ''} onChange={(e) => updateGuardianField(type, 'maternal_surname', e.target.value)} readOnly={!isEditing} />
                        </div>
                        <div className="field-group">
                            <label>RUT/Pasaporte</label>
                            <input value={data.run || ''} onChange={(e) => updateGuardianField(type, 'run', e.target.value)} readOnly={!isEditing} />
                        </div>
                        <div className="field-group">
                            <label>Fecha de Nacimiento</label>
                            <input type="date" value={data.birth_date || ''} onChange={(e) => updateGuardianField(type, 'birth_date', e.target.value)} readOnly={!isEditing} />
                        </div>
                        <div className="field-group horizontal">
                            <label>Género</label>
                            <div className="radio-group">
                                <label><input type="radio" checked={data.gender === 'Masculino'} onChange={() => updateGuardianField(type, 'gender', 'Masculino')} disabled={!isEditing} /> Masc.</label>
                                <label><input type="radio" checked={data.gender === 'Femenino'} onChange={() => updateGuardianField(type, 'gender', 'Femenino')} disabled={!isEditing} /> Fem.</label>
                            </div>
                        </div>
                        <div className="field-group">
                            <label>Estado Civil</label>
                            <select value={data.marital_status || 'Soltero (a)'} onChange={(e) => updateGuardianField(type, 'marital_status', e.target.value)} disabled={!isEditing}>
                                {MARITAL_STATUSES.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div className="field-group">
                            <label>Parentesco</label>
                            <select value={data.relationship || 'Padre'} onChange={(e) => updateGuardianField(type, 'relationship', e.target.value)} disabled={!isEditing}>
                                {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="form-col">
                        <h4>Contacto y Otros</h4>
                        <div className="field-group">
                            <label>Dirección</label>
                            <input value={data.address || ''} onChange={(e) => updateGuardianField(type, 'address', e.target.value)} readOnly={!isEditing} />
                        </div>
                        <div className="field-group">
                            <label>Región</label>
                            <select value={data.region || 'Sin Datos'} onChange={(e) => updateGuardianField(type, 'region', e.target.value)} disabled={!isEditing}>
                                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <div className="field-group">
                            <label>Comuna</label>
                            <select value={data.commune || 'Bulnes'} onChange={(e) => updateGuardianField(type, 'commune', e.target.value)} disabled={!isEditing}>
                                {COMMUNES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="field-group">
                            <label>Celular</label>
                            <input value={data.phone || ''} onChange={(e) => updateGuardianField(type, 'phone', e.target.value)} readOnly={!isEditing} />
                        </div>
                        <div className="field-group">
                            <label>Email</label>
                            <input value={data.email || ''} onChange={(e) => updateGuardianField(type, 'email', e.target.value)} readOnly={!isEditing} />
                        </div>
                        <div className="field-group">
                            <label>Escolaridad</label>
                            <select value={data.education_level || 'No especificado'} onChange={(e) => updateGuardianField(type, 'education_level', e.target.value)} disabled={!isEditing}>
                                {EDUCATION_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                        </div>
                        <div className="field-group">
                            <label>Ocupación</label>
                            <input value={data.occupation || ''} onChange={(e) => updateGuardianField(type, 'occupation', e.target.value)} readOnly={!isEditing} />
                        </div>
                        <div className="field-group">
                            <label>Sistema de Salud</label>
                            <input value={data.health_system || ''} onChange={(e) => updateGuardianField(type, 'health_system', e.target.value)} readOnly={!isEditing} />
                        </div>
                        <div className="field-group horizontal toggle">
                            <label htmlFor={`health_load_${type}`}>¿Es carga de salud?</label>
                            <input 
                                id={`health_load_${type}`}
                                type="checkbox" 
                                checked={!!data.is_health_load} 
                                onChange={(e) => updateGuardianField(type, 'is_health_load', e.target.checked)} 
                                disabled={!isEditing} 
                            />
                        </div>
                        <div className="field-group horizontal toggle">
                            <label htmlFor={`financial_${type}`}>¿Apoderado Financiero?</label>
                            <input 
                                id={`financial_${type}`}
                                type="checkbox" 
                                checked={!!data.is_financial_guardian} 
                                onChange={(e) => updateGuardianField(type, 'is_financial_guardian', e.target.checked)} 
                                disabled={!isEditing} 
                            />
                        </div>
                        <div className="field-group horizontal toggle">
                            <label htmlFor={`main_${type}`}>¿Apoderado Titular?</label>
                            <input 
                                id={`main_${type}`}
                                type="checkbox" 
                                checked={!!data.is_main_guardian} 
                                onChange={(e) => updateGuardianField(type, 'is_main_guardian', e.target.checked)} 
                                disabled={!isEditing} 
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="student-window-overlay">
            <div className="student-window-container">
                <header className="window-header">
                    <div className="header-left">
                        <div className="avatar-circle">
                            <User size={32} />
                        </div>
                        <div>
                            <h2>{student.full_name}</h2>
                            <p>{student.run} • {student.level_name || 'Sin curso asignado'}</p>
                        </div>
                    </div>
                    <div className="header-actions">
                        <button onClick={() => onPrint(studentId)} title="Imprimir Ficha"><Printer size={20} /></button>
                        {(user as any)?.role === 'Admin' && (
                            <>
                                {student.status !== 'RETIRADO' && (
                                    <button 
                                        onClick={handleRetireInWindow} 
                                        title="Dar de baja / Retirar" 
                                        style={{ color: '#ef4444' }}
                                    >
                                        <X size={20} />
                                    </button>
                                )}
                                <button onClick={() => setIsEditing(!isEditing)} title={isEditing ? "Cancelar edición" : "Editar ficha"}>
                                    {isEditing ? <X size={20} /> : <Edit2 size={20} />}
                                </button>
                            </>
                        )}
                        <button onClick={onClose} className="close-btn"><X size={24} /></button>
                    </div>
                </header>

                <nav className="window-tabs">
                    <button className={activeTab === 'personal' ? 'active' : ''} onClick={() => setActiveTab('personal')}>
                        <User size={18} /> Datos Personales
                    </button>
                    <button className={activeTab === 'escolar' ? 'active' : ''} onClick={() => setActiveTab('escolar')}>
                        <Printer size={18} /> Escolar y Social
                    </button>
                    <button className={activeTab === 'family' ? 'active' : ''} onClick={() => setActiveTab('family')}>
                        <UsersIcon size={18} /> Familia y Apoderados
                    </button>
                    <button className={activeTab === 'health' ? 'active' : ''} onClick={() => setActiveTab('health')}>
                        <Heart size={18} /> Salud y Convivencia
                    </button>
                </nav>

                <div className="window-content">
                    {activeTab === 'personal' && (
                        <div className="enrollment-grid">
                            <div className="grid-section">
                                <h3>Antecedentes personales del alumno(a)</h3>
                                <div className="two-col-layout">
                                    <div className="form-col">
                                        <div className="field-group horizontal">
                                            <label>Tipo de documento</label>
                                            <div className="radio-group">
                                                <label><input type="radio" checked={student.document_type === 'Run'} onChange={() => updateStudentField('document_type', 'Run')} disabled={!isEditing} /> Run</label>
                                                <label><input type="radio" checked={student.document_type === 'Pasaporte'} onChange={() => updateStudentField('document_type', 'Pasaporte')} disabled={!isEditing} /> Pasaporte</label>
                                            </div>
                                        </div>
                                        <div className="field-group">
                                            <label>RUT <span className="required">(*)</span></label>
                                            <input value={student.run} onChange={(e) => updateStudentField('run', e.target.value)} readOnly={!isEditing} placeholder="Ej: 12123123-2" />
                                        </div>
                                        <div className="field-group">
                                            <label>Nombres <span className="required">(*)</span></label>
                                            <input value={student.first_name || ''} onChange={(e) => updateStudentField('first_name', e.target.value)} readOnly={!isEditing} />
                                        </div>
                                        <div className="field-group">
                                            <label>Apellido paterno <span className="required">(*)</span></label>
                                            <input value={student.paternal_surname || ''} onChange={(e) => updateStudentField('paternal_surname', e.target.value)} readOnly={!isEditing} />
                                        </div>
                                        <div className="field-group">
                                            <label>Apellido materno <span className="required">(*)</span></label>
                                            <input value={student.maternal_surname || ''} onChange={(e) => updateStudentField('maternal_surname', e.target.value)} readOnly={!isEditing} />
                                        </div>
                                        <div className="field-group">
                                            <label>Fecha de nacimiento <span className="required">(*)</span></label>
                                            <input type="date" value={student.birth_date} onChange={(e) => updateStudentField('birth_date', e.target.value)} readOnly={!isEditing} />
                                        </div>
                                        <div className="field-group horizontal">
                                            <label>Género</label>
                                            <div className="radio-group">
                                                <label><input type="radio" checked={student.gender === 'Masculino'} onChange={() => updateStudentField('gender', 'Masculino')} disabled={!isEditing} /> Masculino</label>
                                                <label><input type="radio" checked={student.gender === 'Femenino'} onChange={() => updateStudentField('gender', 'Femenino')} disabled={!isEditing} /> Femenino</label>
                                            </div>
                                        </div>
                                        <div className="field-group">
                                            <label>Nacionalidad</label>
                                            <select value={student.nationality || 'Chilena'} onChange={(e) => updateStudentField('nationality', e.target.value)} disabled={!isEditing}>
                                                {NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}
                                            </select>
                                        </div>
                                        <div className="field-group">
                                            <label>Fecha de Retiro</label>
                                            <input type="date" value={student.withdrawal_date || ''} onChange={(e) => updateStudentField('withdrawal_date', e.target.value)} readOnly={!isEditing} />
                                        </div>
                                        <div className="field-group">
                                            <label>Estado civil</label>
                                            <select value={student.marital_status || 'Soltero (a)'} onChange={(e) => updateStudentField('marital_status', e.target.value)} disabled={!isEditing}>
                                                {MARITAL_STATUSES.map(m => <option key={m} value={m}>{m}</option>)}
                                            </select>
                                        </div>
                                        <div className="field-group horizontal toggle">
                                            <label htmlFor="has_religion">Religión</label>
                                            <input 
                                                id="has_religion"
                                                type="checkbox" 
                                                checked={!!student.has_religion} 
                                                onChange={(e) => updateStudentField('has_religion', e.target.checked)} 
                                                disabled={!isEditing} 
                                            />
                                        </div>
                                        {student.has_religion && (
                                            <div className="field-group">
                                                <label>Religión del alumno</label>
                                                <input value={student.religion || ''} onChange={(e) => updateStudentField('religion', e.target.value)} readOnly={!isEditing} />
                                            </div>
                                        )}
                                    </div>

                                    <div className="form-col">
                                        <div className="field-group">
                                            <label>Dirección <span className="required">(*)</span></label>
                                            <input value={student.address} onChange={(e) => updateStudentField('address', e.target.value)} readOnly={!isEditing} />
                                        </div>
                                        <div className="field-group">
                                            <label>Región</label>
                                            <select value={student.region || 'Sin Datos'} onChange={(e) => updateStudentField('region', e.target.value)} disabled={!isEditing}>
                                                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                            </select>
                                        </div>
                                        <div className="field-group">
                                            <label>Comuna</label>
                                            <select value={student.commune || 'Bulnes'} onChange={(e) => updateStudentField('commune', e.target.value)} disabled={!isEditing}>
                                                {COMMUNES.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <div className="field-group">
                                            <label>Codigo Postal</label>
                                            <input value={student.postal_code || ''} onChange={(e) => updateStudentField('postal_code', e.target.value)} readOnly={!isEditing} />
                                        </div>
                                        <div className="field-group">
                                            <label>Tipo de Telefono</label>
                                            <select value={student.phone_type || 'Fax'} onChange={(e) => updateStudentField('phone_type', e.target.value)} disabled={!isEditing}>
                                                <option value="Fax">Fax</option>
                                                <option value="Casa">Casa</option>
                                                <option value="Trabajo">Trabajo</option>
                                            </select>
                                        </div>
                                        <div className="field-group">
                                            <label>Celular</label>
                                            <div className="phone-input">
                                                <span>+56</span>
                                                <input value={student.mobile_phone || ''} onChange={(e) => updateStudentField('mobile_phone', e.target.value)} readOnly={!isEditing} />
                                            </div>
                                        </div>
                                        <div className="field-group">
                                            <label>Teléfono</label>
                                            <div className="phone-input">
                                                <span>+56</span>
                                                <input value={student.phone || ''} onChange={(e) => updateStudentField('phone', e.target.value)} readOnly={!isEditing} />
                                            </div>
                                        </div>
                                        <div className="field-group">
                                            <label>Tipo de Correo</label>
                                            <select value={student.email_type || 'Personal'} onChange={(e) => updateStudentField('email_type', e.target.value)} disabled={!isEditing}>
                                                <option value="Personal">Personal</option>
                                                <option value="Institucional">Institucional</option>
                                            </select>
                                        </div>
                                        <div className="field-group">
                                            <label>E-mail</label>
                                            <input value={student.email || ''} onChange={(e) => updateStudentField('email', e.target.value)} readOnly={!isEditing} placeholder="correo@ejemplo.cl" />
                                        </div>
                                        <div className="field-group">
                                            <label>En caso de emergencia remitir a</label>
                                            <input value={student.emergency_contact_name || ''} onChange={(e) => updateStudentField('emergency_contact_name', e.target.value)} readOnly={!isEditing} />
                                        </div>
                                        <div className="field-group">
                                            <label>Teléfono emergencia</label>
                                            <input value={student.emergency_contact_phone || ''} onChange={(e) => updateStudentField('emergency_contact_phone', e.target.value)} readOnly={!isEditing} />
                                        </div>
                                        <div className="field-group">
                                            <label>Sistema de salud</label>
                                            <input value={student.health_system || ''} onChange={(e) => updateStudentField('health_system', e.target.value)} readOnly={!isEditing} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'escolar' && (
                        <div className="enrollment-grid">
                            <div className="grid-section">
                                <h3>Antecedentes escolares y sociales</h3>
                                <div className="two-col-layout">
                                    <div className="form-col">
                                        <div className="field-group">
                                            <label>N° de matrícula</label>
                                            <input value={student.enrollment_number || ''} onChange={(e) => updateStudentField('enrollment_number', e.target.value)} readOnly={!isEditing} />
                                        </div>
                                        <div className="field-group">
                                            <label>Fecha de matrícula</label>
                                            <input type="date" value={student.enrollment_date || ''} onChange={(e) => updateStudentField('enrollment_date', e.target.value)} readOnly={!isEditing} />
                                        </div>
                                        <div className="field-group">
                                            <label>Fecha de incorporación</label>
                                            <input type="date" value={student.incorporation_date || ''} onChange={(e) => updateStudentField('incorporation_date', e.target.value)} readOnly={!isEditing} />
                                        </div>
                                        <div className="field-group">
                                            <label>Año de ingreso</label>
                                            <input type="number" value={student.entry_year || 2026} onChange={(e) => updateStudentField('entry_year', e.target.value)} readOnly={!isEditing} />
                                        </div>
                                        <div className="field-group horizontal toggle">
                                            <label htmlFor="pie_program">Programa Integración Escolar (PIE)</label>
                                            <input 
                                                id="pie_program"
                                                type="checkbox" 
                                                checked={!!student.pie_program} 
                                                onChange={(e) => updateStudentField('pie_program', e.target.checked)} 
                                                disabled={!isEditing} 
                                            />
                                        </div>
                                        {student.pie_program && (
                                            <div className="field-group">
                                                <label>Diagnóstico PIE</label>
                                                <select value={student.pie_diagnosis || 'Sin diagnóstico PIE'} onChange={(e) => updateStudentField('pie_diagnosis', e.target.value)} disabled={!isEditing}>
                                                    {PIE_DIAGNOSES.map(d => <option key={d} value={d}>{d}</option>)}
                                                </select>
                                            </div>
                                        )}
                                        <div className="field-group horizontal toggle">
                                            <label htmlFor="differential_group">Grupo diferencial</label>
                                            <input 
                                                id="differential_group"
                                                type="checkbox" 
                                                checked={!!student.differential_group} 
                                                onChange={(e) => updateStudentField('differential_group', e.target.checked)} 
                                                disabled={!isEditing} 
                                            />
                                        </div>
                                        <div className="field-group horizontal toggle">
                                            <label htmlFor="is_repeater">Repitente grado</label>
                                            <input 
                                                id="is_repeater"
                                                type="checkbox" 
                                                checked={!!student.is_repeater} 
                                                onChange={(e) => updateStudentField('is_repeater', e.target.checked)} 
                                                disabled={!isEditing} 
                                            />
                                        </div>
                                        <div className="field-group horizontal toggle">
                                            <label htmlFor="uses_mineduc_texts">Uso textos escolares MINEDUC</label>
                                            <input 
                                                id="uses_mineduc_texts"
                                                type="checkbox" 
                                                checked={!!student.uses_mineduc_texts} 
                                                onChange={(e) => updateStudentField('uses_mineduc_texts', e.target.checked)} 
                                                disabled={!isEditing} 
                                            />
                                        </div>
                                    </div>
                                    <div className="form-col">
                                        <div className="field-group">
                                            <label>Colegio de procedencia</label>
                                            <input value={student.previous_school || ''} onChange={(e) => updateStudentField('previous_school', e.target.value)} readOnly={!isEditing} />
                                        </div>
                                        <div className="field-group">
                                            <label>Origen indígena</label>
                                            <select value={student.indigenous_origin || 'No pertenece a ninguna etnia'} onChange={(e) => updateStudentField('indigenous_origin', e.target.value)} disabled={!isEditing}>
                                                {INDIGENOUS_ORIGINS.map(o => <option key={o} value={o}>{o}</option>)}
                                            </select>
                                        </div>
                                        <div className="field-group horizontal toggle">
                                            <label htmlFor="is_priority">Prioritario</label>
                                            <input id="is_priority" type="checkbox" checked={!!student.is_priority} onChange={(e) => updateStudentField('is_priority', e.target.checked)} disabled={!isEditing} />
                                        </div>
                                        <div className="field-group horizontal toggle">
                                            <label htmlFor="is_preferential">Preferente</label>
                                            <input id="is_preferential" type="checkbox" checked={!!student.is_preferential} onChange={(e) => updateStudentField('is_preferential', e.target.checked)} disabled={!isEditing} />
                                        </div>
                                        <div className="field-group horizontal toggle">
                                            <label htmlFor="is_vulnerable">Vulnerable (15%)</label>
                                            <input id="is_vulnerable" type="checkbox" checked={!!student.is_vulnerable} onChange={(e) => updateStudentField('is_vulnerable', e.target.checked)} disabled={!isEditing} />
                                        </div>
                                        <div className="field-group horizontal toggle">
                                            <label htmlFor="is_high_vulnerability">Alta Vulnerabilidad</label>
                                            <input id="is_high_vulnerability" type="checkbox" checked={!!student.is_high_vulnerability} onChange={(e) => updateStudentField('is_high_vulnerability', e.target.checked)} disabled={!isEditing} />
                                        </div>
                                        <div className="field-group">
                                            <label>Becas</label>
                                            <div className="checkbox-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                                <div className="field-group horizontal toggle mini">
                                                    <label htmlFor="sch_ind">Indígena</label>
                                                    <input id="sch_ind" type="checkbox" checked={!!student.scholarship_indigenous} onChange={(e) => updateStudentField('scholarship_indigenous', e.target.checked)} disabled={!isEditing} />
                                                </div>
                                                <div className="field-group horizontal toggle mini">
                                                    <label htmlFor="sch_pres">Presidente</label>
                                                    <input id="sch_pres" type="checkbox" checked={!!student.scholarship_president} onChange={(e) => updateStudentField('scholarship_president', e.target.checked)} disabled={!isEditing} />
                                                </div>
                                                <div className="field-group horizontal toggle mini">
                                                    <label htmlFor="sch_ret">Pro-retención</label>
                                                    <input id="sch_ret" type="checkbox" checked={!!student.scholarship_retention} onChange={(e) => updateStudentField('scholarship_retention', e.target.checked)} disabled={!isEditing} />
                                                </div>
                                                <div className="field-group horizontal toggle mini">
                                                    <label htmlFor="sch_jun">Junaeb</label>
                                                    <input id="sch_jun" type="checkbox" checked={!!student.scholarship_junaeb} onChange={(e) => updateStudentField('scholarship_junaeb', e.target.checked)} disabled={!isEditing} />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="field-group">
                                            <label>Otra beca / beneficio</label>
                                            <input value={student.scholarship_other || ''} onChange={(e) => updateStudentField('scholarship_other', e.target.value)} readOnly={!isEditing} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'family' && (
                        <div className="window-tabs-content">
                            <div className="enrollment-grid" style={{ marginBottom: '30px' }}>
                                <div className="grid-section">
                                    <h3>Convivencia y Hermanos</h3>
                                    <div className="two-col-layout">
                                        <div className="form-col">
                                            <div className="field-group">
                                                <label>Alumno vive con</label>
                                                <select value={student.lives_with || 'No especifica'} onChange={(e) => updateStudentField('lives_with', e.target.value)} disabled={!isEditing}>
                                                    <option value="Ambos Padres">Ambos Padres</option>
                                                    <option value="Solo Madre">Solo Madre</option>
                                                    <option value="Solo Padre">Solo Padre</option>
                                                    <option value="Abuelos">Abuelos</option>
                                                    <option value="Otros">Otros</option>
                                                    <option value="No especifica">No especifica</option>
                                                </select>
                                            </div>
                                            {student.lives_with === 'Otros' && (
                                                <div className="field-group">
                                                    <label>Indique con quién</label>
                                                    <input value={student.lives_with_other || ''} onChange={(e) => updateStudentField('lives_with_other', e.target.value)} readOnly={!isEditing} />
                                                </div>
                                            )}
                                            <div className="field-group">
                                                <label>N° personas grupo familiar</label>
                                                <input type="number" value={student.family_members || ''} onChange={(e) => updateStudentField('family_members', e.target.value)} readOnly={!isEditing} />
                                            </div>
                                        </div>
                                        <div className="form-col">
                                            <div className="field-group">
                                                <label>N° de hermanos</label>
                                                <input type="number" value={student.total_siblings || 0} onChange={(e) => updateStudentField('total_siblings', e.target.value)} readOnly={!isEditing} />
                                            </div>
                                            <div className="field-group">
                                                <label>Lugar entre los hermanos</label>
                                                <input type="number" value={student.sibling_position || ''} onChange={(e) => updateStudentField('sibling_position', e.target.value)} readOnly={!isEditing} />
                                            </div>
                                            <div className="field-group">
                                                <label>N° hermanos edad escolar</label>
                                                <input type="number" value={student.school_age_siblings || 0} onChange={(e) => updateStudentField('school_age_siblings', e.target.value)} readOnly={!isEditing} />
                                            </div>
                                            <div className="field-group">
                                                <label>N° hermanos en el liceo</label>
                                                <input type="number" value={student.liceo_siblings || 0} onChange={(e) => updateStudentField('liceo_siblings', e.target.value)} readOnly={!isEditing} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <GuardianForm type="Titular" data={titular} />
                            <GuardianForm type="Suplente" data={suplente} />
                        </div>
                    )}

                    {activeTab === 'health' && (
                        <div className="data-grid">
                            <div className="data-section">
                                <h3>Antecedentes de Salud</h3>
                                <div className="field-group">
                                    <label>Grupo Sanguíneo</label>
                                    <input value={health.blood_type || ''} onChange={(e) => updateHealthField('blood_type', e.target.value)} readOnly={!isEditing} />
                                </div>
                                <div className="field-group">
                                    <label>Alergias</label>
                                    <input value={health.allergies || ''} onChange={(e) => updateHealthField('allergies', e.target.value)} readOnly={!isEditing} />
                                </div>
                                <div className="field-group">
                                    <label>Enfermedades Crónicas</label>
                                    <textarea value={health.chronic_diseases || ''} onChange={(e) => updateHealthField('chronic_diseases', e.target.value)} readOnly={!isEditing} />
                                </div>
                            </div>
                            <div className="data-section">
                                <h3>Otros Datos</h3>
                                <div className="field-group">
                                    <label>Previsión</label>
                                    <input value={student.health_system || ''} onChange={(e) => updateStudentField('health_system', e.target.value)} readOnly={!isEditing} />
                                </div>
                                <div className="field-group">
                                    <label>Observaciones Generales</label>
                                    <textarea value={health.general_observations || ''} onChange={(e) => updateHealthField('general_observations', e.target.value)} readOnly={!isEditing} />
                                </div>
                            </div>
                        </div>
                    )}
                    {student.status === 'RETIRADO' && (
                        <div style={{ 
                            background: '#fee2e2', 
                            border: '2px solid #ef4444', 
                            padding: '15px', 
                            borderRadius: '8px', 
                            marginTop: '20px',
                            color: '#b91c1c',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                        }}>
                            <X size={24} />
                            <div>
                                <div style={{ fontSize: '1.1rem' }}>ESTUDIANTE RETIRADO</div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 'normal' }}>
                                    Fecha de Retiro: {student.withdrawal_date ? new Date(student.withdrawal_date + 'T12:00:00').toLocaleDateString() : 'No registrada'}
                                </div>
                            </div>
                            <button 
                                onClick={async () => {
                                    const confirm = await MySwal.fire({
                                        title: '¿Reincorporar Estudiante?',
                                        text: "El estudiante volverá a estar activo en las listas y libros de clases.",
                                        icon: 'question',
                                        showCancelButton: true,
                                        confirmButtonText: 'Sí, reincorporar',
                                        cancelButtonText: 'Cancelar'
                                    });
                                    if (confirm.isConfirmed) {
                                        const res = await fetch(`/api/admin/students/${studentId}/reincorporate`, {
                                            method: 'POST',
                                            headers: { 'Authorization': `Bearer ${token}` }
                                        });
                                        if (res.ok) {
                                            MySwal.fire('Éxito', 'Estudiante reincorporado', 'success');
                                            fetchStudentData(); // Refresh data
                                        }
                                    }
                                }}
                                style={{
                                    marginLeft: 'auto',
                                    background: '#b91c1c',
                                    color: 'white',
                                    border: 'none',
                                    padding: '8px 15px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem'
                                }}
                            >
                                Reincorporar Estudiante
                            </button>
                        </div>
                    )}
                </div>

                {isEditing && (
                    <footer className="window-footer">
                        <button className="save-btn" onClick={handleSave}>
                            <Save size={18} /> Guardar Cambios en Base de Datos
                        </button>
                    </footer>
                )}
            </div>
        </div>
    );
};
