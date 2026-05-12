const pool = require('../db');
const Papa = require('papaparse');
const { sendEmail } = require('../services/email.service');
const { sanitizeObject } = require('../services/sanitizer.service');

// POST /api/members — Register a new member
const addMember = async (req, res) => {
    const {
        name, dob, gender, phone, email,
        permanent_address, current_address,
        curr_house, curr_street, curr_area, curr_city, curr_state, curr_pincode,
        perm_house, perm_street, perm_area, perm_city, perm_state, perm_pincode,
        course, department, year_semester,
        membership_type, no_dues_status,
        roll_number, academic_session, hod_name,
        guardian_name, guardian_phone, blood_group,
        membership_expiry, max_book_limit, account_status
    } = req.body;
    let { member_id } = req.body;
    if (!member_id) {
        member_id = 'MEM-' + Math.floor(1000 + Math.random() * 9000);
    }

    if (!name || !dob) {
        return res.status(400).json({ success: false, message: 'Name and Date of Birth required' });
    }

    const dobDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - dobDate.getFullYear();
    const m = today.getMonth() - dobDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
        age--;
    }
    if (age < 5) {
        return res.status(400).json({ success: false, message: 'Member must be at least 5 years old' });
    }

    if (email) {
        const emailCheck = await pool.query('SELECT member_id FROM members WHERE email = ?', [email]);
        if (emailCheck.length > 0) {
            return res.status(409).json({ success: false, message: 'Email is already registered to another member' });
        }
    }

    const photo_url = req.files?.['photo'] ? `/uploads/${req.files['photo'][0].filename}` : null;
    const govt_id_url = req.files?.['govt_id'] ? `/uploads/${req.files['govt_id'][0].filename}` : null;
    const admission_receipt_url = req.files?.['admission_receipt'] ? `/uploads/${req.files['admission_receipt'][0].filename}` : null;
    const security_deposit_url = req.files?.['security_deposit'] ? `/uploads/${req.files['security_deposit'][0].filename}` : null;

    try {
        await pool.query(
            `INSERT INTO members (
                member_id, name, dob, gender, phone, email, 
                permanent_address, current_address, 
                curr_house, curr_street, curr_area, curr_city, curr_state, curr_pincode,
                perm_house, perm_street, perm_area, perm_city, perm_state, perm_pincode,
                course, department, year_semester, 
                membership_type, no_dues_status, 
                roll_number, academic_session, hod_name,
                guardian_name, guardian_phone, blood_group,
                membership_expiry, max_book_limit, account_status,
                photo_url, govt_id_url, admission_receipt_url, security_deposit_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                member_id, name, dob, gender, phone, email,
                permanent_address, current_address,
                curr_house, curr_street, curr_area, curr_city, curr_state, curr_pincode,
                perm_house, perm_street, perm_area, perm_city, perm_state, perm_pincode,
                course, department, year_semester,
                membership_type || 'Student',
                (no_dues_status === 'true' || no_dues_status === '1' || no_dues_status === true || no_dues_status === 1) ? 1 : 0,
                roll_number, academic_session, hod_name,
                guardian_name, guardian_phone, blood_group,
                membership_expiry || null, max_book_limit || 3, account_status || 'Active',
                photo_url, govt_id_url, admission_receipt_url, security_deposit_url
            ]
        );
        res.status(201).json({ success: true, message: 'Member created successfully', member_id, photo_url });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'Member ID already exists' });
        }
        console.error('Add Member Error:', err);
        res.status(500).json({ success: false, message: 'Internal server error: ' + err.message });
    }
};

// GET /api/members — List or search members with pagination
const getRecentActivities = async (req, res) => {
    try {
        const [logs] = await pool.query(
            'SELECT id, action, user_id as performed_by, created_at FROM audit_logs WHERE action LIKE ? ORDER BY created_at DESC LIMIT 5',
            ['%Member%']
        );
        res.json({ success: true, data: logs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getMembers = async (req, res) => {
    try {
        const { q } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;

        let rows;
        let totalCount = 0;

        if (q) {
            const like = `%${q}%`;
            const countResult = await pool.query('SELECT COUNT(*) as total FROM members WHERE is_deleted = 0 AND (name LIKE ? OR member_id LIKE ? OR phone LIKE ?)', [like, like, like]);
            totalCount = Number(countResult[0].total);

            rows = await pool.query(`
                SELECT member_id, name, dob, gender, phone, email, permanent_address, current_address, 
                       curr_house, curr_street, curr_area, curr_city, curr_state, curr_pincode,
                       perm_house, perm_street, perm_area, perm_city, perm_state, perm_pincode,
                       course, department, year_semester, membership_type, no_dues_status, 
                       roll_number, academic_session, hod_name, guardian_name, guardian_phone, blood_group, 
                       membership_expiry, max_book_limit, account_status, photo_url, created_at
                FROM members 
                WHERE is_deleted = 0 AND (name LIKE ? OR member_id LIKE ? OR phone LIKE ?) 
                ORDER BY created_at DESC LIMIT ? OFFSET ?`, [like, like, like, limit, offset]);
        } else {
            const countResult = await pool.query('SELECT COUNT(*) as total FROM members WHERE is_deleted = 0');
            totalCount = Number(countResult[0].total);

            rows = await pool.query(`
                SELECT member_id, name, dob, gender, phone, email, permanent_address, current_address, 
                       curr_house, curr_street, curr_area, curr_city, curr_state, curr_pincode,
                       perm_house, perm_street, perm_area, perm_city, perm_state, perm_pincode,
                       course, department, year_semester, membership_type, no_dues_status, 
                       roll_number, academic_session, hod_name, guardian_name, guardian_phone, blood_group, 
                       membership_expiry, max_book_limit, account_status, photo_url, created_at
                FROM members 
                WHERE is_deleted = 0 
                ORDER BY created_at DESC LIMIT ? OFFSET ?`, [limit, offset]);
        }

        res.status(200).json({
            success: true,
            data: rows.map(member => {
                if (member.membership_expiry && new Date(member.membership_expiry) < new Date()) {
                    member.account_status = 'Suspended';
                }
                return member;
            }),
            pagination: {
                total: totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit)
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// GET /api/members/:id — Get a single member
const getMember = async (req, res) => {
    try {
        const rows = await pool.query(`
            SELECT member_id, name, dob, gender, phone, email, permanent_address, current_address, 
                   curr_house, curr_street, curr_area, curr_city, curr_state, curr_pincode,
                   perm_house, perm_street, perm_area, perm_city, perm_state, perm_pincode,
                   course, department, year_semester, membership_type, no_dues_status, 
                   roll_number, academic_session, hod_name, guardian_name, guardian_phone, blood_group, 
                   membership_expiry, max_book_limit, account_status, photo_url, created_at
            FROM members 
            WHERE member_id = ?`, [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Member not found' });
        
        const member = rows[0];
        if (member.membership_expiry && new Date(member.membership_expiry) < new Date()) {
            member.account_status = 'Suspended';
        }
        
        res.status(200).json({ success: true, data: member });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// GET /api/members/:id/profile — Full member profile with borrowing history & stats
const getMemberProfile = async (req, res) => {
    try {
        const memberRows = await pool.query(`
            SELECT member_id, name, dob, gender, phone, email, permanent_address, current_address, 
                   curr_house, curr_street, curr_area, curr_city, curr_state, curr_pincode,
                   perm_house, perm_street, perm_area, perm_city, perm_state, perm_pincode,
                   course, department, year_semester, membership_type, no_dues_status, 
                   roll_number, academic_session, hod_name, guardian_name, guardian_phone, blood_group, 
                   membership_expiry, max_book_limit, account_status, photo_url, created_at
            FROM members 
            WHERE member_id = ?`, [req.params.id]);
        if (memberRows.length === 0) return res.status(404).json({ success: false, message: 'Member not found' });
        const member = memberRows[0];
        if (member.membership_expiry && new Date(member.membership_expiry) < new Date()) {
            member.account_status = 'Suspended';
        }

        const historyRows = await pool.query(`
            SELECT i.issue_id, i.issue_date, i.due_date, i.return_date, i.status, i.fine_amount, i.fine_paid,
                   b.book_id, b.title as book_title, b.isbn
            FROM issues i
            JOIN books b ON i.book_id = b.book_id
            WHERE i.member_id = ?
            ORDER BY i.issue_date DESC
        `, [req.params.id]);

        const stats = {
            total_borrowed: historyRows.length,
            active_issues: historyRows.filter(r => r.status === 'issued').length,
            overdue: historyRows.filter(r => r.status === 'issued' && new Date(r.due_date) < new Date()).length,
            total_fines: historyRows.reduce((sum, r) => sum + parseFloat(r.fine_amount || 0), 0)
        };

        res.status(200).json({ success: true, data: { member, history: historyRows, stats } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// PUT /api/members/:id — Update member details and optional photo
const updateMember = async (req, res) => {
    const {
        name, dob, gender, phone, email,
        permanent_address, current_address,
        curr_house, curr_street, curr_area, curr_city, curr_state, curr_pincode,
        perm_house, perm_street, perm_area, perm_city, perm_state, perm_pincode,
        course, department, year_semester,
        membership_type, no_dues_status,
        roll_number, academic_session, hod_name,
        guardian_name, guardian_phone, blood_group,
        membership_expiry, max_book_limit, account_status
    } = req.body;
    const { id } = req.params;

    if (!name || !dob) {
        return res.status(400).json({ success: false, message: 'Name and DOB are required' });
    }

    const dobDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - dobDate.getFullYear();
    const m = today.getMonth() - dobDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
        age--;
    }
    if (age < 5) {
        return res.status(400).json({ success: false, message: 'Member must be at least 5 years old' });
    }

    if (email) {
        const emailCheck = await pool.query('SELECT member_id FROM members WHERE email = ? AND member_id != ?', [email, id]);
        if (emailCheck.length > 0) {
            return res.status(409).json({ success: false, message: 'Email is already registered to another member' });
        }
    }

    try {
        const photo_url = req.files?.['photo'] ? `/uploads/${req.files['photo'][0].filename}` : null;
        const govt_id_url = req.files?.['govt_id'] ? `/uploads/${req.files['govt_id'][0].filename}` : null;
        const admission_receipt_url = req.files?.['admission_receipt'] ? `/uploads/${req.files['admission_receipt'][0].filename}` : null;
        const security_deposit_url = req.files?.['security_deposit'] ? `/uploads/${req.files['security_deposit'][0].filename}` : null;

        let query = `UPDATE members SET 
            name = ?, dob = ?, gender = ?, phone = ?, email = ?, 
            permanent_address = ?, current_address = ?, 
            curr_house = ?, curr_street = ?, curr_area = ?, curr_city = ?, curr_state = ?, curr_pincode = ?,
            perm_house = ?, perm_street = ?, perm_area = ?, perm_city = ?, perm_state = ?, perm_pincode = ?,
            course = ?, department = ?, year_semester = ?, 
            membership_type = ?, no_dues_status = ?,
            roll_number = ?, academic_session = ?, hod_name = ?,
            guardian_name = ?, guardian_phone = ?, blood_group = ?,
            membership_expiry = ?, max_book_limit = ?, account_status = ?`;

        let params = [
            name, dob, gender, phone, email,
            permanent_address, current_address,
            curr_house, curr_street, curr_area, curr_city, curr_state, curr_pincode,
            perm_house, perm_street, perm_area, perm_city, perm_state, perm_pincode,
            course, department, year_semester,
            membership_type,
            (no_dues_status === 'true' || no_dues_status === '1' || no_dues_status === true || no_dues_status === 1) ? 1 : 0,
            roll_number, academic_session, hod_name,
            guardian_name, guardian_phone, blood_group,
            membership_expiry || null, max_book_limit || 3, account_status || 'Active'
        ];

        if (photo_url) { query += `, photo_url = ?`; params.push(photo_url); }
        if (govt_id_url) { query += `, govt_id_url = ?`; params.push(govt_id_url); }
        if (admission_receipt_url) { query += `, admission_receipt_url = ?`; params.push(admission_receipt_url); }
        if (security_deposit_url) { query += `, security_deposit_url = ?`; params.push(security_deposit_url); }

        query += ` WHERE member_id = ?`;
        params.push(id);

        await pool.query(query, params);
        res.status(200).json({ success: true, message: 'Member updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// DELETE /api/members/:id — Delete member (only if no active issues)
const deleteMember = async (req, res) => {
    try {
        const active = await pool.query('SELECT * FROM issues WHERE member_id = ? AND status = ?', [req.params.id, 'issued']);
        if (active.length > 0) return res.status(400).json({ success: false, message: 'Cannot delete: member has active issued books.' });
        await pool.query('UPDATE members SET is_deleted = 1 WHERE member_id = ?', [req.params.id]);
        res.status(200).json({ success: true, message: 'Member moved to trash' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// POST /api/members/import — Bulk import members from CSV
const importMembers = async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: 'No CSV file uploaded' });

    const csvText = req.file.buffer.toString('utf-8');
    const { data, errors } = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim().toLowerCase()
    });

    if (errors.length > 0 && data.length === 0) {
        return res.status(400).json({ success: false, message: 'Could not parse CSV file' });
    }

    const results = { added: 0, failed: [] };

    for (let row of data) {
        row = sanitizeObject(row); // Sanitize for CSV Injection safety
        const {
            member_id, name, dob, photo_url, created_at, phone, email, is_deleted,
            gender, permanent_address, current_address,
            course, department, year_semester,
            membership_type, no_dues_status,
            govt_id_url, admission_receipt_url, security_deposit_url,
            roll_number, academic_session, hod_name,
            guardian_name, guardian_phone, blood_group,
            membership_expiry, max_book_limit, account_status,
            curr_house, curr_street, curr_area, curr_city, curr_state, curr_pincode,
            perm_house, perm_street, perm_area, perm_city, perm_state, perm_pincode
        } = row;

        if (!name || !dob) {
            results.failed.push({ id: member_id || '(blank)', reason: 'Missing name or date of birth' });
            continue;
        }

        const mid = member_id || 'MEM-' + Math.floor(1000 + Math.random() * 9000);

        try {
            await pool.query(
                `INSERT INTO members (
                    member_id, name, dob, photo_url, created_at, phone, email, is_deleted,
                    gender, permanent_address, current_address, 
                    course, department, year_semester, 
                    membership_type, no_dues_status,
                    govt_id_url, admission_receipt_url, security_deposit_url,
                    roll_number, academic_session, hod_name,
                    guardian_name, guardian_phone, blood_group,
                    membership_expiry, max_book_limit, account_status,
                    curr_house, curr_street, curr_area, curr_city, curr_state, curr_pincode,
                    perm_house, perm_street, perm_area, perm_city, perm_state, perm_pincode
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    mid, name, dob, photo_url || null, created_at || new Date().toISOString().slice(0, 19).replace('T', ' '),
                    phone || null, email || null, is_deleted === '1' || is_deleted === 1 ? 1 : 0,
                    gender || 'Other', permanent_address || null, current_address || null,
                    course || null, department || null, year_semester || null,
                    membership_type || 'Student',
                    (no_dues_status === '0' || no_dues_status === 0 || no_dues_status === false) ? 0 : 1,
                    govt_id_url || null, admission_receipt_url || null, security_deposit_url || null,
                    roll_number || null, academic_session || null, hod_name || null,
                    guardian_name || null, guardian_phone || null, blood_group || null,
                    membership_expiry || null, max_book_limit || 5, account_status || 'Active',
                    curr_house || null, curr_street || null, curr_area || null, curr_city || null, curr_state || null, curr_pincode || null,
                    perm_house || null, perm_street || null, perm_area || null, perm_city || null, perm_state || null, perm_pincode || null
                ]
            );
            results.added++;
        } catch (err) {
            const reason = err.code === 'ER_DUP_ENTRY' ? 'Duplicate Member ID' : err.message;
            results.failed.push({ id: mid, reason });
        }
    }

    res.status(200).json({ success: true, message: `Import complete: ${results.added} added, ${results.failed.length} failed`, results });
};

