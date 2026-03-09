// ===== ADMIN SERVICE WORKER TESTS =====
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
            match: vi.fn((req) => {
                const url = typeof req === 'string' ? req : req.url;
                return Promise.resolve(cacheStore[name][url] || undefined);
            }),
        };
    };

    const caches = {
        open: vi.fn((name) => Promise.resolve(makeCacheObj(name))),
        keys: vi.fn(() => Promise.resolve(Object.keys(cacheStore))),
        delete: vi.fn((name) => { delete cacheStore[name]; return Promise.resolve(true); }),
        match: vi.fn((req) => {
            const url = typeof req === 'string' ? req : req.url;
            for (const name of Object.keys(cacheStore)) {
                if (cacheStore[name][url]) return Promise.resolve(cacheStore[name][url]);
            }
            return Promise.resolve(undefined);
        }),
    };

    const self = {
        addEventListener: vi.fn((event, handler) => { listeners[event] = handler; }),
        skipWaiting: vi.fn(() => Promise.resolve()),
        clients: { claim: vi.fn(() => Promise.resolve()) },
    };

    return { listeners, cacheStore, caches, self };
}

function loadAdminSW(env) {
    const { self, caches } = env;

    const CACHE_NAME = 'amogha-admin-v1';
    const ASSETS = ['./', './index.html', './manifest.json', '../amogha-logo.png'];

    self.addEventListener('install', function(e) {
        e.waitUntil(caches.open(CACHE_NAME).then(function(cache) { return cache.addAll(ASSETS); }));
        self.skipWaiting();
    });

    self.addEventListener('activate', function(e) {
        e.waitUntil(
            caches.keys().then(function(names) {
                return Promise.all(names.filter(function(n) { return n.startsWith('amogha-admin-') && n !== CACHE_NAME; }).map(function(n) { return caches.delete(n); }));
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

describe('Admin Service Worker', () => {
    beforeEach(() => {
        env = buildSWEnv();
        globalThis.fetch = vi.fn();
        handlers = loadAdminSW(env);
    });

    afterEach(() => { vi.restoreAllMocks(); });

    describe('install', () => {
        it('opens correct cache and adds assets', async () => {
            let waitPromise;
            const event = { waitUntil: vi.fn((p) => { waitPromise = p; }) };
            handlers.install(event);
            await waitPromise;
            expect(env.caches.open).toHaveBeenCalledWith('amogha-admin-v1');
        });

        it('calls skipWaiting', () => {
            const event = { waitUntil: vi.fn() };
            handlers.install(event);
            expect(env.self.skipWaiting).toHaveBeenCalled();
        });
    });

    describe('activate', () => {
        it('deletes old admin caches but keeps current', async () => {
            env.cacheStore['amogha-admin-v0'] = { '/old': 'data' };
            env.cacheStore['amogha-admin-v1'] = { '/current': 'data' };
            env.cacheStore['other-cache'] = { '/other': 'data' };

            let waitPromise;
            const event = { waitUntil: vi.fn((p) => { waitPromise = p; }) };
            handlers.activate(event);
            await waitPromise;

            expect(env.caches.delete).toHaveBeenCalledWith('amogha-admin-v0');
            // other-cache does NOT start with 'amogha-admin-', so should NOT be deleted
            expect(env.caches.delete).not.toHaveBeenCalledWith('other-cache');
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
            const event = { request: { method: 'POST', url: '/api' }, respondWith: vi.fn() };
            handlers.fetch(event);
            expect(event.respondWith).not.toHaveBeenCalled();
        });

        it('serves from network and caches response', async () => {
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

        it('falls back to cache when offline', async () => {
            globalThis.fetch.mockRejectedValueOnce(new Error('offline'));
            env.caches.match.mockResolvedValueOnce('cached-page');

            let responded;
            const event = {
                request: { method: 'GET', url: '/index.html' },
                respondWith: vi.fn((p) => { responded = p; }),
            };
            handlers.fetch(event);
            const result = await responded;
            expect(result).toBe('cached-page');
        });
    });
});
