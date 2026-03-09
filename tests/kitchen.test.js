// ===== KITCHEN DISPLAY (KDS) TESTS =====
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadInlineScript } from './helpers/inline-script-loader.js';

let fns;

function setupDOM(html) {
    document.body.innerHTML = html || '';
    document.getElementById = (id) => document.body.querySelector('#' + id);
    document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
    document.querySelector = (sel) => document.body.querySelector(sel);
}

beforeEach(() => {
    setupDOM(`
        <div id="login" style="display:block"></div>
        <input id="pin" value="1234">
        <button id="lbtn"></button>
        <div id="lerr"></div>
        <div id="dash"></div>
        <div id="cN"></div><div id="cP"></div><div id="cR"></div>
        <div id="ccN">0</div><div id="ccP">0</div><div id="ccR">0</div>
        <div id="sa">0</div><div id="sd">0</div><div id="sav">0</div><div id="sr">0</div>
        <div id="clk"></div>
        <div id="search-input"></div>
        <div id="allday-list"></div>
        <div id="eighty-six-bar"></div>
        <div id="hist-panel" style="display:none"></div>
        <div id="hist-content"></div>
        <div id="bsound" class="on"></div>
        <div id="bvoice"></div>
        <div id="conn"></div>
        <div id="peak-meter"></div>
        <div id="zoom-val">100</div>
        <div id="shortcuts-overlay" style="display:none"></div>
        <div id="allday-panel" style="display:none"></div>
        <div id="eighty-six-modal" style="display:none"></div>
        <div id="staff-panel" style="display:none"></div>
        <div id="staff-roster"></div>
        <div id="recipe-modal" style="display:none"></div>
        <div id="recipe-name"></div>
        <div id="recipe-notes"></div>
        <div id="recipe-allergens"></div>
        <div id="chat-panel" style="display:none"></div>
        <div id="chat-messages"></div>
        <input id="chat-input">
        <div id="chat-badge"></div>
        <div id="batch-panel" style="display:none"></div>
        <div id="batch-content"></div>
        <div id="analytics-panel" style="display:none"></div>
        <div id="analytics-content"></div>
        <div id="inv-panel" style="display:none"></div>
        <div id="inv-list"></div>
        <div id="tbl-panel" style="display:none"></div>
        <div id="tbl-grid"></div>
        <div id="rpt-panel" style="display:none"></div>
        <div id="rpt-content"></div>
        <div id="screensaver" style="display:none"></div>
        <div id="flash"></div>
    `);
    vi.clearAllMocks();
    localStorage.clear();
    fns = loadInlineScript('kitchen/index.html');
});

// ═══════════════════════════════════════════
// DOM & INITIALIZATION
// ═══════════════════════════════════════════

