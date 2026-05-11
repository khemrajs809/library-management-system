const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { sendEmail } = require('../services/email.service');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET is not defined.");
    process.exit(1);
}

const login = async (req, res) => {
    const { email, password, captchaId, captchaText } = req.body;

    try {
        console.log(`[AUTH] Attempting login for: ${email}`);

        // --- ACCOUNT LOCKOUT CHECK ---
        const lockoutRows = await pool.query(
            'SELECT attempts, lockout_until FROM login_attempts WHERE email = ?', 
            [email]
        );

        if (lockoutRows.length > 0) {
            const { attempts, lockout_until } = lockoutRows[0];
            if (lockout_until && new Date(lockout_until) > new Date()) {
                const waitTime = Math.ceil((new Date(lockout_until) - new Date()) / 1000 / 60);
                return res.status(403).json({ 
                    success: false, 
                    message: `Account is temporarily locked due to too many failed attempts. Try again in ${waitTime} minutes.` 
                });
            }
        }

        if (!captchaId || !captchaText) {
            return res.status(400).json({ success: false, message: 'Captcha is required' });
        }

        // Validate Captcha
        const captchaRows = await pool.query('SELECT * FROM captchas WHERE id = ?', [captchaId]);
        if (captchaRows.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid or expired captcha' });
        }
        
        const validCaptcha = captchaRows[0];
        await pool.query('DELETE FROM captchas WHERE id = ?', [captchaId]);

        if (validCaptcha.text.toLowerCase() !== captchaText.toLowerCase()) {
            return res.status(400).json({ success: false, message: 'Incorrect captcha' });
        }

        // Check if user exists
        const rows = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        
        if (rows.length > 0) {
            const user = rows[0];

            // --- STATUS CHECK ---
            if (user.status === 'inactive') {
                return res.status(403).json({ success: false, message: 'Your account is deactivated. Please contact the administrator.' });
            }

            const isMatch = await bcrypt.compare(password, user.password);

            if (isMatch) {
                // SUCCESS: Reset failed attempts
                await pool.query('DELETE FROM login_attempts WHERE email = ?', [email]);

                console.log(`[AUTH] Credentials valid for ${email}. Generating OTP...`);
                // --- MFA STEP 1: Generate and Send OTP ---
                const otp = Math.floor(100000 + Math.random() * 900000).toString();
                const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

                try {
                    await pool.query(
                        'INSERT INTO otps (user_id, otp_code, expires_at) VALUES (?, ?, ?)',
                        [user.id, otp, expiresAt]
                    );
                } catch (dbErr) {
                    console.error('[AUTH] Database error storing OTP:', dbErr);
                    return res.status(500).json({ success: false, message: 'Security system error. Please contact admin.' });
                }

                const emailSent = await sendEmail(
                    user.email,
                    'Your LMS Security Code',
                    `Your one-time security code is: ${otp}. It will expire in 10 minutes.`
                );

                if (!emailSent) {
                    return res.status(500).json({ success: false, message: 'Failed to send security code' });
                }

                return res.status(202).json({
                    success: true,
                    mfaRequired: true,
                    message: 'Security code sent to your email.',
                    email: user.email.replace(/(.{2})(.*)(?=@)/, (gp1, gp2, gp3) => gp2 + '*'.repeat(gp3.length))
                });
            } else {
                // FAILURE: Increment attempts
                await handleFailedAttempt(email);
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }
        } else {
            // User not found
            await handleFailedAttempt(email);
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (err) {
        console.error('Unified Login Error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const handleFailedAttempt = async (email) => {
    const rows = await pool.query('SELECT attempts FROM login_attempts WHERE email = ?', [email]);
    if (rows.length > 0) {
        const newAttempts = rows[0].attempts + 1;
        let lockoutUntil = null;
        if (newAttempts >= 5) {
            lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins lock
        }
        await pool.query(
            'UPDATE login_attempts SET attempts = ?, lockout_until = ? WHERE email = ?',
            [newAttempts, lockoutUntil, email]
        );
    } else {
        await pool.query(
            'INSERT INTO login_attempts (email, attempts) VALUES (?, 1)',
            [email]
        );
    }
};

const logout = async (req, res) => {
    const token = req.header('Authorization')?.split(' ')[1] || req.header('x-auth-token');

    if (!token) {
        return res.status(200).json({ success: true, message: 'Already logged out' });
    }

    try {
        const decoded = jwt.decode(token);
        if (decoded && decoded.exp) {
            // Convert UNIX timestamp to MariaDB TIMESTAMP format
            const expiresAt = new Date(decoded.exp * 1000).toISOString().slice(0, 19).replace('T', ' ');

            // Cleanup old expired tokens from blacklist periodically
            await pool.query('DELETE FROM token_blacklist WHERE expires_at < NOW()');

            // Mark session as inactive and set logout time
            const result = await pool.query('UPDATE token_blacklist SET status = "inactive", logout_time = NOW() WHERE token = ?', [token]);

            // If it wasn't tracked (legacy or missing), insert full details from token
            if (result.affectedRows === 0) {
                const ipAddress = req.ip || req.connection?.remoteAddress || '';
                const userAgent = req.headers['user-agent'] || '';

                await pool.query(
                    `INSERT IGNORE INTO token_blacklist 
                    (token, user_id, email, role, status, expires_at, login_time, logout_time, ip_address, user_agent) 
                    VALUES (?, ?, ?, ?, "inactive", ?, NOW(), NOW(), ?, ?)`,
                    [token, decoded.id || null, decoded.email || null, decoded.role || null, expiresAt, ipAddress, userAgent]
                );
            }
        }

        return res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ success: false, message: 'Server error during logout' });
    }
};

const verifyOTP = async (req, res) => {
    const { email, otp } = req.body;

    try {
        if (!email || !otp) {
            return res.status(400).json({ success: false, message: 'Email and code are required' });
        }

        // Find user
        const userRows = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (userRows.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid session' });
        }
        const user = userRows[0];

        // Validate OTP
        const otpRows = await pool.query(
            'SELECT * FROM otps WHERE user_id = ? AND otp_code = ? AND expires_at > UTC_TIMESTAMP() ORDER BY created_at DESC LIMIT 1',
            [user.id, otp]
        );

        if (otpRows.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid or expired security code' });
        }

        // OTP is valid, delete all OTPs for this user
        await pool.query('DELETE FROM otps WHERE user_id = ?', [user.id]);

        // --- Generate Final JWT ---
        const token = jwt.sign(
            {
                jti: crypto.randomUUID(),
                id: user.id,
                email: user.email,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: '3h' }
        );

        const decoded = jwt.decode(token);
        const expiresAt = new Date(decoded.exp * 1000).toISOString().slice(0, 19).replace('T', ' ');
        const ipAddress = req.ip || req.connection?.remoteAddress || '';
        const userAgent = req.headers['user-agent'] || '';

        await pool.query(
            `INSERT INTO token_blacklist (token, user_id, user_name, email, role, status, expires_at, ip_address, user_agent) 
             VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
            [token, user.id, user.name, user.email, user.role, expiresAt, ipAddress, userAgent]
        );

        return res.status(200).json({ success: true, message: 'MFA verified, login successful', token });

    } catch (err) {
        console.error('OTP Verification Error:', err);
        res.status(500).json({ success: false, message: 'Server error during verification' });
    }
};

const resendOTP = async (req, res) => {
    const { email } = req.body;

    try {
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        // Find user
        const userRows = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (userRows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const user = userRows[0];

        // --- INVALIDATE PREVIOUS OTPS ---
        await pool.query('DELETE FROM otps WHERE user_id = ?', [user.id]);

        // --- GENERATE NEW OTP ---
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await pool.query(
            'INSERT INTO otps (user_id, otp_code, expires_at) VALUES (?, ?, ?)',
            [user.id, otp, expiresAt]
        );

        console.log(`[AUTH] New OTP generated for resend: ${user.email}`);

        const emailSent = await sendEmail(
            user.email,
            'Your NEW LMS Security Code',
            `Your new security code is: ${otp}. It will expire in 10 minutes. Previous codes are now invalid.`
        );

        if (!emailSent) {
            return res.status(500).json({ success: false, message: 'Failed to resend security code' });
        }

        return res.status(200).json({ success: true, message: 'New security code sent!' });

    } catch (err) {
        console.error('Resend OTP Error:', err);
        res.status(500).json({ success: false, message: 'Server error during resend' });
    }
};

const forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        const userRows = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (userRows.length === 0) {
            // Security best practice: don't reveal if email exists or not, 
            // but for a library system, we can be more helpful if preferred.
            // Let's go with "helpful" for this internal tool.
            return res.status(404).json({ success: false, message: 'No account found with this email' });
        }
        const user = userRows[0];

        // Invalidate old OTPs
        await pool.query('DELETE FROM otps WHERE user_id = ?', [user.id]);

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

        await pool.query(
            'INSERT INTO otps (user_id, otp_code, expires_at) VALUES (?, ?, ?)',
            [user.id, otp, expiresAt]
        );

        console.log(`[AUTH] Forgot Password OTP sent to: ${user.email}`);

        const emailSent = await sendEmail(
            user.email,
            'Reset Your LMS Password',
            `You requested a password reset. Your security code is: ${otp}. This code expires in 10 minutes. If you did not request this, please ignore this email.`
        );

        if (!emailSent) {
            return res.status(500).json({ success: false, message: 'Failed to send reset code' });
        }

        return res.status(200).json({ success: true, message: 'Reset code sent to your email' });

    } catch (err) {
        console.error('Forgot Password Error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;

    try {
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        // Find user
        const userRows = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (userRows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const user = userRows[0];

        // Verify OTP
        const otpRows = await pool.query(
            'SELECT * FROM otps WHERE user_id = ? AND otp_code = ? AND expires_at > UTC_TIMESTAMP() ORDER BY created_at DESC LIMIT 1',
            [user.id, otp]
        );

        if (otpRows.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid or expired reset code' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password
        await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id]);

        // Delete all OTPs for this user
        await pool.query('DELETE FROM otps WHERE user_id = ?', [user.id]);

        console.log(`[AUTH] Password successfully reset for: ${user.email}`);

        return res.status(200).json({ success: true, message: 'Password reset successful! You can now log in.' });

    } catch (err) {
        console.error('Reset Password Error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = {
    login,
    logout,
    verifyOTP,
    resendOTP,
    forgotPassword,
    resetPassword
};
