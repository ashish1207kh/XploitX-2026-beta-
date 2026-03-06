# Security Fixes for XploitX-2026 Backend

Here are the specific code blocks you need to apply to `backend/server.js` and `public/admin.html` to fix the critical vulnerabilities. 

## 1. Secure File Uploads (Fixing XSS / Unrestricted Uploads)
*In `backend/server.js`, find where `const upload = multer({ storage: storage });` is defined (around line 38) and replace it with this to enforce image-only uploads:*

```javascript
// Add specific file filtering to prevent uploading PHP, HTML, or SVG scripts
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Error: Images Only (jpeg, jpg, png, webp)!'));
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // Optional: 5MB size limit
});
```

## 2. Implement JWT Admin Verification Middleware
*In `backend/server.js`, right before your API Routes start (around line 150), add the `JWT_SECRET` and the `verifyAdmin` middleware function. Make sure to hash/remove plaintext passwords if possible:*

```javascript
// --- JWT & ADMIN SECURITY LAYER ---
const JWT_SECRET = process.env.JWT_SECRET || 'xploitx_super_secret_key_2026';

const verifyAdmin = (req, res, next) => {
    // Look for Token in the Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Access Denied: No Token Provided' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Access Denied: Invalid Token' });
        req.user = user; 
        next();
    });
};
```

## 3. Issue JWT Token on Admin Login
*In `backend/server.js`, modify your `/api/admin/login` route. Instead of returning `token: 'admin-authorized'`, issue a real JWT token:*

```javascript
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;

    const admins = {
        "Madhumitha": "Madhumitha@xploitx",
        "Jesin Milesh": "Jesin@xploitx",
        // ... (Keep your credentials object for now, or move to .env later)
        "Administrator": process.env.ADMIN_PASSWORD
    };

    if (admins.hasOwnProperty(username) && admins[username] === password) {
        // Generate Secure JWT Token for this session
        const token = jwt.sign({ username: username, role: 'admin' }, JWT_SECRET, { expiresIn: '12h' });

        // [LOGGING] Record admin access
        const timestamp = new Date().toLocaleString();
        const logEntry = `[${timestamp}] USER LOGIN: ${username}\n`;
        const logPath = path.join(__dirname, 'admin_activity.log');
        fs.appendFile(logPath, logEntry, (err) => {
            if (err) console.error('Error writing to admin log:', err);
        });

        res.json({ success: true, token: token, user: username }); // Return real token
    } else {
        res.status(401).json({ error: 'Invalid Credentials' });
    }
});
```

## 4. Secure All Admin Routes
*In `backend/server.js`, you must add the `verifyAdmin` middleware to EVERY `/api/admin/*` endpoint so the database cannot be queried without the JWT. Change your routes to look like this:*

```javascript
app.get('/api/admin/activity-log', verifyAdmin, (req, res) => { ... });
app.get('/api/admin/data', verifyAdmin, async (req, res) => { ... });
app.post('/api/admin/update_team', verifyAdmin, async (req, res) => { ... });
app.post('/api/admin/verify_payment', verifyAdmin, async (req, res) => { ... });
app.post('/api/admin/reject_payment', verifyAdmin, async (req, res) => { ... });
app.post('/api/admin/resend_confirmation', verifyAdmin, async (req, res) => { ... });
app.post('/api/admin/restore_payment', verifyAdmin, async (req, res) => { ... });
app.post('/api/admin/delete_team', verifyAdmin, async (req, res) => { ... });
```

## 5. Update Frontend Panel (`public/admin.html`)
*Because the backend now requires an `Authorization: Bearer <token>` header, the frontend `admin.html` must be updated to store and send the token automatically on every fetch.*

**Part A: Save Token on Login** (Around line 621 in `admin.html`, under `if (data.success) {`)
```javascript
if (data.success) {
    document.getElementById('login-overlay').style.display = 'none';
    showCustomAlert('ACCESS GRANTED: WELCOME ' + data.user);
    
    // Save token to session storage
    sessionStorage.setItem('admin_token', data.token); 
    
    // ... load details ...
}
```

**Part B: Add Authorization Header Override** (Around line 519 in `admin.html`, right below `const API_BASE_URL...`)
```javascript
const API_BASE_URL = isLocal ? 'http://localhost:3000' : '';

// --- INJECT JWT TOKEN TO ALL ADMIN FETCH CALLS ---
const originalFetch = window.fetch;
window.fetch = async function() {
    let [resource, config] = arguments;
    
    // If it's an API call to an admin URL (except login itself)
    if(typeof resource === 'string' && resource.includes('/api/admin/') && !resource.includes('/login')) {
        if(!config) config = {};
        if(!config.headers) config.headers = {};
        
        // Grab token and inject it
        const token = sessionStorage.getItem('admin_token');
        if(token) {
            config.headers['Authorization'] = 'Bearer ' + token;
        }
    }
    return await originalFetch(resource, config);
};
```
