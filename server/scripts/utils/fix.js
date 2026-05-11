const pool = require('./db.js');
async function run() {
    try {
        await pool.query('ALTER TABLE issues DROP FOREIGN KEY `1`');
        await pool.query('ALTER TABLE issues ADD CONSTRAINT fk_issues_copy FOREIGN KEY (book_id) REFERENCES book_copies(copy_id) ON DELETE CASCADE');
        console.log('Foreign key updated successfully');
    } catch(e) { console.error('Error:', e); }
    process.exit();
}
run();
