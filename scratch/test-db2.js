const pool = require('./server/src/db');
(async () => {
    try {
        const results = await pool.query('CALL proc_check_issue_eligibility(?, ?)', ['MEM-112', 'BK-5021-3']);
        // Use JSON stringify with a replacer to convert BigInt to string
        console.log(JSON.stringify(results, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2));
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
})();
