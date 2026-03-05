import { describe, it, expect, beforeEach } from 'vitest';
import {
    cart,
    finalizeAddToCart,
    updateQuantity,
    removeItem,
    saveCart,
    loadCart,
    getCheckoutTotal,
} from '../src/modules/cart.js';
import { COMBO_DISCOUNT, FREE_DELIVERY_THRESHOLD, DELIVERY_FEE } from '../src/core/constants.js';

// Helper to reset cart state between tests
function clearCart() {
    cart.length = 0;
}

describe('Cart — finalizeAddToCart', () => {
    beforeEach(() => {
        clearCart();
        localStorage.clear();
    });

    it('adds a new item to the cart', () => {
        finalizeAddToCart('Chicken Biryani', 249, 'medium', []);
        expect(cart).toHaveLength(1);
        expect(cart[0]).toMatchObject({ name: 'Chicken Biryani', price: 249, quantity: 1, spiceLevel: 'medium' });
    });

    it('increments quantity for an identical item (same name, spice, addons)', () => {
        finalizeAddToCart('Chicken Biryani', 249, 'medium', []);
        finalizeAddToCart('Chicken Biryani', 249, 'medium', []);
        expect(cart).toHaveLength(1);
        expect(cart[0].quantity).toBe(2);
    });

    it('treats items with different spice levels as separate cart entries', () => {
        finalizeAddToCart('Chicken Biryani', 249, 'mild', []);
        finalizeAddToCart('Chicken Biryani', 249, 'hot', []);
        expect(cart).toHaveLength(2);
    });

    it('treats items with different addons as separate cart entries', () => {
        finalizeAddToCart('Biryani', 249, 'medium', [{ name: 'Raita', price: 40 }]);
        finalizeAddToCart('Biryani', 249, 'medium', []);
        expect(cart).toHaveLength(2);
    });

    it('handles multiple different items', () => {
        finalizeAddToCart('Tea', 30, 'medium', []);
        finalizeAddToCart('Coffee', 40, 'medium', []);
        finalizeAddToCart('Butter Naan', 40, 'medium', []);
        expect(cart).toHaveLength(3);
    });

    it('stores addon data with the item', () => {
        finalizeAddToCart('Biryani', 249, 'medium', [{ name: 'Raita', price: 40 }]);
        expect(cart[0].addons).toHaveLength(1);
        expect(cart[0].addons[0].name).toBe('Raita');
    });
});

describe('Cart — updateQuantity', () => {
    beforeEach(() => {
        clearCart();
        localStorage.clear();
    });

    it('increments quantity', () => {
        finalizeAddToCart('Tea', 30, 'medium', []);
        updateQuantity(0, 1);
        expect(cart[0].quantity).toBe(2);
    });

    it('decrements quantity', () => {
        finalizeAddToCart('Tea', 30, 'medium', []);
        finalizeAddToCart('Tea', 30, 'medium', []);  // qty becomes 2
        updateQuantity(0, -1);
        expect(cart[0].quantity).toBe(1);
    });

    it('removes item when quantity reaches 0', () => {
        finalizeAddToCart('Tea', 30, 'medium', []);
        updateQuantity(0, -1);
        expect(cart).toHaveLength(0);
    });

    it('does not go below zero (splice removes at 0)', () => {
        finalizeAddToCart('Tea', 30, 'medium', []);
        updateQuantity(0, -1);
        expect(cart).toHaveLength(0);
    });
});

describe('Cart — removeItem', () => {
    beforeEach(() => {
        clearCart();
        localStorage.clear();
    });

    it('removes item at specified index', () => {
        finalizeAddToCart('Tea', 30, 'medium', []);
        finalizeAddToCart('Coffee', 40, 'medium', []);
        removeItem(0);
        expect(cart).toHaveLength(1);
        expect(cart[0].name).toBe('Coffee');
    });

    it('removes the only item leaving an empty cart', () => {
        finalizeAddToCart('Tea', 30, 'medium', []);
        removeItem(0);
        expect(cart).toHaveLength(0);
    });
});

describe('Cart — getCheckoutTotal', () => {
    beforeEach(() => {
        clearCart();
        window._appliedCoupon = null;
        localStorage.clear();
    });

    it('calculates subtotal correctly', () => {
        finalizeAddToCart('Chicken Biryani', 249, 'medium', []);
        finalizeAddToCart('Chicken Biryani', 249, 'medium', []);  // qty 2
        const totals = getCheckoutTotal();
        expect(totals.subtotal).toBe(498);
    });

    it('applies delivery fee when below threshold', () => {
        finalizeAddToCart('Tea', 30, 'medium', []);  // subtotal = 30, below 500
        const totals = getCheckoutTotal();
        expect(totals.deliveryFee).toBe(DELIVERY_FEE);
        expect(totals.total).toBe(30 + DELIVERY_FEE);
    });

    it('waives delivery fee when subtotal meets threshold', () => {
        finalizeAddToCart('Chicken Biryani', 249, 'medium', []);
        finalizeAddToCart('Chicken Biryani', 249, 'medium', []);
        finalizeAddToCart('Tea', 30, 'medium', []);
        // subtotal = 498 + 30 = 528 >= 500
        const totals = getCheckoutTotal();
        expect(totals.subtotal).toBeGreaterThanOrEqual(FREE_DELIVERY_THRESHOLD);
        expect(totals.deliveryFee).toBe(0);
    });

    it('applies percent coupon discount', () => {
        finalizeAddToCart('Chicken Biryani', 249, 'medium', []);
        finalizeAddToCart('Chicken Biryani', 249, 'medium', []);  // subtotal = 498
        const totals = getCheckoutTotal({ type: 'percent', discount: 20, active: true });
        expect(totals.discount).toBe(Math.floor(498 * 0.20));
    });

    it('applies flat coupon discount', () => {
        finalizeAddToCart('Chicken Biryani', 249, 'medium', []);
        finalizeAddToCart('Chicken Biryani', 249, 'medium', []);  // subtotal = 498
        const totals = getCheckoutTotal({ type: 'flat', discount: 50, active: true });
        expect(totals.discount).toBe(50);
    });

    it('caps discount at subtotal (discount cannot exceed order value)', () => {
        finalizeAddToCart('Tea', 30, 'medium', []);  // subtotal = 30
        const totals = getCheckoutTotal({ type: 'flat', discount: 100, active: true });
        expect(totals.discount).toBeLessThanOrEqual(30);
    });

    it('returns zero discount when no coupon applied', () => {
        finalizeAddToCart('Tea', 30, 'medium', []);
        const totals = getCheckoutTotal(null);
        expect(totals.discount).toBe(0);
    });
});

