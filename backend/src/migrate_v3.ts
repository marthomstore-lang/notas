import { getDb } from './config/db';

async function migrate() {
    const db = await getDb();
    
    console.log("Iniciando migración V3 - Sincronización de campos de la ficha...");

    try {
        // Campos para la tabla students
        const studentColumns = [
            "document_type TEXT", "first_name TEXT", "paternal_surname TEXT", "maternal_surname TEXT",
            "has_religion BOOLEAN DEFAULT 0", "postal_code TEXT", "phone_type TEXT", "mobile_phone TEXT", "email_type TEXT",
            "emergency_contact_name TEXT", "emergency_contact_phone TEXT",
            "enrollment_date TEXT", "incorporation_date TEXT", "entry_year INTEGER",
            "pie_program BOOLEAN DEFAULT 0", "pie_diagnosis TEXT",
            "differential_group BOOLEAN DEFAULT 0", "is_repeater BOOLEAN DEFAULT 0", "uses_mineduc_texts BOOLEAN DEFAULT 1",
            "indigenous_origin TEXT", "is_priority BOOLEAN DEFAULT 0", "is_preferential BOOLEAN DEFAULT 0", 
            "is_vulnerable BOOLEAN DEFAULT 0", "is_high_vulnerability BOOLEAN DEFAULT 0",
            "scholarship_indigenous BOOLEAN DEFAULT 0", "scholarship_president BOOLEAN DEFAULT 0", 
            "scholarship_retention BOOLEAN DEFAULT 0", "scholarship_junaeb BOOLEAN DEFAULT 0", 
            "scholarship_other TEXT"
        ];

        for (const col of studentColumns) {
            try {
                await db.run(`ALTER TABLE students ADD COLUMN ${col}`);
                console.log(`Columna añadida a students: ${col.split(' ')[0]}`);
            } catch (e) {
                // Probablemente la columna ya existe
            }
        }

        // Campos para la tabla guardians
        const guardianColumns = [
            "first_name TEXT", "paternal_surname TEXT", "maternal_surname TEXT",
            "birth_date TEXT", "gender TEXT", "marital_status TEXT",
            "region TEXT", "commune TEXT", "postal_code TEXT",
            "education_level TEXT", "occupation TEXT", "health_system TEXT",
            "is_health_load BOOLEAN DEFAULT 0", "is_financial_guardian BOOLEAN DEFAULT 0", "is_main_guardian BOOLEAN DEFAULT 0"
        ];

        for (const col of guardianColumns) {
            try {
                await db.run(`ALTER TABLE guardians ADD COLUMN ${col}`);
                console.log(`Columna añadida a guardians: ${col.split(' ')[0]}`);
            } catch (e) {
                // Probablemente la columna ya existe
            }
        }

        console.log("Migración V3 completada exitosamente.");
    } catch (error) {
        console.error("Error en la migración V3:", error);
    }
}

migrate();
