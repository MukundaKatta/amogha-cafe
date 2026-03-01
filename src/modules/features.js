import { safeGetItem, safeSetItem, lockScroll, unlockScroll } from '../core/utils.js';
import { getCurrentUser, setCurrentUser, showAuthToast } from './auth.js';
import { cart, updateCartCount, saveCart, updateFloatingCart, updateCartFab, addToCart, displayCart } from './cart.js';
import { ITEM_PAIRINGS, ITEM_PRICES, HAPPY_HOURS, TRANSLATIONS, DYNAMIC_PRICING_RULES } from '../core/constants.js';
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
    html += '<button class="cta-button" onclick="submitReviews()">Submit Review</button><span style="color:#D4A017;font-size:0.75rem;margin-left:8px">Earn 25 pts</span>';
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
        // Award 25 loyalty points for submitting a review
        var reviewUser = getCurrentUser();
        if (reviewUser) {
            reviewUser.loyaltyPoints = (reviewUser.loyaltyPoints || 0) + 25;
            setCurrentUser(reviewUser);
            var reviewDb = getDb();
            if (reviewDb) {
                reviewDb.collection('users').doc(reviewUser.phone).update({ loyaltyPoints: reviewUser.loyaltyPoints }).catch(function(e) { console.error('Review loyalty update error:', e); });
            }
            setTimeout(function() { showAuthToast('+25 loyalty points for your review!'); }, 1500);
        }
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
    var langMap = { en: 'en-IN', hi: 'hi-IN', te: 'te-IN' };
    voiceRecognition.lang = langMap[currentLang] || 'en-IN';
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

    // "Order my usual" / "same as last time" — reorder last order
    if (text.indexOf('my usual') !== -1 || text.indexOf('same as last') !== -1 || text.indexOf('last order') !== -1) {
        var cached = null;
        try { cached = JSON.parse(localStorage.getItem('amoghaMyOrders')); } catch(e) {}
        if (cached && cached.length > 0 && cached[0].id) {
            if (typeof window.reorderFromHistory === 'function') window.reorderFromHistory(cached[0].id);
            showAuthToast('Reordering your last order!');
            hideVoiceOverlay();
            return;
        }
    }

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
        // Gemini AI fallback for complex/unrecognized voice commands
        hideVoiceOverlay();
        showAuthToast('AI is interpreting your request...');
        fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, cart: [] })
        }).then(function(r) { return r.json(); }).then(function(data) {
            if (data.suggestedItems && data.suggestedItems.length > 0) {
                data.suggestedItems.forEach(function(item) { addToCart(item.name, item.price); });
                showAuthToast('Added ' + data.suggestedItems.length + ' item(s) via AI');
            } else {
                showAuthToast(data.reply || 'Could not understand. Try again.');
            }
        }).catch(function() {
            showAuthToast('Could not find: "' + searchText + '". Try again.');
        });
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

    // Dynamic pricing (load rules from Firestore)
    setTimeout(loadDynamicPricingRules, 1500);

    // Hook displayCart to show recommendations
    var _origDisplayCart = window.displayCart;
    if (typeof _origDisplayCart === 'function') {
        window.displayCart = function() {
            _origDisplayCart();
            showRecommendations();
        };
    }
}

// ===== UPSELL ENGINE =====
export function getUpsellItems(cartItems) {
    var cartNames = [];
    var i;
    for (i = 0; i < cartItems.length; i++) {
        cartNames.push(cartItems[i].name);
    }

    var suggestions = [];
    var seen = {};

    for (i = 0; i < cartItems.length; i++) {
        var itemName = cartItems[i].name;
        var pairings = ITEM_PAIRINGS[itemName];
        if (!pairings) continue;

        for (var j = 0; j < pairings.length; j++) {
            var paired = pairings[j];
            // Skip items already in cart or already suggested
            if (cartNames.indexOf(paired) !== -1) continue;
            if (seen[paired]) continue;

            var price = ITEM_PRICES[paired];
            if (!price) continue;

            seen[paired] = true;
            suggestions.push({
                name: paired,
                price: price,
                reason: 'Goes great with ' + itemName
            });

            if (suggestions.length >= 3) return suggestions;
        }
    }

    return suggestions;
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
    reorderFromHistory,
    loadDailySpecial,
    initComboBuilder,
    getUpsellItems
});

