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
const db_1 = __importDefault(require("./src/config/db"));
function check() {
    return __awaiter(this, void 0, void 0, function* () {
        const assignmentId = 'homeroom_32'; // I need to get the real level id for Kinder.
        const levels = yield db_1.default.query(`SELECT id, name FROM levels WHERE homeroom_teacher_id = '19fc8523-acea-4545-80d9-75d0c94df4b2'`);
        if (levels.rows.length === 0)
            return;
        const level_id = levels.rows[0].id;
        const academic_year = 2026;
        console.log("Level ID:", level_id);
        const studentsRes = yield db_1.default.query(`
        SELECT s.id, s.run, s.full_name, e.list_number, s.status
        FROM enrollments e
        JOIN students s ON e.student_id = s.id
        WHERE e.level_id = $1 AND e.academic_year = $2
        ORDER BY COALESCE(e.list_number, 999999) ASC, s.full_name ASC
    `, [level_id, academic_year]);
        console.log("Returned students:", studentsRes.rows.length);
        process.exit(0);
    });
}
check();
