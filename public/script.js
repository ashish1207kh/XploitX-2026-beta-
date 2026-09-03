/**
 * XPLOITX 2.0 BETA - Core Application Script
 * 24-Hour Cybersecurity Capture The Flag Competition
 * Department of Cyber Security | Prathyusha Engineering College
 */

// ==========================================
// 1. EVENT CONFIGURATION (EASILY CUSTOMIZABLE)
// ==========================================
const EVENT_CONFIG = {
    eventName: "XPLOITX 2.0 BETA",
    eventEdition: "24-HOUR OFFLINE CTF",
    eventFormat: "24-HOUR OFFLINE CYBERSECURITY CAPTURE THE FLAG COMPETITION",
    // Configurable Target Date: 9 October 2026 00:00:00 IST
    eventDate: "2026-10-09T00:00:00+05:30",
    venue: "Prathyusha Engineering College (Offline In-Person)",
    registrationLink: "register.html",
    teamSize: "2 - 4 Members",
    prizePool: "[TBA - Awaiting Official Release]",
    registrationFee: "₹250 per head"
};

document.addEventListener('DOMContentLoaded', () => {
    initAccessLoader();
    initCountdown();
    initParticleSystem();
    initNavbarScroll();
    initMobileNav();
    initAccordions();
});

// ==========================================
// 1B. XPLOITX "ACCESS GRANTED" LOADER ENGINE
// ==========================================
function initAccessLoader() {
    let loaderOverlay = document.getElementById('loader-overlay');

    // The loader is ONLY for index.html. If no loader-overlay element exists, exit immediately.
    if (!loaderOverlay) return;
    
    document.documentElement.classList.add('loader-locked');
    document.body.classList.add('loader-locked');
    
    loaderOverlay.className = 'xploitx-access-loader';
    loaderOverlay.setAttribute('aria-label', 'Security Access Gateway');

    // Build Loader Content
    loaderOverlay.innerHTML = `
        <div class="loader-bg-grid"></div>
        <div class="loader-scanline"></div>
        <div class="loader-radial-glow"></div>
        <canvas id="loader-particles-canvas"></canvas>
        <div class="loader-content-box">
            <div class="loader-cyber-emblem">
                <svg class="cyber-ring-svg" viewBox="0 0 160 160" width="160" height="160">
                    <circle class="ring-track" cx="80" cy="80" r="70" />
                    <circle class="ring-progress" cx="80" cy="80" r="70" id="loader-ring-progress" />
                </svg>
                <div class="loader-icon-center" id="loader-icon-wrap">
                    <i class="fas fa-satellite-dish loader-state-icon" id="loader-state-icon"></i>
                </div>
            </div>

            <div class="loader-status-wrapper">
                <div class="loader-status-step" id="loader-step-label">SECURE CONNECTION</div>
                <div class="loader-status-detail" id="loader-status-detail">INITIALIZING...</div>
            </div>

            <div class="loader-progress-bar-container" id="loader-progress-wrap">
                <div class="loader-progress-fill" id="loader-progress-fill"></div>
            </div>

            <div class="loader-granted-reveal-box" id="loader-granted-box">
                <div class="loader-horizontal-scan"></div>
                <img src="xploitx_logo.png" alt="XPLOITX 2.0 BETA Logo" class="loader-logo-img" id="loader-logo-img">
                <div class="loader-granted-text" id="loader-granted-text">
                    <span class="granted-word">ACCESS</span>
                    <span class="granted-word highlight">GRANTED</span>
                </div>
            </div>
        </div>
    `;

    // Lock body scroll
    document.documentElement.classList.add('loader-locked');
    document.body.classList.add('loader-locked');

    const ringProgress = document.getElementById('loader-ring-progress');
    const stateIcon = document.getElementById('loader-state-icon');
    const stepLabel = document.getElementById('loader-step-label');
    const statusDetail = document.getElementById('loader-status-detail');
    const progressFill = document.getElementById('loader-progress-fill');
    const progressWrap = document.getElementById('loader-progress-wrap');
    const grantedBox = document.getElementById('loader-granted-box');
    const canvas = document.getElementById('loader-particles-canvas');
    const skipBtn = document.getElementById('loader-skip-btn');

    let animationFrameId = null;
    let timeouts = [];

    function dismissLoader() {
        timeouts.forEach(t => clearTimeout(t));
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        loaderOverlay.classList.add('fade-out');
        document.documentElement.classList.remove('loader-locked');
        document.body.classList.remove('loader-locked');
        setTimeout(() => {
            if (loaderOverlay && loaderOverlay.parentNode) {
                loaderOverlay.style.display = 'none';
            }
        }, 450);
    }

    // Skip Button Event Listeners
    if (skipBtn) {
        skipBtn.addEventListener('click', dismissLoader);
    }
    
    // Key Listener for Escape Key or Skip
    function handleKeyDown(e) {
        if (e.key === 'Escape' || e.key === 'Enter') {
            dismissLoader();
            document.removeEventListener('keydown', handleKeyDown);
        }
    }
    document.addEventListener('keydown', handleKeyDown);

    // Cyan/Green Particle Background
    if (canvas && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const ctx = canvas.getContext('2d');
        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;

        const particles = Array.from({ length: 25 }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 1.4 + 0.6,
            vx: (Math.random() - 0.5) * 0.7,
            vy: (Math.random() - 0.5) * 0.7,
            alpha: Math.random() * 0.5 + 0.2,
            color: Math.random() > 0.3 ? '#00f0ff' : '#00ff66'
        }));

        function drawParticles() {
            ctx.clearRect(0, 0, width, height);
            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0) p.x = width;
                if (p.x > width) p.x = 0;
                if (p.y < 0) p.y = height;
                if (p.y > height) p.y = 0;
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.alpha;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fill();
            });
            animationFrameId = requestAnimationFrame(drawParticles);
        }
        drawParticles();
    }

    const circumference = 2 * Math.PI * 70;
    function setProgress(percent) {
        if (progressFill) progressFill.style.width = percent + '%';
        if (ringProgress) {
            const offset = circumference - (percent / 100) * circumference;
            ringProgress.style.strokeDashoffset = offset;
        }
    }

    function schedule(fn, delay) {
        const t = setTimeout(fn, delay);
        timeouts.push(t);
        return t;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setProgress(100);
        if (progressWrap) progressWrap.style.opacity = '0';
        if (grantedBox) grantedBox.classList.add('active');
        schedule(dismissLoader, 300);
        return;
    }

    // Crisp Fast Sequence (~2.0s total)
    setProgress(20);
    
    schedule(() => { 
        if (stepLabel) stepLabel.textContent = "AUTHENTICATING";
        if (statusDetail) statusDetail.textContent = "OPERATIVE CREDENTIALS...";
        if (stateIcon) stateIcon.className = "fas fa-user-shield loader-state-icon";
        setProgress(55); 
    }, 320);

    schedule(() => {
        if (stepLabel) stepLabel.textContent = "SECURITY CHECK";
        if (statusDetail) {
            statusDetail.textContent = "SECURITY VERIFIED ✓";
            statusDetail.classList.add("success");
        }
        if (stateIcon) stateIcon.className = "fas fa-shield-alt loader-state-icon state-verified";
        if (ringProgress) ringProgress.classList.add("verified");
        setProgress(100);
    }, 720);

    schedule(() => {
        const emblem = document.querySelector('.loader-cyber-emblem');
        if (emblem) {
            emblem.style.opacity = '0';
            emblem.style.visibility = 'hidden';
            emblem.style.height = '0';
            emblem.style.margin = '0';
            emblem.style.transition = 'all 0.3s ease';
        }
        if (progressWrap) {
            progressWrap.style.opacity = '0';
            progressWrap.style.height = '0';
            progressWrap.style.margin = '0';
        }
        const statusWrapper = document.querySelector('.loader-status-wrapper');
        if (statusWrapper) {
            statusWrapper.style.opacity = '0';
            statusWrapper.style.visibility = 'hidden';
            statusWrapper.style.height = '0';
            statusWrapper.style.minHeight = '0';
            statusWrapper.style.margin = '0';
        }
        if (grantedBox) grantedBox.classList.add('active');
    }, 1100);

    schedule(() => {
        dismissLoader();
    }, 2100);
}


