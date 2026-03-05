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

// ===== window globals =====

describe('window globals', () => {
    it('all 4 functions on window', () => {
        expect(typeof window.openSplitBill).toBe('function');
        expect(typeof window.closeSplitBill).toBe('function');
        expect(typeof window.setSplitCount).toBe('function');
        expect(typeof window.shareSplitBill).toBe('function');
    });
});
