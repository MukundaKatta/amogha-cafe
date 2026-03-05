import { getDb } from '../core/firebase.js';
import { safeGetItem, safeSetItem } from '../core/utils.js';

// ===== CACHED FIRESTORE GET =====
// Reads from localStorage first, then refreshes from Firestore if stale.
// Saves thousands of Firestore reads per day.
// collectionName: Firestore collection
// cacheKey: localStorage key
// ttlSeconds: how long cache is valid
// transform: function(snapshot) → data array
// render: function(data) → renders UI
// opts: { orderBy: ['field'], where: [field, op, val] }
export function cachedGet(collectionName, cacheKey, ttlSeconds, transform, render, opts) {
    var db = getDb();
    if (typeof db === 'undefined' || !db) return;

    // 1. Try localStorage cache first
    try {
        var cached = localStorage.getItem(cacheKey);
        if (cached) {
            var parsed = JSON.parse(cached);
            if (parsed.ts && (Date.now() - parsed.ts) < ttlSeconds * 1000) {
                render(parsed.data);
                return; // cache is fresh, skip Firestore
            }
        }
    } catch(e) {}

    // 2. Cache miss or stale — fetch from Firestore
    var ref = db.collection(collectionName);
    if (opts && opts.orderBy) ref = ref.orderBy(opts.orderBy[0]);
    if (opts && opts.where) ref = ref.where(opts.where[0], opts.where[1], opts.where[2]);

    ref.get().then(function(snap) {
        var data = transform(snap);
        render(data);
        // Save to localStorage
        try { localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: data })); } catch(e) {}
    }).catch(function(err) {
        console.error('cachedGet ' + collectionName + ' error:', err);
        // Try stale cache as fallback
        try {
            var stale = localStorage.getItem(cacheKey);
            if (stale) render(JSON.parse(stale).data);
        } catch(e) {}
    });
}

// ===== MENU RATINGS =====
export function loadMenuRatings() {
    var db = getDb();
    if (!db) return;

    function applyRatings(ratings) {
        document.querySelectorAll('.menu-item-card').forEach(function(card) {
            var nameEl = card.querySelector('h4');
            if (!nameEl) return;
            var itemName = nameEl.textContent.replace(/Bestseller|Must Try|New/gi, '').trim();
            var ratingData = ratings[itemName];
            if (ratingData && ratingData.count > 0) {
                var avg = (ratingData.total / ratingData.count).toFixed(1);
                var existing = card.querySelector('.item-rating');
                if (existing) existing.remove();
                var ratingEl = document.createElement('div');
                ratingEl.className = 'item-rating';
                ratingEl.innerHTML = '<span class="rating-stars">' + getStarHTML(parseFloat(avg)) + '</span><span class="rating-text">' + avg + ' (' + ratingData.count + ')</span>';
                var desc = card.querySelector('.item-description');
                if (desc) desc.after(ratingEl);
            }
        });
    }

    // Try localStorage cache first (10-min TTL)
    try {
        var cached = safeGetItem('amoghaRatings');
        if (cached) {
            var parsed = JSON.parse(cached);
            if (parsed.ts && (Date.now() - parsed.ts) < 600000 && parsed.data) {
                applyRatings(parsed.data);
                return;
            }
        }
    } catch(e) {}

    db.collection('reviews').get().then(function(snap) {
        var ratings = {};
        snap.forEach(function(doc) {
            var r = doc.data();
            if (!ratings[r.itemName]) ratings[r.itemName] = { total: 0, count: 0 };
            ratings[r.itemName].total += r.rating;
            ratings[r.itemName].count++;
        });
        applyRatings(ratings);
        safeSetItem('amoghaRatings', JSON.stringify({ ts: Date.now(), data: ratings }));
    }).catch(function() {
        // Use stale cache as fallback
        try {
            var stale = safeGetItem('amoghaRatings');
            if (stale) {
                var parsed = JSON.parse(stale);
                if (parsed.data) applyRatings(parsed.data);
            }
        } catch(e) {}
    });
}

