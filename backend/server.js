const dns = require('dns');
if (!process.env.VERCEL && !process.env.VERCEL_ENV && !process.env.AWS_LAMBDA_FUNCTION_NAME && process.platform === 'win32') {
    try {
        dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
    } catch (e) {
        console.warn('DNS server configuration warning:', e.message);
    }
}

const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const bcrypt = require('bcrypt');
const envBackend = path.resolve(__dirname, '.env');
const envRoot = path.resolve(__dirname, '../.env');
if (fs.existsSync(envBackend)) {
    require('dotenv').config({ path: envBackend });
} else if (fs.existsSync(envRoot)) {
    require('dotenv').config({ path: envRoot });
} else {
    require('dotenv').config();
}
const bodyParser = require('body-parser');
const cors = require('cors');
let open = null;
let sqlite3 = null;
try {
    open = require('sqlite').open;
    sqlite3 = require('sqlite3').verbose();
} catch (e) {
    console.warn('[SQLite Notice] SQLite native bindings unavailable in serverless environment:', e.message);
}
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const { z } = require('zod');

// --- PRODUCTION CHANGE & DESTRUCTIVE OPERATION PROTECTION GUARD ---
function checkProductionSafety(operationName, isDestructive = false) {
    if (process.env.NODE_ENV === 'production' && isDestructive) {
        if (process.env.ALLOW_DESTRUCTIVE_PRODUCTION_OPERATIONS !== 'CONFIRMED_AND_APPROVED') {
            const errMessage = `[SECURITY GUARD] Destructive operation "${operationName}" blocked in production! Requires explicit env ALLOW_DESTRUCTIVE_PRODUCTION_OPERATIONS="CONFIRMED_AND_APPROVED".`;
            console.error(errMessage);
            throw new Error(errMessage);
        }
    }
}

// --- REAL-TIME AUDIT LOGGING SYSTEM (KOLKATA TIMEZONE: Asia/Kolkata IST) ---
if (!global.activityLogs) {
    global.activityLogs = [];
}

function getKolkataTimestamp() {
    const now = new Date();
    try {
        const options = {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        };
        const parts = new Intl.DateTimeFormat('en-GB', options).formatToParts(now);
        const map = {};
        parts.forEach(p => map[p.type] = p.value);
        return `${map.year}-${map.month}-${map.day} ${map.hour}:${map.minute}:${map.second} IST`;
    } catch (e) {
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istDate = new Date(now.getTime() + istOffset);
        return istDate.toISOString().replace('T', ' ').substring(0, 19) + ' IST';
    }
}

async function logActivity(action, details = '') {
    const timestamp = getKolkataTimestamp();
    const cleanAction = String(action || '').replace(/[\r\n\t]/g, ' ').trim().toUpperCase();
    const cleanDetails = String(details || '').replace(/[\r\n\t]/g, ' ').trim();
    const formattedLine = `[${timestamp}] ${cleanAction}${cleanDetails ? ': ' + cleanDetails : ''}`;
    console.log(`[AUDIT LOG] ${formattedLine}`);

    if (!global.activityLogs) {
        global.activityLogs = [];
    }
    global.activityLogs.unshift(formattedLine);
    if (global.activityLogs.length > 500) {
        global.activityLogs.pop();
    }

    try {
        if (!isDbMongo() && !db) {
            await initialiseDBAndServer();
        }
    } catch (e) { }

    if (isDbMongo()) {
        try {
            const ActivityLogModel = mongoose.models.ActivityLog || mongoose.model('ActivityLog', activityLogSchema);
            await new ActivityLogModel({
                timestamp,
                action: action.toUpperCase(),
                details,
                formatted: formattedLine,
                created_at: new Date()
            }).save();
        } catch (err) {
            console.warn('[Audit Log Mongo Write Warning]:', err.message);
        }
    }

    if (db) {
        try {
            await db.run('INSERT INTO activity_logs (timestamp, action, details, formatted) VALUES (?, ?, ?, ?)',
                [timestamp, action.toUpperCase(), details, formattedLine]);
        } catch (err) { }
    }

    try {
        const logFilePath = process.env.VERCEL ? path.join(os.tmpdir(), 'activity_log.txt') : path.join(__dirname, 'activity_log.txt');
        fs.appendFileSync(logFilePath, formattedLine + '\n', 'utf8');

        const adminLogPath = process.env.VERCEL ? path.join(os.tmpdir(), 'admin_activity.log') : path.join(__dirname, 'admin_activity.log');
        fs.appendFileSync(adminLogPath, formattedLine + '\n', 'utf8');
    } catch (err) {
        console.warn('[Audit Log Write Warning]:', err.message);
    }
}

// --- OTP MANAGEMENT HELPERS ---
const inMemoryOtps = new Map();

function generateSecureOtp() {
    return crypto.randomInt(100000, 1000000).toString();
}

async function saveOtp({ email, otp, durationMinutes = 10, isMongoConnected, OtpModel, db }) {
    const cleanEmail = email.trim().toLowerCase();
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);
    const createdAt = new Date();

    if (isMongoConnected && OtpModel) {
        try {
            await OtpModel.deleteMany({ email: cleanEmail });
            await new OtpModel({
                email: cleanEmail,
                otp: otp,
                expires_at: expiresAt,
                attempts: 0,
                created_at: createdAt
            }).save();
            return;
        } catch (err) {
            console.error('[OTP Storage] MongoDB Save Error:', err.message);
        }
    }

    if (db) {
        try {
            await db.run('DELETE FROM otps WHERE email = ?', [cleanEmail]);
            await db.run(
                'INSERT INTO otps (email, otp, expires_at, attempts, created_at) VALUES (?, ?, ?, 0, ?)',
                [cleanEmail, otp, expiresAt.toISOString(), createdAt.toISOString()]
            );
            return;
        } catch (err) {
            console.error('[OTP Storage] SQLite Save Error:', err.message);
        }
    }

    inMemoryOtps.set(cleanEmail, { otp, expiresAt, attempts: 0, createdAt });
}

async function checkSendCooldown(email, { isMongoConnected, OtpModel, db, cooldownSeconds = 60 }) {
    const cleanEmail = email.trim().toLowerCase();
    let lastCreated = null;

    if (isMongoConnected && OtpModel) {
        try {
            const doc = await OtpModel.findOne({ email: cleanEmail }).lean();
            if (doc && doc.created_at) {
                lastCreated = new Date(doc.created_at).getTime();
            }
        } catch (err) {
            console.error('[OTP Cooldown] MongoDB lookup error:', err.message);
        }
    } else if (db) {
        try {
            const row = await db.get('SELECT created_at FROM otps WHERE email = ?', [cleanEmail]);
            if (row && row.created_at) {
                lastCreated = new Date(row.created_at).getTime();
            }
        } catch (err) {
            console.error('[OTP Cooldown] SQLite lookup error:', err.message);
        }
    }

    if (!lastCreated && inMemoryOtps.has(cleanEmail)) {
        lastCreated = inMemoryOtps.get(cleanEmail).createdAt.getTime();
    }

    if (lastCreated) {
        const elapsedSeconds = Math.floor((Date.now() - lastCreated) / 1000);
        if (elapsedSeconds < cooldownSeconds) {
            return { allowed: false, cooldownRemaining: cooldownSeconds - elapsedSeconds };
        }
    }

    return { allowed: true, cooldownRemaining: 0 };
}

async function verifyOtp({ email, inputOtp, isMongoConnected, OtpModel, db }) {
    const cleanEmail = email.trim().toLowerCase();
    let record = null;

    if (isMongoConnected && OtpModel) {
        try {
            record = await OtpModel.findOne({ email: cleanEmail }).lean();
        } catch (err) {
            console.error('[OTP Verify] MongoDB lookup error:', err.message);
        }
    }

    if (!record && db) {
        try {
            const row = await db.get('SELECT * FROM otps WHERE email = ?', [cleanEmail]);
            if (row) {
                record = {
                    email: row.email,
                    otp: row.otp,
                    expires_at: new Date(row.expires_at),
                    attempts: row.attempts || 0
                };
            }
        } catch (err) {
            console.error('[OTP Verify] SQLite lookup error:', err.message);
        }
    }

    if (!record && inMemoryOtps.has(cleanEmail)) {
        const mem = inMemoryOtps.get(cleanEmail);
        record = {
            email: cleanEmail,
            otp: mem.otp,
            expires_at: mem.expiresAt,
            attempts: mem.attempts
        };
    }

    if (!record) {
        return { success: false, error: 'No verification code was sent to this email. Please request a new OTP.' };
    }

    const now = new Date();
    const expiresAt = new Date(record.expires_at);
    if (now > expiresAt) {
        await deleteOtp(cleanEmail, { isMongoConnected, OtpModel, db });
        return { success: false, error: 'OTP has expired. Please request a new verification code.' };
    }

    if (record.attempts >= 5) {
        await deleteOtp(cleanEmail, { isMongoConnected, OtpModel, db });
        return { success: false, error: 'Too many failed verification attempts. Please request a new OTP.' };
    }

    if (record.otp === inputOtp.trim()) {
        await deleteOtp(cleanEmail, { isMongoConnected, OtpModel, db });
        return { success: true };
    } else {
        const newAttempts = (record.attempts || 0) + 1;
        await incrementAttempts(cleanEmail, newAttempts, { isMongoConnected, OtpModel, db });
        const remaining = 5 - newAttempts;
        return { success: false, error: `Invalid OTP code. You have ${remaining} attempt(s) remaining.` };
    }
}

async function incrementAttempts(email, attempts, { isMongoConnected, OtpModel, db }) {
    if (isMongoConnected && OtpModel) {
        try { await OtpModel.updateOne({ email }, { attempts }); } catch (e) { }
    } else if (db) {
        try { await db.run('UPDATE otps SET attempts = ? WHERE email = ?', [attempts, email]); } catch (e) { }
    }
    if (inMemoryOtps.has(email)) {
        inMemoryOtps.get(email).attempts = attempts;
    }
}

async function deleteOtp(email, { isMongoConnected, OtpModel, db }) {
    if (isMongoConnected && OtpModel) {
        try { await OtpModel.deleteOne({ email }); } catch (e) { }
    }
    if (db) {
        try { await db.run('DELETE FROM otps WHERE email = ?', [email]); } catch (e) { }
    }
    inMemoryOtps.delete(email);
}

// --- UNIVERSAL EMAIL DELIVERY FUNCTION (HTTPS API & SMTP Fallback) ---
async function sendEmail({ to, subject, text, html = null, attachments = [] }) {
    const recipient = Array.isArray(to) ? to.join(',') : to;
    console.log(`[Email] Dispatching email to: ${recipient.split('@')[1] || 'recipient'}`);

    // Prevent Gmail content trimming by injecting a unique anti-collapse nonce
    if (html && typeof html === 'string') {
        const antiTrimNonce = `<span style="display:none !important; opacity:0; color:transparent; font-size:1px; line-height:1px; max-height:0px; max-width:0px; overflow:hidden; mso-hide:all;">[ID:${Date.now()}-${Math.floor(Math.random() * 10000)}]</span>`;
        if (html.includes('</div>')) {
            const lastIdx = html.lastIndexOf('</div>');
            html = html.substring(0, lastIdx) + antiTrimNonce + html.substring(lastIdx);
        } else {
            html += antiTrimNonce;
        }
    }

    const brevoApiKey = (process.env.BREVO_API_KEY || '').trim();
    const resendApiKey = process.env.RESEND_API_KEY || (process.env.EMAIL_API_KEY && process.env.EMAIL_API_KEY.startsWith('re_') ? process.env.EMAIL_API_KEY : null);
    const sendgridApiKey = process.env.SENDGRID_API_KEY;
    const senderEmail = (process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.EMAIL_USER || 'jeshwanthv751@gmail.com').trim();
    const senderName = (process.env.BREVO_SENDER_NAME || 'XploitX 2.0 BETA').trim();
    const fromAddress = senderEmail.includes('<') ? senderEmail : `"${senderName}" <${senderEmail}>`;

    // 1. BREVO HTTPS REST API (Vercel Serverless Ready over Port 443)
    if (brevoApiKey) {
        console.log('[EmailService] Using Brevo HTTPS Email API (Vercel Serverless Ready)');
        try {
            const recipientList = (Array.isArray(to) ? to : [to]).map(e => ({ email: e }));

            const formattedAttachments = attachments.map(att => {
                let contentBase64 = '';
                if (typeof att.content === 'string') {
                    contentBase64 = att.content;
                } else if (Buffer.isBuffer(att.content)) {
                    contentBase64 = att.content.toString('base64');
                } else if (att.path && fs.existsSync(att.path)) {
                    contentBase64 = fs.readFileSync(att.path).toString('base64');
                }
                return {
                    name: att.filename || 'attachment.pdf',
                    content: contentBase64
                };
            }).filter(att => att.content);

            const payload = {
                sender: { name: senderName, email: senderEmail },
                to: recipientList,
                subject: subject,
                htmlContent: html || `<p>${text}</p>`,
                textContent: text
            };

            if (formattedAttachments.length > 0) {
                payload.attachment = formattedAttachments;
            }

            const response = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'api-key': brevoApiKey.trim(),
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (response.ok) {
                console.log(`[EmailService] ✅ Email delivered via Brevo HTTPS API. ID: ${data.messageId || data.id}`);
                return { success: true, messageId: data.messageId || data.id, provider: 'Brevo' };
            } else {
                console.error(`[EmailService] ❌ Brevo API Error (${response.status}):`, data);
            }
        } catch (err) {
            console.error('[EmailService] ❌ Exception calling Brevo HTTPS API:', err.message);
        }
    }

    // 2. Resend HTTPS API (Vercel Serverless Ready)
    if (resendApiKey) {
        console.log('[EmailService] Using Resend HTTPS Email API');
        try {
            const formattedAttachments = attachments.map(att => ({
                filename: att.filename,
                content: typeof att.content === 'string' ? att.content : Buffer.isBuffer(att.content) ? att.content.toString('base64') : att.content
            }));

            const payload = {
                from: process.env.EMAIL_FROM || 'XploitX 2.0 <onboarding@resend.dev>',
                to: Array.isArray(to) ? to : [to],
                subject: subject,
                html: html || `<p>${text}</p>`,
                text: text
            };

            if (formattedAttachments.length > 0) {
                payload.attachments = formattedAttachments;
            }

            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${resendApiKey.trim()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (response.ok) {
                console.log(`[EmailService] ✅ Email delivered via Resend. ID: ${data.id}`);
                return { success: true, messageId: data.id, provider: 'Resend' };
            } else {
                console.error(`[EmailService] ❌ Resend API Error:`, data);
            }
        } catch (err) {
            console.error('[EmailService] ❌ Exception calling Resend API:', err.message);
        }
    }

    // 3. SendGrid HTTPS API
    if (sendgridApiKey) {
        console.log('[EmailService] Using SendGrid HTTPS Email API');
        try {
            const payload = {
                personalizations: [{ to: (Array.isArray(to) ? to : [to]).map(e => ({ email: e })) }],
                from: { email: senderEmail },
                subject: subject,
                content: [
                    { type: 'text/plain', value: text || '' },
                    ...(html ? [{ type: 'text/html', value: html }] : [])
                ]
            };

            const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${sendgridApiKey.trim()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (response.status >= 200 && response.status < 300) {
                console.log('[EmailService] ✅ Email delivered via SendGrid.');
                return { success: true, provider: 'SendGrid' };
            } else {
                const errText = await response.text();
                console.error(`[EmailService] ❌ SendGrid API Error:`, errText);
            }
        } catch (err) {
            console.error('[EmailService] ❌ SendGrid Exception:', err.message);
        }
    }

    // 4. Nodemailer SMTP Fallback
    console.log('[EmailService] Using Nodemailer SMTP Transport');
    const smtpConfig = process.env.SMTP_HOST ? {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
        auth: {
            user: (process.env.SMTP_USER || process.env.EMAIL_USER || '').trim(),
            pass: (process.env.SMTP_PASS || process.env.EMAIL_PASS || '').replace(/\s+/g, '')
        },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 8000,
        greetingTimeout: 5000,
        socketTimeout: 8000
    } : {
        service: 'gmail',
        auth: {
            user: (process.env.EMAIL_USER || '').trim(),
            pass: (process.env.EMAIL_PASS || '').replace(/\s+/g, '')
        },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 8000,
        greetingTimeout: 5000,
        socketTimeout: 8000
    };

    try {
        const transporter = nodemailer.createTransport(smtpConfig);
        const mailOptions = {
            from: fromAddress,
            to: to,
            subject: subject,
            text: text,
            html: html
        };

        if (attachments && attachments.length > 0) {
            mailOptions.attachments = attachments;
        }

        const sendPromise = transporter.sendMail(mailOptions);
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("SMTP connection timed out.")), 9000)
        );

        const info = await Promise.race([sendPromise, timeoutPromise]);
        console.log("[EmailService] ✅ Email sent via SMTP: %s", info.messageId);
        return { success: true, messageId: info.messageId, provider: 'SMTP' };
    } catch (error) {
        console.error("[EmailService] ❌ SMTP Error:", error.message);
        return { success: false, error: error.message, provider: 'SMTP' };
    }
}

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
    if (req.url && req.url.includes('/api/auth/')) {
        console.log(`[AUTH API] ${req.method} ${req.url} from ${req.ip} (Origin: ${req.headers.origin || 'none'})`);
    }
    next();
});

