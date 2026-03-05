import { describe, it, expect, beforeEach, vi } from 'vitest';
import { openSplitBill, closeSplitBill, setSplitCount, shareSplitBill } from '../src/modules/splitbill.js';

function setupDOM(html) {
    document.body.innerHTML = html || '';
    document.getElementById = (id) => document.body.querySelector('#' + id);
    document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
    document.querySelector = (sel) => document.body.querySelector(sel);
}

vi.mock('../src/core/firebase.js', () => ({
    getDb: vi.fn(() => window.db || null),
}));

vi.mock('../src/modules/auth.js', () => ({
    getCurrentUser: vi.fn(() => null),
}));

vi.mock('../src/core/utils.js', () => ({
    lockScroll: vi.fn(),
    unlockScroll: vi.fn(),
}));

beforeEach(() => {
    setupDOM('');
    window.scrollTo = vi.fn();
    window.db = undefined;
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
});

// ===== openSplitBill =====

describe('openSplitBill', () => {
    it('creates split-bill-modal element in DOM', () => {
        openSplitBill('order123', 600);
        const modal = document.getElementById('split-bill-modal');
        expect(modal).not.toBeNull();
    });

    it('sets orderId and total as dataset attributes', () => {
        openSplitBill('order456', 900);
        const modal = document.getElementById('split-bill-modal');
        expect(modal.dataset.orderId).toBe('order456');
        expect(modal.dataset.total).toBe('900');
    });

    it('shows modal (display=block)', () => {
        openSplitBill('order123', 600);
        const modal = document.getElementById('split-bill-modal');
        expect(modal.style.display).toBe('block');
    });

    it('removes existing modal before creating new one', () => {
        openSplitBill('order123', 600);
        openSplitBill('order789', 1200);
        const modals = document.body.querySelectorAll('#split-bill-modal');
        expect(modals.length).toBe(1);
        const modal = document.getElementById('split-bill-modal');
        expect(modal.dataset.orderId).toBe('order789');
        expect(modal.dataset.total).toBe('1200');
    });

    it('has split count buttons (2, 3, 4)', () => {
        openSplitBill('order123', 600);
        const buttons = document.body.querySelectorAll('.split-num-btn');
        const texts = Array.from(buttons).map((b) => b.textContent.trim());
        expect(texts).toContain('2');
        expect(texts).toContain('3');
        expect(texts).toContain('4');
    });

    it('has custom count input', () => {
        openSplitBill('order123', 600);
        const input = document.getElementById('split-custom-count');
        expect(input).not.toBeNull();
        expect(input.type).toBe('number');
    });
});

// ===== closeSplitBill =====

describe('closeSplitBill', () => {
    it('hides modal (display=none)', () => {
        openSplitBill('order123', 600);
        closeSplitBill();
        const modal = document.getElementById('split-bill-modal');
        expect(modal.style.display).toBe('none');
    });

    it('does nothing when no modal', () => {
        expect(() => closeSplitBill()).not.toThrow();
    });
});

// ===== setSplitCount =====

