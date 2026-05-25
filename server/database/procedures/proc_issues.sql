-- Circulation/Issue Module Procedures
-- Individual procedures follow

-- 1. Check eligibility to issue a book
CREATE PROCEDURE proc_check_issue_eligibility(IN p_member_id VARCHAR(50), IN p_copy_id VARCHAR(60))
BEGIN
    -- Return member info, copy info, existing issues of same book, total unpaid fine, and current issue count
    -- This is a complex check procedure to reduce multiple round-trips
    
    -- Member Check
    SELECT * FROM members WHERE member_id = p_member_id;
    
    -- Copy Check
    SELECT * FROM book_copies WHERE copy_id = p_copy_id;
    
    -- Already Issued Check (same book, different copy)
    SET @actual_book_id = (SELECT book_id FROM book_copies WHERE copy_id = p_copy_id);
    SELECT i.* FROM issues i
    JOIN book_copies bc ON i.book_id = bc.copy_id
    WHERE i.member_id = p_member_id AND bc.book_id = @actual_book_id AND i.status = 'issued';
    
    -- Fine Check
    SELECT SUM(fine_amount) as total_unpaid FROM issues WHERE member_id = p_member_id AND fine_paid = 0;
    
    -- Issue Count Check
    SELECT COUNT(*) as count FROM issues WHERE member_id = p_member_id AND status = 'issued';
END;

/* NEXT_PROCEDURE */

-- 2. Issue a book copy
CREATE PROCEDURE proc_issue_book(
    IN p_member_id VARCHAR(50),
    IN p_copy_id VARCHAR(60),
    IN p_issue_date DATE,
    IN p_due_date DATE
)
BEGIN
    INSERT INTO issues (book_id, member_id, issue_date, due_date) VALUES (p_copy_id, p_member_id, p_issue_date, p_due_date);
    UPDATE book_copies SET status = 'issued' WHERE copy_id = p_copy_id;
END;

/* NEXT_PROCEDURE */

-- 3. Get issue details for renewal/return
CREATE PROCEDURE proc_get_issue_details(IN p_issue_id INT)
BEGIN
    SELECT i.*, bc.book_id as actual_book_id 
    FROM issues i 
    JOIN book_copies bc ON i.book_id = bc.copy_id 
    WHERE i.issue_id = p_issue_id;
END;

/* NEXT_PROCEDURE */

-- 4. Find other available copies of the same book
CREATE PROCEDURE proc_find_available_copies(IN p_book_id VARCHAR(50))
BEGIN
    SELECT * FROM book_copies WHERE book_id = p_book_id AND status = 'available' LIMIT 1;
END;

/* NEXT_PROCEDURE */

-- 5. Renew book by swapping with another copy
CREATE PROCEDURE proc_renew_book_with_swap(
    IN p_old_issue_id INT,
    IN p_old_copy_id VARCHAR(60),
    IN p_new_copy_id VARCHAR(60),
    IN p_member_id VARCHAR(50),
    IN p_return_date DATE,
    IN p_new_due_date DATE
)
BEGIN
    -- Return old copy
    UPDATE issues SET return_date = p_return_date, fine_amount = 0, status = 'returned' WHERE issue_id = p_old_issue_id;
    UPDATE book_copies SET status = 'available' WHERE copy_id = p_old_copy_id;
    
    -- Issue new copy
    INSERT INTO issues (book_id, member_id, issue_date, due_date) VALUES (p_new_copy_id, p_member_id, p_return_date, p_new_due_date);
    UPDATE book_copies SET status = 'issued' WHERE copy_id = p_new_copy_id;
END;

/* NEXT_PROCEDURE */

-- 6. Renew book by simple extension
CREATE PROCEDURE proc_renew_book_simple(IN p_issue_id INT, IN p_new_due_date DATE)
BEGIN
    UPDATE issues SET due_date = p_new_due_date WHERE issue_id = p_issue_id;
END;

/* NEXT_PROCEDURE */

-- 7. Return a book copy
CREATE PROCEDURE proc_return_book(
    IN p_issue_id INT,
    IN p_copy_id VARCHAR(60),
    IN p_return_date DATE,
    IN p_fine DECIMAL(10,2)
)
BEGIN
    UPDATE issues SET return_date = p_return_date, fine_amount = p_fine, status = 'returned' WHERE issue_id = p_issue_id;
    UPDATE book_copies SET status = 'available' WHERE copy_id = p_copy_id;
END;

/* NEXT_PROCEDURE */

-- 8. Mark book as lost
CREATE PROCEDURE proc_mark_as_lost(
    IN p_issue_id INT,
    IN p_fine DECIMAL(10,2)
)
BEGIN
    -- Note: We don't mark the copy as available. It stays 'issued' or we could add a 'lost' status.
    UPDATE issues SET fine_amount = p_fine, status = 'lost' WHERE issue_id = p_issue_id;
    UPDATE book_copies SET status = 'lost' WHERE copy_id = (SELECT book_id FROM issues WHERE issue_id = p_issue_id);
END;

/* NEXT_PROCEDURE */

-- 9. Get details for lost book notification
CREATE PROCEDURE proc_get_lost_book_details(IN p_issue_id INT)
BEGIN
    SELECT i.*, b.price, b.title as book_title, m.name as member_name, m.email as member_email
    FROM issues i
    JOIN book_copies bc ON i.book_id = bc.copy_id
    JOIN books b ON bc.book_id = b.book_id
    JOIN members m ON i.member_id = m.member_id
    WHERE i.issue_id = p_issue_id;