// ===== B3: WELCOME-BACK REORDER TOAST =====
export function showReorderToast() {
    var cached = null;
    try { cached = JSON.parse(localStorage.getItem('amoghaMyOrders')); } catch(e) {}
    if (!cached || !cached.length) return;
    var last = cached[0].data;
    if (!last || !last.items || !last.items.length) return;
    // Only show if last order was > 1 day ago
    if (last.createdAt) {
        var daysSince = (Date.now() - new Date(last.createdAt).getTime()) / 86400000;
        if (daysSince < 1) return;
    }
    var itemSummary = last.items.slice(0, 2).map(function(i) { return i.name; }).join(', ');
    if (last.items.length > 2) itemSummary += ' +' + (last.items.length - 2) + ' more';

    var toast = document.createElement('div');
    toast.className = 'reorder-toast';
    toast.innerHTML =
        '<div class="reorder-toast-text">' +
            '<div class="reorder-toast-title">Welcome back! 👋</div>' +
            '<div class="reorder-toast-sub">' + itemSummary + '</div>' +
        '</div>' +
        '<button class="reorder-toast-btn" id="reorder-toast-btn">Order Again</button>' +
        '<button class="reorder-toast-close" id="reorder-toast-close">&times;</button>';
    document.body.appendChild(toast);

    setTimeout(function() { toast.classList.add('show'); }, 100);

    var orderId = cached[0].id;
    toast.querySelector('#reorder-toast-btn').addEventListener('click', function() {
        if (typeof window.reorderFromHistory === 'function') window.reorderFromHistory(orderId);
        toast.classList.remove('show');
        setTimeout(function() { toast.remove(); }, 400);
    });
    toast.querySelector('#reorder-toast-close').addEventListener('click', function() {
        toast.classList.remove('show');
        setTimeout(function() { toast.remove(); }, 400);
    });
    setTimeout(function() {
        toast.classList.remove('show');
        setTimeout(function() { if (toast.parentNode) toast.remove(); }, 400);
    }, 8000);
}

// ===== D2: DAILY SPECIAL =====
export function loadDailySpecial() {
    var section = document.getElementById('daily-special-section');
    if (!section) return;
    var db = null;
    try { db = window.db; } catch(e) {}
    if (!db) { section.style.display = 'none'; return; }

    db.collection('settings').doc('dailySpecial').get().then(function(doc) {
        if (!doc.exists || !doc.data().active) { section.style.display = 'none'; return; }
        var d = doc.data();
        section.style.display = '';
        var imgEl   = section.querySelector('.daily-special-img');
        var phEl    = section.querySelector('.daily-special-img-placeholder');
        var titleEl = section.querySelector('.daily-special-title');
        var descEl  = section.querySelector('.daily-special-desc');
        var priceEl = section.querySelector('.daily-special-price');
        var addBtn  = section.querySelector('.daily-special-add-btn');

        if (d.imageUrl && imgEl) { imgEl.src = d.imageUrl; imgEl.style.display = 'block'; if (phEl) phEl.style.display = 'none'; }
        if (titleEl) titleEl.textContent = d.title || 'Chef\'s Special';
        if (descEl)  descEl.textContent  = d.description || '';
        if (priceEl) priceEl.innerHTML   = '&#8377;' + (d.price || '');
        if (addBtn && d.title) {
            addBtn.dataset.item  = d.title;
            addBtn.dataset.price = d.price || 0;
        }

        // Countdown to midnight
        function updateCountdown() {
            var now  = new Date();
            var midnight = new Date(); midnight.setHours(24, 0, 0, 0);
            var diff = Math.max(0, midnight - now);
            var h = Math.floor(diff / 3600000);
            var m = Math.floor((diff % 3600000) / 60000);
            var s = Math.floor((diff % 60000) / 1000);
            var hEl = section.querySelector('.cd-h');
            var mEl = section.querySelector('.cd-m');
            var sEl = section.querySelector('.cd-s');
            if (hEl) hEl.textContent = String(h).padStart(2,'0');
            if (mEl) mEl.textContent = String(m).padStart(2,'0');
            if (sEl) sEl.textContent = String(s).padStart(2,'0');
        }
        updateCountdown();
        setInterval(updateCountdown, 1000);
    }).catch(function() { section.style.display = 'none'; });
}

