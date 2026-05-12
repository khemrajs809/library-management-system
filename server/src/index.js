const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

// --- Load Environment Variables ---
dotenv.config();

// --- Security & Middleware ---
const { helmetConfig, corsConfig, globalLimiter, hppConfig } = require('./middlewares/security.middleware');
const { validateResult, loginValidation } = require('./middlewares/validation.middleware');

// --- Routes ---
const adminRoutes = require('./routes/admin.routes');
const bookRoutes = require('./routes/book.routes');
const memberRoutes = require('./routes/member.routes');
const issueRoutes = require('./routes/issue.routes');
const notesRoutes = require('./routes/notes.routes');
const authController = require('./controllers/auth.controller');
const captchaRoutes = require('./routes/captcha.routes');
const { authLimiter } = require('./middlewares/security.middleware');

// --- Jobs ---
const { setupNotificationJob } = require('./jobs/notification.job');
const pool = require('./db');

const { initSessionDb } = require('./services/session.service');

// --- Database Self-Healing ---
const initDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS login_attempts (
                email VARCHAR(255) PRIMARY KEY,
                attempts INT DEFAULT 0,
                lockout_until TIMESTAMP NULL
            );
        `);
        // Add status column if not exists
        await pool.query(`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS status ENUM('active', 'inactive') DEFAULT 'active';
        `);
        console.log('✅ Database tables verified.');
        await initSessionDb();
    } catch (err) {
        console.error('❌ Database initialization error:', err);
    }
};
initDB();

// =====================================================
//  APP SETUP
// =====================================================
const app = express();
const fs = require('fs');
const https = require('https');

let server;

// Try to load HTTPS certificates if they exist
try {
    const privateKey = fs.readFileSync(path.join(__dirname, '../certs/localhost.key'), 'utf8');
    const certificate = fs.readFileSync(path.join(__dirname, '../certs/localhost.crt'), 'utf8');
    const credentials = { key: privateKey, cert: certificate };

    // Create HTTPS server
    server = https.createServer(credentials, app);
    console.log('✅ HTTPS Certificates loaded. Server will run on HTTPS.');
} catch (err) {
    console.warn('⚠️ HTTPS Certificates not found. Falling back to HTTP.', err.message);
    server = http.createServer(app);
}

const io = new Server(server, {
    cors: { origin: '*' }
});

// Make `io` available to controllers if needed in future
app.set('io', io);

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
});

// =====================================================
//  GLOBAL MIDDLEWARES
// =====================================================
app.use(helmetConfig);
app.use(corsConfig);
app.use(express.json());
app.use(hppConfig); // Prevents HTTP Parameter Pollution
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
    next();
});
app.use(globalLimiter);

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
app.use('/api/admin', adminRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/notes', notesRoutes);

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

// =====================================================
//  START SERVER
// =====================================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running securely on port ${PORT}`);
    setupNotificationJob(io);
});

// Graceful shutdown for nodemon restarts on Windows
const gracefulShutdown = () => {
    console.log('Shutting down gracefully...');
    server.close(() => {
        console.log('Server closed.');
        process.exit(0);
    });
};

process.once('SIGUSR2', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
