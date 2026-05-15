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
const migrate = () => __awaiter(void 0, void 0, void 0, function* () {
    const db = yield (0, db_1.getDb)();
    try {
        console.log('Iniciando migración v2...');
        // 1. Añadir Profesor Jefe a los niveles
        yield db.run('ALTER TABLE levels ADD COLUMN homeroom_teacher_id TEXT REFERENCES users(id)');
        console.log('Columna homeroom_teacher_id añadida a levels.');
        // 2. Crear tabla de configuración institucional
        yield db.run(`
            CREATE TABLE IF NOT EXISTS institutional_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        `);
        console.log('Tabla institutional_settings creada.');
        // 3. Insertar valores por defecto
        yield db.run("INSERT OR IGNORE INTO institutional_settings (key, value) VALUES ('director_name', 'Nombre del Director')");
        yield db.run("INSERT OR IGNORE INTO institutional_settings (key, value) VALUES ('school_name', 'Liceo Pro')");
        console.log('Migración v2 completada exitosamente.');
    }
    catch (error) {
        if (error.message.includes('duplicate column name')) {
            console.log('La migración ya fue aplicada anteriormente.');
        }
        else {
            console.error('Error en migración:', error);
        }
    }
});
migrate();