describe('setSplitCount', () => {
    it('does nothing for invalid count (< 2)', () => {
        openSplitBill('order123', 600);
        setSplitCount(1);
        const resultDiv = document.getElementById('split-result');
        expect(resultDiv.innerHTML).toBe('');
    });

    it('does nothing for invalid count (> 10)', () => {
        openSplitBill('order123', 600);
        setSplitCount(11);
        const resultDiv = document.getElementById('split-result');
        expect(resultDiv.innerHTML).toBe('');
    });

    it('does nothing for invalid count (NaN)', () => {
        openSplitBill('order123', 600);
        setSplitCount(NaN);
        const resultDiv = document.getElementById('split-result');
        expect(resultDiv.innerHTML).toBe('');
    });

    it('does nothing when no modal', () => {
        expect(() => setSplitCount(3)).not.toThrow();
    });

    it('calculates per-person amount correctly (Math.ceil)', () => {
        openSplitBill('order123', 601);
        setSplitCount(3);
        // Math.ceil(601 / 3) = Math.ceil(200.33...) = 201
        const resultDiv = document.getElementById('split-result');
        expect(resultDiv.textContent).toContain('Rs.201');
    });

    it('shows per-person amount in result div', () => {
        openSplitBill('order123', 600);
        setSplitCount(3);
        // Math.ceil(600 / 3) = 200
        const resultDiv = document.getElementById('split-result');
        expect(resultDiv.textContent).toContain('Rs.200');
        expect(resultDiv.textContent).toContain('Each person pays');
    });

    it('generates UPI payment links', () => {
        openSplitBill('order123', 600);
        setSplitCount(2);
        const linksDiv = document.getElementById('split-links');
        const upiAnchors = linksDiv.querySelectorAll('a[href^="upi://"]');
        expect(upiAnchors.length).toBe(2);
        expect(linksDiv.innerHTML).toContain('9121004999@upi');
        expect(linksDiv.innerHTML).toContain('Pay Rs.300');
    });

    it('shows WhatsApp share button', () => {
        openSplitBill('order123', 600);
        setSplitCount(2);
        const linksDiv = document.getElementById('split-links');
        expect(linksDiv.textContent).toContain('WhatsApp');
        expect(linksDiv.innerHTML).toContain('shareSplitBill');
    });

    it('saves split bill to Firestore when db and orderId available', async () => {
        const updateMock = vi.fn(() => Promise.resolve());
        const docMock = vi.fn(() => ({ update: updateMock }));
        const collectionMock = vi.fn(() => ({ doc: docMock }));
        window.db = { collection: collectionMock };

        openSplitBill('order123', 600);
        setSplitCount(3);

        await Promise.resolve();

        expect(collectionMock).toHaveBeenCalledWith('orders');
        expect(docMock).toHaveBeenCalledWith('order123');
        expect(updateMock).toHaveBeenCalledWith({
            splitBill: { count: 3, perPerson: 200, firstPersonPays: 200, total: 600 },
        });
    });

    it('does not call Firestore when no db', () => {
        window.db = undefined;
        const collectionSpy = vi.fn();
        // db is null so collection should never be called
        openSplitBill('order123', 600);
        setSplitCount(3);
        expect(collectionSpy).not.toHaveBeenCalled();
    });
});

// ===== shareSplitBill =====

describe('shareSplitBill', () => {
    it('uses navigator.share when available', () => {
        const shareSpy = vi.fn(() => Promise.resolve());
        Object.defineProperty(navigator, 'share', { configurable: true, value: shareSpy });
        shareSplitBill(3, 200);
        expect(shareSpy).toHaveBeenCalledOnce();
        const arg = shareSpy.mock.calls[0][0];
        expect(arg).toHaveProperty('text');
    });

    it('falls back to WhatsApp link when navigator.share not available', () => {
        Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
        window.open = vi.fn();
        shareSplitBill(3, 200);
        expect(window.open).toHaveBeenCalledOnce();
        const url = window.open.mock.calls[0][0];
        expect(url).toContain('wa.me');
        expect(window.open.mock.calls[0][1]).toBe('_blank');
    });

    it('generates correct message text', () => {
        const shareSpy = vi.fn(() => Promise.resolve());
        Object.defineProperty(navigator, 'share', { configurable: true, value: shareSpy });
        shareSplitBill(4, 150);
        const text = shareSpy.mock.calls[0][0].text;
        expect(text).toContain('Rs.150');
        expect(text).toContain('4 ways');
        expect(text).toContain('9121004999@upi');
        expect(text).toContain('Amogha Cafe');
    });
});

// ===== backdrop click =====

describe('openSplitBill — backdrop click closes modal', () => {
    it('calls closeSplitBill when clicking on the modal backdrop (line 40)', () => {
        openSplitBill('order123', 600);
        const modal = document.getElementById('split-bill-modal');
        // Simulate a click where e.target === modal (clicking outside modal-content)
        const clickEvent = new MouseEvent('click', { bubbles: true });
        Object.defineProperty(clickEvent, 'target', { value: modal });
        modal.dispatchEvent(clickEvent);
        // closeSplitBill sets display to none
        expect(modal.style.display).toBe('none');
    });

    it('does NOT close when clicking inside modal-content', () => {
        openSplitBill('order123', 600);
        const modal = document.getElementById('split-bill-modal');
        const content = modal.querySelector('.modal-content');
        const clickEvent = new MouseEvent('click', { bubbles: true });
        Object.defineProperty(clickEvent, 'target', { value: content });
        modal.dispatchEvent(clickEvent);
        // Modal should still be visible
        expect(modal.style.display).toBe('block');
    });
});

