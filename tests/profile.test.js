import { describe, it, expect, beforeEach, vi } from 'vitest';
import { openProfileModal, closeProfileModal, saveProfile, addAddress, removeAddress, initProfile } from '../src/modules/profile.js';
import { setCurrentUser, getCurrentUser } from '../src/modules/auth.js';

function setupDOM(html) {
    document.body.innerHTML = html || '<div id="auth-toast"></div>';
    document.getElementById = (id) => document.body.querySelector('#' + id);
    document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
    document.querySelector = (sel) => document.body.querySelector(sel);
}

// ═══════════════════════════════════════════════════════════════════════════
// openProfileModal
// ═══════════════════════════════════════════════════════════════════════════
describe('openProfileModal', () => {
    beforeEach(() => {
        localStorage.clear();
        window.db = undefined;
        window.scrollTo = vi.fn();
        setupDOM('<div id="auth-toast"></div>');
    });

    it('opens auth modal when no user is logged in', () => {
        const openAuthModal = vi.fn();
        window.openAuthModal = openAuthModal;
        openProfileModal();
        expect(openAuthModal).toHaveBeenCalled();
    });

    it('creates profile-modal element when user is logged in', () => {
        setCurrentUser({ name: 'Test User', phone: '9876543210' });
        openProfileModal();
        const modal = document.getElementById('profile-modal');
        expect(modal).not.toBeNull();
        expect(modal.id).toBe('profile-modal');
    });

    it('shows user name and phone in form fields', () => {
        setCurrentUser({ name: 'Ravi Kumar', phone: '9876543210' });
        openProfileModal();
        const nameInput = document.getElementById('profile-name');
        const phoneInput = document.getElementById('profile-phone');
        expect(nameInput).not.toBeNull();
        expect(nameInput.value).toBe('Ravi Kumar');
        expect(phoneInput).not.toBeNull();
        expect(phoneInput.value).toBe('9876543210');
    });

    it('shows dietary preferences checkboxes', () => {
        setCurrentUser({ name: 'Test', phone: '9876543210', dietaryPrefs: ['Vegetarian'] });
        openProfileModal();
        const cbs = document.querySelectorAll('.profile-dietary-cb');
        expect(cbs.length).toBeGreaterThan(0);
        const vegCb = Array.from(cbs).find(cb => cb.value === 'Vegetarian');
        expect(vegCb).not.toBeNull();
        expect(vegCb.checked).toBe(true);
    });

    it('shows allergen alert checkboxes', () => {
        setCurrentUser({ name: 'Test', phone: '9876543210', allergenAlerts: ['Nuts'] });
        openProfileModal();
        const cbs = document.querySelectorAll('.profile-allergen-cb');
        expect(cbs.length).toBeGreaterThan(0);
        const nutsCb = Array.from(cbs).find(cb => cb.value === 'Nuts');
        expect(nutsCb).not.toBeNull();
        expect(nutsCb.checked).toBe(true);
    });

    it('shows saved addresses', () => {
        setCurrentUser({
            name: 'Test',
            phone: '9876543210',
            savedAddresses: [{ label: 'Home', address: '123 Main St' }]
        });
        openProfileModal();
        const addressList = document.getElementById('profile-address-list');
        expect(addressList).not.toBeNull();
        expect(addressList.innerHTML).toContain('Home');
        expect(addressList.innerHTML).toContain('123 Main St');
    });

    it('shows "No saved addresses" when empty', () => {
        setCurrentUser({ name: 'Test', phone: '9876543210', savedAddresses: [] });
        openProfileModal();
        const addressList = document.getElementById('profile-address-list');
        expect(addressList).not.toBeNull();
        expect(addressList.innerHTML).toContain('No saved addresses yet.');
    });

    it('reuses existing modal on second call', () => {
        setCurrentUser({ name: 'Test', phone: '9876543210' });
        openProfileModal();
        const firstModal = document.getElementById('profile-modal');
        openProfileModal();
        const secondModal = document.getElementById('profile-modal');
        expect(firstModal).toBe(secondModal);
        const allModals = document.body.querySelectorAll('#profile-modal');
        expect(allModals.length).toBe(1);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// closeProfileModal
// ═══════════════════════════════════════════════════════════════════════════
describe('closeProfileModal', () => {
    beforeEach(() => {
        localStorage.clear();
        window.scrollTo = vi.fn();
        setupDOM('<div id="auth-toast"></div>');
    });

    it('hides modal', () => {
        setupDOM(`
            <div id="profile-modal" style="display:block"><div class="modal-content"></div></div>
            <div id="auth-toast"></div>
        `);
        closeProfileModal();
        const modal = document.getElementById('profile-modal');
        expect(modal.style.display).toBe('none');
    });

    it('does nothing when no modal exists', () => {
        setupDOM('<div id="auth-toast"></div>');
        expect(() => closeProfileModal()).not.toThrow();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// saveProfile
// ═══════════════════════════════════════════════════════════════════════════
describe('saveProfile', () => {
    beforeEach(() => {
        localStorage.clear();
        window.db = undefined;
        window.scrollTo = vi.fn();
        window.updateSignInUI = vi.fn();
    });

    it('does nothing when no user is logged in', () => {
        setupDOM(`
            <div id="profile-modal" style="display:block"><div class="modal-content"></div></div>
            <input id="profile-name" value="Test Name">
            <input id="profile-dob" value="1990-05-15">
            <input type="checkbox" class="profile-dietary-cb" value="Vegetarian" checked>
            <input type="checkbox" class="profile-allergen-cb" value="Nuts" checked>
            <div id="auth-toast"></div>
        `);
        saveProfile();
        expect(getCurrentUser()).toBeNull();
    });

    it('shows toast when name is empty', () => {
        setCurrentUser({ name: 'Test', phone: '9876543210' });
        setupDOM(`
            <div id="profile-modal" style="display:block"><div class="modal-content"></div></div>
            <input id="profile-name" value="">
            <input id="profile-dob" value="">
            <input type="checkbox" class="profile-dietary-cb" value="Vegetarian">
            <input type="checkbox" class="profile-allergen-cb" value="Nuts">
            <div id="auth-toast"></div>
        `);
        saveProfile();
        const toast = document.getElementById('auth-toast');
        expect(toast.textContent).toContain('name');
    });

    it('updates user with name, dob, dietary prefs, allergens', () => {
        setCurrentUser({ name: 'Old Name', phone: '9876543210' });
        setupDOM(`
            <div id="profile-modal" style="display:block"><div class="modal-content"></div></div>
            <input id="profile-name" value="Test Name">
            <input id="profile-dob" value="1990-05-15">
            <input type="checkbox" class="profile-dietary-cb" value="Vegetarian" checked>
            <input type="checkbox" class="profile-allergen-cb" value="Nuts" checked>
            <div id="auth-toast"></div>
        `);
        saveProfile();
        const user = getCurrentUser();
        expect(user.name).toBe('Test Name');
        expect(user.dob).toBe('1990-05-15');
        expect(user.dietaryPrefs).toContain('Vegetarian');
        expect(user.allergenAlerts).toContain('Nuts');
    });

    it('saves to Firestore when db available', async () => {
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
        setCurrentUser({ name: 'Old', phone: '9876543210' });
        setupDOM(`
            <div id="profile-modal" style="display:block"><div class="modal-content"></div></div>
            <input id="profile-name" value="Test Name">
            <input id="profile-dob" value="1990-05-15">
            <input type="checkbox" class="profile-dietary-cb" value="Vegetarian" checked>
            <input type="checkbox" class="profile-allergen-cb" value="Nuts" checked>
            <div id="auth-toast"></div>
        `);
        saveProfile();
        await Promise.resolve();
        expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
            name: 'Test Name',
            dob: '1990-05-15',
        }));
    });

    it('shows toast on Firestore error', async () => {
        const updateMock = vi.fn(() => Promise.reject(new Error('Firestore failure')));
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
        setCurrentUser({ name: 'Old', phone: '9876543210' });
        setupDOM(`
            <div id="profile-modal" style="display:block"><div class="modal-content"></div></div>
            <input id="profile-name" value="Test Name">
            <input id="profile-dob" value="1990-05-15">
            <input type="checkbox" class="profile-dietary-cb" value="Vegetarian" checked>
            <input type="checkbox" class="profile-allergen-cb" value="Nuts" checked>
            <div id="auth-toast"></div>
        `);
        saveProfile();
        await new Promise(r => setTimeout(r, 10));
        const toast = document.getElementById('auth-toast');
        expect(toast.textContent).toMatch(/saved locally|sync failed/i);
    });

    it('works without Firestore (no db)', () => {
        window.db = undefined;
        setCurrentUser({ name: 'Old', phone: '9876543210' });
        setupDOM(`
            <div id="profile-modal" style="display:block"><div class="modal-content"></div></div>
            <input id="profile-name" value="Test Name">
            <input id="profile-dob" value="1990-05-15">
            <input type="checkbox" class="profile-dietary-cb" value="Vegetarian" checked>
            <input type="checkbox" class="profile-allergen-cb" value="Nuts" checked>
            <div id="auth-toast"></div>
        `);
        expect(() => saveProfile()).not.toThrow();
        const user = getCurrentUser();
        expect(user.name).toBe('Test Name');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// addAddress
// ═══════════════════════════════════════════════════════════════════════════
describe('addAddress', () => {
    beforeEach(() => {
        localStorage.clear();
        window.db = undefined;
        window.scrollTo = vi.fn();
    });

    it('does nothing when no user is logged in', () => {
        setupDOM(`
            <input id="profile-addr-label" value="Home">
            <input id="profile-addr-address" value="123 Main St">
            <div id="auth-toast"></div>
        `);
        addAddress();
        expect(getCurrentUser()).toBeNull();
    });

    it('shows toast when address is empty', () => {
        setCurrentUser({ name: 'Test', phone: '9876543210' });
        setupDOM(`
            <div id="profile-modal" style="display:block"><div class="modal-content"></div></div>
            <input id="profile-addr-label" value="Home">
            <input id="profile-addr-address" value="">
            <div id="auth-toast"></div>
        `);
        addAddress();
        const toast = document.getElementById('auth-toast');
        expect(toast.textContent).toContain('address');
    });

    it('adds address to user savedAddresses', () => {
        setCurrentUser({ name: 'Test', phone: '9876543210', savedAddresses: [] });
        setupDOM(`
            <div id="profile-modal" style="display:block"><div class="modal-content"></div></div>
            <input id="profile-addr-label" value="Home">
            <input id="profile-addr-address" value="123 Main St, Hyderabad">
            <div id="auth-toast"></div>
        `);
        addAddress();
        const user = getCurrentUser();
        expect(user.savedAddresses).toHaveLength(1);
        expect(user.savedAddresses[0].label).toBe('Home');
        expect(user.savedAddresses[0].address).toBe('123 Main St, Hyderabad');
    });

    it('uses "Address" as default label when label is empty', () => {
        setCurrentUser({ name: 'Test', phone: '9876543210', savedAddresses: [] });
        setupDOM(`
            <div id="profile-modal" style="display:block"><div class="modal-content"></div></div>
            <input id="profile-addr-label" value="">
            <input id="profile-addr-address" value="456 Other St">
            <div id="auth-toast"></div>
        `);
        addAddress();
        const user = getCurrentUser();
        expect(user.savedAddresses[0].label).toBe('Address');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// removeAddress
// ═══════════════════════════════════════════════════════════════════════════
describe('removeAddress', () => {
    beforeEach(() => {
        localStorage.clear();
        window.db = undefined;
        window.scrollTo = vi.fn();
    });

    it('does nothing when no user is logged in', () => {
        setupDOM('<div id="auth-toast"></div>');
        expect(() => removeAddress(0)).not.toThrow();
    });

    it('does nothing when user has no savedAddresses', () => {
        setCurrentUser({ name: 'Test', phone: '9876543210' });
        setupDOM(`
            <div id="profile-modal" style="display:block"><div class="modal-content"></div></div>
            <div id="auth-toast"></div>
        `);
        expect(() => removeAddress(0)).not.toThrow();
    });

    it('removes address at the given index', () => {
        setCurrentUser({
            name: 'Test',
            phone: '9876543210',
            savedAddresses: [
                { label: 'Home', address: '123 Main St' },
                { label: 'Office', address: '456 Work Ave' }
            ]
        });
        setupDOM(`
            <div id="profile-modal" style="display:block"><div class="modal-content"></div></div>
            <div id="auth-toast"></div>
        `);
        removeAddress(0);
        const user = getCurrentUser();
        expect(user.savedAddresses).toHaveLength(1);
        expect(user.savedAddresses[0].label).toBe('Office');
    });

    it('updates user after removal', () => {
        setCurrentUser({
            name: 'Test',
            phone: '9876543210',
            savedAddresses: [
                { label: 'Home', address: '123 Main St' },
                { label: 'Office', address: '456 Work Ave' }
            ]
        });
        setupDOM(`
            <div id="profile-modal" style="display:block"><div class="modal-content"></div></div>
            <div id="auth-toast"></div>
        `);
        removeAddress(1);
        const user = getCurrentUser();
        expect(user.savedAddresses).toHaveLength(1);
        expect(user.savedAddresses[0].label).toBe('Home');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// initProfile
// ═══════════════════════════════════════════════════════════════════════════
describe('initProfile', () => {
    beforeEach(() => {
        localStorage.clear();
        window.scrollTo = vi.fn();
        setupDOM('<div id="auth-toast"></div>');
    });

    it('does not throw', () => {
        expect(() => initProfile()).not.toThrow();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// window globals
// ═══════════════════════════════════════════════════════════════════════════
describe('window globals', () => {
    it('exposes openProfileModal on window', () => {
        expect(typeof window.openProfileModal).toBe('function');
    });

    it('exposes closeProfileModal on window', () => {
        expect(typeof window.closeProfileModal).toBe('function');
    });

    it('exposes saveProfile on window', () => {
        expect(typeof window.saveProfile).toBe('function');
    });

    it('exposes addAddress on window', () => {
        expect(typeof window.addAddress).toBe('function');
    });

    it('exposes removeAddress on window', () => {
        expect(typeof window.removeAddress).toBe('function');
    });
});
