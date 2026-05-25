-- Session Module Procedures
-- Individual procedures follow

-- 1. Get filtered sessions (Robust version)
CREATE PROCEDURE proc_get_sessions_filtered(
    IN p_start_date VARCHAR(30),
    IN p_end_date VARCHAR(30),
    IN p_user VARCHAR(255),
    IN p_status VARCHAR(50),
    IN p_device VARCHAR(50),
    IN p_browser VARCHAR(50),
    IN p_search VARCHAR(255),
    IN p_limit INT,
    IN p_offset INT
)
BEGIN
    SELECT s.*, 
    (SELECT COUNT(*) FROM user_session_actions WHERE session_id = s.id) as action_count
    FROM user_login_sessions s 
    WHERE (p_start_date IS NULL OR s.login_time >= p_start_date)
      AND (p_end_date IS NULL OR s.login_time <= p_end_date)
      AND (p_user IS NULL OR s.email LIKE CONCAT('%', p_user, '%') OR s.user_name LIKE CONCAT('%', p_user, '%'))
      AND (p_status IS NULL OR s.status = p_status)
      AND (p_device IS NULL OR s.device_type = p_device)
      AND (p_browser IS NULL OR s.browser = p_browser)
      AND (p_search IS NULL OR s.email LIKE CONCAT('%', p_search, '%') OR s.user_name LIKE CONCAT('%', p_search, '%') OR s.ip_address LIKE CONCAT('%', p_search, '%') OR s.location LIKE CONCAT('%', p_search, '%'))
    ORDER BY s.login_time DESC 
    LIMIT p_limit OFFSET p_offset;

    -- Count for pagination
    SELECT COUNT(*) as total 
    FROM user_login_sessions s 
    WHERE (p_start_date IS NULL OR s.login_time >= p_start_date)
      AND (p_end_date IS NULL OR s.login_time <= p_end_date)
      AND (p_user IS NULL OR s.email LIKE CONCAT('%', p_user, '%') OR s.user_name LIKE CONCAT('%', p_user, '%'))
      AND (p_status IS NULL OR s.status = p_status)
      AND (p_device IS NULL OR s.device_type = p_device)
      AND (p_browser IS NULL OR s.browser = p_browser)
      AND (p_search IS NULL OR s.email LIKE CONCAT('%', p_search, '%') OR s.user_name LIKE CONCAT('%', p_search, '%') OR s.ip_address LIKE CONCAT('%', p_search, '%') OR s.location LIKE CONCAT('%', p_search, '%'));
END;

/* NEXT_PROCEDURE */

-- 2. Get actions for a specific session
CREATE PROCEDURE proc_get_session_actions(IN p_session_id BIGINT)
BEGIN
    SELECT * FROM user_session_actions WHERE session_id = p_session_id ORDER BY created_at ASC;
END;

/* NEXT_PROCEDURE */

-- 3. Get session basic info for termination
CREATE PROCEDURE proc_get_session_for_termination(IN p_id BIGINT)
BEGIN
    SELECT token, session_status FROM user_login_sessions WHERE id = p_id;
END;

/* NEXT_PROCEDURE */

-- 4. Mark token as inactive in blacklist during termination
CREATE PROCEDURE proc_terminate_session_blacklist(IN p_token VARCHAR(512))
BEGIN
    UPDATE token_blacklist SET status = 'inactive', logout_time = NOW() WHERE token = p_token;
END;

/* NEXT_PROCEDURE */

-- 5. Get Session Dashboard KPIs
CREATE PROCEDURE proc_get_session_stats_kpis()
BEGIN
    SELECT 
        (SELECT COUNT(*) FROM user_login_sessions) as total_logins,
        (SELECT COUNT(*) FROM user_login_sessions WHERE status = 'successful') as successful,
        (SELECT COUNT(*) FROM user_login_sessions WHERE status = 'failed') as failed,
        (SELECT COUNT(*) FROM user_login_sessions WHERE status = 'blocked') as blocked,
        (SELECT COUNT(*) FROM user_login_sessions WHERE session_status = 'online') as online_count,
        (SELECT COUNT(*) FROM user_login_sessions WHERE risk_level = 'High') as high_risk;
END;

/* NEXT_PROCEDURE */

-- 6. Get Session Device Stats
CREATE PROCEDURE proc_get_session_stats_devices()
BEGIN
    SELECT device_type as device, COUNT(*) as count 
    FROM user_login_sessions 
    WHERE status = 'successful' 
    GROUP BY device_type;
END;

/* NEXT_PROCEDURE */

-- 7. Get Session Browser Stats
CREATE PROCEDURE proc_get_session_stats_browsers()
BEGIN
    SELECT browser, COUNT(*) as count 
    FROM user_login_sessions 
    WHERE status = 'successful' 
    GROUP BY browser;
END;

/* NEXT_PROCEDURE */

-- 8. Get Weekly Login Trends
CREATE PROCEDURE proc_get_session_stats_weekly()
BEGIN
    SELECT DATE(login_time) as date, status, COUNT(*) as count 
    FROM user_login_sessions 
    WHERE login_time >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
    GROUP BY DATE(login_time), status
    ORDER BY DATE(login_time) ASC;
END;

/* NEXT_PROCEDURE */

-- 9. Get Session Alerts / Suspicious Activity
CREATE PROCEDURE proc_get_session_alerts()
BEGIN
    SELECT s.id, s.email, s.user_name, s.ip_address, s.browser, s.device_type, 
           s.login_time, s.status, s.failure_reason, s.risk_level, s.risk_score,
           u.status as current_user_status
    FROM user_login_sessions s
    LEFT JOIN users u ON s.email = u.email
    WHERE s.status IN ('blocked', 'suspicious') OR s.risk_level = 'High'
    ORDER BY s.login_time DESC 
    LIMIT 5;
END;

/* NEXT_PROCEDURE */

-- 10. Revoke/Terminate a session
CREATE PROCEDURE proc_revoke_session(
    IN p_session_id INT,
    IN p_status VARCHAR(20)
)
BEGIN
    UPDATE user_login_sessions 
    SET session_status = p_status,
        logout_time = NOW()
    WHERE id = p_session_id;
END;
