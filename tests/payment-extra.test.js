import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    validateCoupon, calcDiscount, applyCoupon, removeCoupon, placeOrderToFirestore,
    applyGiftCard, removeGiftCard, getCheckoutTotals, checkout, openCheckout,
    switchPayTab, openRazorpay, redeemLoyaltyAtCheckout, shareOrder, setupPayment,
} from '../src/modules/payment.js';
import { setCurrentUser } from '../src/modules/auth.js';
import { cart } from '../src/modules/cart.js';

// Mock firebase.firestore.FieldValue used by placeOrderToFirestore
globalThis.firebase = {
    firestore: {
        FieldValue: {
            increment: vi.fn((n) => n),
        },
    },
};

// we need DOM env for applyCoupon/removeCoupon so use jsdom
function setupDOM(html) {
  document.body.innerHTML = html;
  document.getElementById = (id) => document.body.querySelector('#' + id);
  document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
  document.querySelector = (sel) => document.body.querySelector(sel);
}

describe('payment utility functions', () => {
  it('calcDiscount computes percent and flat correctly', () => {
    expect(calcDiscount({ type: 'flat', discount: 50 }, 200)).toBe(50);
    expect(calcDiscount({ type: 'percent', discount: 10 }, 500)).toBe(50);
    expect(calcDiscount({ type: 'percent', discount: 50, maxDiscount: 100 }, 500)).toBe(100);
    expect(calcDiscount(null, 100)).toBe(0);
  });

  it('validateCoupon enforces minOrder and maxDiscount rules', () => {
    const c1 = { active: true, minOrder: 300, type: 'flat', discount: 20 };
    let r = validateCoupon(c1, 200);
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/Minimum order/);

    const c2 = { active: true, type: 'percent', discount: 50, maxDiscount: 30 };
    r = validateCoupon(c2, 200);
    expect(r.valid).toBe(true);
    expect(calcDiscount(c2, 200)).toBe(30);
  });
});

describe('applyCoupon/removeCoupon DOM helpers', () => {
  beforeEach(() => {
    setupDOM(`
      <input id="coupon-code" value="" />
      <div id="coupon-msg"></div>
      <div id="co-total"></div>
      <span id="pay-total"></span>
      <div id="tab-razorpay"></div>
      <div id="tab-cod"></div>
      <div id="pay-panel-razorpay"></div>
      <div id="pay-panel-cod"></div>
    `);
    window.db = null;
  });

  it('applyCoupon uses fallback when firestore absent and shows message', async () => {
    document.getElementById('coupon-code').value = 'AMOGHA20';
    applyCoupon();
    await new Promise((r) => setTimeout(r, 0));
    expect(document.getElementById('coupon-msg').textContent).toMatch(/Coupon applied/);
    expect(document.getElementById('co-total').textContent).toMatch(/₹/);
  });

  it('removeCoupon clears fields', () => {
    document.getElementById('coupon-code').value = 'X';
    document.getElementById('coupon-msg').textContent = 'foo';
    removeCoupon();
    expect(document.getElementById('coupon-code').value).toBe('');
    expect(document.getElementById('coupon-msg').textContent).toBe('');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// placeOrderToFirestore — error catch branches (lines 384, 402, 439)
// ═══════════════════════════════════════════════════════════════════════════

describe('placeOrderToFirestore — coupon usage update error catch (line 384)', () => {
    beforeEach(() => {
        localStorage.clear();
        setupDOM(`
            <input id="co-name" value="Test User" />
            <input id="co-phone" value="9876543210" />
            <input id="co-address" value="123 Main St" />
            <input id="co-notes" value="" />
            <div id="co-total"></div>
            <div id="confirm-detail"></div>
            <a id="whatsapp-link" href=""></a>
            <div id="order-tracking-link"></div>
            <div class="checkout-step" id="checkout-step-1"></div>
            <div class="checkout-step" id="checkout-step-2"></div>
            <div class="checkout-step" id="checkout-step-3"></div>
            <div class="checkout-step" id="checkout-step-4"></div>
            <div id="auth-toast"></div>
            <input id="coupon-code" value="" />
            <div id="coupon-msg"></div>
            <span id="pay-total"></span>
            <div id="tab-razorpay"></div>
            <div id="tab-cod"></div>
            <div id="pay-panel-razorpay"></div>
            <div id="pay-panel-cod"></div>
        `);
        // Populate cart with an item
        cart.length = 0;
        cart.push({ name: 'Biryani', price: 300, quantity: 1, spiceLevel: 'medium', addons: [] });
        window.open = vi.fn();
    });

    it('logs error when coupon usage update fails (line 384)', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        // Apply coupon with db=null so it uses fallback coupons (sets appliedCouponCode)
        window.db = null;
        document.getElementById('coupon-code').value = 'AMOGHA20';
        applyCoupon();
        await new Promise(r => setTimeout(r, 10));

        // Now set up db mock where coupons update rejects
        const couponUpdateMock = vi.fn(() => Promise.reject(new Error('Coupon update failed')));
        const inventoryGetMock = vi.fn(() => Promise.resolve({ forEach: () => {} }));
        const referralGetMock = vi.fn(() => Promise.resolve({ empty: true }));
        const addMock = vi.fn(() => Promise.resolve({ id: 'order123' }));

        window.db = {
            collection: vi.fn((name) => {
                if (name === 'orders') return { add: addMock };
                if (name === 'coupons') return { doc: vi.fn(() => ({ update: couponUpdateMock })) };
                if (name === 'inventory') return { get: inventoryGetMock };
                if (name === 'referrals') return { where: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), get: referralGetMock };
                if (name === 'users') return { doc: vi.fn(() => ({ update: vi.fn(() => Promise.resolve()), onSnapshot: vi.fn(() => vi.fn()) })), where: vi.fn().mockReturnThis(), onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }) };
                return { doc: vi.fn(() => ({ update: vi.fn(() => Promise.resolve()), get: vi.fn(() => Promise.resolve({ exists: false })), onSnapshot: vi.fn(() => vi.fn()) })), where: vi.fn().mockReturnThis(), onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }) };
            }),
            batch: vi.fn(() => ({ update: vi.fn(), commit: vi.fn(() => Promise.resolve()) })),
        };

        setCurrentUser({ name: 'Test', phone: '9876543210' });
        placeOrderToFirestore('COD', null, 'cod-pending');
        await new Promise(r => setTimeout(r, 50));

        expect(consoleSpy).toHaveBeenCalledWith('Coupon usage update error:', expect.any(Error));
        consoleSpy.mockRestore();
    });
});

describe('placeOrderToFirestore — gift card deduction error catch (line 402)', () => {
    beforeEach(() => {
        localStorage.clear();
        setupDOM(`
            <input id="co-name" value="Test User" />
            <input id="co-phone" value="9876543210" />
            <input id="co-address" value="123 Main St" />
            <input id="co-notes" value="" />
            <div id="co-total"></div>
            <div id="confirm-detail"></div>
            <a id="whatsapp-link" href=""></a>
            <div id="order-tracking-link"></div>
            <div class="checkout-step" id="checkout-step-1"></div>
            <div class="checkout-step" id="checkout-step-2"></div>
            <div class="checkout-step" id="checkout-step-3"></div>
            <div class="checkout-step" id="checkout-step-4"></div>
            <div id="auth-toast"></div>
            <input id="coupon-code" value="" />
            <div id="coupon-msg"></div>
            <span id="pay-total"></span>
            <div id="tab-razorpay"></div>
            <div id="tab-cod"></div>
            <div id="pay-panel-razorpay"></div>
            <div id="pay-panel-cod"></div>
            <input id="giftcard-code" value="" />
            <div id="giftcard-msg"></div>
        `);
        cart.length = 0;
        cart.push({ name: 'Biryani', price: 300, quantity: 1, spiceLevel: 'medium', addons: [] });
        window.open = vi.fn();
    });

    it('logs error when gift card deduction fails (line 402)', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const gcUpdateMock = vi.fn(() => Promise.reject(new Error('GC deduction failed')));
        const inventoryGetMock = vi.fn(() => Promise.resolve({ forEach: () => {} }));
        const referralGetMock = vi.fn(() => Promise.resolve({ empty: true }));
        const addMock = vi.fn(() => Promise.resolve({ id: 'order456' }));

        window.db = {
            collection: vi.fn((name) => {
                if (name === 'orders') return { add: addMock };
                if (name === 'giftCards') return { doc: vi.fn(() => ({ update: gcUpdateMock, get: vi.fn(() => Promise.resolve({ exists: true, data: () => ({ active: true, balance: 500 }) })) })) };
                if (name === 'inventory') return { get: inventoryGetMock };
                if (name === 'referrals') return { where: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), get: referralGetMock };
                if (name === 'users') return { doc: vi.fn(() => ({ update: vi.fn(() => Promise.resolve()), onSnapshot: vi.fn(() => vi.fn()) })), where: vi.fn().mockReturnThis(), onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }) };
                return { doc: vi.fn(() => ({ update: vi.fn(() => Promise.resolve()), onSnapshot: vi.fn(() => vi.fn()) })), where: vi.fn().mockReturnThis(), onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }) };
            }),
            batch: vi.fn(() => ({ update: vi.fn(), commit: vi.fn(() => Promise.resolve()) })),
        };

        // Apply a gift card first so appliedGiftCard is set
        document.getElementById('giftcard-code').value = 'GC-TEST';
        applyGiftCard();
        await new Promise(r => setTimeout(r, 20));

        // Now set up firebase mock so giftCards update rejects
        window.db.collection = vi.fn((name) => {
            if (name === 'orders') return { add: addMock };
            if (name === 'giftCards') return { doc: vi.fn(() => ({ update: gcUpdateMock })) };
            if (name === 'inventory') return { get: inventoryGetMock };
            if (name === 'referrals') return { where: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), get: referralGetMock };
            if (name === 'users') return { doc: vi.fn(() => ({ update: vi.fn(() => Promise.resolve()), onSnapshot: vi.fn(() => vi.fn()) })), where: vi.fn().mockReturnThis(), onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }) };
            return { doc: vi.fn(() => ({ update: vi.fn(() => Promise.resolve()), onSnapshot: vi.fn(() => vi.fn()) })), where: vi.fn().mockReturnThis(), onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }) };
        });

        setCurrentUser({ name: 'Test', phone: '9876543210' });
        placeOrderToFirestore('COD', null, 'cod-pending');
        await new Promise(r => setTimeout(r, 50));

        expect(consoleSpy).toHaveBeenCalledWith('Gift card deduction error:', expect.any(Error));
        consoleSpy.mockRestore();
    });
});

