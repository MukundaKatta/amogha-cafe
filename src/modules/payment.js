import { lockScroll, unlockScroll } from '../core/utils.js';
import { getCurrentUser, setCurrentUser, showAuthToast } from './auth.js';
import { cart, getCheckoutTotal, updateCartCount, saveCart, updateButtonState, updateFloatingCart } from './cart.js';
import { RAZORPAY_KEY, MERCHANT_NAME, WHATSAPP_NUMBER, FREE_DELIVERY_THRESHOLD, DELIVERY_FEE } from '../core/constants.js';
import { getDb } from '../core/firebase.js';

// ===== CHECKOUT FLOW =====

export let selectedPayment = 'razorpay';
export var appliedCoupon = null;
export var appliedGiftCard = null;
var selectedGcAmount = 500;

// Keep a module-level reference that cart.getCheckoutTotal can access via window
// (payment.js owns the coupon state so it re-exports a totals getter)
export function getCheckoutTotals() {
    var subtotal = cart.reduce(function(sum, item) { return sum + (item.price * item.quantity); }, 0);
    var deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
    var discount = 0;
    var total = subtotal + deliveryFee;
    if (appliedCoupon) {
        if (appliedCoupon.type === 'percent') {
            discount = Math.floor(subtotal * appliedCoupon.discount / 100);
        } else if (appliedCoupon.type === 'flat') {
            discount = appliedCoupon.discount;
        }
        discount = Math.min(discount, subtotal);
        total = subtotal - discount + deliveryFee;
    }
    // Apply gift card
    if (appliedGiftCard && appliedGiftCard.balance > 0) {
        var gcDeduction = Math.min(appliedGiftCard.balance, total);
        total = Math.max(0, total - gcDeduction);
    }
    return { subtotal: subtotal, deliveryFee: deliveryFee, discount: discount, total: total };
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
    if (cart.length === 0) {
        showAuthToast('Your cart is empty!');
        return;
    }
    if (!getCurrentUser()) {
        document.getElementById('cart-modal').style.display = 'none';
        unlockScroll();
        if (typeof window.openAuthModal === 'function') window.openAuthModal();
        showAuthToast('Please sign in to continue with your order');
        return;
    }
    document.getElementById('cart-modal').style.display = 'none';
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
    var subtotal = cart.reduce(function(sum, item) { return sum + (item.price * item.quantity); }, 0);
    var deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
    var total = subtotal + deliveryFee;

    var itemsHtml = '';
    cart.forEach(function(item) {
        itemsHtml += '<div class="co-item"><span>' + item.name + ' x' + item.quantity + '</span><span>\u20B9' + (item.price * item.quantity) + '</span></div>';
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
                upsellHtml += '<div class="upsell-card">' +
                    '<div class="upsell-info">' +
                        '<div class="upsell-name">' + item.name + '</div>' +
                        '<div class="upsell-reason">' + item.reason + '</div>' +
                    '</div>' +
                    '<span class="upsell-price">\u20B9' + item.price + '</span>' +
                    '<button class="upsell-add-btn" onclick="addUpsellItem(\'' + item.name.replace(/'/g, "\\'") + '\',' + item.price + ')">+ Add</button>' +
                '</div>';
            });
            upsellHtml += '</div></div>';
        }
    }

    document.getElementById('checkout-items').innerHTML = itemsHtml + upsellHtml;
    document.getElementById('co-subtotal').textContent = '\u20B9' + subtotal;
    document.getElementById('co-delivery').textContent = deliveryFee === 0 ? 'FREE' : '\u20B9' + deliveryFee;
    document.getElementById('co-total').textContent = '\u20B9' + total;

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

    goToStep(1);
    document.getElementById('checkout-modal').style.display = 'block';

    // Auto-apply welcome bonus
    var currentUser = getCurrentUser();
    var couponInput = document.getElementById('coupon-code');
    var couponMsg = document.getElementById('coupon-msg');
    if (currentUser && !currentUser.usedWelcomeBonus) {
        appliedCoupon = { discount: 25, type: 'percent', label: '25% off (Welcome Bonus!)' };
        couponInput.value = 'WELCOME25';
        couponMsg.textContent = 'Welcome bonus applied! You get 25% off!';
        couponMsg.className = 'coupon-msg success';
        var discount = subtotal * 0.25;
        discount = Math.min(discount, subtotal);
        var discountedTotal = subtotal - discount + deliveryFee;
        document.getElementById('co-total').textContent = '\u20B9' + discountedTotal.toFixed(0);
    } else {
        appliedCoupon = null;
        couponInput.value = '';
        couponMsg.textContent = '';
        couponMsg.className = 'coupon-msg';
    }
}

