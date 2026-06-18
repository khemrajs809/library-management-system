const fs = require('fs');
const path = require('path');

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (fullPath.endsWith('.js')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let original = content;
            
            // Revert array destructuring
            content = content.replace(/const \[([a-zA-Z0-9_]+)\] = await pool\.query/g, 'const $1 = await pool.query');
            
            if (content !== original) {
                fs.writeFileSync(fullPath, content);
                console.log('Fixed destructuring in', fullPath);
            }
        }
    }
}

walk('./src');
