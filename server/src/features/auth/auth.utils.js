const crypto = require('crypto');
const { sendEmail } = require('../../common/services/email.service');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET is not defined.");
    process.exit(1);
}

// Derive a guaranteed 32-byte secret for AES-GCM encryption
const encryptionSecret = crypto.createHash('sha256').update(JWT_SECRET).digest();

module.exports = {
    encryptionSecret
};
