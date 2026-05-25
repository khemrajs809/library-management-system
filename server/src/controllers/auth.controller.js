const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { sendEmail } = require('../services/email.service');
const crypto = require('crypto');
const { logSession } = require('../services/session.service');

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
        const [lockoutRows] = await pool.query('CALL proc_get_login_attempts(?)', [email]);

        if (lockoutRows.length > 0) {
            const { attempts, lockout_until } = lockoutRows[0];
            if (lockout_until && new Date(lockout_until) > new Date()) {
                const waitTime = Math.ceil((new Date(lockout_until) - new Date()) / 1000 / 60);
                const ipAddress = req.ip || req.connection?.remoteAddress || '';
                const userAgent = req.headers['user-agent'] || '';
                await logSession({
                    email,
                    ipAddress,
                    userAgent,
                    status: 'blocked',
                    failureReason: 'Account temporarily locked due to too many failed attempts'
                });
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
        const [captchaRows] = await pool.query('CALL proc_get_captcha(?)', [captchaId]);
        if (captchaRows.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid or expired captcha' });
        }
        
        const validCaptcha = captchaRows[0];
        await pool.query('CALL proc_delete_captcha(?)', [captchaId]);

        if (validCaptcha.text.toLowerCase() !== captchaText.toLowerCase()) {
            return res.status(400).json({ success: false, message: 'Incorrect captcha' });
        }

        // Check if user exists
        const [rows] = await pool.query('CALL proc_get_user_by_email(?)', [email]);
        
        if (rows.length > 0) {
            const user = rows[0];
            const isMatch = await bcrypt.compare(password, user.password);

            if (isMatch) {
                // --- STATUS CHECK (Only after password match) ---
                if (user.status === 'inactive') {
                    const ipAddress = req.ip || req.connection?.remoteAddress || '';
                    const userAgent = req.headers['user-agent'] || '';
                    await logSession({
                        userId: user.id,
                        userName: user.name,
                        email,
                        ipAddress,
                        userAgent,
                        status: 'blocked',
                        failureReason: 'Account deactivated',
                        role: user.role
                    });
                    // Standard message to avoid enumeration, but can be helpful if you want to tell them they are deactivated
                    return res.status(403).json({ success: false, message: 'Your account is deactivated. Please contact the administrator.' });
                }

                // SUCCESS: Reset failed attempts
                await pool.query('CALL proc_reset_login_attempts(?)', [email]);

                console.log(`[AUTH] Credentials valid for ${email}. Generating OTP...`);
                // --- MFA STEP 1: Generate and Send OTP ---
                const otp = Math.floor(100000 + Math.random() * 900000).toString();

                try {
                    await pool.query('CALL proc_create_otp(?, ?)', [user.id, otp]);
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
                const ipAddress = req.ip || req.connection?.remoteAddress || '';
                const userAgent = req.headers['user-agent'] || '';
                await logSession({
                    userId: user.id,
                    userName: user.name,
                    email,
                    ipAddress,
                    userAgent,
                    status: 'failed',
                    failureReason: 'Incorrect password',
                    role: user.role
                });
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }
        } else {
            // User not found
            await handleFailedAttempt(email);
            const ipAddress = req.ip || req.connection?.remoteAddress || '';
            const userAgent = req.headers['user-agent'] || '';
            await logSession({
                email,
                ipAddress,
                userAgent,
                status: 'failed',
                failureReason: 'User not found'
            });
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (err) {
        console.error('Unified Login Error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const handleFailedAttempt = async (email) => {
    const [rows] = await pool.query('CALL proc_get_login_attempts(?)', [email]);
    if (rows.length > 0) {
        const newAttempts = rows[0].attempts + 1;
        let lockoutUntil = null;
        if (newAttempts >= 5) {
            lockoutUntil = new Date(Date.now() + 1 * 60 * 1000); // 1 min lock
        }
        await pool.query('CALL proc_update_login_attempts(?, ?, ?)', [email, newAttempts, lockoutUntil]);
    } else {
        await pool.query('CALL proc_insert_login_attempt(?)', [email]);
    }
};

const logout = async (req, res) => {
    const token = req.cookies?.token || req.header('Authorization')?.split(' ')[1] || req.header('x-auth-token');

    if (!token) {
        return res.status(200).json({ success: true, message: 'Already logged out' });
    }

    try {
        const decoded = jwt.decode(token);
        if (decoded && decoded.exp) {
            const expiresAt = new Date(decoded.exp * 1000).toISOString().slice(0, 19).replace('T', ' ');

            // Cleanup
            await pool.query('CALL proc_cleanup_token_blacklist()');

            // Logout
            const [logoutResult] = await pool.query('CALL proc_logout_session(?)', [token]);
            const affectedRows = logoutResult[0].affected_rows;

            if (affectedRows === 0) {
                const ipAddress = req.ip || req.connection?.remoteAddress || '';
                const userAgent = req.headers['user-agent'] || '';

                await pool.query(
                    'CALL proc_insert_token_blacklist(?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [token, decoded.id || null, decoded.name || null, decoded.email || null, decoded.role || null, 'inactive', expiresAt, ipAddress, userAgent]
                );
            }
        }

        // Clear the cookie
        res.clearCookie('token');

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
        const [userRows] = await pool.query('CALL proc_get_user_by_email(?)', [email]);
        if (userRows.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid session' });
        }
        const user = userRows[0];

        // Validate OTP
        const [otpRows] = await pool.query('CALL proc_verify_otp(?, ?)', [user.id, otp]);

        if (otpRows.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid or expired security code' });
        }

        // OTP is valid, delete all OTPs for this user
        await pool.query('CALL proc_delete_user_otps(?)', [user.id]);

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
            'CALL proc_create_active_session(?, ?, ?, ?, ?, ?, ?, ?)',
            [token, user.id, user.name, user.email, user.role, expiresAt, ipAddress, userAgent]
        );

        await logSession({
            userId: user.id,
            userName: user.name,
            email: user.email,
            ipAddress,
            userAgent,
            status: 'successful',
            token,
            role: user.role
        });

        // Set the token in an HttpOnly cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' || true, // since we have https locally
            sameSite: 'strict',
            maxAge: 3 * 60 * 60 * 1000 // 3 hours
        });

        // We don't send the token in the response body anymore, just the necessary session metadata
        return res.status(200).json({ 
            success: true, 
            message: 'MFA verified, login successful',
            role: user.role,
            exp: decoded.exp
        });

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
        const [userRows] = await pool.query('CALL proc_get_user_by_email(?)', [email]);
        if (userRows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const user = userRows[0];

        // Invalidate previous
        await pool.query('CALL proc_delete_user_otps(?)', [user.id]);

        // --- GENERATE NEW OTP ---
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        await pool.query('CALL proc_create_otp(?, ?)', [user.id, otp]);

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

        const [userRows] = await pool.query('CALL proc_get_user_by_email(?)', [email]);
        if (userRows.length === 0) {
            return res.status(404).json({ success: false, message: 'No account found with this email' });
        }
        const user = userRows[0];

        // Invalidate old OTPs
        await pool.query('CALL proc_delete_user_otps(?)', [user.id]);

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await pool.query('CALL proc_create_otp(?, ?)', [user.id, otp]);

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
        const [userRows] = await pool.query('CALL proc_get_user_by_email(?)', [email]);
        if (userRows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const user = userRows[0];

        // Verify OTP
        const [otpRows] = await pool.query('CALL proc_verify_otp(?, ?)', [user.id, otp]);

        if (otpRows.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid or expired reset code' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password
        await pool.query('CALL proc_update_password(?, ?)', [user.id, hashedPassword]);

        // Delete all OTPs for this user
        await pool.query('CALL proc_delete_user_otps(?)', [user.id]);

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