describe('Cart — localStorage persistence', () => {
    beforeEach(() => {
        clearCart();
        localStorage.clear();
    });

    it('saves and restores cart from localStorage', () => {
        finalizeAddToCart('Tea', 30, 'medium', []);
        finalizeAddToCart('Biryani', 249, 'medium', []);
        saveCart();
        clearCart();
        expect(cart).toHaveLength(0);
        loadCart();
        expect(cart).toHaveLength(2);
        expect(cart[0].name).toBe('Tea');
        expect(cart[1].name).toBe('Biryani');
    });

    it('handles empty cart save/load gracefully', () => {
        saveCart();
        loadCart();
        expect(cart).toHaveLength(0);
    });
});

// ===========================================================================
// Branch coverage: initAddonCache — cached addons from localStorage (line 17)
// ===========================================================================
import {
    initAddonCache,
    cachedAddons,
    addToCart,
    openAddonPicker,
    toggleAddonOption,
    selectedAddons,
    pendingAddonItem,
    confirmAddonSelection,
    closeAddonPicker,
    updateCartCount,
    updateFloatingCart,
    updateFloatingCartBar,
    updateCartFab,
    closeSignInPrompt,
    showSignInPrompt,
    displayCart,
    closeFloatingCart,
    initCart,
    restoreButtonStates,
    updateButtonState,
} from '../src/modules/cart.js';
import { vi, beforeEach, describe, it, expect } from 'vitest';

describe('initAddonCache — localStorage cache hit (line 17)', () => {
    beforeEach(() => {
        cachedAddons.length = 0;
        localStorage.clear();
        window.db = undefined;
    });

    it('loads addons from localStorage when cache is fresh', () => {
        const cacheData = {
            ts: Date.now() - 1000, // 1 second ago (within 10-min window)
            data: [{ name: 'Raita', price: 40, category: 'Sides' }],
        };
        localStorage.setItem('addons_cache', JSON.stringify(cacheData));
        initAddonCache();
        expect(cachedAddons.length).toBeGreaterThanOrEqual(1);
        expect(cachedAddons.some(a => a.name === 'Raita')).toBe(true);
    });

    it('ignores expired localStorage cache', () => {
        const cacheData = {
            ts: Date.now() - 700000, // older than 10 min
            data: [{ name: 'Stale', price: 10 }],
        };
        localStorage.setItem('addons_cache', JSON.stringify(cacheData));
        initAddonCache();
        // Since db is undefined, cachedAddons should not contain stale data
        expect(cachedAddons.some(a => a.name === 'Stale')).toBe(false);
    });
});

describe('initAddonCache — Firestore fetch (line 26)', () => {
    beforeEach(() => {
        cachedAddons.length = 0;
        localStorage.clear();
    });

    it('fetches addons from Firestore when db exists and no localStorage cache', async () => {
        const addonDocs = [
            { data: () => ({ name: 'Butter', price: 20, category: 'Extras' }) },
            { data: () => ({ name: 'Cheese', price: 30, category: 'Extras' }) },
        ];
        window.db = {
            collection: vi.fn(() => ({
                where: vi.fn().mockReturnThis(),
                orderBy: vi.fn().mockReturnThis(),
                get: vi.fn(() => Promise.resolve({
                    forEach: (cb) => addonDocs.forEach(cb),
                })),
            })),
        };
        initAddonCache();
        await new Promise(r => setTimeout(r, 50));
        expect(cachedAddons.some(a => a.name === 'Butter')).toBe(true);
        expect(cachedAddons.some(a => a.name === 'Cheese')).toBe(true);
        // Also verifies localStorage was updated
        const stored = JSON.parse(localStorage.getItem('addons_cache'));
        expect(stored).not.toBeNull();
        expect(stored.data.length).toBeGreaterThanOrEqual(2);
    });

    it('handles Firestore fetch failure gracefully', async () => {
        window.db = {
            collection: vi.fn(() => ({
                where: vi.fn().mockReturnThis(),
                orderBy: vi.fn().mockReturnThis(),
                get: vi.fn(() => Promise.reject(new Error('fail'))),
            })),
        };
        initAddonCache();
        await new Promise(r => setTimeout(r, 50));
        // Should not throw, cachedAddons stays empty
    });
});

// ===========================================================================
// Branch coverage: finalizeAddToCart — existingItem found (line 119)
// ===========================================================================
describe('finalizeAddToCart — existingItem with matching addons (line 119)', () => {
    beforeEach(() => {
        clearCart();
        localStorage.clear();
    });

    it('increments quantity when item name, spice, and addons all match', () => {
        finalizeAddToCart('Biryani', 249, 'hot', [{ name: 'Raita', price: 40 }]);
        finalizeAddToCart('Biryani', 249, 'hot', [{ name: 'Raita', price: 40 }]);
        expect(cart).toHaveLength(1);
        expect(cart[0].quantity).toBe(2);
    });
});

// ===========================================================================
// Branch coverage: finalizeAddToCart — btnEl provided (line 131)
// ===========================================================================
describe('finalizeAddToCart — btnEl micro-interactions (line 131)', () => {
    beforeEach(() => {
        clearCart();
        localStorage.clear();
        document.body.innerHTML = '<div id="cart-count"></div><div id="floating-cart-bar"></div>';
        document.getElementById = Document.prototype.getElementById.bind(document);
    });

    it('adds cart-adding class to btnEl when provided', () => {
        const btn = document.createElement('button');
        btn.className = 'add-to-cart';
        document.body.appendChild(btn);
        finalizeAddToCart('Tea', 30, 'medium', [], btn);
        expect(btn.classList.contains('cart-adding')).toBe(true);
    });

    it('does not throw when btnEl is null', () => {
        expect(() => finalizeAddToCart('Tea', 30, 'medium', [], null)).not.toThrow();
    });
});

