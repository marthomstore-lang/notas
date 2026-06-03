import db from '../config/db';

async function main() {
    try {
        console.log("=== STARTING 2° AND 3° BÁSICO REORDERING ===");

        // 1. Correct RUN for Antonia Isabella Viveros Alegría (2° Básico)
        console.log("Correcting RUN for Antonia Isabella Viveros Alegría...");
        const viveros = await db.get("SELECT id FROM students WHERE full_name ILIKE '%viveros%' AND full_name ILIKE '%antonia%'");
        if (viveros) {
            await db.run("UPDATE students SET run = '26632307-5' WHERE id = ?", [viveros.id]);
            console.log("  RUN corrected to 26632307-5.");
        } else {
            console.warn("  Student Antonia Viveros not found.");
        }

        // 2. Correct RUN for Ada Isabella Ojeda Valdebenito (3° Básico)
        console.log("Correcting RUN for Ada Isabella Ojeda Valdebenito...");
        const ojeda = await db.get("SELECT id FROM students WHERE full_name ILIKE '%ojeda%' AND full_name ILIKE '%ada%'");
        if (ojeda) {
            await db.run("UPDATE students SET run = '25910919-6' WHERE id = ?", [ojeda.id]);
            console.log("  RUN corrected to 25910919-6.");
        } else {
            console.warn("  Student Ada Ojeda not found.");
        }

        // 3. Reordering for 2° Básico (Level 39)
        console.log("\nReordering 2° Básico...");
        const mapping2: Record<string, number> = {
            '26353428-K': 1,  // FONSECA MOLINA EMILY ANTONELLA
            '26272016-0': 2,  // FUENTEALBA EPUANTE MIGUEL ADONIS
            '26585339-0': 3,  // GARRIDO HENRÍQUEZ CATALEYA ANTONIA
            '26221345-5': 4,  // GODOY BAEZA PASCAL ISABELLA
            '26210874-0': 5,  // LAGOS SOLAR AMELIA CONSTANZA SOFÍA
            '26247993-5': 6,  // MARTÍNEZ MARDONES JOAQUÍN ALEXANDER
            '26482856-2': 7,  // MENESES LARA NICOLÁS VICENTE
            '26747755-8': 8,  // MUÑOZ CHAVARRÍA JOAQUÍN ESTEBAN
            '26371914-K': 9,  // PARADA MOLINA VALENTINA EMILIA
            '26278934-9': 10, // RODRÍGUEZ HUENUMÁN SIMÓN ALONSO
            '26647027-4': 11, // SALDIAS LIZAMA ALISON SCARLETH
            '26597129-6': 12, // SANDOVAL HENRÍQUEZ PAULINA PASCALE (retired)
            '26245423-1': 13, // VALDEBENITO MELLA AGUSTÍN IGNACIO
            '26632307-5': 14, // VIVEROS ALEGRÍA ANTONIA ISABELLA (retired)
            '26279169-6': 15  // ZÚÑIGA MÉNDEZ ERIC MATÍAS
        };

        for (const [rawRun, listNum] of Object.entries(mapping2)) {
            const cleanRunVal = rawRun.trim().toUpperCase();
            const student = await db.get("SELECT id, full_name FROM students WHERE UPPER(run) = ?", [cleanRunVal]);
            if (!student) {
                console.warn(`[WARN] Student with RUN ${cleanRunVal} not found!`);
                continue;
            }
            await db.run("UPDATE enrollments SET list_number = ?, level_id = 39 WHERE student_id = ? AND academic_year = 2026", [listNum, student.id]);
            console.log(`  Updated ${student.full_name} to list number ${listNum}.`);
        }

        // 4. Reordering for 3° Básico (Level 35)
        console.log("\nReordering 3° Básico...");
        const mapping3: Record<string, number> = {
            '25873383-5': 1,  // ACUÑA YÁÑEZ JOSEMIGUEL ALEJANDRO
            '25770792-K': 2,  // ARÓSTICA RAMÍREZ MARTÍN ELEAZAR
            '25756428-2': 3,  // CAMPOS ZAPATA ANTONELLA ANAÍS
            '25786366-2': 4,  // CÁRDENAS MOSQUEIRA MONSERRAT ALEJANDRA
            '25768603-5': 5,  // CASTILLO BASCUÑÁN MATILDE VALENTINA
            '26056121-9': 6,  // CONTRERAS SEPÚLVEDA MISAEL EMILIANO
            '26021452-7': 7,  // GONZÁLEZ LUNA IGNACIA ALEJANDRA
            '25911725-9': 8,  // HERNÁNDEZ ORTIZ AGUSTÍN AMARO
            '26043721-6': 9,  // LIGUEMPI FUENTES ORLANDO ENRIQUE
            '25794773-4': 10, // MARTÍNEZ VILLAGRÁN NICOLÁS ANTONIO
            '26153482-7': 11, // MUNDACA ESCALONA VÍCTOR ALONSO
            '25910919-6': 12, // OJEDA VALDEBENITO ADA ISABELLA (retired)
            '25841531-0': 13, // PARADA MOLINA JULIETA FERNANDA
            '25835725-6': 14, // PEZOA BRAVO MAXIMILIANO JAVIER
            '25744771-5': 15, // QUEVEDO BIBRON JUAQUIN ALONZO
            '25987728-8': 16, // RIVAS RIVERA BENJAMÍN ANTONIO
            '26060602-6': 17, // RODRÍGUEZ SANDOVAL CINTHYA MICHELLE
            '25868736-1': 18, // SANDOVAL LUENGO FRANCESCA ANTONIA
            '25173383-K': 19, // SEPÚLVEDA ROA ANDRIU IGNACIO ALEJANDRO
            '25844122-2': 20, // TRONCOSO VÁSQUEZ EMILIA AMPARO
            '25836726-K': 21, // VALENZUELA ZAMBRANO JOAQUÍN ANÍBAL
            '25990346-7': 22, // VARELA GACITÚA AGUSTINA ISABEL
            '26172127-9': 23, // VÁSQUEZ BUSTOS MARLOM NOAH
            '25884749-0': 24, // VÁSQUEZ PALMA EMMANUEL ALEXANDER
            '26045964-3': 25, // FUENTES RICE MARTINO FRANCISCO SALVADOR (retired)
            '26012922-8': 26  // SALINAS CONTRERAS KIMBERLY SOFÍA ANTONIA
        };

        for (const [rawRun, listNum] of Object.entries(mapping3)) {
            const cleanRunVal = rawRun.trim().toUpperCase();
            const student = await db.get("SELECT id, full_name FROM students WHERE UPPER(run) = ?", [cleanRunVal]);
            if (!student) {
                console.warn(`[WARN] Student with RUN ${cleanRunVal} not found!`);
                continue;
            }
            await db.run("UPDATE enrollments SET list_number = ?, level_id = 35 WHERE student_id = ? AND academic_year = 2026", [listNum, student.id]);
            console.log(`  Updated ${student.full_name} to list number ${listNum}.`);
        }

        console.log("\n=== VERIFYING 2° BÁSICO (Level 39) ===");
        const verify2 = await db.all(`
            SELECT e.list_number, s.run, s.full_name, s.status
            FROM enrollments e JOIN students s ON e.student_id = s.id
            WHERE e.level_id = 39 AND e.academic_year = 2026 ORDER BY e.list_number ASC
        `);
        console.log(verify2);

        console.log("\n=== VERIFYING 3° BÁSICO (Level 35) ===");
        const verify3 = await db.all(`
            SELECT e.list_number, s.run, s.full_name, s.status
            FROM enrollments e JOIN students s ON e.student_id = s.id
            WHERE e.level_id = 35 AND e.academic_year = 2026 ORDER BY e.list_number ASC
        `);
        console.log(verify3);

        console.log("=== REORDERING COMPLETED SUCCESSFULLY ===");
    } catch (err) {
        console.error("Critical error:", err);
    } finally {
        setTimeout(() => process.exit(0), 1000);
    }
}

main();
