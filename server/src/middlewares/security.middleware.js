const helmet = require('helmet');

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



// 5. HTTP Parameter Pollution (HPP) Prevention
const hppConfig = hpp();

module.exports = {
    helmetConfig,
    corsConfig,
    hppConfig
};
