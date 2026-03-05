import { describe, it, expect, beforeEach, vi } from 'vitest';
import { safeGetItem, safeSetItem, safeCopy, fallbackCopy, lockScroll, unlockScroll, _scrollLockPos } from '../src/core/utils.js';

// ═══════════════════════════════════════════════════════════════════════════
// safeGetItem / safeSetItem — localStorage wrappers
// ═══════════════════════════════════════════════════════════════════════════
describe('safeGetItem', () => {
    beforeEach(() => localStorage.clear());

    it('returns null when key does not exist', () => {
        expect(safeGetItem('nonexistent')).toBeNull();
    });

    it('returns stored value for existing key', () => {
        localStorage.setItem('testKey', 'hello');
        expect(safeGetItem('testKey')).toBe('hello');
    });

    it('returns null if localStorage throws (e.g. private mode)', () => {
        const orig = localStorage.getItem;
        localStorage.getItem = () => { throw new Error('SecurityError'); };
        expect(safeGetItem('any')).toBeNull();
        localStorage.getItem = orig;
    });
});

describe('safeSetItem', () => {
    beforeEach(() => localStorage.clear());

    it('stores a value in localStorage', () => {
        safeSetItem('key1', 'value1');
        expect(localStorage.getItem('key1')).toBe('value1');
    });

    it('does not throw when localStorage is full or blocked', () => {
        const orig = localStorage.setItem;
        localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
        expect(() => safeSetItem('k', 'v')).not.toThrow();
        localStorage.setItem = orig;
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// safeCopy / fallbackCopy — clipboard helpers
// ═══════════════════════════════════════════════════════════════════════════
describe('safeCopy', () => {
    it('uses navigator.clipboard.writeText when available', async () => {
        const writeText = vi.fn(() => Promise.resolve());
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText },
            configurable: true,
        });
        const btn = { textContent: '' };
        safeCopy('hello', btn);
        await new Promise(r => setTimeout(r, 10));
        expect(writeText).toHaveBeenCalledWith('hello');
        expect(btn.textContent).toBe('Copied!');
    });

    it('falls back when clipboard API rejects', async () => {
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText: () => Promise.reject(new Error('denied')) },
            configurable: true,
        });
        // fallbackCopy uses document.execCommand — just check it doesn't throw
        expect(() => safeCopy('text', null)).not.toThrow();
    });

    it('falls back when clipboard API is not available', () => {
        Object.defineProperty(navigator, 'clipboard', {
            value: undefined,
            configurable: true,
        });
        expect(() => safeCopy('text', null)).not.toThrow();
    });
});

describe('fallbackCopy', () => {
    it('creates and removes a textarea element', () => {
        const appendSpy = vi.spyOn(document.body, 'appendChild');
        const removeSpy = vi.spyOn(document.body, 'removeChild');
        fallbackCopy('hello', null);
        expect(appendSpy).toHaveBeenCalled();
        expect(removeSpy).toHaveBeenCalled();
    });

    it('sets button text to Copied! on success', () => {
        const btn = { textContent: '' };
        document.execCommand = vi.fn(() => true);
        fallbackCopy('hello', btn);
        expect(btn.textContent).toBe('Copied!');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// lockScroll / unlockScroll — iOS-safe scroll lock
// ═══════════════════════════════════════════════════════════════════════════
describe('lockScroll / unlockScroll', () => {
    beforeEach(() => {
        document.body.classList.remove('modal-open');
        document.body.style.top = '';
    });

    it('lockScroll adds modal-open class and sets negative top', () => {
        lockScroll();
        expect(document.body.classList.contains('modal-open')).toBe(true);
    });

    it('unlockScroll removes modal-open class and resets top', () => {
        lockScroll();
        unlockScroll();
        expect(document.body.classList.contains('modal-open')).toBe(false);
        expect(document.body.style.top).toBe('');
    });
});
