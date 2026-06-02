-- Admin Module Procedures
-- Individual procedures follow

-- 1. Check if user ID exists
CREATE PROCEDURE proc_check_user_id(IN p_id VARCHAR(50))
BEGIN
    SELECT 1 FROM users WHERE id = p_id;
END;

/* NEXT_PROCEDURE */

-- 2. Create a new librarian
CREATE PROCEDURE proc_create_librarian(
    IN p_id VARCHAR(50),
    IN p_name VARCHAR(255),
    IN p_email VARCHAR(255),
    IN p_password VARCHAR(255)
)
BEGIN
    INSERT INTO users (id, name, email, password, role) 
    VALUES (p_id, p_name, p_email, p_password, 'librarian');
END;

/* NEXT_PROCEDURE */

-- 3. Get all librarians
CREATE PROCEDURE proc_get_librarians()
BEGIN
    SELECT id as lib_id, name, email, status, created_at 
    FROM users 
    WHERE role = 'librarian' 
    ORDER BY created_at DESC;
END;

/* NEXT_PROCEDURE */

-- 4. Update librarian password
CREATE PROCEDURE proc_update_librarian_password(
    IN p_id VARCHAR(50),
    IN p_password VARCHAR(255)
)
BEGIN
    UPDATE users 
    SET password = p_password 
    WHERE id = p_id AND role = 'librarian';
END;

/* NEXT_PROCEDURE */

-- 5. Delete a librarian
CREATE PROCEDURE proc_delete_librarian(IN p_id VARCHAR(50))
BEGIN
    DELETE FROM users WHERE id = p_id AND role = 'librarian';
END;

/* NEXT_PROCEDURE */

-- 6. Get total books count
CREATE PROCEDURE proc_get_total_books_count()
BEGIN
    SELECT COUNT(*) as count FROM books;
END;

/* NEXT_PROCEDURE */

-- 7. Get total members count
CREATE PROCEDURE proc_get_total_members_count()
BEGIN
    SELECT COUNT(*) as count FROM members;
END;

/* NEXT_PROCEDURE */

-- 8. Get total issued books count
CREATE PROCEDURE proc_get_total_issued_count()
BEGIN
    SELECT COUNT(*) as count FROM issues WHERE status = 'issued';
END;

/* NEXT_PROCEDURE */

-- 9. Get total returned books count
CREATE PROCEDURE proc_get_total_returned_count()
BEGIN
    SELECT COUNT(*) as count FROM issues WHERE status = 'returned';
END;

/* NEXT_PROCEDURE */

-- 10. Get overdue books count
CREATE PROCEDURE proc_get_total_overdue_count()
BEGIN
    SELECT COUNT(*) as count FROM issues WHERE status = 'issued' AND due_date < CURDATE();
END;

/* NEXT_PROCEDURE */

-- 11. Get monthly issue stats
CREATE PROCEDURE proc_get_monthly_issue_stats(IN p_year INT)
BEGIN
    SELECT MONTH(issue_date) as month, COUNT(*) as count 
    FROM issues 
    WHERE YEAR(issue_date) = p_year 
    GROUP BY MONTH(issue_date);
END;

/* NEXT_PROCEDURE */

-- 12. Get monthly member registration stats
CREATE PROCEDURE proc_get_monthly_member_stats(IN p_year INT)
BEGIN
    SELECT MONTH(created_at) as month, COUNT(*) as count 
    FROM members 
    WHERE YEAR(created_at) = p_year 
    GROUP BY MONTH(created_at);
END;

/* NEXT_PROCEDURE */

-- 13. Get book condition stats
CREATE PROCEDURE proc_get_book_condition_stats()
BEGIN
    SELECT status, COUNT(*) as count FROM book_copies GROUP BY status;
END;

/* NEXT_PROCEDURE */

-- 14. Get borrow rate by stream
CREATE PROCEDURE proc_get_borrow_rate_by_stream()
BEGIN
    SELECT COALESCE(b.stream, 'General') as stream, COUNT(i.issue_id) as count 
    FROM issues i 
    JOIN book_copies bc ON i.book_id = bc.copy_id 
    JOIN books b ON bc.book_id = b.book_id 
    GROUP BY b.stream 
    ORDER BY count DESC 
    LIMIT 9;
