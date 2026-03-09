// ===== FIREBASE.JS REAL IMPLEMENTATION TESTS =====
// Tests the actual getDb() and getFieldValue() logic (not mocked)
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Import the REAL module (no vi.mock)
import { getDb, getFieldValue } from '../src/core/firebase.js';

describe('getDb — real implementation', () => {
    let originalDb;

    beforeEach(() => {
        originalDb = window.db;
    });

    afterEach(() => {
        window.db = originalDb;
    });

    it('returns window.db when it is set', () => {
        const fakeDb = { collection: () => {} };
        window.db = fakeDb;
        expect(getDb()).toBe(fakeDb);
    });

    it('returns undefined when window.db is not set', () => {
        window.db = undefined;
        expect(getDb()).toBeUndefined();
    });

    it('returns null when window.db is null', () => {
        window.db = null;
        expect(getDb()).toBeNull();
    });
});

describe('getFieldValue — real implementation', () => {
    let originalFirebase;

    beforeEach(() => {
        originalFirebase = window.firebase;
    });

    afterEach(() => {
        window.firebase = originalFirebase;
    });

    it('returns FieldValue when full firebase object exists', () => {
        const mockFieldValue = { increment: () => {}, serverTimestamp: () => {} };
        window.firebase = { firestore: { FieldValue: mockFieldValue } };
        expect(getFieldValue()).toBe(mockFieldValue);
    });

    it('returns null when window.firebase is undefined', () => {
        window.firebase = undefined;
        expect(getFieldValue()).toBeNull();
    });

    it('returns null when window.firebase is null', () => {
        window.firebase = null;
        expect(getFieldValue()).toBeNull();
    });

    it('returns null when firebase.firestore is undefined', () => {
        window.firebase = {};
        expect(getFieldValue()).toBeNull();
    });

    it('returns null when firebase.firestore.FieldValue is undefined', () => {
        window.firebase = { firestore: {} };
        expect(getFieldValue()).toBeNull();
    });

    it('returns null when firebase exists but firestore is null', () => {
        window.firebase = { firestore: null };
        expect(getFieldValue()).toBeNull();
    });
});
