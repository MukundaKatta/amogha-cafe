import { safeGetItem, safeSetItem, lockScroll, unlockScroll } from '../core/utils.js';
import { getCurrentUser, setCurrentUser, showAuthToast } from './auth.js';
import { cart, updateCartCount, saveCart, updateFloatingCart, updateCartFab, addToCart, displayCart } from './cart.js';
import { ITEM_PAIRINGS, ITEM_PRICES, HAPPY_HOURS, TRANSLATIONS } from '../core/constants.js';
import { getDb } from '../core/firebase.js';

// ===== SPICE LEVEL SELECTOR =====
export function selectSpice(el) {
    const selector = el.parentElement;
    selector.querySelectorAll('.spice-level').forEach(s => s.classList.remove('active'));
    el.classList.add('active');
}
window.selectSpice = selectSpice;

// ===== REVIEWS CAROUSEL =====
export function initReviewsCarousel() {
    const carousel = document.getElementById('reviews-carousel');
    if (!carousel) return;
    let carouselIndex = 0;
    let autoSlide;

    function getVisibleCount() {
        if (window.innerWidth <= 768) return 1;
        if (window.innerWidth <= 1024) return 2;
        return 3;
    }

    function getCardWidth() {
        const card = carousel.querySelector('.review-card');
        if (!card) return 0;
        const style = window.getComputedStyle(card);
        return card.offsetWidth + parseFloat(style.marginLeft) + parseFloat(style.marginRight);
    }

    function slideToIndex() {
        const cardWidth = getCardWidth();
        carousel.style.transform = `translateX(-${carouselIndex * cardWidth}px)`;
    }

    window.moveCarousel = function(dir) {
        const cards = carousel.querySelectorAll('.review-card');
        const visible = getVisibleCount();
        const maxIndex = Math.max(0, cards.length - visible);
        carouselIndex = Math.max(0, Math.min(carouselIndex + dir, maxIndex));
        slideToIndex();
        resetAutoSlide();
    };

    function autoAdvance() {
        const cards = carousel.querySelectorAll('.review-card');
        const visible = getVisibleCount();
        const maxIndex = Math.max(0, cards.length - visible);
        carouselIndex++;
        if (carouselIndex > maxIndex) carouselIndex = 0;
        slideToIndex();
    }

    function resetAutoSlide() {
        clearInterval(autoSlide);
        autoSlide = setInterval(autoAdvance, 4000);
    }

    const carouselWrapper = document.querySelector('.reviews-carousel-wrapper');
    if (carouselWrapper) {
        carouselWrapper.addEventListener('mouseenter', () => { clearInterval(autoSlide); });
        carouselWrapper.addEventListener('mouseleave', () => { resetAutoSlide(); });
    }

    window.addEventListener('resize', () => {
        carouselIndex = 0;
        slideToIndex();
        resetAutoSlide();
    });

    autoSlide = setInterval(autoAdvance, 4000);
}

// ===== GALLERY SLIDESHOW =====
export function initGallerySlideshow() {
    const slides = document.querySelectorAll('.gallery-slide');
    const dotsContainer = document.getElementById('gallery-dots');
    let currentSlide = 0;

    if (dotsContainer && slides.length > 1) {
        slides.forEach((_, i) => {
            const dot = document.createElement('button');
            dot.className = 'gallery-dot' + (i === 0 ? ' active' : '');
            dot.addEventListener('click', () => goToGallerySlide(i));
            dotsContainer.appendChild(dot);
        });
    }

    function goToGallerySlide(index) {
        slides.forEach(s => s.classList.remove('active'));
        if (slides[index]) slides[index].classList.add('active');
        currentSlide = index;
        const dots = document.querySelectorAll('.gallery-dot');
        dots.forEach((d, i) => d.classList.toggle('active', i === index));
    }

    window.moveGallerySlide = function(dir) {
        if (slides.length === 0) return;
        let next = (currentSlide + dir + slides.length) % slides.length;
        goToGallerySlide(next);
    };

    if (slides.length > 1) {
        setInterval(() => { window.moveGallerySlide(1); }, 5000);
    }
}

