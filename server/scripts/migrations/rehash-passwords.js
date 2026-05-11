/**
 * One-time script: Re-hash all user passwords at rounds=8
 * Run ONCE: node rehash-passwords.js
 * Then delete this file.
 */
const bcrypt = require('bcryptjs');
const pool = require('./db');

// Known plaintext passwords — update if different
const KNOWN_PASSWORDS = {
  'admin@libflow.com': 'admin123',
};

async function rehash() {
  const users = await pool.query('SELECT id, email FROM users');
  for (const user of users) {
    const plain = KNOWN_PASSWORDS[user.email];
    if (plain) {
      const newHash = await bcrypt.hash(plain, 8);
      await pool.query('UPDATE users SET password = ? WHERE id = ?', [newHash, user.id]);
      console.log(`✅ Rehashed ${user.email} at rounds=8`);
    } else {
      console.log(`⚠️  No known password for ${user.email} — skipping`);
    }
  }
  console.log('\nDone! Login will now be ~4x faster.');
  process.exit(0);
}

rehash().catch(err => { console.error(err); process.exit(1); });
