const express = require('express');

if (typeof BigInt !== 'undefined') {
    BigInt.prototype.toJSON = function () { return this.toString() };
}

const cookieParser = require('cookie-parser');
const path = require('path');

// --- Security & Middleware ---
const { helmetConfig, corsConfig, hppConfig, csrfProtection } = require('./middlewares/security.middleware');
const logger = require('./config/logger');
const { adminLimiter, bookLimiter, memberLimiter, issueLimiter, notesLimiter, publicLimiter, authLimiter } = require('./middlewares/rateLimiter.middleware');
const { validateResult, loginValidation } = require('./middlewares/validation.middleware');
const caseConverter = require('./middlewares/caseConverter.middleware');

// --- Routes ---
const adminRoutes = require('./features/admin/admin.routes');
const bookRoutes = require('./features/books/book.routes');
const memberRoutes = require('./features/members/member.routes');
const issueRoutes = require('./features/issues/issue.routes');
const notesRoutes = require('./features/notes/notes.routes');
const authRoutes = require('./features/auth/auth.routes');
const captchaRoutes = require('./features/captcha/captcha.routes');
const publicRoutes = require('./features/announcements/announcement.routes');
const reservationRoutes = require('./features/reservations/reservation.routes');

const app = express();

// Trust proxy is strictly required if deploying behind Cloudflare / WAF to prevent rate limiters from blocking all users
app.set('trust proxy', 1);
// Node server restart triggered

// 
//  GLOBAL MIDDLEWARES
// 
app.use(helmetConfig);
app.use(corsConfig);
app.use(express.json());
app.use(caseConverter);
app.use(cookieParser());
app.use(hppConfig); // Prevents HTTP Parameter Pollution
app.use(csrfProtection); // Blocks Cross-Site Request Forgery on all mutations

// Enterprise Request Tracing Middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = {
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress
        };
        
        if (res.statusCode >= 400) {
            logger.warn(`API Request Failed`, logData);
        } else {
            logger.info(`API Request Successful`, logData);
        }
    });
    next();
});
// Removed global dynamicRateLimiter in favor of module-specific limiters

// Static file serving for uploaded images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// =====================================================
//  ROUTES
// =====================================================

// Health check
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Library Management System API is running (Secure).' });
});

// Authentication (public)
app.use('/api', authRoutes);

// Captcha
app.use('/api/captcha', captchaRoutes);

// Feature routes
app.use('/api/admin', adminLimiter, adminRoutes);
app.use('/api/books', bookLimiter, bookRoutes);
app.use('/api/members', memberLimiter, memberRoutes);
app.use('/api/issues', issueLimiter, issueRoutes);
app.use('/api/notes', notesLimiter, notesRoutes);
app.use('/api/announcements', publicLimiter, publicRoutes);
app.use('/api/reservations', issueLimiter, reservationRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler (Enterprise Exception Interceptor)
app.use((err, req, res, next) => {
    logger.error('Unhandled Exception Caught:', {
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        body: req.body,
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress
    });
    
    res.status(500).json({ 
        success: false, 
        message: 'Internal server error. Our engineering team has been notified.' 
    });
});

module.exports = app;
