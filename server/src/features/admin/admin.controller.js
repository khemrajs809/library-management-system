const pool = require('../../config/db');
const bcrypt = require('bcryptjs');
const Papa = require('papaparse');
const { sanitizeObject } = require('../../common/services/sanitizer.service');
const zxcvbn = require('zxcvbn');
const { sendEmail } = require('../../common/services/email.service');

// POST /api/admin/librarians — Create a new librarian account
const createLibrarian = async (req, res) => {
    let { name, email, password } = req.body;
    let lib_id = req.body.libId || req.body.lib_id;
    try {
        if (!password || zxcvbn(password).score < 3) {
            return res.status(400).json({ success: false, message: 'Password is too weak. Please use a stronger password.' });
        }
        // Auto-generate lib_id if not provided
        if (!lib_id) {
            let unique = false;
            while (!unique) {
                lib_id = 'LIB' + Math.floor(10000 + Math.random() * 90000);
                const [rows] = await pool.query('CALL proc_check_user_id(?)', [lib_id]);
                if (rows.length === 0) unique = true;
            }
        }
        const hashedPassword = await bcrypt.hash(password, 8);
        await pool.query(
            'CALL proc_create_librarian(?, ?, ?, ?)',
            [lib_id, name, email, hashedPassword]
        );

        // Send welcome email with credentials
        sendEmail(
            email,
            'Welcome to LMS - Librarian Account Created',
            `Hello ${name},\n\nYour Librarian account has been successfully created.\n\nYour Login ID: ${lib_id}\nYour Password: ${password}\n\nPlease log in and change your password immediately.\n\nBest regards,\nLMS Administrator`
        );

        res.status(201).json({ success: true, message: 'Librarian account created successfully', lib_id });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'Librarian ID or Email already exists' });
        }
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};


// GET /api/admin/librarians — List all librarians
const getLibrarians = async (req, res) => {
    try {
        const [rows] = await pool.query('CALL proc_get_librarians()');
        res.status(200).json({ success: true, data: rows });
    } catch (err) {
        console.error("❌ getLibrarians Error:", err);
        res.status(500).json({ 
            success: false, 
            message: 'Server error',
            error: err.message,
            stack: err.stack
        });
    }
};

