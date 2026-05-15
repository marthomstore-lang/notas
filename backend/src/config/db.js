"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = void 0;
const sqlite3_1 = __importDefault(require("sqlite3"));
const sqlite_1 = require("sqlite");
const path_1 = __importDefault(require("path"));
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
let dbInstance = null;
let pgPool = null;
const isPostgres = !!process.env.DATABASE_URL;
if (isPostgres) {
    pgPool = new pg_1.Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });
    console.log('[DB] Inicializado con PostgreSQL (Supabase)');
}
else {
    console.log('[DB] Inicializado con SQLite Local');
}
const getDb = () => __awaiter(void 0, void 0, void 0, function* () {
    if (isPostgres)
        return null;
    if (dbInstance) {
        return dbInstance;
    }
    dbInstance = yield (0, sqlite_1.open)({
        filename: path_1.default.join(__dirname, '../../liceopro.db'),
        driver: sqlite3_1.default.Database
    });
    yield dbInstance.run("PRAGMA foreign_keys = ON;");
    return dbInstance;
});
exports.getDb = getDb;
// Export a wrapper that mimics pg connection and provides sqlite-like helpers
const dbWrapper = {
    connect: () => __awaiter(void 0, void 0, void 0, function* () {
        if (isPostgres && pgPool) {
            const client = yield pgPool.connect();
            return {
                query: (text, params) => __awaiter(void 0, void 0, void 0, function* () {
                    // Convert ? to $1, $2, etc. for Postgres
                    let index = 1;
                    const postgresText = text.replace(/\?/g, () => `$${index++}`);
                    const res = yield client.query(postgresText, params);
                    return { rows: res.rows, rowCount: res.rowCount };
                }),
                release: () => client.release()
            };
        }
        const db = yield (0, exports.getDb)();
        if (!db)
            throw new Error("No database instance");
        return {
            query: (text, params) => __awaiter(void 0, void 0, void 0, function* () {
                // Adaptar sintaxis $1 a ? para SQLite
                const sqliteText = text.replace(/\$\d+/g, '?');
                if (sqliteText.trim().toUpperCase().startsWith('SELECT')) {
                    const rows = yield db.all(sqliteText, params);
                    return { rows, rowCount: rows.length };
                }
                else if (sqliteText.trim().toUpperCase().startsWith('INSERT') && sqliteText.includes('RETURNING id')) {
                    const cleanText = sqliteText.replace(/RETURNING id/g, '');
                    const result = yield db.run(cleanText, params);
                    return { rows: [{ id: result.lastID }] };
                }
                else {
                    const result = yield db.run(sqliteText, params);
                    return { rowCount: result.changes };
                }
            }),
            release: () => { }
        };
    }),
    query: (text, params) => __awaiter(void 0, void 0, void 0, function* () {
        if (isPostgres && pgPool) {
            // Convert ? to $1, $2, etc. for Postgres
            let index = 1;
            const postgresText = text.replace(/\?/g, () => `$${index++}`);
            const res = yield pgPool.query(postgresText, params);
            return { rows: res.rows, rowCount: res.rowCount };
        }
        const db = yield (0, exports.getDb)();
        if (!db)
            throw new Error("No database instance");
        const sqliteText = text.replace(/\$\d+/g, '?');
        if (sqliteText.trim().toUpperCase().startsWith('SELECT')) {
            const rows = yield db.all(sqliteText, params);
            return { rows, rowCount: rows.length };
        }
        else {
            const res = yield db.run(sqliteText, params);
            return { rowCount: res.changes };
        }
    }),
    get: (text, params) => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield dbWrapper.query(text, params);
        return res.rows[0] || null;
    }),
    all: (text, params) => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield dbWrapper.query(text, params);
        return res.rows;
    }),
    run: (text, params) => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield dbWrapper.query(text, params);
        return { changes: res.rowCount, lastID: (res.rows && res.rows[0]) ? res.rows[0].id : null };
    })
};
exports.default = dbWrapper;
