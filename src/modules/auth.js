import { safeGetItem, safeSetItem, lockScroll, unlockScroll, sanitizeHtml } from '../core/utils.js';
import { getDb } from '../core/firebase.js';
import { showBirthdayBanner } from './loyalty.js';

// ===== AUTH SYSTEM (Sign In / Sign Up) =====

// Session expiration: 7 days in milliseconds
var SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

// Rate limiting: max 5 login attempts per 5 minutes per phone number
var MAX_LOGIN_ATTEMPTS = 5;
var LOGIN_WINDOW_MS = 5 * 60 * 1000;

function getLoginAttempts(phone) {
    try {
        var data = JSON.parse(safeGetItem('amoghaLoginAttempts') || '{}');
        var entry = data[phone];
        if (!entry) return { count: 0, timestamps: [] };
        // Filter out timestamps older than the window
        var now = Date.now();
        var recent = (entry.timestamps || []).filter(function(t) { return now - t < LOGIN_WINDOW_MS; });
        return { count: recent.length, timestamps: recent };
    } catch(e) { return { count: 0, timestamps: [] }; }
}

function recordLoginAttempt(phone) {
    try {
        var data = JSON.parse(safeGetItem('amoghaLoginAttempts') || '{}');
        if (!data[phone]) data[phone] = { timestamps: [] };
        var now = Date.now();
        // Keep only recent timestamps
        data[phone].timestamps = (data[phone].timestamps || []).filter(function(t) { return now - t < LOGIN_WINDOW_MS; });
        data[phone].timestamps.push(now);
        safeSetItem('amoghaLoginAttempts', JSON.stringify(data));
    } catch(e) {}
}

function clearLoginAttempts(phone) {
    try {
        var data = JSON.parse(safeGetItem('amoghaLoginAttempts') || '{}');
        delete data[phone];
        safeSetItem('amoghaLoginAttempts', JSON.stringify(data));
    } catch(e) {}
}

function isLoginRateLimited(phone) {
    var attempts = getLoginAttempts(phone);
    return attempts.count >= MAX_LOGIN_ATTEMPTS;
}

function getRateLimitRemainingSeconds(phone) {
    try {
        var data = JSON.parse(safeGetItem('amoghaLoginAttempts') || '{}');
        var entry = data[phone];
        if (!entry || !entry.timestamps || entry.timestamps.length === 0) return 0;
        var oldest = Math.min.apply(null, entry.timestamps.filter(function(t) { return Date.now() - t < LOGIN_WINDOW_MS; }));
        var unlocksAt = oldest + LOGIN_WINDOW_MS;
        return Math.max(0, Math.ceil((unlocksAt - Date.now()) / 1000));
    } catch(e) { return 0; }
}

// Simple PIN hashing using SHA-256 (Web Crypto API)
async function hashPin(pin) {
    var encoder = new TextEncoder();
    var data = encoder.encode(pin + '_amogha_salt');
    var hashBuffer = await crypto.subtle.digest('SHA-256', data);
    var hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
}

export function getCurrentUser() {
    try {
        const data = safeGetItem('amoghaUser');
        if (!data) return null;
        var parsed = JSON.parse(data);
        // Check session expiration (7 days)
        if (parsed._sessionTimestamp && (Date.now() - parsed._sessionTimestamp > SESSION_EXPIRY_MS)) {
            // Session expired — clear it
            try { localStorage.removeItem('amoghaUser'); } catch(e) {}
            return null;
        }
        return parsed;
    } catch(e) { return null; }
}

export function setCurrentUser(user) {
    // Stamp the session time so we can enforce expiration
    if (user && !user._sessionTimestamp) {
        user._sessionTimestamp = Date.now();
    }
    safeSetItem('amoghaUser', JSON.stringify(user));
    // Start listening for order status notifications
    var db = getDb();
    if (user && user.phone && typeof db !== 'undefined' && db && !window._notifListenerActive) {
        // Unsubscribe existing listener to prevent duplicates
        if (typeof window._notifListenerUnsub === 'function') {
            window._notifListenerUnsub();
        }
        try {
            window._notifListenerUnsub = db.collection('notifications').where('userPhone', '==', user.phone).where('read', '==', false)
                .onSnapshot(function(snap) {
                    snap.docChanges().forEach(function(change) {
                        if (change.type === 'added') {
                            var n = change.doc.data();
                            if (typeof window.sendPushNotification === 'function') window.sendPushNotification(n.title, n.body);
                            change.doc.ref.update({ read: true });
                        }
                    });
                }, function(err) { console.error('Notification listener error:', err); });
            window._notifListenerActive = true;
        } catch (e) {
            console.error('Notification listener setup error:', e);
        }
    }
}

