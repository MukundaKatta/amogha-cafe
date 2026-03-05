import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    getBadgeDefinitions,
    checkAndAwardBadges,
    openBadgeGallery,
    closeBadgeGallery,
    initBadges,
} from '../src/modules/badges.js';
import { setCurrentUser, getCurrentUser } from '../src/modules/auth.js';

function setupDOM(html) {
    document.body.innerHTML = html || '<div id="auth-toast"></div>';
    document.getElementById = (id) => document.body.querySelector('#' + id);
    document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
    document.querySelector = (sel) => document.body.querySelector(sel);
}

function mockDb() {
    window.db = {
        collection: vi.fn(() => ({
            doc: vi.fn(() => ({
                update: vi.fn(() => Promise.resolve()),
                onSnapshot: vi.fn(() => vi.fn()),
            })),
            where: vi.fn().mockReturnThis(),
            onSnapshot: vi.fn((cb) => {
                cb({ docChanges: () => [] });
                return vi.fn();
            }),
        })),
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// getBadgeDefinitions
// ═══════════════════════════════════════════════════════════════════════════

describe('getBadgeDefinitions', () => {
    it('returns an array of exactly 10 badges', () => {
        const defs = getBadgeDefinitions();
        expect(Array.isArray(defs)).toBe(true);
        expect(defs).toHaveLength(10);
    });

    it('each badge has id, name, description, and icon fields', () => {
        const defs = getBadgeDefinitions();
        defs.forEach((badge) => {
            expect(badge).toHaveProperty('id');
            expect(badge).toHaveProperty('name');
            expect(badge).toHaveProperty('description');
            expect(badge).toHaveProperty('icon');
        });
    });

    it('returns a copy, not the original array reference', () => {
        const first = getBadgeDefinitions();
        const second = getBadgeDefinitions();
        expect(first).not.toBe(second);
    });

    it('mutating the returned array does not affect subsequent calls', () => {
        const copy = getBadgeDefinitions();
        copy.push({ id: 'fake', name: 'Fake', description: 'Fake badge', icon: '?' });
        expect(getBadgeDefinitions()).toHaveLength(10);
    });

    it('contains all expected badge ids', () => {
        const ids = getBadgeDefinitions().map((b) => b.id);
        expect(ids).toContain('first_bite');
        expect(ids).toContain('regular');
        expect(ids).toContain('foodie');
        expect(ids).toContain('super_fan');
        expect(ids).toContain('explorer');
        expect(ids).toContain('streak_master');
        expect(ids).toContain('big_spender');
        expect(ids).toContain('critic');
        expect(ids).toContain('night_owl');
        expect(ids).toContain('early_bird');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// initBadges
// ═══════════════════════════════════════════════════════════════════════════

describe('initBadges', () => {
    it('does not throw when called', () => {
        expect(() => initBadges()).not.toThrow();
    });

    it('returns undefined', () => {
        expect(initBadges()).toBeUndefined();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// checkAndAwardBadges — null / no user
// ═══════════════════════════════════════════════════════════════════════════

describe('checkAndAwardBadges — null user', () => {
    beforeEach(() => {
        localStorage.clear();
        setupDOM('<div id="auth-toast"></div>');
        mockDb();
    });

    it('does nothing and does not throw when user is null', () => {
        expect(() => checkAndAwardBadges(null, {})).not.toThrow();
    });

    it('does not modify localStorage when user is null', () => {
        checkAndAwardBadges(null, { total: 2000 });
        expect(getCurrentUser()).toBeNull();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// checkAndAwardBadges — first_bite
// ═══════════════════════════════════════════════════════════════════════════

describe('checkAndAwardBadges — first_bite badge', () => {
    beforeEach(() => {
        localStorage.clear();
        setupDOM('<div id="auth-toast"></div>');
        mockDb();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('awards first_bite on first order (no prior orderDates)', () => {
        setCurrentUser({ name: 'Ravi', phone: '9000000001', orderDates: [] });
        const user = getCurrentUser();
        checkAndAwardBadges(user, { total: 200, items: [] });
        vi.runAllTimers();
        const updated = getCurrentUser();
        expect(updated.badges).toBeDefined();
        expect(updated.badges.some((b) => b.badgeId === 'first_bite')).toBe(true);
    });

    it('awards first_bite when orderDates is undefined', () => {
        setCurrentUser({ name: 'Ravi', phone: '9000000001' });
        const user = getCurrentUser();
        checkAndAwardBadges(user, { total: 100, items: [] });
        vi.runAllTimers();
        const updated = getCurrentUser();
        expect(updated.badges.some((b) => b.badgeId === 'first_bite')).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// checkAndAwardBadges — regular (5 orders)
// ═══════════════════════════════════════════════════════════════════════════

describe('checkAndAwardBadges — regular badge', () => {
    beforeEach(() => {
        localStorage.clear();
        setupDOM('<div id="auth-toast"></div>');
        mockDb();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('awards regular badge when user has 4 prior order dates (reaches 5 with current)', () => {
        const today = new Date();
        const pastDates = [];
        for (let i = 4; i >= 1; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            pastDates.push(d.toISOString().split('T')[0]);
        }
        setCurrentUser({ name: 'Priya', phone: '9000000002', orderDates: pastDates });
        const user = getCurrentUser();
        checkAndAwardBadges(user, { total: 300, items: [] });
        vi.runAllTimers();
        const updated = getCurrentUser();
        expect(updated.badges.some((b) => b.badgeId === 'regular')).toBe(true);
    });

    it('does not award regular badge when user has only 3 prior order dates', () => {
        const today = new Date();
        const pastDates = [];
        for (let i = 3; i >= 1; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            pastDates.push(d.toISOString().split('T')[0]);
        }
        setCurrentUser({ name: 'Priya', phone: '9000000002', orderDates: pastDates });
        const user = getCurrentUser();
        checkAndAwardBadges(user, { total: 300, items: [] });
        vi.runAllTimers();
        const updated = getCurrentUser();
        const hasBadge = updated.badges && updated.badges.some((b) => b.badgeId === 'regular');
        expect(hasBadge).toBeFalsy();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// checkAndAwardBadges — foodie (10 orders)
// ═══════════════════════════════════════════════════════════════════════════

describe('checkAndAwardBadges — foodie badge', () => {
    beforeEach(() => {
        localStorage.clear();
        setupDOM('<div id="auth-toast"></div>');
        mockDb();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('awards foodie badge when user reaches 10 total orders', () => {
        const today = new Date();
        const pastDates = [];
        for (let i = 9; i >= 1; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            pastDates.push(d.toISOString().split('T')[0]);
        }
        setCurrentUser({ name: 'Anand', phone: '9000000003', orderDates: pastDates });
        const user = getCurrentUser();
        checkAndAwardBadges(user, { total: 400, items: [] });
        vi.runAllTimers();
        const updated = getCurrentUser();
        expect(updated.badges.some((b) => b.badgeId === 'foodie')).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// checkAndAwardBadges — super_fan (25 orders)
// ═══════════════════════════════════════════════════════════════════════════

describe('checkAndAwardBadges — super_fan badge', () => {
    beforeEach(() => {
        localStorage.clear();
        setupDOM('<div id="auth-toast"></div>');
        mockDb();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('awards super_fan badge when user reaches 25 total orders', () => {
        const today = new Date();
        const pastDates = [];
        for (let i = 24; i >= 1; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            pastDates.push(d.toISOString().split('T')[0]);
        }
        setCurrentUser({ name: 'Deepa', phone: '9000000004', orderDates: pastDates });
        const user = getCurrentUser();
        checkAndAwardBadges(user, { total: 500, items: [] });
        vi.runAllTimers();
        const updated = getCurrentUser();
        expect(updated.badges.some((b) => b.badgeId === 'super_fan')).toBe(true);
    });

    it('does not award super_fan badge for only 10 orders', () => {
        const today = new Date();
        const pastDates = [];
        for (let i = 9; i >= 1; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            pastDates.push(d.toISOString().split('T')[0]);
        }
        setCurrentUser({ name: 'Deepa', phone: '9000000004', orderDates: pastDates });
        const user = getCurrentUser();
        checkAndAwardBadges(user, { total: 500, items: [] });
        vi.runAllTimers();
        const updated = getCurrentUser();
        const hasBadge = updated.badges && updated.badges.some((b) => b.badgeId === 'super_fan');
        expect(hasBadge).toBeFalsy();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// checkAndAwardBadges — big_spender
// ═══════════════════════════════════════════════════════════════════════════

describe('checkAndAwardBadges — big_spender badge', () => {
    beforeEach(() => {
        localStorage.clear();
        setupDOM('<div id="auth-toast"></div>');
        mockDb();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('awards big_spender when order total is over 1000', () => {
        setCurrentUser({ name: 'Suresh', phone: '9000000005', orderDates: [] });
        const user = getCurrentUser();
        checkAndAwardBadges(user, { total: 1500, items: [] });
        vi.runAllTimers();
        const updated = getCurrentUser();
        expect(updated.badges.some((b) => b.badgeId === 'big_spender')).toBe(true);
    });

    it('awards big_spender for order total exactly 1001', () => {
        setCurrentUser({ name: 'Suresh', phone: '9000000005', orderDates: [] });
        const user = getCurrentUser();
        checkAndAwardBadges(user, { total: 1001, items: [] });
        vi.runAllTimers();
        const updated = getCurrentUser();
        expect(updated.badges.some((b) => b.badgeId === 'big_spender')).toBe(true);
    });

    it('does NOT award big_spender for order total of exactly 1000', () => {
        setCurrentUser({ name: 'Suresh', phone: '9000000005', orderDates: [] });
        const user = getCurrentUser();
        checkAndAwardBadges(user, { total: 1000, items: [] });
        vi.runAllTimers();
        const updated = getCurrentUser();
        const hasBadge = updated.badges && updated.badges.some((b) => b.badgeId === 'big_spender');
        expect(hasBadge).toBeFalsy();
    });

    it('does NOT award big_spender for order total under 1000', () => {
        setCurrentUser({ name: 'Suresh', phone: '9000000005', orderDates: [] });
        const user = getCurrentUser();
        checkAndAwardBadges(user, { total: 800, items: [] });
        vi.runAllTimers();
        const updated = getCurrentUser();
        const hasBadge = updated.badges && updated.badges.some((b) => b.badgeId === 'big_spender');
        expect(hasBadge).toBeFalsy();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// checkAndAwardBadges — critic
// ═══════════════════════════════════════════════════════════════════════════

describe('checkAndAwardBadges — critic badge', () => {
    beforeEach(() => {
        localStorage.clear();
        setupDOM('<div id="auth-toast"></div>');
        mockDb();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('awards critic badge when reviewCount is 5', () => {
        setCurrentUser({ name: 'Kavitha', phone: '9000000006', orderDates: [], reviewCount: 5 });
        const user = getCurrentUser();
        checkAndAwardBadges(user, { total: 200, items: [] });
        vi.runAllTimers();
        const updated = getCurrentUser();
        expect(updated.badges.some((b) => b.badgeId === 'critic')).toBe(true);
    });

    it('awards critic badge when reviewCount exceeds 5', () => {
        setCurrentUser({ name: 'Kavitha', phone: '9000000006', orderDates: [], reviewCount: 8 });
        const user = getCurrentUser();
        checkAndAwardBadges(user, { total: 200, items: [] });
        vi.runAllTimers();
        const updated = getCurrentUser();
        expect(updated.badges.some((b) => b.badgeId === 'critic')).toBe(true);
    });

    it('does NOT award critic badge when reviewCount is 4', () => {
        setCurrentUser({ name: 'Kavitha', phone: '9000000006', orderDates: [], reviewCount: 4 });
        const user = getCurrentUser();
        checkAndAwardBadges(user, { total: 200, items: [] });
        vi.runAllTimers();
        const updated = getCurrentUser();
        const hasBadge = updated.badges && updated.badges.some((b) => b.badgeId === 'critic');
        expect(hasBadge).toBeFalsy();
    });

    it('does NOT award critic badge when reviewCount is absent', () => {
        setCurrentUser({ name: 'Kavitha', phone: '9000000006', orderDates: [] });
        const user = getCurrentUser();
        checkAndAwardBadges(user, { total: 200, items: [] });
        vi.runAllTimers();
        const updated = getCurrentUser();
        const hasBadge = updated.badges && updated.badges.some((b) => b.badgeId === 'critic');
        expect(hasBadge).toBeFalsy();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// checkAndAwardBadges — explorer
// ═══════════════════════════════════════════════════════════════════════════

describe('checkAndAwardBadges — explorer badge', () => {
    beforeEach(() => {
        localStorage.clear();
        setupDOM('<div id="auth-toast"></div>');
        mockDb();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('awards explorer when all 8 menu categories have been ordered', () => {
        const allCategories = ['starters', 'curries', 'biryani', 'tandoor', 'noodles', 'rice', 'breads', 'beverages'];
        setCurrentUser({
            name: 'Meera',
            phone: '9000000007',
            orderDates: [],
            categoriesOrdered: allCategories.slice(0, 7),
        });
        const user = getCurrentUser();
        const order = {
            total: 300,
            items: [{ category: 'beverages' }],
        };
        checkAndAwardBadges(user, order);
        vi.runAllTimers();
        const updated = getCurrentUser();
        expect(updated.badges.some((b) => b.badgeId === 'explorer')).toBe(true);
    });

    it('awards explorer when order items complete all categories from scratch', () => {
        const allCategories = ['starters', 'curries', 'biryani', 'tandoor', 'noodles', 'rice', 'breads', 'beverages'];
        setCurrentUser({ name: 'Meera', phone: '9000000007', orderDates: [] });
        const user = getCurrentUser();
        const order = {
            total: 300,
            items: allCategories.map((cat) => ({ category: cat })),
        };
        checkAndAwardBadges(user, order);
        vi.runAllTimers();
        const updated = getCurrentUser();
        expect(updated.badges.some((b) => b.badgeId === 'explorer')).toBe(true);
    });

    it('does NOT award explorer when not all categories are covered', () => {
        setCurrentUser({
            name: 'Meera',
            phone: '9000000007',
            orderDates: [],
            categoriesOrdered: ['starters', 'curries'],
        });
        const user = getCurrentUser();
        checkAndAwardBadges(user, { total: 300, items: [{ category: 'biryani' }] });
        vi.runAllTimers();
        const updated = getCurrentUser();
        const hasBadge = updated.badges && updated.badges.some((b) => b.badgeId === 'explorer');
        expect(hasBadge).toBeFalsy();
    });

    it('updates categoriesOrdered on user when new categories are ordered', () => {
        setCurrentUser({
            name: 'Meera',
            phone: '9000000007',
            orderDates: [],
            categoriesOrdered: ['starters'],
        });
        const user = getCurrentUser();
        checkAndAwardBadges(user, {
            total: 200,
            items: [{ category: 'curries' }, { category: 'biryani' }],
        });
        vi.runAllTimers();
        expect(user.categoriesOrdered).toContain('curries');
        expect(user.categoriesOrdered).toContain('biryani');
    });

    it('does NOT award explorer when order has no items', () => {
        setCurrentUser({
            name: 'Meera',
            phone: '9000000007',
            orderDates: [],
            categoriesOrdered: ['starters', 'curries'],
        });
        const user = getCurrentUser();
        checkAndAwardBadges(user, { total: 200, items: [] });
        vi.runAllTimers();
        const updated = getCurrentUser();
        const hasBadge = updated.badges && updated.badges.some((b) => b.badgeId === 'explorer');
        expect(hasBadge).toBeFalsy();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// checkAndAwardBadges — streak_master
// ═══════════════════════════════════════════════════════════════════════════

describe('checkAndAwardBadges — streak_master badge', () => {
    beforeEach(() => {
        localStorage.clear();
        setupDOM('<div id="auth-toast"></div>');
        mockDb();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('awards streak_master for 3 consecutive days (today makes the third)', () => {
        const today = new Date();
        const d1 = new Date(today);
        d1.setDate(d1.getDate() - 2);
        const d2 = new Date(today);
        d2.setDate(d2.getDate() - 1);

        setCurrentUser({
            name: 'Vijay',
            phone: '9000000008',
            orderDates: [
                d1.toISOString().split('T')[0],
                d2.toISOString().split('T')[0],
            ],
        });
        const user = getCurrentUser();
        checkAndAwardBadges(user, { total: 200, items: [] });
        vi.runAllTimers();
        const updated = getCurrentUser();
        expect(updated.badges.some((b) => b.badgeId === 'streak_master')).toBe(true);
    });

    it('does NOT award streak_master for non-consecutive dates', () => {
        const today = new Date();
        const d1 = new Date(today);
        d1.setDate(d1.getDate() - 5);
        const d2 = new Date(today);
        d2.setDate(d2.getDate() - 3);

        setCurrentUser({
            name: 'Vijay',
            phone: '9000000008',
            orderDates: [
                d1.toISOString().split('T')[0],
                d2.toISOString().split('T')[0],
            ],
        });
        const user = getCurrentUser();
        checkAndAwardBadges(user, { total: 200, items: [] });
        vi.runAllTimers();
        const updated = getCurrentUser();
        const hasBadge = updated.badges && updated.badges.some((b) => b.badgeId === 'streak_master');
        expect(hasBadge).toBeFalsy();
    });

    it('does NOT award streak_master when fewer than 3 dates are present', () => {
        const today = new Date();
        const d1 = new Date(today);
        d1.setDate(d1.getDate() - 1);

        setCurrentUser({
            name: 'Vijay',
            phone: '9000000008',
            orderDates: [d1.toISOString().split('T')[0]],
        });
        const user = getCurrentUser();
        checkAndAwardBadges(user, { total: 200, items: [] });
        vi.runAllTimers();
        const updated = getCurrentUser();
        const hasBadge = updated.badges && updated.badges.some((b) => b.badgeId === 'streak_master');
        expect(hasBadge).toBeFalsy();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// checkAndAwardBadges — no double-awarding
// ═══════════════════════════════════════════════════════════════════════════

describe('checkAndAwardBadges — no double-awarding', () => {
    beforeEach(() => {
        localStorage.clear();
        setupDOM('<div id="auth-toast"></div>');
        mockDb();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('does NOT award first_bite again if user already has it', () => {
        setCurrentUser({
            name: 'Lakshmi',
            phone: '9000000009',
            orderDates: [],
            badges: [{ badgeId: 'first_bite', earnedAt: new Date().toISOString() }],
        });
        const user = getCurrentUser();
        checkAndAwardBadges(user, { total: 200, items: [] });
        vi.runAllTimers();
        const updated = getCurrentUser();
        const count = updated.badges.filter((b) => b.badgeId === 'first_bite').length;
        expect(count).toBe(1);
    });

    it('does NOT re-award big_spender if user already has it', () => {
        setCurrentUser({
            name: 'Lakshmi',
            phone: '9000000009',
            orderDates: [],
            badges: [{ badgeId: 'big_spender', earnedAt: new Date().toISOString() }],
        });
        const user = getCurrentUser();
        checkAndAwardBadges(user, { total: 2000, items: [] });
        vi.runAllTimers();
        const updated = getCurrentUser();
        const count = updated.badges.filter((b) => b.badgeId === 'big_spender').length;
        expect(count).toBe(1);
    });

    it('does NOT re-award critic if user already has it', () => {
        setCurrentUser({
            name: 'Lakshmi',
            phone: '9000000009',
            orderDates: [],
            reviewCount: 10,
            badges: [{ badgeId: 'critic', earnedAt: new Date().toISOString() }],
        });
        const user = getCurrentUser();
        checkAndAwardBadges(user, { total: 200, items: [] });
        vi.runAllTimers();
        const updated = getCurrentUser();
        const count = updated.badges.filter((b) => b.badgeId === 'critic').length;
        expect(count).toBe(1);
    });

    it('does NOT re-award regular if user already has it', () => {
        const today = new Date();
        const pastDates = [];
        for (let i = 4; i >= 1; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            pastDates.push(d.toISOString().split('T')[0]);
        }
        setCurrentUser({
            name: 'Lakshmi',
            phone: '9000000009',
            orderDates: pastDates,
            badges: [{ badgeId: 'regular', earnedAt: new Date().toISOString() }],
        });
        const user = getCurrentUser();
        checkAndAwardBadges(user, { total: 200, items: [] });
        vi.runAllTimers();
        const updated = getCurrentUser();
        const count = updated.badges.filter((b) => b.badgeId === 'regular').length;
        expect(count).toBe(1);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// checkAndAwardBadges — night_owl (hour >= 21)
// ═══════════════════════════════════════════════════════════════════════════

describe('checkAndAwardBadges — night_owl badge', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('awards night_owl when the current hour is 21 (9 PM)', () => {
        localStorage.clear();
        setupDOM('<div id="auth-toast"></div>');
        mockDb();

        const fakeDate = new Date();
        fakeDate.setHours(21, 0, 0, 0);
        vi.useFakeTimers();
        vi.setSystemTime(fakeDate);

        setCurrentUser({ name: 'Ratan', phone: '9000000010', orderDates: [] });
        const user = getCurrentUser();
        checkAndAwardBadges(user, { total: 200, items: [] });
        vi.runAllTimers();
        const updated = getCurrentUser();
        expect(updated.badges.some((b) => b.badgeId === 'night_owl')).toBe(true);
    });

    it('awards night_owl when the current hour is 23', () => {
        localStorage.clear();
        setupDOM('<div id="auth-toast"></div>');
        mockDb();

        const fakeDate = new Date();
        fakeDate.setHours(23, 30, 0, 0);
        vi.useFakeTimers();
        vi.setSystemTime(fakeDate);

        setCurrentUser({ name: 'Ratan', phone: '9000000010', orderDates: [] });
        const user = getCurrentUser();
        checkAndAwardBadges(user, { total: 200, items: [] });
        vi.runAllTimers();
        const updated = getCurrentUser();
        expect(updated.badges.some((b) => b.badgeId === 'night_owl')).toBe(true);
    });

    it('does NOT award night_owl when the current hour is 20 (before 9 PM)', () => {
        localStorage.clear();
        setupDOM('<div id="auth-toast"></div>');
        mockDb();

        const fakeDate = new Date();
        fakeDate.setHours(20, 59, 0, 0);
        vi.useFakeTimers();
        vi.setSystemTime(fakeDate);

        setCurrentUser({ name: 'Ratan', phone: '9000000010', orderDates: [] });
        const user = getCurrentUser();
        checkAndAwardBadges(user, { total: 200, items: [] });
        vi.runAllTimers();
        const updated = getCurrentUser();
        const hasBadge = updated.badges && updated.badges.some((b) => b.badgeId === 'night_owl');
        expect(hasBadge).toBeFalsy();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// checkAndAwardBadges — early_bird (hour < 10)
// ═══════════════════════════════════════════════════════════════════════════

describe('checkAndAwardBadges — early_bird badge', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('awards early_bird when the current hour is 7 AM', () => {
        localStorage.clear();
        setupDOM('<div id="auth-toast"></div>');
        mockDb();

        const fakeDate = new Date();
        fakeDate.setHours(7, 0, 0, 0);
        vi.useFakeTimers();
        vi.setSystemTime(fakeDate);

        setCurrentUser({ name: 'Sunita', phone: '9000000011', orderDates: [] });
        const user = getCurrentUser();
        checkAndAwardBadges(user, { total: 150, items: [] });
        vi.runAllTimers();
        const updated = getCurrentUser();
        expect(updated.badges.some((b) => b.badgeId === 'early_bird')).toBe(true);
    });

    it('awards early_bird when the current hour is exactly 9', () => {
        localStorage.clear();
        setupDOM('<div id="auth-toast"></div>');
        mockDb();

        const fakeDate = new Date();
        fakeDate.setHours(9, 45, 0, 0);
        vi.useFakeTimers();
        vi.setSystemTime(fakeDate);

        setCurrentUser({ name: 'Sunita', phone: '9000000011', orderDates: [] });
        const user = getCurrentUser();
        checkAndAwardBadges(user, { total: 150, items: [] });
        vi.runAllTimers();
        const updated = getCurrentUser();
        expect(updated.badges.some((b) => b.badgeId === 'early_bird')).toBe(true);
    });

    it('does NOT award early_bird when the current hour is 10', () => {
        localStorage.clear();
        setupDOM('<div id="auth-toast"></div>');
        mockDb();

        const fakeDate = new Date();
        fakeDate.setHours(10, 0, 0, 0);
        vi.useFakeTimers();
        vi.setSystemTime(fakeDate);

        setCurrentUser({ name: 'Sunita', phone: '9000000011', orderDates: [] });
        const user = getCurrentUser();
        checkAndAwardBadges(user, { total: 150, items: [] });
        vi.runAllTimers();
        const updated = getCurrentUser();
        const hasBadge = updated.badges && updated.badges.some((b) => b.badgeId === 'early_bird');
        expect(hasBadge).toBeFalsy();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// openBadgeGallery
// ═══════════════════════════════════════════════════════════════════════════

describe('openBadgeGallery', () => {
    beforeEach(() => {
        localStorage.clear();
        setupDOM('<div id="auth-toast"></div>');
        mockDb();
    });

    it('creates a modal element in the DOM when none exists', () => {
        openBadgeGallery();
        const modal = document.getElementById('badge-gallery-modal');
        expect(modal).not.toBeNull();
    });

    it('adds the show class to the modal', () => {
        openBadgeGallery();
        const modal = document.getElementById('badge-gallery-modal');
        expect(modal.classList.contains('show')).toBe(true);
    });

    it('shows 0 of 10 badges earned when user has no badges', () => {
        setCurrentUser({ name: 'Test', phone: '9000000012', badges: [] });
        openBadgeGallery();
        const modal = document.getElementById('badge-gallery-modal');
        expect(modal.textContent).toContain('0 of 10');
    });

    it('shows 0 of 10 when no user is logged in', () => {
        openBadgeGallery();
        const modal = document.getElementById('badge-gallery-modal');
        expect(modal.textContent).toContain('0 of 10');
    });

    it('shows correct earned count when user has some badges', () => {
        setCurrentUser({
            name: 'Test',
            phone: '9000000012',
            badges: [
                { badgeId: 'first_bite', earnedAt: new Date().toISOString() },
                { badgeId: 'critic', earnedAt: new Date().toISOString() },
            ],
        });
        openBadgeGallery();
        const modal = document.getElementById('badge-gallery-modal');
        expect(modal.textContent).toContain('2 of 10');
    });

    it('renders earned badge cards with the earned CSS class', () => {
        setCurrentUser({
            name: 'Test',
            phone: '9000000012',
            badges: [{ badgeId: 'first_bite', earnedAt: new Date().toISOString() }],
        });
        openBadgeGallery();
        const modal = document.getElementById('badge-gallery-modal');
        const earnedCards = modal.querySelectorAll('.badge-card.earned');
        expect(earnedCards.length).toBe(1);
    });

    it('renders unearned badge cards with the unearned CSS class', () => {
        setCurrentUser({ name: 'Test', phone: '9000000012', badges: [] });
        openBadgeGallery();
        const modal = document.getElementById('badge-gallery-modal');
        const unearnedCards = modal.querySelectorAll('.badge-card.unearned');
        expect(unearnedCards.length).toBe(10);
    });

    it('renders 9 unearned and 1 earned when only one badge is owned', () => {
        setCurrentUser({
            name: 'Test',
            phone: '9000000012',
            badges: [{ badgeId: 'regular', earnedAt: new Date().toISOString() }],
        });
        openBadgeGallery();
        const modal = document.getElementById('badge-gallery-modal');
        expect(modal.querySelectorAll('.badge-card.earned').length).toBe(1);
        expect(modal.querySelectorAll('.badge-card.unearned').length).toBe(9);
    });

    it('reuses an existing modal element on subsequent calls', () => {
        openBadgeGallery();
        openBadgeGallery();
        const modals = document.body.querySelectorAll('#badge-gallery-modal');
        expect(modals.length).toBe(1);
    });

    it('renders a close button in the gallery content', () => {
        openBadgeGallery();
        const closeBtn = document.body.querySelector('.badge-gallery-close');
        expect(closeBtn).not.toBeNull();
    });

    it('shows the title "Your Badges" inside the gallery', () => {
        openBadgeGallery();
        const modal = document.getElementById('badge-gallery-modal');
        expect(modal.textContent).toContain('Your Badges');
    });

    it('includes badge icons in rendered cards', () => {
        openBadgeGallery();
        const modal = document.getElementById('badge-gallery-modal');
        const icons = modal.querySelectorAll('.badge-card-icon');
        expect(icons.length).toBe(10);
    });

    it('shows earned date for an earned badge', () => {
        const earnedAt = new Date('2025-12-25T12:00:00.000Z').toISOString();
        setCurrentUser({
            name: 'Test',
            phone: '9000000012',
            badges: [{ badgeId: 'first_bite', earnedAt }],
        });
        openBadgeGallery();
        const modal = document.getElementById('badge-gallery-modal');
        const dateEl = modal.querySelector('.badge-card-date');
        expect(dateEl).not.toBeNull();
        expect(dateEl.textContent.length).toBeGreaterThan(0);
    });

    it('does not show a date element for unearned badges', () => {
        setCurrentUser({ name: 'Test', phone: '9000000012', badges: [] });
        openBadgeGallery();
        const modal = document.getElementById('badge-gallery-modal');
        const dateEls = modal.querySelectorAll('.badge-card-date');
        expect(dateEls.length).toBe(0);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// closeBadgeGallery
// ═══════════════════════════════════════════════════════════════════════════

describe('closeBadgeGallery', () => {
    beforeEach(() => {
        localStorage.clear();
        setupDOM('<div id="auth-toast"></div>');
        mockDb();
    });

    it('removes the show class from an open modal', () => {
        openBadgeGallery();
        const modal = document.getElementById('badge-gallery-modal');
        expect(modal.classList.contains('show')).toBe(true);
        closeBadgeGallery();
        expect(modal.classList.contains('show')).toBe(false);
    });

    it('does nothing and does not throw when no modal exists in the DOM', () => {
        document.body.innerHTML = '';
        document.getElementById = () => null;
        expect(() => closeBadgeGallery()).not.toThrow();
    });

    it('can be called multiple times without error', () => {
        openBadgeGallery();
        expect(() => {
            closeBadgeGallery();
            closeBadgeGallery();
            closeBadgeGallery();
        }).not.toThrow();
    });

    it('leaves modal in DOM but without show class after closing', () => {
        openBadgeGallery();
        closeBadgeGallery();
        const modal = document.getElementById('badge-gallery-modal');
        expect(modal).not.toBeNull();
        expect(modal.classList.contains('show')).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// showBadgeToast (exercised via checkAndAwardBadges)
// ═══════════════════════════════════════════════════════════════════════════

describe('showBadgeToast — via checkAndAwardBadges', () => {
    beforeEach(() => {
        localStorage.clear();
        setupDOM('<div id="auth-toast"></div>');
        mockDb();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('creates a badge-toast element in the DOM on badge award', () => {
        setCurrentUser({ name: 'Toast User', phone: '9000000013', orderDates: [] });
        const user = getCurrentUser();
        checkAndAwardBadges(user, { total: 200, items: [] });
        vi.runAllTimers();
        const toast = document.getElementById('badge-toast');
        expect(toast).not.toBeNull();
    });

    it('badge-toast contains the badge name text', () => {
        setCurrentUser({ name: 'Toast User', phone: '9000000013', orderDates: [] });
        const user = getCurrentUser();
        checkAndAwardBadges(user, { total: 200, items: [] });
        vi.runAllTimers();
        const toast = document.getElementById('badge-toast');
        expect(toast.textContent).toContain('Badge Unlocked');
    });

    it('reuses an existing badge-toast element if already present', () => {
        document.body.innerHTML = '<div id="badge-toast" class="badge-toast"></div>';
        document.getElementById = (id) => document.body.querySelector('#' + id);

        setCurrentUser({ name: 'Toast User', phone: '9000000013', orderDates: [] });
        const user = getCurrentUser();
        checkAndAwardBadges(user, { total: 200, items: [] });
        vi.runAllTimers();

        const toasts = document.body.querySelectorAll('#badge-toast');
        expect(toasts.length).toBe(1);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// awardBadge — Firestore persistence (via checkAndAwardBadges)
// ═══════════════════════════════════════════════════════════════════════════

describe('awardBadge — Firestore persistence', () => {
    beforeEach(() => {
        localStorage.clear();
        setupDOM('<div id="auth-toast"></div>');
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('calls db.collection().doc().update() when user has a phone', () => {
        const mockUpdate = vi.fn(() => Promise.resolve());
        const mockDoc = vi.fn(() => ({ update: mockUpdate, onSnapshot: vi.fn(() => vi.fn()) }));
        const mockCollection = vi.fn(() => ({
            doc: mockDoc,
            where: vi.fn().mockReturnThis(),
            onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
        }));
        window.db = { collection: mockCollection };

        setCurrentUser({ name: 'DB User', phone: '9999999999', orderDates: [] });
        const user = getCurrentUser();
        checkAndAwardBadges(user, { total: 200, items: [] });
        vi.runAllTimers();

        expect(mockCollection).toHaveBeenCalledWith('users');
        expect(mockDoc).toHaveBeenCalledWith('9999999999');
        expect(mockUpdate).toHaveBeenCalled();
    });

    it('does not throw when db is undefined', () => {
        window.db = undefined;
        setCurrentUser({ name: 'No DB User', phone: '9999999998', orderDates: [] });
        const user = getCurrentUser();
        expect(() => {
            checkAndAwardBadges(user, { total: 200, items: [] });
            vi.runAllTimers();
        }).not.toThrow();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// window globals assignment
// ═══════════════════════════════════════════════════════════════════════════

describe('window globals', () => {
    it('exposes checkAndAwardBadges on window', () => {
        expect(typeof window.checkAndAwardBadges).toBe('function');
    });

    it('exposes openBadgeGallery on window', () => {
        expect(typeof window.openBadgeGallery).toBe('function');
    });

    it('exposes closeBadgeGallery on window', () => {
        expect(typeof window.closeBadgeGallery).toBe('function');
    });

    it('exposes getBadgeDefinitions on window', () => {
        expect(typeof window.getBadgeDefinitions).toBe('function');
    });
});
