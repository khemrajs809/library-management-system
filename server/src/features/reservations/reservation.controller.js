const pool = require('../../config/db');
const { sendEmail } = require('../../common/services/email.service');
const { generateGenericMessageHTML } = require('../../utils/email.util');

const createReservation = async (req, res) => {
    const { member_id, book_id } = req.body;
    
    if (!member_id || !book_id) {
        return res.status(400).json({ success: false, message: 'Member ID and Book ID are required.' });
    }

    try {
        // 1. Check if the book actually has 0 copies available
        const [availableCopies] = await pool.query('CALL proc_find_available_copies(?)', [book_id]);
        if (availableCopies.length > 0) {
            return res.status(400).json({ success: false, message: 'This book has available copies. Please issue it directly instead of reserving.' });
        }

        // 2. Create the reservation
        await pool.query('CALL proc_create_reservation(?, ?)', [member_id, book_id]);
        
        res.status(201).json({ success: true, message: 'Successfully joined the waitlist for this book.' });
    } catch (err) {
        console.error('Reservation Error:', err);
        res.status(500).json({ success: false, message: 'Server error processing reservation.' });
    }
};

const getWaitlists = async (req, res) => {
    try {
        const [rows] = await pool.query('CALL proc_get_all_waitlists()');
        res.status(200).json({ success: true, data: rows });
    } catch (err) {
        console.error('Waitlist Fetch Error:', err);
        res.status(500).json({ success: false, message: 'Server error fetching waitlists.' });
    }
};

const getWaitlistForBook = async (req, res) => {
    const { book_id } = req.params;
    try {
        const [rows] = await pool.query('CALL proc_get_waitlist_for_book(?)', [book_id]);
        res.status(200).json({ success: true, data: rows });
    } catch (err) {
        console.error('Waitlist Fetch Error:', err);
        res.status(500).json({ success: false, message: 'Server error fetching waitlist.' });
    }
};

const cancelReservation = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('CALL proc_cancel_reservation(?)', [id]);
        res.status(200).json({ success: true, message: 'Reservation cancelled.' });
    } catch (err) {
        console.error('Reservation Cancel Error:', err);
        res.status(500).json({ success: false, message: 'Server error cancelling reservation.' });
    }
};

module.exports = {
    createReservation,
    getWaitlists,
    getWaitlistForBook,
    cancelReservation
};
