const multer = require('multer');
const path = require('path');

// --- Disk Storage for images (book covers, member photos) ---
const diskStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({ 
    storage: diskStorage,
    fileFilter: (req, file, cb) => {
        const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        
        const ext = path.extname(file.originalname).toLowerCase();
        const mime = file.mimetype.toLowerCase();

        // Security: Both extension AND MIME type must be valid and correspond to each other
        const isExtAllowed = allowedExts.includes(ext);
        const isMimeAllowed = allowedMimes.includes(mime);

        if (isExtAllowed && isMimeAllowed) {
            cb(null, true);
        } else {
            cb(new Error('Security Alert: File type mismatch. Only valid images (.jpg, .png, .webp) or PDF files are allowed.'));
        }
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// --- Memory Storage for CSV imports ---
const csvStorage = multer.memoryStorage();
const csvUpload = multer({
    storage: csvStorage,
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['text/csv', 'application/vnd.ms-excel'];
        if (path.extname(file.originalname).toLowerCase() === '.csv' && allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only valid CSV files are allowed'));
        }
    }
});

module.exports = { upload, csvUpload };
