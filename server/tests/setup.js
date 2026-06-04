// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-12345';
process.env.TOKEN_ENCRYPTION_KEY = 'test-encryption-key-1234567890';
process.env.PORT = '5005';

// Globally mock the database pool so tests never execute real SQL
jest.mock('../src/db', () => ({
    query: jest.fn(),
    getConnection: jest.fn(),
    end: jest.fn()
}));

// Globally mock the logger so it doesn't create log files during tests
jest.mock('../src/config/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
}));

// Globally mock 'jose' because Jest struggles to resolve its ESM exports automatically
jest.mock('jose', () => ({
    EncryptJWT: jest.fn().mockImplementation(() => ({
        setProtectedHeader: jest.fn().mockReturnThis(),
        setIssuedAt: jest.fn().mockReturnThis(),
        setJti: jest.fn().mockReturnThis(),
        setExpirationTime: jest.fn().mockReturnThis(),
        encrypt: jest.fn().mockResolvedValue('mocked-jwt-token')
    })),
    jwtDecrypt: jest.fn().mockResolvedValue({ payload: { exp: 9999999999, id: 1, email: 'test@example.com' } })
}));

// Globally mock the email queue so tests don't try to connect to Redis
jest.mock('../src/workers/email.queue', () => ({
    add: jest.fn().mockResolvedValue(true)
}));
