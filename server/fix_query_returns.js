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
            
            // Match `const varName = await pool.query`
            const regex = /const\s+([a-zA-Z0-9_]+)\s*=\s*await\s+pool\.query/g;
            let match;
            const matchesToReplace = [];

            while ((match = regex.exec(content)) !== null) {
                const varName = match[1];
                
                // If varName is used as varName[0], it means it expects the raw array from MariaDB.
                // e.g. results[0] or countResult[0]
                const isIndexed = new RegExp(varName + '\\s*\\[\\s*0\\s*\\]').test(content);
                
                // Also, if varName is destructured further, e.g. `const rows = varName[0]`, that's isIndexed.
                // What if it's Promise.all? My script previously didn't touch Promise.all.
                
                if (!isIndexed) {
                    matchesToReplace.push(varName);
                }
            }

            for (const varName of matchesToReplace) {
                // Replace `const varName = await pool.query` with `const [varName] = await pool.query`
                const replaceRegex = new RegExp(`const\\s+${varName}\\s*=\\s*await\\s+pool\\.query`, 'g');
                content = content.replace(replaceRegex, `const [${varName}] = await pool.query`);
            }
            
            if (content !== original) {
                fs.writeFileSync(fullPath, content);
                console.log('Fixed:', fullPath, 'Vars:', matchesToReplace);
            }
        }
    }
}

walk('./src');