// ==========================================
// 2. COUNTDOWN TIMER ENGINE
// ==========================================
function initCountdown() {
    const daysEl = document.getElementById('cd-days');
    const hoursEl = document.getElementById('cd-hours');
    const minutesEl = document.getElementById('cd-minutes');
    const secondsEl = document.getElementById('cd-seconds');

    if (!daysEl || !hoursEl || !minutesEl || !secondsEl) return;

    const targetTime = new Date(EVENT_CONFIG.eventDate).getTime();

    function updateTimer() {
        const now = new Date().getTime();
        const difference = targetTime - now;

        if (difference <= 0) {
            daysEl.textContent = "00";
            hoursEl.textContent = "00";
            minutesEl.textContent = "00";
            secondsEl.textContent = "00";
            return;
        }

        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        daysEl.textContent = String(days).padStart(2, '0');
        hoursEl.textContent = String(hours).padStart(2, '0');
        minutesEl.textContent = String(minutes).padStart(2, '0');
        secondsEl.textContent = String(seconds).padStart(2, '0');
    }

    updateTimer();
    setInterval(updateTimer, 1000);
}

// ==========================================
// 3. LIGHTWEIGHT STAR & NODE PARTICLE SYSTEM
// ==========================================
function initParticleSystem() {
    const canvas = document.getElementById('particles-bg');
    if (!canvas) return;

    // Check for reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        canvas.style.display = 'none';
        return;
    }

    const ctx = canvas.getContext('2d');
    let width, height;
    let particles = [];
    let mouse = { x: null, y: null, radius: 100 };

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // Limit particle count based on screen size for performance
    const isMobile = window.innerWidth < 768;
    const particleCount = isMobile ? 25 : 65;

    const colors = [
        'rgba(0, 210, 255, ',   // Electric Blue
        'rgba(157, 78, 221, ',  // Neon Purple
        'rgba(247, 37, 133, ',  // Deep Magenta
        'rgba(255, 158, 0, '    // Cosmic Orange
    ];

    class Particle {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.radius = Math.random() * 2 + 0.5;
            this.colorBase = colors[Math.floor(Math.random() * colors.length)];
            this.alpha = Math.random() * 0.6 + 0.2;
            this.vx = (Math.random() - 0.5) * 0.35;
            this.vy = (Math.random() - 0.5) * 0.35;
            this.density = Math.random() * 20 + 1;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.colorBase + this.alpha + ')';
            ctx.fill();
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;

            // Wrap around edges
            if (this.x < 0) this.x = width;
            if (this.x > width) this.x = 0;
            if (this.y < 0) this.y = height;
            if (this.y > height) this.y = 0;

            // Mouse interaction on desktop
            if (!isMobile && mouse.x !== null) {
                let dx = mouse.x - this.x;
                let dy = mouse.y - this.y;
                let distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < mouse.radius) {
                    let force = (mouse.radius - distance) / mouse.radius;
                    let directionX = (dx / distance) * force * this.density * 0.4;
                    let directionY = (dy / distance) * force * this.density * 0.4;
                    this.x -= directionX;
                    this.y -= directionY;
                }
            }
        }
    }

    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }

    if (!isMobile) {
        window.addEventListener('mousemove', (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        });
        window.addEventListener('mouseout', () => {
            mouse.x = null;
            mouse.y = null;
        });
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);

        // Draw connections between nearby particles
        for (let a = 0; a < particles.length; a++) {
            for (let b = a + 1; b < particles.length; b++) {
                let dx = particles[a].x - particles[b].x;
                let dy = particles[a].y - particles[b].y;
                let dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < (isMobile ? 70 : 110)) {
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(0, 210, 255, ${0.15 * (1 - dist / (isMobile ? 70 : 110))})`;
                    ctx.lineWidth = 0.5;
                    ctx.moveTo(particles[a].x, particles[a].y);
                    ctx.lineTo(particles[b].x, particles[b].y);
                    ctx.stroke();
                }
            }
        }

        particles.forEach(p => {
            p.update();
            p.draw();
        });

        requestAnimationFrame(animate);
    }
    animate();
}

// ==========================================
// 4. NAVBAR SCROLL & ACTIVE STATE
// ==========================================
function initNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('section[id]');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 40) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        // Active link scroll spy
        let currentSection = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 120;
            if (window.scrollY >= sectionTop) {
                currentSection = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${currentSection}`) {
                link.classList.add('active');
            }
        });
    });
}

