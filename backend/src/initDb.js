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
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const sqlite3_1 = __importDefault(require("sqlite3"));
const sqlite_1 = require("sqlite");
const uuid_1 = require("uuid");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
function init() {
    return __awaiter(this, void 0, void 0, function* () {
        const dbPath = path_1.default.join(__dirname, '../liceopro.db');
        // Eliminar la BD antigua si existe para asegurar que se creen las nuevas tablas
        if (fs_1.default.existsSync(dbPath)) {
            console.log("Eliminando base de datos antigua...");
            fs_1.default.unlinkSync(dbPath);
        }
        const db = yield (0, sqlite_1.open)({
            filename: dbPath,
            driver: sqlite3_1.default.Database
        });
        console.log("Ejecutando schema.sql nuevo...");
        const schema = fs_1.default.readFileSync(path_1.default.join(__dirname, '../schema.sql'), 'utf8');
        const statements = schema.split(';').filter(s => s.trim().length > 0);
        for (let stmt of statements) {
            yield db.run(stmt);
        }
        console.log("Insertando datos de prueba...");
        const adminId = (0, uuid_1.v4)();
        const teacherId = 't1';
        const hashedPass = yield bcryptjs_1.default.hash('123', 10);
        // Solo creamos el administrador principal y un docente de prueba (o ninguno si prefieres)
        yield db.run(`INSERT INTO users (id, run, name, email, password_hash, password_plain, role) VALUES 
        (?, 'admin', 'Administrador Principal', 'admin@liceo.cl', ?, '123', 'Admin'),
        (?, 'docente', 'Profesor Juan Pérez', 'juan@liceo.cl', ?, '123', 'Docente')
    `, [adminId, hashedPass, teacherId, hashedPass]);
        // Estructura básica de ejemplo (Opcional, se pueden crear desde el panel)
        yield db.run(`INSERT INTO levels (id, name, total_capacity, current_enrolled) VALUES (1, '1° Medio A', 40, 0)`);
        yield db.run(`INSERT INTO subjects (id, name) VALUES (101, 'Matemáticas')`);
        console.log("Base de datos de Liceo Pro inicializada con éxito (Versión Limpia).");
    });
}
init().catch(console.error);
