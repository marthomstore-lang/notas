import db from '../config/db';

async function listTables() {
    try {
        console.log("Conectando a PostgreSQL...");
        const tables = await db.all(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        console.log("Tablas encontradas:", tables.map(t => t.table_name));

        console.log("\nConteos de filas por tabla:");
        for (const t of tables) {
            const tableName = t.table_name;
            try {
                const countRes = await db.all(`SELECT COUNT(*) as count FROM "${tableName}"`);
                console.log(`- ${tableName}: ${countRes[0].count} filas`);
            } catch (err: any) {
                console.log(`- ${tableName}: Error al contar (${err.message})`);
            }
        }
    } catch (error) {
        console.error("Error al obtener tablas:", error);
    } finally {
        setTimeout(() => process.exit(0), 1000);
    }
}

listTables();
