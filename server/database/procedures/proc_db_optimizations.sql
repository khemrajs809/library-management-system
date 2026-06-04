CREATE PROCEDURE IF NOT EXISTS optimize_database_schema()
BEGIN
    -- Ignore errors if constraints or indexes already exist
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION BEGIN END;

    -- ==========================================
    -- CHUNK 1: DATA INTEGRITY (FOREIGN KEYS)
    -- ==========================================
    
    -- 1. Clean orphaned records before applying constraints
    UPDATE issues SET book_id = NULL WHERE book_id NOT IN (SELECT book_id FROM books);
    DELETE FROM user_login_sessions WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM users);
    DELETE FROM token_blacklist WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM users);

    -- 2. Add Foreign Keys safely
    -- Note: We use CONTINUE HANDLER so if it already exists, it skips seamlessly.
    ALTER TABLE issues 
        ADD CONSTRAINT fk_issues_book_id FOREIGN KEY (book_id) REFERENCES books(book_id) ON DELETE SET NULL;

    ALTER TABLE user_login_sessions 
        ADD CONSTRAINT fk_sessions_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

    ALTER TABLE token_blacklist 
        ADD CONSTRAINT fk_blacklist_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

    -- ==========================================
    -- CHUNK 2: PERFORMANCE TUNING (INDEXES)
    -- ==========================================
    
    -- Books Indexes
    CREATE INDEX idx_books_title ON books(title);
    CREATE INDEX idx_books_isbn ON books(isbn);
    CREATE INDEX idx_books_author ON books(author);

    -- Members Indexes
    CREATE INDEX idx_members_email ON members(email);
    CREATE INDEX idx_members_phone ON members(phone);
    CREATE INDEX idx_members_roll ON members(roll_number);

    -- Issues Indexes
    CREATE INDEX idx_issues_status ON issues(status);
    CREATE INDEX idx_issues_due_date ON issues(due_date);

    -- Users Indexes
    CREATE INDEX idx_users_role ON users(role);

END;

/* NEXT_PROCEDURE */
