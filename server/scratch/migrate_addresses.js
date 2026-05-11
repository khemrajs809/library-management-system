const pool = require('../db');
async function migrate() {
  try {
    const columns = [
      'curr_house VARCHAR(100)', 'curr_street VARCHAR(150)', 'curr_area VARCHAR(150)', 'curr_city VARCHAR(100)', 'curr_state VARCHAR(100)', 'curr_pincode VARCHAR(10)',
      'perm_house VARCHAR(100)', 'perm_street VARCHAR(150)', 'perm_area VARCHAR(150)', 'perm_city VARCHAR(100)', 'perm_state VARCHAR(100)', 'perm_pincode VARCHAR(10)'
    ];
    
    for (const col of columns) {
      const colName = col.split(' ')[0];
      try {
        await pool.query(`ALTER TABLE members ADD COLUMN ${col}`);
        console.log(`✅ Added column: ${colName}`);
      } catch (e) {
        if (e.code === 'ER_DUP_COLUMN_NAME') {
          console.log(`ℹ️ Column ${colName} already exists`);
        } else {
          throw e;
        }
      }
    }
    console.log('🎉 Address migration completed');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}
migrate();
