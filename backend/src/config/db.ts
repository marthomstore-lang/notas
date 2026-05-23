import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const pgHost = process.env.PGHOST;

const poolConfig = {
    ssl: { rejectUnauthorized: false },
    max: 20,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000
};

let pgPool: Pool;

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

pgPool.on('error', (err, client) => {
    console.error('[DB] Unexpected error on idle client', err);
});

// Pre-calentar la conexión
pgPool.query('SELECT 1')
    .then(() => console.log('[DB] Conexión estable establecida con PostgreSQL (Supabase) exitosamente.'))
    .catch(err => console.error('[DB] Error de verificación de conexión inicial con PostgreSQL:', err.message));

const dbWrapper = {
    connect: async () => {
        const client = await pgPool.connect();
        return {
            query: async (text: string, params?: any[]) => {
                let index = 1;
                const postgresText = text.replace(/\?/g, () => `$${index++}`);
                const res = await client.query(postgresText, params);
                return { rows: res.rows, rowCount: res.rowCount };
            },
            release: () => client.release()
        };
    },
    query: async (text: string, params?: any[]) => {
        let index = 1;
        const postgresText = text.replace(/\?/g, () => `$${index++}`);
        const res = await pgPool.query(postgresText, params);
        return { rows: res.rows, rowCount: res.rowCount };
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

export const getDb = async () => null; // Dummy export if any file still imports getDb
export default dbWrapper;
