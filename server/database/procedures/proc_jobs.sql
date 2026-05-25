-- Background Job Procedures
-- Individual procedures follow

-- 1. Get issues due on a specific date
CREATE PROCEDURE proc_get_issues_due_on(IN p_date DATE)
BEGIN
    SELECT i.*, m.name, m.email, b.title 
    FROM issues i 
    JOIN members m ON i.member_id = m.member_id 
    JOIN book_copies bc ON i.book_id = bc.copy_id
    JOIN books b ON bc.book_id = b.book_id 
    WHERE i.due_date = p_date AND i.status = 'issued';
END;

/* NEXT_PROCEDURE */

-- 2. Get all overdue issues
CREATE PROCEDURE proc_get_issues_overdue(IN p_date DATE)
BEGIN
    SELECT i.*, m.name, m.email, b.title 
    FROM issues i 
    JOIN members m ON i.member_id = m.member_id 
    JOIN book_copies bc ON i.book_id = bc.copy_id
    JOIN books b ON bc.book_id = b.book_id 
    WHERE i.due_date < p_date AND i.status = 'issued';
END;
