import { getDb } from './config/db';

async function addColumn() {
    try {
        const db = await getDb();
        await db.run("ALTER TABLE students ADD COLUMN withdrawal_date TEXT");
        console.log("Column withdrawal_date added successfully");
    } catch (error: any) {
        if (error.message.includes("duplicate column name")) {
            console.log("Column already exists");
        } else {
            console.error("Error adding column:", error);
        }
    }
}

addColumn();
