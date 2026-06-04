const pool = require('../../config/db');
const { revokeSession, logSessionAction } = require('./session.service');

/**
 * GET /api/admin/sessions — List and filter login sessions
 */
const getSessions = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 15;
        const offset = (page - 1) * limit;

        const { startDate, endDate, user, status, deviceType, browser, search } = req.query;

        const results = await pool.query('CALL proc_get_sessions_filtered(?, ?, ?, ?, ?, ?, ?, ?, ?)', [
            startDate ? `${startDate} 00:00:00` : null,
            endDate ? `${endDate} 23:59:59` : null,
            user || null,
            status || null,
            deviceType || null,
            browser || null,
            search || null,
            limit,
            offset
        ]);

        const rows = results[0];
        const totalCountRow = results[1] ? results[1][0] : null;
        const total = totalCountRow ? Number(totalCountRow.total) : 0;

        // Convert bigints / dates to standard JSON formats
        const data = rows.map(row => {
            // Determine real-time status based on last activity
            const lastActivity = new Date(row.last_activity_time).getTime();
            const now = Date.now();
            const diffMins = (now - lastActivity) / (1000 * 60);

            let realtimeStatus = row.session_status;
            if (row.session_status === 'online') {
                if (diffMins > 30) realtimeStatus = 'offline'; // Abandoned
                else if (diffMins > 10) realtimeStatus = 'idle';
            }

            return {
                id: Number(row.id),
                user_id: row.user_id,
                user_name: row.user_name,
                email: row.email,
                role: row.role,
                status: row.status,
                ip_address: row.ip_address,
                browser: row.browser,
                os: row.os,
                device_type: row.device_type,
                location: row.location,
                risk_level: row.risk_level,
                risk_score: Number(row.risk_score),
                action_count: Number(row.action_count),
                realtime_status: realtimeStatus,
                is_current: row.token === (req.header('Authorization')?.split(' ')[1] || req.header('x-auth-token')),
                login_time: row.login_time ? new Date(row.login_time).toISOString() : null,
                logout_time: row.logout_time ? new Date(row.logout_time).toISOString() : null,
                last_activity_time: row.last_activity_time ? new Date(row.last_activity_time).toISOString() : null
            };
        });

        console.log("DEBUG FIRST SESSION ROW:", data[0]);
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
        console.error('Error fetching sessions:', {
            message: err.message,
            stack: err.stack,
            query: req.query
        });
        res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
};

/**
 * GET /api/admin/sessions/:id/actions — List actions during a session
 */
const getSessionActions = async (req, res) => {
    const { id } = req.params;
    try {
        const [actions] = await pool.query('CALL proc_get_session_actions(?)', [id]);
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
        const [session] = await pool.query('CALL proc_get_session_for_termination(?)', [id]);
        if (session.length === 0) {
            return res.status(404).json({ success: false, message: 'Session not found' });
        }

        const { token, session_status } = session[0];
        if (session_status !== 'online') {
            return res.status(400).json({ success: false, message: 'Session is already inactive' });
        }

        // blacklist token if active
        if (token) {
            await pool.query('CALL proc_terminate_session_blacklist(?)', [token]);
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
        // Fetch all stats in parallel using procedural calls
        const [kpiRes, deviceRes, browserRes, weeklyRes, alertRes] = await Promise.all([
            pool.query('CALL proc_get_session_stats_kpis()'),
            pool.query('CALL proc_get_session_stats_devices()'),
            pool.query('CALL proc_get_session_stats_browsers()'),
            pool.query('CALL proc_get_session_stats_weekly()'),
            pool.query('CALL proc_get_session_alerts()')
        ]);

        const kpis = kpiRes[0][0];
        const devices = deviceRes[0];
        const browsers = browserRes[0];
        const weeklyTrends = weeklyRes[0];
        const alerts = alertRes[0];

        res.status(200).json({
            success: true,
            data: {
                kpi: {
                    totalLogins: Number(kpis.total_logins),
                    successful: Number(kpis.successful),
                    failed: Number(kpis.failed),
                    blocked: Number(kpis.blocked),
                    online: Number(kpis.online_count),
                    highRisk: Number(kpis.high_risk)
                },
                devices: devices.map(d => ({ device: d.device || 'Unknown', count: Number(d.count) })),
                browsers: browsers.map(b => ({ browser: b.browser || 'Unknown', count: Number(b.count) })),
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
        console.error('Error fetching session stats:', {
            message: err.message,
            stack: err.stack
        });
        res.status(500).json({ success: false, message: 'Server error: ' + err.message });
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
