/**
 * Enterprise Cache Middleware
 * Note: Temporarily modified to act as a pass-through to ensure 
 * 100% real-time data from MariaDB without Docker/Redis complexity.
 * @param {number} ttlSeconds - Time To Live in seconds
 */
const cacheMiddleware = (ttlSeconds = 60) => {
    return async (req, res, next) => {
        // Pass-through: No caching. Always fetch real values from DB.
        next();
    };
};

module.exports = cacheMiddleware;