export function closeCheckout() {
    document.getElementById('checkout-modal').style.display = 'none';
    unlockScroll();
    document.getElementById('co-name').value = '';
    document.getElementById('co-phone').value = '';
    document.getElementById('co-address').value = '';
    document.getElementById('co-notes').value = '';
}

export function goToStep(step) {
    document.querySelectorAll('.checkout-step').forEach(function(s) { s.classList.remove('active'); });
    document.getElementById('checkout-step-' + step).classList.add('active');
    if (step === 3) setupPayment();
}

export function setupPayment() {
    var totals = getCheckoutTotals();
    var total = totals.total;
    var totalStr = '\u20B9' + total.toFixed(0);

    document.getElementById('pay-total').textContent = totalStr;
    var codTotal = document.getElementById('cod-total');
    if (codTotal) codTotal.textContent = totalStr;

    // Default to Razorpay tab
    selectedPayment = 'razorpay';
    switchPayTab('razorpay');
}

export function switchPayTab(tab) {
    ['razorpay', 'cod'].forEach(function(t) {
        var tabEl = document.getElementById('tab-' + t);
        var panelEl = document.getElementById('pay-panel-' + t);
        if (tabEl) tabEl.classList.toggle('active', t === tab);
        if (panelEl) panelEl.classList.toggle('active', t === tab);
    });
    selectedPayment = tab;
}

export function validateAndPay() {
    var name = document.getElementById('co-name').value.trim();
    var phone = document.getElementById('co-phone').value.trim();
    var address = document.getElementById('co-address').value.trim();
    if (!name || !phone || !address) { showAuthToast('Please fill in all required fields.'); return; }
    if (phone.length < 10) { showAuthToast('Please enter a valid phone number.'); return; }
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

    try {
        var rzp = new Razorpay(options);
        rzp.on('payment.failed', function(response) {
            showAuthToast('Payment failed: ' + (response.error.description || 'Please try again'));
            var btn = document.getElementById('razorpay-pay-btn');
            if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg> Retry Payment'; }
        });
        rzp.open();
    } catch(e) {
        showAuthToast('Error opening payment: ' + e.message);
        if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg> Pay Now'; }
    }
}

export function placeCodOrder() {
    placeOrderToFirestore('Cash on Delivery', null, 'cod-pending');
}