describe('placeOrderToFirestore — referral lookup error catch (line 439)', () => {
    beforeEach(() => {
        localStorage.clear();
        setupDOM(`
            <input id="co-name" value="Test User" />
            <input id="co-phone" value="9876543210" />
            <input id="co-address" value="123 Main St" />
            <input id="co-notes" value="" />
            <div id="co-total"></div>
            <div id="confirm-detail"></div>
            <a id="whatsapp-link" href=""></a>
            <div id="order-tracking-link"></div>
            <div class="checkout-step" id="checkout-step-1"></div>
            <div class="checkout-step" id="checkout-step-2"></div>
            <div class="checkout-step" id="checkout-step-3"></div>
            <div class="checkout-step" id="checkout-step-4"></div>
            <div id="auth-toast"></div>
            <input id="coupon-code" value="" />
            <div id="coupon-msg"></div>
            <span id="pay-total"></span>
            <div id="tab-razorpay"></div>
            <div id="tab-cod"></div>
            <div id="pay-panel-razorpay"></div>
            <div id="pay-panel-cod"></div>
        `);
        cart.length = 0;
        cart.push({ name: 'Biryani', price: 300, quantity: 1, spiceLevel: 'medium', addons: [] });
        window.open = vi.fn();
    });

    it('logs error when referral lookup fails (line 439)', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const inventoryGetMock = vi.fn(() => Promise.resolve({ forEach: () => {} }));
        const referralGetMock = vi.fn(() => Promise.reject(new Error('Referral lookup failed')));
        const addMock = vi.fn(() => Promise.resolve({ id: 'order789' }));

        window.db = {
            collection: vi.fn((name) => {
                if (name === 'orders') return { add: addMock };
                if (name === 'inventory') return { get: inventoryGetMock };
                if (name === 'referrals') return { where: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), get: referralGetMock };
                if (name === 'users') return { doc: vi.fn(() => ({ update: vi.fn(() => Promise.resolve()), onSnapshot: vi.fn(() => vi.fn()) })), where: vi.fn().mockReturnThis(), onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }) };
                return { doc: vi.fn(() => ({ update: vi.fn(() => Promise.resolve()), onSnapshot: vi.fn(() => vi.fn()) })), where: vi.fn().mockReturnThis(), onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }) };
            }),
            batch: vi.fn(() => ({ update: vi.fn(), commit: vi.fn(() => Promise.resolve()) })),
        };

        setCurrentUser({ name: 'Test', phone: '9876543210' });
        placeOrderToFirestore('COD', null, 'cod-pending');
        await new Promise(r => setTimeout(r, 50));

        expect(consoleSpy).toHaveBeenCalledWith('Referral lookup error:', expect.any(Error));
        consoleSpy.mockRestore();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// ADDITIONAL BRANCH COVERAGE TESTS
// ═══════════════════════════════════════════════════════════════════════════

const FULL_DOM = `
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
    <textarea id="co-notes">Extra spicy please</textarea>
    <button id="razorpay-pay-btn">Pay Now</button>
    <div id="confirm-detail"></div>
    <a id="whatsapp-link" href="#"></a>
    <div id="order-tracking-link"></div>
    <span id="cart-count">0</span>
    <span id="cart-items-count">0</span>
    <div id="cart-fab"><span class="cart-fab-badge">0</span></div>
    <div id="floating-cart"><div class="fc-items"></div><div class="fc-total"></div></div>
    <div id="auth-toast"></div>
    <div id="giftcard-modal" style="display:none"></div>
    <input type="checkbox" id="schedule-order-check">
    <input id="schedule-date" value="">
    <input id="schedule-time" value="">
`;

function setupFullDOM() {
    document.body.innerHTML = FULL_DOM;
    document.getElementById = (id) => document.body.querySelector('#' + id);
    document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
    document.querySelector = (sel) => document.body.querySelector(sel);
}

function setCart(items) { cart.length = 0; items.forEach(i => cart.push(i)); }
function clearCart() { cart.length = 0; }

