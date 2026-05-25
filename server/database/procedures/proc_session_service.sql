-- Session Service Procedures (Background Tasks)
-- Individual procedures follow

-- 1. Check for other active sessions (Risk scoring)
CREATE PROCEDURE proc_get_other_active_sessions(
    IN p_user_id VARCHAR(20),
    IN p_device VARCHAR(50),
    IN p_browser VARCHAR(100)
)
BEGIN
    SELECT id FROM user_login_sessions 
    WHERE user_id = p_user_id 
    AND session_status = 'online' 
    AND (device_type != p_device OR browser != p_browser);
END;

/* NEXT_PROCEDURE */

-- 2. Log a new session
CREATE PROCEDURE proc_log_session(
    IN p_user_id VARCHAR(20),
    IN p_user_name VARCHAR(100),
    IN p_email VARCHAR(100),
    IN p_ip VARCHAR(45),
    IN p_ua TEXT,
    IN p_browser VARCHAR(100),
    IN p_os VARCHAR(100),
    IN p_device VARCHAR(50),
    IN p_location VARCHAR(100),
    IN p_status VARCHAR(20),
    IN p_reason VARCHAR(255),
    IN p_session_status VARCHAR(20),
    IN p_risk_score INT,
    IN p_risk_level VARCHAR(20),
    IN p_token VARCHAR(1000),
    IN p_role VARCHAR(50)
)
BEGIN
    INSERT INTO user_login_sessions 
    (user_id, user_name, email, ip_address, user_agent, browser, os, device_type, location, status, failure_reason, session_status, risk_score, risk_level, token, role, login_time)
    VALUES (p_user_id, p_user_name, p_email, p_ip, p_ua, p_browser, p_os, p_device, p_location, p_status, p_reason, p_session_status, p_risk_score, p_risk_level, p_token, p_role, NOW());
    
    SELECT LAST_INSERT_ID() as insert_id;
END;

/* NEXT_PROCEDURE */

-- 3. Find session by token
CREATE PROCEDURE proc_find_active_session_by_token(IN p_token VARCHAR(1000))
BEGIN
    SELECT id FROM user_login_sessions WHERE token = p_token AND session_status = 'online' LIMIT 1;
END;

/* NEXT_PROCEDURE */

-- 4. Log session action
CREATE PROCEDURE proc_log_session_action(
    IN p_session_id INT,
    IN p_type VARCHAR(100),
    IN p_desc VARCHAR(255),
    IN p_path VARCHAR(255)
)
BEGIN
    INSERT INTO user_session_actions (session_id, action_type, description, path) VALUES (p_session_id, p_type, p_desc, p_path);
    UPDATE user_login_sessions SET last_activity_time = NOW() WHERE id = p_session_id;
END;

/* NEXT_PROCEDURE */

-- 5. Revoke session
CREATE PROCEDURE proc_revoke_session(IN p_session_id INT, IN p_status VARCHAR(20))
BEGIN
    UPDATE user_login_sessions SET session_status = p_status, logout_time = NOW() WHERE id = p_session_id;
END;
