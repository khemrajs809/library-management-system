const express = require('express');
const router = express.Router();
const captchaController = require('../controllers/captcha.controller');

router.get('/generate', captchaController.generateCaptcha);

module.exports = router;
