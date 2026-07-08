const pool = require('../../config/db');
const logger = require('../../config/logger');

/**
 * Executes a callback function within a guaranteed database transaction.
 * Automatically acquires a connection, begins a transaction, commits on success,
 * rolls back on any error, and ALWAYS releases the connection back to the pool.
 *
 * @param {Function} workFn - Async function receiving the transactional connection: `async (conn) => { ... }`
 * @returns {Promise<any>} Result returned by workFn
 */
async function withTransaction(workFn) {
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        const result = await workFn(conn);

        await conn.commit();
        return result;
    } catch (error) {
        if (conn) {
            try {
                await conn.rollback();
            } catch (rollbackErr) {
                logger.error('CRITICAL: Transaction rollback failed after error', {
                    originalError: error.message,
                    rollbackError: rollbackErr.message
                });
            }
        }
        logger.error('Transaction rolled back due to error', {
            error: error.message,
            sqlState: error.sqlState,
            code: error.code
        });
        throw error;
    } finally {
        if (conn) {
            try {
                conn.release();
            } catch (releaseErr) {
                logger.error('CRITICAL: Failed to release database connection back to pool', {
                    releaseError: releaseErr.message
                });
            }
        }
    }
}

/**
 * Safely executes a single SQL query against the connection pool with structured error logging.
 *
 * @param {string} sql - SQL query string
 * @param {Array} [params] - Query parameters
 * @returns {Promise<any>} Query results
 */
async function safeQuery(sql, params = []) {
    try {
        return await pool.query(sql, params);
    } catch (error) {
        logger.error('Database query execution error', {
            sql: sql.slice(0, 150),
            error: error.message,
            sqlState: error.sqlState,
            code: error.code
        });
        throw error;
    }
}

module.exports = {
    withTransaction,
    safeQuery
};
