import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cachedGet } from '../src/modules/menu.js';

const CACHE_KEY = 'test_cache_key';
const TTL = 60; // seconds

// A simple transform that returns an array from a Firestore-like snapshot
const transform = (snap) => {
    const items = [];
    snap.docs.forEach(doc => items.push(doc.data()));
    return items;
};

describe('cachedGet — cache behavior', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('renders cached data immediately when cache is fresh (no Firestore call)', () => {
        const freshData = [{ id: 1, name: 'Chicken Biryani' }, { id: 2, name: 'Mutton Biryani' }];
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: freshData }));

        const render = vi.fn();
        cachedGet('menu', CACHE_KEY, TTL, transform, render, {});

        expect(render).toHaveBeenCalledOnce();
        expect(render).toHaveBeenCalledWith(freshData);
        // Firestore collection should NOT have been called for fresh cache
        expect(globalThis.db.collection).not.toHaveBeenCalled();
    });

    it('fetches from Firestore when cache is stale', async () => {
        const staleTs = Date.now() - (TTL + 10) * 1000;
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: staleTs, data: [] }));

        const freshServerData = [{ name: 'Special Dish' }];
        globalThis.db = {
            collection: vi.fn(() => ({
                orderBy: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                get: vi.fn(() => Promise.resolve({
                    docs: freshServerData.map(d => ({ data: () => d })),
                })),
            })),
        };

        const render = vi.fn();
        cachedGet('menu', CACHE_KEY, TTL, (snap) => snap.docs.map(d => d.data()), render, {});

        await new Promise(resolve => setTimeout(resolve, 0));
        expect(globalThis.db.collection).toHaveBeenCalledWith('menu');
        expect(render).toHaveBeenCalled();
    });

    it('fetches from Firestore when no cache exists', async () => {
        // No cache in localStorage
        const serverData = [{ name: 'New Item' }];
        globalThis.db = {
            collection: vi.fn(() => ({
                orderBy: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                get: vi.fn(() => Promise.resolve({
                    docs: serverData.map(d => ({ data: () => d })),
                })),
            })),
        };

        const render = vi.fn();
        cachedGet('menu', CACHE_KEY, TTL, (snap) => snap.docs.map(d => d.data()), render, {});

        await new Promise(resolve => setTimeout(resolve, 0));
        expect(globalThis.db.collection).toHaveBeenCalled();
    });

    it('uses stale cache as fallback when Firestore errors', async () => {
        const staleData = [{ name: 'Stale Biryani' }];
        const staleTs = Date.now() - 999999;
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: staleTs, data: staleData }));

        globalThis.db = {
            collection: vi.fn(() => ({
                orderBy: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                get: vi.fn(() => Promise.reject(new Error('network error'))),
            })),
        };

        const render = vi.fn();
        cachedGet('menu', CACHE_KEY, TTL, transform, render, {});

        await new Promise(resolve => setTimeout(resolve, 0));
        // render should have been called with stale data as fallback
        expect(render).toHaveBeenCalledWith(staleData);
    });

    it('does not call render when Firestore errors and no cache exists', async () => {
        // No cache at all
        globalThis.db = {
            collection: vi.fn(() => ({
                orderBy: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                get: vi.fn(() => Promise.reject(new Error('network error'))),
            })),
        };

        const render = vi.fn();
        cachedGet('menu', CACHE_KEY, TTL, transform, render, {});

        await new Promise(resolve => setTimeout(resolve, 0));
        expect(render).not.toHaveBeenCalled();
    });

    it('saves fetched data to localStorage for next request', async () => {
        const serverData = [{ name: 'Paneer Tikka' }];
        globalThis.db = {
            collection: vi.fn(() => ({
                orderBy: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                get: vi.fn(() => Promise.resolve({
                    docs: serverData.map(d => ({ data: () => d })),
                })),
            })),
        };

        const render = vi.fn();
        cachedGet('menu', CACHE_KEY, TTL, (snap) => snap.docs.map(d => d.data()), render, {});

        await new Promise(resolve => setTimeout(resolve, 0));

        const saved = localStorage.getItem(CACHE_KEY);
        expect(saved).not.toBeNull();
        const parsed = JSON.parse(saved);
        expect(parsed.data).toEqual(serverData);
        expect(parsed.ts).toBeGreaterThan(0);
    });

    it('returns early if db is not available', () => {
        const originalDb = globalThis.db;
        globalThis.db = null;

        const render = vi.fn();
        cachedGet('menu', CACHE_KEY, TTL, transform, render, {});
        expect(render).not.toHaveBeenCalled();

        globalThis.db = originalDb;
    });
});
