const pool = require('../db');

exports.getNotes = async (req, res) => {
    try {
        const rows = await pool.query('SELECT english_details, hinglish_details FROM project_notes WHERE id = 1');
        if (rows.length > 0) {
            const englishDetails = JSON.parse(rows[0].english_details || '[]');
            const hinglishDetails = JSON.parse(rows[0].hinglish_details || '[]');
            res.json({ success: true, notes: { englishDetails, hinglishDetails } });
        } else {
            res.status(404).json({ success: false, message: 'Notes not found' });
        }
    } catch (err) {
        console.error('Error fetching notes:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.verifyPattern = async (req, res) => {
    try {
        const { pattern } = req.body;
        const rows = await pool.query('SELECT pattern_password FROM project_notes WHERE id = 1');
        if (rows.length > 0) {
            if (rows[0].pattern_password === pattern) {
                res.json({ success: true, message: 'Pattern verified' });
            } else {
                res.status(401).json({ success: false, message: 'Invalid pattern' });
            }
        } else {
            res.status(404).json({ success: false, message: 'Notes not found' });
        }
    } catch (err) {
        console.error('Error verifying pattern:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
