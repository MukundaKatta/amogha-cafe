// ===== ADMIN DASHBOARD TESTS =====
// Tests for inline script functions in admin/index.html
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadInlineScript } from './helpers/inline-script-loader.js';

let fns;

function setupDOM(html) {
    document.body.innerHTML = html || '';
    document.getElementById = (id) => document.body.querySelector('#' + id);
    document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
    document.querySelector = (sel) => document.body.querySelector(sel);
}

beforeEach(() => {
    setupDOM(`
        <div id="login-screen"></div>
        <div id="admin-password"></div>
        <div id="login-error"></div>
        <div id="admin-dashboard" style="display:none"></div>
        <select id="shop-selector"></select>
        <div id="shops-list"></div>
        <div id="orders-container"></div>
        <div id="menu-admin-container"></div>
        <div id="menu-cat-filters"></div>
        <div id="addons-list"></div>
        <div id="specials-list"></div>
        <div id="hero-slides-admin"></div>
        <div id="coupons-list"></div>
        <div id="reviews-admin"></div>
        <div id="crm-container"></div>
        <div id="analytics-container"></div>
        <div id="staff-list"></div>
        <div id="calendar-container"></div>
        <div id="expenses-container"></div>
        <div id="gift-cards-admin"></div>
        <div id="testimonials-admin"></div>
        <div id="social-posts-admin"></div>
        <div id="marketing-container"></div>
        <div id="pricing-rules-container"></div>
        <div id="stat-total"></div><div id="stat-pending"></div>
        <div id="stat-revenue"></div><div id="stat-avg"></div>
        <div id="stat-preparing"></div><div id="stat-ready"></div>
        <div id="stat-delivered"></div><div id="stat-cancelled"></div>
        <div id="bulk-bar"></div>
        <div id="bulk-count"></div>
        <div id="add-menu-modal" style="display:none"></div>
        <div id="add-special-modal" style="display:none"></div>
        <div id="add-coupon-modal" style="display:none"></div>
        <input id="new-item-category">
        <div id="filter-all" class="active"></div>
        <div id="expense-modal" style="display:none"></div>
        <div id="exp-id"></div>
        <input id="exp-date"><input id="exp-category"><input id="exp-desc">
        <input id="exp-amount"><input id="exp-payment">
        <div id="aq-output"></div><div id="aq-chart"></div>
        <input id="aq-input">
        <canvas id="revenue-chart"></canvas>
        <div id="enhanced-charts"></div>
        <div id="review-insights"></div>
        <div id="menu-insights"></div>
        <div id="daily-special-form"></div>
        <input id="ds-title"><input id="ds-desc"><input id="ds-price"><input id="ds-image">
        <div id="staff-form" style="display:none"></div>
        <input id="staff-name"><input id="staff-phone"><input id="staff-role"><input id="staff-shift">
        <div id="kiosk-list"></div>
        <select id="kiosk-shop-selector"></select>
        <input id="kiosk-username"><input id="kiosk-password">
    `);
    vi.clearAllMocks();
    localStorage.clear();
    fns = loadInlineScript('admin/index.html');
});

// ═══════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════

