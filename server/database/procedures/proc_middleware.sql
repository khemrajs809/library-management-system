-- Middleware Procedures (High Frequency)
-- Individual procedures follow

-- 1. Check if token is blacklisted or inactive
CREATE PROCEDURE proc_check_token_status(IN p_token VARCHAR(1000))
BEGIN
    SELECT status FROM token_blacklist WHERE token = p_token;
END;

/* NEXT_PROCEDURE */

-- 2. Update heartbeat / last activity time
CREATE PROCEDURE proc_update_last_activity(IN p_token VARCHAR(1000))
BEGIN
    UPDATE user_login_sessions SET last_activity_time = NOW() 
    WHERE token = p_token AND session_status = 'online';
END;

/* NEXT_PROCEDURE */

-- 3. Log high-value actions (Audit Trail)
CREATE PROCEDURE proc_log_audit_action(
    IN p_user_id VARCHAR(100),
    IN p_role VARCHAR(20),
    IN p_action VARCHAR(255),
    IN p_details TEXT
)
BEGIN
    INSERT INTO audit_logs (user_id, user_role, action, details) VALUES (p_user_id, p_role, p_action, p_details);
END;
