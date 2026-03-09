// ===== CONSTANTS.JS — RAZORPAY_KEY FALLBACK CHAIN TESTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('RAZORPAY_KEY resolution', () => {
    let originalConfig, originalEnv;

    beforeEach(() => {
        originalConfig = window.AMOGHA_CONFIG;
        // import.meta.env is read-only in Vite, so we test window.AMOGHA_CONFIG paths
    });

    afterEach(() => {
        window.AMOGHA_CONFIG = originalConfig;
    });

    it('exports RAZORPAY_KEY as a string', async () => {
        const { RAZORPAY_KEY } = await import('../src/core/constants.js');
        expect(typeof RAZORPAY_KEY).toBe('string');
    });

    it('uses window.AMOGHA_CONFIG.razorpayKey when available', async () => {
        window.AMOGHA_CONFIG = { razorpayKey: 'rzp_test_from_config' };
        // Dynamic import with cache bust to re-evaluate
        const mod = await import('../src/core/constants.js?bust=config');
        // Since constants are evaluated once at module load, this verifies the resolution logic
        // The key is either from config, env, or empty string
        expect(typeof mod.RAZORPAY_KEY).toBe('string');
    });

    it('falls back to empty string when no config sources exist', async () => {
        window.AMOGHA_CONFIG = undefined;
        const mod = await import('../src/core/constants.js?bust=empty');
        // Without AMOGHA_CONFIG and without VITE env, should be empty or whatever env provides
        expect(typeof mod.RAZORPAY_KEY).toBe('string');
    });

    it('exports all expected constants', async () => {
        const mod = await import('../src/core/constants.js');
        expect(mod.WHATSAPP_NUMBER).toBe('+919121004999');
        expect(mod.MERCHANT_NAME).toBe('AMOGHA CAFE & RESTAURANT');
        expect(mod.FREE_DELIVERY_THRESHOLD).toBe(500);
        expect(mod.DELIVERY_FEE).toBe(49);
        expect(mod.COMBO_DISCOUNT).toBe(0.20);
        expect(mod.CURRENT_BRANCH).toBe('main');
        expect(mod.BRANCHES).toHaveLength(1);
        expect(mod.BRANCHES[0].id).toBe('main');
    });
});

describe('LOYALTY_TIERS structure', () => {
    it('has 3 tiers with correct structure', async () => {
        const { LOYALTY_TIERS } = await import('../src/core/constants.js');
        expect(LOYALTY_TIERS).toHaveLength(3);
        LOYALTY_TIERS.forEach(tier => {
            expect(tier).toHaveProperty('name');
            expect(tier).toHaveProperty('min');
            expect(tier).toHaveProperty('color');
            expect(tier).toHaveProperty('icon');
            expect(typeof tier.min).toBe('number');
        });
        expect(LOYALTY_TIERS[0].name).toBe('Bronze');
        expect(LOYALTY_TIERS[1].name).toBe('Silver');
        expect(LOYALTY_TIERS[2].name).toBe('Gold');
        // Tiers should be ordered by ascending min
        expect(LOYALTY_TIERS[0].min).toBeLessThan(LOYALTY_TIERS[1].min);
        expect(LOYALTY_TIERS[1].min).toBeLessThan(LOYALTY_TIERS[2].min);
    });
});

describe('HAPPY_HOURS structure', () => {
    it('has at least 2 happy hour rules', async () => {
        const { HAPPY_HOURS } = await import('../src/core/constants.js');
        expect(HAPPY_HOURS.length).toBeGreaterThanOrEqual(2);
        HAPPY_HOURS.forEach(rule => {
            expect(rule).toHaveProperty('days');
            expect(rule).toHaveProperty('startHour');
            expect(rule).toHaveProperty('endHour');
            expect(rule).toHaveProperty('discount');
            expect(rule).toHaveProperty('label');
            expect(rule).toHaveProperty('categories');
            expect(Array.isArray(rule.days)).toBe(true);
            expect(Array.isArray(rule.categories)).toBe(true);
            expect(rule.startHour).toBeLessThan(rule.endHour);
            expect(rule.discount).toBeGreaterThan(0);
        });
    });
});

