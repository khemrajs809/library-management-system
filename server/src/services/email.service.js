const nodemailer = require('nodemailer');
require('dotenv').config();
const { logSystemAction } = require('./audit.service');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

/**
 * Fire-and-forget asynchronous email sender.
 * Doesn't block the main API response thread.
 */
const sendEmail = (to, subject, text, html = null, cc = null, attachments = []) => {
    // Return a resolved promise immediately so the API doesn't wait
    // We execute the actual sending asynchronously
    setImmediate(async () => {
        try {
            const mailOptions = {
                from: `"Library Management System" <${process.env.EMAIL_USER}>`,
                to,
                subject,
                text
            };

            if (html) mailOptions.html = html;
            if (cc) mailOptions.cc = cc;
            if (attachments && attachments.length > 0) mailOptions.attachments = attachments;

            const info = await transporter.sendMail(mailOptions);
            
            // Log successful email dispatch to the database
            await logSystemAction(
                'System', 
                'system', 
                `Automated Email Dispatched: ${subject}`, 
                { to, cc, from: process.env.EMAIL_USER, messageId: info.messageId }
            );

        } catch (error) {
            console.error('Background Email Dispatch Error:', error.message);
        }
    });

    return true; // Fast return
};

module.exports = { sendEmail };
