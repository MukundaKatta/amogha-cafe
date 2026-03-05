import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../src/core/utils.js', () => ({
    safeGetItem: vi.fn((key) => localStorage.getItem(key)),
    safeSetItem: vi.fn((key, val) => localStorage.setItem(key, val)),
    lockScroll: vi.fn(),
    unlockScroll: vi.fn(),
}));

// Mock getCurrentUser/setCurrentUser to avoid cross-module mock interference
var _mockUser = null;
vi.mock('../src/modules/auth.js', () => ({
    getCurrentUser: vi.fn(() => _mockUser),
    setCurrentUser: vi.fn((u) => { _mockUser = u; }),
    showAuthToast: vi.fn(),
}));

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
        _mockUser = null;
        localStorage.clear();
        window.db = null;
        window._notifListenerActive = false;
        setupDOM();
        window.openAuthModal = vi.fn();
        window.showAuthToast = vi.fn();
        window.scrollTo = vi.fn();
    });

    it('prompts sign-in when no user is logged in', () => {
        openSubscriptionModal();
        expect(window.openAuthModal).toHaveBeenCalled();
        expect(window.showAuthToast).toHaveBeenCalledWith(expect.stringMatching(/sign in/i));
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

// ═══════════════════════════════════════════════════════════════════════════
// openSubscriptionModal when getDb() returns null (lines 28-30)
// ═══════════════════════════════════════════════════════════════════════════
describe('openSubscriptionModal with null db', () => {
    beforeEach(() => {
        _mockUser = null;
        localStorage.clear();
        window.db = null;
        window._notifListenerActive = false;
        setupDOM();
        window.openAuthModal = vi.fn();
        window.showAuthToast = vi.fn();
        window.scrollTo = vi.fn();
    });

    it('calls unlockScroll and showAuthToast when getDb() returns null after user is authenticated', async () => {
        setCurrentUser({ name: 'Test', phone: '1234567890' });
        // Ensure db is null so getDb() returns null
        window.db = null;

        openSubscriptionModal();

        // Should call unlockScroll (via the mock) and showAuthToast with service unavailable
        const utils = await import('../src/core/utils.js');
        expect(utils.unlockScroll).toHaveBeenCalled();
        expect(window.showAuthToast).toHaveBeenCalledWith(expect.stringMatching(/unavailable/i));
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Modal backdrop click closes modal (line 137)
// ═══════════════════════════════════════════════════════════════════════════
describe('subscription modal backdrop click', () => {
    beforeEach(() => {
        _mockUser = null;
        localStorage.clear();
        setupDOM();
        window.openAuthModal = vi.fn();
        window.showAuthToast = vi.fn();
        window.scrollTo = vi.fn();
    });

    it('closes modal when clicking backdrop (outside modal-content)', async () => {
        setCurrentUser({ name: 'Test', phone: '1234567890' });
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
        expect(modal).not.toBeNull();
        expect(modal.style.display).toBe('block');

        // Simulate clicking on the modal backdrop (the modal element itself, not inner content)
        const clickEvent = new Event('click', { bubbles: true });
        Object.defineProperty(clickEvent, 'target', { value: modal });
        modal.dispatchEvent(clickEvent);

        // Modal should be hidden after backdrop click
        expect(modal.style.display).toBe('none');
    });

    it('does NOT close modal when clicking inside modal-content', async () => {
        setCurrentUser({ name: 'Test', phone: '1234567890' });
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
        expect(modal).not.toBeNull();

        // Simulate clicking on the inner content (not the backdrop)
        const innerContent = modal.querySelector('.modal-content') || modal.querySelector('h2');
        if (innerContent) {
            const clickEvent = new Event('click', { bubbles: true });
            Object.defineProperty(clickEvent, 'target', { value: innerContent });
            modal.dispatchEvent(clickEvent);

            // Modal should remain visible
            expect(modal.style.display).toBe('block');
        }
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Branch coverage: openSubscriptionModal — unauthenticated user (lines 12-18)
// ═══════════════════════════════════════════════════════════════════════════
describe('openSubscriptionModal — unauthenticated path details (lines 12-18)', () => {
    beforeEach(() => {
        _mockUser = null;
        localStorage.clear();
        setupDOM();
        window.openAuthModal = vi.fn();
        window.showAuthToast = vi.fn();
    });

    it('calls openAuthModal when user is null', () => {
        openSubscriptionModal();
        expect(window.openAuthModal).toHaveBeenCalledTimes(1);
    });

    it('calls showAuthToast with sign-in message when user is null', () => {
        openSubscriptionModal();
        expect(window.showAuthToast).toHaveBeenCalledWith('Please sign in to view meal plans');
    });

    it('does not create the subscription modal when user is null', () => {
        openSubscriptionModal();
        const modal = document.getElementById('subscription-modal');
        expect(modal).toBeNull();
    });

    it('returns early without touching db when user is null', () => {
        const collectionSpy = vi.fn();
        window.db = { collection: collectionSpy };
        openSubscriptionModal();
        expect(collectionSpy).not.toHaveBeenCalled();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Branch coverage: openSubscriptionModal — db unavailable (line 29)
// ═══════════════════════════════════════════════════════════════════════════
describe('openSubscriptionModal — db unavailable after auth (line 29)', () => {
    beforeEach(() => {
        _mockUser = null;
        localStorage.clear();
        setupDOM();
        window.openAuthModal = vi.fn();
        window.showAuthToast = vi.fn();
    });

    it('shows service unavailable toast when db is null', () => {
        setCurrentUser({ name: 'Test', phone: '1234567890' });
        window.db = null;
        openSubscriptionModal();
        expect(window.showAuthToast).toHaveBeenCalledWith('Service unavailable. Please try again.');
    });

    it('calls unlockScroll when db is null', async () => {
        setCurrentUser({ name: 'Test', phone: '1234567890' });
        window.db = null;
        openSubscriptionModal();
        const utils = await import('../src/core/utils.js');
        expect(utils.unlockScroll).toHaveBeenCalled();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Branch coverage: renderSubscriptionModal — savings calculations (lines 90-101)
// ═══════════════════════════════════════════════════════════════════════════
describe('renderSubscriptionModal — plan savings calculations (lines 90-101)', () => {
    beforeEach(() => {
        _mockUser = null;
        localStorage.clear();
        setupDOM();
        window.openAuthModal = vi.fn();
        window.showAuthToast = vi.fn();
    });

    it('renders savings percentage based on regularPrice vs pricePerMonth', async () => {
        setCurrentUser({ name: 'Test', phone: '1234567890' });
        const plans = [
            {
                id: 'test-plan',
                name: 'Test Plan',
                description: '5 meals/week',
                mealsPerWeek: 5,
                pricePerMonth: 2000,
                regularPrice: 4000,
                items: ['Item A'],
                active: true,
            },
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
        const modal = document.getElementById('subscription-modal');
        // Savings: (4000-2000)/4000 = 50%
        expect(modal.textContent).toContain('Save 50%');
    });

    it('handles zero regularPrice gracefully (0% savings)', async () => {
        setCurrentUser({ name: 'Test', phone: '1234567890' });
        const plans = [
            {
                id: 'free-plan',
                name: 'Free Plan',
                description: 'Free trial',
                mealsPerWeek: 1,
                pricePerMonth: 0,
                regularPrice: 0,
                items: ['Item A'],
                active: true,
            },
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
        const modal = document.getElementById('subscription-modal');
        expect(modal.textContent).toContain('Save 0%');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Branch coverage: active subscription display (line 128)
// ═══════════════════════════════════════════════════════════════════════════
describe('renderSubscriptionModal — active subscription display (line 128)', () => {
    beforeEach(() => {
        _mockUser = null;
        localStorage.clear();
        setupDOM();
        window.openAuthModal = vi.fn();
        window.showAuthToast = vi.fn();
    });

    it('shows cancel button when user has active subscription', async () => {
        setCurrentUser({
            name: 'Test',
            phone: '1234567890',
            activeSubscription: { planName: 'Lunch Premium', nextDeliveryDate: '2026-03-06' },
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
        expect(modal.textContent).toContain('Cancel Plan');
        expect(modal.textContent).toContain('Lunch Premium');
        expect(modal.textContent).toContain('2026-03-06');
    });

    it('uses "Tomorrow" as fallback next delivery date', async () => {
        setCurrentUser({
            name: 'Test',
            phone: '1234567890',
            activeSubscription: { planName: 'Lunch Basic' },
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
        expect(modal.textContent).toContain('Tomorrow');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Branch coverage: subscribeToPlan — plan found from catalog (line 149)
// ═══════════════════════════════════════════════════════════════════════════
describe('subscribeToPlan — plan from _planCatalog (line 149)', () => {
    beforeEach(() => {
        _mockUser = null;
        localStorage.clear();
        setupDOM('<div id="subscription-modal" style="display:block"></div><div id="auth-toast"></div>');
        window.showAuthToast = vi.fn();
    });

    it('uses plan from _planCatalog when available', async () => {
        setCurrentUser({ name: 'Test', phone: '1234567890' });
        // First open the modal to populate _planCatalog
        const customPlan = {
            id: 'custom-plan',
            name: 'Custom Plan',
            description: 'Custom',
            mealsPerWeek: 3,
            pricePerMonth: 1500,
            regularPrice: 2000,
            items: ['Item X'],
            active: true,
        };
        window.db = {
            collection: vi.fn(() => ({
                where: vi.fn().mockReturnThis(),
                get: vi.fn(() => Promise.resolve({
                    forEach: (cb) => [customPlan].forEach(p => cb({ data: () => p, id: p.id })),
                })),
                add: vi.fn(() => Promise.resolve({ id: 'SUB-CUSTOM' })),
                doc: vi.fn(() => ({
                    update: vi.fn(() => Promise.resolve()),
                    onSnapshot: vi.fn(() => vi.fn()),
                })),
                onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
            })),
        };
        openSubscriptionModal();
        await new Promise(r => setTimeout(r, 50));

        // Now subscribe using the catalog plan
        subscribeToPlan('custom-plan');
        await new Promise(r => setTimeout(r, 50));

        expect(window.showAuthToast).toHaveBeenCalledWith(expect.stringContaining('Custom Plan'));
    });

    it('falls back to default plans when plan not in catalog', async () => {
        setCurrentUser({ name: 'Test', phone: '1234567890' });
        const addMock = vi.fn(() => Promise.resolve({ id: 'SUB-DEF' }));
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
        // Subscribe to a default plan without opening the modal first
        subscribeToPlan('lunch-basic');
        await new Promise(r => setTimeout(r, 50));
        expect(addMock).toHaveBeenCalled();
        const subData = addMock.mock.calls[0][0];
        expect(subData.planName).toBe('Lunch Basic');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Branch coverage: subscribeToPlan — creation flow (lines 168-187)
// ═══════════════════════════════════════════════════════════════════════════
describe('subscribeToPlan — subscription creation flow (lines 168-187)', () => {
    beforeEach(() => {
        _mockUser = null;
        localStorage.clear();
        setupDOM('<div id="subscription-modal" style="display:block"></div><div id="auth-toast"></div>');
        window.showAuthToast = vi.fn();
    });

    it('updates user profile with activeSubscription after creation', async () => {
        setCurrentUser({ name: 'Test', phone: '1234567890' });
        const addMock = vi.fn(() => Promise.resolve({ id: 'SUB-999' }));
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
        subscribeToPlan('lunch-premium');
        await new Promise(r => setTimeout(r, 50));

        const user = getCurrentUser();
        expect(user.activeSubscription).toBeDefined();
        expect(user.activeSubscription.id).toBe('SUB-999');
        expect(user.activeSubscription.planName).toBe('Lunch Premium');
    });

    it('closes the subscription modal after successful creation', async () => {
        setCurrentUser({ name: 'Test', phone: '1234567890' });
        window.db = {
            collection: vi.fn(() => ({
                add: vi.fn(() => Promise.resolve({ id: 'SUB-X' })),
                doc: vi.fn(() => ({
                    update: vi.fn(() => Promise.resolve()),
                    onSnapshot: vi.fn(() => vi.fn()),
                })),
                where: vi.fn().mockReturnThis(),
                onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
            })),
        };
        subscribeToPlan('lunch-basic');
        await new Promise(r => setTimeout(r, 50));
        const modal = document.getElementById('subscription-modal');
        expect(modal.style.display).toBe('none');
    });

    it('does nothing when db is null', () => {
        setCurrentUser({ name: 'Test', phone: '1234567890' });
        window.db = null;
        subscribeToPlan('lunch-basic');
        expect(window.showAuthToast).not.toHaveBeenCalled();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Branch coverage: cancelSubscription — full flow (lines 198-214)
// ═══════════════════════════════════════════════════════════════════════════
describe('cancelSubscription — full cancellation flow (lines 198-214)', () => {
    beforeEach(() => {
        _mockUser = null;
        localStorage.clear();
        setupDOM('<div id="subscription-modal" style="display:block"></div><div id="auth-toast"></div>');
        window.showAuthToast = vi.fn();
        window.confirm = vi.fn(() => true);
    });

    it('updates subscription status to cancelled in Firestore', async () => {
        const updateMock = vi.fn(() => Promise.resolve());
        setCurrentUser({
            name: 'Test',
            phone: '1234567890',
            activeSubscription: { id: 'SUB-CANCEL', planName: 'Lunch Basic' },
        });
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

        // First call should be to subscriptions collection to update status
        expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
            status: 'cancelled',
        }));
    });

    it('removes activeSubscription from user profile', () => {
        setCurrentUser({
            name: 'Test',
            phone: '1234567890',
            activeSubscription: { id: 'SUB-X', planName: 'Test Plan' },
        });
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
    });

    it('closes subscription modal after cancellation', () => {
        setCurrentUser({
            name: 'Test',
            phone: '1234567890',
            activeSubscription: { id: 'SUB-X', planName: 'Test' },
        });
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
        expect(document.getElementById('subscription-modal').style.display).toBe('none');
    });

    it('shows cancelled toast message', () => {
        setCurrentUser({
            name: 'Test',
            phone: '1234567890',
            activeSubscription: { id: 'SUB-X', planName: 'Test' },
        });
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
        expect(window.showAuthToast).toHaveBeenCalledWith('Meal plan cancelled.');
    });

    it('handles cancellation when db is null (no Firestore updates)', () => {
        setCurrentUser({
            name: 'Test',
            phone: '1234567890',
            activeSubscription: { id: 'SUB-X', planName: 'Test' },
        });
        window.db = null;
        cancelSubscription();
        const user = getCurrentUser();
        expect(user.activeSubscription).toBeUndefined();
        expect(window.showAuthToast).toHaveBeenCalledWith('Meal plan cancelled.');
    });

    it('handles cancellation when activeSubscription has no id', () => {
        setCurrentUser({
            name: 'Test',
            phone: '1234567890',
            activeSubscription: { planName: 'Test' },
        });
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
        // Should not call update on subscriptions since there's no id
        // The code checks: if (db && user.activeSubscription.id) — id is undefined, so no update
        const user = getCurrentUser();
        expect(user.activeSubscription).toBeUndefined();
    });
});

// ===========================================================================
// Branch coverage: openSubscriptionModal — openAuthModal not a function (line 12)
// ===========================================================================
describe('openSubscriptionModal — openAuthModal/showAuthToast not functions (lines 12-13)', () => {
    beforeEach(() => {
        _mockUser = null;
        localStorage.clear();
        setupDOM();
    });

    it('does not throw when openAuthModal is not a function', () => {
        delete window.openAuthModal;
        window.showAuthToast = vi.fn();
        expect(() => openSubscriptionModal()).not.toThrow();
    });

    it('does not throw when showAuthToast is not a function', () => {
        window.openAuthModal = vi.fn();
        delete window.showAuthToast;
        expect(() => openSubscriptionModal()).not.toThrow();
    });

    it('does not throw when neither openAuthModal nor showAuthToast are functions', () => {
        delete window.openAuthModal;
        delete window.showAuthToast;
        expect(() => openSubscriptionModal()).not.toThrow();
    });
});

// ===========================================================================
// Branch coverage: renderSubscriptionModal — plan without id skipped (line 90)
// ===========================================================================
describe('renderSubscriptionModal — plan without id skipped (line 90)', () => {
    beforeEach(() => {
        _mockUser = null;
        localStorage.clear();
        setupDOM();
        window.openAuthModal = vi.fn();
        window.showAuthToast = vi.fn();
    });

    it('skips plan without id when building _planCatalog', async () => {
        setCurrentUser({ name: 'Test', phone: '1234567890' });
        const plans = [
            { name: 'No ID Plan', description: 'Missing id', mealsPerWeek: 1, pricePerMonth: 100, regularPrice: 200, items: ['X'], active: true },
            { id: 'valid', name: 'Valid Plan', description: 'Has id', mealsPerWeek: 5, pricePerMonth: 2000, regularPrice: 3000, items: ['Y'], active: true },
        ];
        window.db = {
            collection: vi.fn(() => ({
                where: vi.fn().mockReturnThis(),
                get: vi.fn(() => Promise.resolve({
                    forEach: (cb) => plans.forEach(p => cb({ data: () => ({ ...p }), id: p.id || undefined })),
                })),
                doc: vi.fn(() => ({ onSnapshot: vi.fn(() => vi.fn()) })),
                onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
            })),
        };
        openSubscriptionModal();
        await new Promise(r => setTimeout(r, 50));
        const modal = document.getElementById('subscription-modal');
        // Both plans render in the HTML, but only the one with id is in _planCatalog
        expect(modal.textContent).toContain('Valid Plan');
        expect(modal.textContent).toContain('No ID Plan');
    });
});

// ===========================================================================
// Branch coverage: subscribeToPlan — user null (line 149)
// ===========================================================================
describe('subscribeToPlan — user null returns early (line 149)', () => {
    beforeEach(() => {
        _mockUser = null;
        localStorage.clear();
        setupDOM('<div id="subscription-modal" style="display:block"></div><div id="auth-toast"></div>');
        window.showAuthToast = vi.fn();
    });

    it('returns early without errors when getCurrentUser returns null', () => {
        expect(() => subscribeToPlan('lunch-basic')).not.toThrow();
        expect(window.showAuthToast).not.toHaveBeenCalled();
    });
});

// ===========================================================================
// Branch coverage: subscribeToPlan — success showAuthToast (line 184) and catch showAuthToast (lines 185-187)
// ===========================================================================
describe('subscribeToPlan — showAuthToast on success and error (lines 184-187)', () => {
    beforeEach(() => {
        _mockUser = null;
        localStorage.clear();
        setupDOM('<div id="subscription-modal" style="display:block"></div><div id="auth-toast"></div>');
        window.showAuthToast = vi.fn();
    });

    it('calls showAuthToast with success message on subscribe success', async () => {
        setCurrentUser({ name: 'Test', phone: '1234567890' });
        window.db = {
            collection: vi.fn(() => ({
                add: vi.fn(() => Promise.resolve({ id: 'SUB-OK' })),
                doc: vi.fn(() => ({
                    update: vi.fn(() => Promise.resolve()),
                    onSnapshot: vi.fn(() => vi.fn()),
                })),
                where: vi.fn().mockReturnThis(),
                onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
            })),
        };
        subscribeToPlan('lunch-basic');
        await new Promise(r => setTimeout(r, 50));
        expect(window.showAuthToast).toHaveBeenCalledWith(expect.stringContaining('Subscribed to'));
    });

    it('calls showAuthToast with failure message on subscribe error', async () => {
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
        expect(window.showAuthToast).toHaveBeenCalledWith(expect.stringContaining('Failed'));
    });

    it('does not call showAuthToast when showAuthToast is not a function on success', async () => {
        setCurrentUser({ name: 'Test', phone: '1234567890' });
        delete window.showAuthToast;
        window.db = {
            collection: vi.fn(() => ({
                add: vi.fn(() => Promise.resolve({ id: 'SUB-OK' })),
                doc: vi.fn(() => ({
                    update: vi.fn(() => Promise.resolve()),
                    onSnapshot: vi.fn(() => vi.fn()),
                })),
                where: vi.fn().mockReturnThis(),
                onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
            })),
        };
        expect(() => subscribeToPlan('lunch-basic')).not.toThrow();
        await new Promise(r => setTimeout(r, 50));
    });
});

// ===========================================================================
// Branch coverage: cancelSubscription — showAuthToast (line 214)
// ===========================================================================
describe('cancelSubscription — showAuthToast when not a function (line 214)', () => {
    beforeEach(() => {
        _mockUser = null;
        localStorage.clear();
        setupDOM('<div id="subscription-modal" style="display:block"></div><div id="auth-toast"></div>');
        window.confirm = vi.fn(() => true);
    });

    it('does not throw when showAuthToast is not a function during cancel', () => {
        setCurrentUser({
            name: 'Test',
            phone: '1234567890',
            activeSubscription: { id: 'SUB-X', planName: 'Test' },
        });
        delete window.showAuthToast;
        window.db = null;
        expect(() => cancelSubscription()).not.toThrow();
        const user = getCurrentUser();
        expect(user.activeSubscription).toBeUndefined();
    });
});
