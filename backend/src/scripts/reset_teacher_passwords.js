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
const sqlite3_1 = __importDefault(require("sqlite3"));
const sqlite_1 = require("sqlite");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const path_1 = __importDefault(require("path"));
function resetPasswords() {
    return __awaiter(this, void 0, void 0, function* () {
        const dbPath = path_1.default.join(__dirname, '..', '..', 'liceopro.db');
        console.log('Opening database at:', dbPath);
        const db = yield (0, sqlite_1.open)({
            filename: dbPath,
            driver: sqlite3_1.default.Database
        });
        const newPlainPassword = '123456';
        const saltRounds = 10;
        const hashedPassword = yield bcryptjs_1.default.hash(newPlainPassword, saltRounds);
        console.log(`Starting password reset for all teachers to "${newPlainPassword}"...`);
        const result = yield db.run(`
        UPDATE users 
        SET password_hash = ?, password_plain = ?
        WHERE role = 'Docente'
    `, [hashedPassword, newPlainPassword]);
        console.log(`Success! Updated ${result.changes} teachers.`);
        yield db.close();
    });
}
resetPasswords().catch(err => {
    console.error('Error resetting passwords:', err);
    process.exit(1);
});
