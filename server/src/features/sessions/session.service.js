const pool = require('../../config/db');

/**
 * Self-healing Database Initialization for login sessions and user session actions
 */
const initSessionDb = async () => {
    try {
        await pool.query('CALL proc_init_session_tables()');
        console.log('✅ Session monitoring tables verified.');
    } catch (err) {
        console.error('❌ Session monitoring tables initialization error:', err);
    }
};

/**
 * Utility to parse User Agent string
 */
const parseUserAgent = (ua) => {
    if (!ua) return { browser: 'Unknown', os: 'Unknown', device_type: 'Desktop' };
    
    let browser = 'Unknown';
    let os = 'Unknown';
    let device_type = 'Desktop';

    const uaLower = ua.toLowerCase();
    if (/mobi|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(uaLower)) {
        if (/ipad|tablet/i.test(uaLower)) {
            device_type = 'Tablet';
        } else {
            device_type = 'Mobile';
        }
    } else {
        device_type = 'Desktop';
    }

    if (/windows/i.test(ua)) os = 'Windows';
    else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
    else if (/linux/i.test(ua)) os = 'Linux';
    else if (/android/i.test(ua)) os = 'Android';
    else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';

    if (/edg/i.test(ua)) browser = 'Edge';
    else if (/chrome|crios/i.test(ua) && !/edge|edg|opr|opera/i.test(ua)) browser = 'Chrome';
    else if (/safari/i.test(ua) && !/chrome|crios|edge|edg|opr|opera/i.test(ua)) browser = 'Safari';
    else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
    else if (/opr|opera/i.test(ua)) browser = 'Opera';

    return { browser, os, device_type };
};

const geoip = require('geoip-lite');

/**
 * Helper to get Real Location from IP
 */
const getLocationFromIp = async (ip) => {
    let finalIp = ip;
    let location = 'Unknown Location';

    if (!ip) return { location, realIp: finalIp };

    // If local network, fetch actual public IP for demo/testing purposes
    if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
        try {
            const response = await fetch('http://ip-api.com/json/');
            const data = await response.json();
            if (data && data.status === 'success') {
                finalIp = data.query;
                location = `${data.city}, ${data.country}`;
                return { location, realIp: finalIp };
            }
        } catch (error) {
            console.error('Localhost IP fetch failed:', error.message);
            return { location: 'Local Network (Intranet)', realIp: finalIp };
        }
    }

    // For real public IPs, use local geoip-lite database
    const geo = geoip.lookup(finalIp);
    if (geo) {
        location = `${geo.city}, ${geo.country}`;
        if (location === ', ') location = geo.country;
    }

    return { location, realIp: finalIp };
};

/**
 * Log a user login session (Successful or Failed)
 */
const logSession = async ({
    userId = null,
    userName = null,
    email,
    ipAddress,
    userAgent,
    status = 'successful',
    failureReason = null,
    token = null,
    role = null
}) => {
    try {
        const { browser, os, device_type } = parseUserAgent(userAgent);
        const { location, realIp } = await getLocationFromIp(ipAddress);
        
        let riskScore = 0;
        let riskLevel = 'Low';

        if (status === 'failed') {
            riskScore = 15;
            riskLevel = 'Low';
        } else if (status === 'blocked') {
            riskScore = 40;
            riskLevel = 'Medium';
        } else if (status === 'suspicious') {
            riskScore = 75;
            riskLevel = 'High';
        }

        // Multi-device login detection
        if (userId && status === 'successful') {
            const [activeSessions] = await pool.query('CALL proc_get_other_active_sessions(?, ?, ?)', [userId, device_type, browser]);
            if (activeSessions.length > 0) {
                riskScore += 30;
                riskLevel = riskScore > 50 ? 'High' : 'Medium';
            }
        }

        const result = await pool.query(
            'CALL proc_log_session(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [userId, userName, email, realIp, userAgent, browser, os, device_type, location, status, failureReason, status === 'successful' ? 'online' : 'offline', riskScore, riskLevel, token, role]
        );
        
        return Number(result[0]?.[0]?.insert_id);
    } catch (err) {
        console.error('Error logging user session:', err);
        return null;
    }
};

/**
 * Log action performed during an active session
 */
const logSessionAction = async (token, actionType, description, path = null) => {
    try {
        if (!token) return;
        const session = await pool.query('CALL proc_find_active_session_by_token(?)', [token]);
        if (!session[0] || session[0].length === 0) return;

        const sessionId = session[0][0].id;
        await pool.query('CALL proc_log_session_action(?, ?, ?, ?)', [sessionId, actionType, description, path]);
    } catch (err) {
        console.error('Error logging session action:', err);
    }
};

/**
 * Terminate/Revoke a session
 */
const revokeSession = async (sessionId, isExpired = false) => {
    try {
        const sessionStatus = isExpired ? 'expired' : 'offline';
        await pool.query('CALL proc_revoke_session(?, ?)', [sessionId, sessionStatus]);
    } catch (err) {
        console.error('Error revoking session:', err);
    }
};

module.exports = {
    initSessionDb,
    logSession,
    logSessionAction,
    revokeSession,
    parseUserAgent,
    getLocationFromIp
};