// ===== GALLERY LIGHTBOX =====
export function initGalleryLightbox() {
    const galleryImgs = document.querySelectorAll('.gallery-item img');
    const slideImgs = document.querySelectorAll('.gallery-slide-item img');
    const allImages = [...galleryImgs, ...slideImgs];
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    let currentLightboxIndex = 0;

    allImages.forEach((img, index) => {
        img.addEventListener('click', () => {
            currentLightboxIndex = index;
            lightboxImg.src = img.src;
            lightbox.classList.add('active');
            lockScroll();
        });
    });

    window.closeLightbox = function() {
        lightbox.classList.remove('active');
        unlockScroll();
    };

    window.navigateLightbox = function(dir) {
        currentLightboxIndex = (currentLightboxIndex + dir + allImages.length) % allImages.length;
        lightboxImg.src = allImages[currentLightboxIndex].src;
    };

    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('active')) return;
        if (e.key === 'Escape') window.closeLightbox();
        if (e.key === 'ArrowLeft') window.navigateLightbox(-1);
        if (e.key === 'ArrowRight') window.navigateLightbox(1);
    });
}

// ===== VIDEO LIGHTBOX =====
export function openVideoLightbox(url) {
    if (!url) return;
    var lb = document.getElementById('video-lightbox');
    var vid = document.getElementById('lightbox-video');
    if (!lb || !vid) return;
    vid.src = url;
    lb.style.display = 'flex';
    vid.play();
}

export function closeVideoLightbox() {
    var lb = document.getElementById('video-lightbox');
    var vid = document.getElementById('lightbox-video');
    if (lb) lb.style.display = 'none';
    if (vid) { vid.pause(); vid.src = ''; }
}

// ===== CUSTOMER REVIEWS & RATINGS =====
export function openReviewModal(orderItems) {
    var user = getCurrentUser();
    if (!user) return;
    var modal = document.getElementById('review-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'review-modal';
        modal.className = 'modal';
        modal.innerHTML = '<div class="modal-content review-modal-content"></div>';
        document.body.appendChild(modal);
        modal.addEventListener('click', function(e) { if (e.target === modal) modal.style.display = 'none'; });
    }
    var items = orderItems || cart.map(function(i) { return { name: i.name }; });
    var html = '<span class="close" onclick="document.getElementById(\'review-modal\').style.display=\'none\'">&times;</span>';
    html += '<h2>Rate Your Order</h2><p class="review-subtitle">Help us serve you better!</p>';
    html += '<div id="review-items">';
    items.forEach(function(item, idx) {
        html += '<div class="review-item" data-item="' + item.name + '">' +
            '<span class="review-item-name">' + item.name + '</span>' +
            '<div class="review-stars" data-idx="' + idx + '">';
        for (var s = 1; s <= 5; s++) {
            html += '<span class="review-star" data-star="' + s + '" onclick="setReviewStar(this, ' + idx + ', ' + s + ')">&#9734;</span>';
        }
        html += '</div></div>';
    });
    html += '</div>';
    html += '<textarea id="review-text" class="review-textarea" placeholder="Share your thoughts (optional)" maxlength="200"></textarea>';
    html += '<button class="cta-button" onclick="submitReviews()">Submit Review</button>';
    modal.querySelector('.review-modal-content').innerHTML = html;
    modal.style.display = 'block';
    window._reviewRatings = new Array(items.length).fill(0);
    window._reviewItems = items;
}

export function setReviewStar(el, idx, star) {
    window._reviewRatings[idx] = star;
    var container = el.parentElement;
    container.querySelectorAll('.review-star').forEach(function(s, i) {
        s.innerHTML = (i < star) ? '&#9733;' : '&#9734;';
        s.classList.toggle('active', i < star);
    });
}

export function submitReviews() {
    var user = getCurrentUser();
    if (!user) return;
    var text = document.getElementById('review-text').value.trim();
    var db = getDb();
    var batch = db.batch();
    var hasRating = false;
    window._reviewItems.forEach(function(item, idx) {
        var rating = window._reviewRatings[idx];
        if (rating > 0) {
            hasRating = true;
            var ref = db.collection('reviews').doc();
            batch.set(ref, {
                itemName: item.name,
                rating: rating,
                text: text,
                userName: user.name,
                userPhone: user.phone,
                createdAt: new Date().toISOString()
            });
        }
    });
    if (!hasRating) {
        showAuthToast('Please rate at least one item');
        return;
    }
    batch.commit().then(function() {
        document.getElementById('review-modal').style.display = 'none';
        showAuthToast('Thank you for your review!');
        setTimeout(function() {
            if (typeof window.loadMenuRatings === 'function') window.loadMenuRatings();
        }, 1000);
    }).catch(function() {
        showAuthToast('Failed to submit review. Please try again.');
    });
}

