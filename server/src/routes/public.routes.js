const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcement.controller');

// Public Announcement Routes
router.get('/active', announcementController.getActiveAnnouncements);
router.post('/:id/view', announcementController.trackView);

module.exports = router;
