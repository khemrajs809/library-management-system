const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const fs = require('fs');

// --- Load Environment Variables ---
dotenv.config();

const app = require('./app');
const initDB = require('./config/initDB');
const setupSocket = require('./config/socket');
const { setupNotificationJob } = require('./jobs/notification.job');

// =====================================================
//  INITIALIZE DATABASE
// =====================================================
initDB();

// =====================================================
//  CREATE SERVER (HTTP/HTTPS)
// =====================================================
let server;

// Try to load HTTPS certificates if they exist
try {
    const privateKey = fs.readFileSync(path.join(__dirname, '../certs/localhost.key'), 'utf8');
    const certificate = fs.readFileSync(path.join(__dirname, '../certs/localhost.crt'), 'utf8');
    const credentials = { key: privateKey, cert: certificate };

    // Create HTTPS server
    const https = require('https');
    server = https.createServer(credentials, app);
    console.log('✅ HTTPS Certificates loaded. Server will run on HTTPS.');
} catch (err) {
    console.warn('⚠️ HTTPS Certificates not found. Falling back to HTTP.', err.message);
    server = http.createServer(app);
}

// =====================================================
//  INITIALIZE WEBSOCKETS
// =====================================================
const io = setupSocket(server, app);

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
