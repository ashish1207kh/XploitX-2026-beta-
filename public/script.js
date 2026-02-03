// Matrix code rain animation
const canvas = document.getElementById('matrix-bg');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const matrixChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+-=[]{}|;:,.<>?';
const fontSize = 14;
const columns = canvas.width / fontSize;
const drops = [];

for (let x = 0; x < columns; x++) {
    drops[x] = 1;
}

function draw() {
    ctx.fillStyle = 'rgba(13, 2, 8, 0.04)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#00FF41';
    ctx.font = fontSize + 'px Share Tech Mono';

    for (let i = 0; i < drops.length; i++) {
        const text = matrixChars.charAt(Math.floor(Math.random() * matrixChars.length));
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
            drops[i] = 0;
        }
        drops[i]++;
    }
}

// Custom Alert Implementation
window.currentAlertCallback = null;

window.closeCustomAlert = function () {
    document.getElementById('custom-alert-overlay').style.display = 'none';
    if (window.currentAlertCallback) {
        window.currentAlertCallback();
        window.currentAlertCallback = null;
    }
};

window.showCustomAlert = function (message, callback = null) {
    window.currentAlertCallback = callback;
    let overlay = document.getElementById('custom-alert-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'custom-alert-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.85); z-index: 100000;
            display: flex; justify-content: center; align-items: center;
        `;
        overlay.innerHTML = `
            <div style="background: #000; border: 2px solid var(--neon-green); padding: 30px; width: 400px; text-align: center; box-shadow: 0 0 20px rgba(0, 255, 65, 0.2);">
                <h2 style="color: var(--neon-green); border-bottom: 1px solid var(--dark-green); padding-bottom: 10px; margin-bottom: 20px;">> SYSTEM_ALERT</h2>
                <div id="custom-alert-msg" style="color: #fff; margin-bottom: 20px; font-family: 'Share Tech Mono', monospace; font-size: 1.1rem;"></div>
                <button onclick="window.closeCustomAlert()" class="jack-in-btn" style="width: 100%;">[ ACKNOWLEDGE ]</button>
            </div>
        `;
        document.body.appendChild(overlay);
    }
    document.getElementById('custom-alert-msg').innerText = message;
    overlay.style.display = 'flex';
};

// Override default alert to just show message (blocking behavior lost, be careful)
window.alert = function (msg) {
    window.showCustomAlert(msg);
};

setInterval(draw, 35);
// Define Globals
// Logic:
// 1. If file:// protocol, use localhost:3000
// 2. If running on localhost or 127.0.0.1 (e.g. Live Server port 5500), use localhost:3000
// 3. If running on a public tunnel (loca.lt, ngrok), use relative path ''
const hostname = window.location.hostname;
let API_BASE_URL = '';

if (window.location.protocol === 'file:') {
    API_BASE_URL = 'http://localhost:3000';
} else if (hostname === 'localhost' || hostname === '127.0.0.1') {
    API_BASE_URL = 'http://localhost:3000';
} else if (hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.')) {
    // If on LAN (mobile testing), assume backend is on same IP at port 3000
    API_BASE_URL = `http://${hostname}:3000`;
} else {
    // Production or public URL (assume relative path / proxy)
    API_BASE_URL = '';
}
console.log("Global API_BASE_URL:", API_BASE_URL);

