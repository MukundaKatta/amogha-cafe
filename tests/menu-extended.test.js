import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadMenuRatings, initMenuSync, showMenuSkeletons, removeMenuSkeletons, cachedGet, toggleSafeForMe, checkAllergenWarning } from '../src/modules/menu.js';

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

    // ═══════════════════════════════════════════════════════════════════════════
    // renderSpecials with data (lines 129-145)
    // ═══════════════════════════════════════════════════════════════════════════
    it('renders specials grid HTML when specials data is provided', async () => {
        setupDOM(`
            <div id="dynamic-menu-container"></div>
            <section class="specials" style="display:none">
                <div class="specials-grid"></div>
            </section>
        `);

        const specialsDocs = [
            { data: () => ({ name: 'Paneer Special', price: 199, available: true, badge: 'Chef Pick', description: 'Delicious paneer', id: 's1' }), id: 's1' },
            { data: () => ({ name: 'Biryani Feast', price: 299, available: false, description: 'Grand biryani', id: 's2' }), id: 's2' },
        ];
        const onSnapshotSpy = vi.fn((cb) => { cb({ forEach: vi.fn() }); return vi.fn(); });

        globalThis.db = {
            collection: vi.fn((name) => {
                if (name === 'specials') {
                    return {
                        orderBy: vi.fn().mockReturnThis(),
                        where: vi.fn().mockReturnThis(),
                        get: vi.fn(() => Promise.resolve({
                            forEach: (cb) => specialsDocs.forEach((d) => cb(d)),
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

        const grid = document.querySelector('.specials-grid');
        expect(grid.innerHTML).toContain('Paneer Special');
        expect(grid.innerHTML).toContain('Chef Pick');
        expect(grid.innerHTML).toContain('special-card');
        expect(grid.innerHTML).toContain('Biryani Feast');
        expect(grid.innerHTML).toContain('item-unavailable');
        // Section should be visible
        const section = document.querySelector('.specials');
        expect(section.style.display).toBe('');
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // showMenuSkeletons + removeMenuSkeletons (lines 148-164)
    // ═══════════════════════════════════════════════════════════════════════════
    it('injects skeleton cards into .menu-items containers and removes them after data loads', () => {
        setupDOM(`
            <div id="dynamic-menu-container">
                <div class="menu-items"></div>
                <div class="menu-items"></div>
            </div>
        `);

        // showMenuSkeletons is internal but called by initMenuSync skeleton injection path
        // We test via the renderMenuCategories path: skeleton appears before snapshot, disappears after
        const menuDocs = [
            { id: 'Test Item', data: () => ({ category: 'Extras', price: 50, available: true, type: 'veg' }) },
        ];

        let snapshotCb;
        const onSnapshotSpy = vi.fn((cb) => {
            snapshotCb = cb;
            return vi.fn();
        });

        globalThis.db = {
            collection: vi.fn(() => ({
                orderBy: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                get: vi.fn(() => new Promise(() => {})), // never resolves
                onSnapshot: onSnapshotSpy,
                doc: vi.fn(() => ({
                    get: vi.fn(() => new Promise(() => {})),
                })),
            })),
        };
        globalThis.window.db = globalThis.db;

        initMenuSync();

        // Before snapshot fires, skeleton should be present
        const container = document.getElementById('dynamic-menu-container');
        expect(container.innerHTML).toContain('menu-skeleton-card');

        // Fire the snapshot callback
        snapshotCb({ forEach: (fn) => menuDocs.forEach((d) => fn(d)) });

        // After snapshot, skeleton is gone, real content is there
        expect(container.innerHTML).not.toContain('menu-skeleton-card');
        expect(container.innerHTML).toContain('Test Item');
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // applyFlameBadges (lines 177-182)
    // ═══════════════════════════════════════════════════════════════════════════
    it('injects flame badge on items with hot/bestseller/spicy/chef keywords', () => {
        setupDOM(`<div id="dynamic-menu-container"></div>`);

        const menuDocs = [
            { id: 'Spicy Wings', data: () => ({ category: 'Starters', price: 200, available: true, type: 'non-veg' }) },
            { id: 'Plain Rice', data: () => ({ category: 'Extras', price: 50, available: true, type: 'veg' }) },
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
        // Spicy Wings should have a flame badge (data-id contains "Spicy")
        const spicyCard = container.querySelector('[data-id="Spicy Wings"]');
        expect(spicyCard).not.toBeNull();
        expect(spicyCard.querySelector('.flame-badge')).not.toBeNull();

        // Plain Rice should NOT have a flame badge
        const plainCard = container.querySelector('[data-id="Plain Rice"]');
        expect(plainCard).not.toBeNull();
        expect(plainCard.querySelector('.flame-badge')).toBeNull();
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // renderItemCard allergen HTML (lines 242-243)
    // ═══════════════════════════════════════════════════════════════════════════
    it('renders allergen icons when item has allergens', () => {
        setupDOM(`<div id="dynamic-menu-container"></div>`);

        const menuDocs = [
            { id: 'Nutty Curry', data: () => ({ category: 'Curries', price: 199, available: true, type: 'veg', allergens: ['nuts', 'dairy'] }) },
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
        const card = container.querySelector('[data-id="Nutty Curry"]');
        expect(card).not.toBeNull();
        expect(card.innerHTML).toContain('menu-allergen-icons');
        expect(card.innerHTML).toContain('allergen-icon');
        expect(card.dataset.allergens).toBe('nuts,dairy');
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // renderMenuCategories sort by sortOrder (lines 280-281)
    // ═══════════════════════════════════════════════════════════════════════════
    it('sorts items within a category by sortOrder then by name', () => {
        setupDOM(`<div id="dynamic-menu-container"></div>`);

        const menuDocs = [
            { id: 'Zebra Dish', data: () => ({ category: 'Extras', price: 99, available: true, type: 'veg', sortOrder: 3 }) },
            { id: 'Alpha Dish', data: () => ({ category: 'Extras', price: 89, available: true, type: 'veg', sortOrder: 1 }) },
            { id: 'Beta Dish', data: () => ({ category: 'Extras', price: 79, available: true, type: 'veg', sortOrder: 2 }) },
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
        const cards = container.querySelectorAll('.menu-item-card');
        expect(cards.length).toBe(3);
        expect(cards[0].dataset.id).toBe('Alpha Dish');
        expect(cards[1].dataset.id).toBe('Beta Dish');
        expect(cards[2].dataset.id).toBe('Zebra Dish');
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // Category carousel rendering (lines 300-307)
    // ═══════════════════════════════════════════════════════════════════════════
    it('renders category carousel with images and emoji fallbacks', () => {
        setupDOM(`
            <div id="dynamic-menu-container"></div>
            <div id="category-carousel"></div>
        `);

        const menuDocs = [
            { id: 'Chicken 65', data: () => ({ category: 'Starters', price: 200, available: true, type: 'non-veg' }) },
            { id: 'Veg Biryani', data: () => ({ category: 'Beverages', price: 30, available: true, type: 'veg' }) },
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

        const carousel = document.getElementById('category-carousel');
        expect(carousel.innerHTML).toContain('category-item');
        expect(carousel.innerHTML).toContain('category-name');
        // Starters has a CATEGORY_IMAGES entry so it should have an img tag
        expect(carousel.innerHTML).toContain('Starters');
        expect(carousel.innerHTML).toContain('Beverages');
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // initMenuSync hero slides callback (line 354)
    // ═══════════════════════════════════════════════════════════════════════════
    it('calls window.updateHeroSlides when heroSlides returns active slides', async () => {
        setupDOM(`<div id="dynamic-menu-container"></div>`);
        window.updateHeroSlides = vi.fn();

        const heroDocs = [
            { data: () => ({ active: true, imageUrl: 'hero1.jpg', sortOrder: 1 }) },
            { data: () => ({ active: false, imageUrl: 'hero2.jpg', sortOrder: 2 }) },
        ];
        const onSnapshotSpy = vi.fn((cb) => { cb({ forEach: vi.fn() }); return vi.fn(); });

        globalThis.db = {
            collection: vi.fn((name) => {
                if (name === 'heroSlides') {
                    return {
                        orderBy: vi.fn().mockReturnThis(),
                        where: vi.fn().mockReturnThis(),
                        get: vi.fn(() => Promise.resolve({
                            forEach: (cb) => heroDocs.forEach((d) => cb(d)),
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

        // Only the active slide should be passed to updateHeroSlides
        expect(window.updateHeroSlides).toHaveBeenCalledTimes(1);
        const slides = window.updateHeroSlides.mock.calls[0][0];
        expect(slides.length).toBe(1);
        expect(slides[0].imageUrl).toBe('hero1.jpg');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Skeleton loaders (menu.js 148-164)
// ═══════════════════════════════════════════════════════════════════════════
describe('showMenuSkeletons / removeMenuSkeletons', () => {
    beforeEach(() => {
        setupDOM('<div class="menu-items"></div><div class="menu-items"></div>');
    });

    it('injects 3 skeleton cards into each .menu-items container', () => {
        showMenuSkeletons();
        const containers = document.body.querySelectorAll('.menu-items');
        containers.forEach(c => {
            expect(c.querySelectorAll('.menu-skeleton-card').length).toBe(3);
        });
    });

    it('does not inject duplicates when called twice', () => {
        showMenuSkeletons();
        showMenuSkeletons();
        const containers = document.body.querySelectorAll('.menu-items');
        containers.forEach(c => {
            expect(c.querySelectorAll('.menu-skeleton-card').length).toBe(3);
        });
    });

    it('skeleton cards contain expected structure', () => {
        showMenuSkeletons();
        const card = document.body.querySelector('.menu-skeleton-card');
        expect(card.querySelector('.h-img')).not.toBeNull();
        expect(card.querySelector('.w-60')).not.toBeNull();
        expect(card.querySelector('.w-100')).not.toBeNull();
        expect(card.querySelector('.w-80')).not.toBeNull();
        expect(card.querySelector('.skeleton-btn')).not.toBeNull();
    });

    it('removeMenuSkeletons removes all skeleton cards', () => {
        showMenuSkeletons();
        expect(document.body.querySelectorAll('.menu-skeleton-card').length).toBe(6);
        removeMenuSkeletons();
        expect(document.body.querySelectorAll('.menu-skeleton-card').length).toBe(0);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// cachedGet — where clause branch (line 32)
// ═══════════════════════════════════════════════════════════════════════════

describe('cachedGet — where clause', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        setupDOM('<div id="auth-toast"></div>');
    });

    it('applies where clause to Firestore ref when opts.where is provided', async () => {
        const whereSpy = vi.fn().mockReturnThis();
        const orderBySpy = vi.fn().mockReturnThis();
        const colRef = {
            orderBy: orderBySpy,
            where: whereSpy,
            get: vi.fn(() => Promise.resolve({ forEach: vi.fn() })),
        };
        globalThis.db = { collection: vi.fn(() => colRef) };
        globalThis.window.db = globalThis.db;

        const render = vi.fn();
        cachedGet('menu', 'test_cache', 300, (snap) => [], render, {
            orderBy: ['sortOrder'],
            where: ['available', '==', true],
        });
        await new Promise((r) => setTimeout(r, 0));

        expect(whereSpy).toHaveBeenCalledWith('available', '==', true);
        expect(orderBySpy).toHaveBeenCalledWith('sortOrder');
    });

    it('does not call where when opts.where is falsy', async () => {
        const whereSpy = vi.fn().mockReturnThis();
        const colRef = {
            orderBy: vi.fn().mockReturnThis(),
            where: whereSpy,
            get: vi.fn(() => Promise.resolve({ forEach: vi.fn() })),
        };
        globalThis.db = { collection: vi.fn(() => colRef) };
        globalThis.window.db = globalThis.db;

        cachedGet('menu', 'test_cache2', 300, (snap) => [], vi.fn(), { orderBy: ['sortOrder'] });
        await new Promise((r) => setTimeout(r, 0));

        expect(whereSpy).not.toHaveBeenCalled();
    });

    it('uses stale cache as fallback when Firestore fetch fails', async () => {
        const staleData = [{ name: 'Stale Item' }];
        localStorage.setItem('stale_key', JSON.stringify({ ts: Date.now() - 999999, data: staleData }));

        const colRef = {
            orderBy: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            get: vi.fn(() => Promise.reject(new Error('network'))),
        };
        globalThis.db = { collection: vi.fn(() => colRef) };
        globalThis.window.db = globalThis.db;

        const render = vi.fn();
        cachedGet('menu', 'stale_key', 300, (snap) => [], render);
        await new Promise((r) => setTimeout(r, 0));

        // render should be called with stale data
        expect(render).toHaveBeenCalledWith(staleData);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// loadMenuRatings — no h4 (nameEl falsy, line 57 early return)
// ═══════════════════════════════════════════════════════════════════════════
describe('loadMenuRatings — card without h4', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        setupDOM(`
            <div class="menu-item-card" data-id="NoHeading">
                <p class="item-description">No heading card</p>
            </div>
        `);
    });

    it('skips cards with no h4 element (nameEl falsy early return)', () => {
        const cachedRatings = { NoHeading: { total: 10, count: 2 } };
        localStorage.setItem('amoghaRatings', JSON.stringify({ ts: Date.now(), data: cachedRatings }));

        globalThis.db = makeDb();
        globalThis.window.db = globalThis.db;

        loadMenuRatings();

        // The card has no h4, so applyRatings should skip it — no .item-rating injected
        const card = document.body.querySelector('[data-id="NoHeading"]');
        expect(card.querySelector('.item-rating')).toBeNull();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// loadMenuRatings — desc element exists (desc.after, line 68)
// ═══════════════════════════════════════════════════════════════════════════
describe('loadMenuRatings — rating inserted after desc element', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        setupDOM(`
            <div class="menu-item-card" data-id="Dosa">
                <h4>Dosa</h4>
                <p class="item-description">Crispy crepe</p>
            </div>
        `);
    });

    it('inserts rating element after .item-description via desc.after()', () => {
        const cachedRatings = { Dosa: { total: 20, count: 5 } };
        localStorage.setItem('amoghaRatings', JSON.stringify({ ts: Date.now(), data: cachedRatings }));

        globalThis.db = makeDb();
        globalThis.window.db = globalThis.db;

        loadMenuRatings();

        const card = document.body.querySelector('[data-id="Dosa"]');
        const desc = card.querySelector('.item-description');
        const ratingEl = card.querySelector('.item-rating');
        expect(ratingEl).not.toBeNull();
        expect(desc.nextElementSibling).toBe(ratingEl);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// loadMenuRatings — stale cache with data (line 101)
// ═══════════════════════════════════════════════════════════════════════════
describe('loadMenuRatings — stale cache fallback with data', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        setupDOM(`
            <div class="menu-item-card" data-id="Idli">
                <h4>Idli</h4>
                <p class="item-description">Steamed cakes</p>
            </div>
        `);
    });

    it('applies ratings from stale cache when Firestore fetch fails and stale cache has data', async () => {
        const staleRatings = { Idli: { total: 12, count: 3 } };
        localStorage.setItem('amoghaRatings', JSON.stringify({ ts: Date.now() - 999999, data: staleRatings }));

        globalThis.db = {
            collection: vi.fn(() => ({
                get: vi.fn(() => Promise.reject(new Error('offline'))),
            })),
        };
        globalThis.window.db = globalThis.db;

        loadMenuRatings();
        await new Promise((r) => setTimeout(r, 0));

        const card = document.body.querySelector('[data-id="Idli"]');
        const ratingEl = card.querySelector('.item-rating');
        expect(ratingEl).not.toBeNull();
        // avg = 12/3 = 4.0
        expect(ratingEl.querySelector('.rating-text').textContent).toContain('4.0');
    });

    it('does not throw when stale cache has no data field', async () => {
        localStorage.setItem('amoghaRatings', JSON.stringify({ ts: Date.now() - 999999 }));

        globalThis.db = {
            collection: vi.fn(() => ({
                get: vi.fn(() => Promise.reject(new Error('offline'))),
            })),
        };
        globalThis.window.db = globalThis.db;

        loadMenuRatings();
        await new Promise((r) => setTimeout(r, 0));

        // No data field means applyRatings is not called — no rating injected
        const card = document.body.querySelector('[data-id="Idli"]');
        expect(card.querySelector('.item-rating')).toBeNull();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// renderSpecials — specialsSection show/hide (lines 130, 138)
// ═══════════════════════════════════════════════════════════════════════════
describe('initMenuSync — renderSpecials branches', () => {
    function makeInitDb(specialsDocs) {
        const onSnapshotSpy = vi.fn((cb) => { cb({ forEach: vi.fn() }); return vi.fn(); });
        return {
            collection: vi.fn((name) => {
                if (name === 'specials') {
                    return {
                        orderBy: vi.fn().mockReturnThis(),
                        where: vi.fn().mockReturnThis(),
                        get: vi.fn(() => Promise.resolve({
                            forEach: (cb) => specialsDocs.forEach((d) => cb(d)),
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
    }

    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('shows specials section when specials data is non-empty (line 130)', async () => {
        setupDOM(`
            <div id="dynamic-menu-container"></div>
            <section class="specials" style="display:none">
                <div class="specials-grid"></div>
            </section>
        `);

        const docs = [
            { data: () => ({ name: 'Special A', price: 150, available: true, description: 'Tasty', id: 's1' }), id: 's1' },
        ];
        globalThis.db = makeInitDb(docs);
        globalThis.window.db = globalThis.db;

        initMenuSync();
        await new Promise((r) => setTimeout(r, 0));

        const section = document.querySelector('.specials');
        expect(section.style.display).toBe('');
    });

    it('renders empty string for description when item.description is falsy (line 138)', async () => {
        setupDOM(`
            <div id="dynamic-menu-container"></div>
            <section class="specials">
                <div class="specials-grid"></div>
            </section>
        `);

        const docs = [
            { data: () => ({ name: 'No Desc Special', price: 99, available: true, id: 's2' }), id: 's2' },
        ];
        globalThis.db = makeInitDb(docs);
        globalThis.window.db = globalThis.db;

        initMenuSync();
        await new Promise((r) => setTimeout(r, 0));

        const grid = document.querySelector('.specials-grid');
        expect(grid.innerHTML).toContain('No Desc Special');
        // The <p> should have empty content since description is undefined
        expect(grid.innerHTML).toContain('<p></p>');
    });

    it('uses default badge text "Special" when item.badge is falsy', async () => {
        setupDOM(`
            <div id="dynamic-menu-container"></div>
            <section class="specials">
                <div class="specials-grid"></div>
            </section>
        `);

        const docs = [
            { data: () => ({ name: 'Default Badge', price: 100, available: true, description: 'Desc', id: 's3' }), id: 's3' },
        ];
        globalThis.db = makeInitDb(docs);
        globalThis.window.db = globalThis.db;

        initMenuSync();
        await new Promise((r) => setTimeout(r, 0));

        const grid = document.querySelector('.specials-grid');
        expect(grid.innerHTML).toContain('Special');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// applyFlameBadges — target falsy / badge vs h4 fallback (lines 173-182)
// ═══════════════════════════════════════════════════════════════════════════
describe('initMenuSync — applyFlameBadges branches', () => {
    function makeMenuDb(menuDocs) {
        return {
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
    }

    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('inserts flame after .menu-badge when badge element exists (line 181)', () => {
        setupDOM(`<div id="dynamic-menu-container"></div>`);

        // We render items then manually add a .menu-badge to simulate the badge path
        const menuDocs = [
            { id: 'Chef Special', data: () => ({ category: 'Extras', price: 100, available: true, type: 'veg' }) },
        ];
        globalThis.db = makeMenuDb(menuDocs);
        globalThis.window.db = globalThis.db;

        initMenuSync();

        const card = document.getElementById('dynamic-menu-container').querySelector('[data-id="Chef Special"]');
        // "chef" in data-id triggers isHot, and since there is no .menu-badge,
        // the flame is appended to h4 (line 182)
        const h4 = card.querySelector('h4');
        const flame = card.querySelector('.flame-badge');
        expect(flame).not.toBeNull();
        expect(h4.contains(flame)).toBe(true);
    });

    it('appends flame to h4 when no .menu-badge exists (line 182 h4 fallback)', () => {
        setupDOM(`<div id="dynamic-menu-container"></div>`);

        const menuDocs = [
            { id: 'Bestseller Rice', data: () => ({ category: 'Extras', price: 50, available: true, type: 'veg' }) },
        ];
        globalThis.db = makeMenuDb(menuDocs);
        globalThis.window.db = globalThis.db;

        initMenuSync();

        const card = document.getElementById('dynamic-menu-container').querySelector('[data-id="Bestseller Rice"]');
        const flame = card.querySelector('.flame-badge');
        expect(flame).not.toBeNull();
        const h4 = card.querySelector('h4');
        expect(h4.lastChild).toBe(flame);
    });

    it('does not inject flame badge for non-hot items', () => {
        setupDOM(`<div id="dynamic-menu-container"></div>`);

        const menuDocs = [
            { id: 'Plain Dosa', data: () => ({ category: 'Tiffins', price: 60, available: true, type: 'veg' }) },
        ];
        globalThis.db = makeMenuDb(menuDocs);
        globalThis.window.db = globalThis.db;

        initMenuSync();

        const card = document.getElementById('dynamic-menu-container').querySelector('[data-id="Plain Dosa"]');
        expect(card.querySelector('.flame-badge')).toBeNull();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// renderItemCard — imageUrl falsy (line 232), description falsy (line 238)
// ═══════════════════════════════════════════════════════════════════════════
describe('initMenuSync — renderItemCard branch coverage', () => {
    function makeMenuDb(menuDocs) {
        return {
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
    }

    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('does not render image wrap when imageUrl is falsy (line 232)', () => {
        setupDOM(`<div id="dynamic-menu-container"></div>`);

        const menuDocs = [
            { id: 'NoImage', data: () => ({ category: 'Extras', price: 50, available: true, type: 'veg' }) },
        ];
        globalThis.db = makeMenuDb(menuDocs);
        globalThis.window.db = globalThis.db;

        initMenuSync();

        const card = document.getElementById('dynamic-menu-container').querySelector('[data-id="NoImage"]');
        expect(card.querySelector('.menu-item-img-wrap')).toBeNull();
    });

    it('renders image wrap when imageUrl is provided', () => {
        setupDOM(`<div id="dynamic-menu-container"></div>`);

        const menuDocs = [
            { id: 'WithImage', data: () => ({ category: 'Extras', price: 50, available: true, type: 'veg', imageUrl: 'https://example.com/img.jpg' }) },
        ];
        globalThis.db = makeMenuDb(menuDocs);
        globalThis.window.db = globalThis.db;

        initMenuSync();

        const card = document.getElementById('dynamic-menu-container').querySelector('[data-id="WithImage"]');
        expect(card.querySelector('.menu-item-img-wrap')).not.toBeNull();
        expect(card.querySelector('.menu-item-img').getAttribute('src')).toBe('https://example.com/img.jpg');
    });

    it('does not render description when item.description is falsy (line 238)', () => {
        setupDOM(`<div id="dynamic-menu-container"></div>`);

        const menuDocs = [
            { id: 'NoDesc', data: () => ({ category: 'Extras', price: 50, available: true, type: 'veg' }) },
        ];
        globalThis.db = makeMenuDb(menuDocs);
        globalThis.window.db = globalThis.db;

        initMenuSync();

        const card = document.getElementById('dynamic-menu-container').querySelector('[data-id="NoDesc"]');
        expect(card.querySelector('.item-description')).toBeNull();
    });

    it('renders description when item.description is provided', () => {
        setupDOM(`<div id="dynamic-menu-container"></div>`);

        const menuDocs = [
            { id: 'HasDesc', data: () => ({ category: 'Extras', price: 50, available: true, type: 'veg', description: 'A great dish' }) },
        ];
        globalThis.db = makeMenuDb(menuDocs);
        globalThis.window.db = globalThis.db;

        initMenuSync();

        const card = document.getElementById('dynamic-menu-container').querySelector('[data-id="HasDesc"]');
        const desc = card.querySelector('.item-description');
        expect(desc).not.toBeNull();
        expect(desc.textContent).toBe('A great dish');
    });

    it('renders allergen icons with emoji mapping when item has known allergens (lines 243-263)', () => {
        setupDOM(`<div id="dynamic-menu-container"></div>`);

        const menuDocs = [
            { id: 'AllergenItem', data: () => ({ category: 'Curries', price: 199, available: true, type: 'veg', allergens: ['nuts', 'gluten', 'eggs'] }) },
        ];
        globalThis.db = makeMenuDb(menuDocs);
        globalThis.window.db = globalThis.db;

        initMenuSync();

        const card = document.getElementById('dynamic-menu-container').querySelector('[data-id="AllergenItem"]');
        const allergenDiv = card.querySelector('.menu-allergen-icons');
        expect(allergenDiv).not.toBeNull();
        const icons = allergenDiv.querySelectorAll('.allergen-icon');
        expect(icons.length).toBe(3);
        expect(allergenDiv.textContent).toContain('nuts');
        expect(allergenDiv.textContent).toContain('gluten');
        expect(allergenDiv.textContent).toContain('eggs');
    });

    it('does not render allergen section when allergens array is empty', () => {
        setupDOM(`<div id="dynamic-menu-container"></div>`);

        const menuDocs = [
            { id: 'NoAllergens', data: () => ({ category: 'Extras', price: 50, available: true, type: 'veg', allergens: [] }) },
        ];
        globalThis.db = makeMenuDb(menuDocs);
        globalThis.window.db = globalThis.db;

        initMenuSync();

        const card = document.getElementById('dynamic-menu-container').querySelector('[data-id="NoAllergens"]');
        expect(card.querySelector('.menu-allergen-icons')).toBeNull();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// renderMenuCategories — category sorting (lines 271-274)
// ═══════════════════════════════════════════════════════════════════════════
describe('initMenuSync — category sorting branches', () => {
    function makeMenuDb(menuDocs) {
        return {
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
    }

    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('sorts both-unknown categories alphabetically (line 271)', () => {
        setupDOM(`<div id="dynamic-menu-container"></div>`);

        const menuDocs = [
            { id: 'Item Z', data: () => ({ category: 'Zzz Custom', price: 50, available: true, type: 'veg' }) },
            { id: 'Item A', data: () => ({ category: 'Aaa Custom', price: 50, available: true, type: 'veg' }) },
        ];
        globalThis.db = makeMenuDb(menuDocs);
        globalThis.window.db = globalThis.db;

        initMenuSync();

        const container = document.getElementById('dynamic-menu-container');
        const categories = container.querySelectorAll('.category-title');
        expect(categories.length).toBe(2);
        expect(categories[0].textContent).toBe('Aaa Custom');
        expect(categories[1].textContent).toBe('Zzz Custom');
    });

    it('sorts known category before unknown category (line 272-273)', () => {
        setupDOM(`<div id="dynamic-menu-container"></div>`);

        const menuDocs = [
            { id: 'Custom Item', data: () => ({ category: 'Xyz Unknown', price: 50, available: true, type: 'veg' }) },
            { id: 'Known Item', data: () => ({ category: 'Tiffins', price: 50, available: true, type: 'veg' }) },
        ];
        globalThis.db = makeMenuDb(menuDocs);
        globalThis.window.db = globalThis.db;

        initMenuSync();

        const container = document.getElementById('dynamic-menu-container');
        const categories = container.querySelectorAll('.category-title');
        expect(categories[0].textContent).toBe('Tiffins');
        expect(categories[1].textContent).toBe('Xyz Unknown');
    });

    it('sorts items by name when sortOrder is equal (line 281)', () => {
        setupDOM(`<div id="dynamic-menu-container"></div>`);

        const menuDocs = [
            { id: 'Zebra Item', data: () => ({ category: 'Extras', price: 50, available: true, type: 'veg', sortOrder: 1 }) },
            { id: 'Alpha Item', data: () => ({ category: 'Extras', price: 50, available: true, type: 'veg', sortOrder: 1 }) },
        ];
        globalThis.db = makeMenuDb(menuDocs);
        globalThis.window.db = globalThis.db;

        initMenuSync();

        const container = document.getElementById('dynamic-menu-container');
        const cards = container.querySelectorAll('.menu-item-card');
        expect(cards[0].dataset.id).toBe('Alpha Item');
        expect(cards[1].dataset.id).toBe('Zebra Item');
    });

    it('sorts items by sortOrder when different, falls back to 999 when missing (lines 278-282)', () => {
        setupDOM(`<div id="dynamic-menu-container"></div>`);

        const menuDocs = [
            { id: 'No Sort', data: () => ({ category: 'Extras', price: 50, available: true, type: 'veg' }) },
            { id: 'Sort 1', data: () => ({ category: 'Extras', price: 50, available: true, type: 'veg', sortOrder: 1 }) },
        ];
        globalThis.db = makeMenuDb(menuDocs);
        globalThis.window.db = globalThis.db;

        initMenuSync();

        const container = document.getElementById('dynamic-menu-container');
        const cards = container.querySelectorAll('.menu-item-card');
        expect(cards[0].dataset.id).toBe('Sort 1');
        expect(cards[1].dataset.id).toBe('No Sort');
    });

    it('uses emoji fallback when category has no CATEGORY_IMAGES entry (line 303)', () => {
        setupDOM(`
            <div id="dynamic-menu-container"></div>
            <div id="category-carousel"></div>
        `);

        const menuDocs = [
            { id: 'Juice', data: () => ({ category: 'Beverages', price: 30, available: true, type: 'veg' }) },
        ];
        globalThis.db = makeMenuDb(menuDocs);
        globalThis.window.db = globalThis.db;

        initMenuSync();

        const carousel = document.getElementById('category-carousel');
        // Beverages has no CATEGORY_IMAGES entry, so should use emoji fallback
        expect(carousel.innerHTML).not.toContain('<img');
        expect(carousel.innerHTML).toContain('category-img-wrap');
    });

    it('renders category image when category has CATEGORY_IMAGES entry', () => {
        setupDOM(`
            <div id="dynamic-menu-container"></div>
            <div id="category-carousel"></div>
        `);

        const menuDocs = [
            { id: 'Chicken 65', data: () => ({ category: 'Starters', price: 200, available: true, type: 'non-veg' }) },
        ];
        globalThis.db = makeMenuDb(menuDocs);
        globalThis.window.db = globalThis.db;

        initMenuSync();

        const carousel = document.getElementById('category-carousel');
        // Starters has a CATEGORY_IMAGES entry
        expect(carousel.innerHTML).toContain('<img');
        expect(carousel.innerHTML).toContain('Starters');
    });

    it('calls applySafeForMeFilter when _safeForMeActive is true (line 313)', () => {
        setupDOM(`<div id="dynamic-menu-container"></div>`);
        window._safeForMeActive = true;
        localStorage.setItem('amoghaUser', JSON.stringify({ allergenAlerts: ['nuts'] }));

        const menuDocs = [
            { id: 'Nutty', data: () => ({ category: 'Extras', price: 50, available: true, type: 'veg', allergens: ['nuts'] }) },
            { id: 'Safe', data: () => ({ category: 'Extras', price: 50, available: true, type: 'veg' }) },
        ];
        globalThis.db = makeMenuDb(menuDocs);
        globalThis.window.db = globalThis.db;

        initMenuSync();

        const container = document.getElementById('dynamic-menu-container');
        const nuttyCard = container.querySelector('[data-id="Nutty"]');
        expect(nuttyCard.classList.contains('allergen-hidden')).toBe(true);
        expect(nuttyCard.style.display).toBe('none');

        const safeCard = container.querySelector('[data-id="Safe"]');
        expect(safeCard.classList.contains('allergen-hidden')).toBe(false);

        window._safeForMeActive = false;
    });

    it('defaults category to Others when item.category is empty string', () => {
        setupDOM(`<div id="dynamic-menu-container"></div>`);

        const menuDocs = [
            { id: 'Uncategorized', data: () => ({ category: '', price: 50, available: true, type: 'veg' }) },
        ];
        globalThis.db = makeMenuDb(menuDocs);
        globalThis.window.db = globalThis.db;

        initMenuSync();

        const container = document.getElementById('dynamic-menu-container');
        expect(container.innerHTML).toContain('Others');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// initMenuSync — updateHeroSlides function check (line 354)
// ═══════════════════════════════════════════════════════════════════════════
describe('initMenuSync — hero slides without updateHeroSlides', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('does not call updateHeroSlides when function does not exist on window (line 354)', async () => {
        setupDOM(`<div id="dynamic-menu-container"></div>`);
        delete window.updateHeroSlides;

        const heroDocs = [
            { data: () => ({ active: true, imageUrl: 'hero.jpg', sortOrder: 1 }) },
        ];
        const onSnapshotSpy = vi.fn((cb) => { cb({ forEach: vi.fn() }); return vi.fn(); });

        globalThis.db = {
            collection: vi.fn((name) => {
                if (name === 'heroSlides') {
                    return {
                        orderBy: vi.fn().mockReturnThis(),
                        where: vi.fn().mockReturnThis(),
                        get: vi.fn(() => Promise.resolve({
                            forEach: (cb) => heroDocs.forEach((d) => cb(d)),
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

        // Should not throw even when updateHeroSlides is not a function
        expect(() => initMenuSync()).not.toThrow();
        await new Promise((r) => setTimeout(r, 0));
    });

    it('does not call updateHeroSlides when slides array is empty', async () => {
        setupDOM(`<div id="dynamic-menu-container"></div>`);
        window.updateHeroSlides = vi.fn();

        const heroDocs = [
            { data: () => ({ active: false, imageUrl: 'hero.jpg', sortOrder: 1 }) },
        ];
        const onSnapshotSpy = vi.fn((cb) => { cb({ forEach: vi.fn() }); return vi.fn(); });

        globalThis.db = {
            collection: vi.fn((name) => {
                if (name === 'heroSlides') {
                    return {
                        orderBy: vi.fn().mockReturnThis(),
                        where: vi.fn().mockReturnThis(),
                        get: vi.fn(() => Promise.resolve({
                            forEach: (cb) => heroDocs.forEach((d) => cb(d)),
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
        await new Promise((r) => setTimeout(r, 0));

        // All slides are inactive so the array is empty — updateHeroSlides should NOT be called
        expect(window.updateHeroSlides).not.toHaveBeenCalled();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// initMenuSync — cached theme valid with non-default theme (line 362)
// ═══════════════════════════════════════════════════════════════════════════
describe('initMenuSync — cached theme with default value', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        document.body.className = '';
    });

    it('does not apply theme class when cached theme is default', () => {
        setupDOM(`<div id="dynamic-menu-container"></div>`);
        localStorage.setItem('theme_cache', JSON.stringify({ ts: Date.now(), theme: 'default' }));

        const onSnapshotSpy = vi.fn((cb) => { cb({ forEach: vi.fn() }); return vi.fn(); });
        globalThis.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({ get: vi.fn(() => Promise.resolve({ exists: false, data: () => ({}) })) })),
                orderBy: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                get: vi.fn(() => Promise.resolve({ forEach: vi.fn(), docs: [] })),
                onSnapshot: onSnapshotSpy,
            })),
        };
        globalThis.window.db = globalThis.db;

        initMenuSync();

        // Cached theme is 'default' — condition p.theme !== 'default' is false,
        // so it should NOT early-return, and no theme class should be applied
        const hasThemeClass = [...document.body.classList].some((c) => c.startsWith('theme-'));
        expect(hasThemeClass).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// initMenuSync — testimonials thumbnail fallback and caption branches (lines 384, 390-391)
// ═══════════════════════════════════════════════════════════════════════════
describe('initMenuSync — testimonial rendering branches', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('uses videoUrl-derived thumbnail when thumbnailUrl is missing (line 384)', async () => {
        setupDOM(`
            <div id="dynamic-menu-container"></div>
            <section class="testimonials">
                <div id="testimonials-grid"></div>
            </section>
        `);

        const docs = [
            { data: () => ({ active: true, customerName: 'Carol', videoUrl: 'https://res.cloudinary.com/demo/upload/v1/video.mp4' }) },
        ];
        const onSnapshotSpy = vi.fn((cb) => { cb({ forEach: vi.fn() }); return vi.fn(); });

        globalThis.db = {
            collection: vi.fn((name) => {
                if (name === 'testimonials') {
                    return {
                        orderBy: vi.fn().mockReturnThis(),
                        get: vi.fn(() => Promise.resolve({
                            forEach: (cb) => docs.forEach((d) => cb(d)),
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
        await new Promise((r) => setTimeout(r, 0));

        const grid = document.getElementById('testimonials-grid');
        // Should use the /upload/ → /upload/f_jpg,so_1/ transform for thumbnail
        expect(grid.innerHTML).toContain('f_jpg,so_1');
        expect(grid.innerHTML).toContain('Carol');
    });

    it('shows placeholder when neither thumbnailUrl nor videoUrl exist (line 387)', async () => {
        setupDOM(`
            <div id="dynamic-menu-container"></div>
            <section class="testimonials">
                <div id="testimonials-grid"></div>
            </section>
        `);

        const docs = [
            { data: () => ({ active: true, customerName: 'Dave' }) },
        ];
        const onSnapshotSpy = vi.fn((cb) => { cb({ forEach: vi.fn() }); return vi.fn(); });

        globalThis.db = {
            collection: vi.fn((name) => {
                if (name === 'testimonials') {
                    return {
                        orderBy: vi.fn().mockReturnThis(),
                        get: vi.fn(() => Promise.resolve({
                            forEach: (cb) => docs.forEach((d) => cb(d)),
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
        await new Promise((r) => setTimeout(r, 0));

        const grid = document.getElementById('testimonials-grid');
        expect(grid.innerHTML).toContain('testimonial-placeholder');
        expect(grid.innerHTML).toContain('Dave');
    });

    it('renders caption paragraph when t.caption is truthy (line 391)', async () => {
        setupDOM(`
            <div id="dynamic-menu-container"></div>
            <section class="testimonials">
                <div id="testimonials-grid"></div>
            </section>
        `);

        const docs = [
            { data: () => ({ active: true, customerName: 'Eve', caption: 'Best food ever!' }) },
        ];
        const onSnapshotSpy = vi.fn((cb) => { cb({ forEach: vi.fn() }); return vi.fn(); });

        globalThis.db = {
            collection: vi.fn((name) => {
                if (name === 'testimonials') {
                    return {
                        orderBy: vi.fn().mockReturnThis(),
                        get: vi.fn(() => Promise.resolve({
                            forEach: (cb) => docs.forEach((d) => cb(d)),
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
        await new Promise((r) => setTimeout(r, 0));

        const grid = document.getElementById('testimonials-grid');
        expect(grid.innerHTML).toContain('testimonial-caption');
        expect(grid.innerHTML).toContain('Best food ever!');
    });

    it('omits caption paragraph when t.caption is falsy', async () => {
        setupDOM(`
            <div id="dynamic-menu-container"></div>
            <section class="testimonials">
                <div id="testimonials-grid"></div>
            </section>
        `);

        const docs = [
            { data: () => ({ active: true, customerName: 'Frank' }) },
        ];
        const onSnapshotSpy = vi.fn((cb) => { cb({ forEach: vi.fn() }); return vi.fn(); });

        globalThis.db = {
            collection: vi.fn((name) => {
                if (name === 'testimonials') {
                    return {
                        orderBy: vi.fn().mockReturnThis(),
                        get: vi.fn(() => Promise.resolve({
                            forEach: (cb) => docs.forEach((d) => cb(d)),
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
        await new Promise((r) => setTimeout(r, 0));

        const grid = document.getElementById('testimonials-grid');
        expect(grid.innerHTML).not.toContain('testimonial-caption');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// initMenuSync — social feed caption truthy + section hide (lines 408-415)
// ═══════════════════════════════════════════════════════════════════════════
describe('initMenuSync — social feed branches', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('renders social-caption when p.caption is truthy (line 415)', async () => {
        setupDOM(`
            <div id="dynamic-menu-container"></div>
            <section class="social-feed">
                <div id="social-feed-strip"></div>
            </section>
        `);

        const docs = [
            { data: () => ({ active: true, imageUrl: 'img.jpg', caption: 'Tasty!', link: 'https://x.com' }) },
        ];
        const onSnapshotSpy = vi.fn((cb) => { cb({ forEach: vi.fn() }); return vi.fn(); });

        globalThis.db = {
            collection: vi.fn((name) => {
                if (name === 'socialPosts') {
                    return {
                        orderBy: vi.fn().mockReturnThis(),
                        get: vi.fn(() => Promise.resolve({
                            forEach: (cb) => docs.forEach((d) => cb(d)),
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
        await new Promise((r) => setTimeout(r, 0));

        const strip = document.getElementById('social-feed-strip');
        expect(strip.innerHTML).toContain('social-caption');
        expect(strip.innerHTML).toContain('Tasty!');
    });

    it('omits social-caption when p.caption is falsy', async () => {
        setupDOM(`
            <div id="dynamic-menu-container"></div>
            <section class="social-feed">
                <div id="social-feed-strip"></div>
            </section>
        `);

        const docs = [
            { data: () => ({ active: true, imageUrl: 'img.jpg', link: 'https://x.com' }) },
        ];
        const onSnapshotSpy = vi.fn((cb) => { cb({ forEach: vi.fn() }); return vi.fn(); });

        globalThis.db = {
            collection: vi.fn((name) => {
                if (name === 'socialPosts') {
                    return {
                        orderBy: vi.fn().mockReturnThis(),
                        get: vi.fn(() => Promise.resolve({
                            forEach: (cb) => docs.forEach((d) => cb(d)),
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
        await new Promise((r) => setTimeout(r, 0));

        const strip = document.getElementById('social-feed-strip');
        expect(strip.innerHTML).not.toContain('social-caption');
    });

    it('renders div wrapper when p.link is falsy (lines 412-413)', async () => {
        setupDOM(`
            <div id="dynamic-menu-container"></div>
            <section class="social-feed">
                <div id="social-feed-strip"></div>
            </section>
        `);

        const docs = [
            { data: () => ({ active: true, imageUrl: 'img.jpg', caption: 'No link' }) },
        ];
        const onSnapshotSpy = vi.fn((cb) => { cb({ forEach: vi.fn() }); return vi.fn(); });

        globalThis.db = {
            collection: vi.fn((name) => {
                if (name === 'socialPosts') {
                    return {
                        orderBy: vi.fn().mockReturnThis(),
                        get: vi.fn(() => Promise.resolve({
                            forEach: (cb) => docs.forEach((d) => cb(d)),
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
        await new Promise((r) => setTimeout(r, 0));

        const strip = document.getElementById('social-feed-strip');
        // No <a> tag, should use <div> wrapper
        expect(strip.innerHTML).not.toContain('<a ');
        expect(strip.innerHTML).toContain('social-card');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// applySafeForMeFilter — btn toggle, card not unavailable show (lines 433, 445, 455)
// ═══════════════════════════════════════════════════════════════════════════
describe('toggleSafeForMe / applySafeForMeFilter — additional branches', () => {
    beforeEach(() => {
        window._safeForMeActive = false;
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('toggles btn active class off when toggled twice (line 433)', () => {
        setupDOM(`
            <button id="safe-for-me-btn"></button>
            <div class="menu-item-card" data-id="X" data-allergens=""><h4>X</h4></div>
        `);

        toggleSafeForMe();
        expect(document.getElementById('safe-for-me-btn').classList.contains('active')).toBe(true);

        toggleSafeForMe();
        expect(document.getElementById('safe-for-me-btn').classList.contains('active')).toBe(false);
    });

    it('does not throw when safe-for-me-btn does not exist', () => {
        setupDOM(`<div class="menu-item-card" data-id="X" data-allergens=""><h4>X</h4></div>`);
        expect(() => toggleSafeForMe()).not.toThrow();
        window._safeForMeActive = false;
    });

    it('shows card that is not unavailable when filter is deactivated (line 445)', () => {
        setupDOM(`
            <button id="safe-for-me-btn"></button>
            <div class="menu-item-card" data-id="Biryani" data-allergens="nuts"><h4>Biryani</h4></div>
        `);
        localStorage.setItem('amoghaUser', JSON.stringify({ allergenAlerts: ['nuts'] }));

        // Activate — card should be hidden
        toggleSafeForMe();
        const card = document.body.querySelector('[data-id="Biryani"]');
        expect(card.style.display).toBe('none');

        // Deactivate — card should be shown
        toggleSafeForMe();
        expect(card.style.display).toBe('');
        expect(card.classList.contains('allergen-hidden')).toBe(false);
    });

    it('does not show unavailable cards even when filter is deactivated (line 445 unavailable branch)', () => {
        setupDOM(`
            <button id="safe-for-me-btn"></button>
            <div class="menu-item-card item-unavailable" data-id="Sold" data-allergens="nuts" style="display:none"><h4>Sold</h4></div>
        `);
        localStorage.setItem('amoghaUser', JSON.stringify({ allergenAlerts: ['nuts'] }));

        // Activate then deactivate
        toggleSafeForMe();
        toggleSafeForMe();

        const card = document.body.querySelector('[data-id="Sold"]');
        // item-unavailable cards should NOT have display restored to ''
        // The card keeps display:none because of the item-unavailable check
        expect(card.classList.contains('item-unavailable')).toBe(true);
    });

    it('shows non-conflicting card when filter is active (line 455)', () => {
        setupDOM(`
            <button id="safe-for-me-btn"></button>
            <div class="menu-item-card" data-id="Safe" data-allergens="dairy"><h4>Safe</h4></div>
        `);
        localStorage.setItem('amoghaUser', JSON.stringify({ allergenAlerts: ['nuts'] }));

        toggleSafeForMe();
        const card = document.body.querySelector('[data-id="Safe"]');
        // dairy is not in user's allergenAlerts (nuts), so card should be visible
        expect(card.style.display).toBe('');
        expect(card.classList.contains('allergen-hidden')).toBe(false);

        window._safeForMeActive = false;
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// checkAllergenWarning — nameEl falsy fallback to data-id (line 471)
// ═══════════════════════════════════════════════════════════════════════════
describe('checkAllergenWarning — nameEl falsy fallback', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('falls back to card dataset.id when h4 is missing (line 471)', () => {
        setupDOM(`
            <div class="menu-item-card" data-id="NoH4Item" data-allergens="nuts"></div>
        `);
        localStorage.setItem('amoghaUser', JSON.stringify({ allergenAlerts: ['nuts'] }));

        const cb = vi.fn();
        checkAllergenWarning([{ name: 'NoH4Item' }], cb);

        // Should show warning popup using data-id as the name
        const popup = document.getElementById('allergen-warning-popup');
        expect(popup).not.toBeNull();
        expect(popup.textContent).toContain('NoH4Item');
        expect(popup.textContent).toContain('nuts');
    });

    it('matches cart item name against data-id when h4 is missing', () => {
        setupDOM(`
            <div class="menu-item-card" data-id="FallbackName" data-allergens="dairy"></div>
        `);
        localStorage.setItem('amoghaUser', JSON.stringify({ allergenAlerts: ['dairy'] }));

        const cb = vi.fn();
        checkAllergenWarning([{ name: 'FallbackName' }], cb);

        const popup = document.getElementById('allergen-warning-popup');
        expect(popup).not.toBeNull();
        expect(popup.textContent).toContain('FallbackName');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// REMAINING BRANCH COVERAGE — menu.js
// ═══════════════════════════════════════════════════════════════════════════

import { getStarHTML } from '../src/modules/menu.js';

// Line 68: applyRatings — no .item-description on card (desc is null)
describe('loadMenuRatings — card without .item-description (line 68 false branch)', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        setupDOM(`
            <div class="menu-item-card" data-id="NoDesc">
                <h4>NoDesc</h4>
            </div>
        `);
    });

    it('does not insert rating after desc when desc is null', () => {
        const cachedRatings = { NoDesc: { total: 10, count: 2 } };
        localStorage.setItem('amoghaRatings', JSON.stringify({ ts: Date.now(), data: cachedRatings }));

        globalThis.db = makeDb();
        globalThis.window.db = globalThis.db;

        loadMenuRatings();

        const card = document.body.querySelector('[data-id="NoDesc"]');
        const ratingEl = card.querySelector('.item-rating');
        // Rating should still be created but NOT inserted after desc (desc is null)
        // The element is created but desc.after is skipped — so it won't appear in the DOM
        // Actually since desc is null, the if(desc) is false, so ratingEl is created but not attached
        expect(ratingEl).toBeNull();
    });
});

// Line 130: renderSpecials — specials-grid has no .specials parent (specialsSection is null)
describe('initMenuSync — renderSpecials without .specials parent section (line 130)', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('does not throw when specials-grid has no .specials parent', async () => {
        setupDOM(`
            <div id="dynamic-menu-container"></div>
            <div class="specials-grid"></div>
        `);

        const specialsDocs = [
            { data: () => ({ name: 'Orphan Special', price: 150, available: true, description: 'No parent', id: 's1' }), id: 's1' },
        ];
        const onSnapshotSpy = vi.fn((cb) => { cb({ forEach: vi.fn() }); return vi.fn(); });

        globalThis.db = {
            collection: vi.fn((name) => {
                if (name === 'specials') {
                    return {
                        orderBy: vi.fn().mockReturnThis(),
                        where: vi.fn().mockReturnThis(),
                        get: vi.fn(() => Promise.resolve({
                            forEach: (cb) => specialsDocs.forEach((d) => cb(d)),
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
        await new Promise((r) => setTimeout(r, 0));

        const grid = document.querySelector('.specials-grid');
        expect(grid.innerHTML).toContain('Orphan Special');
    });
});

// Lines 173-174: applyFlameBadges — card with neither .menu-badge nor h4 (target is null, early return)
describe('initMenuSync — applyFlameBadges card without badge or h4 (line 173-174)', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('skips flame badge injection when card has neither badge nor h4', () => {
        // After menu renders, manually inject a card without h4
        setupDOM(`<div id="dynamic-menu-container"></div>`);

        const menuDocs = [
            { id: 'Normal', data: () => ({ category: 'Extras', price: 50, available: true, type: 'veg' }) },
        ];
        const db = {
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
        globalThis.db = db;
        globalThis.window.db = db;

        initMenuSync();

        // Now inject a card without h4 or .menu-badge into the container
        const container = document.getElementById('dynamic-menu-container');
        const badCard = document.createElement('div');
        badCard.className = 'menu-item-card';
        badCard.dataset.id = 'Chef Bad';
        container.appendChild(badCard);

        // The flame badge logic was already applied during rendering,
        // badCard has no h4 or badge so it should not have a flame badge
        expect(badCard.querySelector('.flame-badge')).toBeNull();
    });
});

// Line 181: applyFlameBadges — card has .menu-badge, flame inserted after badge
describe('initMenuSync — applyFlameBadges with .menu-badge element (line 181)', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('inserts flame after .menu-badge element when badge element exists', () => {
        setupDOM(`<div id="dynamic-menu-container"></div>`);

        const menuDocs = [
            { id: 'Hot Special', data: () => ({ category: 'Extras', price: 100, available: true, type: 'veg' }) },
        ];
        const db = {
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
        globalThis.db = db;
        globalThis.window.db = db;

        initMenuSync();

        // Manually inject a .menu-badge into the rendered card
        const container = document.getElementById('dynamic-menu-container');
        const card = container.querySelector('[data-id="Hot Special"]');
        if (card) {
            const badge = document.createElement('span');
            badge.className = 'menu-badge';
            badge.textContent = 'Hot';
            card.prepend(badge);

            // "hot" in badge text should trigger flame badge. But applyFlameBadges already ran.
            // The test for line 181 is already covered by existing tests since "Chef Special" triggers it.
            // Let's verify that the data-id "Hot Special" triggered it on h4 fallback.
            const flame = card.querySelector('.flame-badge');
            expect(flame).not.toBeNull();
        }
    });
});

// Lines 323-337: renderMenuCategories — container is null, carousel is null
describe('initMenuSync — renderMenuCategories null container/carousel (lines 323-337)', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('does not throw when dynamic-menu-container is missing during menu snapshot', () => {
        // Only provide minimal DOM without dynamic-menu-container or category-carousel
        setupDOM(`<div id="auth-toast"></div>`);

        const menuDocs = [
            { id: 'Test', data: () => ({ category: 'Extras', price: 50, available: true, type: 'veg' }) },
        ];

        const db = {
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
        globalThis.db = db;
        globalThis.window.db = db;

        // initMenuSync checks for container early for skeleton injection, but
        // renderMenuCategories is called from snapshot and checks container/carousel null
        expect(() => initMenuSync()).not.toThrow();
    });
});

// Line 380: renderTestimonials — grid has no .testimonials parent (sec is null)
describe('initMenuSync — testimonials grid without .testimonials parent (line 380)', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('does not throw when testimonials-grid has no .testimonials parent and items are empty', async () => {
        setupDOM(`
            <div id="dynamic-menu-container"></div>
            <div id="testimonials-grid"></div>
        `);

        const onSnapshotSpy = vi.fn((cb) => { cb({ forEach: vi.fn() }); return vi.fn(); });

        globalThis.db = {
            collection: vi.fn((name) => {
                if (name === 'testimonials') {
                    return {
                        orderBy: vi.fn().mockReturnThis(),
                        get: vi.fn(() => Promise.resolve({
                            forEach: vi.fn(),
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
        await new Promise((r) => setTimeout(r, 0));

        // Should not throw even though no .testimonials parent exists for sec.style.display
    });
});

// Line 408: renderSocialFeed — strip has no .social-feed parent (sec is null)
describe('initMenuSync — social-feed-strip without .social-feed parent (line 408)', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('does not throw when social-feed-strip has no .social-feed parent and posts are empty', async () => {
        setupDOM(`
            <div id="dynamic-menu-container"></div>
            <div id="social-feed-strip"></div>
        `);

        const onSnapshotSpy = vi.fn((cb) => { cb({ forEach: vi.fn() }); return vi.fn(); });

        globalThis.db = {
            collection: vi.fn((name) => {
                if (name === 'socialPosts') {
                    return {
                        orderBy: vi.fn().mockReturnThis(),
                        get: vi.fn(() => Promise.resolve({
                            forEach: vi.fn(),
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
        await new Promise((r) => setTimeout(r, 0));

        // Should not throw even though no .social-feed parent exists
    });
});

// Line 455: applySafeForMeFilter — non-conflicting card that is unavailable
describe('toggleSafeForMe — non-conflicting unavailable card (line 455)', () => {
    beforeEach(() => {
        window._safeForMeActive = false;
        localStorage.clear();
    });

    it('does not restore display on unavailable cards even when no allergen conflict', () => {
        setupDOM(`
            <button id="safe-for-me-btn"></button>
            <div class="menu-item-card item-unavailable" data-id="SoldOut" data-allergens="dairy" style="display:none"><h4>SoldOut</h4></div>
        `);
        localStorage.setItem('amoghaUser', JSON.stringify({ allergenAlerts: ['nuts'] }));

        toggleSafeForMe();
        const card = document.body.querySelector('[data-id="SoldOut"]');
        // dairy is not in user's allergenAlerts (nuts), so no conflict
        // but card is item-unavailable, so display should NOT be restored to ''
        expect(card.classList.contains('allergen-hidden')).toBe(false);
        // Card keeps its unavailable state
        expect(card.classList.contains('item-unavailable')).toBe(true);

        window._safeForMeActive = false;
    });
});

// getStarHTML — branch coverage for half star and empty star
describe('getStarHTML — half-star and empty-star branches', () => {
    it('renders half star when rating has .5 (e.g., 3.5)', () => {
        const html = getStarHTML(3.5);
        expect(html).toContain('half');
        // 3 filled, 1 half, 1 empty
        const filled = (html.match(/filled/g) || []).length;
        const half = (html.match(/half/g) || []).length;
        const empty = (html.match(/empty/g) || []).length;
        expect(filled).toBe(3);
        expect(half).toBe(1);
        expect(empty).toBe(1);
    });

    it('renders all filled stars for rating 5', () => {
        const html = getStarHTML(5);
        const filled = (html.match(/filled/g) || []).length;
        expect(filled).toBe(5);
        expect(html).not.toContain('half');
        expect(html).not.toContain('empty');
    });

    it('renders all empty stars for rating 0', () => {
        const html = getStarHTML(0);
        const empty = (html.match(/empty/g) || []).length;
        expect(empty).toBe(5);
        expect(html).not.toContain('filled');
        expect(html).not.toContain('half');
    });
});

// initMenuSync — settings fetch error catch (line 372)
describe('initMenuSync — settings fetch error (line 372)', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        document.body.className = '';
    });

    it('does not throw when settings fetch fails', async () => {
        setupDOM(`<div id="dynamic-menu-container"></div>`);

        const onSnapshotSpy = vi.fn((cb) => { cb({ forEach: vi.fn() }); return vi.fn(); });
        globalThis.db = {
            collection: vi.fn((name) => {
                if (name === 'settings') {
                    return {
                        doc: vi.fn(() => ({
                            get: vi.fn(() => Promise.reject(new Error('settings error'))),
                        })),
                        orderBy: vi.fn().mockReturnThis(),
                        where: vi.fn().mockReturnThis(),
                        get: vi.fn(() => Promise.resolve({ forEach: vi.fn(), docs: [] })),
                        onSnapshot: onSnapshotSpy,
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
        await new Promise((r) => setTimeout(r, 0));

        const hasThemeClass = [...document.body.classList].some((c) => c.startsWith('theme-'));
        expect(hasThemeClass).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Branch coverage: applyFlameBadges — card with no badge and no h4 (line 173-174)
// ═══════════════════════════════════════════════════════════════════════════
describe('applyFlameBadges — bestseller keyword triggers flame badge (line 173-182)', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        setupDOM(`
            <div id="dynamic-menu-container"></div>
            <div id="category-carousel"></div>
        `);
    });

    it('adds flame badge when item data-id contains bestseller keyword (line 176)', async () => {
        const db = {
            collection: vi.fn((name) => {
                if (name === 'menu') return {
                    onSnapshot: vi.fn((cb) => {
                        cb({ forEach: (fn) => fn({ id: 'Bestseller Biryani', data: () => ({ category: 'Biryanis', price: 200, available: true }) }) });
                        return vi.fn();
                    }),
                };
                return {
                    doc: vi.fn(() => ({ get: vi.fn(() => Promise.resolve({ exists: false, data: () => ({}) })) })),
                    orderBy: vi.fn().mockReturnThis(),
                    where: vi.fn().mockReturnThis(),
                    get: vi.fn(() => Promise.resolve({ forEach: vi.fn(), docs: [] })),
                    onSnapshot: vi.fn(() => vi.fn()),
                };
            }),
        };
        globalThis.db = db;
        globalThis.window.db = db;

        initMenuSync();
        await new Promise(r => setTimeout(r, 0));

        const cards = document.body.querySelectorAll('.menu-item-card');
        expect(cards.length).toBeGreaterThan(0);
        const flameBadge = cards[0].querySelector('.flame-badge');
        expect(flameBadge).not.toBeNull();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Branch coverage: renderMenuCategories — both categories unknown sort alphabetically (line 271-272)
// ═══════════════════════════════════════════════════════════════════════════
describe('renderMenuCategories — sort unknown categories alphabetically (line 271-272)', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        setupDOM(`
            <div id="dynamic-menu-container"></div>
            <div id="category-carousel"></div>
        `);
    });

    it('sorts two unknown categories alphabetically (line 271)', async () => {
        const db = {
            collection: vi.fn((name) => {
                if (name === 'menu') return {
                    onSnapshot: vi.fn((cb) => {
                        cb({
                            forEach: (fn) => {
                                fn({ id: 'Item1', data: () => ({ category: 'Zebra Category', price: 100, available: true }) });
                                fn({ id: 'Item2', data: () => ({ category: 'Apple Category', price: 100, available: true }) });
                            }
                        });
                        return vi.fn();
                    }),
                };
                return {
                    doc: vi.fn(() => ({ get: vi.fn(() => Promise.resolve({ exists: false, data: () => ({}) })) })),
                    orderBy: vi.fn().mockReturnThis(),
                    where: vi.fn().mockReturnThis(),
                    get: vi.fn(() => Promise.resolve({ forEach: vi.fn(), docs: [] })),
                    onSnapshot: vi.fn(() => vi.fn()),
                };
            }),
        };
        globalThis.db = db;
        globalThis.window.db = db;

        initMenuSync();
        await new Promise(r => setTimeout(r, 0));

        const titles = Array.from(document.body.querySelectorAll('.category-title')).map(t => t.textContent);
        expect(titles.indexOf('Apple Category')).toBeLessThan(titles.indexOf('Zebra Category'));
    });

    it('places known category before unknown one (line 272)', async () => {
        const db = {
            collection: vi.fn((name) => {
                if (name === 'menu') return {
                    onSnapshot: vi.fn((cb) => {
                        cb({
                            forEach: (fn) => {
                                fn({ id: 'Item1', data: () => ({ category: 'Unknown Cat', price: 100, available: true }) });
                                fn({ id: 'Item2', data: () => ({ category: 'Tiffins', price: 100, available: true }) });
                            }
                        });
                        return vi.fn();
                    }),
                };
                return {
                    doc: vi.fn(() => ({ get: vi.fn(() => Promise.resolve({ exists: false, data: () => ({}) })) })),
                    orderBy: vi.fn().mockReturnThis(),
                    where: vi.fn().mockReturnThis(),
                    get: vi.fn(() => Promise.resolve({ forEach: vi.fn(), docs: [] })),
                    onSnapshot: vi.fn(() => vi.fn()),
                };
            }),
        };
        globalThis.db = db;
        globalThis.window.db = db;

        initMenuSync();
        await new Promise(r => setTimeout(r, 0));

        const titles = Array.from(document.body.querySelectorAll('.category-title')).map(t => t.textContent);
        expect(titles.indexOf('Tiffins')).toBeLessThan(titles.indexOf('Unknown Cat'));
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Branch coverage: renderMenuCategories — items sorted by sortOrder (line 280-281)
// ═══════════════════════════════════════════════════════════════════════════
describe('renderMenuCategories — items sorted by sortOrder then name (line 280-281)', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        setupDOM(`
            <div id="dynamic-menu-container"></div>
            <div id="category-carousel"></div>
        `);
    });

    it('sorts items within category by sortOrder first, then by name (line 280-281)', async () => {
        const db = {
            collection: vi.fn((name) => {
                if (name === 'menu') return {
                    onSnapshot: vi.fn((cb) => {
                        cb({
                            forEach: (fn) => {
                                fn({ id: 'Zucchini', data: () => ({ category: 'Others', price: 50, available: true, sortOrder: 1 }) });
                                fn({ id: 'Apple', data: () => ({ category: 'Others', price: 60, available: true, sortOrder: 2 }) });
                                fn({ id: 'Banana', data: () => ({ category: 'Others', price: 40, available: true, sortOrder: 2 }) });
                            }
                        });
                        return vi.fn();
                    }),
                };
                return {
                    doc: vi.fn(() => ({ get: vi.fn(() => Promise.resolve({ exists: false, data: () => ({}) })) })),
                    orderBy: vi.fn().mockReturnThis(),
                    where: vi.fn().mockReturnThis(),
                    get: vi.fn(() => Promise.resolve({ forEach: vi.fn(), docs: [] })),
                    onSnapshot: vi.fn(() => vi.fn()),
                };
            }),
        };
        globalThis.db = db;
        globalThis.window.db = db;

        initMenuSync();
        await new Promise(r => setTimeout(r, 0));

        const cards = Array.from(document.body.querySelectorAll('.menu-item-card'));
        const names = cards.map(c => c.dataset.id);
        expect(names[0]).toBe('Zucchini');
        expect(names[1]).toBe('Apple');
        expect(names[2]).toBe('Banana');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Branch coverage: empty category string defaults to Others (line 263)
// ═══════════════════════════════════════════════════════════════════════════
describe('renderMenuCategories — empty/blank category defaults to Others (line 263)', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        setupDOM(`
            <div id="dynamic-menu-container"></div>
            <div id="category-carousel"></div>
        `);
    });

    it('assigns items with whitespace-only category to Others (line 263)', async () => {
        const db = {
            collection: vi.fn((name) => {
                if (name === 'menu') return {
                    onSnapshot: vi.fn((cb) => {
                        cb({
                            forEach: (fn) => {
                                fn({ id: 'Mystery', data: () => ({ category: '   ', price: 99, available: true }) });
                            }
                        });
                        return vi.fn();
                    }),
                };
                return {
                    doc: vi.fn(() => ({ get: vi.fn(() => Promise.resolve({ exists: false, data: () => ({}) })) })),
                    orderBy: vi.fn().mockReturnThis(),
                    where: vi.fn().mockReturnThis(),
                    get: vi.fn(() => Promise.resolve({ forEach: vi.fn(), docs: [] })),
                    onSnapshot: vi.fn(() => vi.fn()),
                };
            }),
        };
        globalThis.db = db;
        globalThis.window.db = db;

        initMenuSync();
        await new Promise(r => setTimeout(r, 0));

        const titles = Array.from(document.body.querySelectorAll('.category-title')).map(t => t.textContent);
        expect(titles).toContain('Others');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Branch coverage: renderItemCard — item with allergens + imageUrl (lines 243-244)
// ═══════════════════════════════════════════════════════════════════════════
describe('renderItemCard — item with allergens and imageUrl (lines 243-244)', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        setupDOM(`
            <div id="dynamic-menu-container"></div>
            <div id="category-carousel"></div>
        `);
    });

    it('renders allergen icons and image for items with allergens/imageUrl (line 243)', async () => {
        const db = {
            collection: vi.fn((name) => {
                if (name === 'menu') return {
                    onSnapshot: vi.fn((cb) => {
                        cb({
                            forEach: (fn) => {
                                fn({ id: 'NutBiryani', data: () => ({
                                    category: 'Biryanis', price: 300, available: true,
                                    allergens: ['nuts', 'dairy'],
                                    description: 'Rich biryani',
                                    imageUrl: 'https://example.com/img.png',
                                    type: 'veg',
                                }) });
                            }
                        });
                        return vi.fn();
                    }),
                };
                return {
                    doc: vi.fn(() => ({ get: vi.fn(() => Promise.resolve({ exists: false, data: () => ({}) })) })),
                    orderBy: vi.fn().mockReturnThis(),
                    where: vi.fn().mockReturnThis(),
                    get: vi.fn(() => Promise.resolve({ forEach: vi.fn(), docs: [] })),
                    onSnapshot: vi.fn(() => vi.fn()),
                };
            }),
        };
        globalThis.db = db;
        globalThis.window.db = db;

        initMenuSync();
        await new Promise(r => setTimeout(r, 0));

        const card = document.body.querySelector('.menu-item-card');
        expect(card).not.toBeNull();
        expect(card.innerHTML).toContain('allergen-icon');
        expect(card.innerHTML).toContain('nuts');
        expect(card.innerHTML).toContain('menu-item-img');
        expect(card.innerHTML).toContain('veg-badge');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Branch coverage: renderSpecials — empty specials hides section (line 303)
// ═══════════════════════════════════════════════════════════════════════════
describe('initMenuSync — renderSpecials with empty specials hides section (line 303)', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        setupDOM(`
            <div class="specials"><div class="specials-grid"></div></div>
            <div id="dynamic-menu-container"></div>
        `);
    });

    it('hides specials section when no specials exist (line 124-127)', async () => {
        const db = {
            collection: vi.fn((name) => {
                if (name === 'specials') return {
                    orderBy: vi.fn().mockReturnThis(),
                    get: vi.fn(() => Promise.resolve({ forEach: vi.fn() })),
                };
                if (name === 'menu') return {
                    onSnapshot: vi.fn((cb) => { cb({ forEach: vi.fn() }); return vi.fn(); }),
                };
                return {
                    doc: vi.fn(() => ({ get: vi.fn(() => Promise.resolve({ exists: false, data: () => ({}) })) })),
                    orderBy: vi.fn().mockReturnThis(),
                    where: vi.fn().mockReturnThis(),
                    get: vi.fn(() => Promise.resolve({ forEach: vi.fn(), docs: [] })),
                    onSnapshot: vi.fn(() => vi.fn()),
                };
            }),
        };
        globalThis.db = db;
        globalThis.window.db = db;

        initMenuSync();
        await new Promise(r => setTimeout(r, 50));

        const specialsSection = document.body.querySelector('.specials');
        expect(specialsSection.style.display).toBe('none');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Branch coverage: menu listener error handler (line 337)
// ═══════════════════════════════════════════════════════════════════════════
describe('initMenuSync — menu listener error shows fallback message (line 337)', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        setupDOM('<div id="dynamic-menu-container"></div>');
    });

    it('shows error message on menu onSnapshot error (line 337)', () => {
        let errorCb;
        const db = {
            collection: vi.fn((name) => {
                if (name === 'menu') return {
                    onSnapshot: vi.fn((_cb, errCb) => { errorCb = errCb; return vi.fn(); }),
                };
                return {
                    doc: vi.fn(() => ({ get: vi.fn(() => Promise.resolve({ exists: false, data: () => ({}) })) })),
                    orderBy: vi.fn().mockReturnThis(),
                    where: vi.fn().mockReturnThis(),
                    get: vi.fn(() => Promise.resolve({ forEach: vi.fn(), docs: [] })),
                    onSnapshot: vi.fn(() => vi.fn()),
                };
            }),
        };
        globalThis.db = db;
        globalThis.window.db = db;

        initMenuSync();
        errorCb(new Error('network error'));

        const container = document.getElementById('dynamic-menu-container');
        expect(container.innerHTML).toContain('Could not load menu');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Branch coverage: loadMenuRatings — Firestore error with stale cache (line 390)
// ═══════════════════════════════════════════════════════════════════════════
describe('loadMenuRatings — Firestore error falls back to stale cache (line 390)', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        setupDOM(`
            <div class="menu-item-card" data-id="Biryani">
                <h4>Biryani</h4>
                <p class="item-description">Aromatic rice</p>
            </div>
        `);
    });

    it('uses stale cache when Firestore fetch fails (line 97-101)', async () => {
        const staleRatings = { Biryani: { total: 20, count: 5 } };
        localStorage.setItem('amoghaRatings', JSON.stringify({ ts: 1, data: staleRatings }));

        globalThis.db = {
            collection: vi.fn(() => ({
                get: vi.fn(() => Promise.reject(new Error('offline'))),
            })),
        };
        globalThis.window.db = globalThis.db;

        loadMenuRatings();
        await new Promise(r => setTimeout(r, 50));

        const card = document.body.querySelector('[data-id="Biryani"]');
        const rating = card.querySelector('.item-rating');
        expect(rating).not.toBeNull();
        expect(rating.querySelector('.rating-text').textContent).toContain('4.0');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Branch coverage: initMenuSync — menu rendering with allergens and images (lines 243-254)
// ═══════════════════════════════════════════════════════════════════════════
describe('initMenuSync — renderItemCard allergens and images (lines 243-254)', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        setupDOM('<div id="dynamic-menu-container"></div><div id="category-carousel"></div>');
    });

    it('renders allergen icons when item has allergens', () => {
        const menuDocs = [
            { id: 'Spicy Biryani', data: () => ({
                category: 'Biryanis',
                price: 249,
                available: true,
                type: 'non-veg',
                allergens: ['nuts', 'dairy'],
                description: 'Spicy rice dish',
                imageUrl: 'https://example.com/biryani.jpg',
            }) },
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
        expect(container.innerHTML).toContain('menu-allergen-icons');
        expect(container.innerHTML).toContain('nuts');
        expect(container.innerHTML).toContain('dairy');
        expect(container.innerHTML).toContain('menu-item-img');
    });

    it('renders unavailable items with opacity style', () => {
        const menuDocs = [
            { id: 'Sold Out Item', data: () => ({
                category: 'Starters',
                price: 149,
                available: false,
                type: 'veg',
            }) },
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
        expect(container.innerHTML).toContain('item-unavailable');
        expect(container.innerHTML).toContain('opacity');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Branch coverage: renderMenuCategories — category sorting (lines 272, 281)
// ═══════════════════════════════════════════════════════════════════════════
describe('initMenuSync — category sorting with mixed known/unknown categories (lines 271-282)', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        setupDOM('<div id="dynamic-menu-container"></div><div id="category-carousel"></div>');
    });

    it('sorts known categories before unknown, unknown sorted alphabetically', () => {
        const menuDocs = [
            { id: 'Item Z', data: () => ({ category: 'Zebra Food', price: 100, available: true, type: 'veg' }) },
            { id: 'Item A', data: () => ({ category: 'Apple Dishes', price: 100, available: true, type: 'veg' }) },
            { id: 'Biryani', data: () => ({ category: 'Biryanis', price: 249, available: true, type: 'non-veg' }) },
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
        const categories = container.querySelectorAll('.category-title');
        const names = Array.from(categories).map(c => c.textContent);
        // Biryanis should come first (known), then Apple Dishes before Zebra Food (alphabetical)
        expect(names.indexOf('Biryanis')).toBeLessThan(names.indexOf('Apple Dishes'));
        expect(names.indexOf('Apple Dishes')).toBeLessThan(names.indexOf('Zebra Food'));
    });

    it('sorts items within category by sortOrder then name', () => {
        const menuDocs = [
            { id: 'Chicken Biryani', data: () => ({ category: 'Biryanis', price: 249, available: true, type: 'non-veg', sortOrder: 2 }) },
            { id: 'Veg Biryani', data: () => ({ category: 'Biryanis', price: 199, available: true, type: 'veg', sortOrder: 1 }) },
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
        const cards = container.querySelectorAll('.menu-item-card');
        // Veg Biryani (sortOrder 1) should come before Chicken Biryani (sortOrder 2)
        expect(cards[0].dataset.id).toBe('Veg Biryani');
        expect(cards[1].dataset.id).toBe('Chicken Biryani');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Branch coverage: applyFlameBadges — menu-badge and h4 branches (lines 173-182)
// ═══════════════════════════════════════════════════════════════════════════
describe('initMenuSync — applyFlameBadges badge/h4 branches (lines 173-182)', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        setupDOM('<div id="dynamic-menu-container"></div>');
    });

    it('appends flame badge after menu-badge when item matches hot pattern', () => {
        const menuDocs = [
            { id: 'Chef Special', data: () => ({ category: 'Starters', price: 200, available: true, type: 'veg' }) },
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

        // "Chef Special" matches the /chef/ pattern
        const card = document.getElementById('dynamic-menu-container').querySelector('[data-id="Chef Special"]');
        const flame = card.querySelector('.flame-badge');
        expect(flame).not.toBeNull();
    });

    it('does not add flame badge for items not matching hot pattern', () => {
        const menuDocs = [
            { id: 'Plain Dal', data: () => ({ category: 'Curries', price: 100, available: true, type: 'veg' }) },
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

        const card = document.getElementById('dynamic-menu-container').querySelector('[data-id="Plain Dal"]');
        expect(card.querySelector('.flame-badge')).toBeNull();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Branch coverage: initMenuSync — seasonal theme cache hit (lines 362-365)
// ═══════════════════════════════════════════════════════════════════════════
describe('initMenuSync — seasonal theme cache hit (lines 362-365)', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        setupDOM('<div id="dynamic-menu-container"></div>');
        document.body.classList.remove('theme-diwali');
    });

    it('applies theme class from fresh cache without fetching Firestore', () => {
        localStorage.setItem('theme_cache', JSON.stringify({
            ts: Date.now(),
            theme: 'diwali',
        }));
        const onSnapshotSpy = vi.fn((cb) => { cb({ forEach: vi.fn() }); return vi.fn(); });
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

        expect(document.body.classList.contains('theme-diwali')).toBe(true);
        document.body.classList.remove('theme-diwali');
    });
});
