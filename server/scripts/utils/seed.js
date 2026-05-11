const mariadb = require('mariadb');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

async function seed() {
    let conn;
    try {
        // Connect WITHOUT specifying a database first
        conn = await mariadb.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || '',
            port: parseInt(process.env.DB_PORT) || 3306
        });
        console.log('Connected to MariaDB!');

        // Create database
        await conn.query('CREATE DATABASE IF NOT EXISTS library_db');
        console.log('✅ library_db database created!');

        // Use the database
        await conn.query('USE library_db');

        // Create users table
        await conn.query(`
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(20) PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                role ENUM('admin', 'librarian') NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ users table created!');

        // Create members table
        await conn.query(`
            CREATE TABLE IF NOT EXISTS members (
                member_id VARCHAR(20) PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                dob DATE NOT NULL,
                photo_url VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ members table created!');

        // Create books table
        await conn.query(`
            CREATE TABLE IF NOT EXISTS books (
                book_id VARCHAR(20) PRIMARY KEY,
                title VARCHAR(200) NOT NULL,
                quantity INT DEFAULT 1,
                available INT DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ books table created!');

        // Hash the password
        const hashedPassword = await bcrypt.hash('admin123', 8);
        console.log('✅ Password hashed!');

        // Insert default admin
        await conn.query(`
            INSERT INTO users (id, email, password, name, role) 
            VALUES (?, ?, ?, ?, 'admin')
            ON DUPLICATE KEY UPDATE email=email
        `, ['ADMIN_1', 'admin@lms.com', hashedPassword, 'System Administrator']);
        console.log('✅ Default admin inserted!');
        console.log('');
        console.log('========================================');
        console.log('  Admin Login Credentials:');
        console.log('  Email:    admin@lms.com');
        console.log('  Password: admin123');
        console.log('========================================');

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        if (conn) conn.end();
        process.exit();
    }
}

seed();
