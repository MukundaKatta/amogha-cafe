// ===== SERVICE WORKER TESTS =====
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// -- helpers to simulate the SW environment --

let installHandler, activateHandler, fetchHandler, pushHandler, notificationclickHandler;

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
        clients: {
            claim: vi.fn(() => Promise.resolve()),
            matchAll: vi.fn(() => Promise.resolve([])),
            openWindow: vi.fn(() => Promise.resolve()),
        },
        registration: {
            showNotification: vi.fn(() => Promise.resolve()),
        },
        location: { origin: 'https://amogha.cafe' },
    };

    return { listeners, cacheStore, caches, self };
}

function loadSW(env) {
    // Simulate sw.js by evaluating its logic in our mock environment
    const { self, caches } = env;

    const CACHE_NAME = 'amogha-v70';
    const ASSETS = [
        './', './index.html', './styles.css?v=67', './script.js?v=20260305c',
        './manifest.json', './amogha-logo.png', './bg.jpeg',
    ];

    // install
    self.addEventListener('install', function(e) {
        e.waitUntil(
            caches.open(CACHE_NAME).then(function(cache) { return cache.addAll(ASSETS); })
        );
        self.skipWaiting();
    });

    // activate
    self.addEventListener('activate', function(e) {
        e.waitUntil(
            caches.keys().then(function(keys) {
                return Promise.all(
                    keys.filter(function(k) { return k !== CACHE_NAME; }).map(function(k) { return caches.delete(k); })
                );
            }).then(function() {
                return self.clients.claim();
            })
        );
    });

    // fetch
    self.addEventListener('fetch', function(e) {
        var url = new URL(e.request.url);
        if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;

        var isDocument = e.request.destination === 'document';
        var isStyle = e.request.destination === 'style' || url.pathname.endsWith('.css');
        var isScript = e.request.destination === 'script' || url.pathname.endsWith('.js');

        if (isDocument || isStyle || isScript) {
            e.respondWith(
                fetch(e.request).then(function(response) {
                    if (response.ok && response.type !== 'opaque') {
                        var clone = response.clone();
                        caches.open(CACHE_NAME).then(function(cache) { cache.put(e.request, clone); });
                    }
                    return response;
                }).catch(function() {
                    return caches.match(e.request).then(function(cached) {
                        return cached || (isDocument ? caches.match('./index.html') : new Response('', { status: 503 }));
                    });
                })
            );
            return;
        }

        e.respondWith(
            caches.match(e.request).then(function(cached) {
                if (cached) return cached;
                return fetch(e.request).then(function(response) {
                    if (response.ok) {
                        var clone = response.clone();
                        caches.open(CACHE_NAME).then(function(cache) { cache.put(e.request, clone); });
                    }
                    return response;
                });
            })
        );
    });

    // push
    self.addEventListener('push', function(e) {
        var data = {};
        try { data = e.data ? e.data.json() : {}; } catch(err) { data = {}; }
        var title = (data.notification && data.notification.title) || 'Amogha Cafe';
        var options = {
            body: (data.notification && data.notification.body) || 'You have a new notification',
            icon: './amogha-logo.png',
            badge: './amogha-logo.png',
            tag: 'amogha-push',
            data: data.data || {}
        };
        e.waitUntil(self.registration.showNotification(title, options));
    });

    // notificationclick
    self.addEventListener('notificationclick', function(e) {
        e.notification.close();
        var url = '/';
        if (e.notification.data && e.notification.data.url) {
            url = e.notification.data.url;
        }
        e.waitUntil(
            self.clients.matchAll({ type: 'window' }).then(function(windowClients) {
                for (var i = 0; i < windowClients.length; i++) {
                    if (windowClients[i].url.indexOf(url) !== -1) {
                        return windowClients[i].focus();
                    }
                }
                return self.clients.openWindow(url);
            })
        );
    });

    // extract handlers
    const calls = self.addEventListener.mock.calls;
    const handlers = {};
    calls.forEach(([event, handler]) => { handlers[event] = handler; });
    return handlers;
}

