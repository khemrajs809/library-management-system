const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const hpp = require('hpp');

// 1. Helmet Configuration (Adds 11 standard security headers)
const helmetConfig = helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" } // Allows loading images from other origins (if needed for local dev)
});

// 2. CORS Configuration
const corsOptions = {
    origin: ['http://localhost:4200', 'https://localhost:4200'], // Allow only the Angular frontend
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
    exposedHeaders: ['RateLimit-Reset', 'Retry-After'],
    credentials: true, // Allow cookies if needed
    optionsSuccessStatus: 200
};
const corsConfig = cors(corsOptions);

// 3. Global Rate Limiting
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 2000, // limit each IP to 2000 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again after 15 minutes.'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// 4. Stricter Rate Limiting for Authentication Endpoints
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

// 5. HTTP Parameter Pollution (HPP) Prevention
const hppConfig = hpp();

module.exports = {
    helmetConfig,
    corsConfig,
    globalLimiter,
    authLimiter,
    hppConfig
};
