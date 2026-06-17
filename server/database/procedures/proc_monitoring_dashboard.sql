-- Dashboard Monitoring KPI Procedures

CREATE PROCEDURE proc_get_monitoring_kpis()
BEGIN
    -- This procedure returns multiple result sets, or one consolidated row.
    -- We will return one consolidated row.
    
    DECLARE v_totalBorrowed INT;
    DECLARE v_dueToday INT;
    DECLARE v_overdue INT;
    DECLARE v_criticalDelay INT;
    DECLARE v_pendingFines DECIMAL(10,2);
    DECLARE v_membersWithOverdue INT;
    DECLARE v_mostBorrowedBook VARCHAR(200);
    DECLARE v_shortageAlerts INT;

    -- Total Borrowed
    SELECT COUNT(*) INTO v_totalBorrowed FROM issues WHERE status = 'issued';
    
    -- Due Today
    SELECT COUNT(*) INTO v_dueToday FROM issues WHERE status = 'issued' AND due_date = CURRENT_DATE();
    
    -- Overdue
    SELECT COUNT(*) INTO v_overdue FROM issues WHERE status = 'issued' AND due_date < CURRENT_DATE();
    
    -- Critical Delay (30+ days)
    SELECT COUNT(*) INTO v_criticalDelay FROM issues WHERE status = 'issued' AND DATEDIFF(CURRENT_DATE(), due_date) >= 30;
    
    -- Pending Fines (Sum of fine_amount for unpaid fines on returned/lost/issued books)
    SELECT COALESCE(SUM(fine_amount), 0) INTO v_pendingFines FROM issues WHERE fine_paid = 0 AND fine_amount > 0;
    
    -- Members with Overdue
    SELECT COUNT(DISTINCT member_id) INTO v_membersWithOverdue FROM issues WHERE status = 'issued' AND due_date < CURRENT_DATE();
    
    -- Most Borrowed Book
    SELECT b.title INTO v_mostBorrowedBook 
    FROM issues i 
    JOIN books b ON i.book_id = b.book_id 
    GROUP BY i.book_id, b.title 
    ORDER BY COUNT(*) DESC LIMIT 1;
    
    -- Shortage Alerts (books with 0 available but > 0 quantity, and have active pending waitlist)
    SELECT COUNT(DISTINCT b.book_id) INTO v_shortageAlerts 
    FROM books b
    JOIN reservations r ON b.book_id = r.book_id AND r.status = 'pending'
    WHERE b.available = 0 AND b.quantity > 0;

    SELECT 
        v_totalBorrowed as totalBorrowed,
        v_dueToday as dueToday,
        v_overdue as overdue,
        v_criticalDelay as criticalDelay,
        v_pendingFines as pendingFines,
        v_membersWithOverdue as membersWithOverdue,
        v_mostBorrowedBook as mostBorrowedBook,
        v_shortageAlerts as shortageAlerts;
END;

/* NEXT_PROCEDURE */

CREATE PROCEDURE proc_get_overdue_members_list()
BEGIN
    SELECT 
        i.issue_id as id,
        m.member_id as memberId,
        m.name,
        m.email,
        m.phone as mobile,
        m.membership_type as type,
        b.title as bookName,
        b.isbn,
        i.issue_date as borrowDate,
        i.due_date as dueDate,
        DATEDIFF(CURRENT_DATE(), i.due_date) as daysOverdue,
        i.fine_amount as fineAmount,
        m.photo_url as avatar
    FROM issues i
    JOIN members m ON i.member_id = m.member_id
    JOIN books b ON i.book_id = b.book_id
    WHERE i.status = 'issued' AND i.due_date <= CURRENT_DATE() + INTERVAL 2 DAY
    ORDER BY i.due_date ASC;
END;

/* NEXT_PROCEDURE */

CREATE PROCEDURE proc_get_book_shortages()
BEGIN
    SELECT 
        b.book_id as id,
        b.cover_url as cover,
        b.title,
        b.author,
        b.publisher,
        b.quantity as totalCopies,
        b.available as availableCopies,
        (b.quantity - b.available) as borrowedCopies,
        (SELECT COUNT(*) FROM reservations r WHERE r.book_id = b.book_id AND r.status = 'pending') as waitingRequests,
        (SELECT MAX(DATEDIFF(CURRENT_DATE(), i.due_date)) FROM issues i WHERE i.book_id = b.book_id AND i.status = 'issued') as daysOutOfStock,
        (SELECT MIN(i.due_date) FROM issues i WHERE i.book_id = b.book_id AND i.status = 'issued') as expectedReturnDate
    FROM books b
    WHERE b.available = 0 AND b.quantity > 0
    HAVING waitingRequests > 0
    ORDER BY waitingRequests DESC, daysOutOfStock DESC;
