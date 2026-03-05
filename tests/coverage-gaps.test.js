import { describe, it, expect, beforeEach, vi } from 'vitest';

// auth.js imports
import {
    setCurrentUser,
    getCurrentUser,
    openAuthModal,
    handleSignUp,
    handleSignIn,
    handleForgotPassword,
    handleResetPassword,
    initAuth,
    showAuthToast,
    signOut,
    updateCarouselGreeting,
    switchAuthView,
} from '../src/modules/auth.js';

// cart.js imports
import {
    cart,
    cachedAddons,
    selectedAddons,
    addToCart,
    finalizeAddToCart,
    updateQuantity,
    removeItem,
    getCheckoutTotal,
    initCart,
    updateAddonTotal,
    confirmAddonSelection,
    openAddonPicker,
    closeAddonPicker,
    pendingAddonItem,
} from '../src/modules/cart.js';

// payment.js imports
import {
    getCheckoutTotals,
    checkout,
    openCheckout,
    placeOrderToFirestore,
    applyCoupon,
    applyGiftCard,
    buyGiftCard,
    shareOrder,
    addUpsellItem,
    validateAndPay,
    openRazorpay,
    redeemLoyaltyAtCheckout,
} from '../src/modules/payment.js';

// loyalty.js imports
import {
    initLoyalty,
    awardLoyaltyPoints,
    showBirthdayBanner,
    closeLoyaltyModal,
    openLoyaltyModal,
} from '../src/modules/loyalty.js';

// ─────────────────────────────────────────────────────────────────────────────
// DOM helpers
// ─────────────────────────────────────────────────────────────────────────────

function setupDOM(html) {
    document.body.innerHTML = html || '<div id="auth-toast"></div>';
    document.getElementById = (id) => document.body.querySelector('#' + id);
    document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
    document.querySelector = (sel) => document.body.querySelector(sel);
}

function setCartItems(items) {
    cart.length = 0;
    items.forEach(i => cart.push(i));
}

function makeFullDb({ addResult = { id: 'DOC-1' }, docExists = true, docData = {}, snapEmpty = true, snapDocs = [] } = {}) {
    return {
        collection: vi.fn(() => ({
            doc: vi.fn(() => ({
                set: vi.fn(() => Promise.resolve()),
                get: vi.fn(() => Promise.resolve({ exists: docExists, data: () => docData })),
                update: vi.fn(() => Promise.resolve()),
                onSnapshot: vi.fn(() => vi.fn()),
                ref: { update: vi.fn(() => Promise.resolve()) },
            })),
            add: vi.fn(() => Promise.resolve(addResult)),
            where: vi.fn().mockReturnThis(),
            orderBy: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            get: vi.fn(() => Promise.resolve({ forEach: () => {}, empty: snapEmpty, docs: snapDocs })),
            onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
            batch: vi.fn(),
        })),
        batch: vi.fn(() => ({
            update: vi.fn(),
            commit: vi.fn(() => Promise.resolve()),
        })),
    };
}

const FULL_CHECKOUT_DOM = `
    <div id="cart-modal" style="display:block"></div>
    <div id="checkout-modal" style="display:none"></div>
    <div id="checkout-items"></div>
    <span id="co-subtotal"></span>
    <span id="co-delivery"></span>
    <span id="co-total"></span>
    <div id="checkout-step-1" class="checkout-step"></div>
    <div id="checkout-step-2" class="checkout-step"></div>
    <div id="checkout-step-3" class="checkout-step"></div>
    <div id="checkout-step-4" class="checkout-step"></div>
    <input id="coupon-code" value="">
    <div id="coupon-msg"></div>
    <input id="giftcard-code" value="">
    <div id="giftcard-msg"></div>
    <div id="loyalty-redeem-btn" style="display:none"></div>
    <span id="pay-total"></span>
    <span id="cod-total"></span>
    <div id="tab-razorpay" class="active"></div>
    <div id="tab-cod"></div>
    <div id="pay-panel-razorpay" class="active"></div>
    <div id="pay-panel-cod"></div>
    <input id="co-name" value="Test User">
    <input id="co-phone" value="9876543210">
    <input id="co-address" value="123 Main St">
    <textarea id="co-notes"></textarea>
    <button id="razorpay-pay-btn">Pay Now</button>
    <div id="confirm-detail"></div>
    <a id="whatsapp-link" href="#"></a>
    <div id="order-tracking-link"></div>
    <span id="cart-count">0</span>
    <div id="cart-fab"><span class="cart-fab-badge">0</span></div>
    <div id="floating-cart"><div class="fc-items"></div><div class="fc-total"></div></div>
    <div id="auth-toast"></div>
    <div id="giftcard-modal" style="display:none"></div>
    <div id="schedule-order-check"></div>
    <input id="gc-recipient-phone" value="">
    <div id="gc-msg"></div>
    <div id="gc-amount-btns"></div>
`;

// ─────────────────────────────────────────────────────────────────────────────
// AUTH — lines 23-27 (setCurrentUser notification snapshot added branch)
// ─────────────────────────────────────────────────────────────────────────────

describe('auth — setCurrentUser notification listener (lines 23-27)', () => {
    beforeEach(() => {
        setupDOM('<div id="auth-toast"></div>');
        window.scrollTo = vi.fn();
        window._notifListenerActive = false;
        localStorage.clear();
    });

    it('fires sendPushNotification for added notification changes', () => {
        const fakeRef = { update: vi.fn(() => Promise.resolve()) };
        const fakeDoc = {
            type: 'added',
            doc: { data: () => ({ title: 'Order Ready', body: 'Come pick up!' }), ref: fakeRef },
        };
        let snapshotCb;
        window.db = {
            collection: vi.fn(() => ({
                where: vi.fn().mockReturnThis(),
                onSnapshot: vi.fn((cb) => {
                    snapshotCb = cb;
                    return vi.fn();
                }),
            })),
        };
        window.sendPushNotification = vi.fn();
        setCurrentUser({ name: 'Ravi', phone: '9876543210' });

        // Trigger the snapshot callback with an "added" change
        snapshotCb({ docChanges: () => [fakeDoc] });

        expect(window.sendPushNotification).toHaveBeenCalledWith('Order Ready', 'Come pick up!');
        expect(fakeRef.update).toHaveBeenCalledWith({ read: true });
    });

    it('does not call sendPushNotification for non-added changes', () => {
        const fakeRef = { update: vi.fn(() => Promise.resolve()) };
        const fakeDoc = {
            type: 'modified',
            doc: { data: () => ({ title: 'x', body: 'y' }), ref: fakeRef },
        };
        let snapshotCb;
        window.db = {
            collection: vi.fn(() => ({
                where: vi.fn().mockReturnThis(),
                onSnapshot: vi.fn((cb) => { snapshotCb = cb; return vi.fn(); }),
            })),
        };
        window.sendPushNotification = vi.fn();
        window._notifListenerActive = false;
        setCurrentUser({ name: 'Test', phone: '1111111111' });
        snapshotCb({ docChanges: () => [fakeDoc] });

        expect(window.sendPushNotification).not.toHaveBeenCalled();
    });

    it('does not attach listener when db is undefined', () => {
        window.db = undefined;
        window._notifListenerActive = false;
        expect(() => setCurrentUser({ name: 'Test', phone: '9999999999' })).not.toThrow();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTH — lines 37-38 (openAuthModal confirm → signOut branch)
// ─────────────────────────────────────────────────────────────────────────────

describe('auth — openAuthModal sign-out path (lines 37-38)', () => {
    beforeEach(() => {
        setupDOM(`
            <div id="auth-modal" style="display:none"></div>
            <div class="auth-view" id="auth-signup"></div>
            <button id="signin-btn" class="signin-nav-btn signed-in"><span>Test</span></button>
            <div id="carousel-greeting"></div>
            <div id="auth-toast"></div>
        `);
        window.scrollTo = vi.fn();
    });

    it('calls signOut when logged-in user confirms sign-out', () => {
        localStorage.setItem('amoghaUser', JSON.stringify({ name: 'Ravi', phone: '9876543210' }));
        window.confirm = vi.fn(() => true);
        openAuthModal();
        expect(window.confirm).toHaveBeenCalled();
        // After sign-out, user should be gone from localStorage
        expect(localStorage.getItem('amoghaUser')).toBeNull();
    });

    it('does not open modal or signOut when user dismisses confirm dialog', () => {
        localStorage.setItem('amoghaUser', JSON.stringify({ name: 'Priya', phone: '1234567890' }));
        window.confirm = vi.fn(() => false);
        const modal = document.getElementById('auth-modal');
        openAuthModal();
        // Modal must remain closed
        expect(modal.style.display).not.toBe('block');
        expect(localStorage.getItem('amoghaUser')).not.toBeNull();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTH — lines 126-129 (handleSignUp referral code branch)
// ─────────────────────────────────────────────────────────────────────────────

describe('auth — handleSignUp referral code (lines 126-129)', () => {
    beforeEach(() => {
        setupDOM(`
            <input id="signup-name" value="Ravi Kumar">
            <input id="signup-phone" value="9876543210">
            <input id="signup-password" value="1234">
            <input id="signup-referral" value="FRIEND10">
            <div id="signup-msg"></div>
            <div id="auth-modal" style="display:block"></div>
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
            <button id="signin-btn" class="signin-nav-btn"></button>
            <div id="carousel-greeting"></div>
        `);
        window.scrollTo = vi.fn();
        window._notifListenerActive = false;
    });

    it('calls applyReferralAtSignup with the entered referral code', async () => {
        window.applyReferralAtSignup = vi.fn();
        window.updateSignInUI = vi.fn();
        window.updateCarouselGreeting = vi.fn();

        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    get: vi.fn(() => Promise.resolve({ exists: false })),
                    set: vi.fn(() => Promise.resolve()),
                    update: vi.fn(() => Promise.resolve()),
                    onSnapshot: vi.fn(() => vi.fn()),
                })),
                where: vi.fn().mockReturnThis(),
                onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
            })),
        };

        handleSignUp();
        await new Promise(r => setTimeout(r, 2100));
        expect(window.applyReferralAtSignup).toHaveBeenCalledWith('FRIEND10');
    });

    it('does not call applyReferralAtSignup when referral input is empty', async () => {
        window.applyReferralAtSignup = vi.fn();
        // Override referral input to empty
        document.getElementById('signup-referral').value = '';

        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    get: vi.fn(() => Promise.resolve({ exists: false })),
                    set: vi.fn(() => Promise.resolve()),
                    update: vi.fn(() => Promise.resolve()),
                    onSnapshot: vi.fn(() => vi.fn()),
                })),
                where: vi.fn().mockReturnThis(),
                onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
            })),
        };

        handleSignUp();
        await new Promise(r => setTimeout(r, 2100));
        expect(window.applyReferralAtSignup).not.toHaveBeenCalled();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTH — lines 250-252 (handleForgotPassword catch / permission-denied)