export function placeOrderToFirestore(payMethod, paymentRef, paymentStatus) {
    var db = getDb();
    if (typeof db === 'undefined' || !db) {
        showAuthToast('Service unavailable. Please refresh and try again.');
        return;
    }
    var name = document.getElementById('co-name').value.trim();
    var phone = document.getElementById('co-phone').value.trim();
    var address = document.getElementById('co-address').value.trim();
    var notes = document.getElementById('co-notes').value.trim();
    var totals = getCheckoutTotals();

    // Scheduled order
    var scheduleCheck = document.getElementById('schedule-order-check');
    var scheduledFor = null;
    if (scheduleCheck && scheduleCheck.checked) {
        var schedDate = document.getElementById('schedule-date');
        var schedTime = document.getElementById('schedule-time');
        if (schedDate && schedTime && schedDate.value && schedTime.value) {
            scheduledFor = new Date(schedDate.value + 'T' + schedTime.value).toISOString();
        }
    }

    document.getElementById('confirm-detail').textContent = 'Payment: ' + payMethod + (paymentRef ? ' (Ref: ' + paymentRef + ')' : '') + ' | Total: \u20B9' + totals.total.toFixed(0);

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
    document.getElementById('whatsapp-link').href = waLink;

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
        // Analytics: purchase event
        try { if (window.analytics) window.analytics.logEvent('purchase', { transaction_id: docRef.id, value: orderData.total, payment_type: payMethod }); } catch(e) {}

        // Save for split bill feature
        window._lastOrderId = docRef.id;
        window._lastOrderTotal = orderData.total;

        var trackUrl = window.location.origin + '/track/index.html?id=' + docRef.id;
        var trackDiv = document.getElementById('order-tracking-link');
        if (trackDiv) {
            trackDiv.innerHTML = '<div style="margin-top:1rem;padding:1rem;background:rgba(212,160,23,0.08);border:1px solid rgba(212,160,23,0.15);border-radius:12px;text-align:center">' +
                '<p style="font-size:0.82rem;color:#a09080;margin-bottom:0.5rem">Track your order in real-time:</p>' +
                '<a href="' + trackUrl + '" target="_blank" rel="noopener noreferrer" style="color:#D4A017;font-weight:600;font-size:0.9rem;word-break:break-all">' + trackUrl + '</a>' +
                '<br><button onclick="safeCopy(\'' + trackUrl + '\',this)" style="margin-top:0.6rem;padding:0.4rem 1rem;background:linear-gradient(135deg,#D4A017,#B8860B);color:#1a0f08;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:0.78rem">Copy Link</button>' +
                '</div>';
        }

        // Mark welcome bonus as used
        if (currentUser && !currentUser.usedWelcomeBonus && appliedCoupon && appliedCoupon.label && appliedCoupon.label.indexOf('Welcome') !== -1) {
            currentUser.usedWelcomeBonus = true;
            setCurrentUser(currentUser);
            db.collection('users').doc(currentUser.phone).update({ usedWelcomeBonus: true }).catch(function(e) { console.error('Bonus update error:', e); });
        }
        appliedCoupon = null;

        // Deduct gift card balance if used
        if (appliedGiftCard && appliedGiftCard.code) {
            var gcDeduction = Math.min(appliedGiftCard.balance, orderData.total);
            db.collection('giftCards').doc(appliedGiftCard.code).update({
                balance: firebase.firestore.FieldValue.increment(-gcDeduction),
                redeemedAt: new Date().toISOString()
            }).catch(function(e) { console.error('Gift card deduction error:', e); });
            appliedGiftCard = null;
        }

        // Clear cart only after successful save
        cart.length = 0;
        updateCartCount();
        saveCart();
        itemNames.forEach(function(n) { updateButtonState(n); });
        updateFloatingCart();

        // Launch confetti for celebration
        if (typeof launchConfetti === 'function') launchConfetti();

        // Award loyalty points
        if (typeof awardLoyaltyPoints === 'function') awardLoyaltyPoints(orderData.total);

        // Check and award badges
        if (typeof checkAndAwardBadges === 'function') {
            var badgeUser = getCurrentUser();
            if (badgeUser) checkAndAwardBadges(badgeUser, orderData);
        }

        // Award referrer points if current user was referred
        if (currentUser && db) {
            db.collection('referrals').where('refereePhone', '==', currentUser.phone).where('redeemed', '==', false).limit(1).get().then(function(snap) {
                if (!snap.empty) {
                    var ref = snap.docs[0];
                    var referrerPhone = ref.data().referrerPhone;
                    db.collection('users').doc(referrerPhone).get().then(function(uDoc) {
                        if (uDoc.exists) {
                            var pts = (uDoc.data().loyaltyPoints || 0) + 100;
                            db.collection('users').doc(referrerPhone).update({ loyaltyPoints: pts }).catch(function(e) { console.error('Referrer points error:', e); });
                        }
                    });
                    ref.ref.update({ redeemed: true }).catch(function(e) { console.error('Referral redeem error:', e); });
                }
            }).catch(function(e) { console.error('Referral lookup error:', e); });
        }

        // Schedule review prompt
        if (typeof scheduleReviewPrompt === 'function') scheduleReviewPrompt(orderData.items.map(function(i) { return { name: i.name }; }));

        // Send push notification
        if (typeof sendPushNotification === 'function') sendPushNotification('Order Placed!', 'Your order from Amogha has been placed successfully.');

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
                if (inventoryMap[key] && inventoryMap[key].qty > 0) {
                    var ref = db.collection('inventory').doc(inventoryMap[key].id);
                    batch.update(ref, { quantity: Math.max(0, inventoryMap[key].qty - item.qty) });
                    hasUpdates = true;
                }
            });
            if (hasUpdates) batch.commit().catch(function(e) { console.error('Inventory deduction error:', e); });
        }).catch(function(e) { console.error('Inventory fetch error:', e); });

    }).catch(function(err) {
        console.error('Order save error:', err);
        showAuthToast('Order failed to save. Please try again or check your connection.');
    });
}

