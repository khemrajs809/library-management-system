const pool = require('./server/src/config/db');
async function run() {
    try {
        console.log('Dropping procedures...');
        await pool.query('DROP PROCEDURE IF EXISTS proc_get_books');
        await pool.query('DROP PROCEDURE IF EXISTS proc_get_books_search_count');

        console.log('Creating proc_get_books...');
        await pool.query(`
CREATE PROCEDURE proc_get_books(
    IN p_search VARCHAR(255),
    IN p_author VARCHAR(255),
    IN p_stream VARCHAR(100),
    IN p_availability VARCHAR(20),
    IN p_limit INT,
    IN p_offset INT
)
BEGIN
    SET @search = IF(p_search IS NULL OR p_search = '', '%', CONCAT('%', p_search, '%'));
    SET @author = IF(p_author IS NULL OR p_author = '', '%', p_author);
    SET @stream = IF(p_stream IS NULL OR p_stream = '', '%', p_stream);
    
    SELECT b.book_id, b.isbn, b.title, b.author, b.stream, b.publication_year, 
           b.quantity, b.available, b.price, b.publisher, b.edition, 
           b.shelf_location, b.cover_url, b.created_at,
           (SELECT COUNT(*) FROM book_copies WHERE book_id = b.book_id) as total_copies,
           (SELECT COUNT(*) FROM book_copies WHERE book_id = b.book_id AND status = 'available') as available_copies
    FROM books b
    WHERE b.is_deleted = 0
      AND (b.title LIKE @search OR b.isbn LIKE @search OR b.book_id LIKE @search OR b.author LIKE @search OR b.stream LIKE @search)
      AND (b.author LIKE @author)
      AND (b.stream LIKE @stream)
      AND (p_availability IS NULL OR p_availability = '' OR 
           (p_availability = 'in_stock' AND b.available > 0) OR
           (p_availability = 'out_of_stock' AND b.available = 0))
    ORDER BY b.created_at DESC 
    LIMIT p_limit OFFSET p_offset;
END;
        `);

        console.log('Creating proc_get_books_search_count...');
        await pool.query(`
CREATE PROCEDURE proc_get_books_search_count(
    IN p_search VARCHAR(255),
    IN p_author VARCHAR(255),
    IN p_stream VARCHAR(100),
    IN p_availability VARCHAR(20)
)
BEGIN
    SET @search = IF(p_search IS NULL OR p_search = '', '%', CONCAT('%', p_search, '%'));
    SET @author = IF(p_author IS NULL OR p_author = '', '%', p_author);
    SET @stream = IF(p_stream IS NULL OR p_stream = '', '%', p_stream);
    
    SELECT COUNT(*) as total 
    FROM books b
    WHERE b.is_deleted = 0
      AND (b.title LIKE @search OR b.isbn LIKE @search OR b.book_id LIKE @search OR b.author LIKE @search OR b.stream LIKE @search)
      AND (b.author LIKE @author)
      AND (b.stream LIKE @stream)
      AND (p_availability IS NULL OR p_availability = '' OR 
           (p_availability = 'in_stock' AND b.available > 0) OR
           (p_availability = 'out_of_stock' AND b.available = 0));
END;
        `);
        console.log('Success!');
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}
run();
