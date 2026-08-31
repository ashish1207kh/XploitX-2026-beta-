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
    initCountdown();
    initParticleSystem();
    initNavbarScroll();
    initMobileNav();
    initAccordions();
});

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
function initMobileNav() {
    const hamburger = document.getElementById('hamburger-btn');
    const navMenu = document.getElementById('nav-links-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    if (!hamburger || !navMenu) return;

    hamburger.addEventListener('click', () => {
        navMenu.classList.toggle('open');
        const isOpen = navMenu.classList.contains('open');
        hamburger.innerHTML = isOpen ? '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
    });

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('open');
            hamburger.innerHTML = '<i class="fas fa-bars"></i>';
        });
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
