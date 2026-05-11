const pool = require('./db');

async function migrate() {
    try {
        console.log("Starting Migration...");

        // 1. Create book_copies table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS book_copies (
                copy_id VARCHAR(50) PRIMARY KEY,
                book_id VARCHAR(50),
                status ENUM('available', 'issued', 'lost', 'damaged') DEFAULT 'available',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (book_id) REFERENCES books(book_id) ON DELETE CASCADE
            )
        `);
        console.log("Table 'book_copies' created.");

        // 2. Add 'isbn' to books if not exists (checking if already there is fine)
        // (Assuming books table exists based on previous conversations)

        // 3. Optional: Populate book_copies from existing quantity
        const books = await pool.query("SELECT book_id, quantity FROM books");
        for (const book of books) {
            const qty = Number(book.quantity);
            const copies = await pool.query("SELECT COUNT(*) as count FROM book_copies WHERE book_id = ?", [book.book_id]);
            const existingCount = Number(copies[0].count);
            const needed = qty - existingCount;

            if (needed > 0) {
                for (let i = 1; i <= needed; i++) {
                    const copy_id = `${book.book_id}-${existingCount + i}`;
                    try {
                        await pool.query("INSERT IGNORE INTO book_copies (copy_id, book_id) VALUES (?, ?)", [copy_id, book.book_id]);
                    } catch (e) {
                        console.error(`Failed to add copy ${copy_id}:`, e.message);
                    }
                }
            }
        }
        console.log("Migration finished successfully.");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

migrate();
