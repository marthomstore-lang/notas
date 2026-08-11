import * as fs from 'fs';
import * as path from 'path';

const filePath = path.resolve('C:\\proyectos\\base de datos\\frontend\\src\\views\\AdminDashboard.tsx');
try {
  let content = fs.readFileSync(filePath, 'utf8');
  const target = "{l.homeroom_teacher_name || 'Sin asignar'}";
  const replacement = "{l.homeroom_teacher_name ? formatName(l.homeroom_teacher_name) : 'Sin asignar'}";
  
  if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("Successfully patched AdminDashboard.tsx");
  } else {
    console.error("Target content not found in AdminDashboard.tsx");
  }
} catch (error) {
  console.error("Error patching file:", error);
}
