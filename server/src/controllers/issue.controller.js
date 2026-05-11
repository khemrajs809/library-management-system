const pool = require('../db');
const transporter = require('../config/mailer');

// POST /api/issues — Issue a specific book copy to a member
const issueBook = async (req, res) => {
    const { member_id, book_id: copy_id } = req.body;
    if (!member_id || !copy_id) return res.status(400).json({ success: false, message: 'Member ID and Copy ID required' });

    try {
        const memberCheck = await pool.query('SELECT * FROM members WHERE member_id = ?', [member_id]);
        if (memberCheck.length === 0) return res.status(404).json({ success: false, message: 'Member not found' });

        const copyCheck = await pool.query('SELECT * FROM book_copies WHERE copy_id = ?', [copy_id]);
        if (copyCheck.length === 0) return res.status(404).json({ success: false, message: 'Book copy not found' });
        if (copyCheck[0].status !== 'available') return res.status(400).json({ success: false, message: `This copy is currently ${copyCheck[0].status}.` });

        const actual_book_id = copyCheck[0].book_id;
        const alreadyIssuedCheck = await pool.query(`
            SELECT i.* FROM issues i
            JOIN book_copies bc ON i.book_id = bc.copy_id
            WHERE i.member_id = ? AND bc.book_id = ? AND i.status = 'issued'
        `, [member_id, actual_book_id]);

        if (alreadyIssuedCheck.length > 0) {
            return res.status(400).json({ success: false, message: 'Member already has a copy of this book issued.' });
        }

        const fineCheck = await pool.query('SELECT SUM(fine_amount) as total_unpaid FROM issues WHERE member_id = ? AND fine_paid = 0', [member_id]);
        if (fineCheck[0].total_unpaid > 0) {
            return res.status(400).json({ success: false, message: `Member has pending fines of ₹${fineCheck[0].total_unpaid}.` });
        }

        const issueCount = await pool.query('SELECT COUNT(*) as count FROM issues WHERE member_id = ? AND status = ?', [member_id, 'issued']);
        if (Number(issueCount[0].count) >= 3) return res.status(400).json({ success: false, message: 'Member has already issued 3 books' });

        const issue_date = new Date().toISOString().split('T')[0];
        const due_date = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        await pool.query('INSERT INTO issues (book_id, member_id, issue_date, due_date) VALUES (?, ?, ?, ?)', [copy_id, member_id, issue_date, due_date]);
        await pool.query('UPDATE book_copies SET status = "issued" WHERE copy_id = ?', [copy_id]);

        res.status(201).json({ success: true, message: 'Book issued successfully', due_date });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// POST /api/issues/renew — Extend due date by 15 days
const renewBook = async (req, res) => {
    const { issue_id } = req.body;
    if (!issue_id) return res.status(400).json({ success: false, message: 'Issue ID required' });

    try {
        const issueCheck = await pool.query(`
            SELECT i.*, bc.book_id as actual_book_id 
            FROM issues i 
            JOIN book_copies bc ON i.book_id = bc.copy_id 
            WHERE i.issue_id = ? AND i.status = ?
        `, [issue_id, 'issued']);
        
        if (issueCheck.length === 0) return res.status(404).json({ success: false, message: 'Active issue not found' });

        const issue = issueCheck[0];
        const today = new Date();
        const due = new Date(issue.due_date);
        today.setHours(0, 0, 0, 0);
        due.setHours(0, 0, 0, 0);

        if (today > due) {
            return res.status(400).json({ success: false, message: 'Book is overdue. Cannot renew. Please return and pay fine.' });
        }

        const newDueDate = new Date(today);
        newDueDate.setDate(newDueDate.getDate() + 15);
        const newDueStr = newDueDate.toISOString().split('T')[0];

        const otherCopiesCheck = await pool.query('SELECT * FROM book_copies WHERE book_id = ? AND status = "available" LIMIT 1', [issue.actual_book_id]);
        
        if (otherCopiesCheck.length > 0) {
            const newCopy = otherCopiesCheck[0];
            const issue_date = new Date().toISOString().split('T')[0];
            
            await pool.query('UPDATE issues SET return_date = ?, fine_amount = 0, status = "returned" WHERE issue_id = ?', [issue_date, issue_id]);
            await pool.query('UPDATE book_copies SET status = "available" WHERE copy_id = ?', [issue.book_id]);
            
            await pool.query('INSERT INTO issues (book_id, member_id, issue_date, due_date) VALUES (?, ?, ?, ?)', [newCopy.copy_id, issue.member_id, issue_date, newDueStr]);
            await pool.query('UPDATE book_copies SET status = "issued" WHERE copy_id = ?', [newCopy.copy_id]);
            
            return res.status(200).json({ success: true, message: `Renewed successfully by swapping to another available copy (ID: ${newCopy.copy_id})`, new_due_date: newDueStr });
        }

        await pool.query('UPDATE issues SET due_date = ? WHERE issue_id = ?', [newDueStr, issue_id]);
        res.status(200).json({ success: true, message: 'Book renewed successfully', new_due_date: newDueStr });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// POST /api/issues/return — Return a book copy
const returnBook = async (req, res) => {
    const { issue_id } = req.body;
    try {
        const issueCheck = await pool.query('SELECT * FROM issues WHERE issue_id = ? AND status = ?', [issue_id, 'issued']);
        if (issueCheck.length === 0) return res.status(404).json({ success: false, message: 'Active issue not found' });

        const issue = issueCheck[0];
        const return_date = new Date().toISOString().split('T')[0];
        let fine = 0;
        const due = new Date(issue.due_date);
        const ret = new Date(return_date);
        if (ret > due) fine = Math.ceil(Math.abs(ret - due) / (1000*60*60*24)) * 1;

        await pool.query('UPDATE issues SET return_date = ?, fine_amount = ?, status = ? WHERE issue_id = ?', [return_date, fine, 'returned', issue_id]);
        await pool.query('UPDATE book_copies SET status = "available" WHERE copy_id = ?', [issue.book_id]);

        res.status(200).json({ success: true, message: 'Returned successfully', fine_amount: fine });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// POST /api/issues/lost — Mark a book as lost and apply penalty
const markAsLost = async (req, res) => {
    const { issue_id } = req.body;
    if (!issue_id) return res.status(400).json({ success: false, message: 'Issue ID required' });

    try {
        // Fixed query: now properly JOINs members table to get name and email
        const issueCheck = await pool.query(`
            SELECT i.*, b.price, b.title as book_title, m.name as member_name, m.email as member_email
            FROM issues i
            JOIN books b ON i.book_id = b.book_id
            JOIN members m ON i.member_id = m.member_id
            WHERE i.issue_id = ? AND i.status = ?
        `, [issue_id, 'issued']);

        if (issueCheck.length === 0) return res.status(404).json({ success: false, message: 'Active issue not found' });

        const issue = issueCheck[0];
        const bookPrice = parseFloat(issue.price) || 0;
        const fine = bookPrice + 150;

        await pool.query('UPDATE issues SET fine_amount = ?, status = ? WHERE issue_id = ?', [fine, 'lost', issue_id]);

        // Send email notification (non-blocking — failure won't affect the API response)
        if (issue.member_email) {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: issue.member_email,
                subject: 'Library Book Lost - Penalty Applied',
                text: `Hi ${issue.member_name},\n\nThe book "${issue.book_title}" (ID: ${issue.book_id}) has been marked as lost/damaged. As per our policy, a penalty of ₹${fine} (Book Price + ₹150) has been applied to your account.\n\nPlease visit the library to settle this amount.`
            };
            transporter.sendMail(mailOptions, (err) => {
                if (err) console.error('Error sending lost book mail:', err.message);
            });
        }

        res.status(200).json({ success: true, message: 'Book marked as lost and member notified', fine_amount: fine });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// GET /api/issues — Get all active (currently issued) books
const getActiveIssues = async (req, res) => {
    try {
        const rows = await pool.query(`
            SELECT i.issue_id, i.issue_date, i.due_date, i.status, i.fine_amount, i.fine_paid, i.created_at,
                   m.member_id, m.name as member_name, m.email as member_email, m.phone as member_phone,
                   m.department as member_dept, m.course as member_course, m.membership_type, m.photo_url as member_photo,
                   m.academic_session, m.guardian_name, m.guardian_phone,
                   bc.copy_id as book_id, b.title as book_title, b.author as book_author, b.stream as book_stream, 
                   b.price as book_price, b.isbn, b.publisher, b.shelf_location
            FROM issues i
            JOIN members m ON i.member_id = m.member_id
            JOIN book_copies bc ON i.book_id = bc.copy_id
            JOIN books b ON bc.book_id = b.book_id
            WHERE i.status = 'issued'
            ORDER BY i.issue_date DESC
        `);
        res.status(200).json({ success: true, data: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// GET /api/issues/history — Get returned and lost issues
const getIssueHistory = async (req, res) => {
    try {
        const rows = await pool.query(`
            SELECT i.issue_id, i.issue_date, i.due_date, i.return_date, i.status, i.fine_amount, i.fine_paid, i.created_at,
                   m.member_id, m.name as member_name, m.email as member_email, m.phone as member_phone, 
                   m.department as member_dept, m.course as member_course, m.photo_url as member_photo,
                   m.academic_session, m.guardian_name, m.guardian_phone,
                   bc.copy_id as book_id, b.title as book_title, b.price as book_price, b.isbn, 
                   b.author as book_author, b.stream as book_stream, b.publisher, b.shelf_location
            FROM issues i
            JOIN members m ON i.member_id = m.member_id
            JOIN book_copies bc ON i.book_id = bc.copy_id
            JOIN books b ON bc.book_id = b.book_id
            WHERE i.status IN ('returned', 'lost')
            ORDER BY i.return_date DESC
        `);
        res.status(200).json({ success: true, data: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// POST /api/issues/:id/pay-fine — Mark a fine as paid
const payFine = async (req, res) => {
    const { id } = req.params;
    try {
        const issueCheck = await pool.query(`
            SELECT i.*, m.name as member_name, m.email as member_email, b.title as book_title
            FROM issues i
            JOIN members m ON i.member_id = m.member_id
            JOIN book_copies bc ON i.book_id = bc.copy_id
            JOIN books b ON bc.book_id = b.book_id
            WHERE i.issue_id = ?
        `, [id]);

        if (issueCheck.length === 0) return res.status(404).json({ success: false, message: 'Issue not found' });
        
        const issue = issueCheck[0];

        await pool.query('UPDATE issues SET fine_paid = 1 WHERE issue_id = ?', [id]);

        if (issue.member_email) {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: issue.member_email,
                subject: 'Library Fine Payment Confirmation',
                text: `Hi ${issue.member_name},\n\nWe have successfully received your fine payment of ₹${issue.fine_amount} for the book "${issue.book_title}".\n\nYour dues for this specific issue have been fully cleared.\n\nThank you!\n\nRegards,\nLibrary Management Team`
            };
            transporter.sendMail(mailOptions, (err) => {
                if (err) console.error('Error sending fine payment mail:', err.message);
            });
        }

        res.status(200).json({ success: true, message: 'Fine marked as paid and confirmation email sent' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// POST /api/issues/return-by-book — Return a book copy by barcode
const returnByBookId = async (req, res) => {
    const { book_id: copy_id } = req.body;
    try {
        const issueCheck = await pool.query('SELECT * FROM issues WHERE book_id = ? AND status = ?', [copy_id, 'issued']);
        if (issueCheck.length === 0) return res.status(404).json({ success: false, message: 'No active issue for this barcode' });

        const issue = issueCheck[0];
        const return_date = new Date().toISOString().split('T')[0];
        let fine = 0;
        const due = new Date(issue.due_date);
        const ret = new Date(return_date);
        if (ret > due) fine = Math.ceil(Math.abs(ret - due) / (1000*60*60*24)) * 1;

        await pool.query('UPDATE issues SET return_date = ?, fine_amount = ?, status = ? WHERE issue_id = ?', [return_date, fine, 'returned', issue.issue_id]);
        await pool.query('UPDATE book_copies SET status = "available" WHERE copy_id = ?', [copy_id]);

        res.status(200).json({ success: true, message: 'Returned successfully', fine_amount: fine });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// GET /api/issues/lookup/:book_id — Find active issue details for a copy ID
const lookupIssueByBookId = async (req, res) => {
    const { book_id: copy_id } = req.params;
    try {
        const rows = await pool.query(`
            SELECT i.issue_id, i.issue_date, i.due_date, i.fine_amount,
                   m.member_id, m.name as member_name, m.photo_url as member_photo,
                   m.phone as member_phone, m.email as member_email, m.department as member_dept, m.roll_number as member_roll,
                   m.course as member_course, m.year_semester as member_sem, m.membership_type as member_type,
                   m.academic_session as member_session, m.account_status, m.no_dues_status,
                   bc.copy_id, b.title as book_title, b.cover_url as book_cover,
                   b.author as book_author, b.isbn as book_isbn, b.stream as book_category, b.price as book_price, b.publication_year,
                   NULL as book_publisher, NULL as book_edition, NULL as book_shelf
            FROM issues i
            JOIN members m ON i.member_id = m.member_id
            JOIN book_copies bc ON i.book_id = bc.copy_id
            JOIN books b ON bc.book_id = b.book_id
            WHERE bc.copy_id = ? AND i.status = 'issued'
        `, [copy_id]);

        if (rows.length === 0) return res.status(404).json({ success: false, message: 'No active issue for this barcode' });
        res.status(200).json({ success: true, data: rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
// GET /api/issues/fines-and-lost — Get all lost issues and issues with fines
const getFinesAndLost = async (req, res) => {
    try {
        const rows = await pool.query(`
            SELECT i.issue_id, i.issue_date, i.due_date, i.return_date, i.status, i.fine_amount, i.fine_paid, i.created_at,
                   m.member_id, m.name as member_name, m.email as member_email, m.phone as member_phone, m.department as member_dept, m.course as member_course, m.photo_url as member_photo, m.academic_session, m.guardian_name, m.guardian_phone,
                   bc.copy_id as book_id, b.title as book_title, b.price as book_price, b.author as book_author, b.stream as book_stream, b.isbn, b.publication_year, b.publisher, b.shelf_location
            FROM issues i
            JOIN members m ON i.member_id = m.member_id
            JOIN book_copies bc ON i.book_id = bc.copy_id
            JOIN books b ON bc.book_id = b.book_id
            WHERE i.status = 'lost' OR i.fine_amount > 0 OR (i.status = 'issued' AND i.due_date < CURDATE())
            ORDER BY CASE WHEN i.status = 'issued' THEN 0 ELSE 1 END, i.due_date ASC
        `);
        
        // Calculate dynamic fines for overdue active issues
        const today = new Date();
        today.setHours(0,0,0,0);
        
        const enhancedRows = rows.map(r => {
            if (r.status === 'issued') {
                const due = new Date(r.due_date);
                if (today > due) {
                    const diffTime = Math.abs(today - due);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    r.dynamic_fine = diffDays * 1; // 1 rupee per day
                } else {
                    r.dynamic_fine = 0;
                }
            } else {
                r.dynamic_fine = r.fine_amount;
            }
            return r;
        });

        res.status(200).json({ success: true, data: enhancedRows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// POST /api/issues/:id/send-reminder — Send fine/lost email reminder
const sendFineReminder = async (req, res) => {
    const { id } = req.params;
    try {
        const check = await pool.query(`
            SELECT i.*, m.name as member_name, m.email as member_email, b.title as book_title
            FROM issues i
            JOIN members m ON i.member_id = m.member_id
            JOIN book_copies bc ON i.book_id = bc.copy_id
            JOIN books b ON bc.book_id = b.book_id
            WHERE i.issue_id = ?
        `, [id]);

        if (check.length === 0) return res.status(404).json({ success: false, message: 'Issue not found' });
        
        const issue = check[0];
        if (!issue.member_email) return res.status(400).json({ success: false, message: 'Member has no email address' });

        let fine = issue.fine_amount;
        let type = 'Fine';
        if (issue.status === 'issued') {
            const due = new Date(issue.due_date);
            const today = new Date();
            today.setHours(0,0,0,0);
            if (today > due) {
                const diffDays = Math.ceil(Math.abs(today - due) / (1000 * 60 * 60 * 24));
                fine = diffDays * 1;
                type = 'Overdue Fine';
            }
        } else if (issue.status === 'lost') {
            type = 'Lost Book Penalty';
        }

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: issue.member_email,
            subject: `Library Notice: ${type} Pending`,
            text: `Hi ${issue.member_name},\n\nThis is a reminder regarding the book "${issue.book_title}".\nStatus: ${issue.status.toUpperCase()}\nPending Amount: ₹${fine}\n\nPlease visit the library to clear your dues.\n\nThank you.`
        };

        transporter.sendMail(mailOptions, (err) => {
            if (err) return res.status(500).json({ success: false, message: 'Failed to send email' });
            res.status(200).json({ success: true, message: 'Reminder email sent successfully' });
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = { issueBook, renewBook, returnBook, markAsLost, getActiveIssues, getIssueHistory, payFine, returnByBookId, lookupIssueByBookId, getFinesAndLost, sendFineReminder };