export function scheduleReviewPrompt(orderItems) {
    setTimeout(function() {
        if (getCurrentUser()) {
            openReviewModal(orderItems);
        }
    }, 60000); // 1 minute after order
}

// ===== COMBO MEAL BUILDER =====
export function initComboMealBuilder() {
    var COMBO_ITEMS = {
        biryanis: [
            { name: 'Veg Dum Biryani', price: 179 },
            { name: 'Paneer Biryani', price: 219 },
            { name: 'Egg Biryani', price: 189 },
            { name: 'Chicken Fry Piece Biryani', price: 219 },
            { name: 'Chicken 65 Biryani', price: 249 },
            { name: 'Boneless Chicken Biryani', price: 219 }
        ],
        starters: [
            { name: 'Veg Manchurian', price: 169 },
            { name: 'Paneer 65', price: 189 },
            { name: 'Chicken 65', price: 200 },
            { name: 'Chicken Hot Wings', price: 220 },
            { name: 'Chilli Chicken', price: 200 }
        ],
        drinks: [
            { name: 'Tea', price: 30 },
            { name: 'Coffee', price: 40 },
            { name: 'Lassi', price: 50 },
            { name: 'Buttermilk', price: 35 },
            { name: 'Fresh Lime Soda', price: 45 }
        ]
    };

    var selected = { biryani: null, starter: null, drink: null };
    var DISCOUNT = 0.15;

    function renderOptions(containerId, items, category) {
        var container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = items.map(function(item) {
            return '<button class="combo-option" data-category="' + category + '" data-name="' + item.name + '" data-price="' + item.price + '">' +
                '<span class="combo-opt-name">' + item.name + '</span>' +
                '<span class="combo-opt-price">\u20B9' + item.price + '</span>' +
            '</button>';
        }).join('');
    }

    function initCombo() {
        renderOptions('combo-biryanis', COMBO_ITEMS.biryanis, 'biryani');
        renderOptions('combo-starters', COMBO_ITEMS.starters, 'starter');
        renderOptions('combo-drinks', COMBO_ITEMS.drinks, 'drink');
    }

    document.addEventListener('click', function(e) {
        var opt = e.target.closest('.combo-option');
        if (!opt) return;
        var cat = opt.dataset.category;
        var name = opt.dataset.name;
        var price = parseInt(opt.dataset.price);

        opt.parentElement.querySelectorAll('.combo-option').forEach(function(o) {
            o.classList.remove('selected');
        });
        opt.classList.add('selected');
        selected[cat] = { name: name, price: price };
        updateComboSummary();
    });

    function updateComboSummary() {
        var summaryEl = document.getElementById('combo-selected');
        var originalEl = document.getElementById('combo-original');
        var totalEl = document.getElementById('combo-total');
        var addBtn = document.getElementById('combo-add-btn');
        if (!summaryEl) return;

        var parts = [];
        var total = 0;
        if (selected.biryani) { parts.push(selected.biryani.name); total += selected.biryani.price; }
        if (selected.starter) { parts.push(selected.starter.name); total += selected.starter.price; }
        if (selected.drink) { parts.push(selected.drink.name); total += selected.drink.price; }

        summaryEl.textContent = parts.length > 0 ? parts.join(' + ') : 'Select items above';

        if (total > 0) {
            var discountedTotal = Math.round(total * (1 - DISCOUNT));
            originalEl.textContent = '\u20B9' + total;
            originalEl.style.textDecoration = 'line-through';
            totalEl.textContent = '\u20B9' + discountedTotal;
        } else {
            originalEl.textContent = '';
            totalEl.textContent = '';
        }

        if (addBtn) addBtn.disabled = !(selected.biryani && selected.starter && selected.drink);
    }

    window.openComboModal = function() {
        initCombo();
        selected = { biryani: null, starter: null, drink: null };
        updateComboSummary();
        var modal = document.getElementById('combo-modal');
        if (modal) {
            modal.style.display = 'block';
            lockScroll();
        }
    };

    window.closeComboModal = function() {
        var modal = document.getElementById('combo-modal');
        if (modal) {
            modal.style.display = 'none';
            unlockScroll();
        }
    };

    var comboModalEl = document.getElementById('combo-modal');
    if (comboModalEl) {
        comboModalEl.addEventListener('click', function(e) {
            if (e.target === comboModalEl) window.closeComboModal();
        });
    }

    window.addComboToCart = function() {
        if (!selected.biryani || !selected.starter || !selected.drink) return;
        var total = selected.biryani.price + selected.starter.price + selected.drink.price;
        var discounted = Math.round(total * (1 - DISCOUNT));
        var comboName = 'Combo: ' + selected.biryani.name + ' + ' + selected.starter.name + ' + ' + selected.drink.name;

        var existingItem = cart.find(function(item) { return item.name === comboName; });
        if (existingItem) {
            existingItem.quantity++;
        } else {
            cart.push({ name: comboName, price: discounted, quantity: 1 });
        }
        updateCartCount();
        saveCart();
        updateFloatingCart();
        updateCartFab();
        showAuthToast('Combo added! You saved \u20B9' + (total - discounted));
        window.closeComboModal();
    };
}

