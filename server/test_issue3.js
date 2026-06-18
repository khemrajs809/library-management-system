const pool = require('./src/config/db');

async function test() {
    try {
        const copies = await pool.query('SELECT copy_id FROM book_copies WHERE status = "available" LIMIT 1');
        if (copies.length > 0) {
            const valid_copy_id = copies[0].copy_id;
            console.log("Found valid copy:", valid_copy_id);
            const issue_date = new Date().toISOString().split('T')[0];
            const due_date = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            await pool.query('CALL proc_issue_book(?, ?, ?, ?)', ['MEM-101', valid_copy_id, issue_date, due_date]);
            console.log("Success issuing book!");
        } else {
            console.log("No available copies found.");
        }
    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        process.exit();
    }
}
test();
