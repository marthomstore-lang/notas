import db from '../config/db';
import { v4 as uuidv4 } from 'uuid'; // Generar UUIDs ya que SQLite no tiene gen_random_uuid automático por defecto si no habilitamos extensión

export const silentWatchAudit = async (
    userId: string, 
    tableName: string, 
    actionType: 'INSERT' | 'UPDATE' | 'DELETE', 
    oldValue: any, 
    newValue: any
) => {
    try {
        await db.query(
            `INSERT INTO audit_logs (id, user_id, user_name, action, details) 
             VALUES (?, ?, ?, ?, ?)`,
            [
                uuidv4(), 
                userId, 
                'Sistema (SilentWatch)', 
                `${actionType}_${tableName.toUpperCase()}`, 
                `Cambio automático en tabla ${tableName}. Anterior: ${JSON.stringify(oldValue)} - Nuevo: ${JSON.stringify(newValue)}`
            ]
        );
    } catch (error) {
        console.error('CRITICAL: Fallo en el sistema de auditoría', error);
    }
};
