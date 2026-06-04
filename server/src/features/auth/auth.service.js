const bcrypt = require('bcryptjs');
const { EncryptJWT, jwtDecrypt } = require('jose');
const crypto = require('crypto');
const authRepository = require('./auth.repository');
const { encryptionSecret } = require('./auth.utils');
const { sendEmail } = require('../../common/services/email.service');
const { generateOTPHTML } = require('../../utils/email.util');
const { logSession } = require('../../features/sessions/session.service');
const zxcvbn = require('zxcvbn');

class AuthService {
    async handleFailedAttempt(email) {
        const attemptRecord = await authRepository.getLoginAttempts(email);
        if (attemptRecord) {
            const newAttempts = attemptRecord.attempts + 1;
            let lockoutUntil = null;
            if (newAttempts >= 5) {
                lockoutUntil = new Date(Date.now() + 1 * 60 * 1000); // 1 min lock
            }
            await authRepository.updateLoginAttempts(email, newAttempts, lockoutUntil);
        } else {
            await authRepository.insertLoginAttempt(email);
        }
    }

    async authenticateUser(email, password, captchaId, captchaText, clientInfo) {
        // --- ACCOUNT LOCKOUT CHECK ---
        const attemptRecord = await authRepository.getLoginAttempts(email);

        if (attemptRecord) {
            const { attempts, lockout_until } = attemptRecord;
            if (lockout_until && new Date(lockout_until) > new Date()) {
                const waitTime = Math.ceil((new Date(lockout_until) - new Date()) / 1000 / 60);
                await logSession({
                    email,
                    ...clientInfo,
                    status: 'blocked',
                    failureReason: 'Account temporarily locked due to too many failed attempts'
                });
                const err = new Error(`Account is temporarily locked due to too many failed attempts. Try again in ${waitTime} minutes.`);
                err.status = 403;
                throw err;
            }
        }

        if (!captchaId || !captchaText) {
            const err = new Error('Captcha is required');
            err.status = 400;
            throw err;
        }

        // Validate Captcha
        const validCaptcha = await authRepository.getCaptcha(captchaId);
        if (!validCaptcha) {
            const err = new Error('Invalid or expired captcha');
            err.status = 400;
            throw err;
        }

        await authRepository.deleteCaptcha(captchaId);

        if (validCaptcha.text.toLowerCase() !== captchaText.toLowerCase()) {
            const err = new Error('Incorrect captcha');
            err.status = 400;
            throw err;
        }

        // Check if user exists
        const user = await authRepository.getUserByEmail(email);

        if (user) {
            const isMatch = await bcrypt.compare(password, user.password);

            if (isMatch) {
                // --- STATUS CHECK (Only after password match) ---
                if (user.status === 'inactive') {
                    await logSession({
                        userId: user.id,
                        userName: user.name,
                        email,
                        ...clientInfo,
                        status: 'blocked',
                        failureReason: 'Account deactivated',
                        role: user.role
                    });
                    const err = new Error('Your account is deactivated. Please contact the administrator.');
                    err.status = 403;
                    throw err;
                }

                // SUCCESS: Reset failed attempts
                await authRepository.resetLoginAttempts(email);

                // --- MFA STEP 1: Generate and Send OTP ---
                const otp = Math.floor(100000 + Math.random() * 900000).toString();

                try {
                    await authRepository.createOTP(user.id, otp);
                } catch (dbErr) {
                    console.error('[AUTH] Database error storing OTP:', dbErr);
                    const err = new Error('Security system error. Please contact admin.');
                    err.status = 500;
                    throw err;
                }

                const subject = 'Your LMS Security Code';
                const text = `Your one-time security code is: ${otp}. It will expire in 10 minutes.`;
                const html = generateOTPHTML(user.name || user.email, otp, 'login');

                try {
                    sendEmail(user.email, subject, text, html);
                } catch (err) {
                    console.warn(`[API] Could not send OTP email for ${user.email}.`);
                    if (process.env.NODE_ENV !== 'production') {
                        console.warn(`[DEV MODE] Bypass: Your OTP is ${otp}`);
                    }
                }

                return {
                    user,
                    message: 'Security code sent to your email.'
                };
            } else {
                // FAILURE: Increment attempts
                await this.handleFailedAttempt(email);
                await logSession({
                    userId: user.id,
                    userName: user.name,
                    email,
                    ...clientInfo,
                    status: 'failed',
                    failureReason: 'Incorrect password',
                    role: user.role
                });
                const err = new Error('Invalid credentials');
                err.status = 401;
                throw err;
            }
        } else {
            // User not found
            await this.handleFailedAttempt(email);
            await logSession({
                email,
                ...clientInfo,
                status: 'failed',
                failureReason: 'User not found'
            });
            const err = new Error('Invalid credentials');
            err.status = 401;
            throw err;
        }
    }

