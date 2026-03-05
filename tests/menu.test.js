import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getStarHTML, checkAllergenWarning, toggleSafeForMe } from '../src/modules/menu.js';

function setupDOM(html) {
    document.body.innerHTML = html;
    document.getElementById = (id) => document.body.querySelector('#' + id);
    document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
    document.querySelector = (sel) => document.body.querySelector(sel);
}

// ═══════════════════════════════════════════════════════════════════════════
// getStarHTML — pure function
// ═══════════════════════════════════════════════════════════════════════════
describe('getStarHTML', () => {
    it('returns 5 filled stars for rating 5', () => {
        const html = getStarHTML(5);
        expect((html.match(/filled/g) || []).length).toBe(5);
        expect((html.match(/empty/g) || []).length).toBe(0);
    });

    it('returns 0 filled stars and 5 empty for rating 0', () => {
        const html = getStarHTML(0);
        expect((html.match(/filled/g) || []).length).toBe(0);
        expect((html.match(/empty/g) || []).length).toBe(5);
    });

    it('returns 3 filled + 2 empty for rating 3', () => {
        const html = getStarHTML(3);
        expect((html.match(/filled/g) || []).length).toBe(3);
    });

    it('returns half star for rating 3.5', () => {
        const html = getStarHTML(3.5);
        expect((html.match(/filled/g) || []).length).toBe(3);
        expect((html.match(/half/g) || []).length).toBe(1);
    });

    it('returns 4 filled + 1 half for rating 4.5', () => {
        const html = getStarHTML(4.5);
        expect((html.match(/filled/g) || []).length).toBe(4);
        expect((html.match(/half/g) || []).length).toBe(1);
    });

    it('returns 1 filled + 4 empty for rating 1', () => {
        const html = getStarHTML(1);
        expect((html.match(/filled/g) || []).length).toBe(1);
        expect((html.match(/empty/g) || []).length).toBe(4);
    });

    it('returns exactly 5 star spans for any rating', () => {
        for (const rating of [0, 1.5, 2, 3.5, 5]) {
            const html = getStarHTML(rating);
            expect((html.match(/<span/g) || []).length).toBe(5);
        }
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// toggleSafeForMe
// ═══════════════════════════════════════════════════════════════════════════
describe('toggleSafeForMe', () => {
    beforeEach(() => {
        window._safeForMeActive = false;
        setupDOM(`
            <button id="safe-for-me-btn"></button>
            <div class="menu-item-card" data-id="Biryani" data-allergens="nuts,dairy"><h4>Biryani</h4></div>
            <div class="menu-item-card" data-id="Dal" data-allergens=""><h4>Dal</h4></div>
        `);
        localStorage.clear();
    });

    it('toggles _safeForMeActive flag', () => {
        toggleSafeForMe();
        expect(window._safeForMeActive).toBe(true);
        toggleSafeForMe();
        expect(window._safeForMeActive).toBe(false);
    });

    it('adds active class to button when enabled', () => {
        toggleSafeForMe();
        expect(document.getElementById('safe-for-me-btn').classList.contains('active')).toBe(true);
    });

    it('hides menu items with conflicting allergens when user has allergen alerts', () => {
        localStorage.setItem('amoghaUser', JSON.stringify({ allergenAlerts: ['nuts'] }));
        toggleSafeForMe();
        const biryani = document.body.querySelector('[data-id="Biryani"]');
        expect(biryani.style.display).toBe('none');
        const dal = document.body.querySelector('[data-id="Dal"]');
        expect(dal.style.display).not.toBe('none');
    });

    it('shows all items when no allergen alerts set', () => {
        localStorage.setItem('amoghaUser', JSON.stringify({ allergenAlerts: [] }));
        toggleSafeForMe();
        const biryani = document.body.querySelector('[data-id="Biryani"]');
        expect(biryani.style.display).not.toBe('none');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// checkAllergenWarning
// ═══════════════════════════════════════════════════════════════════════════
describe('checkAllergenWarning', () => {
    beforeEach(() => {
        setupDOM(`
            <div class="menu-item-card" data-id="Biryani" data-allergens="nuts,dairy"><h4>Biryani</h4></div>
            <div class="menu-item-card" data-id="Dal" data-allergens=""><h4>Dal</h4></div>
        `);
        localStorage.clear();
    });

    it('calls callback with true immediately when user has no allergen alerts', () => {
        const cb = vi.fn();
        checkAllergenWarning([{ name: 'Biryani' }], cb);
        expect(cb).toHaveBeenCalledWith(true);
    });

    it('calls callback with true when no allergens in cart items match user alerts', () => {
        localStorage.setItem('amoghaUser', JSON.stringify({ allergenAlerts: ['shellfish'] }));
        const cb = vi.fn();
        checkAllergenWarning([{ name: 'Biryani' }], cb);
        expect(cb).toHaveBeenCalledWith(true);
    });

    it('shows allergen warning popup when cart items match user allergens', () => {
        localStorage.setItem('amoghaUser', JSON.stringify({ allergenAlerts: ['nuts'] }));
        const cb = vi.fn();
        checkAllergenWarning([{ name: 'Biryani' }], cb);
        const popup = document.getElementById('allergen-warning-popup');
        expect(popup).not.toBeNull();
        expect(popup.textContent).toContain('Biryani');
        expect(popup.textContent).toContain('nuts');
    });

    it('does not show warning for items without matching allergens', () => {
        localStorage.setItem('amoghaUser', JSON.stringify({ allergenAlerts: ['nuts'] }));
        const cb = vi.fn();
        checkAllergenWarning([{ name: 'Dal' }], cb);
        expect(cb).toHaveBeenCalledWith(true);
    });
});