// Form handling
const regForm = document.getElementById('team-form');
if (regForm) {
    // Configuration
    const EVENT_CONFIG = {
        '24 Hrs Hackathon': { min: 2, max: 4, fee: 250, perHead: true },
        'paper_presentation': { min: 1, max: 3, fee: 150, perHead: false },
        'digital_forensics': { min: 2, max: 2, fee: 0, perHead: false },
        'network_defense': { min: 2, max: 2, fee: 0, perHead: false }
    };

    let currentFee = 0;
    let currentMin = 1;
    let currentMax = 5;

    // Elements
    const eventSelect = document.getElementById('event-select');
    const membersContainer = document.getElementById('members-container');
    const addMemberBtn = document.getElementById('add-member-btn');
    const removeMemberBtn = document.getElementById('remove-member-btn');
    const paymentModal = document.getElementById('payment-modal');
    const confirmBtn = document.getElementById('confirm-payment-btn');
    const cancelBtn = document.getElementById('cancel-payment-btn');
    const amountDisplay = document.getElementById('payment-amount-display');
    const submitBtn = regForm.querySelector('button[type="submit"]');

    // Run Init
    function init() {



        // 2. Add Member Logic
        if (addMemberBtn && membersContainer) {
            addMemberBtn.addEventListener('click', () => {
                const currentCount = membersContainer.querySelectorAll('.member-card').length;
                if (currentCount >= currentMax) {
                    showCustomAlert(`Maximum ${currentMax} members allowed for this event.`);
                    return;
                }

                const newIndex = currentCount + 1;
                const template = document.getElementById('member-1');
                const clone = template.cloneNode(true);
                clone.id = `member-${newIndex}`;
                clone.querySelector('h4').innerText = `> OPERATIVE_0${newIndex} (MEMBER)`;

                // Clear inputs and update names
                const inputs = clone.querySelectorAll('input');
                inputs.forEach(input => {
                    input.value = '';

                    // Remove duplicate ID from email input
                    if (input.type === 'email') {
                        input.removeAttribute('id');
                        input.readOnly = false;
                    }

                    // name format: member1_name -> member2_name
                    const nameParts = input.name.split('_');
                    if (nameParts.length > 1) {
                        input.name = `member${newIndex}_${nameParts[1]}`;
                    }

                    // Reset verification status
                    delete input.dataset.verified;
                });

                // Reset Verification State for Clone
                const otpSection = clone.querySelector('.otp-section');
                if (otpSection) otpSection.style.display = 'none';

                const verifiedBadge = clone.querySelector('.email-verified-badge');
                if (verifiedBadge) verifiedBadge.style.display = 'none';

                const verifyBtn = clone.querySelector('.verify-email-btn');
                if (verifyBtn) {
                    verifyBtn.style.display = 'inline-block'; // or block
                    verifyBtn.disabled = false;
                    verifyBtn.innerText = "[ VERIFY ]";
                }

                membersContainer.appendChild(clone);

                // --- NEW: Sync Logic for New Member ---
                // Make Member College/District ReadOnly and sync with Leader
                const mName = `member${newIndex}`;
                // Select by name attribute
                // Note: The clone is already appended, we can search within clone
                const colInput = clone.querySelector(`input[name$="_college"]`);
                const distInput = clone.querySelector(`input[name$="_district"]`);

                // Get leader values
                const lColVal = document.querySelector('input[name="member1_college"]').value;
                const lDistVal = document.querySelector('input[name="member1_district"]').value;

                if (colInput) {
                    colInput.readOnly = true;
                    colInput.value = lColVal;
                    colInput.style.backgroundColor = "rgba(0,0,0,0.3)";
                    colInput.style.color = "#aaa";
                    colInput.style.border = "1px dashed #333";
                }
                if (distInput) {
                    distInput.readOnly = true;
                    distInput.value = lDistVal;
                    distInput.style.backgroundColor = "rgba(0,0,0,0.3)";
                    distInput.style.color = "#aaa";
                    distInput.style.border = "1px dashed #333";
                }
            });
        }

        // --- EXCLUSIVE COLLEGE/DISTRICT LOGIC (Outside Add Member) ---
        const leaderCollege = document.querySelector('input[name="member1_college"]');
        const leaderDistrict = document.querySelector('input[name="member1_district"]');

        function syncMemberFields() {
            const allCollege = document.querySelectorAll('input[name*="_college"]');
            const allDistrict = document.querySelectorAll('input[name*="_district"]');

            const lColVal = leaderCollege.value;
            const lDistVal = leaderDistrict.value;

            // Update College
            allCollege.forEach((inp, idx) => {
                if (inp === leaderCollege) return; // Skip leader
                inp.value = lColVal;
                inp.readOnly = true; // Ensure they stay readOnly
                inp.style.backgroundColor = "rgba(0,0,0,0.3)";
            });

            // Update District
            allDistrict.forEach((inp, idx) => {
                if (inp === leaderDistrict) return; // Skip leader
                inp.value = lDistVal;
                inp.readOnly = true;
                inp.style.backgroundColor = "rgba(0,0,0,0.3)";
            });
        }

        if (leaderCollege) {
            leaderCollege.addEventListener('input', function () {
                // Auto-Broadcast changes
                syncMemberFields();
            });
        }

        if (leaderDistrict) {
            leaderDistrict.addEventListener('input', function () {
                // Rule: "if the leader gives the district as Tn then all the members district place it show TN"
                // Strict Case Force
                if (this.value.toLowerCase() === 'tn') {
                    // We don't force change the leader's input UI immediately to avoid typing interuption, 
                    // but we can ensure the broadcasted value is 'TN' if we want.
                    // The requirement says "it show TN". Let's update the value itself if exact match.
                    this.value = 'TN';
                }
                syncMemberFields();
            });
        }

        // Remove Member Logic
        if (removeMemberBtn) {
            removeMemberBtn.addEventListener('click', () => {
                const cards = membersContainer.querySelectorAll('.member-card');
                if (cards.length <= currentMin) {
                    showCustomAlert(`Minimum ${currentMin} members required for this event.`);
                    return;
                }
                if (cards.length > 1) {
                    cards[cards.length - 1].remove();
                }
            });
        }

        // 2. Event Change Logic (Updates Constants & UI)
        eventSelect.addEventListener('change', () => {
            const config = EVENT_CONFIG[eventSelect.value];
            if (config) {
                currentFee = config.fee;
                currentMin = config.min;
                currentMax = config.max;

                // Auto-Adjust Team Size
                const cards = membersContainer.querySelectorAll('.member-card');
                const currentCount = cards.length;

                // Add if below min
                const needed = currentMin - currentCount;
                if (needed > 0) {
                    for (let i = 0; i < needed; i++) {
                        if (addMemberBtn) addMemberBtn.click();
                    }
                }
                // Remove if above max
                else if (currentCount > currentMax) {
                    const removeCount = currentCount - currentMax;
                    for (let i = 0; i < removeCount; i++) {
                        if (removeMemberBtn) removeMemberBtn.click();
                    }
                }
            }
        });

        // Trigger once to set initial state
        if (eventSelect.value) {
            eventSelect.dispatchEvent(new Event('change'));
        }

        // 3. Submit Registration
        regForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = regForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;

            // Validate Member Count
            const memberCount = membersContainer.querySelectorAll('.member-card').length;
            if (memberCount < currentMin) {
                showCustomAlert(`Minimum ${currentMin} members required for this event.`);
                return;
            }

            // Enforce Email Verification for ALL Members
            let allVerified = true;
            const memberInputs = membersContainer.querySelectorAll('.member-email-input');

            for (let i = 0; i < memberInputs.length; i++) {
                if (memberInputs[i].dataset.verified !== "true") {
                    allVerified = false;
                    const memberName = memberInputs[i].closest('.member-card').querySelector('h4').innerText;
                    showCustomAlert(`Please verify the Email ID for ${memberName} before proceeding.`);
                    return; // Stop submission
                }
            }

            submitBtn.innerHTML = "[ INITIATING UPLOAD... ]";
            submitBtn.disabled = true;

            try {
                // Collect Data
                const teamName = document.getElementById('team-name').value;
                const event = eventSelect.value;
                const members = [];

                document.querySelectorAll('.member-card').forEach(card => {
                    const m = {};
                    const inputs = card.querySelectorAll('input');
                    let hasData = false;
                    inputs.forEach(input => {
                        const parts = input.name.split('_');
                        if (parts.length > 1) {
                            const field = parts.slice(1).join('_'); // e.g., name, phone
                            m[field] = input.value;
                            if (input.value) hasData = true;
                        }
                    });
                    if (hasData) members.push(m);
                });

                // Check for Duplicate Emails within the Team
                const emails = members.map(m => m.email.toLowerCase().trim());

                // Validate Email Format
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                for (let i = 0; i < emails.length; i++) {
                    if (!emailRegex.test(emails[i])) {
                        showCustomAlert(`Invalid email address found: ${members[i].email}. Please enter a valid email.`);
                        submitBtn.innerHTML = originalBtnText;
                        submitBtn.disabled = false;
                        return;
                    }
                }

                const uniqueEmails = new Set(emails);
                if (uniqueEmails.size !== emails.length) {
                    showCustomAlert("Duplicate email IDs found. Each member must have a unique email address.");
                    submitBtn.innerHTML = originalBtnText;
                    submitBtn.disabled = false;
                    return; // Stop submission
                }

                // Validate Phone and WhatsApp Length (Exactly 10 digits)
                for (const m of members) {
                    if (m.phone && m.phone.length !== 10) {
                        showCustomAlert(`Invalid Phone Number for ${m.name}. Must be exactly 10 digits.`);
                        submitBtn.innerHTML = originalBtnText;
                        submitBtn.disabled = false;
                        return;
                    }
                    if (m.whatsapp && m.whatsapp.length !== 10) {
                        showCustomAlert(`Invalid WhatsApp Number for ${m.name}. Must be exactly 10 digits.`);
                        submitBtn.innerHTML = originalBtnText;
                        submitBtn.disabled = false;
                        return;
                    }
                }

                // Check for Duplicate Phone Numbers within the Team
                const phones = members.map(m => m.phone ? m.phone.trim() : "");
                // Filter out empty phones if any
                const validPhones = phones.filter(p => p.length > 0);

                const uniquePhones = new Set(validPhones);
                if (uniquePhones.size !== validPhones.length) {
                    showCustomAlert("Phone number should be unique. Please provide different mobile numbers for each member.");
                    submitBtn.innerHTML = originalBtnText;
                    submitBtn.disabled = false;
                    return; // Stop submission
                }

                const payload = {
                    teamName,
                    email: members[0].email,
                    password: Math.random().toString(36).slice(-8), // Auto-gen password
                    event,
                    transactionId: "PENDING",
                    members
                };

                const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const text = await res.text();
                let data;
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    console.error("Non-JSON Response:", text);
                    throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}...`);
                }

                if (res.ok && data.teamId) {
                    // Calculate Total Amount based on head count if applicable
                    let totalAmount = currentFee;
                    if (EVENT_CONFIG[event] && EVENT_CONFIG[event].perHead) {
                        totalAmount = currentFee * members.length;
                    }

                    // Direct Redirect (No Alert)
                    window.location.href = `payment.html?teamId=${data.teamId}&amount=${totalAmount}&event=${encodeURIComponent(event)}&members=${members.length}`;
                } else {
                    throw new Error(data.error || "Registration failed");
                }

            } catch (err) {
                console.error(err);
                showCustomAlert("Error: " + err.message);
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    }

    // Run Init
    init();
} // End of if (regForm)

// Check if we are on payment page (Global check, outside regForm)
if (window.location.pathname.includes('payment.html')) {
    initPaymentPage();
}

// Payment Page Logic (Global Function)
// Payment Page Logic (Global Function)
function initPaymentPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const teamId = urlParams.get('teamId');
    const amount = urlParams.get('amount');
    const eventName = urlParams.get('event'); // Get event name

    const amountDisplay = document.getElementById('payment-amount-display');
    const confirmBtn = document.getElementById('confirm-payment-btn');
    const cancelBtn = document.getElementById('cancel-payment-btn');

    // Update Amount
    if (amountDisplay) amountDisplay.innerText = `AMOUNT: ₹ ${amount}.00`;

    // Show Per Head Cost for Hackathon
    const merchantInfo = document.getElementById('merchant-info');
    if (merchantInfo && !document.getElementById('per-head-msg')) {
        const perHeadMsg = document.createElement('p');
        perHeadMsg.id = 'per-head-msg';
        perHeadMsg.style.marginBottom = "10px";
        perHeadMsg.style.marginTop = "5px";

        if (eventName === '24 Hrs Hackathon') {
            perHeadMsg.innerHTML = `<span style="color: var(--neon-green); font-weight: bold; background: rgba(0, 255, 65, 0.1); padding: 4px 10px; border: 1px solid var(--neon-green); border-radius: 4px; font-size: 0.9rem;">EARLY BIRD OFFER: ₹ 250 PER HEAD</span>`;
        } else if (eventName === 'paper_presentation' || eventName === 'Paper Presentation') {
            perHeadMsg.innerText = "REGISTRATION FEE: ₹ 150";
            perHeadMsg.style.color = "#00e5ff";
            perHeadMsg.style.fontSize = "0.9rem";
            perHeadMsg.style.fontFamily = "'Share Tech Mono'";
        }

        if (perHeadMsg.innerHTML || perHeadMsg.innerText) {
            merchantInfo.parentNode.insertBefore(perHeadMsg, merchantInfo.nextSibling);
        }
    }

    // Determine Member Count for Logic (Pass 'members' count via URL)
    const memberCount = parseInt(urlParams.get('members')) || 1;

    // Update QR Code & Amount Logic based on Event & Head Count
    const qrImg = document.querySelector('img[alt="Payment QR"]');
    if (qrImg) {
        if (eventName === '24 Hrs Hackathon') {
            if (memberCount === 2) {
                qrImg.src = 'Main%20Hack(2%20head).jpeg';
                if (amountDisplay) amountDisplay.innerText = `AMOUNT: ₹ 500.00`;
            } else if (memberCount === 3) {
                qrImg.src = 'Main%20Hack(3%20head).jpeg';
                if (amountDisplay) amountDisplay.innerText = `AMOUNT: ₹ 750.00`;
            } else if (memberCount === 4) {
                qrImg.src = 'Main%20Hack(4%20head).jpeg';
                if (amountDisplay) amountDisplay.innerText = `AMOUNT: ₹ 1000.00`;
            } else {
                // Fallback (Default to 4 head if count is unexpected)
                qrImg.src = 'Main%20Hack(4%20head).jpeg';
            }
        } else if (eventName === 'paper_presentation' || eventName === 'Paper Presentation') {
            qrImg.src = 'Paper%20Presentation.jpeg';
        }
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }

    if (confirmBtn) {
        // Remove existing listeners to be safe (though cloning is better, we'll just add new one and assume clean state)
        confirmBtn.replaceWith(confirmBtn.cloneNode(true));
        const newConfirmBtn = document.getElementById('confirm-payment-btn');

        newConfirmBtn.addEventListener('click', () => {
            const fileInput = document.getElementById('payment-proof-file');
            const utrInput = document.getElementById('utr-number');

            if (!utrInput || !utrInput.value.trim()) {
                showCustomAlert("Please enter the UTR / Transaction Number.");
                return;
            }

            if (!fileInput || fileInput.files.length === 0) {
                showCustomAlert("Please upload the payment proof screenshot.");
                return;
            }

            const file = fileInput.files[0];
            const formData = new FormData();

            // IMPORTANT: Append text fields BEFORE the file so Multer can access them in filename callback
            formData.append('teamId', teamId);
            formData.append('utrNumber', utrInput.value.trim());
            formData.append('paymentProof', file);

            newConfirmBtn.innerHTML = "[ UPLOADING... ]";
            newConfirmBtn.disabled = true;

            fetch(`${API_BASE_URL}/api/payment/upload`, {
                method: 'POST',
                body: formData
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        showCustomAlert("Payment proof submitted successfully!\n\nPlease check your Team Leader's Email for Login Credentials to access the Dashboard.", () => {
                            window.location.href = 'login.html';
                        });
                    } else {
                        showCustomAlert("Upload Failed: " + (data.error || "Unknown Error"));
                        newConfirmBtn.innerHTML = "[ UPLOAD PROOF & FINISH ]";
                        newConfirmBtn.disabled = false;
                    }
                })
                .catch(err => {
                    console.error(err);
                    showCustomAlert("Network Error during upload.");
                    newConfirmBtn.innerHTML = "[ UPLOAD PROOF & FINISH ]";
                    newConfirmBtn.disabled = false;
                });
        });
    }
}


// Custom Cursor: Green Dot & Circle
const cursorDot = document.createElement('div');
cursorDot.classList.add('cursor-dot');
const cursorOutline = document.createElement('div');
cursorOutline.classList.add('cursor-outline');
document.body.appendChild(cursorDot);
document.body.appendChild(cursorOutline);

window.addEventListener('mousemove', (e) => {
    const posX = e.clientX;
    const posY = e.clientY;

    // Dot follows immediately
    cursorDot.style.left = `${posX}px`;
    cursorDot.style.top = `${posY}px`;

    // Outline follows with slight delay
    cursorOutline.animate({
        left: `${posX}px`,
        top: `${posY}px`
    }, { duration: 500, fill: "forwards" });
});

// Mobile Touch Support for Cursor
window.addEventListener('touchmove', (e) => {
    const touch = e.touches[0];
    const posX = touch.clientX;
    const posY = touch.clientY;

    cursorDot.style.left = `${posX}px`;
    cursorDot.style.top = `${posY}px`;

    cursorOutline.animate({
        left: `${posX}px`,
        top: `${posY}px`
    }, { duration: 500, fill: "forwards" });
});

// Interactive Elements Hover Effect
const interactiveElements = document.querySelectorAll('a, button, .card, input, select');
interactiveElements.forEach(el => {
    el.addEventListener('mouseenter', () => {
        cursorOutline.style.transform = 'translate(-50%, -50%) scale(1.2)';
    });
    el.addEventListener('mouseleave', () => {
        cursorOutline.style.transform = 'translate(-50%, -50%) scale(1)';
    });
});

// Interactive Elements Hover Effect


// Scroll Animations
const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add('show-el');
        }
    });
});

const hiddenElements = document.querySelectorAll('.hidden-el');
hiddenElements.forEach((el) => observer.observe(el));

// Loading Screen
window.addEventListener('load', () => {
    const loader = document.getElementById('loader-overlay');
    if (loader) {
        setTimeout(() => {
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.style.display = 'none';
            }, 500);
        }, 1500); // Show loader for 1.5s minimum
    }
});

// Store original text in data-value for the matrix effect
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('nav a').forEach(link => {
        link.dataset.value = link.innerText;
    });
});

// Countdown Timer
function startCountdown() {
    // Target Date: March 13, 2026 09:30:00
    const eventDate = new Date('March 13, 2026 09:30:00').getTime();

    // Update the count down every 1 second
    const x = setInterval(function () {
        const now = new Date().getTime();
        const distance = eventDate - now;

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        // Display the result in the elements with id="days", "hours", "mins", "secs"
        const daysEl = document.getElementById("days");
        const hoursEl = document.getElementById("hours");
        const minsEl = document.getElementById("mins");
        const secsEl = document.getElementById("secs");

        if (daysEl && hoursEl && minsEl && secsEl) {
            daysEl.innerText = days < 10 ? "0" + days : days;
            hoursEl.innerText = hours < 10 ? "0" + hours : hours;
            minsEl.innerText = minutes < 10 ? "0" + minutes : minutes;
            secsEl.innerText = seconds < 10 ? "0" + seconds : seconds;
        }

        // If the count down is finished, write some text
        if (distance < 0) {
            clearInterval(x);
            if (daysEl) document.querySelector('.countdown-container').innerHTML = "<div style='color: var(--neon-green); font-size: 2rem;'>[ BREACH IN PROGRESS ]</div>";
        }
    }, 1000);
}

// Start countdown
startCountdown();

// --- LIVE CYBER SECURITY NEWS FETCH ---
async function fetchCyberNews() {
    // Only update the Terminal, leave Marquee as static HTML ("REGISTRATIONS STARTS SOON")
    const terminalBody = document.querySelector('.cyber-insights .terminal-body');
    const terminalTitle = document.querySelector('.cyber-insights .terminal-title');

    // URLs
    const rssUrl = 'https://feeds.feedburner.com/TheHackersNews';
    const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.status === 'ok' && data.items.length > 0) {

            // UPDATE TERMINAL (Cyber Intelligence Section)
            if (terminalBody) {
                // Update Title
                if (terminalTitle) terminalTitle.innerText = "root@matrix:~/live_threat_feed.log";

                let terminalHtml = '';

                // Show top 3 items with details
                data.items.slice(0, 3).forEach(item => {
                    const date = new Date(item.pubDate).toLocaleDateString();
                    // Strip HTML from description if possible, though innerHTML is used. 
                    // RSS2JSON returns description often with HTML. We can use it or strip it.
                    // Let's use a simple regex to strip basic tags if it's too messy, or just trust it.
                    // Usually description is a short snippet.

                    terminalHtml += `
                        <p style="margin-bottom: 25px; border-bottom: 1px dashed #333; padding-bottom: 15px;">
                            <span style="color: var(--neon-green);">>> [${date}] NEW_INTEL_RECEIVED:</span><br>
                            <a href="${item.link}" target="_blank" style="color: #fff; text-decoration: none; font-weight: bold; font-size: 1.1rem; display: block; margin: 5px 0;">
                                ${item.title}
                            </a>
                            <span style="color: #ccc; font-size: 0.9rem; display: block; margin-bottom: 8px;">
                                ${item.description ? item.description.replace(/<[^>]*>/g, '').substring(0, 150) + '...' : 'No details available.'}
                            </span>
                            <a href="${item.link}" target="_blank" style="color: #00e5ff; font-size: 0.8rem;">[ ACCESS_FULL_DATA ]</a>
                        </p>
                    `;
                });

                // Add a blinking cursor at the end
                terminalHtml += `
                    <p style="color: var(--neon-green); margin-top: 10px;">
                        >> AWAITING_NEXT_PACKET <span class="blink">_</span>
                    </p>
                `;

                terminalBody.innerHTML = terminalHtml;
            }

        }
    } catch (error) {
        console.error('Failed to fetch news:', error);
        // Keep original terminal content on error or show error message
    }
}

// Fetch immediately
fetchCyberNews();

// Refresh news every 10 minutes
// Refresh news every 10 minutes
setInterval(fetchCyberNews, 600000);

/* --- NEW FEATURES IMPLEMENTATION --- */

/* 1. INTERACTIVE HACKER TERMINAL */
document.addEventListener('DOMContentLoaded', () => {
    const terminalOverlay = document.getElementById('hacker-terminal');
    const terminalInput = document.getElementById('terminal-input');
    const terminalOutput = document.getElementById('terminal-output');

    // Toggle Terminal with `~` key
    document.addEventListener('keydown', (e) => {
        if (e.key === '`' || e.key === '~') {
            e.preventDefault();
            if (terminalOverlay.style.display === 'block') {
                terminalOverlay.style.display = 'none';
            } else {
                terminalOverlay.style.display = 'block';
                terminalInput.focus();
            }
        }
    });

    // Command Parser
    if (terminalInput) {
        terminalInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                const command = this.value.trim().toLowerCase();
                this.value = ''; // Clear input
                processCommand(command);
            }
        });
    }

    function processCommand(cmd) {
        printOutput(`guest@xploitx:~$ ${cmd}`);

        switch (cmd) {
            case 'help':
                printOutput("AVAILABLE COMMANDS:\n  help     - Show this list\n  clear    - Clear terminal\n  hack     - Initiate breach protocol\n  team     - List organizing nodes\n  exit     - Close terminal\n  flag     - Submit a flag (Usage: flag {YOUR_FLAG})");
                break;
            case 'clear':
                terminalOutput.innerHTML = '';
                break;
            case 'exit':
                terminalOverlay.style.display = 'none';
                break;
            case 'team':
                printOutput("ORGANIZING NODES:\n  - N Ashish (Admin)\n  - N Madhumitha (Admin)\n  - Dr. M D Boomija (HOD)");
                break;
            case 'hack':
                simulateHacking();
                break;
            default:
                if (cmd.startsWith('flag ')) {
                    const submittedFlag = cmd.substring(5).trim();
                    if (submittedFlag === '{XPL0ITX_M4ST3R_HACK3R}') {
                        printOutput("ACCESS GRANTED. YOU ARE TRULY ONE OF US.", "#00E5FF");
                    } else {
                        printOutput("ACCESS DENIED. INCORRECT FLAG.", "red");
                    }
                } else {
                    printOutput(`Command not found: ${cmd}. Type 'help' for assistance.`, "red");
                }
        }
    }

    function printOutput(text, color = "var(--neon-green)") {
        const div = document.createElement('div');
        div.style.color = color;
        div.textContent = text;
        terminalOutput.appendChild(div);
        // Scroll to bottom
        terminalOverlay.scrollTop = terminalOverlay.scrollHeight;
    }

    function simulateHacking() {
        const hacks = [
            "Initiating SSH connection...",
            "Bypassing firewall...",
            "Accessing mainframe...",
            "Decrypting hashes...",
            "Downloading sensitive data...",
            "BREACH SUCCESSFUL."
        ];
        let i = 0;
        const interval = setInterval(() => {
            if (i < hacks.length) {
                printOutput(hacks[i]);
                i++;
            } else {
                clearInterval(interval);
            }
        }, 600);
    }
});

