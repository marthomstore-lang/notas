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
function addColumn() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const db = yield (0, db_1.getDb)();
            yield db.run("ALTER TABLE students ADD COLUMN withdrawal_date TEXT");
            console.log("Column withdrawal_date added successfully");
        }
        catch (error) {
            if (error.message.includes("duplicate column name")) {
                console.log("Column already exists");
            }
            else {
                console.error("Error adding column:", error);
            }
        }
    });
}
addColumn();
