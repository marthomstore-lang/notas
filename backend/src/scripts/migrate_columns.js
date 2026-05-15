"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sqlite3_1 = __importDefault(require("sqlite3"));
const db = new sqlite3_1.default.Database('./liceopro.db', (err) => {
    if (err) {
        console.error('Error opening database', err);
        return;
    }
});
db.serialize(() => {
    // Add entry_date
    db.run("ALTER TABLE students ADD COLUMN entry_date TEXT", (err) => {
        if (err && !err.message.includes("duplicate column name")) {
            console.error("Error adding entry_date:", err.message);
        }
        else {
            console.log("Column entry_date added or already exists.");
        }
    });
    // Add observaciones
    db.run("ALTER TABLE students ADD COLUMN observaciones TEXT", (err) => {
        if (err && !err.message.includes("duplicate column name")) {
            console.error("Error adding observaciones:", err.message);
        }
        else {
            console.log("Column observaciones added or already exists.");
        }
    });
});
db.close();
