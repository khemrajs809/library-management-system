const { Server } = require('socket.io');
const { jwtDecrypt } = require('jose');
const crypto = require('crypto');

// Derive the exact same 32-byte secret used in auth.controller
const encryptionSecret = crypto.createHash('sha256').update(process.env.JWT_SECRET).digest();

const setupSocket = (server, app) => {
    const io = new Server(server, {
        cors: { origin: '*' }
    });

    // Make `io` available to controllers if needed in future
    app.set('io', io);

    // --- Socket.io Authentication Middleware ---
    io.use(async (socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error('Authentication error: No token provided'));

        try {
            const { payload: decoded } = await jwtDecrypt(token, encryptionSecret);
            socket.user = decoded;
            next();
        } catch (err) {
            next(new Error('Authentication error: Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`Authenticated client connected: ${socket.id} (User: ${socket.user?.email})`);
    });

    return io;
};

module.exports = setupSocket;
