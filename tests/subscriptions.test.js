import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    openSubscriptionModal,
    closeSubscriptionModal,
    subscribeToPlan,
    cancelSubscription,
} from '../src/modules/subscriptions.js';
import { setCurrentUser, getCurrentUser } from '../src/modules/auth.js';

function setupDOM(html) {
    document.body.innerHTML = html || '<div id="auth-toast"></div>';
    document.getElementById = (id) => document.body.querySelector('#' + id);
    document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
    document.querySelector = (sel) => document.body.querySelector(sel);
}

// ═══════════════════════════════════════════════════════════════════════════
// openSubscriptionModal
// ═══════════════════════════════════════════════════════════════════════════
describe('openSubscriptionModal', () => {
    beforeEach(() => {
        localStorage.clear();
        setupDOM();
        window.openAuthModal = vi.fn();
        window.showAuthToast = vi.fn();
    });

    it('prompts sign-in when no user is logged in', () => {
        openSubscriptionModal();
        expect(window.openAuthModal).toHaveBeenCalled();
        expect(window.showAuthToast).toHaveBeenCalledWith(expect.stringMatching(/sign in/i));
    });

    it('shows service unavailable when db is null', () => {
        setCurrentUser({ name: 'Test', phone: '1234567890' });
        window.db = null;
        openSubscriptionModal();
        expect(window.showAuthToast).toHaveBeenCalledWith(expect.stringMatching(/unavailable/i));
    });

    it('renders modal with default plans on Firestore error', async () => {
        setCurrentUser({ name: 'Test', phone: '1234567890' });
        window.db = {
            collection: vi.fn(() => ({
                where: vi.fn().mockReturnThis(),
                get: vi.fn(() => Promise.reject(new Error('network'))),
                doc: vi.fn(() => ({ onSnapshot: vi.fn(() => vi.fn()) })),
                onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
            })),
        };
        openSubscriptionModal();
        await new Promise(r => setTimeout(r, 50));
        const modal = document.getElementById('subscription-modal');
        expect(modal).not.toBeNull();
        expect(modal.textContent).toContain('Lunch Basic');
        expect(modal.textContent).toContain('Lunch Premium');
        expect(modal.textContent).toContain('All Meals');
    });

    it('renders modal with plans from Firestore', async () => {
        setCurrentUser({ name: 'Test', phone: '1234567890' });
        const plans = [
            { id: 'custom', name: 'Custom Plan', description: 'Test', mealsPerWeek: 5, pricePerMonth: 1999, regularPrice: 3000, items: ['Item A'], active: true },
        ];
        window.db = {
            collection: vi.fn(() => ({
                where: vi.fn().mockReturnThis(),
                get: vi.fn(() => Promise.resolve({
                    forEach: (cb) => plans.forEach(p => cb({ data: () => p, id: p.id })),
                })),
                doc: vi.fn(() => ({ onSnapshot: vi.fn(() => vi.fn()) })),
                onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
            })),
        };
        openSubscriptionModal();
        await new Promise(r => setTimeout(r, 50));
        expect(document.getElementById('subscription-modal').textContent).toContain('Custom Plan');
    });

    it('shows active subscription info when user has one', async () => {
        setCurrentUser({
            name: 'Test',
            phone: '1234567890',
            activeSubscription: { planName: 'Lunch Basic', nextDeliveryDate: '2026-03-05' },
        });
        window.db = {
            collection: vi.fn(() => ({
                where: vi.fn().mockReturnThis(),
                get: vi.fn(() => Promise.resolve({ forEach: () => {} })),
                doc: vi.fn(() => ({ onSnapshot: vi.fn(() => vi.fn()) })),
                onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
            })),
        };
        openSubscriptionModal();
        await new Promise(r => setTimeout(r, 50));
        const modal = document.getElementById('subscription-modal');
        expect(modal.textContent).toContain('Active Plan');
        expect(modal.textContent).toContain('Lunch Basic');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// closeSubscriptionModal
// ═══════════════════════════════════════════════════════════════════════════
describe('closeSubscriptionModal', () => {
    it('hides subscription modal', () => {
        setupDOM('<div id="subscription-modal" style="display:block"></div>');
        closeSubscriptionModal();
        expect(document.getElementById('subscription-modal').style.display).toBe('none');
    });

    it('does nothing when modal does not exist', () => {
        setupDOM('');
        expect(() => closeSubscriptionModal()).not.toThrow();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// subscribeToPlan
// ═══════════════════════════════════════════════════════════════════════════
describe('subscribeToPlan', () => {
    beforeEach(() => {
        localStorage.clear();
        setupDOM('<div id="subscription-modal" style="display:block"></div><div id="auth-toast"></div>');
        window.showAuthToast = vi.fn();
    });

    it('does nothing when no user is logged in', () => {
        subscribeToPlan('lunch-basic');
        // No error, just returns
        expect(window.showAuthToast).not.toHaveBeenCalled();
    });

    it('does nothing when plan is not found', () => {
        setCurrentUser({ name: 'Test', phone: '1234567890' });
        // _planCatalog is empty, and 'nonexistent' is not a default plan
        subscribeToPlan('nonexistent');
        expect(window.showAuthToast).not.toHaveBeenCalled();
    });

    it('creates subscription in Firestore for default plan', async () => {
        setCurrentUser({ name: 'Test', phone: '1234567890' });
        const addMock = vi.fn(() => Promise.resolve({ id: 'SUB-123' }));
        const updateMock = vi.fn(() => Promise.resolve());
        window.db = {
            collection: vi.fn(() => ({
                add: addMock,
                doc: vi.fn(() => ({
                    update: updateMock,
                    onSnapshot: vi.fn(() => vi.fn()),
                })),
                where: vi.fn().mockReturnThis(),
                onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
            })),
        };

        subscribeToPlan('lunch-basic');
        await new Promise(r => setTimeout(r, 50));

        expect(addMock).toHaveBeenCalled();
        const subData = addMock.mock.calls[0][0];
        expect(subData.planId).toBe('lunch-basic');
        expect(subData.planName).toBe('Lunch Basic');
        expect(subData.status).toBe('active');
        expect(subData.userPhone).toBe('1234567890');

        const user = getCurrentUser();
        expect(user.activeSubscription).toBeDefined();
        expect(user.activeSubscription.planName).toBe('Lunch Basic');
    });

    it('shows error toast on Firestore failure', async () => {
        setCurrentUser({ name: 'Test', phone: '1234567890' });
        window.db = {
            collection: vi.fn(() => ({
                add: vi.fn(() => Promise.reject(new Error('write failed'))),
                doc: vi.fn(() => ({ onSnapshot: vi.fn(() => vi.fn()) })),
                where: vi.fn().mockReturnThis(),
                onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
            })),
        };

        subscribeToPlan('lunch-basic');
        await new Promise(r => setTimeout(r, 50));
        expect(window.showAuthToast).toHaveBeenCalledWith(expect.stringMatching(/failed/i));
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// cancelSubscription
// ═══════════════════════════════════════════════════════════════════════════
describe('cancelSubscription', () => {
    beforeEach(() => {
        localStorage.clear();
        setupDOM('<div id="subscription-modal" style="display:block"></div><div id="auth-toast"></div>');
        window.showAuthToast = vi.fn();
        window.confirm = vi.fn(() => true);
    });

    it('does nothing when no user is logged in', () => {
        cancelSubscription();
        expect(window.showAuthToast).not.toHaveBeenCalled();
    });

    it('does nothing when user has no active subscription', () => {
        setCurrentUser({ name: 'Test', phone: '1234567890' });
        cancelSubscription();
        expect(window.showAuthToast).not.toHaveBeenCalled();
    });

    it('does nothing when user cancels confirm dialog', () => {
        setCurrentUser({ name: 'Test', phone: '1234567890', activeSubscription: { id: 'SUB-1', planName: 'Test' } });
        window.confirm = vi.fn(() => false);
        cancelSubscription();
        expect(getCurrentUser().activeSubscription).toBeDefined();
    });

    it('cancels subscription and updates user profile', () => {
        setCurrentUser({ name: 'Test', phone: '1234567890', activeSubscription: { id: 'SUB-1', planName: 'Test' } });
        const updateMock = vi.fn(() => Promise.resolve());
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    update: updateMock,
                    onSnapshot: vi.fn(() => vi.fn()),
                })),
                where: vi.fn().mockReturnThis(),
                onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
            })),
        };

        cancelSubscription();

        const user = getCurrentUser();
        expect(user.activeSubscription).toBeUndefined();
        expect(window.showAuthToast).toHaveBeenCalledWith(expect.stringMatching(/cancelled/i));
    });
});