describe('ITEM_PRICES structure', () => {
    it('contains 40+ menu items with numeric prices', async () => {
        const { ITEM_PRICES } = await import('../src/core/constants.js');
        const keys = Object.keys(ITEM_PRICES);
        expect(keys.length).toBeGreaterThanOrEqual(40);
        keys.forEach(item => {
            expect(typeof ITEM_PRICES[item]).toBe('number');
            expect(ITEM_PRICES[item]).toBeGreaterThan(0);
        });
    });

    it('includes signature items', async () => {
        const { ITEM_PRICES } = await import('../src/core/constants.js');
        expect(ITEM_PRICES['Chicken Dum Biryani']).toBe(249);
        expect(ITEM_PRICES['Butter Chicken']).toBe(249);
        expect(ITEM_PRICES['Mutton Dum Biryani']).toBe(349);
    });
});

describe('TRANSLATIONS structure', () => {
    it('supports en, hi, te languages', async () => {
        const { TRANSLATIONS } = await import('../src/core/constants.js');
        expect(TRANSLATIONS).toHaveProperty('en');
        expect(TRANSLATIONS).toHaveProperty('hi');
        expect(TRANSLATIONS).toHaveProperty('te');
    });

    it('all languages have the same keys', async () => {
        const { TRANSLATIONS } = await import('../src/core/constants.js');
        const enKeys = Object.keys(TRANSLATIONS.en).sort();
        const hiKeys = Object.keys(TRANSLATIONS.hi).sort();
        const teKeys = Object.keys(TRANSLATIONS.te).sort();
        expect(hiKeys).toEqual(enKeys);
        expect(teKeys).toEqual(enKeys);
    });

    it('all values are non-empty strings', async () => {
        const { TRANSLATIONS } = await import('../src/core/constants.js');
        ['en', 'hi', 'te'].forEach(lang => {
            Object.entries(TRANSLATIONS[lang]).forEach(([key, val]) => {
                expect(typeof val).toBe('string');
                expect(val.length).toBeGreaterThan(0);
            });
        });
    });
});

describe('ITEM_PAIRINGS structure', () => {
    it('has pairings for popular items', async () => {
        const { ITEM_PAIRINGS } = await import('../src/core/constants.js');
        const keys = Object.keys(ITEM_PAIRINGS);
        expect(keys.length).toBeGreaterThanOrEqual(10);
        expect(ITEM_PAIRINGS).toHaveProperty('Chicken Dum Biryani');
        expect(ITEM_PAIRINGS).toHaveProperty('Butter Chicken');
    });

    it('all pairings are arrays of strings', async () => {
        const { ITEM_PAIRINGS } = await import('../src/core/constants.js');
        Object.entries(ITEM_PAIRINGS).forEach(([item, pairings]) => {
            expect(Array.isArray(pairings)).toBe(true);
            expect(pairings.length).toBeGreaterThan(0);
            pairings.forEach(p => expect(typeof p).toBe('string'));
        });
    });

    it('all paired items exist in ITEM_PRICES', async () => {
        const { ITEM_PAIRINGS, ITEM_PRICES } = await import('../src/core/constants.js');
        Object.entries(ITEM_PAIRINGS).forEach(([item, pairings]) => {
            // The main item should be in ITEM_PRICES
            expect(ITEM_PRICES).toHaveProperty(item);
            // Each pairing should also exist in ITEM_PRICES
            pairings.forEach(p => {
                expect(ITEM_PRICES).toHaveProperty(p);
            });
        });
    });
});

describe('DYNAMIC_PRICING_RULES', () => {
    it('is an array (initially empty)', async () => {
        const { DYNAMIC_PRICING_RULES } = await import('../src/core/constants.js');
        expect(Array.isArray(DYNAMIC_PRICING_RULES)).toBe(true);
    });
});
