const pool = require('./src/config/db');

async function test() {
    try {
        const issues = await pool.query('SELECT issue_id, book_id FROM issues WHERE status = "issued" LIMIT 1');
        if (issues.length > 0) {
            const valid_issue_id = issues[0].issue_id;
            const valid_copy_id = issues[0].book_id;
            console.log("Found valid issue:", valid_issue_id, valid_copy_id);
            const return_date = new Date().toISOString().split('T')[0];
            await pool.query('CALL proc_return_book(?, ?, ?, ?)', [valid_issue_id, valid_copy_id, return_date, 0]);
            console.log("Success returning book!");
        } else {
            console.log("No active issues found.");
        }
    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        process.exit();
    }
}
test();
