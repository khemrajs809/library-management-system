const pool = require('../../config/db');
const logger = require('../../config/logger');
const { withTransaction } = require('./dbTransaction.service');

/**
 * Service to inspect, verify, and reconcile Library Circulation Desk database integrity.
 * Detects orphaned book copies and half-committed transaction discrepancies.
 */

/**
 * Audit 1: Detect orphaned book copies marked as 'issued' that have no active issue record.
 */
async function auditOrphanedIssuedCopies() {
    const query = `
        SELECT 
            bc.copy_id, 
            bc.book_id, 
            bc.status AS current_copy_status
        FROM book_copies bc
        LEFT JOIN issues i 
            ON bc.copy_id = i.book_id 
            AND i.return_date IS NULL
        WHERE bc.status = 'issued' 
          AND i.issue_id IS NULL
    `;
    const rows = await pool.query(query);
    return rows || [];
}

/**
 * Audit 2: Detect active issue records where physical copy is not marked as 'issued'.
 */
async function auditGhostIssues() {
    const query = `
        SELECT 
            i.issue_id, 
            i.member_id, 
            i.book_id AS copy_id, 
            i.issue_date,
            bc.status AS physical_copy_status
        FROM issues i
        JOIN book_copies bc 
            ON i.book_id = bc.copy_id
        WHERE i.return_date IS NULL 
          AND i.status = 'issued'
          AND bc.status != 'issued'
    `;
    const rows = await pool.query(query);
    return rows || [];
}

/**
 * Run a full read-only diagnostic check across circulation records.
 */
async function runFullCirculationAudit() {
    try {
        const [orphanedCopies, ghostIssues] = await Promise.all([
            auditOrphanedIssuedCopies(),
            auditGhostIssues()
        ]);

        const healthy = orphanedCopies.length === 0 && ghostIssues.length === 0;

        const report = {
            timestamp: new Date().toISOString(),
            status: healthy ? 'HEALTHY' : 'ANOMALIES_DETECTED',
            healthy,
            counts: {
                orphanedIssuedCopies: orphanedCopies.length,
                ghostIssues: ghostIssues.length
            },
            details: {
                orphanedCopies,
                ghostIssues
            }
        };

        if (!healthy) {
            logger.warn('Circulation Integrity Audit found anomalies', report.counts);
        }

        return report;
    } catch (error) {
        logger.error('Failed to run circulation integrity audit', { error: error.message });
        throw error;
    }
}

/**
 * Atomically reconcile and repair half-committed circulation states.
 */
async function reconcileCirculationIntegrity() {
    return await withTransaction(async (conn) => {
        logger.info('Starting transactional circulation self-healing process...');

        // 1. Repair orphaned book copies (status = 'issued' but no active issue record) -> set 'available'
        const repairOrphanedQuery = `
            UPDATE book_copies bc
            LEFT JOIN issues i 
                ON bc.copy_id = i.book_id 
                AND i.return_date IS NULL
            SET bc.status = 'available'
            WHERE bc.status = 'issued' 
              AND i.issue_id IS NULL
        `;
        const orphanedResult = await conn.query(repairOrphanedQuery);

        // 2. Repair physical copies that have an active issue record but aren't marked 'issued'
        const repairGhostQuery = `
            UPDATE book_copies bc
            JOIN issues i 
                ON bc.copy_id = i.book_id
            SET bc.status = 'issued'
            WHERE i.return_date IS NULL 
              AND i.status = 'issued'
              AND bc.status != 'issued'
        `;
        const ghostResult = await conn.query(repairGhostQuery);

        const summary = {
            reconciledAt: new Date().toISOString(),
            orphanedCopiesFixed: orphanedResult.affectedRows || 0,
            ghostIssuesFixed: ghostResult.affectedRows || 0,
            success: true
        };

        logger.info('Circulation reconciliation completed successfully', summary);
        return summary;
    });
}

module.exports = {
    auditOrphanedIssuedCopies,
    auditGhostIssues,
    runFullCirculationAudit,
    reconcileCirculationIntegrity
};
