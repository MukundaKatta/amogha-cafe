import { safeGetItem, safeSetItem, lockScroll, unlockScroll } from '../core/utils.js';
import { getCurrentUser } from './auth.js';
import { FREE_DELIVERY_THRESHOLD, DELIVERY_FEE } from '../core/constants.js';
import { getDb } from '../core/firebase.js';

// ===== SHOPPING CART =====
export let cart = [];
export let pendingCartItem = null;

// Cached add-ons from Firestore (with localStorage cache)
export var cachedAddons = [];

export function initAddonCache() {
    // Try localStorage first (10-min cache)
    try {
        var cached = localStorage.getItem('addons_cache');
        if (cached) {
            var p = JSON.parse(cached);
            if (p.ts && (Date.now() - p.ts) < 600000 && p.data) {
                cachedAddons.push(...p.data);
                return;
            }
        }
    } catch(e) {}
    var db = getDb();
    if (db) {
        db.collection('addons').where('active', '==', true).orderBy('sortOrder').get().then(function(snap) {
            snap.forEach(function(doc) { cachedAddons.push(doc.data()); });
            try { localStorage.setItem('addons_cache', JSON.stringify({ ts: Date.now(), data: cachedAddons })); } catch(e) {}
        }).catch(function() {});
    }
}

// Pending addon selection state
export var pendingAddonItem = null;
export var selectedAddons = [];

export function loadCart() {
    try {
        const savedCart = safeGetItem('amoghaCart');
        if (savedCart) {
            var parsed = JSON.parse(savedCart);
            // Mutate in-place (never reassign the exported reference)
            cart.length = 0;
            parsed.forEach(function(item) { cart.push(item); });
            updateCartCount();
        }
    } catch(e) { cart.length = 0; }
}

export function saveCart() {
    safeSetItem('amoghaCart', JSON.stringify(cart));
}

export function updateCartCount() {
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    var el = document.getElementById('cart-count');
    if (el) el.textContent = count;
}

export function addToCart(itemName, price, btnEl) {
    // Prompt sign-in on first add (gentle — doesn't block)
    if (cart.length === 0 && !getCurrentUser()) {
        pendingCartItem = { name: itemName, price: price };
        showSignInPrompt();
    }

    // Capture spice level from the card
    var spiceLevel = 'medium';
    if (btnEl) {
        var card = btnEl.closest('.menu-item-card');
        if (card) {
            var activeSpice = card.querySelector('.spice-level.active');
            if (activeSpice) spiceLevel = activeSpice.textContent.trim().toLowerCase();
        }
    }

    // If add-ons available, show picker instead of adding directly
    if (cachedAddons.length > 0) {
        pendingAddonItem = { name: itemName, price: parseFloat(price), spiceLevel: spiceLevel, btnEl: btnEl };
        selectedAddons.length = 0;
        openAddonPicker(itemName, parseFloat(price));
        return;
    }

    finalizeAddToCart(itemName, parseFloat(price), spiceLevel, []);
}

export function finalizeAddToCart(itemName, price, spiceLevel, addons) {
    var addonKey = addons.map(function(a) { return a.name; }).sort().join(',');
    var existingItem = cart.find(function(item) {
        var itemAddonKey = (item.addons || []).map(function(a) { return a.name; }).sort().join(',');
        return item.name === itemName && item.spiceLevel === spiceLevel && itemAddonKey === addonKey;
    });

    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({
            name: itemName,
            price: price,
            quantity: 1,
            spiceLevel: spiceLevel,
            addons: addons || []
        });
    }

    updateCartCount();
    saveCart();
    updateButtonState(itemName);
    updateFloatingCart();
}

export function openAddonPicker(itemName, basePrice) {
    var overlay = document.getElementById('addon-picker-overlay');
    var nameEl = document.getElementById('addon-item-name');
    var listEl = document.getElementById('addon-sheet-list');

    nameEl.textContent = itemName + ' — \u20B9' + basePrice;

    listEl.innerHTML = cachedAddons.map(function(addon, idx) {
        return '<div class="addon-option" data-idx="' + idx + '" onclick="toggleAddonOption(this, ' + idx + ')">' +
            '<div class="addon-checkbox"></div>' +
            '<div class="addon-option-info">' +
                '<div class="addon-option-name">' + addon.name + '</div>' +
                '<div class="addon-option-cat">' + (addon.category || '') + '</div>' +
            '</div>' +
            '<div class="addon-option-price">+\u20B9' + addon.price + '</div>' +
        '</div>';
    }).join('');

    updateAddonTotal();
    overlay.style.display = 'flex';
}

