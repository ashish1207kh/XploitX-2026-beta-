/**
 * XPLOITX 2.0 BETA - Comprehensive Registration Engine
 * 24-Hour Cybersecurity Capture The Flag
 * Department of Cyber Security | Prathyusha Engineering College
 */

// ==========================================
// 0. GLOBAL CYBER HUD ALERT DIALOG ENGINE
// ==========================================
function showCyberAlert(msg, title = 'SYSTEM ALERT') {
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
    
    const msgEl = document.getElementById('custom-alert-msg');
    const titleEl = document.getElementById('custom-alert-title');
    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = msg;
    
    alertModal.classList.add('active');
}

function closeCustomAlert() {
    const alertModal = document.getElementById('custom-alert-modal');
    if (alertModal) {
        alertModal.classList.remove('active');
    }
}

window.closeCustomAlert = closeCustomAlert;
window.showCyberAlert = showCyberAlert;
window.alert = function (msg) {
    showCyberAlert(msg);
};

let memberCount = 1; // Leader is Slot 1
const MIN_MEMBERS = 2;
const MAX_MEMBERS = 4;
const PER_HEAD_FEE = 250;
let isEmailVerified = false;

document.addEventListener('DOMContentLoaded', () => {
    initCyberBackground();
    initWireframeGlobe();
    initWaveformVisualizer();
    initMemberManagement();
    initOtpFlow();
    initFormSubmission();
    initRealtimeInputSanitizers();
    updateFeeCalculations();
});