/* 2. TYPEWRITER EFFECT */
function typeWriter(element, text, speed = 50) {
    if (!element) return;
    element.innerHTML = '';
    let i = 0;
    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    type();
}

// Apply to Hero Title
window.addEventListener('load', () => {
    const heroTitle = document.querySelector('.glitch-title'); // "SYSTEM BREACH DETECTED"
    if (heroTitle) {
        const originalText = heroTitle.innerText.replace(/\n/g, ' '); // Simple cleanup
        // We might want to keep the <br> structure, but for simple typewriter text is easier.
        // Let's just type the specific text "SYSTEM BREACH DETECTED"
        // Or if it's the index page:
        if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
            // Let's re-type the main header specifically or just leave it glitching. 
            // The user asked for typewriter effect. Let's apply it to a specific sub-header or the main one.
            // Let's try the sub-header "Join the Ultimate Cybersecurity Challenge"
            const subHeader = document.querySelector('p[style*="font-size: 1.2rem"]'); // Targeting the tagline we added
            if (subHeader) {
                const content = subHeader.innerText; // "Join the Ultimate..."
                // preserve HTML if possible? Hard with typewriter. 
                // Let's just create a new dynamic element for effect.
                const dynamicArea = document.createElement('div');
                dynamicArea.id = 'typewriter-msg';
                dynamicArea.style.color = 'var(--neon-green)';
                dynamicArea.style.fontFamily = 'monospace';
                dynamicArea.style.fontSize = '1.1rem';
                dynamicArea.style.marginTop = '10px';
                dynamicArea.style.minHeight = '20px'; // Prevent layout shift

                // Insert after hero title
                heroTitle.parentNode.insertBefore(dynamicArea, heroTitle.nextSibling);

                setTimeout(() => {
                    typeWriter(dynamicArea, ">> INITIALIZING_SEQUENCE... SYSTEM_ONLINE", 50);
                }, 1000);
            }
        }
    }
});

