// ===== KITCHEN SERVICE WORKER TESTS =====
// kitchen/sw.js has unique logic: skips Firebase/Firestore URLs and falls back to index.html
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let handlers, env;

function buildSWEnv() {
    const listeners = {};
    const cacheStore = {};

    const makeCacheObj = (name) => {
        if (!cacheStore[name]) cacheStore[name] = {};
        return {
            addAll: vi.fn((urls) => { urls.forEach(u => { cacheStore[name][u] = 'cached'; }); return Promise.resolve(); }),
            put: vi.fn((req, resp) => { cacheStore[name][typeof req === 'string' ? req : req.url] = resp; return Promise.resolve(); }),
        };
    };

    const caches = {
        open: vi.fn((name) => Promise.resolve(makeCacheObj(name))),
        keys: vi.fn(() => Promise.resolve(Object.keys(cacheStore))),
        delete: vi.fn((name) => { delete cacheStore[name]; return Promise.resolve(true); }),
        match: vi.fn(() => Promise.resolve(undefined)),
    };

    const self = {
        addEventListener: vi.fn((event, handler) => { listeners[event] = handler; }),
        skipWaiting: vi.fn(() => Promise.resolve()),
        clients: { claim: vi.fn(() => Promise.resolve()) },
    };

    return { listeners, cacheStore, caches, self };
}

function loadKitchenSW(env) {
    const { self, caches } = env;

    var CACHE_NAME = 'kds-v1';
    var ASSETS = ['./', './index.html', '../amogha-logo.png',
        'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&family=Playfair+Display:wght@500;700&family=JetBrains+Mono:wght@400;600;700&display=swap'];

    self.addEventListener('install', function(e) {
        e.waitUntil(caches.open(CACHE_NAME).then(function(cache) { return cache.addAll(ASSETS); }));
        self.skipWaiting();
    });

    self.addEventListener('activate', function(e) {
        e.waitUntil(
            caches.keys().then(function(keys) {
                return Promise.all(
                    keys.filter(function(k) { return k !== CACHE_NAME; }).map(function(k) { return caches.delete(k); })
                );
            })
        );
        self.clients.claim();
    });

    self.addEventListener('fetch', function(e) {
        if (e.request.method !== 'GET') return;
        var url = e.request.url;
        if (url.indexOf('firestore.googleapis.com') !== -1 ||
            url.indexOf('firebase') !== -1 && url.indexOf('.js') !== -1) {
            return;
        }

        e.respondWith(
            fetch(e.request).then(function(response) {
                if (response && response.status === 200) {
                    var clone = response.clone();
                    caches.open(CACHE_NAME).then(function(cache) { cache.put(e.request, clone); });
                }
                return response;
            }).catch(function() {
                return caches.match(e.request).then(function(cached) {
                    return cached || caches.match('./index.html');
                });
            })
        );
    });

    const calls = self.addEventListener.mock.calls;
    const h = {};
    calls.forEach(([event, handler]) => { h[event] = handler; });
    return h;
}