export function openAuthModal() {
    const user = getCurrentUser();
    if (user) {
        if (confirm('Signed in as ' + (user.name || 'Guest') + '\n\nDo you want to sign out?')) {
            signOut();
        }
        return;
    }
    var modal = document.getElementById('auth-modal');
    if (!modal) return;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.style.display = 'block';
    lockScroll();
    switchAuthView('signup');

    // Add autocomplete attributes to form fields
    var signupPhone = document.getElementById('signup-phone');
    var signupName = document.getElementById('signup-name');
    var signinPhone = document.getElementById('signin-phone');
    if (signupPhone) signupPhone.setAttribute('autocomplete', 'tel');
    if (signupName) signupName.setAttribute('autocomplete', 'name');
    if (signinPhone) signinPhone.setAttribute('autocomplete', 'tel');

    // Add aria-label to password toggle buttons
    modal.querySelectorAll('.toggle-password, .password-toggle').forEach(function(btn) {
        if (!btn.hasAttribute('aria-label')) {
            btn.setAttribute('aria-label', 'Toggle PIN visibility');
        }
    });

    // Focus trap: cycle between first and last focusable elements
    if (!modal._focusTrapAttached) {
        modal._focusTrapAttached = true;
        modal.addEventListener('keydown', function(e) {
            if (e.key !== 'Tab') return;
            var focusable = modal.querySelectorAll('input, button, select, textarea, a[href], [tabindex]:not([tabindex="-1"])');
            if (focusable.length === 0) return;
            var first = focusable[0];
            var last = focusable[focusable.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        });
    }
}

export function closeAuthModal() {
    var modal = document.getElementById('auth-modal');
    if (modal) modal.style.display = 'none';
    unlockScroll();
    ['signup-name', 'signup-phone', 'signup-password', 'signin-phone', 'signin-password',
     'forgot-phone', 'forgot-name', 'forgot-new-password', 'forgot-confirm-password'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.value = '';
    });
    ['signup-msg', 'signin-msg', 'forgot-msg'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) { el.textContent = ''; el.className = 'auth-msg'; }
    });
    var fs1 = document.getElementById('forgot-step-1');
    var fs2 = document.getElementById('forgot-step-2');
    if (fs1) fs1.style.display = '';
    if (fs2) fs2.style.display = 'none';
    forgotPhoneVerified = null;
}

export function switchAuthView(view) {
    document.querySelectorAll('.auth-view').forEach(v => v.classList.remove('active'));
    document.getElementById('auth-' + view).classList.add('active');
}

var _authInProgress = false;

