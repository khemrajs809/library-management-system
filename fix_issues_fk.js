const pool = require('./server/src/db');
async function fixIssues() {
    try {
        console.log("Applying FK for issues...");
        await pool.query('ALTER TABLE issues ADD CONSTRAINT fk_issues_book_ref_new FOREIGN KEY (book_id) REFERENCES books(book_id) ON DELETE SET NULL');
        console.log("Success!");
    } catch(e) {
        console.error(e.message);
    }
    process.exit(0);
}
fixIssues();
