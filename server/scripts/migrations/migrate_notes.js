const pool = require('./db');

async function migrateNotes() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS project_notes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                project_details TEXT,
                features TEXT,
                pattern_password VARCHAR(255) NOT NULL DEFAULT '12369'
            )
        `);
        console.log('project_notes table created.');

        const rows = await pool.query('SELECT * FROM project_notes WHERE id = 1');
        if (rows.length === 0) {
            await pool.query(`
                INSERT INTO project_notes (project_details, features, pattern_password)
                VALUES (
                    'Library Management System - A comprehensive solution for managing books, members, and book circulation.',
                    'Features include: Book Management, Member Management, Issue/Return tracking, Pattern-locked Notes, Analytics Dashboard.',
                    '12369'
                )
            `);
            console.log('Default notes inserted.');
        }

        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrateNotes();
