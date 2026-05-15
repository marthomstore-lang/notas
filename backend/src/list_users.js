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
function listUsers() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const db = yield (0, db_1.getDb)();
            const users = yield db.all("SELECT id, run, name, email, role, password_plain FROM users");
            console.log("\n=== LISTADO DE USUARIOS EN LA BASE DE DATOS ===");
            console.table(users);
            console.log("===============================================\n");
        }
        catch (error) {
            console.error("Error al leer la base de datos:", error);
        }
    });
}
listUsers();
