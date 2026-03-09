// ===== KIOSK SERVICE WORKER TESTS =====
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

function loadKioskSW(env) {
    const { self, caches } = env;

    var CACHE_NAME = 'amogha-kiosk-v3';
    var ASSETS = ['./', './index.html', './manifest.json', '../amogha-logo.png'];

    self.addEventListener('install', function(e) {
        e.waitUntil(caches.open(CACHE_NAME).then(function(cache) { return cache.addAll(ASSETS); }));
        self.skipWaiting();
    });

    self.addEventListener('activate', function(e) {
        e.waitUntil(
            caches.keys().then(function(names) {
                return Promise.all(names.filter(function(n) { return n.startsWith('amogha-kiosk-') && n !== CACHE_NAME; }).map(function(n) { return caches.delete(n); }));
            })
        );
        self.clients.claim();
    });

    self.addEventListener('fetch', function(e) {
        if (e.request.method !== 'GET') return;
        e.respondWith(
            fetch(e.request).then(function(res) {
                var clone = res.clone();
                caches.open(CACHE_NAME).then(function(cache) { cache.put(e.request, clone); });
                return res;
            }).catch(function() {
                return caches.match(e.request);
            })
        );
    });

    const calls = self.addEventListener.mock.calls;
    const h = {};
    calls.forEach(([event, handler]) => { h[event] = handler; });
    return h;
}

describe('Kiosk Service Worker', () => {
    beforeEach(() => {
        env = buildSWEnv();
        globalThis.fetch = vi.fn();
        handlers = loadKioskSW(env);
    });

    afterEach(() => { vi.restoreAllMocks(); });

    describe('install', () => {
        it('opens amogha-kiosk-v3 cache', async () => {
            let waitPromise;
            const event = { waitUntil: vi.fn((p) => { waitPromise = p; }) };
            handlers.install(event);
            await waitPromise;
            expect(env.caches.open).toHaveBeenCalledWith('amogha-kiosk-v3');
        });

        it('calls skipWaiting', () => {
            const event = { waitUntil: vi.fn() };
            handlers.install(event);
            expect(env.self.skipWaiting).toHaveBeenCalled();
        });
    });

    describe('activate', () => {
        it('only deletes caches starting with amogha-kiosk-', async () => {
            env.cacheStore['amogha-kiosk-v2'] = {};
            env.cacheStore['amogha-kiosk-v3'] = {};
            env.cacheStore['amogha-admin-v1'] = {};

            let waitPromise;
            const event = { waitUntil: vi.fn((p) => { waitPromise = p; }) };
            handlers.activate(event);
            await waitPromise;

            expect(env.caches.delete).toHaveBeenCalledWith('amogha-kiosk-v2');
            expect(env.caches.delete).not.toHaveBeenCalledWith('amogha-kiosk-v3');
            expect(env.caches.delete).not.toHaveBeenCalledWith('amogha-admin-v1');
        });

        it('calls clients.claim', () => {
            const event = { waitUntil: vi.fn() };
            handlers.activate(event);
            expect(env.self.clients.claim).toHaveBeenCalled();
        });
    });

    describe('fetch', () => {
        it('ignores non-GET requests', () => {
            const event = { request: { method: 'POST' }, respondWith: vi.fn() };
            handlers.fetch(event);
            expect(event.respondWith).not.toHaveBeenCalled();
        });

        it('serves from network first', async () => {
            const mockResponse = { ok: true, clone: () => ({ cloned: true }) };
            globalThis.fetch.mockResolvedValueOnce(mockResponse);

            let responded;
            const event = {
                request: { method: 'GET', url: '/index.html' },
                respondWith: vi.fn((p) => { responded = p; }),
            };
            handlers.fetch(event);
            const result = await responded;
            expect(result).toBe(mockResponse);
        });

        it('falls back to cache offline', async () => {
            globalThis.fetch.mockRejectedValueOnce(new Error('offline'));
            env.caches.match.mockResolvedValueOnce('cached');

            let responded;
            const event = {
                request: { method: 'GET', url: '/index.html' },
                respondWith: vi.fn((p) => { responded = p; }),
            };
            handlers.fetch(event);
            const result = await responded;
            expect(result).toBe('cached');
        });
    });
});
