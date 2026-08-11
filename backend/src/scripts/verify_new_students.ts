import db from '../config/db';

const targetRuns = [
    '27659067-7', // CID PINO ALONSO ESTEBAN
    '25519851-3', // PÉREZ CONTRERAS AYMARA COLOMBA TRINIDAD
    '23026511-9', // VERA QUIROZ SOFÍA ANTONIA
    '23847697-6', // URRA HUARACÁN FRANCO ABRAHAM
    '23591619-3', // CONTRERAS CARES LUCAS AGUSTÍN
    '23681576-5'  // GUIÑEZ HERRERA VALENTINA ISIDORA
];

async function verify() {
    try {
        console.log("=== VERIFICANDO DETALLES DE LOS NUEVOS ALUMNOS ===");
        
        for (const run of targetRuns) {
            console.log(`\n---------------------------------------------`);
            console.log(`Buscando estudiante con RUN: ${run}`);
            
            // 1. Student details
            const student = await db.get("SELECT id, full_name, run, status, commune, address, birth_date FROM students WHERE run = ?", [run]);
            if (!student) {
                console.error(`[ERROR] Estudiante con RUN ${run} no encontrado.`);
                continue;
            }
            console.log(`[OK] Estudiante: ${student.full_name} (${student.run})`);
            console.log(`     Comuna: ${student.commune}, F.Nac: ${student.birth_date}, Estado: ${student.status}`);

            // 2. Enrollment details
            const enrollment = await db.get(`
                SELECT e.academic_year, l.name as level_name 
                FROM enrollments e 
                JOIN levels l ON e.level_id = l.id 
                WHERE e.student_id = ?
            `, [student.id]);
            if (!enrollment) {
                console.error(`     [ERROR] No tiene registro de matrícula.`);
            } else {
                console.log(`     [OK] Matrícula: Año ${enrollment.academic_year} en curso "${enrollment.level_name}"`);
            }

            // 3. Health record details
            const health = await db.get("SELECT blood_type, allergies, chronic_diseases FROM health_records WHERE student_id = ?", [student.id]);
            if (!health) {
                console.error(`     [ERROR] No tiene ficha de salud.`);
            } else {
                console.log(`     [OK] Ficha de Salud: Sangre: ${health.blood_type || 'N/A'}, Alergias: ${health.allergies || 'Ninguna'}, Enf: ${health.chronic_diseases || 'Ninguna'}`);
            }

            // 4. Guardian details
            const guardians = await db.all("SELECT run, full_name, guardian_type, relationship, phone FROM guardians WHERE student_id = ?", [student.id]);
            console.log(`     [OK] Apoderados registrados: ${guardians.length}`);
            for (const g of guardians) {
                console.log(`          - ${g.guardian_type}: [RUN: ${g.run}] ${g.full_name} (${g.relationship}) | Tel: ${g.phone || 'S/T'}`);
            }
        }
        
        console.log(`\n=============================================`);
        console.log("Verificación finalizada.");
    } catch (error) {
        console.error("Error durante la verificación:", error);
    } finally {
        setTimeout(() => process.exit(0), 1000);
    }
}

verify();