// Security Headers (Helmet)
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://unpkg.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com", "https://use.fontawesome.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com", "https://use.fontawesome.com"],
            imgSrc: ["'self'", "data:", "https://raw.githubusercontent.com", "https://img.icons8.com", "https://api.qrserver.com", "blob:"],
            connectSrc: ["'self'", "https://api.brevo.com", "https://api.resend.com", "https://api.sendgrid.com"],
            frameAncestors: ["'none'"],
            objectSrc: ["'none'"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

// Restrict CORS Origins (MED-01)
const allowedOrigins = [
    'https://xploitxctf.me',
    'https://www.xploitxctf.me',
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (
            !origin ||
            origin === 'null' ||
            origin.startsWith('file://') ||
            origin.startsWith('http://localhost') ||
            origin.startsWith('http://127.0.0.1') ||
            allowedOrigins.includes(origin)
        ) {
            callback(null, true);
        } else {
            callback(new Error('CORS Policy Blocked: Access from origin ' + origin + ' is not allowed'));
        }
    },
    credentials: true
}));

app.use(bodyParser.json({ limit: '5mb' }));

// NoSQL Injection Sanitization (HIGH-01)
app.use((req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        mongoSanitize.sanitize(req.body, { replaceWith: '_' });
    }
    if (req.params && typeof req.params === 'object') {
        mongoSanitize.sanitize(req.params, { replaceWith: '_' });
    }
    next();
});

// Rate Limiters (HIGH-02)
const adminLoginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: { error: 'Too many admin login attempts. Please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false
});

const attendanceLoginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: { error: 'Too many attendance login attempts. Please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false
});

const otpRequestLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 5 : 50,
    message: { error: 'Too many OTP requests. Please wait 10 minutes.' },
    standardHeaders: true,
    legacyHeaders: false
});

const otpVerifyLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 10 : 50,
    message: { error: 'Too many OTP verification attempts. Please wait 10 minutes.' },
    standardHeaders: true,
    legacyHeaders: false
});

const registrationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'Registration limit reached for this IP. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Upload limit reached. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

// --- SENSITIVE FILE PROTECTION & UPLOADS SECURITY GUARD ---
app.use((req, res, next) => {
    const reqPath = (req.path || '').toLowerCase();

    // 1. Strictly block any request targeting .env files, dotfiles, database files, logs, or sensitive configs
    if (
        reqPath.includes('.env') ||
        reqPath.includes('.git') ||
        reqPath.includes('.db') ||
        reqPath.includes('.json') ||
        reqPath.includes('.log') ||
        reqPath.includes('.key') ||
        reqPath.includes('.pem') ||
        reqPath.includes('.sqlite') ||
        reqPath.includes('node_modules') ||
        reqPath.includes('package.json')
    ) {
        return res.status(403).json({ error: '403 Forbidden: Access to sensitive system file is strictly prohibited.' });
    }

    // 2. Prevent directory listing / browsing on /uploads or /uploads/
    if (reqPath === '/uploads' || reqPath === '/uploads/' || reqPath === '/backend' || reqPath === '/backend/') {
        return res.status(403).json({ error: '403 Forbidden: Directory browsing is prohibited.' });
    }

    next();
});

// --- JWT & SESSION AUTHENTICATION CORE HELPERS ---
const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (secret && secret.trim().length > 0) {
        return secret.trim();
    }
    if (process.env.NODE_ENV === 'production') {
        console.error('[SECURITY GUARD] FATAL: JWT_SECRET environment variable must be explicitly defined in production!');
        throw new Error('JWT_SECRET configuration missing in production');
    }
    return 'xploitx_dev_only_jwt_secret_key_2026';
};

const JWT_SECRET = getJwtSecret();

// Parse cookies safely from incoming request headers
const parseCookies = (req) => {
    const list = {};
    const rc = req && req.headers && req.headers.cookie;
    if (rc) {
        rc.split(';').forEach(cookie => {
            const parts = cookie.split('=');
            if (parts.length >= 2) {
                list[parts[0].trim()] = decodeURIComponent(parts.slice(1).join('=').trim());
            }
        });
    }
    return list;
};

// Check if request has a valid authenticated attendance session (Bearer token only, no cookies)
const isAttendanceAuthenticated = (req) => {
    try {
        const authHeader = req.headers && req.headers['authorization'];
        const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
        if (!bearerToken) return false;

        const decoded = jwt.verify(bearerToken, JWT_SECRET, { algorithms: ['HS256'] });
        if (decoded && decoded.username && (decoded.role === 'admin' || decoded.scope === 'attendance')) {
            return decoded;
        }
        return false;
    } catch (e) {
        return false;
    }
};

// Strict Attendance Authorization Middleware for Backend APIs
const verifyAttendanceAuth = (req, res, next) => {
    const authHeader = req.headers && req.headers['authorization'];
    const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (!bearerToken) {
        return res.status(401).json({ error: 'Unauthorized: Valid attendance authentication token required.' });
    }

    try {
        const decoded = jwt.verify(bearerToken, JWT_SECRET, { algorithms: ['HS256'] });
        if (decoded && decoded.username && (decoded.role === 'admin' || decoded.scope === 'attendance')) {
            req.user = decoded;
            return next();
        }
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions for attendance terminal.' });
    } catch (e) {
        return res.status(403).json({ error: 'Forbidden: Invalid or expired attendance token.' });
    }
};

// --- ATTENDANCE SERVER-SIDE ROUTE GUARDS ---
// Direct page serving - authentication guard is enforced client-side via strict token validation
app.get(['/attendance', '/attendance.html'], (req, res) => {
    res.sendFile(path.join(__dirname, '../public/attendance.html'));
});

app.get(['/attendance-login', '/attendance-login.html'], (req, res) => {
    res.redirect('/attendance.html');
});

app.use(express.static(path.join(__dirname, '../public')));

// Ensure local uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    try {
        fs.mkdirSync(uploadsDir, { recursive: true });
    } catch (e) {
        console.warn("Could not create uploads directory:", e.message);
    }
}

// Secure static uploads serving with strict non-executable headers
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    dotfiles: 'ignore',
    index: false,
    setHeaders: (res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Security-Policy', "default-src 'none'");
    }
}));

app.use('/uploads', express.static(path.join(os.tmpdir(), 'uploads'), {
    dotfiles: 'ignore',
    index: false,
    setHeaders: (res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Security-Policy', "default-src 'none'");
    }
}));

// Explicit file serving route fallback for uploads (with DB Base64 backup for Vercel/serverless/restart persistence)
app.get('/uploads/:filename', async (req, res) => {
    const filename = path.basename(req.params.filename);
    const ext = path.extname(filename).toLowerCase();

    // Block non-image / executable extensions inside uploads
    const allowedExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.pdf'];
    if (!allowedExtensions.includes(ext)) {
        return res.status(403).json({ error: '403 Forbidden: File type execution or access prohibited.' });
    }

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'");

    const localPath = path.join(__dirname, 'uploads', filename);
    const tmpPath = path.join(os.tmpdir(), 'uploads', filename);

    if (fs.existsSync(localPath)) {
        return res.sendFile(localPath);
    } else if (fs.existsSync(tmpPath)) {
        return res.sendFile(tmpPath);
    }

    // Fallback: DB lookup if static file doesn't exist on disk
    try {
        const teamIdMatch = path.basename(filename).split('.')[0].replace(/[^a-zA-Z0-9_-]/g, '');
        const escapedFilename = filename.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        let team = null;

        if (isDbMongo()) {
            team = await Team.findOne({
                $or: [
                    { payment_proof: filename },
                    { payment_proof: { $regex: escapedFilename, $options: 'i' } },
                    { team_id: teamIdMatch }
                ]
            }).lean();
        } else if (db) {
            team = await db.get(
                `SELECT * FROM teams WHERE payment_proof LIKE ? OR team_id = ?`,
                [`%${filename}%`, teamIdMatch]
            );
        }

        if (team) {
            const rawData = team.payment_proof_data || (team.payment_proof && team.payment_proof.startsWith('data:') ? team.payment_proof : null);
            if (rawData) {
                const matches = rawData.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
                if (matches) {
                    const mimeType = matches[1];
                    const base64Data = matches[2];
                    const imgBuffer = Buffer.from(base64Data, 'base64');
                    res.set('Content-Type', mimeType);
                    res.set('Cache-Control', 'public, max-age=86400');
                    return res.send(imgBuffer);
                }
            }
        }
    } catch (dbErr) {
        console.error('[Upload Serve] DB Fallback lookup error:', dbErr.message);
    }

    return res.status(404).send('File not found');
});

// Database Connection Middleware for Serverless/Express Environment
app.use(async (req, res, next) => {
    try {
        if (!isDbMongo() && !db) {
            if (!dbInitPromise) {
                dbInitPromise = initialiseDBAndServer();
            }
            await dbInitPromise;
        }
    } catch (e) {
        console.error('Middleware DB connect error:', e.message);
    } finally {
        dbInitPromise = null;
    }
    next();
});

// Multer Storage - Serverless Safe (Vercel / Local)
const multer = require('multer');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadDir;
        if (process.env.VERCEL === '1' || process.env.VERCEL_ENV) {
            uploadDir = path.join(os.tmpdir(), 'uploads');
        } else {
            uploadDir = path.join(__dirname, 'uploads');
        }

        try {
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            cb(null, uploadDir);
        } catch (err) {
            console.warn('Primary upload dir creation failed, falling back to os.tmpdir():', err.message);
            const fallbackDir = os.tmpdir();
            try {
                if (!fs.existsSync(fallbackDir)) {
                    fs.mkdirSync(fallbackDir, { recursive: true });
                }
            } catch (e) { }
            cb(null, fallbackDir);
        }
    },
    filename: (req, file, cb) => {
        const rawTeamId = req.body && typeof req.body.teamId === 'string' ? req.body.teamId : 'upload';
        const safeTeamId = path.basename(rawTeamId).replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 50) || 'team';
        const ext = path.extname(file.originalname || '').toLowerCase();
        const safeExt = ['.jpg', '.jpeg', '.png'].includes(ext) ? ext : '.png';
        const safeFilename = `${safeTeamId}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${safeExt}`;
        cb(null, safeFilename);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Upload the images in jpeg, jpg or png format'));
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 1 * 1024 * 1024 }
});

// --- MONGOOSE SCHEMAS & MODELS FOR MONGODB ATLAS ---
const teamSchema = new mongoose.Schema({
    team_id: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    event: String,
    day: String,
    transaction_id: String,
    payment_proof: String,
    payment_proof_data: String,
    payment_verified: { type: Number, default: 0 },
    created_at: { type: Date, default: Date.now }
});

const memberSchema = new mongoose.Schema({
    team_id: { type: String, required: true },
    name: { type: String, required: true },
    age: Number,
    email: String,
    phone: String,
    whatsapp: String,
    college: String,
    district: String,
    role: { type: String, enum: ['LEADER', 'MEMBER'], default: 'MEMBER' },
    attendance_status: { type: String, default: 'ABSENT' },
    entry_time: Date
});

const attendanceSchema = new mongoose.Schema({
    team_id: { type: String, unique: true, required: true },
    team_name: String,
    team_leader_name: String,
    team_leader_phone: String,
    status: { type: String, default: 'ABSENT' },
    entry_time: { type: Date, default: Date.now }
});

const otpSchema = new mongoose.Schema({
    email: { type: String, required: true, index: true },
    otp: { type: String, required: true },
    expires_at: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    created_at: { type: Date, default: Date.now }
});

const activityLogSchema = new mongoose.Schema({
    timestamp: { type: String, required: true },
    action: { type: String, required: true },
    details: { type: String, default: '' },
    formatted: { type: String, required: true },
    created_at: { type: Date, default: Date.now }
});

const Team = mongoose.model('Team', teamSchema);
const Member = mongoose.model('Member', memberSchema);
const Attendance = mongoose.model('Attendance', attendanceSchema);
const Otp = mongoose.model('Otp', otpSchema);
const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

let isMongoConnected = false;
let db = null;
let dbInitPromise = null;
const DBPath = path.join(__dirname, 'hackathon.db');

function isDbMongo() {
    return mongoose.connection && mongoose.connection.readyState === 1;
}

const initialiseDBAndServer = async () => {
    if (isDbMongo()) {
        isMongoConnected = true;
        return;
    }
    const defaultMongoUri = 'mongodb+srv://jeshwanthv751_db_user:BqVftSj4VJzuts3h@cluster0.vy8bb6x.mongodb.net/?appName=Cluster0';
    const mongoUri = (process.env.MONGODB_URI || defaultMongoUri).trim();
    const isProductionEnv = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1' || !!process.env.VERCEL_ENV;

    if (mongoUri) {
        try {
            await mongoose.connect(mongoUri, {
                serverSelectionTimeoutMS: 5000
            });
            isMongoConnected = true;
            console.log('✅ Connected to MongoDB Atlas successfully!');
        } catch (err) {
            console.error('❌ MongoDB Atlas Connection Error:', err.message);
            if (isProductionEnv) {
                console.error('[SECURITY GUARD] Production environment requires MongoDB Atlas. Silent SQLite fallback disabled to prevent data divergence.');
                return;
            } else {
                console.log('⚠️ Falling back to local SQLite database in development...');
            }
        }
    }

    if (!isDbMongo() && !db && !isProductionEnv && open && sqlite3) {
        try {
            db = await open({
                filename: DBPath,
                driver: sqlite3.Database,
            });
            await initDb();
        } catch (err) {
            console.log(`DB Error: ${err.message}`);
        }
    }

    if (process.env.VERCEL !== '1' && !process.env.VERCEL_ENV) {
        if (!app.get('server_started') && require.main === module) {
            const http = require('http');
            const serverInst = http.createServer(app);
            serverInst.on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    console.log(`[Server Notice]: Port ${PORT} is already in use by another running process.`);
                } else {
                    console.error('[Server Error]:', err.message);
                }
            });
            serverInst.listen(PORT, '0.0.0.0', () => {
                console.log(`🚀 Server started at http://localhost:${PORT}/ (Bound to 0.0.0.0)`);
                if (isDbMongo()) {
                    console.log(`🍃 Database Engine: MongoDB Atlas Connected`);
                } else {
                    console.log(`📁 Database Engine: SQLite (Local Backup)`);
                }
            });
            app.set('server_started', true);
        }
    } else {
        console.log(`🚀 Vercel Serverless environment initialized.`);
    }
};

