import { lockScroll, unlockScroll } from '../core/utils.js';
import { getCurrentUser, setCurrentUser, showAuthToast } from './auth.js';
import { cart, getCheckoutTotal, updateCartCount, saveCart, updateButtonState, updateFloatingCart } from './cart.js';
import { RAZORPAY_KEY, MERCHANT_NAME, WHATSAPP_NUMBER, FREE_DELIVERY_THRESHOLD, DELIVERY_FEE, LOYALTY_TIERS } from '../core/constants.js';
import { getDb, getFieldValue } from '../core/firebase.js';

// ===== CHECKOUT FLOW =====

// HTML escape helper to prevent XSS
function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Strip HTML tags from input to prevent stored XSS (mirrors auth.js pattern)
function stripHtmlTags(text) {
    return (text || '').replace(/<[^>]*>/g, '').trim();
}

export let selectedPayment = 'razorpay';
export var appliedCoupon = null;
export var appliedGiftCard = null;
var appliedCouponCode = '';
var selectedGcAmount = 500;

// Sync coupon state to window so cart.js getCheckoutTotal can access it
function syncCouponToWindow() {
    window._appliedCoupon = appliedCoupon;
}

// Keep a module-level reference that cart.getCheckoutTotal can access via window
// (payment.js owns the coupon state so it re-exports a totals getter)
function itemSubtotal(item) {
    var addonTotal = (item.addons || []).reduce(function(s, a) { return s + a.price; }, 0);
    return (item.price + addonTotal) * item.quantity;
}

export function getCheckoutTotals() {
    var subtotal = cart.reduce(function(sum, item) { return sum + itemSubtotal(item); }, 0);
    var deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
    var discount = 0;
    var loyaltyDiscount = 0;
    var total = subtotal + deliveryFee;

    // Apply loyalty tier discount
    var user = getCurrentUser();
    if (user) {
        var pts = user.loyaltyPoints || 0;
        var tier = null;
        for (var i = LOYALTY_TIERS.length - 1; i >= 0; i--) {
            if (pts >= LOYALTY_TIERS[i].min) { tier = LOYALTY_TIERS[i]; break; }
        }
        if (tier) {
            if (tier.freeDelivery) deliveryFee = 0;
            if (tier.discount > 0) {
                loyaltyDiscount = Math.floor(subtotal * tier.discount / 100);
            }
        }
    }

    if (appliedCoupon) {
        if (appliedCoupon.type === 'percent') {
            discount = Math.floor(subtotal * appliedCoupon.discount / 100);
        } else if (appliedCoupon.type === 'flat') {
            discount = appliedCoupon.discount;
        }
        discount = Math.min(discount, subtotal);
    }
    // Use higher of coupon or loyalty discount (don't stack)
    var effectiveDiscount = Math.max(discount, loyaltyDiscount);
    total = subtotal - effectiveDiscount + deliveryFee;

    // Apply gift card (validate balance exists and is a number)
    if (appliedGiftCard && typeof appliedGiftCard.balance === 'number' && appliedGiftCard.balance > 0) {
        var gcDeduction = Math.min(appliedGiftCard.balance, total);
        total = Math.max(0, total - gcDeduction);
    }
    return { subtotal: subtotal, deliveryFee: deliveryFee, discount: effectiveDiscount, loyaltyDiscount: loyaltyDiscount, total: total };
}

// ===== PURE FUNCTIONS FOR TESTABILITY =====
export function validateCoupon(couponData, subtotal) {
    if (!couponData) return { valid: false, reason: 'No coupon' };
    if (!couponData.active) return { valid: false, reason: 'This coupon is no longer active.' };
    if (couponData.expiresAt && new Date(couponData.expiresAt) < new Date()) return { valid: false, reason: 'This coupon has expired.' };
    if (couponData.usageLimit && couponData.usedCount >= couponData.usageLimit) return { valid: false, reason: 'This coupon has reached its usage limit.' };
    if (couponData.minOrder && subtotal < couponData.minOrder) return { valid: false, reason: 'Minimum order \u20B9' + couponData.minOrder + ' required.' };
    return { valid: true };
}

export function calcDiscount(couponData, subtotal) {
    if (!couponData) return 0;
    var discount = couponData.type === 'percent' ? (subtotal * couponData.discount / 100) : couponData.discount;
    if (couponData.maxDiscount && couponData.type === 'percent') discount = Math.min(discount, couponData.maxDiscount);
    discount = Math.min(discount, subtotal);
    return discount;
}

export function checkout() {
    // Re-verify session hasn't expired before checkout
    var freshUser = getCurrentUser();
    if (!freshUser) {
        showAuthToast('Your session has expired. Please sign in again.');
        if (typeof window.openAuthModal === 'function') window.openAuthModal();
        return;
    }
    if (cart.length === 0) {
        showAuthToast('Your cart is empty!');
        return;
    }
    if (!getCurrentUser()) {
        var cm = document.getElementById('cart-modal');
        if (cm) cm.style.display = 'none';
        unlockScroll();
        if (typeof window.openAuthModal === 'function') window.openAuthModal();
        showAuthToast('Please sign in to continue with your order');
        return;
    }
    var cartModal = document.getElementById('cart-modal');
    if (cartModal) cartModal.style.display = 'none';
    lockScroll();
    // Allergen check before opening checkout
    if (typeof window.checkAllergenWarning === 'function') {
        window.checkAllergenWarning(cart, function(proceed) {
            if (proceed) openCheckout();
            else unlockScroll();
        });
    } else {
        openCheckout();
    }
}

