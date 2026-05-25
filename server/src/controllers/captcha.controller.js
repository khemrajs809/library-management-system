const svgCaptcha = require('svg-captcha');
const pool = require('../db');
const crypto = require('crypto');

const generateCaptcha = async (req, res) => {
    try {
        const captcha = svgCaptcha.create({
            size: 6,
            ignoreChars: '0o1i',
            noise: 2,
            color: true,
            background: '#f4f4f4',
            width: 150,
            height: 50
        });

        const id = crypto.randomUUID();

        // Cleanup old captchas (older than 10 mins)
        await pool.query('CALL proc_cleanup_captchas()');

        // Save to database
        await pool.query(
            'CALL proc_create_captcha(?, ?)',
            [id, captcha.text]
        );

        res.status(200).json({
            success: true,
            captchaId: id,
            captchaImage: captcha.data
        });
    } catch (err) {
        console.error('Error generating captcha:', err);
        res.status(500).json({ success: false, message: 'Failed to generate captcha' });
    }
};

module.exports = {
    generateCaptcha
};
