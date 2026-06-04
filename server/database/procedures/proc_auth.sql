-- Auth Module Procedures
-- Individual procedures follow

-- 1. Check login attempts for lockout
CREATE PROCEDURE proc_get_login_attempts(IN p_email VARCHAR(255))
BEGIN
    SELECT attempts, lockout_until FROM login_attempts WHERE email = p_email;
END;

/* NEXT_PROCEDURE */

-- 2. Validate captcha
CREATE PROCEDURE proc_get_captcha(IN p_id VARCHAR(50))
BEGIN
    SELECT * FROM captchas WHERE id = p_id;
END;

/* NEXT_PROCEDURE */

-- 3. Delete captcha after use
CREATE PROCEDURE proc_delete_captcha(IN p_id VARCHAR(50))
BEGIN
    DELETE FROM captchas WHERE id = p_id;
END;

/* NEXT_PROCEDURE */

-- 4. Get user by email for login
CREATE PROCEDURE proc_get_user_by_email(IN p_email VARCHAR(255))
BEGIN
    SELECT * FROM users WHERE email = p_email;
END;

/* NEXT_PROCEDURE */

-- 5. Reset login attempts on successful login
CREATE PROCEDURE proc_reset_login_attempts(IN p_email VARCHAR(255))
BEGIN
    DELETE FROM login_attempts WHERE email = p_email;
END;

/* NEXT_PROCEDURE */

-- 6. Create OTP
CREATE PROCEDURE proc_create_otp(
    IN p_user_id VARCHAR(50),
    IN p_otp VARCHAR(10)
)
BEGIN
    -- Invalidate old OTPs first
    DELETE FROM otps WHERE user_id = p_user_id;
    -- Insert new one with 10 minute expiry in UTC
    INSERT INTO otps (user_id, otp_code, expires_at) 
    VALUES (p_user_id, p_otp, NOW() + INTERVAL 10 MINUTE);
END;

/* NEXT_PROCEDURE */

-- 7. Update failed login attempts
CREATE PROCEDURE proc_update_login_attempts(
    IN p_email VARCHAR(255),
    IN p_attempts INT,
    IN p_lockout_until DATETIME
)
BEGIN
    UPDATE login_attempts SET attempts = p_attempts, lockout_until = p_lockout_until WHERE email = p_email;
END;

/* NEXT_PROCEDURE */

-- 8. First failed login attempt
CREATE PROCEDURE proc_insert_login_attempt(IN p_email VARCHAR(255))
BEGIN
    INSERT INTO login_attempts (email, attempts) VALUES (p_email, 1);
END;

/* NEXT_PROCEDURE */

-- 9. Cleanup expired tokens and get current token status
CREATE PROCEDURE proc_cleanup_token_blacklist()
BEGIN
    DELETE FROM token_blacklist WHERE expires_at < NOW();
END;

/* NEXT_PROCEDURE */

-- 10. Logout: Mark session and token as inactive
CREATE PROCEDURE proc_logout_session(IN p_token VARCHAR(1000))
BEGIN
    UPDATE token_blacklist SET status = 'inactive', logout_time = NOW() WHERE token = p_token;
    UPDATE user_login_sessions SET session_status = 'offline', logout_time = NOW() WHERE token = p_token;
    
    -- Return if anything was updated to help controller decide on INSERT IGNORE
    SELECT ROW_COUNT() as affected_rows;
END;

/* NEXT_PROCEDURE */

-- 11. Manually insert into token blacklist (legacy/missing session fallback)
CREATE PROCEDURE proc_insert_token_blacklist(
    IN p_token VARCHAR(1000),
    IN p_user_id VARCHAR(50),
    IN p_user_name VARCHAR(255),
    IN p_email VARCHAR(255),
    IN p_role VARCHAR(20),
    IN p_status VARCHAR(20),
    IN p_expires_at DATETIME,
    IN p_ip VARCHAR(50),
    IN p_ua TEXT
)
BEGIN
    INSERT IGNORE INTO token_blacklist 
    (token, user_id, user_name, email, role, status, expires_at, login_time, logout_time, ip_address, user_agent) 
    VALUES (p_token, p_user_id, p_user_name, p_email, p_role, p_status, p_expires_at, NOW(), NOW(), p_ip, p_ua);
END;

/* NEXT_PROCEDURE */

-- 12. Verify OTP
CREATE PROCEDURE proc_verify_otp(IN p_user_id VARCHAR(50), IN p_otp VARCHAR(10))
BEGIN
    SELECT * FROM otps 
    WHERE user_id = p_user_id AND otp_code = p_otp AND expires_at > NOW() 
    ORDER BY created_at DESC LIMIT 1;
END;

/* NEXT_PROCEDURE */

-- 13. Delete all OTPs for user
CREATE PROCEDURE proc_delete_user_otps(IN p_user_id VARCHAR(50))
BEGIN
    DELETE FROM otps WHERE user_id = p_user_id;
END;

/* NEXT_PROCEDURE */

-- 14. Update password
CREATE PROCEDURE proc_update_password(IN p_user_id VARCHAR(50), IN p_password VARCHAR(255))
BEGIN
    UPDATE users SET password = p_password WHERE id = p_user_id;
END;

/* NEXT_PROCEDURE */

-- 15. Create active session entry
CREATE PROCEDURE proc_create_active_session(
    IN p_token VARCHAR(1000),
    IN p_user_id VARCHAR(50),
    IN p_user_name VARCHAR(255),
    IN p_email VARCHAR(255),
    IN p_role VARCHAR(20),
    IN p_expires_at DATETIME,
    IN p_ip VARCHAR(50),
    IN p_ua TEXT
)
BEGIN
    INSERT INTO token_blacklist (token, user_id, user_name, email, role, status, expires_at, ip_address, user_agent) 
    VALUES (p_token, p_user_id, p_user_name, p_email, p_role, 'active', p_expires_at, p_ip, p_ua);
END;
