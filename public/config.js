/**
 * XploitX-2026 Frontend Configuration
 * 
 * When deploying backend to Render and frontend to Vercel:
 * 1. Default (Vercel Rewrites): API calls use relative paths ('/api/...'),
 *    which Vercel Edge proxies directly to Render with zero CORS issues.
 * 2. Cross-Origin Direct API: If you prefer direct client calls to Render,
 *    set RENDER_BACKEND_URL to your Render service URL (e.g. 'https://xploitx-backend.onrender.com').
 */
window.XPLOITX_CONFIG = {
    // Production Render backend URL
    RENDER_BACKEND_URL: 'https://xploitx-backend.onrender.com'
};

(function () {
    const isLocal = window.location.protocol === 'file:' ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';

    let resolvedApiBase = '';

    if (isLocal) {
        resolvedApiBase = 'http://localhost:3000';
    } else if (window.XPLOITX_CONFIG && window.XPLOITX_CONFIG.RENDER_BACKEND_URL && window.XPLOITX_CONFIG.RENDER_BACKEND_URL.trim()) {
        resolvedApiBase = window.XPLOITX_CONFIG.RENDER_BACKEND_URL.trim().replace(/\/+$/, '');
    } else {
        // Production default: relative URL (proxied by Vercel)
        resolvedApiBase = '';
    }

    window.API_BASE_URL = resolvedApiBase;

    // Fast Keep-Alive / Pre-warm ping for Render free-tier
    // Pings /api/health asynchronously on initial page load so Render is awake
    // before the user completes registration or admin login.
    function warmBackend() {
        const pingEndpoint = (window.API_BASE_URL || '') + '/api/health';
        try {
            fetch(pingEndpoint, { method: 'GET', cache: 'no-cache' })
                .then(function (r) { return r.json(); })
                .then(function (d) {
                    console.log('⚡ Backend connection established:', d.status);
                })
                .catch(function () {
                    // Silent fail on background warm-up
                });
        } catch (e) {}
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        warmBackend();
    } else {
        window.addEventListener('DOMContentLoaded', warmBackend);
    }
})();