export function getStarHTML(rating) {
    var html = '';
    for (var i = 1; i <= 5; i++) {
        if (i <= Math.floor(rating)) {
            html += '<span class="star filled">&#9733;</span>';
        } else if (i - 0.5 <= rating) {
            html += '<span class="star half">&#9733;</span>';
        } else {
            html += '<span class="star empty">&#9734;</span>';
        }
    }
    return html;
}

function renderSpecials(specials) {
    var grid = document.querySelector('.specials-grid');
    if (!grid) return;
    if (specials.length === 0) {
        var specialsSection = grid.closest('.specials');
        if (specialsSection) specialsSection.style.display = 'none';
        return;
    }
    var specialsSection = grid.closest('.specials');
    if (specialsSection) specialsSection.style.display = '';

    grid.innerHTML = specials.map(function(item) {
        var cls = item.available ? '' : ' item-unavailable';
        return '<div class="special-card' + cls + '" data-id="' + item.name + '">' +
            '<div class="glow-border"></div>' +
            '<div class="special-badge">' + (item.badge || 'Special') + '</div>' +
            '<h3>' + item.name + '</h3>' +
            '<p>' + (item.description || '') + '</p>' +
            '<div class="special-price">' +
                '<span class="new-price">&#8377;' + item.price + '</span>' +
            '</div>' +
            '<button class="add-to-cart" data-item="' + item.name + '" data-price="' + item.price + '">Order Now</button>' +
        '</div>';
    }).join('');
}

// ===== SKELETON LOADERS =====
function showMenuSkeletons() {
    var skeletonHTML = '<div class="menu-skeleton-card">' +
        '<div class="skeleton-line h-img"></div>' +
        '<div class="skeleton-line w-60"></div>' +
        '<div class="skeleton-line w-100"></div>' +
        '<div class="skeleton-line w-80"></div>' +
        '<div class="skeleton-btn"></div>' +
        '</div>';
    document.querySelectorAll('.menu-items').forEach(function(container) {
        if (!container.querySelector('.menu-skeleton-card')) {
            container.insertAdjacentHTML('afterbegin', skeletonHTML + skeletonHTML + skeletonHTML);
        }
    });
}

function removeMenuSkeletons() {
    document.querySelectorAll('.menu-skeleton-card').forEach(function(el) { el.remove(); });
}

// ===== FLAME BADGE INJECTION =====
function applyFlameBadges() {
    document.querySelectorAll('.menu-item-card').forEach(function(card) {
        var badge = card.querySelector('.menu-badge');
        var h4 = card.querySelector('h4');
        var target = badge || h4;
        if (!target) return;
        var badgeText = (badge ? badge.textContent : '') + target.closest('.menu-item-card').dataset.id;
        var isHot = /chef|spicy|hot|bestseller/i.test(badgeText);
        if (isHot && !card.querySelector('.flame-badge')) {
            var flame = document.createElement('span');
            flame.className = 'flame-badge';
            flame.textContent = '🔥';
            flame.title = 'Popular pick!';
            if (badge) badge.after(flame);
            else if (h4) h4.appendChild(flame);
        }
    });
}

// ===== DYNAMIC MENU RENDERER =====
// Category display order (priority list; anything not here goes alphabetically after)
var CATEGORY_ORDER = [
    'Tiffins',
    'Non-veg Biryani', 'Veg Biryani', 'Biryanis',
    'Non-veg Starters', 'Veg Starters', 'Starters',
    'Non-veg Curries', 'Veg Curries', 'Curries',
    'Non-veg Rice', 'Veg Rice',
    'Non-veg Noodles', 'Veg Noodles', 'Noodles & Fried Rice',
    'Non-veg Pulao', 'Veg Pulao',
    'Non-veg Soups', 'Veg Soups',
    'Rice Bowls', 'Non-veg Rolls', 'Veg Rolls',
    'Kebabs & Grill', 'Rotis & Naan', 'Rotis/Naans',
    'French Fries', 'Omelette', 'Fried Egg', 'Boiled Egg',
    'Beverages', 'Sweets', 'Extras', 'Others'
];