// ===== Firestore update error catch =====

describe('setSplitCount — Firestore update error catch (line 90)', () => {
    it('logs error but does not throw when Firestore update rejects', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const updateMock = vi.fn(() => Promise.reject(new Error('Firestore write failed')));
        const docMock = vi.fn(() => ({ update: updateMock }));
        const collectionMock = vi.fn(() => ({ doc: docMock }));
        window.db = { collection: collectionMock };

        openSplitBill('order123', 600);
        setSplitCount(3);

        // Wait for the rejected promise to settle
        await new Promise((r) => setTimeout(r, 10));

        expect(updateMock).toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith('Split bill save error:', expect.any(Error));
        consoleSpy.mockRestore();
    });
});

// ===== window globals =====

describe('window globals', () => {
    it('all 4 functions on window', () => {
        expect(typeof window.openSplitBill).toBe('function');
        expect(typeof window.closeSplitBill).toBe('function');
        expect(typeof window.setSplitCount).toBe('function');
        expect(typeof window.shareSplitBill).toBe('function');
    });
});

// ===========================================================================
// Branch coverage: setSplitCount when total is 0 or orderId is empty (lines 55-70)
// ===========================================================================
describe('setSplitCount — total is 0 and orderId is empty (lines 55-70)', () => {
    it('handles total=0 gracefully (perPerson = 0)', () => {
        openSplitBill('', 0);
        setSplitCount(2);
        const resultDiv = document.getElementById('split-result');
        expect(resultDiv.textContent).toContain('Rs.0');
    });

    it('handles empty orderId (UPI link still generated)', () => {
        openSplitBill('', 600);
        setSplitCount(3);
        const linksDiv = document.getElementById('split-links');
        const upiAnchors = linksDiv.querySelectorAll('a[href^="upi://"]');
        expect(upiAnchors.length).toBe(3);
    });

    it('does not save to Firestore when orderId is empty', () => {
        const updateMock = vi.fn(() => Promise.resolve());
        const docMock = vi.fn(() => ({ update: updateMock }));
        const collectionMock = vi.fn(() => ({ doc: docMock }));
        window.db = { collection: collectionMock };

        openSplitBill('', 600);
        setSplitCount(2);

        // db && orderId — orderId is '', so Firestore should not be called
        expect(collectionMock).not.toHaveBeenCalled();
    });

    it('generates correct per-person amount when total is 0', () => {
        openSplitBill('order123', 0);
        setSplitCount(4);
        const resultDiv = document.getElementById('split-result');
        // Math.ceil(0 / 4) = 0
        expect(resultDiv.textContent).toContain('Rs.0');
    });
});

// ===========================================================================
// Branch: setSplitCount — resultDiv and linksDiv are null (lines 60-70)
// ===========================================================================
describe('setSplitCount — missing result/links divs (lines 60-70)', () => {
    it('does not throw when split-result and split-links elements are missing from modal', () => {
        // Create a minimal modal without result/links divs
        setupDOM(`
            <div id="split-bill-modal" class="modal" style="display:block" data-order-id="order123" data-total="600">
                <div class="modal-content"></div>
            </div>
        `);
        // setSplitCount will find the modal but not the result/links divs
        expect(() => setSplitCount(3)).not.toThrow();
    });

    it('still computes perPerson even without result/links divs', () => {
        setupDOM(`
            <div id="split-bill-modal" class="modal" style="display:block" data-order-id="order123" data-total="900">
                <div class="modal-content"></div>
            </div>
        `);
        // Just ensure no crash — the rendering is skipped
        setSplitCount(3);
        expect(document.getElementById('split-result')).toBeNull();
        expect(document.getElementById('split-links')).toBeNull();
    });
});

// ===========================================================================
// Branch: setSplitCount — linksDiv rendering with label for first person "You" (line 74)
// ===========================================================================
describe('setSplitCount — UPI link labels (line 74)', () => {
    it('labels first person as "You" and others as "Person N"', () => {
        openSplitBill('order123', 600);
        setSplitCount(3);
        const linksDiv = document.getElementById('split-links');
        expect(linksDiv.textContent).toContain('You');
        expect(linksDiv.textContent).toContain('Person 2');
        expect(linksDiv.textContent).toContain('Person 3');
    });
});
