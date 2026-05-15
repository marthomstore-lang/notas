import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

let dbInstance: Database | null = null;

export const getDb = async () => {
    if (dbInstance) {
        return dbInstance;
    }
    
    dbInstance = await open({
        filename: path.join(__dirname, '../../liceopro.db'),
        driver: sqlite3.Database
    });

    await dbInstance.run("PRAGMA foreign_keys = ON;");

    return dbInstance;
};

// Export a wrapper that mimics pg connection to minimize refactoring
export default {
    connect: async () => {
        const db = await getDb();
        return {
            query: async (text: string, params?: any[]) => {
                // Adaptar sintaxis $1 a ? para SQLite
                const sqliteText = text.replace(/\$\d+/g, '?');
                
                if (sqliteText.trim().toUpperCase().startsWith('SELECT')) {
                    const rows = await db.all(sqliteText, params);
                    return { rows, rowCount: rows.length };
                } else if (sqliteText.trim().toUpperCase().startsWith('INSERT') && sqliteText.includes('RETURNING id')) {
                    // SQLite 'RETURNING' support depends on version, let's use lastID approach for INSERT if not supported
                    const cleanText = sqliteText.replace(/RETURNING id/g, '');
                    const result = await db.run(cleanText, params);
                    return { rows: [{ id: result.lastID }] };
                } else {
                    const result = await db.run(sqliteText, params);
                    return { rowCount: result.changes };
                }
            },
            release: () => {}
        };
    },
    query: async (text: string, params?: any[]) => {
        const db = await getDb();
        const sqliteText = text.replace(/\$\d+/g, '?');
        if (sqliteText.trim().toUpperCase().startsWith('SELECT')) {
            const rows = await db.all(sqliteText, params);
            return { rows, rowCount: rows.length };
        } else {
            await db.run(sqliteText, params);
            return {};
        }
    }
};
