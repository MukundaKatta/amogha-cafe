import { safeGetItem, safeSetItem, lockScroll, unlockScroll } from '../core/utils.js';
import { getDb } from '../core/firebase.js';
import { showBirthdayBanner } from './loyalty.js';

// ===== AUTH SYSTEM (Sign In / Sign Up) =====

export function getCurrentUser() {
    try {
        const data = safeGetItem('amoghaUser');
        return data ? JSON.parse(data) : null;
    } catch(e) { return null; }
}

export function setCurrentUser(user) {
    safeSetItem('amoghaUser', JSON.stringify(user));
    // Start listening for order status notifications
    var db = getDb();
    if (user && user.phone && typeof db !== 'undefined' && db && !window._notifListenerActive) {
        window._notifListenerActive = true;
        db.collection('notifications').where('userPhone', '==', user.phone).where('read', '==', false)
            .onSnapshot(function(snap) {
                snap.docChanges().forEach(function(change) {
                    if (change.type === 'added') {
                        var n = change.doc.data();
                        if (typeof sendPushNotification === 'function') sendPushNotification(n.title, n.body);
                        change.doc.ref.update({ read: true });
                    }
                });
            }, function(err) { console.error('Notification listener error:', err); });
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
    document.getElementById('auth-modal').style.display = 'block';
    lockScroll();
    switchAuthView('signup');
}

export function closeAuthModal() {
    document.getElementById('auth-modal').style.display = 'none';
    unlockScroll();
    document.getElementById('signup-name').value = '';
    document.getElementById('signup-phone').value = '';
    document.getElementById('signup-password').value = '';
    document.getElementById('signin-phone').value = '';
    document.getElementById('signin-password').value = '';
    document.getElementById('signup-msg').textContent = '';
    document.getElementById('signup-msg').className = 'auth-msg';
    document.getElementById('signin-msg').textContent = '';
    document.getElementById('signin-msg').className = 'auth-msg';
    document.getElementById('forgot-phone').value = '';
    document.getElementById('forgot-name').value = '';
    document.getElementById('forgot-new-password').value = '';
    document.getElementById('forgot-confirm-password').value = '';
    document.getElementById('forgot-msg').textContent = '';
    document.getElementById('forgot-msg').className = 'auth-msg';
    document.getElementById('forgot-step-1').style.display = '';
    document.getElementById('forgot-step-2').style.display = 'none';
    forgotPhoneVerified = null;
}

export function switchAuthView(view) {
    document.querySelectorAll('.auth-view').forEach(v => v.classList.remove('active'));
    document.getElementById('auth-' + view).classList.add('active');
}

export function handleSignUp() {
    var name = document.getElementById('signup-name').value.trim();
    var phone = document.getElementById('signup-phone').value.trim();
    var password = document.getElementById('signup-password').value;
    var msg = document.getElementById('signup-msg');

    if (!name) {
        msg.textContent = 'Please enter your name.';
        msg.className = 'auth-msg error';
        return;
    }
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

    db.collection('users').doc(phone).get().then(function(doc) {
        if (doc.exists) {
            msg.textContent = 'This phone number is already registered. Please sign in.';
            msg.className = 'auth-msg error';
            return;
        }
        var newUser = { name: name, phone: phone, pin: password, usedWelcomeBonus: false, createdAt: new Date().toISOString() };
        return db.collection('users').doc(phone).set(newUser).then(function() {
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
                        if (typeof applyReferralAtSignup === 'function') applyReferralAtSignup(code);
                    }, 2000);
                }
            } catch (uiErr) {
                console.error('SignUp UI error:', uiErr);
                closeAuthModal();
                showAuthToast('Account created successfully!');
            }
        });
    }).catch(function(err) {
        console.error('SignUp error:', err);
        var errMsg = err.code === 'permission-denied' ? 'Access denied. Please contact support.' : 'Connection error. Please check your internet and try again.';
        msg.textContent = errMsg + ' (' + (err.code || err.message || 'unknown') + ')';
        msg.className = 'auth-msg error';
    });
}

export function handleSignIn() {
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

    msg.textContent = 'Signing in...';
    msg.className = 'auth-msg';

    var db = getDb();
    if (typeof db === 'undefined' || !db) {
        msg.textContent = 'Service unavailable. Please refresh and try again.';
        msg.className = 'auth-msg error';
        return;
    }

    db.collection('users').doc(phone).get().then(function(doc) {
        if (!doc.exists) {
            msg.textContent = 'No account found with this number. Please sign up.';
            msg.className = 'auth-msg error';
            return;
        }
        var user = doc.data();
        if ((user.pin || user.password) !== password) {
            msg.textContent = 'Incorrect PIN. Please try again.';
            msg.className = 'auth-msg error';
            return;
        }
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
        if (user.name.toLowerCase() !== name.toLowerCase()) {
            msg.textContent = 'Name does not match our records.';
            msg.className = 'auth-msg error';
            return;
        }
        forgotPhoneVerified = phone;
        msg.textContent = '';
        msg.className = 'auth-msg';
        document.getElementById('forgot-step-1').style.display = 'none';
        document.getElementById('forgot-step-2').style.display = 'block';
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

    db.collection('users').doc(forgotPhoneVerified).update({ pin: newPass }).then(function() {
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
    const btn = document.getElementById('signin-btn');
    btn.className = 'signin-nav-btn';
    btn.innerHTML = '<svg class="signin-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span id="signin-text">Sign In</span>';
    updateCarouselGreeting();
    if (typeof updateLoyaltyWidget === 'function') updateLoyaltyWidget();
    showAuthToast('You have been signed out.');
}

export function updateSignInUI(user) {
    const btn = document.getElementById('signin-btn');
    if (!btn || !user) return;
    var userName = user.name || 'Guest';
    var initials = userName.split(' ').filter(function(w) { return w.length > 0; }).map(function(w) { return w[0]; }).join('').toUpperCase().slice(0, 2) || 'G';
    btn.className = 'signin-nav-btn signed-in';
    btn.innerHTML = '<span class="user-avatar">' + initials + '</span><span id="signin-text">' + userName.split(' ')[0] + '</span>' +
        '<div class="user-dropdown" id="user-dropdown">' +
            '<a href="#" onclick="event.preventDefault();event.stopPropagation();openProfileModal()">My Profile</a>' +
            '<a href="#" onclick="event.preventDefault();event.stopPropagation();signOut()">Sign Out</a>' +
        '</div>';
    btn.onclick = function(e) { e.preventDefault(); var dd = document.getElementById('user-dropdown'); if (dd) dd.classList.toggle('show'); };
    if (typeof updateLoyaltyWidget === 'function') updateLoyaltyWidget();
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

export function initAuth() {
    // Restore auth state on load
    try {
        const savedUser = safeGetItem('amoghaUser');
        if (savedUser) {
            var parsedUser = JSON.parse(savedUser);
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
            refInput.maxLength = 20;
            refInput.style.textTransform = 'uppercase';
            pinField.after(refInput);
        }
    }, 1000);

    // User profile dropdown (My Orders + Referral)
    setTimeout(function() {
        var signinBtn = document.getElementById('signin-btn');
        if (!signinBtn) return;
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
