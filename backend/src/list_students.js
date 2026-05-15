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
function listStudents() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const db = yield (0, db_1.getDb)();
            const students = yield db.all("SELECT id, full_name, status FROM students");
            console.log("\n=== LISTADO DE ESTUDIANTES EN LA BASE DE DATOS ===");
            console.table(students);
            console.log("==================================================\n");
            const counts = yield db.all("SELECT status, COUNT(*) as count FROM students GROUP BY status");
            console.log("Conteos por estado:");
            console.table(counts);
        }
        catch (error) {
            console.error("Error al leer la base de datos:", error);
        }
    });
}
listStudents();
