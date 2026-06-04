const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/db');
const bcrypt = require('bcryptjs');

// Mock bcrypt and external services
jest.mock('bcryptjs');
jest.mock('../src/common/services/email.service', () => ({
    sendEmail: jest.fn().mockResolvedValue(true)
}));
jest.mock('../src/features/sessions/session.service', () => ({
    logSession: jest.fn().mockResolvedValue(true)
}));

describe('Authentication API Controller', () => {
    
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/login', () => {
        it('should return 400 if captcha is missing', async () => {
            // Mock pool.query so it doesn't crash on destructuring `[lockoutRows] = undefined`
            pool.query.mockResolvedValueOnce([[]]);

            const res = await request(app)
                .post('/api/login')
                .send({
                    email: 'admin@example.com',
                    password: 'password123'
                });
            
            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Captcha is required');
        });

        it('should reject invalid captcha', async () => {
            // Mock pool.query for lockout check (empty array = not locked out)
            // Then mock pool.query for captcha check (empty array = invalid captcha)
            pool.query
                .mockResolvedValueOnce([[]]) // No lockout
                .mockResolvedValueOnce([[]]); // Invalid captcha ID

            const res = await request(app)
                .post('/api/login')
                .send({
                    email: 'admin@example.com',
                    password: 'password123',
                    captchaId: '123',
                    captchaText: 'wrong'
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe('Invalid or expired captcha');
        });

        it('should return 401 for incorrect password', async () => {
            // Lockout check -> Captcha Check -> Delete Captcha -> User Check -> Handle Failed Attempt
            pool.query
                .mockResolvedValueOnce([[]]) // Not locked out
                .mockResolvedValueOnce([[{ id: '123', text: 'ABCD' }]]) // Captcha exists
                .mockResolvedValueOnce([[]]) // Captcha deleted
                .mockResolvedValueOnce([[{ id: 1, email: 'admin@example.com', password: 'hashedpassword', status: 'active' }]]) // User exists
                .mockResolvedValueOnce([[]]) // Handle failed attempt (get login attempts)
                .mockResolvedValueOnce([[]]); // Handle failed attempt (insert attempt)

            bcrypt.compare.mockResolvedValueOnce(false); // Password does NOT match

            const res = await request(app)
                .post('/api/login')
                .send({
                    email: 'admin@example.com',
                    password: 'wrongpassword',
                    captchaId: '123',
                    captchaText: 'ABCD'
                });

            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Invalid credentials');
            expect(bcrypt.compare).toHaveBeenCalledWith('wrongpassword', 'hashedpassword');
        });

        it('should return 202 and send OTP for correct credentials', async () => {
            pool.query
                .mockResolvedValueOnce([[]]) // Not locked out
                .mockResolvedValueOnce([[{ id: '123', text: 'ABCD' }]]) // Captcha exists
                .mockResolvedValueOnce([[]]) // Captcha deleted
                .mockResolvedValueOnce([[{ id: 1, email: 'admin@example.com', password: 'hashedpassword', status: 'active', name: 'Admin User' }]]) // User exists
                .mockResolvedValueOnce([[]]) // Reset login attempts
                .mockResolvedValueOnce([[]]); // Create OTP

            bcrypt.compare.mockResolvedValueOnce(true); // Password DOES match

            const res = await request(app)
                .post('/api/login')
                .send({
                    email: 'admin@example.com',
                    password: 'correctpassword',
                    captchaId: '123',
                    captchaText: 'ABCD'
                });

            expect(res.statusCode).toBe(202);
            expect(res.body.success).toBe(true);
            expect(res.body.mfaRequired).toBe(true);
            expect(res.body.message).toBe('Security code sent to your email.');
        });
    });
});