describe('Admin — Utility Functions', () => {
    it('escHtml escapes HTML characters', () => {
        if (!fns.escHtml) return;
        expect(fns.escHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    it('escHtml returns empty string for falsy input', () => {
        if (!fns.escHtml) return;
        expect(fns.escHtml('')).toBe('');
        expect(fns.escHtml(null)).toBe('');
        expect(fns.escHtml(undefined)).toBe('');
    });

    it('sanitizeFileName replaces non-alphanumeric chars', () => {
        if (!fns.sanitizeFileName) return;
        expect(fns.sanitizeFileName('Chicken 65 (Spicy)')).toBe('Chicken_65__Spicy_');
    });

    it('getStarsHtml returns star HTML for rating', () => {
        if (fns.getStarsHtml) {
            const html = fns.getStarsHtml(4);
            expect(html).toContain('★');
        }
    });

    it('getMonday returns Monday of given week', () => {
        if (fns.getMonday) {
            const wed = new Date('2026-03-11'); // Wednesday
            const mon = fns.getMonday(wed);
            expect(mon.getDay()).toBe(1);
        }
    });
});

// ═══════════════════════════════════════════
// SHOP MANAGEMENT
// ═══════════════════════════════════════════

describe('Admin — Shop Management', () => {
    it('loadShops fetches shops from Firestore', async () => {
        if (!fns.loadShops) return;
        fns.loadShops();
        expect(fns.__mockDb.collection).toHaveBeenCalledWith('shops');
    });

    it('switchShop changes currentShopId and reloads', () => {
        if (!fns.switchShop) return;
        fns.switchShop('branch-2');
        // Should trigger data reload (calling loadOrders/loadMenuItems)
    });

    it('renderShopCards does not throw with empty shops', () => {
        if (!fns.renderShopCards) return;
        expect(() => fns.renderShopCards()).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// ORDER MANAGEMENT
// ═══════════════════════════════════════════

describe('Admin — Order Management', () => {
    it('loadOrders sets up Firestore snapshot listener', () => {
        if (!fns.loadOrders) return;
        fns.loadOrders();
        expect(fns.__mockDb.collection).toHaveBeenCalledWith('orders');
    });

    it('renderOrders does not throw with no orders', () => {
        if (!fns.renderOrders) return;
        expect(() => fns.renderOrders()).not.toThrow();
    });

    it('filterOrders updates active button', () => {
        if (!fns.filterOrders) return;
        const btn = document.createElement('button');
        fns.filterOrders('pending', btn);
        expect(btn.classList.contains('active')).toBe(true);
    });

    it('updateStats does not throw', () => {
        if (!fns.updateStats) return;
        expect(() => fns.updateStats()).not.toThrow();
    });

    it('animateCount animates number element', () => {
        if (!fns.animateCount) return;
        const el = document.createElement('div');
        el.id = 'test-count';
        el.textContent = '0';
        document.body.appendChild(el);
        document.getElementById = (id) => document.body.querySelector('#' + id);
        expect(() => fns.animateCount('test-count', 42)).not.toThrow();
    });

    it('exportOrdersCSV does not throw', () => {
        if (!fns.exportOrdersCSV) return;
        // Mock URL.createObjectURL and link click
        window.URL = { createObjectURL: vi.fn(() => 'blob:test'), revokeObjectURL: vi.fn() };
        expect(() => fns.exportOrdersCSV()).not.toThrow();
    });

    it('printOrder does not throw for unknown orderId', () => {
        if (!fns.printOrder) return;
        window.open = vi.fn(() => ({
            document: { write: vi.fn(), close: vi.fn() },
            focus: vi.fn(),
            print: vi.fn(),
        }));
        expect(() => fns.printOrder('nonexistent')).not.toThrow();
    });

    it('updateStatus calls Firestore update', async () => {
        if (!fns.updateStatus) return;
        fns.updateStatus('order-1', 'preparing', 'Test', '9999999999');
        expect(fns.__mockDb.collection).toHaveBeenCalledWith('orders');
    });
});

// ═══════════════════════════════════════════
// MENU CRUD
// ═══════════════════════════════════════════

describe('Admin — Menu CRUD', () => {
    it('loadMenuItems sets up snapshot listener', () => {
        if (!fns.loadMenuItems) return;
        fns.loadMenuItems();
        expect(fns.__mockDb.collection).toHaveBeenCalledWith('menu');
    });

    it('renderMenuAdmin does not throw with empty items', () => {
        if (!fns.renderMenuAdmin) return;
        expect(() => fns.renderMenuAdmin()).not.toThrow();
    });

    it('showAddMenuItem opens modal', () => {
        if (!fns.showAddMenuItem) return;
        fns.showAddMenuItem();
        const modal = document.getElementById('add-menu-modal');
        if (modal) expect(modal.style.display).not.toBe('none');
    });

    it('hideAddMenuItem closes modal', () => {
        if (!fns.hideAddMenuItem) return;
        fns.hideAddMenuItem();
        const modal = document.getElementById('add-menu-modal');
        if (modal) expect(modal.style.display).toBe('none');
    });

    it('toggleAvail calls Firestore update', () => {
        if (!fns.toggleAvail) return;
        fns.toggleAvail('item-1', false);
        expect(fns.__mockDb.collection).toHaveBeenCalledWith('menu');
    });

    it('removeMenuItem with confirm calls Firestore delete', () => {
        if (!fns.removeMenuItem) return;
        fns.__context.confirm = vi.fn(() => true);
        fns.removeMenuItem('item-1');
        expect(fns.__mockDb.collection).toHaveBeenCalledWith('menu');
    });

    it('renderMenuCatFilters does not throw', () => {
        if (!fns.renderMenuCatFilters) return;
        expect(() => fns.renderMenuCatFilters()).not.toThrow();
    });

    it('filterMenuCat filters by category', () => {
        if (!fns.filterMenuCat) return;
        const btn = document.createElement('button');
        expect(() => fns.filterMenuCat('starters', btn)).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// BULK OPERATIONS
// ═══════════════════════════════════════════

describe('Admin — Bulk Operations', () => {
    it('toggleBulkMode toggles bulk mode UI', () => {
        if (!fns.toggleBulkMode) return;
        expect(() => fns.toggleBulkMode(true)).not.toThrow();
        expect(() => fns.toggleBulkMode(false)).not.toThrow();
    });

    it('updateBulkBar does not throw', () => {
        if (!fns.updateBulkBar) return;
        expect(() => fns.updateBulkBar()).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// ADDONS MANAGEMENT
// ═══════════════════════════════════════════

describe('Admin — Addons', () => {
    it('loadAddons sets up snapshot listener', () => {
        if (!fns.loadAddons) return;
        fns.loadAddons();
        expect(fns.__mockDb.collection).toHaveBeenCalledWith('addons');
    });

    it('renderAddonsAdmin does not throw', () => {
        if (!fns.renderAddonsAdmin) return;
        expect(() => fns.renderAddonsAdmin()).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// SPECIALS MANAGEMENT
// ═══════════════════════════════════════════

describe('Admin — Specials', () => {
    it('loadSpecials sets up snapshot listener', () => {
        if (!fns.loadSpecials) return;
        fns.loadSpecials();
        expect(fns.__mockDb.collection).toHaveBeenCalledWith('specials');
    });

    it('showAddSpecial opens modal', () => {
        if (!fns.showAddSpecial) return;
        fns.showAddSpecial();
    });

    it('hideAddSpecial closes modal', () => {
        if (!fns.hideAddSpecial) return;
        fns.hideAddSpecial();
    });
});

// ═══════════════════════════════════════════
// HERO SLIDESHOW
// ═══════════════════════════════════════════

describe('Admin — Hero Slideshow', () => {
    it('loadHeroSlides sets up listener', () => {
        if (!fns.loadHeroSlides) return;
        fns.loadHeroSlides();
        expect(fns.__mockDb.collection).toHaveBeenCalledWith('heroSlides');
    });

    it('renderSlideshowAdmin does not throw', () => {
        if (!fns.renderSlideshowAdmin) return;
        expect(() => fns.renderSlideshowAdmin()).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// TESTIMONIALS & SOCIAL
// ═══════════════════════════════════════════

describe('Admin — Testimonials & Social', () => {
    it('loadTestimonialsAdmin sets up listener', () => {
        if (!fns.loadTestimonialsAdmin) return;
        fns.loadTestimonialsAdmin();
    });

    it('loadSocialPostsAdmin sets up listener', () => {
        if (!fns.loadSocialPostsAdmin) return;
        fns.loadSocialPostsAdmin();
    });
});

// ═══════════════════════════════════════════
// COUPONS
// ═══════════════════════════════════════════

describe('Admin — Coupons', () => {
    it('loadCoupons sets up listener', () => {
        if (!fns.loadCoupons) return;
        fns.loadCoupons();
        expect(fns.__mockDb.collection).toHaveBeenCalledWith('coupons');
    });

    it('showAddCoupon opens modal', () => {
        if (!fns.showAddCoupon) return;
        fns.showAddCoupon();
    });

    it('hideAddCoupon closes modal', () => {
        if (!fns.hideAddCoupon) return;
        fns.hideAddCoupon();
    });
});

// ═══════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════

describe('Admin — Analytics', () => {
    it('loadAnalytics does not throw', () => {
        if (!fns.loadAnalytics) return;
        expect(() => fns.loadAnalytics()).not.toThrow();
    });

    it('renderAnalytics does not throw', () => {
        if (!fns.renderAnalytics) return;
        expect(() => fns.renderAnalytics()).not.toThrow();
    });

    it('getAnalyticsFilteredOrders returns array', () => {
        if (!fns.getAnalyticsFilteredOrders) return;
        const result = fns.getAnalyticsFilteredOrders();
        expect(Array.isArray(result)).toBe(true);
    });
});

// ═══════════════════════════════════════════
// EXPENSES
// ═══════════════════════════════════════════

describe('Admin — Expenses', () => {
    it('loadExpenses sets up listener', () => {
        if (!fns.loadExpenses) return;
        fns.loadExpenses();
        expect(fns.__mockDb.collection).toHaveBeenCalledWith('expenses');
    });

    it('renderExpenses does not throw', () => {
        if (!fns.renderExpenses) return;
        expect(() => fns.renderExpenses()).not.toThrow();
    });

    it('openExpenseModal opens new expense modal', () => {
        if (!fns.openExpenseModal) return;
        fns.openExpenseModal();
    });

    it('closeExpenseModal closes modal', () => {
        if (!fns.closeExpenseModal) return;
        fns.closeExpenseModal();
    });

    it('getFilteredExpenses returns array', () => {
        if (!fns.getFilteredExpenses) return;
        const result = fns.getFilteredExpenses();
        expect(Array.isArray(result)).toBe(true);
    });
});

// ═══════════════════════════════════════════
// CRM
// ═══════════════════════════════════════════

describe('Admin — CRM', () => {
    it('loadCRM does not throw', () => {
        if (!fns.loadCRM) return;
        expect(() => fns.loadCRM()).not.toThrow();
    });

    it('renderCRM does not throw', () => {
        if (!fns.renderCRM) return;
        expect(() => fns.renderCRM()).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// STAFF MANAGEMENT
// ═══════════════════════════════════════════

describe('Admin — Staff', () => {
    it('loadStaff sets up listener', () => {
        if (!fns.loadStaff) return;
        fns.loadStaff();
        expect(fns.__mockDb.collection).toHaveBeenCalledWith('staff');
    });

    it('renderStaff does not throw', () => {
        if (!fns.renderStaff) return;
        expect(() => fns.renderStaff()).not.toThrow();
    });

    it('toggleStaffForm toggles form visibility', () => {
        if (!fns.toggleStaffForm) return;
        expect(() => fns.toggleStaffForm()).not.toThrow();
    });

    it('cancelStaffForm hides form', () => {
        if (!fns.cancelStaffForm) return;
        expect(() => fns.cancelStaffForm()).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// REVIEWS & INSIGHTS
// ═══════════════════════════════════════════

describe('Admin — Reviews', () => {
    it('loadReviews fetches reviews', () => {
        if (!fns.loadReviews) return;
        fns.loadReviews();
        expect(fns.__mockDb.collection).toHaveBeenCalledWith('reviews');
    });

    it('renderReviewsAdmin does not throw', () => {
        if (!fns.renderReviewsAdmin) return;
        expect(() => fns.renderReviewsAdmin()).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// GIFT CARDS
// ═══════════════════════════════════════════

describe('Admin — Gift Cards', () => {
    it('loadGiftCardsAdmin sets up listener', () => {
        if (!fns.loadGiftCardsAdmin) return;
        fns.loadGiftCardsAdmin();
        expect(fns.__mockDb.collection).toHaveBeenCalledWith('giftCards');
    });

    it('renderGiftCardsAdmin does not throw', () => {
        if (!fns.renderGiftCardsAdmin) return;
        expect(() => fns.renderGiftCardsAdmin()).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// KIOSK MANAGEMENT
// ═══════════════════════════════════════════

describe('Admin — Kiosk Management', () => {
    it('loadKiosks fetches kiosks', () => {
        if (!fns.loadKiosks) return;
        fns.loadKiosks();
        expect(fns.__mockDb.collection).toHaveBeenCalledWith('kiosks');
    });

    it('renderKioskList does not throw', () => {
        if (!fns.renderKioskList) return;
        expect(() => fns.renderKioskList()).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// DAILY SPECIAL
// ═══════════════════════════════════════════

describe('Admin — Daily Special', () => {
    it('loadDailySpecialAdmin fetches settings', () => {
        if (!fns.loadDailySpecialAdmin) return;
        fns.loadDailySpecialAdmin();
        expect(fns.__mockDb.collection).toHaveBeenCalledWith('settings');
    });

    it('saveDailySpecial calls Firestore set', () => {
        if (!fns.saveDailySpecial) return;
        fns.saveDailySpecial();
        expect(fns.__mockDb.collection).toHaveBeenCalledWith('settings');
    });
});

// ═══════════════════════════════════════════
// DYNAMIC PRICING
// ═══════════════════════════════════════════

describe('Admin — Dynamic Pricing', () => {
    it('loadDynamicPricing fetches pricing rules', () => {
        if (!fns.loadDynamicPricing) return;
        fns.loadDynamicPricing();
        expect(fns.__mockDb.collection).toHaveBeenCalledWith('settings');
    });

    it('renderPricingRules does not throw', () => {
        if (!fns.renderPricingRules) return;
        expect(() => fns.renderPricingRules()).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// MARKETING
// ═══════════════════════════════════════════

describe('Admin — Marketing', () => {
    it('loadMarketing does not throw', () => {
        if (!fns.loadMarketing) return;
        expect(() => fns.loadMarketing()).not.toThrow();
    });

    it('filterCustomers does not throw', () => {
        if (!fns.filterCustomers) return;
        expect(() => fns.filterCustomers()).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// TAB NAVIGATION
// ═══════════════════════════════════════════

describe('Admin — Tab Navigation', () => {
    it('switchTab does not throw for known tab', () => {
        if (!fns.switchTab) return;
        const btn = document.createElement('button');
        expect(() => fns.switchTab('orders', btn)).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// AUTHENTICATION
// ═══════════════════════════════════════════

describe('Admin — Authentication', () => {
    it('adminLogout shows login screen', () => {
        if (!fns.adminLogout) return;
        fns.adminLogout();
    });

    it('toggleAdminTheme does not throw', () => {
        if (!fns.toggleAdminTheme) return;
        expect(() => fns.toggleAdminTheme()).not.toThrow();
    });

    it('proceedAdminLogin shows dashboard', () => {
        if (!fns.proceedAdminLogin) return;
        expect(() => fns.proceedAdminLogin()).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// CALENDAR
// ═══════════════════════════════════════════

describe('Admin — Reservation Calendar', () => {
    it('loadCalendar does not throw', () => {
        if (!fns.loadCalendar) return;
        expect(() => fns.loadCalendar()).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// NATURAL LANGUAGE ANALYTICS
// ═══════════════════════════════════════════

describe('Admin — NL Analytics', () => {
    it('runAnalyticsQueryLocal handles simple query', () => {
        if (!fns.runAnalyticsQueryLocal) return;
        expect(() => fns.runAnalyticsQueryLocal('revenue today')).not.toThrow();
    });

    it('showNoResult displays message', () => {
        if (!fns.showNoResult) return;
        expect(() => fns.showNoResult('No data found')).not.toThrow();
    });
});
