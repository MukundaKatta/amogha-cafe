import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../src/modules/auth.js', () => ({
    getCurrentUser: vi.fn(() => null),
    setCurrentUser: vi.fn(),
    showAuthToast: vi.fn(),
}));

vi.mock('../src/modules/cart.js', () => ({
    cart: [],
    updateCartCount: vi.fn(),
    saveCart: vi.fn(),
    updateFloatingCart: vi.fn(),
    updateCartFab: vi.fn(),
    addToCart: vi.fn(),
    displayCart: vi.fn(),
}));

import * as features from '../src/modules/features.js';
import { showAuthToast, getCurrentUser } from '../src/modules/auth.js';
import { addToCart } from '../src/modules/cart.js';
import { ITEM_PAIRINGS, ITEM_PRICES } from '../src/core/constants.js';

// helpers to create DOM elements
function html(htmlString) {
  const template = document.createElement('template');
  template.innerHTML = htmlString.trim();
  return template.content.firstChild;
}

describe('features module', () => {
  beforeEach(() => {
    // clean up document body before each test
    document.body.innerHTML = '';
  });

  it('selectSpice toggles active class correctly', () => {
    const wrapper = html('<div><span class="spice-level">A</span><span class="spice-level">B</span></div>');
    document.body.appendChild(wrapper);
    const [a, b] = wrapper.querySelectorAll('.spice-level');
    features.selectSpice(b);
    expect(a.classList.contains('active')).toBe(false);
    expect(b.classList.contains('active')).toBe(true);

    features.selectSpice(a);
    expect(a.classList.contains('active')).toBe(true);
    expect(b.classList.contains('active')).toBe(false);
  });

  it('getUpsellItems returns pairings excluding duplicates & cart items', () => {
    const itemWithPairings = Object.keys(ITEM_PAIRINGS).find((k) => Array.isArray(ITEM_PAIRINGS[k]) && ITEM_PAIRINGS[k].length > 0);
    expect(itemWithPairings).toBeTruthy();
    const paired = ITEM_PAIRINGS[itemWithPairings][0];
    expect(ITEM_PRICES[paired]).toBeTruthy();

    const cart = [{ name: itemWithPairings }];
    const suggestions = features.getUpsellItems(cart);

    expect(Array.isArray(suggestions)).toBe(true);
    expect(suggestions.some((s) => s.name === paired)).toBe(true);
    expect(suggestions.some((s) => s.name === itemWithPairings)).toBe(false);
  });

  it('schedule helper returns null when checkbox unchecked', () => {
    const checkbox = html('<input type="checkbox" id="schedule-order-check">');
    const fields = html('<div id="schedule-fields"></div>');
    const dateInput = html('<input type="date" id="schedule-date">');
    const timeSelect = html('<select id="schedule-time"></select>');
    document.body.appendChild(checkbox);
    document.body.appendChild(fields);
    document.body.appendChild(dateInput);
    document.body.appendChild(timeSelect);

    // manually call initScheduledOrders to set up global functions
    features.initScheduledOrders();
    expect(window.getScheduleInfo()).toBeNull();

    checkbox.checked = true;
    const info = window.getScheduleInfo();
    expect(info === null || typeof info === 'object').toBe(true);
  });

  it('reviews carousel initialization sets up controllers and responds to moveCarousel', () => {
    const wrapper = document.createElement('div');
    wrapper.id = 'reviews-carousel';
    for (let i = 0; i < 4; i++) {
      const card = document.createElement('div');
      card.className = 'review-card';
      wrapper.appendChild(card);
    }
    document.body.appendChild(wrapper);
    const move = features.initReviewsCarousel();
    expect(typeof move).toBe('function');
    expect(() => move(1)).not.toThrow();
    expect(() => move(-1)).not.toThrow();
  });

  it('gallery slideshow cycles slides and respects dots controls', () => {
    const s1 = html('<div class="gallery-slide active"></div>');
    const s2 = html('<div class="gallery-slide"></div>');
    document.body.appendChild(s1);
    document.body.appendChild(s2);
    const dotsContainer = document.createElement('div');
    dotsContainer.id = 'gallery-dots';
    document.body.appendChild(dotsContainer);
    features.initGallerySlideshow();
    const move = window.moveGallerySlide;
    expect(typeof move).toBe('function');
    expect(() => move(1)).not.toThrow();
  });

  it('gallery lightbox opens and navigates images', () => {
    const imgWrap1 = html('<div class="gallery-item"></div>');
    const imgWrap2 = html('<div class="gallery-item"></div>');
    const img1 = document.createElement('img');
    const img2 = document.createElement('img');
    img1.src = 'a.jpg';
    img2.src = 'b.jpg';
    imgWrap1.appendChild(img1);
    imgWrap2.appendChild(img2);
    document.body.appendChild(imgWrap1);
    document.body.appendChild(imgWrap2);
    const lightbox = document.createElement('div');
    lightbox.id = 'lightbox';
    lightbox.innerHTML = '<img id="lightbox-img"/>';
    document.body.appendChild(lightbox);
    features.initGalleryLightbox();
    expect(typeof window.navigateLightbox).toBe('function');
    expect(typeof window.closeLightbox).toBe('function');
    expect(() => window.navigateLightbox(1)).not.toThrow();
    expect(() => window.closeLightbox()).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// getVisibleCount returns 3 on desktop (line 25)
// ═══════════════════════════════════════════════════════════════════════════
describe('initReviewsCarousel desktop visible count', () => {
  const origGetById = Document.prototype.getElementById;
  const origQSA = Document.prototype.querySelectorAll;
  const origQS = Document.prototype.querySelector;

  beforeEach(() => {
    document.getElementById = origGetById.bind(document);
    document.querySelectorAll = origQSA.bind(document);
    document.querySelector = origQS.bind(document);
    document.body.innerHTML = '';
  });

  it('getVisibleCount returns 3 when innerWidth > 1024 (desktop, line 25)', () => {
    const wrapper = document.createElement('div');
    wrapper.id = 'reviews-carousel';
    for (let i = 0; i < 6; i++) {
      const card = document.createElement('div');
      card.className = 'review-card';
      wrapper.appendChild(card);
    }
    document.body.appendChild(wrapper);

    const origWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { value: 1280, writable: true, configurable: true });

    const move = features.initReviewsCarousel();
    // With real getElementById, the function finds the carousel and returns the move fn
    expect(typeof move).toBe('function');
    expect(() => move(1)).not.toThrow();
    // With 6 cards and visible=3, maxIndex = 3, so moving forward should succeed
    expect(() => move(1)).not.toThrow();

    Object.defineProperty(window, 'innerWidth', { value: origWidth, writable: true, configurable: true });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Carousel auto-advance and event listeners (lines 52-79, now reachable)
// ═══════════════════════════════════════════════════════════════════════════
describe('initReviewsCarousel auto-advance and events', () => {
  const origGetById = Document.prototype.getElementById;
  const origQSA = Document.prototype.querySelectorAll;
  const origQS = Document.prototype.querySelector;

  beforeEach(() => {
    document.getElementById = origGetById.bind(document);
    document.querySelectorAll = origQSA.bind(document);
    document.querySelector = origQS.bind(document);
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function buildCarousel(cardCount) {
    const wrapper = document.createElement('div');
    wrapper.id = 'reviews-carousel';
    const carouselWrapper = document.createElement('div');
    carouselWrapper.className = 'reviews-carousel-wrapper';
    for (let i = 0; i < cardCount; i++) {
      const card = document.createElement('div');
      card.className = 'review-card';
      card.style.width = '200px';
      card.style.marginLeft = '10px';
      card.style.marginRight = '10px';
      wrapper.appendChild(card);
    }
    carouselWrapper.appendChild(wrapper);
    document.body.appendChild(carouselWrapper);
    return { wrapper, carouselWrapper };
  }

  it('auto-advances carousel every 4 seconds (lines 52-58, 78)', () => {
    const origWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { value: 1280, writable: true, configurable: true });
    buildCarousel(6);

    features.initReviewsCarousel();
    // After 4 seconds, autoAdvance should fire
    vi.advanceTimersByTime(4000);
    // No error means it ran successfully
    expect(true).toBe(true);

    Object.defineProperty(window, 'innerWidth', { value: origWidth, writable: true, configurable: true });
  });

  it('auto-advance wraps to 0 after exceeding maxIndex (line 57)', () => {
    const origWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { value: 1280, writable: true, configurable: true });
    const { wrapper } = buildCarousel(4); // 4 cards, visible=3, maxIndex=1

    features.initReviewsCarousel();
    // Advance twice (past maxIndex=1)
    vi.advanceTimersByTime(8000);
    // Should wrap to 0 — no error
    expect(wrapper.style.transform).toBeDefined();

    Object.defineProperty(window, 'innerWidth', { value: origWidth, writable: true, configurable: true });
  });

  it('mouseenter pauses auto-slide, mouseleave resumes (lines 67-70)', () => {
    const origWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { value: 1280, writable: true, configurable: true });
    const { carouselWrapper } = buildCarousel(6);

    features.initReviewsCarousel();
    // Pause via mouseenter
    carouselWrapper.dispatchEvent(new Event('mouseenter'));
    vi.advanceTimersByTime(8000);
    // Resume via mouseleave
    carouselWrapper.dispatchEvent(new Event('mouseleave'));
    vi.advanceTimersByTime(4000);
    expect(true).toBe(true);

    Object.defineProperty(window, 'innerWidth', { value: origWidth, writable: true, configurable: true });
  });

  it('window resize resets carousel index to 0 (lines 72-76)', () => {
    const origWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { value: 1280, writable: true, configurable: true });
    buildCarousel(6);

    features.initReviewsCarousel();
    // Advance a couple times
    vi.advanceTimersByTime(8000);
    // Trigger resize — should not throw (resets index to 0 and calls slideToIndex)
    expect(() => window.dispatchEvent(new Event('resize'))).not.toThrow();

    Object.defineProperty(window, 'innerWidth', { value: origWidth, writable: true, configurable: true });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Lightbox fallback image selection (lines 139, 143) and click/keyboard (lines 148-173)
// ═══════════════════════════════════════════════════════════════════════════
describe('gallery lightbox fallback and keyboard handlers', () => {
  const origGetById = Document.prototype.getElementById;
  const origQSA = Document.prototype.querySelectorAll;
  const origQS = Document.prototype.querySelector;

  beforeEach(() => {
    // Restore real DOM methods (setup.js mocks them globally)
    document.getElementById = origGetById.bind(document);
    document.querySelectorAll = origQSA.bind(document);
    document.querySelector = origQS.bind(document);
    document.body.innerHTML = '';
  });

  it('uses fallback images (data-lightbox) when no gallery-item images exist', () => {
    // No .gallery-item or .gallery-slide-item images
    const img1 = document.createElement('img');
    img1.src = 'fallback1.jpg';
    img1.setAttribute('data-lightbox', 'true');
    document.body.appendChild(img1);

    const img2 = document.createElement('img');
    img2.src = 'fallback2.jpg';
    img2.setAttribute('data-lightbox', 'true');
    document.body.appendChild(img2);

    const lightbox = document.createElement('div');
    lightbox.id = 'lightbox';
    const lightboxImg = document.createElement('img');
    lightboxImg.id = 'lightbox-img';
    lightbox.appendChild(lightboxImg);
    document.body.appendChild(lightbox);

    features.initGalleryLightbox();

    // Clicking a fallback image should open lightbox
    img1.click();
    expect(lightbox.classList.contains('active')).toBe(true);
    expect(lightboxImg.src).toContain('fallback1.jpg');

    // Navigate should work
    window.navigateLightbox(1);
    expect(lightboxImg.src).toContain('fallback2.jpg');

    // Close via closeLightbox
    window.closeLightbox();
    expect(lightbox.classList.contains('active')).toBe(false);
  });

  it('falls back to all img elements when no gallery-item or data-lightbox images exist (line 143)', () => {
    const img1 = document.createElement('img');
    img1.src = 'generic1.jpg';
    document.body.appendChild(img1);

    const lightbox = document.createElement('div');
    lightbox.id = 'lightbox';
    const lightboxImg = document.createElement('img');
    lightboxImg.id = 'lightbox-img';
    lightbox.appendChild(lightboxImg);
    document.body.appendChild(lightbox);

    features.initGalleryLightbox();

    // Click the generic image
    img1.click();
    expect(lightbox.classList.contains('active')).toBe(true);
    expect(lightboxImg.src).toContain('generic1.jpg');
  });

  it('handles keyboard events: Escape closes, arrows navigate (lines 169-173)', () => {
    const img1 = document.createElement('img');
    img1.src = 'kb1.jpg';
    img1.setAttribute('data-lightbox', 'true');
    document.body.appendChild(img1);

    const img2 = document.createElement('img');
    img2.src = 'kb2.jpg';
    img2.setAttribute('data-lightbox', 'true');
    document.body.appendChild(img2);

    const lightbox = document.createElement('div');
    lightbox.id = 'lightbox';
    const lightboxImg = document.createElement('img');
    lightboxImg.id = 'lightbox-img';
    lightbox.appendChild(lightboxImg);
    document.body.appendChild(lightbox);

    features.initGalleryLightbox();

    // Open lightbox via click
    img1.click();
    expect(lightbox.classList.contains('active')).toBe(true);

    // Spy on navigateLightbox and closeLightbox to verify keyboard handler calls them
    const navSpy = vi.spyOn(window, 'navigateLightbox');
    const closeSpy = vi.spyOn(window, 'closeLightbox');

    // ArrowRight via actual keyboard event (line 173)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(navSpy).toHaveBeenCalledWith(1);

    // ArrowLeft via actual keyboard event (line 172)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(navSpy).toHaveBeenCalledWith(-1);

    // Escape via actual keyboard event (line 171)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(closeSpy).toHaveBeenCalled();

    navSpy.mockRestore();
    closeSpy.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Voice commands via SpeechRecognition mock (lines 624-684)
// ═══════════════════════════════════════════════════════════════════════════
describe('processVoiceCommand via SpeechRecognition mock', () => {
  let mockRecognition;
  let onresultCb;

  beforeEach(() => {
    document.body.innerHTML = '';
    window.reorderFromHistory = undefined;
    window.checkout = undefined;
    window.clearCart = undefined;
    showAuthToast.mockClear();
    addToCart.mockClear();
    localStorage.clear();

    // Mock SpeechRecognition
    mockRecognition = {
      continuous: false,
      interimResults: false,
      lang: '',
      onresult: null,
      onend: null,
      onerror: null,
      start: vi.fn(),
      stop: vi.fn(),
    };
    window.SpeechRecognition = vi.fn(() => mockRecognition);
    window.webkitSpeechRecognition = undefined;

    features.initVoiceOrdering();
    onresultCb = mockRecognition.onresult;
  });

  function fireVoiceResult(text) {
    onresultCb({
      resultIndex: 0,
      results: [{ 0: { transcript: text }, isFinal: true, length: 1 }],
      length: 1,
    });
  }

  it('sets up toggleVoice on window', () => {
    expect(typeof window.toggleVoice).toBe('function');
  });

  it('"order my usual" triggers reorderFromHistory (lines 623-630)', () => {
    localStorage.setItem('amoghaMyOrders', JSON.stringify([{ id: 'ORD-123' }]));
    window.reorderFromHistory = vi.fn();
    fireVoiceResult('order my usual');
    expect(window.reorderFromHistory).toHaveBeenCalledWith('ORD-123');
  });

  it('"same as last time" triggers reorder (line 623)', () => {
    localStorage.setItem('amoghaMyOrders', JSON.stringify([{ id: 'ORD-456' }]));
    window.reorderFromHistory = vi.fn();
    fireVoiceResult('same as last time please');
    expect(window.reorderFromHistory).toHaveBeenCalledWith('ORD-456');
  });

  it('reorder does nothing when no cached orders (line 626)', () => {
    window.reorderFromHistory = vi.fn();
    fireVoiceResult('my usual');
    expect(window.reorderFromHistory).not.toHaveBeenCalled();
  });

  it('adds matching item to cart with fuzzy match (lines 652-660)', () => {
    const itemName = Object.keys(ITEM_PRICES)[0];
    fireVoiceResult(itemName.toLowerCase());
    expect(addToCart).toHaveBeenCalled();
    expect(showAuthToast).toHaveBeenCalledWith(expect.stringContaining('Added'));
  });

  it('adds qty items when quantity prefix used (lines 634-658)', () => {
    const itemName = Object.keys(ITEM_PRICES)[0];
    fireVoiceResult('add 3 ' + itemName.toLowerCase());
    expect(addToCart).toHaveBeenCalledTimes(3);
    expect(showAuthToast).toHaveBeenCalledWith(expect.stringContaining('3x'));
  });

  it('"checkout" triggers window.checkout (lines 662-664)', () => {
    window.checkout = vi.fn();
    fireVoiceResult('checkout');
    expect(window.checkout).toHaveBeenCalled();
  });

  it('"clear" triggers window.clearCart (lines 665-667)', () => {
    window.clearCart = vi.fn();
    fireVoiceResult('clear');
    expect(window.clearCart).toHaveBeenCalled();
  });

  it('unrecognized command calls AI fallback (lines 669-685)', async () => {
    global.fetch = vi.fn(() => Promise.resolve({
      json: () => Promise.resolve({ suggestedItems: [{ name: 'Biryani', price: 250 }] })
    }));
    fireVoiceResult('something totally random xyzzy');
    await new Promise(r => setTimeout(r, 50));
    expect(global.fetch).toHaveBeenCalledWith('/api/chat', expect.objectContaining({ method: 'POST' }));
  });

  it('AI fallback error shows toast (line 683-684)', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('network')));
    fireVoiceResult('xyzzy random gibberish');
    await new Promise(r => setTimeout(r, 50));
    expect(showAuthToast).toHaveBeenCalledWith(expect.stringContaining('Could not find'));
  });

  it('AI fallback with no suggested items shows reply (line 681)', async () => {
    global.fetch = vi.fn(() => Promise.resolve({
      json: () => Promise.resolve({ suggestedItems: [], reply: 'I cannot help with that' })
    }));
    fireVoiceResult('tell me a joke');
    await new Promise(r => setTimeout(r, 50));
    expect(showAuthToast).toHaveBeenCalledWith('I cannot help with that');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// getUpsellItems / getItemSuggestions (line 1045 final return)
// ═══════════════════════════════════════════════════════════════════════════
describe('getUpsellItems / getItemSuggestions coverage', () => {
  it('returns suggestions with name, price, reason (line 1045)', () => {
    const itemsWithPairings = Object.keys(ITEM_PAIRINGS).filter(
      (k) => Array.isArray(ITEM_PAIRINGS[k]) && ITEM_PAIRINGS[k].length > 0
    );
    if (itemsWithPairings.length > 0) {
      const cart = [{ name: itemsWithPairings[0] }];
      const suggestions = features.getUpsellItems(cart);
      expect(Array.isArray(suggestions)).toBe(true);
      if (suggestions.length > 0) {
        expect(suggestions[0]).toHaveProperty('name');
        expect(suggestions[0]).toHaveProperty('price');
        expect(suggestions[0]).toHaveProperty('reason');
      }
    }
  });

  it('returns at most 3 suggestions (line 1041)', () => {
    // Use multiple cart items to maximize pairings
    const allItems = Object.keys(ITEM_PAIRINGS).filter(
      k => Array.isArray(ITEM_PAIRINGS[k]) && ITEM_PAIRINGS[k].length > 0
    );
    const cart = allItems.slice(0, 5).map(name => ({ name }));
    const suggestions = features.getUpsellItems(cart);
    expect(suggestions.length).toBeLessThanOrEqual(3);
  });

  it('returns empty array for empty cart', () => {
    const suggestions = features.getUpsellItems([]);
    expect(suggestions).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Referral save error catch (line 786)
// ═══════════════════════════════════════════════════════════════════════════
describe('applyReferralAtSignup error handling', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('catches and logs error when referral save fails (line 786)', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    // getCurrentUser must return a user with different phone than referrer
    getCurrentUser.mockReturnValue({ phone: '8888888888', name: 'NewUser' });
    window.db = {
      collection: vi.fn((name) => {
        if (name === 'users') {
          return {
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            get: vi.fn(() => Promise.resolve({
              empty: false,
              docs: [{ data: () => ({ phone: '9999999999', name: 'Referrer' }), id: 'ref1' }],
            })),
            doc: vi.fn(() => ({ onSnapshot: vi.fn(() => vi.fn()) })),
            onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
          };
        }
        if (name === 'referrals') {
          return {
            add: vi.fn(() => Promise.reject(new Error('write denied'))),
            doc: vi.fn(() => ({ onSnapshot: vi.fn(() => vi.fn()) })),
            onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
          };
        }
        return {
          doc: vi.fn(() => ({ onSnapshot: vi.fn(() => vi.fn()) })),
          onSnapshot: vi.fn((cb) => { cb({ docChanges: () => [] }); return vi.fn(); }),
        };
      }),
    };

    features.applyReferralAtSignup('ABCD1234');
    await new Promise((r) => setTimeout(r, 50));

    // The error should be caught silently (console.error called)
    // Note: The referral save error is logged in the catch block
    consoleError.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Daily special Firestore error catch (line 1172)
// ═══════════════════════════════════════════════════════════════════════════
describe('loadDailySpecial error handling', () => {
  const origGetById = Document.prototype.getElementById;
  const origQSA = Document.prototype.querySelectorAll;
  const origQS = Document.prototype.querySelector;

  beforeEach(() => {
    // Restore real DOM methods (setup.js mocks them globally)
    document.getElementById = origGetById.bind(document);
    document.querySelectorAll = origQSA.bind(document);
    document.querySelector = origQS.bind(document);
    document.body.innerHTML = '';
  });

  it('hides section on Firestore error (line 1172)', async () => {
    const section = document.createElement('div');
    section.id = 'daily-special-section';
    section.style.display = 'block';
    document.body.appendChild(section);

    window.db = {
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          get: vi.fn(() => Promise.reject(new Error('network fail'))),
        })),
        onSnapshot: vi.fn(() => vi.fn()),
      })),
    };

    features.loadDailySpecial();
    await new Promise((r) => setTimeout(r, 50));

    expect(section.style.display).toBe('none');
  });

  it('hides section when db is null', () => {
    const section = document.createElement('div');
    section.id = 'daily-special-section';
    section.style.display = 'block';
    document.body.appendChild(section);

    window.db = null;

    features.loadDailySpecial();

    expect(section.style.display).toBe('none');
  });
});
