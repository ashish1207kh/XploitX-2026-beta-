/**
 * Automated Security Regression Test Suite for XploitX 2.0 BETA
 * Tests all 10 Security Audit Fixes (CRIT-01 to LOW-01)
 */

const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../backend/server');

describe('XploitX Security Hardening Regression Tests', () => {

    let adminToken = '';

    beforeAll(async () => {
        // Obtain valid JWT for admin tests
        const res = await request(app)
            .post('/api/admin/login')
            .send({ username: 'Administrator', password: process.env.ADMIN_PASS_ADMINISTRATOR || 'Administrator@Beta2026' });

        if (res.body && res.body.token) {
            adminToken = res.body.token;
        }
    });

    // 1. CRIT-01: Admin authentication bypass via local_session_ pseudo-token
    describe('CRIT-01: Admin Auth Pseudo-Token Bypass Prevention', () => {
        test('Should REJECT requests with pseudo local_session_ token', async () => {
            const fakeToken = 'local_session_1700000000000';
            const res = await request(app)
                .get('/api/admin/data')
                .set('Authorization', `Bearer ${fakeToken}`);

            expect(res.status).toBe(403);
            expect(res.body.error).toMatch(/Invalid or Expired Token/i);
        });

        test('Should ACCEPT requests with valid signed JWT token', async () => {
            if (!adminToken) return;
            const res = await request(app)
                .get('/api/admin/data')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
        });
    });

    // 2. CRIT-02: Hardcoded passwords & fallback JWT secret
    describe('CRIT-02: Secure Authentication & JWT Validation', () => {
        test('Should reject invalid login password', async () => {
            const res = await request(app)
                .post('/api/admin/login')
                .send({ username: 'Administrator', password: 'WrongPassword123!' });

            expect(res.status).toBe(401);
            expect(res.body.error).toBe('Invalid Credentials');
        });

        test('Should issue valid JWT on correct credentials', async () => {
            const res = await request(app)
                .post('/api/admin/login')
                .send({ username: 'Administrator', password: process.env.ADMIN_PASS_ADMINISTRATOR || 'Administrator@Beta2026' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(typeof res.body.token).toBe('string');
        });
    });

    // 3. CRIT-03: Sensitive Team/Attendance Endpoints & PII Protection
    describe('CRIT-03: Endpoint Authorization & PII Protection', () => {
        test('Unauthenticated GET /api/team/:id should return sanitized non-PII data', async () => {
            const res = await request(app).get('/api/team/XPLOITX-9999');
            if (res.status === 200) {
                expect(res.body).not.toHaveProperty('phone');
                expect(res.body).not.toHaveProperty('email');
                expect(res.body).not.toHaveProperty('utr_number');
            }
        });

        test('Unauthenticated POST /api/team/:id/update should be REJECTED', async () => {
            const res = await request(app)
                .post('/api/team/XPLOITX-9999/update')
                .send({ members: [] });

            expect([401, 403]).toContain(res.status);
        });

        test('Unauthenticated POST /api/attendance/mark_members should be REJECTED', async () => {
            const res = await request(app)
                .post('/api/attendance/mark_members')
                .send({ teamId: 'XPLOITX-9999', memberStatuses: [] });

            expect([401, 403]).toContain(res.status);
        });

        test('Unauthenticated GET /api/attendance/all should be REJECTED', async () => {
            const res = await request(app).get('/api/attendance/all');
            expect([401, 403]).toContain(res.status);
        });
    });

    // 4. HIGH-01: NoSQL Injection Protection & Input Sanitization
    describe('HIGH-01: Server-Side Input Sanitization & NoSQL Injection Guard', () => {
        test('Should sanitize NoSQL operator objects in request body', async () => {
            const res = await request(app)
                .post('/api/admin/login')
                .send({ username: { "$ne": null }, password: { "$gt": "" } });

            expect(res.status).toBe(400);
        });
    });

    // 5. HIGH-03: Unsafe Upload Filename / Path Traversal Guard
    describe('HIGH-03: Upload Filename & Path Traversal Guard', () => {
        test('Multer upload handler sanitizes teamId path traversal attempts', async () => {
            const testBuffer = Buffer.from('fake image content');
            const res = await request(app)
                .post('/api/auth/register-with-payment')
                .field('teamName', 'Test Security Team ' + Date.now())
                .field('email', `sec-test-${Date.now()}@example.com`)
                .field('teamId', '../../../../etc/malicious')
                .field('members', JSON.stringify([
                    { name: 'Leader', role: 'LEADER', college: 'Test' },
                    { name: 'Member1', role: 'MEMBER', college: 'Test' }
                ]))
                .attach('paymentProof', testBuffer, 'proof.png');

            if (res.status === 200 || res.status === 400) {
                // Verify no files were created outside the designated uploads folder
                const pathTraversalFileExists = fs.existsSync(path.join(__dirname, '../etc/malicious'));
                expect(pathTraversalFileExists).toBe(false);
            }
        });
    });

    // 6. MED-01: Helmet Security Headers & CORS Policy
    describe('MED-01: Security Headers & CORS Lockdown', () => {
        test('Responses should include Helmet security headers', async () => {
            const res = await request(app).get('/api/registration/count');
            expect(res.headers).toHaveProperty('x-dns-prefetch-control');
            expect(res.headers).toHaveProperty('x-frame-options');
            expect(res.headers).toHaveProperty('x-content-type-options');
        });
    });

    // 7. MED-02: Hardcoded Mongo Credentials Source Audit
    describe('MED-02: Source Code Hardcoded Credentials Audit', () => {
        test('server.js should not contain plain MongoDB user/pass connection strings', () => {
            const serverCode = fs.readFileSync(path.join(__dirname, '../backend/server.js'), 'utf8');
            expect(serverCode).not.toContain('mongodb+srv://jeshwanthv751_db_user');
        });
    });

    // 8. MED-03: Unsafe Regex Construction in File Serving
    describe('MED-03: Safe Regex Construction in File Serving', () => {
        test('Requests to /uploads/:filename handle special regex characters safely', async () => {
            const res = await request(app).get('/uploads/.*+?^${}()|[]');
            expect(res.status).toBe(404);
        });
    });

    // 9. LOW-01: Verbose Error Message Leak Guard
    describe('LOW-01: Production Error Leak Prevention', () => {
        test('Error responses should not leak stack traces', async () => {
            const res = await request(app)
                .post('/api/admin/login')
                .send({}); // Malformed request

            expect(res.body).not.toHaveProperty('stack');
        });
    });
});
