const pool = require('./src/config/db');

async function test() {
    try {
        const issue_date = new Date().toISOString().split('T')[0];
        const due_date = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        await pool.query('CALL proc_issue_book(?, ?, ?, ?)', ['MEM-101', 'BK-5016-1', issue_date, due_date]);
        console.log("Success");
    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        process.exit();
    }
}
test();
