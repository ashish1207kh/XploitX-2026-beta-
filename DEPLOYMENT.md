# Deployment Guide: Vercel (Frontend) + Render (Backend)

This guide walks you through deploying **XploitX-2026-beta** with high-speed performance:
- **Frontend**: Hosted on **Vercel** Edge CDN (fast worldwide asset delivery & caching).
- **Backend**: Hosted on **Render** (dedicated Node.js web service running Express & MongoDB Atlas).

---

## Architecture Overview

```
Visitor Browser
      │
      ▼
┌────────────────────────────────────────┐
│             VERCEL (Edge)              │
│  - Static Assets (HTML/CSS/JS/Images)  │
│  - Edge Proxy Rewrites:                │
│      /api/*    ──► Render Backend      │
│      /uploads/* ──► Render Backend     │
└───────────────────┬────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────┐
│            RENDER (Backend)            │
│  - Node.js Express Server              │
│  - Background Wake-Up Ping             │
│  - MongoDB Atlas Connection            │
│  - In-memory OTP & PDF Engine          │
└───────────────────┬────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────┐
│          MONGODB ATLAS CLUSTER         │
│  - Teams, Members & Attendance DB      │
└────────────────────────────────────────┘
```

---

## Step 1: Deploy Backend to Render

### Option A: Using Render Blueprint (Fastest 1-Click)
1. Push your latest code changes to your GitHub repository:
   ```bash
   git add .
   git commit -m "Configure Vercel frontend and Render backend"
   git push origin main
   ```
2. Go to [dashboard.render.com](https://dashboard.render.com/) and click **New +** -> **Blueprint**.
3. Connect your GitHub repository (`ashish1207kh/XploitX-2026-beta-`).
4. Render will automatically detect `render.yaml` and configure:
   - **Service Name**: `xploitx-backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node backend/server.js`
   - **Health Check Path**: `/api/health`
5. Supply the required environment variables:
   - `MONGODB_URI`: Your MongoDB connection string (e.g. `mongodb+srv://...`)
   - `JWT_SECRET`: Secure random string (Render can generate this automatically)
   - `EMAIL_USER`: Your Gmail address for sending OTPs / registration confirmations
   - `EMAIL_PASS`: Your Gmail App Password (16 characters from Google Account -> Security -> App Passwords)
6. Click **Apply**.
7. Once deployed, Render will give you a public URL, for example:
   `https://xploitx-backend.onrender.com`
8. Verify the backend is online by visiting:
   `https://xploitx-backend.onrender.com/api/health`
   *(You should see `{"status":"ok", ...}`)*

---

### Option B: Manual Web Service Setup on Render
If you prefer manual setup:
1. Go to [dashboard.render.com](https://dashboard.render.com/) -> **New +** -> **Web Service**.
2. Connect your GitHub repo.
3. Configure the settings:
   - **Name**: `xploitx-backend`
   - **Language**: `Node`
   - **Branch**: `main`
   - **Build Command**: `npm install`
   - **Start Command**: `node backend/server.js`
   - **Instance Type**: `Free`
4. In **Advanced** -> **Health Check Path**, enter: `/api/health`.
5. Under **Environment Variables**, add:
   - `PORT`: `10000`
   - `NODE_ENV`: `production`
   - `MONGODB_URI`: `<your_mongodb_connection_string>`
   - `JWT_SECRET`: `<your_jwt_secret_key>`
   - `EMAIL_USER`: `<your_email_address>`
   - `EMAIL_PASS`: `<your_email_app_password>`
6. Click **Create Web Service**.

---

## Step 2: Configure Frontend for Your Render URL

Once you have your Render URL (e.g., `https://xploitx-backend.onrender.com`):

### 1. Update `vercel.json`
Open `vercel.json` and replace `https://xploitx-backend.onrender.com` with your actual Render URL:

```json
"rewrites": [
  {
    "source": "/api/:path*",
    "destination": "https://YOUR-RENDER-APP-NAME.onrender.com/api/:path*"
  },
  {
    "source": "/uploads/:path*",
    "destination": "https://YOUR-RENDER-APP-NAME.onrender.com/uploads/:path*"
  }
]
```

### 2. (Optional Fallback) Update `public/config.js`
If you prefer direct cross-origin API calls from the browser to Render, you can also paste your Render URL in `public/config.js`:
```javascript
window.XPLOITX_CONFIG = {
    RENDER_BACKEND_URL: 'https://YOUR-RENDER-APP-NAME.onrender.com'
};
```
*(If left empty, it will automatically use Vercel's proxy rewrite).*

Commit and push this change:
```bash
git add vercel.json public/config.js
git commit -m "Update Render backend URL"
git push origin main
```

---

## Step 3: Deploy Frontend to Vercel

1. Log into [vercel.com](https://vercel.com/) and click **Add New...** -> **Project**.
2. Import your GitHub repository (`ashish1207kh/XploitX-2026-beta-`).
3. Under **Configure Project**:
   - **Framework Preset**: `Other`
   - **Root Directory**: `./` (leave default, `vercel.json` automatically points to `public`)
   - **Build Command**: Leave empty (no build needed for static assets)
   - **Output Directory**: `public` (already defined in `vercel.json`)
4. Click **Deploy**.
5. Within 15–30 seconds, Vercel will deploy your site to an address like:
   `https://xploitx-2026.vercel.app`

---

## Step 4: Making It 100% Fast (Eliminating Render Cold Starts)

Render free tier instances sleep after 15 minutes of inactivity. When asleep, the first request takes ~30–50 seconds. Here is how we ensure maximum speed:

### 1. Automatic Frontend Wake-Up (Already Built-In!)
In `public/config.js`, an asynchronous, non-blocking background ping to `/api/health` triggers immediately when a visitor lands on any page of your Vercel site. By the time they view the page and click "Register" or "Admin Login", the backend is already warm and responds instantly.

### 2. Zero-Downtime Free Ping Service (Recommended for 24/7 Instant Response)
To keep Render awake 24/7 without paying:
1. Go to [cron-job.org](https://cron-job.org) or [uptimerobot.com](https://uptimerobot.com/) (both 100% free).
2. Create a new monitor / cron job:
   - **URL to ping**: `https://YOUR-RENDER-APP-NAME.onrender.com/api/health`
   - **Interval**: Every 10 or 14 minutes.
3. This keeps the free Render instance constantly active, providing **sub-second responses** at all times!

---

## Verification Checklist

- [ ] Open `https://YOUR-VERCEL-DOMAIN.vercel.app` -> Matrix rain and animations load instantaneously.
- [ ] Open DevTools Network tab -> Verify assets have HTTP cache headers (`max-age=31536000`).
- [ ] Fill registration form on `register.html` -> Click "Send OTP" -> OTP arrives in email.
- [ ] Submit registration -> Confirmation modal appears with generated Team ID.
- [ ] Open `https://YOUR-VERCEL-DOMAIN.vercel.app/doom.html` -> Log into Admin HUD console -> Dashboard data loads in <100ms.