END;

/* NEXT_PROCEDURE */

-- 15. Get restricted members count
CREATE PROCEDURE proc_get_restricted_members_count()
BEGIN
    SELECT COUNT(DISTINCT m.member_id) as count 
    FROM members m 
    JOIN issues i ON m.member_id = i.member_id 
    WHERE i.status = 'issued' AND i.due_date < CURDATE();
END;

/* NEXT_PROCEDURE */

-- 16. Get popular books
CREATE PROCEDURE proc_get_popular_books()
BEGIN
    SELECT b.title, b.author, COUNT(i.issue_id) as borrow_count 
    FROM issues i 
    JOIN book_copies bc ON i.book_id = bc.copy_id 
    JOIN books b ON bc.book_id = b.book_id 
    GROUP BY b.book_id, b.title, b.author 
    ORDER BY borrow_count DESC 
    LIMIT 5;
END;

/* NEXT_PROCEDURE */

-- 17. Update librarian status
CREATE PROCEDURE proc_update_librarian_status(
    IN p_id VARCHAR(50),
    IN p_status VARCHAR(20)
)
BEGIN
    UPDATE users SET status = p_status WHERE id = p_id AND role = 'librarian';
END;

/* NEXT_PROCEDURE */

-- 18. Get active sessions for a user
CREATE PROCEDURE proc_get_active_sessions(IN p_user_id VARCHAR(50))
BEGIN
    SELECT token FROM user_login_sessions WHERE user_id = p_user_id AND session_status = 'online';
END;

/* NEXT_PROCEDURE */

-- 19. Blacklist a token
CREATE PROCEDURE proc_blacklist_token(
    IN p_token VARCHAR(255),
    IN p_user_id VARCHAR(50)
)
BEGIN
    INSERT IGNORE INTO token_blacklist (token, user_id, status, logout_time) 
    VALUES (p_token, p_user_id, 'inactive', NOW());
END;

/* NEXT_PROCEDURE */

-- 20. Terminate all active sessions for a user
CREATE PROCEDURE proc_terminate_user_sessions(IN p_user_id VARCHAR(50))
BEGIN
    UPDATE user_login_sessions 
    SET session_status = 'offline', logout_time = NOW() 
    WHERE user_id = p_user_id AND session_status = 'online';
END;

/* NEXT_PROCEDURE */

-- 21. Get total books quantity
CREATE PROCEDURE proc_get_total_books_quantity()
BEGIN
    SELECT SUM(quantity) as count FROM books;
END;

/* NEXT_PROCEDURE */

-- 22. Get total librarians count
CREATE PROCEDURE proc_get_total_librarians_count()
BEGIN
    SELECT COUNT(*) as count FROM users WHERE role = 'librarian';
END;

/* NEXT_PROCEDURE */

-- 23. Get total admins count
CREATE PROCEDURE proc_get_total_admins_count()
BEGIN
    SELECT COUNT(*) as count FROM users WHERE role = 'admin';
END;

/* NEXT_PROCEDURE */

-- 24. Get book categories stats
CREATE PROCEDURE proc_get_book_categories_stats()
BEGIN
    SELECT COALESCE(stream, 'General') as category, COUNT(*) as count 
    FROM books 
    GROUP BY stream 
    ORDER BY count DESC 
    LIMIT 6;
END;

/* NEXT_PROCEDURE */

-- 25. Get popular books with cover
CREATE PROCEDURE proc_get_popular_books_with_cover()
BEGIN
    SELECT b.title, b.author, COUNT(i.issue_id) as count, b.cover_url
    FROM issues i 
    JOIN book_copies bc ON i.book_id = bc.copy_id 
    JOIN books b ON bc.book_id = b.book_id 
    GROUP BY b.book_id, b.title, b.author, b.cover_url 
    ORDER BY count DESC 
    LIMIT 5;
END;

/* NEXT_PROCEDURE */

-- 26. Get recent activities
CREATE PROCEDURE proc_get_recent_activities()
BEGIN
    SELECT 'issue' as type, b.title, m.name as user_name, i.issue_date as date 
    FROM issues i 
    JOIN book_copies bc ON i.book_id = bc.copy_id 
    JOIN books b ON bc.book_id = b.book_id 
    JOIN members m ON i.member_id = m.member_id 
    ORDER BY i.issue_date DESC 
    LIMIT 5;
