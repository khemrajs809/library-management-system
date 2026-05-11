const { body, validationResult } = require('express-validator');

// Generic validation result checker middleware
const validateResult = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Return 400 Bad Request if validation fails
        return res.status(400).json({ 
            success: false, 
            message: 'Validation failed', 
            errors: errors.array() 
        });
    }
    next();
};

// Validation chain for Login
const loginValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Must be a valid email address')
        .normalizeEmail(),
    body('password')
        .trim()
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
];

// Validation chain for creating a Librarian
const createLibrarianValidation = [
    body('lib_id')
        .trim()
        .notEmpty().withMessage('Librarian ID is required')
        .matches(/^[a-zA-Z0-9]{8}$/).withMessage('Librarian ID must be exactly 8 alphanumeric characters'),
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters')
        .escape(), // Sanitization
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Must be a valid email address')
        .normalizeEmail(),
    body('password')
        .trim()
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
];

// Validation chain for creating/updating a Book
const bookValidation = [
    body('book_id')
        .trim()
        .notEmpty().withMessage('Book ID is required'),
    body('title')
        .trim()
        .notEmpty().withMessage('Title is required')
        .isLength({ min: 2, max: 200 }).withMessage('Title must be between 2 and 200 characters')
        .escape(),
    body('author')
        .trim()
        .notEmpty().withMessage('Author is required')
        .escape(),
    body('quantity')
        .optional()
        .isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
    body('price')
        .optional()
        .isFloat({ min: 0 }).withMessage('Price must be a non-negative number')
];

// Validation chain for creating/updating a Member
const memberValidation = [
    body('member_id')
        .trim()
        .notEmpty().withMessage('Member ID is required'),
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters')
        .escape(),
    body('email')
        .optional({ checkFalsy: true })
        .isEmail().withMessage('Must be a valid email address')
        .normalizeEmail(),
    body('phone')
        .trim()
        .notEmpty().withMessage('Phone number is required')
        .matches(/^[0-9+\-\s()]{10,20}$/).withMessage('Invalid phone number format'),
    body('gender')
        .optional()
        .isIn(['Male', 'Female', 'Other']).withMessage('Invalid gender value')
];

module.exports = {
    validateResult,
    loginValidation,
    createLibrarianValidation,
    bookValidation,
    memberValidation
};
