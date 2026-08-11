import db from '../config/db';

async function readAuditLogs() {
    try {
        console.log("Obteniendo últimos 50 audit logs...");
        const logs = await db.all(`
            SELECT created_at, user_name, action, details 
            FROM audit_logs 
            ORDER BY created_at DESC 
            LIMIT 50
        `);
        
        console.log("\n--- ÚLTIMOS 50 AUDIT LOGS ---");
        for (const log of logs) {
            console.log(`[${log.created_at}] User: ${log.user_name} | Action: ${log.action}`);
            console.log(`  Details: ${log.details}\n`);
        }
    } catch (error) {
        console.error("Error al obtener audit logs:", error);
    } finally {
        setTimeout(() => process.exit(0), 1000);
    }
}

readAuditLogs();
