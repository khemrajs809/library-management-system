const pool = require('../../db');

/**
 * Log an action to the database audit_logs table.
 * 
 * @param {string} userId - ID or Email of the user performing the action
 * @param {string} userRole - Role of the user (e.g. 'system', 'admin', 'librarian')
 * @param {string} actionDescription - Human-readable description of the action
 * @param {Object} details - Additional JSON details about the action
 */
const logSystemAction = async (userId, userRole, actionDescription, details = {}) => {
    try {
        await pool.query(
            'CALL proc_log_audit_action(?, ?, ?, ?)',
            [
                userId || 'unknown',
                userRole || 'system',
                actionDescription,
                JSON.stringify(details)
            ]
        );
    } catch (err) {
        console.error('Audit Service Error (proc_log_audit_action):', err.message);
    }
};

module.exports = {
    logSystemAction
};
