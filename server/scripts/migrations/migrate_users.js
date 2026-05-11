const pool = require('./db');
require('dotenv').config();

async function migrate() {
    try {
        console.log('Starting migration to unified users table...');

        // 1. Create users table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(20) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role ENUM('admin', 'librarian') NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Created users table.');

        // 2. Fetch and insert admins
        const admins = await pool.query('SELECT * FROM admins');
        for (const admin of admins) {
            try {
                await pool.query(`
                    INSERT INTO users (id, name, email, password, role, created_at)
                    VALUES (?, ?, ?, ?, 'admin', ?)
                `, [`ADMIN_${admin.id}`, admin.name || 'Admin', admin.email, admin.password, admin.created_at]);
                console.log(`Migrated admin: ${admin.email}`);
            } catch (err) {
                if (err.code === 'ER_DUP_ENTRY') console.log(`Admin ${admin.email} already migrated.`);
                else throw err;
            }
        }

        // 3. Fetch and insert librarians
        const librarians = await pool.query('SELECT * FROM librarians');
        for (const lib of librarians) {
            try {
                await pool.query(`
                    INSERT INTO users (id, name, email, password, role, created_at)
                    VALUES (?, ?, ?, ?, 'librarian', ?)
                `, [lib.lib_id, lib.name, lib.email, lib.password, lib.created_at]);
                console.log(`Migrated librarian: ${lib.email}`);
            } catch (err) {
                if (err.code === 'ER_DUP_ENTRY') console.log(`Librarian ${lib.email} already migrated.`);
                else throw err;
            }
        }

        // 4. Drop old tables (optional, but good for cleanup)
        // Leaving them for now as backup, we can drop them manually later if needed.
        console.log('Migration completed successfully.');

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        process.exit(0);
    }
}

migrate();
