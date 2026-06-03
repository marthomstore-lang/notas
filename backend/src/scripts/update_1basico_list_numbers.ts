import db from '../config/db';

async function main() {
    try {
        console.log("=== STARTING 1° BÁSICO REORDERING ===");

        // First, correct RUN for Jorge Ismael Ibaceta Díaz if it differs
        console.log("Correcting RUN for Jorge Ismael Ibaceta Díaz...");
        const ibaceta = await db.get("SELECT id FROM students WHERE full_name ILIKE '%ibaceta%' AND full_name ILIKE '%jorge%'");
        if (ibaceta) {
            await db.run("UPDATE students SET run = '26030056-3' WHERE id = ?", [ibaceta.id]);
            console.log("  RUN corrected to 26030056-3.");
        } else {
            console.warn("  Student Jorge Ibaceta not found.");
        }

        // Mapping of RUN to list number
        const listMapping: Record<string, number> = {
            '27245339-K': 1,  // ARRIAGADA SUAZO FRANCISCO JOSÉ
            '27169808-9': 2,  // CANIULEF HUAIQUIMIL GASPAR ENRIQUE
            '26827459-6': 3,  // CERDA PINO ALICE ANTONELLA
            '27124813-K': 4,  // GAETE FLORES EMILIA SOFÍA
            '27211790-K': 5,  // GARRIDO SEGUEL KATHERINE ALEXANDRA
            '26030056-3': 6,  // IBACETA DÍAZ JORGE ISMAEL (retired)
            '26838184-8': 7,  // LAGOS MALLEA LIAM MAXIMILIANO
            '26899577-3': 8,  // LUENGO ORTIZ VICENTE DAMADIEL
            '26960440-9': 9,  // LUNA MUÑOZ NICOLÁS BENJAMÍN
            '27138985-K': 10, // MENDOZA ARCE JOSEFA IGNACIA
            '27250739-2': 11, // MONJE BRUNA JOSEFA LIHUÉN
            '27014285-0': 12, // MORA FLORES SAMUEL ALFONSO
            '26159409-9': 13, // OBREGÓN MEDINA EVAN EMILIANO
            '27119877-9': 14, // DURÁN BRUNA KÜYEN AMPARO KÜTRAL
            '26832491-7': 15  // GAILLARD CHAVARRÍA VICENTE IGNACIO
        };

        // Loop through mapping and update level_id to 36 and correct list_number
        for (const [rawRun, listNum] of Object.entries(listMapping)) {
            const cleanRunVal = rawRun.trim().toUpperCase();
            
            // Get student ID
            const student = await db.get("SELECT id, full_name FROM students WHERE UPPER(run) = ?", [cleanRunVal]);
            if (!student) {
                console.warn(`[WARN] Student with RUN ${cleanRunVal} not found!`);
                continue;
            }

            console.log(`Updating ${student.full_name} (${cleanRunVal}) to 1° Básico (36) list number ${listNum}...`);
            const updateRes = await db.run(`
                UPDATE enrollments 
                SET list_number = ?, level_id = 36
                WHERE student_id = ? AND academic_year = 2026
            `, [listNum, student.id]);
            console.log(`  Updated enrollment rows: ${updateRes.changes}`);
        }

        console.log("\n=== VERIFYING 1° BÁSICO ENROLLMENTS (Level 36) ===");
        const verifyList = await db.all(`
            SELECT e.list_number, s.run, s.full_name, e.status, s.status as student_status
            FROM enrollments e
            JOIN students s ON e.student_id = s.id
            WHERE e.level_id = 36 AND e.academic_year = 2026
            ORDER BY e.list_number ASC
        `);
        console.log(verifyList);

        console.log("=== 1° BÁSICO REORDERING COMPLETED ===");
    } catch (err) {
        console.error("Critical error:", err);
    } finally {
        setTimeout(() => process.exit(0), 1000);
    }
}

main();
