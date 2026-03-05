import { describe, it, expect, beforeEach, vi } from 'vitest';
import { openReservationModal, closeReservationModal, generateTimeSlots, submitReservation, initReservations } from '../src/modules/reservations.js';
import { setCurrentUser } from '../src/modules/auth.js';

function setupDOM(html) {
    document.body.innerHTML = html;
    document.getElementById = (id) => document.body.querySelector('#' + id);
    document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
    document.querySelector = (sel) => document.body.querySelector(sel);
}

const RESERVATION_MODAL_HTML = `
<div id="reservation-modal" style="display:none">
    <form id="reservation-form"></form>
</div>
`;

const SUBMIT_DOM_HTML = `
<input id="res-name" value="Test">
<input id="res-phone" value="1234567890">
<input id="res-date" value="2026-03-05">
<input id="res-time" value="12:00">
<button class="party-btn active" data-size="4">4</button>
<textarea id="res-requests"></textarea>
<div id="res-msg"></div>
`;

beforeEach(() => {
    document.body.innerHTML = '';
    document.getElementById = (id) => document.body.querySelector('#' + id);
    document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
    document.querySelector = (sel) => document.body.querySelector(sel);
    window.db = undefined;
    localStorage.clear();
    vi.restoreAllMocks();
});

// ===== openReservationModal =====

describe('openReservationModal', () => {
    it('returns early when no modal element exists', () => {
        setupDOM('<div></div>');
        expect(() => openReservationModal()).not.toThrow();
    });

    it('shows modal when it exists (display=block)', () => {
        setupDOM(RESERVATION_MODAL_HTML);
        const form = document.getElementById('reservation-form');
        form.dataset.enhanced = 'true';
        openReservationModal();
        const modal = document.getElementById('reservation-modal');
        expect(modal.style.display).toBe('block');
    });

    it('enhances form with date/time/party fields', () => {
        setupDOM(RESERVATION_MODAL_HTML);
        openReservationModal();
        const form = document.getElementById('reservation-form');
        expect(form.dataset.enhanced).toBe('true');
        expect(document.getElementById('res-name')).not.toBeNull();
        expect(document.getElementById('res-phone')).not.toBeNull();
        expect(document.getElementById('res-date')).not.toBeNull();
        expect(document.getElementById('res-time')).not.toBeNull();
        expect(document.getElementById('res-requests')).not.toBeNull();
        expect(document.getElementById('party-btns')).not.toBeNull();
    });

    it('pre-fills user info when logged in', () => {
        setupDOM(RESERVATION_MODAL_HTML);
        setCurrentUser({ name: 'Ravi Kumar', phone: '9876543210', pin: '1234' });
        openReservationModal();
        expect(document.getElementById('res-name').value).toBe('Ravi Kumar');
        expect(document.getElementById('res-phone').value).toBe('9876543210');
    });

    it('does not re-enhance already enhanced form (dataset.enhanced=true)', () => {
        setupDOM(RESERVATION_MODAL_HTML);
        openReservationModal();
        const form = document.getElementById('reservation-form');
        expect(form.dataset.enhanced).toBe('true');
        // Inject a sentinel to detect whether innerHTML gets wiped on second call
        form.setAttribute('data-sentinel', 'keep-me');
        openReservationModal();
        expect(form.getAttribute('data-sentinel')).toBe('keep-me');
    });
});

// ===== closeReservationModal =====

describe('closeReservationModal', () => {
    it('hides modal', () => {
        setupDOM(RESERVATION_MODAL_HTML);
        const modal = document.getElementById('reservation-modal');
        modal.style.display = 'block';
        closeReservationModal();
        expect(modal.style.display).toBe('none');
    });

    it('does nothing when no modal', () => {
        setupDOM('<div></div>');
        expect(() => closeReservationModal()).not.toThrow();
    });
});

// ===== generateTimeSlots =====

