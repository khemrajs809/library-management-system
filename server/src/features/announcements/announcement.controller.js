const pool = require('../../config/db');
const { invalidateCache } = require('../../utils/cache.util');

// GET /api/announcements/active - Public: Fetch current active announcements
const getActiveAnnouncements = async (req, res) => {
    try {
        const [rows] = await pool.query('CALL proc_get_active_announcements()');
        res.status(200).json({ 
            success: true, 
            data: rows,
            serverTime: new Date()
        });
    } catch (err) {
        console.error("❌ getActiveAnnouncements Error:", err);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch announcements',
            error: err.message,
            stack: err.stack 
        });
    }
};

// POST /api/admin/announcements - Admin: Create new announcement
const createAnnouncement = async (req, res) => {
    try {
        const data = req.body;
        const params = [
            data.title, 
            data.message, 
            data.type, 
            data.priority, 
            data.is_active ? 1 : 0,
            data.scroll_speed, 
            data.background_color, 
            data.text_color, 
            data.border_color || data.background_color,
            data.start_time, 
            data.end_time, 
            data.show_icon ? 1 : 0, 
            data.show_close_button ? 1 : 0, 
            data.pause_on_hover ? 1 : 0
        ];

        await pool.query('CALL proc_create_announcement(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', params);
        await invalidateCache('cache:/api/announcements*');
        res.status(201).json({ success: true, message: 'Announcement created successfully' });
    } catch (err) {
        console.error("Announcement Creation Error:", err);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to create announcement',
            error: err.message 
        });
    }
};

// GET /api/admin/announcements - Admin: List all for management
const getAllAnnouncements = async (req, res) => {
    try {
        const [rows] = await pool.query('CALL proc_get_all_announcements()');
        res.status(200).json({ success: true, data: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// PATCH /api/admin/announcements/:id/status - Admin: Toggle active status
const toggleStatus = async (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body;
    try {
        await pool.query('CALL proc_toggle_announcement_status(?, ?)', [id, is_active ? 1 : 0]);
        await invalidateCache('cache:/api/announcements*');
        res.status(200).json({ success: true, message: 'Status updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Update failed' });
    }
};

// DELETE /api/admin/announcements/:id - Admin: Soft delete
const deleteAnnouncement = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('CALL proc_delete_announcement(?)', [id]);
        await invalidateCache('cache:/api/announcements*');
        res.status(200).json({ success: true, message: 'Announcement deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Deletion failed' });
    }
};

// POST /api/announcements/:id/view - Public: Track views
const trackView = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('CALL proc_track_announcement_view(?)', [id]);
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
};

module.exports = {
    getActiveAnnouncements,
    createAnnouncement,
    getAllAnnouncements,
    toggleStatus,
    deleteAnnouncement,
    trackView
};