describe('Kitchen Service Worker', () => {
    beforeEach(() => {
        env = buildSWEnv();
        globalThis.fetch = vi.fn();
        handlers = loadKitchenSW(env);
    });

    afterEach(() => { vi.restoreAllMocks(); });

    // ===== INSTALL =====
    describe('install', () => {
        it('opens kds-v1 cache and adds assets', async () => {
            let waitPromise;
            const event = { waitUntil: vi.fn((p) => { waitPromise = p; }) };
            handlers.install(event);
            await waitPromise;
            expect(env.caches.open).toHaveBeenCalledWith('kds-v1');
        });

        it('calls skipWaiting', () => {
            const event = { waitUntil: vi.fn() };
            handlers.install(event);
            expect(env.self.skipWaiting).toHaveBeenCalled();
        });
    });

    // ===== ACTIVATE =====
    describe('activate', () => {
        it('deletes all caches except kds-v1', async () => {
            env.cacheStore['kds-v0'] = {};
            env.cacheStore['kds-v1'] = {};
            env.cacheStore['other'] = {};

            let waitPromise;
            const event = { waitUntil: vi.fn((p) => { waitPromise = p; }) };
            handlers.activate(event);
            await waitPromise;

            expect(env.caches.delete).toHaveBeenCalledWith('kds-v0');
            expect(env.caches.delete).toHaveBeenCalledWith('other');
            expect(env.caches.delete).not.toHaveBeenCalledWith('kds-v1');
        });

        it('calls clients.claim', () => {
            const event = { waitUntil: vi.fn() };
            handlers.activate(event);
            expect(env.self.clients.claim).toHaveBeenCalled();
        });
    });

    // ===== FETCH =====
    describe('fetch — skip conditions', () => {
        it('ignores non-GET requests', () => {
            const event = { request: { method: 'POST', url: '/api' }, respondWith: vi.fn() };
            handlers.fetch(event);
            expect(event.respondWith).not.toHaveBeenCalled();
        });

        it('skips Firestore API requests', () => {
            const event = {
                request: { method: 'GET', url: 'https://firestore.googleapis.com/v1/projects/amogha-cafe/databases' },
                respondWith: vi.fn(),
            };
            handlers.fetch(event);
            expect(event.respondWith).not.toHaveBeenCalled();
        });

        it('skips Firebase JS SDK requests', () => {
            const event = {
                request: { method: 'GET', url: 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js' },
                respondWith: vi.fn(),
            };
            handlers.fetch(event);
            expect(event.respondWith).not.toHaveBeenCalled();
        });
    });

    describe('fetch — network first', () => {
        it('caches 200 responses', async () => {
            const mockResponse = { status: 200, ok: true, clone: () => ({ cloned: true }) };
            globalThis.fetch.mockResolvedValueOnce(mockResponse);

            let responded;
            const event = {
                request: { method: 'GET', url: 'https://amogha.cafe/kitchen/index.html' },
                respondWith: vi.fn((p) => { responded = p; }),
            };
            handlers.fetch(event);
            const result = await responded;
            expect(result).toBe(mockResponse);

            // Allow microtasks to flush
            await new Promise(r => setTimeout(r, 50));
            // caches.open was called to store the response
            const openCalls = env.caches.open.mock.calls;
            const fetchTimeCalls = openCalls.filter(c => c[0] === 'kds-v1');
            expect(fetchTimeCalls.length).toBeGreaterThan(0);
        });

        it('does not cache non-200 responses', async () => {
            const mockResponse = { status: 404, ok: false, clone: () => ({ cloned: true }) };
            globalThis.fetch.mockResolvedValueOnce(mockResponse);

            const openCallsBefore = env.caches.open.mock.calls.length;

            let responded;
            const event = {
                request: { method: 'GET', url: 'https://amogha.cafe/missing.html' },
                respondWith: vi.fn((p) => { responded = p; }),
            };
            handlers.fetch(event);
            const result = await responded;
            expect(result).toBe(mockResponse);

            await new Promise(r => setTimeout(r, 50));
            expect(env.caches.open.mock.calls.length).toBe(openCallsBefore);
        });
    });

    describe('fetch — offline fallback', () => {
        it('returns cached version when offline', async () => {
            globalThis.fetch.mockRejectedValueOnce(new Error('offline'));
            env.caches.match.mockResolvedValueOnce('cached-page');

            let responded;
            const event = {
                request: { method: 'GET', url: 'https://amogha.cafe/kitchen/index.html' },
                respondWith: vi.fn((p) => { responded = p; }),
            };
            handlers.fetch(event);
            const result = await responded;
            expect(result).toBe('cached-page');
        });

        it('falls back to index.html when no cache for requested page', async () => {
            globalThis.fetch.mockRejectedValueOnce(new Error('offline'));
            env.caches.match
                .mockResolvedValueOnce(undefined)  // no cache for request
                .mockResolvedValueOnce('cached-index');  // index.html fallback

            let responded;
            const event = {
                request: { method: 'GET', url: 'https://amogha.cafe/kitchen/other-page' },
                respondWith: vi.fn((p) => { responded = p; }),
            };
            handlers.fetch(event);
            const result = await responded;
            expect(result).toBe('cached-index');
        });
    });
});