export function openCheckout() {
    var subtotal = cart.reduce(function(sum, item) { return sum + itemSubtotal(item); }, 0);
    var deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
    var total = subtotal + deliveryFee;

    var itemsHtml = '';
    cart.forEach(function(item) {
        var addonTotal = (item.addons || []).reduce(function(s, a) { return s + a.price; }, 0);
        var lineTotal = (item.price + addonTotal) * item.quantity;
        var addonLabel = addonTotal > 0 ? ' (+\u20B9' + addonTotal + ')' : '';
        itemsHtml += '<div class="co-item"><span>' + escapeHtml(item.name) + addonLabel + ' x' + item.quantity + '</span><span>\u20B9' + lineTotal + '</span></div>';
    });
    // Render upsell suggestions
    var upsellHtml = '';
    if (typeof window.getUpsellItems === 'function') {
        var upsellItems = window.getUpsellItems(cart);
        if (upsellItems && upsellItems.length > 0) {
            upsellHtml = '<div class="upsell-section" id="upsell-section">' +
                '<div class="upsell-title">Customers also ordered</div>' +
                '<div class="upsell-items">';
            upsellItems.forEach(function(item) {
                var safeName = escapeHtml(item.name);
                // Use data attributes instead of inline JS string concatenation to prevent XSS
                var safeDataName = escapeHtml(item.name).replace(/"/g, '&quot;');
                var safePrice = parseInt(item.price, 10) || 0;
                upsellHtml += '<div class="upsell-card">' +
                    '<div class="upsell-info">' +
                        '<div class="upsell-name">' + safeName + '</div>' +
                        '<div class="upsell-reason">' + escapeHtml(item.reason || '') + '</div>' +
                    '</div>' +
                    '<span class="upsell-price">\u20B9' + safePrice + '</span>' +
                    '<button class="upsell-add-btn" data-upsell-name="' + safeDataName + '" data-upsell-price="' + safePrice + '">+ Add</button>' +
                '</div>';
            });
            upsellHtml += '</div></div>';
        }
    }

    var checkoutItemsEl = document.getElementById('checkout-items');
    if (checkoutItemsEl) {
        checkoutItemsEl.innerHTML = itemsHtml + upsellHtml;
        // Bind upsell button clicks via event delegation (avoids inline JS with user data)
        checkoutItemsEl.querySelectorAll('.upsell-add-btn[data-upsell-name]').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var itemName = btn.getAttribute('data-upsell-name');
                var itemPrice = parseInt(btn.getAttribute('data-upsell-price'), 10) || 0;
                addUpsellItem(itemName, itemPrice);
            });
        });
    }
    var coSubEl = document.getElementById('co-subtotal');
    if (coSubEl) coSubEl.textContent = '\u20B9' + subtotal;
    var coDelEl = document.getElementById('co-delivery');
    if (coDelEl) coDelEl.textContent = deliveryFee === 0 ? 'FREE' : '\u20B9' + deliveryFee;
    var coTotEl = document.getElementById('co-total');
    if (coTotEl) coTotEl.textContent = '\u20B9' + total;

    // Show loyalty redeem button
    var loyaltyBtn = document.getElementById('loyalty-redeem-btn');
    if (loyaltyBtn) {
        var cUser = getCurrentUser();
        if (cUser && cUser.loyaltyPoints >= 100) {
            var redeemVal = Math.floor(cUser.loyaltyPoints / 100) * 10;
            loyaltyBtn.textContent = 'Redeem ' + cUser.loyaltyPoints + ' pts (\u20B9' + redeemVal + ' off)';
            loyaltyBtn.style.display = 'block';
        } else {
            loyaltyBtn.style.display = 'none';
        }
    }

    // Add accessibility attributes to required form fields
    var coName = document.getElementById('co-name');
    var coPhone = document.getElementById('co-phone');
    var coAddress = document.getElementById('co-address');
    if (coName) coName.setAttribute('aria-required', 'true');
    if (coPhone) {
        coPhone.setAttribute('aria-required', 'true');
        coPhone.setAttribute('inputmode', 'numeric');
        coPhone.setAttribute('pattern', '[0-9]*');
    }
    if (coAddress) coAddress.setAttribute('aria-required', 'true');

    goToStep(1);
    var checkoutModal = document.getElementById('checkout-modal');
    if (checkoutModal) checkoutModal.style.display = 'block';

    // Auto-fill customer details from signed-in user
    var currentUser = getCurrentUser();
    if (currentUser) {
        if (coName && !coName.value) coName.value = currentUser.name || '';
        if (coPhone && !coPhone.value) coPhone.value = currentUser.phone || '';
        // Auto-fill saved address if available
        if (coAddress && !coAddress.value && currentUser.address) coAddress.value = currentUser.address;
    }

    // Inject order type selector (Delivery vs Pickup) if not already present
    var step2 = document.getElementById('checkout-step-2');
    if (step2 && !document.getElementById('order-type-selector')) {
        var orderTypeHtml = '<div class="order-type-selector" id="order-type-selector" role="radiogroup" aria-label="Order type">' +
            '<button type="button" class="order-type-btn active" data-type="delivery" role="radio" aria-checked="true" onclick="selectOrderType(this,\'delivery\')">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 18H3a2 2 0 01-2-2V8a2 2 0 012-2h3.93a2 2 0 011.66.9l.82 1.2a2 2 0 001.66.9H21a2 2 0 012 2v2"/><circle cx="7" cy="18" r="2"/><path d="M15 18h2"/><circle cx="20" cy="18" r="2"/></svg>' +
            ' Delivery</button>' +
            '<button type="button" class="order-type-btn" data-type="pickup" role="radio" aria-checked="false" onclick="selectOrderType(this,\'pickup\')">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>' +
            ' Pickup</button>' +
            '</div>';
        step2.insertAdjacentHTML('afterbegin', orderTypeHtml);
    }

    // Inject delivery time estimate if not already present
    var coNotesEl = document.getElementById('co-notes');
    if (coNotesEl && !document.getElementById('delivery-time-estimate')) {
        var estimateEl = document.createElement('div');
        estimateEl.className = 'delivery-time-estimate';
        estimateEl.id = 'delivery-time-estimate';
        estimateEl.setAttribute('aria-live', 'polite');
        estimateEl.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>' +
            '<span>Estimated delivery: 30 - 45 mins</span>';
        coNotesEl.parentNode.insertBefore(estimateEl, coNotesEl.nextSibling);
    }

    // Auto-apply welcome bonus (verify against Firestore to prevent reuse via localStorage manipulation)
    var couponInput = document.getElementById('coupon-code');
    var couponMsg = document.getElementById('coupon-msg');
    if (currentUser && !currentUser.usedWelcomeBonus) {
        appliedCoupon = { discount: 25, type: 'percent', label: '25% off (Welcome Bonus!)' };
        appliedCouponCode = 'WELCOME25';
        if (couponInput) couponInput.value = 'WELCOME25';
        if (couponMsg) { couponMsg.textContent = 'Welcome bonus applied! You get 25% off!'; couponMsg.className = 'coupon-msg success'; }
        var discount = subtotal * 0.25;
        discount = Math.min(discount, subtotal);
        var discountedTotal = subtotal - discount + deliveryFee;
        var coTotWelcome = document.getElementById('co-total');
        if (coTotWelcome) coTotWelcome.textContent = '\u20B9' + discountedTotal.toFixed(0);
        // Re-verify welcome bonus status from Firestore to prevent localStorage manipulation
        var bonusDb = getDb();
        if (bonusDb && currentUser.phone) {
            bonusDb.collection('users').doc(currentUser.phone).get().then(function(doc) {
                if (doc.exists && doc.data().usedWelcomeBonus) {
                    appliedCoupon = null;
                    appliedCouponCode = '';
                    syncCouponToWindow();
                    currentUser.usedWelcomeBonus = true;
                    setCurrentUser(currentUser);
                    if (couponInput) couponInput.value = '';
                    if (couponMsg) { couponMsg.textContent = ''; couponMsg.className = 'coupon-msg'; }
                    setupPayment();
                }
            }).catch(function() {});
        }
    } else {
        appliedCoupon = null;
        appliedCouponCode = '';
        if (couponInput) couponInput.value = '';
        if (couponMsg) { couponMsg.textContent = ''; couponMsg.className = 'coupon-msg'; }
    }
    syncCouponToWindow();
}