// ===== HAPPY HOUR PRICING =====
export function getActiveHappyHour() {
    var now = new Date();
    var day = now.getDay();
    var hour = now.getHours();
    for (var i = 0; i < HAPPY_HOURS.length; i++) {
        var hh = HAPPY_HOURS[i];
        if (hh.days.indexOf(day) !== -1 && hour >= hh.startHour && hour < hh.endHour) {
            return hh;
        }
    }
    return null;
}

export function applyHappyHourPricing() {
    var hh = getActiveHappyHour();
    var banner = document.getElementById('happy-hour-banner');
    if (!hh) {
        if (banner) banner.style.display = 'none';
        document.querySelectorAll('.hh-price').forEach(function(el) { el.remove(); });
        document.querySelectorAll('.price.hh-crossed').forEach(function(el) { el.classList.remove('hh-crossed'); });
        return;
    }
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'happy-hour-banner';
        banner.className = 'happy-hour-banner';
        var menuSection = document.getElementById('menu');
        if (menuSection) menuSection.insertBefore(banner, menuSection.firstChild);
    }
    var endTime = new Date();
    endTime.setHours(hh.endHour, 0, 0, 0);
    var remaining = Math.max(0, endTime - new Date());
    var mins = Math.floor(remaining / 60000);
    var secs = Math.floor((remaining % 60000) / 1000);
    banner.innerHTML = '<span class="hh-icon">🔥</span> <strong class="hh-text">' + hh.label + '</strong> <span class="hh-timer">Ends in ' + mins + 'm ' + secs + 's</span>';
    banner.style.display = 'flex';
    document.querySelectorAll('.menu-item-card').forEach(function(card) {
        var priceEl = card.querySelector('.price');
        if (!priceEl) return;
        var catEl = card.closest('.menu-category');
        if (!catEl) return;
        var catId = (catEl.id || '').toLowerCase();
        var isApplicable = hh.categories.indexOf('all') !== -1;
        if (!isApplicable) {
            hh.categories.forEach(function(c) {
                if (catId.indexOf(c) !== -1) isApplicable = true;
            });
        }
        if (!isApplicable) return;
        var origPrice = parseInt(priceEl.textContent.replace(/[^\d]/g, ''));
        var discPrice = Math.round(origPrice * (1 - hh.discount / 100));
        priceEl.classList.add('hh-crossed');
        var existing = card.querySelector('.hh-price');
        if (!existing) {
            var hhPrice = document.createElement('span');
            hhPrice.className = 'hh-price';
            hhPrice.textContent = '\u20B9' + discPrice;
            priceEl.after(hhPrice);
        } else {
            existing.textContent = '\u20B9' + discPrice;
        }
    });
}

// ===== AI RECOMMENDATIONS (RULE-BASED) =====
export function getRecommendations() {
    if (cart.length === 0) return [];
    var recs = {};
    var cartNames = cart.map(function(i) { return i.name; });
    cartNames.forEach(function(name) {
        var pairings = ITEM_PAIRINGS[name] || [];
        pairings.forEach(function(rec) {
            if (cartNames.indexOf(rec) === -1 && ITEM_PRICES[rec]) {
                recs[rec] = (recs[rec] || 0) + 1;
            }
        });
    });
    var sorted = Object.keys(recs).sort(function(a, b) { return recs[b] - recs[a]; });
    return sorted.slice(0, 4).map(function(name) {
        return { name: name, price: ITEM_PRICES[name] };
    });
}

