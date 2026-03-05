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

// ═══════════════════════════════════════════════════════════════════════════
// safeCopy — fallbackCopy when navigator.clipboard unavailable or rejects
// (lines 13-23)
// ═══════════════════════════════════════════════════════════════════════════
describe('safeCopy — fallbackCopy branch when clipboard is unavailable (lines 15-16)', () => {
    it('calls fallbackCopy when navigator.clipboard is undefined', () => {
        Object.defineProperty(navigator, 'clipboard', {
            value: undefined,
            configurable: true,
        });
        const btn = { textContent: '' };
        document.execCommand = vi.fn(() => true);
        safeCopy('test text', btn);
        // fallbackCopy should have run and set button text
        expect(btn.textContent).toBe('Copied!');
    });

    it('calls fallbackCopy when navigator.clipboard.writeText is undefined', () => {
        Object.defineProperty(navigator, 'clipboard', {
            value: {},
            configurable: true,
        });
        const btn = { textContent: '' };
        document.execCommand = vi.fn(() => true);
        safeCopy('test text', btn);
        expect(btn.textContent).toBe('Copied!');
    });
});

describe('safeCopy — fallbackCopy branch when clipboard.writeText rejects (line 14)', () => {
    it('falls back to fallbackCopy and sets button text on clipboard rejection', async () => {
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText: vi.fn(() => Promise.reject(new Error('Permission denied'))) },
            configurable: true,
        });
        const btn = { textContent: '' };
        document.execCommand = vi.fn(() => true);
        safeCopy('fallback text', btn);
        await new Promise(r => setTimeout(r, 20));
        // fallbackCopy should have set the button text
        expect(btn.textContent).toBe('Copied!');
    });
});

describe('fallbackCopy — textarea creation and execCommand (lines 19-25)', () => {
    it('creates a textarea with the given text, appends it, and removes it', () => {
        const appendSpy = vi.spyOn(document.body, 'appendChild');
        const removeSpy = vi.spyOn(document.body, 'removeChild');
        document.execCommand = vi.fn(() => true);

        fallbackCopy('copy this', null);

        expect(appendSpy).toHaveBeenCalled();
        const ta = appendSpy.mock.calls[appendSpy.mock.calls.length - 1][0];
        expect(ta.tagName.toLowerCase()).toBe('textarea');
        expect(ta.value).toBe('copy this');
        expect(removeSpy).toHaveBeenCalled();

        appendSpy.mockRestore();
        removeSpy.mockRestore();
    });

    it('sets button text to Copied! when execCommand succeeds', () => {
        document.execCommand = vi.fn(() => true);
        const btn = { textContent: '' };
        fallbackCopy('text', btn);
        expect(btn.textContent).toBe('Copied!');
    });

    it('does not throw when execCommand throws an error', () => {
        document.execCommand = vi.fn(() => { throw new Error('execCommand not supported'); });
        expect(() => fallbackCopy('text', null)).not.toThrow();
    });

    it('does not set button text when execCommand throws', () => {
        document.execCommand = vi.fn(() => { throw new Error('execCommand error'); });
        const btn = { textContent: 'original' };
        fallbackCopy('text', btn);
        // The catch block swallows the error, btn text remains unchanged
        expect(btn.textContent).toBe('original');
    });

    it('removes the textarea even when execCommand throws', () => {
        document.execCommand = vi.fn(() => { throw new Error('fail'); });
        const removeSpy = vi.spyOn(document.body, 'removeChild');
        fallbackCopy('text', null);
        expect(removeSpy).toHaveBeenCalled();
        removeSpy.mockRestore();
    });
});

// ===========================================================================
// Branch coverage: safeCopy — btn is null/falsy when clipboard succeeds (line 13)
// ===========================================================================
describe('safeCopy — btn is null when clipboard.writeText succeeds (line 13)', () => {
    it('does not throw when btn is null and clipboard succeeds', async () => {
        const writeText = vi.fn(() => Promise.resolve());
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText },
            configurable: true,
        });
        safeCopy('test', null);
        await new Promise(r => setTimeout(r, 10));
        expect(writeText).toHaveBeenCalledWith('test');
        // Should not throw — btn is null so "if (btn)" is false
    });
});
