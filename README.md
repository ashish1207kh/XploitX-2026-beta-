# 🛡️ XPLOITX 2.0 BETA - Cybersecurity CTF & Hackathon Platform

![XPLOITX 2.0 Banner](https://img.shields.io/badge/XPLOITX-2.0%20BETA-00FF41?style=for-the-badge&logo=matrix&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Backend-Node.js%20%7C%20Express-00FF41?style=for-the-badge&logo=node.js)
![Database](https://img.shields.io/badge/Database-MongoDB%20%7C%20SQLite-blue?style=for-the-badge&logo=mongodb)

**XPLOITX 2.0 BETA** is an immersive, cyberpunk-themed web application built for managing the Matrix Hackathon & 24-Hour Cybersecurity CTF 2026. It features terminal-style team registration, live payment upload verification, QR code attendance tracking, admin dashboard controls, and automated email notifications.

---

## 📑 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Architecture](#-project-architecture)
- [Security Features & Hardening](#-security-features--hardening)
- [Security Patches & Vulnerability Remediation](#-security-patches--vulnerability-remediation)
- [Environment Variables](#-environment-variables)
- [Installation & Local Setup](#-installation--local-setup)
- [Deployment](#-deployment)

---

## 🚀 Features

- 🟢 **Cyberpunk Terminal UI**: Matrix falling green code rain animation, glitch text effects, scanner animations, and retro terminal UI styling.
- 👥 **Team Registration Flow**: Online team registration with automated unique Team ID generation (`XCTF-26-XXXX`).
- 💳 **Payment Proof Upload**: User upload support for UPI/Transaction screenshots with server-side validation.
- 🔐 **Secure Admin Panel**: Dashboard for verifying/rejecting payments, managing team statuses, and inspecting logs.
- 🎟️ **QR Code Attendance System**: Automated QR code generation for verified teams to check-in at the venue.
- 📩 **Email Confirmation & Notifications**: Nodemailer integration sending automated confirmation emails with PDF tickets/QR codes.
- 🕹️ **Easter Eggs & Mini-games**: Integrated terminal mini-games (DOOM theme) and interactive hackathon guides.

---

## 🛠️ Tech Stack

### Frontend
- **HTML5 & CSS3**: Custom CSS variables, responsive grid/flexbox layouts, 3D transform card hover effects, glitch text CSS keyframes.
- **JavaScript (ES6+)**: Canvas API for real-time falling code matrix rain, asynchronous Fetch API for backend communication, DOM manipulation.
- **Icons & Fonts**: Font Awesome 6.x, Google Fonts (*Share Tech Mono*, *Fira Code*).

### Backend
- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Database Layer**: Dual-database support:
  - **Primary**: MongoDB Atlas via Mongoose
  - **Fallback**: Local SQLite3 (`sqlite` & `sqlite3`)
- **Authentication & Security**:
  - `jsonwebtoken` (JWT) for secure admin sessions.
  - `bcrypt` for salted password hashing.
  - `cors` for Cross-Origin Resource Sharing controls.
  - `multer` for controlled file uploads.

### Utilities & Services
- **Nodemailer**: Email delivery service for registration confirmations.
- **PDFKit**: Server-side PDF pass / ticket generation.
- **QRCode**: Dynamic QR code image generation for attendee passes.
- **Body-Parser & Dotenv**: Environment configuration and HTTP payload parsing.

---

## 📁 Project Architecture

```
XploitX-2026-beta/
├── backend/
│   ├── uploads/            # Secure storage for payment receipts
│   ├── .env                # Server configuration & secrets
│   ├── build.js            # Build script for backend
│   ├── package.json        # Backend dependencies
│   ├── server.js           # Core Express server & API endpoints
│   └── vercel.json         # Backend Vercel deployment configuration
├── public/
│   ├── index.html          # Landing page with countdown timer
│   ├── about.html          # Event details & FAQ
│   ├── register.html       # Registration form with terminal theme
│   ├── register.js         # Frontend registration & payment submission logic
│   ├── prizes.html         # Prize pool & rewards breakdown
│   ├── rules.html          # CTF rules & guidelines
│   ├── doom.html           # Mini-game easter egg page
│   ├── attendance.html     # Venue QR scanner / check-in page
│   ├── styles.css          # Cyberpunk styles & keyframe animations
│   ├── register.css        # Registration page specific styles
│   └── script.js           # Matrix rain & UI interactivity
├── security.md             # Security audit & remediation patch documentation
├── DEPLOYMENT.md           # Deployment guides for Render & Vercel
├── package.json            # Root project manifest & start script
└── README.md               # Project documentation
```

---

## 🔒 Security Features & Hardening

1. **JWT-Based Authentication**:
   - Admin routes require a signed JSON Web Token passed in the `Authorization: Bearer <token>` header.
   - Admin login issues time-limited JWT tokens rather than static session tokens.

2. **File Upload Restrictions (`multer`)**:
   - **MIME & Extension Filtering**: Strict regex whitelist allowing only image files (`jpeg`, `jpg`, `png`, `webp`).
   - **Payload Size Limits**: Strict 5MB size limit enforced on all file uploads to prevent Denial of Service (DoS).

3. **Database Injection Protection**:
   - Mongoose schema validation prevents MongoDB Query Injection.
   - Parameterized queries utilized for SQLite fallback database calls.

4. **Environment Isolation**:
   - Sensitive credentials (MongoDB URIs, JWT secrets, SMTP credentials, admin passwords) are strictly managed via `.env` variables and kept out of version control.

---

## 🛡️ Security Patches & Vulnerability Remediation

The platform has undergone security auditing to fix critical backend vulnerabilities:

| Patch ID | Component | Vulnerability Fixed | Remediation Applied |
| :--- | :--- | :--- | :--- |
| **SEC-01** | `backend/server.js` | Unrestricted File Upload / Stored XSS | Applied MIME type validation and file extension checking to restrict uploads strictly to `jpeg/jpg/png/webp`. Added 5MB file size limit. |
| **SEC-02** | `backend/server.js` | Admin Route Unauthorized Access | Implemented `verifyAdmin` JWT middleware across all `/api/admin/*` endpoints to enforce access control. |
| **SEC-03** | `backend/server.js` | Weak Authentication Token | Replaced dummy static auth tokens (`token: 'admin-authorized'`) with signed JSON Web Tokens (`jwt.sign`) expiring in 12 hours. |
| **SEC-04** | `public/admin.html` | Session Security | Updated admin dashboard to store JWTs in `sessionStorage` and automatically inject Bearer headers for API requests. |
| **SEC-05** | `backend/server.js` | Audit Logging | Added automated audit log recording (`admin_activity.log`) for tracking administrator access timestamps. |

*Detailed code patches are documented in [security.md](file:///d:/XploitX-2026-beta-/security.md).*

---

## ⚙️ Environment Variables

Create a `backend/.env` file with the following environment variables:

```env
PORT=3000
NODE_ENV=production
JWT_SECRET=your_super_secret_jwt_key_2026
ADMIN_PASSWORD=your_secure_admin_password

# Database Configuration
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/xploitx

# SMTP Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

---

## 💻 Installation & Local Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/)
- MongoDB Atlas account (optional, SQLite fallback available)

### Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/libineshr7-cyber/Xploitxbeta2.0.git
   cd Xploitxbeta2.0
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env` template or set up `backend/.env` as shown above.

4. **Start the Development Server**:
   ```bash
   npm start
   ```

5. **Access the application**:
   - Web App: `http://localhost:3000`
   - Health Check: `http://localhost:3000/api/health`

---

## 🌐 Deployment

- **Render**: Configured via `render.yaml` for automatic deployment of the Node.js Express backend service.
- **Vercel**: Configured via `vercel.json` for frontend static hosting and API rewriting.

For step-by-step deployment instructions, refer to [DEPLOYMENT.md](file:///d:/XploitX-2026-beta-/DEPLOYMENT.md).

---

## 📜 License

This project is created for the **Matrix Hackathon & XPLOITX 2026 CTF**. Built with ❤️ by the XPLOITX Team.
