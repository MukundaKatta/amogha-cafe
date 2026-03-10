// ===== PERSONALIZED HOME SCREEN & PROACTIVE SUGGESTIONS =====
import { safeGetItem } from '../core/utils.js';
import { ITEM_PRICES } from '../core/constants.js';
import { addToCart } from './cart.js';

// Time-of-day helper
function getTimeSlot() {
    var h = new Date().getHours();
    if (h >= 5 && h < 11) return 'morning';
    if (h >= 11 && h < 15) return 'lunch';
    if (h >= 15 && h < 19) return 'evening';
    if (h >= 19 && h < 23) return 'night';
    return 'late';
}

var GREETINGS = {
    morning: { emoji: '\u2600\uFE0F', text: 'Good Morning! Start your day with our breakfast picks' },
    lunch:   { emoji: '\uD83C\uDF5B', text: 'Lunchtime! Fresh biryanis and meals ready for you' },
    evening: { emoji: '\uD83C\uDF75', text: 'Good Evening! Time for chai and snacks' },
    night:   { emoji: '\uD83C\uDF19', text: 'Dinner Time! End your day with something special' },
    late:    { emoji: '\uD83C\uDF03', text: 'Late Night Cravings? We\'ve got you covered' }
};

// Category keywords per time slot (used for meal-time highlighting)
var TIME_CATEGORIES = {
    morning: ['Tiffins', 'Beverages'],
    lunch:   ['Biryanis', 'Rice', 'Curries'],
    evening: ['Starters', 'Beverages', 'Snacks'],
    night:   ['Biryanis', 'Curries', 'Noodles']
};

// ===== 1. TIME-BASED GREETING BANNER =====
function initGreeting() {
    var el = document.getElementById('time-greeting');
    if (!el) return;
    var slot = getTimeSlot();
    var g = GREETINGS[slot];
    el.innerHTML = '<span class="time-greeting-emoji">' + g.emoji + '</span> ' +
        '<span class="time-greeting-text">' + g.text + '</span>';
    el.classList.add('time-greeting--' + slot);
    // Fade in
    requestAnimationFrame(function() { el.classList.add('time-greeting--visible'); });
}

// ===== 2. "YOUR USUAL ORDER" FLOATING REORDER BAR =====
function initReorderBar() {
    var user = null;
    try { user = JSON.parse(localStorage.getItem('amoghaUser')); } catch(e) {}
    if (!user) return;

    var cached = null;
    try { cached = JSON.parse(localStorage.getItem('amoghaMyOrders')); } catch(e) {}
    if (!cached || !cached.length) return;

    // Extract all items from the last 3 orders and count frequency
    var freq = {};
    var limit = Math.min(cached.length, 3);
    for (var i = 0; i < limit; i++) {
        var order = cached[i].data;
        if (!order || !order.items) continue;
        order.items.forEach(function(item) {
            var name = item.name;
            if (!name) return;
            freq[name] = (freq[name] || 0) + (item.qty || 1);
        });
    }

    // Get top 3 most-ordered items
    var sorted = Object.keys(freq).sort(function(a, b) { return freq[b] - freq[a]; });
    var topItems = sorted.slice(0, 3);
    if (topItems.length === 0) return;

    var firstName = (user.name || 'Friend').split(' ')[0];

    // Build the bar
    var bar = document.createElement('div');
    bar.id = 'reorder-bar';
    bar.className = 'reorder-bar';
    bar.innerHTML =
        '<div class="reorder-bar-inner">' +
            '<span class="reorder-bar-label">Welcome back, ' + firstName + '! \uD83D\uDD04 Reorder:</span>' +
            '<div class="reorder-bar-chips">' +
                topItems.map(function(name) {
                    var price = ITEM_PRICES[name] || 0;
                    return '<button class="reorder-chip" data-item="' + name.replace(/"/g, '&quot;') + '" data-price="' + price + '">' +
                        name + (price ? ' \u20B9' + price : '') +
                        '</button>';
                }).join('') +
            '</div>' +
            '<button class="reorder-bar-close" aria-label="Close">&times;</button>' +
        '</div>';

    document.body.appendChild(bar);

    // Chip click → add to cart
    bar.addEventListener('click', function(e) {
        var chip = e.target.closest('.reorder-chip');
        if (chip) {
            var itemName = chip.getAttribute('data-item');
            var price = parseFloat(chip.getAttribute('data-price')) || 0;
            if (typeof window.addToCart === 'function') {
                window.addToCart(itemName, price);
            } else {
                addToCart(itemName, price);
            }
            chip.classList.add('reorder-chip--added');
            chip.textContent = '\u2713 Added';
            setTimeout(function() { chip.classList.remove('reorder-chip--added'); }, 1500);
        }

        // Close button
        if (e.target.closest('.reorder-bar-close')) {
            hideReorderBar(bar);
        }
    });

    // Slide up after short delay
    requestAnimationFrame(function() {
        setTimeout(function() { bar.classList.add('reorder-bar--visible'); }, 300);
    });

    // Auto-hide after 10 seconds
    setTimeout(function() { hideReorderBar(bar); }, 10000);
}

function hideReorderBar(bar) {
    if (!bar || bar._hiding) return;
    bar._hiding = true;
    bar.classList.remove('reorder-bar--visible');
    setTimeout(function() { if (bar.parentNode) bar.remove(); }, 500);
}

// ===== 3. MEAL-TIME MENU HIGHLIGHTING =====
function initMealTimeMenu() {
    var slot = getTimeSlot();
    var targetCats = TIME_CATEGORIES[slot] || [];
    if (targetCats.length === 0) return;

    // Wait for carousel to be populated (menu loads from Firestore)
    var attempts = 0;
    var maxAttempts = 20;
    var timer = setInterval(function() {
        attempts++;
        var carousel = document.getElementById('category-carousel');
        if (!carousel) { if (attempts >= maxAttempts) clearInterval(timer); return; }
        var items = carousel.querySelectorAll('.category-item');
        if (items.length === 0) { if (attempts >= maxAttempts) clearInterval(timer); return; }

        clearInterval(timer);

        // Find the first matching category and highlight it
        var firstMatch = null;
        items.forEach(function(item) {
            var cat = item.getAttribute('data-category') || '';
            var matched = targetCats.some(function(tc) {
                return cat.toLowerCase().indexOf(tc.toLowerCase()) !== -1;
            });
            if (matched) {
                item.classList.add('active');
                if (!firstMatch) firstMatch = item;
            }
        });

        // Scroll carousel to first match
        if (firstMatch && carousel.scrollTo) {
            var offset = firstMatch.offsetLeft - carousel.offsetLeft - 16;
            carousel.scrollTo({ left: offset, behavior: 'smooth' });
        }
    }, 500);
}

// ===== MAIN INIT =====
export function initPersonalize() {
    initGreeting();
    initMealTimeMenu();
    // Delay reorder bar so auth + orders are loaded
    setTimeout(initReorderBar, 3000);
}
