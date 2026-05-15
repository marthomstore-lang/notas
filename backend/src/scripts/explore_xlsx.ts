import axios from 'axios';
import * as xlsx from 'xlsx';

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1KYJREA44_c_v1VABCwWAOlEIVfLwiK9zrsNLnJ5VPwA/export?format=xlsx';

async function exploreSheets() {
    console.log("Descargando XLSX...");
    const response = await axios({
        method: 'get',
        url: SHEET_URL,
        responseType: 'arraybuffer'
    });

    console.log("Parseando XLSX...");
    const workbook = xlsx.read(response.data, { type: 'buffer' });
    
    console.log("Hojas encontradas:", workbook.SheetNames);

    for (const sheetName of workbook.SheetNames) {
        console.log(`\n--- Estructura de hoja: ${sheetName} ---`);
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet, { defval: "" });
        
        if (data.length > 0) {
            console.log("Columnas:", Object.keys(data[0]));
            // Log first non-empty row just to see sample data
            for (let i = 0; i < Math.min(3, data.length); i++) {
                console.log(`Fila ${i+1}:`, data[i]);
            }
        } else {
            console.log("Hoja vacía.");
        }
    }
}

exploreSheets().catch(console.error);
