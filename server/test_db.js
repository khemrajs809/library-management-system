const pool = require('./src/config/db.js');

async function test() {
  try {
    const results = await pool.query('CALL proc_check_issue_eligibility(?, ?)', ['INVALID', 'BK-5020']);
    console.log(results);
    process.exit(0);
  } catch (err) {
    console.error("DB Error:", err);
    process.exit(1);
  }
}
test();