async function initDb() {
    if (!db) return;
    await db.run(`CREATE TABLE IF NOT EXISTS teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id TEXT UNIQUE, 
        name TEXT,
        email TEXT UNIQUE,
        event TEXT,
        transaction_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        payment_proof TEXT,
        payment_proof_data TEXT,
        payment_verified INTEGER DEFAULT 0
    )`);

    try { await db.run(`ALTER TABLE teams ADD COLUMN payment_proof TEXT`); } catch (e) { }
    try { await db.run(`ALTER TABLE teams ADD COLUMN payment_proof_data TEXT`); } catch (e) { }
    try { await db.run(`ALTER TABLE teams ADD COLUMN payment_verified INTEGER DEFAULT 0`); } catch (e) { }
    try { await db.run(`ALTER TABLE teams ADD COLUMN day TEXT`); } catch (e) { }

    await db.run(`CREATE TABLE IF NOT EXISTS members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_db_id INTEGER,
        name TEXT,
        age INTEGER,
        email TEXT,
        phone TEXT,
        whatsapp TEXT,
        college TEXT,
        district TEXT,
        role TEXT,
        FOREIGN KEY(team_db_id) REFERENCES teams(id)
    )`);

    await db.run(`CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id TEXT UNIQUE,
        team_name TEXT UNIQUE,
        team_leader_name TEXT,
        team_leader_phone TEXT UNIQUE,
        status TEXT DEFAULT 'ABSENT', 
        entry_time DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await db.run(`CREATE TABLE IF NOT EXISTS otps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        otp TEXT,
        expires_at DATETIME,
        attempts INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await db.run(`CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT,
        action TEXT,
        details TEXT,
        formatted TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    try { await db.run(`ALTER TABLE attendance ADD COLUMN entry_time DATETIME DEFAULT CURRENT_TIMESTAMP`); } catch (e) { }
    try { await db.run(`ALTER TABLE attendance ADD COLUMN status TEXT DEFAULT 'ABSENT'`); } catch (e) { }
    try { await db.run(`ALTER TABLE members ADD COLUMN attendance_status TEXT DEFAULT 'ABSENT'`); } catch (e) { }
    try { await db.run(`ALTER TABLE members ADD COLUMN entry_time DATETIME`); } catch (e) { }

    console.log('SQLite Database initialized.');
}

// --- UNIFIED DATA ACCESS LAYER (MONGO ATLAS + SQLITE FALLBACK) ---

async function getTeamCount() {
    if (isDbMongo()) {
        return await Team.countDocuments();
    }
    if (db) {
        const result = await db.get('SELECT COUNT(*) as count FROM teams');
        return result ? result.count : 0;
    }
    return 0;
}

async function getNextTeamId() {
    let existingIds = new Set();

    if (isDbMongo()) {
        const teams = await Team.find({}, { team_id: 1 }).lean();
        teams.forEach(t => { if (t.team_id) existingIds.add(t.team_id); });
    } else if (db) {
        const teams = await db.all('SELECT team_id FROM teams');
        teams.forEach(t => { if (t.team_id) existingIds.add(t.team_id); });
    }

    let i = 1;
    while (true) {
        const candidate = `XCTF-26-${String(i).padStart(4, '0')}`;
        const oldCandidate = `XB2026-${String(i).padStart(4, '0')}`;
        if (!existingIds.has(candidate) && !existingIds.has(oldCandidate)) {
            return candidate;
        }
        i++;
    }
}

async function findTeamByName(name) {
    if (isDbMongo()) {
        return await Team.findOne({ name: new RegExp('^' + name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') }).lean();
    }
    if (db) {
        return await db.get('SELECT * FROM teams WHERE name = ? COLLATE NOCASE', [name]);
    }
    return null;
}

async function findTeamByEmail(email) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) return null;

    if (isDbMongo()) {
        try {
            return await Team.findOne({ email: cleanEmail }).lean();
        } catch (e) {
            console.error('Error checking MongoDB for existing team:', e.message);
        }
    }
    if (db) {
        try {
            return await db.get('SELECT * FROM teams WHERE LOWER(email) = ?', [cleanEmail]);
        } catch (e) {
            console.error('Error checking SQLite for existing team:', e.message);
        }
    }
    return null;
}

async function findTeamById(teamId) {
    if (isDbMongo()) {
        return await Team.findOne({ team_id: teamId }).lean();
    }
    if (db) {
        return await db.get('SELECT * FROM teams WHERE team_id = ?', [teamId]);
    }
    return null;
}

async function findTeamByUTR(utr) {
    if (isDbMongo()) {
        return await Team.findOne({ transaction_id: utr }).lean();
    }
    if (db) {
        return await db.get('SELECT team_id FROM teams WHERE transaction_id = ?', [utr]);
    }
    return null;
}

async function getAllTeamsData() {
    if (isDbMongo()) {
        const teams = await Team.find().lean();
        const fullData = [];
        for (const t of teams) {
            const members = await Member.find({ team_id: t.team_id }).lean();
            fullData.push({ ...t, id: t._id.toString(), members });
        }
        return fullData;
    }
    if (db) {
        const teams = await db.all(`SELECT * FROM teams`);
        const fullData = [];
        for (const team of teams) {
            const members = await db.all(`SELECT * FROM members WHERE team_db_id = ?`, [team.id]);
            fullData.push({ ...team, members });
        }
        return fullData;
    }
    return [];
}

async function getTeamDataWithMembers(teamId) {
    if (isDbMongo()) {
        const team = await Team.findOne({ team_id: teamId }).lean();
        if (!team) return null;
        const members = await Member.find({ team_id: teamId }).lean();
        return { team: { ...team, id: team._id.toString() }, members };
    }
    if (db) {
        const team = await db.get(`SELECT * FROM teams WHERE team_id = ?`, [teamId]);
        if (!team) return null;
        const members = await db.all(`SELECT * FROM members WHERE team_db_id = ?`, [team.id]);
        return { team, members };
    }
    return null;
}

async function createTeamRecord({ teamName, email, event, day, transactionId, paymentProof, paymentProofData, members }) {
    if (isDbMongo()) {
        const teamIdStr = await getNextTeamId();
        const newTeam = new Team({
            team_id: teamIdStr,
            name: teamName,
            email,
            event,
            day: day || "N/A",
            transaction_id: transactionId || "NOT_PROVIDED",
            payment_proof: paymentProof || "",
            payment_proof_data: paymentProofData || "",
            payment_verified: 0
        });
        await newTeam.save();

        for (let i = 0; i < members.length; i++) {
            const m = members[i];
            const role = i === 0 ? 'LEADER' : 'MEMBER';
            const newMember = new Member({
                team_id: teamIdStr,
                name: m.name,
                age: m.age,
                email: m.email,
                phone: m.phone,
                whatsapp: m.whatsapp,
                college: m.college,
                district: m.district,
                role
            });
            await newMember.save();
        }
        return { teamId: teamIdStr, teamDbId: newTeam._id.toString() };
    }

    if (db) {
        const teamIdStr = await getNextTeamId();
        const result = await db.run(
            `INSERT INTO teams (team_id, name, email, event, day, transaction_id, payment_proof, payment_proof_data, payment_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
            [teamIdStr, teamName, email, event, day || "N/A", transactionId || "NOT_PROVIDED", paymentProof || "", paymentProofData || ""]
        );
        const teamDbId = result.lastID;

        for (let i = 0; i < members.length; i++) {
            const m = members[i];
            const role = i === 0 ? 'LEADER' : 'MEMBER';
            await db.run(
                `INSERT INTO members (team_db_id, name, age, email, phone, whatsapp, college, district, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [teamDbId, m.name, m.age, m.email, m.phone, m.whatsapp, m.college, m.district, role]
            );
        }
        return { teamId: teamIdStr, teamDbId };
    }

    throw new Error('Database server is initializing or unavailable. Please try again in a few seconds.');
}

async function updatePaymentStatus(teamId, status) {
    if (isDbMongo()) {
        await Team.updateOne({ team_id: teamId }, { payment_verified: status });
    }
    if (db) {
        try {
            await db.run(`UPDATE teams SET payment_verified = ? WHERE team_id = ?`, [status, teamId]);
        } catch (e) { }
    }
}

async function updatePaymentProof(teamId, proofPath, transactionId, proofData = null) {
    if (isDbMongo()) {
        const updateDoc = { payment_proof: proofPath };
        if (transactionId) updateDoc.transaction_id = transactionId;
        if (proofData) updateDoc.payment_proof_data = proofData;
        await Team.updateOne({ team_id: teamId }, updateDoc);
    }
    if (db) {
        try {
            if (transactionId && proofData) {
                await db.run(`UPDATE teams SET payment_proof = ?, transaction_id = ?, payment_proof_data = ? WHERE team_id = ?`, [proofPath, transactionId, proofData, teamId]);
            } else if (proofData) {
                await db.run(`UPDATE teams SET payment_proof = ?, payment_proof_data = ? WHERE team_id = ?`, [proofPath, proofData, teamId]);
            } else if (transactionId) {
                await db.run(`UPDATE teams SET payment_proof = ?, transaction_id = ? WHERE team_id = ?`, [proofPath, transactionId, teamId]);
            } else {
                await db.run(`UPDATE teams SET payment_proof = ? WHERE team_id = ?`, [proofPath, teamId]);
            }
        } catch (e) { }
    }
}

async function updateTeamAndMembers(teamId, name, event, members) {
    if (isDbMongo()) {
        await Team.updateOne({ team_id: teamId }, { name, event });
        await Member.deleteMany({ team_id: teamId });
        for (let i = 0; i < members.length; i++) {
            const m = members[i];
            const role = m.role || (i === 0 ? 'LEADER' : 'MEMBER');
            await new Member({
                team_id: teamId,
                name: m.name,
                age: m.age,
                email: m.email,
                phone: m.phone,
                whatsapp: m.whatsapp,
                college: m.college,
                district: m.district,
                role
            }).save();
        }
    }
    if (db) {
        try {
            const team = await db.get(`SELECT * FROM teams WHERE team_id = ?`, [teamId]);
            if (team) {
                await db.run(`UPDATE teams SET name = ?, event = ? WHERE id = ?`, [name, event, team.id]);
                await db.run(`DELETE FROM members WHERE team_db_id = ?`, [team.id]);
                for (let i = 0; i < members.length; i++) {
                    const m = members[i];
                    const role = m.role || (i === 0 ? 'LEADER' : 'MEMBER');
                    await db.run(
                        `INSERT INTO members (team_db_id, name, age, email, phone, whatsapp, college, district, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [team.id, m.name, m.age, m.email, m.phone, m.whatsapp, m.college, m.district, role]
                    );
                }
            }
        } catch (e) { }
    }
}

async function deleteTeamRecord(teamId) {
    if (isDbMongo()) {
        await Team.deleteOne({ team_id: teamId });
        await Member.deleteMany({ team_id: teamId });
        await Attendance.deleteOne({ team_id: teamId });
    }
    if (db) {
        try {
            const team = await db.get(`SELECT id FROM teams WHERE team_id = ?`, [teamId]);
            if (team) {
                await db.run('DELETE FROM members WHERE team_db_id = ?', [team.id]);
                await db.run('DELETE FROM teams WHERE id = ?', [team.id]);
                await db.run('DELETE FROM attendance WHERE team_id = ?', [teamId]);
            }
        } catch (e) { }
    }
}

async function addAttendanceRecord(teamId, teamName, leaderName, leaderPhone) {
    if (isDbMongo()) {
        await Attendance.updateOne(
            { team_id: teamId },
            { $setOnInsert: { team_id: teamId, team_name: teamName, team_leader_name: leaderName, team_leader_phone: leaderPhone, status: 'ABSENT' } },
            { upsert: true }
        );
    }
    if (db) {
        try {
            await db.run(`INSERT OR IGNORE INTO attendance (team_id, team_name, team_leader_name, team_leader_phone, status) VALUES (?, ?, ?, ?, 'ABSENT')`,
                [teamId, teamName, leaderName, leaderPhone]);
        } catch (e) { }
    }
    exportDatabaseBackup().catch(() => { });
}

// --- AUTOMATED DATABASE BACKUP SYSTEM ---
const BACKUP_JSON_PATH = path.join(process.env.VERCEL ? os.tmpdir() : __dirname, 'database_backup.json');
const BACKUP_DB_PATH = path.join(process.env.VERCEL ? os.tmpdir() : __dirname, 'hackathon_backup.db');

async function exportDatabaseBackup() {
    try {
        let teams = [];
        let members = [];
        let attendance = [];
        let otps = [];
        let activityLogs = [];

        if (isDbMongo()) {
            teams = await Team.find().lean();
            members = await Member.find().lean();
            attendance = await Attendance.find().lean();
            otps = await Otp.find().lean();
            if (mongoose.models.ActivityLog) {
                activityLogs = await mongoose.models.ActivityLog.find().lean();
            }
        }

        if (teams.length === 0 && db) {
            teams = await db.all('SELECT * FROM teams');
            members = await db.all('SELECT * FROM members');
            attendance = await db.all('SELECT * FROM attendance');
            otps = await db.all('SELECT * FROM otps');
            activityLogs = await db.all('SELECT * FROM activity_logs');
        }

        const backupData = {
            export_timestamp: getKolkataTimestamp(),
            summary: {
                total_teams: teams.length,
                total_members: members.length,
                total_attendance_records: attendance.length,
                total_activity_logs: activityLogs.length
            },
            teams,
            members,
            attendance,
            otps,
            activityLogs
        };

        fs.writeFileSync(BACKUP_JSON_PATH, JSON.stringify(backupData, null, 2), 'utf8');

        if (fs.existsSync(DBPath)) {
            try {
                fs.copyFileSync(DBPath, BACKUP_DB_PATH);
            } catch (copyErr) { }
        }

        console.log(`[DATABASE BACKUP SUCCESS] Backup exported (${teams.length} teams) to database_backup.json & hackathon_backup.db`);
        return backupData;
    } catch (err) {
        console.error('[DATABASE BACKUP ERROR]:', err.message);
        return null;
    }
}

if (!process.env.VERCEL && !process.env.VERCEL_ENV && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
    initialiseDBAndServer().then(() => {
        setTimeout(() => {
            exportDatabaseBackup().catch(() => { });
        }, 3000);
    });
}

// --- EMAIL CONFIGURATION ---
// NOTE: The primary sendEmail function using the Brevo HTTPS REST API is defined
// at the top of this file (search for 'UNIVERSAL EMAIL DELIVERY FUNCTION').
// It supports Brevo, Resend, SendGrid, and Nodemailer SMTP as fallback.
// No duplicate definition is needed here.

