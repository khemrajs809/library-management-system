const pool = require('../db');
const bcrypt = require('bcryptjs');
const Papa = require('papaparse');
const { sanitizeObject } = require('../services/sanitizer.service');

// POST /api/admin/librarians — Create a new librarian account
const createLibrarian = async (req, res) => {
    let { lib_id, name, email, password } = req.body;
    try {
        // Auto-generate lib_id if not provided
        if (!lib_id) {
            let unique = false;
            while (!unique) {
                lib_id = 'LIB' + Math.floor(10000 + Math.random() * 90000);
                const rows = await pool.query('SELECT 1 FROM users WHERE id = ?', [lib_id]);
                if (rows.length === 0) unique = true;
            }
        }
        const hashedPassword = await bcrypt.hash(password, 8);
        await pool.query(
            'INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, \'librarian\')',
            [lib_id, name, email, hashedPassword]
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
        const rows = await pool.query('SELECT id as lib_id, name, email, status, created_at FROM users WHERE role = \'librarian\' ORDER BY created_at DESC');
        res.status(200).json({ success: true, data: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// PUT /api/admin/librarians/:id/password — Update a librarian's password
const updateLibrarianPassword = async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 8);
        await pool.query('UPDATE users SET password = ? WHERE id = ? AND role = \'librarian\'', [hashedPassword, id]);
        res.status(200).json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// GET /api/admin/stats — Overview metrics for dashboard
const getStats = async (req, res) => {
    try {
        const rowsBooks = await pool.query('SELECT COUNT(*) as count FROM books');
        const rowsMembers = await pool.query('SELECT COUNT(*) as count FROM members');
        const rowsIssued = await pool.query('SELECT COUNT(*) as count FROM issues WHERE status = "issued"');
        const rowsReturned = await pool.query('SELECT COUNT(*) as count FROM issues WHERE status = "returned"');
        const rowsOverdue = await pool.query('SELECT COUNT(*) as count FROM issues WHERE status = "issued" AND due_date < CURDATE()');
        
        // 1. Line Chart (Rental rate vs User conversion for 12 months)
        const currentYear = new Date().getFullYear();
        const monthlyIssues = await pool.query(`SELECT MONTH(issue_date) as month, COUNT(*) as count FROM issues WHERE YEAR(issue_date) = ? GROUP BY MONTH(issue_date)`, [currentYear]);
        const monthlyMembers = await pool.query(`SELECT MONTH(created_at) as month, COUNT(*) as count FROM members WHERE YEAR(created_at) = ? GROUP BY MONTH(created_at)`, [currentYear]);
        
        const lineChartIssues = new Array(12).fill(0);
        const lineChartMembers = new Array(12).fill(0);
        monthlyIssues.forEach(r => lineChartIssues[r.month - 1] = Number(r.count));
        monthlyMembers.forEach(r => lineChartMembers[r.month - 1] = Number(r.count));

        // 2. Donut Chart (Books condition)
        const donutStats = await pool.query(`SELECT status, COUNT(*) as count FROM book_copies GROUP BY status`);
        let allCopies = 0, newCopies = 0, damageCopies = 0, lostCopies = 0, issuedCopies = 0;
        donutStats.forEach(r => {
            allCopies += Number(r.count);
            if (r.status === 'available') newCopies += Number(r.count);
            if (r.status === 'damaged') damageCopies += Number(r.count);
            if (r.status === 'lost') lostCopies += Number(r.count);
            if (r.status === 'issued') issuedCopies += Number(r.count);
        });

        // 3. Bar Chart (Borrowed rate by stream)
        const streamStats = await pool.query(`
            SELECT COALESCE(b.stream, 'General') as stream, COUNT(i.issue_id) as count 
            FROM issues i 
            JOIN books b ON i.book_id = b.book_id 
            GROUP BY b.stream 
            ORDER BY count DESC 
            LIMIT 9
        `);
        const barLabels = streamStats.map(r => r.stream || 'Unknown');
        const barData = streamStats.map(r => Number(r.count));

        // 4. Restricted Members Count (for the stat card)
        const restrictedCountRes = await pool.query(`
            SELECT COUNT(DISTINCT m.member_id) as count 
            FROM members m 
            JOIN issues i ON m.member_id = i.member_id 
            WHERE i.status = 'issued' AND i.due_date < CURDATE()
        `);
        const restrictedMembersCount = Number(restrictedCountRes[0].count);

        // 5. Top 5 Popular Books
        const popularBooksRes = await pool.query(`
            SELECT b.title, b.author, COUNT(i.issue_id) as borrow_count 
            FROM issues i 
            JOIN books b ON i.book_id = b.book_id 
            GROUP BY b.book_id, b.title, b.author 
            ORDER BY borrow_count DESC 
            LIMIT 5
        `);
        const popularBooks = popularBooksRes.map(b => ({
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
        await pool.query('DELETE FROM users WHERE id = ? AND role = \'librarian\'', [id]);
        res.status(200).json({ success: true, message: 'Librarian account deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const generateUniqueLibrarianId = async (req, res) => {
    let unique = false;
    let newId = '';
    while (!unique) {
        newId = 'LIB' + Math.floor(10000 + Math.random() * 90000);
        const rows = await pool.query('SELECT 1 FROM users WHERE id = ?', [newId]);
        if (rows.length === 0) unique = true;
    }
    res.json({ success: true, id: newId });
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
                        'INSERT INTO books (title, author, isbn, category, quantity, available, price, shelf_location) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
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
                        'INSERT INTO members (member_id, name, email, phone, address, status) VALUES (?, ?, ?, ?, ?, ?)',
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
            pool.query('SELECT SUM(quantity) as count FROM books'),
            pool.query('SELECT COUNT(*) as count FROM members'),
            pool.query('SELECT COUNT(*) as count FROM users WHERE role = \'librarian\''),
            pool.query('SELECT COUNT(*) as count FROM users WHERE role = \'admin\''),
            pool.query('SELECT COUNT(*) as count FROM issues WHERE status = "issued"'),
            pool.query('SELECT COUNT(*) as count FROM issues WHERE status = "issued" AND due_date < CURDATE()')
        ]);

        const totalBooks = Number(rowsBooks[0].count) || 0;
        const totalMembers = Number(rowsMembers[0].count) || 0;
        const totalStaff = Number(rowsLibrarians[0].count) + Number(rowsAdmins[0].count);
        const totalIssued = Number(rowsIssued[0].count) || 0;
        const totalOverdue = Number(rowsOverdue[0].count) || 0;

        // Categories (Stream)
        const categoriesRes = await pool.query('SELECT COALESCE(stream, "General") as category, COUNT(*) as count FROM books GROUP BY stream ORDER BY count DESC LIMIT 6');
        const categoriesData = categoriesRes.map(row => ({ category: row.category, count: Number(row.count) }));

        // Top Borrowed Books
        const popularRes = await pool.query(`
            SELECT b.title, b.author, COUNT(i.issue_id) as count, b.cover_url
            FROM issues i 
            JOIN books b ON i.book_id = b.book_id 
            GROUP BY b.book_id, b.title, b.author, b.cover_url 
            ORDER BY count DESC 
            LIMIT 5
        `);
        const popularBooks = popularRes.map(row => ({ title: row.title, author: row.author, cover_url: row.cover_url, count: Number(row.count) }));

        // Recent Activities
        const recentActivities = await pool.query(`
            SELECT 'issue' as type, b.title, m.name as user_name, i.issue_date as date 
            FROM issues i JOIN books b ON i.book_id = b.book_id JOIN members m ON i.member_id = m.member_id 
            ORDER BY i.issue_date DESC LIMIT 5
        `);
        
        // Overdue details
        const overdueRes = await pool.query(`
            SELECT m.name as member_name, m.member_id, b.title as book_title, i.issue_date, i.due_date,
                   DATEDIFF(CURDATE(), i.due_date) as overdue_days, i.fine_amount
            FROM issues i 
            JOIN books b ON i.book_id = b.book_id 
            JOIN members m ON i.member_id = m.member_id 
            WHERE i.status = 'issued' AND i.due_date < CURDATE()
            ORDER BY overdue_days DESC LIMIT 10
        `);
        const overdueList = overdueRes.map(row => ({
            member_name: row.member_name,
            member_id: row.member_id,
            book_title: row.book_title,
            issue_date: row.issue_date,
            due_date: row.due_date,
            overdue_days: Number(row.overdue_days),
            fine_amount: Number(row.fine_amount)
        }));

        // Fine Amount
        const fineResult = await pool.query('SELECT SUM(fine_amount) as total FROM issues WHERE fine_paid = 0');
        const totalFine = Number(fineResult[0].total) || 0;

        // Library Collection Summary
        const [catRes, authorRes, newBooksRes] = await Promise.all([
            pool.query('SELECT COUNT(DISTINCT stream) as count FROM books'),
            pool.query('SELECT COUNT(DISTINCT author) as count FROM books'),
            pool.query('SELECT COUNT(*) as count FROM books WHERE MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())')
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
                    totalCategories: Number(catRes[0].count),
                    totalAuthors: Number(authorRes[0].count),
                    newBooksThisMonth: Number(newBooksRes[0].count)
                }
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getAuditLogs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const countResult = await pool.query('SELECT COUNT(*) as total FROM audit_logs');
        const total = Number(countResult[0].total);

        const rows = await pool.query(`
            SELECT a.*, u.name as user_name, u.email as user_email
            FROM audit_logs a 
            LEFT JOIN users u ON a.user_id = u.id 
            ORDER BY a.created_at DESC 
            LIMIT ? OFFSET ?
        `, [limit, offset]);
        
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
        await pool.query('UPDATE users SET status = ? WHERE id = ? AND role = \'librarian\'', [status, id]);
        res.status(200).json({ success: true, message: `Librarian status updated to ${status}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = { createLibrarian, getLibrarians, updateLibrarianPassword, deleteLibrarian, getStats, importBooks, importMembers, getOverviewStats, generateUniqueLibrarianId, getAuditLogs, updateLibrarianStatus };