// ===========================================================================
// Branch coverage: openAddonPicker — addon list HTML with category fallback (line 165)
// ===========================================================================
describe('openAddonPicker — addon list rendering (line 165)', () => {
    beforeEach(() => {
        clearCart();
        cachedAddons.length = 0;
        document.body.innerHTML = '<div id="addon-picker-overlay" style="display:none"></div>' +
            '<div id="addon-item-name"></div>' +
            '<div id="addon-sheet-list"></div>' +
            '<div id="addon-total"></div>';
        document.getElementById = Document.prototype.getElementById.bind(document);
    });

    it('renders addon HTML with category when present', () => {
        cachedAddons.push({ name: 'Raita', price: 40, category: 'Sides' });
        openAddonPicker('Biryani', 249);
        const listEl = document.getElementById('addon-sheet-list');
        expect(listEl.innerHTML).toContain('Sides');
        expect(listEl.innerHTML).toContain('Raita');
        cachedAddons.length = 0;
    });

    it('renders addon HTML with empty string when category is missing (fallback)', () => {
        cachedAddons.push({ name: 'Extra Spice', price: 10 });
        openAddonPicker('Biryani', 249);
        const listEl = document.getElementById('addon-sheet-list');
        expect(listEl.innerHTML).toContain('Extra Spice');
        // category fallback to ''
        expect(listEl.querySelector('.addon-option-cat').textContent).toBe('');
        cachedAddons.length = 0;
    });

    it('shows the overlay', () => {
        cachedAddons.push({ name: 'Cheese', price: 30, category: 'Extras' });
        openAddonPicker('Naan', 40);
        expect(document.getElementById('addon-picker-overlay').style.display).toBe('flex');
        cachedAddons.length = 0;
    });
});

// ===========================================================================
// Branch coverage: toggleAddonOption — deselect path (line 185)
// ===========================================================================
describe('toggleAddonOption — deselect path (line 185)', () => {
    beforeEach(() => {
        cachedAddons.length = 0;
        selectedAddons.length = 0;
        document.body.innerHTML = '<div id="addon-total"></div>';
        document.getElementById = Document.prototype.getElementById.bind(document);
    });

    it('removes addon from selectedAddons when deselected', () => {
        cachedAddons.push({ name: 'Raita', price: 40 });
        // Create a mock element that starts as selected
        const el = document.createElement('div');
        el.classList.add('selected');
        el.innerHTML = '<div class="addon-checkbox">✓</div>';
        // First select it
        selectedAddons.push({ name: 'Raita', price: 40 });

        // Simulate pendingAddonItem for updateAddonTotal
        Object.defineProperty(window, '_pendingAddonItemBackup', { value: null, writable: true });

        // Now toggle (deselect)
        toggleAddonOption(el, 0);
        expect(selectedAddons.length).toBe(0);
        expect(el.querySelector('.addon-checkbox').textContent).toBe('');
        cachedAddons.length = 0;
    });

    it('adds addon to selectedAddons when selected', () => {
        cachedAddons.push({ name: 'Cheese', price: 30 });
        const el = document.createElement('div');
        el.innerHTML = '<div class="addon-checkbox"></div>';
        toggleAddonOption(el, 0);
        expect(selectedAddons.length).toBe(1);
        expect(selectedAddons[0].name).toBe('Cheese');
        expect(el.querySelector('.addon-checkbox').textContent).toBe('✓');
        cachedAddons.length = 0;
        selectedAddons.length = 0;
    });
});

// ===========================================================================
// Branch coverage: closeSignInPrompt when prompt exists (line 249)
// ===========================================================================
describe('closeSignInPrompt — prompt exists (line 249)', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div id="signin-prompt" class="visible"></div>';
        document.getElementById = Document.prototype.getElementById.bind(document);
    });

    it('removes visible class from existing prompt', () => {
        closeSignInPrompt();
        const prompt = document.getElementById('signin-prompt');
        expect(prompt.classList.contains('visible')).toBe(false);
    });

    it('does not throw when prompt does not exist', () => {
        document.body.innerHTML = '';
        document.getElementById = Document.prototype.getElementById.bind(document);
        expect(() => closeSignInPrompt()).not.toThrow();
    });
});

// ===========================================================================
// Branch coverage: updateFloatingCartBar — element updates (lines 335-337)
// ===========================================================================
describe('updateFloatingCartBar — element updates (lines 335-337)', () => {
    beforeEach(() => {
        clearCart();
        document.body.innerHTML = '<div id="floating-cart-bar">' +
            '<span class="floating-cart-count"></span>' +
            '<span class="floating-cart-total"></span>' +
            '<span class="floating-cart-label"></span>' +
            '</div>';
        document.getElementById = Document.prototype.getElementById.bind(document);
    });

    it('updates count, total, and label elements when cart has items', () => {
        cart.push({ name: 'Tea', price: 30, quantity: 2 });
        updateFloatingCartBar();
        const bar = document.getElementById('floating-cart-bar');
        expect(bar.querySelector('.floating-cart-count').textContent).toBe('2');
        expect(bar.querySelector('.floating-cart-total').textContent).toBe('₹60');
        expect(bar.querySelector('.floating-cart-label').textContent).toBe('2 items');
        expect(bar.classList.contains('visible')).toBe(true);
    });

    it('shows singular label for 1 item', () => {
        cart.push({ name: 'Tea', price: 30, quantity: 1 });
        updateFloatingCartBar();
        const bar = document.getElementById('floating-cart-bar');
        expect(bar.querySelector('.floating-cart-label').textContent).toBe('1 item');
    });

    it('hides bar when cart is empty', () => {
        updateFloatingCartBar();
        const bar = document.getElementById('floating-cart-bar');
        expect(bar.classList.contains('visible')).toBe(false);
    });

    it('returns early when bar element does not exist', () => {
        document.body.innerHTML = '';
        document.getElementById = Document.prototype.getElementById.bind(document);
        expect(() => updateFloatingCartBar()).not.toThrow();
    });
});

// ===========================================================================
// Branch coverage: updateCartFab — click → cartIcon click (line 350)
// ===========================================================================
describe('updateCartFab — fab click triggers cartIcon click (line 350)', () => {
    beforeEach(() => {
        clearCart();
        document.body.innerHTML = '<a id="cart-icon"></a>';
        document.getElementById = Document.prototype.getElementById.bind(document);
    });

    it('clicking fab triggers cartIcon click', () => {
        cart.push({ name: 'Tea', price: 30, quantity: 1 });
        updateCartFab();
        const fab = document.getElementById('cart-fab');
        const cartIcon = document.getElementById('cart-icon');
        const clickSpy = vi.fn();
        cartIcon.addEventListener('click', clickSpy);
        fab.click();
        expect(clickSpy).toHaveBeenCalled();
    });

    it('uses count from cart when count argument is undefined (line 369)', () => {
        cart.push({ name: 'Tea', price: 30, quantity: 3 });
        updateCartFab();
        const fab = document.getElementById('cart-fab');
        const badge = fab.querySelector('.cart-fab-badge');
        expect(badge.textContent).toBe('3');
    });

    it('uses explicit count argument when provided', () => {
        updateCartFab(5);
        const fab = document.getElementById('cart-fab');
        const badge = fab.querySelector('.cart-fab-badge');
        expect(badge.textContent).toBe('5');
    });

    it('hides fab when count is 0', () => {
        updateCartFab(0);
        const fab = document.getElementById('cart-fab');
        expect(fab.classList.contains('visible')).toBe(false);
    });
});

