const rateLimit = require('express-rate-limit');

// 1. Workload-Based Rate Limiters
const readLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 2000, // High tolerance for GET requests
    message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const writeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Moderate tolerance for POST/PUT/DELETE
    message: { success: false, message: 'Too many write operations from this IP, please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const heavyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Low tolerance for imports/exports/generates
    message: { success: false, message: 'Too many heavy operations from this IP, please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Dynamic Middleware to route to the correct limiter
const dynamicRateLimiter = (req, res, next) => {
    // 1. Heavy Operations (Imports, Exports, Generate IDs)
    if (req.path.includes('/import') || req.path.includes('/export') || req.path.includes('/generate')) {
        return heavyLimiter(req, res, next);
    }
    // 2. Write Operations (POST, PUT, DELETE, PATCH)
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        return writeLimiter(req, res, next);
    }
    // 3. Read Operations (GET)
    return readLimiter(req, res, next);
};

// 2. Stricter Rate Limiting for Authentication Endpoints
const authLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute window
    max: 10, // start blocking after 10 requests
    message: {
        success: false,
        message: 'Too many login attempts. Please try again in 1 minute.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = {
    dynamicRateLimiter,
    authLimiter
};
