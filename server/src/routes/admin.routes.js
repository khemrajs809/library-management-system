const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');
const auditLog = require('../middlewares/audit.middleware');
const { validateResult, loginValidation, createLibrarianValidation } = require('../middlewares/validation.middleware');
const { 
    createLibrarian, 
    getLibrarians, 
    updateLibrarianPassword, 
    deleteLibrarian, 
    getStats,
    importBooks,
    importMembers,
    getOverviewStats,
    generateUniqueLibrarianId,
    getAuditLogs,
    updateLibrarianStatus
} = require('../controllers/admin.controller');
const authController = require('../controllers/auth.controller');
const { authLimiter } = require('../middlewares/security.middleware');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Public: login
// router.post('/login', authLimiter, loginValidation, validateResult, authController.adminLogin);

// Protected: librarian management (ADMIN ONLY)
router.get('/librarians/generate-id', verifyToken, checkRole(['admin']), generateUniqueLibrarianId);
router.post('/librarians', verifyToken, checkRole(['admin']), auditLog('Create New Librarian'), createLibrarianValidation, validateResult, createLibrarian);
router.get('/librarians', verifyToken, checkRole(['admin']), getLibrarians);
router.put('/librarians/:id/password', verifyToken, checkRole(['admin']), auditLog('Update Librarian Password'), updateLibrarianPassword);
router.patch('/librarians/:id/status', verifyToken, checkRole(['admin']), auditLog('Toggle Librarian Status'), updateLibrarianStatus);
router.delete('/librarians/:id', verifyToken, checkRole(['admin']), auditLog('Delete Librarian'), deleteLibrarian);

// Bulk Import (ADMIN/LIBRARIAN)
router.post('/import-books', verifyToken, upload.single('file'), auditLog('Bulk Import Books'), importBooks);
router.post('/import-members', verifyToken, upload.single('file'), auditLog('Bulk Import Members'), importMembers);

// Public/Librarian: Stats (Common dashboard data)
router.get('/stats', verifyToken, getStats);

// Protected: Full overview stats for admin dashboard
router.get('/overview-stats', verifyToken, checkRole(['admin']), getOverviewStats);

// Protected: Audit Logs
router.get('/audit-logs', verifyToken, checkRole(['admin']), getAuditLogs);

// Protected: Session Monitoring (ADMIN ONLY)
const { 
    getSessions, 
    getSessionActions, 
    terminateSession, 
    getSessionStats, 
    logClientAction 
} = require('../controllers/session.controller');

router.get('/sessions/stats', verifyToken, checkRole(['admin']), getSessionStats);
router.get('/sessions', verifyToken, checkRole(['admin']), getSessions);
router.get('/sessions/:id/actions', verifyToken, checkRole(['admin']), getSessionActions);
router.post('/sessions/:id/terminate', verifyToken, checkRole(['admin']), auditLog('Terminate Active Session'), terminateSession);

// Client-side Session Activity Logging (ADMIN/LIBRARIAN)
router.post('/sessions/log-action', verifyToken, logClientAction);

module.exports = router;
