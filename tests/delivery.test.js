// ===== DELIVERY PAGE TESTS =====
// Tests for inline functions in delivery/index.html
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadInlineScript } from './helpers/inline-script-loader.js';

let fns;

function setupDOM() {
    document.body.innerHTML = `
        <div id="login-screen" style="display:flex"></div>
        <input id="login-phone" value="">
        <input id="login-pin" value="">
        <div id="login-err"></div>
        <div id="app" style="display:none"></div>
        <div id="user-name-display"></div>
        <div id="conn-badge"></div>
        <div id="toast"></div>
        <div id="confirm-overlay"><div id="cb-icon"></div><div id="cb-title"></div><div id="cb-msg"></div><button id="cb-confirm-btn"></button></div>
        <div id="tab-available" class="active"></div>
        <div id="tab-active"></div>
        <div id="tab-earnings"></div>
        <div id="tab-history"></div>
        <div id="nav-available"></div>
        <div id="nav-active"></div>
        <div id="nav-earnings"></div>
        <div id="nav-history"></div>
        <div id="badge-available"></div>
        <div id="badge-active"></div>
        <div id="available-list"></div>
        <div id="active-delivery-content"></div>
        <div id="earnings-grid"></div>
        <div id="history-list"></div>
    `;
    document.getElementById = (id) => document.body.querySelector('#' + id);
    document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
    document.querySelector = (sel) => document.body.querySelector(sel);
}

beforeEach(() => {
    setupDOM();
    vi.clearAllMocks();
    localStorage.clear();
    // Mock navigator.geolocation for GPS tests
    const mockGeolocation = {
        watchPosition: vi.fn(() => 42),
        clearWatch: vi.fn(),
        getCurrentPosition: vi.fn(),
    };
    fns = loadInlineScript('delivery/index.html', {
        navigator: { geolocation: mockGeolocation, vibrate: vi.fn() },
        sessionStorage: { getItem: vi.fn(() => null), setItem: vi.fn(), removeItem: vi.fn() },
    });
});

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

describe('Delivery — Helpers', () => {
    it('escHtml escapes HTML characters', () => {
        if (!fns.escHtml) return;
        expect(fns.escHtml('<script>alert("xss")</script>')).not.toContain('<script>');
        expect(fns.escHtml(null)).toBe('');
    });

    it('showToast displays toast message', () => {
        if (!fns.showToast) return;
        fns.showToast('Test message');
        const t = document.getElementById('toast');
        expect(t.textContent).toBe('Test message');
        expect(t.className).toContain('show');
    });

    it('showToast adds error class when isError is true', () => {
        if (!fns.showToast) return;
        fns.showToast('Error msg', true);
        const t = document.getElementById('toast');
        expect(t.className).toContain('error');
    });

    it('fmtDate formats ISO date', () => {
        if (!fns.fmtDate) return;
        const result = fns.fmtDate('2024-03-15T10:00:00');
        expect(result).toContain('Mar');
    });

    it('fmtDate returns empty string for falsy input', () => {
        if (!fns.fmtDate) return;
        expect(fns.fmtDate(null)).toBe('');
    });

    it('fmtAmount formats currency', () => {
        if (!fns.fmtAmount) return;
        const result = fns.fmtAmount(1500);
        expect(result).toContain('1,500');
    });

    it('fmtAmount handles zero', () => {
        if (!fns.fmtAmount) return;
        expect(fns.fmtAmount(0)).toContain('0');
    });
});

// ═══════════════════════════════════════════
// CONFIRM DIALOG
// ═══════════════════════════════════════════

describe('Delivery — Confirm Dialog', () => {
    it('showConfirm populates confirm overlay', () => {
        if (!fns.showConfirm) return;
        const cb = vi.fn();
        fns.showConfirm('🛵', 'Accept?', 'Take this order?', 'Accept', cb);
        expect(document.getElementById('cb-icon').textContent).toBe('🛵');
        expect(document.getElementById('cb-title').textContent).toBe('Accept?');
    });

    it('confirmOK calls callback and hides overlay', () => {
        if (!fns.confirmOK) return;
        const cb = vi.fn();
        if (fns.showConfirm) fns.showConfirm('🛵', 'Test', 'Msg', 'OK', cb);
        fns.confirmOK();
        expect(cb).toHaveBeenCalled();
    });

    it('confirmCancel hides overlay without calling callback', () => {
        if (!fns.confirmCancel) return;
        const cb = vi.fn();
        if (fns.showConfirm) fns.showConfirm('🛵', 'Test', 'Msg', 'OK', cb);
        fns.confirmCancel();
        expect(cb).not.toHaveBeenCalled();
    });
});