var CATEGORY_EMOJI = {
    'Tiffins':'🍱','Non-veg Biryani':'🍛','Veg Biryani':'🍚','Biryanis':'🍛',
    'Non-veg Starters':'🍗','Veg Starters':'🥗','Starters':'🍢',
    'Non-veg Curries':'🍲','Veg Curries':'🫕','Curries':'🍲',
    'Non-veg Rice':'🍛','Veg Rice':'🍚','Non-veg Noodles':'🍜','Veg Noodles':'🍜','Noodles & Fried Rice':'🍜',
    'Non-veg Pulao':'🍛','Veg Pulao':'🍚','Non-veg Soups':'🍲','Veg Soups':'🥣',
    'Rice Bowls':'🫙','Non-veg Rolls':'🌯','Veg Rolls':'🌯',
    'Kebabs & Grill':'🔥','Rotis & Naan':'🫓','Rotis/Naans':'🫓',
    'French Fries':'🍟','Omelette':'🍳','Fried Egg':'🍳','Boiled Egg':'🥚',
    'Beverages':'🧃','Sweets':'🍬','Extras':'🫙','Others':'🍽️'
};

var CATEGORY_IMAGES = {
    'Starters':'pics/Gemini_Generated_Image_wnzsqxwnzsqxwnzs.png',
    'Curries':'pics/Gemini_Generated_Image_tu348stu348stu34.png',
    'Biryanis':'pics/Gemini_Generated_Image_h1vezgh1vezgh1ve.png',
    'Kebabs & Grill':'pics/Gemini_Generated_Image_5jdcgq5jdcgq5jdc.png',
    'Noodles & Fried Rice':'pics/Gemini_Generated_Image_1ojbou1ojbou1ojb.png',
    'Rotis & Naan':'pics/Gemini_Generated_Image_6lqqu6lqqu6lqqu6.png'
};

function escH(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function catSlug(cat) { return cat.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g,''); }

function renderItemCard(item) {
    var isVeg = item.type === 'veg' || item.isVeg === true;
    var badge = isVeg ? '<span class="veg-badge">🟢</span>' : '<span class="nonveg-badge">🔴</span>';
    var imgHtml = item.imageUrl
        ? '<div class="menu-item-img-wrap has-image"><img class="menu-item-img loaded" src="' + escH(item.imageUrl) + '" alt="" loading="lazy"></div>'
        : '';
    var allergens = (item.allergens || []).join(',');
    var unavailCls = item.available === false ? ' item-unavailable' : '';
    var unavailStyle = item.available === false ? ' style="opacity:.45;pointer-events:none;filter:grayscale(.3)"' : '';
    var descHtml = item.description ? '<p class="item-description">' + escH(item.description) + '</p>' : '';
    var allergenMeta = {nuts:'🥜',dairy:'🥛',gluten:'🌾',eggs:'🥚',soy:'🫘',shellfish:'🦐',sesame:'⚪',fish:'🐟'};
    var allergenHtml = '';
    if (item.allergens && item.allergens.length) {
        allergenHtml = '<div class="menu-allergen-icons">' +
            item.allergens.map(function(a){ return '<span class="allergen-icon">'+(allergenMeta[a]||'')+' '+escH(a)+'</span>'; }).join('') +
            '</div>';
    }
    return '<div class="menu-item-card' + unavailCls + '" data-id="' + escH(item.name) + '" data-allergens="' + escH(allergens) + '"' + unavailStyle + '>' +
        imgHtml +
        '<div class="item-header">' + badge + '<h4>' + escH(item.name) + '</h4><span class="price">&#8377;' + (item.price || 0) + '</span></div>' +
        descHtml + allergenHtml +
        '<div class="spice-selector"><span class="label">Spice:</span>' +
        '<span class="spice-level active" onclick="selectSpice(this)">Mild</span>' +
        '<span class="spice-level" onclick="selectSpice(this)">Medium</span>' +
        '<span class="spice-level" onclick="selectSpice(this)">Spicy</span></div>' +
        '<button class="add-to-cart" data-item="' + escH(item.name) + '" data-price="' + (item.price || 0) + '">Add to Order</button>' +
        '</div>';
}

