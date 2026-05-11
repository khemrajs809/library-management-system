const pool = require('./db');

async function alterDb() {
    try {
        await pool.query('ALTER TABLE books ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT 0');
        console.log('Books table altered.');
        await pool.query('ALTER TABLE members ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT 0');
        console.log('Members table altered.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

alterDb();
