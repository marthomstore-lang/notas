const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('liceopro.db');

db.all(`
    SELECT e.id, s.full_name, e.level_id 
    FROM enrollments e 
    JOIN students s ON e.student_id = s.id 
    ORDER BY e.level_id, s.full_name
`, (err, rows) => {
    if (err) return console.error(err);

    let currentLevel = null;
    let listNum = 0;

    const updates = rows.map(row => {
        if (row.level_id !== currentLevel) {
            currentLevel = row.level_id;
            listNum = 1;
        } else {
            listNum++;
        }
        return { id: row.id, listNum };
    });

    let completed = 0;
    updates.forEach(u => {
        db.run('UPDATE enrollments SET list_number = ? WHERE id = ?', [u.listNum, u.id], (err) => {
            completed++;
            if (completed === updates.length) {
                console.log('List numbers initialized successfully');
                db.close();
            }
        });
    });
});
