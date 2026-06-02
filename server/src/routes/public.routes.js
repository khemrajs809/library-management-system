const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcement.controller');
const cacheMiddleware = require('../middlewares/cache.middleware');

// Public Announcement Routes (Cached for 120 seconds since announcements rarely change)
router.get('/active', cacheMiddleware(120), announcementController.getActiveAnnouncements);
router.post('/:id/view', announcementController.trackView);

module.exports = router;