export function toggleAddonOption(el, idx) {
    el.classList.toggle('selected');
    var addon = cachedAddons[idx];
    var checkbox = el.querySelector('.addon-checkbox');

    if (el.classList.contains('selected')) {
        selectedAddons.push({ name: addon.name, price: addon.price });
        checkbox.textContent = '\u2713';
    } else {
        var idx2 = selectedAddons.findIndex(function(a) { return a.name === addon.name; });
        if (idx2 !== -1) selectedAddons.splice(idx2, 1);
        checkbox.textContent = '';
    }
    updateAddonTotal();
}

export function updateAddonTotal() {
    if (!pendingAddonItem) return;
    var addonSum = selectedAddons.reduce(function(s, a) { return s + a.price; }, 0);
    var total = pendingAddonItem.price + addonSum;
    document.getElementById('addon-total').textContent = 'Total: \u20B9' + total;
}

export function closeAddonPicker() {
    document.getElementById('addon-picker-overlay').style.display = 'none';
    // If user closes without confirming, add item without addons
    if (pendingAddonItem) {
        finalizeAddToCart(pendingAddonItem.name, pendingAddonItem.price, pendingAddonItem.spiceLevel, []);
        pendingAddonItem = null;
        selectedAddons.length = 0;
    }
}

export function confirmAddonSelection() {
    if (!pendingAddonItem) return;
    var item = pendingAddonItem;
    var addons = selectedAddons.slice();
    pendingAddonItem = null;
    selectedAddons.length = 0;
    document.getElementById('addon-picker-overlay').style.display = 'none';
    finalizeAddToCart(item.name, item.price, item.spiceLevel, addons);
}

function showCartCheckmark(btnEl) {
    var btn = btnEl.closest('.add-to-cart') || btnEl;
    var check = document.createElement('span');
    check.className = 'atc-checkmark';
    check.textContent = '\u2713';
    btn.appendChild(check);
    setTimeout(function() { check.remove(); }, 800);
}

export function showSignInPrompt() {
    var prompt = document.getElementById('signin-prompt');
    if (!prompt) {
        prompt = document.createElement('div');
        prompt.id = 'signin-prompt';
        prompt.innerHTML = '<div class="signin-prompt-content">' +
            '<span class="signin-prompt-icon">🎉</span>' +
            '<div class="signin-prompt-text">' +
                '<strong>Sign up & get 25% OFF!</strong>' +
                '<span>Create an account to unlock your welcome bonus</span>' +
            '</div>' +
            '<button class="signin-prompt-btn" onclick="closeSignInPrompt(); openAuthModal();">Sign Up</button>' +
            '<button class="signin-prompt-close" onclick="closeSignInPrompt()">&times;</button>' +
        '</div>';
        document.body.appendChild(prompt);
    }
    prompt.classList.remove('visible');
    void prompt.offsetWidth;
    prompt.classList.add('visible');
    // Auto-dismiss after 8 seconds
    setTimeout(function() { closeSignInPrompt(); }, 8000);
}

export function closeSignInPrompt() {
    var prompt = document.getElementById('signin-prompt');
    if (prompt) prompt.classList.remove('visible');
}

// Update button to show quantity controls
export function updateButtonState(itemName) {
    document.querySelectorAll('.add-to-cart').forEach(btn => {
        if (btn.dataset.item === itemName) {
            const item = cart.find(i => i.name === itemName);
            const qty = item ? item.quantity : 0;

            if (qty > 0 && !btn.classList.contains('has-qty')) {
                btn.classList.add('has-qty');
                btn.innerHTML = `<span class="qty-minus" data-item="${itemName}">−</span><span class="qty-count">${qty}</span><span class="qty-plus" data-item="${itemName}">+</span>`;
            } else if (qty > 0) {
                btn.querySelector('.qty-count').textContent = qty;
            } else {
                btn.classList.remove('has-qty');
                btn.innerHTML = 'Add to Order';
            }
        }
    });
}

// Restore all button states on page load
export function restoreButtonStates() {
    cart.forEach(item => updateButtonState(item.name));
}

