import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    cart,
    addToCart,
    displayCart,
    updateCartCount,
    updateButtonState,
    updateFloatingCart,
    updateCartFab,
    updateFloatingCartBar,
    closeFloatingCart,
    showSignInPrompt,
    closeSignInPrompt,
    clearCart,
    loadCart,
    saveCart,
    restoreButtonStates,
    finalizeAddToCart,
    openAddonPicker,
    toggleAddonOption,
    updateAddonTotal,
    closeAddonPicker,
    confirmAddonSelection,
    cachedAddons,
    pendingAddonItem,
    selectedAddons,
    initAddonCache,
} from '../src/modules/cart.js';

function setCart(items) {
    cart.length = 0;
    items.forEach(i => cart.push(i));
}

function clearCartArray() {
    cart.length = 0;
}

const CART_DOM = `
    <span id="cart-count">0</span>
    <div id="cart-items"></div>
    <span id="subtotal-amount">0</span>
    <span id="total-amount">0</span>
    <div id="floating-cart"><div class="fc-items"></div><div class="fc-total"></div></div>
    <div id="cart-fab"><span class="cart-fab-badge">0</span></div>
    <div id="floating-cart-bar">
        <span class="floating-cart-count">0</span>
        <span class="floating-cart-total">0</span>
        <span class="floating-cart-label">0 items</span>
    </div>
    <div id="cart-modal" style="display:none"></div>
    <div id="signin-prompt"></div>
    <div id="auth-toast"></div>
    <div id="addon-picker-overlay" style="display:none">
        <div id="addon-item-name"></div>
        <div id="addon-sheet-list"></div>
        <div id="addon-total"></div>
    </div>
`;

function setupDOM() {
    document.body.innerHTML = CART_DOM;
    document.getElementById = (id) => document.body.querySelector('#' + id);
    document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
    document.querySelector = (sel) => document.body.querySelector(sel);
}

