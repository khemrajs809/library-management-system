const pool = require('../db');

class BookService {
    async createBook(data, cover_url) {
        const { book_id, isbn, title, price, author, stream, publication_year, quantity, publisher, edition, shelf_location } = data;
        
        await pool.query(
            'INSERT INTO books (book_id, isbn, title, quantity, available, price, author, stream, publication_year, publisher, edition, shelf_location, cover_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [book_id, isbn, title, quantity, quantity, price || 0, author || null, stream || null, publication_year || null, publisher || null, edition || null, shelf_location || null, cover_url]
        );

        for (let i = 1; i <= quantity; i++) {
            const copyId = i === 1 ? book_id : `${book_id}-${i}`;
            await pool.query('INSERT INTO book_copies (copy_id, book_id, status) VALUES (?, ?, ?)', [copyId, book_id, 'available']);
        }
    }

    async getBooks(searchQuery, page = 1, limit = 8) {
        const offset = (page - 1) * limit;

        let countSql = `SELECT COUNT(*) as total FROM books b WHERE b.is_deleted = 0`;
        let sql = `
            SELECT b.*, 
                   (SELECT COUNT(*) FROM book_copies WHERE book_id = b.book_id) as total_copies,
                   (SELECT COUNT(*) FROM book_copies WHERE book_id = b.book_id AND status = 'available') as available_copies
            FROM books b
            WHERE b.is_deleted = 0
        `;
        
        let params = [];
        if (searchQuery) {
            const condition = ' AND (b.title LIKE ? OR b.isbn LIKE ? OR b.book_id LIKE ?)';
            countSql += condition;
            sql += condition;
            const like = `%${searchQuery}%`;
            params = [like, like, like];
        }
        
        const countResult = await pool.query(countSql, params);
        const total = Number(countResult[0].total);

        sql += ' ORDER BY b.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);
        
        const rows = await pool.query(sql, params);
        
        return {
            data: rows.map(row => ({
                ...row,
                total_copies: Number(row.total_copies),
                available_copies: Number(row.available_copies)
            })),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async getBookCopies(bookId) {
        return await pool.query('SELECT * FROM book_copies WHERE book_id = ? ORDER BY copy_id', [bookId]);
    }

    async updateBook(id, data, cover_url) {
        const { isbn, title, quantity, price, author, stream, publication_year, publisher, edition, shelf_location } = data;
        
        const current = await pool.query('SELECT quantity FROM books WHERE book_id = ?', [id]);
        if (current.length === 0) return null;
        
        const oldQty = Number(current[0].quantity);
        const newQty = Number(quantity);

        if (cover_url) {
            await pool.query(
                'UPDATE books SET isbn = ?, title = ?, quantity = ?, price = ?, author = ?, stream = ?, publication_year = ?, publisher = ?, edition = ?, shelf_location = ?, cover_url = ? WHERE book_id = ?',
                [isbn, title, newQty, price || 0, author || null, stream || null, publication_year || null, publisher || null, edition || null, shelf_location || null, cover_url, id]
            );
        } else {
            await pool.query(
                'UPDATE books SET isbn = ?, title = ?, quantity = ?, price = ?, author = ?, stream = ?, publication_year = ?, publisher = ?, edition = ?, shelf_location = ? WHERE book_id = ?',
                [isbn, title, newQty, price || 0, author || null, stream || null, publication_year || null, publisher || null, edition || null, shelf_location || null, id]
            );
        }

        if (newQty > oldQty) {
            for (let i = oldQty + 1; i <= newQty; i++) {
                const copyId = `${id}-${i}`;
                await pool.query('INSERT IGNORE INTO book_copies (copy_id, book_id, status) VALUES (?, ?, ?)', [copyId, id, 'available']);
            }
        }
        
        return true;
    }

    async deleteBook(id) {
        const active = await pool.query('SELECT * FROM book_copies WHERE book_id = ? AND status = ?', [id, 'issued']);
        if (active.length > 0) throw new Error('Cannot delete: some copies are currently issued.');
        
        await pool.query('UPDATE books SET is_deleted = 1 WHERE book_id = ?', [id]);
    }

    async getDeletedBooks() {
        return await pool.query('SELECT * FROM books WHERE is_deleted = 1 ORDER BY created_at DESC');
    }

    async restoreBook(id) {
        await pool.query('UPDATE books SET is_deleted = 0 WHERE book_id = ?', [id]);
    }

    async permanentDeleteBook(id) {
        await pool.query('DELETE FROM books WHERE book_id = ?', [id]);
    }

    async getBookHistory(bookId) {
        return await pool.query(`
            SELECT i.issue_id, i.issue_date, i.due_date, i.return_date, i.status, i.fine_amount,
                   m.member_id, m.name as member_name, bc.copy_id
            FROM issues i
            JOIN book_copies bc ON i.book_id = bc.copy_id
            JOIN members m ON i.member_id = m.member_id
            WHERE bc.book_id = ?
            ORDER BY i.issue_date DESC
            LIMIT 50
        `, [bookId]);
    }
}

module.exports = new BookService();
