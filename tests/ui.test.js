import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ===== MODULE MOCK =====
// ui.js imports safeGetItem / safeSetItem / lockScroll / unlockScroll from utils.
// Mocking the whole module lets us control safeGetItem's return value and
// prevents DOM side-effects from lockScroll / unlockScroll during tests.
vi.mock('../src/core/utils.js', () => ({
    safeGetItem: vi.fn(() => null),
    safeSetItem: vi.fn(),
    lockScroll: vi.fn(),
    unlockScroll: vi.fn(),
}));

import { launchConfetti, closeMobileMenu, initUI } from '../src/modules/ui.js';
import { safeGetItem } from '../src/core/utils.js';

// ===== DOM SETUP HELPER =====
// Restores real jsdom query methods scoped to document.body so each test
// operates on a clean, isolated DOM subtree.
function setupDOM(html) {
    document.body.innerHTML = html || '';
    document.getElementById = (id) => document.body.querySelector('#' + id);
    document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
    document.querySelector = (sel) => document.body.querySelector(sel);
}

// ═══════════════════════════════════════════════════════════════════════════
// launchConfetti — no canvas element
// ═══════════════════════════════════════════════════════════════════════════

describe('launchConfetti — no canvas element', () => {
    beforeEach(() => {
        setupDOM('');
        window.scrollTo = vi.fn();
        window.requestAnimationFrame = vi.fn();
    });

    it('does nothing and does not throw when confetti-canvas is absent', () => {
        expect(() => launchConfetti()).not.toThrow();
    });

    it('returns undefined when canvas is absent', () => {
        expect(launchConfetti()).toBeUndefined();
    });

    it('does not call requestAnimationFrame when canvas is absent', () => {
        launchConfetti();
        expect(window.requestAnimationFrame).not.toHaveBeenCalled();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// launchConfetti — canvas present, animation triggered
// ═══════════════════════════════════════════════════════════════════════════

describe('launchConfetti — canvas exists, animation runs', () => {
    let mockCtx;

    beforeEach(() => {
        setupDOM('<canvas id="confetti-canvas"></canvas>');
        window.scrollTo = vi.fn();

        mockCtx = {
            clearRect: vi.fn(),
            save: vi.fn(),
            restore: vi.fn(),
            translate: vi.fn(),
            rotate: vi.fn(),
            fillRect: vi.fn(),
            fillStyle: '',
        };

        const canvas = document.getElementById('confetti-canvas');
        canvas.getContext = vi.fn(() => mockCtx);

        // Fire exactly one animation frame so the loop executes once without
        // recursing further (frame < 200 check would request another frame, but
        // the stub will not fire it a second time).
        window.requestAnimationFrame = vi.fn((cb) => { cb(0); return 0; });
    });

    it('does not throw when canvas and getContext are available', () => {
        expect(() => launchConfetti()).not.toThrow();
    });

    it('calls getContext("2d") on the canvas element', () => {
        const canvas = document.getElementById('confetti-canvas');
        launchConfetti();
        expect(canvas.getContext).toHaveBeenCalledWith('2d');
    });

    it('calls requestAnimationFrame to kick off the animation loop', () => {
        launchConfetti();
        expect(window.requestAnimationFrame).toHaveBeenCalled();
    });

    it('calls ctx.clearRect during the first animation frame', () => {
        launchConfetti();
        expect(mockCtx.clearRect).toHaveBeenCalled();
    });

    it('calls ctx.save at least once for the confetti pieces', () => {
        launchConfetti();
        expect(mockCtx.save.mock.calls.length).toBeGreaterThan(0);
    });

    it('calls ctx.restore at least once for the confetti pieces', () => {
        launchConfetti();
        expect(mockCtx.restore.mock.calls.length).toBeGreaterThan(0);
    });

    it('calls ctx.fillRect at least once for the confetti pieces', () => {
        launchConfetti();
        expect(mockCtx.fillRect.mock.calls.length).toBeGreaterThan(0);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// launchConfetti — canvas dimensions match window size
// ═══════════════════════════════════════════════════════════════════════════

describe('launchConfetti — canvas dimensions', () => {
    beforeEach(() => {
        setupDOM('<canvas id="confetti-canvas"></canvas>');
        window.scrollTo = vi.fn();
        // Do not fire the rAF callback — we only care about dimension assignment,
        // which happens synchronously before the first frame.
        window.requestAnimationFrame = vi.fn();
    });

    it('sets canvas.width to window.innerWidth', () => {
        Object.defineProperty(window, 'innerWidth', { value: 1440, configurable: true });
        const canvas = document.getElementById('confetti-canvas');
        canvas.getContext = vi.fn(() => ({
            clearRect: vi.fn(), save: vi.fn(), restore: vi.fn(),
            translate: vi.fn(), rotate: vi.fn(), fillRect: vi.fn(), fillStyle: '',
        }));
        launchConfetti();
        expect(canvas.width).toBe(1440);
    });

    it('sets canvas.height to window.innerHeight', () => {
        Object.defineProperty(window, 'innerHeight', { value: 900, configurable: true });
        const canvas = document.getElementById('confetti-canvas');
        canvas.getContext = vi.fn(() => ({
            clearRect: vi.fn(), save: vi.fn(), restore: vi.fn(),
            translate: vi.fn(), rotate: vi.fn(), fillRect: vi.fn(), fillStyle: '',
        }));
        launchConfetti();
        expect(canvas.height).toBe(900);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// closeMobileMenu — elements present
// ═══════════════════════════════════════════════════════════════════════════

describe('closeMobileMenu — removes active classes and resets toggle text', () => {
    beforeEach(() => {
        setupDOM(`
            <nav id="nav-links" class="active"></nav>
            <div id="mobile-menu-overlay" class="active"></div>
            <button id="mobile-menu-toggle">\u2715</button>
        `);
        window.scrollTo = vi.fn();
    });

    it('removes "active" class from nav-links', () => {
        closeMobileMenu();
        expect(document.getElementById('nav-links').classList.contains('active')).toBe(false);
    });

    it('removes "active" class from mobile-menu-overlay', () => {
        closeMobileMenu();
        expect(document.getElementById('mobile-menu-overlay').classList.contains('active')).toBe(false);
    });

    it('sets mobile-menu-toggle textContent to the hamburger character (\u2630)', () => {
        closeMobileMenu();
        expect(document.getElementById('mobile-menu-toggle').textContent).toBe('\u2630');
    });

    it('does not throw when called multiple times in a row', () => {
        expect(() => {
            closeMobileMenu();
            closeMobileMenu();
        }).not.toThrow();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// closeMobileMenu — missing elements (graceful no-ops)
// ═══════════════════════════════════════════════════════════════════════════

describe('closeMobileMenu — does nothing when elements are absent', () => {
    beforeEach(() => {
        window.scrollTo = vi.fn();
    });

    it('does not throw when all mobile menu elements are absent', () => {
        setupDOM('');
        expect(() => closeMobileMenu()).not.toThrow();
    });

    it('returns undefined when elements are absent', () => {
        setupDOM('');
        expect(closeMobileMenu()).toBeUndefined();
    });

    it('does not throw when only nav-links is missing', () => {
        setupDOM(`
            <div id="mobile-menu-overlay" class="active"></div>
            <button id="mobile-menu-toggle">\u2715</button>
        `);
        expect(() => closeMobileMenu()).not.toThrow();
    });

    it('does not throw when only mobile-menu-overlay is missing', () => {
        setupDOM(`
            <nav id="nav-links" class="active"></nav>
            <button id="mobile-menu-toggle">\u2715</button>
        `);
        expect(() => closeMobileMenu()).not.toThrow();
    });

    it('does not throw when only mobile-menu-toggle is missing', () => {
        setupDOM(`
            <nav id="nav-links" class="active"></nav>
            <div id="mobile-menu-overlay" class="active"></div>
        `);
        expect(() => closeMobileMenu()).not.toThrow();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// initUI — basic safety on empty DOM
// ═══════════════════════════════════════════════════════════════════════════

describe('initUI — does not throw on empty DOM', () => {
    beforeEach(() => {
        setupDOM('');
        window.scrollTo = vi.fn();
        safeGetItem.mockReturnValue(null);
    });

    it('does not throw on an empty DOM', () => {
        expect(() => initUI()).not.toThrow();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// initUI — scrollRestoration and initial scroll
// ═══════════════════════════════════════════════════════════════════════════

describe('initUI — scrollRestoration and window.scrollTo', () => {
    beforeEach(() => {
        setupDOM('');
        window.scrollTo = vi.fn();
        safeGetItem.mockReturnValue(null);
    });

    it('sets history.scrollRestoration to "manual" when the property is supported', () => {
        // Ensure the property exists and is writable in jsdom
        if (!('scrollRestoration' in history)) {
            Object.defineProperty(history, 'scrollRestoration', {
                value: 'auto',
                writable: true,
                configurable: true,
            });
        } else {
            Object.defineProperty(history, 'scrollRestoration', {
                value: 'auto',
                writable: true,
                configurable: true,
            });
        }
        initUI();
        expect(history.scrollRestoration).toBe('manual');
    });

    it('calls window.scrollTo(0, 0) on initialisation', () => {
        initUI();
        expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// initUI — dark mode from saved preference
// ═══════════════════════════════════════════════════════════════════════════

describe('initUI — dark mode reads saved preference via safeGetItem', () => {
    beforeEach(() => {
        window.scrollTo = vi.fn();
        document.body.classList.remove('dark-mode');
    });

    afterEach(() => {
        document.body.classList.remove('dark-mode');
    });

    it('applies dark-mode class to body when safeGetItem returns "true"', () => {
        setupDOM('<button id="theme-toggle">\uD83C\uDF19</button>');
        safeGetItem.mockReturnValue('true');
        initUI();
        expect(document.body.classList.contains('dark-mode')).toBe(true);
    });

    it('sets theme-toggle text to the sun emoji when dark mode is active on load', () => {
        setupDOM('<button id="theme-toggle">\uD83C\uDF19</button>');
        safeGetItem.mockReturnValue('true');
        initUI();
        expect(document.getElementById('theme-toggle').textContent).toBe('\u2600\uFE0F');
    });

    it('does not apply dark-mode class when safeGetItem returns null', () => {
        setupDOM('<button id="theme-toggle">\uD83C\uDF19</button>');
        safeGetItem.mockReturnValue(null);
        initUI();
        expect(document.body.classList.contains('dark-mode')).toBe(false);
    });

    it('does not apply dark-mode class when safeGetItem returns "false"', () => {
        setupDOM('<button id="theme-toggle">\uD83C\uDF19</button>');
        safeGetItem.mockReturnValue('false');
        initUI();
        expect(document.body.classList.contains('dark-mode')).toBe(false);
    });

    it('does not throw when theme-toggle element is absent', () => {
        setupDOM('');
        safeGetItem.mockReturnValue('true');
        expect(() => initUI()).not.toThrow();
    });

    it('toggles dark-mode class on body when theme-toggle is clicked', () => {
        setupDOM('<button id="theme-toggle">\uD83C\uDF19</button>');
        safeGetItem.mockReturnValue(null);
        initUI();

        const toggle = document.getElementById('theme-toggle');
        toggle.click();
        expect(document.body.classList.contains('dark-mode')).toBe(true);

        toggle.click();
        expect(document.body.classList.contains('dark-mode')).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// initUI — page transition & preloader (load event)
// ═══════════════════════════════════════════════════════════════════════════

describe('initUI — page-transition and preloader on window load', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        window.scrollTo = vi.fn();
        window.IntersectionObserver = vi.fn(() => ({
            observe: vi.fn(),
            unobserve: vi.fn(),
            disconnect: vi.fn(),
        }));
        window.MutationObserver = vi.fn(() => ({
            observe: vi.fn(),
            disconnect: vi.fn(),
        }));
        safeGetItem.mockReturnValue(null);
    });

    afterEach(() => {
        vi.useRealTimers();
        document.body.classList.remove('dark-mode');
    });

    it('adds "loaded" class to page-transition element after 100ms on load', () => {
        setupDOM('<div id="page-transition"></div><div id="preloader"></div>');
        initUI();
        window.dispatchEvent(new Event('load'));
        vi.advanceTimersByTime(100);
        expect(document.getElementById('page-transition').classList.contains('loaded')).toBe(true);
    });

    it('does not add "loaded" class before 100ms has elapsed', () => {
        setupDOM('<div id="page-transition"></div><div id="preloader"></div>');
        initUI();
        window.dispatchEvent(new Event('load'));
        vi.advanceTimersByTime(50);
        expect(document.getElementById('page-transition').classList.contains('loaded')).toBe(false);
    });

    it('adds "hidden" class to preloader after 2200ms on load', () => {
        setupDOM('<div id="page-transition"></div><div id="preloader"></div>');
        initUI();
        window.dispatchEvent(new Event('load'));
        vi.advanceTimersByTime(2200);
        expect(document.getElementById('preloader').classList.contains('hidden')).toBe(true);
    });

    it('does not add "hidden" class to preloader before 2200ms', () => {
        setupDOM('<div id="page-transition"></div><div id="preloader"></div>');
        initUI();
        window.dispatchEvent(new Event('load'));
        vi.advanceTimersByTime(2000);
        expect(document.getElementById('preloader').classList.contains('hidden')).toBe(false);
    });

    it('does not throw when page-transition element is absent on load', () => {
        setupDOM('<div id="preloader"></div>');
        initUI();
        expect(() => window.dispatchEvent(new Event('load'))).not.toThrow();
    });

    it('does not throw when preloader element is absent on load', () => {
        setupDOM('<div id="page-transition"></div>');
        initUI();
        window.dispatchEvent(new Event('load'));
        expect(() => vi.advanceTimersByTime(2200)).not.toThrow();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// initUI — stats counter animation (IntersectionObserver)
// ═══════════════════════════════════════════════════════════════════════════

describe('initUI — stats counter animation', () => {
    // The stats observer is the FIRST IntersectionObserver registered by initUI
    // (the premium scroll-reveal observer is registered later and overwrites a
    // single "capturedCallback" variable). We track all callbacks in order so
    // we can invoke the correct one for each feature.
    let observerCallbacks;

    beforeEach(() => {
        vi.useFakeTimers();
        window.scrollTo = vi.fn();
        window.requestAnimationFrame = vi.fn((cb) => { cb(performance.now()); return 1; });
        safeGetItem.mockReturnValue(null);
        observerCallbacks = [];

        window.IntersectionObserver = vi.fn((cb) => {
            observerCallbacks.push(cb);
            return {
                observe: vi.fn(),
                unobserve: vi.fn(),
                disconnect: vi.fn(),
            };
        });
        window.MutationObserver = vi.fn(() => ({
            observe: vi.fn(),
            disconnect: vi.fn(),
        }));
    });

    afterEach(() => {
        vi.useRealTimers();
        document.body.classList.remove('dark-mode');
        Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true, writable: true });
    });

    it('creates an IntersectionObserver when .stats-section is present', () => {
        setupDOM('<div class="stats-section"><span class="stat-number" data-target="100"></span></div>');
        initUI();
        expect(window.IntersectionObserver).toHaveBeenCalled();
    });

    it('calls observer.observe with the stats-section element', () => {
        setupDOM('<div class="stats-section"><span class="stat-number" data-target="100"></span></div>');
        // Capture which elements are observed per observer instance
        const observedElements = [];
        window.IntersectionObserver = vi.fn((cb) => {
            const instance = {
                observe: vi.fn((el) => { observedElements.push(el); }),
                unobserve: vi.fn(),
                disconnect: vi.fn(),
            };
            observerCallbacks.push(cb);
            return instance;
        });
        initUI();
        const statsSection = document.querySelector('.stats-section');
        expect(observedElements).toContain(statsSection);
    });

    it('does not throw when .stats-section is absent', () => {
        setupDOM('<span class="stat-number" data-target="50"></span>');
        expect(() => initUI()).not.toThrow();
    });

    it('sets counter text to target value (integer) when section intersects on mobile width', () => {
        Object.defineProperty(window, 'innerWidth', { value: 480, configurable: true, writable: true });
        setupDOM('<div class="stats-section"><span class="stat-number" data-target="500"></span></div>');
        initUI();
        // Stats observer is registered first; call it with isIntersecting + a
        // dummy target so the premium-reveal callback (which needs entry.target)
        // does not throw when accidentally invoked.
        const dummyTarget = document.querySelector('.stats-section');
        const statsCallback = observerCallbacks[0];
        statsCallback([{ isIntersecting: true, target: dummyTarget }]);
        expect(document.querySelector('.stat-number').textContent).toBe('500');
    });

    it('sets decimal counter text to one decimal place on mobile width', () => {
        Object.defineProperty(window, 'innerWidth', { value: 480, configurable: true, writable: true });
        setupDOM('<div class="stats-section"><span class="stat-number" data-target="4.8"></span></div>');
        initUI();
        const dummyTarget = document.querySelector('.stats-section');
        const statsCallback = observerCallbacks[0];
        statsCallback([{ isIntersecting: true, target: dummyTarget }]);
        expect(document.querySelector('.stat-number').textContent).toBe('4.8');
    });

    it('triggers requestAnimationFrame animation when section intersects on desktop', () => {
        Object.defineProperty(window, 'innerWidth', { value: 1440, configurable: true, writable: true });
        setupDOM('<div class="stats-section"><span class="stat-number" data-target="200"></span></div>');
        initUI();
        const rafSpy = vi.fn();
        window.requestAnimationFrame = rafSpy;
        const dummyTarget = document.querySelector('.stats-section');
        const statsCallback = observerCallbacks[0];
        statsCallback([{ isIntersecting: true, target: dummyTarget }]);
        expect(rafSpy).toHaveBeenCalled();
    });

    it('does not re-animate when section intersects a second time (statsAnimated guard)', () => {
        Object.defineProperty(window, 'innerWidth', { value: 1440, configurable: true, writable: true });
        setupDOM('<div class="stats-section"><span class="stat-number" data-target="200"></span></div>');
        initUI();
        const rafSpy = vi.fn();
        window.requestAnimationFrame = rafSpy;
        const dummyTarget = document.querySelector('.stats-section');
        const statsCallback = observerCallbacks[0];
        statsCallback([{ isIntersecting: true, target: dummyTarget }]);
        const firstCallCount = rafSpy.mock.calls.length;
        statsCallback([{ isIntersecting: true, target: dummyTarget }]);
        expect(rafSpy.mock.calls.length).toBe(firstCallCount);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// initUI — mobile menu toggle (click / overlay / nav-link click)
// ═══════════════════════════════════════════════════════════════════════════

describe('initUI — mobile menu toggle', () => {
    let lockScroll, unlockScroll;

    beforeEach(async () => {
        window.scrollTo = vi.fn();
        safeGetItem.mockReturnValue(null);
        window.IntersectionObserver = vi.fn(() => ({
            observe: vi.fn(),
            unobserve: vi.fn(),
            disconnect: vi.fn(),
        }));
        window.MutationObserver = vi.fn(() => ({
            observe: vi.fn(),
            disconnect: vi.fn(),
        }));
        ({ lockScroll, unlockScroll } = await import('../src/core/utils.js'));
    });

    afterEach(() => {
        document.body.classList.remove('dark-mode');
        vi.clearAllMocks();
    });

    function mobileMenuDOM() {
        return `
            <nav id="nav-links"></nav>
            <div id="mobile-menu-overlay"></div>
            <button id="mobile-menu-toggle">\u2630</button>
        `;
    }

    it('adds "active" class to nav-links when toggle is clicked', () => {
        setupDOM(mobileMenuDOM());
        initUI();
        document.getElementById('mobile-menu-toggle').click();
        expect(document.getElementById('nav-links').classList.contains('active')).toBe(true);
    });

    it('sets toggle textContent to "\u2715" when menu is opened', () => {
        setupDOM(mobileMenuDOM());
        initUI();
        document.getElementById('mobile-menu-toggle').click();
        expect(document.getElementById('mobile-menu-toggle').textContent).toBe('\u2715');
    });

    it('adds "active" class to overlay when toggle is clicked', () => {
        setupDOM(mobileMenuDOM());
        initUI();
        document.getElementById('mobile-menu-toggle').click();
        expect(document.getElementById('mobile-menu-overlay').classList.contains('active')).toBe(true);
    });

    it('calls lockScroll when menu is opened', () => {
        setupDOM(mobileMenuDOM());
        initUI();
        document.getElementById('mobile-menu-toggle').click();
        expect(lockScroll).toHaveBeenCalled();
    });

    it('removes "active" class from nav-links when toggle is clicked twice', () => {
        setupDOM(mobileMenuDOM());
        initUI();
        const toggle = document.getElementById('mobile-menu-toggle');
        toggle.click();
        toggle.click();
        expect(document.getElementById('nav-links').classList.contains('active')).toBe(false);
    });

    it('calls unlockScroll when menu is closed via toggle', () => {
        setupDOM(mobileMenuDOM());
        initUI();
        const toggle = document.getElementById('mobile-menu-toggle');
        toggle.click(); // open
        toggle.click(); // close
        expect(unlockScroll).toHaveBeenCalled();
    });

    it('closes menu when overlay is clicked', () => {
        setupDOM(mobileMenuDOM());
        initUI();
        const toggle = document.getElementById('mobile-menu-toggle');
        toggle.click(); // open
        document.getElementById('mobile-menu-overlay').click(); // close via overlay
        expect(document.getElementById('nav-links').classList.contains('active')).toBe(false);
    });

    it('does not throw when mobile-menu-toggle is absent', () => {
        setupDOM('<nav id="nav-links"></nav><div id="mobile-menu-overlay"></div>');
        expect(() => initUI()).not.toThrow();
    });

    it('does not throw when nav-links is absent', () => {
        setupDOM('<button id="mobile-menu-toggle">\u2630</button><div id="mobile-menu-overlay"></div>');
        expect(() => initUI()).not.toThrow();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// initUI — mobile nav link click closes menu and smooth-scrolls to anchor
// ═══════════════════════════════════════════════════════════════════════════

describe('initUI — mobile nav link click behaviour', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        window.scrollTo = vi.fn();
        safeGetItem.mockReturnValue(null);
        window.IntersectionObserver = vi.fn(() => ({
            observe: vi.fn(),
            unobserve: vi.fn(),
            disconnect: vi.fn(),
        }));
        window.MutationObserver = vi.fn(() => ({
            observe: vi.fn(),
            disconnect: vi.fn(),
        }));
    });

    afterEach(() => {
        vi.useRealTimers();
        document.body.classList.remove('dark-mode');
    });

    it('closes menu when a nav anchor link is clicked', () => {
        setupDOM(`
            <nav id="nav-links" class="active">
                <a href="#menu-section">Menu</a>
            </nav>
            <div id="mobile-menu-overlay" class="active"></div>
            <button id="mobile-menu-toggle">\u2715</button>
            <section id="menu-section"></section>
        `);
        // Stub scrollIntoView since jsdom doesn't implement it
        document.getElementById('menu-section').scrollIntoView = vi.fn();
        initUI();
        document.querySelector('#nav-links a').click();
        expect(document.getElementById('nav-links').classList.contains('active')).toBe(false);
    });

    it('calls scrollIntoView after 50ms when anchor target exists in nav', () => {
        setupDOM(`
            <nav id="nav-links" class="active">
                <a href="#target-sec">Go</a>
            </nav>
            <div id="mobile-menu-overlay" class="active"></div>
            <button id="mobile-menu-toggle">\u2715</button>
            <section id="target-sec"></section>
        `);
        const scrollIntoViewMock = vi.fn();
        initUI();
        document.getElementById('target-sec').scrollIntoView = scrollIntoViewMock;
        document.querySelector('#nav-links a').click();
        vi.advanceTimersByTime(50);
        expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// initUI — smooth scrolling for anchor links outside mobile nav
// ═══════════════════════════════════════════════════════════════════════════

describe('initUI — smooth scrolling anchor links', () => {
    beforeEach(() => {
        window.scrollTo = vi.fn();
        safeGetItem.mockReturnValue(null);
        window.IntersectionObserver = vi.fn(() => ({
            observe: vi.fn(),
            unobserve: vi.fn(),
            disconnect: vi.fn(),
        }));
        window.MutationObserver = vi.fn(() => ({
            observe: vi.fn(),
            disconnect: vi.fn(),
        }));
    });

    afterEach(() => {
        document.body.classList.remove('dark-mode');
    });

    it('calls scrollIntoView on the target element when an anchor link is clicked', () => {
        setupDOM(`
            <a href="#about">About</a>
            <section id="about"></section>
        `);
        initUI();
        const scrollIntoViewMock = vi.fn();
        document.getElementById('about').scrollIntoView = scrollIntoViewMock;
        document.querySelector('a[href="#about"]').click();
        expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    });

    it('does not call scrollIntoView when the anchor target does not exist in DOM', () => {
        setupDOM('<a href="#nonexistent">Link</a>');
        initUI();
        expect(() => document.querySelector('a[href="#nonexistent"]').click()).not.toThrow();
    });

    it('skips smooth scroll for cart-icon anchor link', () => {
        setupDOM(`
            <a href="#cart-section" id="cart-icon">Cart</a>
            <section id="cart-section"></section>
        `);
        initUI();
        const scrollIntoViewMock = vi.fn();
        document.getElementById('cart-section').scrollIntoView = scrollIntoViewMock;
        document.getElementById('cart-icon').click();
        expect(scrollIntoViewMock).not.toHaveBeenCalled();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// initUI — back-to-top button
// ═══════════════════════════════════════════════════════════════════════════

describe('initUI — back-to-top button', () => {
    beforeEach(() => {
        window.scrollTo = vi.fn();
        safeGetItem.mockReturnValue(null);
        window.IntersectionObserver = vi.fn(() => ({
            observe: vi.fn(),
            unobserve: vi.fn(),
            disconnect: vi.fn(),
        }));
        window.MutationObserver = vi.fn(() => ({
            observe: vi.fn(),
            disconnect: vi.fn(),
        }));
    });

    afterEach(() => {
        document.body.classList.remove('dark-mode');
    });

    it('calls window.scrollTo with top:0 and smooth behaviour when back-to-top is clicked', () => {
        setupDOM('<button id="back-to-top">Top</button>');
        initUI();
        document.getElementById('back-to-top').click();
        expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    });

    it('does not throw when back-to-top element is absent', () => {
        setupDOM('');
        expect(() => initUI()).not.toThrow();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// initUI — scroll handler: back-to-top visibility
// ═══════════════════════════════════════════════════════════════════════════

describe('initUI — scroll handler: back-to-top visibility toggle', () => {
    beforeEach(() => {
        window.scrollTo = vi.fn();
        safeGetItem.mockReturnValue(null);
        window.IntersectionObserver = vi.fn(() => ({
            observe: vi.fn(),
            unobserve: vi.fn(),
            disconnect: vi.fn(),
        }));
        window.MutationObserver = vi.fn(() => ({
            observe: vi.fn(),
            disconnect: vi.fn(),
        }));
        // Execute the rAF callback immediately so scroll logic runs synchronously
        window.requestAnimationFrame = vi.fn((cb) => { cb(); return 1; });
    });

    afterEach(() => {
        document.body.classList.remove('dark-mode');
    });

    it('adds "visible" class to back-to-top when scrolled past 400px', () => {
        setupDOM('<button id="back-to-top">Top</button>');
        initUI();
        Object.defineProperty(window, 'pageYOffset', { value: 500, configurable: true });
        window.dispatchEvent(new Event('scroll'));
        expect(document.getElementById('back-to-top').classList.contains('visible')).toBe(true);
    });

    it('does not add "visible" class when scrolled less than 400px', () => {
        setupDOM('<button id="back-to-top">Top</button>');
        initUI();
        Object.defineProperty(window, 'pageYOffset', { value: 100, configurable: true });
        window.dispatchEvent(new Event('scroll'));
        expect(document.getElementById('back-to-top').classList.contains('visible')).toBe(false);
    });

    it('removes "visible" class when scrolled back above 400px', () => {
        setupDOM('<button id="back-to-top">Top</button>');
        initUI();
        // First scroll: add the visible class
        Object.defineProperty(window, 'pageYOffset', { value: 500, configurable: true });
        window.dispatchEvent(new Event('scroll'));
        expect(document.getElementById('back-to-top').classList.contains('visible')).toBe(true);
        // Second scroll: go back up — _scrollTicking already reset by synchronous rAF
        Object.defineProperty(window, 'pageYOffset', { value: 50, configurable: true });
        window.dispatchEvent(new Event('scroll'));
        expect(document.getElementById('back-to-top').classList.contains('visible')).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// initUI — scroll handler: sticky order bar
// ═══════════════════════════════════════════════════════════════════════════

describe('initUI — scroll handler: sticky order bar', () => {
    beforeEach(() => {
        window.scrollTo = vi.fn();
        safeGetItem.mockReturnValue(null);
        window.IntersectionObserver = vi.fn(() => ({
            observe: vi.fn(),
            unobserve: vi.fn(),
            disconnect: vi.fn(),
        }));
        window.MutationObserver = vi.fn(() => ({
            observe: vi.fn(),
            disconnect: vi.fn(),
        }));
        window.requestAnimationFrame = vi.fn((cb) => { cb(); return 1; });
    });

    afterEach(() => {
        document.body.classList.remove('dark-mode');
    });

    it('shows sticky-order-bar after hero height is passed', () => {
        setupDOM('<div class="hero" style="height:600px"></div><div id="sticky-order-bar"></div>');
        Object.defineProperty(document.querySelector('.hero'), 'offsetHeight', { value: 600, configurable: true });
        initUI();
        Object.defineProperty(window, 'pageYOffset', { value: 700, configurable: true });
        window.dispatchEvent(new Event('scroll'));
        expect(document.getElementById('sticky-order-bar').classList.contains('visible')).toBe(true);
    });

    it('hides sticky-order-bar when above hero height', () => {
        setupDOM('<div class="hero" style="height:600px"></div><div id="sticky-order-bar"></div>');
        Object.defineProperty(document.querySelector('.hero'), 'offsetHeight', { value: 600, configurable: true });
        initUI();
        // First scroll past hero height to add class
        Object.defineProperty(window, 'pageYOffset', { value: 700, configurable: true });
        window.dispatchEvent(new Event('scroll'));
        expect(document.getElementById('sticky-order-bar').classList.contains('visible')).toBe(true);
        // Scroll back up above hero height — _scrollTicking already reset by synchronous rAF
        Object.defineProperty(window, 'pageYOffset', { value: 100, configurable: true });
        window.dispatchEvent(new Event('scroll'));
        expect(document.getElementById('sticky-order-bar').classList.contains('visible')).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// initUI — parallax hero slideshow
// ═══════════════════════════════════════════════════════════════════════════

describe('initUI — parallax hero slideshow on scroll', () => {
    beforeEach(() => {
        window.scrollTo = vi.fn();
        safeGetItem.mockReturnValue(null);
        window.IntersectionObserver = vi.fn(() => ({
            observe: vi.fn(),
            unobserve: vi.fn(),
            disconnect: vi.fn(),
        }));
        window.MutationObserver = vi.fn(() => ({
            observe: vi.fn(),
            disconnect: vi.fn(),
        }));
        window.requestAnimationFrame = vi.fn((cb) => { cb(); return 1; });
        // Ensure desktop width so parallax branch runs
        Object.defineProperty(window, 'innerWidth', { value: 1440, configurable: true, writable: true });
    });

    afterEach(() => {
        document.body.classList.remove('dark-mode');
        Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true, writable: true });
    });

    it('sets translateY transform on hero-slideshow proportional to scroll position', () => {
        setupDOM('<div class="hero-slideshow"></div>');
        initUI();
        Object.defineProperty(window, 'pageYOffset', { value: 200, configurable: true });
        window.dispatchEvent(new Event('scroll'));
        const heroSlideshow = document.querySelector('.hero-slideshow');
        expect(heroSlideshow.style.transform).toContain('translateY(');
        expect(heroSlideshow.style.transform).toContain('70px'); // 200 * 0.35
    });

    it('does not throw when hero-slideshow is absent', () => {
        setupDOM('');
        expect(() => {
            initUI();
            Object.defineProperty(window, 'pageYOffset', { value: 200, configurable: true });
            window.dispatchEvent(new Event('scroll'));
        }).not.toThrow();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// initUI — scroll reveal animations (IntersectionObserver for .fade-in-up / .reveal)
// ═══════════════════════════════════════════════════════════════════════════

describe('initUI — scroll-triggered reveal animations', () => {
    let capturedRevealCallback;

    beforeEach(() => {
        window.scrollTo = vi.fn();
        safeGetItem.mockReturnValue(null);
        window.MutationObserver = vi.fn(() => ({
            observe: vi.fn(),
            disconnect: vi.fn(),
        }));

        window.IntersectionObserver = vi.fn((cb) => {
            capturedRevealCallback = cb;
            return {
                observe: vi.fn(),
                unobserve: vi.fn(),
                disconnect: vi.fn(),
            };
        });
    });

    afterEach(() => {
        document.body.classList.remove('dark-mode');
    });

    it('adds "reveal" class to .about-text elements during initUI', () => {
        setupDOM('<div class="about-text">About</div>');
        initUI();
        expect(document.querySelector('.about-text').classList.contains('reveal')).toBe(true);
    });

    it('adds "reveal" class to .menu-item-card elements during initUI', () => {
        setupDOM('<div class="menu-item-card">Item</div>');
        initUI();
        expect(document.querySelector('.menu-item-card').classList.contains('reveal')).toBe(true);
    });

    it('adds "reveal-scale" class to .stat-item elements (overrides reveal)', () => {
        setupDOM('<div class="stat-item">Stat</div>');
        initUI();
        expect(document.querySelector('.stat-item').classList.contains('reveal-scale')).toBe(true);
    });

    it('adds "section-reveal" class to .about section elements', () => {
        setupDOM('<section class="about">About section</section>');
        initUI();
        expect(document.querySelector('.about').classList.contains('section-reveal')).toBe(true);
    });

    it('adds "visible" class when IntersectionObserver fires with isIntersecting=true', () => {
        setupDOM('<div class="about-text">Text</div>');
        initUI();
        const el = document.querySelector('.about-text');
        // Simulate intersection
        if (capturedRevealCallback) {
            capturedRevealCallback([{ isIntersecting: true, target: el }]);
        }
        expect(el.classList.contains('visible')).toBe(true);
    });

    it('does not add "visible" class when isIntersecting is false', () => {
        setupDOM('<div class="about-text">Text</div>');
        initUI();
        const el = document.querySelector('.about-text');
        if (capturedRevealCallback) {
            capturedRevealCallback([{ isIntersecting: false, target: el }]);
        }
        expect(el.classList.contains('visible')).toBe(false);
    });

    it('adds "reveal-left" class to .chef-image element', () => {
        setupDOM('<div class="chef-image"></div>');
        initUI();
        expect(document.querySelector('.chef-image').classList.contains('reveal-left')).toBe(true);
    });

    it('adds "reveal-right" class to #chef-info element', () => {
        setupDOM('<div id="chef-info"></div>');
        initUI();
        expect(document.getElementById('chef-info').classList.contains('reveal-right')).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// initUI — SVG ornament draw-on-scroll
// ═══════════════════════════════════════════════════════════════════════════

describe('initUI — SVG ornament IntersectionObserver', () => {
    let capturedOrnamentCallback;

    beforeEach(() => {
        window.scrollTo = vi.fn();
        safeGetItem.mockReturnValue(null);
        window.MutationObserver = vi.fn(() => ({
            observe: vi.fn(),
            disconnect: vi.fn(),
        }));
        window.IntersectionObserver = vi.fn((cb) => {
            capturedOrnamentCallback = cb;
            return {
                observe: vi.fn(),
                unobserve: vi.fn(),
                disconnect: vi.fn(),
            };
        });
    });

    afterEach(() => {
        document.body.classList.remove('dark-mode');
    });

    it('adds "visible" class to .svg-ornament when it intersects', () => {
        setupDOM('<svg class="svg-ornament"></svg>');
        initUI();
        const orn = document.querySelector('.svg-ornament');
        if (capturedOrnamentCallback) {
            capturedOrnamentCallback([{ isIntersecting: true, target: orn }]);
        }
        expect(orn.classList.contains('visible')).toBe(true);
    });

    it('does not throw when no .svg-ornament elements exist', () => {
        setupDOM('');
        expect(() => initUI()).not.toThrow();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// initUI — section wipe transitions
// ═══════════════════════════════════════════════════════════════════════════

describe('initUI — section-wipe IntersectionObserver', () => {
    let capturedWipeCallback;

    beforeEach(() => {
        window.scrollTo = vi.fn();
        safeGetItem.mockReturnValue(null);
        window.MutationObserver = vi.fn(() => ({
            observe: vi.fn(),
            disconnect: vi.fn(),
        }));
        window.IntersectionObserver = vi.fn((cb) => {
            capturedWipeCallback = cb;
            return {
                observe: vi.fn(),
                unobserve: vi.fn(),
                disconnect: vi.fn(),
            };
        });
    });

    afterEach(() => {
        document.body.classList.remove('dark-mode');
    });

    it('adds "wipe-active" class to .section-wipe element when it intersects', () => {
        setupDOM('<div class="section-wipe">Content</div>');
        initUI();
        const wipe = document.querySelector('.section-wipe');
        if (capturedWipeCallback) {
            capturedWipeCallback([{ isIntersecting: true, target: wipe }]);
        }
        expect(wipe.classList.contains('wipe-active')).toBe(true);
    });

    it('does not add "wipe-active" again if already present', () => {
        setupDOM('<div class="section-wipe wipe-active">Content</div>');
        initUI();
        const wipe = document.querySelector('.section-wipe');
        if (capturedWipeCallback) {
            capturedWipeCallback([{ isIntersecting: true, target: wipe }]);
        }
        // classList.add is idempotent — still has wipe-active, just once
        const count = Array.from(wipe.classList).filter(c => c === 'wipe-active').length;
        expect(count).toBe(1);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// initUI — veg/non-veg filter buttons
// ═══════════════════════════════════════════════════════════════════════════

describe('initUI — veg/non-veg filter buttons', () => {
    beforeEach(() => {
        window.scrollTo = vi.fn();
        safeGetItem.mockReturnValue(null);
        window.IntersectionObserver = vi.fn(() => ({
            observe: vi.fn(),
            unobserve: vi.fn(),
            disconnect: vi.fn(),
        }));
        window.MutationObserver = vi.fn(() => ({
            observe: vi.fn(),
            disconnect: vi.fn(),
        }));
    });

    afterEach(() => {
        document.body.classList.remove('dark-mode');
    });

    function filterDOM() {
        return `
            <button class="filter-btn active" data-filter="all">All</button>
            <button class="filter-btn" data-filter="veg">Veg</button>
            <button class="filter-btn" data-filter="non-veg">Non-Veg</button>
            <div class="menu-item-card"><span class="veg-badge"></span></div>
            <div class="menu-item-card"><span class="nonveg-badge"></span></div>
        `;
    }

    it('sets active class only on the clicked filter button', () => {
        setupDOM(filterDOM());
        initUI();
        const vegBtn = document.querySelectorAll('.filter-btn')[1];
        vegBtn.click();
        expect(vegBtn.classList.contains('active')).toBe(true);
        expect(document.querySelectorAll('.filter-btn')[0].classList.contains('active')).toBe(false);
    });

    it('hides non-veg cards when veg filter is clicked', () => {
        setupDOM(filterDOM());
        initUI();
        document.querySelectorAll('.filter-btn')[1].click(); // veg
        const cards = document.querySelectorAll('.menu-item-card');
        // card[0] has veg-badge — visible; card[1] has nonveg-badge — hidden
        expect(cards[0].style.display).toBe('');
        expect(cards[1].style.display).toBe('none');
    });

    it('hides veg cards when non-veg filter is clicked', () => {
        setupDOM(filterDOM());
        initUI();
        document.querySelectorAll('.filter-btn')[2].click(); // non-veg
        const cards = document.querySelectorAll('.menu-item-card');
        expect(cards[0].style.display).toBe('none');
        expect(cards[1].style.display).toBe('');
    });

    it('shows all cards when all filter is clicked', () => {
        setupDOM(filterDOM());
        initUI();
        // First hide everything with veg filter
        document.querySelectorAll('.filter-btn')[1].click();
        // Then reset
        document.querySelectorAll('.filter-btn')[0].click();
        const cards = document.querySelectorAll('.menu-item-card');
        expect(cards[0].style.display).toBe('');
        expect(cards[1].style.display).toBe('');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// initUI — menu search input
// ═══════════════════════════════════════════════════════════════════════════

describe('initUI — menu search input', () => {
    beforeEach(() => {
        window.scrollTo = vi.fn();
        safeGetItem.mockReturnValue(null);
        window.IntersectionObserver = vi.fn(() => ({
            observe: vi.fn(),
            unobserve: vi.fn(),
            disconnect: vi.fn(),
        }));
        window.MutationObserver = vi.fn(() => ({
            observe: vi.fn(),
            disconnect: vi.fn(),
        }));
    });

    afterEach(() => {
        document.body.classList.remove('dark-mode');
    });

    it('hides cards whose name does not match the search query', () => {
        setupDOM(`
            <div class="search-autocomplete-wrap">
                <input id="menu-search" type="text" />
            </div>
            <div class="menu-item-card"><h4>Chicken Biryani</h4></div>
            <div class="menu-item-card"><h4>Paneer Butter Masala</h4></div>
        `);
        initUI();
        const input = document.getElementById('menu-search');
        input.value = 'paneer';
        input.dispatchEvent(new Event('input'));
        expect(document.querySelectorAll('.menu-item-card')[0].style.display).toBe('none');
        expect(document.querySelectorAll('.menu-item-card')[1].style.display).toBe('');
    });

    it('shows all cards when search query is cleared', () => {
        setupDOM(`
            <div class="search-autocomplete-wrap">
                <input id="menu-search" type="text" />
            </div>
            <div class="menu-item-card"><h4>Chicken Biryani</h4></div>
            <div class="menu-item-card"><h4>Paneer Butter Masala</h4></div>
        `);
        initUI();
        const input = document.getElementById('menu-search');
        input.value = 'chicken';
        input.dispatchEvent(new Event('input'));
        input.value = '';
        input.dispatchEvent(new Event('input'));
        const cards = document.querySelectorAll('.menu-item-card');
        expect(cards[0].style.display).toBe('');
        expect(cards[1].style.display).toBe('');
    });

    it('does not throw when menu-search is absent', () => {
        setupDOM('');
        expect(() => initUI()).not.toThrow();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// initUI — contact form submit
// ═══════════════════════════════════════════════════════════════════════════

describe('initUI — contact form submit', () => {
    beforeEach(() => {
        window.scrollTo = vi.fn();
        safeGetItem.mockReturnValue(null);
        window.IntersectionObserver = vi.fn(() => ({
            observe: vi.fn(),
            unobserve: vi.fn(),
            disconnect: vi.fn(),
        }));
        window.MutationObserver = vi.fn(() => ({
            observe: vi.fn(),
            disconnect: vi.fn(),
        }));
    });

    afterEach(() => {
        document.body.classList.remove('dark-mode');
    });

    it('prevents default form submission on contact form submit', () => {
        setupDOM('<form id="contact-form"><input name="msg" value="Hello" /><button type="submit">Send</button></form>');
        initUI();
        const form = document.getElementById('contact-form');
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);
        expect(submitEvent.defaultPrevented).toBe(true);
    });

    it('resets the form after submission', () => {
        setupDOM('<form id="contact-form"><input name="msg" value="Hello" /></form>');
        initUI();
        const form = document.getElementById('contact-form');
        const resetSpy = vi.spyOn(form, 'reset');
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        expect(resetSpy).toHaveBeenCalled();
    });

    it('does not throw when contact-form is absent', () => {
        setupDOM('');
        expect(() => initUI()).not.toThrow();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// initUI — button ripple effect on click delegation
// ═══════════════════════════════════════════════════════════════════════════

describe('initUI — button ripple effect', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        window.scrollTo = vi.fn();
        safeGetItem.mockReturnValue(null);
        window.IntersectionObserver = vi.fn(() => ({
            observe: vi.fn(),
            unobserve: vi.fn(),
            disconnect: vi.fn(),
        }));
        window.MutationObserver = vi.fn(() => ({
            observe: vi.fn(),
            disconnect: vi.fn(),
        }));
    });

    afterEach(() => {
        vi.useRealTimers();
        document.body.classList.remove('dark-mode');
    });

    it('appends a .btn-ripple span to an .add-to-cart button when clicked', () => {
        setupDOM('<button class="add-to-cart">Add</button>');
        initUI();
        const btn = document.querySelector('.add-to-cart');
        btn.getBoundingClientRect = vi.fn(() => ({ left: 0, top: 0, width: 100, height: 40 }));
        // Dispatch on the button so it bubbles to document with e.target = btn
        btn.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 50, clientY: 20 }));
        expect(btn.querySelector('.btn-ripple')).not.toBeNull();
    });

    it('removes the .btn-ripple span after 700ms', () => {
        setupDOM('<button class="cta-button">Order</button>');
        initUI();
        const btn = document.querySelector('.cta-button');
        btn.getBoundingClientRect = vi.fn(() => ({ left: 0, top: 0, width: 120, height: 50 }));
        btn.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 60, clientY: 25 }));
        expect(btn.querySelector('.btn-ripple')).not.toBeNull();
        vi.advanceTimersByTime(700);
        expect(btn.querySelector('.btn-ripple')).toBeNull();
    });

    it('does not append ripple for non-button elements', () => {
        setupDOM('<div class="some-div">Content</div>');
        initUI();
        const div = document.querySelector('.some-div');
        div.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 10, clientY: 10 }));
        expect(div.querySelector('.btn-ripple')).toBeNull();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// initUI — floating food particles
// ═══════════════════════════════════════════════════════════════════════════

describe('initUI — floating food particles', () => {
    beforeEach(() => {
        window.scrollTo = vi.fn();
        safeGetItem.mockReturnValue(null);
        window.IntersectionObserver = vi.fn(() => ({
            observe: vi.fn(),
            unobserve: vi.fn(),
            disconnect: vi.fn(),
        }));
        window.MutationObserver = vi.fn(() => ({
            observe: vi.fn(),
            disconnect: vi.fn(),
        }));
    });

    afterEach(() => {
        document.body.classList.remove('dark-mode');
    });

    it('creates 12 .food-particle span elements inside #food-particles', () => {
        setupDOM('<div id="food-particles"></div>');
        initUI();
        const container = document.getElementById('food-particles');
        expect(container.querySelectorAll('.food-particle').length).toBe(12);
    });

    it('does not throw when #food-particles is absent', () => {
        setupDOM('');
        expect(() => initUI()).not.toThrow();
    });

    it('each food particle has a non-empty textContent (emoji)', () => {
        setupDOM('<div id="food-particles"></div>');
        initUI();
        document.querySelectorAll('.food-particle').forEach(p => {
            expect(p.textContent.length).toBeGreaterThan(0);
        });
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// initUI — category carousel arrows
// ═══════════════════════════════════════════════════════════════════════════

describe('initUI — category carousel arrows', () => {
    beforeEach(() => {
        window.scrollTo = vi.fn();
        safeGetItem.mockReturnValue(null);
        window.IntersectionObserver = vi.fn(() => ({
            observe: vi.fn(),
            unobserve: vi.fn(),
            disconnect: vi.fn(),
        }));
        window.MutationObserver = vi.fn(() => ({
            observe: vi.fn(),
            disconnect: vi.fn(),
        }));
    });

    afterEach(() => {
        document.body.classList.remove('dark-mode');
    });

    it('does not throw when carousel elements are absent', () => {
        setupDOM('');
        expect(() => initUI()).not.toThrow();
    });

    it('calls carousel.scrollBy with positive left when right arrow is clicked', () => {
        setupDOM(`
            <div id="category-carousel" style="overflow:auto"></div>
            <button id="cat-arrow-left">Left</button>
            <button id="cat-arrow-right">Right</button>
        `);
        // Install the mock before initUI so the event listener closes over it
        const carousel = document.querySelector('#category-carousel');
        Object.defineProperty(carousel, 'scrollWidth', { value: 1000, configurable: true });
        Object.defineProperty(carousel, 'clientWidth', { value: 200, configurable: true });
        Object.defineProperty(carousel, 'scrollLeft', { value: 100, configurable: true, writable: true });
        const scrollByMock = vi.fn();
        carousel.scrollBy = scrollByMock;
        initUI();
        document.getElementById('cat-arrow-right').disabled = false;
        document.getElementById('cat-arrow-right').click();
        expect(scrollByMock).toHaveBeenCalledWith({ left: 250, behavior: 'smooth' });
    });

    it('calls carousel.scrollBy with negative left when left arrow is clicked', () => {
        setupDOM(`
            <div id="category-carousel" style="overflow:auto"></div>
            <button id="cat-arrow-left">Left</button>
            <button id="cat-arrow-right">Right</button>
        `);
        const carousel = document.querySelector('#category-carousel');
        Object.defineProperty(carousel, 'scrollWidth', { value: 1000, configurable: true });
        Object.defineProperty(carousel, 'clientWidth', { value: 200, configurable: true });
        Object.defineProperty(carousel, 'scrollLeft', { value: 100, configurable: true, writable: true });
        const scrollByMock = vi.fn();
        carousel.scrollBy = scrollByMock;
        initUI();
        document.getElementById('cat-arrow-left').disabled = false;
        document.getElementById('cat-arrow-left').click();
        expect(scrollByMock).toHaveBeenCalledWith({ left: -250, behavior: 'smooth' });
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// initUI — chef slideshow auto-advance
// ═══════════════════════════════════════════════════════════════════════════

describe('initUI — chef slideshow', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        window.scrollTo = vi.fn();
        safeGetItem.mockReturnValue(null);
        window.IntersectionObserver = vi.fn(() => ({
            observe: vi.fn(),
            unobserve: vi.fn(),
            disconnect: vi.fn(),
        }));
        window.MutationObserver = vi.fn(() => ({
            observe: vi.fn(),
            disconnect: vi.fn(),
        }));
    });

    afterEach(() => {
        vi.useRealTimers();
        document.body.classList.remove('dark-mode');
    });

    it('does not start slideshow when only one slide exists', () => {
        setupDOM('<div id="chef-slideshow"><div class="chef-slide active"></div></div>');
        initUI();
        vi.advanceTimersByTime(4000);
        expect(document.querySelectorAll('.chef-slide.active').length).toBe(1);
    });

    it('advances to the next slide after 4000ms', () => {
        setupDOM(`
            <div id="chef-slideshow">
                <div class="chef-slide active"></div>
                <div class="chef-slide"></div>
            </div>
        `);
        initUI();
        vi.advanceTimersByTime(4000);
        const slides = document.querySelectorAll('.chef-slide');
        expect(slides[0].classList.contains('active')).toBe(false);
        expect(slides[1].classList.contains('active')).toBe(true);
    });

    it('wraps back to slide 0 after cycling through all slides', () => {
        setupDOM(`
            <div id="chef-slideshow">
                <div class="chef-slide active"></div>
                <div class="chef-slide"></div>
            </div>
        `);
        initUI();
        vi.advanceTimersByTime(4000); // slide 0 -> 1
        vi.advanceTimersByTime(4000); // slide 1 -> 0
        const slides = document.querySelectorAll('.chef-slide');
        expect(slides[0].classList.contains('active')).toBe(true);
    });

    it('advances chef-info-slide in sync with chef-slide', () => {
        setupDOM(`
            <div id="chef-slideshow">
                <div class="chef-slide active"></div>
                <div class="chef-slide"></div>
            </div>
            <div class="chef-info-slide active"></div>
            <div class="chef-info-slide"></div>
        `);
        initUI();
        vi.advanceTimersByTime(4000);
        const infoSlides = document.querySelectorAll('.chef-info-slide');
        expect(infoSlides[0].classList.contains('active')).toBe(false);
        expect(infoSlides[1].classList.contains('active')).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// initUI — PWA install prompt
// ═══════════════════════════════════════════════════════════════════════════

describe('initUI — PWA install prompt', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        window.scrollTo = vi.fn();
        safeGetItem.mockReturnValue(null);
        window.IntersectionObserver = vi.fn(() => ({
            observe: vi.fn(),
            unobserve: vi.fn(),
            disconnect: vi.fn(),
        }));
        window.MutationObserver = vi.fn(() => ({
            observe: vi.fn(),
            disconnect: vi.fn(),
        }));
    });

    afterEach(() => {
        vi.useRealTimers();
        document.body.classList.remove('dark-mode');
    });

    it('shows pwa-prompt when beforeinstallprompt fires', () => {
        setupDOM('<div id="pwa-prompt" style="display:none"></div><button id="pwa-install-btn"></button><button id="pwa-dismiss-btn"></button>');
        initUI();
        const event = new Event('beforeinstallprompt');
        event.preventDefault = vi.fn();
        window.dispatchEvent(event);
        expect(document.getElementById('pwa-prompt').style.display).toBe('flex');
    });

    it('hides pwa-prompt when dismiss button is clicked', () => {
        setupDOM('<div id="pwa-prompt" style="display:flex"></div><button id="pwa-install-btn"></button><button id="pwa-dismiss-btn"></button>');
        initUI();
        document.getElementById('pwa-dismiss-btn').click();
        // Opacity set immediately; display set after 400ms
        expect(document.getElementById('pwa-prompt').style.opacity).toBe('0');
        vi.advanceTimersByTime(400);
        expect(document.getElementById('pwa-prompt').style.display).toBe('none');
    });

    it('does not throw when pwa elements are absent', () => {
        setupDOM('');
        const event = new Event('beforeinstallprompt');
        event.preventDefault = vi.fn();
        initUI();
        expect(() => window.dispatchEvent(event)).not.toThrow();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// initUI — spice level tooltips
// ═══════════════════════════════════════════════════════════════════════════

describe('initUI — spice level tooltips', () => {
    beforeEach(() => {
        window.scrollTo = vi.fn();
        safeGetItem.mockReturnValue(null);
        window.IntersectionObserver = vi.fn(() => ({
            observe: vi.fn(),
            unobserve: vi.fn(),
            disconnect: vi.fn(),
        }));
        window.MutationObserver = vi.fn(() => ({
            observe: vi.fn(),
            disconnect: vi.fn(),
        }));
    });

    afterEach(() => {
        document.body.classList.remove('dark-mode');
    });

    it('sets data-tooltip attribute on .spice-level elements with known levels', () => {
        setupDOM(`
            <span class="spice-level">Mild</span>
            <span class="spice-level">Medium</span>
            <span class="spice-level">Spicy</span>
        `);
        initUI();
        const spiceLevels = document.querySelectorAll('.spice-level');
        expect(spiceLevels[0].getAttribute('data-tooltip')).toBe('Subtle warmth, family-friendly');
        expect(spiceLevels[1].getAttribute('data-tooltip')).toBe('Balanced heat, our recommendation');
        expect(spiceLevels[2].getAttribute('data-tooltip')).toBe('Andhra-level heat, for the brave!');
    });

    it('adds "has-tooltip" class to .spice-level elements', () => {
        setupDOM('<span class="spice-level">Mild</span>');
        initUI();
        expect(document.querySelector('.spice-level').classList.contains('has-tooltip')).toBe(true);
    });

    it('does not set tooltip on unknown spice level text', () => {
        setupDOM('<span class="spice-level">Extra Hot</span>');
        initUI();
        expect(document.querySelector('.spice-level').getAttribute('data-tooltip')).toBeNull();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// initUI — scroll handler: nav active link tracking
// ═══════════════════════════════════════════════════════════════════════════

describe('initUI — scroll handler: active nav link tracking', () => {
    beforeEach(() => {
        window.scrollTo = vi.fn();
        safeGetItem.mockReturnValue(null);
        window.IntersectionObserver = vi.fn(() => ({
            observe: vi.fn(),
            unobserve: vi.fn(),
            disconnect: vi.fn(),
        }));
        window.MutationObserver = vi.fn(() => ({
            observe: vi.fn(),
            disconnect: vi.fn(),
        }));
        window.requestAnimationFrame = vi.fn((cb) => { cb(); return 1; });
        Object.defineProperty(window, 'innerWidth', { value: 1440, configurable: true, writable: true });
    });

    afterEach(() => {
        document.body.classList.remove('dark-mode');
        Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true, writable: true });
    });

    it('adds "active" class to nav link corresponding to visible section', () => {
        setupDOM(`
            <div class="nav-links">
                <a href="#about" class="nav-links">About</a>
            </div>
            <section id="about" style="margin-top:100px"></section>
        `);
        // Make the section appear at offsetTop 100
        Object.defineProperty(document.getElementById('about'), 'offsetTop', { value: 100, configurable: true });
        initUI();
        Object.defineProperty(window, 'pageYOffset', { value: 200, configurable: true });
        window.dispatchEvent(new Event('scroll'));
        expect(document.querySelector('.nav-links a[href="#about"]').classList.contains('active')).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// initUI — header hide/show on scroll direction
// ═══════════════════════════════════════════════════════════════════════════

describe('initUI — header hide/show on scroll direction (desktop only)', () => {
    beforeEach(() => {
        window.scrollTo = vi.fn();
        safeGetItem.mockReturnValue(null);
        window.IntersectionObserver = vi.fn(() => ({
            observe: vi.fn(),
            unobserve: vi.fn(),
            disconnect: vi.fn(),
        }));
        window.MutationObserver = vi.fn(() => ({
            observe: vi.fn(),
            disconnect: vi.fn(),
        }));
        window.requestAnimationFrame = vi.fn((cb) => { cb(); return 1; });
        Object.defineProperty(window, 'innerWidth', { value: 1440, configurable: true, writable: true });
        // Reset pageYOffset to 0 before each test so prior tests do not affect lastScroll
        Object.defineProperty(window, 'pageYOffset', { value: 0, configurable: true });
    });

    afterEach(() => {
        document.body.classList.remove('dark-mode');
        Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true, writable: true });
        Object.defineProperty(window, 'pageYOffset', { value: 0, configurable: true });
    });

    it('hides header with translateY(-100%) when scrolling down past 100px', () => {
        setupDOM('<header></header>');
        initUI();
        // First event at 50: lastScroll=0 → 50>0 but 50<=100 → show (translateY(0)), lastScroll=50
        Object.defineProperty(window, 'pageYOffset', { value: 50, configurable: true });
        window.dispatchEvent(new Event('scroll'));
        // Second event at 200: 200>50 && 200>100 → hide — _scrollTicking already reset
        Object.defineProperty(window, 'pageYOffset', { value: 200, configurable: true });
        window.dispatchEvent(new Event('scroll'));
        expect(document.querySelector('header').style.transform).toBe('translateY(-100%)');
    });

    it('shows header with translateY(0) when scrolling up', () => {
        setupDOM('<header></header>');
        initUI();
        // Scroll down past 100px to hide header, lastScroll=0 initially
        Object.defineProperty(window, 'pageYOffset', { value: 300, configurable: true });
        window.dispatchEvent(new Event('scroll'));
        // Scroll back up: 100 < 300 (lastScroll) → show — _scrollTicking already reset
        Object.defineProperty(window, 'pageYOffset', { value: 100, configurable: true });
        window.dispatchEvent(new Event('scroll'));
        expect(document.querySelector('header').style.transform).toBe('translateY(0)');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// initUI — scroll handler: hero scroll indicator fade
// ═══════════════════════════════════════════════════════════════════════════

describe('initUI — scroll handler: hero scroll indicator opacity', () => {
    beforeEach(() => {
        window.scrollTo = vi.fn();
        safeGetItem.mockReturnValue(null);
        window.IntersectionObserver = vi.fn(() => ({
            observe: vi.fn(),
            unobserve: vi.fn(),
            disconnect: vi.fn(),
        }));
        window.MutationObserver = vi.fn(() => ({
            observe: vi.fn(),
            disconnect: vi.fn(),
        }));
        window.requestAnimationFrame = vi.fn((cb) => { cb(); return 1; });
    });

    afterEach(() => {
        document.body.classList.remove('dark-mode');
    });

    it('reduces opacity of .hero-scroll-indicator as user scrolls down (< 300px)', () => {
        setupDOM('<div class="hero-scroll-indicator"></div>');
        initUI();
        Object.defineProperty(window, 'pageYOffset', { value: 150, configurable: true });
        window.dispatchEvent(new Event('scroll'));
        const indicator = document.querySelector('.hero-scroll-indicator');
        expect(parseFloat(indicator.style.opacity)).toBeLessThan(1);
        expect(parseFloat(indicator.style.opacity)).toBeGreaterThanOrEqual(0);
    });

    it('sets opacity to 0 when scroll position is >= 300px', () => {
        setupDOM('<div class="hero-scroll-indicator"></div>');
        initUI();
        Object.defineProperty(window, 'pageYOffset', { value: 400, configurable: true });
        window.dispatchEvent(new Event('scroll'));
        expect(document.querySelector('.hero-scroll-indicator').style.opacity).toBe('0');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// initUI — resize listener: caches section tops and hero height
// ═══════════════════════════════════════════════════════════════════════════

describe('initUI — resize event listener', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        window.scrollTo = vi.fn();
        safeGetItem.mockReturnValue(null);
        window.IntersectionObserver = vi.fn(() => ({
            observe: vi.fn(),
            unobserve: vi.fn(),
            disconnect: vi.fn(),
        }));
        window.MutationObserver = vi.fn(() => ({
            observe: vi.fn(),
            disconnect: vi.fn(),
        }));
    });

    afterEach(() => {
        vi.useRealTimers();
        document.body.classList.remove('dark-mode');
    });

    it('does not throw when window resize event fires', () => {
        setupDOM('<div class="hero"></div><section id="about"></section>');
        initUI();
        expect(() => window.dispatchEvent(new Event('resize'))).not.toThrow();
    });

    it('debounces mobile nav setup on resize (runs after 100ms)', () => {
        setupDOM(`
            <nav id="nav-links"></nav>
            <div id="mobile-menu-overlay"></div>
            <button id="mobile-menu-toggle">\u2630</button>
        `);
        initUI();
        // Fire resize and advance past debounce threshold
        window.dispatchEvent(new Event('resize'));
        expect(() => vi.advanceTimersByTime(100)).not.toThrow();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// initUI — premium scroll reveal: stagger transition delays
// ═══════════════════════════════════════════════════════════════════════════

describe('initUI — premium scroll reveal stagger delays', () => {
    beforeEach(() => {
        window.scrollTo = vi.fn();
        safeGetItem.mockReturnValue(null);
        window.IntersectionObserver = vi.fn(() => ({
            observe: vi.fn(),
            unobserve: vi.fn(),
            disconnect: vi.fn(),
        }));
        window.MutationObserver = vi.fn(() => ({
            observe: vi.fn(),
            disconnect: vi.fn(),
        }));
    });

    afterEach(() => {
        document.body.classList.remove('dark-mode');
    });

    it('applies a non-zero transitionDelay to the second sibling .special-card', () => {
        setupDOM(`
            <div>
                <div class="special-card">Card 1</div>
                <div class="special-card">Card 2</div>
            </div>
        `);
        initUI();
        const cards = document.querySelectorAll('.special-card');
        // The first sibling (index 0) has no delay; the second gets a cascade delay
        expect(cards[1].style.transitionDelay).not.toBe('');
        expect(parseFloat(cards[1].style.transitionDelay)).toBeGreaterThan(0);
    });

    it('assigns transitionDelay to .menu-item-card elements based on row/col grid', () => {
        setupDOM(`
            <div>
                <div class="menu-item-card">Item 1</div>
                <div class="menu-item-card">Item 2</div>
                <div class="menu-item-card">Item 3</div>
            </div>
        `);
        initUI();
        const cards = document.querySelectorAll('.menu-item-card');
        // card at index 0: row=0, col=0 → delay = 0.000s
        expect(cards[0].style.transitionDelay).toBe('0.000s');
        // card at index 1: row=0, col=1 → delay = 0.060s
        expect(cards[1].style.transitionDelay).toBe('0.060s');
        // card at index 2: row=1, col=0 → delay = 0.120s
        expect(cards[2].style.transitionDelay).toBe('0.120s');
    });
});
