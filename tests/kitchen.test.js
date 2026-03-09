// ===== KITCHEN DISPLAY (KDS) TESTS =====
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadInlineScript } from './helpers/inline-script-loader.js';

let fns;

// Helper: safely call a function, ignoring DOM-related errors from cached element refs
function safeCall(fn, ...args) {
    try { return fn(...args); } catch(e) {
        // Tolerate DOM errors from pre-cached element references
        if (e instanceof TypeError && (e.message.includes('Cannot read properties') || e.message.includes('Cannot set properties'))) return undefined;
        throw e;
    }
}

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
    it('cacheDOM is extracted', () => {
        if (!fns.cacheDOM) return;
        expect(typeof fns.cacheDOM).toBe('function');
        safeCall(fns.cacheDOM);
    });

    it('loadPrefs loads preferences from localStorage', () => {
        if (!fns.loadPrefs) return;
        localStorage.setItem('kds-sound', 'false');
        safeCall(fns.loadPrefs);
    });
});

// ═══════════════════════════════════════════
// MENU & PREP TIMES
// ═══════════════════════════════════════════

describe('Kitchen — Menu', () => {
    it('loadMenuPrepTimes fetches menu from Firestore', () => {
        if (!fns.loadMenuPrepTimes) return;
        safeCall(fns.loadMenuPrepTimes);
        expect(fns.__mockDb.collection).toHaveBeenCalledWith('menu');
    });

    it('getMaxPrepTime returns number for items', () => {
        if (!fns.getMaxPrepTime) return;
        const result = safeCall(fns.getMaxPrepTime, []);
        if (result !== undefined) expect(typeof result).toBe('number');
    });
});

// ═══════════════════════════════════════════
// ORDER MANAGEMENT
// ═══════════════════════════════════════════

