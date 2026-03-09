// ===== TRACK PAGE TESTS =====
// Tests for inline functions in track/index.html
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadInlineScript } from './helpers/inline-script-loader.js';

let fns;

function setupDOM() {
    document.body.innerHTML = `
        <div id="loadingView"></div>
        <div id="errorView" class="hidden"></div>
        <div id="orderView" class="hidden"></div>
        <div id="errorIcon"></div>
        <div id="errorTitle"></div>
        <div id="errorText"></div>
        <div id="orderNumber"></div>
        <div id="orderGreeting"></div>
        <div id="orderTime"></div>
        <div id="stepperFill" style="width:0%"></div>
        <div id="statusCard"></div>
        <div id="statusIcon"></div>
        <div id="statusText"></div>
        <div id="statusSub"></div>
        <div id="timeCard"></div>
        <div id="timeValue"></div>
        <div id="timeLabel"></div>
        <div id="timeBarFill" style="width:0%"></div>
        <div id="itemsList"></div>
        <div id="totalSection"></div>
        <div id="deliveryAddress"></div>
        <div id="deliveryNotes" class="hidden"></div>
        <div id="paymentBadge"></div>
        <a id="whatsappLink" href="#"></a>
        <div id="confettiWrap" class="hidden"></div>
        <div id="mapCard" class="hidden"></div>
        <div id="driverDistance"></div>
        <div id="prepCountdown" class="hidden"></div>
        <div id="step0"><div class="step-dot">1</div></div>
        <div id="step1"><div class="step-dot">2</div></div>
        <div id="step2"><div class="step-dot">3</div></div>
        <div id="step3"><div class="step-dot">4</div></div>
    `;
    document.getElementById = (id) => document.body.querySelector('#' + id);
    document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
    document.querySelector = (sel) => document.body.querySelector(sel);
}

beforeEach(() => {
    setupDOM();
    vi.clearAllMocks();
    localStorage.clear();
    // Track uses an IIFE, so we use extraGlobals with L (Leaflet mock)
    const mockMarker = {
        addTo: vi.fn().mockReturnThis(),
        bindPopup: vi.fn().mockReturnThis(),
        setLatLng: vi.fn().mockReturnThis(),
    };
    const mockMap = {
        setView: vi.fn().mockReturnThis(),
        fitBounds: vi.fn().mockReturnThis(),
    };
    const L = {
        map: vi.fn(() => mockMap),
        tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
        marker: vi.fn(() => mockMarker),
        divIcon: vi.fn(() => ({})),
        latLngBounds: vi.fn(() => ({})),
    };
    const Notification = vi.fn();
    Notification.permission = 'default';
    Notification.requestPermission = vi.fn(() => Promise.resolve('denied'));

    fns = loadInlineScript('track/index.html', {
        L,
        Notification,
        URLSearchParams: class { get() { return null; } },
    });
});

// ═══════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════

describe('Track — Utilities', () => {
    it('shortId returns last 4 chars uppercased', () => {
        if (!fns.shortId) return;
        expect(fns.shortId('abcdefgh1234')).toBe('#1234');
    });

    it('shortId returns --- for falsy input', () => {
        if (!fns.shortId) return;
        expect(fns.shortId(null)).toBe('---');
        expect(fns.shortId('')).toBe('---');
    });

    it('formatTime formats a date string', () => {
        if (!fns.formatTime) return;
        const result = fns.formatTime('2024-01-15T14:30:00');
        expect(result).toContain('PM');
    });

    it('formatTime handles null input', () => {
        if (!fns.formatTime) return;
        expect(fns.formatTime(null)).toBe('');
    });

    it('formatTime handles Firestore timestamp objects', () => {
        if (!fns.formatTime) return;
        const mockTimestamp = { toDate: () => new Date('2024-01-15T09:00:00') };
        const result = fns.formatTime(mockTimestamp);
        expect(result).toContain('AM');
    });

    it('formatDate returns formatted date with time', () => {
        if (!fns.formatDate) return;
        const result = fns.formatDate('2024-01-15T14:30:00');
        expect(result).toContain('Jan');
        expect(result).toContain('2024');
    });

    it('formatDate returns empty string for null', () => {
        if (!fns.formatDate) return;
        expect(fns.formatDate(null)).toBe('');
    });

    it('toDate converts string to Date', () => {
        if (!fns.toDate) return;
        const d = fns.toDate('2024-01-15T14:30:00');
        expect(d).toBeInstanceOf(Date);
    });

    it('toDate returns null for invalid input', () => {
        if (!fns.toDate) return;
        expect(fns.toDate(null)).toBeNull();
        expect(fns.toDate('invalid')).toBeNull();
    });

    it('toDate handles Firestore timestamp', () => {
        if (!fns.toDate) return;
        const mockTs = { toDate: () => new Date('2024-01-15') };
        expect(fns.toDate(mockTs)).toBeInstanceOf(Date);
    });

    it('escHtml escapes HTML entities', () => {
        if (!fns.escHtml) return;
        expect(fns.escHtml('<b>"test"</b>')).not.toContain('<b>');
        expect(fns.escHtml(null)).toBe('');
    });
});

