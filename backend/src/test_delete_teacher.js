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
function testDeleteTeacher() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const id = 'a7ad9c32-ab1c-4b85-b545-f18b6329bd8a'; // 'hola'
            const sqlite = yield (0, db_1.getDb)();
            console.log(`Attempting to delete teacher ID: ${id}`);
            yield sqlite.run("BEGIN TRANSACTION");
            try {
                yield sqlite.run("DELETE FROM teacher_assignments WHERE teacher_id = ?", [id]);
                yield sqlite.run("UPDATE levels SET homeroom_teacher_id = NULL WHERE homeroom_teacher_id = ?", [id]);
                yield sqlite.run("UPDATE observations SET teacher_id = NULL WHERE teacher_id = ?", [id]);
                yield sqlite.run("UPDATE audit_logs SET user_id = NULL WHERE user_id = ?", [id]);
                yield sqlite.run("DELETE FROM regulatory_acceptances WHERE user_id = ?", [id]);
                const result = yield sqlite.run("DELETE FROM users WHERE id = ?", [id]);
                console.log("Delete result changes:", result.changes);
                yield sqlite.run("COMMIT");
                console.log("Transaction committed.");
            }
            catch (err) {
                yield sqlite.run("ROLLBACK");
                console.error("Error in transaction:", err);
            }
            const check = yield sqlite.get("SELECT * FROM users WHERE id = ?", [id]);
            console.log("User still in DB?", check ? 'Yes' : 'No');
        }
        catch (error) {
            console.error("Outer error:", error);
        }
    });
}
testDeleteTeacher();