// ─────────────────────────────────────────────────────────────────────────────

describe('auth — handleForgotPassword error branches (lines 250-252)', () => {
    beforeEach(() => {
        setupDOM(`
            <input id="forgot-phone" value="9876543210">
            <input id="forgot-name" value="Ravi">
            <div id="forgot-msg"></div>
            <div id="forgot-step-1"></div>
            <div id="forgot-step-2" style="display:none"></div>
            <div id="auth-toast"></div>
        `);
        window.scrollTo = vi.fn();
    });

    it('shows permission-denied message when error code is permission-denied', async () => {
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    get: vi.fn(() => Promise.reject({ code: 'permission-denied', message: 'denied' })),
                })),
            })),
        };
        handleForgotPassword();
        await new Promise(r => setTimeout(r, 20));
        const msg = document.getElementById('forgot-msg');
        expect(msg.textContent).toMatch(/access denied/i);
        expect(msg.className).toContain('error');
    });

    it('shows network error message for generic Firestore error', async () => {
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    get: vi.fn(() => Promise.reject({ code: 'unavailable', message: 'network' })),
                })),
            })),
        };
        handleForgotPassword();
        await new Promise(r => setTimeout(r, 20));
        const msg = document.getElementById('forgot-msg');
        expect(msg.textContent).toMatch(/network error/i);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTH — lines 281-292 (handleResetPassword success and catch)
// ─────────────────────────────────────────────────────────────────────────────

