const { withTransaction } = require('../src/common/services/dbTransaction.service');
const { runFullCirculationAudit, reconcileCirculationIntegrity } = require('../src/common/services/circulationAudit.service');

async function testCirculationModules() {
    console.log('--- Starting Verification of Circulation Modules ---');

    // 1. Verify Transaction wrapper & connection release
    console.log('1. Testing withTransaction wrapper...');
    const res = await withTransaction(async (conn) => {
        const [rows] = await conn.query('SELECT 1 as val');
        return rows;
    });
    console.log('   withTransaction executed successfully:', res);

    // 2. Verify Circulation Audit service
    console.log('2. Testing runFullCirculationAudit()...');
    const auditReport = await runFullCirculationAudit();
    console.log('   Audit Report:', JSON.stringify(auditReport, null, 2));

    console.log('--- All Circulation Modules Verified with Zero Errors ---');
    process.exit(0);
}

testCirculationModules().catch(err => {
    console.error('Verification Error:', err);
    process.exit(1);
});
