import { describe, it, expect, beforeEach } from 'vitest';
import { validateCoupon, calcDiscount, applyCoupon, removeCoupon } from '../src/modules/payment.js';

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
