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
        console.log("Iniciando migración V5 - Soporte para visualización de contraseña (Administrativo)...");
        try {
            try {
                yield db.run(`ALTER TABLE users ADD COLUMN password_plain TEXT`);
                console.log("Columna password_plain añadida a la tabla users.");
            }
            catch (e) {
                console.log("La columna password_plain ya existe.");
            }
            // Actualizar el admin por defecto si es posible (opcional)
            yield db.run(`UPDATE users SET password_plain = '123' WHERE run = 'admin'`);
            console.log("Migración V5 completada.");
        }
        catch (error) {
            console.error("Error en migración V5:", error);
        }
    });
}
migrate();
