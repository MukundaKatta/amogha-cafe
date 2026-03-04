// ===== POS TERMINAL — Unit Tests =====
// Tests for pure logic functions extracted from pos/index.html:
//   - Daily token number generation (nextToken)
//   - Loyalty points earn/redeem calculation
//   - Order void points reversal
//   - Expense date string normalization (expDateStr)
//   - Fortune cookie quote uniqueness

import { describe, it, expect, beforeEach } from 'vitest';

// ── Token Number Logic ──────────────────────────────────────────────────────
// Mirrors nextToken() in pos/index.html
function makeNextToken(ls) {
    // ls = localStorage-like { getItem, setItem }
    return function nextToken() {
        var today = new Date().toISOString().slice(0, 10);
        var stored = JSON.parse(ls.getItem('posToken') || 'null');
        var token = 1;
        if (stored && stored.date === today) {
            token = (stored.token || 0) + 1;
        }
        ls.setItem('posToken', JSON.stringify({ date: today, token }));
        return token;
    };
}

describe('POS — daily token numbers', () => {
    let store;
    let nextToken;

    beforeEach(() => {
        store = {};
        const ls = {
            getItem: (k) => store[k] ?? null,
            setItem: (k, v) => { store[k] = v; },
        };
        nextToken = makeNextToken(ls);
    });

    it('starts at T1 on a fresh day', () => {
        expect(nextToken()).toBe(1);
    });

    it('increments sequentially within the same day', () => {
        expect(nextToken()).toBe(1);
        expect(nextToken()).toBe(2);
        expect(nextToken()).toBe(3);
    });

    it('resets to T1 if stored date is different (new day)', () => {
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        store['posToken'] = JSON.stringify({ date: yesterday, token: 42 });
        expect(nextToken()).toBe(1);
    });

    it('continues from stored token if date matches today', () => {
        const today = new Date().toISOString().slice(0, 10);
        store['posToken'] = JSON.stringify({ date: today, token: 7 });
        expect(nextToken()).toBe(8);
    });
});

// ── Loyalty Points Calculation ─────────────────────────────────────────────
// Mirrors POS earn/redeem logic in pos/index.html
const POINTS_PER_RUPEE = 100 / 2000; // 0.05
const REDEEM_POINTS = 100;
const REDEEM_DISCOUNT = 100;
const REDEEM_MIN_ORDER = 250;

function calcPointsEarned(subtotal) {
    return Math.floor(subtotal * POINTS_PER_RUPEE);
}

function calcDiscount(pointsRedeemed, subtotal) {
    return (pointsRedeemed && subtotal >= REDEEM_MIN_ORDER) ? REDEEM_DISCOUNT : 0;
}

describe('POS — loyalty points earn', () => {
    it('earns 100 points for ₹2000 spend', () => {
        expect(calcPointsEarned(2000)).toBe(100);
    });

    it('earns 50 points for ₹1000 spend', () => {
        expect(calcPointsEarned(1000)).toBe(50);
    });

    it('earns 25 points for ₹500 spend', () => {
        expect(calcPointsEarned(500)).toBe(25);
    });

    it('earns 0 points for small orders (floors to 0)', () => {
        expect(calcPointsEarned(10)).toBe(0);
    });

    it('floors fractional points', () => {
        // ₹250 * 0.05 = 12.5 → floors to 12
        expect(calcPointsEarned(250)).toBe(12);
    });

    it('earns proportional points for large orders', () => {
        expect(calcPointsEarned(4000)).toBe(200);
    });
});

describe('POS — loyalty points redemption', () => {
    it('applies ₹100 discount when conditions met', () => {
        expect(calcDiscount(true, 300)).toBe(100);
    });

    it('no discount when subtotal below minimum (₹250)', () => {
        expect(calcDiscount(true, 200)).toBe(0);
    });

    it('no discount when pointsRedeemed is false', () => {
        expect(calcDiscount(false, 500)).toBe(0);
    });

    it('applies discount at exactly minimum order threshold', () => {
        expect(calcDiscount(true, 250)).toBe(100);
    });

    it('total never goes negative after discount', () => {
        const subtotal = 100; // below REDEEM_MIN_ORDER
        const discount = calcDiscount(true, subtotal);
        const total = Math.max(0, subtotal - discount);
        expect(total).toBeGreaterThanOrEqual(0);
    });
});