// API Routes

// --- JWT & ADMIN SECURITY LAYER ---
const verifyAdmin = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!bearerToken) {
        return res.status(401).json({ error: 'Unauthorized: Admin authentication token required.' });
    }

    // Explicitly enforce allowed algorithms to block algorithm confusion attacks (e.g. alg: none)
    jwt.verify(bearerToken, JWT_SECRET, { algorithms: ['HS256'] }, (err, user) => {
        if (err || !user || !user.username || user.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden: Valid admin authorization required.' });
        }
        req.user = user;
        next();
    });
};

function logAdminActivity(action, details = '') {
    const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });
    const logEntry = `[${timestamp}] ${action}${details ? ': ' + details : ''}\n`;
    const logPath = path.join(__dirname, 'admin_activity.log');
    fs.appendFile(logPath, logEntry, (err) => {
        if (err) console.error('Error writing to admin log:', err);
    });
}

// Zod Input Schemas (HIGH-01)
const adminLoginSchema = z.object({
    username: z.string().min(1, 'Username required').max(50).trim(),
    password: z.string().min(1, 'Password required').max(100).trim()
});

const otpRequestSchema = z.object({
    email: z.string().email('Invalid email address').max(100).trim().toLowerCase(),
    name: z.string().max(100).optional()
});

const otpVerifySchema = z.object({
    email: z.string().email('Invalid email address').max(100).trim().toLowerCase(),
    otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must be numeric')
});

// Admin Login Route (CRIT-02 & HIGH-02)
app.post('/api/admin/login', adminLoginLimiter, (req, res) => {
    try {
        const validation = adminLoginSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: validation.error.issues[0].message });
        }
        const { username, password } = validation.data;

        const cleanUsername = username.toLowerCase().trim();
        const cleanPassword = password.trim();

        // Secure credential lookup with environment variable priority and default fallbacks
        const adminAccounts = {
            "administrator": process.env.ADMIN_PASS_ADMINISTRATOR || "Beta@Admln#2.0!",
            "admin": process.env.ADMIN_PASS_ADMINISTRATOR || "Beta@Admln#2.0!",
            "jesin milesh": process.env.ADMIN_PASS_JESIN || "Jesin@Beta2026",
            "jesin": process.env.ADMIN_PASS_JESIN || "Jesin@Beta2026",
            "ashish": process.env.ADMIN_PASS_ASHISH || "Ashish@Beta2026"
        };

        const canonicalMap = {
            "administrator": "Administrator",
            "admin": "Administrator",
            "jesin milesh": "Jesin Milesh",
            "jesin": "Jesin Milesh",
            "ashish": "Ashish"
        };

        let isValid = false;
        const expectedPass = adminAccounts[cleanUsername];

        if (expectedPass) {
            if (expectedPass.startsWith('$2b$') || expectedPass.startsWith('$2a$')) {
                isValid = bcrypt.compareSync(cleanPassword, expectedPass);
            } else {
                isValid = (cleanPassword === expectedPass);
            }
        }

        const clientIp = (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : (req.ip || req.socket.remoteAddress || '127.0.0.1')).replace(/^::ffff:/, '');

        if (isValid) {
            const canonicalUser = canonicalMap[cleanUsername] || username;
            logActivity('ADMIN LOGIN', `Operative "${canonicalUser}" logged into Admin Console`);
            const token = jwt.sign({ username: canonicalUser, role: 'admin' }, JWT_SECRET, { expiresIn: '2h', algorithm: 'HS256' });
            res.clearCookie('admin_token', { path: '/' });
            res.clearCookie('attendance_token', { path: '/' });
            res.json({ success: true, token: token, user: canonicalUser });
        } else {
            logActivity('ADMIN LOGIN FAILED', `Operative "${username}" failed login attempt`);
            res.status(401).json({ error: 'Invalid Credentials' });
        }
    } catch (err) {
        console.error('Error in /api/admin/login:', err);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

// Admin Logout Route
app.post('/api/admin/logout', async (req, res) => {
    let user = 'Admin';
    const authHeader = req.headers && req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
            if (decoded && decoded.username) user = decoded.username;
        } catch (e) { }
    }
    if (user === 'Admin' && req.body && req.body.username) {
        user = req.body.username;
    }
    await logActivity('ADMIN LOGOUT', `Operative "${user}" logged out of Admin Console`);
    res.clearCookie('admin_token', { path: '/' });
    res.json({ success: true });
});

// Helper: Extract numeric millisecond timestamp from any log line format for exact sorting
function extractLogTimestamp(line) {
    if (!line) return 0;
    // Format 1: [YYYY-MM-DD HH:mm:ss] or [YYYY-MM-DD HH:mm:ss IST]
    const m1 = String(line).match(/^\[(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2}):(\d{2})/);
    if (m1) {
        const pad = (n) => String(n).padStart(2, '0');
        const d = new Date(`${m1[1]}-${m1[2]}-${m1[3]}T${pad(m1[4])}:${m1[5]}:${m1[6]}+05:30`);
        return d.getTime() || 0;
    }
    // Format 2: [DD/MM/YYYY, HH:mm:ss am/pm] or [DD/MM/YYYY, HH:mm:ss]
    const m2 = String(line).match(/^\[(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+(\d{1,2}):(\d{2}):(\d{2})\s*(am|pm)?/i);
    if (m2) {
        let hr = parseInt(m2[4], 10);
        const ampm = (m2[7] || '').toLowerCase();
        if (ampm === 'pm' && hr < 12) hr += 12;
        if (ampm === 'am' && hr === 12) hr = 0;
        const pad = (n) => String(n).padStart(2, '0');
        const d = new Date(`${m2[3]}-${pad(m2[2])}-${pad(m2[1])}T${pad(hr)}:${m2[5]}:${m2[6]}+05:30`);
        return d.getTime() || 0;
    }
    // Format 3: ISO [YYYY-MM-DDTHH:mm:ss...]
    const m3 = String(line).match(/^\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
    if (m3) {
        const d = new Date(m3[1]);
        return d.getTime() || 0;
    }
    return 0;
}

// Admin Real-time System Audit Log Endpoint
app.get('/api/admin/activity-log', verifyAdmin, async (req, res) => {
    try {
        if (!req.user || req.user.username !== 'Administrator') {
            return res.status(403).json({ error: 'Access Denied: High Command Administrator clearance required.' });
        }
        let logs = [];

        // 1. Load historical logs from database_backup.json (check multiple possible root/backend locations)
        const backupPaths = [
            path.join(__dirname, 'database_backup.json'),
            path.join(__dirname, '../database_backup.json'),
            path.join(process.cwd(), 'database_backup.json'),
            path.join(process.cwd(), 'backend', 'database_backup.json')
        ];

        for (const bPath of backupPaths) {
            if (fs.existsSync(bPath)) {
                try {
                    const backupData = JSON.parse(fs.readFileSync(bPath, 'utf8'));
                    if (backupData && backupData.activityLogs && Array.isArray(backupData.activityLogs)) {
                        backupData.activityLogs.forEach(l => {
                            const line = l.formatted || `[${l.timestamp || getKolkataTimestamp()}] ${l.action || 'LOG'}${l.details ? ': ' + l.details : ''}`;
                            if (line && !logs.includes(line)) {
                                logs.push(line);
                            }
                        });
                    }
                } catch (err) { }
            }
        }

        // 2. Load directly from MongoDB Atlas if MONGODB_URI is available
        try {
            const mongoUri = (process.env.MONGODB_URI || "").trim();
            if (mongoUri) {
                if (!isDbMongo()) {
                    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 }).catch(() => { });
                }
                if (isDbMongo()) {
                    const ActivityLogModel = mongoose.models.ActivityLog || mongoose.model('ActivityLog', activityLogSchema);
                    const dbLogs = await ActivityLogModel.find().sort({ created_at: -1 }).limit(500).lean();
                    if (dbLogs && dbLogs.length > 0) {
                        dbLogs.forEach(l => {
                            const line = l.formatted || `[${l.timestamp}] ${l.action}${l.details ? ': ' + l.details : ''}`;
                            if (line && !logs.includes(line)) {
                                logs.push(line);
                            }
                        });
                    }
                }
            }
        } catch (err) {
            console.warn('MongoDB Atlas activity log query warning:', err.message);
        }

        // 3. Load from SQLite database if active
        if (typeof db !== 'undefined' && db && db.all) {
            try {
                const dbLogs = await db.all('SELECT formatted, timestamp, action, details FROM activity_logs ORDER BY id ASC LIMIT 500');
                if (dbLogs && dbLogs.length > 0) {
                    dbLogs.forEach(l => {
                        const line = l.formatted || `[${l.timestamp}] ${l.action}${l.details ? ': ' + l.details : ''}`;
                        if (line && !logs.includes(line)) {
                            logs.push(line);
                        }
                    });
                }
            } catch (err) { }
        }

        // 4. Load from disk log files
        const adminLogPaths = [
            process.env.VERCEL ? path.join(os.tmpdir(), 'admin_activity.log') : path.join(__dirname, 'admin_activity.log'),
            path.join(process.cwd(), 'admin_activity.log'),
            path.join(process.cwd(), 'backend', 'admin_activity.log')
        ];

        for (const aPath of adminLogPaths) {
            if (fs.existsSync(aPath)) {
                try {
                    const adminContent = fs.readFileSync(aPath, 'utf8');
                    const adminLines = adminContent.trim().split('\n').filter(Boolean);
                    adminLines.forEach(line => {
                        if (line && !logs.includes(line)) {
                            logs.push(line);
                        }
                    });
                } catch (err) { }
            }
        }

        const logFilePaths = [
            process.env.VERCEL ? path.join(os.tmpdir(), 'activity_log.txt') : path.join(__dirname, 'activity_log.txt'),
            path.join(process.cwd(), 'activity_log.txt'),
            path.join(process.cwd(), 'backend', 'activity_log.txt')
        ];

        for (const lPath of logFilePaths) {
            if (fs.existsSync(lPath)) {
                try {
                    const content = fs.readFileSync(lPath, 'utf8');
                    const fileLines = content.trim().split('\n').filter(Boolean);
                    fileLines.forEach(line => {
                        if (line && !logs.includes(line)) {
                            logs.push(line);
                        }
                    });
                } catch (err) { }
            }
        }

        // 5. Load in-memory activity logs
        if (global.activityLogs && global.activityLogs.length > 0) {
            global.activityLogs.forEach(line => {
                if (line && !logs.includes(line)) {
                    logs.push(line);
                }
            });
        }

        // Strip "from IP: ..." suffix from all log lines per user preference
        logs = logs.map(line => String(line).replace(/\s*from IP:\s*[^\n\r]+/gi, '').trim()).filter(Boolean);

        // Deduplicate
        logs = Array.from(new Set(logs));

        // Sort chronologically descending (newest timestamp first)
        logs.sort((a, b) => {
            const timeA = extractLogTimestamp(a);
            const timeB = extractLogTimestamp(b);
            if (timeA !== timeB) {
                return timeB - timeA;
            }
            return 0;
        });

        const logOutput = logs.length > 0
            ? logs.join('\n')
            : `[${getKolkataTimestamp()}] ADMIN LOGIN: Operative "${req.user ? req.user.username : 'Administrator'}" logged into Admin Console`;

        res.json({ log: logOutput, count: logs.length });
    } catch (err) {
        console.error('Error serving activity log:', err);
        const fallbackLog = `[${getKolkataTimestamp()}] ADMIN LOGIN: Operative "${req.user ? req.user.username : 'Administrator'}" logged into Admin Console`;
        res.json({ log: fallbackLog, count: 1 });
    }
});

// Static endpoint to download/view raw admin_activity.log (Restricted to authenticated admin)
app.get('/admin_activity.log', verifyAdmin, (req, res) => {
    if (!req.user || req.user.username !== 'Administrator') {
        return res.status(403).send('Access Denied: High Command Administrator clearance required.');
    }
    const adminLogPath = path.join(__dirname, 'admin_activity.log');
    if (fs.existsSync(adminLogPath)) {
        res.sendFile(adminLogPath);
    } else {
        const rootPath = path.join(process.cwd(), 'admin_activity.log');
        if (fs.existsSync(rootPath)) {
            res.sendFile(rootPath);
        } else {
            res.status(404).send('Log file not found');
        }
    }
});

// Admin Clear Activity Log Endpoint
app.post('/api/admin/clear-activity-log', verifyAdmin, async (req, res) => {
    try {
        if (!req.user || req.user.username !== 'Administrator') {
            return res.status(403).json({ error: 'Access Denied: High Command Administrator clearance required.' });
        }
        checkProductionSafety('CLEAR_ACTIVITY_LOG', true);
        await initialiseDBAndServer();

        global.activityLogs = [];

        if (isDbMongo() && mongoose.models.ActivityLog) {
            try {
                await mongoose.models.ActivityLog.deleteMany({});
            } catch (err) {
                console.error('Error clearing MongoDB logs:', err.message);
            }
        }

        if (db) {
            try {
                await db.run('DELETE FROM activity_logs');
            } catch (err) { }
        }

        const logFilePath = process.env.VERCEL ? path.join(os.tmpdir(), 'activity_log.txt') : path.join(__dirname, 'activity_log.txt');
        try {
            if (fs.existsSync(logFilePath)) {
                fs.writeFileSync(logFilePath, '', 'utf8');
            }
        } catch (e) { }

        await logActivity('LOGS CLEARED', `Activity audit logs manually cleared by admin`);

        res.json({ message: 'Activity logs cleared successfully' });
    } catch (err) {
        console.error('Error clearing activity logs:', err);
        const safeErr = process.env.NODE_ENV === 'production' ? 'Failed to clear activity log' : ('Failed to clear activity log: ' + err.message);
        res.status(500).json({ error: safeErr });
    }
});

// Admin Route: Retrieve Instant Secondary Database Backup
app.get('/api/admin/backup-db', verifyAdmin, async (req, res) => {
    try {
        const backup = await exportDatabaseBackup();
        res.json({ success: true, backup });
    } catch (err) {
        console.error('Error generating database backup:', err);
        const safeErr = process.env.NODE_ENV === 'production' ? 'Failed to generate database backup' : ('Failed to generate database backup: ' + err.message);
        res.status(500).json({ error: safeErr });
    }
});

// Helper: Validate Email Domain via Regex
async function validateEmailDomain(email) {
    const domain = email.split('@')[1];
    if (!domain) return false;
    return /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain);
}

const verificationOtps = {};

