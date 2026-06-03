import db from '../config/db';

async function main() {
    try {
        console.log("=== STARTING PRE-KINDER REORDERING ===");
        
        // Define the mapping of RUN to correct list_number
        const listMapping: Record<string, number> = {
            '27597741-1': 1,  // ÁLVAREZ FRIZ SALVADOR DIMITRI HERNÁN
            '27516109-8': 2,  // AVENDAÑO FIGUEROA AURORA VANESSA
            '27590326-4': 3,  // BELLO GONZÁLEZ ISABELLA ALEJANDRA
            '27667661-K': 4,  // BELTRÁN GALLARDO FERNANDA AGUSTINA
            '27659067-7': 5,  // CID PINO ALONSO ESTEBAN
            '27606540-8': 6,  // FIGUEROA QUEZADA MIA DAINARA BELÉN
            '27594624-9': 7,  // GODOY HERMOSILLA NAZLY ANAÍS
            '27656542-7': 8,  // GUTIÉRREZ BUSTAMANTE EMILY ISIDORA
            '27676354-7': 9,  // HERNÁNDEZ BRAVO MARTÍN EMILIANO
            '27722121-7': 10, // JARA SÁNCHEZ LUZ STELLA
            '27560302-3': 11, // MARTÍNEZ BOISIER JULIETA ISABELLA
            '27674105-5': 12, // PASTÉN MUÑOZ JOAQUÍN OCTAVIO
            '27701347-9': 13, // VALDEBENITO VALDEBENITO FERNANDA SOFÍA
            '27741239-K': 14, // VARGAS MONJES MATÍAS DANIEL
            '27643922-7': 15, // VIDAL UMANZOR MARTÍN AUKAN
            '27636887-7': 16  // FUENTES RICE MAURICIO ALEJANDRO GERARDO
        };

        // 1. Move Isabella Bello to level 30 (Pre-Kinder)
        console.log("Moving Isabella Bello to Pre-Kinder...");
        const belloRes = await db.run(`
            UPDATE enrollments 
            SET level_id = 30, list_number = 3 
            WHERE student_id = 'c8acdafc-855a-4d4c-87a8-2482a9cf5716' AND academic_year = 2026
        `);
        console.log(`Bello updated rows: ${belloRes.changes}`);

        // 2. Loop through mapping and update list numbers for level 30
        for (const [rawRun, listNum] of Object.entries(listMapping)) {
            // We search for the student by clean RUN formats
            const cleanRunVal = rawRun.trim().toUpperCase();
            
            // Get student ID
            const student = await db.get("SELECT id, full_name FROM students WHERE UPPER(run) = ?", [cleanRunVal]);
            if (!student) {
                console.warn(`[WARN] Student with RUN ${cleanRunVal} not found!`);
                continue;
            }

            console.log(`Updating ${student.full_name} (${cleanRunVal}) to list number ${listNum}...`);
            const updateRes = await db.run(`
                UPDATE enrollments 
                SET list_number = ?, level_id = 30
                WHERE student_id = ? AND academic_year = 2026
            `, [listNum, student.id]);
            console.log(`  Updated enrollment rows: ${updateRes.changes}`);
        }

        console.log("\n=== VERIFYING PRE-KINDER ENROLLMENTS ===");
        const verifyList = await db.all(`
            SELECT e.list_number, s.run, s.full_name, e.status, s.status as student_status
            FROM enrollments e
            JOIN students s ON e.student_id = s.id
            WHERE e.level_id = 30 AND e.academic_year = 2026
            ORDER BY e.list_number ASC
        `);
        console.log(verifyList);

        console.log("=== PRE-KINDER REORDERING COMPLETED ===");
    } catch (err) {
        console.error("Critical error:", err);
    } finally {
        setTimeout(() => process.exit(0), 1000);
    }
}

main();
