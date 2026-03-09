// ===== DISPLAY (ORDER BOARD) PAGE TESTS =====
// Tests for inline functions in display/index.html
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadInlineScript } from './helpers/inline-script-loader.js';

let fns;

function setupDOM() {
    document.body.innerHTML = `
        <div id="nowServingGrid"></div>
        <div id="cycleDots"></div>
        <div id="listPreparing"></div>
        <div id="listWaiting"></div>
        <div id="listReady"></div>
        <div id="countPreparing">0</div>
        <div id="countWaiting">0</div>
        <div id="countReady">0</div>
        <div id="statCompleted">0</div>
        <div id="statAvgTime">--</div>
        <div id="statActive">0</div>
        <div id="flashOverlay"></div>
        <div id="toast"><span class="toast-text"></span></div>
        <div id="toastNum"></div>
        <div id="fsPrompt"></div>
        <div id="clockTime"></div>
        <div id="clockDate"></div>
        <div id="boardSections" style="height:100px;overflow:auto"><div style="height:500px"></div></div>
        <canvas id="ambient" width="100" height="100"></canvas>
    `;

    // Restore real DOM methods (setup.js overrides them with vi.fn(() => null))
    document.getElementById = (id) => document.body.querySelector('#' + id);
    document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
    document.querySelector = (sel) => document.body.querySelector(sel);

    // Mock canvas getContext for particles IIFE
    const canvas = document.getElementById('ambient');
    if (canvas) {
        canvas.getContext = vi.fn(() => ({
            clearRect: vi.fn(),
            beginPath: vi.fn(),
            arc: vi.fn(),
            fill: vi.fn(),
            fillStyle: '',
        }));
    }
}

