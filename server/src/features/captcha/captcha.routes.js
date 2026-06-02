const express = require('express');
const router = express.Router();
const captchaController = require('./captcha.controller');

router.get('/generate', captchaController.generateCaptcha);

module.exports = router;
