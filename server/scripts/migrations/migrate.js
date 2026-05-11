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

        // Add ISBN
        try {
            await conn.query('ALTER TABLE books ADD COLUMN isbn VARCHAR(50) NOT NULL');
            console.log('✅ isbn added to books');
        } catch (e) {
            console.log('ℹ️ isbn might already exist:', e.message);
        }

        // Add Price
        try {
            await conn.query('ALTER TABLE books ADD COLUMN price DECIMAL(10, 2) DEFAULT 0.00');
            console.log('✅ price added to books');
        } catch (e) {
            console.log('ℹ️ price might already exist:', e.message);
        }

        // Create issues table
        await conn.query(`
            CREATE TABLE IF NOT EXISTS issues (
                issue_id INT AUTO_INCREMENT PRIMARY KEY,
                book_id VARCHAR(20),
                member_id VARCHAR(20),
                issue_date DATE NOT NULL,
                due_date DATE NOT NULL,
                return_date DATE,
                fine_amount DECIMAL(10, 2) DEFAULT 0.00,
                status ENUM('issued', 'returned', 'lost') DEFAULT 'issued',
                FOREIGN KEY (book_id) REFERENCES books(book_id),
                FOREIGN KEY (member_id) REFERENCES members(member_id)
            )
        `);
        console.log('✅ issues table created!');

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        if (conn) conn.end();
        process.exit();
    }
}

migrate();
