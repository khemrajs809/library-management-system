const redisClient = require('../config/redis');

/**
 * Invalidates cache keys matching a specific pattern.
 * @param {string} pattern - The Redis key pattern to invalidate (e.g., 'cache:/api/announcements*')
 */
const invalidateCache = async (pattern) => {
    try {
        if (!redisClient.isReady) {
            console.warn('⚠️ Redis not ready. Skipping cache invalidation for:', pattern);
            return;
        }

        const keys = await redisClient.keys(pattern);
        if (keys && keys.length > 0) {
            await redisClient.del(keys);
            console.log(`✅ Cache invalidated: ${keys.length} keys matching '${pattern}'`);
        }
    } catch (err) {
        console.error('❌ Error invalidating cache:', err);
    }
};

module.exports = {
    invalidateCache
};
