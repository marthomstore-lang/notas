"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const http_1 = __importDefault(require("http"));
const token = jsonwebtoken_1.default.sign({ id: 'admin', role: 'Admin' }, 'super-secret-key-liceo-pro');
const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/students',
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${token}`
    }
};
const req = http_1.default.request(options, res => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
        const students = JSON.parse(data);
        console.log(`Total students: ${students.length}`);
        if (students.length > 0) {
            console.log(students[0]);
        }
    });
});
req.on('error', error => {
    console.error(error);
});
req.end();
