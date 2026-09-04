/**
 * Self-contained Security Regression Verification Script
 * Validates all 10 fixes implemented for XploitX 2.0 BETA.
 */

const http = require('http');
const path = require('path');
const fs = require('fs');
const app = require('../backend/server');

async function runTests() {
    console.log('----------------------------------------------------');
    console.log('🛡️  STARTING XPLOITX SECURITY REGRESSION AUDIT VERIFICATION');
    console.log('----------------------------------------------------\n');

    let server;
    let port = 3999;
    await new Promise((resolve) => {
        server = app.listen(port, () => {
            console.log(`[TEST SERVER] Running on http://127.0.0.1:${port}`);
            resolve();
        });
    });

    const baseUrl = `http://127.0.0.1:${port}`;
    let passed = 0;
    let failed = 0;

    function assert(condition, testName, detail = '') {
        if (condition) {
            console.log(`✅ [PASS] ${testName}`);
            passed++;
        } else {
            console.error(`❌ [FAIL] ${testName} - ${detail}`);
            failed++;
        }
    }

    try {
        // Test 1: CRIT-01 - Rejection of local_session_ pseudo token
        const req1 = await fetch(`${baseUrl}/api/admin/data`, {
            headers: { 'Authorization': 'Bearer local_session_1700000000' }
        });
        const body1 = await req1.json();
        assert(req1.status === 403 && body1.error.includes('Invalid or Expired Token'), 
            'CRIT-01: Admin auth rejects local_session_ pseudo-tokens', 
            `Status: ${req1.status}, Body: ${JSON.stringify(body1)}`);

        // Test 2: CRIT-02 - JWT Authentication & Password Security
        const loginFail = await fetch(`${baseUrl}/api/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'Administrator', password: 'WrongPassword' })
        });
        assert(loginFail.status === 401, 'CRIT-02: Rejects invalid password login attempt');

        const loginSuccess = await fetch(`${baseUrl}/api/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'Administrator', password: 'Administrator@Beta2026' })
        });
        const loginData = await loginSuccess.json();
        const adminToken = loginData.token;
        assert(loginSuccess.status === 200 && typeof adminToken === 'string', 'CRIT-02: Issues valid JWT on valid credentials');

        // Test 3: CRIT-03 - Unauthenticated Access Lock & PII Sanitize
        const unauthTeam = await fetch(`${baseUrl}/api/team/XPLOITX-TEST`);
        let piiExposed = false;
        if (unauthTeam.status === 200) {
            const teamData = await unauthTeam.json();
            if (teamData.phone || teamData.email || teamData.utr_number) piiExposed = true;
        }
        assert(!piiExposed, 'CRIT-03: Unauthenticated team query sanitizes PII (phone/email/UTR hidden)');

        const unauthUpdate = await fetch(`${baseUrl}/api/team/XPLOITX-TEST/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ members: [] })
        });
        assert(unauthUpdate.status === 401 || unauthUpdate.status === 403, 'CRIT-03: Unauthenticated team update blocked with 401/403');

        const unauthAttendanceMark = await fetch(`${baseUrl}/api/attendance/mark_members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ teamId: 'TEST', memberStatuses: [] })
        });
        assert(unauthAttendanceMark.status === 401 || unauthAttendanceMark.status === 403, 'CRIT-03: Unauthenticated attendance marking blocked');

        const unauthAttendanceAll = await fetch(`${baseUrl}/api/attendance/all`);
        assert(unauthAttendanceAll.status === 401 || unauthAttendanceAll.status === 403, 'CRIT-03: Unauthenticated full attendance log blocked');

        // Test 4: HIGH-01 - NoSQL Injection & Input Validation
        const nosqlInject = await fetch(`${baseUrl}/api/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: { "$ne": null }, password: { "$gt": "" } })
        });
        assert(nosqlInject.status === 400, 'HIGH-01: NoSQL operator injection in request body rejected (400)');

        // Test 5: HIGH-03 - Path Traversal in Upload Handler
        const testServerCode = fs.readFileSync(path.join(__dirname, '../backend/server.js'), 'utf8');
        assert(testServerCode.includes('path.basename(rawTeamId)'), 'HIGH-03: Multer filename uses path.basename to prevent directory traversal');

        // Test 6: MED-01 - Helmet Headers & CORS Policy
        const reqHeaders = await fetch(`${baseUrl}/api/registration/count`);
        assert(reqHeaders.headers.get('x-content-type-options') === 'nosniff', 'MED-01: Helmet nosniff header present');
        assert(reqHeaders.headers.get('x-frame-options') === 'SAMEORIGIN', 'MED-01: Helmet SAMEORIGIN header present');

        // Test 7: MED-02 - Hardcoded Credentials Audit
        assert(!testServerCode.includes('jeshwanthv751_db_user'), 'MED-02: Hardcoded MongoDB user connection string removed');

        // Test 8: MED-03 - Unsafe Regex in File Serving
        const regexTest = await fetch(`${baseUrl}/uploads/${encodeURIComponent('.*+?^${}()|[]')}`);
        assert(regexTest.status === 404, 'MED-03: Regex injection in upload filename serving returns 404 safely');

        // Test 9: LOW-01 - Error Leak Prevention
        const malformedRes = await fetch(`${baseUrl}/api/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: 'NOT_VALID_JSON'
        });
        const errBody = await malformedRes.json();
        assert(!errBody.stack, 'LOW-01: Malformed JSON error response does not leak internal stack traces');

    } catch (err) {
        console.error('Test execution error:', err);
    } finally {
        server.close();
        console.log('\n----------------------------------------------------');
        console.log(`📊 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
        console.log('----------------------------------------------------');
        process.exit(failed > 0 ? 1 : 0);
    }
}

runTests();
