# Librarian Management System

A professional, high-density digital library management solution with a "Seashell & Crimson" aesthetic.

## 🚀 Features

- **Circulation Desk**: Manage book issues and returns with ease.
- **Book Manager**: Inventory control with barcode support.
- **Member Manager**: Detailed member profiles and digital library cards.
- **Fine Management**: Automated fine calculation and tracking.
- **Audit Logs**: Comprehensive history of all library transactions.

## 🛠️ Technology Stack

- **Frontend**: Angular (Modern Signal-based architecture)
- **Backend**: Node.js / Express
- **Database**: SQLite / MySQL (depending on configuration)
- **Styling**: Vanilla CSS with a professional design system.

## 📦 Project Structure

- `/client`: Angular frontend application.
- `/server`: Node.js backend API and file storage.

## 🚦 Getting Started

### Prerequisites
- Node.js (v18+)
- Angular CLI

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/khemrajs809/library-management-system.git
   ```

2. **Setup Server**:
   ```bash
   cd server
   npm install
   ```

3. **Manual Setup (Required)**:
   Since sensitive files are ignored by Git, you must manually create the following:
   - **Environment Variables**: Create a `.env` file in the `server/` directory with `DB_HOST`, `JWT_SECRET`, and `EMAIL_PASS`.
   - **Security Certificates**: Create a `server/certs/` directory and add your `localhost.key` and `localhost.crt` for HTTPS support.
   - **Uploads Folder**: Create a `server/uploads/` directory for storing member photos and book covers.

4. **Run Server**:
   ```bash
   npm run dev
   ```

3. **Setup Client**:
   ```bash
   cd client
   npm install
   npm run dev # or ng serve
   ```

## 📄 License
This project is for academic/professional use.