export function handleSignUp() {
    if (_authInProgress) return;
    var name = document.getElementById('signup-name').value.trim();
    var phone = document.getElementById('signup-phone').value.trim();
    var password = document.getElementById('signup-password').value;
    var msg = document.getElementById('signup-msg');

    if (!name || name.length < 2) {
        msg.textContent = 'Please enter your name (at least 2 characters).';
        msg.className = 'auth-msg error';
        return;
    }
    if (name.length > 100) {
        msg.textContent = 'Name is too long (max 100 characters).';
        msg.className = 'auth-msg error';
        return;
    }
    // Strip any HTML tags from name to prevent stored XSS
    name = name.replace(/<[^>]*>/g, '').trim();
    if (!/^\d{10}$/.test(phone)) {
        msg.textContent = 'Please enter a valid 10-digit phone number.';
        msg.className = 'auth-msg error';
        return;
    }
    if (!/^\d{4}$/.test(password)) {
        msg.textContent = 'Please enter a 4-digit PIN.';
        msg.className = 'auth-msg error';
        return;
    }

    msg.textContent = 'Creating account...';
    msg.className = 'auth-msg';

    var db = getDb();
    if (typeof db === 'undefined' || !db) {
        msg.textContent = 'Service unavailable. Please refresh and try again.';
        msg.className = 'auth-msg error';
        return;
    }

    _authInProgress = true;
    db.collection('users').doc(phone).get().then(async function(doc) {
        if (doc.exists) {
            msg.textContent = 'This phone number is already registered. Please sign in.';
            msg.className = 'auth-msg error';
            _authInProgress = false;
            return;
        }
        var hashedPin = await hashPin(password);
        var newUser = { name: name, phone: phone, pin: hashedPin, usedWelcomeBonus: false, createdAt: new Date().toISOString() };
        return db.collection('users').doc(phone).set(newUser).then(function() {
            _authInProgress = false;
            try {
                setCurrentUser(newUser);
                updateSignInUI(newUser);
                updateCarouselGreeting();
                closeAuthModal();
                showAuthToast('Welcome, ' + (name || 'Guest') + '! 25% off applied to your first order!');
                // Check for birthday rewards
                setTimeout(function() { showBirthdayBanner(newUser); }, 500);
                // Apply referral code if entered
                var refCode = document.getElementById('signup-referral');
                var code = refCode ? refCode.value.trim() : '';
                if (code) {
                    setTimeout(function() {
                        if (typeof window.applyReferralAtSignup === 'function') window.applyReferralAtSignup(code);
                    }, 2000);
                }
            } catch (uiErr) {
                console.error('SignUp UI error:', uiErr);
                closeAuthModal();
                showAuthToast('Account created successfully!');
            }
        });
    }).catch(function(err) {
        _authInProgress = false;
        console.error('SignUp error:', err);
        var errMsg = err.code === 'permission-denied' ? 'Access denied. Please contact support.' : 'Connection error. Please check your internet and try again.';
        msg.textContent = errMsg + ' (' + (err.code || err.message || 'unknown') + ')';
        msg.className = 'auth-msg error';
    });
}

export function handleSignIn() {
    if (_authInProgress) return;
    var phone = document.getElementById('signin-phone').value.trim();
    var password = document.getElementById('signin-password').value;
    var msg = document.getElementById('signin-msg');

    if (!/^\d{10}$/.test(phone)) {
        msg.textContent = 'Please enter a valid 10-digit phone number.';
        msg.className = 'auth-msg error';
        return;
    }
    if (!/^\d{4}$/.test(password)) {
        msg.textContent = 'Please enter your 4-digit PIN.';
        msg.className = 'auth-msg error';
        return;
    }

    // Rate limiting check
    if (isLoginRateLimited(phone)) {
        var remaining = getRateLimitRemainingSeconds(phone);
        msg.textContent = 'Too many login attempts. Please try again in ' + Math.ceil(remaining / 60) + ' minute(s).';
        msg.className = 'auth-msg error';
        return;
    }

    msg.textContent = 'Signing in...';
    msg.className = 'auth-msg';

    var db = getDb();
    if (typeof db === 'undefined' || !db) {
        msg.textContent = 'Service unavailable. Please refresh and try again.';
        msg.className = 'auth-msg error';
        return;
    }

    _authInProgress = true;
    db.collection('users').doc(phone).get().then(async function(doc) {
        if (!doc.exists) {
            _authInProgress = false;
            recordLoginAttempt(phone);
            msg.textContent = 'No account found with this number. Please sign up.';
            msg.className = 'auth-msg error';
            return;
        }
        var user = doc.data();
        var storedPin = user.pin || user.password || '';
        var hashedInput = await hashPin(password);
        if (storedPin !== hashedInput) {
            _authInProgress = false;
            recordLoginAttempt(phone);
            msg.textContent = 'Incorrect PIN. Please try again.';
            msg.className = 'auth-msg error';
            return;
        }
        // Successful login — clear rate limit counter
        clearLoginAttempts(phone);
        _authInProgress = false;
        try {
            setCurrentUser(user);
            updateSignInUI(user);
            updateCarouselGreeting();
            closeAuthModal();
            var userName = user.name || 'Guest';
            var bonusMsg = !user.usedWelcomeBonus ? ' Your 25% welcome bonus is still active!' : '';
            showAuthToast('Welcome back, ' + userName + '!' + bonusMsg);
            // Check for birthday rewards
            setTimeout(function() { showBirthdayBanner(user); }, 500);
        } catch (uiErr) {
            console.error('SignIn UI error:', uiErr);
            closeAuthModal();
            showAuthToast('Signed in successfully!');
        }
    }).catch(function(err) {
        _authInProgress = false;
        console.error('SignIn error:', err);
        msg.textContent = 'Connection error. Please check your internet and try again.';
        msg.className = 'auth-msg error';
    });
}