// Floating cart preview
export function updateFloatingCart() {
    let floatingCart = document.getElementById('floating-cart');
    if (!floatingCart) {
        floatingCart = document.createElement('div');
        floatingCart.id = 'floating-cart';
        floatingCart.innerHTML = `
            <div class="fc-header">
                <span class="fc-title">Your Order</span>
                <span class="fc-close" onclick="closeFloatingCart()">&times;</span>
            </div>
            <div class="fc-items"></div>
            <div class="fc-footer">
                <span class="fc-total"></span>
                <button class="fc-checkout" onclick="document.getElementById('cart-icon').click(); closeFloatingCart();">View Cart</button>
            </div>
        `;
        document.body.appendChild(floatingCart);
    }

    const itemsContainer = floatingCart.querySelector('.fc-items');
    const totalEl = floatingCart.querySelector('.fc-total');

    if (cart.length === 0) {
        floatingCart.classList.remove('visible');
        updateCartFab();
        return;
    }

    let html = '';
    let subtotal = 0;
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        html += `<div class="fc-item"><span>${item.name} x${item.quantity}</span><span>₹${itemTotal}</span></div>`;
    });

    itemsContainer.innerHTML = html;
    totalEl.textContent = `Total: ₹${subtotal}`;
    floatingCart.classList.add('visible');

    // Update mobile cart FAB
    updateCartFab();
}

export function updateCartFab(count) {
    var fab = document.getElementById('cart-fab');
    if (!fab) {
        fab = document.createElement('div');
        fab.id = 'cart-fab';
        fab.className = 'cart-fab';
        fab.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg><span class="cart-fab-badge">0</span>';
        fab.addEventListener('click', function() {
            var cartIcon = document.getElementById('cart-icon');
            if (cartIcon) cartIcon.click();
        });
        document.body.appendChild(fab);
    }
    var badge = fab.querySelector('.cart-fab-badge');
    var cnt = count !== undefined ? count : cart.reduce(function(t, i) { return t + i.quantity; }, 0);
    if (cnt > 0) {
        badge.textContent = cnt;
        fab.classList.add('visible');
        fab.classList.remove('pop');
        void fab.offsetWidth;
        fab.classList.add('pop');
    } else {
        fab.classList.remove('visible');
    }
}

export function closeFloatingCart() {
    const fc = document.getElementById('floating-cart');
    if (fc) fc.classList.remove('visible');
}

