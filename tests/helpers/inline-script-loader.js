// ===== HELPER: Load inline <script> from HTML files for testing =====
// Extracts the main script block, wraps functions to be testable,
// and evaluates in a controlled environment with mocked globals.

import { vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Extracts the last (main) inline <script> block from an HTML file.
 * Strips firebase.initializeApp() and var db = firebase.firestore() calls,
 * replacing them with the provided mock db.
 */
export function extractScript(htmlPath) {
    const html = readFileSync(resolve(htmlPath), 'utf-8');
    // Find all script blocks that don't have src attributes
    const scriptRegex = /<script(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    let lastScript = '';
    while ((match = scriptRegex.exec(html)) !== null) {
        if (match[1].trim().length > 100) { // Skip tiny inline scripts
            lastScript = match[1];
        }
    }
    return lastScript;
}

/**
 * Creates a sandboxed environment with mocked globals and evaluates the script.
 * Returns an object with all functions defined in the script.
 */
export function loadInlineScript(htmlPath, extraGlobals = {}) {
    let script = extractScript(htmlPath);

    // Remove Firebase init (we mock db)
    script = script.replace(/firebase\.initializeApp\(\{[\s\S]*?\}\);/g, '');
    script = script.replace(/var\s+db\s*=\s*firebase\.firestore\(\);?/g, '');

    // Mock globals
    const mockDocRef = {
        get: vi.fn(() => Promise.resolve({ exists: false, data: () => ({}) })),
        set: vi.fn(() => Promise.resolve()),
        update: vi.fn(() => Promise.resolve()),
        delete: vi.fn(() => Promise.resolve()),
        onSnapshot: vi.fn((cb) => { cb({ exists: true, data: () => ({}) }); return vi.fn(); }),
    };

    const mockCollection = {
        doc: vi.fn(() => ({ ...mockDocRef })),
        add: vi.fn(() => Promise.resolve({ id: 'mock-id-123' })),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        get: vi.fn(() => Promise.resolve({ docs: [], forEach: vi.fn(), empty: true, size: 0 })),
        onSnapshot: vi.fn((cb) => { cb({ docs: [], forEach: vi.fn(), docChanges: () => [] }); return vi.fn(); }),
    };

    const mockDb = {
        collection: vi.fn(() => ({ ...mockCollection })),
        batch: vi.fn(() => ({
            set: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            commit: vi.fn(() => Promise.resolve()),
        })),
    };

    const mockFirebase = {
        initializeApp: vi.fn(),
        firestore: vi.fn(() => mockDb),
    };
    mockFirebase.firestore.FieldValue = {
        increment: vi.fn((n) => ({ _inc: n })),
        delete: vi.fn(() => ({ _delete: true })),
        serverTimestamp: vi.fn(() => ({ _serverTimestamp: true })),
    };

    // Build the evaluation context
    const context = {
        db: mockDb,
        firebase: mockFirebase,
        document: globalThis.document,
        window: globalThis.window,
        localStorage: globalThis.localStorage,
        sessionStorage: globalThis.localStorage, // reuse mock
        console: globalThis.console,
        setTimeout: globalThis.setTimeout,
        setInterval: globalThis.setInterval,
        clearTimeout: globalThis.clearTimeout,
        clearInterval: globalThis.clearInterval,
        fetch: vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })),
        alert: vi.fn(),
        confirm: vi.fn(() => true),
        prompt: vi.fn(() => ''),
        XMLHttpRequest: vi.fn().mockImplementation(() => ({
            open: vi.fn(),
            send: vi.fn(),
            setRequestHeader: vi.fn(),
            upload: { onprogress: null },
            onload: null,
            onerror: null,
        })),
        FormData: vi.fn().mockImplementation(() => ({ append: vi.fn() })),
        URL: globalThis.URL,
        Blob: globalThis.Blob || vi.fn(),
        navigator: globalThis.navigator || { clipboard: { writeText: vi.fn() }, vibrate: vi.fn() },
        location: globalThis.location || { origin: 'https://amogha.cafe', pathname: '/', search: '', href: '' },
        history: { pushState: vi.fn(), replaceState: vi.fn() },
        encodeURIComponent: globalThis.encodeURIComponent,
        decodeURIComponent: globalThis.decodeURIComponent,
        parseInt: globalThis.parseInt,
        parseFloat: globalThis.parseFloat,
        isNaN: globalThis.isNaN,
        Math: globalThis.Math,
        Date: globalThis.Date,
        JSON: globalThis.JSON,
        Array: globalThis.Array,
        Object: globalThis.Object,
        String: globalThis.String,
        Number: globalThis.Number,
        Promise: globalThis.Promise,
        Map: globalThis.Map,
        Set: globalThis.Set,
        Error: globalThis.Error,
        RegExp: globalThis.RegExp,
        Symbol: globalThis.Symbol,
        SpeechSynthesisUtterance: vi.fn().mockImplementation(() => ({})),
        speechSynthesis: { speak: vi.fn(), cancel: vi.fn() },
        AudioContext: vi.fn().mockImplementation(() => ({
            createOscillator: vi.fn(() => ({
                type: '', frequency: { value: 0 }, connect: vi.fn(), start: vi.fn(), stop: vi.fn(),
            })),
            createGain: vi.fn(() => ({
                gain: { value: 1, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
                connect: vi.fn(),
            })),
            destination: {},
            currentTime: 0,
        })),
        webkitAudioContext: undefined,
        IntersectionObserver: globalThis.IntersectionObserver,
        requestAnimationFrame: globalThis.requestAnimationFrame || ((cb) => setTimeout(cb, 16)),
        cancelAnimationFrame: globalThis.cancelAnimationFrame || clearTimeout,
        Chart: vi.fn().mockImplementation(() => ({ destroy: vi.fn(), update: vi.fn() })),
        ...extraGlobals,
    };

    // Wrap the script to capture all function declarations
    const wrappedScript = `
        (function(ctx) {
            with(ctx) {
                var db = ctx.db;
                var firebase = ctx.firebase;
                ${script}
                // Collect all function declarations into an object
                var __exports = {};
                ${extractFunctionNames(script).map(n => `try { __exports['${n}'] = ${n}; } catch(e) {}`).join('\n')}
                return __exports;
            }
        })
    `;

    try {
        const factory = eval(wrappedScript);
        const exports = factory(context);
        exports.__mockDb = mockDb;
        exports.__mockCollection = mockCollection;
        exports.__context = context;
        return exports;
    } catch (e) {
        console.error('Failed to load inline script from', htmlPath, e.message);
        return { __mockDb: mockDb, __mockCollection: mockCollection, __context: context, __error: e };
    }
}

/**
 * Extracts function names from script text.
 */
function extractFunctionNames(script) {
    const names = new Set();
    const regex = /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
    let match;
    while ((match = regex.exec(script)) !== null) {
        names.add(match[1]);
    }
    return Array.from(names);
}
