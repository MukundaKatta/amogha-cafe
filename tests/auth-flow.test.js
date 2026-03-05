import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    getCurrentUser,
    setCurrentUser,
    handleSignIn,
    handleSignUp,
    handleForgotPassword,
    handleResetPassword,
} from '../src/modules/auth.js';

// ── DOM factory ─────────────────────────────────────────────────────────────
// We restore a real getElementById backed by document.body for this suite.
// The global setup.js mocks it to return null — we override locally.

function setupDOM(html) {
    document.body.innerHTML = html;
    document.getElementById = (id) => document.body.querySelector('#' + id);
    document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
}

// Minimal DOM needed by handleSignIn
const SIGNIN_HTML = `
    <input id="signin-phone" value="">
    <input id="signin-password" value="">
    <div id="signin-msg"></div>
    <button id="signin-btn"></button>
    <div id="carousel-greeting"></div>
`;

// Minimal DOM needed by handleSignUp
const SIGNUP_HTML = `
    <input id="signup-name" value="">
    <input id="signup-phone" value="">
    <input id="signup-password" value="">
    <div id="signup-msg"></div>
    <button id="signin-btn"></button>
    <div id="carousel-greeting"></div>
    <div id="auth-modal" style="display:block"></div>
    <div id="auth-signup"></div>
    <div id="auth-signin"></div>
    <div id="auth-forgot"></div>
    <input id="signup-referral" value="">
`;

// Minimal DOM needed by handleForgotPassword / handleResetPassword
const FORGOT_HTML = `
    <input id="forgot-phone" value="">
    <input id="forgot-name" value="">
    <div id="forgot-msg"></div>
    <div id="forgot-step-1"></div>
    <div id="forgot-step-2" style="display:none"></div>
    <input id="forgot-new-password" value="">
    <input id="forgot-confirm-password" value="">
`;

// ── Auth modal / UI helpers used on sign-in success ─────────────────────────
// These are defined on window by auth.js itself, but may touch DOM we haven't set up.
// Stub them so success paths don't throw.
beforeEach(() => {
    localStorage.clear();
    window.updateSignInUI = vi.fn();
    window.updateCarouselGreeting = vi.fn();
    window.closeAuthModal = vi.fn();
    window.showAuthToast = vi.fn();
    window.updateLoyaltyWidget = vi.fn();
});

// ═══════════════════════════════════════════════════════════════════════════
// getCurrentUser / setCurrentUser — localStorage persistence
// ═══════════════════════════════════════════════════════════════════════════
describe('getCurrentUser', () => {
    it('returns null when localStorage is empty', () => {
        expect(getCurrentUser()).toBeNull();
    });

    it('returns null when stored value is invalid JSON', () => {
        localStorage.setItem('amoghaUser', 'NOT_JSON');
        expect(getCurrentUser()).toBeNull();
    });

    it('returns the stored user object', () => {
        const user = { name: 'Ravi', phone: '9876543210', pin: '1234' };
        localStorage.setItem('amoghaUser', JSON.stringify(user));
        const result = getCurrentUser();
        expect(result).not.toBeNull();
        expect(result.name).toBe('Ravi');
        expect(result.phone).toBe('9876543210');
    });
});

