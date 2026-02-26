import { describe, it, expect } from 'vitest';
import { validateCoupon, calcDiscount } from '../src/modules/payment.js';

describe('validateCoupon', () => {
    const baseCoupon = {
        active: true,
        type: 'percent',
        discount: 20,
    };

    it('accepts a valid coupon', () => {
        const result = validateCoupon(baseCoupon, 500);
        expect(result.valid).toBe(true);
    });

    it('rejects null/undefined coupon', () => {
        expect(validateCoupon(null, 500).valid).toBe(false);
        expect(validateCoupon(undefined, 500).valid).toBe(false);
    });

    it('rejects inactive coupon', () => {
        const result = validateCoupon({ ...baseCoupon, active: false }, 500);
        expect(result.valid).toBe(false);
        expect(result.reason).toMatch(/active/i);
    });

    it('rejects expired coupon (expiresAt in the past)', () => {
        const yesterday = new Date(Date.now() - 86400000).toISOString();
        const result = validateCoupon({ ...baseCoupon, expiresAt: yesterday }, 500);
        expect(result.valid).toBe(false);
        expect(result.reason).toMatch(/expired/i);
    });

    it('accepts coupon with future expiry', () => {
        const tomorrow = new Date(Date.now() + 86400000).toISOString();
        const result = validateCoupon({ ...baseCoupon, expiresAt: tomorrow }, 500);
        expect(result.valid).toBe(true);
    });

    it('rejects coupon that exceeded usage limit', () => {
        const result = validateCoupon({ ...baseCoupon, usageLimit: 10, usedCount: 10 }, 500);
        expect(result.valid).toBe(false);
        expect(result.reason).toMatch(/usage limit/i);
    });

    it('accepts coupon under usage limit', () => {
        const result = validateCoupon({ ...baseCoupon, usageLimit: 10, usedCount: 9 }, 500);
        expect(result.valid).toBe(true);
    });

    it('rejects coupon when order is below minOrder', () => {
        const result = validateCoupon({ ...baseCoupon, minOrder: 500 }, 400);
        expect(result.valid).toBe(false);
        expect(result.reason).toMatch(/minimum order/i);
    });

    it('accepts coupon when order meets minOrder exactly', () => {
        const result = validateCoupon({ ...baseCoupon, minOrder: 500 }, 500);
        expect(result.valid).toBe(true);
    });

    it('accepts coupon with no expiry or usage limit', () => {
        const result = validateCoupon({ active: true, type: 'flat', discount: 50 }, 200);
        expect(result.valid).toBe(true);
    });
});

describe('calcDiscount', () => {
    it('calculates percent discount correctly', () => {
        expect(calcDiscount({ type: 'percent', discount: 20 }, 500)).toBe(100);
    });

    it('calculates flat discount correctly', () => {
        expect(calcDiscount({ type: 'flat', discount: 50 }, 500)).toBe(50);
    });

    it('caps flat discount at subtotal (prevents negative totals)', () => {
        expect(calcDiscount({ type: 'flat', discount: 1000 }, 300)).toBe(300);
    });

    it('applies maxDiscount cap on percent coupons', () => {
        // 50% of 500 = 250, but maxDiscount = 100
        expect(calcDiscount({ type: 'percent', discount: 50, maxDiscount: 100 }, 500)).toBe(100);
    });

    it('does not cap percent discount if under maxDiscount', () => {
        // 10% of 500 = 50, maxDiscount = 100 → no cap
        expect(calcDiscount({ type: 'percent', discount: 10, maxDiscount: 100 }, 500)).toBe(50);
    });

    it('returns 0 for null coupon', () => {
        expect(calcDiscount(null, 500)).toBe(0);
    });

    it('AMOGHA20 equivalent: 20% off Rs.300 = Rs.60', () => {
        expect(calcDiscount({ type: 'percent', discount: 20 }, 300)).toBe(60);
    });

    it('WELCOME25 equivalent: 25% off Rs.400 = Rs.100', () => {
        expect(calcDiscount({ type: 'percent', discount: 25 }, 400)).toBe(100);
    });

    it('FLAT50 equivalent: Rs.50 flat off Rs.200 = Rs.50', () => {
        expect(calcDiscount({ type: 'flat', discount: 50 }, 200)).toBe(50);
    });
});
