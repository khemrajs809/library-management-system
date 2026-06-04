const { body, validationResult } = require('express-validator');

const validateResult = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(e => e.msg).join(', ');
        return res.status(400).json({ 
            success: false, 
            message: `Validation failed: ${errorMessages}`, 
            errors: errors.array() 
        });
    }
    next();
};

const loginValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Must be a valid email address')
        .normalizeEmail(),
    body('password')
        .trim()
        .notEmpty().withMessage('Password is required')
];

const otpValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Must be a valid email address')
        .normalizeEmail(),
    body('otp')
        .trim()
        .notEmpty().withMessage('Security code is required')
        .isLength({ min: 6, max: 6 }).withMessage('Security code must be 6 digits')
        .isNumeric().withMessage('Security code must be numeric')
];

const emailOnlyValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Must be a valid email address')
        .normalizeEmail()
];

const passwordResetValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Must be a valid email address')
        .normalizeEmail(),
    body('otp')
        .trim()
        .notEmpty().withMessage('Security code is required')
        .isNumeric().withMessage('Security code must be numeric'),
    body(['newPassword', 'new_password'])
        .custom((value, { req }) => {
            const pwd = req.body.newPassword || req.body.new_password;
            if (!pwd) throw new Error('New password is required');
            if (pwd.length < 6) throw new Error('Password must be at least 6 characters long');
            return true;
        })
];

module.exports = {
    validateResult,
    loginValidation,
    otpValidation,
    emailOnlyValidation,
    passwordResetValidation
};
