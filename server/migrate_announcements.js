const pool = require('./src/db');

async function createAnnouncementTable() {
    try {
        const sql = `
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
        `;
        
        await pool.query(sql);
        console.log("Announcements table created/verified successfully.");
        process.exit(0);
    } catch (err) {
        console.error("Error creating announcements table:", err);
        process.exit(1);
    }
}

createAnnouncementTable();
