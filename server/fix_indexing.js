const fs = require('fs');

function replaceFile(path, oldStr, newStr) {
    let content = fs.readFileSync(path, 'utf8');
    if (content.includes(oldStr)) {
        content = content.replace(oldStr, newStr);
        fs.writeFileSync(path, content);
        console.log('Fixed', path);
    }
}

// member.controller.js
replaceFile('src/features/members/member.controller.js', 
    'totalCount = Number(countResult[0].total);', 
    'totalCount = Number(countResult[0]?.[0]?.total || 0);'
);
replaceFile('src/features/members/member.controller.js', 
    'if (emailCheck.length > 0)', 
    'if (emailCheck[0] && emailCheck[0].length > 0)'
);

// auth.middleware.js
replaceFile('src/middlewares/auth.middleware.js', 
    'if (!sessionCheck || sessionCheck.length === 0 || sessionCheck[0].status === \'inactive\')', 
    'if (!sessionCheck || !sessionCheck[0] || sessionCheck[0].length === 0 || sessionCheck[0][0].status === \'inactive\')'
);

// book.controller.js
replaceFile('src/features/books/book.controller.js',
    'if (rows.length === 0) unique = true;',
    'if (rows[0] && rows[0].length === 0) unique = true;'
);

// reservation.controller.js
replaceFile('src/features/reservations/reservation.controller.js',
    'if (availableCopies && availableCopies.length > 0) {',
    'if (availableCopies[0] && availableCopies[0].length > 0) {'
);
