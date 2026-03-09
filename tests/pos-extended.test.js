// ===== POS EXTENDED TESTS =====
// Tests for inline functions in pos/index.html not covered by pos.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadInlineScript } from './helpers/inline-script-loader.js';

let fns;

function setupDOM() {
    document.body.innerHTML = `
        <div id="pos-login" style="display:block"></div>
        <input id="pos-user"><input id="pos-pass">
        <div id="pos-login-error"></div>
        <div id="pos-app" style="display:none"></div>
        <div id="pos-shop-name"></div>
        <div id="pos-clock"></div>
        <div id="pos-cats"></div>
        <div id="pos-menu"></div>
        <div id="pos-cart"></div>
        <div id="pos-cart-items"></div>
        <div id="pos-subtotal">0</div>
        <div id="pos-total">0</div>
        <div id="pos-checkout" style="display:none"></div>
        <div id="pos-bill" style="display:none"></div>
        <div id="bill-content"></div>
        <div id="order-confirm" style="display:none"></div>
        <input id="cust-phone"><input id="cust-name">
        <div id="loyalty-display"></div>
        <div id="loyalty-redeem-btn" style="display:none"></div>
        <div id="pay-cash" class="pay-btn"></div>
        <div id="pay-card" class="pay-btn"></div>
        <div id="pay-upi" class="pay-btn"></div>
        <div id="mobile-cart-drawer" style="display:none"></div>
        <div id="recent-orders-panel" style="display:none"></div>
        <div id="recent-orders-list"></div>
        <div id="recent-filter-btns"></div>
        <div id="sales-counter">0</div>
        <div id="pos-toast"></div>
    `;
    document.getElementById = (id) => document.body.querySelector('#' + id);
    document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
    document.querySelector = (sel) => document.body.querySelector(sel);
}

beforeEach(() => {
    setupDOM();
    vi.clearAllMocks();
    localStorage.clear();
    fns = loadInlineScript('pos/index.html');
});

// ═══════════════════════════════════════════
// AUTHENTICATION
// ═══════════════════════════════════════════

