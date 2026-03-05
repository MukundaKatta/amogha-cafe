import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    placeOrderToFirestore,
    applyCoupon,
    applyGiftCard,
    removeGiftCard,
    removeCoupon,
    redeemLoyaltyAtCheckout,
    switchPayTab,
    validateAndPay,
    setupPayment,
    openRazorpay,
    placeCodOrder,
    openCheckout,
    closeCheckout,
    goToStep,
    shareOrder,
    openGiftCardModal,
    closeGiftCardModal,
    selectGcAmount,
    appliedCoupon,
    appliedGiftCard,
} from '../src/modules/payment.js';
import { cart } from '../src/modules/cart.js';
import { setCurrentUser } from '../src/modules/auth.js';

function setCart(items) { cart.length = 0; items.forEach(i => cart.push(i)); }
function clearCart() { cart.length = 0; }

const FULL_CHECKOUT_DOM = `
    <div id="cart-modal" style="display:block"></div>
    <div id="checkout-modal" style="display:none"></div>
    <div id="checkout-items"></div>
    <span id="co-subtotal"></span>
    <span id="co-delivery"></span>
    <span id="co-total"></span>
    <div id="checkout-step-1" class="checkout-step"></div>
    <div id="checkout-step-2" class="checkout-step"></div>
    <div id="checkout-step-3" class="checkout-step"></div>
    <div id="checkout-step-4" class="checkout-step"></div>
    <input id="coupon-code" value="">
    <div id="coupon-msg"></div>
    <input id="giftcard-code" value="">
    <div id="giftcard-msg"></div>
    <div id="loyalty-redeem-btn" style="display:none"></div>
    <span id="pay-total"></span>
    <span id="cod-total"></span>
    <div id="tab-razorpay" class="active"></div>
    <div id="tab-cod"></div>
    <div id="pay-panel-razorpay" class="active"></div>
    <div id="pay-panel-cod"></div>
    <input id="co-name" value="Test User">
    <input id="co-phone" value="9876543210">
    <input id="co-address" value="123 Main St">
    <textarea id="co-notes"></textarea>
    <button id="razorpay-pay-btn">Pay Now</button>
    <div id="confirm-detail"></div>
    <a id="whatsapp-link" href="#"></a>
    <div id="order-tracking-link"></div>
    <span id="cart-count">0</span>
    <span id="cart-items-count">0</span>
    <div id="cart-fab"><span class="cart-fab-badge">0</span></div>
    <div id="floating-cart"><div class="fc-items"></div><div class="fc-total"></div></div>
    <div id="auth-toast"></div>
    <div id="giftcard-modal" style="display:none"></div>
    <div id="schedule-order-check"></div>
`;

function setupDOM() {
    document.body.innerHTML = FULL_CHECKOUT_DOM;
    document.getElementById = (id) => document.body.querySelector('#' + id);
    document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
    document.querySelector = (sel) => document.body.querySelector(sel);
}