var forgotPhoneVerified = null;

export function handleForgotPassword() {
    var phone = document.getElementById('forgot-phone').value.trim();
    var name = document.getElementById('forgot-name').value.trim();
    var msg = document.getElementById('forgot-msg');

    if (!/^\d{10}$/.test(phone)) {
        msg.textContent = 'Please enter a valid 10-digit phone number.';
        msg.className = 'auth-msg error';
        return;
    }
    if (!name) {
        msg.textContent = 'Please enter your registered name.';
        msg.className = 'auth-msg error';
        return;
    }

    msg.textContent = 'Verifying...';
    msg.className = 'auth-msg';

    var db = getDb();
    if (typeof db === 'undefined' || !db) {
        msg.textContent = 'Service unavailable. Please refresh and try again.';
        msg.className = 'auth-msg error';
        return;
    }

    db.collection('users').doc(phone).get().then(function(doc) {
        if (!doc.exists) {
            msg.textContent = 'No account found with this phone number.';
            msg.className = 'auth-msg error';
            return;
        }
        var user = doc.data();
        if ((user.name || '').toLowerCase() !== name.toLowerCase()) {
            msg.textContent = 'Name does not match our records.';
            msg.className = 'auth-msg error';
            return;
        }
        forgotPhoneVerified = phone;
        msg.textContent = 'Identity verified! Please create a new 4-digit PIN below.';
        msg.className = 'auth-msg success';
        document.getElementById('forgot-step-1').style.display = 'none';
        document.getElementById('forgot-step-2').style.display = 'block';
        // Attach PIN dots to the reset fields and focus
        attachPinDotsIndicator('forgot-new-password');
        attachPinDotsIndicator('forgot-confirm-password');
        var newPinField = document.getElementById('forgot-new-password');
        if (newPinField) newPinField.focus();
    }).catch(function(err) {
        console.error('Forgot password error:', err);
        msg.textContent = err.code === 'permission-denied' ? 'Access denied. Please contact support.' : 'Network error. Please check your connection and try again.';
        msg.className = 'auth-msg error';
    });
}

export function handleResetPassword() {
    var newPass = document.getElementById('forgot-new-password').value;
    var confirmPass = document.getElementById('forgot-confirm-password').value;
    var msg = document.getElementById('forgot-msg');

    if (!/^\d{4}$/.test(newPass)) {
        msg.textContent = 'Please enter a 4-digit PIN.';
        msg.className = 'auth-msg error';
        return;
    }
    if (newPass !== confirmPass) {
        msg.textContent = 'PINs do not match.';
        msg.className = 'auth-msg error';
        return;
    }

    msg.textContent = 'Resetting PIN...';
    msg.className = 'auth-msg';

    var db = getDb();
    if (typeof db === 'undefined' || !db) {
        msg.textContent = 'Service unavailable. Please refresh and try again.';
        msg.className = 'auth-msg error';
        return;
    }

    hashPin(newPass).then(function(hashedPin) {
    return db.collection('users').doc(forgotPhoneVerified).update({ pin: hashedPin });
    }).then(function() {
        forgotPhoneVerified = null;
        msg.textContent = '';
        msg.className = 'auth-msg';
        closeAuthModal();
        showAuthToast('PIN reset successful! Please sign in.');
    }).catch(function() {
        msg.textContent = 'Something went wrong. Please try again.';
        msg.className = 'auth-msg error';
    });
}