// ===== E1: COMBO BUILDER =====
export function initComboBuilder() {
    var section = document.getElementById('combo-builder-section');
    if (!section) return;

    var categories = {
        starter: ['Veg Manchurian', 'Paneer 65', 'Chicken 65', 'Chicken Hot Wings', 'Veg Spring Rolls', 'Chicken Lollipop', 'Paneer Tikka', 'Chicken Seekh Kebab', 'Tandoori Chicken'],
        main:    ['Paneer Butter Masala', 'Dal Tadka', 'Butter Chicken', 'Chicken Curry', 'Mutton Curry', 'Gongura Chicken', 'Veg Dum Biryani', 'Chicken Dum Biryani', 'Mutton Dum Biryani'],
        bread:   ['Butter Naan', 'Garlic Naan', 'Tandoori Roti', 'Butter Roti', 'Laccha Paratha'],
        drink:   ['Tea', 'Coffee', 'Lassi', 'Buttermilk', 'Fresh Lime Soda', 'Hot Chocolate']
    };

    var ITEM_PRICES_MAP = {};
    try {
        // Pull from menu cards if available
        document.querySelectorAll('.menu-item-card[data-id]').forEach(function(card) {
            var btn = card.querySelector('.add-to-cart');
            if (btn) ITEM_PRICES_MAP[card.dataset.id] = parseFloat(btn.dataset.price) || 0;
        });
    } catch(e) {}

    // Fallback prices from constants
    var fallback = {"Veg Manchurian":169,"Paneer 65":189,"Chicken 65":200,"Chicken Hot Wings":220,"Veg Spring Rolls":149,"Chicken Lollipop":230,"Paneer Tikka":209,"Chicken Seekh Kebab":229,"Tandoori Chicken":269,"Paneer Butter Masala":199,"Dal Tadka":149,"Butter Chicken":249,"Chicken Curry":219,"Mutton Curry":319,"Gongura Chicken":239,"Veg Dum Biryani":199,"Chicken Dum Biryani":249,"Mutton Dum Biryani":349,"Butter Naan":40,"Garlic Naan":50,"Tandoori Roti":30,"Butter Roti":35,"Laccha Paratha":45,"Tea":30,"Coffee":40,"Lassi":50,"Buttermilk":35,"Fresh Lime Soda":45,"Hot Chocolate":60};
    Object.keys(fallback).forEach(function(k) { if (!ITEM_PRICES_MAP[k]) ITEM_PRICES_MAP[k] = fallback[k]; });

    function populate(selectId, items) {
        var sel = section.querySelector('#' + selectId);
        if (!sel) return;
        sel.innerHTML = '<option value="">— Choose —</option>' +
            items.map(function(name) {
                var price = ITEM_PRICES_MAP[name] || 0;
                return '<option value="' + name + '" data-price="' + price + '">' + name + ' (₹' + price + ')</option>';
            }).join('');
    }
    populate('combo-starter', categories.starter);
    populate('combo-main',    categories.main);
    populate('combo-bread',   categories.bread);
    populate('combo-drink',   categories.drink);

    function updateComboPrice() {
        var total = 0;
        ['combo-starter','combo-main','combo-bread','combo-drink'].forEach(function(id) {
            var sel = section.querySelector('#' + id);
            if (sel && sel.value) {
                var opt = sel.options[sel.selectedIndex];
                total += parseFloat(opt.dataset.price) || 0;
            }
        });
        var discounted = Math.round(total * 0.80);
        var savings    = total - discounted;
        var origEl  = section.querySelector('.combo-original');
        var discEl  = section.querySelector('.combo-discounted');
        var saveEl  = section.querySelector('.combo-savings');
        var addBtn  = section.querySelector('.combo-add-btn');
        if (origEl)  origEl.textContent  = total > 0 ? '₹' + total : '';
        if (discEl)  discEl.textContent  = total > 0 ? '₹' + discounted : '₹0';
        if (saveEl)  saveEl.textContent  = total > 0 ? 'Save ₹' + savings : '';
        if (addBtn)  addBtn.disabled     = total === 0;
    }

    section.querySelectorAll('select').forEach(function(sel) {
        sel.addEventListener('change', updateComboPrice);
    });
    updateComboPrice();

    var addBtn = section.querySelector('.combo-add-btn');
    if (addBtn) {
        addBtn.addEventListener('click', function() {
            var added = 0;
            ['combo-starter','combo-main','combo-bread','combo-drink'].forEach(function(id) {
                var sel = section.querySelector('#' + id);
                if (!sel || !sel.value) return;
                var opt  = sel.options[sel.selectedIndex];
                var price = parseFloat(opt.dataset.price) || 0;
                // Apply 20% combo discount to each item
                var discountedPrice = Math.round(price * 0.80);
                if (typeof window.finalizeAddToCart === 'function') {
                    window.finalizeAddToCart(sel.value, discountedPrice, 'medium', []);
                }
                added++;
            });
            if (added > 0) {
                addBtn.textContent = '✓ Added to Cart!';
                addBtn.style.background = 'linear-gradient(135deg,#27ae60,#2ecc71)';
                setTimeout(function() {
                    addBtn.textContent = 'Add Combo to Cart';
                    addBtn.style.background = '';
                }, 2000);
            }
        });
    }
}

