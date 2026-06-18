const fs = require('fs');
const path = require('path');

function walk(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            walk(filePath, fileList);
        } else if (filePath.endsWith('.js')) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

const files = walk(path.join(__dirname, 'src', 'features'));
files.push(...walk(path.join(__dirname, 'src', 'middlewares')));

let issues = [];

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, index) => {
        if (line.includes('await pool.query')) {
            // Check if it assigns to a variable but doesn't destructure or use [0]
            if (line.match(/const\s+[a-zA-Z0-9_]+\s*=\s*await pool\.query/)) {
                issues.push(`${file}:${index + 1} -> ${line.trim()}`);
            }
        }
    });
});

console.log("Potential destructuring issues:");
issues.forEach(i => console.log(i));