function renderMenuCategories(menuData) {
    // Group items by category
    var groups = {};
    Object.keys(menuData).forEach(function(name) {
        var item = menuData[name];
        var cat = (item.category || 'Others').trim() || 'Others';
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(Object.assign({ name: name }, item));
    });

    // Sort categories
    var cats = Object.keys(groups).sort(function(a, b) {
        var ai = CATEGORY_ORDER.indexOf(a), bi = CATEGORY_ORDER.indexOf(b);
        if (ai === -1 && bi === -1) return a.localeCompare(b);
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
    });

    // Sort items within each category by sortOrder then name
    cats.forEach(function(cat) {
        groups[cat].sort(function(a, b) {
            var so = (a.sortOrder || 999) - (b.sortOrder || 999);
            return so !== 0 ? so : (a.name || '').localeCompare(b.name || '');
        });
    });

    // Render category sections
    var container = document.getElementById('dynamic-menu-container');
    if (container) {
        container.innerHTML = cats.map(function(cat) {
            var slug = catSlug(cat);
            return '<div class="menu-category" id="cat-' + slug + '">' +
                '<h3 class="category-title">' + escH(cat) + '</h3>' +
                '<div class="menu-items">' + groups[cat].map(renderItemCard).join('') + '</div>' +
                '</div>';
        }).join('');
    }

    // Render category carousel
    var carousel = document.getElementById('category-carousel');
    if (carousel) {
        carousel.innerHTML = cats.map(function(cat) {
            var slug = catSlug(cat);
            var img = CATEGORY_IMAGES[cat];
            var emoji = CATEGORY_EMOJI[cat] || '🍽️';
            var visual = img
                ? '<div class="category-img-wrap"><img src="' + escH(img) + '" alt="' + escH(cat) + '" loading="lazy"></div>'
                : '<div class="category-img-wrap" style="display:flex;align-items:center;justify-content:center;font-size:2rem;background:rgba(212,160,23,.08)">' + emoji + '</div>';
            return '<a href="#cat-' + slug + '" class="category-item" data-category="' + escH(cat) + '">' +
                visual + '<span class="category-name">' + escH(cat) + '</span></a>';
        }).join('');
    }

    applyFlameBadges();
    if (window._safeForMeActive) applySafeForMeFilter();
}

