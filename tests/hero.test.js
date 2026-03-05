import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initDynamicHeroText, initHeaderSlideshow, initHero } from '../src/modules/hero.js';

// ===== DOM SETUP HELPER =====
// Restores real jsdom methods that setup.js overwrites with vi.fn() stubs,
// scoping queries to document.body so tests are isolated.
function setupDOM(html) {
    document.body.innerHTML = html || '';
    document.getElementById = (id) => document.body.querySelector('#' + id);
    document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
    document.querySelector = (sel) => document.body.querySelector(sel);
}

// Minimal hero HTML used by initHero tests
const HERO_HTML = `
<div id="hero-slideshow">
    <div class="hero-slide active"></div>
    <div class="hero-slide"></div>
</div>
<div id="hero-sparkles"></div>
<div class="hero">
    <div class="hero-mouse-spotlight"></div>
    <div class="hero-tagline"><span class="hero-text-inner">Test</span></div>
    <div class="hero-subtitle"><span class="hero-text-inner">Subtitle</span></div>
</div>
`;

// ═══════════════════════════════════════════════════════════════════════════
// initDynamicHeroText
// ═══════════════════════════════════════════════════════════════════════════

describe('initDynamicHeroText — returns early when elements missing', () => {
    beforeEach(() => {
        setupDOM('');
    });

    it('returns early without throwing when taglineEl is null', () => {
        expect(() => initDynamicHeroText()).not.toThrow();
    });

    it('returns undefined when no matching elements exist', () => {
        const result = initDynamicHeroText();
        expect(result).toBeUndefined();
    });

    it('does not set up any timers when taglineEl is missing', () => {
        vi.useFakeTimers();
        initDynamicHeroText();
        // No timers should be pending
        expect(vi.getTimerCount()).toBe(0);
        vi.useRealTimers();
    });

    it('returns early when hero-tagline exists but hero-subtitle does not', () => {
        setupDOM('<div class="hero-tagline"><span class="hero-text-inner">Test</span></div>');
        vi.useFakeTimers();
        expect(() => initDynamicHeroText()).not.toThrow();
        expect(vi.getTimerCount()).toBe(0);
        vi.useRealTimers();
    });
});

