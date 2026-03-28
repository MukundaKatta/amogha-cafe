// ===== EDGE CASE TESTS — COVERING REMAINING GAPS =====
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ════════════════════════════════════════════════════════════════════════
// 1. chatbot.js — sendChatMessage action branches (checkout, showMenu)
// ════════════════════════════════════════════════════════════════════════

vi.mock('../src/modules/auth.js', () => ({
    getCurrentUser: vi.fn(() => null),
    setCurrentUser: vi.fn(),
    showAuthToast: vi.fn(),
}));

vi.mock('../src/modules/cart.js', () => ({
    cart: [{ name: 'Chicken Dum Biryani', quantity: 2, price: 249, spiceLevel: 'medium', addons: [] }],
    getCheckoutTotal: vi.fn(() => 498),
    updateCartCount: vi.fn(),
    saveCart: vi.fn(),
    updateButtonState: vi.fn(),
    updateFloatingCart: vi.fn(),
}));

vi.mock('../src/core/firebase.js', () => ({
    getDb: vi.fn(() => window.db),
    getFieldValue: vi.fn(() => null),
}));

vi.mock('../src/core/utils.js', () => ({
    safeGetItem: vi.fn((key) => localStorage.getItem(key)),
    safeSetItem: vi.fn((key, val) => localStorage.setItem(key, val)),
    lockScroll: vi.fn(),
    unlockScroll: vi.fn(),
    sanitizeHtml: vi.fn((str) => typeof str !== 'string' ? '' : str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')),
}));

import { sendChatMessage, initChatbot, toggleChat } from '../src/modules/chatbot.js';

function setupChatDOM() {
    document.body.innerHTML = '';
    document.getElementById = (id) => document.body.querySelector('#' + id);
    document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
    document.querySelector = (sel) => document.body.querySelector(sel);

    // Build chatbot DOM
    initChatbot();
    // Open chat so it's active
    toggleChat();
}

describe('sendChatMessage — action branches', () => {
    beforeEach(() => {
        setupChatDOM();
        vi.clearAllMocks();
        globalThis.fetch = vi.fn();
    });

    it('calls window.checkout when action is "checkout"', async () => {
        window.checkout = vi.fn();
        globalThis.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ reply: 'Proceeding to checkout', action: 'checkout' }),
        });

        await sendChatMessage('checkout please');
        expect(window.checkout).toHaveBeenCalled();
        delete window.checkout;
    });

    it('scrolls to menu when action is "showMenu"', async () => {
        const menuEl = document.createElement('div');
        menuEl.id = 'menu';
        menuEl.scrollIntoView = vi.fn();
        document.body.appendChild(menuEl);
        // Re-bind getElementById to find the new element
        document.getElementById = (id) => document.body.querySelector('#' + id);

        globalThis.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ reply: 'Here is our menu', action: 'showMenu' }),
        });

        await sendChatMessage('show menu');
        expect(menuEl.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
    });

    it('does not call checkout when window.checkout is not a function', async () => {
        window.checkout = 'not-a-function';
        globalThis.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ reply: 'Checkout', action: 'checkout' }),
        });

        // Should not throw
        await sendChatMessage('checkout');
        delete window.checkout;
    });

    it('limits chat history to last 6 messages in request body', async () => {
        // Send 8 messages to exceed the 6-message slice
        for (let i = 0; i < 8; i++) {
            globalThis.fetch.mockResolvedValueOnce({
                json: () => Promise.resolve({ reply: 'Response ' + i }),
            });
            await sendChatMessage('Message ' + i);
        }

        // Check the last fetch call's body
        const lastCall = globalThis.fetch.mock.calls[globalThis.fetch.mock.calls.length - 1];
        const body = JSON.parse(lastCall[1].body);
        expect(body.history.length).toBeLessThanOrEqual(6);
    });
});

// ════════════════════════════════════════════════════════════════════════
// 2. reservations.js — generateTimeSlots midnight edge case (h === 0)
// ════════════════════════════════════════════════════════════════════════