export function showRecommendations() {
    var container = document.getElementById('cart-recommendations');
    if (!container) return;
    var recs = getRecommendations();
    if (recs.length === 0) {
        container.style.display = 'none';
        return;
    }
    var html = '<p class="rec-title">You might also like:</p><div class="rec-items">';
    recs.forEach(function(r) {
        html += '<button class="rec-item" onclick="addToCart(\'' + r.name.replace(/'/g, "\\'") + '\', ' + r.price + '); displayCart(); showRecommendations();">' +
            '<span class="rec-name">' + r.name + '</span>' +
            '<span class="rec-price">\u20B9' + r.price + '</span>' +
            '<span class="rec-add">+</span>' +
        '</button>';
    });
    html += '</div>';
    container.innerHTML = html;
    container.style.display = 'block';
}

// ===== VOICE ORDERING (WEB SPEECH API) =====
export var voiceActive = false;
export var voiceRecognition = null;

export function initVoiceOrdering() {
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    voiceRecognition = new SpeechRecognition();
    voiceRecognition.continuous = false;
    voiceRecognition.interimResults = true;
    voiceRecognition.lang = 'en-IN';
    voiceRecognition.onresult = function(event) {
        var transcript = '';
        for (var i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }
        updateVoiceOverlay(transcript);
        if (event.results[event.resultIndex].isFinal) {
            processVoiceCommand(transcript);
        }
    };
    voiceRecognition.onend = function() {
        if (voiceActive) {
            voiceActive = false;
            hideVoiceOverlay();
        }
    };
    voiceRecognition.onerror = function() {
        voiceActive = false;
        hideVoiceOverlay();
    };
    var voiceBtn = document.createElement('button');
    voiceBtn.id = 'voice-order-btn';
    voiceBtn.className = 'voice-order-btn';
    voiceBtn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';
    voiceBtn.title = 'Voice Order';
    voiceBtn.onclick = toggleVoice;
    document.body.appendChild(voiceBtn);
}

export function toggleVoice() {
    if (voiceActive) {
        voiceRecognition.stop();
        voiceActive = false;
        hideVoiceOverlay();
    } else {
        voiceActive = true;
        showVoiceOverlay();
        voiceRecognition.start();
    }
}

export function showVoiceOverlay() {
    var overlay = document.getElementById('voice-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'voice-overlay';
        overlay.className = 'voice-overlay';
        overlay.innerHTML = '<div class="voice-content">' +
            '<div class="voice-waves"><span></span><span></span><span></span><span></span><span></span></div>' +
            '<p class="voice-status">Listening...</p>' +
            '<p class="voice-transcript" id="voice-transcript"></p>' +
            '<p class="voice-hint">Say "Add chicken biryani" or "2 butter naan"</p>' +
            '<button class="voice-close" onclick="toggleVoice()">Cancel</button>' +
        '</div>';
        document.body.appendChild(overlay);
    }
    overlay.classList.add('active');
    document.getElementById('voice-transcript').textContent = '';
}

function hideVoiceOverlay() {
    var overlay = document.getElementById('voice-overlay');
    if (overlay) overlay.classList.remove('active');
}

function updateVoiceOverlay(text) {
    var el = document.getElementById('voice-transcript');
    if (el) el.textContent = text;
}

function processVoiceCommand(text) {
    text = text.toLowerCase().trim();
    var qtyMatch = text.match(/^(?:add\s+)?(\d+)\s+/);
    var qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
    var searchText = text.replace(/^(?:add\s+)?(\d+\s+)?/, '').replace(/^add\s+/, '');
    var bestMatch = null;
    var bestScore = 0;
    Object.keys(ITEM_PRICES).forEach(function(item) {
        var itemLower = item.toLowerCase();
        var score = 0;
        if (itemLower === searchText) score = 100;
        else if (itemLower.indexOf(searchText) !== -1) score = 80;
        else if (searchText.indexOf(itemLower) !== -1) score = 70;
        else {
            var words = searchText.split(' ');
            words.forEach(function(w) {
                if (w.length > 2 && itemLower.indexOf(w) !== -1) score += 20;
            });
        }
        if (score > bestScore) {
            bestScore = score;
            bestMatch = item;
        }
    });
    if (bestMatch && bestScore >= 20) {
        for (var i = 0; i < qty; i++) {
            addToCart(bestMatch, ITEM_PRICES[bestMatch]);
        }
        showAuthToast('Added ' + qty + 'x ' + bestMatch + ' to cart');
        hideVoiceOverlay();
    } else if (text.indexOf('checkout') !== -1 || text.indexOf('check out') !== -1) {
        if (typeof window.checkout === 'function') window.checkout();
        hideVoiceOverlay();
    } else if (text.indexOf('clear') !== -1) {
        if (typeof window.clearCart === 'function') window.clearCart();
        hideVoiceOverlay();
    } else {
        showAuthToast('Could not find: "' + searchText + '". Try again.');
    }
}

// ===== MULTI-LANGUAGE SUPPORT =====
export var currentLang = safeGetItem('amoghaLang') || 'en';

export function switchLanguage(lang) {
    currentLang = lang;
    safeSetItem('amoghaLang', lang);
    applyTranslations();
    document.querySelectorAll('.lang-btn').forEach(function(b) {
        b.classList.toggle('active', b.dataset.lang === lang);
    });
}


export function applyTranslations() {
    var t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
        var key = el.dataset.i18n;
        if (t[key]) {
            if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el.placeholder !== undefined) {
                el.placeholder = t[key];
            } else {
                el.textContent = t[key];
            }
        }
    });
}

