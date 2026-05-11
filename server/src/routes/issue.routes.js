const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');
const auditLog = require('../middlewares/audit.middleware');
const { issueBook, renewBook, returnBook, markAsLost, getActiveIssues, getIssueHistory, payFine, returnByBookId, lookupIssueByBookId, getFinesAndLost, sendFineReminder } = require('../controllers/issue.controller');

// Specific action routes must come before /:id routes
router.post('/renew', verifyToken, checkRole(['admin', 'librarian']), auditLog('Renew Book'), renewBook);
router.post('/return', verifyToken, checkRole(['admin', 'librarian']), auditLog('Return Book'), returnBook);
router.post('/return-by-book', verifyToken, checkRole(['admin', 'librarian']), auditLog('Quick Return by Book ID'), returnByBookId);
router.get('/lookup/:book_id', verifyToken, checkRole(['admin', 'librarian']), lookupIssueByBookId);
router.post('/lost', verifyToken, checkRole(['admin', 'librarian']), auditLog('Mark Book as Lost'), markAsLost);
router.get('/history', verifyToken, checkRole(['admin', 'librarian']), getIssueHistory);
router.post('/:id/pay-fine', verifyToken, checkRole(['admin', 'librarian']), auditLog('Pay Fine'), payFine);

router.get('/fines-and-lost', verifyToken, checkRole(['admin', 'librarian']), getFinesAndLost);
router.post('/:id/send-reminder', verifyToken, checkRole(['admin', 'librarian']), auditLog('Send Fine Reminder'), sendFineReminder);

router.post('/', verifyToken, checkRole(['admin', 'librarian']), auditLog('Issue Book'), issueBook);
router.get('/', verifyToken, checkRole(['admin', 'librarian']), getActiveIssues);

module.exports = router;
