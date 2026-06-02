const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');

// --- Security & Middleware ---
const { helmetConfig, corsConfig, hppConfig } = require('./middlewares/security.middleware');
const { adminLimiter, bookLimiter, memberLimiter, issueLimiter, notesLimiter, publicLimiter, authLimiter } = require('./middlewares/rateLimiter.middleware');
const { validateResult, loginValidation } = require('./middlewares/validation.middleware');
const caseConverter = require('./middlewares/caseConverter.middleware');

// --- Routes ---
const adminRoutes = require('./routes/admin.routes');
const bookRoutes = require('./routes/book.routes');
const memberRoutes = require('./routes/member.routes');
const issueRoutes = require('./routes/issue.routes');
const notesRoutes = require('./routes/notes.routes');
const authController = require('./controllers/auth.controller');
const captchaRoutes = require('./features/captcha/captcha.routes');
const publicRoutes = require('./routes/public.routes');

const app = express();

// =====================================================
//  GLOBAL MIDDLEWARES
// =====================================================
app.use(helmetConfig);
app.use(corsConfig);
app.use(express.json());
app.use(caseConverter);
app.use(cookieParser());
app.use(hppConfig); // Prevents HTTP Parameter Pollution
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
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
app.post('/api/login', authLimiter, loginValidation, validateResult, authController.login);
app.get('/api/login/status', authLimiter, (req, res) => {
    res.status(200).json({ success: true, message: 'Not locked out' });
});
app.post('/api/verify-otp', authLimiter, authController.verifyOTP);
app.post('/api/resend-otp', authLimiter, authController.resendOTP);
app.post('/api/forgot-password', authLimiter, authController.forgotPassword);
app.post('/api/reset-password', authLimiter, authController.resetPassword);
app.post('/api/logout', authController.logout);

// Captcha
app.use('/api/captcha', captchaRoutes);

// Feature routes
app.use('/api/admin', adminLimiter, adminRoutes);
app.use('/api/books', bookLimiter, bookRoutes);
app.use('/api/members', memberLimiter, memberRoutes);
app.use('/api/issues', issueLimiter, issueRoutes);
app.use('/api/notes', notesLimiter, notesRoutes);
app.use('/api/announcements', publicLimiter, publicRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ 
        success: false, 
        message: err.message || 'Internal server error' 
    });
});

module.exports = app;
