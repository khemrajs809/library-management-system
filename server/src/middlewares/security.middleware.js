const helmet = require('helmet');

const cors = require('cors');
const hpp = require('hpp');

const crypto = require('crypto');

// 1. Helmet Configuration (Adds 11 standard security headers + Strict CSP)
const helmetConfig = helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allows loading images from other origins
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"], // Angular requires some inline scripts for prod builds
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "blob:", "https:"],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    }
});

// 2. CORS Configuration
const corsOptions = {
    origin: ['http://localhost:4200', 'https://localhost:4200'], // Allow only the Angular frontend
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token', 'x-xsrf-token'],
    exposedHeaders: ['RateLimit-Reset', 'Retry-After'],
    credentials: true, // Allow cookies if needed
    optionsSuccessStatus: 200
};
const corsConfig = cors(corsOptions);



// 5. HTTP Parameter Pollution (HPP) Prevention
const hppConfig = hpp();

// 6. Enterprise CSRF Protection (Double-Submit Cookie)
// Automatically compatible with Angular's native HttpClient CSRF handling
const csrfProtection = (req, res, next) => {
    // 1. Always ensure an XSRF-TOKEN cookie exists for the frontend to read
    let csrfToken = req.cookies['XSRF-TOKEN'];
    if (!csrfToken) {
        csrfToken = crypto.randomBytes(32).toString('hex');
        res.cookie('XSRF-TOKEN', csrfToken, {
            secure: process.env.NODE_ENV === 'production' || true,
            sameSite: 'none',
            // MUST NOT be HttpOnly so Angular JavaScript can read it and send it back in headers
            httpOnly: false, 
            path: '/'
        });
    }

    // Bypass CSRF verification during Jest automated testing
    if (process.env.NODE_ENV === 'test') {
        return next();
    }

    // 2. If it's a mutation request, verify the header matches the cookie
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        // Angular automatically sends 'x-xsrf-token' header if the 'XSRF-TOKEN' cookie is present
        const headerToken = req.headers['x-xsrf-token'];
        
        if (!headerToken || headerToken !== csrfToken) {
            return res.status(403).json({ 
                success: false, 
                message: 'Invalid CSRF Token. Cross-Site Request Forgery attempt blocked.' 
            });
        }
    }

    next();
};

module.exports = {
    helmetConfig,
    corsConfig,
    hppConfig,
    csrfProtection
};
