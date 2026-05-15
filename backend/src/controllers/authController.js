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
exports.updateProfile = exports.login = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = __importDefault(require("../config/db"));
const JWT_SECRET = 'super-secret-key-liceo-pro';
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { rut, password } = req.body;
        const client = yield db_1.default.connect();
        console.log(`[Login] Intentando ingresar con RUT: "${rut}"`);
        const result = yield client.query('SELECT * FROM users WHERE run = ?', [rut]);
        if (result.rows.length === 0) {
            console.warn(`[Login] Usuario no encontrado para el RUT: "${rut}"`);
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
        }
        const user = result.rows[0];
        console.log(`[Login] Usuario encontrado: ${user.name} (ID: ${user.id})`);
        const isValid = yield bcryptjs_1.default.compare(password, user.password_hash);
        console.log(`[Login] ¿Contraseña válida?: ${isValid}`);
        if (!isValid) {
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '8h' });
        res.json({
            token,
            user: { id: user.id, name: user.name, role: user.role, email: user.email }
        });
    }
    catch (error) {
        console.error("Login error", error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});
exports.login = login;
const updateProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { email, password } = req.body;
        const client = yield db_1.default.connect();
        if (password && password.trim() !== "") {
            const hashedPass = yield bcryptjs_1.default.hash(password, 10);
            yield client.query('UPDATE users SET email = ?, password_hash = ?, password_plain = ? WHERE id = ?', [email, hashedPass, password, userId]);
        }
        else {
            yield client.query('UPDATE users SET email = ? WHERE id = ?', [email, userId]);
        }
        res.json({ message: 'Perfil actualizado correctamente' });
    }
    catch (error) {
        console.error("Update profile error", error);
        res.status(500).json({ error: 'Error al actualizar perfil' });
    }
});
exports.updateProfile = updateProfile;
