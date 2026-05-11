const mariadb = require('mariadb');
const dotenv = require('dotenv');
dotenv.config();

async function migrate() {
    let conn;
    try {
        conn = await mariadb.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || '',
            database: 'library_db',
            port: parseInt(process.env.DB_PORT) || 3306
        });
        console.log('Connected to MariaDB!');

        // Add Phone
        try {
            await conn.query('ALTER TABLE members ADD COLUMN phone VARCHAR(15)');
            console.log('✅ phone added to members');
        } catch (e) {
            console.log('ℹ️ phone might already exist:', e.message);
        }

        // Add Email
        try {
            await conn.query('ALTER TABLE members ADD COLUMN email VARCHAR(100)');
            console.log('✅ email added to members');
        } catch (e) {
            console.log('ℹ️ email might already exist:', e.message);
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        if (conn) conn.end();
        process.exit();
    }
}

migrate();
