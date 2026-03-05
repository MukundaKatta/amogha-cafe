import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    validateCoupon,
    calcDiscount,
    getCheckoutTotals,
    checkout,
    addUpsellItem,
} from '../src/modules/payment.js';
import { cart } from '../src/modules/cart.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

function setCart(items) {
    cart.length = 0;
    items.forEach((i) => cart.push(i));
}

function clearCart() {
    cart.length = 0;
}

// DOM used by addUpsellItem → openCheckout + updateFloatingCart + updateCartCount
const CHECKOUT_DOM = `
    <div id="floating-cart"><div class="fc-items"></div><div class="fc-total"></div></div>
    <div id="checkout-items"></div>
    <span id="co-subtotal"></span>
    <span id="co-delivery"></span>
    <span id="co-total"></span>
    <div id="checkout-modal" style="display:none"></div>
    <div id="checkout-step-1" class="checkout-step"></div>
    <div id="checkout-step-2" class="checkout-step"></div>
    <div id="checkout-step-3" class="checkout-step"></div>
    <div id="checkout-step-4" class="checkout-step"></div>
    <input id="coupon-code" value="">
    <div id="coupon-msg"></div>
    <span id="cart-count">0</span>
    <span id="cart-items-count">0</span>
    <div id="cart-fab"><span class="cart-fab-badge">0</span></div>
    <div id="auth-toast"></div>
`;

// DOM used by checkout()
const CHECKOUT_GUARD_DOM = `
    <div id="cart-modal" style="display:block"></div>
    <div id="auth-toast"></div>
`;

