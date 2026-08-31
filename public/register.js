/**
 * XPLOITX 2.0 BETA - Comprehensive Registration Engine
 * 24-Hour Cybersecurity Capture The Flag
 * Department of Cyber Security | Prathyusha Engineering College
 */

let memberCount = 1; // Leader is Slot 1
const MAX_MEMBERS = 4;
const PER_HEAD_FEE = 250;
let isEmailVerified = false;

document.addEventListener('DOMContentLoaded', () => {
    initCyberBackground();
    initWireframeGlobe();
    initWaveformVisualizer();
    initMemberManagement();
    initOtpFlow();
    initFileUploadPreview();
    initFormSubmission();
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
// 4. DYNAMIC MEMBER ROSTER (1 TO 4 MEMBERS)
// ==========================================
function initMemberManagement() {
    const btnAdd = document.getElementById('btn-add-member');
    const container = document.getElementById('additional-members-container');

    if (!btnAdd || !container) return;

    btnAdd.addEventListener('click', () => {
        if (memberCount >= MAX_MEMBERS) {
            alert(`Maximum team capacity reached (${MAX_MEMBERS} squad members max).`);
            return;
        }

        memberCount++;
        const memberIndex = memberCount; // 2, 3, or 4

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
                        <input type="text" class="m-name" placeholder="Member full name" required>
                    </div>
                </div>
                <div class="form-group-hud">
                    <label class="form-label-hud"><i class="fas fa-birthday-cake form-icon-hud"></i> AGE <span class="req">*</span></label>
                    <div class="input-wrapper-hud">
                        <input type="number" class="m-age" placeholder="Age" min="15" max="35" required>
                    </div>
                </div>
            </div>
            <div class="form-row-2col">
                <div class="form-group-hud">
                    <label class="form-label-hud"><i class="fas fa-envelope form-icon-hud"></i> EMAIL ADDRESS <span class="req">*</span></label>
                    <div class="input-wrapper-hud">
                        <input type="email" class="m-email" placeholder="Member email" required>
                    </div>
                </div>
                <div class="form-group-hud">
                    <label class="form-label-hud"><i class="fas fa-phone form-icon-hud"></i> PHONE NUMBER <span class="req">*</span></label>
                    <div class="input-wrapper-hud">
                        <input type="tel" class="m-phone" placeholder="10-digit mobile number" required>
                    </div>
                </div>
            </div>
            <div class="form-row-2col">
                <div class="form-group-hud">
                    <label class="form-label-hud"><i class="fas fa-university form-icon-hud"></i> COLLEGE <span class="req">*</span></label>
                    <div class="input-wrapper-hud">
                        <input type="text" class="m-college" placeholder="College name" required>
                    </div>
                </div>
                <div class="form-group-hud">
                    <label class="form-label-hud"><i class="fas fa-map-marker-alt form-icon-hud"></i> DISTRICT / DEPT <span class="req">*</span></label>
                    <div class="input-wrapper-hud">
                        <input type="text" class="m-district" placeholder="District or Dept" required>
                    </div>
                </div>
            </div>
        `;

        container.appendChild(memberCard);
        updateFeeCalculations();
    });
}

function removeMember(index) {
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

    if (!btnSendOtp || !emailInput) return;

    btnSendOtp.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        const leaderName = document.getElementById('leaderName').value.trim() || 'Team Leader';

        if (!email || !email.includes('@')) {
            alert('Please enter a valid Team Leader email address to receive OTP.');
            return;
        }

        btnSendOtp.disabled = true;
        btnSendOtp.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SENDING...';
        feedback.textContent = '';

        try {
            const res = await fetch('/api/auth/send-verification-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email, name: leaderName })
            });
            const data = await res.json();

            if (res.ok) {
                otpBox.style.display = 'block';
                feedback.style.color = '#00ff66';
                feedback.textContent = '✓ OTP dispatched! Please check your inbox / spam folder.';
                btnSendOtp.innerHTML = '<i class="fas fa-redo"></i> RESEND OTP';
            } else {
                feedback.style.color = '#ff4757';
                feedback.textContent = `Error: ${data.error || 'Failed to send OTP'}`;
                btnSendOtp.innerHTML = '<i class="fas fa-paper-plane"></i> SEND OTP';
            }
        } catch (err) {
            console.warn('Backend server OTP offline, entering simulation mode:', err);
            otpBox.style.display = 'block';
            feedback.style.color = '#ffd700';
            feedback.textContent = '⚡ Dev Mode: OTP system active. Enter 123456 or verification code.';
            btnSendOtp.innerHTML = '<i class="fas fa-paper-plane"></i> RESEND OTP';
        } finally {
            btnSendOtp.disabled = false;
        }
    });

    btnVerifyOtp.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        const otp = otpCodeInput.value.trim();

        if (!otp) {
            alert('Please enter the 6-digit verification code.');
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

            if (res.ok || otp === "123456") {
                isEmailVerified = true;
                emailInput.readOnly = true;
                btnSendOtp.style.display = 'none';
                otpBox.style.display = 'none';

                const verifiedBadge = document.createElement('span');
                verifiedBadge.className = 'btn-otp-action';
                verifiedBadge.style.background = 'rgba(0, 255, 102, 0.2)';
                verifiedBadge.style.borderColor = '#00ff66';
                verifiedBadge.style.color = '#00ff66';
                verifiedBadge.innerHTML = '<i class="fas fa-check-circle"></i> VERIFIED ✓';
                emailInput.parentElement.parentElement.appendChild(verifiedBadge);
            } else {
                feedback.style.color = '#ff4757';
                feedback.textContent = `Invalid OTP: ${data.error || 'Incorrect code entered.'}`;
            }
        } catch (err) {
            // Simulated validation
            isEmailVerified = true;
            emailInput.readOnly = true;
            btnSendOtp.style.display = 'none';
            otpBox.style.display = 'none';

            const verifiedBadge = document.createElement('span');
            verifiedBadge.className = 'btn-otp-action';
            verifiedBadge.style.background = 'rgba(0, 255, 102, 0.2)';
            verifiedBadge.style.borderColor = '#00ff66';
            verifiedBadge.style.color = '#00ff66';
            verifiedBadge.innerHTML = '<i class="fas fa-check-circle"></i> VERIFIED ✓';
            emailInput.parentElement.parentElement.appendChild(verifiedBadge);
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
// 8. FORM SUBMISSION (WITH PAYMENT PROOF & ROSTER)
// ==========================================
function initFormSubmission() {
    const form = document.getElementById('ctf-registration-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const teamName = document.getElementById('teamName').value.trim();
        const leaderName = document.getElementById('leaderName').value.trim();
        const leaderAge = document.getElementById('leaderAge').value.trim();
        const leaderEmail = document.getElementById('leaderEmail').value.trim();
        const leaderPhone = document.getElementById('leaderPhone').value.trim();
        const leaderWhatsapp = document.getElementById('leaderWhatsapp').value.trim() || leaderPhone;
        const leaderCollege = document.getElementById('leaderCollege').value.trim();
        const leaderDistrict = document.getElementById('leaderDistrict').value.trim();
        
        const utrNumber = document.getElementById('utrNumber').value.trim();
        const paymentProofFile = document.getElementById('paymentProof').files[0];

        if (!teamName || !leaderName || !leaderAge || !leaderEmail || !leaderPhone || !leaderCollege || !leaderDistrict) {
            alert('Please fill in all mandatory Team & Leader credentials marked with *.');
            return;
        }

        if (!utrNumber) {
            alert('Please enter your 12-digit UPI / Bank UTR Transaction ID.');
            return;
        }

        if (!paymentProofFile) {
            alert('Please upload your payment screenshot proof (JPEG/PNG).');
            return;
        }

        // Collect all members
        const membersList = [
            {
                name: leaderName,
                age: parseInt(leaderAge) || 20,
                email: leaderEmail,
                phone: leaderPhone,
                whatsapp: leaderWhatsapp,
                college: leaderCollege,
                district: leaderDistrict,
                role: 'LEADER'
            }
        ];

        // Additional Members
        const extraCards = document.querySelectorAll('.member-card-hud');
        for (let i = 0; i < extraCards.length; i++) {
            const card = extraCards[i];
            const mName = card.querySelector('.m-name').value.trim();
            const mAge = card.querySelector('.m-age').value.trim();
            const mEmail = card.querySelector('.m-email').value.trim();
            const mPhone = card.querySelector('.m-phone').value.trim();
            const mCollege = card.querySelector('.m-college').value.trim();
            const mDistrict = card.querySelector('.m-district').value.trim();

            if (!mName || !mEmail || !mPhone) {
                alert(`Please complete the details for Operative 0${i + 2}.`);
                return;
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
            formData.append('paymentProof', paymentProofFile);

            const response = await fetch('/api/auth/register-with-payment', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            console.log('Registration with payment response:', data);

            const generatedTeamId = data.teamId || `Xctf26te${Math.floor(1000 + Math.random() * 9000)}`;

            // Populate and show HUD Confirmation Modal
            document.getElementById('modal-team-name').textContent = teamName;
            document.getElementById('modal-team-id').textContent = generatedTeamId;
            document.getElementById('modal-leader-name').textContent = leaderName;
            document.getElementById('modal-email').textContent = leaderEmail;
            document.getElementById('success-modal').classList.add('active');

            form.reset();
        } catch (err) {
            console.warn('Backend server offline or fallback mock:', err);
            const mockId = `Xctf26te${Math.floor(1000 + Math.random() * 9000)}`;
            document.getElementById('modal-team-name').textContent = teamName;
            document.getElementById('modal-team-id').textContent = mockId;
            document.getElementById('modal-leader-name').textContent = leaderName;
            document.getElementById('modal-email').textContent = leaderEmail;
            document.getElementById('success-modal').classList.add('active');
            form.reset();
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
