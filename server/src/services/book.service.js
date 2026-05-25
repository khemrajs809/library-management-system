const pool = require('../db');

class BookService {
    async createBook(data, cover_url) {
        const { book_id, isbn, title, price, author, stream, publication_year, quantity, publisher, edition, shelf_location } = data;
        
        await pool.query(
            'CALL proc_create_book(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [book_id, isbn, title, quantity, price || 0, author || null, stream || null, publication_year || null, publisher || null, edition || null, shelf_location || null, cover_url]
        );

        for (let i = 1; i <= quantity; i++) {
            const copyId = i === 1 ? book_id : `${book_id}-${i}`;
            await pool.query('CALL proc_create_book_copy(?, ?, ?)', [copyId, book_id, 'available']);
        }
    }

    async getBooks(searchQuery, page = 1, limit = 8) {
        const offset = (page - 1) * limit;
        const [countResult] = await pool.query('CALL proc_get_books_search_count(?)', [searchQuery || null]);
        const total = Number(countResult[0].total);

        const [results] = await pool.query('CALL proc_get_books(?, ?, ?)', [searchQuery || null, limit, offset]);
        const rows = results;
        
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
        const [results] = await pool.query('CALL proc_get_book_copies(?)', [bookId]);
        return results;
    }

    async updateBook(id, data, cover_url) {
        const { isbn, title, quantity, price, author, stream, publication_year, publisher, edition, shelf_location } = data;
        
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
        const [results] = await pool.query('CALL proc_get_deleted_books()');
        return results;
    }

    async restoreBook(id) {
        await pool.query('CALL proc_restore_book(?)', [id]);
    }

    async permanentDeleteBook(id) {
        await pool.query('CALL proc_permanent_delete_book(?)', [id]);
    }

    async getBookHistory(bookId) {
        const [results] = await pool.query('CALL proc_get_book_history(?)', [bookId]);
        return results;
    }
}

module.exports = new BookService();