function getEmailHeaderHtml(subtitle = 'DEPARTMENT OF CYBER SECURITY') {
    let deptText = 'DEPARTMENT OF CYBER SECURITY';
    if (subtitle && !subtitle.includes('PRATHYUSHA')) {
        deptText = subtitle;
    }
    return `
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; width: 100%; margin-bottom: 20px;">
            <tr>
                <!-- PEC Logo on Left Side -->
                <td align="left" valign="middle" style="width: 75px; min-width: 70px; padding-right: 8px;">
                    <img src="https://raw.githubusercontent.com/ashish1207kh/XploitX-2026-beta-/main/public/PEC%20Logo.png" alt="Prathyusha Engineering College Logo" width="75" style="width: 75px; max-width: 75px; height: auto; display: block; border: 0; outline: none;" />
                </td>
                <!-- Center: First Prathyusha Engineering College, then Department of Cyber Security (All in White) -->
                <td align="center" valign="middle" style="padding: 0 6px; text-align: center;">
                    <div style="color: #ffffff; font-size: 15px; font-weight: bold; letter-spacing: 0.8px; line-height: 1.3; text-transform: uppercase; margin: 0;">PRATHYUSHA ENGINEERING COLLEGE</div>
                    <div style="color: #ffffff; font-size: 9.5px; letter-spacing: 0.5px; text-transform: uppercase; margin: 2px 0 3px 0; opacity: 0.85;">(AN AUTONOMOUS INSTITUTION)</div>
                    <div style="color: #ffffff; font-size: 12.5px; font-weight: bold; letter-spacing: 0.8px; text-transform: uppercase; margin: 0 0 4px 0;">${deptText}</div>
                    <div style="color: #00ff66; font-size: 18px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; margin: 4px 0 0 0;">XPLOITX 2.0 BETA</div>
                </td>
                <!-- XploitX Beta Logo on Right Side (Larger & Clearer) -->
                <td align="right" valign="middle" style="width: 150px; min-width: 135px; padding-left: 8px;">
                    <img src="https://raw.githubusercontent.com/ashish1207kh/XploitX-2026-beta-/main/public/xploitx_logo.png" alt="XploitX 2.0 Beta Logo" width="150" style="width: 150px; max-width: 155px; height: auto; display: block; border: 0; outline: none;" />
                </td>
            </tr>
        </table>
        <div style="height: 1px; background: linear-gradient(90deg, transparent, #00ff66, transparent); margin-bottom: 22px;"></div>
    `;
}

function getEmailFooterHtml(includeWhatsApp = true) {
    const whatsappIcon = includeWhatsApp ? `
                <a href="https://chat.whatsapp.com/LDDhYBN90bJEJWyAxEBLFR" target="_blank" style="text-decoration: none; margin: 0 12px; display: inline-block;">
                    <img src="https://img.icons8.com/color/96/whatsapp.png" alt="WhatsApp Group" width="32" height="32" style="vertical-align: middle; border: 0; outline: none;">
                </a>` : '';

    const uniqueId = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

    return `
        <div style="margin-top: 20px; text-align: center; padding-top: 15px;">
            <p style="font-weight: bold; font-size: 12px; margin-bottom: 12px; color: #8b9bb4; letter-spacing: 1px;">CONNECT WITH US & FIND VENUE LOCATION</p>
            <div style="text-align: center;">
                <a href="https://instagram.com/xploitxctf.2k26" target="_blank" style="text-decoration: none; margin: 0 12px; display: inline-block;">
                    <img src="https://img.icons8.com/color/96/instagram-new.png" alt="Instagram" width="32" height="32" style="vertical-align: middle; border: 0; outline: none;">
                </a>${whatsappIcon}
                <a href="https://maps.app.goo.gl/fEMAzGYaPhuvDfi86" target="_blank" style="text-decoration: none; margin: 0 12px; display: inline-block;">
                    <img src="https://img.icons8.com/color/96/google-maps.png" alt="Location Map" width="32" height="32" style="vertical-align: middle; border: 0; outline: none;">
                </a>
            </div>
            <span style="display:none !important; opacity:0; color:transparent; font-size:1px; line-height:1px; max-height:0px; max-width:0px; overflow:hidden; mso-hide:all;">[Ref: ${uniqueId}]</span>
        </div>
    `;
}

// Generate Scannable High-Redundancy QR Code with XploitX Logo in the Middle
async function generateQrWithLogo(qrData) {
    const QRCode = require('qrcode');
    const { PNG } = require('pngjs');

    const qrBuffer = await QRCode.toBuffer(qrData, {
        errorCorrectionLevel: 'H',
        type: 'png',
        margin: 2,
        width: 420,
        color: {
            dark: '#000000',
            light: '#ffffff'
        }
    });

    const qrPng = PNG.sync.read(qrBuffer);

    const logoPath = path.join(__dirname, '../public/xploitx_logo.png');
    if (fs.existsSync(logoPath)) {
        try {
            const logoBuffer = fs.readFileSync(logoPath);
            const logoPng = PNG.sync.read(logoBuffer);

            // Perfectly proportioned logo for guaranteed instant optical scanning
            const targetW = 110;
            const targetH = Math.round(targetW / (logoPng.width / logoPng.height)); // 40px
            const pad = 3;

            const startX = Math.round((qrPng.width - targetW) / 2);
            const startY = Math.round((qrPng.height - targetH) / 2);

            // Seamless white background (NO dark box, NO border - blends into QR background)
            for (let y = -pad; y < targetH + pad; y++) {
                for (let x = -pad; x < targetW + pad; x++) {
                    const px = startX + x;
                    const py = startY + y;
                    if (px >= 0 && px < qrPng.width && py >= 0 && py < qrPng.height) {
                        const idx = (qrPng.width * py + px) << 2;
                        qrPng.data[idx] = 255;
                        qrPng.data[idx + 1] = 255;
                        qrPng.data[idx + 2] = 255;
                        qrPng.data[idx + 3] = 255;
                    }
                }
            }

            // Draw enlarged logo
            for (let y = 0; y < targetH; y++) {
                for (let x = 0; x < targetW; x++) {
                    const srcX = Math.floor((x / targetW) * logoPng.width);
                    const srcY = Math.floor((y / targetH) * logoPng.height);
                    const srcIdx = (logoPng.width * srcY + srcX) << 2;

                    const srcA = logoPng.data[srcIdx + 3] / 255;
                    if (srcA > 0.05) {
                        const destX = startX + x;
                        const destY = startY + y;
                        const destIdx = (qrPng.width * destY + destX) << 2;

                        qrPng.data[destIdx] = Math.round(logoPng.data[srcIdx] * srcA + 255 * (1 - srcA));
                        qrPng.data[destIdx + 1] = Math.round(logoPng.data[srcIdx + 1] * srcA + 255 * (1 - srcA));
                        qrPng.data[destIdx + 2] = Math.round(logoPng.data[srcIdx + 2] * srcA + 255 * (1 - srcA));
                        qrPng.data[destIdx + 3] = 255;
                    }
                }
            }
        } catch (logoErr) {
            console.warn('[QR] Failed to overlay logo onto QR:', logoErr.message);
        }
    }

    const finalBuffer = PNG.sync.write(qrPng);
    return 'data:image/png;base64,' + finalBuffer.toString('base64');
}

// Public API endpoint to render QR Code with XploitX Logo
app.get('/api/qr', async (req, res) => {
    try {
        const text = req.query.data || req.query.text || 'XPLOITX 2.0 BETA';
        const dataUrl = await generateQrWithLogo(text);
        const imgBuffer = Buffer.from(dataUrl.split('base64,')[1], 'base64');
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.send(imgBuffer);
    } catch (e) {
        res.status(500).send(e.message);
    }
});



// Send OTP
app.post('/api/auth/send-verification-otp', otpRequestLimiter, async (req, res) => {
    try {
        const validation = otpRequestSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: validation.error.issues[0].message });
        }
        let { email, name } = validation.data;

        const isValidDomain = await validateEmailDomain(email);
        if (!isValidDomain) {
            return res.status(400).json({ error: `Invalid email address format.` });
        }

        const existingTeam = await findTeamByEmail(email);
        if (existingTeam) {
            return res.status(400).json({ error: 'This email is already registered as a Team Leader.' });
        }

        const otp = generateSecureOtp(); // cryptographically secure via crypto.randomInt
        verificationOtps[email] = otp;
        await saveOtp({ email, otp, durationMinutes: 10, isMongoConnected: isDbMongo(), OtpModel: Otp, db });

        const subject = "Email Verification OTP - XPLOITX 2.0 BETA";
        const recipientName = name ? name.trim() : "Team Leader";

        const html = `
        <div style="font-family: Arial, Helvetica, sans-serif; background-color: #050914; color: #ffffff; padding: 30px; border-radius: 8px; border: 1px solid #00ff66; max-width: 580px; margin: 0 auto;">
            ${getEmailHeaderHtml('DEPARTMENT OF CYBER SECURITY')}
            
            <div style="background: rgba(2, 6, 18, 0.85); padding: 22px; border-radius: 6px; border-left: 4px solid #00ff66; margin-bottom: 22px;">
                <h2 style="color: #ffffff; font-size: 18px; margin-top: 0;">Verification Code</h2>
                <p style="color: #d1d5db; font-size: 14px; line-height: 1.5;">Dear <b>${recipientName}</b>,</p>
                <p style="color: #d1d5db; font-size: 14px; line-height: 1.5;">Your one-time verification code for registering in <b>XPLOITX 2.0 BETA</b> is:</p>
                
                <div style="text-align: center; margin: 26px 0;">
                    <span style="display: inline-block; background: #02040a; color: #00ff66; border: 2px dashed #00ff66; padding: 14px 28px; font-size: 32px; font-weight: bold; letter-spacing: 8px; border-radius: 6px; box-shadow: 0 0 15px rgba(0, 255, 102, 0.3);">
                        ${otp}
                    </span>
                </div>
                
                <p style="color: #8b9bb4; font-size: 13px;">This OTP is valid for 10 minutes. Please enter this code on the registration page to complete your email verification.</p>
                <p style="color: #8b9bb4; font-size: 12px; margin-top: 15px;">If you did not request this email, please ignore this message.</p>
            </div>
            
            ${getEmailFooterHtml(false)}
        </div>`;

        const text = `XPLOITX 2.0 BETA - Email Verification\n\nDear ${recipientName},\n\nUse the code below to verify your email address:\n\n${otp}\n\nThis OTP is valid for 10 minutes.\n\nPrathyusha Engineering College - Department of Cyber Security`;

        // Use BREVO_API_KEY as primary guard — this is the production email provider
        const hasEmailProvider = !!(process.env.BREVO_API_KEY || process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY || (process.env.EMAIL_USER && !process.env.EMAIL_USER.includes('your-email')));
        if (hasEmailProvider) {
            const result = await sendEmail({ to: email, subject, text, html });
            if (!result.success) {
                let errorMsg = result.error || "Failed to send email.";
                if (errorMsg.toLowerCase().includes('address not found') || errorMsg.toLowerCase().includes('enotfound') || errorMsg.toLowerCase().includes('rejected') || errorMsg.toLowerCase().includes('does not exist') || errorMsg.toLowerCase().includes('user unknown') || errorMsg.includes('550 5.1.1')) {
                    errorMsg = "Address not found";
                }
                return res.status(500).json({ error: 'Unable to send verification email. Please try again.' });
            }
        } else {
            console.log(`[MOCK EMAIL] OTP for ${email} is ${otp}`);
        }

        res.json({ success: true, message: 'OTP sent' });
    } catch (err) {
        console.error('Error in /api/auth/send-verification-otp:', err);
        res.status(500).json({ error: 'Internal server error while sending OTP.' });
    }
});

app.post('/api/auth/verify-email-otp', otpVerifyLimiter, async (req, res) => {
    try {
        const validation = otpVerifySchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: validation.error.issues[0].message });
        }
        const { email, otp } = validation.data;

        // 1. Direct in-memory check fallback
        if (verificationOtps[email] && verificationOtps[email] === otp) {
            delete verificationOtps[email];
            await deleteOtp(email, { isMongoConnected: isDbMongo(), OtpModel: Otp, db });
            return res.json({ success: true });
        }

        // 2. Persistent storage check (MongoDB Atlas, SQLite, & global inMemoryOtps)
        const result = await verifyOtp({ email, inputOtp: otp, isMongoConnected: isDbMongo(), OtpModel: Otp, db });
        if (result.success) {
            delete verificationOtps[email];
            return res.json({ success: true });
        } else {
            return res.status(400).json({ error: result.error || 'Invalid OTP code' });
        }
    } catch (err) {
        console.error('Error in /api/auth/verify-email-otp:', err);
        res.status(500).json({ error: 'Internal server error while verifying OTP.' });
    }
});

async function sendRegistrationVerificationEmail(leader, teamName) {
    const hasEmailProvider = !!(process.env.BREVO_API_KEY || process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY || (process.env.EMAIL_USER && !process.env.EMAIL_USER.includes('your-email')));
    if (!hasEmailProvider) return;
    const recipientEmail = leader.email;
    if (!recipientEmail || !recipientEmail.includes('@')) return;

    const subject = "XploitX 2.0 Beta CTF - Registration Under Verification";

    const textContent = `Dear ${leader.name},\n\nGreetings from Team XploitX!\n\nWe are pleased to inform you that your registration for XploitX 2.0 Beta CTF has been successfully received.\n\nWe have successfully received your registration and payment details. Your payment is currently under verification.\n\nOur team will verify your payment and confirm your registration within 1–2 working days.\n\nEVENT DETAILS\n\nEvent: XploitX 2.0 Beta CTF\nDate & Time: 9th October 2026, 10:00 AM to 10th October 2026, 10:00 AM\nVenue: Prathyusha Engineering College, Tiruvallur\n\nOnce your payment has been successfully verified, you will receive a separate confirmation email containing further event details and instructions.\n\nPlease do not make any duplicate payment while your payment is under verification.\n\nThank you for registering for XploitX 2.0 Beta CTF.\n\nWe look forward to seeing you at the event!\n\nRegards,\nTeam XploitX\nPrathyusha Engineering College\nDepartment of Cyber Security`;

    const htmlContent = `
    <div style="font-family: Arial, sans-serif; background-color: #050914; color: #ffffff; padding: 25px; border-radius: 8px; border: 1px solid #00ff66; max-width: 600px; margin: 0 auto;">
        ${getEmailHeaderHtml('DEPARTMENT OF CYBER SECURITY')}

        <div style="background: rgba(2, 6, 18, 0.9); padding: 20px; border-radius: 6px; border-left: 4px solid #00ff66; margin-bottom: 20px; line-height: 1.6; color: #d1d5db; font-size: 14px;">
            <p style="color: #ffffff; font-size: 15px; margin-top: 0;">Dear <b>${leader.name}</b>,</p>

            <p>Greetings from Team XploitX!</p>

            <p>We are pleased to inform you that your registration for <b>XploitX 2.0 Beta CTF</b> has been successfully received.</p>

            <p>We have successfully received your registration and payment details. Your payment is currently under verification.</p>

            <p>Our team will verify your payment and confirm your registration within 1–2 working days.</p>

            <div style="background-color: #02040a; padding: 15px; border-radius: 5px; border: 1px solid #00ff66; margin: 20px 0;">
                <h4 style="color: #ffd700; margin: 0 0 10px 0; font-size: 14px; letter-spacing: 1px;">EVENT DETAILS</h4>
                <p style="margin: 3px 0;"><b>Event:</b> XploitX 2.0 Beta CTF</p>
                <p style="margin: 3px 0;"><b>Date & Time:</b> 9th October 2026, 10:00 AM to 10th October 2026, 10:00 AM</p>
                <p style="margin: 3px 0;"><b>Venue:</b> Prathyusha Engineering College, Tiruvallur</p>
            </div>

            <p>Once your payment has been successfully verified, you will receive a separate confirmation email containing further event details and instructions.</p>

            <p style="color: #ff9900; font-weight: bold;">Please do not make any duplicate payment while your payment is under verification.</p>

            <p>Thank you for registering for XploitX 2.0 Beta CTF.</p>

            <p>We look forward to seeing you at the event!</p>

            <p style="color: #8b9bb4; font-size: 13px; margin-top: 20px;">Regards,<br><b style="color: #ffffff;">Team XploitX</b><br>Prathyusha Engineering College<br>Department of Cyber Security</p>
        </div>
        ${getEmailFooterHtml(false)}
    </div>`;

    await sendEmail({ to: recipientEmail, subject, text: textContent, html: htmlContent });
}

