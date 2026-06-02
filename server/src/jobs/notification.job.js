const cron = require('node-cron');
const pool = require('../db');
const { sendEmail } = require('../common/services/email.service');
const { generateGenericMessageHTML, generateFineReminderHTML } = require('../utils/email-templates');

/**
 * Sets up the daily overdue notification cron job.
 * @param {import('socket.io').Server} io - Socket.IO server instance for real-time alerts
 */
function setupNotificationJob(io) {
    // Run every day at 10:00 AM
    cron.schedule('0 10 * * *', async () => {
        console.log('Running daily due-date checks...');
        try {
            const today = new Date().toISOString().split('T')[0];
            const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            // 1. Due in 2 days — send reminder
            const [dueSoon] = await pool.query('CALL proc_get_issues_due_on(?)', [twoDaysFromNow]);

            for (const issue of dueSoon) {
                const title = 'Library Book Due Soon';
                const text = `Hi ${issue.name},\n\nReminder: "${issue.title}" is due in 2 days (${issue.due_date}).`;
                const html = generateGenericMessageHTML(issue.name, title, text);
                sendEmail(issue.email, title, text, html);
            }

            // 2. Due today — last warning
            const [dueToday] = await pool.query('CALL proc_get_issues_due_on(?)', [today]);

            for (const issue of dueToday) {
                const title = 'WARNING: Book Due Today';
                const text = `Hi ${issue.name},\n\nYour book "${issue.title}" is due TODAY (${issue.due_date}). If not returned today, a daily fine will be applied starting tomorrow.`;
                const html = generateGenericMessageHTML(issue.name, title, text);
                sendEmail(issue.email, title, text, html);
            }

            // 3. Overdue — fine notice + real-time librarian alert
            const [overdue] = await pool.query('CALL proc_get_issues_overdue(?)', [today]);

            for (const issue of overdue) {
                const title = 'REMINDER: Library Book Overdue';
                const text = `Hi ${issue.name},\n\nYour book "${issue.title}" remains OVERDUE. Please return it to stop the daily fines.`;
                const html = generateFineReminderHTML(issue.name, issue.title, 'issued', 'Accruing Daily');
                sendEmail(issue.email, title, text, html);

                io.emit('bookOverdue', {
                    member_name: issue.name,
                    book_title: issue.title,
                    due_date: issue.due_date,
                    message: `Book "${issue.title}" is now overdue for ${issue.name}`
                });
            }

        } catch (err) {
            console.error('Notification job error:', err.message);
        }
    });

    console.log('Notification cron job scheduled (daily at 10:00 AM).');
}

module.exports = { setupNotificationJob };
