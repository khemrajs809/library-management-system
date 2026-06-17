const pool = require('./src/config/db.js');

async function test() {
  try {
    const results = await pool.query('SHOW CREATE TABLE issues');
    console.log(results[0]['Create Table']);
    process.exit(0);
  } catch (err) {
    console.error("DB Error:", err);
    process.exit(1);
  }
}
test();
