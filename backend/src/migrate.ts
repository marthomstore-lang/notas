import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

async function migrate() {
    const db = await open({
        filename: path.join(__dirname, '../liceopro.db'),
        driver: sqlite3.Database
    });

    console.log("Starting migration...");
    
    const columns = [
        "document_type", "first_name", "paternal_surname", "maternal_surname",
        "postal_code", "phone_type", "mobile_phone", "email_type",
        "emergency_contact_name", "emergency_contact_phone",
        "enrollment_date", "incorporation_date", "entry_year",
        "pie_program", "differential_group", "indigenous_origin",
        "is_priority", "is_preferential", "is_vulnerable", "is_high_vulnerability",
        "scholarship_indigenous", "scholarship_president", "scholarship_retention",
        "scholarship_junaeb", "scholarship_other", "is_repeater",
        "uses_mineduc_texts", "lives_with_other", "school_age_siblings",
        "pie_diagnosis"
    ];

    for (const col of columns) {
        let type = "TEXT";
        if (["entry_year", "school_age_siblings"].includes(col)) type = "INTEGER";
        if ([
            "pie_program", "differential_group", "is_priority", "is_preferential", 
            "is_vulnerable", "is_high_vulnerability", "scholarship_indigenous", 
            "scholarship_president", "scholarship_retention", "scholarship_junaeb", 
            "is_repeater", "uses_mineduc_texts"
        ].includes(col)) type = "BOOLEAN DEFAULT 0";

        try {
            await db.run(`ALTER TABLE students ADD COLUMN ${col} ${type}`);
            console.log(`Added column: ${col} (${type})`);
        } catch (e: any) {
            if (e.message.includes("duplicate column name")) {
                console.log(`Column ${col} already exists.`);
            } else {
                console.error(`Error adding column ${col}:`, e.message);
            }
        }
    }

    const guardianColumns = [
        "first_name", "paternal_surname", "maternal_surname", "birth_date",
        "gender", "marital_status", "region", "commune", "postal_code",
        "education_level", "occupation", "health_system", 
        "is_health_load", "is_financial_guardian", "is_main_guardian"
    ];

    for (const col of guardianColumns) {
        let type = "TEXT";
        if (["is_health_load", "is_financial_guardian", "is_main_guardian"].includes(col)) type = "BOOLEAN DEFAULT 0";
        
        try {
            await db.run(`ALTER TABLE guardians ADD COLUMN ${col} ${type}`);
            console.log(`Added column to guardians: ${col} (${type})`);
        } catch (e: any) {
            if (e.message.includes("duplicate column name")) {
                console.log(`Column ${col} already exists in guardians.`);
            } else {
                console.error(`Error adding column ${col} to guardians:`, e.message);
            }
        }
    }

    const gradeColumnCols = [
        "period", "position", "weighting"
    ];

    for (const col of gradeColumnCols) {
        let type = "TEXT";
        if (col === "position") type = "INTEGER";
        if (col === "weighting") type = "REAL DEFAULT 0";

        try {
            await db.run(`ALTER TABLE grade_columns ADD COLUMN ${col} ${type}`);
            console.log(`Added column to grade_columns: ${col} (${type})`);
        } catch (e: any) {
            if (e.message.includes("duplicate column name")) {
                console.log(`Column ${col} already exists in grade_columns.`);
            } else {
                console.error(`Error adding column ${col} to grade_columns:`, e.message);
            }
        }
    }

    console.log("Migration finished.");
    await db.close();
}

migrate();