// ===== REFERRAL PROGRAM =====
export function generateReferralCode(user) {
    if (!user) return '';
    var namePart = (user.name || 'USER').replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 4);
    var phonePart = (user.phone || '0000').slice(-4);
    return namePart + phonePart;
}

export function openReferralModal() {
    var user = getCurrentUser();
    if (!user) {
        if (typeof window.openAuthModal === 'function') window.openAuthModal();
        return;
    }
    var code = user.referralCode || generateReferralCode(user);
    if (!user.referralCode) {
        user.referralCode = code;
        setCurrentUser(user);
        var db = getDb();
        if (db) {
            db.collection('users').doc(user.phone).update({ referralCode: code }).catch(function(e) { console.error('Referral code save error:', e); });
        }
    }
    var modal = document.getElementById('referral-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'referral-modal';
        modal.className = 'modal';
        modal.innerHTML = '<div class="modal-content referral-content"></div>';
        document.body.appendChild(modal);
        modal.addEventListener('click', function(e) { if (e.target === modal) modal.style.display = 'none'; });
    }
    var shareMsg = 'Order from Amogha Cafe & get Rs.50 off your first order! Use my referral code: ' + code + ' when signing up. Order at ' + window.location.origin;
    modal.querySelector('.referral-content').innerHTML =
        '<span class="close" onclick="document.getElementById(\'referral-modal\').style.display=\'none\'">&times;</span>' +
        '<h2>Refer a Friend</h2>' +
        '<p class="referral-subtitle">Share your code and both get rewarded!</p>' +
        '<div class="referral-code-box">' +
            '<span class="referral-code">' + code + '</span>' +
            '<button class="referral-copy" onclick="safeCopy(\'' + code + '\',this)">Copy</button>' +
        '</div>' +
        '<div class="referral-rewards">' +
            '<div class="referral-reward"><span class="referral-reward-icon">🎁</span><span>Your friend gets <strong>Rs.50 off</strong> first order</span></div>' +
            '<div class="referral-reward"><span class="referral-reward-icon">⭐</span><span>You get <strong>100 loyalty points</strong></span></div>' +
        '</div>' +
        '<a class="whatsapp-btn referral-share" href="https://wa.me/?text=' + encodeURIComponent(shareMsg) + '" target="_blank">Share via WhatsApp</a>';
    modal.style.display = 'block';
}

export function closeReferralModal() {
    var modal = document.getElementById('referral-modal');
    if (modal) modal.style.display = 'none';
}

export function applyReferralAtSignup(referralCode) {
    if (!referralCode) return;
    var db = getDb();
    if (!db) return;
    referralCode = referralCode.toUpperCase().trim();
    db.collection('users').where('referralCode', '==', referralCode).limit(1).get().then(function(snap) {
        if (snap.empty) return;
        var referrerDoc = snap.docs[0];
        var referrerData = referrerDoc.data();
        var newUser = getCurrentUser();
        if (!newUser || referrerData.phone === newUser.phone) return;
        db.collection('referrals').add({
            referrerPhone: referrerData.phone,
            refereePhone: newUser.phone,
            redeemed: false,
            createdAt: new Date().toISOString()
        }).catch(function(e) { console.error('Referral save error:', e); });
        newUser.referralDiscount = 50;
        setCurrentUser(newUser);
        showAuthToast('Referral applied! Rs.50 off your first order!');
    });
}

