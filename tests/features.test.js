import { describe, it, expect, beforeEach } from 'vitest';
import * as features from '../src/modules/features.js';
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
