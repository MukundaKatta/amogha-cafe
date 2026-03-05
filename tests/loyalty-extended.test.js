import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    awardLoyaltyPoints,
    checkBirthdayRewards,
    showBirthdayBanner,
    updateLoyaltyWidget,
    openLoyaltyModal,
    closeLoyaltyModal,
    getLoyaltyTier,
} from '../src/modules/loyalty.js';
import { setCurrentUser, getCurrentUser } from '../src/modules/auth.js';

function setupDOM(html) {
    document.body.innerHTML = html;
    document.getElementById = (id) => document.body.querySelector('#' + id);
    document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
    document.querySelector = (sel) => document.body.querySelector(sel);
}

// ═══════════════════════════════════════════════════════════════════════════
// awardLoyaltyPoints
// ═══════════════════════════════════════════════════════════════════════════
describe('awardLoyaltyPoints', () => {
    beforeEach(() => {
        localStorage.clear();
        setupDOM('<div id="auth-toast"></div><div id="loyalty-widget"></div>');
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

    it('does nothing when no user is logged in', () => {
        awardLoyaltyPoints(500);
        expect(getCurrentUser()).toBeNull();
    });

    it('awards 1 point per ₹10 spent', () => {
        setCurrentUser({ name: 'Test', phone: '1234567890', loyaltyPoints: 0 });
        awardLoyaltyPoints(500);
        const user = getCurrentUser();
        expect(user.loyaltyPoints).toBe(50); // 500 / 10
    });

    it('rounds down partial points', () => {
        setCurrentUser({ name: 'Test', phone: '1234567890', loyaltyPoints: 0 });
        awardLoyaltyPoints(77); // 77 / 10 = 7.7 → 7
        expect(getCurrentUser().loyaltyPoints).toBe(7);
    });

    it('accumulates points across multiple awards', () => {
        setCurrentUser({ name: 'Test', phone: '1234567890', loyaltyPoints: 100 });
        awardLoyaltyPoints(200);
        expect(getCurrentUser().loyaltyPoints).toBe(120); // 100 + 20
    });

    it('shows toast with points earned', () => {
        setCurrentUser({ name: 'Test', phone: '1234567890', loyaltyPoints: 0 });
        awardLoyaltyPoints(300);
        expect(document.getElementById('auth-toast').textContent).toContain('30');
    });

    it('awards 2x points for 3-day streak', () => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const dayBefore = new Date(today);
        dayBefore.setDate(dayBefore.getDate() - 2);

        setCurrentUser({
            name: 'Streak User',
            phone: '1234567890',
            loyaltyPoints: 0,
            orderDates: [
                dayBefore.toISOString().split('T')[0],
                yesterday.toISOString().split('T')[0],
            ],
        });

        awardLoyaltyPoints(100);
        // 100 / 10 = 10, 2x streak = 20
        expect(getCurrentUser().loyaltyPoints).toBe(20);
        expect(document.getElementById('auth-toast').textContent).toContain('Streak');
    });

    it('tracks order dates and limits to 30', () => {
        const dates = [];
        for (let i = 35; i >= 1; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            dates.push(d.toISOString().split('T')[0]);
        }
        setCurrentUser({ name: 'Test', phone: '1234567890', loyaltyPoints: 0, orderDates: dates });
        awardLoyaltyPoints(100);
        expect(getCurrentUser().orderDates.length).toBeLessThanOrEqual(30);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// checkBirthdayRewards
// ═══════════════════════════════════════════════════════════════════════════
describe('checkBirthdayRewards', () => {
    it('returns false for null user', () => {
        expect(checkBirthdayRewards(null)).toBe(false);
    });

    it('returns false for user without dob', () => {
        expect(checkBirthdayRewards({ name: 'Test' })).toBe(false);
    });

    it('returns true when user birthday month matches current month', () => {
        const now = new Date();
        const dob = new Date(1990, now.getMonth(), 15).toISOString();
        expect(checkBirthdayRewards({ name: 'Test', dob })).toBe(true);
    });

    it('returns false when user birthday month does not match', () => {
        const now = new Date();
        const otherMonth = (now.getMonth() + 6) % 12;
        const dob = new Date(1990, otherMonth, 15).toISOString();
        expect(checkBirthdayRewards({ name: 'Test', dob })).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// showBirthdayBanner
// ═══════════════════════════════════════════════════════════════════════════
describe('showBirthdayBanner', () => {
    beforeEach(() => {
        setupDOM('<header></header>');
    });

    it('does nothing for user without birthday this month', () => {
        const otherMonth = (new Date().getMonth() + 6) % 12;
        showBirthdayBanner({ name: 'Test', dob: new Date(1990, otherMonth, 15).toISOString() });
        expect(document.getElementById('birthday-banner')).toBeNull();
    });

    it('shows banner for user with birthday this month', () => {
        const dob = new Date(1990, new Date().getMonth(), 15).toISOString();
        showBirthdayBanner({ name: 'Ravi Kumar', dob });
        const banner = document.getElementById('birthday-banner');
        expect(banner).not.toBeNull();
        expect(banner.textContent).toContain('Ravi');
    });

    it('does not show duplicate banner', () => {
        const dob = new Date(1990, new Date().getMonth(), 15).toISOString();
        showBirthdayBanner({ name: 'Test', dob });
        showBirthdayBanner({ name: 'Test', dob });
        const banners = document.body.querySelectorAll('#birthday-banner');
        expect(banners.length).toBe(1);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// updateLoyaltyWidget
// ═══════════════════════════════════════════════════════════════════════════
describe('updateLoyaltyWidget', () => {
    beforeEach(() => {
        localStorage.clear();
        setupDOM('<div id="loyalty-widget" style="display:none"></div>');
    });

    it('hides widget when no user is logged in', () => {
        updateLoyaltyWidget();
        expect(document.getElementById('loyalty-widget').style.display).toBe('none');
    });

    it('shows widget with points when user is logged in', () => {
        setCurrentUser({ name: 'Test', phone: '1234567890', loyaltyPoints: 250 });
        updateLoyaltyWidget();
        const widget = document.getElementById('loyalty-widget');
        expect(widget.style.display).toBe('flex');
        expect(widget.textContent).toContain('250');
    });

    it('shows correct tier icon', () => {
        setCurrentUser({ name: 'Test', phone: '1234567890', loyaltyPoints: 1000 }); // Gold
        updateLoyaltyWidget();
        const widget = document.getElementById('loyalty-widget');
        expect(widget.title).toContain('Gold');
    });

    it('does nothing when widget element is missing', () => {
        document.body.innerHTML = '';
        document.getElementById = () => null;
        expect(() => updateLoyaltyWidget()).not.toThrow();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// openLoyaltyModal / closeLoyaltyModal
// ═══════════════════════════════════════════════════════════════════════════
describe('openLoyaltyModal', () => {
    beforeEach(() => {
        localStorage.clear();
        setupDOM('<div id="auth-toast"></div>');
        window.openAuthModal = vi.fn();
    });

    it('calls openAuthModal when no user is logged in', () => {
        openLoyaltyModal();
        expect(window.openAuthModal).toHaveBeenCalled();
    });

    it('creates and shows loyalty modal when user is logged in', () => {
        setCurrentUser({ name: 'Test', phone: '1234567890', loyaltyPoints: 500 });
        openLoyaltyModal();
        const modal = document.getElementById('loyalty-modal');
        expect(modal).not.toBeNull();
        expect(modal.style.display).toBe('block');
        expect(modal.textContent).toContain('500');
    });

    it('shows redeemable value (100pts = Rs.10)', () => {
        setCurrentUser({ name: 'Test', phone: '1234567890', loyaltyPoints: 350 });
        openLoyaltyModal();
        const modal = document.getElementById('loyalty-modal');
        expect(modal.textContent).toContain('Rs.30'); // 300pts → Rs.30
    });

    it('shows highest tier message when at Gold', () => {
        setCurrentUser({ name: 'Test', phone: '1234567890', loyaltyPoints: 2000 });
        openLoyaltyModal();
        expect(document.getElementById('loyalty-modal').textContent).toMatch(/highest tier/i);
    });
});

describe('closeLoyaltyModal', () => {
    it('hides modal when it exists', () => {
        setupDOM('<div id="loyalty-modal" style="display:block"></div>');
        closeLoyaltyModal();
        expect(document.getElementById('loyalty-modal').style.display).toBe('none');
    });

    it('does nothing when modal does not exist', () => {
        setupDOM('');
        expect(() => closeLoyaltyModal()).not.toThrow();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// getLoyaltyTier — fallback return for negative / very low points
// ═══════════════════════════════════════════════════════════════════════════
describe('getLoyaltyTier — edge cases', () => {
    it('returns Bronze tier for negative points (fallback line 11)', () => {
        const tier = getLoyaltyTier(-100);
        expect(tier.name).toBe('Bronze');
        expect(tier.min).toBe(0);
    });

    it('returns Bronze tier for zero points', () => {
        const tier = getLoyaltyTier(0);
        expect(tier.name).toBe('Bronze');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// awardLoyaltyPoints — Firestore update catch (line 48)
// ═══════════════════════════════════════════════════════════════════════════
describe('awardLoyaltyPoints — Firestore error handling', () => {
    beforeEach(() => {
        localStorage.clear();
        setupDOM('<div id="auth-toast"></div><div id="loyalty-widget"></div>');
    });

    it('does not throw when db.collection.doc.update rejects (line 48)', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    update: vi.fn(() => Promise.reject(new Error('Firestore write failed'))),
                    onSnapshot: vi.fn(() => vi.fn()),
                })),
                where: vi.fn().mockReturnThis(),
                onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
            })),
        };

        setCurrentUser({ name: 'Test', phone: '1234567890', loyaltyPoints: 0 });
        awardLoyaltyPoints(200);

        // Flush promise queue to let the .catch() fire
        await new Promise((r) => setTimeout(r, 0));

        expect(consoleErrorSpy).toHaveBeenCalledWith('Loyalty tier update error:', expect.any(Error));
        // Points should still be awarded locally
        expect(getCurrentUser().loyaltyPoints).toBe(20);
        consoleErrorSpy.mockRestore();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// awardLoyaltyPoints — Tier-up celebration setTimeout (lines 55-57)
// ═══════════════════════════════════════════════════════════════════════════
describe('awardLoyaltyPoints — tier-up celebration', () => {
    beforeEach(() => {
        localStorage.clear();
        setupDOM('<div id="auth-toast"></div><div id="loyalty-widget"></div>');
        vi.useFakeTimers();
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

    afterEach(() => {
        vi.useRealTimers();
    });

    it('shows tier-up toast after 2000ms when tier changes (lines 55-56)', () => {
        // Start at Bronze (0 pts), award enough to reach Silver (500+)
        setCurrentUser({ name: 'Test', phone: '1234567890', loyaltyPoints: 490 });
        awardLoyaltyPoints(200); // +20 pts → 510, crosses Bronze→Silver

        // Before timeout fires, showAuthToast should only have the points toast
        const firstCallCount = document.getElementById('auth-toast').textContent ? 1 : 0;

        vi.advanceTimersByTime(2000);

        // After 2s the tier-up celebration toast should fire
        expect(document.getElementById('auth-toast').textContent).toContain('Silver');
    });

    it('calls launchConfetti when it is a function (line 57)', () => {
        window.launchConfetti = vi.fn();
        setCurrentUser({ name: 'Test', phone: '1234567890', loyaltyPoints: 490 });
        awardLoyaltyPoints(200); // Bronze → Silver

        vi.advanceTimersByTime(2000);

        expect(window.launchConfetti).toHaveBeenCalled();
        delete window.launchConfetti;
    });

    it('does not throw when launchConfetti is not a function (line 57)', () => {
        delete window.launchConfetti;
        setCurrentUser({ name: 'Test', phone: '1234567890', loyaltyPoints: 490 });
        awardLoyaltyPoints(200);

        expect(() => vi.advanceTimersByTime(2000)).not.toThrow();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// initLoyalty — setTimeout(updateLoyaltyWidget, 500) (line 134)
// ═══════════════════════════════════════════════════════════════════════════
import { initLoyalty } from '../src/modules/loyalty.js';

describe('initLoyalty', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('calls updateLoyaltyWidget after 500ms delay (line 134)', () => {
        setupDOM('<div id="loyalty-widget" style="display:none"></div>');
        setCurrentUser({ name: 'Test', phone: '1234567890', loyaltyPoints: 100 });

        initLoyalty();

        // Widget should not be updated yet
        expect(document.getElementById('loyalty-widget').style.display).toBe('none');

        vi.advanceTimersByTime(500);

        // Now it should be updated
        expect(document.getElementById('loyalty-widget').style.display).toBe('flex');
        expect(document.getElementById('loyalty-widget').textContent).toContain('100');
    });

    it('does not update widget before 500ms', () => {
        setupDOM('<div id="loyalty-widget" style="display:none"></div>');
        setCurrentUser({ name: 'Test', phone: '1234567890', loyaltyPoints: 50 });

        initLoyalty();
        vi.advanceTimersByTime(499);

        expect(document.getElementById('loyalty-widget').style.display).toBe('none');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// showBirthdayBanner — inserting after header (line 159)
// ═══════════════════════════════════════════════════════════════════════════
describe('showBirthdayBanner — insertion position', () => {
    it('inserts banner after header when header has a nextSibling (line 159)', () => {
        setupDOM('<header></header><main></main>');
        const dob = new Date(1990, new Date().getMonth(), 15).toISOString();
        showBirthdayBanner({ name: 'Ravi', dob });
        const banner = document.getElementById('birthday-banner');
        expect(banner).not.toBeNull();
        // Banner should be between header and main
        const header = document.body.querySelector('header');
        expect(header.nextElementSibling).toBe(banner);
    });

    it('inserts banner as first child of body when no header exists (line 161)', () => {
        setupDOM('<div id="content">stuff</div>');
        const dob = new Date(1990, new Date().getMonth(), 15).toISOString();
        showBirthdayBanner({ name: 'Test', dob });
        const banner = document.getElementById('birthday-banner');
        expect(banner).not.toBeNull();
        expect(document.body.firstChild).toBe(banner);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// closeBirthdayBanner (lines 165-170)
// ═══════════════════════════════════════════════════════════════════════════
describe('closeBirthdayBanner', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('sets opacity to 0 and transform to translateY(-100%)', () => {
        setupDOM('<div id="birthday-banner" style="opacity:1;transform:none"></div>');
        // closeBirthdayBanner is on window
        window.closeBirthdayBanner();
        const banner = document.getElementById('birthday-banner');
        expect(banner.style.opacity).toBe('0');
        expect(banner.style.transform).toBe('translateY(-100%)');
    });

    it('removes banner from DOM after 400ms timeout', () => {
        setupDOM('<div id="birthday-banner"></div>');
        window.closeBirthdayBanner();
        // Banner still present before timeout
        expect(document.getElementById('birthday-banner')).not.toBeNull();
        vi.advanceTimersByTime(400);
        expect(document.getElementById('birthday-banner')).toBeNull();
    });

    it('does not throw when banner does not exist', () => {
        setupDOM('<div></div>');
        expect(() => window.closeBirthdayBanner()).not.toThrow();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// awardLoyaltyPoints — date push when last date !== today (line 21)
// ═══════════════════════════════════════════════════════════════════════════
describe('awardLoyaltyPoints — date tracking (line 21)', () => {
    beforeEach(() => {
        localStorage.clear();
        setupDOM('<div id="auth-toast"></div><div id="loyalty-widget"></div>');
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

    it('pushes today onto orderDates when last date is not today', () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        setCurrentUser({
            name: 'Date Push User',
            phone: '1234567890',
            loyaltyPoints: 0,
            orderDates: [yesterday.toISOString().split('T')[0]],
        });
        awardLoyaltyPoints(100);
        const user = getCurrentUser();
        const today = new Date().toISOString().split('T')[0];
        expect(user.orderDates).toContain(today);
        expect(user.orderDates.length).toBe(2);
    });

    it('does NOT push today when last date is already today', () => {
        const today = new Date().toISOString().split('T')[0];
        setCurrentUser({
            name: 'No Dup Date User',
            phone: '1234567890',
            loyaltyPoints: 0,
            orderDates: [today],
        });
        awardLoyaltyPoints(100);
        const user = getCurrentUser();
        const todayCount = user.orderDates.filter((d) => d === today).length;
        expect(todayCount).toBe(1);
    });

    it('pushes today when orderDates is empty', () => {
        setCurrentUser({
            name: 'Empty Dates User',
            phone: '1234567890',
            loyaltyPoints: 0,
            orderDates: [],
        });
        awardLoyaltyPoints(100);
        const user = getCurrentUser();
        const today = new Date().toISOString().split('T')[0];
        expect(user.orderDates).toContain(today);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// awardLoyaltyPoints — 3 consecutive days 2x bonus (line 29)
// ═══════════════════════════════════════════════════════════════════════════
describe('awardLoyaltyPoints — 3 consecutive days 2x bonus (line 29)', () => {
    beforeEach(() => {
        localStorage.clear();
        setupDOM('<div id="auth-toast"></div><div id="loyalty-widget"></div>');
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

    it('awards 2x points when 3 consecutive days are present', () => {
        const today = new Date();
        const d1 = new Date(today);
        d1.setDate(d1.getDate() - 2);
        const d2 = new Date(today);
        d2.setDate(d2.getDate() - 1);

        setCurrentUser({
            name: 'Streak Bonus',
            phone: '1234567890',
            loyaltyPoints: 0,
            orderDates: [d1.toISOString().split('T')[0], d2.toISOString().split('T')[0]],
        });
        awardLoyaltyPoints(200); // 200/10=20, 2x=40
        expect(getCurrentUser().loyaltyPoints).toBe(40);
    });

    it('does NOT award 2x bonus when dates are not consecutive', () => {
        const today = new Date();
        const d1 = new Date(today);
        d1.setDate(d1.getDate() - 5);
        const d2 = new Date(today);
        d2.setDate(d2.getDate() - 3);

        setCurrentUser({
            name: 'No Streak',
            phone: '1234567890',
            loyaltyPoints: 0,
            orderDates: [d1.toISOString().split('T')[0], d2.toISOString().split('T')[0]],
        });
        awardLoyaltyPoints(200); // 200/10=20, no 2x
        expect(getCurrentUser().loyaltyPoints).toBe(20);
    });

    it('does NOT award 2x bonus when fewer than 3 dates', () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        setCurrentUser({
            name: 'Too Few',
            phone: '1234567890',
            loyaltyPoints: 0,
            orderDates: [yesterday.toISOString().split('T')[0]],
        });
        awardLoyaltyPoints(200); // 200/10=20, only 2 dates
        expect(getCurrentUser().loyaltyPoints).toBe(20);
    });

    it('shows streak bonus message in toast', () => {
        const today = new Date();
        const d1 = new Date(today);
        d1.setDate(d1.getDate() - 2);
        const d2 = new Date(today);
        d2.setDate(d2.getDate() - 1);

        setCurrentUser({
            name: 'Streak Msg',
            phone: '1234567890',
            loyaltyPoints: 0,
            orderDates: [d1.toISOString().split('T')[0], d2.toISOString().split('T')[0]],
        });
        awardLoyaltyPoints(100);
        const toast = document.getElementById('auth-toast');
        expect(toast.textContent).toContain('2x Streak Bonus');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// awardLoyaltyPoints — db exists → update user (line 43)
// ═══════════════════════════════════════════════════════════════════════════
describe('awardLoyaltyPoints — db update (line 43)', () => {
    beforeEach(() => {
        localStorage.clear();
        setupDOM('<div id="auth-toast"></div><div id="loyalty-widget"></div>');
    });

    it('calls db.collection.doc.update when db exists', () => {
        const mockUpdate = vi.fn(() => Promise.resolve());
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    update: mockUpdate,
                    onSnapshot: vi.fn(() => vi.fn()),
                })),
                where: vi.fn().mockReturnThis(),
                onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
            })),
        };
        setCurrentUser({ name: 'DB User', phone: '1234567890', loyaltyPoints: 0 });
        awardLoyaltyPoints(100);
        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
            loyaltyPoints: expect.any(Number),
            loyaltyTier: expect.any(String),
            orderDates: expect.any(Array),
        }));
    });

    it('does NOT call db when db is undefined', () => {
        window.db = undefined;
        setCurrentUser({ name: 'No DB', phone: '1234567890', loyaltyPoints: 0 });
        expect(() => awardLoyaltyPoints(100)).not.toThrow();
        expect(getCurrentUser().loyaltyPoints).toBe(10);
    });

    it('does NOT call db when db is null', () => {
        window.db = null;
        setCurrentUser({ name: 'Null DB', phone: '1234567890', loyaltyPoints: 0 });
        expect(() => awardLoyaltyPoints(100)).not.toThrow();
        expect(getCurrentUser().loyaltyPoints).toBe(10);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// awardLoyaltyPoints — loyalty points fallback (line 71)
// ═══════════════════════════════════════════════════════════════════════════
describe('awardLoyaltyPoints — loyaltyPoints fallback to 0 (line 71)', () => {
    beforeEach(() => {
        localStorage.clear();
        setupDOM('<div id="auth-toast"></div><div id="loyalty-widget"></div>');
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

    it('treats undefined loyaltyPoints as 0', () => {
        setCurrentUser({ name: 'No Pts', phone: '1234567890' }); // no loyaltyPoints field
        awardLoyaltyPoints(500);
        expect(getCurrentUser().loyaltyPoints).toBe(50);
    });

    it('treats null loyaltyPoints as 0', () => {
        setCurrentUser({ name: 'Null Pts', phone: '1234567890', loyaltyPoints: null });
        awardLoyaltyPoints(500);
        expect(getCurrentUser().loyaltyPoints).toBe(50);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// awardLoyaltyPoints — tier upgrade celebration + confetti (lines 84-87)
// ═══════════════════════════════════════════════════════════════════════════
describe('awardLoyaltyPoints — tier upgrade celebration (lines 84-87)', () => {
    beforeEach(() => {
        localStorage.clear();
        setupDOM('<div id="auth-toast"></div><div id="loyalty-widget"></div>');
        vi.useFakeTimers();
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

    afterEach(() => {
        vi.useRealTimers();
    });

    it('shows tier upgrade toast when moving from Bronze to Silver', () => {
        setCurrentUser({ name: 'Tier Up', phone: '1234567890', loyaltyPoints: 490 });
        awardLoyaltyPoints(200); // +20 = 510, Silver
        vi.advanceTimersByTime(2000);
        expect(document.getElementById('auth-toast').textContent).toContain('Silver');
    });

    it('shows tier upgrade toast when moving from Silver to Gold', () => {
        setCurrentUser({ name: 'Gold Up', phone: '1234567890', loyaltyPoints: 990 });
        awardLoyaltyPoints(200); // +20 = 1010, Gold
        vi.advanceTimersByTime(2000);
        expect(document.getElementById('auth-toast').textContent).toContain('Gold');
    });

    it('calls launchConfetti when it is a function during tier upgrade', () => {
        window.launchConfetti = vi.fn();
        setCurrentUser({ name: 'Confetti', phone: '1234567890', loyaltyPoints: 490 });
        awardLoyaltyPoints(200);
        vi.advanceTimersByTime(2000);
        expect(window.launchConfetti).toHaveBeenCalled();
        delete window.launchConfetti;
    });

    it('does not throw when launchConfetti is not defined during tier upgrade', () => {
        delete window.launchConfetti;
        setCurrentUser({ name: 'No Confetti', phone: '1234567890', loyaltyPoints: 490 });
        awardLoyaltyPoints(200);
        expect(() => vi.advanceTimersByTime(2000)).not.toThrow();
    });

    it('does not show tier upgrade toast when tier does not change', () => {
        setCurrentUser({ name: 'Same Tier', phone: '1234567890', loyaltyPoints: 100 });
        awardLoyaltyPoints(100); // +10 = 110, still Bronze
        vi.advanceTimersByTime(2000);
        const toast = document.getElementById('auth-toast');
        expect(toast.textContent).not.toContain('Silver');
        expect(toast.textContent).not.toContain('Gold');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// openLoyaltyModal — nextTier ternaries (lines 94-100)
// ═══════════════════════════════════════════════════════════════════════════
describe('openLoyaltyModal — nextTier ternaries (lines 94-100)', () => {
    beforeEach(() => {
        localStorage.clear();
        setupDOM('<div id="auth-toast"></div>');
        window.openAuthModal = vi.fn();
    });

    it('shows "points to Silver" when user is Bronze', () => {
        setCurrentUser({ name: 'Bronze User', phone: '1234567890', loyaltyPoints: 100 });
        openLoyaltyModal();
        const modal = document.getElementById('loyalty-modal');
        expect(modal.textContent).toContain('points to');
        expect(modal.textContent).toContain('Silver');
    });

    it('shows "points to Gold" when user is Silver', () => {
        setCurrentUser({ name: 'Silver User', phone: '1234567890', loyaltyPoints: 600 });
        openLoyaltyModal();
        const modal = document.getElementById('loyalty-modal');
        expect(modal.textContent).toContain('points to');
        expect(modal.textContent).toContain('Gold');
    });

    it('shows "highest tier" when user is Gold (no nextTier)', () => {
        setCurrentUser({ name: 'Gold User', phone: '1234567890', loyaltyPoints: 1500 });
        openLoyaltyModal();
        const modal = document.getElementById('loyalty-modal');
        expect(modal.textContent).toMatch(/highest tier/i);
    });

    it('progress bar is 100% when at highest tier', () => {
        setCurrentUser({ name: 'Max Tier', phone: '1234567890', loyaltyPoints: 2000 });
        openLoyaltyModal();
        const modal = document.getElementById('loyalty-modal');
        const fill = modal.querySelector('.loyalty-progress-fill');
        expect(fill.style.width).toBe('100%');
    });

    it('shows correct progress percentage for mid-tier user', () => {
        // Bronze: min=0, Silver: min=500. At 250 pts: (250-0)/(500-0)*100 = 50%
        setCurrentUser({ name: 'Mid User', phone: '1234567890', loyaltyPoints: 250 });
        openLoyaltyModal();
        const modal = document.getElementById('loyalty-modal');
        const fill = modal.querySelector('.loyalty-progress-fill');
        expect(fill.style.width).toBe('50%');
    });

    it('renders all tier items in the loyalty tiers list', () => {
        setCurrentUser({ name: 'List User', phone: '1234567890', loyaltyPoints: 100 });
        openLoyaltyModal();
        const modal = document.getElementById('loyalty-modal');
        const items = modal.querySelectorAll('.loyalty-tier-item');
        expect(items.length).toBe(3); // Bronze, Silver, Gold
    });

    it('marks current tier item as active', () => {
        setCurrentUser({ name: 'Active Tier', phone: '1234567890', loyaltyPoints: 600 });
        openLoyaltyModal();
        const modal = document.getElementById('loyalty-modal');
        const activeItems = modal.querySelectorAll('.loyalty-tier-item.active');
        expect(activeItems.length).toBe(1);
        expect(activeItems[0].textContent).toContain('Silver');
    });

    it('reuses existing loyalty modal on subsequent calls', () => {
        setCurrentUser({ name: 'Reuse User', phone: '1234567890', loyaltyPoints: 100 });
        openLoyaltyModal();
        openLoyaltyModal();
        const modals = document.body.querySelectorAll('#loyalty-modal');
        expect(modals.length).toBe(1);
    });

    it('closes modal when clicking backdrop', () => {
        setCurrentUser({ name: 'Backdrop User', phone: '1234567890', loyaltyPoints: 100 });
        openLoyaltyModal();
        const modal = document.getElementById('loyalty-modal');
        const clickEvent = new MouseEvent('click', { bubbles: true });
        Object.defineProperty(clickEvent, 'target', { value: modal });
        modal.dispatchEvent(clickEvent);
        expect(modal.style.display).toBe('none');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// checkBirthdayRewards — birthday month check returns true (line 150)
// ═══════════════════════════════════════════════════════════════════════════
describe('checkBirthdayRewards — birthday month matching (line 150)', () => {
    it('returns true when dob month matches current month exactly', () => {
        const now = new Date();
        const dob = new Date(1985, now.getMonth(), 1).toISOString();
        expect(checkBirthdayRewards({ name: 'Birthday', dob })).toBe(true);
    });

    it('returns false when dob month is one month off', () => {
        const now = new Date();
        const otherMonth = (now.getMonth() + 1) % 12;
        const dob = new Date(1985, otherMonth, 1).toISOString();
        expect(checkBirthdayRewards({ name: 'Not Birthday', dob })).toBe(false);
    });

    it('returns true regardless of birth year', () => {
        const now = new Date();
        const dob1 = new Date(1950, now.getMonth(), 20).toISOString();
        const dob2 = new Date(2005, now.getMonth(), 5).toISOString();
        expect(checkBirthdayRewards({ name: 'Old', dob: dob1 })).toBe(true);
        expect(checkBirthdayRewards({ name: 'Young', dob: dob2 })).toBe(true);
    });

    it('returns true regardless of birth day within the month', () => {
        const now = new Date();
        const dob = new Date(1990, now.getMonth(), 28).toISOString();
        expect(checkBirthdayRewards({ name: 'Late Month', dob })).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// showBirthdayBanner — insertion positions (line 170)
// ═══════════════════════════════════════════════════════════════════════════
describe('showBirthdayBanner — insertion positions (lines 158-162)', () => {
    it('inserts after header when header exists with a nextSibling', () => {
        setupDOM('<header></header><main></main>');
        const dob = new Date(1990, new Date().getMonth(), 15).toISOString();
        showBirthdayBanner({ name: 'Header Test', dob });
        const banner = document.getElementById('birthday-banner');
        expect(banner).not.toBeNull();
        const header = document.body.querySelector('header');
        expect(header.nextElementSibling).toBe(banner);
    });

    it('inserts after nav when no header but nav exists with nextSibling', () => {
        setupDOM('<nav></nav><main></main>');
        const dob = new Date(1990, new Date().getMonth(), 15).toISOString();
        showBirthdayBanner({ name: 'Nav Test', dob });
        const banner = document.getElementById('birthday-banner');
        expect(banner).not.toBeNull();
        const nav = document.body.querySelector('nav');
        expect(nav.nextElementSibling).toBe(banner);
    });

    it('inserts as first child of body when no header or nav exists', () => {
        setupDOM('<div id="content">stuff</div>');
        const dob = new Date(1990, new Date().getMonth(), 15).toISOString();
        showBirthdayBanner({ name: 'No Header', dob });
        const banner = document.getElementById('birthday-banner');
        expect(banner).not.toBeNull();
        expect(document.body.firstChild).toBe(banner);
    });

    it('inserts as first child when header exists but has no nextSibling', () => {
        // header is the only child — header.nextSibling could be null
        // In this case the condition (header && header.nextSibling) is false
        // so it falls to the else: body.insertBefore(banner, body.firstChild)
        const origGetById = Document.prototype.getElementById;
        document.body.innerHTML = '';
        const header = document.createElement('header');
        document.body.appendChild(header);
        document.getElementById = origGetById.bind(document);
        document.querySelector = Document.prototype.querySelector.bind(document);
        document.querySelectorAll = Document.prototype.querySelectorAll.bind(document);

        const dob = new Date(1990, new Date().getMonth(), 15).toISOString();
        showBirthdayBanner({ name: 'Lone Header', dob });
        const banner = document.getElementById('birthday-banner');
        expect(banner).not.toBeNull();
        // Banner should be inserted as first child of body (before header)
        // OR after header depending on nextSibling. Since header is the last child,
        // header.nextSibling is null, so the else branch fires.
        expect(document.body.firstChild).toBe(banner);
    });

    it('does not create banner for null user', () => {
        setupDOM('<header></header><main></main>');
        showBirthdayBanner(null);
        expect(document.getElementById('birthday-banner')).toBeNull();
    });

    it('does not create banner when birthday month does not match', () => {
        setupDOM('<header></header><main></main>');
        const otherMonth = (new Date().getMonth() + 6) % 12;
        const dob = new Date(1990, otherMonth, 15).toISOString();
        showBirthdayBanner({ name: 'Wrong Month', dob });
        expect(document.getElementById('birthday-banner')).toBeNull();
    });

    it('displays user first name in the banner', () => {
        setupDOM('<header></header><main></main>');
        const dob = new Date(1990, new Date().getMonth(), 15).toISOString();
        showBirthdayBanner({ name: 'Ravi Kumar', dob });
        const banner = document.getElementById('birthday-banner');
        expect(banner.textContent).toContain('Ravi');
        expect(banner.textContent).not.toContain('Kumar');
    });
});

// ===========================================================================
// Branch coverage: updateLoyaltyWidget — loyaltyPoints fallback to 0 (line 71)
// ===========================================================================
describe('updateLoyaltyWidget — loyaltyPoints fallback (line 71)', () => {
    beforeEach(() => {
        localStorage.clear();
        setupDOM('<div id="loyalty-widget" style="display:none"></div><div id="auth-toast"></div>');
    });

    it('falls back to 0 when user.loyaltyPoints is undefined', () => {
        setCurrentUser({ name: 'Test', phone: '9876543210' }); // no loyaltyPoints
        updateLoyaltyWidget();
        const widget = document.getElementById('loyalty-widget');
        expect(widget.textContent).toContain('0 pts');
    });
});

// ===========================================================================
// Branch coverage: openLoyaltyModal — user null calls openAuthModal (lines 84-87)
// ===========================================================================
describe('openLoyaltyModal — user null triggers openAuthModal (lines 84-87)', () => {
    beforeEach(() => {
        localStorage.clear();
        setupDOM('<div id="auth-toast"></div>');
    });

    it('calls openAuthModal when no user is logged in', () => {
        const mockOpenAuth = vi.fn();
        window.openAuthModal = mockOpenAuth;
        openLoyaltyModal();
        expect(mockOpenAuth).toHaveBeenCalled();
    });

    it('does not create loyalty modal when user is null', () => {
        window.openAuthModal = vi.fn();
        openLoyaltyModal();
        expect(document.getElementById('loyalty-modal')).toBeNull();
    });
});

// ===========================================================================
// Branch coverage: openLoyaltyModal — modal backdrop click (line 100)
// ===========================================================================
describe('openLoyaltyModal — backdrop click closes modal (line 100)', () => {
    beforeEach(() => {
        localStorage.clear();
        setupDOM('<div id="auth-toast"></div>');
    });

    it('hides modal when clicking the modal backdrop', () => {
        setCurrentUser({ name: 'Test', phone: '9876543210', loyaltyPoints: 50 });
        openLoyaltyModal();
        const modal = document.getElementById('loyalty-modal');
        expect(modal.style.display).toBe('block');
        // Simulate clicking on the modal (backdrop)
        const clickEvent = new MouseEvent('click', { bubbles: true });
        Object.defineProperty(clickEvent, 'target', { value: modal });
        modal.dispatchEvent(clickEvent);
        expect(modal.style.display).toBe('none');
    });

    it('does not hide modal when clicking inside modal content', () => {
        setCurrentUser({ name: 'Test', phone: '9876543210', loyaltyPoints: 50 });
        openLoyaltyModal();
        const modal = document.getElementById('loyalty-modal');
        const content = modal.querySelector('.modal-content');
        const clickEvent = new MouseEvent('click', { bubbles: true });
        Object.defineProperty(clickEvent, 'target', { value: content });
        modal.dispatchEvent(clickEvent);
        expect(modal.style.display).toBe('block');
    });
});

// ===========================================================================
// Branch coverage: showBirthdayBanner — banner already exists (line 149-150)
// ===========================================================================
describe('showBirthdayBanner — banner already exists (line 149-150)', () => {
    beforeEach(() => {
        localStorage.clear();
        setupDOM('<header></header><div id="birthday-banner">Existing</div>');
    });

    it('does not create a second banner when one already exists', () => {
        const dob = new Date(1990, new Date().getMonth(), 15).toISOString();
        showBirthdayBanner({ name: 'Test', dob });
        const banners = document.body.querySelectorAll('#birthday-banner');
        expect(banners.length).toBe(1);
        // Original banner text should remain
        expect(banners[0].textContent).toBe('Existing');
    });
});

// ===========================================================================
// Branch coverage: closeBirthdayBanner — banner.parentNode removal (line 170)
// ===========================================================================
describe('closeBirthdayBanner — parentNode removal (line 170)', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.useFakeTimers();
        setupDOM('<header></header><main></main>');
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it('removes banner from DOM after timeout', () => {
        const dob = new Date(1990, new Date().getMonth(), 15).toISOString();
        showBirthdayBanner({ name: 'Test', dob });
        const banner = document.getElementById('birthday-banner');
        expect(banner).not.toBeNull();
        // Call closeBirthdayBanner via window
        window.closeBirthdayBanner();
        expect(banner.style.opacity).toBe('0');
        // Advance past the 400ms removal timeout
        vi.advanceTimersByTime(500);
        expect(document.getElementById('birthday-banner')).toBeNull();
    });
});

// ===========================================================================
// Branch: openLoyaltyModal — no user calls openAuthModal (lines 84-87)
// ===========================================================================
describe('openLoyaltyModal — no user redirects to auth (lines 84-87)', () => {
    beforeEach(() => {
        localStorage.clear();
        setupDOM('<div id="auth-toast"></div>');
    });

    it('calls openAuthModal when no user is logged in and openAuthModal is a function', () => {
        const openAuthSpy = vi.fn();
        window.openAuthModal = openAuthSpy;
        openLoyaltyModal();
        expect(openAuthSpy).toHaveBeenCalled();
    });

    it('does not throw when no user and openAuthModal is not a function', () => {
        delete window.openAuthModal;
        expect(() => openLoyaltyModal()).not.toThrow();
    });
});

// ===========================================================================
// Branch: showBirthdayBanner — banner already exists (line 150)
// ===========================================================================
describe('showBirthdayBanner — already shown this session (line 150)', () => {
    beforeEach(() => {
        localStorage.clear();
        setupDOM('<header></header><div id="birthday-banner">Existing</div>');
    });

    it('does not create a second banner if one already exists', () => {
        const dob = new Date(1990, new Date().getMonth(), 15).toISOString();
        showBirthdayBanner({ name: 'Test', dob });
        const banners = document.body.querySelectorAll('#birthday-banner');
        expect(banners.length).toBe(1);
        expect(banners[0].textContent).toBe('Existing');
    });
});

// ===========================================================================
// Branch: showBirthdayBanner — no header, inserted at body firstChild (line 161)
// ===========================================================================
describe('showBirthdayBanner — no header element (line 161)', () => {
    beforeEach(() => {
        localStorage.clear();
        setupDOM('<div id="some-content">Content</div>');
    });

    it('inserts banner as first child of body when no header/nav exists', () => {
        const dob = new Date(1990, new Date().getMonth(), 15).toISOString();
        showBirthdayBanner({ name: 'Test', dob });
        const banner = document.getElementById('birthday-banner');
        expect(banner).not.toBeNull();
        // Should be first child of body
        expect(document.body.firstChild).toBe(banner);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Branch coverage: openLoyaltyModal — no user opens auth modal (line 87)
// ═══════════════════════════════════════════════════════════════════════════
describe('openLoyaltyModal — no user opens auth modal (line 87)', () => {
    beforeEach(() => {
        localStorage.clear();
        setupDOM('<div id="auth-toast"></div>');
    });

    it('calls openAuthModal when no user is logged in (line 84)', () => {
        const openAuth = vi.fn();
        window.openAuthModal = openAuth;
        openLoyaltyModal();
        expect(openAuth).toHaveBeenCalled();
        delete window.openAuthModal;
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Branch coverage: showBirthdayBanner — null user (line 150)
// ═══════════════════════════════════════════════════════════════════════════
describe('showBirthdayBanner — null user returns early (line 150)', () => {
    beforeEach(() => {
        localStorage.clear();
        setupDOM('<header></header>');
    });

    it('does nothing when user is null (line 147)', () => {
        showBirthdayBanner(null);
        expect(document.getElementById('birthday-banner')).toBeNull();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Branch coverage: closeBirthdayBanner (line 170)
// ═══════════════════════════════════════════════════════════════════════════
describe('closeBirthdayBanner — removes banner after animation (line 170)', () => {
    beforeEach(() => {
        localStorage.clear();
        setupDOM('<header></header>');
    });

    it('sets opacity 0 and removes banner element after timeout (line 170)', () => {
        vi.useFakeTimers();
        const dob = new Date(1990, new Date().getMonth(), 15).toISOString();
        showBirthdayBanner({ name: 'Test', dob });
        const banner = document.getElementById('birthday-banner');
        expect(banner).not.toBeNull();

        // Call closeBirthdayBanner via window
        window.closeBirthdayBanner();
        expect(banner.style.opacity).toBe('0');

        vi.advanceTimersByTime(500);
        // Banner should be removed from DOM
        expect(document.getElementById('birthday-banner')).toBeNull();
        vi.useRealTimers();
    });
});
