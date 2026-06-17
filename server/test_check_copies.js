const pool = require('./src/config/db.js');

async function test() {
  try {
    const results = await pool.query('SELECT * FROM book_copies');
    console.log(results);
    process.exit(0);
  } catch (err) {
    console.error("DB Error:", err);
    process.exit(1);
  }
}
test();