// ==========================================
// 5. MOBILE NAVIGATION TOGGLE
// ==========================================
// ==========================================
// 5. REDESIGNED FULL-VIEWPORT MOBILE NAVIGATION SYSTEM
// ==========================================
function initMobileNav() {
    const hamburger = document.getElementById('hamburger-btn') || document.getElementById('mobile-menu-open') || document.querySelector('.hamburger-btn');
    const navMenu = document.getElementById('nav-links-menu') || document.getElementById('mobile-nav') || document.querySelector('.nav-links');

    if (!hamburger || !navMenu) return;

    // 1. Ensure Backdrop Element Exists
    let backdrop = document.getElementById('mobile-nav-backdrop');
    if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.id = 'mobile-nav-backdrop';
        backdrop.className = 'mobile-nav-backdrop';
        document.body.appendChild(backdrop);
    }

    // 2. Ensure Menu Header with Dedicated Close Button Exists inside navMenu
    let drawerHeader = navMenu.querySelector('.mobile-drawer-header');
    if (!drawerHeader) {
        drawerHeader = document.createElement('div');
        drawerHeader.className = 'mobile-drawer-header';
        drawerHeader.innerHTML = `
            <div class="mobile-drawer-brand">
                <span class="mobile-brand-title">XPLOITX</span>
                <span class="mobile-brand-tag">2.0 BETA</span>
            </div>
            <button class="mobile-drawer-close" id="mobile-drawer-close" aria-label="Close navigation" tabindex="0">
                <i class="fas fa-times"></i>
            </button>
        `;
        navMenu.insertBefore(drawerHeader, navMenu.firstChild);
    }

    // 3. Ensure Dedicated Menu Footer Exists inside navMenu
    let drawerFooter = navMenu.querySelector('.mobile-drawer-footer');
    if (!drawerFooter) {
        drawerFooter = document.createElement('div');
        drawerFooter.className = 'mobile-drawer-footer';
        drawerFooter.innerHTML = `
            <div class="mobile-footer-text">XPLOITX 2.0 BETA</div>
            <div class="mobile-footer-sub">24-HOUR CYBERSECURITY CTF • 09 OCT 2026</div>
        `;
        navMenu.appendChild(drawerFooter);
    }

    const closeBtn = document.getElementById('mobile-drawer-close');

    function openMenu() {
        navMenu.classList.add('open');
        if (backdrop) backdrop.classList.add('active');
        document.documentElement.classList.add('mobile-nav-active');
        document.body.classList.add('mobile-nav-active');
        hamburger.setAttribute('aria-expanded', 'true');
        if (closeBtn) closeBtn.focus();
    }

    function closeMenu() {
        navMenu.classList.remove('open');
        if (backdrop) backdrop.classList.remove('active');
        document.documentElement.classList.remove('mobile-nav-active');
        document.body.classList.remove('mobile-nav-active');
        hamburger.setAttribute('aria-expanded', 'false');
        hamburger.focus();
    }

    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.setAttribute('aria-label', 'Open navigation menu');
    if (navMenu.id) hamburger.setAttribute('aria-controls', navMenu.id);

    hamburger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (navMenu.classList.contains('open')) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeMenu();
        });
    }

    if (backdrop) {
        backdrop.addEventListener('click', closeMenu);
    }

    // Automatically close menu when any navigation link is tapped
    const navLinks = navMenu.querySelectorAll('a');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            closeMenu();
        });
    });

    // Escape Key Handler
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navMenu.classList.contains('open')) {
            closeMenu();
        }
    });
}

