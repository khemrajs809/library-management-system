const pool = require('./src/config/db');

async function test() {
    try {
        const results = await pool.query('CALL proc_check_issue_eligibility(?, ?)', ['INVALID', 'INVALID']);
        const memberCheck = results[0];
        const copyCheck = results[1];
        const alreadyIssuedCheck = results[2];
        const fineCheck = results[3];
        const issueCount = results[4];

        console.log("memberCheck.length:", memberCheck ? memberCheck.length : 'undefined');
        console.log("copyCheck.length:", copyCheck ? copyCheck.length : 'undefined');
        console.log("alreadyIssuedCheck.length:", alreadyIssuedCheck ? alreadyIssuedCheck.length : 'undefined');
        console.log("fineCheck.length:", fineCheck ? fineCheck.length : 'undefined');
        console.log("issueCount.length:", issueCount ? issueCount.length : 'undefined');
        
        console.dir(fineCheck, { depth: null });
        console.dir(issueCount, { depth: null });
    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        process.exit();
    }
}
test();