beforeEach(() => {
    setupDOM();
    vi.useFakeTimers();
    vi.clearAllMocks();

    // Ensure window.AudioContext is available for getAudioCtx()
    const MockAudioContext = vi.fn().mockImplementation(() => ({
        createOscillator: vi.fn(() => ({
            type: '', frequency: { value: 0, setValueAtTime: vi.fn() }, connect: vi.fn(), start: vi.fn(), stop: vi.fn(),
        })),
        createGain: vi.fn(() => ({
            gain: { value: 1, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
            connect: vi.fn(),
        })),
        destination: {},
        currentTime: 0,
    }));
    globalThis.window.AudioContext = MockAudioContext;

    fns = loadInlineScript('display/index.html', {
        navigator: { wakeLock: undefined, clipboard: { writeText: vi.fn() }, vibrate: vi.fn() },
    });
});

// ===== PURE HELPER FUNCTIONS =====

describe('orderNum', () => {
    it('returns last 4 chars of docId uppercased with # prefix', () => {
        expect(fns.orderNum('abc123xyz')).toBe('#3XYZ');
    });

    it('handles short doc IDs', () => {
        expect(fns.orderNum('ab')).toBe('#AB');
    });
});

describe('firstName', () => {
    it('returns first name from full name', () => {
        expect(fns.firstName('John Doe')).toBe('John');
    });

    it('returns single name as-is', () => {
        expect(fns.firstName('Priya')).toBe('Priya');
    });

    it('returns --- for empty/null name', () => {
        expect(fns.firstName('')).toBe('---');
        expect(fns.firstName(null)).toBe('---');
        expect(fns.firstName(undefined)).toBe('---');
    });

    it('trims whitespace', () => {
        expect(fns.firstName('  Mukunda  Katta  ')).toBe('Mukunda');
    });
});

describe('todayStart', () => {
    it('returns ISO string for start of today', () => {
        const result = fns.todayStart();
        const d = new Date(result);
        expect(d.getHours()).toBe(0);
        expect(d.getMinutes()).toBe(0);
        expect(d.getSeconds()).toBe(0);
    });
});

describe('timeSince', () => {
    it('returns -- for null/undefined input', () => {
        expect(fns.timeSince(null)).toBe('--');
        expect(fns.timeSince(undefined)).toBe('--');
    });

    it('returns <1m for very recent timestamps', () => {
        const now = new Date().toISOString();
        expect(fns.timeSince(now)).toBe('<1m');
    });

    it('returns minutes for times < 60 min ago', () => {
        const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        expect(fns.timeSince(thirtyMinAgo)).toBe('30m');
    });

    it('returns hours and minutes for times >= 60 min ago', () => {
        const ninetyMinAgo = new Date(Date.now() - 90 * 60 * 1000).toISOString();
        expect(fns.timeSince(ninetyMinAgo)).toBe('1h 30m');
    });
});

describe('prepTime', () => {
    it('calculates prep time from kitchenStartedAt to completedAt', () => {
        const order = {
            kitchenStartedAt: '2026-03-09T10:00:00Z',
            completedAt: '2026-03-09T10:15:00Z',
        };
        expect(fns.prepTime(order)).toBe(15);
    });

    it('falls back to createdAt if kitchenStartedAt missing', () => {
        const order = {
            createdAt: '2026-03-09T10:00:00Z',
            completedAt: '2026-03-09T10:20:00Z',
        };
        expect(fns.prepTime(order)).toBe(20);
    });

    it('returns null if neither time pair available', () => {
        expect(fns.prepTime({})).toBeNull();
    });

    it('returns 0 for simultaneous start/end', () => {
        const order = {
            kitchenStartedAt: '2026-03-09T10:00:00Z',
            completedAt: '2026-03-09T10:00:00Z',
        };
        expect(fns.prepTime(order)).toBe(0);
    });
});

describe('escHtml', () => {
    it('escapes HTML special characters', () => {
        const result = fns.escHtml('<script>alert("xss")</script>');
        expect(result).not.toContain('<script>');
    });

    it('returns empty string for null/undefined', () => {
        expect(fns.escHtml(null)).toBe('');
        expect(fns.escHtml(undefined)).toBe('');
        expect(fns.escHtml('')).toBe('');
    });

    it('passes through safe text unchanged', () => {
        expect(fns.escHtml('Hello World')).toBe('Hello World');
    });
});

// ===== CLOCK =====

describe('updateClock', () => {
    it('sets clock time and date elements', () => {
        fns.updateClock();
        const time = document.getElementById('clockTime').textContent;
        const date = document.getElementById('clockDate').textContent;
        expect(time).toMatch(/\d{1,2}:\d{2}\s(AM|PM)/);
        expect(date).toMatch(/\w{3}, \d{1,2} \w{3} \d{4}/);
    });
});

// ===== FULLSCREEN =====

describe('goFullscreen', () => {
    it('calls requestFullscreen and hides prompt', () => {
        const mockRfs = vi.fn(() => Promise.resolve());
        document.documentElement.requestFullscreen = mockRfs;
        fns.goFullscreen();
        expect(mockRfs).toHaveBeenCalled();
    });

    it('hides prompt even if requestFullscreen not available', () => {
        delete document.documentElement.requestFullscreen;
        delete document.documentElement.webkitRequestFullscreen;
        delete document.documentElement.msRequestFullscreen;
        fns.goFullscreen();
        const prompt = document.getElementById('fsPrompt');
        expect(prompt.classList.contains('hidden')).toBe(true);
    });
});

// ===== AUDIO =====

describe('getAudioCtx', () => {
    it('creates AudioContext on first call', () => {
        const ctx = fns.getAudioCtx();
        expect(ctx).toBeDefined();
    });
});

describe('playChime', () => {
    it('creates oscillators and plays chime without throwing', () => {
        expect(() => fns.playChime()).not.toThrow();
    });
});

// ===== VOICE =====

describe('announceReady', () => {
    it('does not throw', () => {
        expect(() => fns.announceReady('#A1B2', 'Priya')).not.toThrow();
    });
});

// ===== FLASH + TOAST =====

describe('showFlash', () => {
    it('adds active class to flash overlay', () => {
        fns.showFlash();
        const flash = document.getElementById('flashOverlay');
        expect(flash.classList.contains('active')).toBe(true);
    });
});

describe('showToast', () => {
    it('sets toast number and shows toast', () => {
        fns.showToast('#A1B2', 'Mukunda');
        const toast = document.getElementById('toast');
        expect(toast.classList.contains('show')).toBe(true);
        expect(document.getElementById('toastNum').textContent).toBe('#A1B2');
    });
});

// ===== RENDER FUNCTIONS =====

describe('renderCurrentPage', () => {
    it('shows empty state when no orders', () => {
        fns.renderNowServing([], null);
        const grid = document.getElementById('nowServingGrid');
        expect(grid.innerHTML).toContain('No orders ready');
    });
});

describe('renderNowServing', () => {
    it('renders serving cards for ready orders', () => {
        const orders = [
            { id: 'order-abcd', data: { customer: 'Priya Sharma', status: 'ready' } },
            { id: 'order-efgh', data: { customer: 'Rahul Kumar', status: 'ready' } },
        ];
        fns.renderNowServing(orders, new Set());
        const grid = document.getElementById('nowServingGrid');
        expect(grid.innerHTML).toContain('ABCD');
        expect(grid.innerHTML).toContain('Priya');
    });

    it('marks new orders with new-flash class', () => {
        const orders = [
            { id: 'order-abcd', data: { customer: 'Priya', status: 'ready' } },
        ];
        fns.renderNowServing(orders, new Set(['order-abcd']));
        const grid = document.getElementById('nowServingGrid');
        expect(grid.innerHTML).toContain('new-flash');
    });

    it('paginates when more than 4 orders', () => {
        const orders = Array.from({ length: 6 }, (_, i) => ({
            id: 'order-' + String(i).padStart(4, '0'),
            data: { customer: 'Guest ' + i, status: 'ready' },
        }));
        fns.renderNowServing(orders, new Set());
        const dots = document.getElementById('cycleDots');
        expect(dots.innerHTML).toContain('dot');
    });
});

describe('renderCycleDots', () => {
    it('renders nothing for single page', () => {
        fns.renderNowServing([{ id: 'order-0001', data: { customer: 'A', status: 'ready' } }], new Set());
        const dots = document.getElementById('cycleDots');
        expect(dots.innerHTML).toBe('');
    });
});

describe('renderBoardSection', () => {
    it('renders preparing orders with cooking icon', () => {
        const container = document.getElementById('listPreparing');
        const orders = [{ id: 'ord-1234', data: { customer: 'Ravi', status: 'preparing', kitchenStartedAt: new Date().toISOString() } }];
        fns.renderBoardSection(container, orders, 'preparing');
        expect(container.innerHTML).toContain('1234');
        expect(container.innerHTML).toContain('Ravi');
        expect(container.innerHTML).toContain('preparing-row');
    });

    it('renders waiting orders with hourglass icon', () => {
        const container = document.getElementById('listWaiting');
        const orders = [{ id: 'ord-5678', data: { customer: 'Anita', status: 'pending', createdAt: new Date().toISOString() } }];
        fns.renderBoardSection(container, orders, 'waiting');
        expect(container.innerHTML).toContain('waiting-row');
    });

    it('renders ready orders with check icon', () => {
        const container = document.getElementById('listReady');
        const orders = [{ id: 'ord-9999', data: { customer: 'Kumar', status: 'ready', completedAt: new Date().toISOString() } }];
        fns.renderBoardSection(container, orders, 'ready');
        expect(container.innerHTML).toContain('ready-row');
    });

    it('shows empty message when no orders', () => {
        const container = document.getElementById('listPreparing');
        fns.renderBoardSection(container, [], 'preparing');
        expect(container.innerHTML).toContain('No orders');
    });
});

describe('renderStats', () => {
    it('counts completed (delivered) orders', () => {
        const orders = [
            { id: '1', data: { status: 'delivered', kitchenStartedAt: '2026-03-09T10:00:00Z', completedAt: '2026-03-09T10:10:00Z' } },
            { id: '2', data: { status: 'delivered', kitchenStartedAt: '2026-03-09T10:00:00Z', completedAt: '2026-03-09T10:20:00Z' } },
            { id: '3', data: { status: 'preparing' } },
        ];
        fns.renderStats(orders);
        expect(document.getElementById('statCompleted').textContent).toBe('2');
    });

    it('calculates average prep time', () => {
        const orders = [
            { id: '1', data: { status: 'delivered', kitchenStartedAt: '2026-03-09T10:00:00Z', completedAt: '2026-03-09T10:10:00Z' } },
            { id: '2', data: { status: 'delivered', kitchenStartedAt: '2026-03-09T10:00:00Z', completedAt: '2026-03-09T10:20:00Z' } },
        ];
        fns.renderStats(orders);
        expect(document.getElementById('statAvgTime').textContent).toBe('15 min');
    });

    it('shows -- for avg when no completed orders with prep time', () => {
        fns.renderStats([{ id: '1', data: { status: 'pending' } }]);
        expect(document.getElementById('statAvgTime').textContent).toBe('--');
    });

    it('counts active orders (pending + confirmed + preparing)', () => {
        const orders = [
            { id: '1', data: { status: 'pending' } },
            { id: '2', data: { status: 'confirmed' } },
            { id: '3', data: { status: 'preparing' } },
            { id: '4', data: { status: 'delivered' } },
        ];
        fns.renderStats(orders);
        expect(document.getElementById('statActive').textContent).toBe('3');
    });
});

// ===== AUTO-SCROLL =====

describe('startBoardAutoScroll', () => {
    it('does not throw when called', () => {
        expect(() => fns.startBoardAutoScroll()).not.toThrow();
    });
});

// ===== FIRESTORE LISTENER =====

describe('startListener', () => {
    it('sets up Firestore onSnapshot listener', () => {
        fns.startListener();
        expect(fns.__mockDb.collection).toHaveBeenCalledWith('orders');
    });
});