export function closeCheckout() {
    var modal = document.getElementById('checkout-modal');
    if (modal) modal.style.display = 'none';
    unlockScroll();
    ['co-name', 'co-phone', 'co-address', 'co-notes'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.value = '';
    });
}

export function goToStep(step) {
    document.querySelectorAll('.checkout-step').forEach(function(s) { s.classList.remove('active'); });
    var stepEl = document.getElementById('checkout-step-' + step);
    if (stepEl) {
        stepEl.classList.add('active');
        // Focus the step for keyboard users
        stepEl.setAttribute('tabindex', '-1');
        stepEl.focus({ preventScroll: true });
    }

    // Announce step change to screen readers
    var stepNames = { 1: 'Order Summary', 2: 'Customer Details', 3: 'Payment', 4: 'Order Confirmation' };
    if (window._ariaAnnounce && stepNames[step]) {
        window._ariaAnnounce('Checkout step ' + step + ': ' + stepNames[step]);
    }

    if (step === 3) setupPayment();
}

export function setupPayment() {
    var totals = getCheckoutTotals();
    var total = totals.total;
    var totalStr = '\u20B9' + total.toFixed(0);

    var payTotalEl = document.getElementById('pay-total');
    if (payTotalEl) payTotalEl.textContent = totalStr;
    var codTotal = document.getElementById('cod-total');
    if (codTotal) codTotal.textContent = totalStr;

    // Default to Razorpay tab
    selectedPayment = 'razorpay';
    switchPayTab('razorpay');
}

export function switchPayTab(tab) {
    var tabLabels = { razorpay: 'Pay with Razorpay (UPI, Cards, Net Banking)', cod: 'Pay with Cash on Delivery' };
    ['razorpay', 'cod'].forEach(function(t) {
        var tabEl = document.getElementById('tab-' + t);
        var panelEl = document.getElementById('pay-panel-' + t);
        if (tabEl) {
            tabEl.classList.toggle('active', t === tab);
            tabEl.setAttribute('aria-selected', t === tab ? 'true' : 'false');
            if (!tabEl.hasAttribute('aria-label')) {
                tabEl.setAttribute('aria-label', tabLabels[t] || t);
            }
        }
        if (panelEl) panelEl.classList.toggle('active', t === tab);
    });
    selectedPayment = tab;
    var tabNames = { razorpay: 'Razorpay (UPI, Cards, Net Banking)', cod: 'Cash on Delivery' };
    if (window._ariaAnnounce && tabNames[tab]) window._ariaAnnounce('Payment method: ' + tabNames[tab]);
}

export function validateAndPay() {
    var name = document.getElementById('co-name').value.trim();
    var phone = document.getElementById('co-phone').value.trim();
    var address = document.getElementById('co-address').value.trim();
    if (!name || !phone || !address) {
        showAuthToast('Please fill in all required fields.');
        if (!name) document.getElementById('co-name').focus();
        else if (!phone) document.getElementById('co-phone').focus();
        else document.getElementById('co-address').focus();
        return;
    }
    // Strict input validation
    if (name.length > 100) {
        showAuthToast('Name is too long (max 100 characters).');
        document.getElementById('co-name').focus();
        return;
    }
    if (!/^\d{10}$/.test(phone)) {
        showAuthToast('Please enter a valid 10-digit phone number.');
        document.getElementById('co-phone').focus();
        return;
    }
    if (address.length < 10) {
        showAuthToast('Please enter a complete delivery address.');
        document.getElementById('co-address').focus();
        return;
    }
    if (address.length > 500) {
        showAuthToast('Address is too long (max 500 characters).');
        document.getElementById('co-address').focus();
        return;
    }
    // Validate scheduled order fields if enabled
    var schedule = window.getScheduleInfo ? window.getScheduleInfo() : null;
    if (schedule && (!schedule.date || !schedule.time)) {
        showAuthToast('Please select both date and time for scheduled order.');
        return;
    }
    goToStep(3);
}

