// ===== VITEST TEST SETUP =====

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
});