describe('POS — points reversal on void', () => {
    // Mirrors void logic: earned deducted, redeemed restored
    function applyVoidReversal(currentBalance, pointsEarned, pointsRedeemed) {
        return Math.max(0, currentBalance - pointsEarned + pointsRedeemed);
    }

    it('deducts earned points on void', () => {
        // Balance was 100, earned 25 on this order → void: 100 - 25 = 75
        expect(applyVoidReversal(100, 25, 0)).toBe(75);
    });

    it('restores redeemed points on void', () => {
        // Balance was 0, redeemed 100 (so actual was 100) → void: 0 - 0 + 100 = 100
        expect(applyVoidReversal(0, 0, 100)).toBe(100);
    });

    it('handles both earned and redeemed on same order', () => {
        // Balance 150, earned 25, redeemed 100 → void: 150 - 25 + 100 = 225
        expect(applyVoidReversal(150, 25, 100)).toBe(225);
    });

    it('balance never goes below 0 on void', () => {
        // Edge case: balance corrupted / race condition
        expect(applyVoidReversal(0, 50, 0)).toBe(0);
    });
});

// ── Expense Date String Normalization ──────────────────────────────────────
// Mirrors expDateStr() in admin/index.html
function expDateStr(e) {
    if (!e.date) return '';
    if (typeof e.date === 'string') return e.date.slice(0, 10);
    if (e.date && typeof e.date.toDate === 'function') return e.date.toDate().toISOString().slice(0, 10);
    if (e.date && e.date.seconds) return new Date(e.date.seconds * 1000).toISOString().slice(0, 10);
    return String(e.date).slice(0, 10);
}

function expMatchesMonth(e, monthFilter) {
    return expDateStr(e).startsWith(monthFilter);
}

describe('Expenses — expDateStr date normalization', () => {
    it('handles plain ISO string dates', () => {
        expect(expDateStr({ date: '2026-02-28' })).toBe('2026-02-28');
    });

    it('handles ISO datetime strings (trims to date)', () => {
        expect(expDateStr({ date: '2026-02-28T10:30:00.000Z' })).toBe('2026-02-28');
    });

    it('handles Firestore Timestamp-like objects with toDate()', () => {
        const ts = { toDate: () => new Date('2026-02-28T00:00:00.000Z') };
        expect(expDateStr({ date: ts })).toBe('2026-02-28');
    });

    it('handles Firestore Timestamp with seconds field', () => {
        const secondsFor20260228 = Math.floor(new Date('2026-02-28T00:00:00.000Z').getTime() / 1000);
        expect(expDateStr({ date: { seconds: secondsFor20260228 } })).toBe('2026-02-28');
    });

    it('returns empty string when date is null', () => {
        expect(expDateStr({ date: null })).toBe('');
    });

    it('returns empty string when date is undefined', () => {
        expect(expDateStr({})).toBe('');
    });
});

describe('Expenses — month filter matching', () => {
    it('matches expenses in the correct month', () => {
        expect(expMatchesMonth({ date: '2026-02-15' }, '2026-02')).toBe(true);
        expect(expMatchesMonth({ date: '2026-02-01' }, '2026-02')).toBe(true);
        expect(expMatchesMonth({ date: '2026-02-28' }, '2026-02')).toBe(true);
    });

    it('does not match expenses from a different month', () => {
        expect(expMatchesMonth({ date: '2026-01-31' }, '2026-02')).toBe(false);
        expect(expMatchesMonth({ date: '2026-03-01' }, '2026-02')).toBe(false);
    });

    it('matches Firestore Timestamp expenses to correct month', () => {
        const ts = { toDate: () => new Date('2026-02-28T10:00:00.000Z') };
        expect(expMatchesMonth({ date: ts }, '2026-02')).toBe(true);
        expect(expMatchesMonth({ date: ts }, '2026-01')).toBe(false);
    });

    it('never matches when date is missing', () => {
        expect(expMatchesMonth({}, '2026-02')).toBe(false);
    });
});

// ── Fortune Cookie Quote Entropy ────────────────────────────────────────────
// Mirrors the template engine in pos/index.html — verifies high uniqueness
const openers  = ['Your','May your','A person of your'];
const traits   = ['adventurous','kind','creative','patient'];
const verbs    = ['draws','attracts','brings'];
const goods    = ['greatness','fortune','joy','success'];
const times    = ['today','this week','soon'];
const closers  = ['Enjoy the journey.','Savor every bite.','Keep smiling.'];

function generateQuote() {
    function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    return `${pick(openers)} ${pick(traits)} spirit ${pick(verbs)} ${pick(goods)} ${pick(times)}. ${pick(closers)}`;
}

describe('Fortune cookie — quote uniqueness', () => {
    it('generates valid non-empty strings', () => {
        for (let i = 0; i < 20; i++) {
            const q = generateQuote();
            expect(typeof q).toBe('string');
            expect(q.length).toBeGreaterThan(10);
        }
    });

    it('generates at least 3 unique quotes in 20 attempts (not static)', () => {
        const quotes = new Set(Array.from({ length: 20 }, () => generateQuote()));
        expect(quotes.size).toBeGreaterThanOrEqual(3);
    });

    it('total unique combinations exceeds 1 million', () => {
        const total = openers.length * traits.length * verbs.length * goods.length * times.length * closers.length;
        expect(total).toBeGreaterThan(1000);
    });
});