export function openRazorpay() {
    if (typeof Razorpay === 'undefined') {
        showAuthToast('Payment gateway loading... please try again');
        return;
    }

    var totals = getCheckoutTotals();
    var name = document.getElementById('co-name').value.trim();
    var phone = document.getElementById('co-phone').value.trim();

    var options = {
        key: RAZORPAY_KEY,
        amount: Math.round(totals.total * 100), // Amount in paise
        currency: 'INR',
        name: MERCHANT_NAME,
        description: 'Food Order - Amogha Cafe',
        image: window.location.origin + '/amogha-logo.png',
        handler: function(response) {
            var paymentId = response.razorpay_payment_id;
            placeOrderToFirestore('Razorpay', paymentId, 'paid');
        },
        prefill: {
            name: name,
            contact: phone,
            method: 'upi'
        },
        method: {
            upi: true,
            card: true,
            netbanking: true,
            wallet: true
        },
        config: {
            display: {
                blocks: {
                    upi: {
                        name: 'Pay via UPI',
                        instruments: [
                            { method: 'upi', flows: ['qrcode', 'collect', 'intent'] }
                        ]
                    }
                },
                sequence: ['block.upi'],
                preferences: {
                    show_default_blocks: true
                }
            }
        },
        notes: {
            items: cart.map(function(i) { return i.name + ' x' + i.quantity; }).join(', ')
        },
        theme: {
            color: '#D4A017',
            backdrop_color: 'rgba(8,6,4,0.85)'
        },
        modal: {
            ondismiss: function() {
                var btn = document.getElementById('razorpay-pay-btn');
                if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg> Pay Now'; }
            }
        }
    };

    var btn = document.getElementById('razorpay-pay-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = 'Opening payment...'; }
    if (window._showPaymentProcessing) window._showPaymentProcessing();

    try {
        var rzp = new Razorpay(options);
        rzp.on('payment.failed', function(response) {
            if (window._hidePaymentProcessing) window._hidePaymentProcessing();
            showAuthToast('Payment failed: ' + (response.error.description || 'Please try again'));
            var btn = document.getElementById('razorpay-pay-btn');
            if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg> Retry Payment'; }
        });
        rzp.open();
        // Hide overlay once Razorpay modal opens (it has its own UI)
        setTimeout(function() { if (window._hidePaymentProcessing) window._hidePaymentProcessing(); }, 1500);
    } catch(e) {
        if (window._hidePaymentProcessing) window._hidePaymentProcessing();
        showAuthToast('Error opening payment: ' + e.message);
        if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg> Pay Now'; }
    }
}

export function placeCodOrder() {
    placeOrderToFirestore('Cash on Delivery', null, 'cod-pending');
}

var _orderInProgress = false;

export function placeOrderToFirestore(payMethod, paymentRef, paymentStatus) {
    if (_orderInProgress) return;
    var db = getDb();
    if (typeof db === 'undefined' || !db) {
        showAuthToast('Service unavailable. Please refresh and try again.');
        if (window._hidePaymentProcessing) window._hidePaymentProcessing();
        return;
    }
    _orderInProgress = true;
    if (window._showPaymentProcessing) window._showPaymentProcessing();
    var name = stripHtmlTags(document.getElementById('co-name').value.trim());
    var phone = document.getElementById('co-phone').value.trim();
    var address = stripHtmlTags(document.getElementById('co-address').value.trim());
    var notes = stripHtmlTags(document.getElementById('co-notes').value.trim());
    var totals = getCheckoutTotals();

    // Scheduled order
    var scheduleCheck = document.getElementById('schedule-order-check');
    var scheduledFor = null;
    if (scheduleCheck && scheduleCheck.checked) {
        var schedDate = document.getElementById('schedule-date');
        var schedTime = document.getElementById('schedule-time');
        if (schedDate && schedTime && schedDate.value && schedTime.value) {
            // Preserve local date/time as entered to avoid timezone day-shift.
            scheduledFor = schedDate.value + 'T' + schedTime.value + ':00';
        }
    }

    var confirmDetailEl = document.getElementById('confirm-detail');
    if (confirmDetailEl) confirmDetailEl.textContent = 'Payment: ' + payMethod + (paymentRef ? ' (Ref: ' + paymentRef + ')' : '') + ' | Total: \u20B9' + totals.total.toFixed(0);

    // Build WhatsApp message
    var msg = '*New Order - Amogha Cafe*\n\n';
    msg += '*Customer:* ' + name + '\n*Phone:* ' + phone + '\n*Address:* ' + address + '\n';
    if (notes) msg += '*Notes:* ' + notes + '\n';
    msg += '\n*Items:*\n';
    cart.forEach(function(item) {
        msg += '- ' + item.name + ' x' + item.quantity + ' = \u20B9' + (item.price * item.quantity) + '\n';
    });
    msg += '\n*Subtotal:* \u20B9' + totals.subtotal;
    msg += '\n*Delivery:* ' + (totals.deliveryFee === 0 ? 'FREE' : '\u20B9' + totals.deliveryFee);
    msg += '\n*Total:* \u20B9' + totals.total.toFixed(0);
    msg += '\n*Payment:* ' + payMethod;
    if (paymentRef) msg += '\n*Payment Ref:* ' + paymentRef;

    var waLink = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(msg);
    var waLinkEl = document.getElementById('whatsapp-link');
    if (waLinkEl) waLinkEl.href = waLink;

    goToStep(4);

    // Save to Firestore
    var currentUser = getCurrentUser();
    var orderData = {
        customer: name,
        phone: phone,
        address: address,
        notes: notes,
        items: cart.map(function(item) { return { name: item.name, qty: item.quantity, price: item.price, spiceLevel: item.spiceLevel || 'medium', addons: item.addons || [] }; }),
        subtotal: totals.subtotal,
        deliveryFee: totals.deliveryFee,
        total: totals.total,
        payment: payMethod,
        paymentRef: paymentRef || null,
        paymentStatus: paymentStatus,
        paymentVerifiedAt: paymentRef ? new Date().toISOString() : null,
        status: scheduledFor ? 'scheduled' : 'pending',
        createdAt: new Date().toISOString(),
        scheduledFor: scheduledFor || null,
        userId: currentUser ? currentUser.phone : null
    };
    // Save items before clearing (for button state update)
    var itemNames = cart.map(function(i) { return i.name; });

    db.collection('orders').add(orderData).then(function(docRef) {
        _orderInProgress = false;
        if (window._hidePaymentProcessing) window._hidePaymentProcessing();

        // Celebrate with confetti and screen reader announcement
        if (typeof window.launchConfetti === 'function') window.launchConfetti();
        if (window._ariaAnnounce) window._ariaAnnounce('Order placed successfully! Thank you for your order.');
        if (window._showToast) window._showToast('Order placed successfully!', 'success');

        // Analytics: purchase event
        try { if (window.analytics) window.analytics.logEvent('purchase', { transaction_id: docRef.id, value: orderData.total, payment_type: payMethod }); } catch(e) {}

        // Save for split bill feature
        window._lastOrderId = docRef.id;
        window._lastOrderTotal = orderData.total;

        var trackUrl = window.location.origin + '/track/index.html?id=' + docRef.id;
        var trackDiv = document.getElementById('order-tracking-link');
        if (trackDiv) {
            trackDiv.innerHTML = '<div class="order-track-card">' +
                '<p class="order-track-label">Track your order in real-time:</p>' +
                '<a href="' + trackUrl + '" target="_blank" rel="noopener noreferrer" class="order-track-link">' + trackUrl + '</a>' +
                '<br><button onclick="safeCopy(\'' + trackUrl + '\',this)" class="cta-button order-track-copy">Copy Link</button>' +
                '</div>';
        }

        // Count coupon usage only after successful order placement
        if (appliedCouponCode) {
            var fv = getFieldValue();
            if (fv) {
                db.collection('coupons').doc(appliedCouponCode).update({
                    usedCount: fv.increment(1)
                }).catch(function(e) { console.error('Coupon usage update error:', e); });
            }
        }

        // Mark welcome bonus as used
        if (currentUser && !currentUser.usedWelcomeBonus && appliedCoupon && appliedCoupon.label && appliedCoupon.label.indexOf('Welcome') !== -1) {
            currentUser.usedWelcomeBonus = true;
            setCurrentUser(currentUser);
            db.collection('users').doc(currentUser.phone).update({ usedWelcomeBonus: true }).catch(function(e) { console.error('Bonus update error:', e); });
        }
        // Persist loyalty point deduction to Firestore (localStorage already updated optimistically in redeemLoyaltyAtCheckout)
        if (appliedCoupon && appliedCoupon._loyaltyPointsToDeduct) {
            var loyaltyUser = getCurrentUser();
            if (loyaltyUser) {
                db.collection('users').doc(loyaltyUser.phone).update({ loyaltyPoints: loyaltyUser.loyaltyPoints }).catch(function(e) { console.error('Loyalty deduction error:', e); });
            }
        }

        // Deduct gift card balance if used
        if (appliedGiftCard && appliedGiftCard.code && typeof appliedGiftCard.balance === 'number') {
            // Compute how much of the gift card was actually used (pre-GC total minus final total)
            var preGcTotal = totals.subtotal - totals.discount + totals.deliveryFee;
            var gcDeduction = Math.min(appliedGiftCard.balance, preGcTotal);
            var fvGc = getFieldValue();
            if (fvGc) {
                db.collection('giftCards').doc(appliedGiftCard.code).update({
                    balance: fvGc.increment(-gcDeduction),
                    redeemedAt: new Date().toISOString()
                }).catch(function(e) { console.error('Gift card deduction error:', e); });
            }
            appliedGiftCard = null;
        }

        appliedCoupon = null;
        appliedCouponCode = '';
        syncCouponToWindow();

        // Clear cart only after successful save
        cart.length = 0;
        updateCartCount();
        saveCart();
        itemNames.forEach(function(n) { updateButtonState(n); });
        updateFloatingCart();

        // Launch confetti for celebration
        if (typeof window.launchConfetti === 'function') window.launchConfetti();

        // Award loyalty points
        if (typeof window.awardLoyaltyPoints === 'function') window.awardLoyaltyPoints(orderData.total);

        // Check and award badges
        if (typeof window.checkAndAwardBadges === 'function') {
            var badgeUser = getCurrentUser();
            if (badgeUser) window.checkAndAwardBadges(badgeUser, orderData);
        }

        // Award referrer points if current user was referred
        // Mark redeemed FIRST to prevent double-reward race condition
        if (currentUser && db) {
            db.collection('referrals').where('refereePhone', '==', currentUser.phone).where('redeemed', '==', false).limit(1).get().then(function(snap) {
                if (!snap.empty) {
                    var ref = snap.docs[0];
                    var referrerPhone = ref.data().referrerPhone;
                    // Mark redeemed first to prevent duplicate rewards
                    ref.ref.update({ redeemed: true }).then(function() {
                        var fvRef = getFieldValue();
                        if (fvRef) {
                            db.collection('users').doc(referrerPhone).update({
                                loyaltyPoints: fvRef.increment(100)
                            }).catch(function(e) { console.error('Referrer points error:', e); });
                        }
                    }).catch(function(e) { console.error('Referral redeem error:', e); });
                }
            }).catch(function(e) { console.error('Referral lookup error:', e); });
        }

        // Schedule review prompt
        if (typeof window.scheduleReviewPrompt === 'function') window.scheduleReviewPrompt(orderData.items.map(function(i) { return { name: i.name }; }));

        // Send push notification
        if (typeof window.sendPushNotification === 'function') window.sendPushNotification('Order Placed!', 'Your order from Amogha has been placed successfully.');

        // ===== NEW WORLD-CLASS FEATURE HOOKS =====
        // Award a spin on the rewards wheel
        if (typeof window.awardSpin === 'function') window.awardSpin();
        // Show real-time order tracker
        if (typeof window.showOrderTracker === 'function') setTimeout(function() { window.showOrderTracker(docRef.id); }, 2000);
        // Check & award milestones
        if (typeof window.checkMilestones === 'function') window.checkMilestones(getCurrentUser(), orderData);
        // Schedule post-order feedback/tipping prompt
        if (typeof window.schedulePostOrderFeedback === 'function') window.schedulePostOrderFeedback(docRef.id, orderData.total);
        // Update challenge progress
        if (typeof window.updateChallengeProgress === 'function') {
            window.updateChallengeProgress('spend', orderData.total);
            // Check for morning orders (before noon)
            if (new Date().getHours() < 12) window.updateChallengeProgress('morning_orders', 1);
        }
        // Share prompt (after a delay)
        window._lastOrderItems = orderData.items;
        window._lastOrderTotalForShare = orderData.total;

        // WhatsApp confirmation to customer
        if (phone) {
            var customerPhone = phone.replace(/\D/g, '');
            if (customerPhone.length === 10) customerPhone = '91' + customerPhone;
            var custMsg = 'Hi ' + name + '! 🙏\n\nYour order at *Amogha Cafe & Restaurant* has been placed successfully!\n\n';
            custMsg += '*Order ID:* ' + docRef.id + '\n';
            custMsg += '*Items:* ' + orderData.items.map(function(i) { return i.name + ' x' + i.qty; }).join(', ') + '\n';
            custMsg += '*Total:* ₹' + totals.total.toFixed(0) + '\n\n';
            custMsg += '📍 Track your order: ' + window.location.origin + '/track/?id=' + docRef.id + '\n\n';
            custMsg += 'Thank you for dining with us! 🍛';
            window.open('https://wa.me/' + customerPhone + '?text=' + encodeURIComponent(custMsg), '_blank');
        }

        // Inventory auto-deduction
        db.collection('inventory').get().then(function(invSnap) {
            var inventoryMap = {};
            invSnap.forEach(function(doc) {
                var d = doc.data();
                inventoryMap[(d.name || '').toLowerCase()] = { id: doc.id, qty: d.quantity || 0 };
            });
            var batch = db.batch();
            var hasUpdates = false;
            orderData.items.forEach(function(item) {
                var key = item.name.toLowerCase();
                var itemQty = parseInt(item.qty) || 0;
                if (inventoryMap[key] && inventoryMap[key].qty > 0 && itemQty > 0) {
                    var ref = db.collection('inventory').doc(inventoryMap[key].id);
                    batch.update(ref, { quantity: Math.max(0, inventoryMap[key].qty - itemQty) });
                    hasUpdates = true;
                }
            });
            if (hasUpdates) batch.commit().catch(function(e) { console.error('Inventory deduction error:', e); });
        }).catch(function(e) { console.error('Inventory fetch error:', e); });

    }).catch(function(err) {
        _orderInProgress = false;
        if (window._hidePaymentProcessing) window._hidePaymentProcessing();
        console.error('Order save error:', err);
        showAuthToast('Order failed to save. Please try again or check your connection.');
    });
}

export function applyCoupon() {
    var input = document.getElementById('coupon-code');
    var msg = document.getElementById('coupon-msg');
    if (!input || !msg) return;
    var code = input.value.trim().toUpperCase();

    // Hardcoded fallback in case Firestore is unavailable
    var fallbackCoupons = {
        'AMOGHA20': { discount: 20, type: 'percent', label: '20% off' },
        'WELCOME50': { discount: 50, type: 'flat', label: '₹50 off' },
        'FIRST10': { discount: 10, type: 'percent', label: '10% off' },
        'WELCOME25': { discount: 25, type: 'percent', label: '25% off (Welcome Bonus!)' }
    };

    function applyCouponData(coupon, codeValue) {
        appliedCoupon = coupon;
        appliedCouponCode = codeValue || '';
        syncCouponToWindow();
        msg.textContent = 'Coupon applied! ' + coupon.label;
        msg.className = 'coupon-msg success';
        var subtotal = cart.reduce(function(sum, item) { return sum + itemSubtotal(item); }, 0);
        var deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
        var discount = calcDiscount(coupon, subtotal);
        var total = subtotal - discount + deliveryFee;
        var coTotalCpn = document.getElementById('co-total');
        if (coTotalCpn) coTotalCpn.textContent = '\u20B9' + total.toFixed(0);
    }

    var db = getDb();
    if (db) {
        db.collection('coupons').doc(code).get().then(function(doc) {
            if (doc.exists) {
                var c = doc.data();
                var subtotal = cart.reduce(function(s, i) { return s + itemSubtotal(i); }, 0);
                var validation = validateCoupon(c, subtotal);
                if (!validation.valid) {
                    msg.textContent = validation.reason;
                    msg.className = 'coupon-msg error';
                    appliedCoupon = null;
                    appliedCouponCode = '';
                    return;
                }
                applyCouponData(c, code);
            } else if (fallbackCoupons[code]) {
                applyCouponData(fallbackCoupons[code], code);
            } else {
                appliedCoupon = null;
                appliedCouponCode = '';
                msg.textContent = 'Invalid coupon code. Please check and try again.';
                msg.className = 'coupon-msg error';
            }
        }).catch(function() {
            if (fallbackCoupons[code]) applyCouponData(fallbackCoupons[code], code);
            else { appliedCoupon = null; appliedCouponCode = ''; msg.textContent = 'Invalid coupon code.'; msg.className = 'coupon-msg error'; }
        });
    } else if (fallbackCoupons[code]) {
        applyCouponData(fallbackCoupons[code], code);
    } else {
        appliedCoupon = null;
        appliedCouponCode = '';
        msg.textContent = 'Invalid coupon code. Please check and try again.';
        msg.className = 'coupon-msg error';
    }
}

export function removeCoupon() {
    appliedCoupon = null;
    appliedCouponCode = '';
    var input = document.getElementById('coupon-code');
    var msg = document.getElementById('coupon-msg');
    if (input) input.value = '';
    if (msg) { msg.textContent = ''; msg.className = 'coupon-msg'; }
    setupPayment();
}

export function applyGiftCard() {
    var input = document.getElementById('giftcard-code');
    var msg = document.getElementById('giftcard-msg');
    if (!input || !msg) return;
    var code = input.value.trim().toUpperCase();

    if (!code) { msg.textContent = 'Please enter a gift card code'; msg.className = 'coupon-msg error'; return; }

    var db = getDb();
    if (!db) { msg.textContent = 'Service unavailable'; msg.className = 'coupon-msg error'; return; }

    db.collection('giftCards').doc(code).get().then(function(doc) {
        if (!doc.exists) { msg.textContent = 'Invalid gift card code'; msg.className = 'coupon-msg error'; appliedGiftCard = null; return; }
        var gc = doc.data();
        if (!gc.active) { msg.textContent = 'This gift card is no longer active'; msg.className = 'coupon-msg error'; appliedGiftCard = null; return; }
        if (gc.balance <= 0) { msg.textContent = 'This gift card has no remaining balance'; msg.className = 'coupon-msg error'; appliedGiftCard = null; return; }

        appliedGiftCard = { code: code, balance: gc.balance };
        msg.textContent = 'Gift card applied! Balance: \u20B9' + gc.balance;
        msg.className = 'coupon-msg success';

        // Recalculate total
        var subtotal = cart.reduce(function(s, i) { return s + itemSubtotal(i); }, 0);
        var deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
        var couponDiscount = appliedCoupon ? calcDiscount(appliedCoupon, subtotal) : 0;
        var afterCoupon = subtotal - couponDiscount + deliveryFee;
        var gcDeduction = Math.min(gc.balance, afterCoupon);
        var total = afterCoupon - gcDeduction;
        var coTotalGc = document.getElementById('co-total');
        if (coTotalGc) coTotalGc.textContent = '\u20B9' + total.toFixed(0);
    }).catch(function(err) {
        msg.textContent = 'Error: ' + err.message;
        msg.className = 'coupon-msg error';
    });
}

export function removeGiftCard() {
    appliedGiftCard = null;
    var input = document.getElementById('giftcard-code');
    var msg = document.getElementById('giftcard-msg');
    if (input) input.value = '';
    if (msg) { msg.textContent = ''; msg.className = 'coupon-msg'; }
    setupPayment();
}

export function openGiftCardModal() {
    var modal = document.getElementById('giftcard-modal');
    if (modal) { modal.style.display = 'block'; lockScroll(); }
}

export function closeGiftCardModal() {
    var modal = document.getElementById('giftcard-modal');
    if (modal) { modal.style.display = 'none'; unlockScroll(); }
}

export function selectGcAmount(amount, btn) {
    selectedGcAmount = amount;
    document.querySelectorAll('.gc-amount-btn').forEach(function(b) { b.classList.remove('active'); });
    if (btn) btn.classList.add('active');
}

export function buyGiftCard() {
    var recipientPhone = document.getElementById('gc-recipient-phone').value.trim();
    var msg = document.getElementById('gc-msg');
    if (!recipientPhone || recipientPhone.length !== 10) {
        msg.textContent = 'Please enter a valid 10-digit phone number';
        msg.className = 'coupon-msg error';
        return;
    }
    var currentUser = getCurrentUser();
    var purchaserPhone = currentUser ? currentUser.phone : 'guest';
    var amount = selectedGcAmount;

    // Generate unique code
    var code = 'GC-' + Date.now().toString(36).toUpperCase().slice(-4) + '-' + Math.random().toString(36).toUpperCase().slice(2, 6);

    if (typeof Razorpay === 'undefined') {
        msg.textContent = 'Payment system loading. Please try again.';
        msg.className = 'coupon-msg error';
        return;
    }

    var db = getDb();
    if (!db) { msg.textContent = 'Service unavailable. Please try again.'; msg.className = 'coupon-msg error'; return; }
    var options = {
        key: RAZORPAY_KEY,
        amount: amount * 100,
        currency: 'INR',
        name: 'Amogha Cafe',
        description: 'Gift Card - ' + code,
        image: 'https://amogha-cafe.web.app/amogha-logo.png',
        handler: function(response) {
            db.collection('giftCards').doc(code).set({
                code: code,
                amount: amount,
                balance: amount,
                purchaserPhone: purchaserPhone,
                recipientPhone: recipientPhone,
                paymentRef: response.razorpay_payment_id,
                active: true,
                createdAt: new Date().toISOString()
            }).then(function() {
                msg.textContent = 'Gift card ' + code + ' created successfully! Share this code with the recipient.';
                msg.className = 'coupon-msg success';
                document.getElementById('gc-recipient-phone').value = '';
            }).catch(function(err) {
                msg.textContent = 'Payment received but error saving: ' + err.message;
                msg.className = 'coupon-msg error';
            });
        },
        prefill: {
            name: currentUser ? currentUser.name : '',
            contact: purchaserPhone
        },
        theme: { color: '#D4A017' }
    };
    var rzp = new Razorpay(options);
    rzp.open();
}

export function redeemLoyaltyAtCheckout() {
    var user = getCurrentUser();
    if (!user || !user.loyaltyPoints || user.loyaltyPoints < 100) return;
    var redeemable = Math.floor(user.loyaltyPoints / 100) * 10;
    var pointsToUse = Math.floor(user.loyaltyPoints / 100) * 100;
    var subtotal = cart.reduce(function(s, i) { return s + itemSubtotal(i); }, 0);
    var discount = Math.min(redeemable, subtotal);
    if (discount <= 0) return;
    var deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
    var total = subtotal - discount + deliveryFee;
    appliedCoupon = { discount: discount, type: 'flat', label: 'Rs.' + discount + ' (Loyalty Points)', _loyaltyPointsToDeduct: pointsToUse };
    var coTotalEl = document.getElementById('co-total');
    if (coTotalEl) coTotalEl.textContent = 'Rs.' + total.toFixed(0);
    var msg = document.getElementById('coupon-msg');
    if (msg) { msg.textContent = 'Redeemed ' + pointsToUse + ' points for Rs.' + discount + ' off!'; msg.className = 'coupon-msg success'; }
    var couponInput = document.getElementById('coupon-code');
    if (couponInput) couponInput.value = 'LOYALTY';
    // Store intent only — actual deduction happens after order is placed in placeOrderToFirestore
    // Update localStorage optimistically so UI reflects deduction immediately
    user.loyaltyPoints = (user.loyaltyPoints || 0) - pointsToUse;
    if (user.loyaltyPoints < 0) user.loyaltyPoints = 0;
    setCurrentUser(user);
    if (typeof window.updateLoyaltyWidget === 'function') window.updateLoyaltyWidget();
}

// ===== SOCIAL SHARING (Share & Earn 10 pts) =====
export function shareOrder() {
    var shareText = 'I just ordered from Amogha Cafe & Restaurant! \uD83C\uDF7D\uFE0F Check them out at https://amoghahotels.com';

    function awardSharePoints() {
        var user = getCurrentUser();
        if (!user) return;
        // Prevent double-earning for same session
        var sharedOrders = [];
        try { sharedOrders = JSON.parse(localStorage.getItem('amoghaSharedOrders') || '[]'); } catch(e) {}
        var orderId = Date.now().toString();
        // Use the last share timestamp to deduplicate (within 5 min = same order)
        var lastShare = sharedOrders.length > 0 ? sharedOrders[sharedOrders.length - 1] : 0;
        if (Date.now() - lastShare < 300000) return; // Already shared this order
        sharedOrders.push(Date.now());
        try { localStorage.setItem('amoghaSharedOrders', JSON.stringify(sharedOrders)); } catch(e) {}
        user.loyaltyPoints = (user.loyaltyPoints || 0) + 10;
        setCurrentUser(user);
        var db = getDb();
        if (db) {
            db.collection('users').doc(user.phone).update({ loyaltyPoints: user.loyaltyPoints }).catch(function(e) { console.error('Share loyalty update error:', e); });
        }
        showAuthToast('Thanks for sharing! +10 loyalty points');
    }

    if (navigator.share) {
        navigator.share({ text: shareText }).then(function() {
            awardSharePoints();
        }).catch(function() {
            // User cancelled share — no points
        });
    } else {
        window.open('https://wa.me/?text=' + encodeURIComponent(shareText), '_blank');
        awardSharePoints();
    }
}

// ===== UPSELL: Add item from upsell section =====
export function addUpsellItem(name, price) {
    // Add item to cart
    var found = false;
    for (var i = 0; i < cart.length; i++) {
        if (cart[i].name === name) {
            cart[i].quantity++;
            found = true;
            break;
        }
    }
    if (!found) {
        cart.push({ name: name, price: price, quantity: 1, spiceLevel: 'medium', addons: [] });
    }
    updateCartCount();
    saveCart();
    updateFloatingCart();
    showAuthToast(name + ' added to your order!');
    // Re-render checkout to reflect the new item
    openCheckout();
}

// Order type selection (Delivery vs Pickup)
export function selectOrderType(btn, type) {
    var selector = document.getElementById('order-type-selector');
    if (!selector) return;
    selector.querySelectorAll('.order-type-btn').forEach(function(b) {
        b.classList.remove('active');
        b.setAttribute('aria-checked', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-checked', 'true');

    // Toggle address field and delivery estimate visibility based on order type
    var addressField = document.getElementById('co-address');
    var addressLabel = addressField ? addressField.closest('.form-group') || addressField.parentElement : null;
    var estimateEl = document.getElementById('delivery-time-estimate');
    if (type === 'pickup') {
        if (addressLabel) addressLabel.style.display = 'none';
        if (addressField) addressField.removeAttribute('aria-required');
        if (estimateEl) estimateEl.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>' +
            '<span>Ready for pickup in: 20 - 30 mins</span>';
    } else {
        if (addressLabel) addressLabel.style.display = '';
        if (addressField) addressField.setAttribute('aria-required', 'true');
        if (estimateEl) estimateEl.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>' +
            '<span>Estimated delivery: 30 - 45 mins</span>';
    }

    window._selectedOrderType = type;
}

Object.assign(window, {
    checkout,
    openCheckout,
    closeCheckout,
    goToStep,
    setupPayment,
    switchPayTab,
    validateAndPay,
    openRazorpay,
    placeCodOrder,
    placeOrderToFirestore,
    applyCoupon,
    removeCoupon,
    applyGiftCard,
    removeGiftCard,
    openGiftCardModal,
    closeGiftCardModal,
    buyGiftCard,
    selectGcAmount,
    redeemLoyaltyAtCheckout,
    shareOrder,
    addUpsellItem,
    selectOrderType
});