app.get('/api/admin/data', verifyAdmin, async (req, res) => {
    try {
        const operative = req.user ? req.user.username : 'Admin';
        if (operative !== 'Administrator') {
            if (!global.lastDataLogTime) global.lastDataLogTime = {};
            const now = Date.now();
            if (!global.lastDataLogTime[operative] || now - global.lastDataLogTime[operative] > 60000) {
                global.lastDataLogTime[operative] = now;
                logActivity('DATA ACCESS', `Operative "${operative}" viewed full teams roster`);
            }
        }
        const fullData = await getAllTeamsData();
        res.json(fullData);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/team/:id', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
        let isAdmin = false;
        let operative = 'Admin';
        if (token) {
            try {
                const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
                if (decoded && decoded.role === 'admin') {
                    isAdmin = true;
                    if (decoded.username) operative = decoded.username;
                }
            } catch (e) { }
        }

        const data = await getTeamDataWithMembers(req.params.id);
        if (!data) return res.status(404).json({ error: 'Team not found' });

        if (isAdmin) {
            if (operative !== 'Administrator') {
                logActivity('DATA ACCESS', `Operative "${operative}" inspected dossier for Team [${req.params.id}]`);
            }
            return res.json(data);
        } else {
            // Return sanitized non-PII team view for unauthenticated requests (CRIT-03)
            const sanitizedData = {
                team_id: data.team_id,
                name: data.name,
                event: data.event,
                day: data.day,
                payment_verified: data.payment_verified,
                members: (data.members || []).map(m => ({
                    name: m.name,
                    role: m.role,
                    college: m.college
                }))
            };
            return res.json(sanitizedData);
        }
    } catch (e) { res.status(500).json({ error: 'Failed to retrieve team details' }); }
});