describe('generateTimeSlots', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div id="res-time-slots"></div><input id="res-time" value="">';
        document.getElementById = (id) => document.body.querySelector('#' + id);
        document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
        document.querySelector = (sel) => document.body.querySelector(sel);
    });

    it('generates time slots for a weekday (start at 11)', () => {
        // 2026-03-04 is a Wednesday (getDay()=3)
        generateTimeSlots('2026-03-04');
        const buttons = document.body.querySelectorAll('.time-slot-btn');
        expect(buttons.length).toBeGreaterThan(0);
        expect(buttons[0].dataset.time).toBe('11:00');
    });

    it('generates time slots for Sunday (start at 12)', () => {
        // Explicit timezone keeps this date on Sunday across environments.
        generateTimeSlots('2026-03-08T12:00:00-08:00');
        const buttons = document.body.querySelectorAll('.time-slot-btn');
        expect(buttons.length).toBeGreaterThan(0);
        expect(buttons[0].dataset.time).toBe('12:00');
    });

    it('generates slots for Friday/Saturday (end at 22)', () => {
        // Explicit timezone keeps this date on Friday across environments.
        generateTimeSlots('2026-03-06T12:00:00-08:00');
        const buttons = document.body.querySelectorAll('.time-slot-btn');
        const times = Array.from(buttons).map(b => b.dataset.time);
        expect(times).toContain('22:00');
        // The loop breaks when h===endHour && m>0, so 22:30 must never appear
        expect(times).not.toContain('22:30');
    });

    it('does nothing when container is missing', () => {
        document.body.innerHTML = '<div></div>';
        document.getElementById = (id) => document.body.querySelector('#' + id);
        expect(() => generateTimeSlots('2026-03-04')).not.toThrow();
    });

    it('creates time-slot-btn buttons', () => {
        generateTimeSlots('2026-03-04');
        const buttons = document.body.querySelectorAll('.time-slot-btn');
        expect(buttons.length).toBeGreaterThan(0);
        buttons.forEach(btn => {
            expect(btn.className).toContain('time-slot-btn');
            expect(btn.type).toBe('button');
        });
    });
});

// ===== submitReservation =====

describe('submitReservation', () => {
    beforeEach(() => {
        setupDOM(SUBMIT_DOM_HTML);
    });

    it('shows error when fields are missing', () => {
        document.getElementById('res-name').value = '';
        submitReservation();
        const msg = document.getElementById('res-msg');
        expect(msg.textContent).toBe('Please fill in all required fields.');
        expect(msg.className).toContain('error');
    });

    it('shows error for invalid phone number', () => {
        document.getElementById('res-phone').value = '12345';
        submitReservation();
        const msg = document.getElementById('res-msg');
        expect(msg.textContent).toBe('Please enter a valid 10-digit phone number.');
        expect(msg.className).toContain('error');
    });

    it('shows "Booking your table..." message', () => {
        window.db = {
            collection: vi.fn(() => ({
                add: vi.fn(() => new Promise(() => {})), // intentionally never resolves
            })),
        };
        submitReservation();
        const msg = document.getElementById('res-msg');
        expect(msg.textContent).toBe('Booking your table...');
    });

    it('shows error when db is null', () => {
        window.db = null;
        submitReservation();
        const msg = document.getElementById('res-msg');
        expect(msg.textContent).toBe('Service unavailable. Please refresh and try again.');
        expect(msg.className).toContain('error');
    });

    it('saves reservation to Firestore on success', async () => {
        const addMock = vi.fn(() => Promise.resolve({ id: 'RES-ABC123' }));
        window.db = {
            collection: vi.fn(() => ({ add: addMock })),
        };
        // The success handler replaces reservation-form innerHTML — provide it in the DOM
        document.body.innerHTML += '<form id="reservation-form"></form>';
        document.getElementById = (id) => document.body.querySelector('#' + id);
        submitReservation();
        await new Promise(r => setTimeout(r, 0));
        expect(window.db.collection).toHaveBeenCalledWith('reservations');
        expect(addMock).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'Test',
                phone: '1234567890',
                date: '2026-03-05',
                time: '12:00',
                partySize: 4,
                status: 'pending',
            })
        );
    });

    it('shows confirmation with booking ID', async () => {
        window.db = {
            collection: vi.fn(() => ({
                add: vi.fn(() => Promise.resolve({ id: 'RES-ABC123' })),
            })),
        };
        document.body.innerHTML += '<form id="reservation-form"></form>';
        document.getElementById = (id) => document.body.querySelector('#' + id);
        submitReservation();
        await new Promise(r => setTimeout(r, 0));
        const form = document.getElementById('reservation-form');
        // docRef.id is 'RES-ABC123'; last 6 chars uppercased → 'ABC123'
        expect(form.innerHTML).toContain('ABC123');
        expect(form.innerHTML).toContain('Reservation Confirmed!');
    });

    it('shows error on Firestore failure', async () => {
        window.db = {
            collection: vi.fn(() => ({
                add: vi.fn(() => Promise.reject(new Error('Firestore error'))),
            })),
        };
        submitReservation();
        await new Promise(r => setTimeout(r, 0));
        const msg = document.getElementById('res-msg');
        expect(msg.textContent).toBe('Failed to book. Please try again.');
        expect(msg.className).toContain('error');
    });
});