// ═══════════════════════════════════════════════════════════════════════════
// goToStep
// ═══════════════════════════════════════════════════════════════════════════
describe('goToStep', () => {
    beforeEach(() => setupDOM());

    it('activates the specified step and deactivates others', () => {
        goToStep(2);
        expect(document.getElementById('checkout-step-2').classList.contains('active')).toBe(true);
        expect(document.getElementById('checkout-step-1').classList.contains('active')).toBe(false);
    });

    it('calls setupPayment when step is 3', () => {
        setCart([{ name: 'Item', price: 100, quantity: 1 }]);
        // setupPayment reads checkout totals and displays them
        expect(() => goToStep(3)).not.toThrow();
        expect(document.getElementById('pay-total').textContent).toContain('₹');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// switchPayTab
// ═══════════════════════════════════════════════════════════════════════════
describe('switchPayTab', () => {
    beforeEach(() => setupDOM());

    it('activates COD tab and deactivates Razorpay tab', () => {
        switchPayTab('cod');
        expect(document.getElementById('tab-cod').classList.contains('active')).toBe(true);
        expect(document.getElementById('tab-razorpay').classList.contains('active')).toBe(false);
        expect(document.getElementById('pay-panel-cod').classList.contains('active')).toBe(true);
    });

    it('activates Razorpay tab', () => {
        switchPayTab('razorpay');
        expect(document.getElementById('tab-razorpay').classList.contains('active')).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// setupPayment
// ═══════════════════════════════════════════════════════════════════════════
describe('setupPayment', () => {
    beforeEach(() => { clearCart(); setupDOM(); });

    it('displays total in pay-total element', () => {
        setCart([{ name: 'Item', price: 200, quantity: 3 }]); // 600 >= 500 → free delivery
        setupPayment();
        expect(document.getElementById('pay-total').textContent).toBe('₹600');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// validateAndPay
// ═══════════════════════════════════════════════════════════════════════════
describe('validateAndPay', () => {
    beforeEach(() => setupDOM());

    it('shows error when name is empty', () => {
        document.getElementById('co-name').value = '';
        validateAndPay();
        expect(document.getElementById('auth-toast').textContent).toMatch(/required fields/i);
    });

    it('shows error when phone is too short', () => {
        document.getElementById('co-phone').value = '12345';
        validateAndPay();
        expect(document.getElementById('auth-toast').textContent).toMatch(/phone/i);
    });

    it('shows error when address is empty', () => {
        document.getElementById('co-address').value = '';
        validateAndPay();
        expect(document.getElementById('auth-toast').textContent).toMatch(/required fields/i);
    });

    it('proceeds to step 3 when all fields are valid', () => {
        setCart([{ name: 'Item', price: 100, quantity: 1 }]);
        document.getElementById('co-name').value = 'Test User';
        document.getElementById('co-phone').value = '9876543210';
        document.getElementById('co-address').value = '123 Main Street';
        validateAndPay();
        expect(document.getElementById('checkout-step-3').classList.contains('active')).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// openRazorpay
// ═══════════════════════════════════════════════════════════════════════════
describe('openRazorpay', () => {
    beforeEach(() => { clearCart(); setupDOM(); });

    it('shows toast when Razorpay is not loaded', () => {
        window.Razorpay = undefined;
        openRazorpay();
        expect(document.getElementById('auth-toast').textContent).toMatch(/payment gateway/i);
    });

    it('opens Razorpay with correct amount when loaded', () => {
        setCart([{ name: 'Item', price: 500, quantity: 1 }]);
        const openFn = vi.fn();
        const onFn = vi.fn();
        window.Razorpay = vi.fn(() => ({ open: openFn, on: onFn }));
        openRazorpay();
        expect(window.Razorpay).toHaveBeenCalled();
        const options = window.Razorpay.mock.calls[0][0];
        expect(options.amount).toBe(50000); // 500 * 100 paise
        expect(openFn).toHaveBeenCalled();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// placeCodOrder (delegates to placeOrderToFirestore)
// ═══════════════════════════════════════════════════════════════════════════
describe('placeCodOrder', () => {
    beforeEach(() => { clearCart(); setupDOM(); });

    it('shows service unavailable when db is null', () => {
        window.db = undefined;
        placeCodOrder();
        expect(document.getElementById('auth-toast').textContent).toMatch(/service unavailable/i);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// placeOrderToFirestore
// ═══════════════════════════════════════════════════════════════════════════
describe('placeOrderToFirestore', () => {
    beforeEach(() => {
        clearCart();
        setupDOM();
        localStorage.clear();
    });

    it('shows error when db is unavailable', () => {
        window.db = undefined;
        placeOrderToFirestore('Cash on Delivery', null, 'cod-pending');
        expect(document.getElementById('auth-toast').textContent).toMatch(/service unavailable/i);
    });

    it('saves order to Firestore and clears cart on success', async () => {
        setCart([{ name: 'Biryani', price: 249, quantity: 2, spiceLevel: 'medium', addons: [] }]);
        setCurrentUser({ name: 'Test', phone: '9876543210' });

        const addMock = vi.fn(() => Promise.resolve({ id: 'ORDER-123' }));
        window.db = {
            collection: vi.fn(() => ({
                add: addMock,
                doc: vi.fn(() => ({
                    update: vi.fn(() => Promise.resolve()),
                    get: vi.fn(() => Promise.resolve({ exists: false })),
                })),
                where: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                get: vi.fn(() => Promise.resolve({ empty: true, docs: [], forEach: vi.fn() })),
                onSnapshot: vi.fn(() => vi.fn()),
            })),
        };
        window.firebase = { firestore: { FieldValue: { increment: vi.fn(n => n) } } };
        window.open = vi.fn();

        placeOrderToFirestore('Cash on Delivery', null, 'cod-pending');
        await new Promise(r => setTimeout(r, 50));

        expect(addMock).toHaveBeenCalled();
        const orderData = addMock.mock.calls[0][0];
        expect(orderData.customer).toBe('Test User');
        expect(orderData.items).toHaveLength(1);
        expect(orderData.items[0].name).toBe('Biryani');
        expect(orderData.payment).toBe('Cash on Delivery');
        expect(orderData.paymentStatus).toBe('cod-pending');
        // Cart should be cleared
        expect(cart).toHaveLength(0);
    });

    it('includes payment ref for Razorpay orders', async () => {
        setCart([{ name: 'Item', price: 100, quantity: 1, spiceLevel: 'medium', addons: [] }]);
        setCurrentUser({ name: 'Test', phone: '1111111111' });

        const addMock = vi.fn(() => Promise.resolve({ id: 'ORDER-456' }));
        window.db = {
            collection: vi.fn(() => ({
                add: addMock,
                doc: vi.fn(() => ({
                    update: vi.fn(() => Promise.resolve()),
                    get: vi.fn(() => Promise.resolve({ exists: false })),
                })),
                where: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                get: vi.fn(() => Promise.resolve({ empty: true, docs: [], forEach: vi.fn() })),
                onSnapshot: vi.fn(() => vi.fn()),
            })),
        };
        window.firebase = { firestore: { FieldValue: { increment: vi.fn(n => n) } } };
        window.open = vi.fn();

        placeOrderToFirestore('Razorpay', 'pay_abc123', 'paid');
        await new Promise(r => setTimeout(r, 50));

        const orderData = addMock.mock.calls[0][0];
        expect(orderData.payment).toBe('Razorpay');
        expect(orderData.paymentRef).toBe('pay_abc123');
        expect(orderData.paymentStatus).toBe('paid');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// applyCoupon
// ═══════════════════════════════════════════════════════════════════════════
describe('applyCoupon', () => {
    beforeEach(() => { clearCart(); setupDOM(); });

    it('applies hardcoded AMOGHA20 coupon when Firestore doc not found', async () => {
        setCart([{ name: 'Item', price: 500, quantity: 1 }]);
        document.getElementById('coupon-code').value = 'AMOGHA20';

        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    get: vi.fn(() => Promise.resolve({ exists: false, data: () => ({}) })),
                })),
            })),
        };

        applyCoupon();
        await new Promise(r => setTimeout(r, 20));

        const msg = document.getElementById('coupon-msg');
        expect(msg.textContent).toMatch(/coupon applied/i);
        expect(msg.className).toContain('success');
    });

    it('applies Firestore coupon when found and valid', async () => {
        setCart([{ name: 'Item', price: 600, quantity: 1 }]);
        document.getElementById('coupon-code').value = 'TESTCODE';

        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    get: vi.fn(() => Promise.resolve({
                        exists: true,
                        data: () => ({ active: true, type: 'percent', discount: 15, label: '15% off' }),
                    })),
                })),
            })),
        };

        applyCoupon();
        await new Promise(r => setTimeout(r, 20));
        expect(document.getElementById('coupon-msg').className).toContain('success');
    });

    it('shows error for invalid coupon code', async () => {
        document.getElementById('coupon-code').value = 'FAKECODE';
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    get: vi.fn(() => Promise.resolve({ exists: false })),
                })),
            })),
        };

        applyCoupon();
        await new Promise(r => setTimeout(r, 20));
        expect(document.getElementById('coupon-msg').className).toContain('error');
    });

    it('rejects inactive Firestore coupon', async () => {
        setCart([{ name: 'Item', price: 500, quantity: 1 }]);
        document.getElementById('coupon-code').value = 'EXPIRED';
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    get: vi.fn(() => Promise.resolve({
                        exists: true,
                        data: () => ({ active: false, type: 'flat', discount: 100 }),
                    })),
                })),
            })),
        };

        applyCoupon();
        await new Promise(r => setTimeout(r, 20));
        expect(document.getElementById('coupon-msg').className).toContain('error');
    });

    it('uses fallback coupons when Firestore errors', async () => {
        setCart([{ name: 'Item', price: 500, quantity: 1 }]);
        document.getElementById('coupon-code').value = 'WELCOME50';
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    get: vi.fn(() => Promise.reject(new Error('network'))),
                })),
            })),
        };

        applyCoupon();
        await new Promise(r => setTimeout(r, 20));
        expect(document.getElementById('coupon-msg').className).toContain('success');
    });

    it('works without db (uses fallback coupons)', () => {
        setCart([{ name: 'Item', price: 500, quantity: 1 }]);
        document.getElementById('coupon-code').value = 'FIRST10';
        window.db = null;
        applyCoupon();
        expect(document.getElementById('coupon-msg').className).toContain('success');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// removeCoupon
// ═══════════════════════════════════════════════════════════════════════════
describe('removeCoupon', () => {
    beforeEach(() => { clearCart(); setupDOM(); });

    it('clears coupon input and message', () => {
        setCart([{ name: 'Item', price: 100, quantity: 1 }]);
        document.getElementById('coupon-code').value = 'AMOGHA20';
        document.getElementById('coupon-msg').textContent = 'Applied!';
        removeCoupon();
        expect(document.getElementById('coupon-code').value).toBe('');
        expect(document.getElementById('coupon-msg').textContent).toBe('');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// applyGiftCard
// ═══════════════════════════════════════════════════════════════════════════
describe('applyGiftCard', () => {
    beforeEach(() => { clearCart(); setupDOM(); });

    it('shows error when code is empty', () => {
        document.getElementById('giftcard-code').value = '';
        applyGiftCard();
        expect(document.getElementById('giftcard-msg').className).toContain('error');
    });

    it('shows error when db is unavailable', () => {
        document.getElementById('giftcard-code').value = 'GC-TEST';
        window.db = null;
        applyGiftCard();
        expect(document.getElementById('giftcard-msg').textContent).toMatch(/unavailable/i);
    });

    it('shows error for invalid gift card code', async () => {
        document.getElementById('giftcard-code').value = 'INVALID';
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    get: vi.fn(() => Promise.resolve({ exists: false })),
                })),
            })),
        };
        applyGiftCard();
        await new Promise(r => setTimeout(r, 20));
        expect(document.getElementById('giftcard-msg').textContent).toMatch(/invalid/i);
    });

    it('shows error for inactive gift card', async () => {
        document.getElementById('giftcard-code').value = 'GC-INACTIVE';
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    get: vi.fn(() => Promise.resolve({
                        exists: true,
                        data: () => ({ active: false, balance: 500 }),
                    })),
                })),
            })),
        };
        applyGiftCard();
        await new Promise(r => setTimeout(r, 20));
        expect(document.getElementById('giftcard-msg').textContent).toMatch(/no longer active/i);
    });

    it('shows error for zero-balance gift card', async () => {
        document.getElementById('giftcard-code').value = 'GC-EMPTY';
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    get: vi.fn(() => Promise.resolve({
                        exists: true,
                        data: () => ({ active: true, balance: 0 }),
                    })),
                })),
            })),
        };
        applyGiftCard();
        await new Promise(r => setTimeout(r, 20));
        expect(document.getElementById('giftcard-msg').textContent).toMatch(/no remaining balance/i);
    });

    it('applies valid gift card and shows balance', async () => {
        setCart([{ name: 'Item', price: 500, quantity: 1 }]);
        document.getElementById('giftcard-code').value = 'GC-VALID';
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    get: vi.fn(() => Promise.resolve({
                        exists: true,
                        data: () => ({ active: true, balance: 200 }),
                    })),
                })),
            })),
        };
        applyGiftCard();
        await new Promise(r => setTimeout(r, 20));
        expect(document.getElementById('giftcard-msg').className).toContain('success');
        expect(document.getElementById('giftcard-msg').textContent).toContain('200');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// removeGiftCard
