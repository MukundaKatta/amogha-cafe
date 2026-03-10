import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock firebase for all modules
vi.mock('../src/core/firebase.js', () => ({
    db: null,
    getDb: () => null,
    getFieldValue: () => null,
}));

beforeEach(() => {
    localStorage.clear();
});

// ===== Gift Cards =====
describe('Gift Cards Module', () => {
    it('should export initGiftCards and redeemGiftCard', async () => {
        const mod = await import('../src/modules/giftcards.js');
        expect(typeof mod.initGiftCards).toBe('function');
        expect(typeof mod.redeemGiftCard).toBe('function');
    });

    it('redeemGiftCard should reject without db', async () => {
        const { redeemGiftCard } = await import('../src/modules/giftcards.js');
        await expect(redeemGiftCard('ABC')).rejects.toThrow('Database not available');
    });
});

// ===== Referral =====
describe('Referral Module', () => {
    it('should export initReferral', async () => {
        const mod = await import('../src/modules/referral.js');
        expect(typeof mod.initReferral).toBe('function');
    });

    it('should read referral code from URL search params', () => {
        const params = new URLSearchParams('?ref=TESTREF');
        expect(params.get('ref')).toBe('TESTREF');
    });
});

// ===== Geofence =====
describe('Geofence Module', () => {
    it('should export initGeofence and stopGeofence', async () => {
        const mod = await import('../src/modules/geofence.js');
        expect(typeof mod.initGeofence).toBe('function');
        expect(typeof mod.stopGeofence).toBe('function');
    });

    it('should not throw when initialized', async () => {
        const { initGeofence } = await import('../src/modules/geofence.js');
        expect(() => initGeofence()).not.toThrow();
    });

    it('stopGeofence should not throw', async () => {
        const { stopGeofence } = await import('../src/modules/geofence.js');
        expect(() => stopGeofence()).not.toThrow();
    });
});

// ===== Music Player =====
describe('Music Player Module', () => {
    it('should export initMusicPlayer', async () => {
        const mod = await import('../src/modules/musicplayer.js');
        expect(typeof mod.initMusicPlayer).toBe('function');
    });
});

// ===== Stories =====
describe('Stories Module', () => {
    it('should export initStories', async () => {
        const mod = await import('../src/modules/stories.js');
        expect(typeof mod.initStories).toBe('function');
    });
});

// ===== Streaks =====
describe('Streaks Module', () => {
    it('should export initStreaks, recordDailyOrder, getCurrentStreak', async () => {
        const mod = await import('../src/modules/streaks.js');
        expect(typeof mod.initStreaks).toBe('function');
        expect(typeof mod.recordDailyOrder).toBe('function');
        expect(typeof mod.getCurrentStreak).toBe('function');
    });

    it('should start with 0 streak', async () => {
        const { getCurrentStreak } = await import('../src/modules/streaks.js');
        expect(getCurrentStreak()).toBe(0);
    });

    it('should record daily order and set streak to 1', async () => {
        const { recordDailyOrder } = await import('../src/modules/streaks.js');
        const data = recordDailyOrder();
        expect(data.currentStreak).toBe(1);
        expect(data.bestStreak).toBe(1);
    });

    it('should not double-count same day', async () => {
        const { recordDailyOrder } = await import('../src/modules/streaks.js');
        recordDailyOrder();
        const data = recordDailyOrder();
        expect(data.currentStreak).toBe(1);
    });

    it('should store streak data in localStorage', async () => {
        const { recordDailyOrder } = await import('../src/modules/streaks.js');
        recordDailyOrder();
        const stored = JSON.parse(localStorage.getItem('amogha_streak'));
        expect(stored).toBeTruthy();
        expect(stored.currentStreak).toBe(1);
        expect(stored.lastOrderDate).toBeTruthy();
    });

    it('should track total days', async () => {
        const { recordDailyOrder } = await import('../src/modules/streaks.js');
        const data = recordDailyOrder();
        expect(data.totalDays).toBe(1);
    });

    it('should calculate daily bonus', async () => {
        const { recordDailyOrder } = await import('../src/modules/streaks.js');
        const data = recordDailyOrder();
        expect(data.todayBonus).toBeGreaterThan(0);
    });
});

// ===== AR Preview =====
describe('AR Preview Module', () => {
    it('should export initARPreview', async () => {
        const mod = await import('../src/modules/arpreview.js');
        expect(typeof mod.initARPreview).toBe('function');
    });
});

// ===== Voice Ordering =====
describe('Voice Ordering Module', () => {
    it('should export initVoiceOrder', async () => {
        const mod = await import('../src/modules/voiceorder.js');
        expect(typeof mod.initVoiceOrder).toBe('function');
    });
});

// ===== Live Queue =====
describe('Live Queue Module', () => {
    it('should export initLiveQueue and estimateWaitTime', async () => {
        const mod = await import('../src/modules/livequeue.js');
        expect(typeof mod.initLiveQueue).toBe('function');
        expect(typeof mod.estimateWaitTime).toBe('function');
    });

    it('should estimate wait time for biryani items', async () => {
        const { estimateWaitTime } = await import('../src/modules/livequeue.js');
        const time = estimateWaitTime([{ category: 'biryani' }]);
        expect(time).toBeGreaterThan(0);
        expect(time).toBeLessThan(60);
    });

    it('should return 0 for empty cart', async () => {
        const { estimateWaitTime } = await import('../src/modules/livequeue.js');
        expect(estimateWaitTime([])).toBe(0);
        expect(estimateWaitTime(null)).toBe(0);
    });

    it('should handle multiple item categories', async () => {
        const { estimateWaitTime } = await import('../src/modules/livequeue.js');
        const time = estimateWaitTime([
            { category: 'biryani' },
            { category: 'beverages' },
            { category: 'starters' }
        ]);
        // Should use the max prep time among items
        expect(time).toBeGreaterThanOrEqual(estimateWaitTime([{ category: 'beverages' }]));
    });

    it('should export currentQueueData', async () => {
        const { currentQueueData } = await import('../src/modules/livequeue.js');
        expect(currentQueueData).toBeTruthy();
        expect(typeof currentQueueData.activeOrders).toBe('number');
    });
});

// ===== Mood Ordering =====
describe('Mood Ordering Module', () => {
    it('should export initMoodOrder', async () => {
        const mod = await import('../src/modules/moodorder.js');
        expect(typeof mod.initMoodOrder).toBe('function');
    });
});
