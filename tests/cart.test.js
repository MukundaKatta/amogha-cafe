import { describe, it, expect, beforeEach } from 'vitest';
import {
    cart,
    finalizeAddToCart,
    updateQuantity,
    removeItem,
    saveCart,
    loadCart,
    getCheckoutTotal,
} from '../src/modules/cart.js';
import { COMBO_DISCOUNT, FREE_DELIVERY_THRESHOLD, DELIVERY_FEE } from '../src/core/constants.js';

// Helper to reset cart state between tests
function clearCart() {
    cart.length = 0;
}

describe('Cart — finalizeAddToCart', () => {
    beforeEach(() => {
        clearCart();
        localStorage.clear();
    });

    it('adds a new item to the cart', () => {
        finalizeAddToCart('Chicken Biryani', 249, 'medium', []);
        expect(cart).toHaveLength(1);
        expect(cart[0]).toMatchObject({ name: 'Chicken Biryani', price: 249, quantity: 1, spiceLevel: 'medium' });
    });

    it('increments quantity for an identical item (same name, spice, addons)', () => {
        finalizeAddToCart('Chicken Biryani', 249, 'medium', []);
        finalizeAddToCart('Chicken Biryani', 249, 'medium', []);
        expect(cart).toHaveLength(1);
        expect(cart[0].quantity).toBe(2);
    });

    it('treats items with different spice levels as separate cart entries', () => {
        finalizeAddToCart('Chicken Biryani', 249, 'mild', []);
        finalizeAddToCart('Chicken Biryani', 249, 'hot', []);
        expect(cart).toHaveLength(2);
    });

    it('treats items with different addons as separate cart entries', () => {
        finalizeAddToCart('Biryani', 249, 'medium', [{ name: 'Raita', price: 40 }]);
        finalizeAddToCart('Biryani', 249, 'medium', []);
        expect(cart).toHaveLength(2);
    });

    it('handles multiple different items', () => {
        finalizeAddToCart('Tea', 30, 'medium', []);
        finalizeAddToCart('Coffee', 40, 'medium', []);
        finalizeAddToCart('Butter Naan', 40, 'medium', []);
        expect(cart).toHaveLength(3);
    });

    it('stores addon data with the item', () => {
        finalizeAddToCart('Biryani', 249, 'medium', [{ name: 'Raita', price: 40 }]);
        expect(cart[0].addons).toHaveLength(1);
        expect(cart[0].addons[0].name).toBe('Raita');
    });
});

describe('Cart — updateQuantity', () => {
    beforeEach(() => {
        clearCart();
        localStorage.clear();
    });

    it('increments quantity', () => {
        finalizeAddToCart('Tea', 30, 'medium', []);
        updateQuantity(0, 1);
        expect(cart[0].quantity).toBe(2);
    });

    it('decrements quantity', () => {
        finalizeAddToCart('Tea', 30, 'medium', []);
        finalizeAddToCart('Tea', 30, 'medium', []);  // qty becomes 2
        updateQuantity(0, -1);
        expect(cart[0].quantity).toBe(1);
    });

    it('removes item when quantity reaches 0', () => {
        finalizeAddToCart('Tea', 30, 'medium', []);
        updateQuantity(0, -1);
        expect(cart).toHaveLength(0);
    });

    it('does not go below zero (splice removes at 0)', () => {
        finalizeAddToCart('Tea', 30, 'medium', []);
        updateQuantity(0, -1);
        expect(cart).toHaveLength(0);
    });
});

describe('Cart — removeItem', () => {
    beforeEach(() => {
        clearCart();
        localStorage.clear();
    });

    it('removes item at specified index', () => {
        finalizeAddToCart('Tea', 30, 'medium', []);
        finalizeAddToCart('Coffee', 40, 'medium', []);
        removeItem(0);
        expect(cart).toHaveLength(1);
        expect(cart[0].name).toBe('Coffee');
    });

    it('removes the only item leaving an empty cart', () => {
        finalizeAddToCart('Tea', 30, 'medium', []);
        removeItem(0);
        expect(cart).toHaveLength(0);
    });
});

