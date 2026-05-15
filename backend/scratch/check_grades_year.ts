import { getDb } from '../src/config/db';

async function checkGradesYear() {
    const db = await getDb();
    const years = await db.all("SELECT DISTINCT academic_year FROM grade_columns");
    console.log("Years in grade_columns:", years);
    
    const sampleGrades = await db.all(`
        SELECT g.*, gc.academic_year 
        FROM grades g 
        JOIN grade_columns gc ON g.grade_column_id = gc.id 
        LIMIT 5
    `);
    console.log("Sample Grades with Years:", sampleGrades);
}

checkGradesYear();