const generateUniqueMemberId = async (req, res) => {
    let unique = false;
    let newId = '';
    while (!unique) {
        newId = 'MEM-' + Math.floor(1000 + Math.random() * 9000);
        const rows = await pool.query('SELECT 1 FROM members WHERE member_id = ?', [newId]);
        if (rows.length === 0) unique = true;
    }
    res.json({ success: true, id: newId });
};

const getDeletedMembers = async (req, res) => {
    try {
        const rows = await pool.query(`
            SELECT member_id, name, dob, gender, phone, email, course, department, account_status, created_at
            FROM members 
            WHERE is_deleted = 1 
            ORDER BY created_at DESC`);
        res.status(200).json({ success: true, data: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const restoreMember = async (req, res) => {
    try {
        await pool.query('UPDATE members SET is_deleted = 0 WHERE member_id = ?', [req.params.id]);
        res.status(200).json({ success: true, message: 'Member restored successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const permanentDeleteMember = async (req, res) => {
    try {
        await pool.query('DELETE FROM members WHERE member_id = ?', [req.params.id]);
        res.status(200).json({ success: true, message: 'Member permanently deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const sendMemberEmail = async (req, res) => {
    const { to, subject, message } = req.body;

    if (!to || !subject || !message) {
        return res.status(400).json({ success: false, message: 'Missing email fields' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
        return res.status(400).json({ success: false, message: 'Invalid email address format' });
    }

    try {
        // Authenticate that the email belongs to a registered member
        const memberCheck = await pool.query('SELECT member_id FROM members WHERE email = ? AND is_deleted = 0', [to]);
        if (memberCheck.length === 0) {
            return res.status(404).json({ success: false, message: 'Email address not found in active member records' });
        }

        const result = await sendEmail(to, subject, message);
        if (result) {
            res.status(200).json({ success: true, message: 'Email sent successfully' });
        } else {
            res.status(500).json({ success: false, message: 'Failed to send email' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = { addMember, getMembers, getMember, getMemberProfile, updateMember, deleteMember, importMembers, generateUniqueMemberId, getDeletedMembers, restoreMember, permanentDeleteMember, sendMemberEmail, getRecentActivities };
