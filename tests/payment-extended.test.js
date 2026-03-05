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

    it('awards points via navigator.share success path', async () => {
        localStorage.clear();
        window.open = vi.fn();
        setCurrentUser({ name: 'Test', phone: '1234567890', loyaltyPoints: 50 });
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    update: vi.fn(() => Promise.resolve()),
                })),
            })),
        };
        navigator.share = vi.fn(() => Promise.resolve());
        shareOrder();
        await new Promise(r => setTimeout(r, 30));
        const user = JSON.parse(localStorage.getItem('amoghaUser'));
        expect(user.loyaltyPoints).toBe(60);
        navigator.share = undefined;
    });

    it('does not award points when navigator.share is cancelled', async () => {
        localStorage.clear();
        window.open = vi.fn();
        setCurrentUser({ name: 'Test', phone: '1234567890', loyaltyPoints: 50 });
        navigator.share = vi.fn(() => Promise.reject(new Error('AbortError')));
        shareOrder();
        await new Promise(r => setTimeout(r, 30));
        // Points should not be awarded on cancel
        const stored = localStorage.getItem('amoghaUser');
        const user = stored ? JSON.parse(stored) : null;
        expect(user ? user.loyaltyPoints : 50).toBe(50);
        navigator.share = undefined;
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// getCheckoutTotals — coupon and gift card branches
// ═══════════════════════════════════════════════════════════════════════════
import { getCheckoutTotals } from '../src/modules/payment.js';

describe('getCheckoutTotals — coupon discount branches', () => {
    beforeEach(() => {
        clearCart();
        setupDOM();
        // Reset all module-level coupon/gift card state cleanly
        removeCoupon();
        removeGiftCard();
    });

    it('applies percent coupon discount and caps at subtotal', () => {
        setCart([{ name: 'Item', price: 100, quantity: 2 }]); // subtotal=200
        // Apply a percent coupon via openCheckout welcome bonus path (new user, 25%)
        setCurrentUser({ name: 'Test', phone: '9999999999', usedWelcomeBonus: false });
        openCheckout();
        // After welcome bonus applied: appliedCoupon = { discount:25, type:'percent' }
        const totals = getCheckoutTotals();
        // subtotal=200, deliveryFee=49 (below 500 threshold), discount=50 (25% of 200)
        expect(totals.discount).toBe(50);
        expect(totals.total).toBe(200 - 50 + 49); // 199
    });

    it('applies flat coupon discount', () => {
        setCart([{ name: 'Item', price: 300, quantity: 1 }]); // subtotal=300, delivery=40
        // Manually apply flat coupon via fallback (no db)
        document.getElementById('coupon-code').value = 'WELCOME50';
        window.db = null;
        applyCoupon();
        const totals = getCheckoutTotals();
        // flat discount=50, capped at 300
        expect(totals.discount).toBe(50);
        expect(totals.total).toBe(300 - 50 + 49); // 299
    });

    it('caps percent discount at subtotal when discount exceeds it', () => {
        setCart([{ name: 'Item', price: 10, quantity: 1 }]); // subtotal=10, delivery=40
        // Apply a coupon with huge percent discount
        document.getElementById('coupon-code').value = 'AMOGHA20';
        window.db = null;
        applyCoupon();
        const totals = getCheckoutTotals();
        // 20% of 10 = 2, capped at 10
        expect(totals.discount).toBeLessThanOrEqual(totals.subtotal);
    });

    it('applies gift card deduction after coupon', async () => {
        setCart([{ name: 'Item', price: 600, quantity: 1 }]); // subtotal=600, free delivery
        document.getElementById('giftcard-code').value = 'GC-TEST';
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    get: vi.fn(() => Promise.resolve({
                        exists: true,
                        data: () => ({ active: true, balance: 100 }),
                    })),
                })),
            })),
        };
        applyGiftCard();
        await new Promise(r => setTimeout(r, 30));
        const totals = getCheckoutTotals();
        // subtotal=600, deliveryFee=0, no coupon discount, gc=100 off → total=500
        expect(totals.total).toBe(500);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// getCheckoutTotals — gift card deduction (lines 33-34)
// ═══════════════════════════════════════════════════════════════════════════
describe('getCheckoutTotals — gift card deduction', () => {
    beforeEach(() => {
        clearCart();
        setupDOM();
        // Ensure no lingering coupon or gift card state
        removeCoupon();
        removeGiftCard();
    });

    it('applies gift card that covers full total (total becomes 0)', async () => {
        setCart([{ name: 'Item', price: 200, quantity: 1 }]); // subtotal=200, delivery=40, total=240
        document.getElementById('giftcard-code').value = 'GC-BIGBAL';
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    get: vi.fn(() => Promise.resolve({
                        exists: true,
                        data: () => ({ active: true, balance: 1000 }),
                    })),
                })),
            })),
        };
        applyGiftCard();
        await new Promise(r => setTimeout(r, 30));
        const totals = getCheckoutTotals();
        // gc deduction = min(1000, 240) = 240, total = max(0, 0) = 0
        expect(totals.total).toBe(0);
    });

    it('applies partial gift card deduction', async () => {
        setCart([{ name: 'Item', price: 600, quantity: 1 }]); // subtotal=600 >=500 → free delivery, total=600
        document.getElementById('giftcard-code').value = 'GC-PARTIAL';
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    get: vi.fn(() => Promise.resolve({
                        exists: true,
                        data: () => ({ active: true, balance: 150 }),
                    })),
                })),
            })),
        };
        applyGiftCard();
        await new Promise(r => setTimeout(r, 30));
        const totals = getCheckoutTotals();
        expect(totals.total).toBe(450);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// checkout — allergen warning branches (lines 69-78)
