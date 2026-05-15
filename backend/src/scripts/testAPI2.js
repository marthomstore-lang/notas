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
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const http_1 = __importDefault(require("http"));
const token = jsonwebtoken_1.default.sign({ id: 'admin', role: 'Admin' }, 'super-secret-key-liceo-pro');
const makeRequest = (path) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        };
        const req = http_1.default.request(options, res => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode === 200)
                    resolve(JSON.parse(data));
                else
                    reject(new Error(`Status ${res.statusCode}: ${data}`));
            });
        });
        req.on('error', reject);
        req.end();
    });
};
function testAll() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log("Testing /api/admin/teachers");
            console.log((yield makeRequest('/api/admin/teachers')).length);
            console.log("Testing /api/admin/subjects");
            console.log((yield makeRequest('/api/admin/subjects')).length);
            console.log("Testing /api/admin/levels");
            console.log((yield makeRequest('/api/admin/levels')).length);
            console.log("Testing /api/admin/students");
            console.log((yield makeRequest('/api/admin/students')).length);
        }
        catch (e) {
            console.error("Error:", e.message);
        }
    });
}
testAll();
