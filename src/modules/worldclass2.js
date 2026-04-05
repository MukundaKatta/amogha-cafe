// ===== WORLD-CLASS FEATURES — PHASE 13 =====
// Photo Reviews, Accessibility Panel, Cart Calorie Counter, Table Selection,
// Ingredient Customization, Menu Social Proof, Favorites/Wishlist,
// Dish Comparison, Carbon Footprint Indicator

import { getCurrentUser, showAuthToast } from './auth.js';
import { cart, saveCart, updateCartCount, updateFloatingCart } from './cart.js';
import { getDb } from '../core/firebase.js';
import { safeGetItem, safeSetItem, lockScroll, unlockScroll, sanitizeHtml } from '../core/utils.js';

// ── 1. CUSTOMER PHOTO REVIEWS ──
function initPhotoReviews() {
    // Add photo upload option to the review section
    var reviewSection = document.getElementById('reviews');
    if (!reviewSection) return;

    // Create "Write a Review" button and modal
    var writeBtn = document.createElement('button');
    writeBtn.className = 'write-review-btn';
    writeBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> Write a Review';
    writeBtn.onclick = openPhotoReviewModal;

    var subtitle = reviewSection.querySelector('.section-subtitle');
    if (subtitle) subtitle.after(writeBtn);

    // Create modal
    var modal = document.createElement('div');
    modal.id = 'photo-review-modal';
    modal.className = 'photo-review-modal';
    modal.innerHTML =
        '<div class="photo-review-content">' +
            '<button class="photo-review-close" onclick="closePhotoReviewModal()">&times;</button>' +
            '<h2>Share Your Experience</h2>' +
            '<p class="photo-review-sub">Your review helps other food lovers!</p>' +
            '<div class="photo-review-stars" id="pr-stars">' +
                [1,2,3,4,5].map(function(n) {
                    return '<button class="pr-star" data-val="'+n+'" aria-label="'+n+' star">★</button>';
                }).join('') +
            '</div>' +
            '<p class="pr-star-label" id="pr-star-label">Tap to rate</p>' +
            '<textarea id="pr-text" class="pr-text" placeholder="Tell us about your experience..." rows="3" maxlength="500" aria-label="Review text"></textarea>' +
            '<div class="pr-photo-section">' +
                '<label class="pr-photo-upload" for="pr-photo-input">' +
                    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>' +
                    '<span>Add Photos</span>' +
                '</label>' +
                '<input type="file" id="pr-photo-input" accept="image/*" multiple style="display:none" onchange="handlePhotoUpload(this)">' +
                '<div class="pr-photo-previews" id="pr-photo-previews"></div>' +
            '</div>' +
            '<div class="pr-dish-select">' +
                '<label>What did you order?</label>' +
                '<input type="text" id="pr-dish" placeholder="e.g. Chicken Biryani" class="pr-dish-input">' +
            '</div>' +
            '<button class="pr-submit-btn" id="pr-submit" onclick="submitPhotoReview()">Submit Review</button>' +
        '</div>';
    document.body.appendChild(modal);

    // Star rating logic
    var selectedRating = 0;
    var labels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Amazing!'];
    modal.querySelectorAll('.pr-star').forEach(function(star) {
        star.addEventListener('click', function() {
            selectedRating = parseInt(this.dataset.val);
            modal.querySelectorAll('.pr-star').forEach(function(s, i) {
                s.classList.toggle('active', i < selectedRating);
            });
            document.getElementById('pr-star-label').textContent = labels[selectedRating];
        });
    });

    window._prRating = function() { return selectedRating; };
    window._prPhotos = [];
}

window.openPhotoReviewModal = function() {
    var user = getCurrentUser();
    if (!user) { showAuthToast('Sign in to write a review'); return; }
    var modal = document.getElementById('photo-review-modal');
    if (modal) { modal.classList.add('active'); lockScroll(); }
};

window.closePhotoReviewModal = function() {
    var modal = document.getElementById('photo-review-modal');
    if (modal) {
        modal.classList.remove('active');
        unlockScroll();
        // Reset form
        modal.querySelectorAll('.pr-star').forEach(function(s) { s.classList.remove('active'); });
        document.getElementById('pr-star-label').textContent = 'Tap to rate';
        document.getElementById('pr-text').value = '';
        document.getElementById('pr-photo-previews').innerHTML = '';
        document.getElementById('pr-dish').value = '';
        window._prPhotos = [];
    }
};

window.handlePhotoUpload = function(input) {
    var previews = document.getElementById('pr-photo-previews');
    Array.from(input.files).slice(0, 3).forEach(function(file) {
        if (file.size > 5 * 1024 * 1024) return; // 5MB limit
        var reader = new FileReader();
        reader.onload = function(e) {
            window._prPhotos.push(e.target.result);
            var img = document.createElement('div');
            img.className = 'pr-preview-thumb';
            img.innerHTML = '<img src="'+e.target.result+'" alt="Review photo"><button class="pr-remove-photo" onclick="this.parentElement.remove()">&times;</button>';
            previews.appendChild(img);
        };
        reader.onerror = function() {
            showAuthToast('Could not read image file. Please try another.');
        };
        reader.readAsDataURL(file);
    });
};

