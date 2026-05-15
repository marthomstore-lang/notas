import { getDb } from '../src/config/db';

async function check2028() {
    const db = await getDb();
    const cols = await db.all("SELECT * FROM grade_columns WHERE academic_year = 2028");
    console.log("Columns for 2028:", cols.length);
    
    const grades = await db.all(`
        SELECT COUNT(*) as count 
        FROM grades g 
        JOIN grade_columns gc ON g.grade_column_id = gc.id 
        WHERE gc.academic_year = 2028
    `);
    console.log("Grades for 2028:", grades[0].count);
}

check2028();