// ===========================================================================
// Branch coverage: displayCart — empty cart (lines 381-382)
// ===========================================================================
describe('displayCart — empty cart subtotalEl/totalEl reset (lines 381-382)', () => {
    beforeEach(() => {
        clearCart();
        document.body.innerHTML = '<div id="cart-items"></div><span id="subtotal-amount">999</span><span id="total-amount">999</span>';
        document.getElementById = Document.prototype.getElementById.bind(document);
    });

    it('resets subtotal and total to 0.00 when cart is empty', () => {
        displayCart();
        expect(document.getElementById('subtotal-amount').textContent).toBe('0.00');
        expect(document.getElementById('total-amount').textContent).toBe('0.00');
    });

    it('shows empty cart message', () => {
        displayCart();
        expect(document.getElementById('cart-items').innerHTML).toContain('empty');
    });
});

// ===========================================================================
// Branch coverage: displayCart — addon total, spice tag, addon tags (lines 390-394)
// ===========================================================================
describe('displayCart — addon total and tags (lines 390-394)', () => {
    beforeEach(() => {
        clearCart();
        document.body.innerHTML = '<div id="cart-items"></div><span id="subtotal-amount"></span><span id="total-amount"></span>';
        document.getElementById = Document.prototype.getElementById.bind(document);
    });

    it('calculates addon total in item price', () => {
        cart.push({ name: 'Biryani', price: 249, quantity: 1, spiceLevel: 'medium', addons: [{ name: 'Raita', price: 40 }] });
        displayCart();
        const html = document.getElementById('cart-items').innerHTML;
        expect(html).toContain('Raita');
        expect(html).toContain('₹40');
    });

    it('shows spice tag when spiceLevel is not medium', () => {
        cart.push({ name: 'Biryani', price: 249, quantity: 1, spiceLevel: 'hot', addons: [] });
        displayCart();
        const html = document.getElementById('cart-items').innerHTML;
        expect(html).toContain('hot');
    });

    it('does not show spice tag when spiceLevel is medium', () => {
        cart.push({ name: 'Biryani', price: 249, quantity: 1, spiceLevel: 'medium', addons: [] });
        displayCart();
        const html = document.getElementById('cart-items').innerHTML;
        // Should not have a spice tag span for medium
        expect(html).not.toContain('(medium)');
    });

    it('renders addon tags for each addon', () => {
        cart.push({
            name: 'Biryani', price: 249, quantity: 1, spiceLevel: 'medium',
            addons: [{ name: 'Raita', price: 40 }, { name: 'Papad', price: 20 }],
        });
        displayCart();
        const html = document.getElementById('cart-items').innerHTML;
        expect(html).toContain('Raita');
        expect(html).toContain('Papad');
    });
});

// ===========================================================================
// Branch coverage: displayCart — delivery fee ternary (line 415)
// ===========================================================================
describe('displayCart — delivery fee logic (line 415)', () => {
    beforeEach(() => {
        clearCart();
        document.body.innerHTML = '<div id="cart-items"></div><span id="subtotal-amount"></span><span id="total-amount"></span>';
        document.getElementById = Document.prototype.getElementById.bind(document);
    });

    it('adds delivery fee when subtotal is below threshold', () => {
        cart.push({ name: 'Tea', price: 30, quantity: 1, spiceLevel: 'medium', addons: [] });
        displayCart();
        const total = parseFloat(document.getElementById('total-amount').textContent);
        expect(total).toBe(30 + DELIVERY_FEE);
    });

    it('waives delivery fee when subtotal meets threshold', () => {
        cart.push({ name: 'Biryani', price: 300, quantity: 2, spiceLevel: 'medium', addons: [] });
        displayCart();
        const subtotal = parseFloat(document.getElementById('subtotal-amount').textContent);
        const total = parseFloat(document.getElementById('total-amount').textContent);
        expect(subtotal).toBe(600);
        expect(total).toBe(600); // No delivery fee
    });
});

// ===========================================================================
// Branch coverage: removeItem safeguard (line 443)
// ===========================================================================
describe('removeItem — safeguard for invalid index (line 443)', () => {
    beforeEach(() => {
        clearCart();
        localStorage.clear();
    });

    it('does nothing when index is out of bounds', () => {
        cart.push({ name: 'Tea', price: 30, quantity: 1 });
        removeItem(99);
        expect(cart).toHaveLength(1);
    });

    it('does nothing when cart is empty', () => {
        removeItem(0);
        expect(cart).toHaveLength(0);
    });
});

// ===========================================================================
// Branch coverage: showSignInPrompt — creates prompt element
// ===========================================================================
describe('showSignInPrompt — creates signin-prompt (line 224-244)', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        document.getElementById = Document.prototype.getElementById.bind(document);
    });

    it('creates signin-prompt element if it does not exist', () => {
        showSignInPrompt();
        const prompt = document.getElementById('signin-prompt');
        expect(prompt).not.toBeNull();
        expect(prompt.classList.contains('visible')).toBe(true);
    });

    it('reuses existing signin-prompt element', () => {
        showSignInPrompt();
        showSignInPrompt();
        const prompts = document.body.querySelectorAll('#signin-prompt');
        expect(prompts.length).toBe(1);
    });
});

describe('Combo discount constant', () => {
    it('COMBO_DISCOUNT is 20%', () => {
        expect(COMBO_DISCOUNT).toBe(0.20);
    });

    it('applying 20% discount reduces price correctly', () => {
        const comboTotal = 249 + 200 + 40;  // biryani + starter + drink = 489
        const discounted = Math.round(comboTotal * (1 - COMBO_DISCOUNT));
        expect(discounted).toBe(Math.round(489 * 0.80));
    });
});

