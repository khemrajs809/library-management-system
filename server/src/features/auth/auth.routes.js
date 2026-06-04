const express = require('express');
const authController = require('./auth.controller');
const { authLimiter } = require('../../middlewares/rateLimiter.middleware');
const { 
    validateResult, 
    loginValidation, 
    otpValidation, 
    emailOnlyValidation, 
    passwordResetValidation 
} = require('./auth.validator');

const router = express.Router();



router.post('/login', authLimiter, loginValidation, validateResult, authController.login);
router.post('/verify-otp', authLimiter, otpValidation, validateResult, authController.verifyOTP);
router.post('/resend-otp', authLimiter, emailOnlyValidation, validateResult, authController.resendOTP);
router.post('/forgot-password', authLimiter, emailOnlyValidation, validateResult, authController.forgotPassword);
router.post('/reset-password', authLimiter, passwordResetValidation, validateResult, authController.resetPassword);
router.post('/logout', authController.logout);

// Login Status Route
router.get('/login/status', (req, res) => {
    res.status(200).json({ success: true, message: 'Not locked out' });
});

module.exports = router;
