const express = require('express');
const router = express.Router();
const notesController = require('./notes.controller');

router.get('/', notesController.getNotes);
router.post('/verify', notesController.verifyPattern);

module.exports = router;
