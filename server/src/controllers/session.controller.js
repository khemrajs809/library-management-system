const pool = require('../db');
const { revokeSession, logSessionAction } = require('../services/session.service');

/**
 * GET /api/admin/sessions — List and filter login sessions
 */
const getSessions = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 15;
        const offset = (page - 1) * limit;

        const { startDate, endDate, user, status, deviceType, browser, search } = req.query;

        let query = `
            SELECT s.*, 
            (SELECT COUNT(*) FROM user_session_actions WHERE session_id = s.id) as action_count
            FROM user_login_sessions s 
            WHERE 1=1
        `;
        let countQuery = `SELECT COUNT(*) as total FROM user_login_sessions s WHERE 1=1`;
        const params = [];
        const countParams = [];

        // Apply filters
        if (startDate) {
            query += ` AND s.login_time >= ?`;
            countQuery += ` AND s.login_time >= ?`;
            params.push(`${startDate} 00:00:00`);
            countParams.push(`${startDate} 00:00:00`);
        }
        if (endDate) {
            query += ` AND s.login_time <= ?`;
            countQuery += ` AND s.login_time <= ?`;
            params.push(`${endDate} 23:59:59`);
            countParams.push(`${endDate} 23:59:59`);
        }
        if (status) {
            query += ` AND s.status = ?`;
            countQuery += ` AND s.status = ?`;
            params.push(status);
            countParams.push(status);
        }
        if (deviceType) {
            query += ` AND s.device_type = ?`;
            countQuery += ` AND s.device_type = ?`;
            params.push(deviceType);
            countParams.push(deviceType);
        }
        if (browser) {
            query += ` AND s.browser = ?`;
            countQuery += ` AND s.browser = ?`;
            params.push(browser);
            countParams.push(browser);
        }
        if (user) {
            query += ` AND (s.email LIKE ? OR s.user_name LIKE ?)`;
            countQuery += ` AND (s.email LIKE ? OR s.user_name LIKE ?)`;
            params.push(`%${user}%`, `%${user}%`);
            countParams.push(`%${user}%`, `%${user}%`);
        }
        if (search) {
            query += ` AND (s.email LIKE ? OR s.user_name LIKE ? OR s.ip_address LIKE ? OR s.location LIKE ?)`;
            countQuery += ` AND (s.email LIKE ? OR s.user_name LIKE ? OR s.ip_address LIKE ? OR s.location LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
            countParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }

        // Sorting
        query += ` ORDER BY s.login_time DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const countResult = await pool.query(countQuery, countParams);
        const total = Number(countResult[0].total);

        const rows = await pool.query(query, params);

        // Convert bigints / dates to standard JSON formats
        const data = rows.map(row => ({
            ...row,
            id: Number(row.id),
            risk_score: Number(row.risk_score),
            action_count: Number(row.action_count)
        }));

        res.status(200).json({
            success: true,
            data,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error('Error fetching sessions:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * GET /api/admin/sessions/:id/actions — List actions during a session
 */
const getSessionActions = async (req, res) => {
    const { id } = req.params;
    try {
        const actions = await pool.query(
            'SELECT * FROM user_session_actions WHERE session_id = ? ORDER BY created_at ASC',
            [id]
        );
        res.status(200).json({
            success: true,
            data: actions.map(act => ({
                ...act,
                id: Number(act.id),
                session_id: Number(act.session_id)
            }))
        });
    } catch (err) {
        console.error('Error fetching session actions:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * POST /api/admin/sessions/:id/terminate — Revoke session
 */
const terminateSession = async (req, res) => {
    const { id } = req.params;
    try {
        const session = await pool.query('SELECT token, session_status FROM user_login_sessions WHERE id = ?', [id]);
        if (session.length === 0) {
            return res.status(404).json({ success: false, message: 'Session not found' });
        }

        const { token, session_status } = session[0];
        if (session_status !== 'online') {
            return res.status(400).json({ success: false, message: 'Session is already inactive' });
        }

        // blacklist token if active
        if (token) {
            await pool.query(
                'UPDATE token_blacklist SET status = "inactive", logout_time = NOW() WHERE token = ?',
                [token]
            );
        }

        // Revoke session
        await revokeSession(id, false);

        res.status(200).json({ success: true, message: 'Session terminated successfully' });
    } catch (err) {
        console.error('Error terminating session:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * GET /api/admin/sessions/stats — Get dashboard summary metrics
 */
const getSessionStats = async (req, res) => {
    try {
        // KPI metrics
        const [
            totalCount, successfulCount, failedCount, blockedCount, onlineCount, highRiskCount
        ] = await Promise.all([
            pool.query('SELECT COUNT(*) as count FROM user_login_sessions'),
            pool.query('SELECT COUNT(*) as count FROM user_login_sessions WHERE status = "successful"'),
            pool.query('SELECT COUNT(*) as count FROM user_login_sessions WHERE status = "failed"'),
            pool.query('SELECT COUNT(*) as count FROM user_login_sessions WHERE status = "blocked"'),
            pool.query('SELECT COUNT(*) as count FROM user_login_sessions WHERE session_status = "online"'),
            pool.query('SELECT COUNT(*) as count FROM user_login_sessions WHERE risk_level = "High"')
        ]);

        // Device Type stats
        const deviceStats = await pool.query(
            'SELECT device_type, COUNT(*) as count FROM user_login_sessions WHERE status = "successful" GROUP BY device_type'
        );

        // Browser stats
        const browserStats = await pool.query(
            'SELECT browser, COUNT(*) as count FROM user_login_sessions WHERE status = "successful" GROUP BY browser'
        );

        // Weekly Trends (Last 7 Days)
        const weeklyTrends = await pool.query(`
            SELECT DATE(login_time) as date, status, COUNT(*) as count 
            FROM user_login_sessions 
            WHERE login_time >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
            GROUP BY DATE(login_time), status
            ORDER BY DATE(login_time) ASC
        `);

        // Recent alerts / suspicious attempts
        const alerts = await pool.query(`
            SELECT id, email, user_name, ip_address, browser, device_type, login_time, status, failure_reason, risk_level, risk_score
            FROM user_login_sessions 
            WHERE status IN ('blocked', 'suspicious') OR risk_level = 'High'
            ORDER BY login_time DESC 
            LIMIT 5
        `);

        res.status(200).json({
            success: true,
            data: {
                kpi: {
                    totalLogins: Number(totalCount[0].count),
                    successful: Number(successfulCount[0].count),
                    failed: Number(failedCount[0].count),
                    blocked: Number(blockedCount[0].count),
                    online: Number(onlineCount[0].count),
                    highRisk: Number(highRiskCount[0].count)
                },
                devices: deviceStats.map(d => ({ device: d.device_type || 'Unknown', count: Number(d.count) })),
                browsers: browserStats.map(b => ({ browser: b.browser || 'Unknown', count: Number(b.count) })),
                weeklyTrends: weeklyTrends.map(t => ({
                    date: t.date,
                    status: t.status,
                    count: Number(t.count)
                })),
                alerts: alerts.map(a => ({
                    ...a,
                    id: Number(a.id),
                    risk_score: Number(a.risk_score)
                }))
            }
        });
    } catch (err) {
        console.error('Error fetching session stats:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * POST /api/admin/sessions/log-action — Log route visit or download from client
 */
const logClientAction = async (req, res) => {
    const token = req.header('Authorization')?.split(' ')[1] || req.header('x-auth-token');
    const { actionType, description, path } = req.body;

    if (!token) {
        return res.status(401).json({ success: false, message: 'Authorization required' });
    }

    try {
        await logSessionAction(token, actionType || 'page_visit', description, path);
        res.status(200).json({ success: true, message: 'Action logged successfully' });
    } catch (err) {
        console.error('Error logging client action:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = {
    getSessions,
    getSessionActions,
    terminateSession,
    getSessionStats,
    logClientAction
};
