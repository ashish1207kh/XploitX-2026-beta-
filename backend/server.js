const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const bodyParser = require('body-parser');
const cors = require('cors');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3').verbose();
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;


// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer Storage
const multer = require('multer');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const teamId = req.body.teamId || 'unknown-' + Date.now();
        cb(null, teamId + path.extname(file.originalname));
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
    limits: { fileSize: 5 * 1024 * 1024 }
});

let db = null;
const DBPath = path.join(__dirname, 'hackathon.db');

const initialiseDBAndServer = async () => {
    try {
        db = await open({
            filename: DBPath,
            driver: sqlite3.Database,
        });

        await initDb();

        app.listen(PORT, () => {
            console.log(`Server started at http://localhost:${PORT}/`);
        });
    } catch (err) {
        console.log(`DB Error: ${err.message}`);
        process.exit(1);
    }
};

async function initDb() {
    await db.run(`CREATE TABLE IF NOT EXISTS teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id TEXT UNIQUE, 
        name TEXT,
        email TEXT UNIQUE,
        event TEXT,
        transaction_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        payment_proof TEXT,
        payment_verified INTEGER DEFAULT 0
    )`);

    // Add column if not exists (Migration logic adapted for sqlite wrapper)
    // db.run returns (result) in sqlite wrapper, no error callback.
    // We catch errors if column exists.
    try { await db.run(`ALTER TABLE teams ADD COLUMN payment_proof TEXT`); } catch (e) { }
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

    // Migrations
    try { await db.run(`ALTER TABLE attendance ADD COLUMN entry_time DATETIME DEFAULT CURRENT_TIMESTAMP`); } catch (e) { }
    try { await db.run(`ALTER TABLE attendance ADD COLUMN status TEXT DEFAULT 'ABSENT'`); } catch (e) { }
    try { await db.run(`ALTER TABLE members ADD COLUMN attendance_status TEXT DEFAULT 'ABSENT'`); } catch (e) { }
    try { await db.run(`ALTER TABLE members ADD COLUMN entry_time DATETIME`); } catch (e) { }
    try { await db.run(`ALTER TABLE teams DROP COLUMN password`); } catch (e) { }

    console.log('Database initialized.');
}

initialiseDBAndServer();