// ===== LIVE ORDER TICKER =====
export function initLiveOrderTicker() {
    const db = getDb();
    if (!db) return;
    const track = document.querySelector('.bar-ticker-track');
    if (!track) return;

    db.collection('orders').orderBy('createdAt', 'desc').limit(6).get()
        .then(function(snap) {
            const items = [];
            snap.forEach(function(doc) {
                const d = doc.data();
                // Extract first item name and mask customer to first name only
                const itemName = (d.items && d.items[0] && d.items[0].name) ? d.items[0].name : null;
                const rawName = (d.customerName || d.userName || '');
                const firstName = rawName.split(' ')[0] || 'Someone';
                if (itemName) items.push({ firstName, itemName });
            });
            // Only replace static content if we have 3+ real orders
            if (items.length < 3) return;

            function makeItem(emoji, text) {
                return `<div class="bar-ticker-item"><span>${emoji}</span><span>${text}</span></div><span class="bar-dot"></span>`;
            }
            const html = items.map(function(o) {
                return makeItem('🍛', `${o.firstName} just ordered ${o.itemName}`);
            }).join('');
            // Duplicate for seamless CSS marquee loop
            track.innerHTML = html + html;
        })
        .catch(function() {
            // Silently keep static ticker if Firestore fails
        });
}
window.initLiveOrderTicker = initLiveOrderTicker;

// ===== CATERING INQUIRY FORM =====
export function openCateringModal() {
    const modal = document.getElementById('catering-modal');
    if (!modal) return;
    modal.classList.add('active');
    lockScroll();
}
window.openCateringModal = openCateringModal;

export function closeCateringModal() {
    const modal = document.getElementById('catering-modal');
    if (!modal) return;
    modal.classList.remove('active');
    unlockScroll();
}
window.closeCateringModal = closeCateringModal;

export function submitCateringEnquiry() {
    const db = getDb();
    const name      = document.getElementById('catering-name')?.value.trim();
    const phone     = document.getElementById('catering-phone')?.value.trim();
    const eventType = document.getElementById('catering-event')?.value;
    const guests    = document.getElementById('catering-guests')?.value;
    const date      = document.getElementById('catering-date')?.value;
    const message   = document.getElementById('catering-message')?.value.trim();
    const btn       = document.getElementById('catering-submit-btn');

    if (!name || !phone || !eventType || !guests || !date) {
        alert('Please fill in all required fields.');
        return;
    }

    if (btn) { btn.disabled = true; btn.textContent = 'Submitting…'; }

    const payload = { name, phone, eventType, guestCount: parseInt(guests) || 0, date, message: message || '', createdAt: new Date().toISOString() };

    (db ? db.collection('cateringInquiries').add(payload) : Promise.reject('no db'))
        .then(function() {
            closeCateringModal();
            // Show success toast
            const toast = document.createElement('div');
            toast.className = 'catering-toast';
            toast.textContent = '✅ Catering enquiry received! We\'ll contact you within 24 hours.';
            document.body.appendChild(toast);
            setTimeout(function() { toast.classList.add('show'); }, 10);
            setTimeout(function() { toast.classList.remove('show'); setTimeout(function(){ toast.remove(); }, 400); }, 4000);
        })
        .catch(function() {
            alert('Could not submit. Please call us at +91 91210 04999.');
            if (btn) { btn.disabled = false; btn.textContent = 'Submit Enquiry'; }
        });
}
window.submitCateringEnquiry = submitCateringEnquiry;

