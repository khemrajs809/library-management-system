-- Member Module Procedures
-- Individual procedures follow

-- 1. Check if email exists for another member
CREATE PROCEDURE proc_check_member_email(IN p_email VARCHAR(255), IN p_exclude_id VARCHAR(50))
BEGIN
    IF p_exclude_id IS NULL THEN
        SELECT member_id FROM members WHERE email = p_email AND is_deleted = 0;
    ELSE
        SELECT member_id FROM members WHERE email = p_email AND member_id != p_exclude_id AND is_deleted = 0;
    END IF;
END;

/* NEXT_PROCEDURE */

-- 2. Create a new member
CREATE PROCEDURE proc_create_member(
    IN p_id VARCHAR(50), IN p_name VARCHAR(255), IN p_dob DATE, IN p_gender VARCHAR(20),
    IN p_phone VARCHAR(20), IN p_email VARCHAR(255), IN p_perm_addr TEXT, IN p_curr_addr TEXT,
    IN p_c_house VARCHAR(50), IN p_c_street VARCHAR(100), IN p_c_area VARCHAR(100), IN p_c_city VARCHAR(100), IN p_c_state VARCHAR(100), IN p_c_pincode VARCHAR(20),
    IN p_p_house VARCHAR(50), IN p_p_street VARCHAR(100), IN p_p_area VARCHAR(100), IN p_p_city VARCHAR(100), IN p_p_state VARCHAR(100), IN p_p_pincode VARCHAR(20),
    IN p_course VARCHAR(100), IN p_dept VARCHAR(100), IN p_year_sem VARCHAR(50),
    IN p_type VARCHAR(50), IN p_no_dues TINYINT, IN p_roll VARCHAR(50), IN p_session VARCHAR(50), IN p_hod VARCHAR(255),
    IN p_g_name VARCHAR(255), IN p_g_phone VARCHAR(20), IN p_blood VARCHAR(10),
    IN p_expiry DATE, IN p_limit INT, IN p_status VARCHAR(20),
    IN p_photo TEXT, IN p_govt_id TEXT, IN p_receipt TEXT, IN p_deposit TEXT
)
BEGIN
    INSERT INTO members (
        member_id, name, dob, gender, phone, email, permanent_address, current_address,
        curr_house, curr_street, curr_area, curr_city, curr_state, curr_pincode,
        perm_house, perm_street, perm_area, perm_city, perm_state, perm_pincode,
        course, department, year_semester, membership_type, no_dues_status,
        roll_number, academic_session, hod_name, guardian_name, guardian_phone, blood_group,
        membership_expiry, max_book_limit, account_status,
        photo_url, govt_id_url, admission_receipt_url, security_deposit_url
    ) VALUES (
        p_id, p_name, p_dob, p_gender, p_phone, p_email, p_perm_addr, p_curr_addr,
        p_c_house, p_c_street, p_c_area, p_c_city, p_c_state, p_c_pincode,
        p_p_house, p_p_street, p_p_area, p_p_city, p_p_state, p_p_pincode,
        p_course, p_dept, p_year_sem, p_type, p_no_dues,
        p_roll, p_session, p_hod, p_g_name, p_g_phone, p_blood,
        p_expiry, p_limit, p_status,
        p_photo, p_govt_id, p_receipt, p_deposit
    );
END;

/* NEXT_PROCEDURE */

-- 3. Get recent member activities
CREATE PROCEDURE proc_get_member_recent_activities()
BEGIN
    SELECT log_id as id, action, user_id as performed_by, created_at 
    FROM audit_logs 
    WHERE action LIKE '%Member%' 
    ORDER BY created_at DESC 
    LIMIT 5;
END;

/* NEXT_PROCEDURE */

-- 4. Get members with optional search and pagination
CREATE PROCEDURE proc_get_members(
    IN p_search VARCHAR(255),
    IN p_limit INT,
    IN p_offset INT
)
BEGIN
    SET @search = IF(p_search IS NULL OR p_search = '', '%', CONCAT('%', p_search, '%'));
    
    SELECT member_id, name, dob, gender, phone, email, permanent_address, current_address, 
           curr_house, curr_street, curr_area, curr_city, curr_state, curr_pincode,
           perm_house, perm_street, perm_area, perm_city, perm_state, perm_pincode,
           course, department, year_semester, membership_type, no_dues_status, 
           roll_number, academic_session, hod_name, guardian_name, guardian_phone, blood_group, 
           membership_expiry, max_book_limit, account_status, photo_url, created_at
    FROM members 
    WHERE is_deleted = 0 AND (name LIKE @search OR member_id LIKE @search OR phone LIKE @search) 
    ORDER BY created_at DESC 
    LIMIT p_limit OFFSET p_offset;
END;

/* NEXT_PROCEDURE */

-- 5. Get members count with search
CREATE PROCEDURE proc_get_members_count(IN p_search VARCHAR(255))
BEGIN
    SET @search = IF(p_search IS NULL OR p_search = '', '%', CONCAT('%', p_search, '%'));
    SELECT COUNT(*) as total FROM members 
    WHERE is_deleted = 0 AND (name LIKE @search OR member_id LIKE @search OR phone LIKE @search);
END;

/* NEXT_PROCEDURE */

-- 6. Get single member details
CREATE PROCEDURE proc_get_member(IN p_id VARCHAR(50))
BEGIN
    SELECT member_id, name, dob, gender, phone, email, permanent_address, current_address, 
           curr_house, curr_street, curr_area, curr_city, curr_state, curr_pincode,
           perm_house, perm_street, perm_area, perm_city, perm_state, perm_pincode,
           course, department, year_semester, membership_type, no_dues_status, 
           roll_number, academic_session, hod_name, guardian_name, guardian_phone, blood_group, 
           membership_expiry, max_book_limit, account_status, photo_url, created_at
    FROM members 
    WHERE member_id = p_id;
