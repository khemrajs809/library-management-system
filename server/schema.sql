-- Library Management System — Full Schema
-- Reflects the actual production database structure as of April 2026

CREATE DATABASE IF NOT EXISTS library_db;
USE library_db;

-- =====================================================
--  USERS (Admins & Librarians)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id          VARCHAR(20) PRIMARY KEY,
    email       VARCHAR(100) NOT NULL UNIQUE,
    name        VARCHAR(100) NOT NULL,
    password    VARCHAR(255) NOT NULL,
    role        ENUM('admin', 'librarian') NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default admin (password: admin123)
INSERT INTO users (id, email, password, name, role) 
VALUES ('ADMIN_1', 'admin@lms.com', '$2b$10$Zp52CutQ2W92U1l7UZLtFeRihQgukrm1QNwceEPfVSqxtzPFbyvGe', 'System Administrator', 'admin')
ON DUPLICATE KEY UPDATE email = email;

-- =====================================================
--  MEMBERS
-- =====================================================
CREATE TABLE IF NOT EXISTS members (
    member_id         VARCHAR(20)  PRIMARY KEY,
    name              VARCHAR(100) NOT NULL,
    dob               DATE         NOT NULL,
    gender            ENUM('Male', 'Female', 'Other'),
    phone             VARCHAR(15),
    email             VARCHAR(100),
    permanent_address TEXT,
    current_address   TEXT,
    course            VARCHAR(100),
    department        VARCHAR(100),
    year_semester     VARCHAR(50),
    membership_type   ENUM('Student', 'Faculty', 'Research Scholar', 'Other') DEFAULT 'Student',
    roll_number       VARCHAR(50),
    academic_session  VARCHAR(50),
    hod_name          VARCHAR(100),
    guardian_name     VARCHAR(100),
    guardian_phone    VARCHAR(15),
    blood_group       VARCHAR(5),
    membership_expiry DATE,
    max_book_limit    INT DEFAULT 3,
    account_status    ENUM('Active', 'Suspended', 'Blacklisted') DEFAULT 'Active',
    no_dues_status    TINYINT(1) DEFAULT 1,
    photo_url         VARCHAR(255),
    govt_id_url       VARCHAR(255),
    admission_receipt_url VARCHAR(255),
    security_deposit_url  VARCHAR(255),
    is_deleted        TINYINT(1) DEFAULT 0,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
--  BOOKS
-- =====================================================
CREATE TABLE IF NOT EXISTS books (
    book_id          VARCHAR(20)  PRIMARY KEY,
    isbn             VARCHAR(50),
    title            VARCHAR(200) NOT NULL,
    author           VARCHAR(100),
    stream           VARCHAR(100),
    publication_year INT,
    quantity         INT          DEFAULT 1,
    available        INT          DEFAULT 1,
    price            DECIMAL(10, 2) DEFAULT 0.00,
    publisher        VARCHAR(200),
    edition          VARCHAR(100),
    shelf_location   VARCHAR(100),
    cover_url        VARCHAR(255),
    is_deleted       TINYINT(1) DEFAULT 0,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
--  ISSUES (Circulation)
-- =====================================================
CREATE TABLE IF NOT EXISTS issues (
    issue_id     INT AUTO_INCREMENT PRIMARY KEY,
    book_id      VARCHAR(20),
    member_id    VARCHAR(20),
    issue_date   DATE NOT NULL,
    due_date     DATE NOT NULL,
    return_date  DATE,
    fine_amount  DECIMAL(10, 2) DEFAULT 0.00,
    fine_paid    TINYINT(1)     DEFAULT 0,
    status       ENUM('issued', 'returned', 'lost') DEFAULT 'issued',
    FOREIGN KEY (book_id)   REFERENCES books(book_id),
    FOREIGN KEY (member_id) REFERENCES members(member_id)
);

-- =====================================================
--  ACTIVITY LOG (Recent History)
-- =====================================================
CREATE TABLE IF NOT EXISTS activity_log (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    action      VARCHAR(255) NOT NULL,
    details     TEXT,
    performed_by VARCHAR(100),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
