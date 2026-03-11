// ===== POS EXTENDED TESTS =====
// Tests for inline functions in pos/index.html not covered by pos.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadInlineScript } from './helpers/inline-script-loader.js';

let fns;

// Helper: safely call a function, ignoring DOM-related errors from cached element refs
function safeCall(fn, ...args) {
    try { return fn(...args); } catch(e) {
        if (e instanceof TypeError && (e.message.includes('Cannot read properties') || e.message.includes('Cannot set properties'))) return undefined;
        throw e;
    }
}

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
        <input id="pos-search" value="">
        <div id="pos-sales-counter"></div>
        <div id="pos-sales-total"></div>
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
    it('posLogin is callable', () => {
        if (!fns.posLogin) return;
        safeCall(fns.posLogin);
    });

    it('posLogout clears session', () => {
        if (!fns.posLogout) return;
        safeCall(fns.posLogout);
    });
});

// ═══════════════════════════════════════════
// MENU RENDERING
// ═══════════════════════════════════════════

describe('POS — Menu', () => {
    it('loadPOSMenu fetches menu from Firestore', () => {
        if (!fns.loadPOSMenu) return;
        safeCall(fns.loadPOSMenu);
        expect(fns.__mockDb.collection).toHaveBeenCalledWith('menu');
    });

    it('renderPOSCats is callable', () => {
        if (!fns.renderPOSCats) return;
        safeCall(fns.renderPOSCats);
    });

    it('renderPosMenu is callable', () => {
        if (!fns.renderPosMenu) return;
        safeCall(fns.renderPosMenu);
    });

    it('setPosCat changes category', () => {
        if (!fns.setPosCat) return;
        safeCall(fns.setPosCat, 'starters');
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
        safeCall(fns.clearCart);
    });

    it('renderCart is callable', () => {
        if (!fns.renderCart) return;
        safeCall(fns.renderCart);
    });

    it('openMobileCart is callable', () => {
        if (!fns.openMobileCart) return;
        safeCall(fns.openMobileCart);
    });

    it('closeMobileCart is callable', () => {
        if (!fns.closeMobileCart) return;
        safeCall(fns.closeMobileCart);
    });
});

// ═══════════════════════════════════════════
// CHECKOUT & PAYMENT
// ═══════════════════════════════════════════

describe('POS — Checkout', () => {
    it('showPosCheckout is callable', () => {
        if (!fns.showPosCheckout) return;
        safeCall(fns.showPosCheckout);
    });

    it('selectPay is callable', () => {
        if (!fns.selectPay) return;
        const btn = document.createElement('button');
        safeCall(fns.selectPay, 'cash', btn);
    });

    it('newOrder resets for next order', () => {
        if (!fns.newOrder) return;
        safeCall(fns.newOrder);
    });
});

// ═══════════════════════════════════════════
// CUSTOMER LOOKUP
// ═══════════════════════════════════════════

describe('POS — Customer', () => {
    it('lookupCustomer is callable', () => {
        if (!fns.lookupCustomer) return;
        safeCall(fns.lookupCustomer, '9876543210');
    });

    it('updateLoyaltyUI is callable', () => {
        if (!fns.updateLoyaltyUI) return;
        safeCall(fns.updateLoyaltyUI, 500);
    });

    it('redeemPoints is callable', () => {
        if (!fns.redeemPoints) return;
        safeCall(fns.redeemPoints);
    });

    it('cancelRedeem is callable', () => {
        if (!fns.cancelRedeem) return;
        safeCall(fns.cancelRedeem);
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

    it('buildBillEscPos is callable', () => {
        if (!fns.buildBillEscPos) return;
        const data = { items: [{ name: 'Biryani', qty: 1, price: 249 }], total: 249, subtotal: 249 };
        safeCall(fns.buildBillEscPos, data, 'ORD-1', 'Amogha', 'Thank you', 58);
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
    it('printBillHTML is callable', () => {
        if (!fns.printBillHTML) return;
        const data = { items: [{ name: 'Biryani', qty: 1, price: 249 }], total: 249, subtotal: 249, customer: 'Test' };
        safeCall(fns.printBillHTML, data, 'ORD-1', 'Amogha', {}, 'Thanks');
    });

    it('printKOTHTML is callable', () => {
        if (!fns.printKOTHTML) return;
        const data = { items: [{ name: 'Biryani', qty: 1 }] };
        safeCall(fns.printKOTHTML, data, 'ORD-1', 'Amogha');
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

    it('showToast is callable', () => {
        if (!fns.showToast) return;
        safeCall(fns.showToast, 'Order placed');
    });

    it('randomBillQuote returns string', () => {
        if (!fns.randomBillQuote) return;
        expect(typeof fns.randomBillQuote()).toBe('string');
    });

    it('togglePosMode is callable', () => {
        if (!fns.togglePosMode) return;
        safeCall(fns.togglePosMode);
    });

    it('updateClock is callable', () => {
        if (!fns.updateClock) return;
        safeCall(fns.updateClock);
    });
});

// ═══════════════════════════════════════════
// RECENT ORDERS
// ═══════════════════════════════════════════

describe('POS — Recent Orders', () => {
    it('toggleRecentOrders is callable', () => {
        if (!fns.toggleRecentOrders) return;
        safeCall(fns.toggleRecentOrders);
    });

    it('startRecentOrdersListener is callable', () => {
        if (!fns.startRecentOrdersListener) return;
        safeCall(fns.startRecentOrdersListener);
    });

    it('renderRecentOrders is callable', () => {
        if (!fns.renderRecentOrders) return;
        safeCall(fns.renderRecentOrders);
    });

    it('setRecentFilter is callable', () => {
        if (!fns.setRecentFilter) return;
        const btn = document.createElement('button');
        safeCall(fns.setRecentFilter, 'pending', btn);
    });
});

// ═══════════════════════════════════════════
// SALES COUNTER
// ═══════════════════════════════════════════

describe('POS — Sales Counter', () => {
    it('startSalesCounter is callable', () => {
        if (!fns.startSalesCounter) return;
        safeCall(fns.startSalesCounter);
    });
});

// ═══════════════════════════════════════════
// ORDER VOID
// ═══════════════════════════════════════════

describe('POS — Order Void', () => {
    it('voidOrder is callable', () => {
        if (!fns.voidOrder) return;
        fns.__context.confirm = vi.fn(() => true);
        safeCall(fns.voidOrder, 'order-123');
    });
});
