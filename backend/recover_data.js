const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const currentDbPath = path.join(__dirname, 'liceopro.db');
const oldDbPath = path.join(__dirname, '..', 'liceopro.db');

const currentDb = new sqlite3.Database(currentDbPath);
const oldDb = new sqlite3.Database(oldDbPath);

console.log("Starting data recovery from root to backend...");

oldDb.all("SELECT * FROM students", (err, oldStudents) => {
    if (err) {
        console.error("Error reading old DB:", err);
        return;
    }

    console.log(`Found ${oldStudents.length} students in old DB.`);

    currentDb.serialize(() => {
        const stmt = currentDb.prepare(`
            UPDATE students SET 
                birth_date = COALESCE(birth_date, ?),
                gender = COALESCE(gender, ?),
                nationality = COALESCE(nationality, ?),
                religion = COALESCE(religion, ?),
                marital_status = COALESCE(marital_status, ?),
                ethnicity = COALESCE(ethnicity, ?),
                address = COALESCE(address, ?),
                region = COALESCE(region, ?),
                commune = COALESCE(commune, ?),
                email = COALESCE(email, ?),
                phone = COALESCE(phone, ?),
                previous_school = COALESCE(previous_school, ?),
                health_system = COALESCE(health_system, ?),
                enrollment_number = COALESCE(enrollment_number, ?),
                lives_with = COALESCE(lives_with, ?),
                family_members = COALESCE(family_members, ?),
                total_siblings = COALESCE(total_siblings, ?),
                school_siblings = COALESCE(school_siblings, ?),
                liceo_siblings = COALESCE(liceo_siblings, ?)
            WHERE run = ? OR full_name = ?
        `);

        let updatedCount = 0;

        oldStudents.forEach(s => {
            stmt.run([
                s.birth_date, s.gender, s.nationality, s.religion, s.marital_status,
                s.ethnicity, s.address, s.region, s.commune, s.email, s.phone,
                s.previous_school, s.health_system, s.enrollment_number, s.lives_with,
                s.family_members, s.total_siblings, s.school_siblings, s.liceo_siblings,
                s.run, s.full_name
            ], function(err) {
                if (err) console.error("Error updating student:", s.full_name, err.message);
                if (this.changes > 0) updatedCount++;
            });
        });

        stmt.finalize(() => {
            // Also split names for all students now that we have full_name
            console.log("Splitting names for students with null first_name...");
            currentDb.all("SELECT id, full_name FROM students WHERE first_name IS NULL", (err, students) => {
                if (!err && students) {
                    const nameStmt = currentDb.prepare("UPDATE students SET first_name = ?, paternal_surname = ?, maternal_surname = ? WHERE id = ?");
                    students.forEach(st => {
                        const parts = st.full_name.trim().split(' ');
                        let fn, ps, ms;
                        if (parts.length >= 3) {
                            // Assume Surname1 Surname2 Names
                            ps = parts[0];
                            ms = parts[1];
                            fn = parts.slice(2).join(' ');
                        } else if (parts.length === 2) {
                            ps = parts[0];
                            fn = parts[1];
                        } else {
                            fn = st.full_name;
                        }
                        nameStmt.run([fn, ps, ms, st.id]);
                    });
                    nameStmt.finalize();
                }
                console.log(`Finished. Updated ${updatedCount} records from old DB.`);
                currentDb.close();
                oldDb.close();
            });
        });
    });
});
