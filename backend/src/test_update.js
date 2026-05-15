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
const db_1 = require("./config/db");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
function testUpdate() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const sqlite = yield (0, db_1.getDb)();
            const users = yield sqlite.all("SELECT id FROM users LIMIT 1");
            if (users.length === 0)
                return;
            const id = users[0].id;
            const password = '182011';
            const name = 'Test Name';
            const email = 'test@liceo.cl';
            const role = 'Docente';
            const hashedPass = yield bcryptjs_1.default.hash(password, 10);
            console.log("Updating with array...");
            const result = yield sqlite.run(`
            UPDATE users 
            SET name = ?, email = ?, password_hash = ?, password_plain = ?, role = ? 
            WHERE id = ?
        `, [name, email, hashedPass, password, role, id]);
            console.log("Changes (Array):", result.changes);
            console.log("Updating with spread...");
            const result2 = yield sqlite.run(`
            UPDATE users 
            SET name = ?, email = ?, password_hash = ?, password_plain = ?, role = ? 
            WHERE id = ?
        `, ...[name, email, hashedPass, password, role, id]);
            console.log("Changes (Spread):", result2.changes);
        }
        catch (error) {
            console.error("Error:", error);
        }
    });
}
testUpdate();
