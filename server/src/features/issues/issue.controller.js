const pool = require('../../config/db');
const { withTransaction } = require('../../common/services/dbTransaction.service');
const { generateLostBookHTML, generatePaymentReceiptHTML, generateFineReminderHTML } = require('../../utils/email.util');
const { invalidateCache } = require('../../utils/cache.util');
const { sendEmail } = require('../../common/services/email.service');
const { generateGenericMessageHTML } = require('../../utils/email.util');

// POST /api/issues — Issue a specific book copy to a member
const issueBook = async (req, res) => {
    const member_id = (req.body.memberId || req.body.member_id || '').trim();
    const input_book_id = (req.body.bookId || req.body.book_id || '').trim();
    if (!member_id || !input_book_id) return res.status(400).json({ success: false, message: 'Member ID and Book/Copy ID required' });

    try {
        const txResult = await withTransaction(async (conn) => {
            // 1. Verify Member
            const members = await conn.query('SELECT * FROM members WHERE member_id = ? AND is_deleted = 0', [member_id]);
            if (!members || members.length === 0) {
                return { errorStatus: 404, message: 'Member not found' };
            }
            const member = members[0];
            if (member.account_status && member.account_status !== 'Active') {
                return { errorStatus: 400, message: `Member account is ${member.account_status}` };
            }

            // 2. Resolve available copy
            let parentBookId = input_book_id;
            const lastDash = input_book_id.lastIndexOf('-');
            if (lastDash > 0 && !isNaN(Number(input_book_id.substring(lastDash + 1)))) {
                parentBookId = input_book_id.substring(0, lastDash);
            }

            // First check if input copy itself is available
            let targetCopy = null;
            const directCopy = await conn.query('SELECT * FROM book_copies WHERE copy_id = ?', [input_book_id]);
            if (directCopy && directCopy.length > 0 && directCopy[0].status === 'available') {
                targetCopy = directCopy[0];
            } else {
                // Check if any copy of this book is available
                const availCopies = await conn.query(
                    'SELECT * FROM book_copies WHERE (copy_id = ? OR book_id = ?) AND status = "available" ORDER BY copy_id ASC LIMIT 1',
                    [input_book_id, parentBookId]
                );
                if (availCopies && availCopies.length > 0) {
                    targetCopy = availCopies[0];
                } else if (directCopy && directCopy.length > 0) {
                    return { errorStatus: 400, message: `Copy ${input_book_id} is currently ${directCopy[0].status} and no other available copies exist.` };
                } else {
                    return { errorStatus: 404, message: 'No available copies of this book found.' };
                }
            }

            const copy_id = targetCopy.copy_id;
            const book_id = targetCopy.book_id;

            // 3. Eligibility checks
            const alreadyIssued = await conn.query(
                'SELECT i.issue_id FROM issues i JOIN book_copies bc ON i.book_id = bc.copy_id WHERE i.member_id = ? AND bc.book_id = ? AND i.status = "issued"',
                [member_id, book_id]
            );
            if (alreadyIssued && alreadyIssued.length > 0) {
                return { errorStatus: 400, message: 'Member already has a copy of this book issued.' };
            }

            const fines = await conn.query('SELECT SUM(fine_amount) as total_unpaid FROM issues WHERE member_id = ? AND fine_paid = 0', [member_id]);
            if (Number(fines[0]?.total_unpaid || 0) > 0) {
                return { errorStatus: 400, message: `Member has unpaid fines of ₹${fines[0].total_unpaid}.` };
            }

            const activeIssues = await conn.query('SELECT COUNT(*) as count FROM issues WHERE member_id = ? AND status = "issued"', [member_id]);
            const maxLimit = member.max_book_limit || 3;
            if (Number(activeIssues[0]?.count || 0) >= maxLimit) {
                return { errorStatus: 400, message: `Member has reached their limit of ${maxLimit} issued books.` };
            }

            const issue_date = new Date().toISOString().split('T')[0];
            const due_date = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            await conn.query(
                'INSERT INTO issues (book_id, member_id, issue_date, due_date, status) VALUES (?, ?, ?, ?, "issued")',
                [copy_id, member_id, issue_date, due_date]
            );
            await conn.query('UPDATE book_copies SET status = "issued" WHERE copy_id = ?', [copy_id]);

            return { success: true, due_date, copy_id };
        });

        if (txResult && txResult.errorStatus) {
            return res.status(txResult.errorStatus).json({ success: false, message: txResult.message });
        }

        await invalidateCache('cache:/api/admin/stats*');
        await invalidateCache('cache:/api/admin/overview-stats*');

        res.status(201).json({ success: true, message: `Book (${txResult.copy_id}) issued successfully`, due_date: txResult.due_date });
    } catch (err) {
        console.error('Issue Book Error:', err);
        let msg = 'Internal server error';
        if (err.sqlState === '45000') {
            msg = err.message.replace(/^.*?SQLState: 45000\)\s*/, '');
        } else if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.sqlState === '23000') {
            msg = 'Unable to process issue: please verify Member ID and Book Copy ID.';
        }
        res.status(500).json({ success: false, message: msg });
    }
};