window.submitPhotoReview = function() {
    if (window._prSubmitting) return;
    window._prSubmitting = true;
    var rating = window._prRating ? window._prRating() : 0;
    if (rating === 0) { window._prSubmitting = false; showAuthToast('Please select a rating'); return; }
    var text = document.getElementById('pr-text').value.trim();
    var dish = document.getElementById('pr-dish').value.trim();
    var user = getCurrentUser();

    var review = {
        name: user ? user.name : 'Guest',
        rating: rating,
        text: text,
        dish: dish,
        photos: (window._prPhotos || []).length,
        date: new Date().toISOString()
    };

    // Save to localStorage
    var reviews = [];
    try { reviews = JSON.parse(safeGetItem('amoghaPhotoReviews') || '[]'); } catch(e) {}
    reviews.unshift(review);
    safeSetItem('amoghaPhotoReviews', JSON.stringify(reviews.slice(0, 50)));

    // Add to reviews section
    addReviewToDOM(review, window._prPhotos || []);

    showAuthToast('Thank you for your review! +15 loyalty points earned');
    window._prSubmitting = false;
    window.closePhotoReviewModal();

    // Award loyalty points
    if (user && user.loyalty !== undefined) {
        user.loyalty = (user.loyalty || 0) + 15;
        try { localStorage.setItem('amoghaUser', JSON.stringify(user)); } catch(e) {}
    }
};

function addReviewToDOM(review, photos) {
    var carousel = document.getElementById('reviews-carousel');
    if (!carousel) return;
    var colors = ['avatar-rose','avatar-blue','avatar-green','avatar-amber','avatar-purple','avatar-red'];
    var colorClass = colors[Math.floor(Math.random() * colors.length)];
    var initials = review.name.split(' ').map(function(n){return n[0];}).join('').toUpperCase().slice(0,2);
    var stars = '';
    for (var i = 0; i < 5; i++) stars += i < review.rating ? '★' : '☆';
    var photoHTML = '';
    if (photos && photos.length) {
        photoHTML = '<div class="review-photos">' +
            photos.map(function(p) { return '<img src="'+p+'" alt="Food photo" class="review-photo-thumb" loading="lazy">'; }).join('') +
            '</div>';
    }
    var dishTag = review.dish ? '<span class="review-dish-tag">🍽️ ' + sanitizeHtml(review.dish) + '</span>' : '';
    var card = document.createElement('div');
    card.className = 'review-card review-card-new';
    card.innerHTML = '<p class="review-text">"' + sanitizeHtml(review.text || 'Great experience!') + '"</p>' +
        photoHTML + dishTag +
        '<div class="reviewer-info"><span class="reviewer-avatar '+colorClass+'">'+initials+'</span><div><p class="reviewer">'+sanitizeHtml(review.name)+'</p><p class="review-stars">'+stars+'</p></div></div>';
    carousel.prepend(card);
}


// ── 2. ACCESSIBILITY PANEL ──
function initAccessibilityPanel() {
    var panel = document.createElement('div');
    panel.id = 'a11y-panel';
    panel.className = 'a11y-panel';
    panel.innerHTML =
        '<button class="a11y-toggle" id="a11y-toggle" aria-label="Accessibility options" title="Accessibility">' +
            '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="8" r="1"/><path d="M12 12v4"/><path d="M8 14h8"/></svg>' +
        '</button>' +
        '<div class="a11y-dropdown" id="a11y-dropdown">' +
            '<h3>Accessibility</h3>' +
            '<div class="a11y-option">' +
                '<label>Font Size</label>' +
                '<div class="a11y-btns">' +
                    '<button class="a11y-btn" onclick="adjustFontSize(-1)" aria-label="Decrease font">A-</button>' +
                    '<span class="a11y-value" id="a11y-font-val">100%</span>' +
                    '<button class="a11y-btn" onclick="adjustFontSize(1)" aria-label="Increase font">A+</button>' +
                '</div>' +
            '</div>' +
            '<div class="a11y-option">' +
                '<label>High Contrast</label>' +
                '<button class="a11y-btn a11y-toggle-btn" id="a11y-contrast" onclick="toggleHighContrast()" aria-label="Toggle high contrast">Off</button>' +
            '</div>' +
            '<div class="a11y-option">' +
                '<label>Reduce Motion</label>' +
                '<button class="a11y-btn a11y-toggle-btn" id="a11y-motion" onclick="toggleReduceMotion()" aria-label="Toggle reduce motion">Off</button>' +
            '</div>' +
            '<div class="a11y-option">' +
                '<label>Dyslexia Font</label>' +
                '<button class="a11y-btn a11y-toggle-btn" id="a11y-dyslexia" onclick="toggleDyslexiaFont()" aria-label="Toggle dyslexia font">Off</button>' +
            '</div>' +
            '<button class="a11y-reset" onclick="resetAccessibility()">Reset All</button>' +
        '</div>';
    document.body.appendChild(panel);

    // Toggle dropdown
    document.getElementById('a11y-toggle').addEventListener('click', function() {
        document.getElementById('a11y-dropdown').classList.toggle('active');
    });

    // Restore saved preferences
    var prefs = {};
    try { prefs = JSON.parse(safeGetItem('a11yPrefs') || '{}'); } catch(e) {}
    if (prefs.fontSize) { document.documentElement.style.fontSize = prefs.fontSize + '%'; document.getElementById('a11y-font-val').textContent = prefs.fontSize + '%'; }
    if (prefs.highContrast) { document.body.classList.add('high-contrast'); document.getElementById('a11y-contrast').textContent = 'On'; document.getElementById('a11y-contrast').classList.add('active'); }
    if (prefs.reduceMotion) { document.body.classList.add('reduce-motion'); document.getElementById('a11y-motion').textContent = 'On'; document.getElementById('a11y-motion').classList.add('active'); }
    if (prefs.dyslexia) { document.body.classList.add('dyslexia-font'); document.getElementById('a11y-dyslexia').textContent = 'On'; document.getElementById('a11y-dyslexia').classList.add('active'); }

    // Close on outside click
    document.addEventListener('click', function(e) {
        if (!panel.contains(e.target)) document.getElementById('a11y-dropdown').classList.remove('active');
    });
}

