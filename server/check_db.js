const pool = require('./src/db');

async function test() {
    try {
        const rows = await pool.query('SELECT name, course, department, year_semester FROM members LIMIT 10');
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

test();