// ===== ORDER AGAIN SECTION (Main Page) =====
export function initOrderAgainSection() {
    var section = document.getElementById('reorder-section');
    var container = document.getElementById('reorder-cards');
    if (!section || !container) return;

    var user = getCurrentUser();
    if (!user) { section.style.display = 'none'; return; }

    var cached = null;
    try { cached = JSON.parse(localStorage.getItem('amoghaMyOrders')); } catch(e) {}
    if (!cached || !cached.length) { section.style.display = 'none'; return; }

    var recent = cached.slice(0, 3);
    var html = '';
    recent.forEach(function(entry) {
        var o = entry.data;
        var d = o.createdAt ? new Date(o.createdAt) : new Date();
        var dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        var itemCount = (o.items || []).reduce(function(sum, i) { return sum + (i.qty || 1); }, 0);
        var total = o.total || 0;
        html += '<div class="reorder-card" style="min-width:220px;background:rgba(212,160,23,0.06);border:1px solid rgba(212,160,23,0.15);border-radius:14px;padding:1rem;scroll-snap-align:start;flex-shrink:0">' +
            '<div style="font-size:0.8rem;color:#a09080;margin-bottom:0.4rem">' + dateStr + '</div>' +
            '<div style="font-size:0.95rem;font-weight:600;color:var(--text-primary,#1a0f08);margin-bottom:0.3rem">' + itemCount + ' item' + (itemCount !== 1 ? 's' : '') + '</div>' +
            '<div style="font-size:1.05rem;font-weight:700;color:#D4A017;margin-bottom:0.7rem">Rs.' + total + '</div>' +
            '<button onclick="reorderFromHistory(\'' + entry.id + '\')" style="width:100%;padding:0.5rem;background:linear-gradient(135deg,#D4A017,#B8860B);color:#1a0f08;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:0.85rem">Reorder</button>' +
        '</div>';
    });
    container.innerHTML = html;
    section.style.display = 'block';
}
window.initOrderAgainSection = initOrderAgainSection;

// ===== DYNAMIC PRICING =====
export function loadDynamicPricingRules() {
    var db = getDb();
    if (!db) return;
    db.collection('settings').doc('dynamicPricing').get().then(function(doc) {
        if (doc.exists && doc.data().rules) {
            // Update the shared mutable array
            DYNAMIC_PRICING_RULES.length = 0;
            doc.data().rules.forEach(function(rule) {
                DYNAMIC_PRICING_RULES.push(rule);
            });
            applyDynamicPricing();
        }
    }).catch(function(err) {
        console.error('Dynamic pricing load error:', err);
    });
}
window.loadDynamicPricingRules = loadDynamicPricingRules;

export function getAdjustedPrice(basePrice, category) {
    if (!DYNAMIC_PRICING_RULES || DYNAMIC_PRICING_RULES.length === 0) return basePrice;
    var now = new Date();
    var day = now.getDay();
    var hour = now.getHours();
    var catLower = (category || '').toLowerCase();

    for (var i = 0; i < DYNAMIC_PRICING_RULES.length; i++) {
        var rule = DYNAMIC_PRICING_RULES[i];
        // Check day match
        var dayMatch = rule.day === 'all' || parseInt(rule.day) === day;
        if (!dayMatch) continue;
        // Check hour match
        if (hour < parseInt(rule.startHour) || hour >= parseInt(rule.endHour)) continue;
        // Check category match
        var cats = rule.categories || [];
        var catMatch = false;
        for (var j = 0; j < cats.length; j++) {
            if (cats[j].toLowerCase() === catLower) { catMatch = true; break; }
        }
        if (!catMatch) continue;
        // Apply multiplier
        return Math.round(basePrice * parseFloat(rule.multiplier));
    }
    return basePrice;
}
window.getAdjustedPrice = getAdjustedPrice;

