import React, { useState } from 'react';
import '../../views/Dashboard.css';

export const EnrollmentForm = ({ levels, onSubmit, onCancel }: { levels: any[], onSubmit: (data: any) => void, onCancel: () => void }) => {
    const [formData, setFormData] = useState({
        levelId: '',
        run: '', full_name: '', birth_date: '', gender: 'Masculino', nationality: 'Chilena', marital_status: 'Soltero(a)',
        religion: '', ethnicity: 'Ninguna', address: '', region: 'Ñuble', commune: 'Yungay', previous_school: '',
        phone: '', email: '', health_system: 'Fonasa',
        lives_with: '', family_members: 1, total_siblings: 0, school_siblings: 0, liceo_siblings: 0, sibling_position: 1,
        titular_run: '', titular_name: '', titular_relation: 'Madre', titular_phone: '', titular_email: '', titular_address: '',
        suplente_run: '', suplente_name: '', suplente_relation: '', suplente_phone: '', suplente_address: '',
        blood_type: '', allergies: 'Ninguna', chronic_diseases: 'Ninguna', general_observations: ''
    });

    const formatRut = (value: string) => {
        const cleanValue = value.replace(/[^0-9kK]/g, '');
        if (cleanValue.length <= 1) return cleanValue;
        const body = cleanValue.slice(0, -1);
        const dv = cleanValue.slice(-1).toUpperCase();
        return `${body}-${dv}`;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        let value = e.target.value;
        if (['run', 'titular_run', 'suplente_run'].includes(e.target.name)) {
            value = formatRut(value);
        }
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            levelId: formData.levelId,
            academicYear: new Date().getFullYear(),
            studentData: {
                run: formData.run, full_name: formData.full_name, birth_date: formData.birth_date, gender: formData.gender,
                nationality: formData.nationality, marital_status: formData.marital_status, religion: formData.religion, ethnicity: formData.ethnicity,
                address: formData.address, region: formData.region, commune: formData.commune, previous_school: formData.previous_school,
                phone: formData.phone, email: formData.email, health_system: formData.health_system, enrollment_number: 'PENDING',
                lives_with: formData.lives_with, family_members: formData.family_members, total_siblings: formData.total_siblings,
                school_siblings: formData.school_siblings, liceo_siblings: formData.liceo_siblings, sibling_position: formData.sibling_position
            },
            guardiansData: [
                { guardian_type: 'Titular', run: formData.titular_run, full_name: formData.titular_name, relationship: formData.titular_relation, phone: formData.titular_phone, email: formData.titular_email, address: formData.titular_address },
                { guardian_type: 'Suplente', run: formData.suplente_run, full_name: formData.suplente_name, relationship: formData.suplente_relation, phone: formData.suplente_phone, email: '', address: formData.suplente_address }
            ],
            healthData: {
                blood_type: formData.blood_type, allergies: formData.allergies, chronic_diseases: formData.chronic_diseases, general_observations: formData.general_observations
            }
        };
        onSubmit(payload);
    };

    return (
        <form onSubmit={handleSubmit} className="admin-form" style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ marginTop: 0 }}>1. ANTECEDENTES DEL ALUMNO(A)</h3>
            <div className="grid-container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div><label>RUN</label><input required name="run" value={formData.run} onChange={handleChange} /></div>
                <div><label>Nombre Completo</label><input required name="full_name" value={formData.full_name} onChange={handleChange} /></div>
                <div>
                    <label>Curso a Matricular</label>
                    <select required name="levelId" value={formData.levelId} onChange={handleChange}>
                        <option value="">Seleccione Curso...</option>
                        {levels.map(l => <option key={l.id} value={l.id}>{l.name} ({l.current_enrolled}/{l.total_capacity})</option>)}
                    </select>
                </div>
                <div><label>Fecha Nacimiento</label><input type="date" required name="birth_date" value={formData.birth_date} onChange={handleChange} /></div>
                <div><label>Sexo</label><select name="gender" value={formData.gender} onChange={handleChange}><option>Masculino</option><option>Femenino</option><option>Otro</option></select></div>
                <div><label>Nacionalidad</label><input name="nationality" value={formData.nationality} onChange={handleChange} /></div>
                <div><label>Dirección</label><input required name="address" value={formData.address} onChange={handleChange} /></div>
                <div><label>Región</label><input name="region" value={formData.region} onChange={handleChange} /></div>
                <div><label>Comuna</label><input name="commune" value={formData.commune} onChange={handleChange} /></div>
                <div><label>Colegio Procedencia</label><input name="previous_school" value={formData.previous_school} onChange={handleChange} /></div>
                <div><label>Previsión (Salud)</label><input name="health_system" value={formData.health_system} onChange={handleChange} /></div>
                <div><label>Religión</label><input name="religion" value={formData.religion} onChange={handleChange} /></div>
            </div>

            <h3>2. ANTECEDENTES FAMILIARES</h3>
            <div className="grid-container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px' }}>
                <div><label>Vive con</label><input name="lives_with" value={formData.lives_with} onChange={handleChange} /></div>
                <div><label>N° Grupo Familiar</label><input type="number" name="family_members" value={formData.family_members} onChange={handleChange} /></div>
                <div><label>Lugar entre hermanos</label><input type="number" name="sibling_position" value={formData.sibling_position} onChange={handleChange} /></div>
                <div><label>Total Hermanos</label><input type="number" name="total_siblings" value={formData.total_siblings} onChange={handleChange} /></div>
            </div>

            <h3>3. DATOS DE APODERADOS</h3>
            <h4 style={{ margin: '10px 0 5px 0', color: '#3b82f6' }}>Apoderado Titular</h4>
            <div className="grid-container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div><label>Nombre</label><input required name="titular_name" value={formData.titular_name} onChange={handleChange} /></div>
                <div><label>RUT</label><input required name="titular_run" value={formData.titular_run} onChange={handleChange} /></div>
                <div><label>Parentesco</label><input required name="titular_relation" value={formData.titular_relation} onChange={handleChange} /></div>
                <div><label>Teléfono</label><input required name="titular_phone" value={formData.titular_phone} onChange={handleChange} /></div>
                <div style={{ gridColumn: 'span 2' }}><label>Dirección Apoderado</label><input name="titular_address" value={formData.titular_address} onChange={handleChange} /></div>
            </div>

            <h4 style={{ margin: '10px 0 5px 0', color: '#3b82f6' }}>Apoderado Suplente (Opcional)</h4>
            <div className="grid-container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div><label>Nombre</label><input name="suplente_name" value={formData.suplente_name} onChange={handleChange} /></div>
                <div><label>RUT</label><input name="suplente_run" value={formData.suplente_run} onChange={handleChange} /></div>
                <div><label>Parentesco</label><input name="suplente_relation" value={formData.suplente_relation} onChange={handleChange} /></div>
                <div><label>Teléfono</label><input name="suplente_phone" value={formData.suplente_phone} onChange={handleChange} /></div>
                <div style={{ gridColumn: 'span 2' }}><label>Dirección Apoderado Suplente</label><input name="suplente_address" value={formData.suplente_address} onChange={handleChange} /></div>
            </div>

            <h3>4. SALUD Y OBSERVACIONES</h3>
            <div className="grid-container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div><label>Grupo Sanguíneo</label><input name="blood_type" value={formData.blood_type} onChange={handleChange} /></div>
                <div><label>Alergias</label><input name="allergies" value={formData.allergies} onChange={handleChange} /></div>
                <div style={{ gridColumn: '1 / -1' }}><label>Enfermedades Crónicas</label><textarea name="chronic_diseases" value={formData.chronic_diseases} onChange={(e: any) => handleChange(e)} style={{ width: '100%', minHeight: '60px' }} /></div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'row', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="primary-btn">Guardar Matrícula</button>
                <button type="button" onClick={onCancel} className="logout-btn" style={{ width: 'auto', background: '#94a3b8' }}>Cancelar</button>
            </div>
        </form>
    );
};
