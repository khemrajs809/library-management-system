const pool = require('../../config/db');
const Papa = require('papaparse');
const bookService = require('./book.service');
const { invalidateCache } = require('../../utils/cache.util');

// POST /api/books — Add a book and automatically generate unique copy IDs
const addBook = async (req, res) => {
    let { book_id, bookId, isbn, title, price, author, stream, publication_year, publicationYear, publisher, edition, shelf_location, shelfLocation } = req.body;
    book_id = book_id || bookId;
    publication_year = publication_year || publicationYear;
    shelf_location = shelf_location || shelfLocation;
    const qty = parseInt(req.body.quantity) || 1;
    const book_price = parseFloat(price) || 0;
    const pub_year = parseInt(publication_year) || null;

    if (!title) {
        return res.status(400).json({ success: false, message: 'Book Title is required' });
    }

    // Auto-generate book_id if not provided
    if (!book_id) {
        let unique = false;
        while (!unique) {
            book_id = 'BK-' + Math.floor(1000 + Math.random() * 9000);
            const rows = await pool.query('CALL proc_check_book_exists(?)', [book_id]);
            if (rows.length === 0) unique = true;
        }
    }

    // Remove auto-generation of ISBN as per user request (simple entry)
    if (!isbn) isbn = null;

    const cover_url = req.file ? `/uploads/${req.file.filename}` : null;

    try {
        await bookService.createBook({ book_id, isbn, title, price: book_price, author, stream, publication_year: pub_year, quantity: qty, publisher, edition, shelf_location }, cover_url);
        await invalidateCache('cache:/api/books*');
        res.status(201).json({ success: true, message: `Book added successfully with ${qty} unique barcodes.` });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'Book ID already exists.' });
        }
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// GET /api/books — List books with real-time copy availability and pagination
const getBooks = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        
        const result = await bookService.getBooks(req.query.q, page, limit);
        res.status(200).json({ success: true, ...result });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// GET /api/books/:id/copies — Get list of physical copies for a book
const getBookCopies = async (req, res) => {
    try {
        const rows = await bookService.getBookCopies(req.params.id);
        res.status(200).json({ success: true, data: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// PUT /api/books/:id — Update book details and handle quantity changes
const updateBook = async (req, res) => {
    try {
        const cover_url = req.file ? `/uploads/${req.file.filename}` : null;
        const result = await bookService.updateBook(req.params.id, req.body, cover_url);
        
        if (!result) return res.status(404).json({ success: false, message: 'Book not found' });

        await invalidateCache('cache:/api/books*');
        res.status(200).json({ success: true, message: 'Book and copies updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// DELETE /api/books/:id — Delete book and its copies
const deleteBook = async (req, res) => {
    try {
        await bookService.deleteBook(req.params.id);
        await invalidateCache('cache:/api/books*');
        res.status(200).json({ success: true, message: 'Book moved to trash' });
    } catch (err) {
        if (err.message.includes('Cannot delete')) {
            return res.status(400).json({ success: false, message: err.message });
        }
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// POST /api/books/import — Bulk import books with copy generation
const importBooks = async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: 'No CSV file uploaded' });
    const csvText = req.file.buffer.toString('utf-8');
    const { data } = Papa.parse(csvText, { 
        header: true, 
        skipEmptyLines: true,
        transformHeader: (h) => h.trim().toLowerCase()
    });
    
    const results = { added: 0, failed: [] };
    for (const row of data) {
        const { book_id, isbn, title, price, quantity, author, stream, publication_year, publisher, edition, shelf_location } = row;
        if (!book_id || !isbn || !title) continue;
        const qty = parseInt(quantity) || 1;
        try {
            await pool.query('CALL proc_create_book(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', 
                [book_id, isbn, title, qty, parseFloat(price)||0, author||null, stream||null, publication_year||null, publisher||null, edition||null, shelf_location||null, null]);
            for (let i = 1; i <= qty; i++) {
                const copyId = i === 1 ? book_id : `${book_id}-${i}`;
                await pool.query('CALL proc_create_book_copy(?, ?, ?)', [copyId, book_id, 'available']);
            }
            results.added++;
        } catch (err) {
            results.failed.push({ id: book_id, reason: err.message });
        }
    }
    await invalidateCache('cache:/api/books*');
    res.status(200).json({ success: true, message: `Imported ${results.added} books`, results });
};

const generateUniqueId = async (req, res) => {
    let unique = false;
    let newId = '';
    while (!unique) {
        newId = 'BK-' + Math.floor(1000 + Math.random() * 9000);
        const rows = await pool.query('CALL proc_check_book_exists(?)', [newId]);
        if (rows.length === 0) unique = true;
    }
    res.json({ success: true, id: newId });
};

const generateUniqueIsbn = async (req, res) => {
    let unique = false;
    let newIsbn = '';
    while (!unique) {
        const prefix = '978';
        const group = Math.floor(Math.random() * 10);
        const publisher = Math.floor(100 + Math.random() * 900);
        const title = Math.floor(10000 + Math.random() * 90000);
        const check = Math.floor(Math.random() * 10);
        newIsbn = `${prefix}-${group}-${publisher}-${title}-${check}`;
        const rows = await pool.query('CALL proc_check_isbn_exists(?)', [newIsbn]);
        if (rows.length === 0) unique = true;
    }
    res.json({ success: true, isbn: newIsbn });
};

const getDeletedBooks = async (req, res) => {
    try {
        const rows = await bookService.getDeletedBooks();
        res.status(200).json({ success: true, data: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const restoreBook = async (req, res) => {
    try {
        await bookService.restoreBook(req.params.id);
        await invalidateCache('cache:/api/books*');
        res.status(200).json({ success: true, message: 'Book restored successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const permanentDeleteBook = async (req, res) => {
    try {
        await bookService.permanentDeleteBook(req.params.id);
        await invalidateCache('cache:/api/books*');
        res.status(200).json({ success: true, message: 'Book permanently deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const getBookHistory = async (req, res) => {
    try {
        const rows = await bookService.getBookHistory(req.params.id);
        res.status(200).json({ success: true, data: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = { addBook, getBooks, getBookCopies, updateBook, deleteBook, importBooks, generateUniqueId, generateUniqueIsbn, getDeletedBooks, restoreBook, permanentDeleteBook, getBookHistory };
