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
