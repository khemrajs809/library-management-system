const pool = require('./server/src/db');

async function testFK() {
    try {
        console.log("Adding FK to issues...");
        await pool.query('ALTER TABLE issues ADD CONSTRAINT fk_unique_random_book_id_123 FOREIGN KEY (book_id) REFERENCES books(book_id) ON DELETE SET NULL');
        console.log("Success!");
        process.exit(0);
    } catch(e) {
        console.error("Error adding FK:", e.message);
        process.exit(1);
    }
}
testFK();
