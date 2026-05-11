const pool = require('./db');

async function migrate() {
    try {
        console.log('Adding created_at column to issues table...');
        await pool.query('ALTER TABLE issues ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
        console.log('Successfully added created_at column.');
        process.exit(0);
    } catch (err) {
        if (err.code === 'ER_DUP_COLUMN_NAME') {
            console.log('Column created_at already exists.');
            process.exit(0);
        }
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
