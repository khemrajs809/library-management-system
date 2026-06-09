const pool = require('../../config/db');

class BookService {
    async createBook(data, cover_url) {
        const book_id = data.bookId || data.book_id;
        const publication_year = data.publicationYear || data.publication_year;
        const shelf_location = data.shelfLocation || data.shelf_location;
        const { isbn, title, price, author, stream, quantity, publisher, edition } = data;
        
        await pool.query(
            'CALL proc_create_book(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [book_id, isbn, title, quantity, price || 0, author || null, stream || null, publication_year || null, publisher || null, edition || null, shelf_location || null, cover_url]
        );

        for (let i = 1; i <= quantity; i++) {
            const copyId = i === 1 ? book_id : `${book_id}-${i}`;
            await pool.query('CALL proc_create_book_copy(?, ?, ?)', [copyId, book_id, 'available']);
        }
    }

    async getBooks(searchQuery, author, stream, availability, page = 1, limit = 8) {
        const offset = (page - 1) * limit;
        const [countResult] = await pool.query('CALL proc_get_books_search_count(?, ?, ?, ?)', [searchQuery || null, author || null, stream || null, availability || null]);
        const total = Number(countResult[0].total);

        const results = await pool.query('CALL proc_get_books(?, ?, ?, ?, ?, ?)', [searchQuery || null, author || null, stream || null, availability || null, limit, offset]);
        const rows = results[0] || [];
        
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

    async getBookById(id) {
        const results = await pool.query('CALL proc_get_book_by_id(?)', [id]);
        const rows = results[0] || [];
        
        if (rows && rows.length > 0) {
            return {
                ...rows[0],
                total_copies: Number(rows[0].total_copies),
                available_copies: Number(rows[0].available_copies)
            };
        }
        return null;
    }

    async getRelatedBooks(id) {
        const book = await this.getBookById(id);
        if (!book || !book.stream) return [];
        const results = await pool.query('CALL proc_get_books(?, ?, ?, ?, ?, ?)', [null, null, book.stream, null, 5, 0]);
        const rows = results[0] || [];
        return rows.filter(b => b.book_id !== id).map(row => ({
            ...row,
            total_copies: Number(row.total_copies),
            available_copies: Number(row.available_copies)
        }));
    }

    async getBookCopies(bookId) {
        const results = await pool.query('CALL proc_get_book_copies(?)', [bookId]);
        return results[0] || [];
    }

    async updateBook(id, data, cover_url) {
        const publication_year = data.publicationYear || data.publication_year;
        const shelf_location = data.shelfLocation || data.shelf_location;
        const { isbn, title, quantity, price, author, stream, publisher, edition } = data;
        
        const [currentRes] = await pool.query('CALL proc_get_book_quantity(?)', [id]);
        const current = currentRes;
        if (current.length === 0) return null;
        
        const oldQty = Number(current[0].quantity);
        const newQty = Number(quantity);
 
        if (cover_url) {
            await pool.query(
                'CALL proc_update_book_with_cover(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [id, isbn, title, newQty, price || 0, author || null, stream || null, publication_year || null, publisher || null, edition || null, shelf_location || null, cover_url]
            );
        } else {
            await pool.query(
                'CALL proc_update_book_without_cover(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [id, isbn, title, newQty, price || 0, author || null, stream || null, publication_year || null, publisher || null, edition || null, shelf_location || null]
            );
        }

        if (newQty > oldQty) {
            for (let i = oldQty + 1; i <= newQty; i++) {
                const copyId = `${id}-${i}`;
                await pool.query('CALL proc_create_book_copy(?, ?, ?)', [copyId, id, 'available']);
            }
        }
        
        return true;
    }

    async deleteBook(id) {
        const [activeRes] = await pool.query('CALL proc_check_issued_copies(?)', [id]);
        const active = activeRes;
        if (active.length > 0) {
            const copyIds = active.map(c => c.copy_id).join(', ');
            throw new Error(`Cannot delete: The following copies are currently issued: ${copyIds}`);
        }
        
        await pool.query('CALL proc_soft_delete_book(?)', [id]);
    }

    async getDeletedBooks() {
        const results = await pool.query('CALL proc_get_deleted_books()');
        return results[0] || [];
    }

    async restoreBook(id) {
        await pool.query('CALL proc_restore_book(?)', [id]);
    }

    async permanentDeleteBook(id) {
        await pool.query('CALL proc_permanent_delete_book(?)', [id]);
    }

    async getBookHistory(bookId) {
        const results = await pool.query('CALL proc_get_book_history(?)', [bookId]);
        return results[0] || [];
    }

    async getFilterOptions() {
        const streams = await pool.query("SELECT DISTINCT stream FROM books WHERE is_deleted=0 AND stream IS NOT NULL AND stream != '' ORDER BY stream");
        const authors = await pool.query("SELECT DISTINCT author FROM books WHERE is_deleted=0 AND author IS NOT NULL AND author != '' ORDER BY author");
        return {
            streams: streams.map(r => r.stream),
            authors: authors.map(r => r.author)
        };
    }
}

module.exports = new BookService();
