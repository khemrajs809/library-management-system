const pool = require('./src/config/db.js');

async function test() {
  try {
    console.log("Calling proc_issue_book with BK-5016-2...");
    await pool.query('CALL proc_issue_book(?, ?, ?, ?)', ['MEM-138', 'BK-5016-2', '2026-06-16', '2026-06-30']);
    console.log("Success!");
    process.exit(0);
  } catch (err) {
    console.error("DB Error:", err);
    process.exit(1);
  }
}
test();
