CREATE PROCEDURE IF NOT EXISTS initialize_database_schema()
BEGIN
    CREATE TABLE IF NOT EXISTS login_attempts (
        email VARCHAR(255) PRIMARY KEY,
        attempts INT DEFAULT 0,
        lockout_until TIMESTAMP NULL
    );
    
    ALTER TABLE users ADD COLUMN IF NOT EXISTS status ENUM('active', 'inactive') DEFAULT 'active';
    ALTER TABLE books ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;
    ALTER TABLE members ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;

    -- --- NEW RESERVATION TABLE ---
    CREATE TABLE IF NOT EXISTS reservations (
        reservation_id INT AUTO_INCREMENT PRIMARY KEY,
        member_id VARCHAR(50) NOT NULL,
        book_id VARCHAR(50) NOT NULL,
        status ENUM('pending', 'fulfilled', 'cancelled') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fulfilled_at TIMESTAMP NULL,
        FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE,
        FOREIGN KEY (book_id) REFERENCES books(book_id) ON DELETE CASCADE
    );

    -- --- NEW SECURITY TABLES ---
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL,
        user_role VARCHAR(50) NULL,
        action VARCHAR(255) NOT NULL,
        details JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS token_blacklist (
        token VARCHAR(500) PRIMARY KEY,
        user_id INT NULL,
        user_name VARCHAR(100) NULL,
        email VARCHAR(100) NULL,
        role VARCHAR(50) NULL,
        status ENUM('active', 'inactive') DEFAULT 'active',
        expires_at TIMESTAMP NULL,
        login_time TIMESTAMP NULL,
        logout_time TIMESTAMP NULL,
        ip_address VARCHAR(45) NULL,
        user_agent TEXT NULL
    );
    
    -- --- ANNOUNCEMENT SYSTEM TABLE ---
    CREATE TABLE IF NOT EXISTS announcements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(36) DEFAULT (UUID()),
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        short_message VARCHAR(255),
        type ENUM('info', 'success', 'warning', 'error', 'emergency', 'maintenance', 'holiday', 'event', 'update', 'system') DEFAULT 'info',
        priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'low',
        is_active BOOLEAN DEFAULT TRUE,
        is_popup BOOLEAN DEFAULT FALSE,
        scroll_speed INT DEFAULT 20,
        text_color VARCHAR(10) DEFAULT '#ffffff',
        background_color VARCHAR(10) DEFAULT '#b91c1c',
        border_color VARCHAR(10) DEFAULT '#991b1b',
        icon_name VARCHAR(50) DEFAULT 'info',
        show_icon BOOLEAN DEFAULT TRUE,
        show_close_button BOOLEAN DEFAULT TRUE,
        pause_on_hover BOOLEAN DEFAULT TRUE,
        repeat_loop BOOLEAN DEFAULT TRUE,
        animation_type VARCHAR(50) DEFAULT 'marquee',
        clickable_link TEXT,
        open_in_new_tab BOOLEAN DEFAULT TRUE,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        display_order INT DEFAULT 0,
        target_roles VARCHAR(255) DEFAULT 'all',
        target_pages VARCHAR(255) DEFAULT 'all',
        device_visibility ENUM('all', 'desktop', 'mobile') DEFAULT 'all',
        language_code VARCHAR(10) DEFAULT 'en',
        view_count INT DEFAULT 0,
        click_count INT DEFAULT 0,
        last_shown_at DATETIME,
        created_by VARCHAR(50),
        updated_by VARCHAR(50),
        is_deleted BOOLEAN DEFAULT FALSE,
        deleted_at DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (is_active, is_deleted, start_time, end_time),
        INDEX (priority, display_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    
    -- --- DATA HEALING: ANNOUNCEMENT COLUMNS ---
    ALTER TABLE announcements ADD COLUMN IF NOT EXISTS show_icon BOOLEAN DEFAULT TRUE;
    ALTER TABLE announcements ADD COLUMN IF NOT EXISTS show_close_button BOOLEAN DEFAULT TRUE;
    ALTER TABLE announcements ADD COLUMN IF NOT EXISTS pause_on_hover BOOLEAN DEFAULT TRUE;
    ALTER TABLE announcements ADD COLUMN IF NOT EXISTS scroll_speed INT DEFAULT 25;
    ALTER TABLE announcements MODIFY COLUMN priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'low';

    UPDATE books SET deleted_at = created_at WHERE is_deleted = 1 AND deleted_at IS NULL;
    UPDATE members SET deleted_at = created_at WHERE is_deleted = 1 AND deleted_at IS NULL;

    -- --- DATA HEALING: BACKFILL ROLES ---
    UPDATE user_login_sessions s 
    JOIN users u ON s.email = u.email 
    SET s.role = u.role 
    WHERE s.role IS NULL OR s.role = 'N/A';

    -- --- DATA HEALING: PURGE GHOST SESSIONS ---
    UPDATE user_login_sessions 
    SET session_status = 'offline', logout_time = NOW() 
    WHERE session_status = 'online' AND login_time < DATE_SUB(NOW(), INTERVAL 24 HOUR);

    -- --- AUDIT INITIALIZATION ---
    INSERT INTO audit_logs (user_id, user_role, action, details) 
    SELECT 'SYSTEM', 'system', 'Security System Calibration', '{"message": "Historical roles backfilled and ghost sessions purged."}'
    WHERE NOT EXISTS (SELECT 1 FROM audit_logs WHERE action = 'Security System Calibration' LIMIT 1);

END;

/* NEXT_PROCEDURE */