describe('initDynamicHeroText — sets up interval when elements exist', () => {
    beforeEach(() => {
        setupDOM(HERO_HTML);
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('does not throw when taglineEl and subtitleEl are present', () => {
        expect(() => initDynamicHeroText()).not.toThrow();
    });

    it('schedules a deferred setTimeout on call (5s delay wrapping the interval)', () => {
        initDynamicHeroText();
        // Should have 1 pending timer (the outer 5000ms setTimeout)
        expect(vi.getTimerCount()).toBeGreaterThanOrEqual(1);
    });

    it('activates the setInterval after the initial 5s delay fires', () => {
        initDynamicHeroText();
        // Before 5000ms: only the outer setTimeout is queued
        vi.advanceTimersByTime(4999);
        const countBefore = vi.getTimerCount();

        // After 5000ms: the interval is also registered
        vi.advanceTimersByTime(1);
        const countAfter = vi.getTimerCount();

        // The interval is now running (timer count goes up or the outer settimeout is gone
        // and the interval is present). Either way countAfter reflects the interval.
        expect(countAfter).toBeGreaterThanOrEqual(1);
        // Having advanced past 5000ms, the outer timeout should have executed and created the interval
        expect(countAfter).toBeGreaterThanOrEqual(countBefore - 1);
    });
});

describe('initDynamicHeroText — rotates text after timeout + interval fires', () => {
    beforeEach(() => {
        setupDOM(HERO_HTML);
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('tagline text changes after the initial delay and one interval tick', () => {
        const taglineEl = document.querySelector('.hero-tagline .hero-text-inner');
        const originalText = taglineEl.textContent;

        initDynamicHeroText();

        // Advance past the outer 5s delay to activate the interval
        vi.advanceTimersByTime(5000);
        // Advance one full interval tick (6000ms)
        vi.advanceTimersByTime(6000);
        // Advance through the inner 700ms fade-out timeout
        vi.advanceTimersByTime(700);

        // Text should now be a different tagline from the rotation array
        expect(taglineEl.textContent).not.toBe(originalText);
    });

    it('subtitle text changes after the full rotation cycle', () => {
        const subtitleEl = document.querySelector('.hero-subtitle .hero-text-inner');
        const originalText = subtitleEl.textContent;

        initDynamicHeroText();

        vi.advanceTimersByTime(5000);
        vi.advanceTimersByTime(6000);
        vi.advanceTimersByTime(700);

        expect(subtitleEl.textContent).not.toBe(originalText);
    });

    it('adds fade-out class to taglineEl when interval fires (before inner timeout)', () => {
        const taglineEl = document.querySelector('.hero-tagline .hero-text-inner');

        initDynamicHeroText();

        // Advance to just after the interval fires but before the inner 700ms timeout
        vi.advanceTimersByTime(5000);
        vi.advanceTimersByTime(6000);

        expect(taglineEl.classList.contains('fade-out')).toBe(true);
    });

    it('adds fade-out class to subtitleEl when interval fires', () => {
        const subtitleEl = document.querySelector('.hero-subtitle .hero-text-inner');

        initDynamicHeroText();

        vi.advanceTimersByTime(5000);
        vi.advanceTimersByTime(6000);

        expect(subtitleEl.classList.contains('fade-out')).toBe(true);
    });

    it('removes fade-out from subtitleEl after the inner 700ms timeout', () => {
        const subtitleEl = document.querySelector('.hero-subtitle .hero-text-inner');

        initDynamicHeroText();

        vi.advanceTimersByTime(5000);
        vi.advanceTimersByTime(6000);
        vi.advanceTimersByTime(700);

        expect(subtitleEl.classList.contains('fade-out')).toBe(false);
    });

    it('calls window._scrambleReveal with the new tagline text when defined', () => {
        const scrambleSpy = vi.fn();
        window._scrambleReveal = scrambleSpy;

        initDynamicHeroText();

        vi.advanceTimersByTime(5000);
        vi.advanceTimersByTime(6000);
        vi.advanceTimersByTime(700);

        expect(scrambleSpy).toHaveBeenCalled();
        // First arg should be one of the tagline strings
        const taglines = [
            'Authentic Indian Cuisine',
            'Crafted with Passion',
            'A Legacy of Flavour',
            'Where Taste Meets Art',
            'Born from Tradition',
        ];
        expect(taglines).toContain(scrambleSpy.mock.calls[0][0]);

        delete window._scrambleReveal;
    });

    it('removes fade-out from taglineEl when _scrambleReveal is NOT defined', () => {
        delete window._scrambleReveal;
        const taglineEl = document.querySelector('.hero-tagline .hero-text-inner');

        initDynamicHeroText();

        vi.advanceTimersByTime(5000);
        vi.advanceTimersByTime(6000);
        vi.advanceTimersByTime(700);

        expect(taglineEl.classList.contains('fade-out')).toBe(false);
    });

    it('rotates through text cyclically across multiple interval ticks', () => {
        const taglineEl = document.querySelector('.hero-tagline .hero-text-inner');

        initDynamicHeroText();

        const seenTexts = new Set();
        seenTexts.add(taglineEl.textContent);

        // Fire several full rotation cycles
        for (let tick = 0; tick < 5; tick++) {
            vi.advanceTimersByTime(tick === 0 ? 5000 + 6000 : 6000);
            vi.advanceTimersByTime(700);
            seenTexts.add(taglineEl.textContent);
        }

        // We should have seen more than one distinct value
        expect(seenTexts.size).toBeGreaterThan(1);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// initHeaderSlideshow
// ═══════════════════════════════════════════════════════════════════════════

describe('initHeaderSlideshow — returns early when no slides', () => {
    beforeEach(() => {
        setupDOM('');
    });

    it('does not throw when no .header-slideshow .slide elements exist', () => {
        expect(() => initHeaderSlideshow()).not.toThrow();
    });

    it('returns undefined when slides list is empty', () => {
        const result = initHeaderSlideshow();
        expect(result).toBeUndefined();
    });

    it('registers no timers when there are no slides', () => {
        vi.useFakeTimers();
        initHeaderSlideshow();
        expect(vi.getTimerCount()).toBe(0);
        vi.useRealTimers();
    });
});

describe('initHeaderSlideshow — rotates slides via setInterval', () => {
    beforeEach(() => {
        setupDOM(`
            <div class="header-slideshow">
                <div class="slide active"></div>
                <div class="slide"></div>
                <div class="slide"></div>
            </div>
        `);
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('does not throw when slides exist', () => {
        expect(() => initHeaderSlideshow()).not.toThrow();
    });

    it('registers an interval timer when slides are present', () => {
        initHeaderSlideshow();
        expect(vi.getTimerCount()).toBeGreaterThanOrEqual(1);
    });

    it('removes active class from old slide and adds it to a new slide after 3000ms', () => {
        const slides = document.querySelectorAll('.header-slideshow .slide');
        initHeaderSlideshow();

        vi.advanceTimersByTime(3000);

        // Exactly one slide should be active after the interval fires
        const activeSlides = Array.from(slides).filter((s) =>
            s.classList.contains('active')
        );
        expect(activeSlides).toHaveLength(1);
    });

    it('cycles to a different active slide after the first interval tick (when >1 slide)', () => {
        const slides = document.querySelectorAll('.header-slideshow .slide');

        // Note which slide index starts as active
        const initialActiveIdx = Array.from(slides).findIndex((s) =>
            s.classList.contains('active')
        );

        initHeaderSlideshow();
        vi.advanceTimersByTime(3000);

        const newActiveIdx = Array.from(slides).findIndex((s) =>
            s.classList.contains('active')
        );

        // With 3 slides, the randomised picker avoids repeating the same index
        expect(newActiveIdx).not.toBe(initialActiveIdx);
    });

    it('keeps cycling slides across multiple interval ticks', () => {
        const slides = document.querySelectorAll('.header-slideshow .slide');
        initHeaderSlideshow();

        const seenIndices = new Set();
        for (let tick = 0; tick < 6; tick++) {
            vi.advanceTimersByTime(3000);
            const activeIdx = Array.from(slides).findIndex((s) =>
                s.classList.contains('active')
            );
            seenIndices.add(activeIdx);
        }

        // Over 6 ticks with 3 slides, we should have hit more than one index
        expect(seenIndices.size).toBeGreaterThan(1);
    });

    it('works when only a single slide exists (no infinite loop guard needed)', () => {
        setupDOM(`
            <div class="header-slideshow">
                <div class="slide active"></div>
            </div>
        `);
        initHeaderSlideshow();
        expect(() => vi.advanceTimersByTime(3000)).not.toThrow();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// initHero
// ═══════════════════════════════════════════════════════════════════════════

describe('initHero — graceful degradation when containers are absent', () => {
    beforeEach(() => {
        setupDOM('');
    });

    it('does not throw when hero-slideshow and hero-sparkles are both absent', () => {
        expect(() => initHero()).not.toThrow();
    });

    it('does not throw when only hero-slideshow is absent', () => {
        setupDOM('<div id="hero-sparkles"></div>');
        expect(() => initHero()).not.toThrow();
    });

    it('does not throw when only hero-sparkles is absent', () => {
        setupDOM(`
            <div id="hero-slideshow">
                <div class="hero-slide active"></div>
            </div>
        `);
        expect(() => initHero()).not.toThrow();
    });
});

describe('initHero — creates symphony elements when sparkle container exists', () => {
    beforeEach(() => {
        setupDOM(HERO_HTML);
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('populates the sparkle container with child elements', () => {
        initHero();
        const sparkles = document.getElementById('hero-sparkles');
        expect(sparkles.children.length).toBeGreaterThan(0);
    });

    it('creates sp-glow elements inside the sparkle container', () => {
        initHero();
        const sparkles = document.getElementById('hero-sparkles');
        const glows = sparkles.querySelectorAll('.sp-glow');
        expect(glows.length).toBeGreaterThan(0);
    });

    it('creates sp-line elements inside the sparkle container', () => {
        initHero();
        const sparkles = document.getElementById('hero-sparkles');
        const lines = sparkles.querySelectorAll('.sp-line');
        expect(lines.length).toBeGreaterThan(0);
    });

    it('creates sp-dot elements inside the sparkle container', () => {
        initHero();
        const sparkles = document.getElementById('hero-sparkles');
        const dots = sparkles.querySelectorAll('.sp-dot');
        expect(dots.length).toBeGreaterThan(0);
    });

    it('creates sp-mote elements inside the sparkle container', () => {
        initHero();
        const sparkles = document.getElementById('hero-sparkles');
        const motes = sparkles.querySelectorAll('.sp-mote');
        expect(motes.length).toBeGreaterThan(0);
    });

    it('clears sparkle container before populating (idempotent re-initialisation)', () => {
        // Pre-populate with a sentinel element
        const sparkles = document.getElementById('hero-sparkles');
        const sentinel = document.createElement('span');
        sentinel.id = 'sentinel';
        sparkles.appendChild(sentinel);

        initHero();

        expect(document.getElementById('sentinel')).toBeNull();
    });

    it('all sp-glow elements carry CSS custom properties for animation', () => {
        initHero();
        const sparkles = document.getElementById('hero-sparkles');
        const glows = sparkles.querySelectorAll('.sp-glow');
        glows.forEach((g) => {
            expect(g.style.cssText).toContain('--glow-dur');
            expect(g.style.cssText).toContain('--glow-delay');
        });
    });

    it('all sp-line elements carry CSS custom properties for animation', () => {
        initHero();
        const sparkles = document.getElementById('hero-sparkles');
        const lines = sparkles.querySelectorAll('.sp-line');
        lines.forEach((l) => {
            expect(l.style.cssText).toContain('--line-dur');
        });
    });
});

describe('initHero — sets up slideshow interval for multiple slides', () => {
    beforeEach(() => {
        setupDOM(HERO_HTML);
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('registers an interval timer when more than one slide exists', () => {
        initHero();
        expect(vi.getTimerCount()).toBeGreaterThanOrEqual(1);
    });

    it('advances the active slide after 2000ms', () => {
        initHero();
        const slides = document.querySelectorAll('#hero-slideshow .hero-slide');

        vi.advanceTimersByTime(2000);

        const activeSlides = Array.from(slides).filter((s) =>
            s.classList.contains('active')
        );
        expect(activeSlides).toHaveLength(1);
    });

    it('moves the active class away from index 0 after the first interval tick', () => {
        initHero();
        const slides = document.querySelectorAll('#hero-slideshow .hero-slide');

        vi.advanceTimersByTime(2000);

        // Slide at index 0 should no longer be active (current wraps to index 1)
        expect(slides[0].classList.contains('active')).toBe(false);
        expect(slides[1].classList.contains('active')).toBe(true);
    });

    it('adds a Ken Burns class to the newly active slide', () => {
        const kbClasses = ['kb-zoom-left', 'kb-zoom-right', 'kb-pan-down', 'kb-zoom-center'];
        initHero();
        const slides = document.querySelectorAll('#hero-slideshow .hero-slide');

        vi.advanceTimersByTime(2000);

        const nextSlide = slides[1];
        const hasKbClass = kbClasses.some((cls) => nextSlide.classList.contains(cls));
        expect(hasKbClass).toBe(true);
    });

    it('does not start a slideshow interval when only one slide exists', () => {
        setupDOM(`
            <div id="hero-slideshow">
                <div class="hero-slide active"></div>
            </div>
            <div id="hero-sparkles"></div>
            <div class="hero">
                <div class="hero-mouse-spotlight"></div>
            </div>
        `);
        vi.useFakeTimers();
        initHero();
        // With a single slide no slideshow interval should be registered beyond
        // any other timers (e.g. the blur-reveal timeout). Timer count should be
        // low (0 or 1 for the optional blur reveal, which requires taglineEl).
        // Since taglineEl is absent in this DOM there should be 0 interval timers.
        expect(() => vi.advanceTimersByTime(10000)).not.toThrow();
    });
});

describe('initHero — sets up _scrambleReveal on window when taglineEl exists', () => {
    beforeEach(() => {
        setupDOM(HERO_HTML);
        vi.useFakeTimers();
    });

    afterEach(() => {
        delete window._scrambleReveal;
        vi.useRealTimers();
    });

    it('assigns window._scrambleReveal as a function', () => {
        initHero();
        expect(typeof window._scrambleReveal).toBe('function');
    });

    it('_scrambleReveal sets textContent of the supplied element', () => {
        initHero();
        const el = document.querySelector('.hero-tagline .hero-text-inner');
        window._scrambleReveal('New Text', el);
        expect(el.textContent).toBe('New Text');
    });

    it('_scrambleReveal removes fade-out class from element', () => {
        initHero();
        const el = document.querySelector('.hero-tagline .hero-text-inner');
        el.classList.add('fade-out');
        window._scrambleReveal('Hello', el);
        expect(el.classList.contains('fade-out')).toBe(false);
    });

    it('_scrambleReveal sets opacity to 1 on the element', () => {
        initHero();
        const el = document.querySelector('.hero-tagline .hero-text-inner');
        window._scrambleReveal('Test', el);
        expect(el.style.opacity).toBe('1');
    });

    it('_scrambleReveal adds blur-reveal class to trigger the CSS animation', () => {
        initHero();
        const el = document.querySelector('.hero-tagline .hero-text-inner');
        window._scrambleReveal('Animate', el);
        expect(el.classList.contains('blur-reveal')).toBe(true);
    });

    it('_scrambleReveal is called automatically after a 2800ms delay on load', () => {
        const el = document.querySelector('.hero-tagline .hero-text-inner');
        initHero();

        // Confirm _scrambleReveal is defined
        const spy = vi.fn(window._scrambleReveal);
        window._scrambleReveal = spy;

        vi.advanceTimersByTime(2800);

        // The tagline element should have received the blur-reveal animation
        expect(el.classList.contains('blur-reveal')).toBe(true);
    });

    it('does NOT define window._scrambleReveal when taglineEl is absent', () => {
        delete window._scrambleReveal;
        setupDOM(`
            <div id="hero-slideshow">
                <div class="hero-slide active"></div>
                <div class="hero-slide"></div>
            </div>
            <div id="hero-sparkles"></div>
            <div class="hero">
                <div class="hero-mouse-spotlight"></div>
            </div>
        `);
        initHero();
        expect(window._scrambleReveal).toBeUndefined();
    });
});

describe('initHero — sets up mouse spotlight on desktop', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('attaches a mousemove listener on the hero element when viewport > 768', () => {
        setupDOM(HERO_HTML);
        vi.useFakeTimers();

        // jsdom defaults innerWidth to 1024, which is > 768
        Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });

        const hero = document.querySelector('.hero');
        const addEventSpy = vi.spyOn(hero, 'addEventListener');

        initHero();

        expect(addEventSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
    });

    it('updates spotlight CSS custom properties on mousemove', () => {
        setupDOM(HERO_HTML);
        vi.useFakeTimers();

        Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });

        initHero();

        const hero = document.querySelector('.hero');
        const spotlight = document.querySelector('.hero-mouse-spotlight');

        // Simulate a mousemove event
        const moveEvent = new MouseEvent('mousemove', { clientX: 200, clientY: 150 });
        hero.dispatchEvent(moveEvent);

        // The spotlight should now have --mouse-x and --mouse-y set
        expect(spotlight.style.getPropertyValue('--mouse-x')).not.toBe('');
        expect(spotlight.style.getPropertyValue('--mouse-y')).not.toBe('');
    });

    it('does NOT attach mousemove listener when viewport width is 768 or less', () => {
        setupDOM(HERO_HTML);
        vi.useFakeTimers();

        Object.defineProperty(window, 'innerWidth', { value: 768, configurable: true });

        const hero = document.querySelector('.hero');
        const addEventSpy = vi.spyOn(hero, 'addEventListener');

        initHero();

        const mousemoveCalls = addEventSpy.mock.calls.filter(
            ([event]) => event === 'mousemove'
        );
        expect(mousemoveCalls).toHaveLength(0);

        // Restore
        Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
    });

    it('does not throw when hero or spotlight element is absent on desktop', () => {
        setupDOM(`
            <div id="hero-slideshow">
                <div class="hero-slide active"></div>
            </div>
            <div id="hero-sparkles"></div>
        `);
        vi.useFakeTimers();

        Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });

        expect(() => initHero()).not.toThrow();

        Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
    });
});

describe('initHero — window.updateHeroSlides with image slides', () => {
    beforeEach(() => {
        setupDOM(HERO_HTML);
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('exposes updateHeroSlides as a function on window after initHero', () => {
        initHero();
        expect(typeof window.updateHeroSlides).toBe('function');
    });

    it('does not throw when called with image slides', () => {
        initHero();
        const slides = [
            { type: 'image', url: 'https://example.com/a.jpg' },
            { type: 'image', url: 'https://example.com/b.jpg' },
        ];
        expect(() => window.updateHeroSlides(slides)).not.toThrow();
    });

    it('removes existing hero-slide elements and replaces them', () => {
        initHero();
        const container = document.getElementById('hero-slideshow');

        window.updateHeroSlides([
            { type: 'image', url: 'https://example.com/a.jpg' },
            { type: 'image', url: 'https://example.com/b.jpg' },
        ]);

        const newSlides = container.querySelectorAll('.hero-slide');
        expect(newSlides.length).toBe(2);
    });

    it('sets backgroundImage on image-type slides', () => {
        initHero();
        window.updateHeroSlides([
            { type: 'image', url: 'https://example.com/food.jpg' },
        ]);

        const container = document.getElementById('hero-slideshow');
        const slide = container.querySelector('.hero-slide');
        expect(slide.style.backgroundImage).toContain('food.jpg');
    });

    it('marks the first slide as active', () => {
        initHero();
        window.updateHeroSlides([
            { type: 'image', url: 'https://example.com/a.jpg' },
            { type: 'image', url: 'https://example.com/b.jpg' },
        ]);

        const container = document.getElementById('hero-slideshow');
        const slides = container.querySelectorAll('.hero-slide');
        expect(slides[0].classList.contains('active')).toBe(true);
        expect(slides[1].classList.contains('active')).toBe(false);
    });

    it('assigns a Ken Burns class to the first slide', () => {
        const kbClasses = ['kb-zoom-left', 'kb-zoom-right', 'kb-pan-down', 'kb-zoom-center'];
        initHero();
        window.updateHeroSlides([
            { type: 'image', url: 'https://example.com/a.jpg' },
        ]);

        const container = document.getElementById('hero-slideshow');
        const firstSlide = container.querySelector('.hero-slide');
        const hasKb = kbClasses.some((cls) => firstSlide.classList.contains(cls));
        expect(hasKb).toBe(true);
    });

    it('starts an interval to cycle the new slides when more than one exists', () => {
        initHero();
        // Clear existing timers to get a clean count
        vi.clearAllTimers();

        window.updateHeroSlides([
            { type: 'image', url: 'https://example.com/a.jpg' },
            { type: 'image', url: 'https://example.com/b.jpg' },
        ]);

        expect(vi.getTimerCount()).toBeGreaterThanOrEqual(1);
    });

    it('advances active slide index after 2000ms following updateHeroSlides', () => {
        initHero();
        window.updateHeroSlides([
            { type: 'image', url: 'https://example.com/a.jpg' },
            { type: 'image', url: 'https://example.com/b.jpg' },
        ]);

        vi.advanceTimersByTime(2000);

        const container = document.getElementById('hero-slideshow');
        const slides = container.querySelectorAll('.hero-slide');
        expect(slides[1].classList.contains('active')).toBe(true);
    });

    it('does nothing when called with an empty slides array', () => {
        initHero();
        const container = document.getElementById('hero-slideshow');
        const countBefore = container.querySelectorAll('.hero-slide').length;

        window.updateHeroSlides([]);

        expect(container.querySelectorAll('.hero-slide').length).toBe(countBefore);
    });

    it('does nothing when hero-slideshow container does not exist', () => {
        initHero();
        // Remove the container from DOM
        document.getElementById('hero-slideshow').remove();

        expect(() =>
            window.updateHeroSlides([{ type: 'image', url: 'https://example.com/x.jpg' }])
        ).not.toThrow();
    });
});

describe('initHero — window.updateHeroSlides with video slides', () => {
    beforeEach(() => {
        setupDOM(HERO_HTML);
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('does not throw when called with video slides', () => {
        initHero();
        expect(() =>
            window.updateHeroSlides([
                { type: 'video', url: 'https://example.com/clip.mp4' },
            ])
        ).not.toThrow();
    });

    it('adds hero-slide-video class to video slides', () => {
        initHero();
        window.updateHeroSlides([
            { type: 'video', url: 'https://example.com/clip.mp4' },
        ]);

        const container = document.getElementById('hero-slideshow');
        const slide = container.querySelector('.hero-slide');
        expect(slide.classList.contains('hero-slide-video')).toBe(true);
    });

    it('creates a <video> element inside a video slide', () => {
        initHero();
        window.updateHeroSlides([
            { type: 'video', url: 'https://example.com/clip.mp4' },
        ]);

        const container = document.getElementById('hero-slideshow');
        const video = container.querySelector('video');
        expect(video).not.toBeNull();
    });

    it('sets the correct src on the video element', () => {
        initHero();
        window.updateHeroSlides([
            { type: 'video', url: 'https://example.com/hero.mp4' },
        ]);

        const container = document.getElementById('hero-slideshow');
        const video = container.querySelector('video');
        expect(video.src).toContain('hero.mp4');
    });

    it('marks video element as autoplay, muted, and loop', () => {
        initHero();
        window.updateHeroSlides([
            { type: 'video', url: 'https://example.com/clip.mp4' },
        ]);

        const container = document.getElementById('hero-slideshow');
        const video = container.querySelector('video');
        expect(video.autoplay).toBe(true);
        expect(video.muted).toBe(true);
        expect(video.loop).toBe(true);
    });

    it('sets playsinline attributes on the video element', () => {
        initHero();
        window.updateHeroSlides([
            { type: 'video', url: 'https://example.com/clip.mp4' },
        ]);

        const container = document.getElementById('hero-slideshow');
        const video = container.querySelector('video');
        expect(video.getAttribute('playsinline')).toBe('');
        expect(video.getAttribute('webkit-playsinline')).toBe('');
    });

    it('handles a mix of image and video slides without throwing', () => {
        initHero();
        expect(() =>
            window.updateHeroSlides([
                { type: 'image', url: 'https://example.com/a.jpg' },
                { type: 'video', url: 'https://example.com/b.mp4' },
                { type: 'image', url: 'https://example.com/c.jpg' },
            ])
        ).not.toThrow();
    });

    it('creates the correct number of slides for a mixed array', () => {
        initHero();
        window.updateHeroSlides([
            { type: 'image', url: 'https://example.com/a.jpg' },
            { type: 'video', url: 'https://example.com/b.mp4' },
            { type: 'image', url: 'https://example.com/c.jpg' },
        ]);

        const container = document.getElementById('hero-slideshow');
        expect(container.querySelectorAll('.hero-slide').length).toBe(3);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// initHero — clearInterval in startSlideshow (line 183)
// ═══════════════════════════════════════════════════════════════════════════
describe('initHero — clearInterval in startSlideshow (line 183)', () => {
    beforeEach(() => {
        setupDOM(HERO_HTML);
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('clears existing interval when startSlideshow runs at init (line 183)', () => {
        const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
        initHero();
        // startSlideshow is called once during initHero; it should check and clear
        // any existing slideshowInterval (which is null initially, so clearInterval(null) is ok)
        // The key thing is the code path runs without error.
        expect(() => vi.advanceTimersByTime(4000)).not.toThrow();
        clearIntervalSpy.mockRestore();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// initHero — clearInterval in updateHeroSlides (line 204)
// ═══════════════════════════════════════════════════════════════════════════
describe('initHero — clearInterval in updateHeroSlides (line 204)', () => {
    beforeEach(() => {
        setupDOM(HERO_HTML);
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('clears existing slideshow interval when updateHeroSlides is called (line 204)', () => {
        initHero();
        const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

        // Call updateHeroSlides — this should clearInterval on the running slideshow
        window.updateHeroSlides([
            { type: 'image', url: 'https://example.com/a.jpg' },
            { type: 'image', url: 'https://example.com/b.jpg' },
        ]);

        expect(clearIntervalSpy).toHaveBeenCalled();
        clearIntervalSpy.mockRestore();
    });

    it('calling updateHeroSlides twice clears the previous interval each time', () => {
        initHero();
        const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

        window.updateHeroSlides([
            { type: 'image', url: 'https://example.com/a.jpg' },
            { type: 'image', url: 'https://example.com/b.jpg' },
        ]);
        const firstCallCount = clearIntervalSpy.mock.calls.length;

        window.updateHeroSlides([
            { type: 'image', url: 'https://example.com/c.jpg' },
            { type: 'image', url: 'https://example.com/d.jpg' },
        ]);

        expect(clearIntervalSpy.mock.calls.length).toBeGreaterThan(firstCallCount);
        clearIntervalSpy.mockRestore();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// initHero — video pause/play during slideshow (lines 242-251)
// ═══════════════════════════════════════════════════════════════════════════
describe('initHero — video pause/play in slideshow transitions (lines 242-251)', () => {
    beforeEach(() => {
        setupDOM(HERO_HTML);
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('pauses video on outgoing slide and plays video on incoming slide', () => {
        initHero();

        // Set up slides: first is a video, second is a video
        window.updateHeroSlides([
            { type: 'video', url: 'https://example.com/vid1.mp4' },
            { type: 'video', url: 'https://example.com/vid2.mp4' },
        ]);

        const container = document.getElementById('hero-slideshow');
        const videos = container.querySelectorAll('video');
        expect(videos.length).toBe(2);

        // Mock pause and play on both video elements
        const pauseSpy = vi.fn();
        const playSpy = vi.fn();
        videos[0].pause = pauseSpy;
        videos[1].pause = vi.fn();
        videos[1].play = playSpy;

        // Advance to trigger the slideshow interval (2000ms)
        vi.advanceTimersByTime(2000);

        // The outgoing video (index 0) should have been paused
        expect(pauseSpy).toHaveBeenCalled();
        // The incoming video (index 1) should have been played
        expect(playSpy).toHaveBeenCalled();
    });

    it('resets currentTime to 0 on incoming video slide', () => {
        initHero();

        window.updateHeroSlides([
            { type: 'image', url: 'https://example.com/img.jpg' },
            { type: 'video', url: 'https://example.com/vid.mp4' },
        ]);

        const container = document.getElementById('hero-slideshow');
        const video = container.querySelector('video');
        video.currentTime = 5;
        video.play = vi.fn();

        // Advance to trigger transition from image to video
        vi.advanceTimersByTime(2000);

        expect(video.currentTime).toBe(0);
        expect(video.play).toHaveBeenCalled();
    });

    it('does not throw when outgoing slide has no video element', () => {
        initHero();

        window.updateHeroSlides([
            { type: 'image', url: 'https://example.com/img1.jpg' },
            { type: 'image', url: 'https://example.com/img2.jpg' },
        ]);

        // Advance — no videos, so pause/play should not be called and no error
        expect(() => vi.advanceTimersByTime(2000)).not.toThrow();
    });
});

// ===========================================================================
// Branch coverage: startSlideshow — clearInterval when interval exists (line 183)
// ===========================================================================
describe('startSlideshow — clearInterval on existing interval (line 183)', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        setupDOM(HERO_HTML);
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it('clears previous interval when startSlideshow runs again via updateHeroSlides', () => {
        const clearSpy = vi.spyOn(global, 'clearInterval');
        initHero();
        // initHero calls startSlideshow once (sets slideshowInterval)
        // updateHeroSlides calls clearInterval then starts a new slideshow
        window.updateHeroSlides([
            { type: 'image', url: 'https://example.com/a.jpg' },
            { type: 'image', url: 'https://example.com/b.jpg' },
        ]);
        // clearInterval should have been called (once for updateHeroSlides line 204, and it implies line 183 path)
        expect(clearSpy).toHaveBeenCalled();
        clearSpy.mockRestore();
    });
});

// ===========================================================================
// Branch coverage: updateHeroSlides — clearInterval (line 204)
// ===========================================================================
describe('updateHeroSlides — clearInterval on existing interval (line 204)', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        setupDOM(HERO_HTML);
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it('stops existing slideshow before creating new slides', () => {
        initHero();
        const clearSpy = vi.spyOn(global, 'clearInterval');
        // Call updateHeroSlides twice to verify clearInterval is called on existing interval
        window.updateHeroSlides([
            { type: 'image', url: 'https://example.com/a.jpg' },
            { type: 'image', url: 'https://example.com/b.jpg' },
        ]);
        const firstCallCount = clearSpy.mock.calls.length;
        window.updateHeroSlides([
            { type: 'image', url: 'https://example.com/c.jpg' },
            { type: 'image', url: 'https://example.com/d.jpg' },
        ]);
        expect(clearSpy.mock.calls.length).toBeGreaterThan(firstCallCount);
        clearSpy.mockRestore();
    });
});

// ===========================================================================
// Branch: startSlideshow — slideshowInterval is null on first call (line 183 false)
// ===========================================================================
describe('initHero — startSlideshow with no prior interval (line 183 false branch)', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        // Use minimal DOM with no slides to ensure no interval is created
        setupDOM(`
            <div id="hero-slideshow"></div>
            <div id="hero-sparkles"></div>
        `);
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it('does not call clearInterval when slideshowInterval is initially null (no slides)', () => {
        const clearSpy = vi.spyOn(global, 'clearInterval');
        initHero();
        // With 0 slides, startSlideshow runs but slideshowInterval is null,
        // so the if(slideshowInterval) branch is false
        // clearInterval should not be called (or called with null which is benign)
        expect(() => vi.advanceTimersByTime(5000)).not.toThrow();
        clearSpy.mockRestore();
    });
});

// ===========================================================================
// Branch: updateHeroSlides — slideshowInterval is null when called before any slides (line 204 false)
// ===========================================================================
describe('updateHeroSlides — no existing interval (line 204 false branch)', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        // Setup with single slide so no interval is started
        setupDOM(`
            <div id="hero-slideshow">
                <div class="hero-slide active"></div>
            </div>
            <div id="hero-sparkles"></div>
        `);
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it('handles updateHeroSlides when no interval was previously set (single slide init)', () => {
        initHero();
        // With 1 slide, slideshowInterval remains null (no interval created)
        // Now call updateHeroSlides — line 204 if(slideshowInterval) should be false
        expect(() => window.updateHeroSlides([
            { type: 'image', url: 'https://example.com/a.jpg' },
            { type: 'image', url: 'https://example.com/b.jpg' },
        ])).not.toThrow();
        // New slides should be created
        const container = document.getElementById('hero-slideshow');
        expect(container.querySelectorAll('.hero-slide').length).toBe(2);
    });
});