// Total Registration Count
app.get('/api/registration/count', async (req, res) => {
    try {
        const count = await getTeamCount();
        res.json({ count });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Admin Update Team
app.post('/api/admin/update_team', verifyAdmin, async (req, res) => {
    const { teamId, name, event, members } = req.body;
    const operative = req.user ? req.user.username : 'Admin';
    try {
        const existing = await getTeamDataWithMembers(teamId);
        let diffs = [];
        if (existing && existing.team) {
            if (name && existing.team.name !== name) {
                diffs.push(`Team Name: "${existing.team.name}" ➔ "${name}"`);
            }
            if (event && existing.team.event !== event) {
                diffs.push(`Event: "${existing.team.event}" ➔ "${event}"`);
            }
            if (members && Array.isArray(members)) {
                const oldMembers = existing.members || [];
                const maxLen = Math.max(oldMembers.length, members.length);
                for (let i = 0; i < maxLen; i++) {
                    const oldM = oldMembers[i];
                    const newM = members[i];
                    if (oldM && newM) {
                        const mLabel = (oldM.role === 'LEADER' || i === 0) ? 'Leader' : `Member ${i + 1}`;
                        if (oldM.name !== newM.name) {
                            diffs.push(`${mLabel} Name: "${oldM.name || ''}" ➔ "${newM.name || ''}"`);
                        }
                        if (oldM.email !== newM.email) {
                            diffs.push(`${mLabel} (${newM.name || oldM.name}) Email: "${oldM.email || ''}" ➔ "${newM.email || ''}"`);
                        }
                        if (oldM.phone !== newM.phone) {
                            diffs.push(`${mLabel} (${newM.name || oldM.name}) Phone: "${oldM.phone || ''}" ➔ "${newM.phone || ''}"`);
                        }
                        if (oldM.whatsapp !== newM.whatsapp) {
                            diffs.push(`${mLabel} (${newM.name || oldM.name}) WhatsApp: "${oldM.whatsapp || ''}" ➔ "${newM.whatsapp || ''}"`);
                        }
                        if (oldM.college !== newM.college) {
                            diffs.push(`${mLabel} (${newM.name || oldM.name}) College: "${oldM.college || ''}" ➔ "${newM.college || ''}"`);
                        }
                        if (oldM.district !== newM.district) {
                            diffs.push(`${mLabel} (${newM.name || oldM.name}) District: "${oldM.district || ''}" ➔ "${newM.district || ''}"`);
                        }
                        if (oldM.age !== newM.age) {
                            diffs.push(`${mLabel} (${newM.name || oldM.name}) Age: "${oldM.age || ''}" ➔ "${newM.age || ''}"`);
                        }
                    } else if (!oldM && newM) {
                        diffs.push(`Added Member ${i + 1}: "${newM.name}" (${newM.role || 'MEMBER'})`);
                    } else if (oldM && !newM) {
                        diffs.push(`Removed Member ${i + 1}: "${oldM.name}"`);
                    }
                }
            }
        }
        await updateTeamAndMembers(teamId, name, event, members);
        const diffSummary = diffs.length > 0 ? diffs.join(', ') : 'No data changes detected';
        await logActivity('DATA MODIFIED', `Team [${teamId}] modified by Operative "${operative}": [${diffSummary}]`);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/team/:id/update', verifyAdmin, async (req, res) => {
    const { members } = req.body;
    const operative = req.user ? req.user.username : 'Admin';
    try {
        const team = await findTeamById(req.params.id);
        if (!team) return res.status(404).json({ error: 'Team not found' });
        const existing = await getTeamDataWithMembers(req.params.id);
        let diffs = [];
        if (existing && existing.members && Array.isArray(members)) {
            const oldMembers = existing.members || [];
            const maxLen = Math.max(oldMembers.length, members.length);
            for (let i = 0; i < maxLen; i++) {
                const oldM = oldMembers[i];
                const newM = members[i];
                if (oldM && newM) {
                    const mLabel = (oldM.role === 'LEADER' || i === 0) ? 'Leader' : `Member ${i + 1}`;
                    if (oldM.name !== newM.name) {
                        diffs.push(`${mLabel} Name: "${oldM.name || ''}" ➔ "${newM.name || ''}"`);
                    }
                    if (oldM.email !== newM.email) {
                        diffs.push(`${mLabel} (${newM.name || oldM.name}) Email: "${oldM.email || ''}" ➔ "${newM.email || ''}"`);
                    }
                    if (oldM.phone !== newM.phone) {
                        diffs.push(`${mLabel} (${newM.name || oldM.name}) Phone: "${oldM.phone || ''}" ➔ "${newM.phone || ''}"`);
                    }
                    if (oldM.whatsapp !== newM.whatsapp) {
                        diffs.push(`${mLabel} (${newM.name || oldM.name}) WhatsApp: "${oldM.whatsapp || ''}" ➔ "${newM.whatsapp || ''}"`);
                    }
                    if (oldM.college !== newM.college) {
                        diffs.push(`${mLabel} (${newM.name || oldM.name}) College: "${oldM.college || ''}" ➔ "${newM.college || ''}"`);
                    }
                    if (oldM.district !== newM.district) {
                        diffs.push(`${mLabel} (${newM.name || oldM.name}) District: "${oldM.district || ''}" ➔ "${newM.district || ''}"`);
                    }
                    if (oldM.age !== newM.age) {
                        diffs.push(`${mLabel} (${newM.name || oldM.name}) Age: "${oldM.age || ''}" ➔ "${newM.age || ''}"`);
                    }
                } else if (!oldM && newM) {
                    diffs.push(`Added Member ${i + 1}: "${newM.name}"`);
                } else if (oldM && !newM) {
                    diffs.push(`Removed Member ${i + 1}: "${oldM.name}"`);
                }
            }
        }
        await updateTeamAndMembers(req.params.id, team.name, team.event, members);
        const diffSummary = diffs.length > 0 ? diffs.join(', ') : 'No data changes detected';
        await logActivity('DATA MODIFIED', `Team [${req.params.id}] modified by Operative "${operative}": [${diffSummary}]`);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed to update team record' }); }
});

app.post('/api/auth/register-with-payment', registrationLimiter, upload.single('paymentProof'), async (req, res) => {
    try {
        const { teamName, email, event, utrNumber } = req.body;
        let members;
        try {
            members = JSON.parse(req.body.members);
        } catch (e) {
            return res.status(400).json({ error: 'Invalid members data format' });
        }

        const file = req.file;
        if (!teamName || !members) return res.status(400).json({ error: 'Missing required fields' });

        if (!Array.isArray(members) || members.length < 2 || members.length > 4) {
            return res.status(400).json({ error: 'Team size must be between 2 and 4 members (1 Leader + 1 to 3 Squad Members).' });
        }

        const existingTeamName = await findTeamByName(teamName);
        if (existingTeamName) return res.status(400).json({ error: 'Team Name taken.' });

        const existingTeamEmail = await findTeamByEmail(email);
        if (existingTeamEmail) {
            return res.status(400).json({ error: 'This email is already registered as a Team Leader.' });
        }

        if (utrNumber) {
            const existingUTR = await findTeamByUTR(utrNumber);
            if (existingUTR) {
                return res.status(400).json({ error: 'UTR already used.' });
            }
        }

        let proofBase64 = null;
        if (file) {
            try {
                const fileBuf = file.buffer || (file.path && fs.existsSync(file.path) ? fs.readFileSync(file.path) : null);
                if (fileBuf) {
                    const mimeType = file.mimetype || 'image/jpeg';
                    proofBase64 = `data:${mimeType};base64,${fileBuf.toString('base64')}`;
                }
            } catch (e) {
                console.error("Base64 conversion error in register:", e.message);
            }
        }

        const initialFilePath = file ? ('/uploads/' + file.filename) : 'NOT_PROVIDED';
        const record = await createTeamRecord({
            teamName,
            email,
            event,
            day: req.body.day,
            transactionId: utrNumber,
            paymentProof: initialFilePath,
            paymentProofData: proofBase64,
            members
        });

        const teamIdStr = record.teamId;

        // Rename Payment Proof File if uploaded & sync Base64 data
        if (file) {
            let newDbPath = initialFilePath;
            if (file.path && fs.existsSync(file.path)) {
                const oldPath = file.path;
                const ext = path.extname(file.originalname);
                const newFilename = teamIdStr + ext;
                const newPath = path.join(path.dirname(oldPath), newFilename);

                try {
                    fs.renameSync(oldPath, newPath);
                    newDbPath = '/uploads/' + newFilename;
                } catch (renameErr) {
                    console.error("File Rename Error:", renameErr);
                }
            } else if (file.filename) {
                const ext = path.extname(file.originalname);
                newDbPath = '/uploads/' + teamIdStr + ext;
            }

            await updatePaymentProof(teamIdStr, newDbPath, utrNumber, proofBase64);
        }

        // Send Initial Verification Email to Team Leader Only
        const leaderObj = members[0] || { name: teamName, email: email };
        await sendRegistrationVerificationEmail(leaderObj, teamName);

        res.json({ success: true, teamId: teamIdStr });

    } catch (err) {
        console.error("Registration Error:", err);
        const safeMsg = process.env.NODE_ENV === 'production' ? 'Registration processing failed. Please verify your details and try again.' : err.message;
        res.status(500).json({ error: safeMsg });
    }
});

app.post('/api/payment/upload', upload.single('paymentProof'), async (req, res) => {
    const { teamId, utrNumber } = req.body;
    const file = req.file;
    if (!file || !teamId) return res.status(400).json({ error: 'Missing Data' });

    if (utrNumber) {
        const existingUTR = await findTeamByUTR(utrNumber);
        if (existingUTR && existingUTR.team_id !== teamId) {
            return res.status(400).json({ error: 'UTR already used.' });
        }
    }

    let proofBase64 = null;
    try {
        const fileBuf = file.buffer || (file.path && fs.existsSync(file.path) ? fs.readFileSync(file.path) : null);
        if (fileBuf) {
            const mimeType = file.mimetype || 'image/jpeg';
            proofBase64 = `data:${mimeType};base64,${fileBuf.toString('base64')}`;
        }
    } catch (e) {
        console.error("Base64 conversion error in payment/upload:", e.message);
    }

    let filePath = '/uploads/' + file.filename;
    if (file.path && fs.existsSync(file.path)) {
        const ext = path.extname(file.originalname);
        const newFilename = teamId + ext;
        const newPath = path.join(path.dirname(file.path), newFilename);
        try {
            fs.renameSync(file.path, newPath);
            filePath = '/uploads/' + newFilename;
        } catch (e) { }
    }

    await updatePaymentProof(teamId, filePath, utrNumber, proofBase64);

    res.json({ success: true });
});

app.post('/api/admin/verify_payment', verifyAdmin, async (req, res) => {
    const { teamId } = req.body;
    try {
        await updatePaymentStatus(teamId, 1);
        const data = await getTeamDataWithMembers(teamId);
        if (!data) return res.json({ success: true, message: "Payment verified" });

        const teamData = data.team;
        const members = data.members;
        const leader = members.find(m => m.role === 'LEADER') || members[0];

        if (leader) {
            await addAttendanceRecord(teamId, teamData.name, leader.name, leader.phone);

            // QR Code Generation:
            // 1. Generate local PNG for attachment pass
            const qrData = JSON.stringify({ teamId, teamName: teamData.name, leaderName: leader.name });
            const qrImage = await generateQrWithLogo(qrData);

            // 2. High-availability public HTTPS QR URL for email clients (Gmail, Outlook, Apple Mail)
            // Major email clients (especially Gmail) block or strip inline data:image/png base64 URIs.
            // Using a public HTTPS URL guarantees the QR code loads instantly and displays every time the email is opened.
            const logoUrl = 'https://raw.githubusercontent.com/ashish1207kh/XploitX-2026-beta-/main/public/xploitx_logo.png';
            let publicQrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(qrData)}&centerImageUrl=${encodeURIComponent(logoUrl)}&ecLevel=H&size=350&centerImageSizeRatio=0.32`;
            const hostUrl = process.env.APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null);
            if (hostUrl && hostUrl.startsWith('http') && !hostUrl.includes('localhost')) {
                publicQrUrl = `${hostUrl}/api/qr?data=${encodeURIComponent(qrData)}`;
            }

            // PDF Generation for OD Letter
            let odPdfBuffer = null;
            try {
                odPdfBuffer = await generateODPdfInternal(teamData);
            } catch (pdfErr) {
                console.error("OD PDF Generation Error:", pdfErr);
            }

            const attachments = [{
                filename: `${teamId}_Pass.png`,
                content: qrImage.split("base64,")[1],
                encoding: 'base64',
                cid: 'event-qr-code'
            }];

            if (odPdfBuffer) {
                attachments.push({
                    filename: `${teamId}_OD_Letter.pdf`,
                    content: odPdfBuffer
                });
            }

            const whatsappLink = "https://chat.whatsapp.com/LDDhYBN90bJEJWyAxEBLFR";
            const recipientEmails = Array.from(new Set(members.map(m => m.email).concat([teamData.email]).filter(e => e && e.includes('@'))));

            const membersListText = members.map((m, i) => `${i + 1}. ${m.name} – ${m.college || leader.college || 'Prathyusha Engineering College'}`).join('\n');
            const membersListHtml = members.map(m => `<li><b>${m.name}</b> – ${m.college || leader.college || 'Prathyusha Engineering College'}</li>`).join('');

            const textContent = `Dear Participants,\n\nGreetings from Team XploitX!\n\nWe are pleased to inform you that your payment for XploitX 2.0 Beta CTF has been successfully verified.\n\nYour team’s registration is now officially confirmed for the event.\n\nTEAM & REGISTRATION DETAILS\n\nTeam ID: ${teamId}\nTeam Name: ${teamData.name}\nTeam Leader: ${leader.name}\nPayment Status: VERIFIED\nRegistration Status: CONFIRMED\n\nTEAM MEMBERS\n\n${membersListText}\n\nEVENT DETAILS\n\nEvent: XploitX 2.0 Beta CTF\nDate & Time: 9th October 2026, 10:00 AM to 10th October 2026, 10:00 AM\nVenue: Prathyusha Engineering College, Tiruvallur\nOrganized By: Department of Cybersecurity\nInstitution: Prathyusha Engineering College\n\nYour payment has been successfully verified, and your team is officially confirmed to participate in XploitX 2.0 Beta CTF.\n\nClick Here ( ${whatsappLink} ) to join the official participant WhatsApp group.\n\nPlease keep this email for your future reference and ensure that all team members are informed about the event details.\n\nThank you for participating in XploitX 2.0 Beta CTF.\n\nWe look forward to welcoming your team and wish you the very best for the competition!\n\nRegards,\nTeam XploitX\nPrathyusha Engineering College\nDepartment of Cyber Security`;

            const htmlContent = `
                <div style="font-family: Arial, sans-serif; background-color: #050914; color: #ffffff; padding: 25px; border-radius: 8px; border: 1px solid #00ff66; max-width: 600px; margin: 0 auto;">
                    ${getEmailHeaderHtml('DEPARTMENT OF CYBER SECURITY')}

                    <div style="background: rgba(2, 6, 18, 0.9); padding: 20px; border-radius: 6px; border-left: 4px solid #00ff66; margin-bottom: 20px; line-height: 1.6; color: #d1d5db; font-size: 14px;">
                        <p style="color: #ffffff; font-size: 15px; margin-top: 0;">Dear Participants,</p>

                        <p>Greetings from Team XploitX!</p>

                        <p>We are pleased to inform you that your payment for <b>XploitX 2.0 Beta CTF</b> has been successfully verified.</p>

                        <p style="color: #00ff66; font-weight: bold;">Your team’s registration is now officially confirmed for the event.</p>

                        <div style="background-color: #02040a; padding: 15px; border-radius: 5px; border: 1px solid #00ff66; margin: 20px 0;">
                            <h4 style="color: #ffd700; margin: 0 0 10px 0; font-size: 14px; letter-spacing: 1px;">TEAM & REGISTRATION DETAILS</h4>
                            <p style="margin: 3px 0;"><b>Team ID:</b> <span style="color: #00ff66; font-weight: bold;">${teamId}</span></p>
                            <p style="margin: 3px 0;"><b>Team Name:</b> ${teamData.name}</p>
                            <p style="margin: 3px 0;"><b>Team Leader:</b> ${leader.name}</p>
                            <p style="margin: 3px 0;"><b>Payment Status:</b> <span style="color: #00ff66; font-weight: bold;">VERIFIED</span></p>
                            <p style="margin: 3px 0;"><b>Registration Status:</b> <span style="color: #00ff66; font-weight: bold;">CONFIRMED</span></p>
                        </div>

                        <div style="background-color: #02040a; padding: 15px; border-radius: 5px; border: 1px solid #00ff66; margin: 20px 0;">
                            <h4 style="color: #ffd700; margin: 0 0 10px 0; font-size: 14px; letter-spacing: 1px;">TEAM MEMBERS</h4>
                            <ol style="margin: 5px 0; padding-left: 20px;">
                                ${membersListHtml}
                            </ol>
                        </div>

                        <div style="background-color: #02040a; padding: 15px; border-radius: 5px; border: 1px solid #00ff66; margin: 20px 0;">
                            <h4 style="color: #ffd700; margin: 0 0 10px 0; font-size: 14px; letter-spacing: 1px;">EVENT DETAILS</h4>
                            <p style="margin: 3px 0;"><b>Event:</b> XploitX 2.0 Beta CTF</p>
                            <p style="margin: 3px 0;"><b>Date & Time:</b> 9th October 2026, 10:00 AM to 10th October 2026, 10:00 AM</p>
                            <p style="margin: 3px 0;"><b>Venue:</b> Prathyusha Engineering College, Tiruvallur</p>
                            <p style="margin: 3px 0;"><b>Organized By:</b> Department of Cybersecurity</p>
                            <p style="margin: 3px 0;"><b>Institution:</b> Prathyusha Engineering College</p>
                        </div>

                        <div style="text-align: center; margin: 24px 0; border: 2px dashed #00ff66; padding: 20px; background: #02040a; border-radius: 8px;">
                            <h3 style="color: #ffd700; margin-top: 0; font-size: 16px; letter-spacing: 1px;">YOUR OFFICIAL EVENT ENTRY PASS</h3>
                            <p style="color: #8b9bb4; font-size: 13px; margin-bottom: 14px;">Present this QR code at the venue check-in desk</p>
                            <div style="display: inline-block; background-color: #ffffff; padding: 8px; border: 2px solid #00ff66; border-radius: 8px; line-height: 0;">
                                <img src="${publicQrUrl}" width="200" height="200" style="width: 200px; height: 200px; display: block; margin: 0 auto; border: 0; outline: none;" alt="Entry QR Code - ${teamId}" />
                            </div>
                            <p style="color: #00ff66; font-weight: bold; font-size: 18px; margin: 12px 0 4px 0; letter-spacing: 1px;">${teamId}</p>
                            <p style="color: #8b9bb4; font-size: 12px; margin: 0 0 10px 0;">(High-resolution pass also attached: <b style="color: #ffffff;">${teamId}_Pass.png</b>)</p>
                            <div>
                                <a href="${publicQrUrl}" target="_blank" style="color: #00ff66; font-size: 12px; text-decoration: underline; font-weight: bold;">Click here to view / download pass QR</a>
                            </div>
                        </div>

                        <div style="background: rgba(0, 255, 102, 0.1); border: 1px solid #00ff66; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
                            <h4 style="color: #00ff66; margin: 0 0 8px 0; font-size: 15px;">📄 ON-DUTY (OD) LETTER ATTACHED (PDF FORMAT)</h4>
                            <p style="color: #d1d5db; font-size: 13px; margin: 0;">Your official <b>On-Duty (OD) Permission Letter PDF</b> is attached to this email (<b>${teamId}_OD_Letter.pdf</b>).</p>
                        </div>

                        <p>Your payment has been successfully verified, and your team is officially confirmed to participate in XploitX 2.0 Beta CTF.</p>

                        <p style="color: #d1d5db; font-size: 14px;"><a href="${whatsappLink}" style="color: #00ff66; font-weight: bold; text-decoration: underline;">Click Here</a> to join the official participant WhatsApp group.</p>

                        <p>Please keep this email for your future reference and ensure that all team members are informed about the event details.</p>

                        <p>Thank you for participating in XploitX 2.0 Beta CTF.</p>

                        <p>We look forward to welcoming your team and wish you the very best for the competition!</p>

                        <p style="color: #8b9bb4; font-size: 13px; margin-top: 20px;">Regards,<br><b style="color: #ffffff;">Team XploitX</b><br>Prathyusha Engineering College<br>Department of Cyber Security</p>
                    </div>
                    ${getEmailFooterHtml(true)}
                </div>
            `;

            const hasEmailProvider = !!(process.env.BREVO_API_KEY || process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY || (process.env.EMAIL_USER && !process.env.EMAIL_USER.includes('your-email')));
            if (hasEmailProvider) {
                for (const emailAddr of recipientEmails) {
                    await sendEmail({ to: emailAddr, subject: 'XploitX 2.0 Beta CTF - Payment Verified & Registration Confirmed', text: textContent, html: htmlContent, attachments });
                }
            }
        }
        logActivity('STATUS MODIFIED', `Team [${teamId}] ("${teamName}") status changed from "${prevStatus}" ➔ "READY (CONFIRMED)" by Operative "${operative}"`);
        res.json({ success: true, message: 'Registration confirmed and OD Letter PDF sent' });
    } catch (e) {
        console.error("Verify Payment Error:", e);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/admin/od_letter/:teamId', verifyAdmin, async (req, res) => {
    try {
        const data = await getTeamDataWithMembers(req.params.teamId);
        if (!data) return res.status(404).json({ error: 'Team not found' });

        const pdfBuffer = await generateODPdfInternal(data.team);
        if (!pdfBuffer) return res.status(500).json({ error: 'Failed to generate OD PDF' });

        logActivity('DOWNLOAD OD PDF', `OD Letter PDF downloaded for Team ID: ${req.params.teamId} by ${req.user ? req.user.username : 'Admin'}`);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${req.params.teamId}_OD_Letter.pdf"`);
        res.send(pdfBuffer);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/admin/reject_payment', verifyAdmin, async (req, res) => {
    const { teamId } = req.body;
    const operative = req.user ? req.user.username : 'Admin';
    try {
        const existing = await getTeamDataWithMembers(teamId);
        const prevStatus = existing && existing.team ? (existing.team.payment_verified === 1 ? 'READY (CONFIRMED)' : (existing.team.payment_verified === -1 ? 'WRONG DETAILS (REJECTED)' : 'STANDBY (REVIEW)')) : 'STANDBY';
        const teamName = existing && existing.team ? existing.team.name : 'Unknown';

        await updatePaymentStatus(teamId, -1);
        logActivity('STATUS MODIFIED', `Team [${teamId}] ("${teamName}") status changed from "${prevStatus}" ➔ "WRONG DETAILS (REJECTED)" by Operative "${operative}"`);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/resend_confirmation', verifyAdmin, async (req, res) => {
    const { teamId, memberName, email, event } = req.body;
    try {
        const memberObj = { name: memberName, email: email };
        await sendRegistrationVerificationEmail(memberObj, teamId || event);
        logActivity('RESEND CONFIRMATION', `Verification email resent to ${email} (Team ID: ${teamId}) by ${req.user ? req.user.username : 'Admin'}`);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/admin/restore_payment', verifyAdmin, async (req, res) => {
    const { teamId } = req.body;
    const operative = req.user ? req.user.username : 'Admin';
    try {
        const existing = await getTeamDataWithMembers(teamId);
        const prevStatus = existing && existing.team ? (existing.team.payment_verified === 1 ? 'READY (CONFIRMED)' : (existing.team.payment_verified === -1 ? 'WRONG DETAILS (REJECTED)' : 'STANDBY (REVIEW)')) : 'WRONG DETAILS';
        const teamName = existing && existing.team ? existing.team.name : 'Unknown';

        await updatePaymentStatus(teamId, 0);
        logActivity('STATUS MODIFIED', `Team [${teamId}] ("${teamName}") status changed from "${prevStatus}" ➔ "STANDBY (REVIEW)" by Operative "${operative}"`);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

async function generateODPdfInternal(teamObj) {
    return new Promise(async (resolve, reject) => {
        try {
            const PDFDocument = require('pdfkit');

            const doc = new PDFDocument({ size: 'A4', margin: 35 });
            let buffers = [];
            doc.on('data', chunk => buffers.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', err => reject(err));

            let members = [];
            if (isDbMongo()) {
                members = await Member.find({ team_id: teamObj.team_id }).lean();
            } else if (db) {
                members = await db.all('SELECT * FROM members WHERE team_db_id = ?', [teamObj.id]);
            }

            if (!teamObj || !members || members.length === 0) {
                doc.end();
                return;
            }

            const publicDir = path.join(__dirname, '../public');
            const pecLogoPath = path.join(publicDir, 'PEC Logo.png');
            const sealImgPath = path.join(publicDir, 'Seal.jpeg');

            // --- HEADER ---
            let headerY = 32;
            if (fs.existsSync(pecLogoPath)) {
                doc.image(pecLogoPath, 42, headerY - 5, { width: 62, height: 62 });
            }

            doc.font('Times-Bold').fontSize(16).fillColor('#000000')
                .text('PRATHYUSHA ENGINEERING COLLEGE', 105, headerY, { width: 455, align: 'center' });

            doc.font('Times-Bold').fontSize(11)
                .text('AN AUTONOMOUS INSTITUTION', 105, headerY + 20, { width: 455, align: 'center' });

            doc.font('Times-Roman').fontSize(8.5)
                .text('Approved by AICTE | Affiliated to Anna University', 105, headerY + 34, { width: 455, align: 'center' });
            doc.text("Accredited by NAAC with 'A' Grade", 105, headerY + 45, { width: 455, align: 'center' });
            doc.text('Tiruvallur – 602 025, Tamil Nadu, India.', 105, headerY + 56, { width: 455, align: 'center' });

            doc.moveTo(35, 102).lineTo(560, 102).lineWidth(0.8).strokeColor('#000000').stroke();

            doc.font('Times-Roman').fontSize(9.5).text('Date: __________________', 390, 109, { width: 170, align: 'right' });

            // --- TITLE & SUBTITLE ---
            let currentY = 126;
            doc.font('Times-Bold').fontSize(12).text('ON-DUTY (OD) LETTER', 35, currentY, { align: 'center', underline: true });
            currentY += 20;
            doc.font('Times-Bold').fontSize(10).text('TO WHOMSOEVER IT MAY CONCERN', 35, currentY, { align: 'center' });

            // --- BODY PARAGRAPHS WITH GAP IN BETWEEN ---
            currentY += 24;
            doc.font('Times-Roman').fontSize(9.5).fillColor('#000000');

            doc.text('This is to certify that the following students are permitted to participate in ', 35, currentY, { continued: true });
            doc.font('Times-Bold').text('“ XploitX 2.0 Beta CTF ”', { continued: true });
            doc.font('Times-Roman').text(', organized by the Department of Cybersecurity, Prathyusha Engineering College, Tiruvallur.');
            currentY += 26;

            doc.font('Times-Roman').text('The event is scheduled to be conducted from ', 35, currentY, { continued: true });
            doc.font('Times-Bold').text('9th October 2026, 10:00 AM to 10th October 2026, 10:00 AM', { continued: true });
            doc.font('Times-Roman').text(' at ', { continued: true });
            doc.font('Times-Bold').text('Prathyusha Engineering College, Tiruvallur.');
            currentY += 26;

            const numWords = ['one', 'two', 'three', 'four', 'five', 'six'];
            const countWord = numWords[members.length - 1] || `${members.length}`;

            doc.font('Times-Roman').text(`The following ${countWord}-member team, including the Team Leader, may be granted On-Duty (OD) permission for the duration of the event to enable them to participate in the `, 35, currentY, { continued: true });
            doc.font('Times-Bold').text('XploitX 2.0 Beta CTF.');
            currentY += 30;

            // --- TEAM DETAILS ---
            doc.font('Times-Bold').fontSize(10).text('TEAM DETAILS', 35, currentY, { align: 'center' });
            currentY += 16;

            doc.font('Times-Bold').fontSize(9.5).text(`Team ID: ${teamObj.team_id || teamObj.id}`, 35, currentY);
            currentY += 16;

            // --- TABLE DRAWING ---
            const colWidths = [30, 70, 115, 75, 115, 65, 55];
            const headers = ['S. No.', 'Role', 'Name of the Participant', 'Register /\nID No.', 'College /\nInstitution', 'Department', 'Year'];
            const startX = 35;
            const headerHeight = 24;
            const rowHeight = 22;

            doc.lineWidth(0.8).strokeColor('#000000');
            doc.rect(startX, currentY, 525, headerHeight).stroke();

            let curX = startX;
            doc.font('Times-Bold').fontSize(8);

            headers.forEach((h, idx) => {
                const w = colWidths[idx];
                doc.text(h, curX + 2, currentY + (h.includes('\n') ? 3 : 7), { width: w - 4, align: 'center' });
                curX += w;
                if (idx < headers.length - 1) {
                    doc.moveTo(curX, currentY).lineTo(curX, currentY + headerHeight).stroke();
                }
            });

            currentY += headerHeight;

            doc.font('Times-Roman').fontSize(7.5);

            members.forEach((m, idx) => {
                doc.rect(startX, currentY, 525, rowHeight).stroke();
                let xPos = startX;

                // Register No, Department, and Year are left blank per user request
                const rowData = [
                    (idx + 1).toString(),
                    idx === 0 ? 'Team Leader' : 'Team Member',
                    m.name || '-',
                    '',
                    m.college || members[0].college || 'Prathyusha Engineering College',
                    '',
                    ''
                ];

                rowData.forEach((val, cIdx) => {
                    const w = colWidths[cIdx];
                    const align = cIdx === 2 ? 'left' : 'center';
                    const padLeft = cIdx === 2 ? 6 : 2;
                    if (val) {
                        doc.text(val, xPos + padLeft, currentY + 5, { width: w - (padLeft * 2), align: align, lineGap: 0 });
                    }
                    xPos += w;
                    if (cIdx < rowData.length - 1) {
                        doc.moveTo(xPos, currentY).lineTo(xPos, currentY + rowHeight).stroke();
                    }
                });

                currentY += rowHeight;
            });

            currentY += 22;

            // --- EVENT DETAILS SECTION ---
            doc.font('Times-Bold').fontSize(10).text('EVENT DETAILS', 35, currentY, { align: 'center' });
            currentY += 18;

            const evtDetails = [
                { label: 'Event Name', val: 'XploitX 2.0 Beta CTF' },
                { label: 'Organized By', val: 'Department of Cybersecurity, Prathyusha Engineering College' },
                { label: 'Date & Time', val: '9th October 2026, 10:00 AM to 10th October 2026, 10:00 AM' },
                { label: 'Venue', val: 'Prathyusha Engineering College, Tiruvallur' },
                { label: 'Purpose', val: 'Participation in XploitX 2.0 Beta CTF' }
            ];

            const labelX = 65;
            const colonX = 160;
            const valX = 170;

            evtDetails.forEach(item => {
                doc.font('Times-Bold').fontSize(9).text(item.label, labelX, currentY, { width: 90 });
                doc.font('Times-Bold').fontSize(9).text(':', colonX, currentY);
                doc.font('Times-Bold').fontSize(9).text(item.val, valX, currentY, { width: 350 });
                currentY += 15;
            });

            currentY += 16;

            // --- CLOSING REMARK ---
            doc.font('Times-Roman').fontSize(9.5).text('This letter is issued for the purpose of granting On-Duty permission to the above-mentioned participants for attending and participating in the ', 35, currentY, { continued: true });
            doc.font('Times-Bold').text('XploitX 2.0 Beta CTF.');

            // --- SIGNATURE FOOTER (NO SEAL IMAGE) ---
            const sigY = 715;

            doc.moveTo(55, sigY).lineTo(165, sigY).lineWidth(0.8).strokeColor('#000000').stroke();
            doc.moveTo(230, sigY).lineTo(340, sigY).stroke();
            doc.moveTo(405, sigY).lineTo(515, sigY).stroke();

            doc.font('Times-Bold').fontSize(8.5);
            doc.text('Signature of Student', 55, sigY + 10, { width: 110, align: 'center' });
            doc.text('Signature of Mentor', 230, sigY + 10, { width: 110, align: 'center' });
            doc.text('Signature of HOD', 405, sigY + 10, { width: 110, align: 'center' });

            doc.moveTo(35, 765).lineTo(560, 765).lineWidth(0.8).strokeColor('#000000').stroke();

            doc.end();

        } catch (err) {
            reject(err);
        }
    });
}

// Admin Delete Team
app.post('/api/admin/delete_team', verifyAdmin, async (req, res) => {
    const { teamId } = req.body;
    const operative = req.user ? req.user.username : 'Admin';
    try {
        const existing = await getTeamDataWithMembers(teamId);
        const teamName = existing && existing.team ? existing.team.name : 'Unknown';
        const leader = existing && existing.members ? (existing.members.find(m => m.role === 'LEADER') || existing.members[0]) : null;
        const leaderName = leader && leader.name ? leader.name : 'Unknown';
        const memCount = existing && existing.members ? existing.members.length : 0;
        await deleteTeamRecord(teamId);
        await logActivity('DATA DELETED', `Deleted record for Team ID: ${teamId} (Leader: ${leaderName}) by ${operative}`);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- ATTENDANCE SYSTEM AUTH & OPERATIONAL ROUTES ---

// Attendance Login Input Schema
const attendanceLoginSchema = z.object({
    username: z.string().min(1, 'Username is required').max(50).trim(),
    password: z.string().min(1, 'Security key is required').max(100).trim()
});

// Dedicated Attendance Login Route
app.post('/api/attendance/login', attendanceLoginLimiter, (req, res) => {
    try {
        const validation = attendanceLoginSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: validation.error.issues[0].message });
        }
        const { username, password } = validation.data;
        const cleanUsername = username.toLowerCase().trim();
        const cleanPassword = password.trim();

        // Authorized attendance accounts
        const adminAccounts = {
            "administrator": process.env.ADMIN_PASS_ADMINISTRATOR || "Beta@Admln#2.0!",
            "admin": process.env.ADMIN_PASS_ADMINISTRATOR || "Beta@Admln#2.0!",
            "jesin milesh": process.env.ADMIN_PASS_JESIN || "Jesin@Beta2026",
            "jesin": process.env.ADMIN_PASS_JESIN || "Jesin@Beta2026",
            "ashish": process.env.ADMIN_PASS_ASHISH || "Ashish@Beta2026",
            "attendance": process.env.ATTENDANCE_SECURITY_KEY || process.env.ADMIN_PASS_ADMINISTRATOR || "Beta@Admln#2.0!"
        };

        const canonicalMap = {
            "administrator": "Administrator",
            "admin": "Administrator",
            "jesin milesh": "Jesin Milesh",
            "jesin": "Jesin Milesh",
            "ashish": "Ashish",
            "attendance": "Attendance Officer"
        };

        // Support operational security key from environment if specified
        const operationalKey = process.env.ATTENDANCE_SECURITY_KEY || process.env.ATTENDANCE_KEY;
        if (operationalKey && cleanUsername === 'attendance') {
            adminAccounts['attendance'] = operationalKey;
            canonicalMap['attendance'] = 'Attendance Officer';
        }

        let isValid = false;
        const expectedPass = adminAccounts[cleanUsername];

        if (expectedPass) {
            if (expectedPass.startsWith('$2b$') || expectedPass.startsWith('$2a$')) {
                isValid = bcrypt.compareSync(cleanPassword, expectedPass);
            } else {
                isValid = (cleanPassword === expectedPass);
            }
        }

        if (isValid) {
            const canonicalUser = canonicalMap[cleanUsername] || username;
            logActivity('ATTENDANCE LOGIN', `Operative "${canonicalUser}" authenticated into Attendance Terminal`);
            const token = jwt.sign(
                { username: canonicalUser, role: 'admin', scope: 'attendance' },
                JWT_SECRET,
                { expiresIn: '2h', algorithm: 'HS256' }
            );

            // Do not store persistent cookie per requirements; ensure any previous cookie is cleared
            res.clearCookie('attendance_token', { path: '/' });

            return res.json({
                success: true,
                message: 'Authentication verified',
                user: canonicalUser,
                token: token
            });
        } else {
            logActivity('ATTENDANCE LOGIN FAILED', `Failed login attempt for operative "${username}"`);
            return res.status(401).json({
                error: 'Invalid username or security key. Please verify your credentials and try again.'
            });
        }
    } catch (err) {
        console.error('[Attendance Login Error]:', err);
        return res.status(500).json({ error: 'Unable to authenticate right now. Please try again.' });
    }
});

// Session Verification Endpoint for Attendance Terminal
app.get('/api/attendance/verify-session', (req, res) => {
    const session = isAttendanceAuthenticated(req);
    if (!session) {
        return res.status(401).json({ authenticated: false, error: 'Unauthenticated' });
    }
    return res.json({
        authenticated: true,
        user: session.username
    });
});

// Dedicated Logout Endpoint for Attendance Terminal
app.post('/api/attendance/logout', async (req, res) => {
    let user = 'Operative';
    const session = isAttendanceAuthenticated(req);
    if (session && session.username) {
        user = session.username;
    } else if (req.body && req.body.username) {
        user = req.body.username;
    }
    await logActivity('ATTENDANCE LOGOUT', `Operative "${user}" logged out of Attendance Terminal`);
    res.clearCookie('attendance_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
    });
    return res.json({ success: true, message: 'Session terminated' });
});

// Protected Attendance QR Scan Info
app.get('/api/attendance/scan_info/:teamId', verifyAttendanceAuth, async (req, res) => {
    const { teamId } = req.params;
    try {
        const data = await getTeamDataWithMembers(teamId);
        if (!data) return res.status(404).json({ error: 'Team not found' });

        const team = data.team;
        const members = data.members;
        const leader = members.find(m => m.role === 'LEADER') || members[0] || {};

        res.json({
            team: {
                id: team.team_id,
                name: team.name,
                leaderName: leader.name || 'Unknown',
                college: leader.college || 'Unknown'
            },
            members: members.map(m => ({
                id: isDbMongo() ? m._id.toString() : m.id,
                name: m.name,
                college: m.college,
                status: m.attendance_status || 'ABSENT'
            }))
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Protected Attendance Submission
app.post('/api/attendance/mark_members', verifyAttendanceAuth, async (req, res) => {
    const { teamId, memberStatuses } = req.body;
    try {
        const data = await getTeamDataWithMembers(teamId);
        if (!data) return res.status(404).json({ error: 'Team not found' });

        const now = new Date();
        let anyPresent = false;

        for (const item of memberStatuses) {
            const isPresent = item.status === 'PRESENT';
            if (isPresent) anyPresent = true;

            // 1. Update MongoDB Atlas Member Collection
            if (isDbMongo()) {
                let updated = false;
                // Attempt 1: Match by ObjectId (_id)
                if (item.id && typeof item.id === 'string' && item.id.length === 24 && /^[0-9a-fA-F]{24}$/.test(item.id)) {
                    const resMongo = await Member.updateOne(
                        { _id: item.id },
                        {
                            $set: {
                                attendance_status: isPresent ? 'PRESENT' : 'ABSENT',
                                ...(isPresent ? { entry_time: now } : {})
                            }
                        }
                    );
                    if (resMongo.matchedCount > 0) updated = true;
                }

                // Attempt 2: Fallback match by team_id and member name
                if (!updated && (item.name || item.id)) {
                    await Member.updateOne(
                        { team_id: teamId, name: item.name || item.id },
                        {
                            $set: {
                                attendance_status: isPresent ? 'PRESENT' : 'ABSENT',
                                ...(isPresent ? { entry_time: now } : {})
                            }
                        }
                    );
                }
            }

            // 2. Update SQLite Database Members Table
            if (db) {
                try {
                    if (item.id && !isNaN(parseInt(item.id))) {
                        await db.run(
                            `UPDATE members SET attendance_status = ?, entry_time = ? WHERE id = ?`,
                            [isPresent ? 'PRESENT' : 'ABSENT', isPresent ? new Date().toISOString() : null, item.id]
                        );
                    } else {
                        await db.run(
                            `UPDATE members SET attendance_status = ?, entry_time = ? WHERE team_db_id = (SELECT id FROM teams WHERE team_id = ?) AND name = ?`,
                            [isPresent ? 'PRESENT' : 'ABSENT', isPresent ? new Date().toISOString() : null, teamId, item.name || item.id]
                        );
                    }
                } catch (sqliteErr) {
                    console.error('[SQLite Attendance Sync Warning]:', sqliteErr.message);
                }
            }
        }

        // 3. Update Overall Team Attendance Record in both MongoDB and SQLite
        const overallStatus = anyPresent ? 'PRESENT' : 'ABSENT';
        if (isDbMongo()) {
            await Attendance.updateOne(
                { team_id: teamId },
                {
                    $set: {
                        status: overallStatus,
                        ...(anyPresent ? { entry_time: now } : {})
                    }
                },
                { upsert: true }
            );
        }
        if (db) {
            try {
                await db.run(
                    `UPDATE attendance SET status = ?, entry_time = ? WHERE team_id = ?`,
                    [overallStatus, anyPresent ? new Date().toISOString() : null, teamId]
                );
            } catch (sqliteErr) { }
        }

        const prevMemberMap = {};
        if (data && data.members && Array.isArray(data.members)) {
            data.members.forEach(m => {
                const key = String(m.id || m._id || m.name);
                prevMemberMap[key] = m.attendance_status || 'ABSENT';
                if (m.name) prevMemberMap[m.name] = m.attendance_status || 'ABSENT';
            });
        }

        const memberDiffs = memberStatuses.map(m => {
            const prev = prevMemberMap[String(m.id)] || prevMemberMap[m.name] || 'ABSENT';
            const curr = m.status;
            if (prev !== curr) {
                return `${m.name || m.id}: "${prev}" ➔ "${curr}"`;
            }
            return `${m.name || m.id}: "${curr}"`;
        }).join(', ');

        const operative = req.user ? req.user.username : 'Attendance Officer';
        await logActivity('ATTENDANCE MODIFIED', `Team [${teamId}] ("${data.team.name}") attendance updated by Operative "${operative}": [${memberDiffs}] (Overall Status: ${overallStatus})`);

        res.json({ success: true, message: 'Attendance status successfully updated across database' });
    } catch (e) {
        console.error('[Mark Members Error]:', e);
        res.status(500).json({ error: 'Failed to update attendance records' });
    }
});

// Protected Attendance Database View
app.get('/api/attendance/all', verifyAttendanceAuth, async (req, res) => {
    try {
        if (isDbMongo()) {
            const members = await Member.find().lean();
            const rows = members.map(m => ({
                id: m._id.toString(),
                team_id: m.team_id,
                name: m.name,
                role: m.role,
                college: m.college,
                status: m.attendance_status || 'ABSENT',
                entry_time: m.entry_time
            }));
            return res.json(rows);
        }
        if (db) {
            const rows = await db.all(`
                SELECT 
                    m.id, 
                    t.team_id, 
                    m.name, 
                    m.role, 
                    m.college, 
                    m.attendance_status as status, 
                    m.entry_time 
                FROM members m 
                JOIN teams t ON m.team_db_id = t.id 
                ORDER BY t.team_id ASC
            `);
            return res.json(rows);
        }
        res.json([]);
    } catch (e) { res.status(500).json({ error: 'Failed to fetch attendance log' }); }
});

app.use((err, req, res, next) => {
    if (err) {
        console.error('[Global Error Middleware Caught]:', err);
        const status = err.status || err.statusCode || 400;
        const msg = process.env.NODE_ENV === 'production'
            ? 'An unexpected error occurred processing your request.'
            : err.message;
        return res.status(status).json({ error: msg });
    }
    next();
});

module.exports = app;
module.exports.sendEmail = sendEmail;
module.exports.getEmailHeaderHtml = getEmailHeaderHtml;
module.exports.getEmailFooterHtml = getEmailFooterHtml;
module.exports.generateQrWithLogo = generateQrWithLogo;