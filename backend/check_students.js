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
        const res = yield db_1.default.query(`SELECT id, name FROM levels WHERE homeroom_teacher_id = '19fc8523-acea-4545-80d9-75d0c94df4b2'`);
        if (res.rows.length > 0) {
            const level = res.rows[0];
            console.log("Teacher is homeroom for:", level.name);
            const students = yield db_1.default.query(`SELECT * FROM enrollments WHERE level_id = $1 AND academic_year = 2026`, [level.id]);
            console.log("Number of students enrolled in 2026:", students.rows.length);
        }
        else {
            console.log("Not a homeroom teacher");
        }
        process.exit(0);
    });
}
check();