// ===== initReservations =====

describe('initReservations', () => {
    it('does not throw', () => {
        setupDOM('<div></div>');
        expect(() => initReservations()).not.toThrow();
    });

    it('overrides reservation button click', () => {
        setupDOM(`
            <button class="cta-button secondary">Reserve a Table</button>
            <div id="reservation-modal" style="display:none">
                <form id="reservation-form"></form>
            </div>
        `);
        initReservations();
        const btn = document.querySelector('.cta-button.secondary');
        expect(btn).not.toBeNull();
        btn.click();
        const modal = document.getElementById('reservation-modal');
        expect(modal.style.display).toBe('block');
    });

    it('attaches fallback submit handler that resets form and hides modal (lines 171-175)', () => {
        setupDOM(`
            <div id="reservation-modal" style="display:block">
                <form id="reservation-form">
                    <input name="test" value="value">
                </form>
            </div>
            <div id="auth-toast"></div>
        `);
        // Make showAuthToast available on window
        window.showAuthToast = vi.fn();
        initReservations();

        const form = document.getElementById('reservation-form');
        // Simulate submit event
        const submitEvent = new Event('submit', { cancelable: true, bubbles: true });
        form.dispatchEvent(submitEvent);

        expect(submitEvent.defaultPrevented).toBe(true);
        expect(window.showAuthToast).toHaveBeenCalledWith(expect.stringContaining('Reservation request received'));
        const modal = document.getElementById('reservation-modal');
        expect(modal.style.display).toBe('none');
    });

    it('fallback submit handler does not throw when showAuthToast is not a function', () => {
        setupDOM(`
            <div id="reservation-modal" style="display:block">
                <form id="reservation-form"></form>
            </div>
        `);
        delete window.showAuthToast;
        initReservations();

        const form = document.getElementById('reservation-form');
        const submitEvent = new Event('submit', { cancelable: true, bubbles: true });
        expect(() => form.dispatchEvent(submitEvent)).not.toThrow();
    });
});

// ===== Party size button onclick (lines 42-43) =====

describe('openReservationModal — party size button onclick', () => {
    it('clicking a party button adds active class and removes it from others (lines 42-43)', () => {
        setupDOM(RESERVATION_MODAL_HTML);
        openReservationModal();
        const partyBtns = document.body.querySelectorAll('.party-btn');
        expect(partyBtns.length).toBe(12);

        // Click first button
        partyBtns[0].click();
        expect(partyBtns[0].classList.contains('active')).toBe(true);

        // Click third button — first should lose active
        partyBtns[2].click();
        expect(partyBtns[0].classList.contains('active')).toBe(false);
        expect(partyBtns[2].classList.contains('active')).toBe(true);
    });
});

// ===== Date input change → generateTimeSlots (line 49) =====

describe('openReservationModal — date input change triggers time slot generation', () => {
    it('generates time slots when date input changes (line 49)', () => {
        setupDOM(RESERVATION_MODAL_HTML);
        openReservationModal();
        const dateInput = document.getElementById('res-date');
        expect(dateInput).not.toBeNull();

        // Set a value and dispatch change event
        dateInput.value = '2026-03-04';
        dateInput.dispatchEvent(new Event('change'));

        const timeSlots = document.body.querySelectorAll('.time-slot-btn');
        expect(timeSlots.length).toBeGreaterThan(0);
    });
});

// ===== Form onsubmit → submitReservation (lines 53-54) =====

