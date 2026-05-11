const pool = require('../db');
async function migrate() {
  try {
    await pool.query('ALTER TABLE books MODIFY isbn VARCHAR(50) NULL;');
    console.log('✅ ISBN column is now nullable');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}
migrate();
