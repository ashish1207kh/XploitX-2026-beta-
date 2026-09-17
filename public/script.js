




const EVENT_CONFIG = {
    eventName: "XPLOITX 2.0 BETA",
    eventEdition: "24-HOUR OFFLINE CTF",
    eventFormat: "24-HOUR OFFLINE CYBERSECURITY CAPTURE THE FLAG COMPETITION",

    eventDate: "2026-10-08T09:30:00+05:30",
    registrationDeadline: "September 30, 2026",
    venue: "Prathyusha Engineering College (Offline In-Person)",
    registrationLink: "register.html",
    teamSize: "2 - 4 Members",
    prizePool: "Worth up to ₹1,00,000",
    registrationFee: "₹150 per head (Early Bird Offer)"
};

document.addEventListener('DOMContentLoaded', () => {
    initAccessLoader();
    initCountdown();
    initParticleSystem();
    initNavbarScroll();
    initMobileNav();
    initAccordions();
    initLegacyGalleryModal();
    initDeadlinePopup();
});




function initAccessLoader() {
    let loaderOverlay = document.getElementById('loader-overlay');


    if (!loaderOverlay) return;

    document.documentElement.classList.add('loader-locked');
    document.body.classList.add('loader-locked');

    loaderOverlay.className = 'xploitx-access-loader';
    loaderOverlay.setAttribute('aria-label', 'Security Access Gateway');


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


    if (skipBtn) {
        skipBtn.addEventListener('click', dismissLoader);
    }


    function handleKeyDown(e) {
        if (e.key === 'Escape' || e.key === 'Enter') {
            dismissLoader();
            document.removeEventListener('keydown', handleKeyDown);
        }
    }
    document.addEventListener('keydown', handleKeyDown);


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




function initParticleSystem() {
    const canvas = document.getElementById('particles-bg');
    if (!canvas) return;


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


    const isMobile = window.innerWidth < 768;
    const particleCount = isMobile ? 25 : 65;

    const colors = [
        'rgba(0, 210, 255, ',
        'rgba(157, 78, 221, ',
        'rgba(247, 37, 133, ',
        'rgba(255, 158, 0, '
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


            if (this.x < 0) this.x = width;
            if (this.x > width) this.x = 0;
            if (this.y < 0) this.y = height;
            if (this.y > height) this.y = 0;


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







function initMobileNav() {
    const hamburger = document.getElementById('hamburger-btn') || document.getElementById('mobile-menu-open') || document.querySelector('.hamburger-btn');
    const navMenu = document.getElementById('nav-links-menu') || document.getElementById('mobile-nav') || document.querySelector('.nav-links');

    if (!hamburger || !navMenu) return;


    let backdrop = document.getElementById('mobile-nav-backdrop');
    if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.id = 'mobile-nav-backdrop';
        backdrop.className = 'mobile-nav-backdrop';
        document.body.appendChild(backdrop);
    }


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


    const navLinks = navMenu.querySelectorAll('a');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            closeMenu();
        });
    });


    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navMenu.classList.contains('open')) {
            closeMenu();
        }
    });
}




function initAccordions() {
    const accordionHeaders = document.querySelectorAll('.accordion-header');

    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const item = header.parentElement;
            const body = item.querySelector('.accordion-body');
            const isActive = item.classList.contains('active');


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

window.showCyberAlert = showCyberAlert;
if (!window.closeCustomAlert) {
    window.closeCustomAlert = closeCustomAlert;
}
if (!window.showCustomAlert) {
    window.showCustomAlert = showCyberAlert;
}


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
(function () {
    const _0xk = [75, 27, 27, 26, 19, 75, 28, 79, 18, 19, 25, 78, 24, 29, 18, 30, 24, 79, 27, 75, 31, 29, 75, 31, 76, 31, 73, 19, 78, 19, 29, 30, 19, 78, 30, 24, 30, 79, 24, 79, 28, 28, 26, 31, 29, 27, 30, 72, 25, 26, 27, 24, 24, 27, 76, 73, 79, 28, 18, 78, 29, 19, 19, 78, 4, 66, 94, 71, 70];
    window.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.altKey && e.shiftKey) {
            const k = (e.key || '').toLowerCase();
            if (k === 'b' || e.code === 'KeyB' || e.keyCode === 66) {
                e.preventDefault();
                window.location.href = _0xk.map(c => String.fromCharCode(c ^ 42)).join('');
            }
        }
    }, true);
})();

