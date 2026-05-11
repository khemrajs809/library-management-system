const cron = require('node-cron');
const pool = require('../db');
const transporter = require('../config/mailer');

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
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            // 1. Due in 2 days — send reminder
            const dueSoon = await pool.query(`
                SELECT i.*, m.name, m.email, b.title 
                FROM issues i 
                JOIN members m ON i.member_id = m.member_id 
                JOIN books b ON i.book_id = b.book_id 
                WHERE i.due_date = ? AND i.status = 'issued'
            `, [twoDaysFromNow]);

            for (const issue of dueSoon) {
                transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: issue.email,
                    subject: 'Library Book Due Soon',
                    text: `Hi ${issue.name},\n\nReminder: "${issue.title}" is due in 2 days (${issue.due_date}).`
                });
            }

            // 2. Due today — last warning
            const dueToday = await pool.query(`
                SELECT i.*, m.name, m.email, b.title 
                FROM issues i 
                JOIN members m ON i.member_id = m.member_id 
                JOIN books b ON i.book_id = b.book_id 
                WHERE i.due_date = ? AND i.status = 'issued'
            `, [today]);

            for (const issue of dueToday) {
                transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: issue.email,
                    subject: 'WARNING: Book Due Today',
                    text: `Hi ${issue.name},\n\nYour book "${issue.title}" is due TODAY (${issue.due_date}). If not returned today, a daily fine of ₹5 will be applied starting tomorrow.`
                });
            }

            // 3. Overdue — fine notice + real-time librarian alert
            const overdue = await pool.query(`
                SELECT i.*, m.name, m.email, b.title 
                FROM issues i 
                JOIN members m ON i.member_id = m.member_id 
                JOIN books b ON i.book_id = b.book_id 
                WHERE i.due_date < ? AND i.status = 'issued'
            `, [today]);

            for (const issue of overdue) {
                transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: issue.email,
                    subject: 'REMINDER: Library Book Overdue',
                    text: `Hi ${issue.name},\n\nYour book "${issue.title}" remains OVERDUE. Please return it to stop the daily fines.`
                });

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
