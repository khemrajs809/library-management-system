const { jwtDecrypt } = require('jose');
const crypto = require('crypto');
const dotenv = require('dotenv');

dotenv.config();

const pool = require('../config/db');
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET is not defined.");
    process.exit(1);
}

// Derive the exact same 32-byte secret used in auth.controller
const encryptionSecret = crypto.createHash('sha256').update(JWT_SECRET).digest();

/**
 * Basic authentication middleware to verify JWT presence and validity.
 */
const verifyToken = async (req, res, next) => {
    // Check for token in cookies first, fallback to headers for legacy support during transition
    const token = req.cookies?.token || req.header('Authorization')?.split(' ')[1] || req.header('x-auth-token');

    if (!token) {
        return res.status(401).json({ success: false, message: 'No token, authorization denied' });
    }

    try {
        // Check if session is inactive
        const sessionCheck = await pool.query('CALL proc_check_token_status(?)', [token]);
        if (sessionCheck[0] && sessionCheck[0].length > 0 && sessionCheck[0][0].status === 'inactive') {
            return res.status(401).json({ success: false, message: 'Session revoked. Please login again.' });
        }

        // Decrypt and verify JWE
        const { payload: decoded } = await jwtDecrypt(token, encryptionSecret);
        
        // Standardize the user object on the request
        req.user = decoded; 

        // Non-blocking update of last activity time
        pool.query('CALL proc_update_last_activity(?)', [token])
            .catch(err => console.error('Error updating activity time:', err.message));

        next();
    } catch (err) {
        res.status(401).json({ success: false, message: 'Token is not valid' });
    }
};

/**
 * Role-based authorization middleware factory.
 * @param {string[]} allowedRoles - Array of roles allowed to access the route
 */
const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                success: false, 
                message: `Access denied: ${req.user.role} role does not have permission for this action.` 
            });
        }
        next();
    };
};

module.exports = { verifyToken, checkRole };