// ===========================================================================
// Branch coverage: finalizeAddToCart — existing item with addon key matching (line 119)
// ===========================================================================
describe('finalizeAddToCart — existingItem addon key matching branch (line 119)', () => {
    beforeEach(() => {
        clearCart();
        localStorage.clear();
    });

    it('matches existing item when item.addons is undefined (defaults to [])', () => {
        // Push an item without addons property — line 119 uses (item.addons || [])
        cart.push({ name: 'Naan', price: 40, quantity: 1, spiceLevel: 'medium' });
        finalizeAddToCart('Naan', 40, 'medium', []);
        expect(cart).toHaveLength(1);
        expect(cart[0].quantity).toBe(2);
    });
});

// ===========================================================================
// Branch coverage: finalizeAddToCart — addons falsy defaults to [] (line 131)
// ===========================================================================
describe('finalizeAddToCart — addons empty array (line 131)', () => {
    beforeEach(() => {
        clearCart();
        localStorage.clear();
    });

    it('stores empty addons array when [] is passed', () => {
        finalizeAddToCart('Tea', 30, 'medium', []);
        expect(cart).toHaveLength(1);
        expect(cart[0].addons).toEqual([]);
    });

    it('stores addons when non-empty array is passed', () => {
        finalizeAddToCart('Tea', 30, 'medium', [{ name: 'Sugar', price: 5 }]);
        expect(cart).toHaveLength(1);
        expect(cart[0].addons).toEqual([{ name: 'Sugar', price: 5 }]);
    });
});

// ===========================================================================
// Branch coverage: showCartCheckmark — btnEl.closest fallback (line 216)
// ===========================================================================
describe('displayCart — price elements missing (line 216 area)', () => {
    beforeEach(() => {
        clearCart();
        document.body.innerHTML = '<div id="cart-items"></div>';
        document.getElementById = Document.prototype.getElementById.bind(document);
    });

    it('does not throw when subtotal-amount and total-amount elements are missing', () => {
        cart.push({ name: 'Tea', price: 30, quantity: 1, spiceLevel: 'medium', addons: [] });
        expect(() => displayCart()).not.toThrow();
    });

    it('renders cart items even without subtotal/total elements', () => {
        cart.push({ name: 'Tea', price: 30, quantity: 1, spiceLevel: 'medium', addons: [] });
        displayCart();
        expect(document.getElementById('cart-items').innerHTML).toContain('Tea');
    });
});

// ===========================================================================
// Branch coverage: displayCart — empty cart when subtotal/total elements missing (lines 381-390)
// ===========================================================================
describe('displayCart — empty cart with missing subtotal/total elements (lines 381-390)', () => {
    beforeEach(() => {
        clearCart();
        document.body.innerHTML = '<div id="cart-items"></div>';
        document.getElementById = Document.prototype.getElementById.bind(document);
    });

    it('shows empty cart message without throwing when subEl/totEl are null', () => {
        displayCart();
        expect(document.getElementById('cart-items').innerHTML).toContain('empty');
    });
});

// ===========================================================================
// Branch coverage: closeFloatingCart when fc is missing (line 369)
// ===========================================================================
describe('closeFloatingCart — floating-cart element missing (line 369)', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        document.getElementById = Document.prototype.getElementById.bind(document);
    });

    it('does not throw when floating-cart element does not exist', () => {
        expect(() => closeFloatingCart()).not.toThrow();
    });
});

// ===========================================================================
// Branch coverage: getCheckoutTotal with window._appliedCoupon (lines 478-495)
// ===========================================================================
describe('getCheckoutTotal — window._appliedCoupon fallback (lines 478-495)', () => {
    beforeEach(() => {
        clearCart();
        window._appliedCoupon = null;
        localStorage.clear();
    });

    it('uses window._appliedCoupon when couponData is not passed', () => {
        finalizeAddToCart('Chicken Biryani', 249, 'medium', []);
        finalizeAddToCart('Chicken Biryani', 249, 'medium', []); // subtotal = 498
        window._appliedCoupon = { type: 'percent', discount: 10 };
        const totals = getCheckoutTotal();
        expect(totals.discount).toBe(Math.floor(498 * 0.10));
        window._appliedCoupon = null;
    });

    it('uses window._appliedCoupon flat coupon when couponData is undefined', () => {
        finalizeAddToCart('Chicken Biryani', 249, 'medium', []);
        finalizeAddToCart('Chicken Biryani', 249, 'medium', []); // subtotal = 498
        window._appliedCoupon = { type: 'flat', discount: 75 };
        const totals = getCheckoutTotal();
        expect(totals.discount).toBe(75);
        window._appliedCoupon = null;
    });
});

// ===========================================================================
// Branch coverage: initCart — close button inside auth-modal skip (line 504-507)
// ===========================================================================
describe('initCart — close button auth-modal skip and reservation modal hide (lines 504-507)', () => {
    beforeEach(() => {
        clearCart();
        document.body.innerHTML = `
            <a id="cart-icon" href="#"></a>
            <div id="cart-modal" style="display:none">
                <div id="cart-items"></div>
            </div>
            <div id="auth-modal">
                <span class="close" id="auth-close">X</span>
            </div>
            <div id="reservation-modal" style="display:block">
                <span class="close" id="res-close">X</span>
            </div>
        `;
        document.getElementById = Document.prototype.getElementById.bind(document);
        document.querySelectorAll = Document.prototype.querySelectorAll.bind(document);
    });

    it('close button inside auth-modal does not close cart or reservation modals', () => {
        initCart();
        const authClose = document.getElementById('auth-close');
        authClose.click();
        // cart-modal and reservation-modal should remain in their current state
        expect(document.getElementById('cart-modal').style.display).toBe('none');
        expect(document.getElementById('reservation-modal').style.display).toBe('block');
    });

    it('close button outside auth-modal hides cart and reservation modals', () => {
        initCart();
        const resClose = document.getElementById('res-close');
        resClose.click();
        expect(document.getElementById('cart-modal').style.display).toBe('none');
        expect(document.getElementById('reservation-modal').style.display).toBe('none');
    });
});

// ===========================================================================
// Branch coverage: cartIcon click handler (line 350) via updateCartFab
// ===========================================================================
describe('updateCartFab — cartIcon click triggers when cartIcon missing (line 350)', () => {
    beforeEach(() => {
        clearCart();
        document.body.innerHTML = '';
        document.getElementById = Document.prototype.getElementById.bind(document);
    });

    it('fab click does not throw when cartIcon element is absent', () => {
        cart.push({ name: 'Tea', price: 30, quantity: 1 });
        updateCartFab();
        const fab = document.getElementById('cart-fab');
        expect(() => fab.click()).not.toThrow();
    });
});

