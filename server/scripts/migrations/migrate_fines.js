const pool = require('./db');

async function migrate() {
    let conn;
    try {
        conn = await pool.getConnection();
        console.log('Adding fine_paid column to issues table...');
        
        try {
            await conn.query('ALTER TABLE issues ADD COLUMN fine_paid TINYINT(1) DEFAULT 0');
            console.log('Column fine_paid added successfully.');
        } catch (err) {
            if (err.code === 'ER_DUP_COLUMN_NAME') {
                console.log('Column fine_paid already exists.');
            } else {
                throw err;
            }
        }

        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        if (conn) conn.release();
        process.exit();
    }
}

migrate();