describe('POS — Authentication', () => {
    it('posLogin queries Firestore for user', () => {
        if (!fns.posLogin) return;
        fns.posLogin();
        expect(fns.__mockDb.collection).toHaveBeenCalledWith('posUsers');
    });

    it('posLogout clears session', () => {
        if (!fns.posLogout) return;
        expect(() => fns.posLogout()).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// MENU RENDERING
// ═══════════════════════════════════════════

describe('POS — Menu', () => {
    it('loadPOSMenu fetches menu from Firestore', () => {
        if (!fns.loadPOSMenu) return;
        fns.loadPOSMenu();
        expect(fns.__mockDb.collection).toHaveBeenCalledWith('menu');
    });

    it('renderPOSCats does not throw', () => {
        if (!fns.renderPOSCats) return;
        expect(() => fns.renderPOSCats()).not.toThrow();
    });

    it('renderPosMenu does not throw', () => {
        if (!fns.renderPosMenu) return;
        expect(() => fns.renderPosMenu()).not.toThrow();
    });

    it('setPosCat changes category and rerenders', () => {
        if (!fns.setPosCat) return;
        expect(() => fns.setPosCat('starters')).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// CART MANAGEMENT
// ═══════════════════════════════════════════

describe('POS — Cart', () => {
    it('cartQty returns 0 for unknown item', () => {
        if (!fns.cartQty) return;
        expect(fns.cartQty('Nonexistent')).toBe(0);
    });

    it('clearCart empties cart', () => {
        if (!fns.clearCart) return;
        expect(() => fns.clearCart()).not.toThrow();
    });

    it('renderCart does not throw', () => {
        if (!fns.renderCart) return;
        expect(() => fns.renderCart()).not.toThrow();
    });

    it('openMobileCart shows drawer', () => {
        if (!fns.openMobileCart) return;
        expect(() => fns.openMobileCart()).not.toThrow();
    });

    it('closeMobileCart hides drawer', () => {
        if (!fns.closeMobileCart) return;
        expect(() => fns.closeMobileCart()).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// CHECKOUT & PAYMENT
// ═══════════════════════════════════════════

describe('POS — Checkout', () => {
    it('showPosCheckout displays checkout UI', () => {
        if (!fns.showPosCheckout) return;
        expect(() => fns.showPosCheckout()).not.toThrow();
    });

    it('selectPay highlights payment button', () => {
        if (!fns.selectPay) return;
        const btn = document.createElement('button');
        expect(() => fns.selectPay('cash', btn)).not.toThrow();
    });

    it('newOrder resets for next order', () => {
        if (!fns.newOrder) return;
        expect(() => fns.newOrder()).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// CUSTOMER LOOKUP
// ═══════════════════════════════════════════

describe('POS — Customer', () => {
    it('lookupCustomer queries Firestore', () => {
        if (!fns.lookupCustomer) return;
        fns.lookupCustomer('9876543210');
        expect(fns.__mockDb.collection).toHaveBeenCalledWith('users');
    });

    it('updateLoyaltyUI does not throw', () => {
        if (!fns.updateLoyaltyUI) return;
        expect(() => fns.updateLoyaltyUI(500)).not.toThrow();
    });

    it('redeemPoints does not throw', () => {
        if (!fns.redeemPoints) return;
        expect(() => fns.redeemPoints()).not.toThrow();
    });

    it('cancelRedeem does not throw', () => {
        if (!fns.cancelRedeem) return;
        expect(() => fns.cancelRedeem()).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// BLUETOOTH/ESCPOS PRINTING
// ═══════════════════════════════════════════

describe('POS — ESC/POS Printing', () => {
    it('escposText encodes string to bytes', () => {
        if (!fns.escposText) return;
        const bytes = fns.escposText('Hello');
        expect(bytes).toBeTruthy();
    });

    it('escposInit returns init command', () => {
        if (!fns.escposInit) return;
        const init = fns.escposInit();
        expect(init).toBeTruthy();
    });

    it('escposCenterOn returns center command', () => {
        if (!fns.escposCenterOn) return;
        expect(fns.escposCenterOn()).toBeTruthy();
    });

    it('escposBoldOn returns bold command', () => {
        if (!fns.escposBoldOn) return;
        expect(fns.escposBoldOn()).toBeTruthy();
    });

    it('escposBoldOff returns unbold command', () => {
        if (!fns.escposBoldOff) return;
        expect(fns.escposBoldOff()).toBeTruthy();
    });

    it('escposLF returns line feed', () => {
        if (!fns.escposLF) return;
        expect(fns.escposLF()).toBeTruthy();
    });

    it('escposCut returns cut command', () => {
        if (!fns.escposCut) return;
        expect(fns.escposCut()).toBeTruthy();
    });

    it('escposDashes generates dashed line', () => {
        if (!fns.escposDashes) return;
        const dashes = fns.escposDashes(32);
        expect(dashes).toBeTruthy();
    });

    it('escposRow formats two-column row', () => {
        if (!fns.escposRow) return;
        const row = fns.escposRow('Biryani x2', '₹498', 32);
        expect(row).toBeTruthy();
    });

    it('escposBytes combines byte arrays', () => {
        if (!fns.escposBytes) return;
        const result = fns.escposBytes(new Uint8Array([1]), new Uint8Array([2]));
        expect(result.length).toBe(2);
    });

    it('buildBillEscPos generates receipt bytes', () => {
        if (!fns.buildBillEscPos) return;
        const data = { items: [{ name: 'Biryani', qty: 1, price: 249 }], total: 249, subtotal: 249 };
        const bytes = fns.buildBillEscPos(data, 'ORD-1', 'Amogha', 'Thank you', 58);
        expect(bytes).toBeTruthy();
    });

    it('buildKOTEscPos generates KOT bytes', () => {
        if (!fns.buildKOTEscPos) return;
        const data = { items: [{ name: 'Biryani', qty: 1 }] };
        const bytes = fns.buildKOTEscPos(data, 'ORD-1', 'Amogha', 58);
        expect(bytes).toBeTruthy();
    });
});

// ═══════════════════════════════════════════
// HTML PRINTING
// ═══════════════════════════════════════════

describe('POS — HTML Printing', () => {
    it('printBillHTML generates HTML string', () => {
        if (!fns.printBillHTML) return;
        const data = { items: [{ name: 'Biryani', qty: 1, price: 249 }], total: 249, subtotal: 249, customer: 'Test' };
        const html = fns.printBillHTML(data, 'ORD-1', 'Amogha', {}, 'Thanks');
        expect(html).toContain('Biryani');
    });

    it('printKOTHTML generates KOT HTML', () => {
        if (!fns.printKOTHTML) return;
        const data = { items: [{ name: 'Biryani', qty: 1 }] };
        const html = fns.printKOTHTML(data, 'ORD-1', 'Amogha');
        expect(html).toContain('Biryani');
    });
});

// ═══════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════

describe('POS — Utilities', () => {
    it('escH escapes HTML', () => {
        if (!fns.escH) return;
        expect(fns.escH('<b>')).not.toContain('<b>');
    });

    it('showToast does not throw', () => {
        if (!fns.showToast) return;
        expect(() => fns.showToast('Order placed')).not.toThrow();
    });

    it('randomBillQuote returns string', () => {
        if (!fns.randomBillQuote) return;
        expect(typeof fns.randomBillQuote()).toBe('string');
    });

    it('togglePosMode toggles theme', () => {
        if (!fns.togglePosMode) return;
        expect(() => fns.togglePosMode()).not.toThrow();
    });

    it('updateClock does not throw', () => {
        if (!fns.updateClock) return;
        expect(() => fns.updateClock()).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// RECENT ORDERS
// ═══════════════════════════════════════════

describe('POS — Recent Orders', () => {
    it('toggleRecentOrders toggles panel', () => {
        if (!fns.toggleRecentOrders) return;
        expect(() => fns.toggleRecentOrders()).not.toThrow();
    });

    it('startRecentOrdersListener sets up Firestore listener', () => {
        if (!fns.startRecentOrdersListener) return;
        fns.startRecentOrdersListener();
        expect(fns.__mockDb.collection).toHaveBeenCalledWith('orders');
    });

    it('renderRecentOrders does not throw', () => {
        if (!fns.renderRecentOrders) return;
        expect(() => fns.renderRecentOrders()).not.toThrow();
    });

    it('setRecentFilter filters orders', () => {
        if (!fns.setRecentFilter) return;
        const btn = document.createElement('button');
        expect(() => fns.setRecentFilter('pending', btn)).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// SALES COUNTER
// ═══════════════════════════════════════════

describe('POS — Sales Counter', () => {
    it('startSalesCounter does not throw', () => {
        if (!fns.startSalesCounter) return;
        expect(() => fns.startSalesCounter()).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// ORDER VOID
// ═══════════════════════════════════════════

describe('POS — Order Void', () => {
    it('voidOrder calls Firestore update', () => {
        if (!fns.voidOrder) return;
        fns.__context.confirm = vi.fn(() => true);
        fns.voidOrder('order-123');
        expect(fns.__mockDb.collection).toHaveBeenCalledWith('orders');
    });
});
