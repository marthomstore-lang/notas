const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('liceopro.db');

const id = '5a91f265-7646-4de4-bb93-1a473a9e003f';

db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    db.run("DELETE FROM teacher_assignments WHERE teacher_id = ?", [id], (err) => {
        if (err) console.error('Error assignments:', err);
    });

    db.run("UPDATE levels SET homeroom_teacher_id = NULL WHERE homeroom_teacher_id = ?", [id], (err) => {
        if (err) console.error('Error levels:', err);
    });

    db.run("UPDATE observations SET teacher_id = NULL WHERE teacher_id = ?", [id], (err) => {
        if (err) console.error('Error observations:', err);
    });

    db.run("UPDATE audit_logs SET user_id = NULL WHERE user_id = ?", [id], (err) => {
        if (err) console.error('Error audit_logs:', err);
    });

    db.run("DELETE FROM regulatory_acceptances WHERE user_id = ?", [id], (err) => {
        if (err) console.error('Error regulatory:', err);
    });

    db.run("DELETE FROM users WHERE id = ? AND role = 'Docente'", [id], function(err) {
        if (err) {
            console.error('Error users:', err);
            db.run("ROLLBACK");
        } else {
            console.log('Changes:', this.changes);
            db.run("COMMIT");
            console.log('User deleted successfully');
        }
        db.close();
    });
});