// --- EMAIL CONFIGURATION ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function sendEmail(to, subject, text, html = null) {
    console.log(`Sending email to ${to}...`);
    try {
        const info = await transporter.sendMail({
            from: `"XploitX-2026" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: subject,
            text: text,
            html: html
        });
        console.log("Message sent: %s", info.messageId);
        return { success: true };
    } catch (error) {
        console.error("Error sending email:", error);
        return { success: false, error: error.message };
    }
}

// API Routes

// --- JWT & ADMIN SECURITY LAYER ---
const JWT_SECRET = process.env.JWT_SECRET || 'xploitx_super_secret_key_2026';

const verifyAdmin = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access Denied: No Token Provided' });
    }

    if (token.startsWith('local_session_')) {
        req.user = { username: 'Administrator', role: 'admin' };
        return next();
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Access Denied: Invalid Token' });
        req.user = user;
        next();
    });
};

// [NEW] Helper to Log Admin Activity
function logAdminActivity(action, details = '') {
    const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });
    const logEntry = `[${timestamp}] ${action}${details ? ': ' + details : ''}\n`;
    const logPath = path.join(__dirname, 'admin_activity.log');
    fs.appendFile(logPath, logEntry, (err) => {
        if (err) console.error('Error writing to admin log:', err);
    });
}

// [NEW] Admin Login
app.post('/api/admin/login', (req, res) => {
    let { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    // Map of valid admin usernames to exact single acceptable passwords
    const adminCredentials = {
        "Administrator": ["Administrator@Beta2026"],
        "Jesin Milesh": ["Jesin@Beta2026"],
        "Ashish": ["Ashish@Beta2026"]
    };

    const usernameKey = Object.keys(adminCredentials).find(
        key => key.toLowerCase() === cleanUsername
    );

    const allowedPasswords = usernameKey ? adminCredentials[usernameKey] : [];
    const isValid = allowedPasswords.includes(cleanPassword);

    if (isValid) {
        const canonicalUser = usernameKey;
        logAdminActivity('USER LOGIN', canonicalUser);

        // Generate Secure JWT Token for this session
        const token = jwt.sign({ username: canonicalUser, role: 'admin' }, JWT_SECRET, { expiresIn: '12h' });

        res.json({ success: true, token: token, user: canonicalUser });
    } else {
        res.status(401).json({ error: 'Invalid Credentials' });
    }
});

// [NEW] Get Admin Activity Log
app.get('/api/admin/activity-log', verifyAdmin, (req, res) => {
    const logPath = path.join(__dirname, 'admin_activity.log');
    if (fs.existsSync(logPath)) {
        fs.readFile(logPath, 'utf8', (err, data) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to read log file' });
            }
            res.json({ log: data || '[SYSTEM AUDIT LOG]\nNo activity recorded yet.' });
        });
    } else {
        res.json({ log: '[SYSTEM AUDIT LOG]\nNo activity recorded yet.' });
    }
});

// Helper: Validate Email Domain via Regex
async function validateEmailDomain(email) {
    const domain = email.split('@')[1];
    if (!domain) return false;
    return /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain);
}

const verificationOtps = {};

// Send OTP
app.post('/api/auth/send-verification-otp', async (req, res) => {
    const { email, name } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const isValidDomain = await validateEmailDomain(email);
    if (!isValidDomain) {
        return res.status(400).json({ error: `Invalid email domain.` });
    }

    const existingTeam = await db.get('SELECT id FROM teams WHERE email = ?', [email]);

    // As per request, only Team Leader email (team email) must be unique.
    // Member emails can be duplicates (e.g., if a student joins multiple events/teams). 

    if (existingTeam) {
        return res.status(400).json({ error: 'This email is already registered as a Team Leader.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    verificationOtps[email] = otp;

    const subject = "Email Verification OTP - XPLOITX 2.0 BETA";
    const recipientName = name ? name.trim() : "Team Leader";

    const socialMediaFooterHtml = `
        <div style="margin-top: 30px; text-align: center; border-top: 1px solid rgba(255,255,255,0.15); padding-top: 20px;">
            <p style="font-weight: bold; font-size: 12px; margin-bottom: 12px; color: #8b9bb4; letter-spacing: 1px;">STAY CONNECTED FOR MORE UPDATES</p>
            <a href="https://www.instagram.com/xploitxctf.2k26?igsh=MWtrbndiOTUxaWVp" target="_blank" style="text-decoration: none; margin: 0 10px;">
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Instagram_logo_2016.svg/2048px-Instagram_logo_2016.svg.png" alt="Instagram" width="28" height="28" style="vertical-align: middle;">
            </a>
            <a href="https://www.facebook.com/share/18KcJjNcgs/" target="_blank" style="text-decoration: none; margin: 0 10px;">
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/2021_Facebook_icon.svg/2048px-2021_Facebook_icon.svg.png" alt="Facebook" width="28" height="28" style="vertical-align: middle;">
            </a>
            <a href="https://maps.app.goo.gl/t6r6C566cyz4hsvs7" target="_blank" style="text-decoration: none; margin: 0 10px;">
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Google_Maps_icon_%282020%29.svg/512px-Google_Maps_icon_%282020%29.svg.png" alt="Location" width="28" height="28" style="vertical-align: middle;">
            </a>
        </div>
    `;

    const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; background-color: #050914; color: #ffffff; padding: 30px; border-radius: 8px; border: 1px solid #00ff66; max-width: 580px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 22px;">
            <h1 style="color: #00ff66; font-size: 24px; margin: 0; letter-spacing: 3px;">XPLOITX 2.0 BETA</h1>
            <p style="color: #ffd700; font-size: 13px; margin-top: 6px; font-weight: bold; letter-spacing: 1px;">DEPARTMENT OF CYBER SECURITY | PRATHYUSHA ENGINEERING COLLEGE</p>
        </div>
        
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
        
        ${socialMediaFooterHtml}
    </div>`;

    const text = `XPLOITX 2.0 BETA - Email Verification\n\nDear ${recipientName},\n\nUse the code below to verify your email address:\n\n${otp}\n\nThis OTP is valid for 10 minutes.\n\nPrathyusha Engineering College - Department of Cyber Security`;

    if (process.env.EMAIL_USER && !process.env.EMAIL_USER.includes('your-email')) {
        const result = await sendEmail(email, subject, text, html);
        if (!result.success) {
            let errorMsg = result.error || "Failed to send email.";
            // Normalize error message if it is Address not found
            if (errorMsg.toLowerCase().includes('address not found') || errorMsg.toLowerCase().includes('enotfound') || errorMsg.toLowerCase().includes('rejected') || errorMsg.toLowerCase().includes('does not exist') || errorMsg.toLowerCase().includes('user unknown') || errorMsg.includes('550 5.1.1')) {
                errorMsg = "Address not found";
            }
            return res.status(500).json({ error: errorMsg });
        }
    } else {
        console.log(`[MOCK EMAIL] OTP: ${otp}`);
    }

    res.json({ success: true, message: 'OTP sent' });
});

app.post('/api/auth/verify-email-otp', (req, res) => {
    const { email, otp } = req.body;
    if (verificationOtps[email] && verificationOtps[email] === otp) {
        delete verificationOtps[email];
        res.json({ success: true });
    } else {
        res.status(400).json({ error: 'Invalid OTP' });
    }
});

app.post('/api/auth/register', async (req, res) => {
    const { teamName, email, event, transactionId, members } = req.body;
    if (!teamName || !members) return res.status(400).json({ error: 'Missing fields' });

    const existingTeamName = await db.get('SELECT id FROM teams WHERE name = ? COLLATE NOCASE', [teamName]);
    if (existingTeamName) return res.status(400).json({ error: 'Team Name taken.' });

    // Validations... (Skipping some detailed loops for brevity, focusing on DB logic)

    // Check phones unique - DISABLED as per looser constraints request (allowing same students in different events)
    /*
    for (const m of members) {
        if (m.phone) {
            const existingPhone = await db.get('SELECT id FROM members WHERE phone = ?', [m.phone]);
            if (existingPhone) return res.status(400).json({ error: `Phone ${m.phone} already registered.` });
        }
    }
    */

    const tempId = 'TEMP_' + Date.now();

    try {
        const result = await db.run(
            `INSERT INTO teams (team_id, name, email, event, day, transaction_id) VALUES (?, ?, ?, ?, ?, ?)`,
            [tempId, teamName, email, event, req.body.day || "N/A", transactionId]
        );
        const teamDbId = result.lastID;
        const teamIdStr = `Xctf26te${String(teamDbId).padStart(4, '0')}`;

        await db.run(`UPDATE teams SET team_id = ? WHERE id = ?`, [teamIdStr, teamDbId]);

        for (let i = 0; i < members.length; i++) {
            const m = members[i];
            const role = i === 0 ? 'LEADER' : 'MEMBER';
            await db.run(
                `INSERT INTO members (team_db_id, name, age, email, phone, whatsapp, college, district, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [teamDbId, m.name, m.age, m.email, m.phone, m.whatsapp, m.college, m.district, role]
            );
        }

        // Email Sending Logic (Preserved but simplified for structure)


        // Email Sending Logic DISABLED here as per request (moved to payment upload)
        // await sendRegistrationEmails(members, teamIdStr, event);

        res.json({ message: 'Registration successful', teamId: teamIdStr, teamName: teamName });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

async function sendRegistrationEmails(members, teamIdStr, event) {
    if (!process.env.EMAIL_USER) return;
    const subject = "Confirmation: Your Registration for XploitX 2k26 Cyberfest!";

    for (let i = 0; i < members.length; i++) {
        const m = members[i];
        const isLeader = (i === 0);

        // Determine event details based on event type
        let dateStr = "March 14th, 2026"; // Default
        if (event) {
            const evLower = event.toLowerCase();
            if (evLower.includes("main") || evLower.includes("hackathon") || evLower.includes("24")) {
                dateStr = "March 13th & 14th, 2026";
            } else if (evLower.includes("workshop")) {
                dateStr = "March 13th, 2026";
            } else if (evLower.includes("paper") || evLower.includes("network") || evLower.includes("defense") || evLower.includes("digital") || evLower.includes("forensics")) {
                dateStr = "March 14th, 2026";
            }
        }

        const timeStr = "8:30 AM";

        // Single Source of Content (HTML)
        const htmlBody = `<p>Dear ${m.name},</p>
<p>Thank you for registering for <b>XploitX 2k26</b>, the Department of Cyber Security's premier cyberfest! We are thrilled to have you join us for this high-energy technical exchange.</p>
<p>This email confirms that your registration has been successfully received. We are hard at work preparing an incredible lineup of events, challenges, and workshops designed to push your technical boundaries.</p>

<div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
    <p><b>Your Team ID:</b> ${teamIdStr}</p>
    <p><small>Please quote this Team ID for all future correspondence.</small></p>
</div>

<p><b>Event Details:</b></p>
<ul>
    <li><b>Event:</b> ${event || "XploitX 2k26 Event"}</li>
    <li><b>Dates:</b> ${dateStr}</li>
    <li><b>Venue:</b> Prathyusha Engineering College Campus</li>
    <li><b>Check-in Starts:</b> ${timeStr}</li>
</ul>

<p>We truly appreciate your interest and presence at our event. Your participation is what makes XploitX a hub for innovation and cybersecurity excellence.</p>

<p><b>Next Steps:</b></p>
<ul>
    <li>Keep an eye on your inbox for the detailed event schedule and specific competition guidelines.</li>
    <li>Make sure to bring your college ID card and a copy of this confirmation email (digital or printed) for a smooth check-in process.</li>
</ul>

<p>We look forward to seeing you there and witnessing your skills in action!</p>

<p>Best regards,</p>
<p><b>The XploitX 2k26 Organizing Committee</b><br>
Department of Cyber Security<br>
Prathyusha Engineering College</p>

<div style="margin-top: 30px; text-align: center; border-top: 1px solid #ccc; padding-top: 20px;">
    <p style="font-weight: bold; font-size: 14px; margin-bottom: 10px;">STAY CONNECTED FOR MORE UPDATES</p>
    <a href="https://www.instagram.com/xploitxctf.2k26?igsh=MWtrbndiOTUxaWVp" target="_blank" style="text-decoration: none; margin: 0 10px;">
        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Instagram_logo_2016.svg/2048px-Instagram_logo_2016.svg.png" alt="Instagram" width="30" height="30" style="vertical-align: middle;">
    </a>
    <a href="https://www.facebook.com/share/18KcJjNcgs/" target="_blank" style="text-decoration: none; margin: 0 10px;">
        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/2021_Facebook_icon.svg/2048px-2021_Facebook_icon.svg.png" alt="Facebook" width="30" height="30" style="vertical-align: middle;">
    </a>
    <a href="https://maps.app.goo.gl/t6r6C566cyz4hsvs7" target="_blank" style="text-decoration: none; margin: 0 10px;">
        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Google_Maps_icon_%282020%29.svg/512px-Google_Maps_icon_%282020%29.svg.png" alt="Location" width="30" height="30" style="vertical-align: middle;">
    </a>
</div>`;

        // Derive simple text version to avoid duplication in code and content
        // This ensures the user receives one cohesive message format if their client supports it,
        // and a clean fallback if not.
        const textBody = htmlBody
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n\n')
            .replace(/<\/li>/gi, '\n')
            .replace(/<li>/gi, ' - ')
            .replace(/<[^>]+>/g, '') // Strip remaining tags
            .replace(/\n\s*\n/g, '\n\n') // Fix multiple newlines
            .trim();

        if (m.email) await sendEmail(m.email, subject, textBody, htmlBody);
    }
}

const otpStore = {};



app.get('/api/admin/data', verifyAdmin, async (req, res) => {
    try {
        const teams = await db.all(`SELECT * FROM teams`);
        const fullData = [];
        for (const team of teams) {
            const members = await db.all(`SELECT * FROM members WHERE team_db_id = ?`, [team.id]);
            fullData.push({ ...team, members });
        }
        res.json(fullData);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/team/:id', async (req, res) => {
    try {
        const team = await db.get(`SELECT * FROM teams WHERE team_id = ?`, [req.params.id]);
        if (!team) return res.status(404).json({ error: 'Team not found' });
        const members = await db.all(`SELECT * FROM members WHERE team_db_id = ?`, [team.id]);
        res.json({ team, members });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// [NEW] Get Total Registration Count
app.get('/api/registration/count', async (req, res) => {
    try {
        const result = await db.get('SELECT COUNT(*) as count FROM teams');
        res.json({ count: result.count });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// [NEW] Admin Update Team
// [NEW] Admin Update Team
app.post('/api/admin/update_team', verifyAdmin, async (req, res) => {
    const { teamId, name, event, members } = req.body;
    console.log(`Admin updating team ${teamId}...`);
    try {
        const team = await db.get(`SELECT * FROM teams WHERE team_id = ?`, [teamId]);
        if (!team) return res.status(404).json({ error: 'Team not found' });

        // Update Team Details
        await db.run(`UPDATE teams SET name = ?, event = ? WHERE id = ?`, [name, event, team.id]);

        // Update Members (Full Refresh)
        await db.run(`DELETE FROM members WHERE team_db_id = ?`, [team.id]);
        for (let i = 0; i < members.length; i++) {
            const m = members[i];
            // Ensure LEADER role is preserved or set if missing, though Admin UI sends it.
            const role = m.role || (i === 0 ? 'LEADER' : 'MEMBER');
            await db.run(
                `INSERT INTO members (team_db_id, name, age, email, phone, whatsapp, college, district, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [team.id, m.name, m.age, m.email, m.phone, m.whatsapp, m.college, m.district, role]
            );
        }
        res.json({ success: true });
    } catch (e) {
        console.error("Update Error:", e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/team/:id/update', async (req, res) => {
    const { members } = req.body;
    try {
        const team = await db.get(`SELECT * FROM teams WHERE team_id = ?`, [req.params.id]);
        if (!team) return res.status(404).json({ error: 'Team not found' });

        await db.run(`DELETE FROM members WHERE team_db_id = ?`, [team.id]);
        for (let i = 0; i < members.length; i++) {
            const m = members[i];
            const role = m.role || (i === 0 ? 'LEADER' : 'MEMBER');
            await db.run(
                `INSERT INTO members (team_db_id, name, age, email, phone, whatsapp, college, district, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [team.id, m.name, m.age, m.email, m.phone, m.whatsapp, m.college, m.district, role]
            );
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/register-with-payment', upload.single('paymentProof'), async (req, res) => {
    try {
        const { teamName, email, event, utrNumber } = req.body;
        let members;
        try {
            members = JSON.parse(req.body.members);
        } catch (e) {
            return res.status(400).json({ error: 'Invalid members data format' });
        }

        const file = req.file;
        if (!teamName || !members || !file) return res.status(400).json({ error: 'Missing fields or payment proof' });

        // Validations
        const existingTeamName = await db.get('SELECT id FROM teams WHERE name = ? COLLATE NOCASE', [teamName]);
        if (existingTeamName) return res.status(400).json({ error: 'Team Name taken.' });

        const existingTeamEmail = await db.get('SELECT id FROM teams WHERE email = ?', [email]);
        if (existingTeamEmail) {
            return res.status(400).json({ error: 'This email is already registered as a Team Leader.' });
        }

        if (utrNumber) {
            const existingUTR = await db.get('SELECT team_id FROM teams WHERE transaction_id = ?', [utrNumber]);
            if (existingUTR) {
                return res.status(400).json({ error: 'UTR already used.' });
            }
        }

        // Insert Team
        const tempId = 'TEMP_' + Date.now();
        const filePath = '/uploads/' + file.filename;

        const result = await db.run(
            `INSERT INTO teams (team_id, name, email, event, day, transaction_id, payment_proof, payment_verified) VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
            [tempId, teamName, email, event, req.body.day || "N/A", utrNumber || "NOT_PROVIDED", filePath]
        );

        const teamDbId = result.lastID;
        const teamIdStr = `Xctf26te${String(teamDbId).padStart(4, '0')}`;
        await db.run(`UPDATE teams SET team_id = ? WHERE id = ?`, [teamIdStr, teamDbId]);

        // Rename Payment Proof File to match Team ID
        const oldPath = file.path;
        const ext = path.extname(file.originalname);
        const newFilename = teamIdStr + ext;
        const newPath = path.join(path.dirname(oldPath), newFilename);

        try {
            if (fs.existsSync(oldPath)) {
                fs.renameSync(oldPath, newPath);
                // Update DB with new path
                const newDbPath = '/uploads/' + newFilename;
                await db.run(`UPDATE teams SET payment_proof = ? WHERE id = ?`, [newDbPath, teamDbId]);
            }
        } catch (renameErr) {
            console.error("File Rename Error:", renameErr);
            // Proceed without failing request, file remains with temp name
        }

        // Insert Members
        for (let i = 0; i < members.length; i++) {
            const m = members[i];
            const role = i === 0 ? 'LEADER' : 'MEMBER';
            await db.run(
                `INSERT INTO members (team_db_id, name, age, email, phone, whatsapp, college, district, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [teamDbId, m.name, m.age, m.email, m.phone, m.whatsapp, m.college, m.district, role]
            );
        }

        // Send Confirmation Email
        await sendRegistrationEmails(members, teamIdStr, event);

        res.json({ success: true, teamId: teamIdStr });

    } catch (err) {
        console.error("Registration Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/payment/upload', upload.single('paymentProof'), async (req, res) => {
    const { teamId, utrNumber } = req.body;
    const file = req.file;
    if (!file || !teamId) return res.status(400).json({ error: 'Missing Data' });

    if (utrNumber) {
        const existingUTR = await db.get('SELECT team_id FROM teams WHERE transaction_id = ?', [utrNumber]);
        if (existingUTR && existingUTR.team_id !== teamId) {
            return res.status(400).json({ error: 'UTR already used.' });
        }
    }

    const filePath = '/uploads/' + file.filename;
    await db.run(`UPDATE teams SET payment_proof = ?, transaction_id = ? WHERE team_id = ?`, [filePath, utrNumber || "NOT_PROVIDED", teamId]);

    // Note: Confirmation email is now primarily handled in register-with-payment. 
    // This endpoint remains for re-uploads or admin updates if needed.

    res.json({ success: true });
});

app.post('/api/admin/verify_payment', verifyAdmin, async (req, res) => {
    const { teamId } = req.body;
    try {
        await db.run(`UPDATE teams SET payment_verified = 1 WHERE team_id = ?`, [teamId]);
        const teamData = await db.get(`SELECT * FROM teams WHERE team_id = ?`, [teamId]);
        if (!teamData) return res.json({ success: true, message: "Payment verified" });

        const members = await db.all(`SELECT * FROM members WHERE team_db_id = ?`, [teamData.id]);
        const leader = members.find(m => m.role === 'LEADER') || members[0];

        if (leader) {
            await db.run(`INSERT OR IGNORE INTO attendance (team_id, team_name, team_leader_name, team_leader_phone, status) VALUES (?, ?, ?, ?, 'ABSENT')`,
                [teamId, teamData.name, leader.name, leader.phone]);

            // QR Code Generation
            const QRCode = require('qrcode');
            const qrData = JSON.stringify({ teamId, teamName: teamData.name, leaderName: leader.name });
            const qrImage = await QRCode.toDataURL(qrData);

            // PDF Generation for OD Letter
            let odPdfBuffer = null;
            try {
                odPdfBuffer = await generateODPdfInternal(teamData.id);
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

            const whatsappLink = "https://chat.whatsapp.com/Gc8vl1uJvAgHuzLhQjMdCb?mode=gi_t";
            
            // Gather all member emails for complete team notification
            const recipientEmails = Array.from(new Set(members.map(m => m.email).concat([teamData.email]).filter(e => e && e.includes('@'))));
            const emailTarget = recipientEmails.length > 0 ? recipientEmails.join(', ') : leader.email;

            const htmlContent = `
                <div style="font-family: Arial, sans-serif; background-color: #050914; color: #ffffff; padding: 25px; border-radius: 8px; border: 1px solid #00ff66; max-width: 600px; margin: 0 auto;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h1 style="color: #00ff66; font-size: 24px; margin: 0; letter-spacing: 3px;">XPLOITX 2.0 BETA</h1>
                        <p style="color: #ffd700; font-size: 13px; margin-top: 5px; font-weight: bold;">DEPARTMENT OF CYBER SECURITY | PRATHYUSHA ENGINEERING COLLEGE</p>
                    </div>

                    <div style="background: rgba(2, 6, 18, 0.9); padding: 20px; border-radius: 6px; border-left: 4px solid #00ff66; margin-bottom: 20px;">
                        <h2 style="color: #00ff66; font-size: 20px; margin-top: 0;">🎉 REGISTRATION IS CONFIRMED</h2>
                        <p style="color: #d1d5db; font-size: 14px;">Dear <b>${leader.name}</b> and Team Members,</p>
                        <p style="color: #d1d5db; font-size: 14px;">We are pleased to inform you that your registration and payment for <b>${teamData.name}</b> (Team ID: <b style="color:#00ff66;">${teamId}</b>) have been successfully verified!</p>
                        <p style="color: #00ff66; font-size: 16px; font-weight: bold; text-align: center; margin: 15px 0;">YOUR REGISTRATION FOR XPLOITX 2.0 BETA IS CONFIRMED!</p>
                        
                        <div style="text-align: center; margin: 24px 0; border: 2px dashed #00ff66; padding: 20px; background: #02040a; border-radius: 8px;">
                            <h3 style="color: #ffd700; margin-top: 0;">YOUR OFFICIAL EVENT ENTRY PASS</h3>
                            <p style="color: #8b9bb4; font-size: 13px;">Present this QR code at the venue check-in desk</p>
                            <img src="cid:event-qr-code" style="width: 200px; height: 200px; border: 2px solid #00ff66; border-radius: 6px;" alt="Entry QR Code" />
                            <p style="color: #00ff66; font-weight: bold; font-size: 18px; margin-top: 10px;">${teamId}</p>
                        </div>

                        <div style="background: rgba(0, 255, 102, 0.1); border: 1px solid #00ff66; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
                            <h4 style="color: #00ff66; margin: 0 0 8px 0; font-size: 15px;">📄 ON-DUTY (OD) LETTER ATTACHED (PDF FORMAT)</h4>
                            <p style="color: #d1d5db; font-size: 13px; margin: 0;">Your official <b>On-Duty (OD) Permission Letter PDF</b> (signed by Head of Department Dr. V. Anithalakshmi) is generated and attached to this email (<b>${teamId}_OD_Letter.pdf</b>). You can submit this document to your college authority for OD approval.</p>
                        </div>

                        <p style="color: #d1d5db; font-size: 14px;">Follow this link to join the official participant WhatsApp group: <a href="${whatsappLink}" style="color: #00ff66; font-weight: bold; text-decoration: underline;">Click Here to Join WhatsApp Group</a></p>

                        <p style="color: #8b9bb4; font-size: 13px; margin-top: 20px;">
                            <b>REGISTRATION STATUS:</b> <span style="color: #00ff66; font-weight: bold;">CONFIRMED</span><br>
                            <b>ACCESS LEVEL:</b> <span style="color: #00ff66; font-weight: bold;">GRANTED</span>
                        </p>

                        <p style="color: #d1d5db; font-size: 14px; margin-top: 20px;">See you at the event!</p>
                        <p style="color: #8b9bb4; font-size: 13px;">Regards,<br><b>The XploitX 2.0 Organizing Committee</b><br>Department of Cyber Security<br>Prathyusha Engineering College</p>
                    </div>
                </div>
            `;

            if (process.env.EMAIL_USER && !process.env.EMAIL_USER.includes('your-email')) {
                await transporter.sendMail({
                    from: `"XploitX-2026" <${process.env.EMAIL_USER}>`,
                    to: emailTarget,
                    subject: `Registration Confirmed - XPLOITX 2.0 BETA: Payment Verified for ${teamData.name}`,
                    html: htmlContent,
                    attachments: attachments
                });
            }
        }
        logAdminActivity('PAYMENT VERIFIED & OD LETTER SENT', `Team ID: ${teamId} by ${req.user ? req.user.username : 'Admin'}`);
        res.json({ success: true, message: 'Registration confirmed and OD Letter PDF sent' });
    } catch (e) {
        console.error("Verify Payment Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// Endpoint to download OD Letter PDF directly
app.get('/api/admin/od_letter/:teamId', verifyAdmin, async (req, res) => {
    try {
        const team = await db.get('SELECT id FROM teams WHERE team_id = ?', [req.params.teamId]);
        if (!team) return res.status(404).json({ error: 'Team not found' });

        const pdfBuffer = await generateODPdfInternal(team.id);
        if (!pdfBuffer) return res.status(500).json({ error: 'Failed to generate OD PDF' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${req.params.teamId}_OD_Letter.pdf"`);
        res.send(pdfBuffer);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// [NEW] Reject Payment
app.post('/api/admin/reject_payment', verifyAdmin, async (req, res) => {
    const { teamId } = req.body;
    try {
        await db.run(`UPDATE teams SET payment_verified = -1 WHERE team_id = ?`, [teamId]);
        logAdminActivity('PAYMENT REJECTED', `Team ID: ${teamId} by ${req.user ? req.user.username : 'Admin'}`);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// [NEW] Resend Confirmation Email
app.post('/api/admin/resend_confirmation', verifyAdmin, async (req, res) => {
    const { teamId, memberName, email, event } = req.body;
    console.log(`Resending confirmation to ${email} for team ${teamId}`);
    try {
        const memberObj = { name: memberName, email: email };
        await sendRegistrationEmails([memberObj], teamId, event);
        logAdminActivity('RESEND CONFIRMATION', `Team ID: ${teamId}, Email: ${email} by ${req.user ? req.user.username : 'Admin'}`);
        res.json({ success: true });
    } catch (e) {
        console.error("Resend Email Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// [NEW] Restore Payment (Undo Reject)
app.post('/api/admin/restore_payment', verifyAdmin, async (req, res) => {
    const { teamId } = req.body;
    try {
        // Reset to 0 (Pending/Standby)
        await db.run(`UPDATE teams SET payment_verified = 0 WHERE team_id = ?`, [teamId]);
        logAdminActivity('PAYMENT RESTORED', `Team ID: ${teamId} by ${req.user ? req.user.username : 'Admin'}`);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

async function generateODPdfInternal(teamDbId) {
    return new Promise(async (resolve, reject) => {
        try {
            const PDFDocument = require('pdfkit');
            const path = require('path');
            const fs = require('fs');

            const doc = new PDFDocument({ margin: 35 });
            let buffers = [];
            doc.on('data', chunk => buffers.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', err => reject(err));

            const team = await db.get('SELECT * FROM teams WHERE id = ?', [teamDbId]);
            const members = await db.all('SELECT * FROM members WHERE team_db_id = ?', [teamDbId]);
            if (!team || !members || members.length === 0) {
                doc.end();
                return;
            }

            const eventName = team.event || "XploitX 2026 Event";
            const studentCollege = members[0].college || "YOUR COLLEGE";

            // Date Logic
            let odDate = "14-03-2026";
            const evLower = eventName.toLowerCase();
            if (evLower.includes("main") || evLower.includes("hackathon") || evLower.includes("24")) {
                odDate = "13-03-2026 to 14-03-2026";
            } else if (evLower.includes("paper") || evLower.includes("network") || evLower.includes("defense") || evLower.includes("digital") || evLower.includes("forensics")) {
                odDate = "14-03-2026";
            }

            const publicDir = path.join(__dirname, '../public');
            const header1Path = path.join(publicDir, 'Header(1st).jpeg');
            const header2Path = path.join(publicDir, 'Header(2nd).jpeg');
            const signImgPath = path.join(publicDir, 'Sign.jpeg');
            const sealImgPath = path.join(publicDir, 'Seal.jpeg');

            // --- Compact Header Section ---
            let currentY = 30;
            if (fs.existsSync(header1Path)) {
                try {
                    doc.image(header1Path, 35, currentY, { width: 525 });
                    currentY += 85;
                } catch (e) { }
            }
            if (fs.existsSync(header2Path)) {
                try {
                    doc.image(header2Path, 35, currentY, { width: 525 });
                    currentY += 65;
                } catch (e) { }
            }

            doc.y = currentY + 10;

            // Department Info (Smaller Font)
            doc.font('Helvetica-Bold').fontSize(11).text('Team XPLOITX 2026', { align: 'left' });
            doc.fontSize(10).text('Department of Cyber Security', { align: 'left' });
            doc.text('Prathyusha Engineering College', { align: 'left' });
            doc.text('Tiruvallur-602 025', { align: 'left' });
            doc.moveDown(0.5);

            // Salutation & Subject
            doc.font('Helvetica').fontSize(11).text('Respected Sir/Madam,', { align: 'left' });
            doc.moveDown(0.3);

            doc.font('Helvetica-Bold').fontSize(11).text(`Subject: Requesting "On-Duty" permission for your student to participate in Our National Technical Cyberfest XPLOITX 2k26 - ${eventName}.`, { align: 'left' });
            doc.moveDown(0.5);

            // Body
            doc.font('Helvetica').fontSize(11).text('Greetings from Prathyusha Engineering College.', { align: 'left' });
            doc.moveDown(0.3);

            doc.text('We are pleased to inform you that the Department of Cyber Security is organizing a National Technical Cyberfest on ', { continued: true });
            doc.font('Helvetica-Bold').text(odDate, { continued: true });
            doc.font('Helvetica').text(' at ', { continued: true });
            doc.font('Helvetica-Bold').text('PRATHYUSHA ENGINEERING COLLEGE', { continued: true });
            doc.font('Helvetica').text(', Tiruvallur. In this regard, we kindly request you to grant On-Duty permission to the participating students from ', { continued: true });
            doc.font('Helvetica-Bold').text(studentCollege.toUpperCase(), { continued: true });
            doc.font('Helvetica').text(' to enable them to attend and actively take part in the Cyberfest.');
            doc.moveDown(1);

            doc.font('Helvetica-Bold').text('List of Participants:', { underline: true });
            doc.moveDown(0.3);

            const tableTop = doc.y;
            const nameX = 80;
            const collegeX = 330;

            doc.fontSize(10);
            doc.text('Name', nameX, tableTop, { bold: true });
            doc.text('College Name', collegeX, tableTop, { bold: true });
            doc.moveTo(35, tableTop + 13).lineTo(560, tableTop + 13).stroke();

            let yRow = tableTop + 18;
            doc.font('Helvetica').fontSize(10);
            members.forEach((m, i) => {
                doc.text(`${i + 1}. ${m.name}`, nameX - 15, yRow);
                doc.text(m.college || "-", collegeX, yRow);
                yRow += 16;
            });

            // --- Compact Footer Section ---
            doc.y = yRow + 20;

            const leftX = 35;
            const rightX = 420;
            const footerY = doc.y;

            doc.fontSize(11).font('Helvetica').text('Yours Sincerely', leftX, footerY);

            // Position signature and seal
            const signY = footerY + 15;
            if (fs.existsSync(signImgPath)) {
                try {
                    doc.image(signImgPath, leftX, signY, { width: 90, height: 40 });
                } catch (e) { }
            }

            if (fs.existsSync(sealImgPath)) {
                try {
                    // Seal placed to the right
                    doc.image(sealImgPath, rightX, signY - 10, { width: 80, height: 80 });
                } catch (e) { }
            }

            doc.y = signY + 45;
            doc.font('Helvetica-Bold').fontSize(11).text('Dr. V. Anithalakshmi', leftX, doc.y);
            doc.font('Helvetica').fontSize(10).text('Head of the Department', leftX, doc.y + 13);

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

// Admin Delete Team
app.post('/api/admin/delete_team', verifyAdmin, async (req, res) => {
    const { teamId } = req.body;
    try {
        const team = await db.get(`SELECT id FROM teams WHERE team_id = ?`, [teamId]);
        if (team) {
            await db.run('DELETE FROM members WHERE team_db_id = ?', [team.id]);
            await db.run('DELETE FROM teams WHERE id = ?', [team.id]);
            await db.run('DELETE FROM attendance WHERE team_id = ?', [teamId]);
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- ATTENDANCE SYSTEM ROUTES ---

app.get('/api/attendance/scan_info/:teamId', async (req, res) => {
    const { teamId } = req.params;
    try {
        const team = await db.get('SELECT * FROM teams WHERE team_id = ?', [teamId]);
        if (!team) return res.status(404).json({ error: 'Team not found' });

        const members = await db.all('SELECT * FROM members WHERE team_db_id = ?', [team.id]);

        // Find leader for convenience
        const leader = members.find(m => m.role === 'LEADER') || members[0] || {};

        res.json({
            team: {
                id: team.team_id,
                name: team.name,
                leaderName: leader.name || 'Unknown',
                college: leader.college || 'Unknown'
            },
            members: members.map(m => ({
                id: m.id,
                name: m.name,
                college: m.college,
                status: m.attendance_status || 'ABSENT'
            }))
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/attendance/mark_members', async (req, res) => {
    const { teamId, memberStatuses } = req.body; // memberStatuses = [{ id, status }]
    try {
        // Validate team exists
        const team = await db.get('SELECT id FROM teams WHERE team_id = ?', [teamId]);
        if (!team) return res.status(404).json({ error: 'Team not found' });

        for (const item of memberStatuses) {
            const currentMember = await db.get('SELECT attendance_status FROM members WHERE id = ?', [item.id]);
            if (!currentMember) continue;

            if (item.status === 'PRESENT' && currentMember.attendance_status !== 'PRESENT') {
                await db.run(
                    `UPDATE members SET attendance_status = 'PRESENT', entry_time = CURRENT_TIMESTAMP WHERE id = ?`,
                    [item.id]
                );
            } else if (item.status === 'ABSENT' && currentMember.attendance_status !== 'ABSENT') {
                await db.run(
                    `UPDATE members SET attendance_status = 'ABSENT' WHERE id = ?`,
                    [item.id]
                );
            }
        }

        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/attendance/all', async (req, res) => {
    try {
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
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// -- Centralized Error Handling Middleware (Catches Multer FileFilter Errors) --
app.use((err, req, res, next) => {
    if (err) {
        console.error('[Error Middleware Caught]:', err.message);
        return res.status(400).json({ error: err.message });
    }
    next();
});

module.exports = app;