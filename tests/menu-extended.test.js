import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadMenuRatings, initMenuSync } from '../src/modules/menu.js';

// ===== DOM HELPERS =====
function setupDOM(html) {
    document.body.innerHTML = html || '<div id="auth-toast"></div>';
    document.getElementById = (id) => document.body.querySelector('#' + id);
    document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
    document.querySelector = (sel) => document.body.querySelector(sel);
}

// Build a minimal Firestore-like db mock with per-test control
function makeDb(overrides = {}) {
    const docRef = {
        get: vi.fn(() => Promise.resolve({ exists: false, data: () => ({}) })),
        set: vi.fn(() => Promise.resolve()),
        update: vi.fn(() => Promise.resolve()),
    };
    const colRef = {
        doc: vi.fn(() => docRef),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        get: vi.fn(() => Promise.resolve({ forEach: vi.fn(), docs: [] })),
        onSnapshot: vi.fn((successCb, _errCb) => {
            successCb({ forEach: vi.fn(), docs: [] });
            return vi.fn(); // unsubscribe fn
        }),
    };
    return {
        collection: vi.fn(() => ({ ...colRef, ...overrides })),
        _colRef: colRef,
        _docRef: docRef,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// loadMenuRatings
// ═══════════════════════════════════════════════════════════════════════════
describe('loadMenuRatings', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        // Restore a valid db after clearAllMocks
        globalThis.db = makeDb();
        globalThis.window.db = globalThis.db;
        setupDOM(`
            <div class="menu-item-card" data-id="Biryani">
                <h4>Biryani</h4>
                <p class="item-description">Aromatic rice dish</p>
                <div class="menu-item-rating"></div>
            </div>
            <div class="menu-item-card" data-id="Dal">
                <h4>Dal</h4>
                <p class="item-description">Lentil curry</p>
                <div class="menu-item-rating"></div>
            </div>
        `);
    });

    it('does nothing when db is null', () => {
        globalThis.db = null;
        globalThis.window.db = null;
        // Should return early without throwing
        expect(() => loadMenuRatings()).not.toThrow();
    });

    it('returns cached ratings immediately without hitting Firestore when cache is fresh', () => {
        const cachedRatings = {
            Biryani: { total: 45, count: 10 },
        };
        localStorage.setItem('amoghaRatings', JSON.stringify({ ts: Date.now(), data: cachedRatings }));

        const collectionSpy = vi.spyOn(globalThis.db, 'collection');
        loadMenuRatings();

        // Should not call Firestore at all when cache is fresh
        expect(collectionSpy).not.toHaveBeenCalled();

        // The rating element should have been created for Biryani
        const biryaniCard = document.body.querySelector('[data-id="Biryani"]');
        expect(biryaniCard.querySelector('.item-rating')).not.toBeNull();
        expect(biryaniCard.querySelector('.rating-text').textContent).toContain('4.5');
        expect(biryaniCard.querySelector('.rating-text').textContent).toContain('10');
    });

    it('fetches ratings from Firestore and injects rating elements into matching menu item cards', async () => {
        // No cache — force Firestore fetch
        const reviewDocs = [
            { data: () => ({ itemName: 'Biryani', rating: 4 }) },
            { data: () => ({ itemName: 'Biryani', rating: 5 }) },
            { data: () => ({ itemName: 'Dal', rating: 3 }) },
        ];
        const mockSnap = {
            forEach: (cb) => reviewDocs.forEach((d) => cb(d)),
        };
        globalThis.db = {
            collection: vi.fn(() => ({
                get: vi.fn(() => Promise.resolve(mockSnap)),
            })),
        };
        globalThis.window.db = globalThis.db;

        loadMenuRatings();
        await new Promise((resolve) => setTimeout(resolve, 0));

        const biryaniCard = document.body.querySelector('[data-id="Biryani"]');
        const ratingEl = biryaniCard.querySelector('.item-rating');
        expect(ratingEl).not.toBeNull();

        // avg = (4+5)/2 = 4.5
        expect(ratingEl.querySelector('.rating-text').textContent).toContain('4.5');
        expect(ratingEl.querySelector('.rating-text').textContent).toContain('(2)');

        const dalCard = document.body.querySelector('[data-id="Dal"]');
        const dalRating = dalCard.querySelector('.item-rating');
        expect(dalRating).not.toBeNull();
        // avg = 3/1 = 3.0
        expect(dalRating.querySelector('.rating-text').textContent).toContain('3.0');
        expect(dalRating.querySelector('.rating-text').textContent).toContain('(1)');
    });

    it('inserts rating element after .item-description when description exists', async () => {
        const reviewDocs = [
            { data: () => ({ itemName: 'Biryani', rating: 5 }) },
        ];
        const mockSnap = {
            forEach: (cb) => reviewDocs.forEach((d) => cb(d)),
        };
        globalThis.db = {
            collection: vi.fn(() => ({
                get: vi.fn(() => Promise.resolve(mockSnap)),
            })),
        };
        globalThis.window.db = globalThis.db;

        loadMenuRatings();
        await new Promise((resolve) => setTimeout(resolve, 0));

        const biryaniCard = document.body.querySelector('[data-id="Biryani"]');
        const desc = biryaniCard.querySelector('.item-description');
        const ratingEl = biryaniCard.querySelector('.item-rating');
        expect(ratingEl).not.toBeNull();
        // Rating element should appear after description in the DOM
        expect(desc.nextElementSibling).toBe(ratingEl);
    });

    it('does not inject a rating element for items with zero reviews', async () => {
        const reviewDocs = [
            { data: () => ({ itemName: 'Biryani', rating: 4 }) },
        ];
        const mockSnap = {
            forEach: (cb) => reviewDocs.forEach((d) => cb(d)),
        };
        globalThis.db = {
            collection: vi.fn(() => ({
                get: vi.fn(() => Promise.resolve(mockSnap)),
            })),
        };
        globalThis.window.db = globalThis.db;

        loadMenuRatings();
        await new Promise((resolve) => setTimeout(resolve, 0));

        // Dal has no reviews, so no .item-rating should be injected
        const dalCard = document.body.querySelector('[data-id="Dal"]');
        expect(dalCard.querySelector('.item-rating')).toBeNull();
    });

    it('removes existing .item-rating before injecting fresh one', async () => {
        // Pre-inject a stale rating element on Biryani
        const biryaniCard = document.body.querySelector('[data-id="Biryani"]');
        const stale = document.createElement('div');
        stale.className = 'item-rating';
        stale.textContent = 'stale';
        biryaniCard.appendChild(stale);

        const reviewDocs = [
            { data: () => ({ itemName: 'Biryani', rating: 5 }) },
        ];
        const mockSnap = {
            forEach: (cb) => reviewDocs.forEach((d) => cb(d)),
        };
        globalThis.db = {
            collection: vi.fn(() => ({
                get: vi.fn(() => Promise.resolve(mockSnap)),
            })),
        };
        globalThis.window.db = globalThis.db;

        loadMenuRatings();
        await new Promise((resolve) => setTimeout(resolve, 0));

        // Only one .item-rating should exist, not two
        const ratings = biryaniCard.querySelectorAll('.item-rating');
        expect(ratings.length).toBe(1);
        expect(ratings[0].textContent).not.toContain('stale');
    });

    it('saves fetched ratings to localStorage for future cache hits', async () => {
        const reviewDocs = [
            { data: () => ({ itemName: 'Biryani', rating: 4 }) },
        ];
        const mockSnap = {
            forEach: (cb) => reviewDocs.forEach((d) => cb(d)),
        };
        globalThis.db = {
            collection: vi.fn(() => ({
                get: vi.fn(() => Promise.resolve(mockSnap)),
            })),
        };
        globalThis.window.db = globalThis.db;

        loadMenuRatings();
        await new Promise((resolve) => setTimeout(resolve, 0));

        const saved = localStorage.getItem('amoghaRatings');
        expect(saved).not.toBeNull();
        const parsed = JSON.parse(saved);
        expect(parsed.ts).toBeGreaterThan(0);
        expect(parsed.data.Biryani).toEqual({ total: 4, count: 1 });
    });

    it('uses stale cache as fallback when Firestore fetch fails', async () => {
        const staleRatings = { Biryani: { total: 20, count: 4 } };
        // Intentionally expired timestamp
        localStorage.setItem('amoghaRatings', JSON.stringify({ ts: Date.now() - 999999, data: staleRatings }));

        globalThis.db = {
            collection: vi.fn(() => ({
                get: vi.fn(() => Promise.reject(new Error('network error'))),
            })),
        };
        globalThis.window.db = globalThis.db;

        loadMenuRatings();
        await new Promise((resolve) => setTimeout(resolve, 0));

        // Stale cache data should have been applied (avg = 5.0)
        const biryaniCard = document.body.querySelector('[data-id="Biryani"]');
        const ratingEl = biryaniCard.querySelector('.item-rating');
        expect(ratingEl).not.toBeNull();
        expect(ratingEl.querySelector('.rating-text').textContent).toContain('5.0');
    });

    it('does not throw when Firestore errors and no stale cache exists', async () => {
        globalThis.db = {
            collection: vi.fn(() => ({
                get: vi.fn(() => Promise.reject(new Error('network error'))),
            })),
        };
        globalThis.window.db = globalThis.db;

        await expect(
            (async () => {
                loadMenuRatings();
                await new Promise((resolve) => setTimeout(resolve, 0));
            })()
        ).resolves.not.toThrow();
    });

    it('strips badge text (Bestseller, Must Try, New) from h4 when matching ratings', async () => {
        setupDOM(`
            <div class="menu-item-card" data-id="Biryani">
                <h4>BiryaniMust Try</h4>
                <p class="item-description">Desc</p>
            </div>
        `);
        const reviewDocs = [
            { data: () => ({ itemName: 'Biryani', rating: 5 }) },
        ];
        const mockSnap = {
            forEach: (cb) => reviewDocs.forEach((d) => cb(d)),
        };
        globalThis.db = {
            collection: vi.fn(() => ({
                get: vi.fn(() => Promise.resolve(mockSnap)),
            })),
        };
        globalThis.window.db = globalThis.db;

        loadMenuRatings();
        await new Promise((resolve) => setTimeout(resolve, 0));

        const card = document.body.querySelector('[data-id="Biryani"]');
        // "Must Try" badge text is stripped before matching, so rating should be found
        expect(card.querySelector('.item-rating')).not.toBeNull();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// initMenuSync
// ═══════════════════════════════════════════════════════════════════════════
describe('initMenuSync', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        globalThis.db = makeDb();
        globalThis.window.db = globalThis.db;
        // Provide a container so skeleton injection does not error
        setupDOM(`
            <div id="dynamic-menu-container"></div>
            <div class="specials-grid"></div>
        `);
    });

    it('does nothing when db is null', () => {
        globalThis.db = null;
        globalThis.window.db = null;
        expect(() => initMenuSync()).not.toThrow();
    });

    it('sets up an onSnapshot listener on the menu collection', () => {
        const onSnapshotSpy = vi.fn((cb) => {
            cb({ forEach: vi.fn() });
            return vi.fn();
        });
        globalThis.db = {
            collection: vi.fn(() => ({
                orderBy: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                get: vi.fn(() => Promise.resolve({ forEach: vi.fn(), docs: [] })),
                onSnapshot: onSnapshotSpy,
                doc: vi.fn(() => ({
                    get: vi.fn(() => Promise.resolve({ exists: false, data: () => ({}) })),
                })),
            })),
        };
        globalThis.window.db = globalThis.db;

        initMenuSync();

        // db.collection should have been called at least once (for 'menu')
        expect(globalThis.db.collection).toHaveBeenCalledWith('menu');
        expect(onSnapshotSpy).toHaveBeenCalled();
    });

    it('injects skeleton HTML into dynamic-menu-container before data arrives', () => {
        // Use a db that never fires the snapshot callback so we can inspect
        // the skeleton state
        const neverFireDb = {
            collection: vi.fn(() => ({
                orderBy: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                get: vi.fn(() => new Promise(() => {})), // never resolves
                onSnapshot: vi.fn(() => vi.fn()),        // never fires
                doc: vi.fn(() => ({
                    get: vi.fn(() => new Promise(() => {})),
                })),
            })),
        };
        globalThis.db = neverFireDb;
        globalThis.window.db = globalThis.db;

        initMenuSync();

        const container = document.getElementById('dynamic-menu-container');
        // Skeleton cards should have been injected
        expect(container.innerHTML).toContain('menu-skeleton-card');
    });

    it('replaces skeleton with rendered category HTML when menu snapshot fires', () => {
        const menuDocs = [
            { id: 'Biryani', data: () => ({ category: 'Biryanis', price: 199, available: true, type: 'non-veg' }) },
            { id: 'Paneer Tikka', data: () => ({ category: 'Starters', price: 149, available: true, type: 'veg' }) },
        ];

        const onSnapshotSpy = vi.fn((successCb) => {
            successCb({ forEach: (cb) => menuDocs.forEach((d) => cb(d)) });
            return vi.fn();
        });

        globalThis.db = {
            collection: vi.fn(() => ({
                orderBy: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                get: vi.fn(() => Promise.resolve({ forEach: vi.fn(), docs: [] })),
                onSnapshot: onSnapshotSpy,
                doc: vi.fn(() => ({
                    get: vi.fn(() => Promise.resolve({ exists: false, data: () => ({}) })),
                })),
            })),
        };
        globalThis.window.db = globalThis.db;

        initMenuSync();

        const container = document.getElementById('dynamic-menu-container');
        // After snapshot, skeleton should be gone and real category sections present
        expect(container.innerHTML).not.toContain('menu-skeleton-card');
        expect(container.innerHTML).toContain('Biryani');
        expect(container.innerHTML).toContain('Paneer Tikka');
        expect(container.innerHTML).toContain('menu-item-card');
    });

    it('shows error message in container when menu onSnapshot fails', () => {
        const onSnapshotSpy = vi.fn((_successCb, errorCb) => {
            errorCb(new Error('permission-denied'));
            return vi.fn();
        });

        globalThis.db = {
            collection: vi.fn(() => ({
                orderBy: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                get: vi.fn(() => Promise.resolve({ forEach: vi.fn(), docs: [] })),
                onSnapshot: onSnapshotSpy,
                doc: vi.fn(() => ({
                    get: vi.fn(() => Promise.resolve({ exists: false, data: () => ({}) })),
                })),
            })),
        };
        globalThis.window.db = globalThis.db;

        initMenuSync();

        const container = document.getElementById('dynamic-menu-container');
        expect(container.innerHTML).toContain('Could not load menu');
    });

    it('hides .specials section when Firestore specials collection is empty (cache miss)', async () => {
        setupDOM(`
            <div id="dynamic-menu-container"></div>
            <section class="specials">
                <div class="specials-grid"></div>
            </section>
        `);

        const emptySnap = { forEach: vi.fn(), docs: [] };
        globalThis.db = {
            collection: vi.fn(() => ({
                orderBy: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                get: vi.fn(() => Promise.resolve(emptySnap)),
                onSnapshot: vi.fn((cb) => { cb({ forEach: vi.fn() }); return vi.fn(); }),
                doc: vi.fn(() => ({
                    get: vi.fn(() => Promise.resolve({ exists: false, data: () => ({}) })),
                })),
            })),
        };
        globalThis.window.db = globalThis.db;

        initMenuSync();
        await new Promise((resolve) => setTimeout(resolve, 0));

        const specialsSection = document.querySelector('.specials');
        expect(specialsSection.style.display).toBe('none');
    });

    it('calls cachedGet for specials with correct collection and cache key', () => {
        // We verify that db.collection is called with 'specials' (used by cachedGet inside initMenuSync)
        const collectionCalls = [];
        globalThis.db = {
            collection: vi.fn((name) => {
                collectionCalls.push(name);
                return {
                    orderBy: vi.fn().mockReturnThis(),
                    where: vi.fn().mockReturnThis(),
                    get: vi.fn(() => Promise.resolve({ forEach: vi.fn(), docs: [] })),
                    onSnapshot: vi.fn((cb) => { cb({ forEach: vi.fn() }); return vi.fn(); }),
                    doc: vi.fn(() => ({
                        get: vi.fn(() => Promise.resolve({ exists: false, data: () => ({}) })),
                    })),
                };
            }),
        };
        globalThis.window.db = globalThis.db;

        initMenuSync();

        expect(collectionCalls).toContain('specials');
    });

    it('applies seasonal theme class when settings/global returns an activeTheme', async () => {
        const onSnapshotSpy = vi.fn((cb) => { cb({ forEach: vi.fn() }); return vi.fn(); });
        const settingsDocRef = {
            get: vi.fn(() => Promise.resolve({
                exists: true,
                data: () => ({ activeTheme: 'diwali' }),
            })),
        };
        const settingsColRef = {
            doc: vi.fn(() => settingsDocRef),
            orderBy: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            get: vi.fn(() => Promise.resolve({ forEach: vi.fn(), docs: [] })),
            onSnapshot: onSnapshotSpy,
        };

        globalThis.db = {
            collection: vi.fn((name) => {
                if (name === 'settings') return settingsColRef;
                return {
                    doc: vi.fn(() => ({
                        get: vi.fn(() => Promise.resolve({ exists: false, data: () => ({}) })),
                    })),
                    orderBy: vi.fn().mockReturnThis(),
                    where: vi.fn().mockReturnThis(),
                    get: vi.fn(() => Promise.resolve({ forEach: vi.fn(), docs: [] })),
                    onSnapshot: onSnapshotSpy,
                };
            }),
        };
        globalThis.window.db = globalThis.db;

        initMenuSync();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(document.body.classList.contains('theme-diwali')).toBe(true);
    });

    it('skips Firestore settings call and uses cached theme when theme_cache is fresh', () => {
        localStorage.setItem('theme_cache', JSON.stringify({ ts: Date.now(), theme: 'eid' }));

        const collectionCalls = [];
        globalThis.db = {
            collection: vi.fn((name) => {
                collectionCalls.push(name);
                return {
                    doc: vi.fn(() => ({
                        get: vi.fn(() => Promise.resolve({ exists: false, data: () => ({}) })),
                    })),
                    orderBy: vi.fn().mockReturnThis(),
                    where: vi.fn().mockReturnThis(),
                    get: vi.fn(() => Promise.resolve({ forEach: vi.fn(), docs: [] })),
                    onSnapshot: vi.fn((cb) => { cb({ forEach: vi.fn() }); return vi.fn(); }),
                };
            }),
        };
        globalThis.window.db = globalThis.db;

        initMenuSync();

        // settings collection should NOT be queried when theme cache is fresh
        expect(collectionCalls).not.toContain('settings');
        // Theme class should be applied from cache
        expect(document.body.classList.contains('theme-eid')).toBe(true);
    });

    it('does not add theme class when activeTheme is default', async () => {
        const onSnapshotSpy = vi.fn((cb) => { cb({ forEach: vi.fn() }); return vi.fn(); });
        const settingsDocRef = {
            get: vi.fn(() => Promise.resolve({
                exists: true,
                data: () => ({ activeTheme: 'default' }),
            })),
        };

        globalThis.db = {
            collection: vi.fn((name) => {
                if (name === 'settings') {
                    return { doc: vi.fn(() => settingsDocRef), orderBy: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), get: vi.fn(() => Promise.resolve({ forEach: vi.fn(), docs: [] })), onSnapshot: onSnapshotSpy };
                }
                return {
                    doc: vi.fn(() => ({ get: vi.fn(() => Promise.resolve({ exists: false, data: () => ({}) })) })),
                    orderBy: vi.fn().mockReturnThis(),
                    where: vi.fn().mockReturnThis(),
                    get: vi.fn(() => Promise.resolve({ forEach: vi.fn(), docs: [] })),
                    onSnapshot: onSnapshotSpy,
                };
            }),
        };
        globalThis.window.db = globalThis.db;

        // Clean any prior theme classes
        document.body.className = '';

        initMenuSync();
        await new Promise((resolve) => setTimeout(resolve, 0));

        // No theme-* class should be present when activeTheme is 'default'
        const hasThemeClass = [...document.body.classList].some((c) => c.startsWith('theme-'));
        expect(hasThemeClass).toBe(false);
    });

    it('renders testimonials grid when testimonials collection returns active items', async () => {
        setupDOM(`
            <div id="dynamic-menu-container"></div>
            <section class="testimonials">
                <div id="testimonials-grid"></div>
            </section>
        `);

        const testimonialDocs = [
            { data: () => ({ active: true, customerName: 'Alice', videoUrl: 'https://example.com/v1', caption: 'Amazing!' }) },
            { data: () => ({ active: false, customerName: 'Bob', videoUrl: 'https://example.com/v2' }) },
        ];
        const onSnapshotSpy = vi.fn((cb) => { cb({ forEach: vi.fn() }); return vi.fn(); });

        globalThis.db = {
            collection: vi.fn((name) => {
                if (name === 'testimonials') {
                    return {
                        orderBy: vi.fn().mockReturnThis(),
                        where: vi.fn().mockReturnThis(),
                        get: vi.fn(() => Promise.resolve({
                            forEach: (cb) => testimonialDocs.forEach((d) => cb(d)),
                            docs: testimonialDocs,
                        })),
                        onSnapshot: onSnapshotSpy,
                        doc: vi.fn(() => ({ get: vi.fn(() => Promise.resolve({ exists: false, data: () => ({}) })) })),
                    };
                }
                return {
                    doc: vi.fn(() => ({ get: vi.fn(() => Promise.resolve({ exists: false, data: () => ({}) })) })),
                    orderBy: vi.fn().mockReturnThis(),
                    where: vi.fn().mockReturnThis(),
                    get: vi.fn(() => Promise.resolve({ forEach: vi.fn(), docs: [] })),
                    onSnapshot: onSnapshotSpy,
                };
            }),
        };
        globalThis.window.db = globalThis.db;

        initMenuSync();
        await new Promise((resolve) => setTimeout(resolve, 0));

        const grid = document.getElementById('testimonials-grid');
        // Only Alice is active — Bob has active:false
        expect(grid.innerHTML).toContain('Alice');
        expect(grid.innerHTML).not.toContain('Bob');
        expect(grid.innerHTML).toContain('testimonial-card');
    });

    it('hides testimonials section when all items are inactive', async () => {
        setupDOM(`
            <div id="dynamic-menu-container"></div>
            <section class="testimonials">
                <div id="testimonials-grid"></div>
            </section>
        `);

        const onSnapshotSpy = vi.fn((cb) => { cb({ forEach: vi.fn() }); return vi.fn(); });

        globalThis.db = {
            collection: vi.fn((name) => {
                if (name === 'testimonials') {
                    return {
                        orderBy: vi.fn().mockReturnThis(),
                        where: vi.fn().mockReturnThis(),
                        get: vi.fn(() => Promise.resolve({
                            forEach: (cb) => [{ data: () => ({ active: false }) }].forEach((d) => cb(d)),
                            docs: [],
                        })),
                        onSnapshot: onSnapshotSpy,
                        doc: vi.fn(() => ({ get: vi.fn(() => Promise.resolve({ exists: false, data: () => ({}) })) })),
                    };
                }
                return {
                    doc: vi.fn(() => ({ get: vi.fn(() => Promise.resolve({ exists: false, data: () => ({}) })) })),
                    orderBy: vi.fn().mockReturnThis(),
                    where: vi.fn().mockReturnThis(),
                    get: vi.fn(() => Promise.resolve({ forEach: vi.fn(), docs: [] })),
                    onSnapshot: onSnapshotSpy,
                };
            }),
        };
        globalThis.window.db = globalThis.db;

        initMenuSync();
        await new Promise((resolve) => setTimeout(resolve, 0));

        const section = document.querySelector('.testimonials');
        expect(section.style.display).toBe('none');
    });

    it('renders social feed strip when socialPosts returns active posts', async () => {
        setupDOM(`
            <div id="dynamic-menu-container"></div>
            <section class="social-feed">
                <div id="social-feed-strip"></div>
            </section>
        `);

        const socialDocs = [
            { data: () => ({ active: true, imageUrl: 'https://example.com/img1.jpg', caption: 'Yummy!', link: 'https://instagram.com/p/1' }) },
        ];
        const onSnapshotSpy = vi.fn((cb) => { cb({ forEach: vi.fn() }); return vi.fn(); });

        globalThis.db = {
            collection: vi.fn((name) => {
                if (name === 'socialPosts') {
                    return {
                        orderBy: vi.fn().mockReturnThis(),
                        where: vi.fn().mockReturnThis(),
                        get: vi.fn(() => Promise.resolve({
                            forEach: (cb) => socialDocs.forEach((d) => cb(d)),
                            docs: socialDocs,
                        })),
                        onSnapshot: onSnapshotSpy,
                        doc: vi.fn(() => ({ get: vi.fn(() => Promise.resolve({ exists: false, data: () => ({}) })) })),
                    };
                }
                return {
                    doc: vi.fn(() => ({ get: vi.fn(() => Promise.resolve({ exists: false, data: () => ({}) })) })),
                    orderBy: vi.fn().mockReturnThis(),
                    where: vi.fn().mockReturnThis(),
                    get: vi.fn(() => Promise.resolve({ forEach: vi.fn(), docs: [] })),
                    onSnapshot: onSnapshotSpy,
                };
            }),
        };
        globalThis.window.db = globalThis.db;

        initMenuSync();
        await new Promise((resolve) => setTimeout(resolve, 0));

        const strip = document.getElementById('social-feed-strip');
        expect(strip.innerHTML).toContain('social-card');
        expect(strip.innerHTML).toContain('Yummy!');
    });

    it('hides social-feed section when all posts are inactive', async () => {
        setupDOM(`
            <div id="dynamic-menu-container"></div>
            <section class="social-feed">
                <div id="social-feed-strip"></div>
            </section>
        `);

        const onSnapshotSpy = vi.fn((cb) => { cb({ forEach: vi.fn() }); return vi.fn(); });

        globalThis.db = {
            collection: vi.fn((name) => {
                if (name === 'socialPosts') {
                    return {
                        orderBy: vi.fn().mockReturnThis(),
                        where: vi.fn().mockReturnThis(),
                        get: vi.fn(() => Promise.resolve({
                            forEach: (cb) => [{ data: () => ({ active: false }) }].forEach((d) => cb(d)),
                            docs: [],
                        })),
                        onSnapshot: onSnapshotSpy,
                        doc: vi.fn(() => ({ get: vi.fn(() => Promise.resolve({ exists: false, data: () => ({}) })) })),
                    };
                }
                return {
                    doc: vi.fn(() => ({ get: vi.fn(() => Promise.resolve({ exists: false, data: () => ({}) })) })),
                    orderBy: vi.fn().mockReturnThis(),
                    where: vi.fn().mockReturnThis(),
                    get: vi.fn(() => Promise.resolve({ forEach: vi.fn(), docs: [] })),
                    onSnapshot: onSnapshotSpy,
                };
            }),
        };
        globalThis.window.db = globalThis.db;

        initMenuSync();
        await new Promise((resolve) => setTimeout(resolve, 0));

        const section = document.querySelector('.social-feed');
        expect(section.style.display).toBe('none');
    });

    it('renders menu items grouped into category sections', () => {
        const menuDocs = [
            { id: 'Chicken Biryani', data: () => ({ category: 'Non-veg Biryani', price: 249, available: true, type: 'non-veg' }) },
            { id: 'Veg Pulao', data: () => ({ category: 'Veg Pulao', price: 179, available: true, type: 'veg' }) },
        ];

        globalThis.db = {
            collection: vi.fn(() => ({
                orderBy: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                get: vi.fn(() => Promise.resolve({ forEach: vi.fn(), docs: [] })),
                onSnapshot: vi.fn((cb) => {
                    cb({ forEach: (fn) => menuDocs.forEach((d) => fn(d)) });
                    return vi.fn();
                }),
                doc: vi.fn(() => ({
                    get: vi.fn(() => Promise.resolve({ exists: false, data: () => ({}) })),
                })),
            })),
        };
        globalThis.window.db = globalThis.db;

        initMenuSync();

        const container = document.getElementById('dynamic-menu-container');
        expect(container.innerHTML).toContain('Chicken Biryani');
        expect(container.innerHTML).toContain('Veg Pulao');
        expect(container.innerHTML).toContain('menu-category');
    });

    it('marks unavailable items with item-unavailable class', () => {
        const menuDocs = [
            { id: 'Sold Out Item', data: () => ({ category: 'Extras', price: 50, available: false, type: 'veg' }) },
        ];

        globalThis.db = {
            collection: vi.fn(() => ({
                orderBy: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                get: vi.fn(() => Promise.resolve({ forEach: vi.fn(), docs: [] })),
                onSnapshot: vi.fn((cb) => {
                    cb({ forEach: (fn) => menuDocs.forEach((d) => fn(d)) });
                    return vi.fn();
                }),
                doc: vi.fn(() => ({
                    get: vi.fn(() => Promise.resolve({ exists: false, data: () => ({}) })),
                })),
            })),
        };
        globalThis.window.db = globalThis.db;

        initMenuSync();

        const container = document.getElementById('dynamic-menu-container');
        expect(container.innerHTML).toContain('item-unavailable');
    });
});
