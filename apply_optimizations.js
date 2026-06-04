const pool = require('./server/src/db');

async function applyOptimizations() {
    console.log("🚀 Starting Database Optimizations (Chunk 1 & 2)...");
    
    // --- CHUNK 1: DATA INTEGRITY ---
    console.log("\n[CHUNK 1] Cleaning orphaned records...");
    await pool.query("UPDATE issues SET book_id = NULL WHERE book_id NOT IN (SELECT book_id FROM books)");
    await pool.query("DELETE FROM user_login_sessions WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM users)");
    await pool.query("DELETE FROM token_blacklist WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM users)");
    console.log("✅ Orphaned records cleaned.");

    console.log("\n[CHUNK 1] Applying Foreign Keys...");
    const fks = [
        { table: 'user_login_sessions', query: 'ALTER TABLE user_login_sessions ADD CONSTRAINT fk_sessions_user_id_new FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE' },
        { table: 'token_blacklist', query: 'ALTER TABLE token_blacklist ADD CONSTRAINT fk_blacklist_user_id_new FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE' }
    ];

    for (const fk of fks) {
        try {
            await pool.query(fk.query);
            console.log(`✅ Applied FK for ${fk.table}`);
        } catch (e) {
            if (e.message.includes('Duplicate') || e.code === 'ER_FK_DUP_NAME') {
                console.log(`ℹ️ FK already exists for ${fk.table}`);
            } else {
                console.error(`❌ Error on ${fk.table}:`, e.message);
            }
        }
    }

    // --- CHUNK 2: PERFORMANCE TUNING (INDEXES) ---
    console.log("\n[CHUNK 2] Applying B-Tree Indexes...");
    const indexes = [
        'CREATE INDEX idx_books_title ON books(title)',
        'CREATE INDEX idx_books_isbn ON books(isbn)',
        'CREATE INDEX idx_books_author ON books(author)',
        
        'CREATE INDEX idx_members_email ON members(email)',
        'CREATE INDEX idx_members_phone ON members(phone)',
        'CREATE INDEX idx_members_roll ON members(roll_number)',
        
        'CREATE INDEX idx_issues_status ON issues(status)',
        'CREATE INDEX idx_issues_due_date ON issues(due_date)',
        
        'CREATE INDEX idx_users_role ON users(role)'
    ];

    for (const idx of indexes) {
        try {
            await pool.query(idx);
            console.log(`✅ Applied: ${idx.split(' ON ')[0]}`);
        } catch (e) {
            if (e.message.includes('Duplicate') || e.code === 'ER_DUP_KEYNAME') {
                console.log(`ℹ️ Index already exists: ${idx.split(' ON ')[0]}`);
            } else {
                console.error(`❌ Error on index:`, e.message);
            }
        }
    }

    console.log("\n🎉 All optimizations applied successfully!");
    process.exit(0);
}

applyOptimizations();