describe('openReservationModal — form onsubmit calls submitReservation', () => {
    it('prevents default and calls submitReservation on form submit (lines 53-54)', () => {
        setupDOM(RESERVATION_MODAL_HTML);
        openReservationModal();
        const form = document.getElementById('reservation-form');

        // Fill required fields so submitReservation proceeds
        document.getElementById('res-name').value = 'Test';
        document.getElementById('res-phone').value = '1234567890';
        document.getElementById('res-date').value = '2026-03-05';
        document.getElementById('res-time').value = '12:00';

        // Activate a party button
        const partyBtn = document.body.querySelector('.party-btn');
        partyBtn.click();

        // submitReservation will try getDb() which returns window.db
        window.db = null;

        const submitEvent = new Event('submit', { cancelable: true, bubbles: true });
        form.dispatchEvent(submitEvent);

        expect(submitEvent.defaultPrevented).toBe(true);
        // Since db is null, submitReservation shows service unavailable error
        const msg = document.getElementById('res-msg');
        expect(msg.textContent).toContain('Service unavailable');
    });
});

// ===== Time slot button onclick (lines 89-91) =====

describe('generateTimeSlots — time slot button onclick', () => {
    it('clicking a time slot sets it active and updates hidden res-time input (lines 89-91)', () => {
        document.body.innerHTML = '<div id="res-time-slots"></div><input id="res-time" value="">';
        document.getElementById = (id) => document.body.querySelector('#' + id);
        document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
        document.querySelector = (sel) => document.body.querySelector(sel);

        generateTimeSlots('2026-03-04');
        const slots = document.body.querySelectorAll('.time-slot-btn');
        expect(slots.length).toBeGreaterThan(0);

        // Click the first slot
        slots[0].click();
        expect(slots[0].classList.contains('active')).toBe(true);
        expect(document.getElementById('res-time').value).toBe(slots[0].dataset.time);

        // Click a different slot — first should lose active
        slots[2].click();
        expect(slots[0].classList.contains('active')).toBe(false);
        expect(slots[2].classList.contains('active')).toBe(true);
        expect(document.getElementById('res-time').value).toBe(slots[2].dataset.time);
    });
});

// ===== Uncovered branches — time display formatting in confirmation =====

describe('reservations.js uncovered branches — time display formatting', () => {
    beforeEach(() => {
        setupDOM(SUBMIT_DOM_HTML);
    });

    it('formats PM times correctly (h > 12) in confirmation (lines 141-149)', async () => {
        setupDOM(`
            <input id="res-name" value="Test">
            <input id="res-phone" value="1234567890">
            <input id="res-date" value="2026-03-05">
            <input id="res-time" value="19:30">
            <button class="party-btn active" data-size="4">4</button>
            <textarea id="res-requests"></textarea>
            <div id="res-msg"></div>
            <form id="reservation-form"></form>
        `);
        window.db = {
            collection: vi.fn(() => ({
                add: vi.fn(() => Promise.resolve({ id: 'RES-TEST123' })),
            })),
        };
        submitReservation();
        await new Promise(r => setTimeout(r, 0));
        const form = document.getElementById('reservation-form');
        expect(form.innerHTML).toContain('7:30 PM');
    });

    it('formats AM times correctly (h < 12) in confirmation (lines 141-149)', async () => {
        setupDOM(`
            <input id="res-name" value="Test">
            <input id="res-phone" value="1234567890">
            <input id="res-date" value="2026-03-05">
            <input id="res-time" value="09:00">
            <button class="party-btn active" data-size="4">4</button>
            <textarea id="res-requests"></textarea>
            <div id="res-msg"></div>
            <form id="reservation-form"></form>
        `);
        window.db = {
            collection: vi.fn(() => ({
                add: vi.fn(() => Promise.resolve({ id: 'RES-TEST456' })),
            })),
        };
        submitReservation();
        await new Promise(r => setTimeout(r, 0));
        const form = document.getElementById('reservation-form');
        expect(form.innerHTML).toContain('9:00 AM');
    });

    it('shows singular "Guest" for party size of 1 (line 149 ternary)', async () => {
        // Override party button to have size=1
        setupDOM(`
            <input id="res-name" value="Test">
            <input id="res-phone" value="1234567890">
            <input id="res-date" value="2026-03-05">
            <input id="res-time" value="12:00">
            <button class="party-btn active" data-size="1">1</button>
            <textarea id="res-requests"></textarea>
            <div id="res-msg"></div>
            <form id="reservation-form"></form>
        `);
        window.db = {
            collection: vi.fn(() => ({
                add: vi.fn(() => Promise.resolve({ id: 'RES-SING123' })),
            })),
        };
        submitReservation();
        await new Promise(r => setTimeout(r, 0));
        const form = document.getElementById('reservation-form');
        // With partySize=1, should show "1 Guest" (no 's')
        expect(form.innerHTML).toContain('1 Guest');
        expect(form.innerHTML).not.toContain('1 Guests');
    });

    it('shows plural "Guests" for party size > 1 (line 149 ternary)', async () => {
        setupDOM(`
            <input id="res-name" value="Test">
            <input id="res-phone" value="1234567890">
            <input id="res-date" value="2026-03-05">
            <input id="res-time" value="12:00">
            <button class="party-btn active" data-size="4">4</button>
            <textarea id="res-requests"></textarea>
            <div id="res-msg"></div>
            <form id="reservation-form"></form>
        `);
        window.db = {
            collection: vi.fn(() => ({
                add: vi.fn(() => Promise.resolve({ id: 'RES-PLUR123' })),
            })),
        };
        submitReservation();
        await new Promise(r => setTimeout(r, 0));
        const form = document.getElementById('reservation-form');
        expect(form.innerHTML).toContain('4 Guests');
    });
});

