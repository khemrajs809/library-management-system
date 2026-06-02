const redisClient = require('../config/redis');

/**
 * Enterprise Cache Middleware
 * @param {number} ttlSeconds - Time To Live in seconds
 */
const cacheMiddleware = (ttlSeconds = 60) => {
    return async (req, res, next) => {
        // Skip caching if Redis is not connected
        if (!redisClient.isReady) {
            return next();
        }

        // We only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        // Generate a unique cache key based on the URL and query parameters
        // Example: /api/books?limit=10
        const cacheKey = `cache:${req.originalUrl || req.url}`;

        try {
            // Check if we have a cached response
            const cachedData = await redisClient.get(cacheKey);

            if (cachedData) {
                // CACHE HIT: Parse and return instantly without hitting the DB
                const parsedData = JSON.parse(cachedData);
                // We add a custom header so the client knows it was lightning fast
                res.set('X-Cache', 'HIT');
                return res.status(200).json(parsedData);
            }

            // CACHE MISS: We need to intercept the response and save it to Redis
            res.set('X-Cache', 'MISS');
            
            // Store the original res.json function
            const originalJson = res.json;

            // Override res.json to catch the outgoing data
            res.json = function(body) {
                // If it's a successful response, cache it!
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    redisClient.setEx(cacheKey, ttlSeconds, JSON.stringify(body))
                        .catch(err => console.error('Redis Set Error:', err));
                }
                
                // Call the original res.json to actually send the data to the client
                originalJson.call(this, body);
            };

            next();
        } catch (error) {
            console.error('Redis Cache Middleware Error:', error);
            // If Redis fails, gracefully fallback to the database
            next();
        }
    };
};

module.exports = cacheMiddleware;
