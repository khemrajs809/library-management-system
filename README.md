# Enterprise Library Management System (LMS)

Welcome to the Enterprise Library Management System. This project is a highly-scalable, resilient, and secure Full-Stack application designed to manage library operations at scale.

## 🏗️ Architecture Overview

The application utilizes a modern Microservices-oriented Monolithic Architecture deployed via Docker containers:

1. **NGINX Edge Proxy**: Serves as the public gateway. Handles HTTPS termination, GZIP compression, rate limiting against DDoS attacks, and static asset caching.
2. **Angular SSR Frontend**: The user interface is built with Angular 17. It operates securely behind the reverse proxy.
3. **Node.js Express Backend**: The core API. Protected by strict Content Security Policies (CSP), Double-Submit CSRF Cookies, and JWE Encrypted Tokens.
4. **Redis Cache & Message Queue**: Used for high-speed API caching and managing the BullMQ background worker queues (for sending asynchronous emails).
5. **MariaDB Database**: The persistent data store. Heavy data processing logic is optimized using internal Stored Procedures.

## 🚀 Getting Started (Docker Deployment)

You do not need Node.js, Angular, or MariaDB installed on your host machine. Everything is containerized.

### Prerequisites
- Docker
- Docker Compose

### Step 1: Boot the Infrastructure
Open your terminal in the root of the project and run:
```bash
docker-compose up --build -d
```

### Step 2: Access the Application
- **Frontend UI**: `https://localhost`
- **Backend API**: `https://localhost/api` (Proxied by Nginx)

*(Note: Ensure you accept the self-signed SSL certificates in your browser if running locally.)*

## 🛡️ Security Features
- **OWASP Hardened**: Protected against SQL Injection (via stored procedures), XSS (via Helmet CSP), and CSRF (via double-submit tokens).
- **Rate Limiting**: Brute-force attacks are blocked via Redis memory store.
- **Account Lockouts**: 5 failed login attempts will lock an account.
- **Secure Sessions**: Uses AES-GCM encrypted JWTs stored in strict HttpOnly secure cookies. No sensitive tokens are exposed to JavaScript.

## 🧪 Testing
The backend features a comprehensive automated testing suite built with Jest and Supertest.
To run the automated tests locally:
```bash
cd server
npm install
npm test
```
*(Note: Tests safely mock the database and Redis queues to prevent corrupting local data).*

## 📧 Background Workers
Emails (like OTPs, Fine Reminders, and Issue Confirmations) are dispatched asynchronously. The Express API instantly sends a job to the Redis queue, and the `email.worker.js` process handles the heavy lifting in the background, ensuring 100% API responsiveness.
