const pool = require('../db');

/**
 * Middleware to log high-value actions (POST, PUT, DELETE) into the audit_logs table.
 * This should be used on routes that modify data.
 * @param {string} actionDescription - A human-readable description of the action being performed
 */
const auditLog = (actionDescription) => {
    return async (req, res, next) => {
        // We capture the original send to log AFTER the request completes successfully
        const originalSend = res.send;

        res.send = function (content) {
            // Only log if the request was successful (2xx status)
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const user = req.user || { id: 'anonymous', role: 'none' };
                const details = {
                    method: req.method,
                    url: req.originalUrl,
                    body: req.body,
                    params: req.params,
                    ip: req.ip
                };

                // Non-blocking log to DB
                pool.query(
                    'INSERT INTO audit_logs (user_id, user_role, action, details) VALUES (?, ?, ?, ?)',
                    [
                        user.id || user.email || 'unknown', 
                        user.role, 
                        actionDescription, 
                        JSON.stringify(details)
                    ]
                ).catch(err => console.error('Audit Log Error:', err.message));
            }
            return originalSend.apply(res, arguments);
        };

        next();
    };
};

module.exports = auditLog;