var _fontSizeLevel = 100;
window.adjustFontSize = function(dir) {
    _fontSizeLevel = Math.min(150, Math.max(80, _fontSizeLevel + dir * 10));
    document.documentElement.style.fontSize = _fontSizeLevel + '%';
    document.getElementById('a11y-font-val').textContent = _fontSizeLevel + '%';
    saveA11yPrefs();
};

window.toggleHighContrast = function() {
    document.body.classList.toggle('high-contrast');
    var on = document.body.classList.contains('high-contrast');
    var btn = document.getElementById('a11y-contrast');
    btn.textContent = on ? 'On' : 'Off';
    btn.classList.toggle('active', on);
    saveA11yPrefs();
};

window.toggleReduceMotion = function() {
    document.body.classList.toggle('reduce-motion');
    var on = document.body.classList.contains('reduce-motion');
    var btn = document.getElementById('a11y-motion');
    btn.textContent = on ? 'On' : 'Off';
    btn.classList.toggle('active', on);
    saveA11yPrefs();
};

window.toggleDyslexiaFont = function() {
    document.body.classList.toggle('dyslexia-font');
    var on = document.body.classList.contains('dyslexia-font');
    var btn = document.getElementById('a11y-dyslexia');
    btn.textContent = on ? 'On' : 'Off';
    btn.classList.toggle('active', on);
    saveA11yPrefs();
};

window.resetAccessibility = function() {
    _fontSizeLevel = 100;
    document.documentElement.style.fontSize = '';
    document.getElementById('a11y-font-val').textContent = '100%';
    document.body.classList.remove('high-contrast', 'reduce-motion', 'dyslexia-font');
    ['a11y-contrast', 'a11y-motion', 'a11y-dyslexia'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) { el.textContent = 'Off'; el.classList.remove('active'); }
    });
    try { localStorage.removeItem('a11yPrefs'); } catch(e) {}
};

function saveA11yPrefs() {
    try {
        localStorage.setItem('a11yPrefs', JSON.stringify({
            fontSize: _fontSizeLevel,
            highContrast: document.body.classList.contains('high-contrast'),
            reduceMotion: document.body.classList.contains('reduce-motion'),
            dyslexia: document.body.classList.contains('dyslexia-font')
        }));
    } catch(e) {}
}


// ── 3. CART CALORIE COUNTER ──
var CALORIE_DB = {
    'Chicken Biryani': { cal: 520, protein: 28, carbs: 62, fat: 18 },
    'Chicken 65 Biryani': { cal: 580, protein: 30, carbs: 58, fat: 22 },
    'Veg Biryani': { cal: 420, protein: 12, carbs: 68, fat: 14 },
    'Paneer Butter Masala': { cal: 380, protein: 18, carbs: 22, fat: 26 },
    'Butter Naan': { cal: 300, protein: 8, carbs: 45, fat: 10 },
    'Tandoori Chicken': { cal: 260, protein: 32, carbs: 8, fat: 12 },
    'Masala Dosa': { cal: 350, protein: 10, carbs: 52, fat: 12 },
    'Gongura Chicken + Naan': { cal: 620, protein: 34, carbs: 55, fat: 28 },
    'Baghara Rice + Chicken Fry': { cal: 560, protein: 26, carbs: 65, fat: 20 },
    'Dal Tadka': { cal: 220, protein: 14, carbs: 32, fat: 6 },
    'Raita': { cal: 80, protein: 4, carbs: 6, fat: 4 },
    'Gulab Jamun': { cal: 180, protein: 3, carbs: 30, fat: 6 },
    'Lassi': { cal: 150, protein: 5, carbs: 22, fat: 4 },
    'Chai': { cal: 60, protein: 2, carbs: 10, fat: 1 },
    'Filter Coffee': { cal: 45, protein: 1, carbs: 8, fat: 1 }
};