// ==========================================
// 6. ACCORDION COMPONENT (RULES & FAQ)
// ==========================================
function initAccordions() {
    const accordionHeaders = document.querySelectorAll('.accordion-header');

    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const item = header.parentElement;
            const body = item.querySelector('.accordion-body');
            const isActive = item.classList.contains('active');

            // Close siblings in same accordion group
            const group = item.closest('.accordion-group');
            if (group) {
                group.querySelectorAll('.accordion-item').forEach(sibling => {
                    if (sibling !== item) {
                        sibling.classList.remove('active');
                        sibling.querySelector('.accordion-body').style.maxHeight = null;
                    }
                });
            }

            if (isActive) {
                item.classList.remove('active');
                body.style.maxHeight = null;
            } else {
                item.classList.add('active');
                body.style.maxHeight = body.scrollHeight + 'px';
            }
        });
    });
}

// ==========================================
// 8. GLOBAL CYBER HUD ALERT DIALOG SYSTEM
// ==========================================
window.currentAlertCallback = null;

function showCyberAlert(msg, title = 'SYSTEM ALERT', callback = null) {
    if (typeof title === 'function') {
        callback = title;
        title = 'SYSTEM ALERT';
    }
    window.currentAlertCallback = callback;

    let doomMsg = document.getElementById('custom-alert-msg');
    let doomOverlay = document.getElementById('custom-alert-overlay');
    if (doomOverlay && doomMsg) {
        doomMsg.innerText = msg;
        doomOverlay.style.display = 'flex';
        return;
    }

    let alertModal = document.getElementById('custom-alert-modal');
    if (!alertModal) {
        alertModal = document.createElement('div');
        alertModal.className = 'hud-modal-overlay';
        alertModal.id = 'custom-alert-modal';
        alertModal.innerHTML = `
            <div class="hud-modal-card alert-modal-card" style="border: 2px solid #ffd700; box-shadow: 0 15px 45px rgba(0,0,0,0.8), 0 0 30px rgba(255, 215, 0, 0.4); max-width: 480px; width: 92%; background: rgba(4, 10, 26, 0.93); backdrop-filter: blur(8px); border-radius: 8px; padding: 32px 24px; text-align: center; margin: auto; animation: modalPop 0.3s cubic-bezier(0.16, 1, 0.3, 1);">
                <div class="modal-icon-glow alert-icon-glow" style="color: #ffd700; font-size: 3.2rem; text-shadow: 0 0 25px rgba(255, 215, 0, 0.6); margin-bottom: 14px;">
                    <i class="fas fa-exclamation-triangle" id="custom-alert-icon"></i>
                </div>
                <h3 class="modal-title" id="custom-alert-title" style="font-size: 1.3rem; font-weight: 900; letter-spacing: 2px; color: #ffffff; margin-bottom: 12px; font-family: 'Orbitron', 'Share Tech Mono', sans-serif;">${title}</h3>
                <p class="modal-msg" id="custom-alert-msg" style="font-size: 1.05rem; color: #d1d5db; margin-bottom: 24px; font-family: 'Rajdhani', 'Space Grotesk', sans-serif; line-height: 1.5; font-weight: 600;"></p>
                <div class="modal-actions" style="display: flex; justify-content: center;">
                    <button type="button" class="btn-modal-close" onclick="closeCustomAlert()" style="background: #ffd700; color: #000000; font-weight: 900; border: none; padding: 11px 28px; border-radius: 4px; cursor: pointer; font-family: 'Orbitron', sans-serif; letter-spacing: 1.5px; font-size: 0.95rem; transition: all 0.2s ease; box-shadow: 0 0 15px rgba(255, 215, 0, 0.4);">[ ACKNOWLEDGE ]</button>
                </div>
            </div>
        `;
        document.body.appendChild(alertModal);
    }
    
    const msgEl = alertModal.querySelector('#custom-alert-msg');
    const titleEl = alertModal.querySelector('#custom-alert-title');
    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = msg;
    
    alertModal.classList.add('active');
}

function closeCustomAlert() {
    const alertModal = document.getElementById('custom-alert-modal');
    if (alertModal) {
        alertModal.classList.remove('active');
    }
    const doomOverlay = document.getElementById('custom-alert-overlay');
    if (doomOverlay) {
        doomOverlay.style.display = 'none';
    }
    if (typeof window.currentAlertCallback === 'function') {
        const cb = window.currentAlertCallback;
        window.currentAlertCallback = null;
        cb();
    }
}

window.closeCustomAlert = closeCustomAlert;
window.showCyberAlert = showCyberAlert;
window.showCustomAlert = showCyberAlert;

// Override native browser alert globally to use HUD dialog
window.alert = function (msg, title = 'SYSTEM ALERT') {
    showCyberAlert(msg, title);
};

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'Enter') {
        const alertModal = document.getElementById('custom-alert-modal');
        const doomOverlay = document.getElementById('custom-alert-overlay');
        if ((alertModal && alertModal.classList.contains('active')) || (doomOverlay && doomOverlay.style.display !== 'none')) {
            closeCustomAlert();
        }
    }
});


