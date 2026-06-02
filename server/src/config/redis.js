const { createClient } = require('redis');
require('dotenv').config();

// Create Redis Client
const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

let connectionFailedLogged = false;

redisClient.on('error', (err) => {
    if (err.code === 'ECONNREFUSED' || (err.message && err.message.includes('ECONNREFUSED'))) {
        if (!connectionFailedLogged) {
            console.warn('⚠️ Redis Connection Refused (No Redis server detected). Running without cache...');
            connectionFailedLogged = true;
        }
    } else {
        console.error('❌ Redis Client Error:', err.message || err);
    }
});

redisClient.on('connect', () => {
    console.log('✅ Connected to Redis seamlessly');
});

// Immediately connect
(async () => {
    try {
        await redisClient.connect();
    } catch (err) {
        console.error('❌ Redis Connection Failed. Make sure Redis is running.');
    }
})();

module.exports = redisClient;
