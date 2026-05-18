import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

let dbInstance: Database | null = null;
let pgPool: Pool | null = null;

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const isPostgres = !!connectionString;

if (isPostgres) {
    pgPool = new Pool({
        connectionString: connectionString,
        ssl: {
            rejectUnauthorized: false
        }
    });
    console.log('[DB] Inicializado con PostgreSQL (Supabase)');
} else {
    console.log('[DB] Inicializado con SQLite Local');
}

export const getDb = async () => {
    if (isPostgres) return null;

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

// Export a wrapper that mimics pg connection and provides sqlite-like helpers
const dbWrapper = {
    connect: async () => {
        if (isPostgres && pgPool) {
            const client = await pgPool.connect();
            return {
                query: async (text: string, params?: any[]) => {
                    // Convert ? to $1, $2, etc. for Postgres
                    let index = 1;
                    const postgresText = text.replace(/\?/g, () => `$${index++}`);
                    const res = await client.query(postgresText, params);
                    return { rows: res.rows, rowCount: res.rowCount };
                },
                release: () => client.release()
            };
        }

        const db = await getDb();
        if (!db) throw new Error("No database instance");
        
        return {
            query: async (text: string, params?: any[]) => {
                // Adaptar sintaxis $1 a ? para SQLite
                const sqliteText = text.replace(/\$\d+/g, '?');
                
                if (sqliteText.trim().toUpperCase().startsWith('SELECT')) {
                    const rows = await db.all(sqliteText, params);
                    return { rows, rowCount: rows.length };
                } else if (sqliteText.trim().toUpperCase().startsWith('INSERT') && sqliteText.includes('RETURNING id')) {
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
        if (isPostgres && pgPool) {
            // Convert ? to $1, $2, etc. for Postgres
            let index = 1;
            const postgresText = text.replace(/\?/g, () => `$${index++}`);
            const res = await pgPool.query(postgresText, params);
            return { rows: res.rows, rowCount: res.rowCount };
        }

        const db = await getDb();
        if (!db) throw new Error("No database instance");

        const sqliteText = text.replace(/\$\d+/g, '?');
        if (sqliteText.trim().toUpperCase().startsWith('SELECT')) {
            const rows = await db.all(sqliteText, params);
            return { rows, rowCount: rows.length };
        } else {
            const res = await db.run(sqliteText, params);
            return { rowCount: res.changes };
        }
    },
    get: async (text: string, params?: any[]) => {
        const res = await dbWrapper.query(text, params);
        return res.rows[0] || null;
    },
    all: async (text: string, params?: any[]) => {
        const res = await dbWrapper.query(text, params);
        return res.rows;
    },
    run: async (text: string, params?: any[]) => {
        const res = await dbWrapper.query(text, params);
        return { changes: res.rowCount, lastID: (res.rows && res.rows[0]) ? res.rows[0].id : null };
    }
};

export default dbWrapper;