export function signOut() {
    try { localStorage.removeItem('amoghaUser'); } catch(e) {}
    // Clear user-specific session data to prevent leaking across accounts
    try {
        localStorage.removeItem('amoghaCart');
        localStorage.removeItem('amoghaMyOrders');
        localStorage.removeItem('amoghaSharedOrders');
        localStorage.removeItem('amogha_referral_code');
        localStorage.removeItem('amogha_referral_count');
        localStorage.removeItem('amogha_streak');
    } catch(e) {}
    // Clear in-memory coupon/gift card/payment state
    window._appliedCoupon = null;
    window._lastOrderId = null;
    window._lastOrderTotal = null;
    window._lastOrderItems = null;
    window._lastOrderTotalForShare = null;
    window._notifListenerActive = false;
    if (typeof window._notifListenerUnsub === 'function') {
        window._notifListenerUnsub();
        window._notifListenerUnsub = null;
    }
    const btn = document.getElementById('signin-btn');
    if (btn) {
        btn.className = 'signin-nav-btn';
        btn.innerHTML = '<svg class="signin-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span id="signin-text">Sign In</span>';
    }
    updateCarouselGreeting();
    if (typeof window.updateLoyaltyWidget === 'function') window.updateLoyaltyWidget();
    showAuthToast('You have been signed out.');
}

export function updateSignInUI(user) {
    const btn = document.getElementById('signin-btn');
    if (!btn || !user) return;
    var userName = user.name || 'Guest';
    var initials = userName.split(' ').filter(function(w) { return w.length > 0; }).map(function(w) { return w[0]; }).join('').toUpperCase().slice(0, 2) || 'G';
    btn.className = 'signin-nav-btn signed-in';
    btn.innerHTML = '<span class="user-avatar">' + sanitizeHtml(initials) + '</span><span id="signin-text">' + sanitizeHtml(userName.split(' ')[0]) + '</span>' +
        '<div class="user-dropdown" id="user-dropdown">' +
            '<a href="#" onclick="event.preventDefault();event.stopPropagation();openProfileModal()">My Profile</a>' +
            '<a href="#" onclick="event.preventDefault();event.stopPropagation();signOut()">Sign Out</a>' +
        '</div>';
    btn.onclick = function(e) { e.preventDefault(); var dd = document.getElementById('user-dropdown'); if (dd) dd.classList.toggle('show'); };
    if (typeof window.updateLoyaltyWidget === 'function') window.updateLoyaltyWidget();
}

export function togglePassword(inputId, btn) {
    var input = document.getElementById(inputId);
    var eyeOpen = btn.querySelector('.eye-open');
    var eyeClosed = btn.querySelector('.eye-closed');
    if (input.type === 'password') {
        input.type = 'text';
        eyeOpen.style.display = 'none';
        eyeClosed.style.display = '';
    } else {
        input.type = 'password';
        eyeOpen.style.display = '';
        eyeClosed.style.display = 'none';
    }
}

export function showAuthToast(message) {
    var toast = document.getElementById('auth-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'auth-toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.remove('visible');
    void toast.offsetWidth;
    toast.classList.add('visible');
    setTimeout(function() { toast.classList.remove('visible'); }, 4000);
}

export function updateCarouselGreeting() {
    var el = document.getElementById('carousel-greeting');
    if (!el) return;
    var user = getCurrentUser();
    if (user && user.name) {
        el.textContent = 'Hey ' + user.name.split(' ')[0] + ', ';
    } else {
        el.textContent = '';
    }
}

// PIN strength indicator: show filled dots for entered digits
function attachPinDotsIndicator(inputId) {
    var input = document.getElementById(inputId);
    if (!input || input.dataset.pinDotsAttached) return;
    input.dataset.pinDotsAttached = 'true';

    // Create dots container
    var dotsWrap = document.createElement('div');
    dotsWrap.className = 'pin-dots-indicator';
    dotsWrap.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < 4; i++) {
        var dot = document.createElement('span');
        dot.className = 'pin-dot';
        dotsWrap.appendChild(dot);
    }
    input.parentNode.insertBefore(dotsWrap, input.nextSibling);

    input.addEventListener('input', function() {
        var len = input.value.replace(/\D/g, '').length;
        var dots = dotsWrap.querySelectorAll('.pin-dot');
        for (var j = 0; j < dots.length; j++) {
            dots[j].classList.toggle('filled', j < len);
        }
    });
}

