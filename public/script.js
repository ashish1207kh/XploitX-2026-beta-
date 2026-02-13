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
        'CTF (24 Hours)': { min: 2, max: 4, fee: 150, perHead: true }, // Day 1
        'Workshop': { min: 1, max: 1, fee: 150, perHead: true }, // Day 1 
        'paper_presentation': { min: 1, max: 4, fee: 150, perHead: false }, // Day 2
        'digital_forensics': { min: 1, max: 4, fee: 50, perHead: true }, // Day 2
        'network_defense': { min: 1, max: 4, fee: 50, perHead: true } // Day 2
    };

    let currentFee = 0;
    let currentMin = 1;
    let currentMax = 5;

    // Elements
    const daySelect = document.getElementById('day-select');
    const dynamicOptions = document.getElementById('dynamic-event-options');
    // NOTE: eventSelect is now a hidden input, but we keep the variable name for compatibility with logic below if we update it correctly
    const eventSelectInput = document.getElementById('event-select');

    // Legacy element references
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

        // DAY SELECTION LOGIC
        if (daySelect) {
            daySelect.addEventListener('change', () => {
                const day = daySelect.value;
                renderEventOptions(day);
            });
        }

        function renderEventOptions(day) {
            if (!dynamicOptions) return;
            dynamicOptions.innerHTML = '';
            eventSelectInput.value = ''; // Reset hidden input

            if (day === 'Day 1') {
                const opts = ['CTF (24 Hours)', 'Workshop'];
                opts.forEach(opt => {
                    const label = document.createElement('label');
                    label.style.display = 'flex';
                    label.style.alignItems = 'center';
                    label.style.color = '#fff';
                    label.style.cursor = 'pointer';
                    label.style.marginRight = '20px'; // Spacing between options

                    label.innerHTML = `
                        <input type="radio" name="day1_event_radio" value="${opt}" style="margin: 0; margin-right: 8px; accent-color: var(--neon-green); transform: scale(1.2);">
                        <span style="font-family: 'Share Tech Mono'; font-size: 0.9rem; white-space: nowrap;">${opt}</span>
                    `;
                    dynamicOptions.appendChild(label);

                    // Listener
                    const input = label.querySelector('input');
                    input.addEventListener('change', () => {
                        handleSelectionChange();
                    });
                });
            } else if (day === 'Day 2') {
                // Checkboxes: Paper Presentation, Network Defense, Digital Forensics
                const opts = [
                    { val: 'paper_presentation', txt: 'Paper Presentation' },
                    { val: 'network_defense', txt: 'Network Defense' },
                    { val: 'digital_forensics', txt: 'Digital Forensics' }
                ];
                opts.forEach(opt => {
                    const label = document.createElement('label');
                    label.style.display = 'flex';
                    label.style.alignItems = 'center';
                    label.style.color = '#fff';
                    label.style.cursor = 'pointer';
                    label.style.marginRight = '20px'; // Spacing between options

                    label.innerHTML = `
                        <input type="checkbox" name="day2_event_check" value="${opt.val}" style="margin-right: 8px; accent-color: var(--neon-green); transform: scale(1.2);">
                        <span style="font-family: 'Share Tech Mono'; font-size: 0.9rem;">${opt.txt}</span>
                    `;
                    dynamicOptions.appendChild(label);

                    // Listener
                    const input = label.querySelector('input');
                    input.addEventListener('change', handleSelectionChange);
                });

            }
        }

        function handleSelectionChange() {
            // 0. Pre-Cleanup (Day 1 Bonus Logic)
            // If in Day 1 mode (radios exist) and CTF is NOT selected, remove bonus options immediately so they aren't gathered incorrectly.
            const day1Radios = document.querySelectorAll('input[name="day1_event_radio"]');
            if (day1Radios.length > 0) {
                const ctfChecked = document.querySelector('input[name="day1_event_radio"][value="CTF (24 Hours)"]:checked');
                const bonusContainer = document.getElementById('ctf-bonus-container');
                if (!ctfChecked && bonusContainer) {
                    bonusContainer.remove();
                }
            }

            // 1. Gather selected values
            const radios = document.querySelectorAll('input[name="day1_event_radio"]:checked');
            const checks = document.querySelectorAll('input[name="day2_event_check"]:checked');

            const selectedEvents = [];
            radios.forEach(r => selectedEvents.push(r.value));
            checks.forEach(c => selectedEvents.push(c.value));

            // 2. Update hidden input
            const finalVal = selectedEvents.join(',');
            eventSelectInput.value = finalVal;
            // Save to Cookie (2 Minutes)
            setCookieMinutes('selected_events_v2', encodeURIComponent(finalVal), 2);

            // 4. CTF Bonus Options Logic (Render Day 2 events if CTF selected)
            // We do this BEFORE label updates so they can be targeted
            const isCTF = selectedEvents.includes('CTF (24 Hours)');
            if (isCTF) {
                if (!document.getElementById('ctf-bonus-container')) {
                    const bonusContainer = document.createElement('div');
                    bonusContainer.id = 'ctf-bonus-container';
                    bonusContainer.style.width = '100%';
                    bonusContainer.style.marginTop = '15px';
                    bonusContainer.style.padding = '10px';
                    bonusContainer.style.border = '1px dashed var(--neon-green)';
                    bonusContainer.style.background = 'rgba(0, 255, 65, 0.05)';
                    bonusContainer.innerHTML = '<div style="color:var(--neon-green); font-size:0.9rem; margin-bottom:10px;">> OPTIONAL ADD-ONS (FREE WITH CTF):</div><div id="ctf-bonus-inner" style="display:flex; gap:20px; flex-wrap:wrap;"></div>';
                    dynamicOptions.appendChild(bonusContainer);

                    const inner = bonusContainer.querySelector('#ctf-bonus-inner');
                    const bonusOpts = [
                        { val: 'network_defense', txt: 'Network Defense' },
                        { val: 'digital_forensics', txt: 'Digital Forensics' }
                    ];

                    bonusOpts.forEach(opt => {
                        const label = document.createElement('label');
                        label.style.display = 'flex';
                        label.style.alignItems = 'center';
                        label.style.color = '#fff';
                        label.style.cursor = 'pointer';
                        label.innerHTML = `
                            <input type="checkbox" name="day2_event_check" value="${opt.val}" style="margin-right: 8px; accent-color: var(--neon-green);">
                            <span style="font-family: 'Share Tech Mono'; font-size: 0.9rem;">${opt.txt}</span>
                        `;
                        inner.appendChild(label);
                        // Add Listener
                        label.querySelector('input').addEventListener('change', handleSelectionChange);
                    });
                }
            }

            // Update UI Labels for Day 2 Discount
            const isFreeAccess = selectedEvents.includes('paper_presentation') || selectedEvents.includes('CTF (24 Hours)');
            ['network_defense', 'digital_forensics'].forEach(evt => {
                const cbs = document.querySelectorAll(`input[name="day2_event_check"][value="${evt}"]`);
                cbs.forEach(cb => {
                    const span = cb.nextElementSibling;
                    const baseText = evt === 'network_defense' ? 'Network Defense' : 'Digital Forensics';
                    if (isFreeAccess) {
                        span.innerHTML = `${baseText} <span style="color:var(--neon-green); font-weight:bold; margin-left:5px;">(FREE)</span>`;
                    } else {
                        span.innerText = baseText;
                    }
                });
            });

            // 3. Calculate Config (Fee, Min, Max)
            recalculateConfig(selectedEvents);
        }

        function recalculateConfig(events) {
            currentFee = 0;
            // Defaults (broadest range)
            let minP = 1;
            let maxP = 10;

            // If no event, reset
            if (events.length === 0) {
                currentMin = 1;
                currentMax = 5;
                return;
            }

            // Logic: strict intersection for Min/Max? 
            // Or "Max of Mins" and "Min of Maxes"?
            // Example: Event A (2-4), Event B (1-3).
            // Valid size must satisfy both? => 2-3.

            let strictMin = 0;
            let strictMax = 999;

            const hasPaper = events.includes('paper_presentation');

            events.forEach(ev => {
                const conf = EVENT_CONFIG[ev];
                if (conf) {
                    if (conf.min > strictMin) strictMin = conf.min;
                    if (conf.max < strictMax) strictMax = conf.max;

                    // Accumulate Fee
                    if (conf.fee) {
                        // Logic: If Paper Presentation is selected, Digital Forensics and Network Defense are free
                        if (hasPaper && (ev === 'digital_forensics' || ev === 'network_defense')) {
                            currentFee += 0;
                        } else {
                            currentFee += conf.fee;
                        }
                    }
                }
            });

            currentMin = strictMin;
            currentMax = strictMax;

            if (currentMin > currentMax) {
                // Conflict
                showCustomAlert("Error: Selected events have conflicting team size requirements.");
            }

            // Trigger Member Update
            updateMemberConstraints();
        }

        function updateMemberConstraints() {
            const cards = membersContainer.querySelectorAll('.member-card');
            const currentCount = cards.length;

            // Add if below min
            const needed = currentMin - currentCount;
            if (needed > 0) {
                for (let i = 0; i < needed; i++) {
                    if (addWorkshopMemberFallback()) { /* manual add */ }
                    else if (addMemberBtn) addMemberBtn.click();
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

        // Helper to simulate click if btn hidden or logic complex
        // We reuse the existing click handler by just calling click() on button
        // But need to ensure button exists
        function addWorkshopMemberFallback() { return false; }


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
                // Remove Verification Elements for additional members (Only Leader needs to verify)
                const otpSection = clone.querySelector('.otp-section');
                if (otpSection) otpSection.remove();

                const verifiedBadge = clone.querySelector('.email-verified-badge');
                if (verifiedBadge) verifiedBadge.remove();

                const verifyBtn = clone.querySelector('.verify-email-btn');
                if (verifyBtn) verifyBtn.remove();

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
                // Only enforce verification for Leader (Index 0)
                if (i === 0 && memberInputs[i].dataset.verified !== "true") {
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
                const event = eventSelectInput.value;
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
                    event,
                    transactionId: "PENDING",
                    members
                };

                // --- CHANGED LOGIC: DEFER SUBMISSION UNTIL PAYMENT ---
                // Store payload for later
                window.pendingRegistrationPayload = payload;

                // Move directly to Payment Modal logic (simulate success)

                // Calculate Total Amount Correctly (Handling multiple events)
                const selectedEvents = event.split(',');
                let totalAmount = 0;
                let originalTotalAmount = 0; // For Strike-through display

                // Base fees for "Original Price" before Early Bird
                const BASE_FEES = {
                    'CTF (24 Hours)': 350,
                    'Workshop': 500,
                    'paper_presentation': 300,
                    'digital_forensics': 100,
                    'network_defense': 100
                };

                const hasFreeAccess = selectedEvents.includes('paper_presentation') || selectedEvents.includes('CTF (24 Hours)');

                selectedEvents.forEach(ev => {
                    const conf = EVENT_CONFIG[ev];
                    if (conf) {
                        let fee = conf.fee;
                        let originalFee = BASE_FEES[ev] || fee;

                        // Discount Logic: Paper Presentation OR CTF makes Digital Forensics & Network Defense free
                        if (hasFreeAccess && (ev === 'digital_forensics' || ev === 'network_defense')) {
                            fee = 0;
                            originalFee = 0; // Exclude from original amount sum if free
                        }

                        if (conf.perHead) {
                            totalAmount += fee * members.length;
                            originalTotalAmount += originalFee * members.length;
                        } else {
                            totalAmount += fee;
                            originalTotalAmount += originalFee;
                        }
                    }
                });

                // --- IN-PAGE PAYMENT MODAL LOGIC ---
                const pModal = document.getElementById('payment-modal');
                const pAmount = document.getElementById('payment-amount-display');
                const pQr = pModal.querySelector('img[alt="Payment QR"]');
                const pUtr = document.getElementById('utr-number');
                const pFile = document.getElementById('payment-proof-file');
                const pConfirm = document.getElementById('confirm-payment-btn');
                const pMerchantInfo = document.getElementById('merchant-info');

                // Set Amount with Strikethrough if applicable
                if (pAmount) {
                    if (originalTotalAmount > totalAmount) {
                        pAmount.innerHTML = `AMOUNT: <span style="text-decoration: line-through; color: #ff4444; margin-right: 15px; font-size: 0.9em;">₹ ${originalTotalAmount}.00</span> ₹ ${totalAmount}.00`;
                    } else {
                        pAmount.innerText = `AMOUNT: ₹ ${totalAmount}.00`;
                    }
                }

                // Add Early Bird / Fee Info if missing
                if (pMerchantInfo && !document.getElementById('per-head-msg-reg')) {
                    const perHeadMsg = document.createElement('div');
                    perHeadMsg.id = 'per-head-msg-reg';
                    perHeadMsg.style.marginBottom = "10px";
                    perHeadMsg.style.marginTop = "5px";

                    let msgHtml = '';

                    // DAY 1 EVENTS
                    if (selectedEvents.includes('CTF (24 Hours)')) {
                        const ctfOfferAmount = 150 * members.length;
                        msgHtml += `<div style="margin-bottom: 5px;"><span style="color: var(--neon-green); font-weight: bold; background: rgba(0, 255, 65, 0.1); padding: 4px 10px; border: 1px solid var(--neon-green); border-radius: 4px; font-size: 0.9rem;">CTF: EARLY BIRD OFFER ₹ ${ctfOfferAmount}</span></div>`;
                    }
                    if (selectedEvents.includes('Workshop')) {
                        msgHtml += `<div style="margin-bottom: 5px;"><span style="color: #00e5ff; font-weight: bold; background: rgba(0, 229, 255, 0.1); padding: 4px 10px; border: 1px solid #00e5ff; border-radius: 4px; font-size: 0.9rem;">WORKSHOP: EARLY BIRD OFFER ₹ 150</span></div>`;
                    }

                    // DAY 2 EVENTS
                    if (selectedEvents.includes('paper_presentation')) {
                        msgHtml += `<div style="margin-bottom: 5px;"><span style="color: #00e5ff; font-weight: bold; background: rgba(0, 229, 255, 0.1); padding: 4px 10px; border: 1px solid #00e5ff; border-radius: 4px; font-size: 0.9rem;">PAPER PRESENTATION: EARLY BIRD OFFER ₹ 150</span></div>`;
                    }

                    if (selectedEvents.includes('digital_forensics')) {
                        if (!hasFreeAccess) {
                            msgHtml += `<div style="margin-bottom: 5px;"><span style="color: #00e5ff; font-weight: bold; background: rgba(0, 229, 255, 0.1); padding: 4px 10px; border: 1px solid #00e5ff; border-radius: 4px; font-size: 0.9rem;">DIGITAL FORENSICS: EARLY BIRD OFFER ₹ 50</span></div>`;
                        } else {
                            msgHtml += `<div style="margin-bottom: 5px;"><span style="color: var(--neon-green); font-size: 0.85rem;">DIGITAL FORENSICS: FREE WITH COMBO</span></div>`;
                        }
                    }
                    if (selectedEvents.includes('network_defense')) {
                        if (!hasFreeAccess) {
                            msgHtml += `<div style="margin-bottom: 5px;"><span style="color: #00e5ff; font-weight: bold; background: rgba(0, 229, 255, 0.1); padding: 4px 10px; border: 1px solid #00e5ff; border-radius: 4px; font-size: 0.9rem;">NETWORK DEFENSE: EARLY BIRD OFFER ₹ 50</span></div>`;
                        } else {
                            msgHtml += `<div style="margin-bottom: 5px;"><span style="color: var(--neon-green); font-size: 0.85rem;">NETWORK DEFENSE: FREE WITH COMBO</span></div>`;
                        }
                    }

                    perHeadMsg.innerHTML = msgHtml;

                    if (perHeadMsg.innerHTML) {
                        pMerchantInfo.parentNode.insertBefore(perHeadMsg, pMerchantInfo.nextSibling);
                    }
                }

                // Set QR Code based on count
                if (pQr) {
                    if (selectedEvents.includes('CTF (24 Hours)')) {
                        if (members.length === 2) pQr.src = 'Early(300).jpeg';
                        else if (members.length === 3) pQr.src = 'Early(450).jpeg';
                        else if (members.length === 4) pQr.src = 'Early(600).jpeg';
                        else pQr.src = 'Early(300).jpeg'; // Fallback
                    } else if (selectedEvents.includes('paper_presentation')) {
                        pQr.src = '150.jpeg';
                    } else if (selectedEvents.includes('Workshop')) {
                        pQr.src = '150.jpeg';
                    } else if (selectedEvents.includes('network_defense') && selectedEvents.includes('digital_forensics')) {
                        // Both selected and NOT free (since CTF/Paper checks failed above)
                        if (members.length === 1) pQr.src = '100.jpeg';
                        else if (members.length === 2) pQr.src = '200.jpeg';
                        else if (members.length === 3) pQr.src = '300.jpeg';
                        else if (members.length === 4) pQr.src = '400.jpeg';
                        else pQr.src = '100.jpeg';
                    } else if (selectedEvents.includes('network_defense')) {
                        if (members.length === 1) pQr.src = '50.jpeg';
                        else if (members.length === 2) pQr.src = '100.jpeg';
                        else if (members.length === 3) pQr.src = '150.jpeg';
                        else if (members.length === 4) pQr.src = '200.jpeg';
                        else pQr.src = '50.jpeg';
                    } else if (selectedEvents.includes('digital_forensics')) {
                        if (members.length === 1) pQr.src = '50.jpeg';
                        else if (members.length === 2) pQr.src = '100.jpeg';
                        else if (members.length === 3) pQr.src = '150.jpeg';
                        else if (members.length === 4) pQr.src = '200.jpeg';
                        else pQr.src = '50.jpeg';
                    }
                }

                // Show Payment Section
                pModal.style.display = 'flex';

                // Scroll to Payment Section
                setTimeout(() => {
                    pModal.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);

                // Hide the "Proceed to Payment" button now that we moved on
                const proceedBtn = document.querySelector('#team-form button[type="submit"]');
                if (proceedBtn) proceedBtn.style.display = 'none';

                // Input Validation
                function checkInputs() {
                    if (pUtr.value.trim() && pFile.files.length > 0) {
                        pConfirm.disabled = false;
                        pConfirm.style.opacity = '1';
                        pConfirm.style.cursor = 'pointer';
                    } else {
                        pConfirm.disabled = true;
                        pConfirm.style.opacity = '0.5';
                        pConfirm.style.cursor = 'not-allowed';
                    }
                }
                pUtr.oninput = checkInputs;
                pFile.onchange = checkInputs;
                checkInputs(); // Initial check

                // Upload Action (FINAL REGISTRATION)
                pConfirm.onclick = () => {
                    if (!window.pendingRegistrationPayload) {
                        showCustomAlert("Error: Registration data lost. Please refresh and try again.");
                        return;
                    }

                    const finalPayload = window.pendingRegistrationPayload;
                    const formData = new FormData();

                    // Append JSON fields
                    formData.append('teamName', finalPayload.teamName);
                    formData.append('email', finalPayload.email);
                    formData.append('event', finalPayload.event);
                    formData.append('members', JSON.stringify(finalPayload.members));

                    // Append Payment fields
                    formData.append('utrNumber', pUtr.value.trim());
                    formData.append('paymentProof', pFile.files[0]);

                    pConfirm.innerHTML = "[ PROCESSING REGISTRATION... ]";
                    pConfirm.disabled = true;

                    fetch(`${API_BASE_URL}/api/auth/register-with-payment`, {
                        method: 'POST',
                        body: formData
                    })
                        .then(r => r.json())
                        .then(d => {
                            if (d.success) {
                                showCustomAlert(`REGISTRATION SUCCESSFUL!\nTeam ID: ${d.teamId}\n\nCheck your email for confirmation... We will reach you within 72 hours`, () => {
                                    // Clear Cookies
                                    document.cookie = "xploitx_reg_data_v2=; max-age=0; path=/";
                                    document.cookie = "selected_events_v2=; max-age=0; path=/";
                                    document.cookie = "leader_email_verified_v2=; max-age=0; path=/";

                                    window.location.href = 'index.html';
                                });
                            } else {
                                showCustomAlert("Registration Failed: " + (d.error || "Unknown"));
                                // Reset UI to allow correction
                                pModal.style.display = 'none';
                                const proceedBtn = document.querySelector('#team-form button[type="submit"]');
                                if (proceedBtn) {
                                    proceedBtn.style.display = 'block';
                                    proceedBtn.innerHTML = "[ PROCEED TO PAYMENT ]";
                                    proceedBtn.disabled = false;
                                }
                            }
                        })
                        .catch(e => {
                            console.error(e);
                            showCustomAlert("Network Error: " + e.message);
                            pConfirm.innerHTML = "[ TRY AGAIN ]";
                            pConfirm.disabled = false;
                        });
                };

            } catch (err) {
                console.error(err);
                showCustomAlert("Error: " + err.message);
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    }

    // Run Init

    // --- Persistence Logic (Save/Restore Form Data) ---
    // --- Persistence Logic (Save/Restore Form Data) ---
    function saveToStorage() {
        const formData = {};
        // Collect all inputs
        const inputs = regForm.querySelectorAll('input, select');
        inputs.forEach(input => {
            if (input.name) {
                if (input.type === 'radio' || input.type === 'checkbox') {
                    if (input.checked) {
                        if (!formData[input.name]) formData[input.name] = [];
                        formData[input.name].push(input.value);
                    }
                } else {
                    formData[input.name] = input.value;
                }
            }
        });
        // Save to COOKIE (2 Minutes Expiry) - Encoded to handle special chars
        setCookieMinutes('xploitx_reg_data_v2', encodeURIComponent(JSON.stringify(formData)), 2);
    }

    function restoreFromStorage() {
        // 1. Restore Events from Cookie
        const eventCookie = getCookie("selected_events_v2");
        if (eventCookie) {
            const events = decodeURIComponent(eventCookie).split(',');
            const daySel = document.getElementById('day-select');

            if (daySel && events.length > 0) {
                // Determine Day
                const day1Events = ['CTF (24 Hours)', 'Workshop'];
                const isDay1 = events.some(e => day1Events.includes(e));

                // Set Day and Trigger Change
                daySel.value = isDay1 ? 'Day 1' : 'Day 2';
                daySel.dispatchEvent(new Event('change'));

                // Reliable Restoration loop
                let attempts = 0;
                const restoreInterval = setInterval(() => {
                    attempts++;
                    let allFound = true;

                    // Try to toggle the saved events
                    events.forEach(val => {
                        // Check Radio
                        const rad = document.querySelector(`input[name="day1_event_radio"][value="${val}"]`);
                        if (rad) {
                            if (!rad.checked) {
                                rad.checked = true;
                                rad.dispatchEvent(new Event('change')); // Trigger logic
                            }
                        } else {
                            // Check Checkbox
                            const chk = document.querySelector(`input[name="day2_event_check"][value="${val}"]`);
                            if (chk) {
                                if (!chk.checked) {
                                    chk.checked = true;
                                    chk.dispatchEvent(new Event('change')); // Trigger logic
                                }
                            } else {
                                // Element not found yet
                                allFound = false;
                            }
                        }
                    });

                    // Stop if all done or timeout (2 seconds)
                    if (allFound || attempts > 20) {
                        clearInterval(restoreInterval);
                    }
                }, 100);
            }
        }

        // 2. Restore other data from COOKIE (Form Data)
        let saved = getCookie('xploitx_reg_data_v2');
        if (saved) {
            try {
                saved = decodeURIComponent(saved);
                const data = JSON.parse(saved);
                for (const key in data) {
                    if (key === 'daySelect' || key === 'day1_event_radio' || key === 'day2_event_check') continue;

                    const inputs = document.getElementsByName(key);
                    if (inputs.length > 0) {
                        const val = data[key];
                        // Handle Text Inputs
                        if (inputs[0].type !== 'radio' && inputs[0].type !== 'checkbox') {
                            inputs[0].value = val;
                            inputs[0].dispatchEvent(new Event('input'));
                        }
                    }
                }
            } catch (e) {
                console.error("Error parsing cookie data", e);
            }
        }
    }

    // Auto-Save on any input change
    regForm.addEventListener('input', saveToStorage);
    regForm.addEventListener('change', saveToStorage); // For selects/checks

    // Restore on Load
    restoreFromStorage();

    init();
} // End of if (regForm)




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

// Helper Functions for Cookies
function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function setCookieMinutes(name, value, minutes) {
    let expires = "";
    if (minutes) {
        const date = new Date();
        date.setTime(date.getTime() + (minutes * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

// Restore State from Cookies on Load
document.addEventListener('DOMContentLoaded', () => {
    // Check Email Verification
    const isVerified = getCookie("leader_email_verified_v2");
    if (isVerified === "true") {
        const leaderEmailInput = document.querySelector('input[name="member1_email"]');
        if (leaderEmailInput) {
            leaderEmailInput.dataset.verified = "true";
            // Update UI
            const container = leaderEmailInput.closest('.form-group');
            const badge = container.querySelector('.email-verified-badge');
            const verifyBtn = container.querySelector('.verify-email-btn');
            const otpSection = container.querySelector('.otp-section');

            if (badge) badge.style.display = 'block';
            if (verifyBtn) verifyBtn.style.display = 'none';
            if (otpSection) otpSection.style.display = 'none';
        }
    }
});
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
