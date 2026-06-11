// ===== VITEST TEST SETUP =====

import { createHash } from 'node:crypto';

// Make crypto.subtle.digest resolve on the microtask queue instead of the
// libuv threadpool. Production hashPin() awaits crypto.subtle.digest(), which
// is real async work — under vi.useFakeTimers() the only way to flush it is by
// guessing how many microtask cycles it needs. That guess is machine-speed
// dependent: it passes locally but the digest can take >50ms on slower CI
// runners, leaving the awaited signup/signin chain unresolved (8 timeouts) and
// the post-signup referral setTimeout never scheduled (refSpy 0 calls).
//
// We swap in a synchronous SHA-256 (Node's createHash) wrapped in
// Promise.resolve, so the digest settles deterministically on the next
// microtask flush. The hash VALUE is still real SHA-256, so cross-call matching
// (sign up then sign in with the same PIN) behaves exactly as in production.
if (globalThis.crypto && globalThis.crypto.subtle && globalThis.crypto.subtle.digest) {
    const _origDigest = globalThis.crypto.subtle.digest.bind(globalThis.crypto.subtle);
    globalThis.crypto.subtle.digest = (algorithm, data) => {
        const name = typeof algorithm === 'string' ? algorithm : (algorithm && algorithm.name);
        if (name === 'SHA-256') {
            const view = ArrayBuffer.isView(data) ? Buffer.from(data.buffer, data.byteOffset, data.byteLength) : Buffer.from(data);
            const out = createHash('sha256').update(view).digest();
            return Promise.resolve(out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength));
        }
        return _origDigest(algorithm, data);
    };
}

// Mock localStorage with in-memory store
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: (k) => store[k] ?? null,
        setItem: (k, v) => { store[k] = String(v); },
        removeItem: (k) => { delete store[k]; },
        clear: () => { store = {}; },
    };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

// Mock window.db (Firestore compat SDK)
const mockDocRef = {
    get: vi.fn(() => Promise.resolve({ exists: false, data: () => ({}) })),
    set: vi.fn(() => Promise.resolve()),
    update: vi.fn(() => Promise.resolve()),
    ref: { update: vi.fn(() => Promise.resolve()) },
};

const mockCollection = {
    doc: vi.fn(() => mockDocRef),
    add: vi.fn(() => Promise.resolve({ id: 'test-id-123' })),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: vi.fn(() => Promise.resolve({ docs: [], forEach: vi.fn() })),
    onSnapshot: vi.fn((cb) => { cb({ docs: [], docChanges: () => [] }); return vi.fn(); }),
};

globalThis.window = globalThis.window || {};
globalThis.db = {
    collection: vi.fn(() => ({ ...mockCollection })),
};
globalThis.window.db = globalThis.db;

// Browser API mocks used across modules
if (!globalThis.window.scrollTo) {
    globalThis.window.scrollTo = vi.fn();
} else {
    globalThis.window.scrollTo = vi.fn(globalThis.window.scrollTo);
}

if (!globalThis.window.requestAnimationFrame) {
    globalThis.window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16);
}

if (typeof globalThis.IntersectionObserver === 'undefined') {
    globalThis.IntersectionObserver = class {
        constructor(cb) {
            this._cb = cb;
        }
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() { return []; }
    };
}

// Suppress DOM errors in tests (many functions touch the DOM)
globalThis.document.getElementById = vi.fn(() => null);
globalThis.document.querySelectorAll = vi.fn(() => []);
globalThis.document.querySelector = vi.fn(() => null);

// Reset mocks between tests
beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    // Re-apply db mock after clearAllMocks (which resets fn implementations)
    globalThis.db = {
        collection: vi.fn(() => ({ ...mockCollection })),
    };
    globalThis.window.db = globalThis.db;
    globalThis.window.scrollTo = vi.fn();
});