// ═══════════════════════════════════════════════════════════════════════════
// updateCartCount
// ═══════════════════════════════════════════════════════════════════════════
describe('updateCartCount', () => {
    beforeEach(() => { clearCartArray(); setupDOM(); });

    it('sets cart-count element to total item quantity', () => {
        setCart([{ name: 'A', price: 10, quantity: 2 }, { name: 'B', price: 20, quantity: 3 }]);
        updateCartCount();
        expect(document.getElementById('cart-count').textContent).toBe('5');
    });

    it('sets count to 0 for empty cart', () => {
        updateCartCount();
        expect(document.getElementById('cart-count').textContent).toBe('0');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// displayCart
// ═══════════════════════════════════════════════════════════════════════════
describe('displayCart', () => {
    beforeEach(() => { clearCartArray(); setupDOM(); });

    it('shows empty cart message when cart is empty', () => {
        displayCart();
        expect(document.getElementById('cart-items').innerHTML).toContain('empty');
    });

    it('renders cart items with names and quantities', () => {
        setCart([{ name: 'Biryani', price: 249, quantity: 2, spiceLevel: 'medium', addons: [] }]);
        displayCart();
        const html = document.getElementById('cart-items').innerHTML;
        expect(html).toContain('Biryani');
        expect(html).toContain('2');
    });

    it('calculates and displays subtotal', () => {
        setCart([{ name: 'Item', price: 100, quantity: 3, addons: [] }]);
        displayCart();
        expect(document.getElementById('subtotal-amount').textContent).toBe('300.00');
    });

    it('includes addon prices in item total', () => {
        setCart([{ name: 'Biryani', price: 249, quantity: 1, addons: [{ name: 'Cheese', price: 30 }] }]);
        displayCart();
        // (249 + 30) * 1 = 279
        expect(document.getElementById('subtotal-amount').textContent).toBe('279.00');
    });

    it('shows spice tag for non-medium spice levels', () => {
        setCart([{ name: 'Curry', price: 200, quantity: 1, spiceLevel: 'spicy', addons: [] }]);
        displayCart();
        expect(document.getElementById('cart-items').innerHTML).toContain('spicy');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// updateButtonState
// ═══════════════════════════════════════════════════════════════════════════
describe('updateButtonState', () => {
    beforeEach(() => { clearCartArray(); });

    it('sets has-qty class and shows quantity when item is in cart', () => {
        document.body.innerHTML = '<button class="add-to-cart" data-item="Biryani">Add to Order</button>';
        document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
        setCart([{ name: 'Biryani', price: 249, quantity: 3 }]);
        updateButtonState('Biryani');
        const btn = document.body.querySelector('[data-item="Biryani"]');
        expect(btn.classList.contains('has-qty')).toBe(true);
        expect(btn.innerHTML).toContain('3');
    });

    it('removes has-qty class when item is not in cart', () => {
        document.body.innerHTML = '<button class="add-to-cart has-qty" data-item="Biryani"><span class="qty-count">2</span></button>';
        document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
        updateButtonState('Biryani');
        const btn = document.body.querySelector('[data-item="Biryani"]');
        expect(btn.classList.contains('has-qty')).toBe(false);
        expect(btn.innerHTML).toBe('Add to Order');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// updateFloatingCart
// ═══════════════════════════════════════════════════════════════════════════
describe('updateFloatingCart', () => {
    beforeEach(() => { clearCartArray(); setupDOM(); });

    it('removes visible class when cart is empty', () => {
        const fc = document.getElementById('floating-cart');
        fc.classList.add('visible');
        updateFloatingCart();
        expect(fc.classList.contains('visible')).toBe(false);
    });

    it('adds visible class and renders items when cart has items', () => {
        setCart([{ name: 'Tea', price: 30, quantity: 2 }]);
        updateFloatingCart();
        const fc = document.getElementById('floating-cart');
        expect(fc.classList.contains('visible')).toBe(true);
        expect(fc.querySelector('.fc-items').innerHTML).toContain('Tea');
        expect(fc.querySelector('.fc-total').textContent).toContain('60');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// updateCartFab
// ═══════════════════════════════════════════════════════════════════════════
describe('updateCartFab', () => {
    beforeEach(() => { clearCartArray(); setupDOM(); });

    it('shows fab with badge count when cart has items', () => {
        setCart([{ name: 'Item', price: 100, quantity: 5 }]);
        updateCartFab();
        const fab = document.getElementById('cart-fab');
        expect(fab.classList.contains('visible')).toBe(true);
        expect(fab.querySelector('.cart-fab-badge').textContent).toBe('5');
    });

    it('hides fab when cart is empty', () => {
        updateCartFab();
        const fab = document.getElementById('cart-fab');
        expect(fab.classList.contains('visible')).toBe(false);
    });

    it('accepts explicit count parameter', () => {
        updateCartFab(7);
        expect(document.getElementById('cart-fab').querySelector('.cart-fab-badge').textContent).toBe('7');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// updateFloatingCartBar
// ═══════════════════════════════════════════════════════════════════════════
describe('updateFloatingCartBar', () => {
    beforeEach(() => { clearCartArray(); setupDOM(); });

    it('shows bar with count and total when cart has items', () => {
        setCart([{ name: 'A', price: 100, quantity: 2 }, { name: 'B', price: 50, quantity: 1 }]);
        updateFloatingCartBar();
        const bar = document.getElementById('floating-cart-bar');
        expect(bar.classList.contains('visible')).toBe(true);
        expect(bar.querySelector('.floating-cart-count').textContent).toBe('3');
        expect(bar.querySelector('.floating-cart-total').textContent).toBe('₹250');
    });

    it('hides bar when cart is empty', () => {
        const bar = document.getElementById('floating-cart-bar');
        bar.classList.add('visible');
        updateFloatingCartBar();
        expect(bar.classList.contains('visible')).toBe(false);
    });

    it('shows singular label for 1 item', () => {
        setCart([{ name: 'A', price: 100, quantity: 1 }]);
        updateFloatingCartBar();
        expect(document.getElementById('floating-cart-bar').querySelector('.floating-cart-label').textContent).toBe('1 item');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// closeFloatingCart
// ═══════════════════════════════════════════════════════════════════════════
describe('closeFloatingCart', () => {
    beforeEach(() => setupDOM());

    it('removes visible class from floating cart', () => {
        const fc = document.getElementById('floating-cart');
        fc.classList.add('visible');
        closeFloatingCart();
        expect(fc.classList.contains('visible')).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// showSignInPrompt / closeSignInPrompt
// ═══════════════════════════════════════════════════════════════════════════
describe('showSignInPrompt / closeSignInPrompt', () => {
    beforeEach(() => setupDOM());

    it('adds visible class to sign-in prompt', () => {
        showSignInPrompt();
        const prompt = document.getElementById('signin-prompt');
        expect(prompt.classList.contains('visible')).toBe(true);
    });

    it('removes visible class on close', () => {
        showSignInPrompt();
        closeSignInPrompt();
        const prompt = document.getElementById('signin-prompt');
        expect(prompt.classList.contains('visible')).toBe(false);
    });

    it('creates prompt element if not found', () => {
        document.body.innerHTML = '<div id="auth-toast"></div>';
        document.getElementById = (id) => document.body.querySelector('#' + id);
        showSignInPrompt();
        expect(document.getElementById('signin-prompt')).not.toBeNull();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// loadCart / saveCart
// ═══════════════════════════════════════════════════════════════════════════
describe('loadCart / saveCart', () => {
    beforeEach(() => { clearCartArray(); setupDOM(); localStorage.clear(); });

    it('saveCart persists cart to localStorage', () => {
        setCart([{ name: 'Test', price: 50, quantity: 1 }]);
        saveCart();
        const stored = JSON.parse(localStorage.getItem('amoghaCart'));
        expect(stored).toHaveLength(1);
        expect(stored[0].name).toBe('Test');
    });

    it('loadCart restores cart from localStorage', () => {
        localStorage.setItem('amoghaCart', JSON.stringify([{ name: 'Saved', price: 100, quantity: 2 }]));
        loadCart();
        expect(cart).toHaveLength(1);
        expect(cart[0].name).toBe('Saved');
        expect(cart[0].quantity).toBe(2);
    });

    it('loadCart handles empty localStorage gracefully', () => {
        loadCart();
        expect(cart).toHaveLength(0);
    });

    it('loadCart handles invalid JSON gracefully', () => {
        localStorage.setItem('amoghaCart', 'not-json');
        loadCart();
        expect(cart).toHaveLength(0);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// restoreButtonStates
// ═══════════════════════════════════════════════════════════════════════════
describe('restoreButtonStates', () => {
    it('calls updateButtonState for each cart item', () => {
        document.body.innerHTML = '<button class="add-to-cart" data-item="A">Add to Order</button><button class="add-to-cart" data-item="B">Add to Order</button>';
        document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
        setCart([{ name: 'A', price: 10, quantity: 1 }, { name: 'B', price: 20, quantity: 3 }]);
        restoreButtonStates();
        expect(document.body.querySelector('[data-item="A"]').classList.contains('has-qty')).toBe(true);
        expect(document.body.querySelector('[data-item="B"]').classList.contains('has-qty')).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// clearCart
// ═══════════════════════════════════════════════════════════════════════════
describe('clearCart', () => {
    beforeEach(() => { setupDOM(); });

    it('empties the cart array when user confirms', () => {
        setCart([{ name: 'A', price: 10, quantity: 1 }]);
        window.confirm = vi.fn(() => true);
        clearCart();
        expect(cart).toHaveLength(0);
    });

    it('does nothing when user cancels', () => {
        setCart([{ name: 'A', price: 10, quantity: 1 }]);
        window.confirm = vi.fn(() => false);
        clearCart();
        expect(cart).toHaveLength(1);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// addToCart — integration with spice level and addon picker
// ═══════════════════════════════════════════════════════════════════════════
describe('addToCart', () => {
    beforeEach(() => {
        clearCartArray();
        setupDOM();
        cachedAddons.length = 0; // No addons → direct add
        localStorage.clear();
    });

    it('adds item to cart when no addons are cached', () => {
        addToCart('Biryani', 249, null);
        expect(cart).toHaveLength(1);
        expect(cart[0].name).toBe('Biryani');
        expect(cart[0].spiceLevel).toBe('medium');
    });

    it('shows sign-in prompt on first add when user is not logged in', () => {
        addToCart('First Item', 100, null);
        const prompt = document.getElementById('signin-prompt');
        expect(prompt).not.toBeNull();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Addon picker — openAddonPicker, toggleAddonOption, updateAddonTotal,
//                closeAddonPicker, confirmAddonSelection
// ═══════════════════════════════════════════════════════════════════════════
describe('addon picker', () => {
    beforeEach(() => {
        clearCartArray();
        setupDOM();
        cachedAddons.length = 0;
        cachedAddons.push({ name: 'Cheese', price: 30, category: 'Toppings' });
        cachedAddons.push({ name: 'Raita', price: 40, category: 'Sides' });
        selectedAddons.length = 0;
    });

    it('openAddonPicker renders addon list', () => {
        // Manually set pendingAddonItem for the function to work
        Object.assign(window, { pendingAddonItem: { name: 'Biryani', price: 249, spiceLevel: 'medium' } });
        openAddonPicker('Biryani', 249);
        const overlay = document.getElementById('addon-picker-overlay');
        expect(overlay.style.display).toBe('flex');
        expect(document.getElementById('addon-sheet-list').innerHTML).toContain('Cheese');
        expect(document.getElementById('addon-sheet-list').innerHTML).toContain('Raita');
    });

    it('closeAddonPicker hides overlay and clears state', () => {
        openAddonPicker('Biryani', 249);
        closeAddonPicker();
        expect(document.getElementById('addon-picker-overlay').style.display).toBe('none');
    });

    it('toggleAddonOption adds and removes addons from selection', () => {
        const el = document.createElement('div');
        el.innerHTML = '<div class="addon-checkbox"></div>';
        // Select
        toggleAddonOption(el, 0);
        expect(selectedAddons).toHaveLength(1);
        expect(selectedAddons[0].name).toBe('Cheese');
        expect(el.classList.contains('selected')).toBe(true);
        // Deselect
        toggleAddonOption(el, 0);
        expect(selectedAddons).toHaveLength(0);
        expect(el.classList.contains('selected')).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// initAddonCache
// ═══════════════════════════════════════════════════════════════════════════
describe('initAddonCache', () => {
    beforeEach(() => {
        cachedAddons.length = 0;
        localStorage.clear();
    });

    it('loads addons from fresh localStorage cache', () => {
        const cached = { ts: Date.now(), data: [{ name: 'Extra', price: 20 }] };
        localStorage.setItem('addons_cache', JSON.stringify(cached));
        initAddonCache();
        expect(cachedAddons).toHaveLength(1);
        expect(cachedAddons[0].name).toBe('Extra');
    });

    it('skips stale localStorage cache and fetches from Firestore', async () => {
        const staleCache = { ts: Date.now() - 700000, data: [{ name: 'Old', price: 10 }] };
        localStorage.setItem('addons_cache', JSON.stringify(staleCache));

        const addonData = [{ name: 'Fresh Addon', price: 25 }];
        window.db = {
            collection: vi.fn(() => ({
                where: vi.fn().mockReturnThis(),
                orderBy: vi.fn().mockReturnThis(),
                get: vi.fn(() => Promise.resolve({
                    forEach: (cb) => addonData.forEach(d => cb({ data: () => d })),
                })),
            })),
        };

        initAddonCache();
        await new Promise(r => setTimeout(r, 20));
        expect(cachedAddons.some(a => a.name === 'Fresh Addon')).toBe(true);
    });
});