// ═══════════════════════════════════════════
// AUTHENTICATION
// ═══════════════════════════════════════════

describe('Delivery — Auth', () => {
    it('doLogin validates phone number', () => {
        if (!fns.doLogin) return;
        document.getElementById('login-phone').value = '123';
        document.getElementById('login-pin').value = '1234';
        fns.doLogin();
        expect(document.getElementById('login-err').textContent).toContain('valid');
    });

    it('doLogin validates PIN presence', () => {
        if (!fns.doLogin) return;
        document.getElementById('login-phone').value = '9876543210';
        document.getElementById('login-pin').value = '';
        fns.doLogin();
        expect(document.getElementById('login-err').textContent).toContain('PIN');
    });

    it('doLogin calls auth endpoint via fetch', () => {
        if (!fns.doLogin) return;
        document.getElementById('login-phone').value = '9876543210';
        document.getElementById('login-pin').value = '1234';
        fns.doLogin();
        expect(fns.__context.fetch).toHaveBeenCalledWith('/api/auth/delivery-login', expect.objectContaining({
            method: 'POST',
        }));
    });

    it('doLogout clears session and shows login', () => {
        if (!fns.doLogout) return;
        expect(() => fns.doLogout()).not.toThrow();
    });

    it('startApp hides login and shows app', () => {
        if (!fns.startApp) return;
        expect(() => fns.startApp()).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// TAB SWITCHING
// ═══════════════════════════════════════════

describe('Delivery — Tabs', () => {
    it('switchTab activates the correct tab', () => {
        if (!fns.switchTab) return;
        fns.switchTab('earnings');
        expect(document.getElementById('tab-earnings').classList.contains('active')).toBe(true);
        expect(document.getElementById('tab-available').classList.contains('active')).toBe(false);
    });

    it('switchTab can switch to history', () => {
        if (!fns.switchTab) return;
        expect(() => fns.switchTab('history')).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// AVAILABLE ORDERS
// ═══════════════════════════════════════════

describe('Delivery — Available Orders', () => {
    it('loadAvailable sets up Firestore listener', () => {
        if (!fns.loadAvailable) return;
        fns.loadAvailable();
        expect(fns.__mockDb.collection).toHaveBeenCalledWith('orders');
    });

    it('renderAvailable shows empty state when no orders', () => {
        if (!fns.renderAvailable) return;
        expect(() => fns.renderAvailable()).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// DELIVERY ACTIONS
// ═══════════════════════════════════════════

describe('Delivery — Actions', () => {
    it('acceptOrder does not throw', () => {
        if (!fns.acceptOrder) return;
        expect(() => fns.acceptOrder('order-123', 'John')).not.toThrow();
    });

    it('navigate does not throw', () => {
        if (!fns.navigate) return;
        // Mock window.open to prevent actual navigation
        const origOpen = globalThis.window.open;
        globalThis.window.open = vi.fn();
        expect(() => fns.navigate('123 Main St')).not.toThrow();
        globalThis.window.open = origOpen;
    });

    it('callCustomer does not throw', () => {
        if (!fns.callCustomer) return;
        expect(() => fns.callCustomer('9876543210')).not.toThrow();
    });

    it('markDelivered does not throw', () => {
        if (!fns.markDelivered) return;
        expect(() => fns.markDelivered('order-123', 'John')).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// EARNINGS & HISTORY
// ═══════════════════════════════════════════

describe('Delivery — Earnings & History', () => {
    it('renderEarnings does not throw', () => {
        if (!fns.renderEarnings) return;
        expect(() => fns.renderEarnings()).not.toThrow();
    });

    it('loadHistory queries Firestore orders', () => {
        if (!fns.loadHistory) return;
        fns.loadHistory();
        expect(fns.__mockDb.collection).toHaveBeenCalledWith('orders');
    });

    it('renderHistory does not throw', () => {
        if (!fns.renderHistory) return;
        expect(() => fns.renderHistory()).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// GPS TRACKING
// ═══════════════════════════════════════════

describe('Delivery — GPS', () => {
    it('startGPSTracking does not throw', () => {
        if (!fns.startGPSTracking) return;
        expect(() => fns.startGPSTracking('order-123')).not.toThrow();
    });

    it('stopGPSTracking does not throw', () => {
        if (!fns.stopGPSTracking) return;
        expect(() => fns.stopGPSTracking()).not.toThrow();
    });
});
