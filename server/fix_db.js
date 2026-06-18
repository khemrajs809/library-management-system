const pool = require('./src/config/db');

async function fixDB() {
    try {
        console.log("Dropping fk_issues_book_id...");
        await pool.query('ALTER TABLE issues DROP FOREIGN KEY fk_issues_book_id');
        console.log("Dropped fk_issues_book_id successfully.");
        
        // Also drop and recreate the correct one just to be safe
        console.log("Dropping fk_issues_copy_id...");
        await pool.query('ALTER TABLE issues DROP FOREIGN KEY fk_issues_copy_id');
        console.log("Dropped fk_issues_copy_id successfully.");
        
        console.log("Adding fk_issues_copy_id back...");
        await pool.query('ALTER TABLE issues ADD CONSTRAINT fk_issues_copy_id FOREIGN KEY (book_id) REFERENCES book_copies (copy_id) ON DELETE SET NULL');
        console.log("Added fk_issues_copy_id successfully.");
        
    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        const r = await pool.query('SHOW CREATE TABLE issues');
        console.log("CURRENT SCHEMA:");
        console.log(r[0]['Create Table']);
        process.exit();
    }
}
fixDB();
