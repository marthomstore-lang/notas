import * as xlsx from 'xlsx';

const filePath = 'C:\\Users\\david\\Downloads\\BASE_DATOS_REVISADA_RETIROS.xlsx';
try {
  const workbook = xlsx.readFile(filePath);
  const estSheet = workbook.Sheets['Estudiantes'];
  if (!estSheet) {
    throw new Error('Sheet "Estudiantes" not found');
  }
  
  const data = xlsx.utils.sheet_to_json<any>(estSheet);
  
  const rowsWithRetiro = data.filter(row => {
    return Object.keys(row).some(k => k.toLowerCase().includes('ret') && row[k] !== '');
  });
  
  console.log(`=== TODOS LOS ESTUDIANTES CON FECHA DE RETIRO EN EL EXCEL (${rowsWithRetiro.length}) ===`);
  rowsWithRetiro.forEach((row, i) => {
    console.log(`${i+1}. Nombre: ${row['Nombre']}, Rut: ${row['Rut']}, Curso: ${row['CURSO']}, Fecha de Retiro: ${row['Fecha de Retiro']}`);
  });

} catch (error) {
  console.error('Error reading Excel file:', error);
}
