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
function checkStudent() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const db = yield (0, db_1.getDb)();
            const id = 'd3095699-8558-44fb-a727-08c08b91c60d';
            const student = yield db.get("SELECT id, full_name, status FROM students WHERE id = ?", [id]);
            console.log("\n=== ESTADO DEL ESTUDIANTE TRAS ELIMINACIÓN ===");
            console.log(student);
            console.log("============================================\n");
        }
        catch (error) {
            console.error("Error:", error);
        }
    });
}
checkStudent();
