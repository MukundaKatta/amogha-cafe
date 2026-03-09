// ===== LOYALTY PAGE TESTS =====
// Tests for inline checkPoints() function in loyalty/index.html
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadInlineScript } from './helpers/inline-script-loader.js';

let fns;

function setupDOM() {
    document.body.innerHTML = `
        <input type="tel" id="phone-input" value="">
        <button class="check-btn">Check</button>
        <div id="shop-name">Amogha Cafe</div>
        <div id="loading-msg" style="display:none"></div>
        <div id="error-msg" style="display:none">No account found for this number.</div>
        <div id="result" style="display:none">
            <div id="cust-name"></div>
            <div id="cust-sub"></div>
            <div id="pts-number">0</div>
            <div id="stat-visits">0</div>
            <div id="stat-spent">₹0</div>
            <div id="stat-last">—</div>
            <div id="prog-label-left">0 pts</div>
            <div id="prog-label-right">100 pts = ₹100 off</div>
            <div id="progress-fill" style="width:0%"></div>
            <div id="reward-msg"></div>
        </div>
    `;

    // Restore real DOM methods (setup.js overrides them with vi.fn(() => null))
    document.getElementById = (id) => document.body.querySelector('#' + id);
    document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
    document.querySelector = (sel) => document.body.querySelector(sel);
}

beforeEach(() => {
    setupDOM();
    vi.clearAllMocks();
    fns = loadInlineScript('loyalty/index.html');
});

describe('checkPoints', () => {
    it('does nothing if phone number is less than 10 digits', async () => {
        document.getElementById('phone-input').value = '12345';
        fns.checkPoints();
        // loading-msg should not be shown
        expect(document.getElementById('loading-msg').style.display).not.toBe('block');
    });

    it('shows loading message while fetching', () => {
        document.getElementById('phone-input').value = '9876543210';
        fns.checkPoints();
        expect(document.getElementById('loading-msg').style.display).toBe('block');
    });

    it('shows error when user not found', async () => {
        document.getElementById('phone-input').value = '9876543210';
        // Mock db.collection('users').doc(phone).get() to return non-existent doc
        const mockDocGet = vi.fn(() => Promise.resolve({ exists: false, data: () => ({}) }));
        fns.__mockDb.collection.mockReturnValue({
            doc: vi.fn(() => ({ get: mockDocGet })),
            limit: vi.fn().mockReturnThis(),
            get: vi.fn(() => Promise.resolve({ empty: true, docs: [] })),
        });

        fns.checkPoints();
        await new Promise(r => setTimeout(r, 50));

        expect(document.getElementById('error-msg').style.display).toBe('block');
        expect(document.getElementById('result').style.display).toBe('none');
    });

    it('renders user data when found', async () => {
        document.getElementById('phone-input').value = '9876543210';
        const mockData = {
            name: 'Mukunda Katta',
            loyaltyPoints: 50,
            visits: 12,
            totalSpent: 8000,
            lastOrderAt: '2026-03-01T10:00:00Z',
            createdAt: '2025-01-15T10:00:00Z',
        };
        const mockDocGet = vi.fn(() => Promise.resolve({ exists: true, data: () => mockData }));
        fns.__mockDb.collection.mockReturnValue({
            doc: vi.fn(() => ({ get: mockDocGet })),
            limit: vi.fn().mockReturnThis(),
            get: vi.fn(() => Promise.resolve({ empty: true, docs: [] })),
        });

        fns.checkPoints();
        await new Promise(r => setTimeout(r, 50));

        expect(document.getElementById('result').style.display).toBe('block');
        expect(document.getElementById('cust-name').textContent).toBe('Mukunda Katta');
        expect(document.getElementById('pts-number').textContent).toBe('50');
        expect(document.getElementById('stat-visits').textContent).toBe('12');
    });

    it('shows reward-ready message when points >= 100', async () => {
        document.getElementById('phone-input').value = '9876543210';
        const mockData = { name: 'Rich User', loyaltyPoints: 120, visits: 20, totalSpent: 50000 };
        const mockDocGet = vi.fn(() => Promise.resolve({ exists: true, data: () => mockData }));
        fns.__mockDb.collection.mockReturnValue({
            doc: vi.fn(() => ({ get: mockDocGet })),
            limit: vi.fn().mockReturnThis(),
            get: vi.fn(() => Promise.resolve({ empty: true, docs: [] })),
        });

        fns.checkPoints();
        await new Promise(r => setTimeout(r, 50));

        const rewardEl = document.getElementById('reward-msg');
        expect(rewardEl.className).toContain('reward-ready');
    });

    it('shows reward-progress message when points < 100', async () => {
        document.getElementById('phone-input').value = '9876543210';
        const mockData = { name: 'Almost There', loyaltyPoints: 40, visits: 8, totalSpent: 16000 };
        const mockDocGet = vi.fn(() => Promise.resolve({ exists: true, data: () => mockData }));
        fns.__mockDb.collection.mockReturnValue({
            doc: vi.fn(() => ({ get: mockDocGet })),
            limit: vi.fn().mockReturnThis(),
            get: vi.fn(() => Promise.resolve({ empty: true, docs: [] })),
        });

        fns.checkPoints();
        await new Promise(r => setTimeout(r, 50));

        const rewardEl = document.getElementById('reward-msg');
        expect(rewardEl.className).toContain('reward-progress');
    });

    it('handles Firestore errors gracefully', async () => {
        document.getElementById('phone-input').value = '9876543210';
        const mockDocGet = vi.fn(() => Promise.reject(new Error('network error')));
        fns.__mockDb.collection.mockReturnValue({
            doc: vi.fn(() => ({ get: mockDocGet })),
            limit: vi.fn().mockReturnThis(),
            get: vi.fn(() => Promise.resolve({ empty: true, docs: [] })),
        });

        fns.checkPoints();
        await new Promise(r => setTimeout(r, 50));

        expect(document.getElementById('error-msg').style.display).toBe('block');
        expect(document.getElementById('error-msg').textContent).toContain('Something went wrong');
    });

    it('uses default name when user has no name', async () => {
        document.getElementById('phone-input').value = '9876543210';
        const mockData = { loyaltyPoints: 10, visits: 2, totalSpent: 1000 };
        const mockDocGet = vi.fn(() => Promise.resolve({ exists: true, data: () => mockData }));
        fns.__mockDb.collection.mockReturnValue({
            doc: vi.fn(() => ({ get: mockDocGet })),
            limit: vi.fn().mockReturnThis(),
            get: vi.fn(() => Promise.resolve({ empty: true, docs: [] })),
        });

        fns.checkPoints();
        await new Promise(r => setTimeout(r, 50));

        expect(document.getElementById('cust-name').textContent).toBe('Welcome!');
    });

    it('strips non-digits from phone number', () => {
        document.getElementById('phone-input').value = '98-765-43210';
        fns.checkPoints();
        // Should accept the cleaned 10-digit number
        expect(document.getElementById('loading-msg').style.display).toBe('block');
    });
});
