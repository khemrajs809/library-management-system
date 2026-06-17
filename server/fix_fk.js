const pool = require('./src/config/db.js');

async function fix() {
  try {
    await pool.query('ALTER TABLE issues DROP FOREIGN KEY fk_issues_book_id');
    console.log("Dropped fk_issues_book_id");
  } catch(e) { console.log(e.message) }

  try {
    await pool.query('ALTER TABLE issues DROP FOREIGN KEY fk_issues_book_ref_new');
    console.log("Dropped fk_issues_book_ref_new");
  } catch(e) { console.log(e.message) }

  try {
    await pool.query('ALTER TABLE issues DROP FOREIGN KEY fk_unique_random_book_id_123');
    console.log("Dropped fk_unique_random_book_id_123");
  } catch(e) { console.log(e.message) }

  try {
    await pool.query('ALTER TABLE issues ADD CONSTRAINT fk_issues_copy_id FOREIGN KEY (book_id) REFERENCES book_copies (copy_id) ON DELETE SET NULL');
    console.log("Added correct FK to book_copies");
  } catch(e) { console.log("Add FK Error:", e.message) }
  
  process.exit(0);
}
fix();
