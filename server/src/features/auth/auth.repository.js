const pool = require('../../config/db');

class AuthRepository {
    async getLoginAttempts(email) {
        const [rows] = await pool.query('CALL proc_get_login_attempts(?)', [email]);
        return rows.length > 0 ? rows[0] : null;
    }

    async getCaptcha(captchaId) {
        const [rows] = await pool.query('CALL proc_get_captcha(?)', [captchaId]);
        return rows.length > 0 ? rows[0] : null;
    }

    async deleteCaptcha(captchaId) {
        await pool.query('CALL proc_delete_captcha(?)', [captchaId]);
    }

    async getUserByEmail(email) {
        const [rows] = await pool.query('CALL proc_get_user_by_email(?)', [email]);
        return rows.length > 0 ? rows[0] : null;
    }

    async resetLoginAttempts(email) {
        await pool.query('CALL proc_reset_login_attempts(?)', [email]);
    }

    async updateLoginAttempts(email, attempts, lockoutUntil) {
        await pool.query('CALL proc_update_login_attempts(?, ?, ?)', [email, attempts, lockoutUntil]);
    }

    async insertLoginAttempt(email) {
        await pool.query('CALL proc_insert_login_attempt(?)', [email]);
    }

    async createOTP(userId, otp) {
        await pool.query('CALL proc_create_otp(?, ?)', [userId, otp]);
    }

    async verifyOTP(userId, otp) {
        const [rows] = await pool.query('CALL proc_verify_otp(?, ?)', [userId, otp]);
        return rows.length > 0 ? rows[0] : null;
    }

    async deleteUserOTPs(userId) {
        await pool.query('CALL proc_delete_user_otps(?)', [userId]);
    }

    async cleanupTokenBlacklist() {
        await pool.query('CALL proc_cleanup_token_blacklist()');
    }

    async logoutSession(token) {
        const result = await pool.query('CALL proc_logout_session(?)', [token]);
        return result[0]?.[0]?.affected_rows || 0;
    }

    async insertTokenBlacklist(token, userId, userName, email, role, status, expiresAt, ipAddress, userAgent) {
        await pool.query(
            'CALL proc_insert_token_blacklist(?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [token, userId, userName, email, role, status, expiresAt, ipAddress, userAgent]
        );
    }

    async createActiveSession(token, userId, userName, email, role, expiresAt, ipAddress, userAgent) {
        await pool.query(
            'CALL proc_create_active_session(?, ?, ?, ?, ?, ?, ?, ?)',
            [token, userId, userName, email, role, expiresAt, ipAddress, userAgent]
        );
    }

    async updatePassword(userId, hashedPassword) {
        await pool.query('CALL proc_update_password(?, ?)', [userId, hashedPassword]);
    }
}

module.exports = new AuthRepository();
