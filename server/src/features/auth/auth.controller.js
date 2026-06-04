const authService = require('./auth.service');
const { COOKIE_MAX_AGE } = require('./auth.constants');

class AuthController {
    async login(req, res, next) {
        try {
            const { email, password, captchaId, captchaText, captcha_id, captcha_text } = req.body;
            const finalCaptchaId = captchaId || captcha_id;
            const finalCaptchaText = captchaText || captcha_text;

            const clientInfo = {
                ipAddress: req.ip || req.connection?.remoteAddress || '',
                userAgent: req.headers['user-agent'] || ''
            };

            const result = await authService.authenticateUser(email, password, finalCaptchaId, finalCaptchaText, clientInfo);

            return res.status(202).json({
                success: true,
                mfaRequired: true,
                message: result.message,
                email: result.user.email.replace(/(.{2})(.*)(?=@)/, (gp1, gp2, gp3) => gp1 + '*'.repeat(gp3.length))
            });
        } catch (err) {
            if (err.status) {
                return res.status(err.status).json({ success: false, message: err.message });
            }
            console.error('Unified Login Error:', err);
            next(err);
        }
    }

    async verifyOTP(req, res, next) {
        try {
            const { email, otp } = req.body;
            const clientInfo = {
                ipAddress: req.ip || req.connection?.remoteAddress || '',
                userAgent: req.headers['user-agent'] || ''
            };

            const result = await authService.verifyMFA(email, otp, clientInfo);

            res.cookie('token', result.token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production' || true,
                sameSite: 'none',
                maxAge: COOKIE_MAX_AGE
            });

            return res.status(200).json({
                success: true,
                message: 'MFA verified, login successful',
                role: result.role,
                exp: result.decoded.exp
            });
        } catch (err) {
            if (err.status) {
                return res.status(err.status).json({ success: false, message: err.message });
            }
            console.error('OTP Verification Error:', err);
            next(err);
        }
    }

    async resendOTP(req, res, next) {
        try {
            await authService.requestResendOTP(req.body.email);
            return res.status(200).json({ success: true, message: 'New security code sent!' });
        } catch (err) {
            if (err.status) {
                return res.status(err.status).json({ success: false, message: err.message });
            }
            console.error('Resend OTP Error:', err);
            next(err);
        }
    }

    async forgotPassword(req, res, next) {
        try {
            await authService.requestPasswordReset(req.body.email);
            return res.status(200).json({ success: true, message: 'Reset code sent to your email' });
        } catch (err) {
            if (err.status) {
                return res.status(err.status).json({ success: false, message: err.message });
            }
            console.error('Forgot Password Error:', err);
            next(err);
        }
    }

    async resetPassword(req, res, next) {
        try {
            const { email, otp, newPassword, new_password } = req.body;
            await authService.resetPassword(email, otp, newPassword || new_password);
            return res.status(200).json({ success: true, message: 'Password reset successful! You can now log in.' });
        } catch (err) {
            if (err.status) {
                return res.status(err.status).json({ success: false, message: err.message });
            }
            console.error('Reset Password Error:', err);
            next(err);
        }
    }

    async logout(req, res, next) {
        try {
            const token = req.cookies?.token || req.header('Authorization')?.split(' ')[1] || req.header('x-auth-token');
            const clientInfo = {
                ipAddress: req.ip || req.connection?.remoteAddress || '',
                userAgent: req.headers['user-agent'] || ''
            };

            const result = await authService.processLogout(token, clientInfo);

            res.clearCookie('token');
            return res.status(200).json({ success: true, message: result.message });
        } catch (err) {
            console.error('Logout error:', err);
            next(err);
        }
    }
}

module.exports = new AuthController();