// POST /api/issues/renew — Extend due date by 15 days
const renewBook = async (req, res) => {
    const issue_id = req.body.issueId || req.body.issue_id;
    if (!issue_id) return res.status(400).json({ success: false, message: 'Issue ID required' });

    try {
        const results = await pool.query('CALL proc_get_issue_details(?)', [issue_id]);
        const issueCheck = results[0];

        if (!issueCheck || issueCheck.length === 0 || issueCheck[0].status !== 'issued') return res.status(404).json({ success: false, message: 'Active issue not found' });

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

        const resultsSwap = await pool.query('CALL proc_find_available_copies(?)', [issue.actual_book_id]);
        const otherCopiesCheck = resultsSwap[0];

        if (otherCopiesCheck && otherCopiesCheck.length > 0) {
            const newCopy = otherCopiesCheck[0];
            const issue_date = new Date().toISOString().split('T')[0];

            await pool.query('CALL proc_renew_book_with_swap(?, ?, ?, ?, ?, ?)', [issue_id, issue.book_id, newCopy.copy_id, issue.member_id, issue_date, newDueStr]);

            return res.status(200).json({ success: true, message: `Renewed successfully by swapping to another available copy (ID: ${newCopy.copy_id})`, new_due_date: newDueStr });
        }

        await pool.query('CALL proc_renew_book_simple(?, ?)', [issue_id, newDueStr]);
        res.status(200).json({ success: true, message: 'Book renewed successfully', new_due_date: newDueStr });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// POST /api/issues/return — Return a book copy
const returnBook = async (req, res) => {
    const issue_id = req.body.issueId || req.body.issue_id;
    try {
        const txResult = await withTransaction(async (conn) => {
            const results = await conn.query('CALL proc_get_issue_details(?)', [issue_id]);
            const issueCheck = results[0];
            if (!issueCheck || issueCheck.length === 0 || issueCheck[0].status !== 'issued') {
                return { errorStatus: 404, message: 'Active issue not found' };
            }

            const issue = issueCheck[0];
            const return_date = new Date().toISOString().split('T')[0];
            let fine = 0;
            const due = new Date(issue.due_date);
            const ret = new Date(return_date);
            if (ret > due) fine = Math.ceil(Math.abs(ret - due) / (1000 * 60 * 60 * 24)) * 1;

            await conn.query('CALL proc_return_book(?, ?, ?, ?)', [issue_id, issue.book_id, return_date, fine]);

            // --- WAITLIST FULFILLMENT LOGIC ---
            const waitlistRows = await conn.query('CALL proc_get_waitlist_for_book(?)', [issue.actual_book_id]);
            let notifyPayload = null;
            if (waitlistRows && waitlistRows.length > 0 && waitlistRows[0].length > 0) {
                const nextInLine = waitlistRows[0][0];
                await conn.query('CALL proc_fulfill_reservation(?)', [nextInLine.reservation_id]);
                notifyPayload = nextInLine;
            }

            return { success: true, fine, notifyPayload };
        });

        if (txResult && txResult.errorStatus) {
            return res.status(txResult.errorStatus).json({ success: false, message: txResult.message });
        }

        if (txResult && txResult.notifyPayload) {
            const nextInLine = txResult.notifyPayload;
            const title = 'Your Reserved Book is Available!';
            const text = `Hi ${nextInLine.member_name},\n\nThe book you reserved is now available at the library! Please come pick it up within the next 48 hours.`;
            const html = generateGenericMessageHTML(nextInLine.member_name, title, text);
            try {
                sendEmail(nextInLine.member_email, title, text, html);
            } catch (emailErr) {
                console.warn('[API] Failed to send waitlist email', emailErr);
            }
        }

        await invalidateCache('cache:/api/admin/stats*');
        await invalidateCache('cache:/api/admin/overview-stats*');

        res.status(200).json({ success: true, message: 'Returned successfully', fine_amount: txResult ? txResult.fine : 0 });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// POST /api/issues/lost — Mark a book as lost and apply penalty
const markAsLost = async (req, res) => {
    const issue_id = req.body.issueId || req.body.issue_id;
    if (!issue_id) return res.status(400).json({ success: false, message: 'Issue ID required' });

    try {
        const results = await pool.query('CALL proc_get_lost_book_details(?)', [issue_id]);

        if (!results || !results[0] || results[0].length === 0 || results[0][0].status !== 'issued') return res.status(404).json({ success: false, message: 'Active issue not found' });

        const issue = results[0][0];
        const bookPrice = parseFloat(issue.price) || 0;
        const fine = bookPrice + 150;

        await pool.query('CALL proc_mark_as_lost(?, ?)', [issue_id, fine]);

        // Send email notification using new centralized HTML service
        if (issue.member_email) {
            const html = generateLostBookHTML(issue.member_name, issue.book_title, issue.book_id, fine);
            const text = `Hi ${issue.member_name},\n\nThe book "${issue.book_title}" (ID: ${issue.book_id}) has been marked as lost/damaged. As per our policy, a penalty of ₹${fine} (Book Price + ₹150) has been applied to your account.\n\nPlease visit the library to settle this amount.`;
            try {
                sendEmail(issue.member_email, 'Library Book Lost - Penalty Applied', text, html);
            } catch (err) {
                console.warn('[API] Failed to send lost book email', err);
            }
        }

        await invalidateCache('cache:/api/admin/stats*');
        await invalidateCache('cache:/api/admin/overview-stats*');

        res.status(200).json({ success: true, message: 'Book marked as lost and member notified', fine_amount: fine });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// GET /api/issues — Get all active issues
const getActiveIssues = async (req, res) => {
    try {
        const [rows] = await pool.query('CALL proc_get_active_issues()');
        res.status(200).json({ success: true, data: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// GET /api/issues/history — Get returned and lost issues
const getIssueHistory = async (req, res) => {
    try {
        const [rows] = await pool.query('CALL proc_get_issue_history()');
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
        const results = await pool.query('CALL proc_get_issue_for_payment(?)', [id]);
        const issueCheck = results[0];

        if (issueCheck.length === 0) return res.status(404).json({ success: false, message: 'Issue not found' });

        const issue = issueCheck[0];

        await pool.query('CALL proc_pay_fine(?)', [id]);

        if (issue.member_email) {
            const html = generatePaymentReceiptHTML(issue.member_name, issue.book_title, issue.fine_amount);
            const text = `Hi ${issue.member_name},\n\nWe have successfully received your fine payment of ₹${issue.fine_amount} for the book "${issue.book_title}".\n\nYour dues for this specific issue have been fully cleared.\n\nThank you!\n\nRegards,\nLibrary Management Team`;
            try {
                sendEmail(issue.member_email, 'Library Fine Payment Confirmation', text, html);
            } catch (err) {
                console.warn('[API] Failed to send fine payment email', err);
            }
        }

        await invalidateCache('cache:/api/admin/stats*');
        await invalidateCache('cache:/api/admin/overview-stats*');

        res.status(200).json({ success: true, message: 'Fine marked as paid and confirmation email sent' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// POST /api/issues/return-by-book — Return a book copy by barcode
const returnByBookId = async (req, res) => {
    const copy_id = req.body.bookId || req.body.book_id;
    try {
        const results = await pool.query('CALL proc_find_active_issue_by_copy(?)', [copy_id]);
        const rows = results[0];
        if (!rows || rows.length === 0) return res.status(404).json({ success: false, message: 'No active issue for this barcode' });

        const issue = rows[0];
        const return_date = new Date().toISOString().split('T')[0];
        let fine = 0;
        const due = new Date(issue.due_date);
        const ret = new Date(return_date);
        if (ret > due) fine = Math.ceil(Math.abs(ret - due) / (1000 * 60 * 60 * 24)) * 1;

        await pool.query('CALL proc_return_book(?, ?, ?, ?)', [issue.issue_id, copy_id, return_date, fine]);

        // --- WAITLIST FULFILLMENT LOGIC ---
        // We need the parent book_id to check waitlists
        const copyDetails = await pool.query('CALL proc_get_book_id_from_copy(?)', [copy_id]);
        if (copyDetails && copyDetails.length > 0) {
            const parentBookId = copyDetails[0].book_id;
            const waitlistRows = await pool.query('CALL proc_get_waitlist_for_book(?)', [parentBookId]);
            if (waitlistRows && waitlistRows.length > 0 && waitlistRows[0].length > 0) {
                const nextInLine = waitlistRows[0][0];
                
                await pool.query('CALL proc_fulfill_reservation(?)', [nextInLine.reservation_id]);

                const title = 'Your Reserved Book is Available!';
                const text = `Hi ${nextInLine.member_name},\n\nThe book you reserved is now available at the library! Please come pick it up within the next 48 hours.`;
                const html = generateGenericMessageHTML(nextInLine.member_name, title, text);
                
                try {
                    sendEmail(nextInLine.member_email, title, text, html);
                } catch (emailErr) {
                    console.warn('[API] Failed to send waitlist email', emailErr);
                }
            }
        }
        // ---------------------------------

        await invalidateCache('cache:/api/admin/stats*');

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
        const results = await pool.query('CALL proc_lookup_issue_by_copy(?)', [copy_id]);
        const rows = results[0];
        if (!rows || rows.length === 0) return res.status(404).json({ success: false, message: 'No active issue for this barcode' });
        const row = rows[0];
        const mappedData = {
            issueId: row.issue_id,
            issueDate: row.issue_date,
            dueDate: row.due_date,
            fineAmount: row.fine_amount,
            memberId: row.member_id,
            memberName: row.member_name,
            memberPhoto: row.member_photo,
            memberPhone: row.member_phone,
            memberEmail: row.member_email,
            department: row.member_dept,
            memberRoll: row.member_roll,
            memberCourse: row.member_course,
            memberSem: row.member_sem,
            memberType: row.member_type,
            memberSession: row.member_session,
            accountStatus: row.account_status,
            noDuesStatus: row.no_dues_status,
            copyId: row.copy_id,
            bookTitle: row.book_title,
            book_cover: row.book_cover,
            bookAuthor: row.book_author,
            book_isbn: row.book_isbn,
            bookStream: row.book_category,
            bookPrice: row.book_price,
            publicationYear: row.publication_year,
            bookPublisher: row.book_publisher,
            bookEdition: row.book_edition,
            bookShelf: row.book_shelf
        };
        res.status(200).json({ success: true, data: mappedData });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// GET /api/issues/fines-and-lost — Get all lost issues and issues with fines
const getFinesAndLost = async (req, res) => {
    try {
        const [rows] = await pool.query('CALL proc_get_fines_and_lost()');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const enhancedRows = rows.map(r => {
            if (r.status === 'issued') {
                const due = new Date(r.due_date);
                if (today > due) {
                    const diffTime = Math.abs(today - due);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    r.dynamic_fine = diffDays * 1;
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
        const results = await pool.query('CALL proc_get_issue_for_payment(?)', [id]);
        const check = results[0];

        if (check.length === 0) return res.status(404).json({ success: false, message: 'Issue not found' });

        const issue = check[0];
        if (!issue.member_email) return res.status(400).json({ success: false, message: 'Member has no email address' });

        let fine = issue.fine_amount;
        let type = 'Fine';
        if (issue.status === 'issued') {
            const due = new Date(issue.due_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (today > due) {
                const diffDays = Math.ceil(Math.abs(today - due) / (1000 * 60 * 60 * 24));
                fine = diffDays * 1;
                type = 'Overdue Fine';
            }
        } else if (issue.status === 'lost') {
            type = 'Lost Book Penalty';
        }

        const subject = `Library Notice: ${type} Pending`;
        const text = `Hi ${issue.member_name},\n\nThis is a reminder regarding the book "${issue.book_title}".\nStatus: ${issue.status.toUpperCase()}\nPending Amount: ₹${fine}\n\nPlease visit the library to clear your dues.\n\nThank you.`;
        const html = generateFineReminderHTML(issue.member_name, issue.book_title, issue.status, fine);

        try {
            sendEmail(issue.member_email, subject, text, html);
        } catch (err) {
            console.warn('[API] Failed to send fine reminder email', err);
        }
        res.status(200).json({ success: true, message: 'Reminder email queued successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = { issueBook, renewBook, returnBook, markAsLost, getActiveIssues, getIssueHistory, payFine, returnByBookId, lookupIssueByBookId, getFinesAndLost, sendFineReminder };