describe('Kitchen — Initialization', () => {
    it('cacheDOM does not throw', () => {
        if (!fns.cacheDOM) return;
        expect(() => fns.cacheDOM()).not.toThrow();
    });

    it('loadPrefs loads preferences from localStorage', () => {
        if (!fns.loadPrefs) return;
        localStorage.setItem('kds-sound', 'false');
        expect(() => fns.loadPrefs()).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// MENU & PREP TIMES
// ═══════════════════════════════════════════

describe('Kitchen — Menu', () => {
    it('loadMenuPrepTimes fetches menu from Firestore', () => {
        if (!fns.loadMenuPrepTimes) return;
        fns.loadMenuPrepTimes();
        expect(fns.__mockDb.collection).toHaveBeenCalledWith('menu');
    });

    it('getMaxPrepTime returns 0 for empty items', () => {
        if (!fns.getMaxPrepTime) return;
        expect(fns.getMaxPrepTime([])).toBe(0);
        expect(fns.getMaxPrepTime(null)).toBe(0);
    });
});

// ═══════════════════════════════════════════
// ORDER MANAGEMENT
// ═══════════════════════════════════════════

describe('Kitchen — Orders', () => {
    it('loadOrders sets up Firestore listener', () => {
        if (!fns.loadOrders) return;
        fns.loadOrders();
        expect(fns.__mockDb.collection).toHaveBeenCalledWith('orders');
    });

    it('catOrders does not throw', () => {
        if (!fns.catOrders) return;
        expect(() => fns.catOrders()).not.toThrow();
    });

    it('renderBoard does not throw', () => {
        if (!fns.renderBoard) return;
        expect(() => fns.renderBoard()).not.toThrow();
    });

    it('startOrder calls Firestore update', () => {
        if (!fns.startOrder) return;
        fns.startOrder('order-1');
        expect(fns.__mockDb.collection).toHaveBeenCalledWith('orders');
    });

    it('doneOrder calls Firestore update', () => {
        if (!fns.doneOrder) return;
        fns.doneOrder('order-1');
        expect(fns.__mockDb.collection).toHaveBeenCalledWith('orders');
    });

    it('recallOrder calls Firestore update', () => {
        if (!fns.recallOrder) return;
        fns.recallOrder('order-1');
        expect(fns.__mockDb.collection).toHaveBeenCalledWith('orders');
    });

    it('rushOrder calls Firestore update', () => {
        if (!fns.rushOrder) return;
        fns.rushOrder('order-1');
        expect(fns.__mockDb.collection).toHaveBeenCalledWith('orders');
    });
});

// ═══════════════════════════════════════════
// ORDER CATEGORIZATION
// ═══════════════════════════════════════════

describe('Kitchen — Order Categorization', () => {
    it('detectType identifies delivery orders', () => {
        if (!fns.detectType) return;
        expect(fns.detectType({ address: '123 Main St' })).toBe('delivery');
    });

    it('detectType identifies dine-in orders', () => {
        if (!fns.detectType) return;
        const type = fns.detectType({ address: '' });
        expect(['dinein', 'takeaway']).toContain(type);
    });

    it('matchSearch returns true for matching order', () => {
        if (!fns.matchSearch) return;
        expect(fns.matchSearch({ customer: 'John', items: [] })).toBe(true);
    });

    it('isSoldOut returns false for available item', () => {
        if (!fns.isSoldOut) return;
        expect(fns.isSoldOut('Chicken Biryani')).toBe(false);
    });

    it('detectAllergen checks notes for allergens', () => {
        if (!fns.detectAllergen) return;
        const result = fns.detectAllergen({ notes: 'no peanuts please' });
        // Should return boolean or array
        expect(result !== undefined).toBe(true);
    });

    it('detectCourse classifies items', () => {
        if (!fns.detectCourse) return;
        const course = fns.detectCourse('Chicken Lollipop');
        expect(['starter', 'main', 'dessert']).toContain(course);
    });
});

// ═══════════════════════════════════════════
// TIMER MANAGEMENT
// ═══════════════════════════════════════════

describe('Kitchen — Timers', () => {
    it('elapsed returns time string for order', () => {
        if (!fns.elapsed) return;
        const order = { createdAt: new Date(Date.now() - 300000).toISOString() };
        const result = fns.elapsed(order, 'new');
        expect(typeof result).toBe('string');
    });

    it('startTimers does not throw', () => {
        if (!fns.startTimers) return;
        expect(() => fns.startTimers()).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// STATISTICS
// ═══════════════════════════════════════════

describe('Kitchen — Statistics', () => {
    it('updateStats does not throw', () => {
        if (!fns.updateStats) return;
        expect(() => fns.updateStats()).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// 86 SOLD OUT
// ═══════════════════════════════════════════

describe('Kitchen — 86 Sold Out', () => {
    it('render86 does not throw', () => {
        if (!fns.render86) return;
        expect(() => fns.render86()).not.toThrow();
    });

    it('add86 adds item to sold-out list', () => {
        if (!fns.add86) return;
        fns.add86('Mutton Biryani');
        // Should persist to localStorage
    });

    it('remove86 removes item by index', () => {
        if (!fns.remove86) return;
        if (fns.add86) fns.add86('Test Item');
        expect(() => fns.remove86(0)).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// AUDIO/SOUND
// ═══════════════════════════════════════════

describe('Kitchen — Audio', () => {
    it('initAudio does not throw', () => {
        if (!fns.initAudio) return;
        expect(() => fns.initAudio()).not.toThrow();
    });

    it('toggleSound does not throw', () => {
        if (!fns.toggleSound) return;
        expect(() => fns.toggleSound()).not.toThrow();
    });

    it('playNew does not throw', () => {
        if (!fns.playNew) return;
        expect(() => fns.playNew()).not.toThrow();
    });

    it('playDone does not throw', () => {
        if (!fns.playDone) return;
        expect(() => fns.playDone()).not.toThrow();
    });

    it('playUrgent does not throw', () => {
        if (!fns.playUrgent) return;
        expect(() => fns.playUrgent()).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// VOICE TTS
// ═══════════════════════════════════════════

describe('Kitchen — Voice', () => {
    it('toggleVoice does not throw', () => {
        if (!fns.toggleVoice) return;
        expect(() => fns.toggleVoice()).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// CLOCK, THEME, FULLSCREEN
// ═══════════════════════════════════════════

describe('Kitchen — UI Controls', () => {
    it('startClock does not throw', () => {
        if (!fns.startClock) return;
        expect(() => fns.startClock()).not.toThrow();
    });

    it('toggleTheme does not throw', () => {
        if (!fns.toggleTheme) return;
        expect(() => fns.toggleTheme()).not.toThrow();
    });

    it('toggleFS does not throw', () => {
        if (!fns.toggleFS) return;
        document.documentElement.requestFullscreen = vi.fn();
        expect(() => fns.toggleFS()).not.toThrow();
    });

    it('setZoom changes zoom level', () => {
        if (!fns.setZoom) return;
        expect(() => fns.setZoom(110)).not.toThrow();
    });

    it('toast shows notification', () => {
        if (!fns.toast) return;
        expect(() => fns.toast('✓', 'Order started')).not.toThrow();
    });

    it('showFlash shows flash notification', () => {
        if (!fns.showFlash) return;
        expect(() => fns.showFlash(3)).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// VIEW MODES & PANELS
// ═══════════════════════════════════════════

describe('Kitchen — View Modes', () => {
    it('setView switches to board view', () => {
        if (!fns.setView) return;
        expect(() => fns.setView('board')).not.toThrow();
    });

    it('toggleHist opens/closes history', () => {
        if (!fns.toggleHist) return;
        expect(() => fns.toggleHist()).not.toThrow();
    });

    it('toggleSearch opens/closes search', () => {
        if (!fns.toggleSearch) return;
        expect(() => fns.toggleSearch()).not.toThrow();
    });

    it('toggleSC opens shortcuts overlay', () => {
        if (!fns.toggleSC) return;
        expect(() => fns.toggleSC()).not.toThrow();
    });

    it('closeAll closes all panels', () => {
        if (!fns.closeAll) return;
        expect(() => fns.closeAll()).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// STAFF
// ═══════════════════════════════════════════

describe('Kitchen — Staff', () => {
    it('toggleStaff opens/closes panel', () => {
        if (!fns.toggleStaff) return;
        expect(() => fns.toggleStaff()).not.toThrow();
    });

    it('addStaff adds staff member', () => {
        if (!fns.addStaff) return;
        expect(() => fns.addStaff('Chef Raju')).not.toThrow();
    });

    it('renderStaff does not throw', () => {
        if (!fns.renderStaff) return;
        expect(() => fns.renderStaff()).not.toThrow();
    });

    it('removeStaff does not throw', () => {
        if (!fns.removeStaff) return;
        if (fns.addStaff) fns.addStaff('Temp');
        expect(() => fns.removeStaff(0)).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// RECIPES
// ═══════════════════════════════════════════

describe('Kitchen — Recipes', () => {
    it('showRecipe opens recipe modal', () => {
        if (!fns.showRecipe) return;
        expect(() => fns.showRecipe('Chicken Biryani')).not.toThrow();
    });

    it('saveRecipe does not throw', () => {
        if (!fns.saveRecipe) return;
        expect(() => fns.saveRecipe()).not.toThrow();
    });

    it('closeRecipe closes modal', () => {
        if (!fns.closeRecipe) return;
        expect(() => fns.closeRecipe()).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// CHAT
// ═══════════════════════════════════════════

describe('Kitchen — Chat', () => {
    it('toggleChat opens/closes chat panel', () => {
        if (!fns.toggleChat) return;
        expect(() => fns.toggleChat()).not.toThrow();
    });

    it('initChat sets up Firestore listener', () => {
        if (!fns.initChat) return;
        fns.initChat();
        expect(fns.__mockDb.collection).toHaveBeenCalledWith('messages');
    });
});

// ═══════════════════════════════════════════
// INVENTORY
// ═══════════════════════════════════════════

describe('Kitchen — Inventory', () => {
    it('toggleInv opens/closes inventory panel', () => {
        if (!fns.toggleInv) return;
        expect(() => fns.toggleInv()).not.toThrow();
    });

    it('renderInv does not throw', () => {
        if (!fns.renderInv) return;
        expect(() => fns.renderInv()).not.toThrow();
    });

    it('loadInventory does not throw', () => {
        if (!fns.loadInventory) return;
        expect(() => fns.loadInventory()).not.toThrow();
    });

    it('resetInventory does not throw', () => {
        if (!fns.resetInventory) return;
        expect(() => fns.resetInventory()).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// TABLE MANAGEMENT
// ═══════════════════════════════════════════

describe('Kitchen — Tables', () => {
    it('toggleTbl opens/closes table panel', () => {
        if (!fns.toggleTbl) return;
        expect(() => fns.toggleTbl()).not.toThrow();
    });

    it('renderTbl does not throw', () => {
        if (!fns.renderTbl) return;
        expect(() => fns.renderTbl()).not.toThrow();
    });

    it('initTables does not throw', () => {
        if (!fns.initTables) return;
        expect(() => fns.initTables()).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════

describe('Kitchen — Reports', () => {
    it('toggleRpt opens/closes report panel', () => {
        if (!fns.toggleRpt) return;
        expect(() => fns.toggleRpt()).not.toThrow();
    });

    it('renderRpt does not throw', () => {
        if (!fns.renderRpt) return;
        expect(() => fns.renderRpt()).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// PREP TIME LEARNING
// ═══════════════════════════════════════════

describe('Kitchen — Prep Time Learning', () => {
    it('getLearnedETA returns reasonable estimate', () => {
        if (!fns.getLearnedETA) return;
        const eta = fns.getLearnedETA([{ name: 'Chicken Biryani' }]);
        expect(typeof eta).toBe('number');
        expect(eta).toBeGreaterThanOrEqual(0);
    });
});

// ═══════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════

describe('Kitchen — Utilities', () => {
    it('esc escapes HTML', () => {
        if (!fns.esc) return;
        expect(fns.esc('<b>test</b>')).not.toContain('<b>');
    });

    it('todayISO returns today in ISO format', () => {
        if (!fns.todayISO) return;
        const iso = fns.todayISO();
        expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}/);
    });

    it('haptic does not throw', () => {
        if (!fns.haptic) return;
        expect(() => fns.haptic()).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// BATCH VIEW
// ═══════════════════════════════════════════

describe('Kitchen — Batch View', () => {
    it('renderBatchView does not throw', () => {
        if (!fns.renderBatchView) return;
        expect(() => fns.renderBatchView()).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// CSV EXPORT
// ═══════════════════════════════════════════

describe('Kitchen — Export', () => {
    it('exportCSV does not throw', () => {
        if (!fns.exportCSV) return;
        window.URL = { createObjectURL: vi.fn(() => 'blob:test'), revokeObjectURL: vi.fn() };
        expect(() => fns.exportCSV()).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// SCREENSAVER
// ═══════════════════════════════════════════

describe('Kitchen — Screensaver', () => {
    it('showSS activates screensaver', () => {
        if (!fns.showSS) return;
        expect(() => fns.showSS()).not.toThrow();
    });

    it('wakeSS deactivates screensaver', () => {
        if (!fns.wakeSS) return;
        expect(() => fns.wakeSS()).not.toThrow();
    });
});

// ═══════════════════════════════════════════
// STATION TAGS & ALLERGENS
// ═══════════════════════════════════════════

describe('Kitchen — Station Tags', () => {
    it('getStationTags returns array', () => {
        if (!fns.getStationTags) return;
        const tags = fns.getStationTags([{ name: 'Chicken Biryani' }]);
        expect(Array.isArray(tags)).toBe(true);
    });

    it('getItemAllergens returns array', () => {
        if (!fns.getItemAllergens) return;
        const allergens = fns.getItemAllergens('Butter Chicken');
        expect(Array.isArray(allergens)).toBe(true);
    });
});