END;

/* NEXT_PROCEDURE */

CREATE PROCEDURE proc_get_repeat_offenders()
BEGIN
    SELECT 
        m.member_id as id,
        m.name,
        m.photo_url as avatar,
        COUNT(i.issue_id) as totalBorrowed,
        SUM(CASE WHEN i.return_date > i.due_date OR (i.status = 'issued' AND CURRENT_DATE() > i.due_date) THEN 1 ELSE 0 END) as lateReturns,
        ROUND(AVG(CASE WHEN i.return_date > i.due_date THEN DATEDIFF(i.return_date, i.due_date)
                       WHEN i.status = 'issued' AND CURRENT_DATE() > i.due_date THEN DATEDIFF(CURRENT_DATE(), i.due_date)
                       ELSE 0 END), 0) as avgDelayDays,
        (SELECT SUM(fine_amount) FROM issues WHERE member_id = m.member_id AND fine_paid = 1) as totalFinesPaid
    FROM members m
    JOIN issues i ON m.member_id = i.member_id
    GROUP BY m.member_id, m.name, m.photo_url
    HAVING lateReturns >= 2 OR avgDelayDays > 5
    ORDER BY lateReturns DESC, avgDelayDays DESC;
END;

/* NEXT_PROCEDURE */

CREATE PROCEDURE proc_get_fine_management_stats()
BEGIN
    DECLARE v_totalOutstanding DECIMAL(10,2);
    DECLARE v_collectedThisMonth DECIMAL(10,2);
    DECLARE v_pendingFinesCount INT;

    SELECT COALESCE(SUM(fine_amount), 0), COUNT(DISTINCT member_id) 
    INTO v_totalOutstanding, v_pendingFinesCount 
    FROM issues 
    WHERE fine_paid = 0 AND fine_amount > 0;

    -- Note: This is an approximation as we don't have a payments table, we assume 'return_date' in current month and fine_paid=1 means collected this month.
    SELECT COALESCE(SUM(fine_amount), 0) 
    INTO v_collectedThisMonth 
    FROM issues 
    WHERE fine_paid = 1 AND fine_amount > 0 AND MONTH(return_date) = MONTH(CURRENT_DATE()) AND YEAR(return_date) = YEAR(CURRENT_DATE());

    SELECT 
        v_totalOutstanding as totalOutstanding,
        v_collectedThisMonth as collectedThisMonth,
        v_pendingFinesCount as pendingFinesCount;
END;

/* NEXT_PROCEDURE */

CREATE PROCEDURE proc_get_recent_fine_collections()
BEGIN
    SELECT 
        CONCAT('TRX-', i.issue_id) as id,
        m.name as member,
        i.fine_amount as amount,
        i.return_date as date,
        'Paid' as status
    FROM issues i
    JOIN members m ON i.member_id = m.member_id
    WHERE i.fine_paid = 1 AND i.fine_amount > 0
    ORDER BY i.return_date DESC
    LIMIT 10;
END;

/* NEXT_PROCEDURE */

CREATE PROCEDURE proc_get_visual_analytics_trends()
BEGIN
    -- We can just execute the queries and return results
    SELECT 
        MONTHNAME(issue_date) as month,
        COUNT(*) as borrowed,
        SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END) as returned
    FROM issues
    WHERE issue_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 MONTH)
    GROUP BY MONTH(issue_date), MONTHNAME(issue_date), YEAR(issue_date)
    ORDER BY YEAR(issue_date) ASC, MONTH(issue_date) ASC;
END;

/* NEXT_PROCEDURE */

CREATE PROCEDURE proc_get_category_delays()
BEGIN
    SELECT 
        b.stream as category,
        ROUND((SUM(CASE WHEN i.return_date > i.due_date OR (i.status = 'issued' AND CURRENT_DATE() > i.due_date) THEN 1 ELSE 0 END) / COUNT(i.issue_id)) * 100, 0) as delayPercent
    FROM issues i
    JOIN books b ON i.book_id = b.book_id
    WHERE b.stream IS NOT NULL AND b.stream != ''
    GROUP BY b.stream
    ORDER BY delayPercent DESC
    LIMIT 5;
END;