// PUT /api/admin/librarians/:id/password — Update a librarian's password
const updateLibrarianPassword = async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || zxcvbn(password).score < 3) {
        return res.status(400).json({ success: false, message: 'Password is too weak. Please use a stronger password.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 8);
        await pool.query('CALL proc_update_librarian_password(?, ?)', [id, hashedPassword]);
        res.status(200).json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// GET /api/admin/stats — Overview metrics for dashboard
const getStats = async (req, res) => {
    try {
        const [rowsBooks] = await pool.query('CALL proc_get_total_books_count()');
        const [rowsMembers] = await pool.query('CALL proc_get_total_members_count()');
        const [rowsIssued] = await pool.query('CALL proc_get_total_issued_count()');
        const [rowsReturned] = await pool.query('CALL proc_get_total_returned_count()');
        const [rowsOverdue] = await pool.query('CALL proc_get_total_overdue_count()');
        
        // 1. Line Chart (Rental rate vs User conversion for 12 months)
        const currentYear = new Date().getFullYear();
        const [monthlyIssues] = await pool.query(`CALL proc_get_monthly_issue_stats(?)`, [currentYear]);
        const [monthlyMembers] = await pool.query(`CALL proc_get_monthly_member_stats(?)`, [currentYear]);
        
        const lineChartIssues = new Array(12).fill(0);
        const lineChartMembers = new Array(12).fill(0);
        monthlyIssues.forEach(r => lineChartIssues[r.month - 1] = Number(r.count));
        monthlyMembers.forEach(r => lineChartMembers[r.month - 1] = Number(r.count));

        // 2. Donut Chart (Books condition)
        const [donutStats] = await pool.query(`CALL proc_get_book_condition_stats()`);
        let allCopies = 0, newCopies = 0, damageCopies = 0, lostCopies = 0, issuedCopies = 0;
        donutStats.forEach(r => {
            allCopies += Number(r.count);
            if (r.status === 'available') newCopies += Number(r.count);
            if (r.status === 'damaged') damageCopies += Number(r.count);
            if (r.status === 'lost') lostCopies += Number(r.count);
            if (r.status === 'issued') issuedCopies += Number(r.count);
        });

        // 3. Bar Chart (Borrowed rate by stream)
        const [streamStats] = await pool.query(`CALL proc_get_borrow_rate_by_stream()`);
        const barLabels = streamStats.map(r => r.stream || 'Unknown');
        const barData = streamStats.map(r => Number(r.count));

        // 4. Restricted Members Count (for the stat card)
        const [restrictedCountRes] = await pool.query(`CALL proc_get_restricted_members_count()`);
        const restrictedMembersCount = Number(restrictedCountRes[0].count);

        // 5. Top 5 Popular Books
        const [rowsPop] = await pool.query(`CALL proc_get_popular_books()`);
        const popularBooks = rowsPop.map(b => ({
            title: b.title,
            author: b.author,
            borrow_count: Number(b.borrow_count)
        }));
        
        res.status(200).json({
            success: true,
            data: {
                totalTitles: Number(rowsBooks[0].count),
                totalBooks: allCopies,
                totalMembers: Number(rowsMembers[0].count),
                totalIssued: Number(rowsIssued[0].count),
                totalReturned: Number(rowsReturned[0].count),
                totalOverdue: Number(rowsOverdue[0].count),
                lineChart: { issues: lineChartIssues, members: lineChartMembers },
                donutChart: { all: allCopies, available: newCopies, damaged: damageCopies, lost: lostCopies, issued: issuedCopies },
                barChart: { labels: barLabels, data: barData },
                popularBooks: popularBooks,
                restrictedMembersCount: restrictedMembersCount
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// DELETE /api/admin/librarians/:id — Delete a librarian account
const deleteLibrarian = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('CALL proc_delete_librarian(?)', [id]);
        res.status(200).json({ success: true, message: 'Librarian account deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const generateUniqueLibrarianId = async (req, res) => {
    try {
        let unique = false;
        let newId = '';
        while (!unique) {
            newId = 'LIB' + Math.floor(10000 + Math.random() * 90000);
            const [rows] = await pool.query('CALL proc_check_user_id(?)', [newId]);
            if (rows.length === 0) unique = true;
        }
        res.json({ success: true, id: newId });
    } catch (err) {
        console.error("❌ generateUniqueLibrarianId Error:", err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
};

const importBooks = async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const csvData = req.file.buffer.toString();
    
    Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
            const books = results.data;
            let successCount = 0;
            let errors = [];

            for (let book of books) {
                try {
                    book = sanitizeObject(book); // Sanitize for CSV Injection safety
                    if (!book.title || !book.isbn) {
                        errors.push(`Row: Missing title or ISBN`);
                        continue;
                    }
                    await pool.query(
                        'CALL proc_import_book(?, ?, ?, ?, ?, ?, ?, ?)',
                        [book.title, book.author || 'Unknown', book.isbn, book.category || 'General', book.quantity || 1, book.quantity || 1, book.price || 0, book.shelf_location || 'A1']
                    );
                    successCount++;
                } catch (err) {
                    errors.push(`ISBN ${book.isbn}: ${err.message}`);
                }
            }
            res.json({ success: true, message: `Imported ${successCount} books successfully`, errors });
        }
    });
};

const importMembers = async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const csvData = req.file.buffer.toString();

    Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
            const members = results.data;
            let successCount = 0;
            let errors = [];

            for (let member of members) {
                try {
                    member = sanitizeObject(member); // Sanitize for CSV Injection safety
                    if (!member.name || !member.member_id) {
                        errors.push(`Row: Missing name or Member ID`);
                        continue;
                    }
                    await pool.query(
                        'CALL proc_import_member(?, ?, ?, ?, ?, ?)',
                        [member.member_id, member.name, member.email || '', member.phone || '', member.address || '', 'active']
                    );
                    successCount++;
                } catch (err) {
                    errors.push(`ID ${member.member_id}: ${err.message}`);
                }
            }
            res.json({ success: true, message: `Imported ${successCount} members successfully`, errors });
        }
    });
};

const getOverviewStats = async (req, res) => {
    try {
        const [
            rowsBooks, rowsMembers, rowsLibrarians, rowsAdmins, rowsIssued, rowsOverdue
        ] = await Promise.all([
            pool.query('CALL proc_get_total_books_quantity()'),
            pool.query('CALL proc_get_total_members_count()'),
            pool.query('CALL proc_get_total_librarians_count()'),
            pool.query('CALL proc_get_total_admins_count()'),
            pool.query('CALL proc_get_total_issued_count()'),
            pool.query('CALL proc_get_total_overdue_count()')
        ]);

        const totalBooks = Number(rowsBooks[0][0].count) || 0;
        const totalMembers = Number(rowsMembers[0][0].count) || 0;
        const totalStaff = Number(rowsLibrarians[0][0].count) + Number(rowsAdmins[0][0].count);
        const totalIssued = Number(rowsIssued[0][0].count) || 0;
        const totalOverdue = Number(rowsOverdue[0][0].count) || 0;

        // Categories (Stream)
        const [rowsCategories] = await pool.query('CALL proc_get_book_categories_stats()');
        const categoriesData = rowsCategories.map(row => ({ category: row.category, count: Number(row.count) }));

        // Top Borrowed Books
        const [rowsPopular] = await pool.query('CALL proc_get_popular_books_with_cover()');
        const popularBooks = rowsPopular.map(row => ({ title: row.title, author: row.author, cover_url: row.cover_url, count: Number(row.count) }));

        // Recent Activities
        const [rowsRecent] = await pool.query('CALL proc_get_recent_activities()');
        const recentActivities = rowsRecent;
        
        // Overdue details
        const [rowsOverdueDetailed] = await pool.query('CALL proc_get_overdue_details()');
        const overdueList = rowsOverdueDetailed.map(row => ({
            member_name: row.member_name,
            member_id: row.member_id,
            book_title: row.book_title,
            issue_date: row.issue_date,
            due_date: row.due_date,
            overdue_days: Number(row.overdue_days),
            fine_amount: Number(row.fine_amount)
        }));

        // Fine Amount
        const [fineResult] = await pool.query('CALL proc_get_total_unpaid_fine()');
        const totalFine = Number(fineResult[0]?.total) || 0;

        // Library Collection Summary
        const [
            [catRes], [authorRes], [newBooksRes]
        ] = await Promise.all([
            pool.query('CALL proc_get_total_categories_count()'),
            pool.query('CALL proc_get_total_authors_count()'),
            pool.query('CALL proc_get_new_books_count_this_month()')
        ]);

        res.status(200).json({
            success: true,
            data: {
                kpi: { totalBooks, totalMembers, totalStaff, totalIssued, totalOverdue },
                categories: categoriesData,
                popularBooks,
                recentActivities,
                overdueList,
                totalFine,
                collection: {
                    totalCategories: Number(catRes[0]?.count) || 0,
                    totalAuthors: Number(authorRes[0]?.count) || 0,
                    newBooksThisMonth: Number(newBooksRes[0]?.count) || 0
                }
            }
        });
    } catch (err) {
        console.error("Overview Stats Error:", err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message, stack: err.stack });
    }
};

const getAuditLogs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const [countResult] = await pool.query('CALL proc_get_total_audit_logs_count()');
        const total = Number(countResult[0].total);

        const [rows] = await pool.query('CALL proc_get_audit_logs(?, ?)', [limit, offset]);
        
        res.status(200).json({ 
            success: true, 
            data: rows,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const updateLibrarianStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    try {
        await pool.query('CALL proc_update_librarian_status(?, ?)', [id, status]);

        // --- SECURITY KILL SWITCH ---
        // If deactivating, kill all active sessions immediately
        if (status === 'inactive') {
            const [sessions] = await pool.query('CALL proc_get_active_sessions(?)', [id]);
            
            for (const s of sessions) {
                // Blacklist the token
                await pool.query('CALL proc_blacklist_token(?, ?)', [s.token, id]);
            }
            
            // Mark all sessions as offline in the registry
            await pool.query('CALL proc_terminate_user_sessions(?)', [id]);
        }

        res.status(200).json({ success: true, message: `Librarian status updated to ${status}${status === 'inactive' ? ' and all active sessions terminated' : ''}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = { createLibrarian, getLibrarians, updateLibrarianPassword, deleteLibrarian, getStats, importBooks, importMembers, getOverviewStats, generateUniqueLibrarianId, getAuditLogs, updateLibrarianStatus };
