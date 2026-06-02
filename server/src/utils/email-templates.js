const fs = require('fs');
const path = require('path');

// Helper function to read a file from the templates directory
const readTemplateFile = (filename) => {
    try {
        return fs.readFileSync(path.join(__dirname, '../templates/email', filename), 'utf8');
    } catch (err) {
        console.error(`Error loading template ${filename}:`, err);
        return '';
    }
};

/**
 * Base layout for all emails.
 */
const baseTemplate = (content) => {
    const baseHtml = readTemplateFile('base.html');
    const baseCss = readTemplateFile('base.css');
    const year = new Date().getFullYear().toString();

    return baseHtml
        .replace('{{css}}', baseCss)
        .replace('{{content}}', content)
        .replace('{{year}}', year);
};

/**
 * HTML Template for General Notifications
 */
const generateGenericMessageHTML = (memberName, title, message) => {
    const genericHtml = readTemplateFile('generic.html');
    const formattedMessage = message.replace(/\n/g, '<br>');
    
    const content = genericHtml
        .replace('{{title}}', title)
        .replace('{{memberName}}', memberName || 'Member')
        .replace('{{message}}', formattedMessage);

    return baseTemplate(content);
};

/**
 * HTML Template for OTP Verification
 */
const generateOTPHTML = (userName, otpCode, context = 'login') => {
    const otpTemplateHtml = readTemplateFile('otp.html');
    const action = context === 'password-reset' ? 'reset your password' : 'login to your account';
    
    const content = otpTemplateHtml
        .replace('{{userName}}', userName || 'User')
        .replace('{{action}}', action)
        .replace('{{otpCode}}', otpCode);

    return baseTemplate(content);
};

/**
 * HTML Template for Fine and Overdue Reminders
 */
const generateFineReminderHTML = (memberName, bookTitle, status, fineAmount) => {
    const fineTemplateHtml = readTemplateFile('fine-reminder.html');
    
    const isOverdue = status === 'issued';
    const typeLabel = isOverdue ? 'Overdue Fine' : 'Pending Fine';
    const boxClass = isOverdue ? 'danger-box' : 'highlight-box';

    const content = fineTemplateHtml
        .replace('{{typeLabel}}', typeLabel)
        .replace('{{memberName}}', memberName || 'Member')
        .replace('{{boxClass}}', boxClass)
        .replace('{{bookTitle}}', bookTitle)
        .replace('{{status}}', status)
        .replace('{{fineAmount}}', fineAmount);

    return baseTemplate(content);
};

/**
 * HTML Template for Lost Book Penalties
 */
const generateLostBookHTML = (memberName, bookTitle, bookId, fineAmount) => {
    const lostTemplateHtml = readTemplateFile('lost-book.html');
    
    const content = lostTemplateHtml
        .replace('{{memberName}}', memberName || 'Member')
        .replace('{{bookTitle}}', bookTitle)
        .replace('{{bookId}}', bookId)
        .replace('{{fineAmount}}', fineAmount);

    return baseTemplate(content);
};

/**
 * HTML Template for Fine Payment Receipts
 */
const generatePaymentReceiptHTML = (memberName, bookTitle, amount) => {
    const receiptTemplateHtml = readTemplateFile('payment-receipt.html');
    const today = new Date().toLocaleDateString();
    
    const content = receiptTemplateHtml
        .replace('{{memberName}}', memberName || 'Member')
        .replace('{{bookTitle}}', bookTitle)
        .replace('{{amount}}', amount)
        .replace('{{date}}', today);

    return baseTemplate(content);
};

module.exports = {
    generateGenericMessageHTML,
    generateOTPHTML,
    generateFineReminderHTML,
    generateLostBookHTML,
    generatePaymentReceiptHTML
};
