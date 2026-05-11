const bcrypt = require('bcryptjs');
const pool   = require('./db');

async function rehashPasswords() {
  const conn = await pool.getConnection();
  try {
    const users = await conn.query('SELECT id, password FROM users');
    for (const user of users) {
      const pw = user.password;
      // Check current rounds — only rehash if > 8
      const rounds = parseInt(pw.split('$')[2]);
      if (rounds > 8) {
        console.log(`User ${user.id}: rounds=${rounds}, skipping (need plaintext to rehash)`);
      } else {
        console.log(`User ${user.id}: already at rounds=${rounds} ✓`);
      }
    }
    console.log('\nNote: Existing passwords were hashed at rounds=10.');
    console.log('New passwords created will use rounds=8.');
    console.log('To update the admin password to rounds=8, run:');
    console.log('  UPDATE users SET password = <new_hash> WHERE id = "ADMIN_1"');
  } finally {
    conn.release();
    process.exit(0);
  }
}

rehashPasswords().catch(console.error);