// ═══════════════════════════════════════════════════════════════════════════
// validateCoupon — pure function, no DOM or Firestore required
// ═══════════════════════════════════════════════════════════════════════════
describe('validateCoupon', () => {
    it('returns invalid when couponData is null', () => {
        const r = validateCoupon(null, 300);
        expect(r.valid).toBe(false);
    });

    it('returns invalid when coupon is not active', () => {
        const r = validateCoupon({ active: false, type: 'percent', discount: 10 }, 300);
        expect(r.valid).toBe(false);
        expect(r.reason).toMatch(/no longer active/i);
    });

    it('returns invalid when coupon has expired', () => {
        const pastDate = new Date(Date.now() - 86400000).toISOString(); // yesterday
        const r = validateCoupon({ active: true, expiresAt: pastDate }, 300);
        expect(r.valid).toBe(false);
        expect(r.reason).toMatch(/expired/i);
    });

    it('returns valid when expiry is in the future', () => {
        const futureDate = new Date(Date.now() + 86400000).toISOString(); // tomorrow
        const r = validateCoupon({ active: true, expiresAt: futureDate, type: 'flat', discount: 20 }, 300);
        expect(r.valid).toBe(true);
    });

    it('returns invalid when usage limit is reached', () => {
        const r = validateCoupon({ active: true, usageLimit: 10, usedCount: 10, type: 'flat', discount: 20 }, 300);
        expect(r.valid).toBe(false);
        expect(r.reason).toMatch(/usage limit/i);
    });

    it('returns valid when usage count is below limit', () => {
        const r = validateCoupon({ active: true, usageLimit: 10, usedCount: 5, type: 'flat', discount: 20 }, 300);
        expect(r.valid).toBe(true);
    });

    it('returns invalid when subtotal is below minimum order amount', () => {
        const r = validateCoupon({ active: true, minOrder: 500, type: 'flat', discount: 50 }, 300);
        expect(r.valid).toBe(false);
        expect(r.reason).toMatch(/minimum order/i);
        expect(r.reason).toContain('500');
    });

    it('returns valid when subtotal meets minimum order amount exactly', () => {
        const r = validateCoupon({ active: true, minOrder: 500, type: 'flat', discount: 50 }, 500);
        expect(r.valid).toBe(true);
    });

    it('returns valid for fully valid percent coupon', () => {
        const r = validateCoupon({ active: true, type: 'percent', discount: 20 }, 400);
        expect(r.valid).toBe(true);
    });

    it('returns valid for flat coupon with no restrictions', () => {
        const r = validateCoupon({ active: true, type: 'flat', discount: 50 }, 200);
        expect(r.valid).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// calcDiscount — pure function, no DOM required
// ═══════════════════════════════════════════════════════════════════════════
describe('calcDiscount', () => {
    it('returns 0 when couponData is null', () => {
        expect(calcDiscount(null, 500)).toBe(0);
    });

    it('calculates flat discount correctly', () => {
        expect(calcDiscount({ type: 'flat', discount: 100 }, 500)).toBe(100);
    });

    it('calculates percent discount correctly', () => {
        expect(calcDiscount({ type: 'percent', discount: 20 }, 500)).toBe(100);
    });

    it('caps percent discount at maxDiscount', () => {
        const coupon = { type: 'percent', discount: 50, maxDiscount: 100 };
        // 50% of 500 = 250, but capped at 100
        expect(calcDiscount(coupon, 500)).toBe(100);
    });

    it('does not apply maxDiscount cap to flat coupons', () => {
        const coupon = { type: 'flat', discount: 150, maxDiscount: 100 };
        // flat ignores maxDiscount
        expect(calcDiscount(coupon, 500)).toBe(150);
    });

    it('caps discount to subtotal (cannot exceed order value)', () => {
        const coupon = { type: 'flat', discount: 1000 };
        expect(calcDiscount(coupon, 300)).toBe(300);
    });

    it('handles zero percent correctly', () => {
        expect(calcDiscount({ type: 'percent', discount: 0 }, 500)).toBe(0);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// getCheckoutTotals — reads from shared cart state
// ═══════════════════════════════════════════════════════════════════════════
describe('getCheckoutTotals', () => {
    beforeEach(() => {
        clearCart();
    });

    it('returns zero subtotal, delivery fee, and total for empty cart', () => {
        // Empty cart: subtotal=0, 0 < ₹500 so deliveryFee=49, total=49
        const t = getCheckoutTotals();
        expect(t.subtotal).toBe(0);
        expect(t.deliveryFee).toBe(49);
        expect(t.discount).toBe(0);
        expect(t.total).toBe(49);
    });

    it('charges delivery fee when subtotal is below ₹500', () => {
        setCart([{ name: 'Tea', price: 30, quantity: 3 }]); // subtotal = 90
        const t = getCheckoutTotals();
        expect(t.subtotal).toBe(90);
        expect(t.deliveryFee).toBe(49);
        expect(t.total).toBe(139);
    });

    it('waives delivery fee when subtotal is exactly ₹500', () => {
        setCart([{ name: 'Biryani', price: 250, quantity: 2 }]); // 500
        const t = getCheckoutTotals();
        expect(t.subtotal).toBe(500);
        expect(t.deliveryFee).toBe(0);
        expect(t.total).toBe(500);
    });

    it('waives delivery fee when subtotal exceeds ₹500', () => {
        setCart([{ name: 'Biryani', price: 350, quantity: 2 }]); // 700
        const t = getCheckoutTotals();
        expect(t.subtotal).toBe(700);
        expect(t.deliveryFee).toBe(0);
        expect(t.total).toBe(700);
    });

    it('calculates correct subtotal for multiple items with quantities', () => {
        setCart([
            { name: 'Biryani', price: 249, quantity: 2 },
            { name: 'Raita', price: 40, quantity: 1 },
        ]); // 498 + 40 = 538
        const t = getCheckoutTotals();
        expect(t.subtotal).toBe(538);
        expect(t.deliveryFee).toBe(0);
        expect(t.total).toBe(538);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// checkout — guard logic (empty cart, no user)
// ═══════════════════════════════════════════════════════════════════════════
describe('checkout', () => {
    beforeEach(() => {
        clearCart();
        localStorage.removeItem('amoghaUser');
        document.body.innerHTML = CHECKOUT_GUARD_DOM;
        // Restore real getElementById backed by jsdom
        document.getElementById = (id) => document.body.querySelector('#' + id);
        document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
    });

    it('shows toast and returns early when cart is empty', () => {
        const toasts = [];
        window.openAuthModal = vi.fn();
        // Observe the toast element after showAuthToast sets its textContent
        const origShowAuthToast = window.showAuthToast;
        let toastMsg = '';
        // showAuthToast is a module-level import — intercept via DOM toast element
        checkout();
        const toastEl = document.getElementById('auth-toast');
        expect(toastEl).not.toBeNull();
        expect(toastEl.textContent).toMatch(/empty/i);
    });

    it('prompts sign-in when cart has items but user is not logged in', () => {
        setCart([{ name: 'Biryani', price: 249, quantity: 1 }]);
        window.openAuthModal = vi.fn();
        checkout();
        const toastEl = document.getElementById('auth-toast');
        expect(toastEl.textContent).toMatch(/sign in/i);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// addUpsellItem — modifies cart and calls cart helpers
// ═══════════════════════════════════════════════════════════════════════════
describe('addUpsellItem', () => {
    beforeEach(() => {
        clearCart();
        document.body.innerHTML = CHECKOUT_DOM;
        // Restore real DOM access
        document.getElementById = (id) => document.body.querySelector('#' + id);
        document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
        document.querySelector = (sel) => document.body.querySelector(sel);
        localStorage.removeItem('amoghaUser'); // no user → openCheckout won't auto-apply welcome bonus
    });

    it('adds a new item to cart when item is not already in cart', () => {
        addUpsellItem('Lassi', 80);
        expect(cart).toHaveLength(1);
        expect(cart[0].name).toBe('Lassi');
        expect(cart[0].price).toBe(80);
        expect(cart[0].quantity).toBe(1);
    });

    it('increments quantity when item already exists in cart', () => {
        setCart([{ name: 'Lassi', price: 80, quantity: 2, spiceLevel: 'medium', addons: [] }]);
        addUpsellItem('Lassi', 80);
        expect(cart).toHaveLength(1);
        expect(cart[0].quantity).toBe(3);
    });

    it('adds new item without affecting other cart items', () => {
        setCart([{ name: 'Biryani', price: 249, quantity: 1, spiceLevel: 'medium', addons: [] }]);
        addUpsellItem('Raita', 40);
        expect(cart).toHaveLength(2);
        expect(cart[0].name).toBe('Biryani');
        expect(cart[1].name).toBe('Raita');
    });

    it('shows toast with item name after adding', () => {
        addUpsellItem('Gulab Jamun', 60);
        const toastEl = document.getElementById('auth-toast');
        expect(toastEl.textContent).toContain('Gulab Jamun');
    });

    it('sets default spiceLevel and addons on new upsell item', () => {
        addUpsellItem('Chai', 30);
        const item = cart.find((i) => i.name === 'Chai');
        expect(item).toBeDefined();
        expect(item.spiceLevel).toBe('medium');
        expect(Array.isArray(item.addons)).toBe(true);
    });
});
