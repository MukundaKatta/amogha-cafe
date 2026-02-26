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

// ===== FIRESTORE MENU OVERLAY =====
// Syncs availability & prices from Firestore onto hardcoded menu HTML
export function initMenuSync() {
    var db = getDb();
    if (!db) return;

    // Show skeletons immediately while waiting for Firestore
    showMenuSkeletons();

    // Helper: ensure image wrapper exists on a menu card
    function ensureImageWrap(card) {
        var wrap = card.querySelector('.menu-item-img-wrap');
        if (wrap) return wrap;
        wrap = document.createElement('div');
        wrap.className = 'menu-item-img-wrap';
        var img = document.createElement('img');
        img.className = 'menu-item-img';
        img.alt = '';
        img.loading = 'lazy';
        var ph = document.createElement('div');
        ph.className = 'menu-item-img-placeholder';
        ph.innerHTML = '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span>Image coming soon</span>';
        wrap.appendChild(img);
        wrap.appendChild(ph);
        card.insertBefore(wrap, card.firstChild);
        return wrap;
    }

    // 1. Menu items — overlay availability, price & image updates
    db.collection('menu').onSnapshot(function(snapshot) {
        removeMenuSkeletons();
        var menuData = {};
        snapshot.forEach(function(doc) {
            menuData[doc.id] = doc.data();
        });

        document.querySelectorAll('.menu-item-card[data-id]').forEach(function(card) {
            var itemId = card.dataset.id;
            var item = menuData[itemId];

            // Hide card if item was deleted from Firestore
            if (!item) {
                card.style.display = 'none';
                return;
            }
            card.style.display = '';

            // Availability
            if (!item.available) {
                card.classList.add('item-unavailable');
                card.style.opacity = '0.45';
                card.style.pointerEvents = 'none';
                card.style.filter = 'grayscale(0.3)';
            } else {
                card.classList.remove('item-unavailable');
                card.style.opacity = '';
                card.style.pointerEvents = '';
                card.style.filter = '';
            }

            // Price sync
            var btn = card.querySelector('.add-to-cart');
            if (btn && item.price !== parseInt(btn.dataset.price)) {
                btn.dataset.price = item.price;
                var priceEl = card.querySelector('.price');
                if (priceEl) priceEl.innerHTML = '&#8377;' + item.price;
            }

            // Image sync
            var imgWrap = ensureImageWrap(card);
            var imgEl = imgWrap.querySelector('.menu-item-img');
            if (item.imageUrl) {
                if (imgEl.dataset.currentUrl !== item.imageUrl) {
                    imgEl.dataset.currentUrl = item.imageUrl;
                    imgEl.src = item.imageUrl;
                    imgEl.onload = function() {
                        imgEl.classList.add('loaded');
                        imgWrap.classList.add('has-image');
                    };
                    imgEl.onerror = function() {
                        imgEl.classList.remove('loaded');
                        imgWrap.classList.remove('has-image');
                        imgEl.src = '';
                    };
                }
                card.dataset.imageUrl = item.imageUrl;
            } else {
                imgEl.classList.remove('loaded');
                imgWrap.classList.remove('has-image');
                imgEl.src = '';
                imgEl.dataset.currentUrl = '';
                delete card.dataset.imageUrl;
            }
        });

        // Apply flame badges after menu data is loaded
        applyFlameBadges();
    }, function(error) {
        console.error('Menu listener error:', error);
        removeMenuSkeletons();
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
                return '<div class="testimonial-card" onclick="openVideoLightbox(\'' + (t.videoUrl || '') + '\')">' +
                    '<div class="testimonial-thumb">' +
                        (thumb ? '<img src="' + thumb + '" alt="" loading="lazy">' : '<div class="testimonial-placeholder">🎬</div>') +
                        '<div class="testimonial-play">&#9654;</div>' +
                    '</div>' +
                    '<p class="testimonial-name">' + (t.customerName || '') + '</p>' +
                    (t.caption ? '<p class="testimonial-caption">' + t.caption + '</p>' : '') +
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
                var linkOpen = p.link ? '<a href="' + p.link + '" target="_blank" rel="noopener">' : '<div>';
                var linkClose = p.link ? '</a>' : '</div>';
                return linkOpen + '<div class="social-card"><img src="' + p.imageUrl + '" alt="" loading="lazy">' +
                    (p.caption ? '<span class="social-caption">' + p.caption + '</span>' : '') +
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