// ===== RE-ORDER FROM HISTORY =====
export function openMyOrders() {
    var user = getCurrentUser();
    if (!user) {
        if (typeof window.openAuthModal === 'function') window.openAuthModal();
        return;
    }
    var modal = document.getElementById('myorders-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'myorders-modal';
        modal.className = 'modal';
        modal.innerHTML = '<div class="modal-content myorders-content"><span class="close" onclick="document.getElementById(\'myorders-modal\').style.display=\'none\'">&times;</span><h2>My Orders</h2><div id="myorders-list" class="myorders-list"><p>Loading...</p></div></div>';
        document.body.appendChild(modal);
        modal.addEventListener('click', function(e) { if (e.target === modal) modal.style.display = 'none'; });
    }
    modal.style.display = 'block';
    var listEl = document.getElementById('myorders-list');
    listEl.innerHTML = '<p style="text-align:center;color:#a09080">Loading orders...</p>';
    var db = getDb();
    if (!db) {
        listEl.innerHTML = '<p style="text-align:center;color:#a09080;padding:2rem">Service unavailable. Please refresh.</p>';
        return;
    }
    db.collection('orders').where('userId', '==', user.phone).orderBy('createdAt', 'desc').limit(10).get().then(function(snap) {
        if (snap.empty) {
            listEl.innerHTML = '<p style="text-align:center;color:#a09080;padding:2rem">No orders yet. Place your first order!</p>';
            return;
        }
        var html = '';
        snap.forEach(function(doc) {
            var o = doc.data();
            var d = o.createdAt ? new Date(o.createdAt) : new Date();
            var dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
            var statusColors = { pending: '#f39c12', confirmed: '#3498db', preparing: '#e67e22', delivered: '#27ae60', cancelled: '#e74c3c' };
            var statusColor = statusColors[o.status] || '#999';
            var items = (o.items || []).map(function(i) { return i.name + ' x' + i.qty; }).join(', ');
            html += '<div class="myorder-card">' +
                '<div class="myorder-header">' +
                    '<span class="myorder-date">' + dateStr + '</span>' +
                    '<span class="myorder-status" style="color:' + statusColor + '">' + (o.status || 'pending').toUpperCase() + '</span>' +
                '</div>' +
                '<p class="myorder-items">' + items + '</p>' +
                '<div class="myorder-footer">' +
                    '<span class="myorder-total">Rs.' + (o.total || 0) + '</span>' +
                    '<button class="myorder-reorder-btn" onclick="reorderFromHistory(\'' + doc.id + '\')">Order Again</button>' +
                '</div>' +
            '</div>';
        });
        listEl.innerHTML = html;
        safeSetItem('amoghaMyOrders', JSON.stringify(snap.docs.map(function(d) { return { id: d.id, data: d.data() }; })));
    }).catch(function(err) {
        console.error('Load orders error:', err);
        var cached = safeGetItem('amoghaMyOrders');
        if (cached) {
            var orders = JSON.parse(cached);
            var html = '';
            orders.forEach(function(entry) {
                var o = entry.data;
                var d = o.createdAt ? new Date(o.createdAt) : new Date();
                var dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                var items = (o.items || []).map(function(i) { return i.name + ' x' + i.qty; }).join(', ');
                html += '<div class="myorder-card"><div class="myorder-header"><span class="myorder-date">' + dateStr + '</span><span class="myorder-status">' + (o.status || '').toUpperCase() + '</span></div><p class="myorder-items">' + items + '</p><div class="myorder-footer"><span class="myorder-total">Rs.' + (o.total || 0) + '</span><button class="myorder-reorder-btn" onclick="reorderFromHistory(\'' + entry.id + '\')">Order Again</button></div></div>';
            });
            listEl.innerHTML = html;
        } else {
            listEl.innerHTML = '<p style="text-align:center;color:#e74c3c">Failed to load orders. Please try again.</p>';
        }
    });
}

export function closeMyOrders() {
    var modal = document.getElementById('myorders-modal');
    if (modal) modal.style.display = 'none';
}

export function reorderFromHistory(orderId) {
    var cached = safeGetItem('amoghaMyOrders');
    if (cached) {
        var orders = JSON.parse(cached);
        var found = orders.find(function(e) { return e.id === orderId; });
        if (found && found.data.items) {
            found.data.items.forEach(function(item) {
                for (var q = 0; q < item.qty; q++) {
                    addToCart(item.name, item.price);
                }
            });
            document.getElementById('myorders-modal').style.display = 'none';
            showAuthToast('Items added to cart! Review and checkout.');
            return;
        }
    }
    var db = getDb();
    db.collection('orders').doc(orderId).get().then(function(doc) {
        if (doc.exists && doc.data().items) {
            doc.data().items.forEach(function(item) {
                for (var q = 0; q < item.qty; q++) {
                    addToCart(item.name, item.price);
                }
            });
            document.getElementById('myorders-modal').style.display = 'none';
            showAuthToast('Items added to cart! Review and checkout.');
        }
    });
}

