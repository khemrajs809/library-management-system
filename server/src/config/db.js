const mariadb = require('mariadb');
const dotenv = require('dotenv');

dotenv.config();

const pool = mariadb.createPool({
     host: process.env.DB_HOST || 'localhost', 
     user: process.env.DB_USER || 'root', 
     password: process.env.DB_PASS || '',
     database: process.env.DB_NAME || 'library_db',
     port: parseInt(process.env.DB_PORT, 10) || 3306,
     connectionLimit: parseInt(process.env.DB_POOL_SIZE, 10) || 30,
     acquireTimeout: 10000,
     connectTimeout: 10000,
     idleTimeout: 60,
     minimumIdle: 5
});

async function getConnection() {
    try {
        const conn = await pool.getConnection();
        console.log("Connected to MariaDB!");
        conn.release();
    } catch (err) {
        console.error("Not connected to MariaDB due to error: " + err);
    }
}

getConnection();

pool.on('error', (err) => {
    console.error('❌ Unexpected error on idle MariaDB client', err);
});

module.exports = pool;
