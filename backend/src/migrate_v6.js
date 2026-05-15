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
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("./config/db");
function migrate() {
    return __awaiter(this, void 0, void 0, function* () {
        const db = yield (0, db_1.getDb)();
        console.log("Iniciando migración V6 - Sistema de bloqueos independiente...");
        try {
            yield db.run(`
            CREATE TABLE IF NOT EXISTS grades_locks (
                level_id INTEGER,
                subject_id INTEGER,
                academic_year INTEGER,
                period TEXT,
                is_locked INTEGER DEFAULT 0,
                PRIMARY KEY (level_id, subject_id, academic_year, period)
            )
        `);
            console.log("Tabla grades_locks creada/verificada.");
            // Opcional: Migrar bloqueos existentes de teacher_assignments
            const existingLocks = yield db.all("SELECT level_id, subject_id, academic_year, is_locked FROM teacher_assignments WHERE is_locked = 1");
            for (const lock of existingLocks) {
                // Como teacher_assignments no tiene period, lo bloqueamos para ambos semestres por defecto
                yield db.run(`INSERT OR IGNORE INTO grades_locks (level_id, subject_id, academic_year, period, is_locked) VALUES (?, ?, ?, '1er Semestre', 1)`, [lock.level_id, lock.subject_id, lock.academic_year]);
                yield db.run(`INSERT OR IGNORE INTO grades_locks (level_id, subject_id, academic_year, period, is_locked) VALUES (?, ?, ?, '2do Semestre', 1)`, [lock.level_id, lock.subject_id, lock.academic_year]);
            }
            console.log("Migración V6 completada.");
        }
        catch (error) {
            console.error("Error en migración V6:", error);
        }
    });
}
migrate();
