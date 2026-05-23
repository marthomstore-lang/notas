import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env') });

let dbInstance: Database | null = null;
let pgPool: Pool | null = null;

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const pgHost = process.env.PGHOST;
const isPostgres = !!(connectionString || pgHost);

export const getDb = async () => {
    if (isPostgres) return null;

    if (dbInstance) {
        return dbInstance;
    }
    
    dbInstance = await open({
        filename: path.join(__dirname, '../../liceopro.db'),
        driver: sqlite3.Database
    });

    // Optimizaciones de rendimiento y robustez para SQLite
    await dbInstance.run("PRAGMA foreign_keys = ON;");
    await dbInstance.run("PRAGMA journal_mode = WAL;");        // Modo Write-Ahead Logging para lectura/escritura concurrentes
    await dbInstance.run("PRAGMA synchronous = NORMAL;");      // Sincronización normal, mucho más rápida en escrituras
    await dbInstance.run("PRAGMA busy_timeout = 5000;");       // Tiempo de espera para evitar bloqueos por concurrencia

    return dbInstance;
};

if (isPostgres) {
    const poolConfig = {
        ssl: { rejectUnauthorized: false },
        max: 20,                          // Capacidad máxima de conexiones concurrentes
        connectionTimeoutMillis: 15000,   // Evita esperas infinitas si hay fallos en la red (aumentado a 15s)
        idleTimeoutMillis: 30000,         // Tiempo de espera para cerrar conexiones inactivas
        keepAlive: true,                  // Mantiene viva la conexión TCP
        keepAliveInitialDelayMillis: 10000 // Inicia Keep-Alive tras 10s de inactividad
    };

    // If explicit PG* vars are set, use them to avoid URL parsing issues with dotted usernames
    if (pgHost) {
        pgPool = new Pool({
            host: process.env.PGHOST,
            port: parseInt(process.env.PGPORT || '6543'),
            database: process.env.PGDATABASE || 'postgres',
            user: process.env.PGUSER,
            password: process.env.PGPASSWORD,
            ...poolConfig
        });
        console.log(`[DB] Inicializado con PostgreSQL (Supabase) via params → ${process.env.PGHOST}`);
    } else {
        pgPool = new Pool({
            connectionString: connectionString,
            ...poolConfig
        });
        console.log('[DB] Inicializado con PostgreSQL (Supabase) via URL');
    }

    // Evitar que la aplicación serverless se caiga por errores en el pool de fondo
    pgPool.on('error', (err, client) => {
        console.error('[DB] Unexpected error on idle client', err);
    });

    // Pre-calentar la conexión: valida la conectividad con Supabase inmediatamente al iniciar
    pgPool.query('SELECT 1')
        .then(() => console.log('[DB] Conexión estable establecida con PostgreSQL (Supabase) exitosamente.'))
        .catch(err => console.error('[DB] Error de verificación de conexión inicial con PostgreSQL:', err.message));
} else {
    console.log('[DB] Inicializado con SQLite Local');
    // Pre-inicializar SQLite
    getDb()
        .then(() => console.log('[DB] Base de datos SQLite cargada y pre-optimizada.'))
        .catch(err => console.error('[DB] Fallo al pre-inicializar SQLite:', err));
}

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
