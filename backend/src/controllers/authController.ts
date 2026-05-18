import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/db';

const JWT_SECRET = 'super-secret-key-liceo-pro';

export const login = async (req: Request, res: Response) => {
    try {
        const { rut, password } = req.body;
        
        const client = await db.connect();
        // Limpiamos el RUT recibido para asegurar que solo tenemos números y letras K/k
        const cleanRut = rut.replace(/[^0-9kK]/g, '');
        
        // Extraemos el cuerpo del RUT (ej: "188037356" -> body "18803735")
        // Si tiene más de 7 caracteres, asumimos que el último es el dígito verificador.
        let body = cleanRut;
        if (cleanRut.length > 7) {
            body = cleanRut.slice(0, -1);
        }

        console.log(`[Login] Intentando ingresar con RUT: "${rut}" -> cleanRut: "${cleanRut}", body: "${body}"`);
        
        // Buscamos por coincidencia exacta del RUT ingresado, RUT limpio, o patrones del cuerpo
        const result = await client.query(
            'SELECT * FROM users WHERE run = ? OR run = ? OR run LIKE ? OR run LIKE ?', 
            [rut, cleanRut, `${body}-%`, `${cleanRut}-%`]
        );
        
        if (result.rows.length === 0) {
            console.warn(`[Login] Usuario no encontrado para el RUT: "${rut}" (clean: "${cleanRut}")`);
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
        }

        const user = result.rows[0];
        console.log(`[Login] Usuario encontrado: ${user.name} (ID: ${user.id})`);
        
        const isValid = await bcrypt.compare(password, user.password_hash);
        console.log(`[Login] ¿Contraseña válida?: ${isValid}`);

        if (!isValid) {
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
        }

        const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '8h' });
        
        res.json({
            token,
            user: { id: user.id, name: user.name, role: user.role, email: user.email }
        });

    } catch (error) {
        console.error("Login error", error);
        res.status(500).json({ error: 'Error del servidor' });
    }
};

export const updateProfile = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { email, password } = req.body;
        const client = await db.connect();

        if (password && password.trim() !== "") {
            const hashedPass = await bcrypt.hash(password, 10);
            await client.query('UPDATE users SET email = ?, password_hash = ?, password_plain = ? WHERE id = ?', [email, hashedPass, password, userId]);
        } else {
            await client.query('UPDATE users SET email = ? WHERE id = ?', [email, userId]);
        }

        res.json({ message: 'Perfil actualizado correctamente' });
    } catch (error) {
        console.error("Update profile error", error);
        res.status(500).json({ error: 'Error al actualizar perfil' });
    }
};
