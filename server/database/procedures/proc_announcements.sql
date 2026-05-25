-- Announcement Module Procedures
-- Individual procedures follow

-- 1. Get active announcements for public display
CREATE PROCEDURE proc_get_active_announcements()
BEGIN
    SELECT *, NOW() as server_time FROM announcements 
    WHERE is_active = TRUE 
    AND is_deleted = FALSE 
    AND DATE_SUB(NOW(), INTERVAL 5 MINUTE) <= end_time 
    AND DATE_ADD(NOW(), INTERVAL 5 MINUTE) >= start_time
    ORDER BY priority DESC, display_order ASC, created_at DESC;
END;

/* NEXT_PROCEDURE */

-- 2. Create a new announcement
CREATE PROCEDURE proc_create_announcement(
    IN p_title VARCHAR(255),
    IN p_message TEXT,
    IN p_type VARCHAR(50),
    IN p_priority VARCHAR(20),
    IN p_is_active TINYINT,
    IN p_scroll_speed INT,
    IN p_bg_color VARCHAR(20),
    IN p_text_color VARCHAR(20),
    IN p_border_color VARCHAR(20),
    IN p_start_time DATETIME,
    IN p_end_time DATETIME,
    IN p_show_icon TINYINT,
    IN p_show_close TINYINT,
    IN p_pause_hover TINYINT
)
BEGIN
    INSERT INTO announcements (
        title, message, type, priority, is_active, 
        scroll_speed, background_color, text_color, border_color,
        start_time, end_time, show_icon, show_close_button, pause_on_hover
    ) VALUES (
        p_title, p_message, p_type, p_priority, p_is_active,
        p_scroll_speed, p_bg_color, p_text_color, p_border_color,
        p_start_time, p_end_time, p_show_icon, p_show_close, p_pause_hover
    );
END;

/* NEXT_PROCEDURE */

-- 3. Get all announcements for admin management
CREATE PROCEDURE proc_get_all_announcements()
BEGIN
    SELECT * FROM announcements WHERE is_deleted = FALSE ORDER BY created_at DESC;
END;

/* NEXT_PROCEDURE */

-- 4. Toggle active status
CREATE PROCEDURE proc_toggle_announcement_status(IN p_id INT, IN p_is_active TINYINT)
BEGIN
    UPDATE announcements SET is_active = p_is_active WHERE id = p_id;
END;

/* NEXT_PROCEDURE */

-- 5. Soft delete announcement
CREATE PROCEDURE proc_delete_announcement(IN p_id INT)
BEGIN
    UPDATE announcements SET is_deleted = TRUE, deleted_at = NOW() WHERE id = p_id;
END;

/* NEXT_PROCEDURE */

-- 6. Track view count and last shown time
CREATE PROCEDURE proc_track_announcement_view(IN p_id INT)
BEGIN
    UPDATE announcements SET view_count = view_count + 1, last_shown_at = NOW() WHERE id = p_id;
END;