// ===== FIRESTORE MENU SYNC (fully dynamic) =====
export function initMenuSync() {
    var db = getDb();
    if (!db) return;

    // Skeleton while loading
    var container = document.getElementById('dynamic-menu-container');
    if (container) {
        var sk = '<div class="menu-category"><h3 class="category-title"><div class="skeleton-line w-60" style="height:1.2rem;border-radius:6px;background:#2a2a3a;width:160px;margin-bottom:1rem"></div></h3><div class="menu-items">' +
            Array(4).fill('<div class="menu-skeleton-card"><div class="skeleton-line h-img"></div><div class="skeleton-line w-60"></div><div class="skeleton-line w-100"></div><div class="skeleton-btn"></div></div>').join('') +
            '</div></div>';
        container.innerHTML = sk + sk;
    }

    // 1. Menu items — live listener, full re-render on change
    db.collection('menu').onSnapshot(function(snapshot) {
        var menuData = {};
        snapshot.forEach(function(doc) { menuData[doc.id] = doc.data(); });
        renderMenuCategories(menuData);
    }, function(error) {
        console.error('Menu listener error:', error);
        if (container) container.innerHTML = '<p style="text-align:center;color:#9a9ab0;padding:40px">Could not load menu. Please refresh.</p>';
    });

    // 2. Specials — cached .get() (changes rarely, saves reads vs onSnapshot)
    cachedGet('specials', 'specials_cache', 300, function(snap) {
        var specials = [];
        snap.forEach(function(doc) { var d = doc.data(); d.id = doc.id; specials.push(d); });
        return specials;
    }, renderSpecials, { orderBy: ['sortOrder'] });

    // 3. Hero Slides — cached .get() (changes rarely)
    cachedGet('heroSlides', 'heroSlides_cache', 300, function(snap) {
        var slides = [];
        snap.forEach(function(doc) { var d = doc.data(); if (d.active) slides.push(d); });
        return slides;
    }, function(slides) {
        if (slides.length === 0) return;
        if (typeof window.updateHeroSlides === 'function') window.updateHeroSlides(slides);
    }, { orderBy: ['sortOrder'] });

    // 4. Seasonal Theme Loader (cached)
    try {
        var cached = localStorage.getItem('theme_cache');
        if (cached) {
            var p = JSON.parse(cached);
            if (p.ts && (Date.now() - p.ts) < 600000 && p.theme && p.theme !== 'default') {
                document.body.classList.add('theme-' + p.theme);
                return;
            }
        }
    } catch(e) {}
    db.collection('settings').doc('global').get().then(function(doc) {
        var theme = doc.exists && doc.data().activeTheme ? doc.data().activeTheme : 'default';
        if (theme !== 'default') document.body.classList.add('theme-' + theme);
        try { localStorage.setItem('theme_cache', JSON.stringify({ ts: Date.now(), theme: theme })); } catch(e) {}
    }).catch(function() {});

    // 5. Testimonials Loader (cached)
    var grid = document.getElementById('testimonials-grid');
    if (grid) {
        function renderTestimonials(items) {
            if (items.length === 0) {
                var sec = grid.closest('.testimonials');
                if (sec) sec.style.display = 'none';
                return;
            }
            grid.innerHTML = items.map(function(t) {
                var thumb = t.thumbnailUrl || (t.videoUrl ? t.videoUrl.replace('/upload/', '/upload/f_jpg,so_1/') : '');
                return '<div class="testimonial-card" onclick="openVideoLightbox(\'' + escH(t.videoUrl || '') + '\')">' +
                    '<div class="testimonial-thumb">' +
                        (thumb ? '<img src="' + thumb + '" alt="" loading="lazy">' : '<div class="testimonial-placeholder">🎬</div>') +
                        '<div class="testimonial-play">&#9654;</div>' +
                    '</div>' +
                    '<p class="testimonial-name">' + escH(t.customerName || '') + '</p>' +
                    (t.caption ? '<p class="testimonial-caption">' + escH(t.caption) + '</p>' : '') +
                '</div>';
            }).join('');
        }
        cachedGet('testimonials', 'testimonials_cache', 600, function(snap) {
            var items = [];
            snap.forEach(function(doc) { var d = doc.data(); if (d.active) items.push(d); });
            return items;
        }, renderTestimonials, { orderBy: ['sortOrder'] });
    }

    // 6. Social Feed Loader (cached)
    var strip = document.getElementById('social-feed-strip');
    if (strip) {
        function renderSocialFeed(posts) {
            if (posts.length === 0) {
                var sec = strip.closest('.social-feed');
                if (sec) sec.style.display = 'none';
                return;
            }
            strip.innerHTML = posts.map(function(p) {
                var linkOpen = p.link ? '<a href="' + escH(p.link) + '" target="_blank" rel="noopener">' : '<div>';
                var linkClose = p.link ? '</a>' : '</div>';
                return linkOpen + '<div class="social-card"><img src="' + escH(p.imageUrl) + '" alt="" loading="lazy">' +
                    (p.caption ? '<span class="social-caption">' + escH(p.caption) + '</span>' : '') +
                '</div>' + linkClose;
            }).join('');
        }
        cachedGet('socialPosts', 'socialPosts_cache', 600, function(snap) {
            var posts = [];
            snap.forEach(function(doc) { var d = doc.data(); if (d.active) posts.push(d); });
            return posts;
        }, renderSocialFeed, { orderBy: ['sortOrder'] });
    }
}

