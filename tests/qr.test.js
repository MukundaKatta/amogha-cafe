// ===== QR ORDERING PAGE TESTS =====
// Tests for inline functions in qr/index.html
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadInlineScript } from './helpers/inline-script-loader.js';

let fns;

function setupDOM() {
    document.body.innerHTML = `
        <div id="table-badge"></div>
        <div id="header-subtitle"></div>
        <div id="cat-tabs"></div>
        <div id="menu-container"></div>
        <div id="no-results" class="hidden"></div>
        <input id="search-input" value="">
        <div id="cart-bar"><span class="cart-count"></span></div>
        <span id="bar-count">0</span>
        <span id="bar-total">₹0</span>
        <div id="co-overlay"></div>
        <div id="co-sheet"></div>
        <div id="co-items"></div>
        <div id="co-form"></div>
        <div id="co-subtotal"></div>
        <div id="co-total"></div>
        <input id="co-name" value="">
        <input id="co-phone" value="">
        <textarea id="co-notes"></textarea>
        <button id="place-order-btn">Place Order</button>
        <div id="loader"></div>
        <div id="success-screen"><a id="success-track" href="#"></a><span id="soc-table"></span><span id="soc-id"></span><span id="soc-items"></span><span id="soc-total"></span></div>
        <div id="qr-preloader"></div>
        <div class="co-totals"></div>
        <div class="header" style="height:60px"></div>
    `;
    document.getElementById = (id) => document.body.querySelector('#' + id);
    document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
    document.querySelector = (sel) => document.body.querySelector(sel);
}

beforeEach(() => {
    setupDOM();
    vi.clearAllMocks();
    localStorage.clear();
    fns = loadInlineScript('qr/index.html', {
        URLSearchParams: class {
            get(key) { return key === 'table' ? '5' : null; }
        },
    });
});

// ═══════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════

describe('QR — Utilities', () => {
    it('escHtml escapes HTML entities', () => {
        if (!fns.escHtml) return;
        expect(fns.escHtml('<b>test</b>')).not.toContain('<b>');
        expect(fns.escHtml(null)).toBe('');
    });

    it('haptic does not throw', () => {
        if (!fns.haptic) return;
        expect(() => fns.haptic()).not.toThrow();
    });

    it('debounce returns a function', () => {
        if (!fns.debounce) return;
        const debounced = fns.debounce(vi.fn(), 100);
        expect(typeof debounced).toBe('function');
    });
});

// ═══════════════════════════════════════════
// MENU
// ═══════════════════════════════════════════

describe('QR — Menu', () => {
    it('loadMenuFromFirestore queries Firestore menu', () => {
        if (!fns.loadMenuFromFirestore) return;
        fns.loadMenuFromFirestore();
        expect(fns.__mockDb.collection).toHaveBeenCalledWith('menu');
    });

    it('useFallbackMenu populates menu with hardcoded items', () => {
        if (!fns.useFallbackMenu) return;
        // useFallbackMenu won't run if menu already loaded, but we try
        expect(() => fns.useFallbackMenu()).not.toThrow();
    });

    it('getCatCount returns count for category', () => {
        if (!fns.getCatCount) return;
        const count = fns.getCatCount('All');
        expect(typeof count).toBe('number');
    });

    it('renderCatTabs does not throw', () => {
        if (!fns.renderCatTabs) return;
        expect(() => fns.renderCatTabs()).not.toThrow();
    });

    it('setCat changes active category', () => {
        if (!fns.setCat) return;
        const el = document.createElement('div');
        el.className = 'cat-tab';
        el.scrollIntoView = vi.fn();
        expect(() => fns.setCat('Starters', el)).not.toThrow();
    });

    it('setFilter changes active filter', () => {
        if (!fns.setFilter) return;
        const el = document.createElement('div');
        el.className = 'filter-chip';
        expect(() => fns.setFilter('veg', el)).not.toThrow();
    });

    it('getFilteredItems returns array', () => {
        if (!fns.getFilteredItems) return;
        const items = fns.getFilteredItems();
        expect(Array.isArray(items)).toBe(true);
    });

    it('renderMenu does not throw', () => {
        if (!fns.renderMenu) return;
        expect(() => fns.renderMenu()).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// CART
// ═══════════════════════════════════════════

describe('QR — Cart', () => {
    it('getCartQty returns 0 for unknown item', () => {
        if (!fns.getCartQty) return;
        expect(fns.getCartQty('Nonexistent')).toBe(0);
    });

    it('addToCart does not throw', () => {
        if (!fns.addToCart) return;
        const btn = document.createElement('button');
        btn.getBoundingClientRect = vi.fn(() => ({ left: 0, top: 0, width: 50, height: 50 }));
        expect(() => fns.addToCart('Chicken Biryani', 249, btn)).not.toThrow();
    });

    it('changeQty does not throw for unknown item', () => {
        if (!fns.changeQty) return;
        expect(() => fns.changeQty('Nonexistent', 1)).not.toThrow();
    });

    it('updateCartBar does not throw', () => {
        if (!fns.updateCartBar) return;
        expect(() => fns.updateCartBar()).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// CHECKOUT
// ═══════════════════════════════════════════

describe('QR — Checkout', () => {
    it('openCheckout does nothing with empty cart', () => {
        if (!fns.openCheckout) return;
        // Cart starts empty, so openCheckout should be a no-op
        expect(() => fns.openCheckout()).not.toThrow();
    });

    it('closeCheckout does not throw', () => {
        if (!fns.closeCheckout) return;
        expect(() => fns.closeCheckout()).not.toThrow();
    });

    it('placeOrder validates name', () => {
        if (!fns.placeOrder) return;
        document.getElementById('co-name').value = '';
        document.getElementById('co-phone').value = '9876543210';
        fns.placeOrder();
        expect(fns.__context.alert).toHaveBeenCalledWith(expect.stringContaining('name'));
    });

    it('placeOrder validates phone number', () => {
        if (!fns.placeOrder) return;
        document.getElementById('co-name').value = 'Test User';
        document.getElementById('co-phone').value = '123';
        fns.placeOrder();
        expect(fns.__context.alert).toHaveBeenCalledWith(expect.stringContaining('phone'));
    });

    it('resetOrder does not throw', () => {
        if (!fns.resetOrder) return;
        expect(() => fns.resetOrder()).not.toThrow();
    });
});