function initCartCalorieCounter() {
    // Observe cart changes and update calorie display
    var origDisplayCart = window.displayCart;
    if (!origDisplayCart) return;

    window.displayCart = function() {
        origDisplayCart.apply(this, arguments);
        updateCalorieDisplay();
    };

    // Also hook into cart mutations
    var cartItems = document.getElementById('cart-items');
    if (cartItems) {
        if (window._calorieObserver) window._calorieObserver.disconnect();
        window._calorieObserver = new MutationObserver(updateCalorieDisplay);
        window._calorieObserver.observe(cartItems, { childList: true, subtree: true });
    }
}

function updateCalorieDisplay() {
    var container = document.getElementById('cart-calorie-summary');
    if (!container) {
        container = document.createElement('div');
        container.id = 'cart-calorie-summary';
        container.className = 'cart-calorie-summary';
        var cartTotal = document.querySelector('.cart-total');
        if (cartTotal) cartTotal.before(container);
    }

    var totalCal = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0;
    var hasData = false;

    cart.forEach(function(item) {
        var info = CALORIE_DB[item.item] || findClosestMatch(item.item);
        if (info) {
            hasData = true;
            var qty = item.quantity || 1;
            totalCal += info.cal * qty;
            totalProtein += info.protein * qty;
            totalCarbs += info.carbs * qty;
            totalFat += info.fat * qty;
        }
    });

    if (!hasData || cart.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = '';
    container.innerHTML =
        '<div class="calorie-header">' +
            '<span class="calorie-icon">🔥</span>' +
            '<span class="calorie-title">Nutritional Summary</span>' +
        '</div>' +
        '<div class="calorie-grid">' +
            '<div class="calorie-item"><span class="cal-num">' + totalCal + '</span><span class="cal-label">kcal</span></div>' +
            '<div class="calorie-item protein"><span class="cal-num">' + totalProtein + 'g</span><span class="cal-label">Protein</span></div>' +
            '<div class="calorie-item carbs"><span class="cal-num">' + totalCarbs + 'g</span><span class="cal-label">Carbs</span></div>' +
            '<div class="calorie-item fat"><span class="cal-num">' + totalFat + 'g</span><span class="cal-label">Fat</span></div>' +
        '</div>' +
        (totalCal > 800 ? '<p class="calorie-tip">💡 High-calorie meal — consider adding a salad!</p>' : '') +
        (totalCal <= 500 ? '<p class="calorie-tip">🥗 Light & healthy choice!</p>' : '');
}

function findClosestMatch(name) {
    // Fuzzy match - try partial matches
    var lower = (name || '').toLowerCase();
    var keys = Object.keys(CALORIE_DB);
    for (var i = 0; i < keys.length; i++) {
        if (lower.indexOf(keys[i].toLowerCase()) !== -1 || keys[i].toLowerCase().indexOf(lower) !== -1) {
            return CALORIE_DB[keys[i]];
        }
    }
    // Default estimate for unknown items
    return { cal: 350, protein: 15, carbs: 40, fat: 12 };
}


// ── 4. TABLE SELECTION FOR DINE-IN ──
function initTableSelection() {
    var reservationForm = document.getElementById('reservation-form');
    if (!reservationForm) return;

    // Add table selection before submit button
    var submitBtn = reservationForm.querySelector('button[type="submit"]');
    if (!submitBtn) return;

    var tableSection = document.createElement('div');
    tableSection.className = 'table-selection';
    tableSection.innerHTML =
        '<label class="table-section-label">Choose Your Table (Optional)</label>' +
        '<div class="table-map" id="table-map">' +
            '<div class="table-map-legend">' +
                '<span class="legend-item"><span class="legend-dot available"></span> Available</span>' +
                '<span class="legend-item"><span class="legend-dot occupied"></span> Reserved</span>' +
                '<span class="legend-item"><span class="legend-dot selected"></span> Your Pick</span>' +
            '</div>' +
            '<div class="table-grid">' +
                buildTableHTML() +
            '</div>' +
        '</div>' +
        '<input type="hidden" name="table" id="selected-table" value="">';
    submitBtn.before(tableSection);
}

function buildTableHTML() {
    var tables = [
        { id: 'T1', seats: 2, type: 'window', x: 0, y: 0 },
        { id: 'T2', seats: 2, type: 'window', x: 1, y: 0 },
        { id: 'T3', seats: 4, type: 'center', x: 2, y: 0 },
        { id: 'T4', seats: 4, type: 'center', x: 0, y: 1 },
        { id: 'T5', seats: 6, type: 'family', x: 1, y: 1 },
        { id: 'T6', seats: 2, type: 'cozy', x: 2, y: 1 },
        { id: 'T7', seats: 4, type: 'center', x: 0, y: 2 },
        { id: 'T8', seats: 8, type: 'group', x: 1, y: 2 },
        { id: 'T9', seats: 2, type: 'bar', x: 2, y: 2 }
    ];

    // Randomly mark some as occupied
    var occupied = [];
    tables.forEach(function(t) { if (Math.random() < 0.3) occupied.push(t.id); });

    return tables.map(function(t) {
        var cls = occupied.indexOf(t.id) !== -1 ? 'table-slot occupied' : 'table-slot available';
        var icon = t.seats <= 2 ? '🪑🪑' : t.seats <= 4 ? '🪑🪑🪑🪑' : t.seats <= 6 ? '👨‍👩‍👧‍👦' : '🎉';
        return '<button class="'+cls+'" data-table="'+t.id+'" data-seats="'+t.seats+'" onclick="selectTable(this)">' +
            '<span class="table-icon">'+icon+'</span>' +
            '<span class="table-id">'+t.id+'</span>' +
            '<span class="table-info">'+t.seats+' seats · '+t.type+'</span>' +
        '</button>';
    }).join('');
}

window.selectTable = function(btn) {
    if (btn.classList.contains('occupied')) return;
    document.querySelectorAll('.table-slot.selected').forEach(function(s) { s.classList.remove('selected'); });
    btn.classList.add('selected');
    document.getElementById('selected-table').value = btn.dataset.table;
};


// ── 5. INGREDIENT CUSTOMIZATION ──
function initIngredientCustomization() {
    // Add customize button to menu cards after render
    var observer = new MutationObserver(function() {
        document.querySelectorAll('.menu-item-card:not(.has-customize)').forEach(function(card) {
            card.classList.add('has-customize');
            var addBtn = card.querySelector('.add-to-cart');
            if (!addBtn) return;

            var customizeBtn = document.createElement('button');
            customizeBtn.className = 'customize-btn';
            customizeBtn.innerHTML = '⚙️ Customize';
            customizeBtn.onclick = function(e) {
                e.stopPropagation();
                openCustomizeModal(card.dataset.id, addBtn.dataset.price);
            };
            addBtn.before(customizeBtn);
        });
    });

    var menuContainer = document.getElementById('dynamic-menu-container');
    if (menuContainer) {
        observer.observe(menuContainer, { childList: true, subtree: true });
    }
}

var CUSTOMIZATION_OPTIONS = {
    'spice': { label: 'Spice Level', options: ['No Spice', 'Mild', 'Medium', 'Spicy', 'Extra Spicy'], default: 2 },
    'rice': { label: 'Rice Type', options: ['Basmati', 'Seeraga Samba', 'Brown Rice (+₹20)'], default: 0, premium: [2] },
    'oil': { label: 'Cooking Oil', options: ['Regular', 'Olive Oil (+₹15)', 'Ghee (+₹10)'], default: 0, premium: [1, 2] },
    'portion': { label: 'Portion', options: ['Regular', 'Large (+₹50)', 'Family Pack (+₹120)'], default: 0, premium: [1, 2] },
    'extras': { label: 'Add Extras', options: ['Extra Raita (+₹30)', 'Papad (+₹15)', 'Pickle (+₹10)', 'Salad (+₹25)'], multi: true }
};

window.openCustomizeModal = function(itemName, basePrice) {
    var existing = document.getElementById('customize-modal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'customize-modal';
    modal.className = 'customize-modal active';
    modal.innerHTML =
        '<div class="customize-content">' +
            '<button class="customize-close" onclick="this.closest(\'.customize-modal\').remove();unlockScroll()">&times;</button>' +
            '<h3>Customize: ' + itemName + '</h3>' +
            '<p class="customize-base">Base price: ₹' + basePrice + '</p>' +
            Object.keys(CUSTOMIZATION_OPTIONS).map(function(key) {
                var opt = CUSTOMIZATION_OPTIONS[key];
                if (opt.multi) {
                    return '<div class="customize-group">' +
                        '<label>' + opt.label + '</label>' +
                        '<div class="customize-multi">' +
                        opt.options.map(function(o, i) {
                            return '<label class="customize-check"><input type="checkbox" data-key="'+key+'" data-idx="'+i+'" onchange="updateCustomizeTotal()"> '+o+'</label>';
                        }).join('') +
                        '</div></div>';
                }
                return '<div class="customize-group">' +
                    '<label>' + opt.label + '</label>' +
                    '<div class="customize-options">' +
                    opt.options.map(function(o, i) {
                        var sel = i === (opt.default || 0) ? ' active' : '';
                        return '<button class="customize-opt'+sel+'" data-key="'+key+'" data-idx="'+i+'" onclick="selectCustomizeOpt(this)">' + o + '</button>';
                    }).join('') +
                    '</div></div>';
            }).join('') +
            '<div class="customize-total">' +
                '<span>Total: ₹<span id="customize-total-val">' + basePrice + '</span></span>' +
                '<button class="customize-add-btn" onclick="addCustomizedItem(\'' + itemName.replace(/'/g,"\\'") + '\',' + basePrice + ')">Add to Cart</button>' +
            '</div>' +
        '</div>';
    document.body.appendChild(modal);
    lockScroll();
};

window.selectCustomizeOpt = function(btn) {
    btn.parentElement.querySelectorAll('.customize-opt').forEach(function(o) { o.classList.remove('active'); });
    btn.classList.add('active');
    updateCustomizeTotal();
};

window.updateCustomizeTotal = function() {
    var modal = document.getElementById('customize-modal');
    if (!modal) return;
    var extra = 0;
    // Single selects
    modal.querySelectorAll('.customize-opt.active').forEach(function(opt) {
        var text = opt.textContent;
        var match = text.match(/\+₹(\d+)/);
        if (match) extra += parseInt(match[1]);
    });
    // Multi selects
    modal.querySelectorAll('.customize-check input:checked').forEach(function(cb) {
        var text = cb.parentElement.textContent;
        var match = text.match(/\+₹(\d+)/);
        if (match) extra += parseInt(match[1]);
    });
    var baseEl = modal.querySelector('.customize-base');
    var baseMatch = baseEl ? baseEl.textContent.match(/₹(\d+)/) : null;
    var base = baseMatch ? parseInt(baseMatch[1]) : 0; // safe: null-check regex match
    document.getElementById('customize-total-val').textContent = base + extra;
};

window.addCustomizedItem = function(name, basePrice) {
    var modal = document.getElementById('customize-modal');
    if (!modal) return;
    var total = parseInt(document.getElementById('customize-total-val').textContent);
    var customizations = [];

    modal.querySelectorAll('.customize-opt.active').forEach(function(opt) {
        var key = opt.dataset.key;
        if (CUSTOMIZATION_OPTIONS[key] && parseInt(opt.dataset.idx) !== (CUSTOMIZATION_OPTIONS[key].default || 0)) {
            customizations.push(opt.textContent.replace(/\(\+₹\d+\)/,'').trim());
        }
    });
    modal.querySelectorAll('.customize-check input:checked').forEach(function(cb) {
        customizations.push(cb.parentElement.textContent.replace(/\(\+₹\d+\)/,'').trim());
    });

    var label = customizations.length ? name + ' (' + customizations.join(', ') + ')' : name;

    // Add to cart
    var existing = cart.find(function(c) { return c.item === label; });
    if (existing) {
        existing.quantity++;
    } else {
        cart.push({ item: label, price: total, quantity: 1 });
    }
    saveCart();
    updateCartCount();
    if (typeof updateFloatingCart === 'function') updateFloatingCart();

    modal.remove();
    unlockScroll();
    showAuthToast('Added customized ' + name + ' to cart!');
};


// ── 6. LIVE SOCIAL PROOF ON MENU ITEMS ──
function initMenuSocialProof() {
    // Wait for menu to render
    setTimeout(function() {
        document.querySelectorAll('.menu-item-card').forEach(function(card) {
            if (Math.random() < 0.4) { // 40% of items show social proof
                var count = Math.floor(Math.random() * 25) + 3;
                var badge = document.createElement('div');
                badge.className = 'menu-social-proof';
                badge.innerHTML = '<span class="msp-fire">🔥</span> ' + count + ' ordered today';
                var header = card.querySelector('.item-header');
                if (header) header.after(badge);
            }
        });
    }, 3000);
}


// ── 7. FAVORITES / WISHLIST ──
function initFavorites() {
    var favorites = [];
    try { favorites = JSON.parse(safeGetItem('amoghaFavorites') || '[]'); } catch(e) {}

    // Add heart buttons after menu renders
    function addHearts() {
        document.querySelectorAll('.menu-item-card:not(.has-heart)').forEach(function(card) {
            card.classList.add('has-heart');
            var itemName = card.dataset.id;
            var isFav = favorites.indexOf(itemName) !== -1;
            var heart = document.createElement('button');
            heart.className = 'fav-heart' + (isFav ? ' active' : '');
            heart.innerHTML = isFav ? '❤️' : '🤍';
            heart.setAttribute('aria-label', 'Add to favorites');
            heart.onclick = function(e) {
                e.stopPropagation();
                var idx = favorites.indexOf(itemName);
                if (idx !== -1) {
                    favorites.splice(idx, 1);
                    heart.innerHTML = '🤍';
                    heart.classList.remove('active');
                } else {
                    favorites.push(itemName);
                    heart.innerHTML = '❤️';
                    heart.classList.add('active');
                    heart.classList.add('fav-pop');
                    setTimeout(function() { heart.classList.remove('fav-pop'); }, 400);
                }
                safeSetItem('amoghaFavorites', JSON.stringify(favorites));
            };
            card.style.position = 'relative';
            card.appendChild(heart);
        });
    }

    // Observe menu container for dynamic rendering
    var menuContainer = document.getElementById('dynamic-menu-container');
    if (menuContainer) {
        var obs = new MutationObserver(addHearts);
        obs.observe(menuContainer, { childList: true, subtree: true });
    }
    setTimeout(addHearts, 3000);

    // Add Favorites filter button
    var filterBtns = document.querySelector('.filter-btns');
    if (filterBtns) {
        var favFilter = document.createElement('button');
        favFilter.className = 'filter-btn';
        favFilter.dataset.filter = 'favorites';
        favFilter.innerHTML = '❤️ Favorites';
        favFilter.onclick = function() {
            document.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
            favFilter.classList.add('active');
            document.querySelectorAll('.menu-item-card').forEach(function(card) {
                var isFav = favorites.indexOf(card.dataset.id) !== -1;
                card.style.display = isFav ? '' : 'none';
            });
        };
        filterBtns.appendChild(favFilter);
    }
}


// ── 8. DISH COMPARISON ──
function initDishComparison() {
    var compareList = [];

    // Add compare checkboxes after menu renders
    function addCompareButtons() {
        document.querySelectorAll('.menu-item-card:not(.has-compare)').forEach(function(card) {
            card.classList.add('has-compare');
            var btn = document.createElement('button');
            btn.className = 'compare-btn';
            btn.innerHTML = '⚖️';
            btn.title = 'Compare this dish';
            btn.onclick = function(e) {
                e.stopPropagation();
                var itemName = card.dataset.id;
                var idx = compareList.indexOf(itemName);
                if (idx !== -1) {
                    compareList.splice(idx, 1);
                    btn.classList.remove('active');
                } else if (compareList.length < 3) {
                    compareList.push(itemName);
                    btn.classList.add('active');
                } else {
                    showAuthToast('Max 3 dishes to compare');
                    return;
                }
                updateCompareBar();
            };
            card.appendChild(btn);
        });
    }

    var menuContainer = document.getElementById('dynamic-menu-container');
    if (menuContainer) {
        var obs = new MutationObserver(addCompareButtons);
        obs.observe(menuContainer, { childList: true, subtree: true });
    }
    setTimeout(addCompareButtons, 3000);

    // Compare floating bar
    var bar = document.createElement('div');
    bar.id = 'compare-bar';
    bar.className = 'compare-bar';
    bar.innerHTML = '<span id="compare-count">0 selected</span><button class="compare-go-btn" onclick="showCompareModal()">Compare</button>';
    document.body.appendChild(bar);

    function updateCompareBar() {
        bar.style.display = compareList.length >= 2 ? 'flex' : 'none';
        document.getElementById('compare-count').textContent = compareList.length + ' dishes selected';
    }

    window.showCompareModal = function() {
        var existing = document.getElementById('compare-modal');
        if (existing) existing.remove();

        var modal = document.createElement('div');
        modal.id = 'compare-modal';
        modal.className = 'compare-modal active';

        var items = compareList.map(function(name) {
            var cal = CALORIE_DB[name] || findClosestMatch(name);
            var card = document.querySelector('.menu-item-card[data-id="'+name+'"]');
            var price = card ? (card.querySelector('.price') || {}).textContent || '₹0' : '₹0';
            var desc = card ? (card.querySelector('.item-description') || {}).textContent || '' : '';
            var isVeg = card ? card.querySelector('.veg-badge') !== null : false;
            return { name: name, price: price, desc: desc, cal: cal, veg: isVeg };
        });

        modal.innerHTML =
            '<div class="compare-content">' +
                '<button class="compare-close" onclick="this.closest(\'.compare-modal\').remove()">&times;</button>' +
                '<h3>Dish Comparison</h3>' +
                '<div class="compare-table">' +
                    '<div class="compare-row compare-header-row"><span class="compare-label"></span>' + items.map(function(i) { return '<span class="compare-cell"><strong>'+i.name+'</strong></span>'; }).join('') + '</div>' +
                    '<div class="compare-row"><span class="compare-label">Price</span>' + items.map(function(i) { return '<span class="compare-cell">'+i.price+'</span>'; }).join('') + '</div>' +
                    '<div class="compare-row"><span class="compare-label">Type</span>' + items.map(function(i) { return '<span class="compare-cell">'+(i.veg ? '🟢 Veg' : '🔴 Non-Veg')+'</span>'; }).join('') + '</div>' +
                    '<div class="compare-row"><span class="compare-label">Calories</span>' + items.map(function(i) { return '<span class="compare-cell">'+i.cal.cal+' kcal</span>'; }).join('') + '</div>' +
                    '<div class="compare-row"><span class="compare-label">Protein</span>' + items.map(function(i) { return '<span class="compare-cell">'+i.cal.protein+'g</span>'; }).join('') + '</div>' +
                    '<div class="compare-row"><span class="compare-label">Carbs</span>' + items.map(function(i) { return '<span class="compare-cell">'+i.cal.carbs+'g</span>'; }).join('') + '</div>' +
                    '<div class="compare-row"><span class="compare-label">Fat</span>' + items.map(function(i) { return '<span class="compare-cell">'+i.cal.fat+'g</span>'; }).join('') + '</div>' +
                '</div>' +
            '</div>';
        document.body.appendChild(modal);
    };

    window._compareList = compareList;
}


// ── 9. CARBON FOOTPRINT INDICATOR ──
function initCarbonFootprint() {
    var CO2_DATA = {
        'veg': { co2: 0.5, label: 'Low', color: '#22c55e', icon: '🌱' },
        'non-veg': { co2: 2.5, label: 'Medium', color: '#f59e0b', icon: '🐔' },
        'mutton': { co2: 5.0, label: 'Higher', color: '#ef4444', icon: '🐑' }
    };

    function addCarbonBadges() {
        document.querySelectorAll('.menu-item-card:not(.has-carbon)').forEach(function(card) {
            card.classList.add('has-carbon');
            var isVeg = card.querySelector('.veg-badge') !== null;
            var name = (card.dataset.id || '').toLowerCase();
            var type = isVeg ? 'veg' : (name.indexOf('mutton') !== -1 || name.indexOf('lamb') !== -1 ? 'mutton' : 'non-veg');
            var data = CO2_DATA[type];

            var badge = document.createElement('span');
            badge.className = 'carbon-badge carbon-' + type;
            badge.innerHTML = data.icon + ' ' + data.co2 + 'kg CO₂';
            badge.title = 'Estimated carbon footprint: ' + data.label;
            badge.style.color = data.color;

            var header = card.querySelector('.item-header');
            if (header) header.appendChild(badge);
        });
    }

    var menuContainer = document.getElementById('dynamic-menu-container');
    if (menuContainer) {
        var obs = new MutationObserver(addCarbonBadges);
        obs.observe(menuContainer, { childList: true, subtree: true });
    }
    setTimeout(addCarbonBadges, 3000);
}


// ── 10. SMART ORDER SUGGESTIONS IN CART ──
function initSmartCartSuggestions() {
    var origDisplayCart = window.displayCart;
    if (!origDisplayCart) return;

    window.displayCart = function() {
        origDisplayCart.apply(this, arguments);
        showSmartSuggestions();
    };
}

function showSmartSuggestions() {
    var recs = document.getElementById('cart-recommendations');
    if (!recs) return;

    var cartItems = cart.map(function(c) { return c.item.toLowerCase(); });
    if (cartItems.length === 0) { recs.style.display = 'none'; return; }

    var suggestions = [];
    var hasBiryani = cartItems.some(function(i) { return i.indexOf('biryani') !== -1; });
    var hasNaan = cartItems.some(function(i) { return i.indexOf('naan') !== -1; });
    var hasDrink = cartItems.some(function(i) { return i.indexOf('lassi') !== -1 || i.indexOf('chai') !== -1 || i.indexOf('coffee') !== -1; });
    var hasDesert = cartItems.some(function(i) { return i.indexOf('gulab') !== -1 || i.indexOf('dessert') !== -1; });

    if (hasBiryani && !cartItems.some(function(i) { return i.indexOf('raita') !== -1; })) {
        suggestions.push({ name: 'Raita', price: 40, reason: 'Perfect with biryani!' });
    }
    if (!hasDrink) {
        suggestions.push({ name: 'Masala Chai', price: 30, reason: 'Complete your meal' });
    }
    if (!hasDesert) {
        suggestions.push({ name: 'Gulab Jamun', price: 60, reason: 'End on a sweet note' });
    }
    if (hasNaan && !cartItems.some(function(i) { return i.indexOf('dal') !== -1; })) {
        suggestions.push({ name: 'Dal Tadka', price: 120, reason: 'Goes great with naan!' });
    }

    if (suggestions.length === 0) { recs.style.display = 'none'; return; }

    recs.style.display = '';
    recs.innerHTML = '<h4 class="cart-rec-title">You might also like</h4>' +
        suggestions.slice(0, 3).map(function(s) {
            return '<div class="cart-rec-item">' +
                '<div class="cart-rec-info"><span class="cart-rec-name">' + s.name + '</span><span class="cart-rec-reason">' + s.reason + '</span></div>' +
                '<button class="cart-rec-add" onclick="addSuggestion(\'' + s.name.replace(/'/g, "\\'") + '\',' + s.price + ')">+ ₹' + s.price + '</button>' +
            '</div>';
        }).join('');
}

window.addSuggestion = function(name, price) {
    var existing = cart.find(function(c) { return c.item === name; });
    if (existing) {
        existing.quantity++;
    } else {
        cart.push({ item: name, price: price, quantity: 1 });
    }
    saveCart();
    updateCartCount();
    if (typeof window.displayCart === 'function') window.displayCart();
    showAuthToast(name + ' added to your order!');
};


// ── INIT ALL PHASE 13 FEATURES ──
export function initWorldClass2() {
    initPhotoReviews();
    initAccessibilityPanel();
    initCartCalorieCounter();
    initTableSelection();
    initIngredientCustomization();
    initMenuSocialProof();
    initFavorites();
    initDishComparison();
    initCarbonFootprint();
    initSmartCartSuggestions();
}