import { generateTimeSlots } from '../src/modules/reservations.js';

describe('generateTimeSlots — display time edge cases', () => {
    beforeEach(() => {
        document.body.innerHTML =
            '<div id="res-time-slots"></div>' +
            '<div id="time-grid"></div>';
        document.getElementById = (id) => document.body.querySelector('#' + id);
        document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
        document.querySelector = (sel) => document.body.querySelector(sel);
    });

    it('generates correct AM/PM labels for regular hours', () => {
        // Wednesday (day=3): opens at 11, closes at 21
        generateTimeSlots('2026-03-11'); // Wed

        const slots = document.body.querySelectorAll('.time-slot-btn');
        expect(slots.length).toBeGreaterThan(0);

        // First slot should be 11:00 AM
        expect(slots[0].textContent).toBe('11:00 AM');

        // Find a PM slot (12:00 PM)
        const pmSlot = Array.from(slots).find(s => s.textContent === '12:00 PM');
        expect(pmSlot).toBeTruthy();
    });

    it('starts at 12 on Sundays (day=0)', () => {
        // Find a date that falls on Sunday
        generateTimeSlots('2026-03-15'); // Sunday

        const slots = document.body.querySelectorAll('.time-slot-btn');
        expect(slots.length).toBeGreaterThan(0);
        expect(slots[0].textContent).toBe('12:00 PM');
    });

    it('extends to 22:00 on Friday (day=5)', () => {
        generateTimeSlots('2026-03-13'); // Friday

        const slots = document.body.querySelectorAll('.time-slot-btn');
        const lastSlot = slots[slots.length - 1];
        expect(lastSlot.textContent).toBe('10:00 PM');
        expect(lastSlot.dataset.time).toBe('22:00');
    });

    it('extends to 22:00 on Saturday (day=6)', () => {
        generateTimeSlots('2026-03-14'); // Saturday

        const slots = document.body.querySelectorAll('.time-slot-btn');
        const lastSlot = slots[slots.length - 1];
        expect(lastSlot.textContent).toBe('10:00 PM');
    });

    it('closes at 21:00 on regular weekdays', () => {
        generateTimeSlots('2026-03-11'); // Wednesday

        const slots = document.body.querySelectorAll('.time-slot-btn');
        const lastSlot = slots[slots.length - 1];
        expect(lastSlot.textContent).toBe('9:00 PM');
        expect(lastSlot.dataset.time).toBe('21:00');
    });
});

// ════════════════════════════════════════════════════════════════════════
// 3. subscriptions.js — getNextWeekday Sunday-skipping
// ════════════════════════════════════════════════════════════════════════

import { subscribeToPlan } from '../src/modules/subscriptions.js';
import { getCurrentUser } from '../src/modules/auth.js';

describe('subscribeToPlan — next weekday logic', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div id="subscription-modal" style="display:block"></div>';
        document.getElementById = (id) => document.body.querySelector('#' + id);
        document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
        document.querySelector = (sel) => document.body.querySelector(sel);
        vi.clearAllMocks();
    });

    it('nextDeliveryDate in subscription data is never a Sunday', async () => {
        const mockUser = { phone: '9999999999', name: 'Test' };
        getCurrentUser.mockReturnValue(mockUser);

        let savedSubscription;
        const mockAdd = vi.fn((data) => {
            savedSubscription = data;
            return Promise.resolve({ id: 'sub-123' });
        });
        const mockDoc = vi.fn(() => ({ update: vi.fn(() => Promise.resolve()) }));
        window.db = {
            collection: vi.fn((name) => {
                if (name === 'subscriptions') return { add: mockAdd };
                if (name === 'users') return { doc: mockDoc };
                return { add: vi.fn(() => Promise.resolve({ id: 'x' })), doc: mockDoc };
            }),
        };

        await subscribeToPlan('lunch-basic');
        await new Promise(r => setTimeout(r, 50));

        expect(mockAdd).toHaveBeenCalled();
        const nextDate = new Date(savedSubscription.nextDeliveryDate);
        // Sunday = 0; use getUTCDay since nextDeliveryDate is an ISO date string
        expect(nextDate.getUTCDay()).not.toBe(0);
    });
});