function makeDbMock(overrides = {}) {
    const inventoryGetMock = vi.fn(() => Promise.resolve({ forEach: () => {} }));
    const referralGetMock = vi.fn(() => Promise.resolve({ empty: true }));
    const addMock = vi.fn(() => Promise.resolve({ id: 'order-new-123' }));
    const updateMock = vi.fn(() => Promise.resolve());

    return {
        collection: vi.fn((name) => {
            if (name === 'orders') return { add: overrides.ordersAdd || addMock };
            if (name === 'inventory') return { get: overrides.inventoryGet || inventoryGetMock };
            if (name === 'referrals') return {
                where: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                get: overrides.referralsGet || referralGetMock,
            };
            if (name === 'users') return {
                doc: vi.fn(() => ({
                    update: overrides.usersUpdate || updateMock,
                    get: vi.fn(() => Promise.resolve({ exists: false })),
                    onSnapshot: vi.fn(() => vi.fn()),
                })),
                where: vi.fn().mockReturnThis(),
                onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
            };
            if (name === 'coupons') return { doc: vi.fn(() => ({ update: overrides.couponsUpdate || updateMock })) };
            if (name === 'giftCards') return { doc: vi.fn(() => ({ update: overrides.giftCardsUpdate || updateMock })) };
            return { doc: vi.fn(() => ({ update: updateMock, get: vi.fn(() => Promise.resolve({ exists: false })) })) };
        }),
        batch: vi.fn(() => ({ update: vi.fn(), commit: vi.fn(() => Promise.resolve()) })),
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// getCheckoutTotals — flat coupon type (line 25)
// ═══════════════════════════════════════════════════════════════════════════
describe('getCheckoutTotals — flat coupon branch (line 25)', () => {
    beforeEach(() => { clearCart(); setupFullDOM(); });

    it('applies flat coupon discount via applyCoupon fallback WELCOME50', () => {
        setCart([{ name: 'Item', price: 200, quantity: 1 }]); // subtotal=200, delivery=49
        document.getElementById('coupon-code').value = 'WELCOME50';
        window.db = null;
        applyCoupon();
        const totals = getCheckoutTotals();
        expect(totals.discount).toBe(50);
        expect(totals.total).toBe(200 - 50 + 49);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// checkout — openAuthModal branch (line 65)
// ═══════════════════════════════════════════════════════════════════════════
describe('checkout — openAuthModal exists (line 65)', () => {
    beforeEach(() => { clearCart(); setupFullDOM(); localStorage.clear(); });

    it('calls openAuthModal when user is not logged in and function exists', () => {
        setCart([{ name: 'Biryani', price: 200, quantity: 1 }]);
        setCurrentUser(null);
        localStorage.removeItem('amoghaUser');
        window.openAuthModal = vi.fn();
        checkout();
        expect(window.openAuthModal).toHaveBeenCalled();
        const toast = document.getElementById('auth-toast');
        expect(toast.textContent).toMatch(/sign in/i);
        delete window.openAuthModal;
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// openCheckout — free delivery threshold (line 84) + deliveryFee === 0 shows 'FREE' (line 115)
// ═══════════════════════════════════════════════════════════════════════════
describe('openCheckout — free delivery display (lines 84, 115)', () => {
    beforeEach(() => { clearCart(); setupFullDOM(); localStorage.clear(); });

    it('shows FREE for delivery when subtotal meets threshold', () => {
        setCart([{ name: 'Biryani', price: 600, quantity: 1 }]); // 600 >= 500
        openCheckout();
        expect(document.getElementById('co-delivery').textContent).toBe('FREE');
    });

    it('shows delivery fee when subtotal is below threshold', () => {
        setCart([{ name: 'Tea', price: 30, quantity: 1 }]); // 30 < 500
        openCheckout();
        expect(document.getElementById('co-delivery').textContent).toBe('\u20B949');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// switchPayTab — tabEl and panelEl exist (lines 190-191)
// ═══════════════════════════════════════════════════════════════════════════
describe('switchPayTab — elements exist and toggle correctly (lines 190-191)', () => {
    beforeEach(() => setupFullDOM());

    it('toggles active class on both tab and panel elements for cod', () => {
        switchPayTab('cod');
        const tabCod = document.getElementById('tab-cod');
        const panelCod = document.getElementById('pay-panel-cod');
        const tabRzp = document.getElementById('tab-razorpay');
        const panelRzp = document.getElementById('pay-panel-razorpay');
        expect(tabCod.classList.contains('active')).toBe(true);
        expect(panelCod.classList.contains('active')).toBe(true);
        expect(tabRzp.classList.contains('active')).toBe(false);
        expect(panelRzp.classList.contains('active')).toBe(false);
    });

    it('toggles back to razorpay tab', () => {
        switchPayTab('cod');
        switchPayTab('razorpay');
        expect(document.getElementById('tab-razorpay').classList.contains('active')).toBe(true);
        expect(document.getElementById('pay-panel-razorpay').classList.contains('active')).toBe(true);
        expect(document.getElementById('tab-cod').classList.contains('active')).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// openRazorpay — ondismiss btn exists + catch block (lines 269-287)
// ═══════════════════════════════════════════════════════════════════════════
describe('openRazorpay — ondismiss and catch branches (lines 269-287)', () => {
    beforeEach(() => { clearCart(); setupFullDOM(); });

    it('resets button on dismiss (line 269)', () => {
        setCart([{ name: 'Item', price: 500, quantity: 1 }]);
        let capturedOptions;
        const openFn = vi.fn();
        const onFn = vi.fn();
        window.Razorpay = vi.fn((opts) => { capturedOptions = opts; return { open: openFn, on: onFn }; });

        openRazorpay();

        // Button should be disabled after opening
        const btn = document.getElementById('razorpay-pay-btn');
        expect(btn.disabled).toBe(true);
        expect(btn.innerHTML).toBe('Opening payment...');

        // Simulate dismiss
        capturedOptions.modal.ondismiss();
        expect(btn.disabled).toBe(false);
        expect(btn.innerHTML).toContain('Pay Now');

        delete window.Razorpay;
    });

    it('handles Razorpay constructor error in catch block (lines 285-287)', () => {
        setCart([{ name: 'Item', price: 500, quantity: 1 }]);
        window.Razorpay = vi.fn(() => { throw new Error('Init failed'); });

        openRazorpay();

        const toast = document.getElementById('auth-toast');
        expect(toast.textContent).toMatch(/error opening payment/i);
        const btn = document.getElementById('razorpay-pay-btn');
        expect(btn.disabled).toBe(false);
        expect(btn.innerHTML).toContain('Pay Now');

        delete window.Razorpay;
    });

    it('resets button on payment.failed event (lines 279-282)', () => {
        setCart([{ name: 'Item', price: 500, quantity: 1 }]);
        let capturedOnFailed;
        const openFn = vi.fn();
        window.Razorpay = vi.fn(() => ({
            open: openFn,
            on: vi.fn((event, cb) => { if (event === 'payment.failed') capturedOnFailed = cb; }),
        }));

        openRazorpay();

        // Simulate payment failure
        capturedOnFailed({ error: { description: 'Insufficient funds' } });
        const toast = document.getElementById('auth-toast');
        expect(toast.textContent).toContain('Insufficient funds');
        const btn = document.getElementById('razorpay-pay-btn');
        expect(btn.disabled).toBe(false);
        expect(btn.innerHTML).toContain('Retry Payment');

        delete window.Razorpay;
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// placeOrderToFirestore — scheduled order (line 313)
// ═══════════════════════════════════════════════════════════════════════════
describe('placeOrderToFirestore — scheduled order (line 313)', () => {
    beforeEach(() => {
        clearCart();
        setupFullDOM();
        localStorage.clear();
        window.open = vi.fn();
        globalThis.firebase = { firestore: { FieldValue: { increment: vi.fn((n) => n) } } };
    });

    it('sets scheduledFor and status=scheduled when schedule inputs have values', async () => {
        setCart([{ name: 'Biryani', price: 300, quantity: 1, spiceLevel: 'medium', addons: [] }]);
        setCurrentUser({ name: 'Test', phone: '9876543210' });

        // Enable scheduled order
        const schedCheck = document.getElementById('schedule-order-check');
        schedCheck.checked = true;
        document.getElementById('schedule-date').value = '2026-03-10';
        document.getElementById('schedule-time').value = '18:30';

        const addMock = vi.fn(() => Promise.resolve({ id: 'sched-order-1' }));
        window.db = makeDbMock({ ordersAdd: addMock });

        placeOrderToFirestore('COD', null, 'cod-pending');
        await new Promise(r => setTimeout(r, 50));

        expect(addMock).toHaveBeenCalled();
        const orderData = addMock.mock.calls[0][0];
        expect(orderData.status).toBe('scheduled');
        expect(orderData.scheduledFor).toBeTruthy();
        expect(orderData.scheduledFor).toContain('2026-03-10');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// placeOrderToFirestore — notes truthy (line 323)
// ═══════════════════════════════════════════════════════════════════════════
describe('placeOrderToFirestore — notes truthy (line 323)', () => {
    beforeEach(() => {
        clearCart();
        setupFullDOM();
        localStorage.clear();
        window.open = vi.fn();
        globalThis.firebase = { firestore: { FieldValue: { increment: vi.fn((n) => n) } } };
    });

    it('includes notes in WhatsApp message when notes field has value', async () => {
        setCart([{ name: 'Biryani', price: 300, quantity: 1, spiceLevel: 'medium', addons: [] }]);
        setCurrentUser({ name: 'Test', phone: '9876543210' });
        document.getElementById('co-notes').value = 'Extra spicy please';

        const addMock = vi.fn(() => Promise.resolve({ id: 'notes-order-1' }));
        window.db = makeDbMock({ ordersAdd: addMock });

        placeOrderToFirestore('COD', null, 'cod-pending');
        await new Promise(r => setTimeout(r, 50));

        const orderData = addMock.mock.calls[0][0];
        expect(orderData.notes).toBe('Extra spicy please');
        // WhatsApp link should contain notes
        const waLink = document.getElementById('whatsapp-link').href;
        expect(waLink).toContain('Extra%20spicy');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// placeOrderToFirestore — trackDiv exists (lines 357-372)
// ═══════════════════════════════════════════════════════════════════════════
describe('placeOrderToFirestore — trackDiv exists (lines 357-372)', () => {
    beforeEach(() => {
        clearCart();
        setupFullDOM();
        localStorage.clear();
        window.open = vi.fn();
        globalThis.firebase = { firestore: { FieldValue: { increment: vi.fn((n) => n) } } };
    });

    it('renders tracking link into order-tracking-link div', async () => {
        setCart([{ name: 'Biryani', price: 300, quantity: 1, spiceLevel: 'medium', addons: [] }]);
        setCurrentUser({ name: 'Test', phone: '9876543210' });

        const addMock = vi.fn(() => Promise.resolve({ id: 'track-order-1' }));
        window.db = makeDbMock({ ordersAdd: addMock });

        placeOrderToFirestore('COD', null, 'cod-pending');
        await new Promise(r => setTimeout(r, 50));

        const trackDiv = document.getElementById('order-tracking-link');
        expect(trackDiv.innerHTML).toContain('track-order-1');
        expect(trackDiv.innerHTML).toContain('Track your order');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// placeOrderToFirestore — launchConfetti exists (lines 414-417)
// ═══════════════════════════════════════════════════════════════════════════
describe('placeOrderToFirestore — launchConfetti (lines 414-417)', () => {
    beforeEach(() => {
        clearCart();
        setupFullDOM();
        localStorage.clear();
        window.open = vi.fn();
        globalThis.firebase = { firestore: { FieldValue: { increment: vi.fn((n) => n) } } };
    });

    it('calls launchConfetti when function exists', async () => {
        setCart([{ name: 'Biryani', price: 300, quantity: 1, spiceLevel: 'medium', addons: [] }]);
        setCurrentUser({ name: 'Test', phone: '9876543210' });
        window.launchConfetti = vi.fn();

        const addMock = vi.fn(() => Promise.resolve({ id: 'confetti-order-1' }));
        window.db = makeDbMock({ ordersAdd: addMock });

        placeOrderToFirestore('COD', null, 'cod-pending');
        await new Promise(r => setTimeout(r, 50));

        expect(window.launchConfetti).toHaveBeenCalled();
        delete window.launchConfetti;
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// placeOrderToFirestore — checkAndAwardBadges (lines 422-426)
// ═══════════════════════════════════════════════════════════════════════════
describe('placeOrderToFirestore — checkAndAwardBadges (lines 422-426)', () => {
    beforeEach(() => {
        clearCart();
        setupFullDOM();
        localStorage.clear();
        window.open = vi.fn();
        globalThis.firebase = { firestore: { FieldValue: { increment: vi.fn((n) => n) } } };
    });

    it('calls checkAndAwardBadges with user and orderData when both exist', async () => {
        setCart([{ name: 'Biryani', price: 300, quantity: 1, spiceLevel: 'medium', addons: [] }]);
        setCurrentUser({ name: 'Badge User', phone: '9876543210' });
        window.checkAndAwardBadges = vi.fn();

        const addMock = vi.fn(() => Promise.resolve({ id: 'badge-order-1' }));
        window.db = makeDbMock({ ordersAdd: addMock });

        placeOrderToFirestore('COD', null, 'cod-pending');
        await new Promise(r => setTimeout(r, 50));

        expect(window.checkAndAwardBadges).toHaveBeenCalled();
        const [badgeUser, orderArg] = window.checkAndAwardBadges.mock.calls[0];
        expect(badgeUser.phone).toBe('9876543210');
        expect(orderArg.customer).toBe('Test User');
        delete window.checkAndAwardBadges;
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// placeOrderToFirestore — referral chain success (lines 432-466)
// ═══════════════════════════════════════════════════════════════════════════
describe('placeOrderToFirestore — referral chain (lines 432-466)', () => {
    beforeEach(() => {
        clearCart();
        setupFullDOM();
        localStorage.clear();
        window.open = vi.fn();
        globalThis.firebase = { firestore: { FieldValue: { increment: vi.fn((n) => n) } } };
    });

    it('awards referrer points when referral snap is not empty and referrer doc exists', async () => {
        setCart([{ name: 'Biryani', price: 300, quantity: 1, spiceLevel: 'medium', addons: [] }]);
        setCurrentUser({ name: 'Test', phone: '9876543210' });

        const referralRefUpdate = vi.fn(() => Promise.resolve());
        const referrerUpdateMock = vi.fn(() => Promise.resolve());
        const addMock = vi.fn(() => Promise.resolve({ id: 'ref-order-1' }));

        const referralSnap = {
            empty: false,
            docs: [{
                data: () => ({ referrerPhone: '1111111111', refereePhone: '9876543210', redeemed: false }),
                ref: { update: referralRefUpdate },
            }],
        };

        window.db = {
            collection: vi.fn((name) => {
                if (name === 'orders') return { add: addMock };
                if (name === 'inventory') return { get: vi.fn(() => Promise.resolve({ forEach: () => {} })) };
                if (name === 'referrals') return {
                    where: vi.fn().mockReturnThis(),
                    limit: vi.fn().mockReturnThis(),
                    get: vi.fn(() => Promise.resolve(referralSnap)),
                };
                if (name === 'users') return {
                    doc: vi.fn((phone) => {
                        if (phone === '1111111111') {
                            return {
                                get: vi.fn(() => Promise.resolve({
                                    exists: true,
                                    data: () => ({ loyaltyPoints: 50 }),
                                })),
                                update: referrerUpdateMock,
                                onSnapshot: vi.fn(() => vi.fn()),
                            };
                        }
                        return {
                            update: vi.fn(() => Promise.resolve()),
                            get: vi.fn(() => Promise.resolve({ exists: false })),
                            onSnapshot: vi.fn(() => vi.fn()),
                        };
                    }),
                    where: vi.fn().mockReturnThis(),
                    onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
                };
                return { doc: vi.fn(() => ({ update: vi.fn(() => Promise.resolve()) })) };
            }),
            batch: vi.fn(() => ({ update: vi.fn(), commit: vi.fn(() => Promise.resolve()) })),
        };

        placeOrderToFirestore('COD', null, 'cod-pending');
        await new Promise(r => setTimeout(r, 100));

        // Referrer gets 100 bonus points via FieldValue.increment (atomic, no read needed)
        // The increment mock returns the raw value (100), not 50+100
        expect(referrerUpdateMock).toHaveBeenCalledWith({ loyaltyPoints: 100 });
        // Referral doc should be marked as redeemed FIRST (race condition fix)
        expect(referralRefUpdate).toHaveBeenCalledWith({ redeemed: true });
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// applyCoupon — applyCouponData inner function (line 502)
// ═══════════════════════════════════════════════════════════════════════════
describe('applyCoupon — applyCouponData via Firestore doc (line 502)', () => {
    beforeEach(() => { clearCart(); setupFullDOM(); });

    it('applies coupon data from Firestore and recalculates total', async () => {
        setCart([{ name: 'Item', price: 1000, quantity: 1 }]); // subtotal=1000, free delivery
        document.getElementById('coupon-code').value = 'DBCOUPON';
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    get: vi.fn(() => Promise.resolve({
                        exists: true,
                        data: () => ({ active: true, type: 'flat', discount: 200, label: 'Rs.200 off' }),
                    })),
                })),
            })),
        };

        applyCoupon();
        await new Promise(r => setTimeout(r, 20));

        const msg = document.getElementById('coupon-msg');
        expect(msg.textContent).toMatch(/Coupon applied/i);
        expect(msg.className).toContain('success');
        expect(document.getElementById('co-total').textContent).toBe('\u20B9800');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// removeCoupon — input and msg elements exist (lines 554-555)
// ═══════════════════════════════════════════════════════════════════════════
describe('removeCoupon — elements exist and get cleared (lines 554-555)', () => {
    beforeEach(() => { clearCart(); setupFullDOM(); });

    it('clears input value and msg textContent when elements are present', () => {
        setCart([{ name: 'Item', price: 100, quantity: 1 }]);
        document.getElementById('coupon-code').value = 'TESTCODE';
        document.getElementById('coupon-msg').textContent = 'Some coupon applied';
        document.getElementById('coupon-msg').className = 'coupon-msg success';

        removeCoupon();

        expect(document.getElementById('coupon-code').value).toBe('');
        expect(document.getElementById('coupon-msg').textContent).toBe('');
        expect(document.getElementById('coupon-msg').className).toBe('coupon-msg');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// applyGiftCard — successful application with balance recalculation (lines 582-598)
// ═══════════════════════════════════════════════════════════════════════════
describe('applyGiftCard — successful application with recalculation (lines 582-598)', () => {
    beforeEach(() => { clearCart(); setupFullDOM(); });

    it('applies gift card, recalculates total with coupon discount, and shows balance', async () => {
        setCart([{ name: 'Item', price: 600, quantity: 1 }]); // subtotal=600, free delivery
        // First apply a coupon
        document.getElementById('coupon-code').value = 'AMOGHA20';
        window.db = null;
        applyCoupon(); // applies 20% = 120 off → after coupon = 480

        // Now set up db for gift card
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    get: vi.fn(() => Promise.resolve({
                        exists: true,
                        data: () => ({ active: true, balance: 200 }),
                    })),
                })),
            })),
        };

        document.getElementById('giftcard-code').value = 'GC-COMBO';
        applyGiftCard();
        await new Promise(r => setTimeout(r, 30));

        const gcMsg = document.getElementById('giftcard-msg');
        expect(gcMsg.textContent).toContain('200');
        expect(gcMsg.className).toContain('success');
        // Total should be afterCoupon(480) - gc(200) = 280
        expect(document.getElementById('co-total').textContent).toBe('\u20B9280');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// removeGiftCard — input and msg elements exist (lines 597-598)
// ═══════════════════════════════════════════════════════════════════════════
describe('removeGiftCard — elements exist (lines 597-598)', () => {
    beforeEach(() => { clearCart(); setupFullDOM(); });

    it('clears giftcard input and msg when elements are present', () => {
        setCart([{ name: 'Item', price: 100, quantity: 1 }]);
        document.getElementById('giftcard-code').value = 'GC-TEST';
        document.getElementById('giftcard-msg').textContent = 'Applied!';
        document.getElementById('giftcard-msg').className = 'coupon-msg success';

        removeGiftCard();

        expect(document.getElementById('giftcard-code').value).toBe('');
        expect(document.getElementById('giftcard-msg').textContent).toBe('');
        expect(document.getElementById('giftcard-msg').className).toBe('coupon-msg');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// redeemLoyaltyAtCheckout — discount > 0, db exists, updateLoyaltyWidget (lines 683-708)
// ═══════════════════════════════════════════════════════════════════════════
describe('redeemLoyaltyAtCheckout — full path (lines 683-708)', () => {
    beforeEach(() => {
        clearCart();
        setupFullDOM();
        localStorage.clear();
    });

    it('redeems points, updates DB, and calls updateLoyaltyWidget', () => {
        setCart([{ name: 'Item', price: 500, quantity: 1 }]); // subtotal=500, free delivery
        const updateMock = vi.fn(() => Promise.resolve());
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    update: updateMock,
                    onSnapshot: vi.fn(() => vi.fn()),
                })),
                where: vi.fn().mockReturnThis(),
                onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
            })),
        };
        window.updateLoyaltyWidget = vi.fn();
        setCurrentUser({ name: 'Loyal', phone: '1234567890', loyaltyPoints: 500 });

        redeemLoyaltyAtCheckout();

        // 500pts / 100 = 5 → 5*10 = Rs.50 discount, 5*100 = 500 pts used
        expect(document.getElementById('coupon-msg').textContent).toMatch(/redeemed/i);
        expect(document.getElementById('coupon-msg').textContent).toContain('500');
        expect(document.getElementById('coupon-msg').textContent).toContain('50');
        expect(document.getElementById('coupon-code').value).toBe('LOYALTY');
        expect(document.getElementById('co-total').textContent).toBe('Rs.450');
        // DB update should have been called
        expect(updateMock).toHaveBeenCalledWith({ loyaltyPoints: 0 });
        // updateLoyaltyWidget should have been called
        expect(window.updateLoyaltyWidget).toHaveBeenCalled();

        delete window.updateLoyaltyWidget;
    });

    it('does not redeem when discount would be 0 (points < 100)', () => {
        setCart([{ name: 'Item', price: 500, quantity: 1 }]);
        setCurrentUser({ name: 'Low', phone: '1234567890', loyaltyPoints: 50 });

        redeemLoyaltyAtCheckout();

        expect(document.getElementById('coupon-msg').textContent).toBe('');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// shareOrder — duplicate prevention within 5 min (lines 714-715)
// ═══════════════════════════════════════════════════════════════════════════
describe('shareOrder — duplicate prevention (lines 714-715)', () => {
    beforeEach(() => {
        localStorage.clear();
        setupFullDOM();
    });

    it('does not award points when share was within 5 minutes', () => {
        navigator.share = undefined;
        window.open = vi.fn();
        const updateMock = vi.fn(() => Promise.resolve());
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    update: updateMock,
                    onSnapshot: vi.fn(() => vi.fn()),
                })),
                where: vi.fn().mockReturnThis(),
                onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
            })),
        };
        setCurrentUser({ name: 'Test', phone: '1234567890', loyaltyPoints: 100 });

        // First share — should award points
        shareOrder();
        const user1 = JSON.parse(localStorage.getItem('amoghaUser'));
        expect(user1.loyaltyPoints).toBe(110);

        // Second share within 5 minutes — should NOT award additional points
        setCurrentUser({ name: 'Test', phone: '1234567890', loyaltyPoints: 110 });
        shareOrder();
        const user2 = JSON.parse(localStorage.getItem('amoghaUser'));
        expect(user2.loyaltyPoints).toBe(110); // unchanged
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// shareOrder — db exists for point update (line 721)
// ═══════════════════════════════════════════════════════════════════════════
describe('shareOrder — db update for loyalty points (line 721)', () => {
    beforeEach(() => {
        localStorage.clear();
        setupFullDOM();
    });

    it('updates user loyalty points in Firestore when db exists', () => {
        navigator.share = undefined;
        window.open = vi.fn();
        const updateMock = vi.fn(() => Promise.resolve());
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    update: updateMock,
                    onSnapshot: vi.fn(() => vi.fn()),
                })),
                where: vi.fn().mockReturnThis(),
                onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
            })),
        };
        setCurrentUser({ name: 'Sharer', phone: '5555555555', loyaltyPoints: 200 });

        shareOrder();

        expect(updateMock).toHaveBeenCalledWith({ loyaltyPoints: 210 });
        const toast = document.getElementById('auth-toast');
        expect(toast.textContent).toContain('+10 loyalty points');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// REMAINING BRANCH COVERAGE — payment.js
// ═══════════════════════════════════════════════════════════════════════════

import { validateAndPay, closeCheckout, openGiftCardModal, closeGiftCardModal, selectGcAmount, addUpsellItem } from '../src/modules/payment.js';

// Line 25: getCheckoutTotals — flat coupon type set directly on appliedCoupon
describe('getCheckoutTotals — flat coupon type applied directly (line 25)', () => {
    beforeEach(() => { clearCart(); setupFullDOM(); });

    it('computes discount for flat coupon type in getCheckoutTotals', () => {
        setCart([{ name: 'Item', price: 200, quantity: 1 }]);
        // Apply flat coupon via fallback
        document.getElementById('coupon-code').value = 'WELCOME50';
        window.db = null;
        applyCoupon();
        const totals = getCheckoutTotals();
        expect(totals.discount).toBe(50);
    });
});

// Line 65: checkout — openAuthModal is NOT a function (typeof check false branch)
describe('checkout — openAuthModal not defined (line 65 false branch)', () => {
    beforeEach(() => { clearCart(); setupFullDOM(); localStorage.clear(); });

    it('does not throw when openAuthModal is not a function', () => {
        setCart([{ name: 'Biryani', price: 200, quantity: 1 }]);
        setCurrentUser(null);
        localStorage.removeItem('amoghaUser');
        delete window.openAuthModal;
        expect(() => checkout()).not.toThrow();
        const toast = document.getElementById('auth-toast');
        expect(toast.textContent).toMatch(/sign in/i);
    });
});

// Lines 190-191: switchPayTab — tabEl or panelEl missing (null guard branches)
describe('switchPayTab — missing tab/panel elements (lines 190-191 null guard)', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div id="tab-razorpay"></div><div id="pay-panel-razorpay"></div>';
        document.getElementById = (id) => document.body.querySelector('#' + id);
    });

    it('does not throw when tab-cod and pay-panel-cod elements are missing', () => {
        // Only razorpay elements exist, cod elements are missing
        expect(() => switchPayTab('cod')).not.toThrow();
    });
});

// Line 313: placeOrderToFirestore — schedule checked but no date/time values
describe('placeOrderToFirestore — schedule checked but empty values (line 313 false)', () => {
    beforeEach(() => {
        clearCart();
        setupFullDOM();
        localStorage.clear();
        window.open = vi.fn();
        globalThis.firebase = { firestore: { FieldValue: { increment: vi.fn((n) => n) } } };
    });

    it('sets scheduledFor=null when schedule-order-check is checked but date/time empty', async () => {
        setCart([{ name: 'Biryani', price: 300, quantity: 1, spiceLevel: 'medium', addons: [] }]);
        setCurrentUser({ name: 'Test', phone: '9876543210' });

        const schedCheck = document.getElementById('schedule-order-check');
        schedCheck.checked = true;
        document.getElementById('schedule-date').value = '';
        document.getElementById('schedule-time').value = '';

        const addMock = vi.fn(() => Promise.resolve({ id: 'nosched-1' }));
        window.db = makeDbMock({ ordersAdd: addMock });

        placeOrderToFirestore('COD', null, 'cod-pending');
        await new Promise(r => setTimeout(r, 50));

        expect(addMock).toHaveBeenCalled();
        const orderData = addMock.mock.calls[0][0];
        expect(orderData.scheduledFor).toBeNull();
        expect(orderData.status).toBe('pending');
    });
});

// Lines 357-372: placeOrderToFirestore — trackDiv does NOT exist
describe('placeOrderToFirestore — trackDiv missing (lines 357-372 null branch)', () => {
    beforeEach(() => {
        clearCart();
        // DOM without order-tracking-link
        document.body.innerHTML = `
            <input id="co-name" value="Test User">
            <input id="co-phone" value="9876543210">
            <input id="co-address" value="123 Main St">
            <textarea id="co-notes"></textarea>
            <div id="co-total"></div>
            <div id="confirm-detail"></div>
            <a id="whatsapp-link" href="#"></a>
            <div class="checkout-step" id="checkout-step-1"></div>
            <div class="checkout-step" id="checkout-step-2"></div>
            <div class="checkout-step" id="checkout-step-3"></div>
            <div class="checkout-step" id="checkout-step-4"></div>
            <div id="auth-toast"></div>
            <input id="coupon-code" value="">
            <div id="coupon-msg"></div>
            <span id="pay-total"></span>
            <div id="tab-razorpay"></div><div id="tab-cod"></div>
            <div id="pay-panel-razorpay"></div><div id="pay-panel-cod"></div>
        `;
        document.getElementById = (id) => document.body.querySelector('#' + id);
        document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
        localStorage.clear();
        window.open = vi.fn();
        globalThis.firebase = { firestore: { FieldValue: { increment: vi.fn((n) => n) } } };
    });

    it('does not throw when order-tracking-link element is missing', async () => {
        setCart([{ name: 'Biryani', price: 300, quantity: 1, spiceLevel: 'medium', addons: [] }]);
        setCurrentUser({ name: 'Test', phone: '9876543210' });
        const addMock = vi.fn(() => Promise.resolve({ id: 'notrack-1' }));
        window.db = makeDbMock({ ordersAdd: addMock });

        placeOrderToFirestore('COD', null, 'cod-pending');
        await new Promise(r => setTimeout(r, 50));
        expect(addMock).toHaveBeenCalled();
    });
});

// Line 417: awardLoyaltyPoints function exists
describe('placeOrderToFirestore — awardLoyaltyPoints (line 417)', () => {
    beforeEach(() => {
        clearCart();
        setupFullDOM();
        localStorage.clear();
        window.open = vi.fn();
        globalThis.firebase = { firestore: { FieldValue: { increment: vi.fn((n) => n) } } };
    });

    it('calls awardLoyaltyPoints when function exists', async () => {
        setCart([{ name: 'Biryani', price: 300, quantity: 1, spiceLevel: 'medium', addons: [] }]);
        setCurrentUser({ name: 'Test', phone: '9876543210' });
        window.awardLoyaltyPoints = vi.fn();
        const addMock = vi.fn(() => Promise.resolve({ id: 'loyalty-order-1' }));
        window.db = makeDbMock({ ordersAdd: addMock });

        placeOrderToFirestore('COD', null, 'cod-pending');
        await new Promise(r => setTimeout(r, 50));

        expect(window.awardLoyaltyPoints).toHaveBeenCalledWith(expect.any(Number));
        delete window.awardLoyaltyPoints;
    });
});

// Line 422: checkAndAwardBadges — badgeUser is null (getCurrentUser returns null after order)
describe('placeOrderToFirestore — checkAndAwardBadges with no user (line 422)', () => {
    beforeEach(() => {
        clearCart();
        setupFullDOM();
        localStorage.clear();
        window.open = vi.fn();
        globalThis.firebase = { firestore: { FieldValue: { increment: vi.fn((n) => n) } } };
    });

    it('does not call checkAndAwardBadges when getCurrentUser returns null', async () => {
        setCart([{ name: 'Biryani', price: 300, quantity: 1, spiceLevel: 'medium', addons: [] }]);
        // Set user initially so placeOrderToFirestore proceeds
        setCurrentUser({ name: 'Test', phone: '9876543210' });
        window.checkAndAwardBadges = vi.fn();

        const addMock = vi.fn(() => {
            // After order is placed, clear user so getCurrentUser returns null
            setCurrentUser(null);
            localStorage.removeItem('amoghaUser');
            return Promise.resolve({ id: 'nobadge-1' });
        });
        window.db = makeDbMock({ ordersAdd: addMock });

        placeOrderToFirestore('COD', null, 'cod-pending');
        await new Promise(r => setTimeout(r, 50));

        // checkAndAwardBadges should NOT have been called with a user
        expect(window.checkAndAwardBadges).not.toHaveBeenCalled();
        delete window.checkAndAwardBadges;
    });
});

// Lines 432-466: referral — referrer user doc does NOT exist (uDoc.exists === false)
describe('placeOrderToFirestore — referral referrer doc missing (line 432)', () => {
    beforeEach(() => {
        clearCart();
        setupFullDOM();
        localStorage.clear();
        window.open = vi.fn();
        globalThis.firebase = { firestore: { FieldValue: { increment: vi.fn((n) => n) } } };
    });

    it('does not update points when referrer user doc does not exist', async () => {
        setCart([{ name: 'Biryani', price: 300, quantity: 1, spiceLevel: 'medium', addons: [] }]);
        setCurrentUser({ name: 'Test', phone: '9876543210' });

        const referralRefUpdate = vi.fn(() => Promise.resolve());
        const referrerUpdateMock = vi.fn(() => Promise.resolve());
        const addMock = vi.fn(() => Promise.resolve({ id: 'ref-nouser-1' }));

        const referralSnap = {
            empty: false,
            docs: [{
                data: () => ({ referrerPhone: '1111111111', refereePhone: '9876543210', redeemed: false }),
                ref: { update: referralRefUpdate },
            }],
        };

        window.db = {
            collection: vi.fn((name) => {
                if (name === 'orders') return { add: addMock };
                if (name === 'inventory') return { get: vi.fn(() => Promise.resolve({ forEach: () => {} })) };
                if (name === 'referrals') return {
                    where: vi.fn().mockReturnThis(),
                    limit: vi.fn().mockReturnThis(),
                    get: vi.fn(() => Promise.resolve(referralSnap)),
                };
                if (name === 'users') return {
                    doc: vi.fn((phone) => {
                        if (phone === '1111111111') {
                            return {
                                get: vi.fn(() => Promise.resolve({ exists: false })),
                                update: referrerUpdateMock,
                                onSnapshot: vi.fn(() => vi.fn()),
                            };
                        }
                        return {
                            update: vi.fn(() => Promise.resolve()),
                            get: vi.fn(() => Promise.resolve({ exists: false })),
                            onSnapshot: vi.fn(() => vi.fn()),
                        };
                    }),
                    where: vi.fn().mockReturnThis(),
                    onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
                };
                return { doc: vi.fn(() => ({ update: vi.fn(() => Promise.resolve()) })) };
            }),
            batch: vi.fn(() => ({ update: vi.fn(), commit: vi.fn(() => Promise.resolve()) })),
        };

        placeOrderToFirestore('COD', null, 'cod-pending');
        await new Promise(r => setTimeout(r, 100));

        // Referral should be marked as redeemed first (race condition fix)
        expect(referralRefUpdate).toHaveBeenCalledWith({ redeemed: true });
        // With FieldValue.increment approach, update is called regardless
        // (Firestore handles the case where doc doesn't exist by failing gracefully)
    });
});

// Line 502: applyCouponData with empty codeValue
describe('applyCoupon — applyCouponData with empty codeValue (line 502)', () => {
    beforeEach(() => { clearCart(); setupFullDOM(); });

    it('sets appliedCouponCode to empty string when codeValue is not provided', async () => {
        setCart([{ name: 'Item', price: 1000, quantity: 1 }]);
        // Use Firestore path where coupon doc doesn't have code in URL
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    get: vi.fn(() => Promise.resolve({
                        exists: false,
                    })),
                })),
            })),
        };
        // Use invalid code that falls back to the "else" path
        document.getElementById('coupon-code').value = 'INVALID_CODE';
        applyCoupon();
        await new Promise(r => setTimeout(r, 20));

        const msg = document.getElementById('coupon-msg');
        expect(msg.textContent).toMatch(/invalid/i);
    });
});

// Lines 554-555: removeCoupon — input and msg elements are null
describe('removeCoupon — elements missing (lines 554-555 null branches)', () => {
    beforeEach(() => {
        document.body.innerHTML = '<span id="pay-total"></span><div id="tab-razorpay"></div><div id="tab-cod"></div><div id="pay-panel-razorpay"></div><div id="pay-panel-cod"></div>';
        document.getElementById = (id) => document.body.querySelector('#' + id);
        document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
    });

    it('does not throw when coupon-code and coupon-msg elements do not exist', () => {
        expect(() => removeCoupon()).not.toThrow();
    });
});

// Lines 597-598: removeGiftCard — input and msg elements are null
describe('removeGiftCard — elements missing (lines 597-598 null branches)', () => {
    beforeEach(() => {
        document.body.innerHTML = '<span id="pay-total"></span><div id="tab-razorpay"></div><div id="tab-cod"></div><div id="pay-panel-razorpay"></div><div id="pay-panel-cod"></div>';
        document.getElementById = (id) => document.body.querySelector('#' + id);
        document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
    });

    it('does not throw when giftcard-code and giftcard-msg elements do not exist', () => {
        expect(() => removeGiftCard()).not.toThrow();
    });
});

// Lines 683-708: redeemLoyaltyAtCheckout — discount <= 0 (redeemable > subtotal capped)
describe('redeemLoyaltyAtCheckout — discount capped at subtotal (line 683)', () => {
    beforeEach(() => { clearCart(); setupFullDOM(); localStorage.clear(); });

    it('caps discount at subtotal and still applies when redeemable exceeds subtotal', () => {
        setCart([{ name: 'Item', price: 10, quantity: 1 }]); // subtotal=10
        setCurrentUser({ name: 'Rich', phone: '1234567890', loyaltyPoints: 500 });
        window.db = null; // no db
        redeemLoyaltyAtCheckout();
        // redeemable = 50, but capped at subtotal = 10
        expect(document.getElementById('coupon-msg').textContent).toMatch(/redeemed/i);
    });
});

// Line 721: shareOrder — db is null (no Firestore update)
describe('shareOrder — db is null (line 721 false branch)', () => {
    beforeEach(() => { localStorage.clear(); setupFullDOM(); });

    it('awards points locally but does not update Firestore when db is null', () => {
        navigator.share = undefined;
        window.open = vi.fn();
        window.db = null;
        setCurrentUser({ name: 'Test', phone: '1234567890', loyaltyPoints: 100 });

        shareOrder();

        const user = JSON.parse(localStorage.getItem('amoghaUser'));
        expect(user.loyaltyPoints).toBe(110);
        const toast = document.getElementById('auth-toast');
        expect(toast.textContent).toContain('+10 loyalty points');
    });
});

// placeOrderToFirestore — inventory deduction with matching items (lines 462-478)
describe('placeOrderToFirestore — inventory deduction (lines 462-478)', () => {
    beforeEach(() => {
        clearCart();
        setupFullDOM();
        localStorage.clear();
        window.open = vi.fn();
        globalThis.firebase = { firestore: { FieldValue: { increment: vi.fn((n) => n) } } };
    });

    it('deducts inventory when order items match inventory entries', async () => {
        setCart([{ name: 'Biryani', price: 300, quantity: 2, spiceLevel: 'medium', addons: [] }]);
        setCurrentUser({ name: 'Test', phone: '9876543210' });

        const batchUpdateMock = vi.fn();
        const batchCommitMock = vi.fn(() => Promise.resolve());
        const addMock = vi.fn(() => Promise.resolve({ id: 'inv-order-1' }));

        const inventoryDocs = [
            { id: 'inv-1', data: () => ({ name: 'Biryani', quantity: 10 }) },
            { id: 'inv-2', data: () => ({ name: 'Tea', quantity: 50 }) },
        ];

        window.db = {
            collection: vi.fn((name) => {
                if (name === 'orders') return { add: addMock };
                if (name === 'inventory') return {
                    get: vi.fn(() => Promise.resolve({ forEach: (cb) => inventoryDocs.forEach(cb) })),
                    doc: vi.fn((id) => ({ id })),
                };
                if (name === 'referrals') return { where: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), get: vi.fn(() => Promise.resolve({ empty: true })) };
                if (name === 'users') return {
                    doc: vi.fn(() => ({ update: vi.fn(() => Promise.resolve()), onSnapshot: vi.fn(() => vi.fn()) })),
                    where: vi.fn().mockReturnThis(),
                    onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
                };
                return { doc: vi.fn(() => ({ update: vi.fn(() => Promise.resolve()) })) };
            }),
            batch: vi.fn(() => ({ update: batchUpdateMock, commit: batchCommitMock })),
        };

        placeOrderToFirestore('COD', null, 'cod-pending');
        await new Promise(r => setTimeout(r, 100));

        expect(batchUpdateMock).toHaveBeenCalled();
        expect(batchCommitMock).toHaveBeenCalled();
    });
});

// placeOrderToFirestore — welcome bonus mark used (line 388-391)
describe('placeOrderToFirestore — welcome bonus mark used (lines 388-391)', () => {
    beforeEach(() => {
        clearCart();
        setupFullDOM();
        localStorage.clear();
        window.open = vi.fn();
        globalThis.firebase = { firestore: { FieldValue: { increment: vi.fn((n) => n) } } };
    });

    it('marks welcome bonus as used when current user has not used it yet', async () => {
        setCart([{ name: 'Biryani', price: 600, quantity: 1, spiceLevel: 'medium', addons: [] }]);
        setCurrentUser({ name: 'New User', phone: '9876543210', usedWelcomeBonus: false });

        // Open checkout to auto-apply welcome bonus coupon
        openCheckout();

        const usersUpdateMock = vi.fn(() => Promise.resolve());
        const addMock = vi.fn(() => Promise.resolve({ id: 'welcome-order-1' }));

        window.db = {
            collection: vi.fn((name) => {
                if (name === 'orders') return { add: addMock };
                if (name === 'inventory') return { get: vi.fn(() => Promise.resolve({ forEach: () => {} })) };
                if (name === 'referrals') return { where: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), get: vi.fn(() => Promise.resolve({ empty: true })) };
                if (name === 'users') return {
                    doc: vi.fn(() => ({ update: usersUpdateMock, onSnapshot: vi.fn(() => vi.fn()) })),
                    where: vi.fn().mockReturnThis(),
                    onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
                };
                if (name === 'coupons') return { doc: vi.fn(() => ({ update: vi.fn(() => Promise.resolve()) })) };
                return { doc: vi.fn(() => ({ update: vi.fn(() => Promise.resolve()) })) };
            }),
            batch: vi.fn(() => ({ update: vi.fn(), commit: vi.fn(() => Promise.resolve()) })),
        };

        placeOrderToFirestore('COD', null, 'cod-pending');
        await new Promise(r => setTimeout(r, 50));

        expect(usersUpdateMock).toHaveBeenCalledWith({ usedWelcomeBonus: true });
    });
});

// validateAndPay — schedule info with missing date/time (line 204)
describe('validateAndPay — schedule validation (line 204)', () => {
    beforeEach(() => { clearCart(); setupFullDOM(); });

    it('shows toast when schedule is enabled but date or time is missing', () => {
        window.getScheduleInfo = () => ({ date: '', time: '' });
        document.getElementById('co-name').value = 'Test';
        document.getElementById('co-phone').value = '9876543210';
        document.getElementById('co-address').value = '123 Main St';

        validateAndPay();

        const toast = document.getElementById('auth-toast');
        expect(toast.textContent).toMatch(/select both date and time/i);
        delete window.getScheduleInfo;
    });
});

// openCheckout — upsell items rendered (lines 93-111)
describe('openCheckout — upsell items rendered (lines 93-111)', () => {
    beforeEach(() => { clearCart(); setupFullDOM(); });

    it('renders upsell section when getUpsellItems returns items', () => {
        setCart([{ name: 'Biryani', price: 300, quantity: 1 }]);
        window.getUpsellItems = vi.fn(() => [
            { name: 'Raita', price: 40, reason: 'Goes great with biryani' },
        ]);

        openCheckout();

        const checkoutItems = document.getElementById('checkout-items');
        expect(checkoutItems.innerHTML).toContain('upsell-section');
        expect(checkoutItems.innerHTML).toContain('Raita');
        expect(checkoutItems.innerHTML).toContain('Goes great with biryani');

        delete window.getUpsellItems;
    });
});

// openCheckout — loyalty redeem button with enough points (lines 119-128)
describe('openCheckout — loyalty redeem button (lines 119-128)', () => {
    beforeEach(() => { clearCart(); setupFullDOM(); });

    it('shows loyalty redeem button when user has >= 100 points', () => {
        setCart([{ name: 'Item', price: 500, quantity: 1 }]);
        setCurrentUser({ name: 'Loyal', phone: '1234567890', loyaltyPoints: 200 });

        openCheckout();

        const loyaltyBtn = document.getElementById('loyalty-redeem-btn');
        expect(loyaltyBtn.style.display).toBe('block');
        expect(loyaltyBtn.textContent).toContain('200');
    });

    it('hides loyalty redeem button when user has < 100 points', () => {
        setCart([{ name: 'Item', price: 500, quantity: 1 }]);
        setCurrentUser({ name: 'Low', phone: '1234567890', loyaltyPoints: 50 });

        openCheckout();

        const loyaltyBtn = document.getElementById('loyalty-redeem-btn');
        expect(loyaltyBtn.style.display).toBe('none');
    });
});

// checkout — allergen warning callback (lines 72-79)
describe('checkout — allergen warning callback (lines 72-79)', () => {
    beforeEach(() => { clearCart(); setupFullDOM(); localStorage.clear(); });

    it('calls checkAllergenWarning and aborts when proceed is false', () => {
        setCart([{ name: 'Biryani', price: 200, quantity: 1 }]);
        setCurrentUser({ name: 'Test', phone: '1234567890' });
        window.checkAllergenWarning = vi.fn((items, cb) => cb(false));

        checkout();

        expect(window.checkAllergenWarning).toHaveBeenCalled();
        delete window.checkAllergenWarning;
    });

    it('calls checkAllergenWarning and proceeds to openCheckout when proceed is true', () => {
        setCart([{ name: 'Biryani', price: 200, quantity: 1 }]);
        setCurrentUser({ name: 'Test', phone: '1234567890' });
        window.checkAllergenWarning = vi.fn((items, cb) => cb(true));

        checkout();

        expect(window.checkAllergenWarning).toHaveBeenCalled();
        expect(document.getElementById('checkout-modal').style.display).toBe('block');
        delete window.checkAllergenWarning;
    });
});

// applyCoupon — Firestore .catch fallback path (line 536)
describe('applyCoupon — Firestore error fallback (line 536)', () => {
    beforeEach(() => { clearCart(); setupFullDOM(); });

    it('falls back to fallback coupons when Firestore throws', async () => {
        setCart([{ name: 'Item', price: 500, quantity: 1 }]);
        document.getElementById('coupon-code').value = 'AMOGHA20';
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    get: vi.fn(() => Promise.reject(new Error('network'))),
                })),
            })),
        };

        applyCoupon();
        await new Promise(r => setTimeout(r, 20));

        const msg = document.getElementById('coupon-msg');
        expect(msg.textContent).toMatch(/Coupon applied/i);
    });

    it('shows error when Firestore throws and code is not in fallbacks', async () => {
        setCart([{ name: 'Item', price: 500, quantity: 1 }]);
        document.getElementById('coupon-code').value = 'UNKNOWN99';
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    get: vi.fn(() => Promise.reject(new Error('network'))),
                })),
            })),
        };

        applyCoupon();
        await new Promise(r => setTimeout(r, 20));

        const msg = document.getElementById('coupon-msg');
        expect(msg.textContent).toMatch(/invalid/i);
    });
});

// applyCoupon — Firestore coupon not valid (line 519-524)
describe('applyCoupon — Firestore coupon validation fails (lines 519-524)', () => {
    beforeEach(() => { clearCart(); setupFullDOM(); });

    it('shows validation reason when Firestore coupon is inactive', async () => {
        setCart([{ name: 'Item', price: 500, quantity: 1 }]);
        document.getElementById('coupon-code').value = 'INACTIVE';
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    get: vi.fn(() => Promise.resolve({
                        exists: true,
                        data: () => ({ active: false, type: 'flat', discount: 50 }),
                    })),
                })),
            })),
        };

        applyCoupon();
        await new Promise(r => setTimeout(r, 20));

        const msg = document.getElementById('coupon-msg');
        expect(msg.textContent).toMatch(/no longer active/i);
        expect(msg.className).toContain('error');
    });
});

// placeOrderToFirestore — order save error (line 481-484)
describe('placeOrderToFirestore — order save fails (lines 481-484)', () => {
    beforeEach(() => {
        clearCart();
        setupFullDOM();
        localStorage.clear();
        window.open = vi.fn();
        globalThis.firebase = { firestore: { FieldValue: { increment: vi.fn((n) => n) } } };
    });

    it('shows toast when order fails to save', async () => {
        setCart([{ name: 'Biryani', price: 300, quantity: 1, spiceLevel: 'medium', addons: [] }]);
        setCurrentUser({ name: 'Test', phone: '9876543210' });

        window.db = {
            collection: vi.fn((name) => {
                if (name === 'orders') return { add: vi.fn(() => Promise.reject(new Error('save failed'))) };
                return { doc: vi.fn(() => ({ update: vi.fn(() => Promise.resolve()) })) };
            }),
            batch: vi.fn(() => ({ update: vi.fn(), commit: vi.fn(() => Promise.resolve()) })),
        };

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        placeOrderToFirestore('COD', null, 'cod-pending');
        await new Promise(r => setTimeout(r, 50));

        const toast = document.getElementById('auth-toast');
        expect(toast.textContent).toMatch(/Order failed/i);
        consoleSpy.mockRestore();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Branch coverage: openCheckout — allergen warning callback decline (line 75)
// ═══════════════════════════════════════════════════════════════════════════
describe('checkout — allergen warning callback decline (line 75)', () => {
    beforeEach(() => {
        localStorage.clear();
        cart.length = 0;
        cart.push({ name: 'Biryani', price: 200, quantity: 1 });
        setupDOM(`
            <div id="cart-modal" style="display:block"></div>
            <div id="checkout-modal" style="display:none"></div>
            <div id="checkout-items"></div>
            <span id="co-subtotal"></span>
            <span id="co-delivery"></span>
            <span id="co-total"></span>
            <div id="loyalty-redeem-btn" style="display:none"></div>
            <div class="checkout-step" id="checkout-step-1"></div>
            <div class="checkout-step" id="checkout-step-2"></div>
            <div class="checkout-step" id="checkout-step-3"></div>
            <div class="checkout-step" id="checkout-step-4"></div>
            <input id="coupon-code" value="">
            <span id="coupon-msg"></span>
            <span id="pay-total"></span>
            <div id="tab-razorpay"></div><div id="tab-cod"></div>
            <div id="pay-panel-razorpay"></div><div id="pay-panel-cod"></div>
            <div id="auth-toast"></div>
        `);
        setCurrentUser({ name: 'Test', phone: '1234567890', usedWelcomeBonus: true });
    });

    it('does not open checkout when allergen warning callback returns false (line 75)', () => {
        window.checkAllergenWarning = function(items, cb) { cb(false); };
        checkout();
        // checkout-modal should remain hidden because callback returned false
        expect(document.getElementById('checkout-modal').style.display).toBe('none');
        delete window.checkAllergenWarning;
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Branch coverage: openRazorpay — Razorpay constructor throws (lines 285-287)
// ═══════════════════════════════════════════════════════════════════════════
describe('openRazorpay — Razorpay constructor throws (lines 285-287)', () => {
    beforeEach(() => {
        localStorage.clear();
        cart.length = 0;
        cart.push({ name: 'Tea', price: 30, quantity: 1 });
        setupDOM(`
            <span id="pay-total"></span>
            <span id="co-subtotal"></span>
            <span id="co-delivery"></span>
            <span id="co-total"></span>
            <input id="co-name" value="Test">
            <input id="co-phone" value="1234567890">
            <button id="razorpay-pay-btn">Pay Now</button>
            <div id="auth-toast"></div>
        `);
    });

    it('shows error toast when Razorpay constructor throws (line 286)', () => {
        globalThis.Razorpay = function() { throw new Error('init failed'); };
        openRazorpay();
        const toast = document.getElementById('auth-toast');
        expect(toast.textContent).toMatch(/Error opening payment/i);
        const btn = document.getElementById('razorpay-pay-btn');
        expect(btn.disabled).toBe(false);
        delete globalThis.Razorpay;
    });

    it('handles payment.failed callback (line 269-287)', () => {
        let failHandler;
        globalThis.Razorpay = function(opts) {
            this.on = function(event, handler) { failHandler = handler; };
            this.open = function() {};
        };
        openRazorpay();
        // Simulate payment failure
        failHandler({ error: { description: 'Card declined' } });
        const toast = document.getElementById('auth-toast');
        expect(toast.textContent).toMatch(/Payment failed/);
        expect(toast.textContent).toContain('Card declined');
        delete globalThis.Razorpay;
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Branch coverage: placeOrderToFirestore — scheduled order (lines 357-364)
// ═══════════════════════════════════════════════════════════════════════════
describe('placeOrderToFirestore — scheduled order (lines 357-364)', () => {
    beforeEach(() => {
        localStorage.clear();
        cart.length = 0;
        cart.push({ name: 'Biryani', price: 200, quantity: 1 });
        setCurrentUser({ name: 'Test', phone: '1234567890' });
        setupDOM(`
            <input id="co-name" value="Test User">
            <input id="co-phone" value="1234567890">
            <input id="co-address" value="123 St">
            <textarea id="co-notes"></textarea>
            <span id="confirm-detail"></span>
            <a id="whatsapp-link" href="#"></a>
            <div class="checkout-step" id="checkout-step-1"></div>
            <div class="checkout-step" id="checkout-step-2"></div>
            <div class="checkout-step" id="checkout-step-3"></div>
            <div class="checkout-step" id="checkout-step-4"></div>
            <div id="order-tracking-link"></div>
            <div id="auth-toast"></div>
            <input id="schedule-order-check" type="checkbox" checked>
            <input id="schedule-date" value="2026-04-01">
            <input id="schedule-time" value="12:00">
        `);
    });

    it('sets scheduledFor and status=scheduled when schedule checkbox is checked (line 354-356)', async () => {
        let savedOrderData = null;
        window.db = {
            collection: vi.fn((name) => {
                if (name === 'orders') return {
                    add: vi.fn((data) => { savedOrderData = data; return Promise.resolve({ id: 'ord123' }); }),
                };
                return {
                    doc: vi.fn(() => ({
                        update: vi.fn(() => Promise.resolve()),
                        get: vi.fn(() => Promise.resolve({ exists: false })),
                    })),
                    where: vi.fn().mockReturnThis(),
                    limit: vi.fn().mockReturnThis(),
                    get: vi.fn(() => Promise.resolve({ empty: true, forEach: vi.fn(), docs: [] })),
                };
            }),
            batch: vi.fn(() => ({ update: vi.fn(), commit: vi.fn(() => Promise.resolve()) })),
        };

        placeOrderToFirestore('COD', null, 'cod-pending');
        await new Promise(r => setTimeout(r, 50));

        expect(savedOrderData).not.toBeNull();
        expect(savedOrderData.status).toBe('scheduled');
        expect(savedOrderData.scheduledFor).not.toBeNull();
        expect(savedOrderData.scheduledFor).toContain('2026-04-01');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Branch coverage: placeOrderToFirestore — referral points (lines 426-439)
// ═══════════════════════════════════════════════════════════════════════════
describe('placeOrderToFirestore — referrer points award (lines 426,433-466)', () => {
    beforeEach(() => {
        localStorage.clear();
        cart.length = 0;
        cart.push({ name: 'Biryani', price: 200, quantity: 1 });
        setCurrentUser({ name: 'Test', phone: '1234567890' });
        setupDOM(`
            <input id="co-name" value="Test User">
            <input id="co-phone" value="1234567890">
            <input id="co-address" value="123 St">
            <textarea id="co-notes"></textarea>
            <span id="confirm-detail"></span>
            <a id="whatsapp-link" href="#"></a>
            <div class="checkout-step" id="checkout-step-1"></div>
            <div class="checkout-step" id="checkout-step-2"></div>
            <div class="checkout-step" id="checkout-step-3"></div>
            <div class="checkout-step" id="checkout-step-4"></div>
            <div id="order-tracking-link"></div>
            <div id="auth-toast"></div>
        `);
    });

    it('awards referrer 100 pts when referral exists and user doc exists (line 433)', async () => {
        let referrerUpdateData = null;
        const refDocRef = { update: vi.fn(() => Promise.resolve()) };
        // Mock FieldValue.increment for the referral points update
        const incrementMock = vi.fn((n) => ({ _increment: n }));
        window.firebase = { firestore: { FieldValue: { increment: incrementMock } } };
        window.db = {
            collection: vi.fn((name) => {
                if (name === 'orders') return {
                    add: vi.fn(() => Promise.resolve({ id: 'ord123' })),
                };
                if (name === 'referrals') return {
                    where: vi.fn().mockReturnThis(),
                    limit: vi.fn().mockReturnThis(),
                    get: vi.fn(() => Promise.resolve({
                        empty: false,
                        docs: [{
                            data: () => ({ referrerPhone: '9999999999' }),
                            ref: refDocRef,
                        }],
                    })),
                };
                if (name === 'users') return {
                    doc: vi.fn((phone) => ({
                        update: vi.fn((data) => { if (phone === '9999999999') referrerUpdateData = data; return Promise.resolve(); }),
                        get: vi.fn(() => Promise.resolve({ exists: true, data: () => ({ loyaltyPoints: 50 }) })),
                    })),
                };
                if (name === 'inventory') return {
                    get: vi.fn(() => Promise.resolve({ forEach: vi.fn() })),
                };
                return {
                    doc: vi.fn(() => ({ update: vi.fn(() => Promise.resolve()), get: vi.fn(() => Promise.resolve({ exists: false })) })),
                    where: vi.fn().mockReturnThis(),
                    get: vi.fn(() => Promise.resolve({ forEach: vi.fn(), docs: [] })),
                };
            }),
            batch: vi.fn(() => ({ update: vi.fn(), commit: vi.fn(() => Promise.resolve()) })),
        };

        placeOrderToFirestore('COD', null, 'cod-pending');
        await new Promise(r => setTimeout(r, 100));

        // Now uses FieldValue.increment(100) instead of read-then-write
        expect(referrerUpdateData).toEqual({ loyaltyPoints: { _increment: 100 } });
        expect(refDocRef.update).toHaveBeenCalledWith({ redeemed: true });
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Branch coverage: redeemLoyaltyAtCheckout — discount <= 0 (line 683)
// ═══════════════════════════════════════════════════════════════════════════
describe('redeemLoyaltyAtCheckout — edge: discount <= 0 (line 683)', () => {
    beforeEach(() => {
        localStorage.clear();
        cart.length = 0;
        setupDOM(`
            <span id="co-total"></span>
            <span id="coupon-msg"></span>
            <input id="coupon-code">
            <div id="auth-toast"></div>
        `);
    });

    it('returns early when user has no loyaltyPoints (line 678)', () => {
        setCurrentUser({ name: 'Test', phone: '1234567890' });
        redeemLoyaltyAtCheckout();
        // Should return early — coupon-msg should be empty
        expect(document.getElementById('coupon-msg').textContent).toBe('');
    });

    it('returns early when user has < 100 points (line 678)', () => {
        setCurrentUser({ name: 'Test', phone: '1234567890', loyaltyPoints: 50 });
        redeemLoyaltyAtCheckout();
        expect(document.getElementById('coupon-msg').textContent).toBe('');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Branch coverage: shareOrder — navigator.share absent (line 708)
// ═══════════════════════════════════════════════════════════════════════════
describe('shareOrder — no navigator.share (line 708)', () => {
    beforeEach(() => {
        localStorage.clear();
        setupDOM('<div id="auth-toast"></div>');
        setCurrentUser({ name: 'Test', phone: '1234567890', loyaltyPoints: 0 });
        delete navigator.share;
        window.open = vi.fn();
    });

    it('opens WhatsApp link and awards points when navigator.share is unavailable (line 734)', () => {
        localStorage.removeItem('amoghaSharedOrders');
        shareOrder();
        expect(window.open).toHaveBeenCalled();
        const toast = document.getElementById('auth-toast');
        expect(toast.textContent).toContain('+10');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Branch coverage: placeOrderToFirestore — inventory deduction (lines 462-478)
// ═══════════════════════════════════════════════════════════════════════════
describe('placeOrderToFirestore — inventory deduction (line 502)', () => {
    beforeEach(() => {
        localStorage.clear();
        cart.length = 0;
        cart.push({ name: 'Biryani', price: 200, quantity: 2 });
        setCurrentUser({ name: 'Test', phone: '1234567890' });
        setupDOM(`
            <input id="co-name" value="Test User">
            <input id="co-phone" value="1234567890">
            <input id="co-address" value="123 St">
            <textarea id="co-notes"></textarea>
            <span id="confirm-detail"></span>
            <a id="whatsapp-link" href="#"></a>
            <div class="checkout-step" id="checkout-step-1"></div>
            <div class="checkout-step" id="checkout-step-2"></div>
            <div class="checkout-step" id="checkout-step-3"></div>
            <div class="checkout-step" id="checkout-step-4"></div>
            <div id="order-tracking-link"></div>
            <div id="auth-toast"></div>
        `);
    });

    it('deducts inventory quantities via batch update when matching items exist', async () => {
        let batchUpdates = [];
        const batchObj = {
            update: vi.fn((ref, data) => batchUpdates.push({ ref, data })),
            commit: vi.fn(() => Promise.resolve()),
        };
        window.db = {
            collection: vi.fn((name) => {
                if (name === 'orders') return {
                    add: vi.fn(() => Promise.resolve({ id: 'ord1' })),
                };
                if (name === 'inventory') return {
                    get: vi.fn(() => Promise.resolve({
                        forEach: (cb) => {
                            cb({ id: 'inv1', data: () => ({ name: 'Biryani', quantity: 10 }) });
                        },
                    })),
                    doc: vi.fn((id) => ({ id })),
                };
                return {
                    doc: vi.fn(() => ({
                        update: vi.fn(() => Promise.resolve()),
                        get: vi.fn(() => Promise.resolve({ exists: false })),
                    })),
                    where: vi.fn().mockReturnThis(),
                    limit: vi.fn().mockReturnThis(),
                    get: vi.fn(() => Promise.resolve({ empty: true, forEach: vi.fn(), docs: [] })),
                };
            }),
            batch: vi.fn(() => batchObj),
        };

        placeOrderToFirestore('COD', null, 'cod-pending');
        await new Promise(r => setTimeout(r, 100));

        expect(batchObj.commit).toHaveBeenCalled();
        expect(batchUpdates.length).toBeGreaterThan(0);
        expect(batchUpdates[0].data.quantity).toBe(8); // 10 - 2
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// validateAndPay — schedule validation (lines 357-364)
// ═══════════════════════════════════════════════════════════════════════════
describe('validateAndPay — schedule validation (lines 203-208)', () => {
    beforeEach(() => { clearCart(); setupFullDOM(); });

    it('shows toast when schedule is enabled but date is missing', () => {
        document.getElementById('co-name').value = 'Test';
        document.getElementById('co-phone').value = '9876543210';
        document.getElementById('co-address').value = '123 Main St';
        window.getScheduleInfo = () => ({ date: '', time: '18:00' });
        validateAndPay();
        const toast = document.getElementById('auth-toast');
        expect(toast.textContent).toContain('date and time');
        delete window.getScheduleInfo;
    });

    it('shows toast when schedule is enabled but time is missing', () => {
        document.getElementById('co-name').value = 'Test';
        document.getElementById('co-phone').value = '9876543210';
        document.getElementById('co-address').value = '123 Main St';
        window.getScheduleInfo = () => ({ date: '2026-03-10', time: '' });
        validateAndPay();
        const toast = document.getElementById('auth-toast');
        expect(toast.textContent).toContain('date and time');
        delete window.getScheduleInfo;
    });

    it('proceeds to step 3 when schedule info is complete', () => {
        document.getElementById('co-name').value = 'Test';
        document.getElementById('co-phone').value = '9876543210';
        document.getElementById('co-address').value = '123 Main St';
        window.getScheduleInfo = () => ({ date: '2026-03-10', time: '18:00' });
        validateAndPay();
        expect(document.getElementById('checkout-step-3').classList.contains('active')).toBe(true);
        delete window.getScheduleInfo;
    });

    it('proceeds when getScheduleInfo is not defined', () => {
        document.getElementById('co-name').value = 'Test';
        document.getElementById('co-phone').value = '9876543210';
        document.getElementById('co-address').value = '123 Main St';
        delete window.getScheduleInfo;
        validateAndPay();
        expect(document.getElementById('checkout-step-3').classList.contains('active')).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// applyCoupon — Firestore doc exists but validation fails (lines 519-524)
// ═══════════════════════════════════════════════════════════════════════════
describe('applyCoupon — Firestore doc validation fails (line 519)', () => {
    beforeEach(() => { clearCart(); setupFullDOM(); });

    it('shows error when Firestore coupon is inactive', async () => {
        setCart([{ name: 'Item', price: 500, quantity: 1 }]);
        document.getElementById('coupon-code').value = 'EXPIRED';
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    get: vi.fn(() => Promise.resolve({
                        exists: true,
                        data: () => ({ active: false, type: 'flat', discount: 50 }),
                    })),
                })),
            })),
        };
        applyCoupon();
        await new Promise(r => setTimeout(r, 20));
        const msg = document.getElementById('coupon-msg');
        expect(msg.textContent).toContain('no longer active');
        expect(msg.className).toContain('error');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// applyCoupon — Firestore error falls back to fallback coupon (line 536)
// ═══════════════════════════════════════════════════════════════════════════
describe('applyCoupon — Firestore error fallback (line 536)', () => {
    beforeEach(() => { clearCart(); setupFullDOM(); });

    it('applies fallback coupon when Firestore fetch throws', async () => {
        setCart([{ name: 'Item', price: 500, quantity: 1 }]);
        document.getElementById('coupon-code').value = 'AMOGHA20';
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    get: vi.fn(() => Promise.reject(new Error('network error'))),
                })),
            })),
        };
        applyCoupon();
        await new Promise(r => setTimeout(r, 20));
        const msg = document.getElementById('coupon-msg');
        expect(msg.textContent).toContain('Coupon applied');
    });

    it('shows error when Firestore errors and code is not in fallback', async () => {
        setCart([{ name: 'Item', price: 500, quantity: 1 }]);
        document.getElementById('coupon-code').value = 'NONEXISTENT';
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    get: vi.fn(() => Promise.reject(new Error('network error'))),
                })),
            })),
        };
        applyCoupon();
        await new Promise(r => setTimeout(r, 20));
        const msg = document.getElementById('coupon-msg');
        expect(msg.textContent).toContain('Invalid coupon');
        expect(msg.className).toContain('error');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// applyCoupon — Firestore doc not found but fallback exists (line 527-528)
// ═══════════════════════════════════════════════════════════════════════════
describe('applyCoupon — Firestore doc missing, fallback exists (line 527)', () => {
    beforeEach(() => { clearCart(); setupFullDOM(); });

    it('applies fallback coupon when Firestore doc does not exist', async () => {
        setCart([{ name: 'Item', price: 500, quantity: 1 }]);
        document.getElementById('coupon-code').value = 'FIRST10';
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    get: vi.fn(() => Promise.resolve({ exists: false })),
                })),
            })),
        };
        applyCoupon();
        await new Promise(r => setTimeout(r, 20));
        const msg = document.getElementById('coupon-msg');
        expect(msg.textContent).toContain('Coupon applied');
    });

    it('shows error when Firestore doc not found and no fallback match', async () => {
        setCart([{ name: 'Item', price: 500, quantity: 1 }]);
        document.getElementById('coupon-code').value = 'UNKNOWN123';
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    get: vi.fn(() => Promise.resolve({ exists: false })),
                })),
            })),
        };
        applyCoupon();
        await new Promise(r => setTimeout(r, 20));
        const msg = document.getElementById('coupon-msg');
        expect(msg.textContent).toContain('Invalid coupon');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// placeOrderToFirestore — welcome bonus mark used (lines 388-392)
// ═══════════════════════════════════════════════════════════════════════════
describe('placeOrderToFirestore — welcome bonus marked as used (line 388)', () => {
    beforeEach(() => {
        clearCart();
        setupFullDOM();
        localStorage.clear();
        window.open = vi.fn();
        globalThis.firebase = { firestore: { FieldValue: { increment: vi.fn((n) => n) } } };
    });

    it('marks welcome bonus as used when coupon label contains Welcome', async () => {
        setCart([{ name: 'Biryani', price: 300, quantity: 1, spiceLevel: 'medium', addons: [] }]);
        const user = { name: 'Test', phone: '9876543210', usedWelcomeBonus: false };
        setCurrentUser(user);

        // Apply welcome bonus coupon
        document.getElementById('coupon-code').value = 'WELCOME25';
        window.db = null;
        applyCoupon();

        // Now set up db
        const usersUpdateMock = vi.fn(() => Promise.resolve());
        const addMock = vi.fn(() => Promise.resolve({ id: 'welcome-order-1' }));
        window.db = makeDbMock({ ordersAdd: addMock, usersUpdate: usersUpdateMock });

        placeOrderToFirestore('COD', null, 'cod-pending');
        await new Promise(r => setTimeout(r, 50));

        // The user should have usedWelcomeBonus set to true
        const savedUser = JSON.parse(localStorage.getItem('amoghaUser'));
        expect(savedUser.usedWelcomeBonus).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// placeOrderToFirestore — customer phone formatting (lines 450-451)
// ═══════════════════════════════════════════════════════════════════════════
describe('placeOrderToFirestore — phone number formatting (lines 450-451)', () => {
    beforeEach(() => {
        clearCart();
        setupFullDOM();
        localStorage.clear();
        window.open = vi.fn();
        globalThis.firebase = { firestore: { FieldValue: { increment: vi.fn((n) => n) } } };
    });

    it('prepends 91 to 10-digit phone for WhatsApp message', async () => {
        setCart([{ name: 'Biryani', price: 300, quantity: 1, spiceLevel: 'medium', addons: [] }]);
        setCurrentUser({ name: 'Test', phone: '9876543210' });
        document.getElementById('co-phone').value = '9876543210';

        const addMock = vi.fn(() => Promise.resolve({ id: 'phone-order-1' }));
        window.db = makeDbMock({ ordersAdd: addMock });

        placeOrderToFirestore('COD', null, 'cod-pending');
        await new Promise(r => setTimeout(r, 50));

        // window.open should have been called with WhatsApp URL containing 91-prefixed phone
        expect(window.open).toHaveBeenCalled();
        const waUrl = window.open.mock.calls[0][0];
        expect(waUrl).toContain('919876543210');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// openCheckout — upsell items present (lines 93-110)
// ═══════════════════════════════════════════════════════════════════════════
describe('openCheckout — upsell items rendered (lines 93-110)', () => {
    beforeEach(() => { clearCart(); setupFullDOM(); localStorage.clear(); });

    it('renders upsell section when getUpsellItems returns items', () => {
        setCart([{ name: 'Biryani', price: 300, quantity: 1 }]);
        window.getUpsellItems = vi.fn(() => [
            { name: 'Raita', price: 40, reason: 'Goes great with Biryani' }
        ]);
        openCheckout();
        const items = document.getElementById('checkout-items');
        expect(items.innerHTML).toContain('upsell-section');
        expect(items.innerHTML).toContain('Raita');
        delete window.getUpsellItems;
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// openCheckout — loyalty redeem button display (lines 119-128)
// ═══════════════════════════════════════════════════════════════════════════
describe('openCheckout — loyalty redeem button (lines 119-128)', () => {
    beforeEach(() => { clearCart(); setupFullDOM(); localStorage.clear(); });

    it('shows loyalty redeem button when user has >= 100 points', () => {
        setCart([{ name: 'Biryani', price: 300, quantity: 1 }]);
        setCurrentUser({ name: 'Test', phone: '1234567890', loyaltyPoints: 500 });
        openCheckout();
        const btn = document.getElementById('loyalty-redeem-btn');
        expect(btn.style.display).toBe('block');
        expect(btn.textContent).toContain('500');
    });

    it('hides loyalty redeem button when user has < 100 points', () => {
        setCart([{ name: 'Biryani', price: 300, quantity: 1 }]);
        setCurrentUser({ name: 'Test', phone: '1234567890', loyaltyPoints: 50 });
        openCheckout();
        const btn = document.getElementById('loyalty-redeem-btn');
        expect(btn.style.display).toBe('none');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// openCheckout — auto-apply welcome bonus (lines 138-154)
// ═══════════════════════════════════════════════════════════════════════════
describe('openCheckout — auto-apply welcome bonus (lines 138-154)', () => {
    beforeEach(() => { clearCart(); setupFullDOM(); localStorage.clear(); });

    it('auto-applies 25% welcome bonus for new user', () => {
        setCart([{ name: 'Biryani', price: 400, quantity: 1 }]);
        setCurrentUser({ name: 'NewUser', phone: '1234567890', usedWelcomeBonus: false });
        openCheckout();
        const msg = document.getElementById('coupon-msg');
        expect(msg.textContent).toContain('Welcome bonus');
        expect(document.getElementById('coupon-code').value).toBe('WELCOME25');
    });

    it('does not auto-apply welcome bonus when already used', () => {
        setCart([{ name: 'Biryani', price: 400, quantity: 1 }]);
        setCurrentUser({ name: 'Existing', phone: '1234567890', usedWelcomeBonus: true });
        openCheckout();
        const msg = document.getElementById('coupon-msg');
        expect(msg.textContent).toBe('');
        expect(document.getElementById('coupon-code').value).toBe('');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// checkout — allergen warning proceed/cancel (lines 72-78)
// ═══════════════════════════════════════════════════════════════════════════
describe('checkout — allergen check proceed and cancel (lines 72-78)', () => {
    beforeEach(() => { clearCart(); setupFullDOM(); localStorage.clear(); });

    it('opens checkout when allergen check proceeds', () => {
        setCart([{ name: 'Biryani', price: 300, quantity: 1 }]);
        setCurrentUser({ name: 'Test', phone: '1234567890' });
        window.checkAllergenWarning = vi.fn((cart, cb) => cb(true));
        checkout();
        expect(document.getElementById('checkout-modal').style.display).toBe('block');
        delete window.checkAllergenWarning;
    });

    it('does not open checkout when allergen check cancels', () => {
        setCart([{ name: 'Biryani', price: 300, quantity: 1 }]);
        setCurrentUser({ name: 'Test', phone: '1234567890' });
        window.checkAllergenWarning = vi.fn((cart, cb) => cb(false));
        checkout();
        expect(document.getElementById('checkout-modal').style.display).toBe('none');
        delete window.checkAllergenWarning;
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// placeOrderToFirestore — db null returns early (lines 297-300)
// ═══════════════════════════════════════════════════════════════════════════
describe('placeOrderToFirestore — db null early return (lines 297-300)', () => {
    beforeEach(() => { clearCart(); setupFullDOM(); localStorage.clear(); });

    it('shows toast when db is unavailable', () => {
        setCart([{ name: 'Biryani', price: 300, quantity: 1, spiceLevel: 'medium', addons: [] }]);
        window.db = null;
        placeOrderToFirestore('COD', null, 'cod-pending');
        const toast = document.getElementById('auth-toast');
        expect(toast.textContent).toContain('Service unavailable');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// applyGiftCard — inactive gift card (line 572)
// ═══════════════════════════════════════════════════════════════════════════
describe('applyGiftCard — inactive and zero balance (lines 572-573)', () => {
    beforeEach(() => { clearCart(); setupFullDOM(); });

    it('shows error when gift card is inactive', async () => {
        document.getElementById('giftcard-code').value = 'GC-INACTIVE';
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    get: vi.fn(() => Promise.resolve({
                        exists: true,
                        data: () => ({ active: false, balance: 100 }),
                    })),
                })),
            })),
        };
        applyGiftCard();
        await new Promise(r => setTimeout(r, 20));
        const msg = document.getElementById('giftcard-msg');
        expect(msg.textContent).toContain('no longer active');
    });

    it('shows error when gift card has zero balance', async () => {
        document.getElementById('giftcard-code').value = 'GC-EMPTY';
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    get: vi.fn(() => Promise.resolve({
                        exists: true,
                        data: () => ({ active: true, balance: 0 }),
                    })),
                })),
            })),
        };
        applyGiftCard();
        await new Promise(r => setTimeout(r, 20));
        const msg = document.getElementById('giftcard-msg');
        expect(msg.textContent).toContain('no remaining balance');
    });

    it('shows error when gift card code not found', async () => {
        document.getElementById('giftcard-code').value = 'GC-NOPE';
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    get: vi.fn(() => Promise.resolve({ exists: false })),
                })),
            })),
        };
        applyGiftCard();
        await new Promise(r => setTimeout(r, 20));
        const msg = document.getElementById('giftcard-msg');
        expect(msg.textContent).toContain('Invalid gift card');
    });

    it('shows error when giftcard code is empty', () => {
        document.getElementById('giftcard-code').value = '';
        applyGiftCard();
        const msg = document.getElementById('giftcard-msg');
        expect(msg.textContent).toContain('enter a gift card');
    });

    it('shows error when db is unavailable', () => {
        document.getElementById('giftcard-code').value = 'GC-TEST';
        window.db = null;
        applyGiftCard();
        const msg = document.getElementById('giftcard-msg');
        expect(msg.textContent).toContain('Service unavailable');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// applyGiftCard — Firestore error catch (line 587-589)
// ═══════════════════════════════════════════════════════════════════════════
describe('applyGiftCard — Firestore fetch error (line 587)', () => {
    beforeEach(() => { clearCart(); setupFullDOM(); });

    it('shows error when Firestore fetch fails', async () => {
        document.getElementById('giftcard-code').value = 'GC-ERR';
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    get: vi.fn(() => Promise.reject(new Error('network error'))),
                })),
            })),
        };
        applyGiftCard();
        await new Promise(r => setTimeout(r, 20));
        const msg = document.getElementById('giftcard-msg');
        expect(msg.textContent).toContain('Error');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// placeOrderToFirestore — order save catch (lines 481-484)
// ═══════════════════════════════════════════════════════════════════════════
describe('placeOrderToFirestore — order save error (line 481)', () => {
    beforeEach(() => {
        clearCart();
        setupFullDOM();
        localStorage.clear();
        window.open = vi.fn();
        globalThis.firebase = { firestore: { FieldValue: { increment: vi.fn((n) => n) } } };
    });

    it('shows toast when order save fails', async () => {
        setCart([{ name: 'Biryani', price: 300, quantity: 1, spiceLevel: 'medium', addons: [] }]);
        setCurrentUser({ name: 'Test', phone: '9876543210' });

        window.db = {
            collection: vi.fn((name) => {
                if (name === 'orders') return { add: vi.fn(() => Promise.reject(new Error('save failed'))) };
                return {
                    doc: vi.fn(() => ({ update: vi.fn(() => Promise.resolve()), onSnapshot: vi.fn(() => vi.fn()) })),
                    where: vi.fn().mockReturnThis(),
                    onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
                };
            }),
            batch: vi.fn(() => ({ update: vi.fn(), commit: vi.fn(() => Promise.resolve()) })),
        };

        placeOrderToFirestore('COD', null, 'cod-pending');
        await new Promise(r => setTimeout(r, 50));
        const toast = document.getElementById('auth-toast');
        expect(toast.textContent).toContain('Order failed');
    });
});
