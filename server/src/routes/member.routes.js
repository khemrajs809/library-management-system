const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');
const auditLog = require('../middlewares/audit.middleware');
const { upload, csvUpload } = require('../middlewares/upload.middleware');
const { validateResult, memberValidation } = require('../middlewares/validation.middleware');
const { addMember, getMembers, getMember, getMemberProfile, updateMember, deleteMember, importMembers, generateUniqueMemberId, getDeletedMembers, restoreMember, permanentDeleteMember, sendMemberEmail, getRecentActivities } = require('../controllers/member.controller');

const memberUploadFields = (req, res, next) => {
    console.log('Hitting memberUploadFields middleware');
    const fields = upload.fields([
        { name: 'photo', maxCount: 1 },
        { name: 'govt_id', maxCount: 1 },
        { name: 'admission_receipt', maxCount: 1 },
        { name: 'security_deposit', maxCount: 1 }
    ]);
    fields(req, res, (err) => {
        if (err) {
            console.error('Multer Error in memberUploadFields:', err.message);
            return next(err);
        }
        console.log('Multer finished successfully');
        next();
    });
};

// Note: Specific routes must come before /:id
router.get('/generate-id', verifyToken, checkRole(['admin', 'librarian']), generateUniqueMemberId);
router.post('/send-email', verifyToken, checkRole(['admin', 'librarian']), auditLog('Send Email to Member'), sendMemberEmail);
router.post('/import', verifyToken, checkRole(['admin', 'librarian']), auditLog('Bulk Import Members'), csvUpload.single('csv'), importMembers);
router.get('/:id/profile', verifyToken, checkRole(['admin', 'librarian']), getMemberProfile);

router.get('/trash', verifyToken, checkRole(['admin']), getDeletedMembers);
router.get('/activities/recent', verifyToken, checkRole(['admin', 'librarian']), getRecentActivities);
router.post('/', verifyToken, checkRole(['admin', 'librarian']), memberUploadFields, memberValidation, validateResult, auditLog('Register New Member'), addMember);
router.get('/', verifyToken, checkRole(['admin', 'librarian']), getMembers);
router.get('/:id', verifyToken, checkRole(['admin', 'librarian']), getMember);
router.put('/:id', verifyToken, checkRole(['admin', 'librarian']), memberUploadFields, memberValidation, validateResult, auditLog('Update Member Profile'), updateMember);
router.delete('/:id', verifyToken, checkRole(['admin', 'librarian']), auditLog('Delete Member'), deleteMember);
router.post('/:id/restore', verifyToken, checkRole(['admin']), auditLog('Restore Member'), restoreMember);
router.delete('/:id/permanent', verifyToken, checkRole(['admin']), auditLog('Permanently Delete Member'), permanentDeleteMember);

module.exports = router;
