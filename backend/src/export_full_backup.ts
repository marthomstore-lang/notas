import dbWrapper from './config/db';
import fs from 'fs';
import path from 'path';

async function exportFullBackup() {
    console.log('Iniciando extracción de respaldo completo de la base de datos...');

    const tables = [
        'users',
        'levels',
        'subjects',
        'teacher_assignments',
        'students',
        'guardians',
        'health_records',
        'enrollments',
        'homeroom_teachers',
        'personality_reports',
        'grade_columns',
        'grades',
        'grades_locks',
        'observations',
        'audit_logs',
        'institutional_settings',
        'external_links'
    ];

    const backupData: Record<string, any> = {
        metadata: {
            exported_at: new Date().toISOString(),
            system: 'Liceo Pro / Notas LTP',
            version: '1.0.0',
            description: 'Respaldo completo de base de datos incluyendo estudiantes, profesores, asignaciones, asignaturas, cursos, notas y todas las tablas del sistema.',
            total_tables: tables.length,
            table_counts: {}
        },
        tables: {}
    };

    let sqlDump = `-- ==========================================================\n`;
    sqlDump += `-- RESPALDO COMPLETO DE BASE DE DATOS - LICEO PRO / NOTAS LTP\n`;
    sqlDump += `-- Fecha de Exportación: ${new Date().toISOString()}\n`;
    sqlDump += `-- ==========================================================\n\n`;

    for (const tableName of tables) {
        try {
            console.log(`Extrayendo datos de la tabla: ${tableName}...`);
            const rows = await dbWrapper.all(`SELECT * FROM ${tableName}`);
            backupData.tables[tableName] = rows;
            backupData.metadata.table_counts[tableName] = rows.length;
            console.log(` -> Tabla '${tableName}': ${rows.length} registros extraídos.`);

            // Generate SQL Inserts
            if (rows.length > 0) {
                sqlDump += `-- Tabla: ${tableName} (${rows.length} registros)\n`;
                const columns = Object.keys(rows[0]);
                for (const row of rows) {
                    const values = columns.map(col => {
                        const val = row[col];
                        if (val === null || val === undefined) return 'NULL';
                        if (typeof val === 'number' || typeof val === 'boolean') return val;
                        if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
                        return `'${String(val).replace(/'/g, "''")}'`;
                    }).join(', ');
                    sqlDump += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values});\n`;
                }
                sqlDump += `\n`;
            }
        } catch (err: any) {
            console.warn(`Advertencia al extraer '${tableName}':`, err.message);
            backupData.tables[tableName] = [];
            backupData.metadata.table_counts[tableName] = 0;
        }
    }

    // Rutas de destino en la raíz del proyecto
    const jsonBackupPath = 'c:\\proyectos\\base de datos\\RESPALDO_COMPLETO_BASE_DE_DATOS.json';
    const sqlBackupPath = 'c:\\proyectos\\base de datos\\RESPALDO_COMPLETO_BASE_DE_DATOS.sql';

    fs.writeFileSync(jsonBackupPath, JSON.stringify(backupData, null, 2), 'utf-8');
    fs.writeFileSync(sqlBackupPath, sqlDump, 'utf-8');

    console.log('\n==========================================================');
    console.log('¡Respaldo generado exitosamente en 1 solo archivo principal!');
    console.log(`JSON Backup: ${jsonBackupPath}`);
    console.log(`SQL Backup:  ${sqlBackupPath}`);
    console.log('Resumen de registros por tabla:');
    console.table(backupData.metadata.table_counts);
    console.log('==========================================================\n');

    process.exit(0);
}

exportFullBackup().catch(err => {
    console.error('Error fatal al exportar la base de datos:', err);
    process.exit(1);
});
