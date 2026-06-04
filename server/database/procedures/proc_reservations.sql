-- Book Reservations Procedures

CREATE PROCEDURE proc_create_reservation(
    IN p_member_id VARCHAR(50),
    IN p_book_id VARCHAR(50)
)
BEGIN
    INSERT INTO reservations (member_id, book_id) VALUES (p_member_id, p_book_id);
END;

/* NEXT_PROCEDURE */

CREATE PROCEDURE proc_get_waitlist_for_book(
    IN p_book_id VARCHAR(50)
)
BEGIN
    SELECT r.*, m.name as member_name, m.email as member_email
    FROM reservations r
    JOIN members m ON r.member_id = m.member_id
    WHERE r.book_id = p_book_id AND r.status = 'pending'
    ORDER BY r.created_at ASC;
END;

/* NEXT_PROCEDURE */

CREATE PROCEDURE proc_fulfill_reservation(
    IN p_reservation_id INT
)
BEGIN
    UPDATE reservations SET status = 'fulfilled', fulfilled_at = CURRENT_TIMESTAMP WHERE reservation_id = p_reservation_id;
END;

/* NEXT_PROCEDURE */

CREATE PROCEDURE proc_cancel_reservation(
    IN p_reservation_id INT
)
BEGIN
    UPDATE reservations SET status = 'cancelled' WHERE reservation_id = p_reservation_id;
END;

/* NEXT_PROCEDURE */

CREATE PROCEDURE proc_get_all_waitlists()
BEGIN
    SELECT r.reservation_id, r.created_at, r.status,
           m.member_id, m.name as member_name, m.email as member_email,
           b.book_id, b.title as book_title, b.author as book_author
    FROM reservations r
    JOIN members m ON r.member_id = m.member_id
    JOIN books b ON r.book_id = b.book_id
    WHERE r.status = 'pending'
    ORDER BY r.created_at ASC;
END;
