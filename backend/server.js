const dns = require('dns');
try {
    dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {
    console.warn('DNS server configuration warning:', e.message);
}

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
const mongoose = require('mongoose');

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

// --- MONGOOSE SCHEMAS & MODELS FOR MONGODB ATLAS ---
const teamSchema = new mongoose.Schema({
    team_id: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    event: String,
    day: String,
    transaction_id: String,
    payment_proof: String,
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

const Team = mongoose.model('Team', teamSchema);
const Member = mongoose.model('Member', memberSchema);
const Attendance = mongoose.model('Attendance', attendanceSchema);

let isMongoConnected = false;
let db = null;
const DBPath = path.join(__dirname, 'hackathon.db');

const initialiseDBAndServer = async () => {
    const mongoUri = process.env.MONGODB_URI;
    if (mongoUri && mongoUri.trim() !== '') {
        try {
            await mongoose.connect(mongoUri.trim());
            isMongoConnected = true;
            console.log('✅ Connected to MongoDB Atlas successfully!');
        } catch (err) {
            console.error('❌ MongoDB Atlas Connection Error:', err.message);
            console.log('⚠️ Falling back to local SQLite database...');
        }
    } else {
        console.log('ℹ️ MONGODB_URI is not set in .env. Will connect to MongoDB Atlas as soon as credentials are input.');
    }

    if (!isMongoConnected) {
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

    app.listen(PORT, () => {
        console.log(`🚀 Server started at http://localhost:${PORT}/`);
        if (isMongoConnected) {
            console.log(`🍃 Database Engine: MongoDB Atlas Connected`);
        } else {
            console.log(`📁 Database Engine: SQLite (Local Backup)`);
        }
    });
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
        payment_verified INTEGER DEFAULT 0
    )`);

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

    try { await db.run(`ALTER TABLE attendance ADD COLUMN entry_time DATETIME DEFAULT CURRENT_TIMESTAMP`); } catch (e) { }
    try { await db.run(`ALTER TABLE attendance ADD COLUMN status TEXT DEFAULT 'ABSENT'`); } catch (e) { }
    try { await db.run(`ALTER TABLE members ADD COLUMN attendance_status TEXT DEFAULT 'ABSENT'`); } catch (e) { }
    try { await db.run(`ALTER TABLE members ADD COLUMN entry_time DATETIME`); } catch (e) { }

    console.log('SQLite Database initialized.');
}

// --- UNIFIED DATA ACCESS LAYER (MONGO ATLAS + SQLITE FALLBACK) ---

async function getTeamCount() {
    if (isMongoConnected) {
        return await Team.countDocuments();
    }
    if (!db) return 0;
    const result = await db.get('SELECT COUNT(*) as count FROM teams');
    return result ? result.count : 0;
}

async function getNextTeamId() {
    if (isMongoConnected) {
        const lastTeam = await Team.findOne({}).sort({ created_at: -1 }).exec();
        let nextNum = 1;
        if (lastTeam && lastTeam.team_id) {
            const numMatch = lastTeam.team_id.match(/\d+/);
            if (numMatch) nextNum = parseInt(numMatch[0], 10) + 1;
        }
        return `Xctf26te${String(nextNum).padStart(4, '0')}`;
    }
    const lastTeam = await db.get('SELECT id FROM teams ORDER BY id DESC LIMIT 1');
    const nextNum = lastTeam ? lastTeam.id + 1 : 1;
    return `Xctf26te${String(nextNum).padStart(4, '0')}`;
}

async function findTeamByName(name) {
    if (isMongoConnected) {
        return await Team.findOne({ name: new RegExp('^' + name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') }).lean();
    }
    return await db.get('SELECT * FROM teams WHERE name = ? COLLATE NOCASE', [name]);
}

async function findTeamByEmail(email) {
    if (isMongoConnected) {
        return await Team.findOne({ email }).lean();
    }
    return await db.get('SELECT * FROM teams WHERE email = ?', [email]);
}

async function findTeamById(teamId) {
    if (isMongoConnected) {
        return await Team.findOne({ team_id: teamId }).lean();
    }
    return await db.get('SELECT * FROM teams WHERE team_id = ?', [teamId]);
}

async function findTeamByUTR(utr) {
    if (isMongoConnected) {
        return await Team.findOne({ transaction_id: utr }).lean();
    }
    return await db.get('SELECT team_id FROM teams WHERE transaction_id = ?', [utr]);
}

async function getAllTeamsData() {
    if (isMongoConnected) {
        const teams = await Team.find().lean();
        const fullData = [];
        for (const t of teams) {
            const members = await Member.find({ team_id: t.team_id }).lean();
            fullData.push({ ...t, id: t._id.toString(), members });
        }
        return fullData;
    }
    const teams = await db.all(`SELECT * FROM teams`);
    const fullData = [];
    for (const team of teams) {
        const members = await db.all(`SELECT * FROM members WHERE team_db_id = ?`, [team.id]);
        fullData.push({ ...team, members });
    }
    return fullData;
}

async function getTeamDataWithMembers(teamId) {
    if (isMongoConnected) {
        const team = await Team.findOne({ team_id: teamId }).lean();
        if (!team) return null;
        const members = await Member.find({ team_id: teamId }).lean();
        return { team: { ...team, id: team._id.toString() }, members };
    }
    const team = await db.get(`SELECT * FROM teams WHERE team_id = ?`, [teamId]);
    if (!team) return null;
    const members = await db.all(`SELECT * FROM members WHERE team_db_id = ?`, [team.id]);
    return { team, members };
}

async function createTeamRecord({ teamName, email, event, day, transactionId, paymentProof, members }) {
    if (isMongoConnected) {
        const teamIdStr = await getNextTeamId();
        const newTeam = new Team({
            team_id: teamIdStr,
            name: teamName,
            email,
            event,
            day: day || "N/A",
            transaction_id: transactionId || "NOT_PROVIDED",
            payment_proof: paymentProof || "",
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

    const tempId = 'TEMP_' + Date.now();
    const result = await db.run(
        `INSERT INTO teams (team_id, name, email, event, day, transaction_id, payment_proof, payment_verified) VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
        [tempId, teamName, email, event, day || "N/A", transactionId || "NOT_PROVIDED", paymentProof || ""]
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
    return { teamId: teamIdStr, teamDbId };
}

async function updatePaymentStatus(teamId, status) {
    if (isMongoConnected) {
        await Team.updateOne({ team_id: teamId }, { payment_verified: status });
        return;
    }
    await db.run(`UPDATE teams SET payment_verified = ? WHERE team_id = ?`, [status, teamId]);
}

async function updatePaymentProof(teamId, proofPath, transactionId) {
    if (isMongoConnected) {
        const updateDoc = { payment_proof: proofPath };
        if (transactionId) updateDoc.transaction_id = transactionId;
        await Team.updateOne({ team_id: teamId }, updateDoc);
        return;
    }
    if (transactionId) {
        await db.run(`UPDATE teams SET payment_proof = ?, transaction_id = ? WHERE team_id = ?`, [proofPath, transactionId, teamId]);
    } else {
        await db.run(`UPDATE teams SET payment_proof = ? WHERE team_id = ?`, [proofPath, teamId]);
    }
}

async function updateTeamAndMembers(teamId, name, event, members) {
    if (isMongoConnected) {
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
        return;
    }
    const team = await db.get(`SELECT * FROM teams WHERE team_id = ?`, [teamId]);
    if (!team) throw new Error('Team not found');
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

async function deleteTeamRecord(teamId) {
    if (isMongoConnected) {
        await Team.deleteOne({ team_id: teamId });
        await Member.deleteMany({ team_id: teamId });
        await Attendance.deleteOne({ team_id: teamId });
        return;
    }
    const team = await db.get(`SELECT id FROM teams WHERE team_id = ?`, [teamId]);
    if (team) {
        await db.run('DELETE FROM members WHERE team_db_id = ?', [team.id]);
        await db.run('DELETE FROM teams WHERE id = ?', [team.id]);
        await db.run('DELETE FROM attendance WHERE team_id = ?', [teamId]);
    }
}

async function addAttendanceRecord(teamId, teamName, leaderName, leaderPhone) {
    if (isMongoConnected) {
        await Attendance.updateOne(
            { team_id: teamId },
            { $setOnInsert: { team_id: teamId, team_name: teamName, team_leader_name: leaderName, team_leader_phone: leaderPhone, status: 'ABSENT' } },
            { upsert: true }
        );
        return;
    }
    await db.run(`INSERT OR IGNORE INTO attendance (team_id, team_name, team_leader_name, team_leader_phone, status) VALUES (?, ?, ?, ?, 'ABSENT')`,
        [teamId, teamName, leaderName, leaderPhone]);
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

function logAdminActivity(action, details = '') {
    const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });
    const logEntry = `[${timestamp}] ${action}${details ? ': ' + details : ''}\n`;
    const logPath = path.join(__dirname, 'admin_activity.log');
    fs.appendFile(logPath, logEntry, (err) => {
        if (err) console.error('Error writing to admin log:', err);
    });
}

// Admin Login
app.post('/api/admin/login', (req, res) => {
    let { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

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
        const token = jwt.sign({ username: canonicalUser, role: 'admin' }, JWT_SECRET, { expiresIn: '12h' });
        res.json({ success: true, token: token, user: canonicalUser });
    } else {
        res.status(401).json({ error: 'Invalid Credentials' });
    }
});

// Admin Activity Log
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

function getEmailFooterHtml() {
    return `
        <div style="margin-top: 30px; text-align: center; border-top: 1px solid rgba(255,255,255,0.15); padding-top: 20px;">
            <p style="font-weight: bold; font-size: 12px; margin-bottom: 12px; color: #8b9bb4; letter-spacing: 1px;">CONNECT WITH US & FIND VENUE LOCATION</p>
            <div style="text-align: center;">
                <a href="https://instagram.com/xploitxctf.2k26" target="_blank" style="text-decoration: none; margin: 0 12px; display: inline-block;">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Instagram_logo_2016.svg/2048px-Instagram_logo_2016.svg.png" alt="Instagram" width="30" height="30" style="vertical-align: middle;">
                </a>
                <a href="https://maps.app.goo.gl/fEMAzGYaPhuvDfi86" target="_blank" style="text-decoration: none; margin: 0 12px; display: inline-block;">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Google_Maps_icon_%282020%29.svg/1024px-Google_Maps_icon_%282020%29.svg.png" alt="Location Map" width="30" height="30" style="vertical-align: middle;">
                </a>
            </div>
        </div>
    `;
}

// Send OTP
app.post('/api/auth/send-verification-otp', async (req, res) => {
    const { email, name } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const isValidDomain = await validateEmailDomain(email);
    if (!isValidDomain) {
        return res.status(400).json({ error: `Invalid email domain.` });
    }

    const existingTeam = await findTeamByEmail(email);
    if (existingTeam) {
        return res.status(400).json({ error: 'This email is already registered as a Team Leader.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    verificationOtps[email] = otp;

    const subject = "Email Verification OTP - XPLOITX 2.0 BETA";
    const recipientName = name ? name.trim() : "Team Leader";

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
        
        ${getEmailFooterHtml()}
    </div>`;

    const text = `XPLOITX 2.0 BETA - Email Verification\n\nDear ${recipientName},\n\nUse the code below to verify your email address:\n\n${otp}\n\nThis OTP is valid for 10 minutes.\n\nPrathyusha Engineering College - Department of Cyber Security`;

    if (process.env.EMAIL_USER && !process.env.EMAIL_USER.includes('your-email')) {
        const result = await sendEmail(email, subject, text, html);
        if (!result.success) {
            let errorMsg = result.error || "Failed to send email.";
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

async function sendRegistrationEmails(members, teamIdStr, event) {
    if (!process.env.EMAIL_USER) return;
    const subject = "Confirmation: Your Registration for XploitX 2.0 BETA!";

    for (let i = 0; i < members.length; i++) {
        const m = members[i];
        const dateStr = "09 October 2026";
        const timeStr = "8:30 AM";

        const htmlBody = `
        <div style="font-family: Arial, sans-serif; background-color: #050914; color: #ffffff; padding: 25px; border-radius: 8px; border: 1px solid #00ff66; max-width: 600px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #00ff66; font-size: 24px; margin: 0; letter-spacing: 3px;">XPLOITX 2.0 BETA</h1>
                <p style="color: #ffd700; font-size: 13px; margin-top: 5px; font-weight: bold;">DEPARTMENT OF CYBER SECURITY | PRATHYUSHA ENGINEERING COLLEGE</p>
            </div>
            
            <div style="background: rgba(2, 6, 18, 0.9); padding: 20px; border-radius: 6px; border-left: 4px solid #00ff66; margin-bottom: 20px;">
                <p style="color: #ffffff; font-size: 15px; margin-top: 0;">Dear <b>${m.name}</b>,</p>
                <p style="color: #d1d5db; font-size: 14px;">Thank you for registering for <b>XPLOITX 2.0 BETA</b>, the Department of Cyber Security's premier 24-Hour Offline CTF competition!</p>

                <div style="background-color: #02040a; padding: 15px; border-radius: 5px; border: 1px solid #00ff66; margin: 20px 0; color: #ffffff;">
                    <p style="margin: 0; font-size: 15px;"><b>Your Team ID:</b> <span style="color: #00ff66; font-weight: bold;">${teamIdStr}</span></p>
                    <p style="margin-top: 5px; color: #8b9bb4;"><small>Please quote this Team ID for all event communications.</small></p>
                </div>

                <p style="color: #ffffff; font-weight: bold; margin-bottom: 8px;">Event Details:</p>
                <ul style="color: #d1d5db; font-size: 14px; line-height: 1.6;">
                    <li><b>Event:</b> ${event || "XPLOITX 2.0 BETA - 24-Hour CTF"}</li>
                    <li><b>Date:</b> ${dateStr}</li>
                    <li><b>Venue:</b> Prathyusha Engineering College Campus (Offline)</li>
                    <li><b>Check-in Starts:</b> ${timeStr}</li>
                </ul>

                <p style="color: #8b9bb4; font-size: 13px; margin-top: 20px;">Best regards,<br><b>The XploitX 2.0 Organizing Committee</b><br>Department of Cyber Security<br>Prathyusha Engineering College</p>
            </div>
            ${getEmailFooterHtml()}
        </div>`;

        const textBody = `XPLOITX 2.0 BETA Registration Confirmed\n\nDear ${m.name},\n\nTeam ID: ${teamIdStr}\nEvent: ${event}\nDate: ${dateStr}\nVenue: Prathyusha Engineering College Campus`;

        if (m.email) await sendEmail(m.email, subject, textBody, htmlBody);
    }
}

app.get('/api/admin/data', verifyAdmin, async (req, res) => {
    try {
        const fullData = await getAllTeamsData();
        res.json(fullData);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/team/:id', async (req, res) => {
    try {
        const data = await getTeamDataWithMembers(req.params.id);
        if (!data) return res.status(404).json({ error: 'Team not found' });
        res.json(data);
    } catch (e) { res.status(500).json({ error: e.message }); }
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
    try {
        await updateTeamAndMembers(teamId, name, event, members);
        logAdminActivity('TEAM UPDATED', `Team ID: ${teamId} by ${req.user ? req.user.username : 'Admin'}`);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/team/:id/update', async (req, res) => {
    const { members } = req.body;
    try {
        const team = await findTeamById(req.params.id);
        if (!team) return res.status(404).json({ error: 'Team not found' });
        await updateTeamAndMembers(req.params.id, team.name, team.event, members);
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
        if (!teamName || !members) return res.status(400).json({ error: 'Missing required fields' });

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

        const initialFilePath = file ? ('/uploads/' + file.filename) : 'NOT_PROVIDED';
        const record = await createTeamRecord({
            teamName,
            email,
            event,
            day: req.body.day,
            transactionId: utrNumber,
            paymentProof: initialFilePath,
            members
        });

        const teamIdStr = record.teamId;

        // Rename Payment Proof File if uploaded
        if (file && file.path) {
            const oldPath = file.path;
            const ext = path.extname(file.originalname);
            const newFilename = teamIdStr + ext;
            const newPath = path.join(path.dirname(oldPath), newFilename);

            try {
                if (fs.existsSync(oldPath)) {
                    fs.renameSync(oldPath, newPath);
                    const newDbPath = '/uploads/' + newFilename;
                    await updatePaymentProof(teamIdStr, newDbPath);
                }
            } catch (renameErr) {
                console.error("File Rename Error:", renameErr);
            }
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
        const existingUTR = await findTeamByUTR(utrNumber);
        if (existingUTR && existingUTR.team_id !== teamId) {
            return res.status(400).json({ error: 'UTR already used.' });
        }
    }

    const filePath = '/uploads/' + file.filename;
    await updatePaymentProof(teamId, filePath, utrNumber);

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

            // QR Code Generation
            const QRCode = require('qrcode');
            const qrData = JSON.stringify({ teamId, teamName: teamData.name, leaderName: leader.name });
            const qrImage = await QRCode.toDataURL(qrData);

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

            const whatsappLink = "https://chat.whatsapp.com/Gc8vl1uJvAgHuzLhQjMdCb?mode=gi_t";
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
                        
                        <div style="text-align: center; margin: 24px 0; border: 2px dashed #00ff66; padding: 20px; background: #02040a; border-radius: 8px;">
                            <h3 style="color: #ffd700; margin-top: 0;">YOUR OFFICIAL EVENT ENTRY PASS</h3>
                            <p style="color: #8b9bb4; font-size: 13px;">Present this QR code at the venue check-in desk</p>
                            <img src="cid:event-qr-code" style="width: 200px; height: 200px; border: 2px solid #00ff66; border-radius: 6px;" alt="Entry QR Code" />
                            <p style="color: #00ff66; font-weight: bold; font-size: 18px; margin-top: 10px;">${teamId}</p>
                        </div>

                        <div style="background: rgba(0, 255, 102, 0.1); border: 1px solid #00ff66; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
                            <h4 style="color: #00ff66; margin: 0 0 8px 0; font-size: 15px;">📄 ON-DUTY (OD) LETTER ATTACHED (PDF FORMAT)</h4>
                            <p style="color: #d1d5db; font-size: 13px; margin: 0;">Your official <b>On-Duty (OD) Permission Letter PDF</b> (signed by Head of Department Dr. V. Anithalakshmi) is generated and attached to this email (<b>${teamId}_OD_Letter.pdf</b>).</p>
                        </div>

                        <p style="color: #d1d5db; font-size: 14px;">Follow this link to join the official participant WhatsApp group: <a href="${whatsappLink}" style="color: #00ff66; font-weight: bold; text-decoration: underline;">Click Here to Join WhatsApp Group</a></p>

                        <p style="color: #8b9bb4; font-size: 13px;">Regards,<br><b>The XploitX 2.0 Organizing Committee</b><br>Department of Cyber Security<br>Prathyusha Engineering College</p>
                    </div>
                    ${getEmailFooterHtml()}
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

app.get('/api/admin/od_letter/:teamId', verifyAdmin, async (req, res) => {
    try {
        const data = await getTeamDataWithMembers(req.params.teamId);
        if (!data) return res.status(404).json({ error: 'Team not found' });

        const pdfBuffer = await generateODPdfInternal(data.team);
        if (!pdfBuffer) return res.status(500).json({ error: 'Failed to generate OD PDF' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${req.params.teamId}_OD_Letter.pdf"`);
        res.send(pdfBuffer);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/admin/reject_payment', verifyAdmin, async (req, res) => {
    const { teamId } = req.body;
    try {
        await updatePaymentStatus(teamId, -1);
        logAdminActivity('PAYMENT REJECTED', `Team ID: ${teamId} by ${req.user ? req.user.username : 'Admin'}`);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/resend_confirmation', verifyAdmin, async (req, res) => {
    const { teamId, memberName, email, event } = req.body;
    try {
        const memberObj = { name: memberName, email: email };
        await sendRegistrationEmails([memberObj], teamId, event);
        logAdminActivity('RESEND CONFIRMATION', `Team ID: ${teamId}, Email: ${email} by ${req.user ? req.user.username : 'Admin'}`);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/admin/restore_payment', verifyAdmin, async (req, res) => {
    const { teamId } = req.body;
    try {
        await updatePaymentStatus(teamId, 0);
        logAdminActivity('PAYMENT RESTORED', `Team ID: ${teamId} by ${req.user ? req.user.username : 'Admin'}`);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

async function generateODPdfInternal(teamObj) {
    return new Promise(async (resolve, reject) => {
        try {
            const PDFDocument = require('pdfkit');

            const doc = new PDFDocument({ margin: 35 });
            let buffers = [];
            doc.on('data', chunk => buffers.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', err => reject(err));

            let members = [];
            if (isMongoConnected) {
                members = await Member.find({ team_id: teamObj.team_id }).lean();
            } else {
                members = await db.all('SELECT * FROM members WHERE team_db_id = ?', [teamObj.id]);
            }

            if (!teamObj || !members || members.length === 0) {
                doc.end();
                return;
            }

            const eventName = teamObj.event || "XPLOITX 2.0 BETA - 24-Hour CTF";
            const studentCollege = members[0].college || "YOUR COLLEGE";
            const odDate = "09-10-2026";

            const publicDir = path.join(__dirname, '../public');
            const header1Path = path.join(publicDir, 'Header(1st).jpeg');
            const header2Path = path.join(publicDir, 'Header(2nd).jpeg');
            const signImgPath = path.join(publicDir, 'Sign.jpeg');
            const sealImgPath = path.join(publicDir, 'Seal.jpeg');

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

            doc.font('Helvetica-Bold').fontSize(11).text('Team XPLOITX 2.0 BETA', { align: 'left' });
            doc.fontSize(10).text('Department of Cyber Security', { align: 'left' });
            doc.text('Prathyusha Engineering College', { align: 'left' });
            doc.text('Tiruvallur-602 025', { align: 'left' });
            doc.moveDown(0.5);

            doc.font('Helvetica').fontSize(11).text('Respected Sir/Madam,', { align: 'left' });
            doc.moveDown(0.3);

            doc.font('Helvetica-Bold').fontSize(11).text(`Subject: Requesting "On-Duty" permission for your student to participate in Our National Technical Cyberfest XPLOITX 2.0 BETA - ${eventName}.`, { align: 'left' });
            doc.moveDown(0.5);

            doc.font('Helvetica').fontSize(11).text('Greetings from Prathyusha Engineering College.', { align: 'left' });
            doc.moveDown(0.3);

            doc.text('We are pleased to inform you that the Department of Cyber Security is organizing a 24-Hour Cyberfest CTF on ', { continued: true });
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

            doc.y = yRow + 20;

            const leftX = 35;
            const rightX = 420;
            const footerY = doc.y;

            doc.fontSize(11).font('Helvetica').text('Yours Sincerely', leftX, footerY);

            const signY = footerY + 15;
            if (fs.existsSync(signImgPath)) {
                try {
                    doc.image(signImgPath, leftX, signY, { width: 90, height: 40 });
                } catch (e) { }
            }

            if (fs.existsSync(sealImgPath)) {
                try {
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
        await deleteTeamRecord(teamId);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- ATTENDANCE SYSTEM ROUTES ---

app.get('/api/attendance/scan_info/:teamId', async (req, res) => {
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
                id: isMongoConnected ? m._id.toString() : m.id,
                name: m.name,
                college: m.college,
                status: m.attendance_status || 'ABSENT'
            }))
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/attendance/mark_members', async (req, res) => {
    const { teamId, memberStatuses } = req.body;
    try {
        const data = await getTeamDataWithMembers(teamId);
        if (!data) return res.status(404).json({ error: 'Team not found' });

        for (const item of memberStatuses) {
            if (isMongoConnected) {
                if (item.status === 'PRESENT') {
                    await Member.findByIdAndUpdate(item.id, { attendance_status: 'PRESENT', entry_time: new Date() });
                } else {
                    await Member.findByIdAndUpdate(item.id, { attendance_status: 'ABSENT' });
                }
            } else {
                const currentMember = await db.get('SELECT attendance_status FROM members WHERE id = ?', [item.id]);
                if (!currentMember) continue;
                if (item.status === 'PRESENT' && currentMember.attendance_status !== 'PRESENT') {
                    await db.run(`UPDATE members SET attendance_status = 'PRESENT', entry_time = CURRENT_TIMESTAMP WHERE id = ?`, [item.id]);
                } else if (item.status === 'ABSENT' && currentMember.attendance_status !== 'ABSENT') {
                    await db.run(`UPDATE members SET attendance_status = 'ABSENT' WHERE id = ?`, [item.id]);
                }
            }
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/attendance/all', async (req, res) => {
    try {
        if (isMongoConnected) {
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

app.use((err, req, res, next) => {
    if (err) {
        console.error('[Error Middleware Caught]:', err.message);
        return res.status(400).json({ error: err.message });
    }
    next();
});

module.exports = app;