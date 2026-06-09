const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../../middlewares/auth.middleware');
const auditLog = require('../../middlewares/audit.middleware');
const cacheMiddleware = require('../../middlewares/cache.middleware');
const { upload, csvUpload } = require('../../middlewares/upload.middleware');
const { validateResult, bookValidation } = require('../../middlewares/validation.middleware');
const { addBook, getBooks, getBookById, getRelatedBooks, getBookCopies, updateBook, deleteBook, importBooks, generateUniqueId, generateUniqueIsbn, getDeletedBooks, restoreBook, permanentDeleteBook, getBookHistory, getFilterOptions } = require('./book.controller');

router.get('/generate-id', verifyToken, checkRole(['admin', 'librarian']), generateUniqueId);
router.get('/generate-isbn', verifyToken, checkRole(['admin', 'librarian']), generateUniqueIsbn);

// Note: /import must be registered BEFORE /:id to avoid route conflict
router.post('/import', verifyToken, checkRole(['admin', 'librarian']), auditLog('Bulk Import Books'), csvUpload.single('csv'), importBooks);

router.get('/trash', verifyToken, checkRole(['admin']), getDeletedBooks);
router.post('/', verifyToken, checkRole(['admin', 'librarian']), upload.single('cover'), bookValidation, validateResult, auditLog('Add New Book'), addBook);
router.get('/filters/options', getFilterOptions);
router.get('/', cacheMiddleware(60), getBooks);
router.get('/:id', getBookById);
router.get('/:id/related', getRelatedBooks);
router.get('/:id/copies', verifyToken, checkRole(['admin', 'librarian']), getBookCopies);
router.get('/:id/history', verifyToken, checkRole(['admin', 'librarian']), getBookHistory);
router.put('/:id', verifyToken, checkRole(['admin', 'librarian']), upload.single('cover'), bookValidation, validateResult, auditLog('Update Book Details'), updateBook);
router.delete('/:id', verifyToken, checkRole(['admin', 'librarian']), auditLog('Delete Book'), deleteBook);
router.post('/:id/restore', verifyToken, checkRole(['admin']), auditLog('Restore Book'), restoreBook);
router.delete('/:id/permanent', verifyToken, checkRole(['admin']), auditLog('Permanently Delete Book'), permanentDeleteBook);

module.exports = router;
