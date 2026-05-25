-- Book Module Procedures
-- Individual procedures follow

-- 1. Create a new book entry
CREATE PROCEDURE proc_create_book(
    IN p_book_id VARCHAR(50),
    IN p_isbn VARCHAR(20),
    IN p_title VARCHAR(255),
    IN p_quantity INT,
    IN p_price DECIMAL(10,2),
    IN p_author VARCHAR(255),
    IN p_stream VARCHAR(100),
    IN p_pub_year INT,
    IN p_publisher VARCHAR(255),
    IN p_edition VARCHAR(100),
    IN p_shelf VARCHAR(50),
    IN p_cover_url TEXT
)
BEGIN
    INSERT INTO books (book_id, isbn, title, quantity, available, price, author, stream, publication_year, publisher, edition, shelf_location, cover_url) 
    VALUES (p_book_id, p_isbn, p_title, p_quantity, p_quantity, p_price, p_author, p_stream, p_pub_year, p_publisher, p_edition, p_shelf, p_cover_url);
END;

/* NEXT_PROCEDURE */

-- 2. Create a book copy
CREATE PROCEDURE proc_create_book_copy(
    IN p_copy_id VARCHAR(60),
    IN p_book_id VARCHAR(50),
    IN p_status VARCHAR(20)
)
BEGIN
    INSERT IGNORE INTO book_copies (copy_id, book_id, status) 
    VALUES (p_copy_id, p_book_id, p_status);
END;

/* NEXT_PROCEDURE */

-- 3. Get books
CREATE PROCEDURE proc_get_books(
    IN p_search VARCHAR(255),
    IN p_limit INT,
    IN p_offset INT
)
BEGIN
    SET @search = IF(p_search IS NULL OR p_search = '', '%', CONCAT('%', p_search, '%'));
    
    SELECT b.book_id, b.isbn, b.title, b.author, b.stream, b.publication_year, 
           b.quantity, b.available, b.price, b.publisher, b.edition, 
           b.shelf_location, b.cover_url, b.created_at,
           (SELECT COUNT(*) FROM book_copies WHERE book_id = b.book_id) as total_copies,
           (SELECT COUNT(*) FROM book_copies WHERE book_id = b.book_id AND status = 'available') as available_copies
    FROM books b
    WHERE b.is_deleted = 0
      AND (b.title LIKE @search OR b.isbn LIKE @search OR b.book_id LIKE @search)
    ORDER BY b.created_at DESC 
    LIMIT p_limit OFFSET p_offset;
END;

/* NEXT_PROCEDURE */

-- 4. Get books search count
CREATE PROCEDURE proc_get_books_search_count(
    IN p_search VARCHAR(255)
)
BEGIN
    SET @search = IF(p_search IS NULL OR p_search = '', '%', CONCAT('%', p_search, '%'));
    
    SELECT COUNT(*) as total 
    FROM books 
    WHERE is_deleted = 0
      AND (title LIKE @search OR isbn LIKE @search OR book_id LIKE @search);
END;

/* NEXT_PROCEDURE */

-- 5. Get book copies
CREATE PROCEDURE proc_get_book_copies(IN p_book_id VARCHAR(50))
BEGIN
    SELECT copy_id, book_id, status 
    FROM book_copies 
    WHERE book_id = p_book_id 
    ORDER BY copy_id;
END;

/* NEXT_PROCEDURE */

-- 6. Get book quantity
CREATE PROCEDURE proc_get_book_quantity(IN p_book_id VARCHAR(50))
BEGIN
    SELECT quantity FROM books WHERE book_id = p_book_id;
END;

/* NEXT_PROCEDURE */

-- 7. Update book with cover
CREATE PROCEDURE proc_update_book_with_cover(
    IN p_id VARCHAR(50),
    IN p_isbn VARCHAR(20),
    IN p_title VARCHAR(255),
    IN p_quantity INT,
    IN p_price DECIMAL(10,2),
    IN p_author VARCHAR(255),
    IN p_stream VARCHAR(100),
    IN p_pub_year INT,
    IN p_publisher VARCHAR(255),
    IN p_edition VARCHAR(100),
    IN p_shelf VARCHAR(50),
    IN p_cover_url TEXT
)
BEGIN
    UPDATE books SET 
        isbn = p_isbn, title = p_title, quantity = p_quantity, price = p_price, 
        author = p_author, stream = p_stream, publication_year = p_pub_year, 
        publisher = p_publisher, edition = p_edition, shelf_location = p_shelf, 
        cover_url = p_cover_url 
    WHERE book_id = p_id;
END;

/* NEXT_PROCEDURE */

-- 8. Update book without cover
CREATE PROCEDURE proc_update_book_without_cover(
    IN p_id VARCHAR(50),
    IN p_isbn VARCHAR(20),
    IN p_title VARCHAR(255),
    IN p_quantity INT,
    IN p_price DECIMAL(10,2),
    IN p_author VARCHAR(255),
    IN p_stream VARCHAR(100),
    IN p_pub_year INT,
    IN p_publisher VARCHAR(255),
    IN p_edition VARCHAR(100),
    IN p_shelf VARCHAR(50)
)
BEGIN
    UPDATE books SET 
        isbn = p_isbn, title = p_title, quantity = p_quantity, price = p_price, 
        author = p_author, stream = p_stream, publication_year = p_pub_year, 
        publisher = p_publisher, edition = p_edition, shelf_location = p_shelf 
    WHERE book_id = p_id;
END;

/* NEXT_PROCEDURE */

-- 9. Check issued copies
CREATE PROCEDURE proc_check_issued_copies(IN p_book_id VARCHAR(50))
BEGIN
    SELECT copy_id FROM book_copies WHERE book_id = p_book_id AND status = 'issued';
END;

/* NEXT_PROCEDURE */

-- 10. Soft delete book
CREATE PROCEDURE proc_soft_delete_book(IN p_book_id VARCHAR(50))
BEGIN
    UPDATE books SET is_deleted = 1, deleted_at = NOW() WHERE book_id = p_book_id;
END;

/* NEXT_PROCEDURE */

-- 11. Get deleted books
CREATE PROCEDURE proc_get_deleted_books()
BEGIN
    SELECT book_id, title, author, isbn, stream as category, publication_year, created_at, deleted_at 
    FROM books 
    WHERE is_deleted = 1 
    ORDER BY deleted_at DESC;
END;

/* NEXT_PROCEDURE */

-- 12. Restore book
CREATE PROCEDURE proc_restore_book(IN p_book_id VARCHAR(50))
BEGIN
    UPDATE books SET is_deleted = 0, deleted_at = NULL WHERE book_id = p_book_id;
END;

/* NEXT_PROCEDURE */

-- 13. Permanent delete book
CREATE PROCEDURE proc_permanent_delete_book(IN p_book_id VARCHAR(50))
BEGIN
    DELETE FROM books WHERE book_id = p_book_id;
END;

/* NEXT_PROCEDURE */

-- 14. Get book history
CREATE PROCEDURE proc_get_book_history(IN p_book_id VARCHAR(50))
BEGIN
    SELECT i.issue_id, i.issue_date, i.due_date, i.return_date, i.status, i.fine_amount,
           m.member_id, m.name as member_name, bc.copy_id
    FROM issues i
    JOIN book_copies bc ON i.book_id = bc.copy_id
    JOIN members m ON i.member_id = m.member_id
    WHERE bc.book_id = p_book_id
    ORDER BY i.issue_date DESC
    LIMIT 50;
END;