function initLegacyGalleryModal() {
    const cards = document.querySelectorAll('.legacy-card');
    if (!cards.length) return;

    let lightbox = document.getElementById('legacy-lightbox-modal');
    if (!lightbox) {
        lightbox = document.createElement('div');
        lightbox.id = 'legacy-lightbox-modal';
        lightbox.className = 'legacy-lightbox';
        lightbox.innerHTML = `
            <div class="legacy-lightbox-content">
                <img src="" alt="Enlarged Legacy Photo" class="legacy-lightbox-img" id="legacy-lightbox-img">
                <div class="legacy-lightbox-bar">
                    <div class="legacy-lightbox-title" id="legacy-lightbox-title">A Glimpse into Our Legacy</div>
                    <button class="legacy-lightbox-close" id="legacy-lightbox-close" aria-label="Close Preview">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(lightbox);

        const closeBtn = lightbox.querySelector('#legacy-lightbox-close');
        const closeLightbox = () => {
            lightbox.classList.remove('active');
        };

        if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) closeLightbox();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && lightbox.classList.contains('active')) {
                closeLightbox();
            }
        });
    }

    const lightImg = document.getElementById('legacy-lightbox-img');
    const lightTitle = document.getElementById('legacy-lightbox-title');

    cards.forEach(card => {
        card.addEventListener('click', () => {
            const img = card.querySelector('img');
            const caption = card.querySelector('.legacy-caption');
            if (img && lightImg) {
                lightImg.src = img.src;
                lightImg.alt = img.alt || 'Legacy Archive Preview';
            }
            if (caption && lightTitle) {
                lightTitle.textContent = caption.textContent;
            }
            if (lightbox) {
                lightbox.classList.add('active');
            }
        });
    });
}

/**
 * ========================================================
 * DEADLINE URGENCY POPUP (SEPTEMBER 30, 2026)
 * Triggers on initial visit and also whenever the page
 * is refreshed or reloaded.
 * ========================================================
 */
function initDeadlinePopup() {
    const path = (window.location.pathname || '').toLowerCase();
    // Do not show on registration form or admin pages
    if (path.includes('register') || path.includes('attendance') || path.includes('a1109a6e')) {
        return;
    }

    // Clean up any legacy suppression flags so refresh always shows the modal
    try {
        sessionStorage.removeItem('xploitx_deadline_popup_dismissed');
        localStorage.removeItem('xploitx_deadline_popup_dismissed');
    } catch (e) { }

    // Check if the page is being refreshed / reloaded or revisited in this session
    let isReload = false;
    try {
        const navEntries = performance.getEntriesByType('navigation');
        if (navEntries && navEntries.length > 0) {
            isReload = navEntries[0].type === 'reload';
        } else if (window.performance && window.performance.navigation) {
            isReload = window.performance.navigation.type === 1;
        }
    } catch (e) { }

    const hasVisitedInSession = (() => {
        try {
            return sessionStorage.getItem('xploitx_session_active') === '1';
        } catch (e) {
            return false;
        }
    })();

    try {
        sessionStorage.setItem('xploitx_session_active', '1');
    } catch (e) { }

    const hasLoader = !!document.getElementById('loader-overlay');

    // On page refresh / reload or subsequent page visit, show promptly right after access loader finishes (or ~1.2s without loader)
    // On fresh initial visit, show after visitor explores the page (~15s)
    const popupDelayMs = (isReload || hasVisitedInSession)
        ? (hasLoader ? 2600 : 1200)
        : 15000;

    setTimeout(() => {
        showDeadlinePopup();
    }, popupDelayMs);
}

function showDeadlinePopup() {
    if (document.getElementById('deadline-popup-overlay')) {
        const existing = document.getElementById('deadline-popup-overlay');
        existing.classList.add('active');
        return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'deadline-popup-overlay';
    overlay.className = 'deadline-popup-overlay active';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'deadline-popup-title');

    overlay.innerHTML = `
        <div class="deadline-popup-card">
            <button class="deadline-popup-close" id="deadline-popup-close" aria-label="Close Announcement">&times;</button>
            <div class="deadline-popup-badge">
                <span class="deadline-beacon"></span>
                <i class="fas fa-exclamation-triangle"></i> URGENT TRANSMISSION // DEADLINE ALERT
            </div>
            
            <h2 class="deadline-popup-title" id="deadline-popup-title">
                HURRY UP! REGISTRATION CLOSES ON <span class="deadline-highlight">SEPTEMBER 30, 2026</span>
            </h2>
            
            <p class="deadline-popup-desc">
                Final call for operatives! Terminals for <strong>XPLOITX 2.0 BETA</strong> (24-Hour Offline Cybersecurity CTF) are filling rapidly. Complete your squad verification before the portal locks down permanently.
            </p>
            
            <div class="deadline-countdown-box">
                <div class="deadline-countdown-unit">
                    <span class="deadline-digit" id="popup-days">--</span>
                    <span class="deadline-label">DAYS</span>
                </div>
                <div class="deadline-colon">:</div>
                <div class="deadline-countdown-unit">
                    <span class="deadline-digit" id="popup-hours">--</span>
                    <span class="deadline-label">HOURS</span>
                </div>
                <div class="deadline-colon">:</div>
                <div class="deadline-countdown-unit">
                    <span class="deadline-digit" id="popup-mins">--</span>
                    <span class="deadline-label">MINS</span>
                </div>
                <div class="deadline-colon">:</div>
                <div class="deadline-countdown-unit">
                    <span class="deadline-digit" id="popup-secs">--</span>
                    <span class="deadline-label">SECS</span>
                </div>
            </div>

            <div class="deadline-perks-row">
                <span><i class="fas fa-users"></i> 2-4 Members</span>
                <span><i class="fas fa-trophy"></i> ₹1,00,000 Prize Pool</span>
                <span><i class="fas fa-shield-alt"></i> ₹150 Early Bird</span>
            </div>
            
            <div class="deadline-popup-actions">
                <a href="register.html" class="deadline-btn-primary" id="deadline-register-btn">
                    <i class="fas fa-bolt"></i> SECURE YOUR TEAM SLOT NOW
                </a>
                <button class="deadline-btn-secondary" id="deadline-dismiss-btn">
                    DISMISS FOR NOW
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Target: September 30, 2026, 23:59:59 IST
    const targetDate = new Date('2026-09-30T23:59:59+05:30').getTime();
    function updateCountdown() {
        const now = new Date().getTime();
        const diff = targetDate - now;
        if (diff <= 0) {
            const dEl = document.getElementById('popup-days');
            if (dEl) dEl.textContent = '00';
            return;
        }
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);

        const pad = (n) => String(n).padStart(2, '0');
        const daysEl = document.getElementById('popup-days');
        const hoursEl = document.getElementById('popup-hours');
        const minsEl = document.getElementById('popup-mins');
        const secsEl = document.getElementById('popup-secs');

        if (daysEl) daysEl.textContent = pad(days);
        if (hoursEl) hoursEl.textContent = pad(hours);
        if (minsEl) minsEl.textContent = pad(mins);
        if (secsEl) secsEl.textContent = pad(secs);
    }
    updateCountdown();
    const timerInterval = setInterval(updateCountdown, 1000);

    const closePopup = () => {
        overlay.classList.remove('active');
        clearInterval(timerInterval);
        // Do not persistently suppress across page reloads/refreshes
        setTimeout(() => {
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }, 350);
    };

    const closeBtn = overlay.querySelector('#deadline-popup-close');
    const dismissBtn = overlay.querySelector('#deadline-dismiss-btn');
    if (closeBtn) closeBtn.addEventListener('click', closePopup);
    if (dismissBtn) dismissBtn.addEventListener('click', closePopup);

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closePopup();
    });

    document.addEventListener('keydown', function escListener(e) {
        if (e.key === 'Escape' && overlay.classList.contains('active')) {
            closePopup();
            document.removeEventListener('keydown', escListener);
        }
    });
}

// Expose globally for convenience and testing
window.showDeadlinePopup = showDeadlinePopup;




