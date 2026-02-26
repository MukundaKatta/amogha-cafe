import { describe, it, expect } from 'vitest';
import { getLoyaltyTier } from '../src/modules/loyalty.js';
import { getActiveHappyHour } from '../src/modules/features.js';
import { LOYALTY_TIERS, HAPPY_HOURS } from '../src/core/constants.js';

describe('Loyalty Tiers', () => {
    it('returns a tier object for 0 points', () => {
        const tier = getLoyaltyTier(0);
        expect(tier).toBeDefined();
        expect(tier).toHaveProperty('name');
        expect(tier).toHaveProperty('min');
        expect(tier).toHaveProperty('icon');
    });

    it('returns Bronze tier for 0 points', () => {
        expect(getLoyaltyTier(0).name).toBe('Bronze');
    });

    it('returns Bronze tier for 499 points (below Silver threshold)', () => {
        expect(getLoyaltyTier(499).name).toBe('Bronze');
    });

    it('returns Silver tier for exactly 500 points', () => {
        expect(getLoyaltyTier(500).name).toBe('Silver');
    });

    it('returns Silver tier for 999 points (below Gold threshold)', () => {
        expect(getLoyaltyTier(999).name).toBe('Silver');
    });

    it('returns Gold tier for 1000 points', () => {
        expect(getLoyaltyTier(1000).name).toBe('Gold');
    });

    it('returns Gold tier for very high points (10000)', () => {
        expect(getLoyaltyTier(10000).name).toBe('Gold');
    });

    it('higher points returns higher or equal tier', () => {
        const low = getLoyaltyTier(0);
        const high = getLoyaltyTier(2000);
        expect(LOYALTY_TIERS.findIndex(t => t.name === high.name))
            .toBeGreaterThanOrEqual(LOYALTY_TIERS.findIndex(t => t.name === low.name));
    });

    it('all tiers have required fields', () => {
        LOYALTY_TIERS.forEach(tier => {
            expect(tier).toHaveProperty('name');
            expect(tier).toHaveProperty('min');
            expect(tier).toHaveProperty('color');
            expect(tier).toHaveProperty('icon');
        });
    });

    it('tiers are sorted by min ascending', () => {
        for (let i = 1; i < LOYALTY_TIERS.length; i++) {
            expect(LOYALTY_TIERS[i].min).toBeGreaterThan(LOYALTY_TIERS[i - 1].min);
        }
    });
});

describe('Happy Hour', () => {
    it('returns null on a Sunday at 10 AM (outside all happy hours)', () => {
        // Sunday = 0, 10 AM — not in weekday happy hour (Mon-Fri 14-17)
        // BUT Sunday IS in late-night happy hour (22-23). So test 10 AM.
        vi.useFakeTimers();
        // Sunday 2024-01-07 10:00 AM
        vi.setSystemTime(new Date('2024-01-07T10:00:00'));
        expect(getActiveHappyHour()).toBeNull();
        vi.useRealTimers();
    });

    it('returns happy hour config on a weekday at 3 PM (14:00-17:00 window)', () => {
        vi.useFakeTimers();
        // Monday 2024-01-01 15:00 — weekday happy hour (14-17)
        vi.setSystemTime(new Date('2024-01-01T15:00:00'));
        const hh = getActiveHappyHour();
        expect(hh).not.toBeNull();
        expect(hh.discount).toBe(15);
        expect(hh.categories).toContain('beverages');
        vi.useRealTimers();
    });

    it('returns null on a weekday at 10 AM (before happy hour)', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-01-01T10:00:00')); // Monday 10 AM
        expect(getActiveHappyHour()).toBeNull();
        vi.useRealTimers();
    });

    it('returns late-night deal at 22:30 (any day)', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-01-03T22:30:00')); // Wednesday 22:30
        const hh = getActiveHappyHour();
        expect(hh).not.toBeNull();
        expect(hh.discount).toBe(20);
        vi.useRealTimers();
    });

    it('returns null at exactly endHour (exclusive)', () => {
        vi.useFakeTimers();
        // Weekday happy hour ends at 17:00 — at 17:00 it should be null
        vi.setSystemTime(new Date('2024-01-01T17:00:00')); // Monday 17:00
        // 17:00 is not < 17, so should be null
        expect(getActiveHappyHour()).toBeNull();
        vi.useRealTimers();
    });

    it('HAPPY_HOURS has weekday and late-night entries', () => {
        const weekdayHH = HAPPY_HOURS.find(h => h.discount === 15);
        const lateNightHH = HAPPY_HOURS.find(h => h.discount === 20);
        expect(weekdayHH).toBeDefined();
        expect(lateNightHH).toBeDefined();
    });
});
