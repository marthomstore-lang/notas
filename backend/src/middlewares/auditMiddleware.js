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
exports.silentWatchAudit = void 0;
const db_1 = __importDefault(require("../config/db"));
const uuid_1 = require("uuid"); // Generar UUIDs ya que SQLite no tiene gen_random_uuid automático por defecto si no habilitamos extensión
const silentWatchAudit = (userId, tableName, actionType, oldValue, newValue) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield db_1.default.query(`INSERT INTO audit_logs (id, user_id, table_name, action_type, old_value, new_value) 
             VALUES (?, ?, ?, ?, ?, ?)`, [(0, uuid_1.v4)(), userId, tableName, actionType, JSON.stringify(oldValue), JSON.stringify(newValue)]);
    }
    catch (error) {
        console.error('CRITICAL: Fallo en el sistema de auditoría', error);
    }
});
exports.silentWatchAudit = silentWatchAudit;
