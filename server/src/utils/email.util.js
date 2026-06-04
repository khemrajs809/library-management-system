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
const applyBaseLayout = (innerHtml) => {
    const baseTemplate = readTemplateFile('base.html');
    const baseCss = readTemplateFile('base.css');
    const year = new Date().getFullYear().toString();

    return baseTemplate
        .replaceAll('/* {{css}} */', baseCss)
        .replaceAll('{{css}}', baseCss)
        .replaceAll('{{content}}', innerHtml)
        .replaceAll('{{year}}', year);
};

/**
 * HTML Template for General Notifications
 */
const generateGenericMessageHTML = (memberName, title, message) => {
    const genericTemplate = readTemplateFile('generic.html');
    const formattedMessage = message.replaceAll(/\n/g, '<br>');
    
    const innerHtml = genericTemplate
        .replaceAll('{{title}}', title)
        .replaceAll('{{memberName}}', memberName || 'Member')
        .replaceAll('{{message}}', formattedMessage);

    return applyBaseLayout(innerHtml);
};

/**
 * HTML Template for OTP Verification
 */
const generateOTPHTML = (userName, otpCode, context = 'login') => {
    const otpTemplate = readTemplateFile('otp.html');
    const action = context === 'password-reset' ? 'reset your password' : 'login to your account';
    
    const innerHtml = otpTemplate
        .replaceAll('{{userName}}', userName || 'User')
        .replaceAll('{{action}}', action)
        .replaceAll('{{otpCode}}', otpCode);

    return applyBaseLayout(innerHtml);
};

/**
 * HTML Template for Fine and Overdue Reminders
 */
const generateFineReminderHTML = (memberName, bookTitle, loanStatus, fineAmount) => {
    const fineTemplate = readTemplateFile('fine-reminder.html');
    
    const isOverdue = loanStatus === 'issued';
    const typeLabel = isOverdue ? 'Overdue Fine' : 'Pending Fine';
    const boxClass = isOverdue ? 'danger-box' : 'highlight-box';

    const innerHtml = fineTemplate
        .replaceAll('{{typeLabel}}', typeLabel)
        .replaceAll('{{memberName}}', memberName || 'Member')
        .replaceAll('{{boxClass}}', boxClass)
        .replaceAll('{{bookTitle}}', bookTitle)
        .replaceAll('{{status}}', loanStatus)
        .replaceAll('{{fineAmount}}', fineAmount);

    return applyBaseLayout(innerHtml);
};

/**
 * HTML Template for Lost Book Penalties
 */
const generateLostBookHTML = (memberName, bookTitle, bookId, fineAmount) => {
    const lostTemplate = readTemplateFile('lost-book.html');
    
    const innerHtml = lostTemplate
        .replaceAll('{{memberName}}', memberName || 'Member')
        .replaceAll('{{bookTitle}}', bookTitle)
        .replaceAll('{{bookId}}', bookId)
        .replaceAll('{{fineAmount}}', fineAmount);

    return applyBaseLayout(innerHtml);
};

/**
 * HTML Template for Fine Payment Receipts
 */
const generatePaymentReceiptHTML = (memberName, bookTitle, amount) => {
    const receiptTemplate = readTemplateFile('payment-receipt.html');
    const today = new Date().toLocaleDateString();
    
    const innerHtml = receiptTemplate
        .replaceAll('{{memberName}}', memberName || 'Member')
        .replaceAll('{{bookTitle}}', bookTitle)
        .replaceAll('{{amount}}', amount)
        .replaceAll('{{date}}', today);

    return applyBaseLayout(innerHtml);
};

module.exports = {
    generateGenericMessageHTML,
    generateOTPHTML,
    generateFineReminderHTML,
    generateLostBookHTML,
    generatePaymentReceiptHTML
};