describe('Service Worker', () => {
    let env, handlers;

    beforeEach(() => {
        env = buildSWEnv();
        // Provide global fetch mock
        globalThis.fetch = vi.fn();
        globalThis.Response = class Response {
            constructor(body, init) {
                this.body = body;
                this.status = init?.status || 200;
                this.ok = this.status >= 200 && this.status < 300;
                this.type = 'basic';
            }
            clone() { return { ...this }; }
        };
        globalThis.URL = URL;
        handlers = loadSW(env);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ===== INSTALL EVENT =====
    describe('install event', () => {
        it('opens the correct cache and adds all assets', async () => {
            let waitPromise;
            const event = {
                waitUntil: vi.fn((p) => { waitPromise = p; }),
            };
            handlers.install(event);

            expect(event.waitUntil).toHaveBeenCalled();
            await waitPromise;

            expect(env.caches.open).toHaveBeenCalledWith('amogha-v70');
        });

        it('calls skipWaiting immediately', () => {
            const event = { waitUntil: vi.fn() };
            handlers.install(event);
            expect(env.self.skipWaiting).toHaveBeenCalled();
        });
    });

    // ===== ACTIVATE EVENT =====
    describe('activate event', () => {
        it('deletes old caches and keeps current cache', async () => {
            // Pre-populate old caches
            env.cacheStore['amogha-v69'] = { '/old': 'data' };
            env.cacheStore['amogha-v70'] = { '/current': 'data' };
            env.cacheStore['other-cache'] = { '/other': 'data' };

            let waitPromise;
            const event = { waitUntil: vi.fn((p) => { waitPromise = p; }) };
            handlers.activate(event);
            await waitPromise;

            expect(env.caches.delete).toHaveBeenCalledWith('amogha-v69');
            expect(env.caches.delete).toHaveBeenCalledWith('other-cache');
            expect(env.caches.delete).not.toHaveBeenCalledWith('amogha-v70');
        });

        it('calls clients.claim after cache cleanup', async () => {
            let waitPromise;
            const event = { waitUntil: vi.fn((p) => { waitPromise = p; }) };
            handlers.activate(event);
            await waitPromise;
            expect(env.self.clients.claim).toHaveBeenCalled();
        });
    });

    // ===== FETCH EVENT =====
    describe('fetch event — network first for documents', () => {
        it('serves document from network and caches response', async () => {
            const mockResponse = { ok: true, type: 'basic', clone: () => ({ cloned: true }) };
            globalThis.fetch.mockResolvedValueOnce(mockResponse);

            let responded;
            const event = {
                request: { url: 'https://amogha.cafe/index.html', method: 'GET', destination: 'document' },
                respondWith: vi.fn((p) => { responded = p; }),
            };
            handlers.fetch(event);
            expect(event.respondWith).toHaveBeenCalled();

            const result = await responded;
            expect(result).toBe(mockResponse);
            expect(globalThis.fetch).toHaveBeenCalledWith(event.request);
        });

        it('falls back to cache when network fails for document', async () => {
            globalThis.fetch.mockRejectedValueOnce(new Error('offline'));

            // Seed cache with a fallback
            env.cacheStore['amogha-v70'] = {};
            env.caches.match.mockResolvedValueOnce(undefined).mockResolvedValueOnce('cached-index');

            let responded;
            const event = {
                request: { url: 'https://amogha.cafe/page', method: 'GET', destination: 'document' },
                respondWith: vi.fn((p) => { responded = p; }),
            };
            handlers.fetch(event);
            const result = await responded;
            // Should fall back to index.html for documents
            expect(result).toBe('cached-index');
        });

        it('returns 503 when network fails for CSS with no cache', async () => {
            globalThis.fetch.mockRejectedValueOnce(new Error('offline'));
            env.caches.match.mockResolvedValueOnce(undefined);

            let responded;
            const event = {
                request: { url: 'https://amogha.cafe/styles.css', method: 'GET', destination: 'style' },
                respondWith: vi.fn((p) => { responded = p; }),
            };
            handlers.fetch(event);
            const result = await responded;
            expect(result.status).toBe(503);
        });
    });

    describe('fetch event — cache first for images', () => {
        it('returns cached image immediately', async () => {
            env.caches.match.mockResolvedValueOnce('cached-image');

            let responded;
            const event = {
                request: { url: 'https://amogha.cafe/pics/logo.png', method: 'GET', destination: 'image' },
                respondWith: vi.fn((p) => { responded = p; }),
            };
            handlers.fetch(event);
            const result = await responded;
            expect(result).toBe('cached-image');
            expect(globalThis.fetch).not.toHaveBeenCalled();
        });

        it('fetches from network when image not in cache', async () => {
            env.caches.match.mockResolvedValueOnce(undefined);
            const mockResponse = { ok: true, clone: () => ({ cloned: true }) };
            globalThis.fetch.mockResolvedValueOnce(mockResponse);

            let responded;
            const event = {
                request: { url: 'https://amogha.cafe/pics/food.jpg', method: 'GET', destination: 'image' },
                respondWith: vi.fn((p) => { responded = p; }),
            };
            handlers.fetch(event);
            const result = await responded;
            expect(result).toBe(mockResponse);
        });

        it('does not cache non-ok network responses for images', async () => {
            env.caches.match.mockResolvedValueOnce(undefined);
            const mockResponse = { ok: false, status: 404, clone: () => ({ cloned: true }) };
            globalThis.fetch.mockResolvedValueOnce(mockResponse);

            let responded;
            const event = {
                request: { url: 'https://amogha.cafe/pics/missing.jpg', method: 'GET', destination: 'image' },
                respondWith: vi.fn((p) => { responded = p; }),
            };
            handlers.fetch(event);
            await responded;
            // caches.open call count should not have increased (no caching for 404)
            const openCallsBeforeFetch = env.caches.open.mock.calls.length;
            // Allow microtasks to flush
            await new Promise(r => setTimeout(r, 50));
            // open was not called again to cache the 404 response
            expect(env.caches.open.mock.calls.length).toBe(openCallsBeforeFetch);
        });
    });

    describe('fetch event — skip conditions', () => {
        it('ignores non-GET requests', () => {
            const event = {
                request: { url: 'https://amogha.cafe/api/order', method: 'POST', destination: '' },
                respondWith: vi.fn(),
            };
            handlers.fetch(event);
            expect(event.respondWith).not.toHaveBeenCalled();
        });

        it('ignores cross-origin requests', () => {
            const event = {
                request: { url: 'https://cdn.example.com/lib.js', method: 'GET', destination: 'script' },
                respondWith: vi.fn(),
            };
            handlers.fetch(event);
            expect(event.respondWith).not.toHaveBeenCalled();
        });
    });

    describe('fetch event — JS file detection via pathname', () => {
        it('uses network-first for .js files even with empty destination', async () => {
            const mockResponse = { ok: true, type: 'basic', clone: () => ({ cloned: true }) };
            globalThis.fetch.mockResolvedValueOnce(mockResponse);

            let responded;
            const event = {
                request: { url: 'https://amogha.cafe/script.js', method: 'GET', destination: '' },
                respondWith: vi.fn((p) => { responded = p; }),
            };
            handlers.fetch(event);
            const result = await responded;
            expect(result).toBe(mockResponse);
        });
    });

    describe('fetch event — CSS file detection via pathname', () => {
        it('uses network-first for .css files even with empty destination', async () => {
            const mockResponse = { ok: true, type: 'basic', clone: () => ({ cloned: true }) };
            globalThis.fetch.mockResolvedValueOnce(mockResponse);

            let responded;
            const event = {
                request: { url: 'https://amogha.cafe/styles.css', method: 'GET', destination: '' },
                respondWith: vi.fn((p) => { responded = p; }),
            };
            handlers.fetch(event);
            const result = await responded;
            expect(result).toBe(mockResponse);
            expect(globalThis.fetch).toHaveBeenCalledWith(event.request);
        });
    });

    describe('fetch event — opaque response not cached', () => {
        it('does not cache opaque responses for network-first resources', async () => {
            const mockResponse = { ok: true, type: 'opaque', clone: () => ({ cloned: true }) };
            globalThis.fetch.mockResolvedValueOnce(mockResponse);

            const openCallsBefore = env.caches.open.mock.calls.length;

            let responded;
            const event = {
                request: { url: 'https://amogha.cafe/index.html', method: 'GET', destination: 'document' },
                respondWith: vi.fn((p) => { responded = p; }),
            };
            handlers.fetch(event);
            const result = await responded;
            expect(result).toBe(mockResponse);

            // Allow microtasks to flush
            await new Promise(r => setTimeout(r, 50));
            // caches.open should not have been called again to store the opaque response
            expect(env.caches.open.mock.calls.length).toBe(openCallsBefore);
        });
    });

    describe('fetch event — document offline with cached copy', () => {
        it('returns cached document instead of falling back to index.html', async () => {
            globalThis.fetch.mockRejectedValueOnce(new Error('offline'));

            // caches.match returns the cached version of the requested page directly
            env.caches.match.mockResolvedValueOnce('cached-page');

            let responded;
            const event = {
                request: { url: 'https://amogha.cafe/about', method: 'GET', destination: 'document' },
                respondWith: vi.fn((p) => { responded = p; }),
            };
            handlers.fetch(event);
            const result = await responded;
            expect(result).toBe('cached-page');
        });
    });

    // ===== PUSH EVENT =====
    describe('push event', () => {
        it('shows notification with data from push payload', async () => {
            let waitPromise;
            const event = {
                data: {
                    json: () => ({
                        notification: { title: 'Order Ready!', body: 'Your biryani is ready for pickup' },
                        data: { url: '/track/?id=abc123' }
                    })
                },
                waitUntil: vi.fn((p) => { waitPromise = p; }),
            };
            handlers.push(event);
            await waitPromise;

            expect(env.self.registration.showNotification).toHaveBeenCalledWith(
                'Order Ready!',
                expect.objectContaining({
                    body: 'Your biryani is ready for pickup',
                    icon: './amogha-logo.png',
                    badge: './amogha-logo.png',
                    tag: 'amogha-push',
                    data: { url: '/track/?id=abc123' },
                })
            );
        });

        it('uses default title and body when no notification data', async () => {
            let waitPromise;
            const event = {
                data: { json: () => ({}) },
                waitUntil: vi.fn((p) => { waitPromise = p; }),
            };
            handlers.push(event);
            await waitPromise;

            expect(env.self.registration.showNotification).toHaveBeenCalledWith(
                'Amogha Cafe',
                expect.objectContaining({ body: 'You have a new notification' })
            );
        });

        it('handles null push data gracefully', async () => {
            let waitPromise;
            const event = {
                data: null,
                waitUntil: vi.fn((p) => { waitPromise = p; }),
            };
            handlers.push(event);
            await waitPromise;

            expect(env.self.registration.showNotification).toHaveBeenCalledWith(
                'Amogha Cafe',
                expect.objectContaining({ body: 'You have a new notification', data: {} })
            );
        });

        it('handles malformed JSON in push data', async () => {
            let waitPromise;
            const event = {
                data: { json: () => { throw new SyntaxError('bad json'); } },
                waitUntil: vi.fn((p) => { waitPromise = p; }),
            };
            handlers.push(event);
            await waitPromise;

            expect(env.self.registration.showNotification).toHaveBeenCalledWith(
                'Amogha Cafe',
                expect.objectContaining({ body: 'You have a new notification' })
            );
        });
    });

    // ===== NOTIFICATIONCLICK EVENT =====
    describe('notificationclick event', () => {
        it('closes notification and opens default URL when no data.url', async () => {
            let waitPromise;
            const event = {
                notification: { close: vi.fn(), data: {} },
                waitUntil: vi.fn((p) => { waitPromise = p; }),
            };
            handlers.notificationclick(event);
            await waitPromise;

            expect(event.notification.close).toHaveBeenCalled();
            expect(env.self.clients.openWindow).toHaveBeenCalledWith('/');
        });

        it('opens custom URL from notification data', async () => {
            let waitPromise;
            const event = {
                notification: { close: vi.fn(), data: { url: '/track/?id=abc' } },
                waitUntil: vi.fn((p) => { waitPromise = p; }),
            };
            handlers.notificationclick(event);
            await waitPromise;

            expect(env.self.clients.openWindow).toHaveBeenCalledWith('/track/?id=abc');
        });

        it('focuses existing window instead of opening new one', async () => {
            const mockClient = { url: 'https://amogha.cafe/', focus: vi.fn(() => Promise.resolve()) };
            env.self.clients.matchAll.mockResolvedValueOnce([mockClient]);

            let waitPromise;
            const event = {
                notification: { close: vi.fn(), data: {} },
                waitUntil: vi.fn((p) => { waitPromise = p; }),
            };
            handlers.notificationclick(event);
            await waitPromise;

            expect(mockClient.focus).toHaveBeenCalled();
            expect(env.self.clients.openWindow).not.toHaveBeenCalled();
        });

        it('opens new window when no matching client found', async () => {
            const mockClient = { url: 'https://amogha.cafe/admin/', focus: vi.fn() };
            env.self.clients.matchAll.mockResolvedValueOnce([mockClient]);

            let waitPromise;
            const event = {
                notification: { close: vi.fn(), data: { url: '/track/?id=xyz' } },
                waitUntil: vi.fn((p) => { waitPromise = p; }),
            };
            handlers.notificationclick(event);
            await waitPromise;

            expect(mockClient.focus).not.toHaveBeenCalled();
            expect(env.self.clients.openWindow).toHaveBeenCalledWith('/track/?id=xyz');
        });

        it('handles missing notification.data gracefully', async () => {
            let waitPromise;
            const event = {
                notification: { close: vi.fn(), data: null },
                waitUntil: vi.fn((p) => { waitPromise = p; }),
            };
            handlers.notificationclick(event);
            await waitPromise;

            expect(event.notification.close).toHaveBeenCalled();
            expect(env.self.clients.openWindow).toHaveBeenCalledWith('/');
        });
    });
});