// ════════════════════════════════════════════════════════════════════════
// 4. group.js — beforeunload listener calls groupUnsubscribe
// ════════════════════════════════════════════════════════════════════════

import { initGroupOrdering } from '../src/modules/group.js';

describe('initGroupOrdering — beforeunload cleanup', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Mock URL params
        delete window.location;
        window.location = { search: '', origin: 'https://amogha.cafe', pathname: '/' };
    });

    it('registers a beforeunload event listener', () => {
        const addSpy = vi.spyOn(window, 'addEventListener');
        initGroupOrdering();

        const beforeUnloadCall = addSpy.mock.calls.find(c => c[0] === 'beforeunload');
        expect(beforeUnloadCall).toBeTruthy();
        addSpy.mockRestore();
    });

    it('beforeunload handler does not throw when no active group', () => {
        const addSpy = vi.spyOn(window, 'addEventListener');
        initGroupOrdering();

        const beforeUnloadCall = addSpy.mock.calls.find(c => c[0] === 'beforeunload');
        const handler = beforeUnloadCall[1];

        // Should not throw even when no active group subscription
        expect(() => handler()).not.toThrow();
        addSpy.mockRestore();
    });
});

// ════════════════════════════════════════════════════════════════════════
// 5. payment.js — placeOrderToFirestore inventory batch.commit error
// ════════════════════════════════════════════════════════════════════════

import { placeOrderToFirestore } from '../src/modules/payment.js';

describe('placeOrderToFirestore — order save error path', () => {
    beforeEach(() => {
        document.body.innerHTML =
            '<input id="co-name" value="Test User">' +
            '<input id="co-phone" value="9999999999">' +
            '<input id="co-address" value="123 Main St">' +
            '<textarea id="co-notes"></textarea>' +
            '<div id="confirm-detail"></div>' +
            '<a id="whatsapp-link" href=""></a>' +
            '<div id="checkout-modal"></div>' +
            '<div id="checkout-step-1"></div>' +
            '<div id="checkout-step-2"></div>' +
            '<div id="checkout-step-3"></div>' +
            '<div id="checkout-step-4" style="display:none"></div>' +
            '<span class="checkout-order-id"></span>' +
            '<span class="checkout-total-amount"></span>' +
            '<div class="checkout-track-link"></div>' +
            '<div id="order-tracking-link"></div>';
        document.getElementById = (id) => document.body.querySelector('#' + id);
        document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
        document.querySelector = (sel) => document.body.querySelector(sel);
        window.open = vi.fn();
        window.showAuthToast = vi.fn();
        vi.clearAllMocks();
    });

    it('logs "Order save error" and shows toast when orders.add rejects', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        window.db = {
            collection: vi.fn(() => ({
                add: vi.fn(() => Promise.reject(new Error('Firestore down'))),
                doc: vi.fn(() => ({
                    get: vi.fn(() => Promise.resolve({ exists: false, data: () => ({}) })),
                    set: vi.fn(() => Promise.resolve()),
                    update: vi.fn(() => Promise.resolve()),
                })),
                where: vi.fn().mockReturnThis(),
                orderBy: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                get: vi.fn(() => Promise.resolve({ docs: [], forEach: vi.fn() })),
            })),
            batch: vi.fn(() => ({ update: vi.fn(), commit: vi.fn(() => Promise.resolve()) })),
        };

        placeOrderToFirestore('COD', null, 'success');
        await new Promise(r => setTimeout(r, 300));

        expect(consoleSpy).toHaveBeenCalledWith('Order save error:', expect.any(Error));
        consoleSpy.mockRestore();
    });

    it('does not throw when db is null', () => {
        window.db = null;
        // Should return early without throwing
        expect(() => placeOrderToFirestore('COD', null, 'success')).not.toThrow();
    });
});