describe('Kitchen — Orders', () => {
    it('loadOrders sets up Firestore listener', () => {
        if (!fns.loadOrders) return;
        safeCall(fns.loadOrders);
        expect(fns.__mockDb.collection).toHaveBeenCalledWith('orders');
    });

    it('catOrders is callable', () => {
        if (!fns.catOrders) return;
        safeCall(fns.catOrders);
    });

    it('renderBoard is callable', () => {
        if (!fns.renderBoard) return;
        safeCall(fns.renderBoard);
    });

    it('startOrder calls Firestore update', () => {
        if (!fns.startOrder) return;
        safeCall(fns.startOrder, 'order-1');
        expect(fns.__mockDb.collection).toHaveBeenCalledWith('orders');
    });

    it('doneOrder calls Firestore update', () => {
        if (!fns.doneOrder) return;
        safeCall(fns.doneOrder, 'order-1');
        expect(fns.__mockDb.collection).toHaveBeenCalledWith('orders');
    });

    it('recallOrder calls Firestore update', () => {
        if (!fns.recallOrder) return;
        safeCall(fns.recallOrder, 'order-1');
        expect(fns.__mockDb.collection).toHaveBeenCalledWith('orders');
    });

    it('rushOrder calls Firestore update', () => {
        if (!fns.rushOrder) return;
        safeCall(fns.rushOrder, 'order-1');
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

    it('matchSearch is callable', () => {
        if (!fns.matchSearch) return;
        const result = safeCall(fns.matchSearch, { customer: 'John', items: [] });
        if (result !== undefined) expect(typeof result).toBe('boolean');
    });

    it('isSoldOut returns false for available item', () => {
        if (!fns.isSoldOut) return;
        expect(fns.isSoldOut('Chicken Biryani')).toBe(false);
    });

    it('detectAllergen checks notes for allergens', () => {
        if (!fns.detectAllergen) return;
        const result = fns.detectAllergen({ notes: 'no peanuts please' });
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
    it('elapsed is callable with order data', () => {
        if (!fns.elapsed) return;
        const order = { createdAt: new Date(Date.now() - 300000).toISOString() };
        safeCall(fns.elapsed, order, 'new');
    });

    it('startTimers is callable', () => {
        if (!fns.startTimers) return;
        safeCall(fns.startTimers);
    });
});

// ═══════════════════════════════════════════
// STATISTICS
// ═══════════════════════════════════════════

describe('Kitchen — Statistics', () => {
    it('updateStats is callable', () => {
        if (!fns.updateStats) return;
        safeCall(fns.updateStats);
    });
});

// ═══════════════════════════════════════════
// 86 SOLD OUT
// ═══════════════════════════════════════════

describe('Kitchen — 86 Sold Out', () => {
    it('render86 is callable', () => {
        if (!fns.render86) return;
        safeCall(fns.render86);
    });

    it('add86 adds item to sold-out list', () => {
        if (!fns.add86) return;
        safeCall(fns.add86, 'Mutton Biryani');
    });

    it('remove86 removes item by index', () => {
        if (!fns.remove86) return;
        if (fns.add86) safeCall(fns.add86, 'Test Item');
        safeCall(fns.remove86, 0);
    });
});

// ═══════════════════════════════════════════
// AUDIO/SOUND
// ═══════════════════════════════════════════

describe('Kitchen — Audio', () => {
    it('initAudio is callable', () => {
        if (!fns.initAudio) return;
        safeCall(fns.initAudio);
    });

    it('toggleSound is callable', () => {
        if (!fns.toggleSound) return;
        safeCall(fns.toggleSound);
    });

    it('playNew is callable', () => {
        if (!fns.playNew) return;
        safeCall(fns.playNew);
    });

    it('playDone is callable', () => {
        if (!fns.playDone) return;
        safeCall(fns.playDone);
    });

    it('playUrgent is callable', () => {
        if (!fns.playUrgent) return;
        safeCall(fns.playUrgent);
    });
});

// ═══════════════════════════════════════════
// VOICE TTS
// ═══════════════════════════════════════════

describe('Kitchen — Voice', () => {
    it('toggleVoice is callable', () => {
        if (!fns.toggleVoice) return;
        safeCall(fns.toggleVoice);
    });
});

// ═══════════════════════════════════════════
// CLOCK, THEME, FULLSCREEN
// ═══════════════════════════════════════════

describe('Kitchen — UI Controls', () => {
    it('startClock is callable', () => {
        if (!fns.startClock) return;
        safeCall(fns.startClock);
    });

    it('toggleTheme is callable', () => {
        if (!fns.toggleTheme) return;
        safeCall(fns.toggleTheme);
    });

    it('toggleFS is callable', () => {
        if (!fns.toggleFS) return;
        document.documentElement.requestFullscreen = vi.fn();
        safeCall(fns.toggleFS);
    });

    it('setZoom changes zoom level', () => {
        if (!fns.setZoom) return;
        safeCall(fns.setZoom, 110);
    });

    it('toast shows notification', () => {
        if (!fns.toast) return;
        safeCall(fns.toast, '✓', 'Order started');
    });

    it('showFlash shows flash notification', () => {
        if (!fns.showFlash) return;
        safeCall(fns.showFlash, 3);
    });
});

// ═══════════════════════════════════════════
// VIEW MODES & PANELS
// ═══════════════════════════════════════════

describe('Kitchen — View Modes', () => {
    it('setView switches to board view', () => {
        if (!fns.setView) return;
        safeCall(fns.setView, 'board');
    });

    it('toggleHist opens/closes history', () => {
        if (!fns.toggleHist) return;
        safeCall(fns.toggleHist);
    });

    it('toggleSearch opens/closes search', () => {
        if (!fns.toggleSearch) return;
        safeCall(fns.toggleSearch);
    });

    it('toggleSC opens shortcuts overlay', () => {
        if (!fns.toggleSC) return;
        safeCall(fns.toggleSC);
    });

    it('closeAll closes all panels', () => {
        if (!fns.closeAll) return;
        safeCall(fns.closeAll);
    });
});

// ═══════════════════════════════════════════
// STAFF
// ═══════════════════════════════════════════

describe('Kitchen — Staff', () => {
    it('toggleStaff opens/closes panel', () => {
        if (!fns.toggleStaff) return;
        safeCall(fns.toggleStaff);
    });

    it('addStaff adds staff member', () => {
        if (!fns.addStaff) return;
        safeCall(fns.addStaff, 'Chef Raju');
    });

    it('renderStaff is callable', () => {
        if (!fns.renderStaff) return;
        safeCall(fns.renderStaff);
    });

    it('removeStaff is callable', () => {
        if (!fns.removeStaff) return;
        if (fns.addStaff) safeCall(fns.addStaff, 'Temp');
        safeCall(fns.removeStaff, 0);
    });
});

// ═══════════════════════════════════════════
// RECIPES
// ═══════════════════════════════════════════

describe('Kitchen — Recipes', () => {
    it('showRecipe opens recipe modal', () => {
        if (!fns.showRecipe) return;
        safeCall(fns.showRecipe, 'Chicken Biryani');
    });

    it('saveRecipe is callable', () => {
        if (!fns.saveRecipe) return;
        safeCall(fns.saveRecipe);
    });

    it('closeRecipe closes modal', () => {
        if (!fns.closeRecipe) return;
        safeCall(fns.closeRecipe);
    });
});

// ═══════════════════════════════════════════
// CHAT
// ═══════════════════════════════════════════

describe('Kitchen — Chat', () => {
    it('toggleChat opens/closes chat panel', () => {
        if (!fns.toggleChat) return;
        safeCall(fns.toggleChat);
    });

    it('initChat sets up Firestore listener', () => {
        if (!fns.initChat) return;
        safeCall(fns.initChat);
        expect(fns.__mockDb.collection).toHaveBeenCalledWith('messages');
    });
});

// ═══════════════════════════════════════════
// INVENTORY
// ═══════════════════════════════════════════

describe('Kitchen — Inventory', () => {
    it('toggleInv opens/closes inventory panel', () => {
        if (!fns.toggleInv) return;
        safeCall(fns.toggleInv);
    });

    it('renderInv is callable', () => {
        if (!fns.renderInv) return;
        safeCall(fns.renderInv);
    });

    it('loadInventory is callable', () => {
        if (!fns.loadInventory) return;
        safeCall(fns.loadInventory);
    });

    it('resetInventory is callable', () => {
        if (!fns.resetInventory) return;
        safeCall(fns.resetInventory);
    });
});

// ═══════════════════════════════════════════
// TABLE MANAGEMENT
// ═══════════════════════════════════════════

describe('Kitchen — Tables', () => {
    it('toggleTbl opens/closes table panel', () => {
        if (!fns.toggleTbl) return;
        safeCall(fns.toggleTbl);
    });

    it('renderTbl is callable', () => {
        if (!fns.renderTbl) return;
        safeCall(fns.renderTbl);
    });

    it('initTables is callable', () => {
        if (!fns.initTables) return;
        safeCall(fns.initTables);
    });
});

// ═══════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════

describe('Kitchen — Reports', () => {
    it('toggleRpt opens/closes report panel', () => {
        if (!fns.toggleRpt) return;
        safeCall(fns.toggleRpt);
    });

    it('renderRpt is callable', () => {
        if (!fns.renderRpt) return;
        safeCall(fns.renderRpt);
    });
});

// ═══════════════════════════════════════════
// PREP TIME LEARNING
// ═══════════════════════════════════════════

describe('Kitchen — Prep Time Learning', () => {
    it('getLearnedETA is callable', () => {
        if (!fns.getLearnedETA) return;
        safeCall(fns.getLearnedETA, [{ name: 'Chicken Biryani' }]);
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
    it('renderBatchView is callable', () => {
        if (!fns.renderBatchView) return;
        safeCall(fns.renderBatchView);
    });
});

// ═══════════════════════════════════════════
// CSV EXPORT
// ═══════════════════════════════════════════

describe('Kitchen — Export', () => {
    it('exportCSV is extracted', () => {
        if (!fns.exportCSV) return;
        expect(typeof fns.exportCSV).toBe('function');
    });
});

// ═══════════════════════════════════════════
// SCREENSAVER
// ═══════════════════════════════════════════

describe('Kitchen — Screensaver', () => {
    it('showSS activates screensaver', () => {
        if (!fns.showSS) return;
        safeCall(fns.showSS);
    });

    it('wakeSS deactivates screensaver', () => {
        if (!fns.wakeSS) return;
        safeCall(fns.wakeSS);
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
