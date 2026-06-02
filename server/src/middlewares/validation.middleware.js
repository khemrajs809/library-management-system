const { body, validationResult } = require('express-validator');

const validateResult = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(e => e.msg).join(', ');
        // Return 400 Bad Request with full error string
        return res.status(400).json({ 
            success: false, 
            message: `Validation failed: ${errorMessages}`, 
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
    body(['lib_id', 'libId'])
        .custom((value, { req }) => {
            const id = req.body.lib_id || req.body.libId;
            if (!id) throw new Error('Librarian ID is required');
            if (!/^[a-zA-Z0-9]{8}$/.test(id)) throw new Error('Librarian ID must be exactly 8 alphanumeric characters');
            return true;
        }),
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
    body(['book_id', 'bookId'])
        .custom((value, { req }) => {
            if (!req.body.book_id && !req.body.bookId && !req.params.id) {
                throw new Error('Book ID is required');
            }
            return true;
        }),
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
    body(['member_id', 'memberId'])
        .custom((value, { req }) => {
            if (!req.body.member_id && !req.body.memberId && !req.params.id) {
                throw new Error('Member ID is required');
            }
            return true;
        }),
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