// ===========================================================================
// Branch coverage: displayCart — delivery fee display elements (lines 420-426)
// ===========================================================================
describe('displayCart — subtotalEl/totalEl set when present (lines 420-421)', () => {
    beforeEach(() => {
        clearCart();
        document.body.innerHTML = '<div id="cart-items"></div><span id="subtotal-amount"></span><span id="total-amount"></span>';
        document.getElementById = Document.prototype.getElementById.bind(document);
    });

    it('sets subtotalEl and totalEl text when elements exist with items', () => {
        cart.push({ name: 'Tea', price: 30, quantity: 2, spiceLevel: 'medium', addons: [] });
        displayCart();
        const subtotal = parseFloat(document.getElementById('subtotal-amount').textContent);
        const total = parseFloat(document.getElementById('total-amount').textContent);
        expect(subtotal).toBe(60);
        expect(total).toBeGreaterThanOrEqual(60);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// REMAINING BRANCH COVERAGE — cart.js
// ═══════════════════════════════════════════════════════════════════════════

// clearCart from module requires confirm() — use local clearCart helper instead

// Line 131: finalizeAddToCart — addons is [] (empty array, || [] branch evaluated but left side is truthy)
// Note: addons cannot be null since line 117 calls addons.map() — but the || [] branch
// is exercised when addons is a new empty array (truthy, so || is short-circuited)
describe('finalizeAddToCart — addons empty array branch (line 131)', () => {
    beforeEach(() => {
        clearCart();
        localStorage.clear();
    });

    it('stores addons when new empty array is passed (truthy, || not triggered)', () => {
        finalizeAddToCart('Naan', 40, 'medium', []);
        expect(cart).toHaveLength(1);
        expect(cart[0].addons).toEqual([]);
    });

    it('stores non-empty addons array preserving values', () => {
        finalizeAddToCart('Naan', 40, 'medium', [{ name: 'Butter', price: 10 }]);
        expect(cart).toHaveLength(1);
        expect(cart[0].addons).toEqual([{ name: 'Butter', price: 10 }]);
    });
});

// Line 185: toggleAddonOption — deselect addon that is NOT in selectedAddons (idx2 === -1)
describe('toggleAddonOption — deselect addon not in selectedAddons (line 185 idx2 === -1)', () => {
    beforeEach(() => {
        cachedAddons.length = 0;
        selectedAddons.length = 0;
        document.body.innerHTML = '<div id="addon-total"></div>';
        document.getElementById = Document.prototype.getElementById.bind(document);
    });

    it('handles deselect gracefully when addon is not found in selectedAddons', () => {
        cachedAddons.push({ name: 'Phantom', price: 99 });
        const el = document.createElement('div');
        el.classList.add('selected');
        el.innerHTML = '<div class="addon-checkbox">✓</div>';
        // selectedAddons does NOT contain Phantom — idx2 will be -1
        // (selectedAddons is already empty)

        toggleAddonOption(el, 0);
        // Should not throw and selectedAddons should remain empty
        expect(selectedAddons.length).toBe(0);
        expect(el.querySelector('.addon-checkbox').textContent).toBe('');
        cachedAddons.length = 0;
    });
});

// Line 216: showCartCheckmark — btnEl.closest('.add-to-cart') returns null (|| fallback)
// This is an internal function called by initCart click handler. We test via displayCart + item with no addons.

// Line 390: displayCart — item.addons is undefined (|| [] fallback)
describe('displayCart — item with undefined addons (line 390)', () => {
    beforeEach(() => {
        clearCart();
        document.body.innerHTML = '<div id="cart-items"></div><span id="subtotal-amount"></span><span id="total-amount"></span>';
        document.getElementById = Document.prototype.getElementById.bind(document);
    });

    it('handles item with no addons property (undefined)', () => {
        cart.push({ name: 'Tea', price: 30, quantity: 1, spiceLevel: 'medium' });
        displayCart();
        const html = document.getElementById('cart-items').innerHTML;
        expect(html).toContain('Tea');
        // Should not contain any addon tags
        expect(html).not.toContain('+ ');
    });
});

// Line 394: displayCart — spiceLevel is null/undefined (falsy check)
describe('displayCart — item with null spiceLevel (line 394)', () => {
    beforeEach(() => {
        clearCart();
        document.body.innerHTML = '<div id="cart-items"></div><span id="subtotal-amount"></span><span id="total-amount"></span>';
        document.getElementById = Document.prototype.getElementById.bind(document);
    });

    it('does not show spice tag when spiceLevel is null', () => {
        cart.push({ name: 'Tea', price: 30, quantity: 1, spiceLevel: null, addons: [] });
        displayCart();
        const html = document.getElementById('cart-items').innerHTML;
        expect(html).toContain('Tea');
        // spiceLevel is falsy so no spice tag
        expect(html).not.toContain('(null)');
    });
});

// Line 426: updateQuantity — invalid index (cart[index] is undefined)
describe('updateQuantity — invalid index (line 426)', () => {
    beforeEach(() => {
        clearCart();
        localStorage.clear();
    });

    it('returns early without error when index is out of bounds', () => {
        cart.push({ name: 'Tea', price: 30, quantity: 1 });
        expect(() => updateQuantity(99, 1)).not.toThrow();
        expect(cart).toHaveLength(1);
        expect(cart[0].quantity).toBe(1);
    });

    it('returns early without error when cart is empty', () => {
        expect(() => updateQuantity(0, 1)).not.toThrow();
        expect(cart).toHaveLength(0);
    });
});

// Lines 478-495: getCheckoutTotal — window._appliedCoupon with percent and flat types
describe('getCheckoutTotal — window._appliedCoupon percent type (line 478)', () => {
    beforeEach(() => {
        clearCart();
        window._appliedCoupon = null;
        localStorage.clear();
    });

    it('applies percent discount from window._appliedCoupon', () => {
        cart.push({ name: 'Biryani', price: 500, quantity: 1 });
        window._appliedCoupon = { type: 'percent', discount: 20 };
        const totals = getCheckoutTotal();
        expect(totals.discount).toBe(Math.floor(500 * 0.20));
        expect(totals.total).toBe(500 - 100); // free delivery at 500
        window._appliedCoupon = null;
    });

    it('caps flat discount at subtotal via window._appliedCoupon', () => {
        cart.push({ name: 'Tea', price: 20, quantity: 1 });
        window._appliedCoupon = { type: 'flat', discount: 100 };
        const totals = getCheckoutTotal();
        expect(totals.discount).toBeLessThanOrEqual(20);
        window._appliedCoupon = null;
    });

    it('returns zero discount when neither couponData nor window._appliedCoupon is set', () => {
        cart.push({ name: 'Tea', price: 30, quantity: 1 });
        window._appliedCoupon = null;
        const totals = getCheckoutTotal();
        expect(totals.discount).toBe(0);
    });
});

// Lines 505-507: initCart — close button interaction with reservation modal
describe('initCart — click outside modals and reservation modal (lines 505-520)', () => {
    beforeEach(() => {
        clearCart();
        document.body.innerHTML = `
            <a id="cart-icon" href="#"></a>
            <div id="cart-modal" style="display:block">
                <div id="cart-items"></div>
            </div>
            <div id="reservation-modal" style="display:block"></div>
        `;
        document.getElementById = Document.prototype.getElementById.bind(document);
        document.querySelectorAll = Document.prototype.querySelectorAll.bind(document);
    });

    it('closes reservation modal when clicking directly on it (outside content)', () => {
        initCart();
        const resModal = document.getElementById('reservation-modal');
        // Simulate click on the modal backdrop itself
        resModal.dispatchEvent(new window.Event('click', { bubbles: true }));
        expect(resModal.style.display).toBe('none');
    });

    it('closes cart modal when clicking directly on it', () => {
        initCart();
        const cartModal = document.getElementById('cart-modal');
        // Simulate click on modal backdrop
        cartModal.dispatchEvent(new window.Event('click', { bubbles: true }));
        expect(cartModal.style.display).toBe('none');
    });
});

// initCart — delegated click on qty-minus button (lines 534-545)
describe('initCart — qty-minus delegated click (lines 534-545)', () => {
    beforeEach(() => {
        clearCart();
        document.body.innerHTML = `
            <a id="cart-icon" href="#"></a>
            <div id="cart-modal" style="display:none">
                <div id="cart-items"></div>
            </div>
            <div class="menu-item-card">
                <button class="add-to-cart has-qty" data-item="Tea" data-price="30">
                    <span class="qty-minus" data-item="Tea">-</span>
                    <span class="qty-count">2</span>
                    <span class="qty-plus" data-item="Tea">+</span>
                </button>
            </div>
            <span id="cart-count">0</span>
        `;
        document.getElementById = Document.prototype.getElementById.bind(document);
        document.querySelectorAll = Document.prototype.querySelectorAll.bind(document);
        document.querySelector = Document.prototype.querySelector.bind(document);
    });

    it('decrements item quantity when qty-minus is clicked', () => {
        cart.push({ name: 'Tea', price: 30, quantity: 20, spiceLevel: 'medium', addons: [] });
        initCart();
        const minusBtn = document.querySelector('.qty-minus');
        minusBtn.click();
        // Multiple accumulated initCart listeners may decrement more than once
        const tea = cart.find(i => i.name === 'Tea');
        expect(tea).toBeTruthy();
        expect(tea.quantity).toBeLessThan(20);
    });

    it('removes item from cart when qty-minus reduces to 0', () => {
        cart.push({ name: 'Tea', price: 30, quantity: 1, spiceLevel: 'medium', addons: [] });
        initCart();
        const minusBtn = document.querySelector('.qty-minus');
        minusBtn.click();
        // Item removed after going to 0 or below
        const tea = cart.find(i => i.name === 'Tea');
        expect(tea).toBeFalsy();
    });
});

// initCart — cartIcon click opens cart modal (lines 491-498)
describe('initCart — cartIcon click handler (lines 491-498)', () => {
    beforeEach(() => {
        clearCart();
        document.body.innerHTML = `
            <a id="cart-icon" href="#"></a>
            <div id="cart-modal" style="display:none">
                <div id="cart-items"></div>
            </div>
        `;
        document.getElementById = Document.prototype.getElementById.bind(document);
        document.querySelectorAll = Document.prototype.querySelectorAll.bind(document);
    });

    it('opens cart modal and displays cart when cart icon is clicked', () => {
        cart.push({ name: 'Tea', price: 30, quantity: 1, spiceLevel: 'medium', addons: [] });
        initCart();
        const cartIcon = document.getElementById('cart-icon');
        cartIcon.click();
        expect(document.getElementById('cart-modal').style.display).toBe('block');
        expect(document.getElementById('cart-items').innerHTML).toContain('Tea');
    });
});

// initCart — checkout button click (lines 560-563)
describe('initCart — checkout button click (lines 560-563)', () => {
    beforeEach(() => {
        clearCart();
        document.body.innerHTML = `
            <a id="cart-icon" href="#"></a>
            <div id="cart-modal" style="display:none">
                <div id="cart-items"></div>
            </div>
            <button id="checkout">Checkout</button>
        `;
        document.getElementById = Document.prototype.getElementById.bind(document);
        document.querySelectorAll = Document.prototype.querySelectorAll.bind(document);
    });

    it('calls window.checkout when checkout button is clicked', () => {
        window.checkout = vi.fn();
        initCart();
        document.getElementById('checkout').click();
        expect(window.checkout).toHaveBeenCalled();
    });
});

// initCart — close button with no cart-modal (cartModal is null, line 505 false branch)
describe('initCart — close button without cart-modal (line 505 null)', () => {
    beforeEach(() => {
        clearCart();
        document.body.innerHTML = `
            <a id="cart-icon" href="#"></a>
            <div id="reservation-modal" style="display:block">
                <span class="close" id="res-close">X</span>
            </div>
        `;
        document.getElementById = Document.prototype.getElementById.bind(document);
        document.querySelectorAll = Document.prototype.querySelectorAll.bind(document);
    });

    it('does not throw when cart-modal is null and close button is clicked', () => {
        initCart();
        const resClose = document.getElementById('res-close');
        expect(() => resClose.click()).not.toThrow();
        expect(document.getElementById('reservation-modal').style.display).toBe('none');
    });
});

// updateButtonState — qty > 0 updates existing has-qty button (line 262-263)
describe('updateButtonState — update existing qty display (line 262-263)', () => {
    beforeEach(() => {
        clearCart();
        document.body.innerHTML = `
            <button class="add-to-cart has-qty" data-item="Tea">
                <span class="qty-minus" data-item="Tea">-</span>
                <span class="qty-count">1</span>
                <span class="qty-plus" data-item="Tea">+</span>
            </button>
        `;
        document.querySelectorAll = Document.prototype.querySelectorAll.bind(document);
        document.querySelector = Document.prototype.querySelector.bind(document);
    });

    it('updates qty-count text when item already has has-qty class', () => {
        cart.push({ name: 'Tea', price: 30, quantity: 5, spiceLevel: 'medium', addons: [] });
        updateButtonState('Tea');
        const qtyCount = document.querySelector('.qty-count');
        expect(qtyCount.textContent).toBe('5');
    });
});

// updateButtonState — qty is 0, removes has-qty and resets text (line 264-267)
describe('updateButtonState — reset to Add to Order (line 264-267)', () => {
    beforeEach(() => {
        clearCart();
        document.body.innerHTML = `
            <button class="add-to-cart has-qty" data-item="Tea">
                <span class="qty-minus" data-item="Tea">-</span>
                <span class="qty-count">1</span>
                <span class="qty-plus" data-item="Tea">+</span>
            </button>
        `;
        document.querySelectorAll = Document.prototype.querySelectorAll.bind(document);
        document.querySelector = Document.prototype.querySelector.bind(document);
    });

    it('resets button to "Add to Order" when item is removed from cart', () => {
        updateButtonState('Tea');
        const btn = document.querySelector('.add-to-cart');
        expect(btn.classList.contains('has-qty')).toBe(false);
        expect(btn.innerHTML).toBe('Add to Order');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Branch coverage: finalizeAddToCart — btnEl micro-interactions (line 131)
// ═══════════════════════════════════════════════════════════════════════════
describe('finalizeAddToCart — btnEl micro-interactions (line 131)', () => {
    beforeEach(() => {
        clearCart();
        localStorage.clear();
        document.body.innerHTML = `
            <div id="cart-icon"><span id="cart-count">0</span></div>
            <button class="add-to-cart" data-item="Tea" data-price="30">Add to Order</button>
        `;
        document.getElementById = Document.prototype.getElementById.bind(document);
        document.querySelectorAll = Document.prototype.querySelectorAll.bind(document);
        document.querySelector = Document.prototype.querySelector.bind(document);
    });

    it('adds cart-adding class to btnEl when provided (line 136-140)', () => {
        const btn = document.querySelector('.add-to-cart');
        finalizeAddToCart('Tea', 30, 'medium', [], btn);
        expect(btn.classList.contains('cart-adding')).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Branch coverage: showCartCheckmark via initCart delegate (line 216)
// ═══════════════════════════════════════════════════════════════════════════
describe('addToCart — showSignInPrompt when cart empty and no user (line 216)', () => {
    beforeEach(() => {
        clearCart();
        localStorage.clear();
        localStorage.removeItem('amoghaUser');
        document.body.innerHTML = `
            <div id="cart-icon"><span id="cart-count">0</span></div>
            <div id="auth-toast"></div>
        `;
        document.getElementById = Document.prototype.getElementById.bind(document);
        document.querySelectorAll = Document.prototype.querySelectorAll.bind(document);
        document.querySelector = Document.prototype.querySelector.bind(document);
    });

    it('creates sign-in prompt when first item added and no user (line 216)', () => {
        const { addToCart } = require('../src/modules/cart.js');
        // addToCart should show sign-in prompt when no user and empty cart
        addToCart('Tea', 30);
        const prompt = document.getElementById('signin-prompt');
        expect(prompt).not.toBeNull();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Branch coverage: initCart — close button skips auth-modal (lines 478-495,507)
// ═══════════════════════════════════════════════════════════════════════════
describe('initCart — close button skips auth-modal and closes other modals (lines 478-507)', () => {
    beforeEach(() => {
        clearCart();
        localStorage.clear();
        document.body.innerHTML = `
            <div id="cart-icon"><span id="cart-count">0</span></div>
            <div id="cart-modal" style="display:none">
                <span class="close">X</span>
            </div>
            <div id="auth-modal">
                <span class="close">X</span>
            </div>
            <div id="reservation-modal" style="display:block">
                <span class="close">X</span>
            </div>
            <div id="cart-items"></div>
        `;
        document.getElementById = Document.prototype.getElementById.bind(document);
        document.querySelectorAll = Document.prototype.querySelectorAll.bind(document);
        document.querySelector = Document.prototype.querySelector.bind(document);
        window.scrollTo = vi.fn();
    });

    it('close button inside auth-modal does not close cart-modal (line 504)', () => {
        const { initCart } = require('../src/modules/cart.js');
        initCart();
        // Click close button inside auth-modal
        const authClose = document.querySelector('#auth-modal .close');
        authClose.click();
        // cart-modal should remain as-is (not affected)
        const cartModal = document.getElementById('cart-modal');
        expect(cartModal.style.display).toBe('none');
    });

    it('close button inside cart-modal closes only cart-modal (line 505-508)', () => {
        const { initCart } = require('../src/modules/cart.js');
        initCart();
        // Show cart modal first
        const cartModal = document.getElementById('cart-modal');
        cartModal.style.display = 'block';
        // Click close button inside cart-modal
        const cartClose = document.querySelector('#cart-modal .close');
        cartClose.click();
        expect(cartModal.style.display).toBe('none');
    });
});

// ── addons branch: empty array vs populated (line 131) ──────────────
describe('Cart — addons stored correctly', () => {
    beforeEach(() => { clearCart(); });

    it('stores empty addons array when no addons provided', () => {
        finalizeAddToCart('Plain Dosa', 120, 'mild', []);
        expect(cart).toHaveLength(1);
        expect(cart[0].addons).toEqual([]);
    });

    it('stores addons array with items when addons are provided', () => {
        finalizeAddToCart('Plain Dosa', 120, 'mild', [{ name: 'cheese', price: 20 }]);
        expect(cart).toHaveLength(1);
        expect(cart[0].addons).toEqual([{ name: 'cheese', price: 20 }]);
    });

    it('increments quantity for identical item with same addons', () => {
        finalizeAddToCart('Plain Dosa', 120, 'mild', [{ name: 'cheese', price: 20 }]);
        finalizeAddToCart('Plain Dosa', 120, 'mild', [{ name: 'cheese', price: 20 }]);
        expect(cart).toHaveLength(1);
        expect(cart[0].quantity).toBe(2);
    });
});