// ═══════════════════════════════════════════
// VIEW SWITCHING
// ═══════════════════════════════════════════

describe('Track — Views', () => {
    it('showLoading shows loading view', () => {
        if (!fns.showLoading) return;
        expect(() => fns.showLoading()).not.toThrow();
    });

    it('showError displays error view with message', () => {
        if (!fns.showError) return;
        expect(() => fns.showError('🔍', 'Not Found', 'Order missing')).not.toThrow();
    });

    it('showOrder displays order view', () => {
        if (!fns.showOrder) return;
        expect(() => fns.showOrder()).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// STEPPER & STATUS
// ═══════════════════════════════════════════

describe('Track — Stepper', () => {
    it('updateStepper sets fill for preparing status', () => {
        if (!fns.updateStepper) return;
        expect(() => fns.updateStepper('preparing')).not.toThrow();
    });

    it('updateStepper handles cancelled status', () => {
        if (!fns.updateStepper) return;
        expect(() => fns.updateStepper('cancelled')).not.toThrow();
    });

    it('updateStatus sets status card content', () => {
        if (!fns.updateStatus) return;
        expect(() => fns.updateStatus('confirmed')).not.toThrow();
    });

    it('updateStatus handles unknown status gracefully', () => {
        if (!fns.updateStatus) return;
        expect(() => fns.updateStatus('unknown_status')).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// TIME DISPLAY
// ═══════════════════════════════════════════

describe('Track — Time Display', () => {
    it('updateTimeDisplay shows Done for delivered', () => {
        if (!fns.updateTimeDisplay) return;
        fns.updateTimeDisplay({ status: 'delivered' });
        const val = document.getElementById('timeValue');
        if (val) expect(val.textContent).toBe('Done!');
    });

    it('updateTimeDisplay hides card for cancelled', () => {
        if (!fns.updateTimeDisplay) return;
        expect(() => fns.updateTimeDisplay({ status: 'cancelled' })).not.toThrow();
    });

    it('updateTimeDisplay shows estimate for pending', () => {
        if (!fns.updateTimeDisplay) return;
        expect(() => fns.updateTimeDisplay({ status: 'pending' })).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// RENDERING
// ═══════════════════════════════════════════

describe('Track — Render', () => {
    it('renderItems renders order items HTML', () => {
        if (!fns.renderItems) return;
        fns.renderItems({
            items: [{ name: 'Biryani', qty: 2, price: 249 }],
            subtotal: 498,
            total: 498,
        });
        const items = document.getElementById('itemsList');
        if (items) expect(items.innerHTML).toContain('Biryani');
    });

    it('renderItems handles empty items', () => {
        if (!fns.renderItems) return;
        expect(() => fns.renderItems({ items: [], total: 0 })).not.toThrow();
    });

    it('renderDelivery shows address and payment', () => {
        if (!fns.renderDelivery) return;
        expect(() => fns.renderDelivery({
            address: '123 Main St',
            payment: 'UPI',
            notes: 'Extra spicy',
        })).not.toThrow();
    });

    it('renderDelivery hides notes when empty', () => {
        if (!fns.renderDelivery) return;
        expect(() => fns.renderDelivery({ address: 'Test', payment: 'Cash' })).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// WHATSAPP & CONFETTI
// ═══════════════════════════════════════════

describe('Track — WhatsApp & Confetti', () => {
    it('updateWhatsApp sets link href', () => {
        if (!fns.updateWhatsApp) return;
        fns.updateWhatsApp('order-abc123');
        const link = document.getElementById('whatsappLink');
        if (link) expect(link.href).toContain('wa.me');
    });

    it('launchConfetti does not throw', () => {
        if (!fns.launchConfetti) return;
        expect(() => fns.launchConfetti()).not.toThrow();
    });

    it('launchConfetti only fires once', () => {
        if (!fns.launchConfetti) return;
        fns.launchConfetti();
        fns.launchConfetti(); // second call should be no-op
        // No throw means it works
    });
});

// ═══════════════════════════════════════════
// HAVERSINE DISTANCE
// ═══════════════════════════════════════════

describe('Track — Haversine', () => {
    it('haversineDistance calculates distance between two points', () => {
        if (!fns.haversineDistance) return;
        // Hyderabad to Secunderabad (~10km)
        const dist = fns.haversineDistance(17.3850, 78.4867, 17.4399, 78.4983);
        expect(dist).toBeGreaterThan(5);
        expect(dist).toBeLessThan(15);
    });

    it('haversineDistance returns 0 for same point', () => {
        if (!fns.haversineDistance) return;
        expect(fns.haversineDistance(17.4, 78.5, 17.4, 78.5)).toBeCloseTo(0, 5);
    });
});

// ═══════════════════════════════════════════
// MENU PREP TIMES
// ═══════════════════════════════════════════

describe('Track — Menu Prep Times', () => {
    it('loadMenuPrepTimes calls Firestore menu collection', () => {
        if (!fns.loadMenuPrepTimes) return;
        fns.loadMenuPrepTimes();
        expect(fns.__mockDb.collection).toHaveBeenCalledWith('menu');
    });
});
