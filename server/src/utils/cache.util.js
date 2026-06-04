/**
 * Invalidates cache keys matching a specific pattern.
 * Note: Temporarily stubbed to bypass Redis and ensure 100% real-time DB reads.
 * @param {string} pattern - The Redis key pattern to invalidate
 */
const invalidateCache = async (pattern) => {
    // Pass-through: No action needed since caching is disabled.
};

module.exports = {
    invalidateCache
};
