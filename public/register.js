document.addEventListener('DOMContentLoaded', () => {
    // Define API_BASE_URL (Global)
    const isLocal = window.location.protocol === 'file:' ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';
    const API_BASE_URL = isLocal ? 'http://localhost:3000' : '';

    const form = document.getElementById('team-form');

    // Use Event Delegation to handle multiple members (dynamic addition)
    document.addEventListener('click', async (e) => {
        // --- HANDLE VERIFY BUTTON CLICK ---
        if (e.target.classList.contains('verify-email-btn')) {
            const btn = e.target;
            const card = btn.closest('.form-group'); // This gets the parent form-group
            const emailInput = card.querySelector('.member-email-input');
            const otpSection = card.querySelector('.otp-section');

            const email = emailInput.value.trim();
            if (!email) {
                showCustomAlert("Please enter a valid email first.");
                return;
            }

            // Basic Regex Check
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showCustomAlert("Invalid email format.");
                return;
            }

            // Check for Duplicates in current form
            const allInputs = document.querySelectorAll('.member-email-input');
            for (let input of allInputs) {
                if (input !== emailInput && input.value.trim().toLowerCase() === email.toLowerCase()) {
                    showCustomAlert("This email is already entered for another member. Please use unique emails.");
                    return;
                }
            }

            btn.innerText = "SENDING...";
            btn.disabled = true;

            try {
                const res = await fetch(`${API_BASE_URL}/api/auth/send-verification-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });

                // Handle Non-JSON logic if necessary
                const text = await res.text();
                let data;
                try { data = JSON.parse(text); } catch (e) { throw new Error("Server Error: " + text); }

                if (data.success) {
                    showCustomAlert("OTP Sent! Please check your inbox (and spam folder).");
                    otpSection.style.display = 'block';
                    btn.innerText = "RESEND";
                    btn.disabled = false;
                    emailInput.readOnly = true; // Lock email
                } else {
                    if (data.error && (
                        data.error.toLowerCase().includes("address not found") ||
                        data.error.includes("550 5.1.1") ||
                        data.error.toLowerCase().includes("does not exist")
                    )) {
                        showCustomAlert("Wrong Mail ID Kindly check it and verfiy it");
                    } else {
                        showCustomAlert("Error: " + data.error);
                    }
                    btn.innerText = "[ VERIFY ]";
                    btn.disabled = false;
                }
            } catch (err) {
                console.error(err);
                showCustomAlert("Server connection failed. " + err.message);
                btn.innerText = "[ VERIFY ]";
                btn.disabled = false;
            }
        }

        // --- HANDLE CONFIRM OTP BUTTON CLICK ---
        if (e.target.classList.contains('confirm-otp-btn')) {
            const btn = e.target;
            const card = btn.closest('.form-group');
            const otpInput = card.querySelector('.email-otp-input');
            const emailInput = card.querySelector('.member-email-input');
            const otpSection = card.querySelector('.otp-section');
            const verifyBtn = card.querySelector('.verify-email-btn');
            const verifiedBadge = card.querySelector('.email-verified-badge');

            const otp = otpInput.value.trim();
            const email = emailInput.value.trim();

            if (!otp) return showCustomAlert("Enter OTP");

            btn.innerText = "CHECKING...";
            btn.disabled = true;

            try {
                // Add Timeout to Fetch (10 seconds)
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);

                const res = await fetch(`${API_BASE_URL}/api/auth/verify-email-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, otp }),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                const data = await res.json();

                if (data.success) {
                    // Success
                    otpSection.style.display = 'none';
                    if (verifyBtn) verifyBtn.style.display = 'none'; // Hide verify button
                    if (verifiedBadge) verifiedBadge.style.display = 'block';

                    // Mark EMAIL input as verified using a data attribute
                    emailInput.dataset.verified = "true";

                    // Save Verification State to Cookie (2 Minutes)
                    if (window.setCookieMinutes) {
                        setCookieMinutes("leader_email_verified_v2", "true", 2);
                    } else if (window.setCookie) {
                        setCookie("leader_email_verified_v2", "true", 0.00138);
                        document.cookie = "leader_email_verified_v2=true; max-age=120; path=/";
                    } else {
                        document.cookie = "leader_email_verified_v2=true; max-age=120; path=/";
                    }

                    showCustomAlert(`Email (${email}) Verified Successfully!`);
                } else {
                    showCustomAlert(data.error || "Incorrect OTP. Please try again.");
                    btn.innerText = "[ CONFIRM OTP ]";
                    btn.disabled = false;
                }
            } catch (err) {
                console.error(err);
                if (err.name === 'AbortError') {
                    showCustomAlert("Verification timed out. Please try again.");
                } else {
                    showCustomAlert("Error verifying OTP: " + (err.message || "Unknown Error"));
                }
                btn.innerText = "[ CONFIRM OTP ]";
                btn.disabled = false;
            }
        }
    });
});
