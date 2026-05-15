import { getDb } from '../src/config/db';
import { v4 as uuidv4 } from 'uuid';

async function testSave() {
    const db = await getDb();
    const mockReq = {
        body: {
            levelId: '22',
            subjectId: '103',
            period: '1er Semestre',
            year: '2026',
            columns: [
                { position: 1, weighting: 10, title: 'Test Col' }
            ],
            gradesData: [
                { student_id: 'a7ad9c32-ab1c-4b85-b545-f18b6329bd8a', position: 1, grade_value: '5.5' }
            ]
        },
        user: { id: 'admin-id', name: 'Admin Test' }
    };

    const { levelId, subjectId, period, year, columns, gradesData } = mockReq.body;
    const user = mockReq.user;

    try {
        console.log("Starting transaction...");
        await db.run('BEGIN TRANSACTION');

        for (const col of columns) {
            const existing = await db.get('SELECT id FROM grade_columns WHERE level_id = ? AND subject_id = ? AND period = ? AND academic_year = ? AND position = ?', 
                [levelId, subjectId, period, year, col.position]);
            
            let columnId = (col as any).id;
            if (existing) {
                columnId = existing.id;
                await db.run('UPDATE grade_columns SET weighting = ?, title = ? WHERE id = ?', [col.weighting, col.title || `N${col.position}`, columnId]);
            } else {
                columnId = (col as any).id || uuidv4();
                await db.run(`INSERT INTO grade_columns (id, level_id, subject_id, academic_year, period, position, weighting, title) 
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
                             [columnId, levelId, subjectId, year, period, col.position, col.weighting, col.title || `N${col.position}`]);
            }
            (col as any).newId = columnId;
        }

        for (const g of gradesData) {
            const col = columns.find((c: any) => c.position === g.position);
            const columnId = col ? (col as any).newId : (g as any).grade_column_id;
            if (!columnId) continue;

            const existingGrade = await db.get('SELECT id, grade_value FROM grades WHERE student_id = ? AND grade_column_id = ?', [g.student_id, columnId]);
            if (existingGrade) {
                await db.run('UPDATE grades SET grade_value = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [g.grade_value, existingGrade.id]);
            } else {
                await db.run('INSERT INTO grades (id, student_id, grade_column_id, grade_value) VALUES (?, ?, ?, ?)', 
                            [uuidv4(), g.student_id, columnId, g.grade_value]);
            }
        }

        await db.run('COMMIT');
        console.log("Transaction COMMITTED successfully");
    } catch (e) {
        console.error("Transaction FAILED:", e);
        await db.run('ROLLBACK');
    }
}

testSave();