END;

/* NEXT_PROCEDURE */

-- 10. Get all active issues
CREATE PROCEDURE proc_get_active_issues()
BEGIN
    SELECT i.issue_id, i.issue_date, i.due_date, i.status, i.fine_amount, i.fine_paid, i.created_at,
           m.member_id, m.name as member_name, m.email as member_email, m.phone as member_phone,
           m.department as member_dept, m.course as member_course, m.membership_type, m.photo_url as member_photo,
           m.academic_session, m.guardian_name, m.guardian_phone,
           bc.copy_id as book_id, b.title as book_title, b.author as book_author, b.stream as book_stream, 
           b.price as book_price, b.isbn, b.publisher, b.shelf_location
    FROM issues i
    JOIN members m ON i.member_id = m.member_id
    JOIN book_copies bc ON i.book_id = bc.copy_id
    JOIN books b ON bc.book_id = b.book_id
    WHERE i.status = 'issued'
    ORDER BY i.issue_date DESC;
END;

/* NEXT_PROCEDURE */

-- 11. Get issue history
CREATE PROCEDURE proc_get_issue_history()
BEGIN
    SELECT i.issue_id, i.issue_date, i.due_date, i.return_date, i.status, i.fine_amount, i.fine_paid, i.created_at,
           m.member_id, m.name as member_name, m.email as member_email, m.phone as member_phone, 
           m.department as member_dept, m.course as member_course, m.photo_url as member_photo,
           m.academic_session, m.guardian_name, m.guardian_phone,
           bc.copy_id as book_id, b.title as book_title, b.price as book_price, b.isbn, 
           b.author as book_author, b.stream as book_stream, b.publisher, b.shelf_location
    FROM issues i
    JOIN members m ON i.member_id = m.member_id
    JOIN book_copies bc ON i.book_id = bc.copy_id
    JOIN books b ON bc.book_id = b.book_id
    WHERE i.status IN ('returned', 'lost')
    ORDER BY i.return_date DESC;
END;

/* NEXT_PROCEDURE */

-- 12. Get issue details for fine payment
CREATE PROCEDURE proc_get_issue_for_payment(IN p_issue_id INT)
BEGIN
    SELECT i.*, m.name as member_name, m.email as member_email, b.title as book_title
    FROM issues i
    JOIN members m ON i.member_id = m.member_id
    JOIN book_copies bc ON i.book_id = bc.copy_id
    JOIN books b ON bc.book_id = b.book_id
    WHERE i.issue_id = p_issue_id;
END;

/* NEXT_PROCEDURE */

-- 13. Pay fine
CREATE PROCEDURE proc_pay_fine(IN p_issue_id INT)
BEGIN
    UPDATE issues SET fine_paid = 1 WHERE issue_id = p_issue_id;
END;

/* NEXT_PROCEDURE */

-- 14. Find active issue by book copy ID (Barcode)
CREATE PROCEDURE proc_find_active_issue_by_copy(IN p_copy_id VARCHAR(60))
BEGIN
    SELECT * FROM issues WHERE book_id = p_copy_id AND status = 'issued';
END;

/* NEXT_PROCEDURE */

-- 15. Lookup full issue details by copy ID
CREATE PROCEDURE proc_lookup_issue_by_copy(IN p_copy_id VARCHAR(60))
BEGIN
    SELECT i.issue_id, i.issue_date, i.due_date, i.fine_amount,
           m.member_id, m.name as member_name, m.photo_url as member_photo,
           m.phone as member_phone, m.email as member_email, m.department as member_dept, m.roll_number as member_roll,
           m.course as member_course, m.year_semester as member_sem, m.membership_type as member_type,
           m.academic_session as member_session, m.account_status, m.no_dues_status,
           bc.copy_id, b.title as book_title, b.cover_url as book_cover,
           b.author as book_author, b.isbn as book_isbn, b.stream as book_category, b.price as book_price, b.publication_year,
           NULL as book_publisher, NULL as book_edition, NULL as book_shelf
    FROM issues i
    JOIN members m ON i.member_id = m.member_id
    JOIN book_copies bc ON i.book_id = bc.copy_id
    JOIN books b ON bc.book_id = b.book_id
    WHERE bc.copy_id = p_copy_id AND i.status = 'issued';
END;

/* NEXT_PROCEDURE */

-- 16. Get all issues with fines or lost status
CREATE PROCEDURE proc_get_fines_and_lost()
BEGIN
    SELECT i.issue_id, i.issue_date, i.due_date, i.return_date, i.status, i.fine_amount, i.fine_paid, i.created_at,
           m.member_id, m.name as member_name, m.email as member_email, m.phone as member_phone, m.department as member_dept, m.course as member_course, m.photo_url as member_photo, m.academic_session, m.guardian_name, m.guardian_phone,
           bc.copy_id as book_id, b.title as book_title, b.price as book_price, b.author as book_author, b.stream as book_stream, b.isbn, b.publication_year, b.publisher, b.shelf_location
    FROM issues i
    JOIN members m ON i.member_id = m.member_id
    JOIN book_copies bc ON i.book_id = bc.copy_id
    JOIN books b ON bc.book_id = b.book_id
    WHERE i.status = 'lost' OR i.fine_amount > 0 OR (i.status = 'issued' AND i.due_date < CURDATE())
    ORDER BY CASE WHEN i.status = 'issued' THEN 0 ELSE 1 END, i.due_date ASC;
END;