// ═══════════════════════════════════════════════════════════════════════════
describe('removeGiftCard', () => {
    beforeEach(() => { clearCart(); setupDOM(); });

    it('clears gift card input and message', () => {
        setCart([{ name: 'Item', price: 100, quantity: 1 }]);
        document.getElementById('giftcard-code').value = 'GC-TEST';
        document.getElementById('giftcard-msg').textContent = 'Applied!';
        removeGiftCard();
        expect(document.getElementById('giftcard-code').value).toBe('');
        expect(document.getElementById('giftcard-msg').textContent).toBe('');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// redeemLoyaltyAtCheckout
// ═══════════════════════════════════════════════════════════════════════════
describe('redeemLoyaltyAtCheckout', () => {
    beforeEach(() => { clearCart(); setupDOM(); localStorage.clear(); });

    it('does nothing when user is not logged in', () => {
        redeemLoyaltyAtCheckout();
        expect(document.getElementById('coupon-msg').textContent).toBe('');
    });

    it('does nothing when user has fewer than 100 loyalty points', () => {
        setCurrentUser({ name: 'Test', phone: '1234567890', loyaltyPoints: 50 });
        redeemLoyaltyAtCheckout();
        expect(document.getElementById('coupon-msg').textContent).toBe('');
    });

    it('redeems loyalty points for discount (100 pts = Rs.10)', () => {
        setCart([{ name: 'Item', price: 500, quantity: 1 }]);
        setCurrentUser({ name: 'Test', phone: '1234567890', loyaltyPoints: 350 });
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    update: vi.fn(() => Promise.resolve()),
                    onSnapshot: vi.fn(() => vi.fn()),
                })),
                where: vi.fn().mockReturnThis(),
                onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
            })),
        };
        redeemLoyaltyAtCheckout();
        const msg = document.getElementById('coupon-msg');
        expect(msg.textContent).toMatch(/redeemed/i);
        expect(msg.textContent).toContain('300'); // 300 pts used
        expect(msg.textContent).toContain('30'); // Rs.30 off
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// openCheckout / closeCheckout
// ═══════════════════════════════════════════════════════════════════════════
describe('openCheckout', () => {
    beforeEach(() => { clearCart(); setupDOM(); localStorage.clear(); });

    it('renders cart items in checkout', () => {
        setCart([{ name: 'Biryani', price: 249, quantity: 2 }]);
        openCheckout();
        expect(document.getElementById('checkout-items').innerHTML).toContain('Biryani');
    });

    it('shows checkout modal', () => {
        setCart([{ name: 'Item', price: 100, quantity: 1 }]);
        openCheckout();
        expect(document.getElementById('checkout-modal').style.display).toBe('block');
    });

    it('auto-applies welcome bonus for new users', () => {
        setCart([{ name: 'Item', price: 400, quantity: 1 }]);
        setCurrentUser({ name: 'New User', phone: '9876543210', usedWelcomeBonus: false });
        openCheckout();
        expect(document.getElementById('coupon-code').value).toBe('WELCOME25');
        expect(document.getElementById('coupon-msg').textContent).toMatch(/welcome bonus/i);
    });

    it('does not auto-apply welcome bonus for returning users', () => {
        setCart([{ name: 'Item', price: 400, quantity: 1 }]);
        setCurrentUser({ name: 'Old User', phone: '9876543210', usedWelcomeBonus: true });
        openCheckout();
        expect(document.getElementById('coupon-code').value).toBe('');
    });
});

describe('closeCheckout', () => {
    beforeEach(() => setupDOM());

    it('hides checkout modal and clears form fields', () => {
        document.getElementById('checkout-modal').style.display = 'block';
        document.getElementById('co-name').value = 'Test';
        closeCheckout();
        expect(document.getElementById('checkout-modal').style.display).toBe('none');
        expect(document.getElementById('co-name').value).toBe('');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// openGiftCardModal / closeGiftCardModal / selectGcAmount
// ═══════════════════════════════════════════════════════════════════════════
describe('openGiftCardModal / closeGiftCardModal', () => {
    beforeEach(() => setupDOM());

    it('opens gift card modal', () => {
        openGiftCardModal();
        expect(document.getElementById('giftcard-modal').style.display).toBe('block');
    });

    it('closes gift card modal', () => {
        openGiftCardModal();
        closeGiftCardModal();
        expect(document.getElementById('giftcard-modal').style.display).toBe('none');
    });
});

describe('selectGcAmount', () => {
    it('activates clicked button and deactivates others', () => {
        document.body.innerHTML = '<button class="gc-amount-btn active">500</button><button class="gc-amount-btn">1000</button>';
        document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
        const btn = document.body.querySelectorAll('.gc-amount-btn')[1];
        selectGcAmount(1000, btn);
        expect(btn.classList.contains('active')).toBe(true);
        expect(document.body.querySelectorAll('.gc-amount-btn')[0].classList.contains('active')).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// shareOrder
// ═══════════════════════════════════════════════════════════════════════════
describe('shareOrder', () => {
    beforeEach(() => {
        localStorage.clear();
        setupDOM();
    });

    it('opens WhatsApp fallback when navigator.share is not available', () => {
        navigator.share = undefined;
        window.open = vi.fn();
        setCurrentUser({ name: 'Test', phone: '1234567890', loyaltyPoints: 0 });
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    update: vi.fn(() => Promise.resolve()),
                    onSnapshot: vi.fn(() => vi.fn()),
                })),
                where: vi.fn().mockReturnThis(),
                onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
            })),
        };
        shareOrder();
        expect(window.open).toHaveBeenCalled();
        expect(window.open.mock.calls[0][0]).toContain('wa.me');
    });

    it('awards 10 loyalty points after sharing', () => {
        navigator.share = undefined;
        window.open = vi.fn();
        setCurrentUser({ name: 'Test', phone: '1234567890', loyaltyPoints: 100 });
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    update: vi.fn(() => Promise.resolve()),
                    onSnapshot: vi.fn(() => vi.fn()),
                })),
                where: vi.fn().mockReturnThis(),
                onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
            })),
        };
        shareOrder();
        const user = JSON.parse(localStorage.getItem('amoghaUser'));
        expect(user.loyaltyPoints).toBe(110);
    });
});
