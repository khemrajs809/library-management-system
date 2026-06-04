const rateLimit = require('express-rate-limit');

// 1. Admin Endpoints
const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Moderate limit for admin ops
    message: { success: false, message: 'Too many admin operations from this IP. Please try again later.' },
    standardHeaders: true, legacyHeaders: false, passOnStoreError: true,
});

// 2. Books Endpoints
const bookLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 2000, // High limit for catalog browsing
    message: { success: false, message: 'Too many book requests from this IP. Please try again later.' },
    standardHeaders: true, legacyHeaders: false, passOnStoreError: true,
});

// 3. Members Endpoints
const memberLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000, // Standard limit
    message: { success: false, message: 'Too many member operations from this IP. Please try again later.' },
    standardHeaders: true, legacyHeaders: false, passOnStoreError: true,
});

// 4. Issues Endpoints
const issueLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000, // Standard limit
    message: { success: false, message: 'Too many issue operations from this IP. Please try again later.' },
    standardHeaders: true, legacyHeaders: false, passOnStoreError: true,
});

// 5. Notes Endpoints
const notesLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1500, // Standard limit
    message: { success: false, message: 'Too many notes requests from this IP. Please try again later.' },
    standardHeaders: true, legacyHeaders: false, passOnStoreError: true,
});

// 6. Public/Announcements Endpoints
const publicLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 2000, // High limit for public reads
    message: { success: false, message: 'Too many public requests from this IP. Please try again later.' },
    standardHeaders: true, legacyHeaders: false, passOnStoreError: true,
});

// 7. Stricter Rate Limiting for Authentication Endpoints
const authLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute window
    max: 10, // strict blocking after 10 requests
    message: { success: false, message: 'Too many login attempts. Please try again in 1 minute.' },
    standardHeaders: true, legacyHeaders: false, passOnStoreError: true,
});

module.exports = {
    adminLimiter,
    bookLimiter,
    memberLimiter,
    issueLimiter,
    notesLimiter,
    publicLimiter,
    authLimiter
};
