const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.ts')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('backend/src');
files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    if (content.includes('uuidv4(')) {
        content = content.replace(/import\s+\{\s*v4\s+as\s+uuidv4\s*\}\s+from\s+'uuid';/g, 'import crypto from \'crypto\';');
        content = content.replace(/uuidv4\(\)/g, 'crypto.randomUUID()');
        fs.writeFileSync(f, content);
        console.log('Updated ' + f);
    }
});