// ===== SCHEDULED ORDERS =====
export function initScheduledOrders() {
    var checkbox = document.getElementById('schedule-order-check');
    var fields = document.getElementById('schedule-fields');
    var dateInput = document.getElementById('schedule-date');
    var timeSelect = document.getElementById('schedule-time');
    if (!checkbox || !fields || !dateInput || !timeSelect) return;

    checkbox.addEventListener('change', function() {
        fields.style.display = this.checked ? 'block' : 'none';
        if (this.checked) {
            setupDateLimits();
            populateTimeSlots();
        }
    });

    function setupDateLimits() {
        var today = new Date();
        var min = today.toISOString().split('T')[0];
        var maxDate = new Date(today);
        maxDate.setDate(maxDate.getDate() + 3);
        var max = maxDate.toISOString().split('T')[0];
        dateInput.min = min;
        dateInput.max = max;
        dateInput.value = min;
    }

    function populateTimeSlots() {
        var hours = [
            '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
            '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
            '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM',
            '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM',
            '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM',
            '9:00 PM'
        ];
        timeSelect.innerHTML = '<option value="">Select Time</option>';
        hours.forEach(function(h) {
            timeSelect.innerHTML += '<option value="' + h + '">' + h + '</option>';
        });
    }

    window.getScheduleInfo = function() {
        if (!checkbox.checked) return null;
        return { date: dateInput.value, time: timeSelect.value };
    };
}

export function initFeatures() {
    // Reviews carousel
    initReviewsCarousel();

    // Gallery slideshow
    initGallerySlideshow();

    // Gallery lightbox
    initGalleryLightbox();

    // Combo meal builder
    initComboMealBuilder();

    // Happy hour pricing (update every 60 seconds)
    applyHappyHourPricing();
    setInterval(applyHappyHourPricing, 60000);

    // Voice ordering (delayed)
    setTimeout(initVoiceOrdering, 1000);

    // Language switcher (delayed)
    setTimeout(function() {
        var nav = document.querySelector('.nav-links');
        if (!nav) return;
        var langLi = document.createElement('li');
        langLi.className = 'lang-switcher';
        langLi.innerHTML = '<button class="lang-btn' + (currentLang === 'en' ? ' active' : '') + '" data-lang="en" onclick="switchLanguage(\'en\')">EN</button>' +
            '<button class="lang-btn' + (currentLang === 'hi' ? ' active' : '') + '" data-lang="hi" onclick="switchLanguage(\'hi\')">हि</button>' +
            '<button class="lang-btn' + (currentLang === 'te' ? ' active' : '') + '" data-lang="te" onclick="switchLanguage(\'te\')">తె</button>';
        var themeToggle = nav.querySelector('.theme-toggle');
        if (themeToggle) {
            nav.insertBefore(langLi, themeToggle.parentElement);
        } else {
            nav.appendChild(langLi);
        }
        applyTranslations();
    }, 500);

    // Load ratings
    setTimeout(function() {
        if (typeof window.loadMenuRatings === 'function') window.loadMenuRatings();
    }, 2000);

    // Scheduled orders
    initScheduledOrders();

    // Hook displayCart to show recommendations
    var _origDisplayCart = window.displayCart;
    if (typeof _origDisplayCart === 'function') {
        window.displayCart = function() {
            _origDisplayCart();
            showRecommendations();
        };
    }
}

Object.assign(window, {
    selectSpice,
    moveCarousel: window.moveCarousel,
    moveGallerySlide: window.moveGallerySlide,
    closeLightbox: window.closeLightbox,
    navigateLightbox: window.navigateLightbox,
    openVideoLightbox,
    closeVideoLightbox,
    openReviewModal,
    setReviewStar,
    submitReviews,
    scheduleReviewPrompt,
    openComboModal: window.openComboModal,
    closeComboModal: window.closeComboModal,
    addComboToCart: window.addComboToCart,
    getActiveHappyHour,
    getRecommendations,
    showRecommendations,
    initVoiceOrdering,
    toggleVoice,
    showVoiceOverlay,
    switchLanguage,
    applyTranslations,
    openReferralModal,
    closeReferralModal,
    generateReferralCode,
    applyReferralAtSignup,
    openMyOrders,
    closeMyOrders,
    reorderFromHistory
});
