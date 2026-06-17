const pool = require('./src/config/db.js');

async function test() {
  try {
    const results = await pool.query('CALL proc_get_lost_book_details(?)', [24]);
    console.log("proc_get_lost_book_details output:", results[0][0]);
    
    // Test the logic directly
    const issue = results[0][0];
    const bookPrice = parseFloat(issue.price) || 0;
    const fine = bookPrice + 150;
    
    console.log("Marking lost with fine:", fine);
    await pool.query('CALL proc_mark_as_lost(?, ?)', [24, fine]);
    console.log("Success!");
    process.exit(0);
  } catch (err) {
    console.error("DB Error:", err);
    process.exit(1);
  }
}
test();