describe('setCurrentUser', () => {
    it('persists user to localStorage', () => {
        const user = { name: 'Priya', phone: '9000000001', pin: '5678' };
        setCurrentUser(user);
        const stored = JSON.parse(localStorage.getItem('amoghaUser'));
        expect(stored.name).toBe('Priya');
        expect(stored.phone).toBe('9000000001');
    });

    it('overwrites previously stored user', () => {
        setCurrentUser({ name: 'Old User', phone: '1111111111' });
        setCurrentUser({ name: 'New User', phone: '2222222222' });
        const stored = JSON.parse(localStorage.getItem('amoghaUser'));
        expect(stored.name).toBe('New User');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// handleSignIn — validation guards (execute before any Firestore call)
// ═══════════════════════════════════════════════════════════════════════════
describe('handleSignIn — validation', () => {
    beforeEach(() => {
        setupDOM(SIGNIN_HTML);
    });

    it('shows error for phone shorter than 10 digits', () => {
        document.getElementById('signin-phone').value = '98765';
        document.getElementById('signin-password').value = '1234';
        handleSignIn();
        const msg = document.getElementById('signin-msg');
        expect(msg.textContent).toMatch(/10-digit/i);
        expect(msg.className).toContain('error');
    });

    it('shows error for non-digit characters in phone', () => {
        document.getElementById('signin-phone').value = 'abcd123456';
        document.getElementById('signin-password').value = '1234';
        handleSignIn();
        expect(document.getElementById('signin-msg').textContent).toMatch(/10-digit/i);
    });

    it('shows error for PIN that is not exactly 4 digits', () => {
        document.getElementById('signin-phone').value = '9876543210';
        document.getElementById('signin-password').value = '12'; // too short
        handleSignIn();
        expect(document.getElementById('signin-msg').textContent).toMatch(/4-digit PIN/i);
    });

    it('shows error for PIN with letters', () => {
        document.getElementById('signin-phone').value = '9876543210';
        document.getElementById('signin-password').value = 'abcd';
        handleSignIn();
        expect(document.getElementById('signin-msg').textContent).toMatch(/4-digit PIN/i);
    });

    it('shows service-unavailable error when db is undefined', () => {
        window.db = undefined;
        document.getElementById('signin-phone').value = '9876543210';
        document.getElementById('signin-password').value = '1234';
        handleSignIn();
        expect(document.getElementById('signin-msg').textContent).toMatch(/service unavailable/i);
    });
});

describe('handleSignIn — Firestore paths', () => {
    beforeEach(() => {
        setupDOM(SIGNIN_HTML);
    });

    it('shows error when user document does not exist', async () => {
        window.db = {
            collection: () => ({
                doc: () => ({
                    get: () => Promise.resolve({ exists: false, data: () => ({}) }),
                }),
            }),
        };
        document.getElementById('signin-phone').value = '9876543210';
        document.getElementById('signin-password').value = '1234';
        handleSignIn();
        await new Promise((r) => setTimeout(r, 20));
        expect(document.getElementById('signin-msg').textContent).toMatch(/no account found/i);
    });

    it('shows error when PIN does not match', async () => {
        window.db = {
            collection: () => ({
                doc: () => ({
                    get: () => Promise.resolve({
                        exists: true,
                        data: () => ({ name: 'Ravi', phone: '9876543210', pin: '9999' }),
                    }),
                }),
            }),
        };
        document.getElementById('signin-phone').value = '9876543210';
        document.getElementById('signin-password').value = '1234';
        handleSignIn();
        await new Promise((r) => setTimeout(r, 20));
        expect(document.getElementById('signin-msg').textContent).toMatch(/incorrect pin/i);
    });

    it('calls setCurrentUser on successful sign-in', async () => {
        const user = { name: 'Ravi', phone: '9876543210', pin: '1234' };
        window.db = {
            collection: () => ({
                doc: () => ({
                    get: () => Promise.resolve({ exists: true, data: () => user }),
                    onSnapshot: vi.fn(() => vi.fn()),
                }),
                where: function() { return this; },
                onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
            }),
        };
        document.getElementById('signin-phone').value = '9876543210';
        document.getElementById('signin-password').value = '1234';
        handleSignIn();
        await new Promise((r) => setTimeout(r, 20));
        const storedUser = getCurrentUser();
        expect(storedUser).not.toBeNull();
        expect(storedUser.phone).toBe('9876543210');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// handleSignUp — validation guards
// ═══════════════════════════════════════════════════════════════════════════
describe('handleSignUp — validation', () => {
    beforeEach(() => {
        setupDOM(SIGNUP_HTML);
    });

    it('shows error when name is empty', () => {
        document.getElementById('signup-name').value = '';
        document.getElementById('signup-phone').value = '9876543210';
        document.getElementById('signup-password').value = '1234';
        handleSignUp();
        expect(document.getElementById('signup-msg').textContent).toMatch(/name/i);
        expect(document.getElementById('signup-msg').className).toContain('error');
    });

    it('shows error for phone shorter than 10 digits', () => {
        document.getElementById('signup-name').value = 'Ravi';
        document.getElementById('signup-phone').value = '98765';
        document.getElementById('signup-password').value = '1234';
        handleSignUp();
        expect(document.getElementById('signup-msg').textContent).toMatch(/10-digit/i);
    });

    it('shows error for phone with letters', () => {
        document.getElementById('signup-name').value = 'Ravi';
        document.getElementById('signup-phone').value = 'abcdefghij';
        document.getElementById('signup-password').value = '1234';
        handleSignUp();
        expect(document.getElementById('signup-msg').textContent).toMatch(/10-digit/i);
    });

    it('shows error when PIN is not 4 digits', () => {
        document.getElementById('signup-name').value = 'Ravi';
        document.getElementById('signup-phone').value = '9876543210';
        document.getElementById('signup-password').value = '12'; // too short
        handleSignUp();
        expect(document.getElementById('signup-msg').textContent).toMatch(/4-digit PIN/i);
    });

    it('shows error for PIN with letters', () => {
        document.getElementById('signup-name').value = 'Priya';
        document.getElementById('signup-phone').value = '9876543210';
        document.getElementById('signup-password').value = 'abcd';
        handleSignUp();
        expect(document.getElementById('signup-msg').textContent).toMatch(/4-digit PIN/i);
    });

    it('shows service-unavailable error when db is undefined', () => {
        window.db = undefined;
        document.getElementById('signup-name').value = 'Ravi';
        document.getElementById('signup-phone').value = '9876543210';
        document.getElementById('signup-password').value = '1234';
        handleSignUp();
        expect(document.getElementById('signup-msg').textContent).toMatch(/service unavailable/i);
    });
});

describe('handleSignUp — Firestore paths', () => {
    beforeEach(() => {
        setupDOM(SIGNUP_HTML);
    });

    it('shows error when phone number is already registered', async () => {
        window.db = {
            collection: () => ({
                doc: () => ({
                    get: () => Promise.resolve({ exists: true, data: () => ({ name: 'Existing User' }) }),
                }),
            }),
        };
        document.getElementById('signup-name').value = 'New User';
        document.getElementById('signup-phone').value = '9876543210';
        document.getElementById('signup-password').value = '1234';
        handleSignUp();
        await new Promise((r) => setTimeout(r, 20));
        expect(document.getElementById('signup-msg').textContent).toMatch(/already registered/i);
    });

    it('saves user and signs them in on successful registration', async () => {
        window.db = {
            collection: () => ({
                doc: () => ({
                    get: () => Promise.resolve({ exists: false, data: () => ({}) }),
                    set: () => Promise.resolve(),
                    onSnapshot: vi.fn(() => vi.fn()),
                }),
                where: function() { return this; },
                onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
            }),
        };
        document.getElementById('signup-name').value = 'New User';
        document.getElementById('signup-phone').value = '9000000099';
        document.getElementById('signup-password').value = '5678';
        handleSignUp();
        await new Promise((r) => setTimeout(r, 50));
        const storedUser = getCurrentUser();
        expect(storedUser).not.toBeNull();
        expect(storedUser.phone).toBe('9000000099');
        expect(storedUser.name).toBe('New User');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// handleForgotPassword — validation guards
// ═══════════════════════════════════════════════════════════════════════════
describe('handleForgotPassword — validation', () => {
    beforeEach(() => {
        setupDOM(FORGOT_HTML);
    });

    it('shows error for invalid phone number', () => {
        document.getElementById('forgot-phone').value = '123';
        document.getElementById('forgot-name').value = 'Ravi';
        handleForgotPassword();
        expect(document.getElementById('forgot-msg').textContent).toMatch(/10-digit/i);
    });

    it('shows error when name is empty', () => {
        document.getElementById('forgot-phone').value = '9876543210';
        document.getElementById('forgot-name').value = '';
        handleForgotPassword();
        expect(document.getElementById('forgot-msg').textContent).toMatch(/name/i);
    });

    it('shows service-unavailable error when db is undefined', () => {
        window.db = undefined;
        document.getElementById('forgot-phone').value = '9876543210';
        document.getElementById('forgot-name').value = 'Ravi';
        handleForgotPassword();
        expect(document.getElementById('forgot-msg').textContent).toMatch(/service unavailable/i);
    });

    it('shows error when phone is not found in Firestore', async () => {
        window.db = {
            collection: () => ({
                doc: () => ({
                    get: () => Promise.resolve({ exists: false, data: () => ({}) }),
                }),
            }),
        };
        document.getElementById('forgot-phone').value = '9876543210';
        document.getElementById('forgot-name').value = 'Ravi';
        handleForgotPassword();
        await new Promise((r) => setTimeout(r, 20));
        expect(document.getElementById('forgot-msg').textContent).toMatch(/no account found/i);
    });

    it('shows error when name does not match', async () => {
        window.db = {
            collection: () => ({
                doc: () => ({
                    get: () => Promise.resolve({
                        exists: true,
                        data: () => ({ name: 'Correct Name', phone: '9876543210' }),
                    }),
                }),
            }),
        };
        document.getElementById('forgot-phone').value = '9876543210';
        document.getElementById('forgot-name').value = 'Wrong Name';
        handleForgotPassword();
        await new Promise((r) => setTimeout(r, 20));
        expect(document.getElementById('forgot-msg').textContent).toMatch(/name does not match/i);
    });

    it('name match is case-insensitive', async () => {
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
        document.getElementById('forgot-phone').value = '9876543210';
        document.getElementById('forgot-name').value = 'ravi kumar'; // lowercase
        handleForgotPassword();
        await new Promise((r) => setTimeout(r, 20));
        // Should NOT show name mismatch error
        expect(document.getElementById('forgot-msg').textContent).not.toMatch(/name does not match/i);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// handleResetPassword — validation guards
// ═══════════════════════════════════════════════════════════════════════════
describe('handleResetPassword — validation', () => {
    beforeEach(() => {
        setupDOM(FORGOT_HTML);
    });

    it('shows error when new PIN is not 4 digits', () => {
        document.getElementById('forgot-new-password').value = '12';
        document.getElementById('forgot-confirm-password').value = '12';
        handleResetPassword();
        expect(document.getElementById('forgot-msg').textContent).toMatch(/4-digit PIN/i);
    });

    it('shows error when PIN contains letters', () => {
        document.getElementById('forgot-new-password').value = 'abcd';
        document.getElementById('forgot-confirm-password').value = 'abcd';
        handleResetPassword();
        expect(document.getElementById('forgot-msg').textContent).toMatch(/4-digit PIN/i);
    });

    it('shows error when PINs do not match', () => {
        document.getElementById('forgot-new-password').value = '1234';
        document.getElementById('forgot-confirm-password').value = '5678';
        handleResetPassword();
        expect(document.getElementById('forgot-msg').textContent).toMatch(/do not match/i);
    });

    it('shows service-unavailable error when db is undefined', () => {
        window.db = undefined;
        document.getElementById('forgot-new-password').value = '1234';
        document.getElementById('forgot-confirm-password').value = '1234';
        handleResetPassword();
        expect(document.getElementById('forgot-msg').textContent).toMatch(/service unavailable/i);
    });
});
