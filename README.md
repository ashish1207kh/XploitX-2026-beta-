# ⚡ XPLOITX 2.0 BETA — 24-Hour Cybersecurity CTF & National Hackathon

> **Official Cyberpunk HUD Platform for XPLOITX 2.0 BETA**  
> Organized by the **Department of Computer Science & Engineering**, **Prathyusha Engineering College (Autonomous)**, Chennai, Tamil Nadu.

---

## 📑 Overview

**XPLOITX 2.0 BETA** is a full-stack, cyberpunk-themed web application designed for managing a high-stakes 24-hour cybersecurity Capture The Flag (CTF) competition and national hackathon. 

The platform provides a complete end-to-end event management experience—from cinematic user onboarding and secure squad registration with OTP email verification, to real-time payment screenshot verification, dynamic CAPTCHA validation, and live attendance tracking for staff and student coordinators.

---

## ⭐ Key Features

### 1. 🛡️ Hardened & State-Aware Registration Flow
- **Leader & Squad Management**: Dynamic team leader and multi-member registration supporting custom team sizing.
- **"Same as Leader" Synchronizer**: Instant one-click syncing of institution name and district from team leader to squad members with input locking (`readOnly`).
- **OTP Email Verification**: Serverless-compatible 6-digit OTP delivery powered by the **Brevo HTTPS REST API** with anti-spam cooldown timers.
- **Payment Dropzone**: Custom HUD drag-and-drop proof uploader with client-side mime-type filtering, file size constraints, and ellipsis truncation for long filenames on mobile viewports.
- **Dynamic Security Gate & CAPTCHA**: Section-level dynamic gating that automatically triggers automated robot checks and reveals CAPTCHA challenge inputs only after form completeness and proof upload.

### 2. 📊 Live Admin & Attendance Dashboard (`attendance.html`)
- Real-time team arrival marking with timestamp recording.
- Instant search and filtering by Team ID, Leader Name, or Institution.
- Payment proof inspection modal with verification state toggles (`VERIFIED` / `PENDING`).
- Real-time audit log monitor capturing administrative actions with Kolkata (IST) timestamps.

### 3. 🔒 100% Production Data Persistence & Safety Gate
- **Dual-Engine Persistence**: Primary cloud persistence via **MongoDB Atlas**, backed up locally by **SQLite3** (`hackathon.db`).
- **Non-Destructive Initialization**: Zero database drops or table truncations on boot or redeployment.
- **Production Guard (`checkProductionSafety`)**: High-risk operations (e.g., clearing audit logs) are blocked in `NODE_ENV=production` unless explicit approval flags are passed.

### 4. 🎨 High-Fidelity Cyberpunk Design System
- Custom CSS design system with glassmorphism, glowing HUD borders, neon accents (`#00ff66`, `#ffd700`, `#00f0ff`), and smooth micro-animations.
- Full viewport mobile drawer with 100vw backdrop-blur blur effects, safe touch targets (min 44px–48px), and 16px input font scaling to eliminate mobile keyboard auto-zoom.
- Responsive across all device breakpoints from **320px to 4K displays**.

---

## 🛠️ Technology Stack

| Layer | Technology Used |
| :--- | :--- |
| **Frontend** | HTML5, Vanilla CSS3 (Custom HUD Tokens & Micro-Animations), JavaScript (ES6+), Font Awesome |
| **Backend Runtime** | Node.js, Express.js, Body-Parser, Cors, Multer (Serverless Uploads) |
| **Security & Auth** | JSONWebTokens (JWT), Bcrypt, Crypto (Secure Random OTPs), CORS Guards |
| **Primary Database** | **MongoDB Atlas** (Cloud Persistent NoSQL Storage via Mongoose) |
| **Backup Database** | **SQLite3** (Local / Offline Fallback Engine via `sqlite` & `sqlite3`) |
| **Email Infrastructure**| **Brevo HTTPS REST API** (Primary Port 443 API), Resend API, Nodemailer SMTP |
| **Deployment / CI/CD** | Vercel Serverless Platform, GitHub Actions (`ci-cd.yml`) |

---

## 📁 Repository Structure

