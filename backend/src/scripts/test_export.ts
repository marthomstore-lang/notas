import db from '../config/db';
import * as xlsx from 'xlsx';

async function testExport() {
    let client;
    try {
        console.log("Conectando a la DB...");
        client = await db.connect();
        
        console.log("Ejecutando consulta de estudiantes...");
        const result = await client.query(`
            SELECT 
                s.run as "Rut", 
                s.full_name as "Nombre",
                l.name as "CURSO",
                s.gender as "Sexo",
                s.birth_date as "Fechas Nacimiento",
                s.nationality as "Nacionalidad",
                s.marital_status as "Estado Civil",
                s.address as "Dirección",
                s.region as "Región",
                s.commune as "Comuna",
                s.email as "Email",
                s.phone as "Teléfono Estudiante",
                hr.blood_type as "Grupo Sanguíneo",
                hr.allergies as "Alergias",
                hr.chronic_diseases as "Enfermedades",
                s.religion as "Religión",
                s.health_system as "Sistema Salud",
                s.observaciones as "Observaciones",
                s.entry_date as "Fecha de Ingreso",
                s.previous_school as "Colegio Procedencia",
                s.ethnicity as "Pueblo Indígena",
                s.lives_with as "Vive Con",
                s.family_members as "Grupo Familiar",
                s.total_siblings as "Total Hermanos",
                s.sibling_position as "Lugar Hermanos",
                s.school_siblings as "Hermanos Escolares",
                s.liceo_siblings as "Hermanos Colegio",
                s.enrollment_number as "N° Matrícula",
                s.status as "estado"
            FROM students s 
            LEFT JOIN enrollments e ON s.id = e.student_id 
            LEFT JOIN levels l ON e.level_id = l.id
            LEFT JOIN health_records hr ON s.id = hr.student_id
            WHERE s.status = 'Active'
            ORDER BY l.name, s.full_name
        `);
        console.log(`Estudiantes obtenidos: ${result.rows ? result.rows.length : 0}`);

        console.log("Ejecutando consulta de apoderados titulares...");
        const titularesResult = await client.query(`
            SELECT s.run as "RUN Estudiante", g.run as "RUN/IPA", g.full_name as "Nombre Apoderado Titular", g.relationship as "Parentesco", g.phone as "Teléfono Titular", g.email as "Email", g.address as "Dirección"
            FROM guardians g JOIN students s ON g.student_id = s.id WHERE g.guardian_type = 'Titular'
        `);
        console.log(`Apoderados titulares obtenidos: ${titularesResult.rows ? titularesResult.rows.length : 0}`);

        console.log("Ejecutando consulta de apoderados suplentes...");
        const suplentesResult = await client.query(`
            SELECT s.run as "RUN Estudiante", g.run as "RUN/IPA", g.full_name as "Nombre Apoderado Suplente", g.relationship as "Parentesco", g.phone as "Teléfono Suplente", g.email as "Email", g.address as "Dirección"
            FROM guardians g JOIN students s ON g.student_id = s.id WHERE g.guardian_type = 'Suplente'
        `);
        console.log(`Apoderados suplentes obtenidos: ${suplentesResult.rows ? suplentesResult.rows.length : 0}`);

        console.log("Construyendo libro Excel...");
        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.json_to_sheet(result.rows);
        xlsx.utils.book_append_sheet(workbook, worksheet, "Estudiantes");

        if (titularesResult.rows && titularesResult.rows.length > 0) {
            const titularesSheet = xlsx.utils.json_to_sheet(titularesResult.rows);
            xlsx.utils.book_append_sheet(workbook, titularesSheet, "bd_titulares");
        }

        if (suplentesResult.rows && suplentesResult.rows.length > 0) {
            const suplentesSheet = xlsx.utils.json_to_sheet(suplentesResult.rows);
            xlsx.utils.book_append_sheet(workbook, suplentesSheet, "bd_suplentes");
        }

        console.log("Generando buffer xlsx...");
        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        console.log(`Buffer generado con éxito! Tamaño: ${buffer.length} bytes`);
        console.log("Prueba completada sin errores.");
    } catch (error) {
        console.error("ERROR DETECTADO EN EL EXPORT:", error);
    } finally {
        if (client) client.release();
        setTimeout(() => process.exit(0), 1000);
    }
}

testExport();
