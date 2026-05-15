const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('liceopro.db');
db.run("UPDATE grade_columns SET period = '1er Semestre', position = 1 WHERE period IS NULL", (err) => {
    if (err) console.error(err);
    else console.log('Migration complete: All NULL periods set to 1er Semestre and position 1');
    db.close();
});
