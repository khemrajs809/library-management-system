const pool = require('../../src/db');

/**
 * Migration Script: session_view.js
 * Purpose: Creates or updates the active_sessions_view for administrative auditing.
 */
async function run() {
    console.log('Starting migration: active_sessions_view...');
    try {
        await pool.query(`
            CREATE OR REPLACE VIEW active_sessions_view AS
            SELECT 
                user_id,
                user_name,
                email,
                role,
                status,
                login_time,
                logout_time,
                expires_at AS expiry_time,
                ip_address,
                user_agent,
                TIMESTAMPDIFF(MINUTE, login_time, IFNULL(logout_time, NOW())) AS total_time_active_minutes,
                CASE 
                    WHEN status = 'active' AND expires_at > NOW() THEN TIMESTAMPDIFF(MINUTE, NOW(), expires_at)
                    ELSE 0
                END AS remaining_time_to_expire_minutes,
                token
            FROM token_blacklist
        `);
        console.log('✅ View updated successfully with logout_time support');
    } catch (e) {
        console.error('❌ Migration Error:', e);
    } finally {
        // We don't exit process here if called from another script, 
        // but for standalone use we do.
        if (require.main === module) {
            process.exit(0);
        }
    }
}

if (require.main === module) {
    run();
}

module.exports = run;