    async processLogout(token, clientInfo) {
        if (!token) {
            return { message: 'Already logged out' };
        }

        let decoded;
        try {
            const { payload } = await jwtDecrypt(token, encryptionSecret);
            decoded = payload;
        } catch (e) {
            decoded = null;
        }

        if (decoded && decoded.exp) {
            const expiresAt = new Date(decoded.exp * 1000).toISOString().slice(0, 19).replace('T', ' ');

            await authRepository.cleanupTokenBlacklist();
            const affectedRows = await authRepository.logoutSession(token);

            if (affectedRows === 0) {
                await authRepository.insertTokenBlacklist(
                    token, 
                    decoded.id || null, 
                    decoded.name || null, 
                    decoded.email || null, 
                    decoded.role || null, 
                    'inactive', 
                    expiresAt, 
                    clientInfo.ipAddress, 
                    clientInfo.userAgent
                );
            }
        }
        return { message: 'Logged out successfully' };
    }

    async verifyMFA(email, otp, clientInfo) {
        if (!email || !otp) {
            const err = new Error('Email and code are required');
            err.status = 400;
            throw err;
        }

        const user = await authRepository.getUserByEmail(email);
        if (!user) {
            const err = new Error('Invalid session');
            err.status = 401;
            throw err;
        }

        const validOTP = await authRepository.verifyOTP(user.id, otp);
        if (!validOTP) {
            const err = new Error('Invalid or expired security code');
            err.status = 401;
            throw err;
        }

        await authRepository.deleteUserOTPs(user.id);

        const token = await new EncryptJWT({
            id: user.id,
            email: user.email,
            role: user.role
        })
            .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
            .setIssuedAt()
            .setJti(crypto.randomUUID())
            .setExpirationTime('3h')
            .encrypt(encryptionSecret);

        const { payload: decoded } = await jwtDecrypt(token, encryptionSecret);
        const expiresAt = new Date(decoded.exp * 1000).toISOString().slice(0, 19).replace('T', ' ');

        await authRepository.createActiveSession(
            token, user.id, user.name, user.email, user.role, expiresAt, clientInfo.ipAddress, clientInfo.userAgent
        );

        await logSession({
            userId: user.id,
            userName: user.name,
            email: user.email,
            ...clientInfo,
            status: 'successful',
            token,
            role: user.role
        });

        return { token, decoded, role: user.role };
    }

    async requestResendOTP(email) {
        if (!email) {
            const err = new Error('Email is required');
            err.status = 400;
            throw err;
        }

        const user = await authRepository.getUserByEmail(email);
        if (!user) {
            const err = new Error('User not found');
            err.status = 404;
            throw err;
        }

        await authRepository.deleteUserOTPs(user.id);

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await authRepository.createOTP(user.id, otp);

        const subject = 'Your NEW LMS Security Code';
        const text = `Your new security code is: ${otp}. It will expire in 10 minutes. Previous codes are now invalid.`;
        const html = generateOTPHTML(user.name || user.email, otp, 'mfa');

        try {
            sendEmail(user.email, subject, text, html);
        } catch (err) {
            console.warn(`[API] Could not send OTP email for ${user.email}.`);
            if (process.env.NODE_ENV !== 'production') {
                console.warn(`[DEV MODE] Bypass: Your new security code is ${otp}`);
            }
        }
    }

    async requestPasswordReset(email) {
        if (!email) {
            const err = new Error('Email is required');
            err.status = 400;
            throw err;
        }

        const user = await authRepository.getUserByEmail(email);
        if (!user) {
            const err = new Error('No account found with this email');
            err.status = 404;
            throw err;
        }

        await authRepository.deleteUserOTPs(user.id);
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await authRepository.createOTP(user.id, otp);

        const subject = 'LMS Password Reset Request';
        const text = `You requested a password reset. Your security code is: ${otp}. This code expires in 10 minutes.`;
        const html = generateOTPHTML(user.name || user.email, otp, 'password-reset');

        try {
            sendEmail(user.email, subject, text, html);
        } catch (err) {
            console.warn(`[API] Could not send Reset email for ${user.email}.`);
            if (process.env.NODE_ENV !== 'production') {
                console.warn(`[DEV MODE] Bypass: Your password reset code is ${otp}`);
            }
        }
    }

    async resetPassword(email, otp, newPassword) {
        if (!email || !otp || !newPassword) {
            const err = new Error('All fields are required');
            err.status = 400;
            throw err;
        }

        if (zxcvbn(newPassword).score < 3) {
            const err = new Error('Password is too weak. Please use a stronger password.');
            err.status = 400;
            throw err;
        }

        const user = await authRepository.getUserByEmail(email);
        if (!user) {
            const err = new Error('User not found');
            err.status = 404;
            throw err;
        }

        const validOTP = await authRepository.verifyOTP(user.id, otp);
        if (!validOTP) {
            const err = new Error('Invalid or expired reset code');
            err.status = 401;
            throw err;
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await authRepository.updatePassword(user.id, hashedPassword);
        await authRepository.deleteUserOTPs(user.id);
    }
}

module.exports = new AuthService();