END;

/* NEXT_PROCEDURE */

-- 27. Get overdue details
CREATE PROCEDURE proc_get_overdue_details()
BEGIN
    SELECT m.name as member_name, m.member_id, b.title as book_title, i.issue_date, i.due_date,
           DATEDIFF(CURDATE(), i.due_date) as overdue_days, i.fine_amount
    FROM issues i 
    JOIN book_copies bc ON i.book_id = bc.copy_id 
    JOIN books b ON bc.book_id = b.book_id 
    JOIN members m ON i.member_id = m.member_id 
    WHERE i.status = 'issued' AND i.due_date < CURDATE()
    ORDER BY overdue_days DESC 
    LIMIT 10;
END;

/* NEXT_PROCEDURE */

-- 28. Get total unpaid fine
CREATE PROCEDURE proc_get_total_unpaid_fine()
BEGIN
    SELECT SUM(fine_amount) as total FROM issues WHERE fine_paid = 0;
END;

/* NEXT_PROCEDURE */

-- 29. Get total categories count
CREATE PROCEDURE proc_get_total_categories_count()
BEGIN
    SELECT COUNT(DISTINCT stream) as count FROM books;
END;

/* NEXT_PROCEDURE */

-- 30. Get total authors count
CREATE PROCEDURE proc_get_total_authors_count()
BEGIN
    SELECT COUNT(DISTINCT author) as count FROM books;
END;

/* NEXT_PROCEDURE */

-- 31. Get new books count this month
CREATE PROCEDURE proc_get_new_books_count_this_month()
BEGIN
    SELECT COUNT(*) as count 
    FROM books 
    WHERE MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE());
END;

/* NEXT_PROCEDURE */

-- 32. Get audit logs count
CREATE PROCEDURE proc_get_total_audit_logs_count()
BEGIN
    SELECT COUNT(*) as total FROM audit_logs;
END;

/* NEXT_PROCEDURE */

-- 33. Get audit logs
CREATE PROCEDURE proc_get_audit_logs(
    IN p_limit INT,
    IN p_offset INT
)
BEGIN
    SELECT a.*, u.name as user_name, u.email as user_email
    FROM audit_logs a 
    LEFT JOIN users u ON a.user_id = u.id 
    ORDER BY a.created_at DESC 
    LIMIT p_limit OFFSET p_offset;
END;

/* NEXT_PROCEDURE */

-- 34. Import book
CREATE PROCEDURE proc_import_book(
    IN p_title VARCHAR(255),
    IN p_author VARCHAR(255),
    IN p_isbn VARCHAR(20),
    IN p_category VARCHAR(100),
    IN p_quantity INT,
    IN p_available INT,
    IN p_price DECIMAL(10,2),
    IN p_shelf VARCHAR(50)
)
BEGIN
    INSERT INTO books (title, author, isbn, category, quantity, available, price, shelf_location) 
    VALUES (p_title, p_author, p_isbn, p_category, p_quantity, p_available, p_price, p_shelf);
END;

/* NEXT_PROCEDURE */

-- 35. Import member
CREATE PROCEDURE proc_import_member(
    IN p_id VARCHAR(50),
    IN p_name VARCHAR(255),
    IN p_email VARCHAR(255),
    IN p_phone VARCHAR(20),
    IN p_address TEXT,
    IN p_status VARCHAR(20)
)
BEGIN
    INSERT INTO members (member_id, name, email, phone, address, status) 
    VALUES (p_id, p_name, p_email, p_phone, p_address, p_status);
END;

/* NEXT_PROCEDURE */

-- 36. Cleanup captchas
CREATE PROCEDURE proc_cleanup_captchas()
BEGIN
    DELETE FROM captchas WHERE created_at < DATE_SUB(NOW(), INTERVAL 10 MINUTE);
END;

/* NEXT_PROCEDURE */

-- 37. Create captcha
CREATE PROCEDURE proc_create_captcha(
    IN p_id VARCHAR(50),
    IN p_text VARCHAR(10)
)
BEGIN
    INSERT INTO captchas (id, text) VALUES (p_id, p_text);
END;