export function initAuth() {
    // Restore auth state on load (getCurrentUser checks session expiry)
    try {
        var parsedUser = getCurrentUser();
        if (parsedUser) {
            updateSignInUI(parsedUser);
            // Check for birthday rewards on page load
            setTimeout(function() { showBirthdayBanner(parsedUser); }, 1000);
        }
        updateCarouselGreeting();
    } catch (e) {
        console.error('Auth restore error:', e);
    }

    // Close auth modal on backdrop click
    window.addEventListener('click', function(e) {
        var authModal = document.getElementById('auth-modal');
        if (e.target === authModal) {
            closeAuthModal();
        }
        // Close user dropdown when clicking outside
        var dd = document.getElementById('user-dropdown');
        if (dd && dd.classList.contains('show') && !e.target.closest('.signin-nav-btn')) {
            dd.classList.remove('show');
        }
    });

    // Attach PIN dots indicators to all PIN inputs
    setTimeout(function() {
        ['signup-password', 'signin-password', 'forgot-new-password', 'forgot-confirm-password'].forEach(attachPinDotsIndicator);
    }, 500);

    // Enter key support for all auth forms
    document.addEventListener('keydown', function(e) {
        if (e.key !== 'Enter') return;
        var authModal = document.getElementById('auth-modal');
        if (!authModal || authModal.style.display === 'none') return;

        var activeView = authModal.querySelector('.auth-view.active');
        if (!activeView) return;
        var viewId = activeView.id;

        if (e.target.tagName === 'INPUT') {
            e.preventDefault();
            if (viewId === 'auth-signup') handleSignUp();
            else if (viewId === 'auth-signin') handleSignIn();
            else if (viewId === 'auth-forgot') {
                var step2 = document.getElementById('forgot-step-2');
                if (step2 && step2.style.display !== 'none') handleResetPassword();
                else handleForgotPassword();
            }
        }
    });

    // Add referral code field to signup form
    setTimeout(function() {
        var signupForm = document.getElementById('signup-form');
        if (!signupForm || signupForm.dataset.refEnhanced === 'true') return;
        signupForm.dataset.refEnhanced = 'true';
        var pinField = signupForm.querySelector('.password-field');
        if (pinField) {
            var refInput = document.createElement('input');
            refInput.type = 'text';
            refInput.id = 'signup-referral';
            refInput.placeholder = 'Referral Code (Optional)';
            refInput.setAttribute('aria-label', 'Referral code');
            refInput.maxLength = 20;
            refInput.style.textTransform = 'uppercase';
            pinField.after(refInput);
        }
    }, 1000);

    // User profile dropdown (My Orders + Referral)
    // Only create if not already present (updateSignInUI also creates one)
    setTimeout(function() {
        var signinBtn = document.getElementById('signin-btn');
        if (!signinBtn || document.getElementById('user-dropdown')) return;
        var dropdown = document.createElement('div');
        dropdown.id = 'user-dropdown';
        dropdown.className = 'user-dropdown';
        dropdown.innerHTML =
            '<button onclick="openMyOrders(); closeUserDropdown();">My Orders</button>' +
            '<button onclick="openReferralModal(); closeUserDropdown();">Refer a Friend</button>' +
            '<button onclick="openLoyaltyModal(); closeUserDropdown();">Loyalty Points</button>' +
            '<button onclick="openAuthModal(); closeUserDropdown();">Sign Out</button>';
        signinBtn.parentElement.style.position = 'relative';
        signinBtn.parentElement.appendChild(dropdown);
        signinBtn.addEventListener('click', function(e) {
            var user = getCurrentUser();
            if (user) {
                e.preventDefault();
                e.stopPropagation();
                dropdown.classList.toggle('visible');
            }
        });
        document.addEventListener('click', function(e) {
            if (!signinBtn.parentElement.contains(e.target)) {
                dropdown.classList.remove('visible');
            }
        });
    }, 1000);
}

function closeUserDropdown() {
    var dd = document.getElementById('user-dropdown');
    if (dd) dd.classList.remove('visible');
}

Object.assign(window, {
    openAuthModal,
    closeAuthModal,
    switchAuthView,
    handleSignUp,
    handleSignIn,
    handleForgotPassword,
    handleResetPassword,
    signOut,
    updateSignInUI,
    togglePassword,
    showAuthToast,
    updateCarouselGreeting,
    closeUserDropdown
});