// ==========================================
// 1. CYBER BACKGROUND PARTICLES & CIRCUIT NODES
// ==========================================
function initCyberBackground() {
    const canvas = document.getElementById('cyber-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let width, height;
    let particles = [];

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const count = window.innerWidth < 768 ? 20 : 45;
    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            radius: Math.random() * 1.5 + 0.5,
            color: Math.random() > 0.2 ? '#00ff66' : '#ffd700',
            alpha: Math.random() * 0.5 + 0.2
        });
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);

        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 100) {
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(0, 255, 102, ${0.12 * (1 - dist / 100)})`;
                    ctx.lineWidth = 0.5;
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }

        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < 0 || p.x > width) p.vx *= -1;
            if (p.y < 0 || p.y > height) p.vy *= -1;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.fill();
            ctx.globalAlpha = 1.0;
        });

        requestAnimationFrame(animate);
    }
    animate();
}

// ==========================================
// 2. 3D WIREFRAME CYBER GLOBE VISUALIZER
// ==========================================
function initWireframeGlobe() {
    const canvas = document.getElementById('globe-wireframe-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = 48;
    let angle = 0;

    function renderGlobe() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 255, 102, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();

        for (let lat = -2; lat <= 2; lat++) {
            const yOffset = (lat / 3) * (radius * 0.85);
            const rLat = Math.sqrt(radius * radius - yOffset * yOffset);
            ctx.beginPath();
            ctx.ellipse(cx, cy + yOffset, rLat, rLat * 0.35, 0, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(0, 255, 102, 0.22)';
            ctx.lineWidth = 0.75;
            ctx.stroke();
        }

        for (let i = 0; i < 4; i++) {
            const rot = angle + (i * Math.PI / 4);
            const rx = Math.abs(Math.sin(rot)) * radius;
            ctx.beginPath();
            ctx.ellipse(cx, cy, rx, radius, 0, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0, 255, 102, ${0.15 + 0.2 * Math.abs(Math.cos(rot))})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
        }

        const sweepX = cx + Math.cos(angle * 1.5) * radius;
        const sweepY = cy + Math.sin(angle * 1.5) * radius;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(sweepX, sweepY);
        ctx.strokeStyle = 'rgba(0, 255, 102, 0.6)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        angle += 0.025;
        requestAnimationFrame(renderGlobe);
    }
    renderGlobe();
}

// ==========================================
// 3. AUDIO FREQUENCY OSCILLOSCOPE WAVEFORM
// ==========================================
function initWaveformVisualizer() {
    const canvas = document.getElementById('waveform-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let phase = 0;

    function renderWaveform() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const w = canvas.width;
        const h = canvas.height;
        const midY = h / 2;

        ctx.beginPath();
        ctx.moveTo(0, midY);

        for (let x = 0; x < w; x++) {
            const normX = x / w;
            const y1 = Math.sin(normX * 12 + phase) * (h * 0.28);
            const y2 = Math.sin(normX * 24 - phase * 1.8) * (h * 0.12);
            const y3 = (Math.random() - 0.5) * (h * 0.06);
            const y = midY + y1 + y2 + y3;
            ctx.lineTo(x, y);
        }

        ctx.strokeStyle = '#00ff66';
        ctx.lineWidth = 1.4;
        ctx.shadowColor = 'rgba(0, 255, 102, 0.8)';
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.shadowBlur = 0;

        phase += 0.08;
        requestAnimationFrame(renderWaveform);
    }
    renderWaveform();
}

// ==========================================
// REAL-TIME INPUT SANITIZATION & KEYSTROKE RESTRICTIONS
// ==========================================
function initRealtimeInputSanitizers() {
    // 1. Phone & WhatsApp & OTP fields (Strict Digits Only, Max 10 digits for phone)
    document.querySelectorAll('#leaderPhone, #leaderWhatsapp, .m-phone, #otpCode').forEach(input => {
        if (!input.dataset.sanitizerAttached) {
            input.dataset.sanitizerAttached = 'true';
            input.addEventListener('input', function () {
                this.value = this.value.replace(/[^0-9]/g, '');
                if (this.id === 'otpCode' && this.value.length > 6) {
                    this.value = this.value.slice(0, 6);
                } else if (this.value.length > 10 && this.id !== 'otpCode') {
                    this.value = this.value.slice(0, 10);
                }
            });
            input.addEventListener('keydown', function (e) {
                if (e.key && e.key.length === 1 && !/[0-9]/.test(e.key) && !e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                }
            });
        }
    });

    // 2. Age fields (Strict Digits Only, Max 2 Digits)
    document.querySelectorAll('#leaderAge, .m-age').forEach(input => {
        if (!input.dataset.sanitizerAttached) {
            input.dataset.sanitizerAttached = 'true';
            input.addEventListener('input', function () {
                this.value = this.value.replace(/[^0-9]/g, '').slice(0, 2);
            });
            input.addEventListener('keydown', function (e) {
                if (e.key && e.key.length === 1 && !/[0-9]/.test(e.key) && !e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                }
            });
        }
    });

    // 3. Full Name fields (Strict Letters, Spaces, Dots, Hyphens - NO Digits)
    document.querySelectorAll('#leaderName, .m-name').forEach(input => {
        if (!input.dataset.sanitizerAttached) {
            input.dataset.sanitizerAttached = 'true';
            input.addEventListener('input', function () {
                this.value = this.value.replace(/[^a-zA-Z\s.'-]/g, '');
            });
            input.addEventListener('keydown', function (e) {
                if (e.key && /[0-9]/.test(e.key)) {
                    e.preventDefault();
                }
            });
        }
    });

    // 4. Email fields (No Whitespaces Allowed)
    document.querySelectorAll('#leaderEmail, .m-email').forEach(input => {
        if (!input.dataset.sanitizerAttached) {
            input.dataset.sanitizerAttached = 'true';
            input.addEventListener('input', function () {
                this.value = this.value.replace(/\s/g, '');
            });
        }
    });

    // 5. UTR Number field (Alphanumeric, Uppercase, Max 20)
    document.querySelectorAll('#utrNumber').forEach(input => {
        if (!input.dataset.sanitizerAttached) {
            input.dataset.sanitizerAttached = 'true';
            input.addEventListener('input', function () {
                this.value = this.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 20);
            });
        }
    });

    // 6. College & District fields (Letters, spaces, dots, hyphens, slashes, ampersands - NO Digits)
    document.querySelectorAll('#leaderCollege, #leaderDistrict, .m-college, .m-district').forEach(input => {
        if (!input.dataset.sanitizerAttached) {
            input.dataset.sanitizerAttached = 'true';
            input.addEventListener('input', function () {
                this.value = this.value.replace(/[^a-zA-Z\s.'&\/-]/g, '');
            });
            input.addEventListener('keydown', function (e) {
                if (e.key && /[0-9]/.test(e.key)) {
                    e.preventDefault();
                }
            });
        }
    });
}

// ==========================================
// 4. DYNAMIC MEMBER ROSTER (1 TO 4 MEMBERS)
// ==========================================
function createMemberCard(memberIndex) {
    const memberCard = document.createElement('div');
    memberCard.className = 'member-card-hud';
    memberCard.id = `member-card-${memberIndex}`;

    memberCard.innerHTML = `
        <div class="member-card-header">
            <span>◈ OPERATIVE 0${memberIndex} // SQUAD MEMBER</span>
            <button type="button" class="btn-remove-member" onclick="removeMember(${memberIndex})">
                <i class="fas fa-trash-alt"></i> REMOVE
            </button>
        </div>
        <div class="form-row-2col">
            <div class="form-group-hud">
                <label class="form-label-hud"><i class="fas fa-user form-icon-hud"></i> FULL NAME <span class="req">*</span></label>
                <div class="input-wrapper-hud">
                    <input type="text" class="m-name" placeholder="Member full name" required autocomplete="off">
                </div>
            </div>
            <div class="form-group-hud">
                <label class="form-label-hud"><i class="fas fa-birthday-cake form-icon-hud"></i> AGE <span class="req">*</span></label>
                <div class="input-wrapper-hud">
                    <input type="text" class="m-age" placeholder="Age" inputmode="numeric" maxlength="2" required autocomplete="off">
                </div>
            </div>
        </div>
        <div class="form-row-2col">
            <div class="form-group-hud">
                <label class="form-label-hud"><i class="fas fa-envelope form-icon-hud"></i> EMAIL ADDRESS <span class="req">*</span></label>
                <div class="input-wrapper-hud">
                    <input type="email" class="m-email" placeholder="Member email" required autocomplete="off">
                </div>
            </div>
            <div class="form-group-hud">
                <label class="form-label-hud"><i class="fas fa-phone form-icon-hud"></i> PHONE NUMBER <span class="req">*</span></label>
                <div class="input-wrapper-hud">
                    <input type="tel" class="m-phone" placeholder="10-digit mobile number" inputmode="numeric" maxlength="10" required autocomplete="off">
                </div>
            </div>
        </div>
        <div class="form-row-2col">
            <div class="form-group-hud">
                <label class="form-label-hud"><i class="fas fa-university form-icon-hud"></i> COLLEGE <span class="req">*</span></label>
                <div class="input-wrapper-hud">
                    <input type="text" class="m-college" placeholder="College name" required autocomplete="off">
                </div>
            </div>
            <div class="form-group-hud">
                <label class="form-label-hud"><i class="fas fa-map-marker-alt form-icon-hud"></i> DISTRICT / DEPT <span class="req">*</span></label>
                <div class="input-wrapper-hud">
                    <input type="text" class="m-district" placeholder="District or Dept" required autocomplete="off">
                </div>
            </div>
        </div>
    `;
    return memberCard;
}

function addMemberSlot() {
    const container = document.getElementById('additional-members-container');
    if (!container) return;

    if (memberCount >= MAX_MEMBERS) {
        showCyberAlert(`Maximum team capacity reached (${MAX_MEMBERS} members max).`, 'CAPACITY REACHED');
        return;
    }

    memberCount++;
    const card = createMemberCard(memberCount);
    container.appendChild(card);
    initRealtimeInputSanitizers();
    updateFeeCalculations();
}

function initMemberManagement() {
    const btnAdd = document.getElementById('btn-add-member');
    const container = document.getElementById('additional-members-container');

    if (!btnAdd || !container) return;

    btnAdd.addEventListener('click', addMemberSlot);

    // Auto-populate Operative 02 on load to enforce minimum 2 members
    if (container.children.length === 0) {
        addMemberSlot();
    }
}

function removeMember(index) {
    if (memberCount <= MIN_MEMBERS) {
        showCyberAlert(`Minimum team size requirement is ${MIN_MEMBERS} members (Team Leader + 1 Squad Member).`, 'ROSTER REQUIREMENT');
        return;
    }
    const card = document.getElementById(`member-card-${index}`);
    if (card) {
        card.remove();
        memberCount--;
        updateFeeCalculations();
    }
}
window.removeMember = removeMember;

// ==========================================
// 5. DYNAMIC FEE & QR CALCULATIONS
// ==========================================
function updateFeeCalculations() {
    const totalFee = memberCount * PER_HEAD_FEE;
    
    // Update displays
    const summaryCount = document.getElementById('summary-member-count');
    const summaryFee = document.getElementById('summary-total-fee');
    const paymentAmount = document.getElementById('payment-amount-display');
    const slotCount = document.getElementById('member-slot-count');

    if (summaryCount) summaryCount.textContent = memberCount;
    if (summaryFee) summaryFee.textContent = `₹${totalFee}`;
    if (paymentAmount) paymentAmount.textContent = `₹${totalFee}`;
    if (slotCount) slotCount.textContent = memberCount;

    // Dynamically update QR image if specific fee images exist (e.g. 250R, 500R, 750R, 1000R or load.png)
    const qrImg = document.getElementById('qr-code-img');
    if (qrImg) {
        // Look for matching QR asset in public folder or fallback
        const possibleQR = `${totalFee}R.jpeg`;
        const testImg = new Image();
        testImg.onload = () => { qrImg.src = possibleQR; };
        testImg.onerror = () => { qrImg.src = 'load.png'; };
        testImg.src = possibleQR;
    }
}

// ==========================================
// 6. EMAIL OTP VERIFICATION FLOW
// ==========================================
function initOtpFlow() {
    const btnSendOtp = document.getElementById('btn-send-otp');
    const btnVerifyOtp = document.getElementById('btn-verify-otp');
    const emailInput = document.getElementById('leaderEmail');
    const otpBox = document.getElementById('otp-box');
    const otpCodeInput = document.getElementById('otpCode');
    const feedback = document.getElementById('otp-feedback');
    const outerFeedback = document.getElementById('otp-feedback-outer');

    if (!btnSendOtp || !emailInput) return;

    function setFeedback(msg, isSuccess = false) {
        const color = isSuccess ? '#00ff66' : '#ff4757';
        if (outerFeedback) {
            outerFeedback.style.color = color;
            outerFeedback.textContent = msg;
        }
        if (feedback) {
            feedback.style.color = color;
            feedback.textContent = msg;
        }
    }

    btnSendOtp.addEventListener('click', async () => {
        const email = emailInput.value.trim().toLowerCase();
        const leaderName = document.getElementById('leaderName').value.trim() || 'Team Leader';

        if (!email || !email.includes('@')) {
            setFeedback('Please enter a valid Team Leader email address.');
            return;
        }

        btnSendOtp.disabled = true;
        btnSendOtp.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SENDING...';
        setFeedback('', true);
        otpBox.style.display = 'none';

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000);

        try {
            const res = await fetch('/api/auth/send-verification-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email, name: leaderName }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            const data = await res.json();

            if (res.ok && data.success) {
                otpBox.style.display = 'block';
                setFeedback('✓ Enter the 6-digit OTP sent to your email', true);
                btnSendOtp.innerHTML = '<i class="fas fa-redo"></i> RESEND OTP';
                if (otpCodeInput) {
                    otpCodeInput.value = '';
                    setTimeout(() => otpCodeInput.focus(), 100);
                }
            } else {
                otpBox.style.display = 'none';
                setFeedback(`Error: ${data.error || 'Failed to send OTP. Check server settings.'}`, false);
                btnSendOtp.innerHTML = '<i class="fas fa-paper-plane"></i> SEND OTP';
            }
        } catch (err) {
            clearTimeout(timeoutId);
            console.error('Error sending OTP:', err);
            otpBox.style.display = 'none';
            if (err.name === 'AbortError') {
                setFeedback('Server response timeout. Please try again.', false);
            } else {
                setFeedback('Failed to connect to server. Please try again.', false);
            }
            btnSendOtp.innerHTML = '<i class="fas fa-paper-plane"></i> SEND OTP';
        } finally {
            btnSendOtp.disabled = false;
        }
    });

    btnVerifyOtp.addEventListener('click', async () => {
        const email = emailInput.value.trim().toLowerCase();
        const otp = otpCodeInput.value.trim();

        if (!otp) {
            setFeedback('Please enter the 6-digit OTP sent to your email.', false);
            return;
        }

        btnVerifyOtp.disabled = true;
        btnVerifyOtp.innerHTML = '<i class="fas fa-spinner fa-spin"></i> VERIFYING...';

        try {
            const res = await fetch('/api/auth/verify-email-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email, otp: otp })
            });
            const data = await res.json();

            if (res.ok && data.success) {
                isEmailVerified = true;
                emailInput.readOnly = true;
                btnSendOtp.style.display = 'none';
                otpBox.style.display = 'none';
                setFeedback('✓ Email verified successfully!', true);

                const verifiedBadge = document.createElement('span');
                verifiedBadge.className = 'btn-otp-action';
                verifiedBadge.style.background = 'rgba(0, 255, 102, 0.2)';
                verifiedBadge.style.borderColor = '#00ff66';
                verifiedBadge.style.color = '#00ff66';
                verifiedBadge.style.display = 'inline-flex';
                verifiedBadge.style.alignItems = 'center';
                verifiedBadge.style.gap = '6px';
                verifiedBadge.innerHTML = '<i class="fas fa-check-circle"></i> VERIFIED ✓';
                emailInput.parentElement.parentElement.appendChild(verifiedBadge);
            } else {
                setFeedback(`Invalid OTP code! ${data.error || 'Please check and enter the correct code.'}`, false);
            }
        } catch (err) {
            console.error('Error verifying OTP:', err);
            setFeedback('Failed to connect to server during OTP verification.', false);
        } finally {
            btnVerifyOtp.disabled = false;
            btnVerifyOtp.innerHTML = '<i class="fas fa-check"></i> VERIFY CODE';
        }
    });
}

// ==========================================
// 7. FILE UPLOAD PREVIEW
// ==========================================
function initFileUploadPreview() {
    const fileInput = document.getElementById('paymentProof');
    const labelText = document.getElementById('file-chosen-text');

    if (!fileInput || !labelText) return;

    fileInput.addEventListener('change', () => {
        if (fileInput.files && fileInput.files[0]) {
            const fileName = fileInput.files[0].name;
            const fileSize = (fileInput.files[0].size / 1024 / 1024).toFixed(2);
            labelText.innerHTML = `<strong class="text-green">✓ SELECTED:</strong> ${fileName} (${fileSize} MB)`;
        } else {
            labelText.textContent = 'Click or drag screenshot (JPEG/PNG, Max 5MB)';
        }
    });
}

// ==========================================
// 8. COMPREHENSIVE FIELD VALIDATION & FORM SUBMISSION
// ==========================================
function validateNoDigits(text) {
    return !/\d/.test(text) && text.trim().length >= 2;
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone) {
    return /^[6-9]\d{9}$/.test(phone);
}

function validateName(name) {
    return /^[a-zA-Z\s.'-]+$/.test(name) && name.trim().length >= 2;
}

function validateAge(ageStr) {
    const age = parseInt(ageStr, 10);
    return !isNaN(age) && age >= 15 && age <= 40;
}

function validateUTR(utr) {
    return /^[a-zA-Z0-9]{12,25}$/.test(utr);
}

function markInputError(inputEl, msg) {
    if (!inputEl) return;
    inputEl.classList.add('input-error');
    let parent = inputEl.closest('.form-group-hud') || inputEl.parentElement;
    let existingMsg = parent.querySelector('.input-error-msg');
    if (!existingMsg) {
        existingMsg = document.createElement('small');
        existingMsg.className = 'input-error-msg';
        parent.appendChild(existingMsg);
    }
    existingMsg.textContent = msg;
}

function clearInputError(inputEl) {
    if (!inputEl) return;
    inputEl.classList.remove('input-error');
    let parent = inputEl.closest('.form-group-hud') || inputEl.parentElement;
    let existingMsg = parent.querySelector('.input-error-msg');
    if (existingMsg) {
        existingMsg.remove();
    }
}

function initFormSubmission() {
    const form = document.getElementById('ctf-registration-form');
    if (!form) return;

    // Clear input errors dynamically on input change
    form.addEventListener('input', (e) => {
        if (e.target && e.target.tagName === 'INPUT') {
            clearInputError(e.target);
        }
    });

    const paymentProofInputEl = document.getElementById('paymentProof');
    const dropzoneEl = document.getElementById('hud-file-dropzone');
    const dropzoneDefault = document.getElementById('dropzone-default');
    const dropzonePreview = document.getElementById('dropzone-preview');
    const previewImg = document.getElementById('preview-thumbnail-img');
    const previewFilename = document.getElementById('preview-filename');
    const previewFilesize = document.getElementById('preview-filesize');
    const btnRemoveFile = document.getElementById('btn-remove-file');

    function resetDropzoneUI() {
        if (paymentProofInputEl) paymentProofInputEl.value = '';
        if (dropzoneEl) {
            dropzoneEl.classList.remove('has-file', 'has-error', 'dragover');
        }
        if (dropzoneDefault) dropzoneDefault.style.display = 'block';
        if (dropzonePreview) dropzonePreview.style.display = 'none';
        if (previewImg) previewImg.src = '';
    }

    function processSelectedFile(file) {
        if (!file) {
            resetDropzoneUI();
            return;
        }

        const allowedExtensions = ['jpg', 'jpeg', 'png'];
        const fileExt = file.name.split('.').pop().toLowerCase();
        const maxSize = 1 * 1024 * 1024; // 1 MB

        if (!allowedExtensions.includes(fileExt)) {
            showCyberAlert('Invalid file format! Only JPG, JPEG, and PNG images are allowed.', 'INVALID FILE FORMAT');
            resetDropzoneUI();
            if (dropzoneEl) dropzoneEl.classList.add('has-error');
            markInputError(paymentProofInputEl, 'Only JPG, JPEG, and PNG images allowed.');
            return;
        }

        if (file.size > maxSize) {
            const sizeMB = (file.size / 1024 / 1024).toFixed(2);
            showCyberAlert(`File size is ${sizeMB} MB. Please upload a screenshot smaller than 1 MB.`, 'FILE SIZE EXCEEDED');
            resetDropzoneUI();
            if (dropzoneEl) dropzoneEl.classList.add('has-error');
            markInputError(paymentProofInputEl, 'File size must be less than 1 MB.');
            return;
        }

        clearInputError(paymentProofInputEl);
        if (dropzoneEl) {
            dropzoneEl.classList.remove('has-error', 'dragover');
            dropzoneEl.classList.add('has-file');
        }

        // Display File Details
        if (previewFilename) previewFilename.textContent = file.name;
        if (previewFilesize) {
            const kbSize = (file.size / 1024).toFixed(1);
            previewFilesize.textContent = `${kbSize} KB / 1.00 MB`;
        }

        // Generate Image Preview Thumbnail
        const reader = new FileReader();
        reader.onload = (e) => {
            if (previewImg) previewImg.src = e.target.result;
            if (dropzoneDefault) dropzoneDefault.style.display = 'none';
            if (dropzonePreview) dropzonePreview.style.display = 'flex';
        };
        reader.readAsDataURL(file);
    }

    if (paymentProofInputEl) {
        paymentProofInputEl.addEventListener('change', () => {
            processSelectedFile(paymentProofInputEl.files[0]);
        });
    }

    if (btnRemoveFile) {
        btnRemoveFile.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            resetDropzoneUI();
        });
    }

    if (dropzoneEl) {
        ['dragenter', 'dragover'].forEach(eventName => {
            dropzoneEl.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzoneEl.classList.add('dragover');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropzoneEl.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzoneEl.classList.remove('dragover');
            }, false);
        });

        dropzoneEl.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files && files.length > 0) {
                if (paymentProofInputEl) {
                    paymentProofInputEl.files = files;
                }
                processSelectedFile(files[0]);
            }
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Clear existing errors
        form.querySelectorAll('.input-error-msg').forEach(el => el.remove());
        form.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));

        const teamNameInput = document.getElementById('teamName');
        const leaderNameInput = document.getElementById('leaderName');
        const leaderAgeInput = document.getElementById('leaderAge');
        const leaderEmailInput = document.getElementById('leaderEmail');
        const leaderPhoneInput = document.getElementById('leaderPhone');
        const leaderWhatsappInput = document.getElementById('leaderWhatsapp');
        const leaderCollegeInput = document.getElementById('leaderCollege');
        const leaderDistrictInput = document.getElementById('leaderDistrict');
        
        const utrNumberInput = document.getElementById('utrNumber');

        let isValid = true;
        let firstErrorInput = null;

        function setError(inputEl, msg) {
            markInputError(inputEl, msg);
            isValid = false;
            if (!firstErrorInput) firstErrorInput = inputEl;
        }

        // 1. Team Name Validation
        const teamName = teamNameInput.value.trim();
        if (!teamName || teamName.length < 2) {
            setError(teamNameInput, 'Team Name must be at least 2 characters.');
        }

        // 2. Leader Name Validation
        const leaderName = leaderNameInput.value.trim();
        if (!leaderName || !validateName(leaderName)) {
            setError(leaderNameInput, 'Please enter a valid full name (letters only, min 2 chars).');
        }

        // 3. Leader Age Validation
        const leaderAge = leaderAgeInput.value.trim();
        if (!leaderAge || !validateAge(leaderAge)) {
            setError(leaderAgeInput, 'Leader age must be between 15 and 40.');
        }

        // 4. Leader Email Validation
        const leaderEmail = leaderEmailInput.value.trim();
        if (!leaderEmail || !validateEmail(leaderEmail)) {
            setError(leaderEmailInput, 'Please enter a valid email address.');
        }

        // 5. Leader Phone Validation
        const leaderPhone = leaderPhoneInput.value.trim();
        if (!leaderPhone || !validatePhone(leaderPhone)) {
            setError(leaderPhoneInput, 'Enter a valid 10-digit mobile number starting with 6-9.');
        }

        // 6. Leader WhatsApp Validation (Optional, but if filled must be valid 10-digit)
        const leaderWhatsapp = leaderWhatsappInput.value.trim();
        if (leaderWhatsapp && !validatePhone(leaderWhatsapp)) {
            setError(leaderWhatsappInput, 'Enter a valid 10-digit WhatsApp number.');
        }

        // 7. Leader College Validation
        const leaderCollege = leaderCollegeInput.value.trim();
        if (!leaderCollege || leaderCollege.length < 3 || !validateNoDigits(leaderCollege)) {
            setError(leaderCollegeInput, 'College / Institution name must be at least 3 characters (letters only).');
        }

        // 8. Leader District Validation
        const leaderDistrict = leaderDistrictInput.value.trim();
        if (!leaderDistrict || leaderDistrict.length < 2 || !validateNoDigits(leaderDistrict)) {
            setError(leaderDistrictInput, 'District / Department must be at least 2 characters (letters only).');
        }

        // 9. Additional Squad Members Validation
        const membersList = [
            {
                name: leaderName,
                age: parseInt(leaderAge) || 20,
                email: leaderEmail,
                phone: leaderPhone,
                whatsapp: leaderWhatsapp || leaderPhone,
                college: leaderCollege,
                district: leaderDistrict,
                role: 'LEADER'
            }
        ];

        const extraCards = document.querySelectorAll('.member-card-hud');
        for (let i = 0; i < extraCards.length; i++) {
            const card = extraCards[i];
            const mNameInput = card.querySelector('.m-name');
            const mAgeInput = card.querySelector('.m-age');
            const mEmailInput = card.querySelector('.m-email');
            const mPhoneInput = card.querySelector('.m-phone');
            const mCollegeInput = card.querySelector('.m-college');
            const mDistrictInput = card.querySelector('.m-district');

            const mName = mNameInput ? mNameInput.value.trim() : '';
            const mAge = mAgeInput ? mAgeInput.value.trim() : '';
            const mEmail = mEmailInput ? mEmailInput.value.trim() : '';
            const mPhone = mPhoneInput ? mPhoneInput.value.trim() : '';
            const mCollege = mCollegeInput ? mCollegeInput.value.trim() : '';
            const mDistrict = mDistrictInput ? mDistrictInput.value.trim() : '';

            if (!mName || !validateName(mName)) {
                setError(mNameInput, `Operative 0${i + 2}: Enter full name (letters only).`);
            }

            if (!mEmail || !validateEmail(mEmail)) {
                setError(mEmailInput, `Operative 0${i + 2}: Enter a valid email address.`);
            }

            if (!mPhone || !validatePhone(mPhone)) {
                setError(mPhoneInput, `Operative 0${i + 2}: Enter a valid 10-digit mobile number.`);
            }

            if (mAge && !validateAge(mAge)) {
                setError(mAgeInput, `Operative 0${i + 2}: Age must be between 15 and 40.`);
            }

            if (!mCollege || !validateNoDigits(mCollege)) {
                setError(mCollegeInput, `Operative 0${i + 2}: Enter College name (letters only).`);
            }

            if (!mDistrict || !validateNoDigits(mDistrict)) {
                setError(mDistrictInput, `Operative 0${i + 2}: Enter District / Department (letters only).`);
            }

            membersList.push({
                name: mName,
                age: parseInt(mAge) || 20,
                email: mEmail,
                phone: mPhone,
                whatsapp: mPhone,
                college: mCollege || leaderCollege,
                district: mDistrict || leaderDistrict,
                role: 'MEMBER'
            });
        }

        if (membersList.length < MIN_MEMBERS || membersList.length > MAX_MEMBERS) {
            showCyberAlert(`Team size must be minimum ${MIN_MEMBERS} and maximum ${MAX_MEMBERS} members.`, 'INVALID SQUAD SIZE');
            isValid = false;
        }

        // 10. UTR Number Validation
        const utrNumber = utrNumberInput.value.trim();
        if (!utrNumber || !validateUTR(utrNumber)) {
            setError(utrNumberInput, 'Please enter a valid 12-digit UTR / Bank Reference Number.');
        }

        // 11. Payment Screenshot File Validation (< 1 MB & JPG/JPEG/PNG)
        const paymentProofInput = document.getElementById('paymentProof');
        const paymentProofFile = paymentProofInput ? paymentProofInput.files[0] : null;

        if (!paymentProofFile) {
            setError(paymentProofInput, 'Please upload your payment screenshot (< 1 MB, JPG/JPEG/PNG).');
        } else {
            const allowedExtensions = ['jpg', 'jpeg', 'png'];
            const fileExt = paymentProofFile.name.split('.').pop().toLowerCase();
            const maxSize = 1 * 1024 * 1024; // 1 MB

            if (!allowedExtensions.includes(fileExt)) {
                setError(paymentProofInput, 'Invalid file format! Only JPG, JPEG, and PNG images are allowed.');
            } else if (paymentProofFile.size > maxSize) {
                setError(paymentProofInput, 'File size exceeds 1 MB limit! Please upload a screenshot smaller than 1 MB.');
            }
        }

        // Focus & scroll to first invalid field if form is incomplete
        if (!isValid) {
            if (firstErrorInput) {
                firstErrorInput.focus();
                firstErrorInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        const submitBtn = document.getElementById('submit-btn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> TRANSMITTING CREDENTIALS...';
        submitBtn.disabled = true;

        try {
            const formData = new FormData();
            formData.append('teamName', teamName);
            formData.append('email', leaderEmail);
            formData.append('event', 'XPLOITX 2.0 BETA - 24-Hour CTF');
            formData.append('day', '09 OCTOBER 2026');
            formData.append('utrNumber', utrNumber);
            formData.append('members', JSON.stringify(membersList));
            if (paymentProofFile) {
                formData.append('paymentProof', paymentProofFile);
            }

            const response = await fetch('/api/auth/register-with-payment', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                showCyberAlert(`Registration Error: ${data.error || 'Failed to submit registration.'}`, 'REGISTRATION FAILED');
                return;
            }

            const generatedTeamId = data.teamId || `XB2026-${Math.floor(1000 + Math.random() * 9000)}`;

            // Populate and show HUD Confirmation Modal
            document.getElementById('modal-team-name').textContent = teamName;
            document.getElementById('modal-team-id').textContent = generatedTeamId;
            document.getElementById('modal-leader-name').textContent = leaderName;
            document.getElementById('modal-email').textContent = leaderEmail;
            document.getElementById('success-modal').classList.add('active');

            form.reset();
        } catch (err) {
            console.warn('Registration network or server error:', err);
            showCyberAlert('Unable to connect to server. Please check your network connection and try again.', 'CONNECTION ERROR');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}

function closeModal() {
    const modal = document.getElementById('success-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}
window.closeModal = closeModal;