// Display cart
export function displayCart() {
    const cartItemsContainer = document.getElementById('cart-items');
    if (!cartItemsContainer) return;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart">Your cart is empty</div>';
        var subEl = document.getElementById('subtotal-amount');
        var totEl = document.getElementById('total-amount');
        if (subEl) subEl.textContent = '0.00';
        if (totEl) totEl.textContent = '0.00';
        return;
    }

    let html = '';
    let subtotal = 0;

    cart.forEach((item, index) => {
        const addonTotal = (item.addons || []).reduce((s, a) => s + a.price, 0);
        const itemTotal = (item.price + addonTotal) * item.quantity;
        subtotal += itemTotal;
        const spiceTag = item.spiceLevel && item.spiceLevel !== 'medium' ? ' <span style="font-size:0.7rem;color:#e67e22">(' + item.spiceLevel + ')</span>' : '';
        const addonTags = (item.addons || []).map(a => '<span style="font-size:0.7rem;color:var(--gold,#D4A017)">+ ' + a.name + ' ₹' + a.price + '</span>').join(' ');

        html += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}${spiceTag}</div>
                    ${addonTags ? '<div style="margin-top:2px">' + addonTags + '</div>' : ''}
                    <div class="cart-item-price">₹${(item.price + addonTotal).toFixed(2)}</div>
                </div>
                <div class="cart-item-quantity">
                    <button class="qty-btn" onclick="updateQuantity(${index}, -1)">-</button>
                    <span>${item.quantity}</span>
                    <button class="qty-btn" onclick="updateQuantity(${index}, 1)">+</button>
                </div>
                <button class="remove-item" onclick="removeItem(${index})">Remove</button>
            </div>
        `;
    });

    cartItemsContainer.innerHTML = html;

    const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
    const total = subtotal + deliveryFee;

    var subtotalEl = document.getElementById('subtotal-amount');
    var totalEl = document.getElementById('total-amount');
    if (subtotalEl) subtotalEl.textContent = subtotal.toFixed(2);
    if (totalEl) totalEl.textContent = total.toFixed(2);
}

// Update quantity
export function updateQuantity(index, change) {
    const itemName = cart[index].name;
    cart[index].quantity += change;

    if (cart[index].quantity <= 0) {
        cart.splice(index, 1);
    }

    updateCartCount();
    saveCart();
    displayCart();
    updateButtonState(itemName);
    updateFloatingCart();
}

// Remove item
export function removeItem(index) {
    const itemName = cart[index].name;
    cart.splice(index, 1);
    updateCartCount();
    saveCart();
    displayCart();
    updateButtonState(itemName);
    updateFloatingCart();
}

// Clear cart
export function clearCart() {
    if (confirm('Are you sure you want to clear your cart?')) {
        const itemNames = cart.map(i => i.name);
        cart.length = 0;
        updateCartCount();
        saveCart();
        displayCart();
        itemNames.forEach(name => updateButtonState(name));
        updateFloatingCart();
        document.getElementById('cart-modal').style.display = 'none';
        unlockScroll();
    }
}

export function getCheckoutTotal(couponData) {
    var subtotal = cart.reduce(function(sum, item) { return sum + (item.price * item.quantity); }, 0);
    var deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
    var discount = 0;
    var total = subtotal + deliveryFee;
    var appliedCoupon = couponData || window._appliedCoupon || null;
    // Apply coupon discount
    if (appliedCoupon) {
        if (appliedCoupon.type === 'percent') {
            discount = Math.floor(subtotal * appliedCoupon.discount / 100);
        } else if (appliedCoupon.type === 'flat') {
            discount = appliedCoupon.discount;
        }
        discount = Math.min(discount, subtotal);
        total = subtotal - discount + deliveryFee;
    }
    return { subtotal: subtotal, deliveryFee: deliveryFee, discount: discount, total: total };
}

export function initCart() {
    // Cart modal open via cart icon
    var cartIcon = document.getElementById('cart-icon');
    var cartModal = document.getElementById('cart-modal');
    if (cartIcon) {
        cartIcon.addEventListener('click', (e) => {
            e.preventDefault();
            displayCart();
            if (cartModal) cartModal.style.display = 'block';
            lockScroll();
        });
    }

    // Close buttons
    var closeButtons = document.querySelectorAll('.close');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.closest('#auth-modal')) return;
            if (cartModal) cartModal.style.display = 'none';
            var resModal = document.getElementById('reservation-modal');
            if (resModal) resModal.style.display = 'none';
            unlockScroll();
        });
    });

    // Click outside modals
    window.addEventListener('click', (e) => {
        if (e.target === cartModal) {
            cartModal.style.display = 'none';
            unlockScroll();
        }
        if (e.target === document.getElementById('reservation-modal')) {
            document.getElementById('reservation-modal').style.display = 'none';
            unlockScroll();
        }
    });

    // Delegated add-to-cart clicks
    document.addEventListener('click', (e) => {
        // Clicking the + button
        if (e.target.classList.contains('qty-plus')) {
            const itemName = e.target.dataset.item;
            const btn = e.target.closest('.add-to-cart');
            addToCart(itemName, btn.dataset.price);
            return;
        }
        // Clicking the - button
        if (e.target.classList.contains('qty-minus')) {
            const itemName = e.target.dataset.item;
            const item = cart.find(i => i.name === itemName);
            if (item) {
                item.quantity--;
                if (item.quantity <= 0) cart.splice(cart.indexOf(item), 1);
                updateCartCount();
                saveCart();
                updateButtonState(itemName);
                updateFloatingCart();
            }
            return;
        }
        // Clicking "Add to Order" (first time)
        if (e.target.classList.contains('add-to-cart') && !e.target.classList.contains('has-qty')) {
            const itemName = e.target.dataset.item;
            const price = e.target.dataset.price;
            addToCart(itemName, price);
            showCartCheckmark(e.target);
        }
    });

    // Cart action buttons
    var clearCartBtn = document.getElementById('clear-cart');
    if (clearCartBtn) clearCartBtn.addEventListener('click', clearCart);

    var checkoutBtn = document.getElementById('checkout');
    if (checkoutBtn) checkoutBtn.addEventListener('click', function() {
        if (typeof window.checkout === 'function') window.checkout();
    });
}

Object.assign(window, {
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    closeAddonPicker,
    toggleAddonOption,
    confirmAddonSelection,
    closeFloatingCart,
    closeSignInPrompt
});
