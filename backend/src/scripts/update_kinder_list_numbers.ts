import db from '../config/db';

async function main() {
    try {
        console.log("=== STARTING KINDER REORDERING ===");
        
        // Define the mapping of RUN to correct list_number
        const listMapping: Record<string, number> = {
            '27487292-6': 1,  // ANDRADES MARTÍNEZ CELESTE SOPHIA
            '27260407-K': 2,  // AWAD HUARACÁN ALEJANDRO LEÓN
            '27370982-7': 3,  // CARIAGA PLAZA LUCIANO EFRAÍN
            '27338618-1': 4,  // CHACÓN REINAHUEL AGUSTÍN AMARO
            '27355154-9': 5,  // CHÁVEZ PANES ANAÍS PASCAL
            '27270208-K': 6,  // ESTAY SAN JUAN KARIM
            '27402507-7': 7,  // FLORES MENDOZA JOAQUÍN ALEXANDER IGNACIO
            '27312912-K': 8,  // HERNÁNDEZ ZÚÑIGA MARGARET PASCAL
            '27450577-K': 9,  // IGLESIAS ÁVILA MONTSERRAT
            '27439554-0': 10, // JARA ROJAS JAVIERA ESPERANZA
            '27392005-6': 11, // MANCILLA MORÁN CRISTÓBAL IGNACIO
            '27487590-9': 12, // MARTINS DE ANDRADE MENDOZA MARTINA PAZ
            '27267313-6': 13, // MENDOZA SUÁREZ PASCAL ANDREA
            '27370596-1': 14, // MORA FLORES JULIETA BELÉN
            '27330094-5': 15, // PAVEZ ORTIZ VÍCTOR MANUEL
            '27411485-1': 16, // SALDIAS LIZAMA AGUSTINA IGNACIA
            '27271603-K': 17, // TOLOZA LLANOS MATTEO AGUSTÍN ANDRÉS
            '27454680-8': 18, // VALERIA CASTILLO RENATA ISIDORA
            '27350441-9': 19, // YÁÑEZ CARTES KHLOE MONTSERRATH
            '27327654-8': 20  // SANHUEZA PINO JUAN EDUARDO
        };

        // Loop through mapping and update level_id to 34 and correct list_number
        for (const [rawRun, listNum] of Object.entries(listMapping)) {
            const cleanRunVal = rawRun.trim().toUpperCase();
            
            // Get student ID
            const student = await db.get("SELECT id, full_name FROM students WHERE UPPER(run) = ?", [cleanRunVal]);
            if (!student) {
                console.warn(`[WARN] Student with RUN ${cleanRunVal} not found!`);
                continue;
            }

            console.log(`Updating ${student.full_name} (${cleanRunVal}) to Kínder (34) list number ${listNum}...`);
            const updateRes = await db.run(`
                UPDATE enrollments 
                SET list_number = ?, level_id = 34
                WHERE student_id = ? AND academic_year = 2026
            `, [listNum, student.id]);
            console.log(`  Updated enrollment rows: ${updateRes.changes}`);
        }

        console.log("\n=== VERIFYING KINDER ENROLLMENTS (Level 34) ===");
        const verifyList = await db.all(`
            SELECT e.list_number, s.run, s.full_name, e.status, s.status as student_status
            FROM enrollments e
            JOIN students s ON e.student_id = s.id
            WHERE e.level_id = 34 AND e.academic_year = 2026
            ORDER BY e.list_number ASC
        `);
        console.log(verifyList);

        console.log("=== KINDER REORDERING COMPLETED ===");
    } catch (err) {
        console.error("Critical error:", err);
    } finally {
        setTimeout(() => process.exit(0), 1000);
    }
}

main();