```text
XploitX-2026-beta/
├── backend/
│   ├── server.js               # Core Express server, API endpoints, & MongoDB/SQLite bindings
│   ├── .env                    # Local environment variables (Git-ignored)
│   ├── database_backup.json    # JSON fallback snapshot
│   └── hackathon.db            # Local SQLite fallback database
├── public/
│   ├── index.html              # Main landing page & cinematic launch portal
│   ├── register.html           # Secure team registration page with CAPTCHA & payment upload
│   ├── register.css            # Registration stylesheet & HUD layout grid
│   ├── register.js             # Registration state-machine, OTP verification, & form logic
│   ├── about.html              # Coordinators, patrons, & organizing team grid
│   ├── prizes.html             # Event prize pool breakdown
│   ├── rules.html              # Guidelines & code of conduct
│   ├── doom.html               # Cyberpunk Doomsday CTF portal
│   ├── attendance.html         # Live organizer & admin attendance portal
│   ├── styles.css              # Main sitewide stylesheet & responsive media queries
│   └── script.js               # Global UI scripts, mobile drawer, & interactive features
├── .github/
│   └── workflows/
│       └── ci-cd.yml           # GitHub Actions CI/CD pipeline (syntax & asset validation)
├── .env.example                # Safe environment configuration template
├── DEPLOYMENT.md               # Detailed deployment, disaster recovery, & safety gate guide
├── README.md                   # Project documentation
├── package.json                # Project dependencies & npm scripts
└── vercel.json                 # Vercel serverless routing configuration
```

---

## ⚡ Quick Start Guide (Local Development)

### 1. Prerequisites
- **Node.js**: v18.x or v20.x installed
- **Git**: Installed on your system

### 2. Installation
Clone the repository and install the backend dependencies:

```bash
# Clone the repository
git clone https://github.com/your-username/XploitX-2026-beta.git
cd XploitX-2026-beta

# Install dependencies in root and backend
npm install
cd backend
npm install
cd ..
```

### 3. Environment Configuration
Create a `.env` file inside the `backend/` directory (or use `.env.example` as a template):

```env
PORT=3000
NODE_ENV=development

# Database Connection (MongoDB Atlas Cloud Storage)
MONGODB_URI=mongodb+srv://<db_user>:<db_password>@cluster0.vy8bb6x.mongodb.net/?appName=Cluster0

# Authentication
JWT_SECRET=your_super_secret_jwt_key_2026

# Email Infrastructure (Brevo REST API)
BREVO_API_KEY=your_brevo_api_key_here
BREVO_SENDER_EMAIL=jeshwanthv751@gmail.com
BREVO_SENDER_NAME=XploitX 2.0 BETA
```

### 4. Running the Application
Start the Node.js development server:

```bash
# Start backend server
npm start
```

Access the application in your browser at:  
`http://localhost:3000`

---

## 🚀 Production Deployment

The project is pre-configured for automated deployment to **Vercel**:

1. Push your code to the `main` branch on GitHub.
2. Vercel automatically detects `vercel.json` and builds both static frontend assets from `public/` and serverless API endpoints from `backend/server.js`.
3. Ensure environment variables (`MONGODB_URI`, `JWT_SECRET`, `BREVO_API_KEY`) are set in your Vercel Dashboard under **Project Settings → Environment Variables**.

For detailed disaster recovery policies and production safety rules, refer to [DEPLOYMENT.md](file:///e:/Beta%202.0/XploitX-2026-beta-/DEPLOYMENT.md).

---

## 👥 Organizing Committee & Coordinators

### Patrons & HOD
- **Mr. S. S. S. Jaganathan** — Chairman
- **Mrs. Anithalakshmi** — Head of Department (CSE)

### Staff Coordinators
- **Mrs. S Devi** — Staff Coordinator (`+91 99405 92672`)
- **Mrs. G Ramya** — Assistant Professor
- **Mrs. S Rama Mathrasi** — Assistant Professor
- **Mrs. Aswini** — Assistant Professor

### Student Lead Coordinators
- **Ashish N**, **Madhumitha Narayanan** — Overall Student Coordinators
- **Jesin Milesh S** — Registration Head (`+91 74184 31480`)
- **Jeshwanth V**, **Libinesh R U** — Marketing Heads
- **Amuthini K**, **Niranjan M** — CTF Heads

---

## 📝 License

Developed for **XPLOITX 2.0 BETA** @ Prathyusha Engineering College. All rights reserved.