export function applyDynamicPricing() {
    if (!DYNAMIC_PRICING_RULES || DYNAMIC_PRICING_RULES.length === 0) return;
    document.querySelectorAll('.menu-item-card').forEach(function(card) {
        var priceEl = card.querySelector('.price');
        if (!priceEl) return;
        // Skip if happy hour is already applied
        if (priceEl.classList.contains('hh-crossed')) return;

        var catEl = card.closest('.menu-category');
        if (!catEl) return;
        var category = '';
        // Try to get category from the section heading
        var heading = catEl.querySelector('h2, h3, .category-title');
        if (heading) category = heading.textContent.trim();
        if (!category) category = (catEl.id || '').replace('cat-', '');

        var origPrice = parseInt(priceEl.textContent.replace(/[^\d]/g, ''));
        if (!origPrice) return;

        var adjusted = getAdjustedPrice(origPrice, category);
        if (adjusted === origPrice) {
            // Remove any existing dynamic price
            var existingDp = card.querySelector('.dp-price');
            if (existingDp) existingDp.remove();
            priceEl.classList.remove('dp-crossed');
            return;
        }

        // Show strikethrough original + new price
        priceEl.classList.add('dp-crossed');
        var existing = card.querySelector('.dp-price');
        if (!existing) {
            var dpPrice = document.createElement('span');
            dpPrice.className = 'dp-price';
            dpPrice.textContent = '\u20B9' + adjusted;
            priceEl.after(dpPrice);
        } else {
            existing.textContent = '\u20B9' + adjusted;
        }
    });
}
window.applyDynamicPricing = applyDynamicPricing;

// ===== AI PICKS FOR YOU SECTION =====
export async function initAiForYou() {
    var section = document.getElementById('ai-for-you');
    var container = document.getElementById('ai-for-you-cards');
    if (!section || !container) return;

    // Check 30-minute cache
    try {
        var cached = JSON.parse(localStorage.getItem('ai_recommendations'));
        if (cached && (Date.now() - cached.ts) < 1800000) {
            renderAiForYou(section, container, cached.data);
            return;
        }
    } catch(e) {}

    var user = getCurrentUser();
    var orderHistory = [];
    try { var orders = JSON.parse(localStorage.getItem('amoghaMyOrders')); if (orders) orderHistory = orders.map(function(e) { return e.data; }); } catch(e) {}

    try {
        var resp = await fetch('/api/recommend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                orderHistory: orderHistory.slice(0, 10),
                currentCart: cart.map(function(i) { return { name: i.name }; }),
                timeOfDay: new Date().getHours(),
                isVegOnly: user && (user.dietaryPrefs || []).includes('Vegetarian')
            })
        });
        var data = await resp.json();
        if (data.recommendations && data.recommendations.length > 0) {
            renderAiForYou(section, container, data.recommendations);
            try { localStorage.setItem('ai_recommendations', JSON.stringify({ ts: Date.now(), data: data.recommendations })); } catch(e) {}
        }
    } catch(e) { section.style.display = 'none'; }
}

