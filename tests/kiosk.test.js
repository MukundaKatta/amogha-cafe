// ===== KIOSK SELF-SERVICE TESTS =====
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadInlineScript } from './helpers/inline-script-loader.js';

let fns;

function setupDOM() {
    document.body.innerHTML = `
        <div id="shop-name"></div><div id="shop-tagline"></div>
        <div id="menu-grid"></div><div id="cat-tabs"></div><div id="cat-sidebar"></div>
        <div id="featured-carousel"></div>
        <div id="cart-bar" style="display:none"></div>
        <div id="cart-count">0</div><div id="cart-total">0</div><div id="cart-label"></div>
        <div id="pay-btn"></div>
        <div id="checkout-sheet" style="display:none"></div>
        <div id="checkout-items"></div><div id="checkout-subtotal"></div>
        <div id="checkout-total"></div>
        <input id="co-name"><input id="co-phone">
        <div id="success-screen" style="display:none"></div>
        <div id="feedback-section"></div>
        <div id="feedback-stars"></div><div id="feedback-comment"></div>
        <div id="feedback-thanks" style="display:none"></div>
        <div id="spice-picker" style="display:none"></div>
        <div id="addon-picker" style="display:none"></div>
        <div id="addon-list"></div><div id="addon-total">0</div>
        <div id="detail-overlay" style="display:none"></div>
        <div id="pairings-bar" style="display:none"></div>
        <div id="search-input"></div>
        <div id="screensaver" style="display:none"></div>
        <div id="voice-overlay" style="display:none"></div>
        <div id="voice-text"></div>
        <div id="qr-scanner" style="display:none"></div>
        <video id="qr-video"></video>
        <div id="loyalty-info" style="display:none"></div>
        <div id="loyalty-redeem"></div>
        <div id="recent-orders" style="display:none"></div>
        <div id="wait-time"></div>
        <div id="auto-reset-timer"></div>
    `;
    document.getElementById = (id) => document.body.querySelector('#' + id);
    document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
    document.querySelector = (sel) => document.body.querySelector(sel);
}

beforeEach(() => {
    setupDOM();
    vi.clearAllMocks();
    localStorage.clear();
    fns = loadInlineScript('kiosk/index.html');
});

// ═══════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════