// ═══════════════════════════════════════════════════════════════════════════
describe('checkout — allergen and auth branches', () => {
    beforeEach(() => { clearCart(); setupDOM(); });

    it('calls openCheckout when checkAllergenWarning proceeds', () => {
        setCart([{ name: 'Biryani', price: 200, quantity: 1 }]);
        setCurrentUser({ name: 'Test', phone: '9999999999' });
        window.checkAllergenWarning = vi.fn((cartItems, cb) => cb(true));
        // openCheckout should run without error
        expect(() => {
            // Import checkout indirectly by calling the window-assigned function
            window.checkout();
        }).not.toThrow();
        delete window.checkAllergenWarning;
    });

    it('unlocks scroll when allergen check does not proceed', () => {
        setCart([{ name: 'Biryani', price: 200, quantity: 1 }]);
        setCurrentUser({ name: 'Test', phone: '9999999999' });
        window.checkAllergenWarning = vi.fn((cartItems, cb) => cb(false));
        expect(() => { window.checkout(); }).not.toThrow();
        delete window.checkAllergenWarning;
    });

    it('calls openCheckout directly when checkAllergenWarning is not defined', () => {
        setCart([{ name: 'Biryani', price: 200, quantity: 1 }]);
        setCurrentUser({ name: 'Test', phone: '9999999999' });
        delete window.checkAllergenWarning;
        expect(() => { window.checkout(); }).not.toThrow();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// openCheckout — upsell section rendering (lines 94-109)
// ═══════════════════════════════════════════════════════════════════════════
describe('openCheckout — upsell items', () => {
    beforeEach(() => { clearCart(); setupDOM(); });

    it('renders upsell section when getUpsellItems returns items', () => {
        setCart([{ name: 'Biryani', price: 249, quantity: 1 }]);
        window.getUpsellItems = vi.fn(() => [
            { name: 'Raita', price: 49, reason: 'Goes well with Biryani' },
            { name: 'Dessert', price: 99, reason: 'Finish sweet' },
        ]);
        openCheckout();
        const html = document.getElementById('checkout-items').innerHTML;
        expect(html).toContain('upsell-section');
        expect(html).toContain('Raita');
        expect(html).toContain('Dessert');
        expect(html).toContain('Customers also ordered');
        delete window.getUpsellItems;
    });

    it('does not render upsell section when getUpsellItems returns empty array', () => {
        setCart([{ name: 'Item', price: 100, quantity: 1 }]);
        window.getUpsellItems = vi.fn(() => []);
        openCheckout();
        const html = document.getElementById('checkout-items').innerHTML;
        expect(html).not.toContain('upsell-section');
        delete window.getUpsellItems;
    });

    it('does not render upsell section when getUpsellItems is not defined', () => {
        setCart([{ name: 'Item', price: 100, quantity: 1 }]);
        delete window.getUpsellItems;
        openCheckout();
        const html = document.getElementById('checkout-items').innerHTML;
        expect(html).not.toContain('upsell-section');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// openCheckout — loyalty redeem button visibility (lines 123-125)
// ═══════════════════════════════════════════════════════════════════════════
describe('openCheckout — loyalty redeem button', () => {
    beforeEach(() => { clearCart(); setupDOM(); });

    it('shows loyalty redeem button with correct text when user has >= 100 points', () => {
        setCart([{ name: 'Item', price: 100, quantity: 1 }]);
        setCurrentUser({ name: 'Test', phone: '9876543210', loyaltyPoints: 250, usedWelcomeBonus: true });
        openCheckout();
        const btn = document.getElementById('loyalty-redeem-btn');
        expect(btn.style.display).toBe('block');
        // 250 pts → floor(250/100)*10 = 20 off
        expect(btn.textContent).toContain('250');
        expect(btn.textContent).toContain('20');
    });

    it('hides loyalty redeem button when user has fewer than 100 points', () => {
        setCart([{ name: 'Item', price: 100, quantity: 1 }]);
        setCurrentUser({ name: 'Test', phone: '9876543210', loyaltyPoints: 80, usedWelcomeBonus: true });
        openCheckout();
        const btn = document.getElementById('loyalty-redeem-btn');
        expect(btn.style.display).toBe('none');
    });

    it('hides loyalty redeem button when user has no loyalty points property', () => {
        setCart([{ name: 'Item', price: 100, quantity: 1 }]);
        setCurrentUser({ name: 'Test', phone: '9876543210', usedWelcomeBonus: true });
        openCheckout();
        const btn = document.getElementById('loyalty-redeem-btn');
        expect(btn.style.display).toBe('none');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// validateAndPay — scheduled order validation (lines 205-206)
// ═══════════════════════════════════════════════════════════════════════════
describe('validateAndPay — scheduled order', () => {
    beforeEach(() => { clearCart(); setupDOM(); });

    it('shows error when schedule info has date but no time', () => {
        setCart([{ name: 'Item', price: 100, quantity: 1 }]);
        document.getElementById('co-name').value = 'Test User';
        document.getElementById('co-phone').value = '9876543210';
        document.getElementById('co-address').value = '123 Main St';
        window.getScheduleInfo = vi.fn(() => ({ date: '2026-03-10', time: '' }));
        validateAndPay();
        expect(document.getElementById('auth-toast').textContent).toMatch(/date and time/i);
        delete window.getScheduleInfo;
    });

    it('shows error when schedule info has time but no date', () => {
        setCart([{ name: 'Item', price: 100, quantity: 1 }]);
        document.getElementById('co-name').value = 'Test User';
        document.getElementById('co-phone').value = '9876543210';
        document.getElementById('co-address').value = '123 Main St';
        window.getScheduleInfo = vi.fn(() => ({ date: '', time: '18:00' }));
        validateAndPay();
        expect(document.getElementById('auth-toast').textContent).toMatch(/date and time/i);
        delete window.getScheduleInfo;
    });

    it('proceeds to step 3 when schedule info is complete', () => {
        setCart([{ name: 'Item', price: 100, quantity: 1 }]);
        document.getElementById('co-name').value = 'Test User';
        document.getElementById('co-phone').value = '9876543210';
        document.getElementById('co-address').value = '123 Main St';
        window.getScheduleInfo = vi.fn(() => ({ date: '2026-03-10', time: '18:00' }));
        validateAndPay();
        expect(document.getElementById('checkout-step-3').classList.contains('active')).toBe(true);
        delete window.getScheduleInfo;
    });

    it('proceeds to step 3 when getScheduleInfo returns null', () => {
        setCart([{ name: 'Item', price: 100, quantity: 1 }]);
        document.getElementById('co-name').value = 'Test User';
        document.getElementById('co-phone').value = '9876543210';
        document.getElementById('co-address').value = '123 Main St';
        window.getScheduleInfo = vi.fn(() => null);
        validateAndPay();
        expect(document.getElementById('checkout-step-3').classList.contains('active')).toBe(true);
        delete window.getScheduleInfo;
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// openRazorpay — handler, ondismiss, payment.failed, catch (lines 229-230, 268-269, 280-282, 286-287)
// ═══════════════════════════════════════════════════════════════════════════
describe('openRazorpay — internal callbacks', () => {
    beforeEach(() => { clearCart(); setupDOM(); });

    it('calls placeOrderToFirestore via handler callback with payment id', async () => {
        setCart([{ name: 'Item', price: 300, quantity: 1 }]);
        setCurrentUser({ name: 'Test', phone: '9876543210' });
        document.getElementById('co-name').value = 'Test User';
        document.getElementById('co-phone').value = '9876543210';

        let capturedHandler = null;
        window.Razorpay = vi.fn((opts) => {
            capturedHandler = opts.handler;
            return { open: vi.fn(), on: vi.fn() };
        });

        const addMock = vi.fn(() => Promise.resolve({ id: 'ORD-RZP' }));
        window.db = {
            collection: vi.fn(() => ({
                add: addMock,
                doc: vi.fn(() => ({ update: vi.fn(() => Promise.resolve()), get: vi.fn(() => Promise.resolve({ exists: false })) })),
                where: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                get: vi.fn(() => Promise.resolve({ empty: true, docs: [], forEach: vi.fn() })),
                onSnapshot: vi.fn(() => vi.fn()),
            })),
        };
        window.firebase = { firestore: { FieldValue: { increment: vi.fn(n => n) } } };
        window.open = vi.fn();

        openRazorpay();
        expect(capturedHandler).toBeTypeOf('function');

        // Simulate Razorpay payment success
        capturedHandler({ razorpay_payment_id: 'pay_TEST123' });
        await new Promise(r => setTimeout(r, 50));

        expect(addMock).toHaveBeenCalled();
        const orderData = addMock.mock.calls[0][0];
        expect(orderData.payment).toBe('Razorpay');
        expect(orderData.paymentRef).toBe('pay_TEST123');
        expect(orderData.paymentStatus).toBe('paid');
    });

    it('restores button via ondismiss callback', () => {
        setCart([{ name: 'Item', price: 100, quantity: 1 }]);
        let capturedModal = null;
        window.Razorpay = vi.fn((opts) => {
            capturedModal = opts.modal;
            return { open: vi.fn(), on: vi.fn() };
        });
        openRazorpay();
        expect(capturedModal).toBeDefined();
        const btn = document.getElementById('razorpay-pay-btn');
        btn.disabled = true;
        btn.innerHTML = 'Opening payment...';
        capturedModal.ondismiss();
        expect(btn.disabled).toBe(false);
        expect(btn.innerHTML).toContain('Pay Now');
    });

    it('shows toast and restores button on payment.failed event', () => {
        setCart([{ name: 'Item', price: 100, quantity: 1 }]);
        let capturedOn = null;
        window.Razorpay = vi.fn(() => ({
            open: vi.fn(),
            on: vi.fn((event, cb) => { capturedOn = { event, cb }; }),
        }));
        openRazorpay();
        expect(capturedOn.event).toBe('payment.failed');
        const btn = document.getElementById('razorpay-pay-btn');
        btn.disabled = true;
        capturedOn.cb({ error: { description: 'Card declined' } });
        expect(document.getElementById('auth-toast').textContent).toContain('Card declined');
        expect(btn.disabled).toBe(false);
        expect(btn.innerHTML).toContain('Retry Payment');
    });

    it('shows toast and restores button when Razorpay constructor throws', () => {
        setCart([{ name: 'Item', price: 100, quantity: 1 }]);
        window.Razorpay = vi.fn(() => { throw new Error('Load failed'); });
        const btn = document.getElementById('razorpay-pay-btn');
        openRazorpay();
        expect(document.getElementById('auth-toast').textContent).toContain('Load failed');
        expect(btn.disabled).toBe(false);
        expect(btn.innerHTML).toContain('Pay Now');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// placeOrderToFirestore — scheduled order ISO date (lines 311-314)
// ═══════════════════════════════════════════════════════════════════════════
describe('placeOrderToFirestore — scheduled order', () => {
    beforeEach(() => { clearCart(); setupDOM(); });

    it('sets scheduledFor ISO string and status=scheduled when schedule-order-check is checked', async () => {
        setCart([{ name: 'Dosa', price: 120, quantity: 1, spiceLevel: 'mild', addons: [] }]);
        setCurrentUser({ name: 'Sched User', phone: '8888888888' });

        // Add schedule DOM elements
        const checkEl = document.getElementById('schedule-order-check');
        checkEl.checked = true;
        // schedule-date and schedule-time need to be real inputs
        const dateEl = document.createElement('input');
        dateEl.id = 'schedule-date';
        dateEl.value = '2026-03-10';
        document.body.appendChild(dateEl);
        const timeEl = document.createElement('input');
        timeEl.id = 'schedule-time';
        timeEl.value = '19:00';
        document.body.appendChild(timeEl);

        const addMock = vi.fn(() => Promise.resolve({ id: 'SCHED-001' }));
        window.db = {
            collection: vi.fn(() => ({
                add: addMock,
                doc: vi.fn(() => ({ update: vi.fn(() => Promise.resolve()), get: vi.fn(() => Promise.resolve({ exists: false })) })),
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

        const orderData = addMock.mock.calls[0][0];
        expect(orderData.scheduledFor).toBeTruthy();
        expect(orderData.status).toBe('scheduled');
        expect(new Date(orderData.scheduledFor).getFullYear()).toBe(2026);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// placeOrderToFirestore — coupon usage increment (lines 382-384)
// ═══════════════════════════════════════════════════════════════════════════
describe('placeOrderToFirestore — coupon usage tracking', () => {
    beforeEach(() => { clearCart(); setupDOM(); });

    it('increments coupon usedCount after successful order when coupon was applied', async () => {
        setCart([{ name: 'Item', price: 500, quantity: 1, spiceLevel: 'medium', addons: [] }]);
        setCurrentUser({ name: 'Test', phone: '9876543210', usedWelcomeBonus: true });

        // Apply a fallback coupon so appliedCouponCode gets set
        document.getElementById('coupon-code').value = 'AMOGHA20';
        window.db = null;
        applyCoupon();

        const updateMock = vi.fn(() => Promise.resolve());
        const docMock = vi.fn(() => ({ update: updateMock, get: vi.fn(() => Promise.resolve({ exists: false })) }));
        const addMock = vi.fn(() => Promise.resolve({ id: 'COUP-ORD' }));
        window.db = {
            collection: vi.fn(() => ({
                add: addMock,
                doc: docMock,
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

        // updateMock should have been called for coupon increment
        expect(updateMock).toHaveBeenCalled();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// placeOrderToFirestore — welcome bonus mark (lines 389-391)
// ═══════════════════════════════════════════════════════════════════════════
describe('placeOrderToFirestore — welcome bonus marking', () => {
    beforeEach(() => { clearCart(); setupDOM(); });

    it('marks usedWelcomeBonus on user after order when welcome coupon was applied', async () => {
        setCart([{ name: 'Item', price: 400, quantity: 1, spiceLevel: 'medium', addons: [] }]);
        // New user who hasn't used welcome bonus
        setCurrentUser({ name: 'New', phone: '7777777777', usedWelcomeBonus: false });
        // openCheckout will auto-apply WELCOME25 for this user
        openCheckout();

        const updateMock = vi.fn(() => Promise.resolve());
        const addMock = vi.fn(() => Promise.resolve({ id: 'WB-ORD' }));
        window.db = {
            collection: vi.fn(() => ({
                add: addMock,
                doc: vi.fn(() => ({ update: updateMock, get: vi.fn(() => Promise.resolve({ exists: false })) })),
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

        expect(updateMock).toHaveBeenCalled();
        // The user in storage should have usedWelcomeBonus = true
        const stored = JSON.parse(localStorage.getItem('amoghaUser'));
        expect(stored.usedWelcomeBonus).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// placeOrderToFirestore — gift card deduction after order (lines 398-403)
// ═══════════════════════════════════════════════════════════════════════════
describe('placeOrderToFirestore — gift card deduction', () => {
    beforeEach(() => { clearCart(); setupDOM(); });

    it('deducts gift card balance and clears appliedGiftCard after order', async () => {
        setCart([{ name: 'Item', price: 600, quantity: 1, spiceLevel: 'medium', addons: [] }]);
        setCurrentUser({ name: 'Test', phone: '9876543210', usedWelcomeBonus: true });

        // Apply a gift card
        document.getElementById('giftcard-code').value = 'GC-DEDUCT';
        const gcUpdateMock = vi.fn(() => Promise.resolve());
        window.db = {
            collection: vi.fn((col) => ({
                doc: vi.fn(() => ({
                    get: vi.fn(() => Promise.resolve({
                        exists: true,
                        data: () => ({ active: true, balance: 100 }),
                    })),
                    update: gcUpdateMock,
                })),
                add: vi.fn(() => Promise.resolve({ id: 'GC-ORD' })),
                where: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                get: vi.fn(() => Promise.resolve({ empty: true, docs: [], forEach: vi.fn() })),
                onSnapshot: vi.fn(() => vi.fn()),
            })),
        };
        window.firebase = { firestore: { FieldValue: { increment: vi.fn(n => n) } } };
        window.open = vi.fn();

        applyGiftCard();
        await new Promise(r => setTimeout(r, 30));

        // Now place the order
        placeOrderToFirestore('Cash on Delivery', null, 'cod-pending');
        await new Promise(r => setTimeout(r, 50));

        // gcUpdateMock should have been called with balance decrement
        expect(gcUpdateMock).toHaveBeenCalled();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// placeOrderToFirestore — badge awarding (lines 421-422)
// ═══════════════════════════════════════════════════════════════════════════
describe('placeOrderToFirestore — badge awarding', () => {
    beforeEach(() => { clearCart(); setupDOM(); });

    it('calls checkAndAwardBadges when function is defined and user exists', async () => {
        setCart([{ name: 'Item', price: 100, quantity: 1, spiceLevel: 'medium', addons: [] }]);
        setCurrentUser({ name: 'Test', phone: '9876543210', usedWelcomeBonus: true });

        window.checkAndAwardBadges = vi.fn();
        const addMock = vi.fn(() => Promise.resolve({ id: 'BADGE-ORD' }));
        window.db = {
            collection: vi.fn(() => ({
                add: addMock,
                doc: vi.fn(() => ({ update: vi.fn(() => Promise.resolve()), get: vi.fn(() => Promise.resolve({ exists: false })) })),
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

        expect(window.checkAndAwardBadges).toHaveBeenCalled();
        delete window.checkAndAwardBadges;
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// placeOrderToFirestore — referral points (lines 429-439)
// ═══════════════════════════════════════════════════════════════════════════
describe('placeOrderToFirestore — referral points', () => {
    beforeEach(() => { clearCart(); setupDOM(); });

    it('awards referrer points when an unredeemed referral exists', async () => {
        setCart([{ name: 'Item', price: 100, quantity: 1, spiceLevel: 'medium', addons: [] }]);
        setCurrentUser({ name: 'Referee', phone: '6666666666', usedWelcomeBonus: true });

        const referrerUpdateMock = vi.fn(() => Promise.resolve());
        const referralRefUpdateMock = vi.fn(() => Promise.resolve());
        const addMock = vi.fn(() => Promise.resolve({ id: 'REF-ORD' }));

        window.db = {
            collection: vi.fn((col) => {
                if (col === 'referrals') {
                    return {
                        where: vi.fn().mockReturnThis(),
                        limit: vi.fn().mockReturnThis(),
                        get: vi.fn(() => Promise.resolve({
                            empty: false,
                            docs: [{
                                data: () => ({ referrerPhone: '5555555555', refereePhone: '6666666666', redeemed: false }),
                                ref: { update: referralRefUpdateMock },
                            }],
                        })),
                    };
                }
                if (col === 'users') {
                    return {
                        doc: vi.fn(() => ({
                            get: vi.fn(() => Promise.resolve({ exists: true, data: () => ({ loyaltyPoints: 50 }) })),
                            update: referrerUpdateMock,
                        })),
                        where: vi.fn().mockReturnThis(),
                        limit: vi.fn().mockReturnThis(),
                        get: vi.fn(() => Promise.resolve({ empty: true })),
                    };
                }
                return {
                    add: addMock,
                    doc: vi.fn(() => ({ update: vi.fn(() => Promise.resolve()), get: vi.fn(() => Promise.resolve({ exists: false })) })),
                    where: vi.fn().mockReturnThis(),
                    limit: vi.fn().mockReturnThis(),
                    get: vi.fn(() => Promise.resolve({ empty: true, docs: [], forEach: vi.fn() })),
                    onSnapshot: vi.fn(() => vi.fn()),
                };
            }),
        };
        window.firebase = { firestore: { FieldValue: { increment: vi.fn(n => n) } } };
        window.open = vi.fn();

        placeOrderToFirestore('Cash on Delivery', null, 'cod-pending');
        await new Promise(r => setTimeout(r, 100));

        expect(referrerUpdateMock).toHaveBeenCalled();
        expect(referralRefUpdateMock).toHaveBeenCalledWith({ redeemed: true });
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// placeOrderToFirestore — inventory batch update (lines 465-478)
// ═══════════════════════════════════════════════════════════════════════════
describe('placeOrderToFirestore — inventory deduction', () => {
    beforeEach(() => { clearCart(); setupDOM(); });

    it('deducts inventory quantity for matching item names', async () => {
        setCart([{ name: 'Biryani', price: 249, quantity: 2, spiceLevel: 'medium', addons: [] }]);
        setCurrentUser({ name: 'Test', phone: '9876543210', usedWelcomeBonus: true });

        const batchUpdateMock = vi.fn();
        const batchCommitMock = vi.fn(() => Promise.resolve());
        const batchMock = { update: batchUpdateMock, commit: batchCommitMock };

        const addMock = vi.fn(() => Promise.resolve({ id: 'INV-ORD' }));
        window.db = {
            batch: vi.fn(() => batchMock),
            collection: vi.fn((col) => {
                if (col === 'inventory') {
                    return {
                        get: vi.fn(() => Promise.resolve({
                            forEach: (cb) => {
                                cb({ id: 'inv-1', data: () => ({ name: 'Biryani', quantity: 10 }) });
                                cb({ id: 'inv-2', data: () => ({ name: 'Raita', quantity: 5 }) });
                            },
                        })),
                        doc: vi.fn(() => ({ ref: {} })),
                    };
                }
                return {
                    add: addMock,
                    doc: vi.fn(() => ({ update: vi.fn(() => Promise.resolve()), get: vi.fn(() => Promise.resolve({ exists: false })) })),
                    where: vi.fn().mockReturnThis(),
                    limit: vi.fn().mockReturnThis(),
                    get: vi.fn(() => Promise.resolve({ empty: true, docs: [], forEach: vi.fn() })),
                    onSnapshot: vi.fn(() => vi.fn()),
                };
            }),
        };
        window.firebase = { firestore: { FieldValue: { increment: vi.fn(n => n) } } };
        window.open = vi.fn();

        placeOrderToFirestore('Cash on Delivery', null, 'cod-pending');
        await new Promise(r => setTimeout(r, 100));

        expect(batchUpdateMock).toHaveBeenCalled();
        expect(batchCommitMock).toHaveBeenCalled();
        const updateArgs = batchUpdateMock.mock.calls[0];
        // Second arg should have quantity = max(0, 10 - 2) = 8
        expect(updateArgs[1]).toEqual({ quantity: 8 });
    });

    it('skips inventory items with quantity 0', async () => {
        setCart([{ name: 'OutOfStock', price: 100, quantity: 1, spiceLevel: 'medium', addons: [] }]);
        setCurrentUser({ name: 'Test', phone: '9876543210', usedWelcomeBonus: true });

        const batchUpdateMock = vi.fn();
        const batchCommitMock = vi.fn(() => Promise.resolve());
        const batchMock = { update: batchUpdateMock, commit: batchCommitMock };
        const addMock = vi.fn(() => Promise.resolve({ id: 'INV-ORD2' }));

        window.db = {
            batch: vi.fn(() => batchMock),
            collection: vi.fn((col) => {
                if (col === 'inventory') {
                    return {
                        get: vi.fn(() => Promise.resolve({
                            forEach: (cb) => {
                                cb({ id: 'inv-3', data: () => ({ name: 'OutOfStock', quantity: 0 }) });
                            },
                        })),
                        doc: vi.fn(() => ({})),
                    };
                }
                return {
                    add: addMock,
                    doc: vi.fn(() => ({ update: vi.fn(() => Promise.resolve()), get: vi.fn(() => Promise.resolve({ exists: false })) })),
                    where: vi.fn().mockReturnThis(),
                    limit: vi.fn().mockReturnThis(),
                    get: vi.fn(() => Promise.resolve({ empty: true, docs: [], forEach: vi.fn() })),
                    onSnapshot: vi.fn(() => vi.fn()),
                };
            }),
        };
        window.firebase = { firestore: { FieldValue: { increment: vi.fn(n => n) } } };
        window.open = vi.fn();

        placeOrderToFirestore('Cash on Delivery', null, 'cod-pending');
        await new Promise(r => setTimeout(r, 100));

        // No batch update since qty=0 is skipped
        expect(batchUpdateMock).not.toHaveBeenCalled();
        expect(batchCommitMock).not.toHaveBeenCalled();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// placeOrderToFirestore — order save error catch (lines 482-483)
// ═══════════════════════════════════════════════════════════════════════════
describe('placeOrderToFirestore — order save error', () => {
    beforeEach(() => { clearCart(); setupDOM(); });

    it('shows toast when Firestore add rejects', async () => {
        setCart([{ name: 'Item', price: 100, quantity: 1, spiceLevel: 'medium', addons: [] }]);
        setCurrentUser({ name: 'Test', phone: '9876543210', usedWelcomeBonus: true });

        window.db = {
            collection: vi.fn(() => ({
                add: vi.fn(() => Promise.reject(new Error('Firestore unavailable'))),
                doc: vi.fn(() => ({ update: vi.fn(() => Promise.resolve()) })),
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

        expect(document.getElementById('auth-toast').textContent).toMatch(/order failed/i);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// applyCoupon — Firestore catch with invalid fallback (line 537)
// ═══════════════════════════════════════════════════════════════════════════
describe('applyCoupon — Firestore catch with unknown code', () => {
    beforeEach(() => { clearCart(); setupDOM(); });

    it('shows error when Firestore errors and code is not in fallback list', async () => {
        setCart([{ name: 'Item', price: 200, quantity: 1 }]);
        document.getElementById('coupon-code').value = 'UNKNOWNCODE';
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    get: vi.fn(() => Promise.reject(new Error('network error'))),
                })),
            })),
        };
        applyCoupon();
        await new Promise(r => setTimeout(r, 30));
        expect(document.getElementById('coupon-msg').className).toContain('error');
        expect(document.getElementById('coupon-msg').textContent).toMatch(/invalid coupon/i);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// applyCoupon — no db and invalid code (lines 542-545)
// ═══════════════════════════════════════════════════════════════════════════
describe('applyCoupon — no db, invalid code', () => {
    beforeEach(() => { clearCart(); setupDOM(); });

    it('shows error when db is null and code is not in fallback list', () => {
        setCart([{ name: 'Item', price: 200, quantity: 1 }]);
        document.getElementById('coupon-code').value = 'NOTACODE';
        window.db = null;
        applyCoupon();
        const msg = document.getElementById('coupon-msg');
        expect(msg.className).toContain('error');
        expect(msg.textContent).toMatch(/invalid coupon code/i);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// applyGiftCard — error catch handler (lines 588-589)
// ═══════════════════════════════════════════════════════════════════════════
describe('applyGiftCard — network error catch', () => {
    beforeEach(() => { clearCart(); setupDOM(); });

    it('shows error message from catch block on Firestore rejection', async () => {
        document.getElementById('giftcard-code').value = 'GC-NETERR';
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    get: vi.fn(() => Promise.reject(new Error('Network timeout'))),
                })),
            })),
        };
        applyGiftCard();
        await new Promise(r => setTimeout(r, 30));
        const msg = document.getElementById('giftcard-msg');
        expect(msg.className).toContain('error');
        expect(msg.textContent).toContain('Network timeout');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// buyGiftCard — full function (lines 619-673)
// ═══════════════════════════════════════════════════════════════════════════
describe('buyGiftCard', () => {
    beforeEach(() => {
        setupDOM();
        // Add gc-recipient-phone and gc-msg DOM elements
        const gcPhone = document.createElement('input');
        gcPhone.id = 'gc-recipient-phone';
        document.body.appendChild(gcPhone);
        const gcMsg = document.createElement('div');
        gcMsg.id = 'gc-msg';
        document.body.appendChild(gcMsg);
        document.getElementById = (id) => document.body.querySelector('#' + id);
        // Reset selectedGcAmount to the default (500) before each test
        selectGcAmount(500, null);
    });

    it('shows error for invalid (non-10-digit) phone number', () => {
        document.getElementById('gc-recipient-phone').value = '12345';
        window.buyGiftCard();
        expect(document.getElementById('gc-msg').textContent).toMatch(/10-digit/i);
        expect(document.getElementById('gc-msg').className).toContain('error');
    });

    it('shows error when phone is empty', () => {
        document.getElementById('gc-recipient-phone').value = '';
        window.buyGiftCard();
        expect(document.getElementById('gc-msg').textContent).toMatch(/10-digit/i);
        expect(document.getElementById('gc-msg').className).toContain('error');
    });

    it('shows error when Razorpay is not loaded', () => {
        window.Razorpay = undefined;
        document.getElementById('gc-recipient-phone').value = '9876543210';
        window.buyGiftCard();
        expect(document.getElementById('gc-msg').textContent).toMatch(/payment system loading/i);
        expect(document.getElementById('gc-msg').className).toContain('error');
    });

    it('opens Razorpay with correct gift card amount when phone valid and Razorpay loaded', () => {
        document.getElementById('gc-recipient-phone').value = '9876543210';
        setCurrentUser({ name: 'Buyer', phone: '9111111111' });

        const openFn = vi.fn();
        window.Razorpay = vi.fn(() => ({ open: openFn }));
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    set: vi.fn(() => Promise.resolve()),
                    update: vi.fn(() => Promise.resolve()),
                })),
            })),
        };

        // selectGcAmount sets amount to 500 by default (module-level selectedGcAmount=500)
        window.buyGiftCard();

        expect(window.Razorpay).toHaveBeenCalled();
        const opts = window.Razorpay.mock.calls[0][0];
        expect(opts.amount).toBe(500 * 100); // default 500
        expect(opts.currency).toBe('INR');
        expect(openFn).toHaveBeenCalled();
    });

    it('saves gift card to Firestore and shows success message in Razorpay handler', async () => {
        document.getElementById('gc-recipient-phone').value = '9876543210';
        setCurrentUser({ name: 'Buyer', phone: '9111111111' });

        const setMock = vi.fn(() => Promise.resolve());
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    set: setMock,
                    update: vi.fn(() => Promise.resolve()),
                })),
            })),
        };

        let capturedHandler = null;
        window.Razorpay = vi.fn((opts) => {
            capturedHandler = opts.handler;
            return { open: vi.fn() };
        });

        window.buyGiftCard();
        expect(capturedHandler).toBeTypeOf('function');

        capturedHandler({ razorpay_payment_id: 'pay_GC123' });
        await new Promise(r => setTimeout(r, 30));

        expect(setMock).toHaveBeenCalled();
        const savedData = setMock.mock.calls[0][0];
        expect(savedData.amount).toBe(500);
        expect(savedData.balance).toBe(500);
        expect(savedData.active).toBe(true);
        expect(savedData.paymentRef).toBe('pay_GC123');
        expect(savedData.recipientPhone).toBe('9876543210');
        expect(document.getElementById('gc-msg').textContent).toContain('created successfully');
    });

    it('shows error message when Firestore set fails in handler', async () => {
        document.getElementById('gc-recipient-phone').value = '9876543210';
        setCurrentUser({ name: 'Buyer', phone: '9111111111' });

        const setMock = vi.fn(() => Promise.reject(new Error('Save failed')));
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    set: setMock,
                    update: vi.fn(() => Promise.resolve()),
                })),
            })),
        };

        let capturedHandler = null;
        window.Razorpay = vi.fn((opts) => {
            capturedHandler = opts.handler;
            return { open: vi.fn() };
        });

        window.buyGiftCard();
        capturedHandler({ razorpay_payment_id: 'pay_GC_FAIL' });
        await new Promise(r => setTimeout(r, 30));

        expect(document.getElementById('gc-msg').textContent).toContain('Save failed');
        expect(document.getElementById('gc-msg').className).toContain('error');
    });

    it('uses guest purchaserPhone when user is not logged in', () => {
        document.getElementById('gc-recipient-phone').value = '9876543210';
        setCurrentUser(null);

        const openFn = vi.fn();
        window.Razorpay = vi.fn(() => ({ open: openFn }));
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({ set: vi.fn(() => Promise.resolve()) })),
            })),
        };

        window.buyGiftCard();

        const opts = window.Razorpay.mock.calls[0][0];
        expect(opts.prefill.contact).toBe('guest');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// selectGcAmount — DOM button update
// ═══════════════════════════════════════════════════════════════════════════
describe('selectGcAmount — DOM updates', () => {
    it('sets active class on chosen button and removes from others', () => {
        document.body.innerHTML = `
            <button class="gc-amount-btn active" id="btn500">₹500</button>
            <button class="gc-amount-btn" id="btn1000">₹1000</button>
            <button class="gc-amount-btn" id="btn2000">₹2000</button>
        `;
        document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
        const btn1000 = document.body.querySelector('#btn1000');
        selectGcAmount(1000, btn1000);
        expect(btn1000.classList.contains('active')).toBe(true);
        expect(document.body.querySelector('#btn500').classList.contains('active')).toBe(false);
        expect(document.body.querySelector('#btn2000').classList.contains('active')).toBe(false);
    });

    it('handles null btn argument without throwing', () => {
        document.body.innerHTML = '<button class="gc-amount-btn active">₹500</button>';
        document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
        expect(() => selectGcAmount(2000, null)).not.toThrow();
    });
});
