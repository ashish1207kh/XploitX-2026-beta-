const http = require('http');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

function httpRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch(e) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
          json
        });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runSecurityAudit() {
  console.log('====================================================');
  console.log('      XPLOITX 2.0 BETA - COMPREHENSIVE SECURITY AUDIT');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(name, condition, extraInfo = '') {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name} ${extraInfo ? '-> ' + extraInfo : ''}`);
      failed++;
    }
  }

  // ----------------------------------------------------
  // TEST 1: Unauthenticated Requests to Protected Admin Endpoints
  // ----------------------------------------------------
  console.log('\n--- 1. Testing Unauthenticated Access to Admin Endpoints ---');
  try {
    const resAdminData = await httpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/admin/data',
      method: 'GET'
    });
    assert('GET /api/admin/data returns 401 without token', resAdminData.statusCode === 401, `Status: ${resAdminData.statusCode}`);

    const resBackup = await httpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/admin/backup-db',
      method: 'GET'
    });
    assert('GET /api/admin/backup-db returns 401 without token', resBackup.statusCode === 401, `Status: ${resBackup.statusCode}`);

    const resActLog = await httpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/admin/activity-log',
      method: 'GET'
    });
    assert('GET /api/admin/activity-log returns 401 without token', resActLog.statusCode === 401, `Status: ${resActLog.statusCode}`);

    const resRawLog = await httpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/admin_activity.log',
      method: 'GET'
    });
    assert('GET /admin_activity.log is protected (401/403/404)', [401, 403, 404].includes(resRawLog.statusCode), `Status: ${resRawLog.statusCode}`);
  } catch(e) {
    assert('Admin endpoint requests succeed over HTTP', false, e.message);
  }

  // ----------------------------------------------------
  // TEST 2: Tampered / Invalid Token Requests
  // ----------------------------------------------------
  console.log('\n--- 2. Testing Tampered & Fake Token Rejection ---');
  try {
    const resTamperedAdmin = await httpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/admin/data',
      method: 'GET',
      headers: { 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fakePayload.fakeSignature' }
    });
    assert('GET /api/admin/data with tampered JWT returns 403', resTamperedAdmin.statusCode === 403, `Status: ${resTamperedAdmin.statusCode}`);

    const resTamperedAtt = await httpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/attendance/all',
      method: 'GET',
      headers: { 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fakePayload.fakeSignature' }
    });
    assert('GET /api/attendance/all with tampered JWT returns 403', resTamperedAtt.statusCode === 403, `Status: ${resTamperedAtt.statusCode}`);
  } catch(e) {
    assert('Tampered token testing completed', false, e.message);
  }

  // ----------------------------------------------------
  // TEST 3: Attendance Unauthenticated Requests
  // ----------------------------------------------------
  console.log('\n--- 3. Testing Unauthenticated Access to Attendance Endpoints ---');
  try {
    const resAttAll = await httpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/attendance/all',
      method: 'GET'
    });
    assert('GET /api/attendance/all returns 401 without token', resAttAll.statusCode === 401, `Status: ${resAttAll.statusCode}`);

    const resScanInfo = await httpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/attendance/scan_info/T-001',
      method: 'GET'
    });
    assert('GET /api/attendance/scan_info returns 401 without token', resScanInfo.statusCode === 401, `Status: ${resScanInfo.statusCode}`);

    const resMark = await httpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/attendance/mark_members',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify({ teamId: 'T-001', memberStatuses: [] }));
    assert('POST /api/attendance/mark_members returns 401 without token', resMark.statusCode === 401, `Status: ${resMark.statusCode}`);
  } catch(e) {
    assert('Attendance unauthenticated checks succeeded', false, e.message);
  }

  // ----------------------------------------------------
  // TEST 4: Legitimate Attendance Login & Authorized Requests
  // ----------------------------------------------------
  console.log('\n--- 4. Testing Attendance Login & Authorized Access ---');
  let attendanceToken = null;
  try {
    const payload = JSON.stringify({ username: 'administrator', password: 'Administrator@Beta2026' });
    const resLogin = await httpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/attendance/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, payload);

    assert('POST /api/attendance/login succeeds (200)', resLogin.statusCode === 200, `Status: ${resLogin.statusCode}`);
    assert('Login response returns success: true and a signed token', resLogin.json && resLogin.json.success && !!resLogin.json.token);
    
    // Verify no persistent session cookies were set
    const setCookie = resLogin.headers['set-cookie'] || [];
    const hasAuthCookie = setCookie.some(c => c.includes('session=') && !c.includes('Expires=Thu, 01 Jan 1970'));
    assert('Login sets NO auth session cookies (or actively clears legacy)', !hasAuthCookie);

    attendanceToken = resLogin.json ? resLogin.json.token : null;

    if (attendanceToken) {
      const resWithToken = await httpRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/attendance/all',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${attendanceToken}` }
      });
      assert('Authorized GET /api/attendance/all with Bearer token succeeds (200)', resWithToken.statusCode === 200, `Status: ${resWithToken.statusCode}`);
    }
  } catch(e) {
    assert('Attendance login flow completed without crash', false, e.message);
  }

  // ----------------------------------------------------
  // TEST 5: Legitimate Admin Login & Authorized Requests
  // ----------------------------------------------------
  console.log('\n--- 5. Testing Admin Login & Authorized Access ---');
  let adminToken = null;
  try {
    const payload = JSON.stringify({ username: 'Administrator', password: 'Administrator@Beta2026' });
    const resAdminLogin = await httpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/admin/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, payload);

    assert('POST /api/admin/login succeeds (200)', resAdminLogin.statusCode === 200, `Status: ${resAdminLogin.statusCode}`);
    assert('Admin login returns JWT token and user info', resAdminLogin.json && resAdminLogin.json.success && !!resAdminLogin.json.token);
    adminToken = resAdminLogin.json ? resAdminLogin.json.token : null;

    if (adminToken) {
      const resAdminDataWithToken = await httpRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/admin/data',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      assert('Authorized GET /api/admin/data with Bearer token succeeds (200)', resAdminDataWithToken.statusCode === 200, `Status: ${resAdminDataWithToken.statusCode}`);
    }
  } catch(e) {
    assert('Admin login flow completed', false, e.message);
  }

  // ----------------------------------------------------
  // TEST 6: Static Frontend Security Inspection (View Source / DevTools safety)
  // ----------------------------------------------------
  console.log('\n--- 6. Testing Frontend Security Under Inspection ---');
  let foundStorageTokens = 0;
  let foundPlaintextSecrets = 0;

  function scanPublicFiles(dir) {
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        if (entry !== 'node_modules' && entry !== '.git') scanPublicFiles(fullPath);
      } else if (entry.endsWith('.html') || entry.endsWith('.js')) {
        const text = fs.readFileSync(fullPath, 'utf8');
        const lines = text.split('\n');
        lines.forEach((line, idx) => {
          // Check for token storage in localStorage/sessionStorage
          if (/sessionStorage\.setItem\s*\(\s*['"](token|admin_token|attendance_token)/i.test(line) ||
              /localStorage\.setItem\s*\(\s*['"](token|admin_token|attendance_token)/i.test(line)) {
            console.warn(`[STORAGE LEAK] in ${fullPath}:${idx+1} -> ${line.trim()}`);
            foundStorageTokens++;
          }
          // Check for hardcoded admin credentials
          if (/(Administrator@Beta2026|Jesin@Beta2026|Ashish@Beta2026|PEC-ATTENDANCE-KEY-2026)/.test(line)) {
            console.warn(`[SECRET LEAK] in ${fullPath}:${idx+1} -> ${line.trim()}`);
            foundPlaintextSecrets++;
          }
        });
      }
    }
  }

  scanPublicFiles(path.resolve(__dirname, '../public'));
  assert('Zero auth tokens stored in localStorage/sessionStorage across all frontend files', foundStorageTokens === 0, `Found: ${foundStorageTokens}`);
  assert('Zero hardcoded production credentials in frontend files', foundPlaintextSecrets === 0, `Found: ${foundPlaintextSecrets}`);

  // ----------------------------------------------------
  // TEST 7: Database Integrity Verification
  // ----------------------------------------------------
  console.log('\n--- 7. Testing Database Data Integrity ---');
  const dbPath = path.resolve(__dirname, '../backend/hackathon.db');
  assert('SQLite database hackathon.db exists', fs.existsSync(dbPath));

  const db = new sqlite3.Database(dbPath);
  await new Promise((resolve) => {
    db.serialize(() => {
      db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
        const tableNames = (tables || []).map(t => t.name);
        assert('Database contains required tables (teams, members, attendance, activity_logs)',
          tableNames.includes('teams') && tableNames.includes('members') && tableNames.includes('attendance') && tableNames.includes('activity_logs'),
          `Tables: ${tableNames.join(', ')}`
        );
        resolve();
      });
    });
  });
  db.close();

  // Summary
  console.log('\n====================================================');
  console.log(` AUDIT SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed === 0) {
    console.log('ALL SECURITY CRITERIA SATISFIED SUCCESSFULLY!');
  } else {
    process.exitCode = 1;
  }
}

runSecurityAudit().catch(err => {
  console.error('Fatal audit error:', err);
  process.exitCode = 1;
});