describe('Cart — getCheckoutTotal', () => {
    beforeEach(() => {
        clearCart();
        window._appliedCoupon = null;
        localStorage.clear();
    });

    it('calculates subtotal correctly', () => {
        finalizeAddToCart('Chicken Biryani', 249, 'medium', []);
        finalizeAddToCart('Chicken Biryani', 249, 'medium', []);  // qty 2
        const totals = getCheckoutTotal();
        expect(totals.subtotal).toBe(498);
    });

    it('applies delivery fee when below threshold', () => {
        finalizeAddToCart('Tea', 30, 'medium', []);  // subtotal = 30, below 500
        const totals = getCheckoutTotal();
        expect(totals.deliveryFee).toBe(DELIVERY_FEE);
        expect(totals.total).toBe(30 + DELIVERY_FEE);
    });

    it('waives delivery fee when subtotal meets threshold', () => {
        finalizeAddToCart('Chicken Biryani', 249, 'medium', []);
        finalizeAddToCart('Chicken Biryani', 249, 'medium', []);
        finalizeAddToCart('Tea', 30, 'medium', []);
        // subtotal = 498 + 30 = 528 >= 500
        const totals = getCheckoutTotal();
        expect(totals.subtotal).toBeGreaterThanOrEqual(FREE_DELIVERY_THRESHOLD);
        expect(totals.deliveryFee).toBe(0);
    });

    it('applies percent coupon discount', () => {
        finalizeAddToCart('Chicken Biryani', 249, 'medium', []);
        finalizeAddToCart('Chicken Biryani', 249, 'medium', []);  // subtotal = 498
        const totals = getCheckoutTotal({ type: 'percent', discount: 20, active: true });
        expect(totals.discount).toBe(Math.floor(498 * 0.20));
    });

    it('applies flat coupon discount', () => {
        finalizeAddToCart('Chicken Biryani', 249, 'medium', []);
        finalizeAddToCart('Chicken Biryani', 249, 'medium', []);  // subtotal = 498
        const totals = getCheckoutTotal({ type: 'flat', discount: 50, active: true });
        expect(totals.discount).toBe(50);
    });

    it('caps discount at subtotal (discount cannot exceed order value)', () => {
        finalizeAddToCart('Tea', 30, 'medium', []);  // subtotal = 30
        const totals = getCheckoutTotal({ type: 'flat', discount: 100, active: true });
        expect(totals.discount).toBeLessThanOrEqual(30);
    });

    it('returns zero discount when no coupon applied', () => {
        finalizeAddToCart('Tea', 30, 'medium', []);
        const totals = getCheckoutTotal(null);
        expect(totals.discount).toBe(0);
    });
});

describe('Cart — localStorage persistence', () => {
    beforeEach(() => {
        clearCart();
        localStorage.clear();
    });

    it('saves and restores cart from localStorage', () => {
        finalizeAddToCart('Tea', 30, 'medium', []);
        finalizeAddToCart('Biryani', 249, 'medium', []);
        saveCart();
        clearCart();
        expect(cart).toHaveLength(0);
        loadCart();
        expect(cart).toHaveLength(2);
        expect(cart[0].name).toBe('Tea');
        expect(cart[1].name).toBe('Biryani');
    });

    it('handles empty cart save/load gracefully', () => {
        saveCart();
        loadCart();
        expect(cart).toHaveLength(0);
    });
});

describe('Combo discount constant', () => {
    it('COMBO_DISCOUNT is 15%', () => {
        expect(COMBO_DISCOUNT).toBe(0.15);
    });

    it('applying 15% discount reduces price correctly', () => {
        const comboTotal = 249 + 200 + 40;  // biryani + starter + drink = 489
        const discounted = Math.round(comboTotal * (1 - COMBO_DISCOUNT));
        expect(discounted).toBe(Math.round(489 * 0.85));
    });
});