export function applyCoupon() {
    var input = document.getElementById('coupon-code');
    var msg = document.getElementById('coupon-msg');
    var code = input.value.trim().toUpperCase();

    // Hardcoded fallback in case Firestore is unavailable
    var fallbackCoupons = {
        'AMOGHA20': { discount: 20, type: 'percent', label: '20% off' },
        'WELCOME50': { discount: 50, type: 'flat', label: '₹50 off' },
        'FIRST10': { discount: 10, type: 'percent', label: '10% off' },
        'WELCOME25': { discount: 25, type: 'percent', label: '25% off (Welcome Bonus!)' }
    };

    function applyCouponData(coupon) {
        appliedCoupon = coupon;
        msg.textContent = 'Coupon applied! ' + coupon.label;
        msg.className = 'coupon-msg success';
        var subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        var deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
        var discount = calcDiscount(coupon, subtotal);
        var total = subtotal - discount + deliveryFee;
        document.getElementById('co-total').textContent = '\u20B9' + total.toFixed(0);
    }

    var db = getDb();
    if (db) {
        db.collection('coupons').doc(code).get().then(function(doc) {
            if (doc.exists) {
                var c = doc.data();
                var subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
                var validation = validateCoupon(c, subtotal);
                if (!validation.valid) {
                    msg.textContent = validation.reason;
                    msg.className = 'coupon-msg error';
                    appliedCoupon = null;
                    return;
                }
                applyCouponData(c);
                db.collection('coupons').doc(code).update({ usedCount: firebase.firestore.FieldValue.increment(1) });
            } else if (fallbackCoupons[code]) {
                applyCouponData(fallbackCoupons[code]);
            } else {
                appliedCoupon = null;
                msg.textContent = 'Invalid coupon code. Please check and try again.';
                msg.className = 'coupon-msg error';
            }
        }).catch(function() {
            if (fallbackCoupons[code]) applyCouponData(fallbackCoupons[code]);
            else { appliedCoupon = null; msg.textContent = 'Invalid coupon code.'; msg.className = 'coupon-msg error'; }
        });
    } else if (fallbackCoupons[code]) {
        applyCouponData(fallbackCoupons[code]);
    } else {
        appliedCoupon = null;
        msg.textContent = 'Invalid coupon code. Please check and try again.';
        msg.className = 'coupon-msg error';
    }
}

export function removeCoupon() {
    appliedCoupon = null;
    var input = document.getElementById('coupon-code');
    var msg = document.getElementById('coupon-msg');
    if (input) input.value = '';
    if (msg) { msg.textContent = ''; msg.className = 'coupon-msg'; }
    setupPayment();
}

export function applyGiftCard() {
    var input = document.getElementById('giftcard-code');
    var msg = document.getElementById('giftcard-msg');
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
        var subtotal = cart.reduce(function(s, i) { return s + i.price * i.quantity; }, 0);
        var deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
        var couponDiscount = appliedCoupon ? calcDiscount(appliedCoupon, subtotal) : 0;
        var afterCoupon = subtotal - couponDiscount + deliveryFee;
        var gcDeduction = Math.min(gc.balance, afterCoupon);
        var total = afterCoupon - gcDeduction;
        document.getElementById('co-total').textContent = '\u20B9' + total.toFixed(0);
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
    document.getElementById('giftcard-modal').style.display = 'block';
    lockScroll();
}

export function closeGiftCardModal() {
    document.getElementById('giftcard-modal').style.display = 'none';
    unlockScroll();
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
    var options = {
        key: 'rzp_live_bfHYCYWDyoSHFn',
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
    var subtotal = cart.reduce(function(s, i) { return s + i.price * i.quantity; }, 0);
    var discount = Math.min(redeemable, subtotal);
    if (discount <= 0) return;
    var deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
    var total = subtotal - discount + deliveryFee;
    appliedCoupon = { discount: discount, type: 'flat', label: 'Rs.' + discount + ' (Loyalty Points)' };
    document.getElementById('co-total').textContent = 'Rs.' + total.toFixed(0);
    var msg = document.getElementById('coupon-msg');
    msg.textContent = 'Redeemed ' + pointsToUse + ' points for Rs.' + discount + ' off!';
    msg.className = 'coupon-msg success';
    document.getElementById('coupon-code').value = 'LOYALTY';
    // Deduct points
    user.loyaltyPoints -= pointsToUse;
    setCurrentUser(user);
    var db = getDb();
    if (db) {
        db.collection('users').doc(user.phone).update({ loyaltyPoints: user.loyaltyPoints }).catch(function(e) { console.error('Loyalty update error:', e); });
    }
    if (typeof updateLoyaltyWidget === 'function') updateLoyaltyWidget();
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
    addUpsellItem
});
