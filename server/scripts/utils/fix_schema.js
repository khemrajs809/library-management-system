const mariadb = require('mariadb');
const dotenv = require('dotenv');
dotenv.config();

async function fixSchema() {
    let conn;
    try {
        conn = await mariadb.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || '',
            database: process.env.DB_NAME || 'library_db',
            port: parseInt(process.env.DB_PORT) || 3306
        });
        console.log('Connected to MariaDB!');

        // 1. Fix Books Table
        const bookColumns = [
            { name: 'author', type: 'VARCHAR(100)' },
            { name: 'stream', type: 'VARCHAR(100)' },
            { name: 'publication_year', type: 'INT' },
            { name: 'cover_url', type: 'VARCHAR(255)' },
            { name: 'isbn', type: 'VARCHAR(50)' },
            { name: 'price', type: 'DECIMAL(10, 2) DEFAULT 0.00' },
            { name: 'publisher', type: 'VARCHAR(200)' },
            { name: 'edition', type: 'VARCHAR(100)' },
            { name: 'shelf_location', type: 'VARCHAR(100)' },
            { name: 'is_deleted', type: 'TINYINT(1) DEFAULT 0' }
        ];

        for (const col of bookColumns) {
            try {
                await conn.query(`ALTER TABLE books ADD COLUMN ${col.name} ${col.type}`);
                console.log(`✅ Added ${col.name} to books`);
            } catch (e) {
                console.log(`ℹ️ Column ${col.name} in books: ${e.message}`);
            }
        }

        // 2. Fix Members Table
        const memberColumns = [
            { name: 'phone', type: 'VARCHAR(15)' },
            { name: 'email', type: 'VARCHAR(100)' }
        ];

        for (const col of memberColumns) {
            try {
                await conn.query(`ALTER TABLE members ADD COLUMN ${col.name} ${col.type}`);
                console.log(`✅ Added ${col.name} to members`);
            } catch (e) {
                console.log(`ℹ️ Column ${col.name} in members: ${e.message}`);
            }
        }

        // 3. Fix Issues Table
        try {
            await conn.query('ALTER TABLE issues ADD COLUMN fine_paid TINYINT(1) DEFAULT 0');
            console.log('✅ Added fine_paid to issues');
        } catch (e) {
            console.log(`ℹ️ Column fine_paid in issues: ${e.message}`);
        }

        console.log('Schema synchronization complete!');

    } catch (err) {
        console.error('❌ Migration Error:', err.message);
    } finally {
        if (conn) conn.end();
    }
}

fixSchema();
