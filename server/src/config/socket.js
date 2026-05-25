const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const setupSocket = (server, app) => {
    const io = new Server(server, {
        cors: { origin: '*' }
    });

    // Make `io` available to controllers if needed in future
    app.set('io', io);

    // --- Socket.io Authentication Middleware ---
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error('Authentication error: No token provided'));

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
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