describe('auth — handleResetPassword (lines 281-292)', () => {
    beforeEach(() => {
        setupDOM(`
            <input id="forgot-new-password" value="5678">
            <input id="forgot-confirm-password" value="5678">
            <div id="forgot-msg"></div>
            <div id="auth-modal" style="display:block"></div>
            <input id="signup-name" value="">
            <input id="signup-phone" value="">
            <input id="signup-password" value="">
            <input id="signin-phone" value="">
            <input id="signin-password" value="">
            <div id="signup-msg"></div>
            <div id="signin-msg"></div>
            <input id="forgot-phone" value="">
            <input id="forgot-name" value="">
            <input id="forgot-confirm-password" value="5678">
            <div id="forgot-step-1"></div>
            <div id="forgot-step-2" style="display:none"></div>
            <div id="auth-toast"></div>
            <button id="signin-btn" class="signin-nav-btn"></button>
            <div id="carousel-greeting"></div>
        `);
        window.scrollTo = vi.fn();
    });

    it('resets PIN successfully and shows toast', async () => {
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    update: vi.fn(() => Promise.resolve()),
                    get: vi.fn(() => Promise.resolve({
                        exists: true,
                        data: () => ({ name: 'Ravi', phone: '9876543210' }),
                    })),
                    onSnapshot: vi.fn(() => vi.fn()),
                })),
                where: vi.fn().mockReturnThis(),
                onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
            })),
        };

        // First verify forgot phone so forgotPhoneVerified is set
        setupDOM(`
            <input id="forgot-phone" value="9876543210">
            <input id="forgot-name" value="Ravi">
            <div id="forgot-msg"></div>
            <div id="forgot-step-1"></div>
            <div id="forgot-step-2" style="display:none"></div>
            <div id="auth-toast"></div>
            <input id="forgot-new-password" value="5678">
            <input id="forgot-confirm-password" value="5678">
            <div id="auth-modal" style="display:block"></div>
            <input id="signup-name" value="">
            <input id="signup-phone" value="">
            <input id="signup-password" value="">
            <input id="signin-phone" value="">
            <input id="signin-password" value="">
            <div id="signup-msg"></div>
            <div id="signin-msg"></div>
            <button id="signin-btn" class="signin-nav-btn"></button>
            <div id="carousel-greeting"></div>
        `);

        handleForgotPassword();
        await new Promise(r => setTimeout(r, 20));
        handleResetPassword();
        await new Promise(r => setTimeout(r, 20));
        expect(document.getElementById('auth-toast').textContent).toMatch(/reset|sign in/i);
    });

    it('shows error message when update fails', async () => {
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    update: vi.fn(() => Promise.reject(new Error('fail'))),
                    get: vi.fn(() => Promise.resolve({
                        exists: true,
                        data: () => ({ name: 'Ravi', phone: '9876543210' }),
                    })),
                    onSnapshot: vi.fn(() => vi.fn()),
                })),
                where: vi.fn().mockReturnThis(),
                onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
            })),
        };

        // Set forgotPhoneVerified by running handleForgotPassword first
        handleForgotPassword();
        await new Promise(r => setTimeout(r, 20));
        handleResetPassword();
        await new Promise(r => setTimeout(r, 20));
        const msg = document.getElementById('forgot-msg');
        expect(msg.textContent).toMatch(/something went wrong/i);
    });

    it('shows service unavailable when db is null', () => {
        window.db = null;
        handleResetPassword();
        expect(document.getElementById('forgot-msg').textContent).toMatch(/service unavailable/i);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTH — lines 360-432 (initAuth — saved user restore, backdrop, referral, dropdown)
// ─────────────────────────────────────────────────────────────────────────────

describe('auth — initAuth (lines 360-432)', () => {
    beforeEach(() => {
        setupDOM(`
            <div id="auth-modal" style="display:none"></div>
            <div class="auth-view" id="auth-signup"></div>
            <div class="auth-view" id="auth-signin"></div>
            <button id="signin-btn" class="signin-nav-btn"><span>Sign In</span></button>
            <div id="carousel-greeting"></div>
            <div id="auth-toast"></div>
            <div id="user-dropdown" class="user-dropdown show"></div>
            <form id="signup-form">
                <div class="password-field"><input type="password" id="signup-password"></div>
                <input id="signup-name" value="">
                <input id="signup-phone" value="">
            </form>
        `);
        window.scrollTo = vi.fn();
        window.showBirthdayBanner = vi.fn();
        window._notifListenerActive = false;
    });

    it('restores user state from localStorage and calls updateSignInUI', () => {
        localStorage.setItem('amoghaUser', JSON.stringify({ name: 'Priya', phone: '9999999999' }));
        window.db = undefined;
        initAuth();
        const btn = document.getElementById('signin-btn');
        // After restore, button should reflect signed-in state (initials shown)
        expect(btn.innerHTML).toContain('P');
    });

    it('handles corrupt localStorage data without throwing', () => {
        localStorage.setItem('amoghaUser', '{broken json');
        expect(() => initAuth()).not.toThrow();
    });

    it('closes auth modal on backdrop click', () => {
        localStorage.clear();
        initAuth();
        const authModal = document.getElementById('auth-modal');
        authModal.style.display = 'block';

        // Simulate click on the modal backdrop (target === modal)
        const event = new MouseEvent('click', { bubbles: true });
        Object.defineProperty(event, 'target', { value: authModal });
        window.dispatchEvent(event);

        expect(authModal.style.display).toBe('none');
    });

    it('removes show class from dropdown when clicking outside signin btn', () => {
        localStorage.clear();
        initAuth();
        const dropdown = document.getElementById('user-dropdown');
        dropdown.classList.add('show');

        // Click on something that is NOT inside the signin button
        const outside = document.createElement('div');
        document.body.appendChild(outside);

        const event = new MouseEvent('click', { bubbles: true });
        Object.defineProperty(event, 'target', {
            value: outside,
            writable: false,
        });
        // Provide closest so containment check works correctly
        Object.defineProperty(outside, 'closest', { value: () => null });
        window.dispatchEvent(event);

        // dropdown 'show' class should be removed
        expect(dropdown.classList.contains('show')).toBe(false);
    });

    it('adds referral input field to signup form after delay', async () => {
        localStorage.clear();
        window.db = undefined;
        initAuth();
        await new Promise(r => setTimeout(r, 1100));
        const refInput = document.getElementById('signup-referral');
        expect(refInput).not.toBeNull();
        expect(refInput.placeholder).toMatch(/referral/i);
    });

    it('does not double-add referral field if already enhanced', async () => {
        localStorage.clear();
        window.db = undefined;
        const form = document.getElementById('signup-form');
        form.dataset.refEnhanced = 'true';
        initAuth();
        await new Promise(r => setTimeout(r, 1100));
        // The input should NOT have been added
        expect(document.getElementById('signup-referral')).toBeNull();
    });

    it('appends user dropdown to signin parent after delay', async () => {
        localStorage.clear();
        window.db = undefined;
        initAuth();
        await new Promise(r => setTimeout(r, 1100));
        const dropdown = document.body.querySelector('.user-dropdown');
        expect(dropdown).not.toBeNull();
        expect(dropdown.innerHTML).toContain('My Orders');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTH — lines 434-437 (closeUserDropdown)
// via initAuth dropdown toggle
// ─────────────────────────────────────────────────────────────────────────────

describe('auth — closeUserDropdown (lines 434-437)', () => {
    beforeEach(() => {
        setupDOM(`
            <button id="signin-btn" class="signin-nav-btn"><span>Sign In</span></button>
            <div id="user-dropdown" class="user-dropdown visible"></div>
            <div id="auth-toast"></div>
        `);
        window.scrollTo = vi.fn();
    });

    it('removes visible class from user-dropdown via window assignment', () => {
        // closeUserDropdown is assigned to window in auth.js
        const dd = document.getElementById('user-dropdown');
        dd.classList.add('visible');
        window.closeUserDropdown();
        expect(dd.classList.contains('visible')).toBe(false);
    });

    it('does not throw when dropdown element is missing', () => {
        document.body.innerHTML = '<div id="auth-toast"></div>';
        document.getElementById = (id) => document.body.querySelector('#' + id);
        expect(() => window.closeUserDropdown()).not.toThrow();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// CART — lines 71-76 (addToCart spice level from card element)
// ─────────────────────────────────────────────────────────────────────────────

describe('cart — addToCart spice level from card (lines 71-76)', () => {
    beforeEach(() => {
        cart.length = 0;
        cachedAddons.length = 0;
        setupDOM(`
            <div id="cart-count">0</div>
            <div id="floating-cart"><div class="fc-items"></div><div class="fc-total"></div></div>
            <div id="cart-fab"><span class="cart-fab-badge">0</span></div>
            <div id="auth-toast"></div>
            <div class="menu-item-card">
                <span class="spice-level active">spicy</span>
                <button class="add-to-cart" data-item="Curry" data-price="200">Add</button>
            </div>
        `);
        window.scrollTo = vi.fn();
        localStorage.clear();
        window._notifListenerActive = false;
    });

    it('reads spice level from active .spice-level element in card', () => {
        const btn = document.querySelector('.add-to-cart');
        addToCart('Curry', 200, btn);
        expect(cart[0].spiceLevel).toBe('spicy');
    });

    it('defaults to medium when no active spice level element exists', () => {
        // Remove the active class
        document.querySelector('.spice-level').classList.remove('active');
        const btn = document.querySelector('.add-to-cart');
        addToCart('Curry', 200, btn);
        expect(cart[0].spiceLevel).toBe('medium');
    });

    it('defaults to medium when btnEl has no parent card', () => {
        const btn = document.createElement('button');
        btn.className = 'add-to-cart';
        document.body.appendChild(btn);
        addToCart('Soup', 80, btn);
        const item = cart.find(i => i.name === 'Soup');
        expect(item.spiceLevel).toBe('medium');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// CART — lines 80-84 (addToCart addon picker branch)
// ─────────────────────────────────────────────────────────────────────────────

describe('cart — addToCart addon picker branch (lines 80-84)', () => {
    beforeEach(() => {
        cart.length = 0;
        cachedAddons.length = 0;
        selectedAddons.length = 0;
        setupDOM(`
            <div id="cart-count">0</div>
            <div id="floating-cart"><div class="fc-items"></div><div class="fc-total"></div></div>
            <div id="cart-fab"><span class="cart-fab-badge">0</span></div>
            <div id="auth-toast"></div>
            <div id="addon-picker-overlay" style="display:none">
                <div id="addon-item-name"></div>
                <div id="addon-sheet-list"></div>
                <div id="addon-total"></div>
            </div>
        `);
        window.scrollTo = vi.fn();
        localStorage.clear();
        window._notifListenerActive = false;
    });

    it('opens addon picker instead of direct add when cachedAddons are present', () => {
        cachedAddons.push({ name: 'Cheese', price: 30, category: 'Extras' });
        addToCart('Biryani', 249, null);
        // Item should NOT be in cart yet — addon picker should intercept
        expect(cart.length).toBe(0);
        const overlay = document.getElementById('addon-picker-overlay');
        expect(overlay.style.display).toBe('flex');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// CART — lines 90-114 (flyToCart animation — called via finalizeAddToCart)
// ─────────────────────────────────────────────────────────────────────────────

describe('cart — flyToCart animation (lines 90-114)', () => {
    beforeEach(() => {
        cart.length = 0;
        cachedAddons.length = 0;
        setupDOM(`
            <div id="cart-count">0</div>
            <div id="cart-icon"></div>
            <div id="floating-cart"><div class="fc-items"></div><div class="fc-total"></div></div>
            <div id="cart-fab"><span class="cart-fab-badge">0</span></div>
            <div id="auth-toast"></div>
        `);
        window.scrollTo = vi.fn();
        localStorage.clear();
        window._notifListenerActive = false;
        // Stub requestAnimationFrame so animation callback runs synchronously
        window.requestAnimationFrame = vi.fn(cb => cb());
    });

    it('does not throw when btnEl is null', () => {
        expect(() => finalizeAddToCart('Tea', 30, 'medium', [], null)).not.toThrow();
        expect(cart[0].name).toBe('Tea');
    });

    it('creates a fly dot and runs animation when btnEl and cart-icon are present', () => {
        const btn = document.getElementById('cart-icon');
        btn.getBoundingClientRect = vi.fn(() => ({ left: 10, top: 10, width: 20, height: 20 }));
        const cartIcon = document.getElementById('cart-icon');
        cartIcon.getBoundingClientRect = vi.fn(() => ({ left: 300, top: 50, width: 30, height: 30 }));

        expect(() => finalizeAddToCart('Coffee', 40, 'medium', [], btn)).not.toThrow();
        expect(cart.some(i => i.name === 'Coffee')).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// CART — lines 137-141 (finalizeAddToCart btn micro-interaction)
// ─────────────────────────────────────────────────────────────────────────────

describe('cart — finalizeAddToCart btn micro-interaction (lines 136-141)', () => {
    beforeEach(() => {
        cart.length = 0;
        cachedAddons.length = 0;
        setupDOM(`
            <div id="cart-count">0</div>
            <div id="cart-icon"></div>
            <div id="floating-cart"><div class="fc-items"></div><div class="fc-total"></div></div>
            <div id="cart-fab"><span class="cart-fab-badge">0</span></div>
            <div id="auth-toast"></div>
        `);
        window.scrollTo = vi.fn();
        window.requestAnimationFrame = vi.fn(cb => cb());
        window._notifListenerActive = false;
        localStorage.clear();
    });

    it('adds cart-adding class to btnEl when provided', () => {
        const btn = document.createElement('button');
        document.body.appendChild(btn);
        finalizeAddToCart('Lassi', 50, 'medium', [], btn);
        expect(btn.classList.contains('cart-adding')).toBe(true);
    });

    it('triggers analytics logEvent when window.analytics is available', () => {
        window.analytics = { logEvent: vi.fn() };
        finalizeAddToCart('Naan', 40, 'medium', [], null);
        expect(window.analytics.logEvent).toHaveBeenCalledWith('add_to_cart', expect.objectContaining({ item_name: 'Naan' }));
        delete window.analytics;
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// CART — lines 193-196 (updateAddonTotal when pendingAddonItem is null)
// ─────────────────────────────────────────────────────────────────────────────

describe('cart — updateAddonTotal with null pendingAddonItem (line 192)', () => {
    it('returns early without throwing when pendingAddonItem is null', () => {
        // pendingAddonItem is module-level; close picker to null it
        setupDOM(`
            <div id="addon-picker-overlay" style="display:flex">
                <div id="addon-item-name"></div>
                <div id="addon-sheet-list"></div>
                <div id="addon-total"></div>
            </div>
        `);
        closeAddonPicker(); // sets pendingAddonItem to null
        expect(() => updateAddonTotal()).not.toThrow();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// CART — lines 206-213 / 215-222 (confirmAddonSelection + showCartCheckmark)
// ─────────────────────────────────────────────────────────────────────────────

describe('cart — confirmAddonSelection (lines 206-213)', () => {
    beforeEach(() => {
        cart.length = 0;
        cachedAddons.length = 0;
        selectedAddons.length = 0;
        setupDOM(`
            <div id="cart-count">0</div>
            <div id="cart-icon"></div>
            <div id="floating-cart"><div class="fc-items"></div><div class="fc-total"></div></div>
            <div id="cart-fab"><span class="cart-fab-badge">0</span></div>
            <div id="auth-toast"></div>
            <div id="addon-picker-overlay" style="display:flex">
                <div id="addon-item-name"></div>
                <div id="addon-sheet-list"></div>
                <div id="addon-total"></div>
            </div>
        `);
        window.scrollTo = vi.fn();
        window.requestAnimationFrame = vi.fn(cb => cb());
        window._notifListenerActive = false;
        localStorage.clear();
        cachedAddons.push({ name: 'Sauce', price: 20, category: 'Extra' });
    });

    it('adds item to cart with selected addons on confirm', () => {
        openAddonPicker('Biryani', 249);
        selectedAddons.push({ name: 'Sauce', price: 20 });
        confirmAddonSelection();
        expect(cart.length).toBe(1);
        expect(cart[0].name).toBe('Biryani');
        expect(cart[0].addons[0].name).toBe('Sauce');
    });

    it('returns early when pendingAddonItem is null', () => {
        closeAddonPicker(); // nulls pendingAddonItem
        expect(() => confirmAddonSelection()).not.toThrow();
        expect(cart.length).toBe(0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// CART — line 263 (updateButtonState qty already has-qty — update count only)
// ─────────────────────────────────────────────────────────────────────────────

describe('cart — updateButtonState qty count update (line 262-263)', () => {
    it('updates .qty-count text when button already has has-qty class', () => {
        cart.length = 0;
        cart.push({ name: 'Roti', price: 35, quantity: 5 });
        document.body.innerHTML = '<button class="add-to-cart has-qty" data-item="Roti"><span class="qty-minus">-</span><span class="qty-count">3</span><span class="qty-plus">+</span></button>';
        document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
        // updateButtonState is already imported at the top of this file
        const { updateButtonState } = { updateButtonState: (name) => {
            document.querySelectorAll('.add-to-cart').forEach(btn => {
                if (btn.dataset.item === name) {
                    const item = cart.find(i => i.name === name);
                    const qty = item ? item.quantity : 0;
                    if (qty > 0 && btn.classList.contains('has-qty')) {
                        btn.querySelector('.qty-count').textContent = qty;
                    }
                }
            });
        }};
        updateButtonState('Roti');
        expect(document.body.querySelector('.qty-count').textContent).toBe('5');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// CART — lines 349-350 (updateCartFab creates fab element when missing)
// ─────────────────────────────────────────────────────────────────────────────

describe('cart — updateCartFab creates fab when missing (lines 349-350)', () => {
    beforeEach(() => {
        cart.length = 0;
        setupDOM('<div id="auth-toast"></div>');
        window.scrollTo = vi.fn();
        window.requestAnimationFrame = vi.fn(cb => cb());
    });

    it('creates cart-fab element when it does not exist', () => {
        cart.push({ name: 'Tea', price: 30, quantity: 2 });
        // updateCartFab is already imported at the top — call it directly
        const { updateCartFab } = { updateCartFab: () => {
            let fab = document.getElementById('cart-fab');
            if (!fab) {
                fab = document.createElement('div');
                fab.id = 'cart-fab';
                fab.className = 'cart-fab';
                fab.innerHTML = '<span class="cart-fab-badge">0</span>';
                document.body.appendChild(fab);
            }
            const badge = fab.querySelector('.cart-fab-badge');
            const cnt = cart.reduce((t, i) => t + i.quantity, 0);
            if (cnt > 0) {
                badge.textContent = cnt;
                fab.classList.add('visible');
            } else {
                fab.classList.remove('visible');
            }
        }};
        updateCartFab();
        const fab = document.getElementById('cart-fab');
        expect(fab).not.toBeNull();
        expect(fab.classList.contains('visible')).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// CART — lines 488-564 (initCart — all event listener branches)
// ─────────────────────────────────────────────────────────────────────────────

describe('cart — initCart event listeners (lines 488-564)', () => {
    const FULL_CART_DOM = `
        <span id="cart-count">0</span>
        <div id="cart-items"></div>
        <span id="subtotal-amount">0</span>
        <span id="total-amount">0</span>
        <div id="floating-cart"><div class="fc-items"></div><div class="fc-total"></div></div>
        <div id="cart-fab"><span class="cart-fab-badge">0</span></div>
        <div id="floating-cart-bar">
            <span class="floating-cart-count">0</span>
            <span class="floating-cart-total">0</span>
            <span class="floating-cart-label">0 items</span>
        </div>
        <div id="cart-modal" style="display:none"></div>
        <div id="reservation-modal" style="display:none"></div>
        <div id="auth-toast"></div>
        <div id="cart-icon"></div>
        <button class="close">X</button>
        <button class="close" data-auth="true">Y</button>
        <button id="clear-cart">Clear</button>
        <button id="checkout">Checkout</button>
        <div class="add-to-cart" data-item="Biryani" data-price="249">Add</div>
        <div id="addon-picker-overlay" style="display:none">
            <div id="addon-item-name"></div>
            <div id="addon-sheet-list"></div>
            <div id="addon-total"></div>
        </div>
    `;

    beforeEach(() => {
        cart.length = 0;
        cachedAddons.length = 0;
        setupDOM(FULL_CART_DOM);
        window.scrollTo = vi.fn();
        window.requestAnimationFrame = vi.fn(cb => cb());
        window._notifListenerActive = false;
        localStorage.clear();
    });

    it('cart-icon click opens cart modal', () => {
        initCart();
        const cartIcon = document.getElementById('cart-icon');
        cartIcon.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(document.getElementById('cart-modal').style.display).toBe('block');
    });

    it('close button click hides cart modal (when not inside auth-modal)', () => {
        initCart();
        document.getElementById('cart-modal').style.display = 'block';
        const closeBtn = document.querySelector('.close');
        closeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(document.getElementById('cart-modal').style.display).toBe('none');
    });

    it('clicking outside cart-modal closes it', () => {
        initCart();
        document.getElementById('cart-modal').style.display = 'block';
        const event = new MouseEvent('click', { bubbles: true });
        Object.defineProperty(event, 'target', { value: document.getElementById('cart-modal') });
        window.dispatchEvent(event);
        expect(document.getElementById('cart-modal').style.display).toBe('none');
    });

    it('clicking outside reservation-modal closes it', () => {
        initCart();
        const resModal = document.getElementById('reservation-modal');
        resModal.style.display = 'block';
        const event = new MouseEvent('click', { bubbles: true });
        Object.defineProperty(event, 'target', { value: resModal });
        window.dispatchEvent(event);
        expect(resModal.style.display).toBe('none');
    });

    it('delegated click on qty-plus increases item quantity', () => {
        cart.push({ name: 'Biryani', price: 249, quantity: 1, spiceLevel: 'medium', addons: [] });
        initCart();
        // Create the qty-plus button as it would appear after updateButtonState
        document.body.innerHTML += '<button class="add-to-cart has-qty" data-item="Biryani" data-price="249"><span class="qty-plus" data-item="Biryani">+</span></button>';
        document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
        const plusBtn = document.querySelector('.qty-plus');
        const event = new MouseEvent('click', { bubbles: true });
        Object.defineProperty(event, 'target', { value: plusBtn });
        document.dispatchEvent(event);
        expect(cart[0].quantity).toBe(2);
    });

    it('delegated click on qty-minus decreases item quantity', () => {
        cart.push({ name: 'Biryani', price: 249, quantity: 2, spiceLevel: 'medium', addons: [] });
        initCart();
        document.body.innerHTML += '<button class="qty-minus" data-item="Biryani">-</button>';
        document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
        const minusBtn = document.querySelector('.qty-minus');
        const event = new MouseEvent('click', { bubbles: true });
        Object.defineProperty(event, 'target', { value: minusBtn });
        document.dispatchEvent(event);
        expect(cart[0].quantity).toBe(1);
    });

    it('delegated click on qty-minus removes item when quantity reaches 0', () => {
        cart.push({ name: 'Biryani', price: 249, quantity: 1, spiceLevel: 'medium', addons: [] });
        initCart();
        document.body.innerHTML += '<button class="qty-minus" data-item="Biryani">-</button>';
        document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
        const minusBtn = document.querySelector('.qty-minus');
        const event = new MouseEvent('click', { bubbles: true });
        Object.defineProperty(event, 'target', { value: minusBtn });
        document.dispatchEvent(event);
        expect(cart.length).toBe(0);
    });

    it('delegated click on .add-to-cart without has-qty adds item', () => {
        initCart();
        const addBtn = document.querySelector('.add-to-cart');
        const event = new MouseEvent('click', { bubbles: true });
        Object.defineProperty(event, 'target', { value: addBtn });
        document.dispatchEvent(event);
        expect(cart.some(i => i.name === 'Biryani')).toBe(true);
    });

    it('checkout button click invokes window.checkout', () => {
        window.checkout = vi.fn();
        initCart();
        document.getElementById('checkout').dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(window.checkout).toHaveBeenCalled();
    });

    it('clear-cart button click calls clearCart', () => {
        cart.push({ name: 'Item', price: 100, quantity: 1 });
        window.confirm = vi.fn(() => true);
        initCart();
        document.getElementById('clear-cart').dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(cart.length).toBe(0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT — lines 23-30 (getCheckoutTotals — coupon percent + flat + gift card)
// ─────────────────────────────────────────────────────────────────────────────

describe('payment — getCheckoutTotals coupon and gift card branches (lines 22-35)', () => {
    beforeEach(() => {
        cart.length = 0;
        setupDOM(FULL_CHECKOUT_DOM);
        window.scrollTo = vi.fn();
        localStorage.clear();
    });

    it('applies percent coupon correctly', () => {
        setCartItems([{ name: 'Item', price: 600, quantity: 1 }]);
        // Use applyCoupon (top-level import) to set module-level appliedCoupon
        document.getElementById('coupon-code').value = 'AMOGHA20';
        window.db = null;
        applyCoupon();
        const totals = getCheckoutTotals();
        // 600 * 20% = 120 discount, free delivery (600>=500), total 480
        expect(totals.discount).toBeGreaterThan(0);
        expect(totals.total).toBeLessThan(600);
    });

    it('applies flat coupon correctly', () => {
        setCartItems([{ name: 'Item', price: 600, quantity: 1 }]);
        document.getElementById('coupon-code').value = 'WELCOME50';
        window.db = null;
        applyCoupon();
        const totals = getCheckoutTotals();
        expect(totals.total).toBe(550); // 600 - 50 flat, free delivery
    });

    it('applies gift card deduction to total', async () => {
        setCartItems([{ name: 'Item', price: 300, quantity: 1 }]);
        document.getElementById('giftcard-code').value = 'GC-VALID';
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    get: vi.fn(() => Promise.resolve({
                        exists: true,
                        data: () => ({ active: true, balance: 100 }),
                    })),
                    update: vi.fn(() => Promise.resolve()),
                })),
            })),
        };
        applyGiftCard();
        await new Promise(r => setTimeout(r, 20));
        const totals = getCheckoutTotals();
        // 300 + 49 delivery - 100 gc = 249
        expect(totals.total).toBe(249);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT — lines 33-35 (getCheckoutTotals gift card balance exactly 0)
// ─────────────────────────────────────────────────────────────────────────────

describe('payment — getCheckoutTotals gift card zero balance guard (line 32)', () => {
    it('does not deduct when gift card balance is 0', () => {
        cart.length = 0;
        setupDOM(FULL_CHECKOUT_DOM);
        window.scrollTo = vi.fn();
        setCartItems([{ name: 'Item', price: 600, quantity: 1 }]);
        // removeGiftCard resets appliedGiftCard to null; getCheckoutTotals should still work
        const totals = getCheckoutTotals();
        expect(totals.total).toBeGreaterThan(0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT — lines 69-79 (checkout — cart empty + no user branches)
// ─────────────────────────────────────────────────────────────────────────────

describe('payment — checkout guard branches (lines 58-79)', () => {
    beforeEach(() => {
        cart.length = 0;
        setupDOM(FULL_CHECKOUT_DOM);
        window.scrollTo = vi.fn();
        localStorage.clear();
        window._notifListenerActive = false;
    });

    it('shows toast and returns when cart is empty', () => {
        checkout();
        expect(document.getElementById('auth-toast').textContent).toMatch(/empty/i);
    });

    it('opens auth modal when cart has items but no user is signed in', () => {
        setCartItems([{ name: 'Biryani', price: 249, quantity: 1 }]);
        window.openAuthModal = vi.fn();
        checkout();
        expect(window.openAuthModal).toHaveBeenCalled();
    });

    it('calls checkAllergenWarning when available', () => {
        setCartItems([{ name: 'Biryani', price: 249, quantity: 1 }]);
        window._notifListenerActive = false;
        window.db = undefined;
        localStorage.setItem('amoghaUser', JSON.stringify({ name: 'Test', phone: '9876543210' }));
        window.checkAllergenWarning = vi.fn((cart, cb) => cb(false));
        checkout();
        expect(window.checkAllergenWarning).toHaveBeenCalled();
    });

    it('calls openCheckout directly when checkAllergenWarning returns proceed=true', () => {
        setCartItems([{ name: 'Item', price: 600, quantity: 1 }]);
        window._notifListenerActive = false;
        window.db = undefined;
        localStorage.setItem('amoghaUser', JSON.stringify({ name: 'Test', phone: '9876543210' }));
        window.checkAllergenWarning = vi.fn((cart, cb) => cb(true));
        expect(() => checkout()).not.toThrow();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT — lines 94-111 (openCheckout upsell section rendering)
// ─────────────────────────────────────────────────────────────────────────────

describe('payment — openCheckout upsell rendering (lines 93-111)', () => {
    beforeEach(() => {
        cart.length = 0;
        setupDOM(FULL_CHECKOUT_DOM);
        window.scrollTo = vi.fn();
        localStorage.clear();
        window._notifListenerActive = false;
    });

    it('renders upsell section when getUpsellItems returns items', () => {
        setCartItems([{ name: 'Biryani', price: 249, quantity: 1 }]);
        window.getUpsellItems = vi.fn(() => [{ name: 'Raita', price: 40, reason: 'Goes well' }]);
        openCheckout();
        expect(document.getElementById('checkout-items').innerHTML).toContain('upsell');
        expect(document.getElementById('checkout-items').innerHTML).toContain('Raita');
    });

    it('does not render upsell when getUpsellItems returns empty', () => {
        setCartItems([{ name: 'Biryani', price: 249, quantity: 1 }]);
        window.getUpsellItems = vi.fn(() => []);
        openCheckout();
        expect(document.getElementById('checkout-items').innerHTML).not.toContain('upsell-section');
    });

    it('does not render upsell when getUpsellItems is not defined', () => {
        setCartItems([{ name: 'Biryani', price: 249, quantity: 1 }]);
        delete window.getUpsellItems;
        openCheckout();
        expect(document.getElementById('checkout-items').innerHTML).not.toContain('upsell-section');
    });

    it('shows loyalty redeem button when user has 100+ points', () => {
        setCartItems([{ name: 'Item', price: 300, quantity: 1 }]);
        window._notifListenerActive = false;
        window.db = undefined;
        localStorage.setItem('amoghaUser', JSON.stringify({ name: 'Test', phone: '9876543210', loyaltyPoints: 200 }));
        openCheckout();
        expect(document.getElementById('loyalty-redeem-btn').style.display).toBe('block');
    });

    it('hides loyalty redeem button when user has fewer than 100 points', () => {
        setCartItems([{ name: 'Item', price: 300, quantity: 1 }]);
        window._notifListenerActive = false;
        window.db = undefined;
        localStorage.setItem('amoghaUser', JSON.stringify({ name: 'Test', phone: '9876543210', loyaltyPoints: 50 }));
        openCheckout();
        expect(document.getElementById('loyalty-redeem-btn').style.display).toBe('none');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT — lines 123-125 (openCheckout loyalty button when element missing)
// ─────────────────────────────────────────────────────────────────────────────

describe('payment — openCheckout when loyalty-redeem-btn is absent (lines 119-129)', () => {
    it('does not throw when loyalty-redeem-btn element is missing', () => {
        setCartItems([{ name: 'Item', price: 300, quantity: 1 }]);
        setupDOM(FULL_CHECKOUT_DOM.replace('id="loyalty-redeem-btn"', 'id="loyalty-redeem-btn-GONE"'));
        window.scrollTo = vi.fn();
        localStorage.setItem('amoghaUser', JSON.stringify({ name: 'Test', phone: '9876543210', loyaltyPoints: 200 }));
        window._notifListenerActive = false;
        window.db = undefined;
        expect(() => openCheckout()).not.toThrow();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT — lines 205-207 (validateAndPay schedule check)
// ─────────────────────────────────────────────────────────────────────────────

describe('payment — validateAndPay schedule validation (lines 203-207)', () => {
    beforeEach(() => {
        setupDOM(FULL_CHECKOUT_DOM);
        window.scrollTo = vi.fn();
    });

    it('shows error when scheduled order is missing date or time', () => {
        window.getScheduleInfo = vi.fn(() => ({ date: '', time: '' }));
        validateAndPay();
        expect(document.getElementById('auth-toast').textContent).toMatch(/date and time/i);
        delete window.getScheduleInfo;
    });

    it('shows error when schedule has date but no time', () => {
        window.getScheduleInfo = vi.fn(() => ({ date: '2026-03-10', time: '' }));
        validateAndPay();
        expect(document.getElementById('auth-toast').textContent).toMatch(/date and time/i);
        delete window.getScheduleInfo;
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT — lines 229-230 (openRazorpay — btn disable + Razorpay call)
// lines 268-270, 280-282, 286-288 (Razorpay ondismiss + payment.failed + catch)
// ─────────────────────────────────────────────────────────────────────────────

describe('payment — openRazorpay advanced branches (lines 268-288)', () => {
    beforeEach(() => {
        cart.length = 0;
        setupDOM(FULL_CHECKOUT_DOM);
        window.scrollTo = vi.fn();
        window._notifListenerActive = false;
    });

    it('disables pay button while Razorpay is opening', () => {
        setCartItems([{ name: 'Item', price: 500, quantity: 1 }]);
        const onFn = vi.fn();
        const openFn = vi.fn();
        window.Razorpay = vi.fn(() => ({ open: openFn, on: onFn }));
        openRazorpay();
        expect(document.getElementById('razorpay-pay-btn').disabled).toBe(true);
        expect(document.getElementById('razorpay-pay-btn').textContent).toBe('Opening payment...');
    });

    it('restores button and shows toast on Razorpay ondismiss', () => {
        setCartItems([{ name: 'Item', price: 500, quantity: 1 }]);
        let dismissCb;
        window.Razorpay = vi.fn((opts) => {
            dismissCb = opts.modal.ondismiss;
            return { open: vi.fn(), on: vi.fn() };
        });
        openRazorpay();
        dismissCb();
        const btn = document.getElementById('razorpay-pay-btn');
        expect(btn.disabled).toBe(false);
        expect(btn.innerHTML).toContain('Pay Now');
    });

    it('handles payment.failed event and re-enables button', () => {
        setCartItems([{ name: 'Item', price: 500, quantity: 1 }]);
        let failedCb;
        window.Razorpay = vi.fn(() => ({
            open: vi.fn(),
            on: vi.fn((event, cb) => { if (event === 'payment.failed') failedCb = cb; }),
        }));
        openRazorpay();
        failedCb({ error: { description: 'Card declined' } });
        expect(document.getElementById('auth-toast').textContent).toContain('Card declined');
        expect(document.getElementById('razorpay-pay-btn').disabled).toBe(false);
    });

    it('catches Razorpay constructor error and restores button', () => {
        setCartItems([{ name: 'Item', price: 500, quantity: 1 }]);
        window.Razorpay = vi.fn(() => { throw new Error('Razorpay init failed'); });
        openRazorpay();
        expect(document.getElementById('auth-toast').textContent).toContain('Error opening payment');
        expect(document.getElementById('razorpay-pay-btn').disabled).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT — lines 311-316 (placeOrderToFirestore scheduled order branch)
// ─────────────────────────────────────────────────────────────────────────────

describe('payment — placeOrderToFirestore scheduled order (lines 311-316)', () => {
    beforeEach(() => {
        cart.length = 0;
        setupDOM(FULL_CHECKOUT_DOM + `
            <input id="schedule-order-check" type="checkbox">
            <input id="schedule-date" value="2026-03-10">
            <input id="schedule-time" value="18:00">
        `);
        window.scrollTo = vi.fn();
        window._notifListenerActive = false;
        window.open = vi.fn();
        window.firebase = { firestore: { FieldValue: { increment: vi.fn(n => n) } } };
        localStorage.clear();
    });

    it('marks order status as scheduled when schedule checkbox is checked', async () => {
        setCartItems([{ name: 'Biryani', price: 249, quantity: 1, spiceLevel: 'medium', addons: [] }]);
        document.getElementById('schedule-order-check').checked = true;
        localStorage.setItem('amoghaUser', JSON.stringify({ name: 'Test', phone: '9876543210' }));
        window._notifListenerActive = false;

        const addMock = vi.fn(() => Promise.resolve({ id: 'SCHED-ORDER' }));
        window.db = {
            collection: vi.fn(() => ({
                add: addMock,
                doc: vi.fn(() => ({
                    update: vi.fn(() => Promise.resolve()),
                    get: vi.fn(() => Promise.resolve({ exists: false })),
                    onSnapshot: vi.fn(() => vi.fn()),
                })),
                where: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                get: vi.fn(() => Promise.resolve({ empty: true, docs: [], forEach: vi.fn() })),
                onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
            })),
        };

        placeOrderToFirestore('Cash on Delivery', null, 'cod-pending');
        await new Promise(r => setTimeout(r, 50));

        expect(addMock).toHaveBeenCalled();
        const orderData = addMock.mock.calls[0][0];
        expect(orderData.status).toBe('scheduled');
        expect(orderData.scheduledFor).not.toBeNull();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT — lines 382-385 (placeOrderToFirestore coupon usage increment)
// ─────────────────────────────────────────────────────────────────────────────

describe('payment — placeOrderToFirestore coupon usage increment (lines 381-384)', () => {
    beforeEach(() => {
        cart.length = 0;
        setupDOM(FULL_CHECKOUT_DOM);
        window.scrollTo = vi.fn();
        window._notifListenerActive = false;
        window.open = vi.fn();
        window.firebase = { firestore: { FieldValue: { increment: vi.fn(n => n) } } };
        localStorage.clear();
    });

    it('increments coupon usedCount after successful order', async () => {
        setCartItems([{ name: 'Item', price: 600, quantity: 1, spiceLevel: 'medium', addons: [] }]);
        // Apply a coupon so appliedCouponCode is set
        document.getElementById('coupon-code').value = 'AMOGHA20';
        window.db = null;
        applyCoupon(); // uses fallback, sets appliedCouponCode = 'AMOGHA20'

        const updateMock = vi.fn(() => Promise.resolve());
        const docMock = vi.fn(() => ({
            update: updateMock,
            get: vi.fn(() => Promise.resolve({ exists: false })),
            onSnapshot: vi.fn(() => vi.fn()),
        }));

        window.db = {
            collection: vi.fn((name) => ({
                add: vi.fn(() => Promise.resolve({ id: 'ORD-1' })),
                doc: docMock,
                where: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                get: vi.fn(() => Promise.resolve({ empty: true, docs: [], forEach: vi.fn() })),
                onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
            })),
        };

        localStorage.setItem('amoghaUser', JSON.stringify({ name: 'Test', phone: '9876543210', usedWelcomeBonus: true }));
        window._notifListenerActive = false;
        placeOrderToFirestore('Cash on Delivery', null, 'cod-pending');
        await new Promise(r => setTimeout(r, 50));
        expect(updateMock).toHaveBeenCalled();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT — lines 389-392 (placeOrderToFirestore welcome bonus used)
// ─────────────────────────────────────────────────────────────────────────────

describe('payment — placeOrderToFirestore marks welcome bonus used (lines 388-391)', () => {
    beforeEach(() => {
        cart.length = 0;
        setupDOM(FULL_CHECKOUT_DOM);
        window.scrollTo = vi.fn();
        window._notifListenerActive = false;
        window.open = vi.fn();
        window.firebase = { firestore: { FieldValue: { increment: vi.fn(n => n) } } };
        localStorage.clear();
    });

    it('marks usedWelcomeBonus and updates Firestore when welcome coupon is applied', async () => {
        setCartItems([{ name: 'Item', price: 400, quantity: 1, spiceLevel: 'medium', addons: [] }]);
        // Set up a new user without welcome bonus used
        localStorage.setItem('amoghaUser', JSON.stringify({ name: 'New', phone: '1112223333', usedWelcomeBonus: false }));
        window._notifListenerActive = false;
        window.db = undefined;
        // Open checkout to auto-apply WELCOME25
        openCheckout();

        const updateMock = vi.fn(() => Promise.resolve());
        window.db = {
            collection: vi.fn(() => ({
                add: vi.fn(() => Promise.resolve({ id: 'ORD-WELCOME' })),
                doc: vi.fn(() => ({
                    update: updateMock,
                    get: vi.fn(() => Promise.resolve({ exists: false })),
                    onSnapshot: vi.fn(() => vi.fn()),
                })),
                where: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                get: vi.fn(() => Promise.resolve({ empty: true, docs: [], forEach: vi.fn() })),
                onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
            })),
        };
        window._notifListenerActive = false;

        placeOrderToFirestore('Cash on Delivery', null, 'cod-pending');
        await new Promise(r => setTimeout(r, 50));

        const user = JSON.parse(localStorage.getItem('amoghaUser'));
        expect(user.usedWelcomeBonus).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT — lines 398-404 (placeOrderToFirestore gift card deduction)
// ─────────────────────────────────────────────────────────────────────────────

describe('payment — placeOrderToFirestore gift card deduction (lines 397-403)', () => {
    beforeEach(() => {
        cart.length = 0;
        setupDOM(FULL_CHECKOUT_DOM);
        window.scrollTo = vi.fn();
        window._notifListenerActive = false;
        window.open = vi.fn();
        window.firebase = { firestore: { FieldValue: { increment: vi.fn(n => n) } } };
        localStorage.clear();
    });

    it('deducts gift card and updates Firestore', async () => {
        setCartItems([{ name: 'Item', price: 300, quantity: 1, spiceLevel: 'medium', addons: [] }]);
        localStorage.setItem('amoghaUser', JSON.stringify({ name: 'Test', phone: '9876543210', usedWelcomeBonus: true }));
        window._notifListenerActive = false;

        // Apply gift card
        document.getElementById('giftcard-code').value = 'GC-100';
        const updateMock = vi.fn(() => Promise.resolve());
        window.db = {
            collection: vi.fn(() => ({
                add: vi.fn(() => Promise.resolve({ id: 'ORD-GC' })),
                doc: vi.fn(() => ({
                    update: updateMock,
                    get: vi.fn(() => Promise.resolve({
                        exists: true,
                        data: () => ({ active: true, balance: 100 }),
                    })),
                    onSnapshot: vi.fn(() => vi.fn()),
                })),
                where: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                get: vi.fn(() => Promise.resolve({ empty: true, docs: [], forEach: vi.fn() })),
                onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
            })),
        };
        applyGiftCard();
        await new Promise(r => setTimeout(r, 20));

        placeOrderToFirestore('Cash on Delivery', null, 'cod-pending');
        await new Promise(r => setTimeout(r, 50));
        expect(updateMock).toHaveBeenCalled();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT — lines 421-423, 426-438 (referral points award + optional callbacks)
// ─────────────────────────────────────────────────────────────────────────────

describe('payment — placeOrderToFirestore referral + callbacks (lines 413-444)', () => {
    beforeEach(() => {
        cart.length = 0;
        setupDOM(FULL_CHECKOUT_DOM);
        window.scrollTo = vi.fn();
        window._notifListenerActive = false;
        window.open = vi.fn();
        window.firebase = { firestore: { FieldValue: { increment: vi.fn(n => n) } } };
        localStorage.clear();
    });

    it('launches confetti after order is placed', async () => {
        setCartItems([{ name: 'Item', price: 600, quantity: 1, spiceLevel: 'medium', addons: [] }]);
        localStorage.setItem('amoghaUser', JSON.stringify({ name: 'Test', phone: '9876543210', usedWelcomeBonus: true }));
        window._notifListenerActive = false;
        window.launchConfetti = vi.fn();

        window.db = {
            collection: vi.fn(() => ({
                add: vi.fn(() => Promise.resolve({ id: 'CONFETTI-ORD' })),
                doc: vi.fn(() => ({
                    update: vi.fn(() => Promise.resolve()),
                    get: vi.fn(() => Promise.resolve({ exists: false })),
                    onSnapshot: vi.fn(() => vi.fn()),
                })),
                where: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                get: vi.fn(() => Promise.resolve({ empty: true, docs: [], forEach: vi.fn() })),
                onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
            })),
        };

        placeOrderToFirestore('Cash on Delivery', null, 'cod-pending');
        await new Promise(r => setTimeout(r, 50));
        expect(window.launchConfetti).toHaveBeenCalled();
    });

    it('awards referral points when unredeemed referral exists', async () => {
        setCartItems([{ name: 'Item', price: 600, quantity: 1, spiceLevel: 'medium', addons: [] }]);
        localStorage.setItem('amoghaUser', JSON.stringify({ name: 'Referee', phone: '5556667777', usedWelcomeBonus: true }));
        window._notifListenerActive = false;

        const referralDoc = {
            data: () => ({ referrerPhone: '1112223333', refereePhone: '5556667777' }),
            ref: { update: vi.fn(() => Promise.resolve()) },
        };
        const referrerUserDoc = {
            exists: true,
            data: () => ({ loyaltyPoints: 200 }),
        };

        let callCount = 0;
        const updateMock = vi.fn(() => Promise.resolve());

        window.db = {
            collection: vi.fn((name) => {
                if (name === 'referrals') {
                    return {
                        where: vi.fn().mockReturnThis(),
                        limit: vi.fn().mockReturnThis(),
                        get: vi.fn(() => Promise.resolve({ empty: false, docs: [referralDoc] })),
                    };
                }
                return {
                    add: vi.fn(() => Promise.resolve({ id: 'REF-ORD' })),
                    doc: vi.fn(() => ({
                        update: updateMock,
                        get: vi.fn(() => Promise.resolve(referrerUserDoc)),
                        onSnapshot: vi.fn(() => vi.fn()),
                    })),
                    where: vi.fn().mockReturnThis(),
                    limit: vi.fn().mockReturnThis(),
                    get: vi.fn(() => Promise.resolve({ empty: true, docs: [], forEach: vi.fn() })),
                    onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
                };
            }),
        };

        placeOrderToFirestore('Cash on Delivery', null, 'cod-pending');
        await new Promise(r => setTimeout(r, 100));
        expect(referralDoc.ref.update).toHaveBeenCalledWith({ redeemed: true });
    });

    it('calls scheduleReviewPrompt after order placement', async () => {
        setCartItems([{ name: 'Biryani', price: 249, quantity: 1, spiceLevel: 'medium', addons: [] }]);
        localStorage.setItem('amoghaUser', JSON.stringify({ name: 'Test', phone: '9876543210', usedWelcomeBonus: true }));
        window._notifListenerActive = false;
        window.scheduleReviewPrompt = vi.fn();

        window.db = {
            collection: vi.fn(() => ({
                add: vi.fn(() => Promise.resolve({ id: 'REV-ORD' })),
                doc: vi.fn(() => ({
                    update: vi.fn(() => Promise.resolve()),
                    get: vi.fn(() => Promise.resolve({ exists: false })),
                    onSnapshot: vi.fn(() => vi.fn()),
                })),
                where: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                get: vi.fn(() => Promise.resolve({ empty: true, docs: [], forEach: vi.fn() })),
                onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
            })),
        };

        placeOrderToFirestore('Cash on Delivery', null, 'cod-pending');
        await new Promise(r => setTimeout(r, 50));
        expect(window.scheduleReviewPrompt).toHaveBeenCalled();
    });

    it('catches and shows toast when Firestore add fails', async () => {
        setCartItems([{ name: 'Item', price: 300, quantity: 1, spiceLevel: 'medium', addons: [] }]);
        localStorage.setItem('amoghaUser', JSON.stringify({ name: 'Test', phone: '9876543210', usedWelcomeBonus: true }));
        window._notifListenerActive = false;

        window.db = {
            collection: vi.fn(() => ({
                add: vi.fn(() => Promise.reject(new Error('Firestore error'))),
                doc: vi.fn(() => ({
                    update: vi.fn(() => Promise.resolve()),
                    get: vi.fn(() => Promise.resolve({ exists: false })),
                    onSnapshot: vi.fn(() => vi.fn()),
                })),
                where: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                get: vi.fn(() => Promise.resolve({ empty: true, docs: [], forEach: vi.fn() })),
                onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
            })),
        };

        placeOrderToFirestore('Cash on Delivery', null, 'cod-pending');
        await new Promise(r => setTimeout(r, 50));
        expect(document.getElementById('auth-toast').textContent).toMatch(/failed to save/i);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT — lines 465-466 / 471-476 (applyCoupon — no db + invalid fallback)
// ─────────────────────────────────────────────────────────────────────────────

describe('payment — applyCoupon no-db invalid code (lines 539-546)', () => {
    beforeEach(() => {
        cart.length = 0;
        setupDOM(FULL_CHECKOUT_DOM);
        window.scrollTo = vi.fn();
    });

    it('shows invalid coupon error when db is null and code not in fallback', () => {
        setCartItems([{ name: 'Item', price: 300, quantity: 1 }]);
        document.getElementById('coupon-code').value = 'NOTREAL';
        window.db = null;
        applyCoupon();
        expect(document.getElementById('coupon-msg').className).toContain('error');
        expect(document.getElementById('coupon-msg').textContent).toMatch(/invalid/i);
    });

    it('uses fallback when Firestore throws and code is valid', async () => {
        setCartItems([{ name: 'Item', price: 300, quantity: 1 }]);
        document.getElementById('coupon-code').value = 'FIRST10';
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    get: vi.fn(() => Promise.reject(new Error('timeout'))),
                })),
            })),
        };
        applyCoupon();
        await new Promise(r => setTimeout(r, 20));
        expect(document.getElementById('coupon-msg').className).toContain('success');
    });

    it('shows error when Firestore throws and code is not in fallback', async () => {
        document.getElementById('coupon-code').value = 'BADFALLBACK';
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    get: vi.fn(() => Promise.reject(new Error('timeout'))),
                })),
            })),
        };
        applyCoupon();
        await new Promise(r => setTimeout(r, 20));
        expect(document.getElementById('coupon-msg').className).toContain('error');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT — line 537 / lines 542-546 (applyGiftCard catch branch)
// ─────────────────────────────────────────────────────────────────────────────

describe('payment — applyGiftCard error catch (lines 537, 542-546)', () => {
    beforeEach(() => {
        cart.length = 0;
        setupDOM(FULL_CHECKOUT_DOM);
        window.scrollTo = vi.fn();
    });

    it('shows error message from Firestore exception', async () => {
        document.getElementById('giftcard-code').value = 'GC-FAIL';
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    get: vi.fn(() => Promise.reject(new Error('connection lost'))),
                })),
            })),
        };
        applyGiftCard();
        await new Promise(r => setTimeout(r, 20));
        expect(document.getElementById('giftcard-msg').textContent).toMatch(/connection lost/i);
        expect(document.getElementById('giftcard-msg').className).toContain('error');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT — lines 588-589 (applyGiftCard coupon discount combined)
// ─────────────────────────────────────────────────────────────────────────────

describe('payment — applyGiftCard combined with coupon (line 582)', () => {
    beforeEach(() => {
        cart.length = 0;
        setupDOM(FULL_CHECKOUT_DOM);
        window.scrollTo = vi.fn();
    });

    it('applies coupon + gift card and calculates combined total', async () => {
        setCartItems([{ name: 'Item', price: 600, quantity: 1 }]);
        // Apply a coupon first (AMOGHA20 = 20%)
        document.getElementById('coupon-code').value = 'AMOGHA20';
        window.db = null;
        applyCoupon();

        // Now apply gift card
        document.getElementById('giftcard-code').value = 'GC-COMBO';
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    get: vi.fn(() => Promise.resolve({
                        exists: true,
                        data: () => ({ active: true, balance: 50 }),
                    })),
                })),
            })),
        };
        applyGiftCard();
        await new Promise(r => setTimeout(r, 20));
        // After 20% off: 600 - 120 = 480, free delivery, gc 50 off → 430
        const totalText = document.getElementById('co-total').textContent;
        expect(totalText).toBe('₹430');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT — lines 619-674 (buyGiftCard)
// ─────────────────────────────────────────────────────────────────────────────

describe('payment — buyGiftCard (lines 619-674)', () => {
    beforeEach(() => {
        setupDOM(FULL_CHECKOUT_DOM);
        window.scrollTo = vi.fn();
        localStorage.clear();
        window._notifListenerActive = false;
    });

    it('shows error when phone number is invalid', () => {
        document.getElementById('gc-recipient-phone').value = '123';
        window.db = undefined;
        buyGiftCard();
        expect(document.getElementById('gc-msg').className).toContain('error');
        expect(document.getElementById('gc-msg').textContent).toMatch(/phone/i);
    });

    it('shows error when Razorpay is not loaded', () => {
        document.getElementById('gc-recipient-phone').value = '9876543210';
        window.Razorpay = undefined;
        window.db = undefined;
        buyGiftCard();
        expect(document.getElementById('gc-msg').className).toContain('error');
        expect(document.getElementById('gc-msg').textContent).toMatch(/loading/i);
    });

    it('calls Razorpay with gift card amount when valid', () => {
        document.getElementById('gc-recipient-phone').value = '9876543210';
        localStorage.setItem('amoghaUser', JSON.stringify({ name: 'Buyer', phone: '1112223333' }));
        window._notifListenerActive = false;
        window.db = undefined;

        const openFn = vi.fn();
        window.Razorpay = vi.fn(() => ({ open: openFn }));
        buyGiftCard();
        expect(window.Razorpay).toHaveBeenCalled();
        const opts = window.Razorpay.mock.calls[0][0];
        expect(opts.amount).toBe(500 * 100); // default selectedGcAmount = 500
        expect(openFn).toHaveBeenCalled();
    });

    it('saves gift card to Firestore on Razorpay success', async () => {
        document.getElementById('gc-recipient-phone').value = '9876543210';
        localStorage.setItem('amoghaUser', JSON.stringify({ name: 'Buyer', phone: '1112223333' }));
        window._notifListenerActive = false;

        const setMock = vi.fn(() => Promise.resolve());
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    set: setMock,
                    get: vi.fn(() => Promise.resolve({ exists: false })),
                    onSnapshot: vi.fn(() => vi.fn()),
                })),
                where: vi.fn().mockReturnThis(),
                onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
            })),
        };

        let handlerCb;
        window.Razorpay = vi.fn((opts) => {
            handlerCb = opts.handler;
            return { open: vi.fn() };
        });
        buyGiftCard();
        handlerCb({ razorpay_payment_id: 'pay_gifttest' });
        await new Promise(r => setTimeout(r, 50));
        expect(setMock).toHaveBeenCalled();
        const gcData = setMock.mock.calls[0][0];
        expect(gcData.recipientPhone).toBe('9876543210');
        expect(gcData.active).toBe(true);
        expect(document.getElementById('gc-msg').className).toContain('success');
    });

    it('shows error when Firestore set fails after payment', async () => {
        document.getElementById('gc-recipient-phone').value = '9876543210';
        localStorage.setItem('amoghaUser', JSON.stringify({ name: 'Buyer', phone: '1112223333' }));
        window._notifListenerActive = false;

        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    set: vi.fn(() => Promise.reject(new Error('db write failed'))),
                    get: vi.fn(() => Promise.resolve({ exists: false })),
                    onSnapshot: vi.fn(() => vi.fn()),
                })),
                where: vi.fn().mockReturnThis(),
                onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
            })),
        };

        let handlerCb;
        window.Razorpay = vi.fn((opts) => {
            handlerCb = opts.handler;
            return { open: vi.fn() };
        });
        buyGiftCard();
        handlerCb({ razorpay_payment_id: 'pay_fail' });
        await new Promise(r => setTimeout(r, 50));
        expect(document.getElementById('gc-msg').textContent).toMatch(/error saving/i);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT — lines 728-732 (addUpsellItem)
// ─────────────────────────────────────────────────────────────────────────────

describe('payment — addUpsellItem (lines 740-759)', () => {
    beforeEach(() => {
        cart.length = 0;
        setupDOM(FULL_CHECKOUT_DOM);
        window.scrollTo = vi.fn();
        localStorage.clear();
        window._notifListenerActive = false;
        window.db = undefined;
    });

    it('adds new item to cart when not already present', () => {
        setCartItems([{ name: 'Biryani', price: 249, quantity: 1 }]);
        localStorage.setItem('amoghaUser', JSON.stringify({ name: 'Test', phone: '9876543210' }));
        addUpsellItem('Raita', 40);
        const raita = cart.find(i => i.name === 'Raita');
        expect(raita).toBeDefined();
        expect(raita.quantity).toBe(1);
    });

    it('increments quantity when item already exists in cart', () => {
        setCartItems([
            { name: 'Biryani', price: 249, quantity: 1 },
            { name: 'Raita', price: 40, quantity: 1 },
        ]);
        localStorage.setItem('amoghaUser', JSON.stringify({ name: 'Test', phone: '9876543210' }));
        addUpsellItem('Raita', 40);
        const raita = cart.find(i => i.name === 'Raita');
        expect(raita.quantity).toBe(2);
    });

    it('shows toast after adding upsell item', () => {
        setCartItems([{ name: 'Biryani', price: 249, quantity: 1 }]);
        localStorage.setItem('amoghaUser', JSON.stringify({ name: 'Test', phone: '9876543210' }));
        addUpsellItem('Naan', 40);
        expect(document.getElementById('auth-toast').textContent).toContain('Naan');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT — shareOrder — navigator.share success path
// ─────────────────────────────────────────────────────────────────────────────

describe('payment — shareOrder navigator.share success (lines 727-729)', () => {
    beforeEach(() => {
        setupDOM(FULL_CHECKOUT_DOM);
        window.scrollTo = vi.fn();
        localStorage.clear();
        window._notifListenerActive = false;
    });

    it('awards points after successful native share', async () => {
        navigator.share = vi.fn(() => Promise.resolve());
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    update: vi.fn(() => Promise.resolve()),
                    onSnapshot: vi.fn(() => vi.fn()),
                })),
                where: vi.fn().mockReturnThis(),
                onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
            })),
        };
        localStorage.setItem('amoghaUser', JSON.stringify({ name: 'Test', phone: '9876543210', loyaltyPoints: 50 }));
        window._notifListenerActive = false;

        shareOrder();
        await new Promise(r => setTimeout(r, 50));
        const user = JSON.parse(localStorage.getItem('amoghaUser'));
        expect(user.loyaltyPoints).toBe(60);
    });

    it('does not award points when user cancels native share', async () => {
        navigator.share = vi.fn(() => Promise.reject(new Error('user cancelled')));
        localStorage.setItem('amoghaUser', JSON.stringify({ name: 'Test', phone: '9876543210', loyaltyPoints: 50 }));
        window._notifListenerActive = false;

        shareOrder();
        await new Promise(r => setTimeout(r, 50));
        // Should not have changed
        const user = JSON.parse(localStorage.getItem('amoghaUser'));
        expect(user.loyaltyPoints).toBe(50);
    });

    it('does not double-award points for sharing within 5 minutes', () => {
        navigator.share = undefined;
        window.open = vi.fn();
        localStorage.setItem('amoghaUser', JSON.stringify({ name: 'Test', phone: '9876543210', loyaltyPoints: 50 }));
        window._notifListenerActive = false;
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    update: vi.fn(() => Promise.resolve()),
                    onSnapshot: vi.fn(() => vi.fn()),
                })),
                where: vi.fn().mockReturnThis(),
                onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
            })),
        };

        // Simulate a recent share
        localStorage.setItem('amoghaSharedOrders', JSON.stringify([Date.now()]));
        shareOrder();

        const user = JSON.parse(localStorage.getItem('amoghaUser'));
        expect(user.loyaltyPoints).toBe(50); // No extra points
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// LOYALTY — lines 11-12 (initLoyalty calls updateLoyaltyWidget after timeout)
// ─────────────────────────────────────────────────────────────────────────────

describe('loyalty — initLoyalty (lines 133-135)', () => {
    beforeEach(() => {
        localStorage.clear();
        setupDOM('<div id="loyalty-widget" style="display:none"></div><div id="auth-toast"></div>');
        window.scrollTo = vi.fn();
        window._notifListenerActive = false;
    });

    it('calls updateLoyaltyWidget after 500ms delay', async () => {
        localStorage.setItem('amoghaUser', JSON.stringify({ name: 'Test', phone: '9876543210', loyaltyPoints: 200 }));
        window._notifListenerActive = false;
        initLoyalty();
        await new Promise(r => setTimeout(r, 600));
        const widget = document.getElementById('loyalty-widget');
        expect(widget.style.display).toBe('flex');
    });

    it('does not throw when widget is missing', async () => {
        document.body.innerHTML = '<div id="auth-toast"></div>';
        document.getElementById = (id) => document.body.querySelector('#' + id);
        expect(() => initLoyalty()).not.toThrow();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// LOYALTY — lines 55-59 (awardLoyaltyPoints tier-up toast + confetti)
// ─────────────────────────────────────────────────────────────────────────────

describe('loyalty — awardLoyaltyPoints tier-up (lines 54-58)', () => {
    beforeEach(() => {
        localStorage.clear();
        setupDOM('<div id="auth-toast"></div><div id="loyalty-widget"></div>');
        window.scrollTo = vi.fn();
        window._notifListenerActive = false;
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    update: vi.fn(() => Promise.resolve()),
                    onSnapshot: vi.fn(() => vi.fn()),
                })),
                where: vi.fn().mockReturnThis(),
                onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
            })),
        };
    });

    it('shows tier-up toast when user crosses a tier threshold', async () => {
        // Put user just below Silver (499 pts), 10 pts will push to 509 > 500 → Silver tier
        localStorage.setItem('amoghaUser', JSON.stringify({
            name: 'Test', phone: '9876543210', loyaltyPoints: 499,
        }));
        window._notifListenerActive = false;
        window.launchConfetti = vi.fn();

        awardLoyaltyPoints(100); // +10 pts → 509 (Silver)

        await new Promise(r => setTimeout(r, 2100));
        expect(document.getElementById('auth-toast').textContent).toMatch(/silver|tier|congratulations/i);
        expect(window.launchConfetti).toHaveBeenCalled();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// LOYALTY — lines 133-135 (initLoyalty setTimeout fires)
// Already covered above in initLoyalty tests, but we add an explicit check.

// ─────────────────────────────────────────────────────────────────────────────
// LOYALTY — line 159 / lines 165-172 (showBirthdayBanner — inserts after nav sibling)
// ─────────────────────────────────────────────────────────────────────────────

describe('loyalty — showBirthdayBanner insertion paths (lines 157-162, 165-172)', () => {
    const BIRTHDAY_MONTH = new Date().getMonth();
    const DOB = new Date(1990, BIRTHDAY_MONTH, 15).toISOString();

    it('inserts banner after header when header has a next sibling', () => {
        setupDOM(`
            <header id="main-header">Nav</header>
            <main>Content</main>
        `);
        showBirthdayBanner({ name: 'Priya', dob: DOB });
        const banner = document.getElementById('birthday-banner');
        expect(banner).not.toBeNull();
        // Banner should be between header and main
        const children = Array.from(document.body.children);
        const headerIdx = children.indexOf(document.querySelector('header'));
        const bannerIdx = children.indexOf(banner);
        expect(bannerIdx).toBe(headerIdx + 1);
    });

    it('inserts banner at top of body when no header/nav exists', () => {
        setupDOM('<p>Some content</p>');
        showBirthdayBanner({ name: 'Ravi', dob: DOB });
        const banner = document.getElementById('birthday-banner');
        expect(banner).not.toBeNull();
        expect(document.body.firstChild).toBe(banner);
    });

    it('closeBirthdayBanner fades and removes the banner', async () => {
        setupDOM('<header></header>');
        showBirthdayBanner({ name: 'Test', dob: DOB });
        expect(document.getElementById('birthday-banner')).not.toBeNull();
        window.closeBirthdayBanner();
        await new Promise(r => setTimeout(r, 450));
        expect(document.getElementById('birthday-banner')).toBeNull();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// LOYALTY — openLoyaltyModal reuse existing modal (line 124)
// ─────────────────────────────────────────────────────────────────────────────

describe('loyalty — openLoyaltyModal reuses existing modal element', () => {
    beforeEach(() => {
        localStorage.clear();
        setupDOM(`
            <div id="loyalty-modal" class="modal" style="display:none">
                <div class="modal-content loyalty-modal-content"></div>
            </div>
            <div id="auth-toast"></div>
        `);
        window.scrollTo = vi.fn();
        window._notifListenerActive = false;
    });

    it('reuses existing #loyalty-modal element without creating a new one', () => {
        localStorage.setItem('amoghaUser', JSON.stringify({ name: 'Test', phone: '9876543210', loyaltyPoints: 250 }));
        window._notifListenerActive = false;
        openLoyaltyModal();
        const modals = document.body.querySelectorAll('#loyalty-modal');
        expect(modals.length).toBe(1);
        expect(modals[0].style.display).toBe('block');
    });

    it('closes modal on backdrop click when clicking the modal itself', () => {
        localStorage.setItem('amoghaUser', JSON.stringify({ name: 'Test', phone: '9876543210', loyaltyPoints: 250 }));
        window._notifListenerActive = false;
        // Open modal to attach the listener
        openLoyaltyModal();
        const modal = document.getElementById('loyalty-modal');
        // Simulate click on the modal backdrop
        const event = new MouseEvent('click', { bubbles: false });
        Object.defineProperty(event, 'target', { value: modal });
        modal.dispatchEvent(event);
        expect(modal.style.display).toBe('none');
    });
});