END;

/* NEXT_PROCEDURE */

-- 7. Get member borrowing history
CREATE PROCEDURE proc_get_member_history(IN p_id VARCHAR(50))
BEGIN
    SELECT i.issue_id, i.issue_date, i.due_date, i.return_date, i.status, i.fine_amount, i.fine_paid,
           b.book_id, b.title as book_title, b.isbn
    FROM issues i
    JOIN book_copies bc ON i.book_id = bc.copy_id
    JOIN books b ON bc.book_id = b.book_id
    WHERE i.member_id = p_id
    ORDER BY i.issue_date DESC;
END;

/* NEXT_PROCEDURE */

-- 8. Update member details
CREATE PROCEDURE proc_update_member(
    IN p_id VARCHAR(50), IN p_name VARCHAR(255), IN p_dob DATE, IN p_gender VARCHAR(20),
    IN p_phone VARCHAR(20), IN p_email VARCHAR(255), IN p_perm_addr TEXT, IN p_curr_addr TEXT,
    IN p_c_house VARCHAR(50), IN p_c_street VARCHAR(100), IN p_c_area VARCHAR(100), IN p_c_city VARCHAR(100), IN p_c_state VARCHAR(100), IN p_c_pincode VARCHAR(20),
    IN p_p_house VARCHAR(50), IN p_p_street VARCHAR(100), IN p_p_area VARCHAR(100), IN p_p_city VARCHAR(100), IN p_p_state VARCHAR(100), IN p_p_pincode VARCHAR(20),
    IN p_course VARCHAR(100), IN p_dept VARCHAR(100), IN p_year_sem VARCHAR(50),
    IN p_type VARCHAR(50), IN p_no_dues TINYINT, IN p_roll VARCHAR(50), IN p_session VARCHAR(50), IN p_hod VARCHAR(255),
    IN p_g_name VARCHAR(255), IN p_g_phone VARCHAR(20), IN p_blood VARCHAR(10),
    IN p_expiry DATE, IN p_limit INT, IN p_status VARCHAR(20)
)
BEGIN
    UPDATE members SET 
        name = p_name, dob = p_dob, gender = p_gender, phone = p_phone, email = p_email, 
        permanent_address = p_perm_addr, current_address = p_curr_addr, 
        curr_house = p_c_house, curr_street = p_c_street, curr_area = p_c_area, curr_city = p_c_city, curr_state = p_c_state, curr_pincode = p_c_pincode,
        perm_house = p_p_house, perm_street = p_p_street, perm_area = p_p_area, perm_city = p_p_city, perm_state = p_p_state, perm_pincode = p_p_pincode,
        course = p_course, department = p_dept, year_semester = p_year_sem, 
        membership_type = p_type, no_dues_status = p_no_dues,
        roll_number = p_roll, academic_session = p_session, hod_name = p_hod,
        guardian_name = p_g_name, guardian_phone = p_g_phone, blood_group = p_blood,
        membership_expiry = p_expiry, max_book_limit = p_limit, account_status = p_status
    WHERE member_id = p_id;
END;

/* NEXT_PROCEDURE */

-- 9. Update member photo URLs (separate to avoid overwriting with NULL)
CREATE PROCEDURE proc_update_member_files(
    IN p_id VARCHAR(50),
    IN p_photo TEXT, IN p_govt_id TEXT, IN p_receipt TEXT, IN p_deposit TEXT
)
BEGIN
    IF p_photo IS NOT NULL THEN UPDATE members SET photo_url = p_photo WHERE member_id = p_id; END IF;
    IF p_govt_id IS NOT NULL THEN UPDATE members SET govt_id_url = p_govt_id WHERE member_id = p_id; END IF;
    IF p_receipt IS NOT NULL THEN UPDATE members SET admission_receipt_url = p_receipt WHERE member_id = p_id; END IF;
    IF p_deposit IS NOT NULL THEN UPDATE members SET security_deposit_url = p_deposit WHERE member_id = p_id; END IF;
END;

/* NEXT_PROCEDURE */

-- 10. Check for active issues before deletion
CREATE PROCEDURE proc_check_member_active_issues(IN p_id VARCHAR(50))
BEGIN
    SELECT issue_id FROM issues WHERE member_id = p_id AND status = 'issued';
END;

/* NEXT_PROCEDURE */

-- 11. Soft delete member
CREATE PROCEDURE proc_soft_delete_member(IN p_id VARCHAR(50))
BEGIN
    UPDATE members SET is_deleted = 1, deleted_at = NOW() WHERE member_id = p_id;
END;

/* NEXT_PROCEDURE */

-- 12. Get deleted members
CREATE PROCEDURE proc_get_deleted_members()
BEGIN
    SELECT member_id, name, dob, gender, phone, email, course, department, account_status, created_at, deleted_at
    FROM members 
    WHERE is_deleted = 1 
    ORDER BY deleted_at DESC;
END;

/* NEXT_PROCEDURE */

-- 13. Restore member
CREATE PROCEDURE proc_restore_member(IN p_id VARCHAR(50))
BEGIN
    UPDATE members SET is_deleted = 0, deleted_at = NULL WHERE member_id = p_id;
END;

/* NEXT_PROCEDURE */

-- 14. Permanent delete member
CREATE PROCEDURE proc_permanent_delete_member(IN p_id VARCHAR(50))
BEGIN
    DELETE FROM members WHERE member_id = p_id;
END;