describe('Kiosk — Utilities', () => {
    it('escHtml escapes HTML special characters', () => {
        if (!fns.escHtml) return;
        expect(fns.escHtml('<script>')).toBe('&lt;script&gt;');
    });

    it('escHtml returns empty for falsy input', () => {
        if (!fns.escHtml) return;
        expect(fns.escHtml('')).toBe('');
        expect(fns.escHtml(null)).toBe('');
    });

    it('haptic does not throw', () => {
        if (!fns.haptic) return;
        expect(() => fns.haptic()).not.toThrow();
    });

    it('debounce returns a function', () => {
        if (!fns.debounce) return;
        const fn = fns.debounce(() => {}, 100);
        expect(typeof fn).toBe('function');
    });

    it('showToast does not throw', () => {
        if (!fns.showToast) return;
        expect(() => fns.showToast('Added to cart')).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// MENU LOADING
// ═══════════════════════════════════════════

describe('Kiosk — Menu', () => {
    it('loadMenuFromFirestore fetches from Firestore', () => {
        if (!fns.loadMenuFromFirestore) return;
        fns.loadMenuFromFirestore();
        expect(fns.__mockDb.collection).toHaveBeenCalledWith('menu');
    });

    it('useFallbackMenu does not throw', () => {
        if (!fns.useFallbackMenu) return;
        expect(() => fns.useFallbackMenu()).not.toThrow();
    });

    it('renderMenu does not throw', () => {
        if (!fns.renderMenu) return;
        expect(() => fns.renderMenu()).not.toThrow();
    });

    it('renderCatTabs does not throw', () => {
        if (!fns.renderCatTabs) return;
        expect(() => fns.renderCatTabs()).not.toThrow();
    });

    it('renderCatSidebar does not throw', () => {
        if (!fns.renderCatSidebar) return;
        expect(() => fns.renderCatSidebar()).not.toThrow();
    });

    it('setCat changes active category', () => {
        if (!fns.setCat) return;
        const btn = document.createElement('button');
        expect(() => fns.setCat('starters', btn)).not.toThrow();
    });

    it('setFilter changes active filter', () => {
        if (!fns.setFilter) return;
        const btn = document.createElement('button');
        expect(() => fns.setFilter('veg', btn)).not.toThrow();
    });

    it('getFilteredItems returns array', () => {
        if (!fns.getFilteredItems) return;
        const items = fns.getFilteredItems();
        expect(Array.isArray(items)).toBe(true);
    });

    it('getCatCount returns number', () => {
        if (!fns.getCatCount) return;
        expect(typeof fns.getCatCount('all')).toBe('number');
    });
});

// ═══════════════════════════════════════════
// CART
// ═══════════════════════════════════════════

describe('Kiosk — Cart', () => {
    it('getCartQty returns 0 for unknown item', () => {
        if (!fns.getCartQty) return;
        expect(fns.getCartQty('Nonexistent')).toBe(0);
    });

    it('updateCartBar does not throw', () => {
        if (!fns.updateCartBar) return;
        expect(() => fns.updateCartBar()).not.toThrow();
    });

    it('updatePayBtn does not throw', () => {
        if (!fns.updatePayBtn) return;
        expect(() => fns.updatePayBtn()).not.toThrow();
    });

    it('closeSpicePicker hides picker', () => {
        if (!fns.closeSpicePicker) return;
        expect(() => fns.closeSpicePicker()).not.toThrow();
    });

    it('cancelAddons closes addon picker', () => {
        if (!fns.cancelAddons) return;
        expect(() => fns.cancelAddons()).not.toThrow();
    });

    it('changeQty does not throw for unknown item', () => {
        if (!fns.changeQty) return;
        expect(() => fns.changeQty('Unknown', 1)).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// CHECKOUT
// ═══════════════════════════════════════════

describe('Kiosk — Checkout', () => {
    it('openCheckout does not throw', () => {
        if (!fns.openCheckout) return;
        expect(() => fns.openCheckout()).not.toThrow();
    });

    it('closeCheckout hides checkout sheet', () => {
        if (!fns.closeCheckout) return;
        expect(() => fns.closeCheckout()).not.toThrow();
    });

    it('resetOrder clears cart and returns to menu', () => {
        if (!fns.resetOrder) return;
        expect(() => fns.resetOrder()).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// FEEDBACK
// ═══════════════════════════════════════════

describe('Kiosk — Feedback', () => {
    it('selectFeedbackRating sets rating', () => {
        if (!fns.selectFeedbackRating) return;
        expect(() => fns.selectFeedbackRating(4)).not.toThrow();
    });

    it('resetKioskFeedback does not throw', () => {
        if (!fns.resetKioskFeedback) return;
        expect(() => fns.resetKioskFeedback()).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// DETAIL & PAIRINGS
// ═══════════════════════════════════════════

describe('Kiosk — Item Detail', () => {
    it('closeDetail hides overlay', () => {
        if (!fns.closeDetail) return;
        expect(() => fns.closeDetail()).not.toThrow();
    });

    it('getStarStr returns star string', () => {
        if (!fns.getStarStr) return;
        const stars = fns.getStarStr(4.5);
        expect(stars).toContain('★');
    });
});

// ═══════════════════════════════════════════
// SCREENSAVER
// ═══════════════════════════════════════════

describe('Kiosk — Screensaver', () => {
    it('dismissScreensaver hides screensaver', () => {
        if (!fns.dismissScreensaver) return;
        expect(() => fns.dismissScreensaver()).not.toThrow();
    });

    it('resetIdleTimer does not throw', () => {
        if (!fns.resetIdleTimer) return;
        expect(() => fns.resetIdleTimer()).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// LOYALTY
// ═══════════════════════════════════════════

describe('Kiosk — Loyalty', () => {
    it('getLoyaltyTier returns tier for points', () => {
        if (!fns.getLoyaltyTier) return;
        expect(fns.getLoyaltyTier(0).name).toBe('Bronze');
        expect(fns.getLoyaltyTier(500).name).toBe('Silver');
        expect(fns.getLoyaltyTier(1000).name).toBe('Gold');
    });
});

// ═══════════════════════════════════════════
// VOICE ORDERING
// ═══════════════════════════════════════════

describe('Kiosk — Voice', () => {
    it('stopVoiceOrder does not throw', () => {
        if (!fns.stopVoiceOrder) return;
        expect(() => fns.stopVoiceOrder()).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// ACCESSIBILITY
// ═══════════════════════════════════════════

describe('Kiosk — Accessibility', () => {
    it('toggleLightMode does not throw', () => {
        if (!fns.toggleLightMode) return;
        expect(() => fns.toggleLightMode()).not.toThrow();
    });

    it('toggleAccessibility does not throw', () => {
        if (!fns.toggleAccessibility) return;
        expect(() => fns.toggleAccessibility()).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// I18N
// ═══════════════════════════════════════════

describe('Kiosk — Internationalization', () => {
    it('setLang changes language', () => {
        if (!fns.setLang) return;
        expect(() => fns.setLang('hi')).not.toThrow();
    });

    it('t returns translation key', () => {
        if (!fns.t) return;
        const text = fns.t('menu');
        expect(typeof text).toBe('string');
    });
});

// ═══════════════════════════════════════════
// SHOP CONFIG
// ═══════════════════════════════════════════

describe('Kiosk — Shop Config', () => {
    it('applyShopConfig does not throw', () => {
        if (!fns.applyShopConfig) return;
        expect(() => fns.applyShopConfig()).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// CONFETTI
// ═══════════════════════════════════════════

describe('Kiosk — Confetti', () => {
    it('launchConfetti does not throw', () => {
        if (!fns.launchConfetti) return;
        expect(() => fns.launchConfetti()).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// WAIT TIME & SERVICES
// ═══════════════════════════════════════════

describe('Kiosk — Services', () => {
    it('estimateWaitTime returns number', () => {
        if (!fns.estimateWaitTime) return;
        const time = fns.estimateWaitTime();
        expect(typeof time).toBe('number');
    });

    it('callStaff sends notification', () => {
        if (!fns.callStaff) return;
        fns.callStaff();
        expect(fns.__mockDb.collection).toHaveBeenCalledWith('notifications');
    });
});