// ===========================================================================
// Branch coverage: openReservationModal — pre-fill when user has no name/phone (lines 59-60)
// ===========================================================================
describe('openReservationModal — pre-fill with empty user fields (lines 59-60)', () => {
    beforeEach(() => {
        localStorage.clear();
        document.body.innerHTML = '';
        document.getElementById = (id) => document.body.querySelector('#' + id);
        document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
        document.querySelector = (sel) => document.body.querySelector(sel);
    });

    it('pre-fills empty strings when user has no name or phone', () => {
        setupDOM(`<div id="reservation-modal" style="display:none"><form id="reservation-form"></form></div>`);
        setCurrentUser({ pin: '1234' }); // no name, no phone
        openReservationModal();
        expect(document.getElementById('res-name').value).toBe('');
        expect(document.getElementById('res-phone').value).toBe('');
    });

    it('pre-fills name and phone when user has them', () => {
        setupDOM(`<div id="reservation-modal" style="display:none"><form id="reservation-form"></form></div>`);
        setCurrentUser({ name: 'Ravi', phone: '9876543210', pin: '1234' });
        openReservationModal();
        expect(document.getElementById('res-name').value).toBe('Ravi');
        expect(document.getElementById('res-phone').value).toBe('9876543210');
    });

    it('skips pre-fill when user is null', () => {
        setupDOM(`<div id="reservation-modal" style="display:none"><form id="reservation-form"></form></div>`);
        localStorage.clear(); // no user
        openReservationModal();
        expect(document.getElementById('res-name').value).toBe('');
        expect(document.getElementById('res-phone').value).toBe('');
    });
});

// ===========================================================================
// Branch coverage: initReservations — fallback submit + modal hide (line 175)
// ===========================================================================
describe('initReservations — fallback submit handler hides modal (line 175)', () => {
    beforeEach(() => {
        localStorage.clear();
        document.body.innerHTML = '';
        document.getElementById = (id) => document.body.querySelector('#' + id);
        document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
        document.querySelector = (sel) => document.body.querySelector(sel);
        window.showAuthToast = vi.fn();
    });

    it('hides reservation modal on form submit via fallback handler', () => {
        setupDOM(`
            <div id="reservation-modal" style="display:block">
                <form id="reservation-form">
                    <input name="test" value="val">
                </form>
            </div>
        `);
        initReservations();
        const form = document.getElementById('reservation-form');
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);
        const modal = document.getElementById('reservation-modal');
        expect(modal.style.display).toBe('none');
    });

    it('calls showAuthToast on fallback submit', () => {
        setupDOM(`
            <div id="reservation-modal" style="display:block">
                <form id="reservation-form">
                    <input name="test" value="val">
                </form>
            </div>
        `);
        window.showAuthToast = vi.fn();
        initReservations();
        const form = document.getElementById('reservation-form');
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);
        expect(window.showAuthToast).toHaveBeenCalledWith(expect.stringContaining('Reservation'));
    });
});
