import { Request, Response } from 'express';
import db from '../config/db';

// Get all report templates
export const getReportTemplates = async (req: Request, res: Response) => {
    try {
        const templates = await db.all("SELECT * FROM report_templates ORDER BY id ASC");
        res.json(templates);
    } catch (error) {
        console.error("Error getting report templates:", error);
        res.status(500).json({ error: 'Error al obtener plantillas de informes' });
    }
};

// Create a new report template
export const createReportTemplate = async (req: Request, res: Response) => {
    try {
        const { name, structure_json } = req.body;
        if (!name || !structure_json) {
            return res.status(400).json({ error: "Faltan datos obligatorios" });
        }
        
        const result = await db.run(
            "INSERT INTO report_templates (name, structure_json) VALUES (?, ?) RETURNING id",
            [name, typeof structure_json === 'string' ? structure_json : JSON.stringify(structure_json)]
        );
        res.json({ message: "Plantilla creada correctamente", id: result.lastID });
    } catch (error) {
        console.error("Error creating report template:", error);
        res.status(500).json({ error: 'Error al crear la plantilla de informe' });
    }
};

// Update an existing report template
export const updateReportTemplate = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, structure_json } = req.body;
        
        await db.run(
            "UPDATE report_templates SET name = ?, structure_json = ? WHERE id = ?",
            [name, typeof structure_json === 'string' ? structure_json : JSON.stringify(structure_json), id]
        );
        res.json({ message: "Plantilla actualizada correctamente" });
    } catch (error) {
        console.error("Error updating report template:", error);
        res.status(500).json({ error: 'Error al actualizar la plantilla de informe' });
    }
};

// Delete a report template
export const deleteReportTemplate = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await db.run("DELETE FROM report_templates WHERE id = ?", [id]);
        res.json({ message: "Plantilla eliminada correctamente" });
    } catch (error) {
        console.error("Error deleting report template:", error);
        res.status(500).json({ error: 'Error al eliminar la plantilla de informe. Es posible que esté en uso.' });
    }
};

// Assign a template to a specific level
export const assignTemplateToLevel = async (req: Request, res: Response) => {
    try {
        const { id } = req.params; // Level ID
        const { report_template_id } = req.body; // Can be null to unassign
        
        await db.run(
            "UPDATE levels SET report_template_id = ? WHERE id = ?",
            [report_template_id || null, id]
        );
        res.json({ message: "Plantilla asignada al curso correctamente" });
    } catch (error) {
        console.error("Error assigning template to level:", error);
        res.status(500).json({ error: 'Error al asignar la plantilla al curso' });
    }
};