function renderAiForYou(section, container, recs) {
    var html = '';
    recs.forEach(function(rec) {
        html += '<div class="ai-rec-card">' +
            '<div class="ai-rec-name">' + rec.name + '</div>' +
            '<div class="ai-rec-reason">' + (rec.reason || '') + '</div>' +
            '<div class="ai-rec-price">&#8377;' + rec.price + '</div>' +
            '<button class="add-to-cart" onclick="addToCart(\'' + rec.name.replace(/'/g, "\\'") + '\', ' + rec.price + ', this)">Add to Order</button>' +
        '</div>';
    });
    container.innerHTML = html;
    section.style.display = 'block';
}

// ===== AI MEAL PLANNER MODAL =====
export function openMealPlannerModal() {
    var existing = document.getElementById('meal-planner-overlay');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'meal-planner-overlay';
    overlay.className = 'meal-planner-overlay';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML =
        '<div class="meal-planner-card">' +
            '<div class="meal-planner-header">' +
                '<h2><span class="ai-badge">AI</span> 7-Day Meal Planner</h2>' +
                '<button onclick="closeMealPlanner()" style="background:none;border:none;color:#a09080;font-size:1.5rem;cursor:pointer">&times;</button>' +
            '</div>' +
            '<div class="meal-planner-controls">' +
                '<select id="mp-dietary"><option value="all">All</option><option value="veg">Veg Only</option><option value="non-veg">Non-Veg Only</option></select>' +
                '<input type="number" id="mp-budget" placeholder="Daily budget (Rs.)" min="100" max="5000" style="width:140px">' +
                '<input type="number" id="mp-people" placeholder="People" min="1" max="10" value="1" style="width:80px">' +
            '</div>' +
            '<button class="meal-planner-generate" onclick="generateMealPlan()">Generate AI Meal Plan</button>' +
            '<div id="meal-plan-result"></div>' +
        '</div>';
    document.body.appendChild(overlay);
}

export function closeMealPlanner() {
    var overlay = document.getElementById('meal-planner-overlay');
    if (overlay) overlay.remove();
}

export async function generateMealPlan() {
    var resultEl = document.getElementById('meal-plan-result');
    if (!resultEl) return;
    resultEl.innerHTML = '<div class="insights-loading">Generating your personalized meal plan...</div>';

    try {
        var resp = await fetch('/api/meal-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                dietary: document.getElementById('mp-dietary').value,
                budget: parseInt(document.getElementById('mp-budget').value) || 0,
                people: parseInt(document.getElementById('mp-people').value) || 1
            })
        });
        var data = await resp.json();

        var html = '<div class="meal-plan-grid">';
        if (data.days) {
            data.days.forEach(function(day) {
                html += '<div class="meal-day-card"><h4>' + day.day + '</h4>';
                (day.meals || []).forEach(function(meal) {
                    html += '<div style="font-size:.68rem;color:#D4A017;font-weight:600;text-transform:uppercase;margin-top:6px">' + meal.mealType + '</div>';
                    (meal.items || []).forEach(function(item) {
                        html += '<div class="meal-item">' + item.name + ' x' + (item.qty || 1) + ' — &#8377;' + item.price + '</div>';
                    });
                });
                html += '</div>';
            });
        }
        html += '</div>';

        if (data.totalCost) {
            html += '<div class="meal-plan-summary">' +
                '<span>Total: &#8377;' + data.totalCost + '</span>' +
                '<span>Daily avg: &#8377;' + (data.dailyAverage || Math.round(data.totalCost / 7)) + '</span>' +
            '</div>';
        }

        if (data.tips && data.tips.length > 0) {
            html += '<ul class="meal-plan-tips">';
            data.tips.forEach(function(t) { html += '<li>' + t + '</li>'; });
            html += '</ul>';
        }

        resultEl.innerHTML = html;
    } catch(e) {
        resultEl.innerHTML = '<p style="color:#e74c3c;font-size:.85rem;text-align:center">Failed to generate meal plan. Please try again.</p>';
    }
}

// ===== AI SMART COMBOS =====
export async function loadSmartCombos() {
    var section = document.getElementById('ai-combo-section');
    if (!section) return;

    try {
        var cached = JSON.parse(localStorage.getItem('ai_combos'));
        if (cached && (Date.now() - cached.ts) < 3600000) {
            renderSmartCombos(section, cached.data);
            return;
        }
    } catch(e) {}

    try {
        var resp = await fetch('/api/smart-combo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        var data = await resp.json();
        if (data.combos && data.combos.length > 0) {
            renderSmartCombos(section, data.combos);
            try { localStorage.setItem('ai_combos', JSON.stringify({ ts: Date.now(), data: data.combos })); } catch(e) {}
        }
    } catch(e) {}
}

function renderSmartCombos(section, combos) {
    var html = '<h3 style="color:#D4A017;font-size:.85rem;display:flex;align-items:center;gap:8px;margin-bottom:12px"><span class="ai-badge">AI</span> Smart Combos</h3><div class="ai-combo-grid">';
    combos.forEach(function(c) {
        html += '<div class="ai-combo-card">' +
            '<div class="ai-combo-name">' + c.name + '</div>' +
            '<div class="ai-combo-items">' + c.items.join(' + ') + '</div>' +
            '<div class="ai-combo-pricing">' +
                '<span class="ai-combo-original">&#8377;' + c.originalPrice + '</span>' +
                '<span class="ai-combo-price">&#8377;' + c.suggestedPrice + '</span>' +
                '<span class="ai-combo-save">Save ' + c.discount + '%</span>' +
            '</div>' +
            '<div class="ai-combo-reason">' + (c.reason || '') + '</div>' +
        '</div>';
    });
    html += '</div>';
    section.innerHTML = html;
    section.style.display = 'block';
}

window.openMealPlannerModal = openMealPlannerModal;
window.closeMealPlanner = closeMealPlanner;
window.generateMealPlan = generateMealPlan;