/* 3. CTF CHALLENGES (CONSOLE) */
console.log("%cSTOP! WAIT!", "color: red; font-size: 40px; font-weight: bold; text-shadow: 2px 2px black;");
console.log("%cLooking for flags? Here is a hint: The Matrix has hidden layers. Check the HTML comments.", "color: #00FF41; font-size: 14px; background: #000; padding: 10px;");
const HIDDEN_FLAG_VAR = "flag{C0NS0L3_L0G_EXPL0R3R}";

/* 4. 3D TILT EFFECT */
document.addEventListener('mousemove', (e) => {
    const cards = document.querySelectorAll('.card, .node-card, .info-card');
    cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Only trigger if mouse is close/over to save performance? 
        // Or global subtle effect. Let's do hover-based in CSS usually, but JS allows "following".
        // Let's check if mouse is over or near.
        if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = ((y - centerY) / centerY) * -10; // Max 10 deg
            const rotateY = ((x - centerX) / centerX) * 10;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
            card.style.transition = 'transform 0.1s ease';
        } else {
            // Reset
            // card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
            // card.style.transition = 'transform 0.5s ease';
            // Note: CSS might override this if we don't unset inline styles or manage state.
            // Actually, best to just let CSS :hover handle scale/reset, and we just add rotation.
            if (card.style.transform.includes('rotate')) {
                card.style.transform = 'none';
                card.style.transition = 'transform 0.5s ease';
            }
        }
    });
});

/* 5. MOBILE MENU TOGGLE */
document.addEventListener('DOMContentLoaded', () => {
    const mobileMenuOpen = document.getElementById('mobile-menu-open');
    const mobileMenuClose = document.getElementById('mobile-menu-close');
    const mobileNav = document.getElementById('mobile-nav');

    if (mobileMenuOpen && mobileMenuClose && mobileNav) {
        mobileMenuOpen.addEventListener('click', () => {
            mobileNav.classList.add('active');
            mobileMenuOpen.classList.add('hidden'); // Hide button when menu is open
            document.body.style.overflow = 'hidden';
        });

        mobileMenuClose.addEventListener('click', () => {
            mobileNav.classList.remove('active');
            mobileMenuOpen.classList.remove('hidden'); // Show button when menu is closed
            document.body.style.overflow = '';
        });

        const navLinks = mobileNav.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileNav.classList.remove('active');
                mobileMenuOpen.classList.remove('hidden');
                document.body.style.overflow = '';
            });
        });
    }
});
