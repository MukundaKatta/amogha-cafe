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
