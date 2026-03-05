import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    signOut,
    showAuthToast,
    switchAuthView,
    togglePassword,
    updateSignInUI,
    updateCarouselGreeting,
    openAuthModal,
    closeAuthModal,
    getCurrentUser,
    setCurrentUser,
    handleSignUp,
    handleSignIn,
    handleForgotPassword,
    handleResetPassword,
    initAuth,
} from '../src/modules/auth.js';

function setupDOM(html) {
    document.body.innerHTML = html;
    document.getElementById = (id) => document.body.querySelector('#' + id);
    document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
    document.querySelector = (sel) => document.body.querySelector(sel);
}

// ═══════════════════════════════════════════════════════════════════════════
// signOut
// ═══════════════════════════════════════════════════════════════════════════
describe('signOut', () => {
    beforeEach(() => {
        setupDOM(`
            <button id="signin-btn" class="signin-nav-btn signed-in"><span>Test</span></button>
            <div id="carousel-greeting">Hey Test, </div>
            <div id="auth-toast"></div>
        `);
    });

    it('removes user from localStorage', () => {
        localStorage.setItem('amoghaUser', JSON.stringify({ name: 'Test', phone: '1234567890' }));
        signOut();
        expect(localStorage.getItem('amoghaUser')).toBeNull();
    });

    it('resets sign-in button to default state', () => {
        localStorage.setItem('amoghaUser', JSON.stringify({ name: 'Test', phone: '1234567890' }));
        signOut();
        const btn = document.getElementById('signin-btn');
        expect(btn.className).toBe('signin-nav-btn');
    });

    it('shows signed-out toast', () => {
        signOut();
        const toast = document.getElementById('auth-toast');
        expect(toast.textContent).toMatch(/signed out/i);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// showAuthToast
// ═══════════════════════════════════════════════════════════════════════════
describe('showAuthToast', () => {
    beforeEach(() => {
        setupDOM('<div id="auth-toast"></div>');
    });

    it('sets toast text content', () => {
        showAuthToast('Hello world');
        expect(document.getElementById('auth-toast').textContent).toBe('Hello world');
    });

    it('adds visible class to toast', () => {
        showAuthToast('Test message');
        expect(document.getElementById('auth-toast').classList.contains('visible')).toBe(true);
    });

    it('creates toast element if not found', () => {
        document.body.innerHTML = '';
        showAuthToast('Dynamic toast');
        const toast = document.getElementById('auth-toast');
        expect(toast).not.toBeNull();
        expect(toast.textContent).toBe('Dynamic toast');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// switchAuthView
// ═══════════════════════════════════════════════════════════════════════════
describe('switchAuthView', () => {
    beforeEach(() => {
        setupDOM(`
            <div class="auth-view" id="auth-signup"></div>
            <div class="auth-view" id="auth-signin"></div>
            <div class="auth-view" id="auth-forgot"></div>
        `);
    });

    it('activates signup view and deactivates others', () => {
        switchAuthView('signup');
        expect(document.getElementById('auth-signup').classList.contains('active')).toBe(true);
        expect(document.getElementById('auth-signin').classList.contains('active')).toBe(false);
        expect(document.getElementById('auth-forgot').classList.contains('active')).toBe(false);
    });

    it('activates signin view', () => {
        switchAuthView('signin');
        expect(document.getElementById('auth-signin').classList.contains('active')).toBe(true);
        expect(document.getElementById('auth-signup').classList.contains('active')).toBe(false);
    });

    it('activates forgot view', () => {
        switchAuthView('forgot');
        expect(document.getElementById('auth-forgot').classList.contains('active')).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// togglePassword
// ═══════════════════════════════════════════════════════════════════════════
describe('togglePassword', () => {
    beforeEach(() => {
        setupDOM(`
            <input id="test-pin" type="password">
            <button id="toggle-btn">
                <span class="eye-open" style="display:inline"></span>
                <span class="eye-closed" style="display:none"></span>
            </button>
        `);
    });

    it('toggles input type from password to text', () => {
        const btn = document.getElementById('toggle-btn');
        togglePassword('test-pin', btn);
        expect(document.getElementById('test-pin').type).toBe('text');
    });

    it('toggles back to password type', () => {
        const btn = document.getElementById('toggle-btn');
        togglePassword('test-pin', btn); // password → text
        togglePassword('test-pin', btn); // text → password
        expect(document.getElementById('test-pin').type).toBe('password');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// updateSignInUI
// ═══════════════════════════════════════════════════════════════════════════
describe('updateSignInUI', () => {
    beforeEach(() => {
        setupDOM('<button id="signin-btn" class="signin-nav-btn"></button>');
    });

    it('returns early when btn is null', () => {
        document.body.innerHTML = '';
        expect(() => updateSignInUI({ name: 'Test' })).not.toThrow();
    });

    it('returns early when user is falsy', () => {
        expect(() => updateSignInUI(null)).not.toThrow();
    });

    it('shows user initials in avatar', () => {
        updateSignInUI({ name: 'Ravi Kumar', phone: '9876543210' });
        const btn = document.getElementById('signin-btn');
        expect(btn.innerHTML).toContain('RK');
    });

    it('adds signed-in class to button', () => {
        updateSignInUI({ name: 'Priya', phone: '9876543210' });
        expect(document.getElementById('signin-btn').classList.contains('signed-in')).toBe(true);
    });

    it('handles single-name users', () => {
        updateSignInUI({ name: 'Priya', phone: '9876543210' });
        const btn = document.getElementById('signin-btn');
        expect(btn.innerHTML).toContain('P');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// updateCarouselGreeting
// ═══════════════════════════════════════════════════════════════════════════
describe('updateCarouselGreeting', () => {
    beforeEach(() => {
        setupDOM('<span id="carousel-greeting"></span>');
        localStorage.clear();
    });

    it('shows greeting when user is logged in', () => {
        setCurrentUser({ name: 'Ravi Kumar', phone: '9876543210' });
        updateCarouselGreeting();
        expect(document.getElementById('carousel-greeting').textContent).toContain('Ravi');
    });

    it('clears greeting when no user is logged in', () => {
        localStorage.removeItem('amoghaUser');
        updateCarouselGreeting();
        expect(document.getElementById('carousel-greeting').textContent).toBe('');
    });

    it('does not throw when element is missing', () => {
        document.body.innerHTML = '';
        expect(() => updateCarouselGreeting()).not.toThrow();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// openAuthModal
// ═══════════════════════════════════════════════════════════════════════════
describe('openAuthModal', () => {
    beforeEach(() => {
        setupDOM(`
            <div id="auth-modal" style="display:none"></div>
            <div class="auth-view" id="auth-signup"></div>
            <div class="auth-view" id="auth-signin"></div>
            <div class="auth-view" id="auth-forgot"></div>
        `);
        localStorage.clear();
        window.confirm = vi.fn(() => false);
    });

    it('opens modal when no user is logged in', () => {
        openAuthModal();
        expect(document.getElementById('auth-modal').style.display).toBe('block');
    });

    it('shows confirm dialog when user is already logged in', () => {
        setCurrentUser({ name: 'Test', phone: '1234567890' });
        openAuthModal();
        expect(window.confirm).toHaveBeenCalled();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// closeAuthModal
// ═══════════════════════════════════════════════════════════════════════════
describe('closeAuthModal', () => {
    beforeEach(() => {
        setupDOM(`
            <div id="auth-modal" style="display:block"></div>
            <input id="signup-name" value="test">
            <input id="signup-phone" value="1234567890">
            <input id="signup-password" value="1234">
            <input id="signin-phone" value="1234567890">
            <input id="signin-password" value="1234">
            <div id="signup-msg" class="auth-msg error">Error</div>
            <div id="signin-msg" class="auth-msg error">Error</div>
            <input id="forgot-phone" value="1234567890">
            <input id="forgot-name" value="test">
            <input id="forgot-new-password" value="1234">
            <input id="forgot-confirm-password" value="1234">
            <div id="forgot-msg" class="auth-msg error">Error</div>
            <div id="forgot-step-1" style="display:none"></div>
            <div id="forgot-step-2" style="display:block"></div>
        `);
    });

    it('hides the auth modal', () => {
        closeAuthModal();
        expect(document.getElementById('auth-modal').style.display).toBe('none');
    });

    it('clears all form inputs', () => {
        closeAuthModal();
        expect(document.getElementById('signup-name').value).toBe('');
        expect(document.getElementById('signup-phone').value).toBe('');
        expect(document.getElementById('signin-phone').value).toBe('');
    });

    it('clears error messages', () => {
        closeAuthModal();
        expect(document.getElementById('signup-msg').textContent).toBe('');
        expect(document.getElementById('signup-msg').className).toBe('auth-msg');
    });

    it('resets forgot password steps', () => {
        closeAuthModal();
        expect(document.getElementById('forgot-step-1').style.display).toBe('');
        expect(document.getElementById('forgot-step-2').style.display).toBe('none');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// setCurrentUser — notification listener (lines 23-29)
// ═══════════════════════════════════════════════════════════════════════════
describe('setCurrentUser — notification onSnapshot callback', () => {
    beforeEach(() => {
        localStorage.clear();
        window._notifListenerActive = false;
    });

    it('registers a Firestore notification listener when user has phone', () => {
        const onSnapshotFn = vi.fn(() => vi.fn());
        window.db = {
            collection: vi.fn(() => ({
                where: function() { return this; },
                onSnapshot: onSnapshotFn,
            })),
        };
        setCurrentUser({ name: 'Ravi', phone: '9876543210' });
        expect(onSnapshotFn).toHaveBeenCalled();
    });

    it('calls sendPushNotification for added notification docs', () => {
        window.sendPushNotification = vi.fn();
        const updateFn = vi.fn(() => Promise.resolve());
        const fakeSnap = {
            docChanges: () => [{
                type: 'added',
                doc: {
                    data: () => ({ title: 'Order ready', body: 'Your food is ready!' }),
                    ref: { update: updateFn },
                },
            }],
        };
        let capturedCallback;
        window.db = {
            collection: vi.fn(() => ({
                where: function() { return this; },
                onSnapshot: vi.fn((cb) => { capturedCallback = cb; return vi.fn(); }),
            })),
        };
        window._notifListenerActive = false;
        setCurrentUser({ name: 'Ravi', phone: '9876543210' });
        capturedCallback(fakeSnap);
        expect(window.sendPushNotification).toHaveBeenCalledWith('Order ready', 'Your food is ready!');
        expect(updateFn).toHaveBeenCalledWith({ read: true });
    });

    it('marks notification as read even when sendPushNotification is not a function', () => {
        delete window.sendPushNotification;
        const updateFn = vi.fn(() => Promise.resolve());
        const fakeSnap = {
            docChanges: () => [{
                type: 'added',
                doc: {
                    data: () => ({ title: 'Test', body: 'Test body' }),
                    ref: { update: updateFn },
                },
            }],
        };
        let capturedCallback;
        window.db = {
            collection: vi.fn(() => ({
                where: function() { return this; },
                onSnapshot: vi.fn((cb) => { capturedCallback = cb; return vi.fn(); }),
            })),
        };
        window._notifListenerActive = false;
        setCurrentUser({ name: 'Ravi', phone: '9876543210' });
        capturedCallback(fakeSnap);
        expect(updateFn).toHaveBeenCalledWith({ read: true });
    });

    it('does not call update for non-added doc changes', () => {
        const updateFn = vi.fn(() => Promise.resolve());
        const fakeSnap = {
            docChanges: () => [{
                type: 'modified',
                doc: {
                    data: () => ({ title: 'Test', body: 'body' }),
                    ref: { update: updateFn },
                },
            }],
        };
        let capturedCallback;
        window.db = {
            collection: vi.fn(() => ({
                where: function() { return this; },
                onSnapshot: vi.fn((cb) => { capturedCallback = cb; return vi.fn(); }),
            })),
        };
        window._notifListenerActive = false;
        setCurrentUser({ name: 'Ravi', phone: '9876543210' });
        capturedCallback(fakeSnap);
        expect(updateFn).not.toHaveBeenCalled();
    });

    it('logs error when onSnapshot error callback fires', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        let capturedErrorCallback;
        window.db = {
            collection: vi.fn(() => ({
                where: function() { return this; },
                onSnapshot: vi.fn((successCb, errorCb) => {
                    capturedErrorCallback = errorCb;
                    return vi.fn();
                }),
            })),
        };
        window._notifListenerActive = false;
        setCurrentUser({ name: 'Ravi', phone: '9876543210' });
        capturedErrorCallback(new Error('permission denied'));
        expect(consoleSpy).toHaveBeenCalledWith('Notification listener error:', expect.any(Error));
        consoleSpy.mockRestore();
    });

    it('does not register listener when user has no phone', () => {
        const onSnapshotFn = vi.fn();
        window.db = {
            collection: vi.fn(() => ({
                where: function() { return this; },
                onSnapshot: onSnapshotFn,
            })),
        };
        window._notifListenerActive = false;
        setCurrentUser({ name: 'Ravi' });
        expect(onSnapshotFn).not.toHaveBeenCalled();
    });

    it('does not register listener when _notifListenerActive is already true', () => {
        const onSnapshotFn = vi.fn();
        window.db = {
            collection: vi.fn(() => ({
                where: function() { return this; },
                onSnapshot: onSnapshotFn,
            })),
        };
        window._notifListenerActive = true;
        setCurrentUser({ name: 'Ravi', phone: '9876543210' });
        expect(onSnapshotFn).not.toHaveBeenCalled();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// openAuthModal — confirm sign-out path (line 37)
// ═══════════════════════════════════════════════════════════════════════════
describe('openAuthModal — signed-in user confirm sign-out', () => {
    beforeEach(() => {
        setupDOM(`
            <div id="auth-modal" style="display:none"></div>
            <div class="auth-view" id="auth-signup"></div>
            <div class="auth-view" id="auth-signin"></div>
            <div class="auth-view" id="auth-forgot"></div>
            <button id="signin-btn" class="signin-nav-btn signed-in"></button>
            <div id="carousel-greeting"></div>
            <div id="auth-toast"></div>
        `);
        window.scrollTo = vi.fn();
    });

    it('calls signOut when user confirms sign-out dialog', () => {
        setCurrentUser({ name: 'Ravi', phone: '9876543210' });
        window.confirm = vi.fn(() => true);
        window._notifListenerActive = false;
        window.db = undefined;
        openAuthModal();
        expect(window.confirm).toHaveBeenCalled();
        expect(localStorage.getItem('amoghaUser')).toBeNull();
    });

    it('does not sign out when user cancels confirm dialog', () => {
        setCurrentUser({ name: 'Ravi', phone: '9876543210' });
        window.confirm = vi.fn(() => false);
        openAuthModal();
        expect(localStorage.getItem('amoghaUser')).not.toBeNull();
    });

    it('does not open modal when user cancels sign-out confirm', () => {
        setCurrentUser({ name: 'Ravi', phone: '9876543210' });
        window.confirm = vi.fn(() => false);
        openAuthModal();
        expect(document.getElementById('auth-modal').style.display).toBe('none');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// handleSignUp — success path bonus message + referral code (lines 119-127)
// and UI error catch (line 133)
// ═══════════════════════════════════════════════════════════════════════════

const FULL_SIGNUP_HTML = `
    <input id="signup-name" value="">
    <input id="signup-phone" value="">
    <input id="signup-password" value="">
    <div id="signup-msg"></div>
    <button id="signin-btn" class="signin-nav-btn"></button>
    <div id="carousel-greeting"></div>
    <div id="auth-modal" style="display:block"></div>
    <div class="auth-view" id="auth-signup"></div>
    <div class="auth-view" id="auth-signin"></div>
    <div class="auth-view" id="auth-forgot"></div>
    <input id="signup-name" value="">
    <input id="signup-phone" value="">
    <input id="signup-password" value="">
    <input id="signin-phone" value="">
    <input id="signin-password" value="">
    <div id="signin-msg"></div>
    <input id="forgot-phone" value="">
    <input id="forgot-name" value="">
    <input id="forgot-new-password" value="">
    <input id="forgot-confirm-password" value="">
    <div id="forgot-msg"></div>
    <div id="forgot-step-1"></div>
    <div id="forgot-step-2" style="display:none"></div>
    <input id="signup-referral" value="">
    <div id="auth-toast"></div>
`;

describe('handleSignUp — success path with referral code (lines 119-127)', () => {
    beforeEach(() => {
        setupDOM(FULL_SIGNUP_HTML);
        window.scrollTo = vi.fn();
        window._notifListenerActive = false;
        localStorage.clear();
    });

    it('shows welcome toast with 25% discount on successful signup', async () => {
        window.applyReferralAtSignup = vi.fn();
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    get: () => Promise.resolve({ exists: false, data: () => ({}) }),
                    set: () => Promise.resolve(),
                })),
                where: function() { return this; },
                onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
            })),
        };
        document.getElementById('signup-name').value = 'Test User';
        document.getElementById('signup-phone').value = '9000000011';
        document.getElementById('signup-password').value = '1234';
        document.getElementById('signup-referral').value = '';
        handleSignUp();
        await new Promise((r) => setTimeout(r, 50));
        const toast = document.getElementById('auth-toast');
        expect(toast.textContent).toMatch(/welcome/i);
        expect(toast.textContent).toMatch(/25%/i);
    });

    it('calls applyReferralAtSignup when referral code is present', async () => {
        window.applyReferralAtSignup = vi.fn();
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    get: () => Promise.resolve({ exists: false, data: () => ({}) }),
                    set: () => Promise.resolve(),
                })),
                where: function() { return this; },
                onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
            })),
        };
        document.getElementById('signup-name').value = 'Test User';
        document.getElementById('signup-phone').value = '9000000012';
        document.getElementById('signup-password').value = '1234';
        document.getElementById('signup-referral').value = 'FRIEND50';
        handleSignUp();
        await new Promise((r) => setTimeout(r, 50));
        // applyReferralAtSignup is called via setTimeout(2000) — verify it gets scheduled
        // by checking that it eventually is called (fast-forward with long wait)
        await new Promise((r) => setTimeout(r, 2100));
        expect(window.applyReferralAtSignup).toHaveBeenCalledWith('FRIEND50');
    }, 5000);

    it('shows welcome bonus message when usedWelcomeBonus is false on signIn', async () => {
        const user = { name: 'Bonus User', phone: '9000000013', pin: '1234', usedWelcomeBonus: false };
        setupDOM(FULL_SIGNUP_HTML);
        document.getElementById = (id) => document.body.querySelector('#' + id);
        window._notifListenerActive = false;
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    get: () => Promise.resolve({ exists: true, data: () => user }),
                    update: () => Promise.resolve(),
                })),
                where: function() { return this; },
                onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
            })),
        };
        document.getElementById('signin-phone').value = '9000000013';
        document.getElementById('signin-password').value = '1234';
        handleSignIn();
        await new Promise((r) => setTimeout(r, 100));
        const toast = document.getElementById('auth-toast');
        expect(toast.textContent).toMatch(/welcome back/i);
        expect(toast.textContent).toMatch(/25%/i);
    });

    it('shows no bonus message when usedWelcomeBonus is true on signIn', async () => {
        const user = { name: 'Old User', phone: '9000000014', pin: '1234', usedWelcomeBonus: true };
        setupDOM(FULL_SIGNUP_HTML);
        document.getElementById = (id) => document.body.querySelector('#' + id);
        window._notifListenerActive = false;
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    get: () => Promise.resolve({ exists: true, data: () => user }),
                    update: () => Promise.resolve(),
                })),
                where: function() { return this; },
                onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
            })),
        };
        document.getElementById('signin-phone').value = '9000000014';
        document.getElementById('signin-password').value = '1234';
        handleSignIn();
        await new Promise((r) => setTimeout(r, 100));
        const toast = document.getElementById('auth-toast');
        expect(toast.textContent).not.toMatch(/25%/i);
    });
});

describe('handleSignUp — UI error catch path (line 133)', () => {
    beforeEach(() => {
        setupDOM(FULL_SIGNUP_HTML);
        window.scrollTo = vi.fn();
        window._notifListenerActive = false;
        localStorage.clear();
    });

    it('shows fallback toast when UI operations throw after account creation', async () => {
        // Make updateSignInUI throw by injecting a signin-btn whose className setter throws.
        // We set up the DOM normally for validation, then intercept getElementById after
        // validation has passed so that 'signin-btn' returns a broken element.
        const realGetEl = (id) => document.body.querySelector('#' + id);
        let allowedPhase = 'validation'; // flip to 'post-set' when set() resolves

        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    get: () => Promise.resolve({ exists: false, data: () => ({}) }),
                    set: () => {
                        allowedPhase = 'post-set';
                        return Promise.resolve();
                    },
                })),
                where: function() { return this; },
                onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
            })),
        };

        document.getElementById = (id) => {
            if (allowedPhase === 'post-set' && id === 'signin-btn') {
                // Return a proxy that throws when className is set
                const real = realGetEl(id);
                return new Proxy(real || {}, {
                    set(target, prop, value) {
                        if (prop === 'className') throw new Error('forced UI error in updateSignInUI');
                        target[prop] = value;
                        return true;
                    },
                    get(target, prop) {
                        const val = target[prop];
                        return typeof val === 'function' ? val.bind(target) : val;
                    },
                });
            }
            return realGetEl(id);
        };

        document.getElementById('signup-name').value = 'Error User';
        document.getElementById('signup-phone').value = '9000000015';
        document.getElementById('signup-password').value = '1234';
        handleSignUp();
        await new Promise((r) => setTimeout(r, 50));
        // Restore getElementById
        document.getElementById = realGetEl;
        const toast = document.getElementById('auth-toast');
        expect(toast.textContent).toMatch(/account created/i);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// handleSignIn — UI error catch path (line 195)
// ═══════════════════════════════════════════════════════════════════════════
describe('handleSignIn — UI error catch path (line 195)', () => {
    beforeEach(() => {
        setupDOM(FULL_SIGNUP_HTML);
        window.scrollTo = vi.fn();
        window._notifListenerActive = false;
        localStorage.clear();
    });

    it('shows fallback toast when UI operations throw after successful sign-in', async () => {
        const user = { name: 'UI Fail User', phone: '9000000016', pin: '1234' };
        const realGetEl = (id) => document.body.querySelector('#' + id);
        let getResolved = false;

        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    get: () => {
                        getResolved = true;
                        return Promise.resolve({ exists: true, data: () => user });
                    },
                    update: () => Promise.resolve(),
                })),
                where: function() { return this; },
                onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
            })),
        };

        document.getElementById = (id) => {
            // Once the Firestore get resolved, break signin-btn to force throw in updateSignInUI
            if (getResolved && id === 'signin-btn') {
                const real = realGetEl(id);
                return new Proxy(real || {}, {
                    set(target, prop, value) {
                        if (prop === 'className') throw new Error('forced UI error in updateSignInUI');
                        target[prop] = value;
                        return true;
                    },
                    get(target, prop) {
                        const val = target[prop];
                        return typeof val === 'function' ? val.bind(target) : val;
                    },
                });
            }
            return realGetEl(id);
        };

        document.getElementById('signin-phone').value = '9000000016';
        document.getElementById('signin-password').value = '1234';
        handleSignIn();
        await new Promise((r) => setTimeout(r, 100));
        document.getElementById = realGetEl;
        const toast = document.getElementById('auth-toast');
        expect(toast.textContent).toMatch(/signed in successfully/i);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// handleForgotPassword — catch block (lines 250-252)
// ═══════════════════════════════════════════════════════════════════════════

const FORGOT_HTML_FULL = `
    <input id="forgot-phone" value="">
    <input id="forgot-name" value="">
    <div id="forgot-msg"></div>
    <div id="forgot-step-1"></div>
    <div id="forgot-step-2" style="display:none"></div>
    <input id="forgot-new-password" value="">
    <input id="forgot-confirm-password" value="">
    <div id="auth-toast"></div>
    <button id="signin-btn"></button>
    <div id="auth-modal" style="display:block"></div>
    <input id="signup-name" value="">
    <input id="signup-phone" value="">
    <input id="signup-password" value="">
    <div id="signup-msg"></div>
    <input id="signin-phone" value="">
    <input id="signin-password" value="">
    <div id="signin-msg"></div>
`;

describe('handleForgotPassword — catch block (lines 250-252)', () => {
    beforeEach(() => {
        setupDOM(FORGOT_HTML_FULL);
    });

    it('shows access denied message on permission-denied error', async () => {
        const permErr = Object.assign(new Error('permission-denied'), { code: 'permission-denied' });
        window.db = {
            collection: () => ({
                doc: () => ({
                    get: () => Promise.reject(permErr),
                }),
            }),
        };
        document.getElementById('forgot-phone').value = '9876543210';
        document.getElementById('forgot-name').value = 'Ravi';
        handleForgotPassword();
        await new Promise((r) => setTimeout(r, 20));
        expect(document.getElementById('forgot-msg').textContent).toMatch(/access denied/i);
        expect(document.getElementById('forgot-msg').className).toContain('error');
    });

    it('shows network error message on generic Firestore error', async () => {
        window.db = {
            collection: () => ({
                doc: () => ({
                    get: () => Promise.reject(new Error('network failure')),
                }),
            }),
        };
        document.getElementById('forgot-phone').value = '9876543210';
        document.getElementById('forgot-name').value = 'Ravi';
        handleForgotPassword();
        await new Promise((r) => setTimeout(r, 20));
        expect(document.getElementById('forgot-msg').textContent).toMatch(/network error/i);
        expect(document.getElementById('forgot-msg').className).toContain('error');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// handleResetPassword — success and catch paths (lines 282-290)
// ═══════════════════════════════════════════════════════════════════════════
describe('handleResetPassword — Firestore success and catch (lines 282-290)', () => {
    beforeEach(() => {
        setupDOM(FORGOT_HTML_FULL);
        window.scrollTo = vi.fn();
    });

    it('closes modal and shows success toast on successful PIN reset', async () => {
        window.db = {
            collection: () => ({
                doc: () => ({
                    get: () => Promise.resolve({
                        exists: true,
                        data: () => ({ name: 'Ravi Kumar', phone: '9876543210' }),
                    }),
                    update: () => Promise.resolve(),
                }),
            }),
        };
        // First verify the phone so forgotPhoneVerified is set
        document.getElementById('forgot-phone').value = '9876543210';
        document.getElementById('forgot-name').value = 'Ravi Kumar';
        handleForgotPassword();
        await new Promise((r) => setTimeout(r, 20));

        // Now reset password
        document.getElementById('forgot-new-password').value = '5678';
        document.getElementById('forgot-confirm-password').value = '5678';
        handleResetPassword();
        await new Promise((r) => setTimeout(r, 20));

        const toast = document.getElementById('auth-toast');
        expect(toast.textContent).toMatch(/PIN reset successful/i);
    });

    it('shows error message on Firestore update failure', async () => {
        window.db = {
            collection: () => ({
                doc: () => ({
                    get: () => Promise.resolve({
                        exists: true,
                        data: () => ({ name: 'Ravi Kumar', phone: '9876543210' }),
                    }),
                    update: () => Promise.reject(new Error('update failed')),
                }),
            }),
        };
        // Set forgotPhoneVerified via handleForgotPassword
        document.getElementById('forgot-phone').value = '9876543210';
        document.getElementById('forgot-name').value = 'Ravi Kumar';
        handleForgotPassword();
        await new Promise((r) => setTimeout(r, 20));

        // Mock db to fail on update
        window.db = {
            collection: () => ({
                doc: () => ({
                    update: () => Promise.reject(new Error('update failed')),
                }),
            }),
        };
        document.getElementById('forgot-new-password').value = '5678';
        document.getElementById('forgot-confirm-password').value = '5678';
        handleResetPassword();
        await new Promise((r) => setTimeout(r, 20));

        const msg = document.getElementById('forgot-msg');
        expect(msg.textContent).toMatch(/something went wrong/i);
        expect(msg.className).toContain('error');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// initAuth — session restore (lines 361-372)
// ═══════════════════════════════════════════════════════════════════════════
describe('initAuth — session restore on page load (lines 361-372)', () => {
    beforeEach(() => {
        setupDOM(`
            <button id="signin-btn" class="signin-nav-btn"></button>
            <div id="carousel-greeting"></div>
            <div id="auth-modal"></div>
            <div id="user-dropdown"></div>
            <div id="signup-form" class="signup-form">
                <div class="password-field"></div>
            </div>
        `);
        window.scrollTo = vi.fn();
        window._notifListenerActive = false;
        localStorage.clear();
    });

    it('calls updateSignInUI with saved user when localStorage has a user', async () => {
        const user = { name: 'Saved User', phone: '9876543210', pin: '1234' };
        localStorage.setItem('amoghaUser', JSON.stringify(user));
        window.db = undefined;
        initAuth();
        // updateSignInUI should have been called — verify btn was updated
        const btn = document.getElementById('signin-btn');
        expect(btn.classList.contains('signed-in')).toBe(true);
    });

    it('does not throw when localStorage has no user', () => {
        expect(() => initAuth()).not.toThrow();
    });

    it('does not throw when localStorage contains invalid JSON', () => {
        localStorage.setItem('amoghaUser', 'INVALID_JSON');
        expect(() => initAuth()).not.toThrow();
    });

    it('updates carousel greeting when user is saved in localStorage', () => {
        const user = { name: 'Greeting User', phone: '9000000001', pin: '0000' };
        localStorage.setItem('amoghaUser', JSON.stringify(user));
        window.db = undefined;
        initAuth();
        const greeting = document.getElementById('carousel-greeting');
        expect(greeting.textContent).toContain('Greeting');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// initAuth — backdrop click listener (lines 375-385)
// ═══════════════════════════════════════════════════════════════════════════
describe('initAuth — backdrop click closes modal (lines 375-385)', () => {
    beforeEach(() => {
        setupDOM(`
            <button id="signin-btn" class="signin-nav-btn"></button>
            <div id="carousel-greeting"></div>
            <div id="auth-modal" style="display:block"></div>
            <input id="signup-name" value="">
            <input id="signup-phone" value="">
            <input id="signup-password" value="">
            <div id="signup-msg"></div>
            <input id="signin-phone" value="">
            <input id="signin-password" value="">
            <div id="signin-msg"></div>
            <input id="forgot-phone" value="">
            <input id="forgot-name" value="">
            <input id="forgot-new-password" value="">
            <input id="forgot-confirm-password" value="">
            <div id="forgot-msg"></div>
            <div id="forgot-step-1"></div>
            <div id="forgot-step-2" style="display:none"></div>
            <div id="auth-toast"></div>
            <div class="auth-view" id="auth-signup"></div>
            <div class="auth-view" id="auth-signin"></div>
            <div class="auth-view" id="auth-forgot"></div>
        `);
        window.scrollTo = vi.fn();
        localStorage.clear();
        window._notifListenerActive = false;
    });

    it('closes auth modal when backdrop (the modal element itself) is clicked', () => {
        initAuth();
        const modal = document.getElementById('auth-modal');
        // Simulate clicking directly on the modal backdrop
        const evt = new MouseEvent('click', { bubbles: true });
        Object.defineProperty(evt, 'target', { value: modal, configurable: true });
        window.dispatchEvent(evt);
        expect(modal.style.display).toBe('none');
    });

    it('does not close modal when clicking an element inside the modal', () => {
        initAuth();
        const modal = document.getElementById('auth-modal');
        modal.style.display = 'block';
        const innerEl = document.createElement('div');
        modal.appendChild(innerEl);
        const evt = new MouseEvent('click', { bubbles: true });
        Object.defineProperty(evt, 'target', { value: innerEl, configurable: true });
        window.dispatchEvent(evt);
        expect(modal.style.display).toBe('block');
    });

    it('removes show class from user dropdown when clicking outside signin-btn', () => {
        initAuth();
        const dropdown = document.createElement('div');
        dropdown.id = 'user-dropdown-show-test';
        dropdown.className = 'user-dropdown show';
        dropdown.id = 'user-dropdown';
        document.body.appendChild(dropdown);
        document.getElementById = (id) => document.body.querySelector('#' + id);

        const dd = document.getElementById('user-dropdown');
        dd.classList.add('show');

        const outsideEl = document.createElement('div');
        document.body.appendChild(outsideEl);
        outsideEl.closest = () => null; // not inside .signin-nav-btn

        const evt = new MouseEvent('click', { bubbles: true });
        Object.defineProperty(evt, 'target', { value: outsideEl, configurable: true });
        window.dispatchEvent(evt);
        expect(dd.classList.contains('show')).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// initAuth — referral field injection (lines 387-402)
// ═══════════════════════════════════════════════════════════════════════════
describe('initAuth — referral code field injection (lines 387-402)', () => {
    beforeEach(() => {
        window.scrollTo = vi.fn();
        localStorage.clear();
        window._notifListenerActive = false;
    });

    it('injects referral input after password-field inside signup-form', async () => {
        setupDOM(`
            <button id="signin-btn" class="signin-nav-btn"></button>
            <div id="carousel-greeting"></div>
            <div id="auth-modal"></div>
            <form id="signup-form">
                <div class="password-field"><input id="signup-password" type="password"></div>
            </form>
        `);
        initAuth();
        await new Promise((r) => setTimeout(r, 1100));
        const refInput = document.getElementById('signup-referral');
        expect(refInput).not.toBeNull();
        expect(refInput.type).toBe('text');
        expect(refInput.placeholder).toMatch(/referral code/i);
        expect(refInput.style.textTransform).toBe('uppercase');
    }, 5000);

    it('does not inject referral field twice when initAuth is called again', async () => {
        setupDOM(`
            <button id="signin-btn" class="signin-nav-btn"></button>
            <div id="carousel-greeting"></div>
            <div id="auth-modal"></div>
            <form id="signup-form">
                <div class="password-field"><input id="signup-password" type="password"></div>
            </form>
        `);
        initAuth();
        await new Promise((r) => setTimeout(r, 1100));
        // Call initAuth again — dataset.refEnhanced should prevent double injection
        initAuth();
        await new Promise((r) => setTimeout(r, 1100));
        const allReferralInputs = document.querySelectorAll('#signup-referral');
        expect(allReferralInputs.length).toBe(1);
    }, 10000);

    it('does not inject referral field when signup-form is missing', async () => {
        setupDOM(`
            <button id="signin-btn" class="signin-nav-btn"></button>
            <div id="carousel-greeting"></div>
            <div id="auth-modal"></div>
        `);
        initAuth();
        await new Promise((r) => setTimeout(r, 1100));
        const refInput = document.getElementById('signup-referral');
        expect(refInput).toBeNull();
    }, 5000);

    it('does not inject referral field when password-field div is missing', async () => {
        setupDOM(`
            <button id="signin-btn" class="signin-nav-btn"></button>
            <div id="carousel-greeting"></div>
            <div id="auth-modal"></div>
            <form id="signup-form">
                <!-- no .password-field -->
            </form>
        `);
        initAuth();
        await new Promise((r) => setTimeout(r, 1100));
        const refInput = document.getElementById('signup-referral');
        expect(refInput).toBeNull();
    }, 5000);
});

// ═══════════════════════════════════════════════════════════════════════════
// initAuth — user dropdown setup (lines 404-431)
// ═══════════════════════════════════════════════════════════════════════════
describe('initAuth — user dropdown setup (lines 404-431)', () => {
    beforeEach(() => {
        window.scrollTo = vi.fn();
        localStorage.clear();
        window._notifListenerActive = false;
    });

    it('creates user-dropdown element inside signin-btn parent', async () => {
        setupDOM(`
            <nav>
                <button id="signin-btn" class="signin-nav-btn"></button>
            </nav>
            <div id="carousel-greeting"></div>
            <div id="auth-modal"></div>
        `);
        initAuth();
        await new Promise((r) => setTimeout(r, 1100));
        const dropdown = document.getElementById('user-dropdown');
        expect(dropdown).not.toBeNull();
        expect(dropdown.classList.contains('user-dropdown')).toBe(true);
    }, 5000);

    it('dropdown contains My Orders, Refer a Friend, Loyalty Points, Sign Out buttons', async () => {
        setupDOM(`
            <nav>
                <button id="signin-btn" class="signin-nav-btn"></button>
            </nav>
            <div id="carousel-greeting"></div>
            <div id="auth-modal"></div>
        `);
        initAuth();
        await new Promise((r) => setTimeout(r, 1100));
        const dropdown = document.getElementById('user-dropdown');
        expect(dropdown.innerHTML).toMatch(/My Orders/);
        expect(dropdown.innerHTML).toMatch(/Refer a Friend/);
        expect(dropdown.innerHTML).toMatch(/Loyalty Points/);
        expect(dropdown.innerHTML).toMatch(/Sign Out/);
    }, 5000);

    it('sets position:relative on signin-btn parent element', async () => {
        setupDOM(`
            <nav>
                <button id="signin-btn" class="signin-nav-btn"></button>
            </nav>
            <div id="carousel-greeting"></div>
            <div id="auth-modal"></div>
        `);
        initAuth();
        await new Promise((r) => setTimeout(r, 1100));
        const parent = document.getElementById('signin-btn').parentElement;
        expect(parent.style.position).toBe('relative');
    }, 5000);

    it('toggles dropdown visible class when signed-in user clicks signin-btn', async () => {
        setupDOM(`
            <nav>
                <button id="signin-btn" class="signin-nav-btn"></button>
            </nav>
            <div id="carousel-greeting"></div>
            <div id="auth-modal"></div>
        `);
        // Do NOT call setCurrentUser before initAuth — so restore path does not call
        // updateSignInUI (which would create a duplicate #user-dropdown inside the btn).
        // Instead set the user AFTER initAuth's timeouts fire, so getCurrentUser() returns
        // the user when the click handler runs.
        window.db = undefined;
        initAuth();
        await new Promise((r) => setTimeout(r, 1100));
        // Now set user so the click handler sees a signed-in user
        localStorage.setItem('amoghaUser', JSON.stringify({ name: 'Ravi', phone: '9876543210', pin: '1234' }));
        const signinBtn = document.getElementById('signin-btn');
        // The dropdown appended to parent by initAuth's setTimeout
        const dropdown = signinBtn.parentElement.querySelector('.user-dropdown');
        expect(dropdown).not.toBeNull();
        // Simulate click on signin-btn when user is signed in
        const clickEvt = new MouseEvent('click', { bubbles: false });
        signinBtn.dispatchEvent(clickEvt);
        expect(dropdown.classList.contains('visible')).toBe(true);
        // Click again to toggle off
        signinBtn.dispatchEvent(clickEvt);
        expect(dropdown.classList.contains('visible')).toBe(false);
    }, 5000);

    it('does not toggle dropdown when no user is signed in', async () => {
        setupDOM(`
            <nav>
                <button id="signin-btn" class="signin-nav-btn"></button>
            </nav>
            <div id="carousel-greeting"></div>
            <div id="auth-modal"></div>
        `);
        localStorage.clear();
        initAuth();
        await new Promise((r) => setTimeout(r, 1100));
        const signinBtn = document.getElementById('signin-btn');
        const dropdown = document.getElementById('user-dropdown');
        const clickEvt = new MouseEvent('click', { bubbles: false });
        signinBtn.dispatchEvent(clickEvt);
        expect(dropdown.classList.contains('visible')).toBe(false);
    }, 5000);

    it('removes visible class from dropdown when clicking outside signin-btn parent', async () => {
        setupDOM(`
            <nav>
                <button id="signin-btn" class="signin-nav-btn"></button>
            </nav>
            <div id="outside-el"></div>
            <div id="carousel-greeting"></div>
            <div id="auth-modal"></div>
        `);
        // Intercept document.addEventListener to capture the "click outside" listener
        // registered by initAuth's second setTimeout. This avoids firing stale listeners
        // from prior initAuth calls (which would crash on detached signinBtn.parentElement).
        let capturedDocListener = null;
        const origAddEventListener = document.addEventListener.bind(document);
        document.addEventListener = (type, handler, ...rest) => {
            if (type === 'click') {
                capturedDocListener = handler;
            }
            return origAddEventListener(type, handler, ...rest);
        };

        window.db = undefined;
        initAuth();
        await new Promise((r) => setTimeout(r, 1100));

        // Restore document.addEventListener
        document.addEventListener = origAddEventListener;

        localStorage.setItem('amoghaUser', JSON.stringify({ name: 'Ravi', phone: '9876543210', pin: '1234' }));
        const signinBtn = document.getElementById('signin-btn');
        const parentNav = signinBtn.parentElement;
        const dropdown = parentNav.querySelector('.user-dropdown');
        expect(dropdown).not.toBeNull();
        expect(capturedDocListener).not.toBeNull();

        // Open dropdown
        signinBtn.dispatchEvent(new MouseEvent('click', { bubbles: false }));
        expect(dropdown.classList.contains('visible')).toBe(true);

        // Invoke the captured listener directly with an outside-element event
        const outsideEl = document.getElementById('outside-el');
        const fakeEvt = { target: outsideEl };
        capturedDocListener(fakeEvt);
        expect(dropdown.classList.contains('visible')).toBe(false);
    }, 5000);

    it('does not create dropdown when signin-btn is missing', async () => {
        setupDOM(`
            <div id="carousel-greeting"></div>
            <div id="auth-modal"></div>
        `);
        expect(() => initAuth()).not.toThrow();
        await new Promise((r) => setTimeout(r, 1100));
        const dropdown = document.getElementById('user-dropdown');
        expect(dropdown).toBeNull();
    }, 5000);
});

// ═══════════════════════════════════════════════════════════════════════════
// updateSignInUI — dropdown toggle onclick (line 315)
// ═══════════════════════════════════════════════════════════════════════════
describe('updateSignInUI — dropdown toggle onclick (line 315)', () => {
    beforeEach(() => {
        setupDOM('<button id="signin-btn" class="signin-nav-btn"></button>');
        window.scrollTo = vi.fn();
    });

    it('attaches onclick that toggles show on user-dropdown', () => {
        updateSignInUI({ name: 'Ravi Kumar', phone: '9876543210' });
        const btn = document.getElementById('signin-btn');
        const dd = document.getElementById('user-dropdown');
        expect(dd).not.toBeNull();
        // Simulate click
        const evt = new MouseEvent('click', { bubbles: false });
        evt.preventDefault = vi.fn();
        btn.onclick(evt);
        expect(dd.classList.contains('show')).toBe(true);
        btn.onclick(evt);
        expect(dd.classList.contains('show')).toBe(false);
    });

    it('uses first initial when name has no spaces', () => {
        updateSignInUI({ name: 'Priya', phone: '9876543210' });
        const btn = document.getElementById('signin-btn');
        expect(btn.innerHTML).toContain('P');
    });

    it('uses G as fallback initials when name is empty string', () => {
        updateSignInUI({ name: '', phone: '9876543210' });
        const btn = document.getElementById('signin-btn');
        expect(btn.innerHTML).toContain('G');
    });

    it('truncates initials to 2 characters maximum', () => {
        updateSignInUI({ name: 'Ravi Kumar Singh', phone: '9876543210' });
        const btn = document.getElementById('signin-btn');
        const avatarMatch = btn.innerHTML.match(/class="user-avatar">([A-Z]+)</);
        expect(avatarMatch).not.toBeNull();
        expect(avatarMatch[1].length).toBeLessThanOrEqual(2);
    });
});