// ===== SAFE FOR ME FILTER =====
window._safeForMeActive = false;

export function toggleSafeForMe() {
    window._safeForMeActive = !window._safeForMeActive;
    var btn = document.getElementById('safe-for-me-btn');
    if (btn) btn.classList.toggle('active', window._safeForMeActive);
    applySafeForMeFilter();
}

function applySafeForMeFilter() {
    var user = null;
    try { var u = localStorage.getItem('amoghaUser'); if (u) user = JSON.parse(u); } catch(e) {}
    var userAllergens = (user && user.allergenAlerts) || [];

    document.querySelectorAll('.menu-item-card[data-id]').forEach(function(card) {
        if (!window._safeForMeActive || userAllergens.length === 0) {
            card.classList.remove('allergen-hidden');
            if (!card.classList.contains('item-unavailable')) card.style.display = '';
            return;
        }
        var itemAllergens = (card.dataset.allergens || '').split(',').filter(Boolean);
        var hasConflict = itemAllergens.some(function(a) { return userAllergens.indexOf(a) !== -1; });
        if (hasConflict) {
            card.classList.add('allergen-hidden');
            card.style.display = 'none';
        } else {
            card.classList.remove('allergen-hidden');
            if (!card.classList.contains('item-unavailable')) card.style.display = '';
        }
    });
}

// Checkout allergen warning
export function checkAllergenWarning(cartItems, callback) {
    var user = null;
    try { var u = localStorage.getItem('amoghaUser'); if (u) user = JSON.parse(u); } catch(e) {}
    var userAllergens = (user && user.allergenAlerts) || [];
    if (userAllergens.length === 0) { callback(true); return; }

    var flagged = [];
    document.querySelectorAll('.menu-item-card[data-id]').forEach(function(card) {
        var itemAllergens = (card.dataset.allergens || '').split(',').filter(Boolean);
        var nameEl = card.querySelector('h4');
        var itemName = nameEl ? nameEl.textContent.replace(/Bestseller|Must Try|New/gi, '').trim() : card.dataset.id;
        cartItems.forEach(function(ci) {
            if (ci.name === itemName || ci.name === card.dataset.id) {
                var matches = itemAllergens.filter(function(a) { return userAllergens.indexOf(a) !== -1; });
                if (matches.length > 0) flagged.push({ name: ci.name, allergens: matches });
            }
        });
    });

    if (flagged.length === 0) { callback(true); return; }

    var html = '<div class="allergen-warning-popup" id="allergen-warning-popup">' +
        '<div class="allergen-warning-box">' +
        '<h3>Allergen Warning</h3>' +
        '<div class="allergen-list">';
    flagged.forEach(function(f) {
        html += '<p><strong>' + f.name + '</strong> contains: ' + f.allergens.join(', ') + '</p>';
    });
    html += '</div>' +
        '<button class="btn-proceed" onclick="document.getElementById(\'allergen-warning-popup\').remove();window._allergenCb(true)">Proceed Anyway</button>' +
        '<button class="btn-cancel" onclick="document.getElementById(\'allergen-warning-popup\').remove();window._allergenCb(false)">Go Back</button>' +
        '</div></div>';
    window._allergenCb = callback;
    document.body.insertAdjacentHTML('beforeend', html);
}

window.toggleSafeForMe = toggleSafeForMe;
window.checkAllergenWarning = checkAllergenWarning;
