// ===== SCROLL TO TOP ON REFRESH =====
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

// ===== SAFE localStorage (works in private browsing) =====
function safeGetItem(key) {
    try { return localStorage.getItem(key); } catch(e) { return null; }
}
function safeSetItem(key, val) {
    try { localStorage.setItem(key, val); } catch(e) { /* quota or private mode */ }
}

// ===== SAFE CLIPBOARD COPY =====
function safeCopy(text, btn) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function() {
            if (btn) btn.textContent = 'Copied!';
        }).catch(function() { fallbackCopy(text, btn); });
    } else {
        fallbackCopy(text, btn);
    }
}
function fallbackCopy(text, btn) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); if (btn) btn.textContent = 'Copied!'; } catch(e) {}
    document.body.removeChild(ta);
}

// ===== iOS-SAFE SCROLL LOCK =====
var _scrollLockPos = 0;
function lockScroll() {
    _scrollLockPos = window.pageYOffset || document.documentElement.scrollTop;
    document.body.style.top = -_scrollLockPos + 'px';
    document.body.classList.add('modal-open');
}
function unlockScroll() {
    document.body.classList.remove('modal-open');
    document.body.style.top = '';
    window.scrollTo(0, _scrollLockPos);
}

// ===== PAGE TRANSITION & PRELOADER =====
window.addEventListener('load', () => {
    // Fade out page transition
    const pageTransition = document.getElementById('page-transition');
    if (pageTransition) {
        setTimeout(() => pageTransition.classList.add('loaded'), 100);
    }

    setTimeout(() => {
        const preloader = document.getElementById('preloader');
        if (preloader) preloader.classList.add('hidden');
    }, 2200);
});


// ===== DARK MODE TOGGLE =====
(function() {
    const toggle = document.getElementById('theme-toggle');
    if (!toggle) return;
    const saved = safeGetItem('amogha-dark-mode');
    if (saved === 'true') {
        document.body.classList.add('dark-mode');
        toggle.textContent = '☀️';
    }
    toggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        toggle.textContent = isDark ? '☀️' : '🌙';
        safeSetItem('amogha-dark-mode', isDark);
    });
})();

// ===== STATS COUNTER ANIMATION =====
(function() {
    const counters = document.querySelectorAll('.stat-number');

    function animateCounters() {
        // On mobile, skip animation — show final values instantly (avoids scroll jank)
        if (window.innerWidth <= 768) {
            counters.forEach(function(counter) {
                var target = parseFloat(counter.dataset.target);
                counter.textContent = (target % 1 !== 0) ? target.toFixed(1) : target.toLocaleString();
            });
            return;
        }
        var targets = [];
        counters.forEach(function(counter) {
            targets.push({
                el: counter,
                target: parseFloat(counter.dataset.target),
                isDecimal: parseFloat(counter.dataset.target) % 1 !== 0,
                lastValue: -1
            });
        });
        var duration = 2000;
        var startTime = performance.now();

        function updateAll(currentTime) {
            var elapsed = currentTime - startTime;
            var progress = Math.min(elapsed / duration, 1);
            var eased = 1 - Math.pow(1 - progress, 3);

            for (var i = 0; i < targets.length; i++) {
                var t = targets[i];
                var current = t.isDecimal ? +(t.target * eased).toFixed(1) : Math.floor(t.target * eased);
                if (current !== t.lastValue) {
                    t.el.textContent = t.isDecimal ? current.toFixed(1) : current.toLocaleString();
                    t.lastValue = current;
                }
            }

            if (progress < 1) {
                requestAnimationFrame(updateAll);
            }
        }
        requestAnimationFrame(updateAll);
    }

    const statsSection = document.querySelector('.stats-section');
    if (statsSection) {
        let statsAnimated = false;
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !statsAnimated) {
                statsAnimated = true;
                animateCounters();
                observer.unobserve(statsSection);
            }
        }, { threshold: 0.3 });
        observer.observe(statsSection);
    }
})();

// ===== PARALLAX HERO =====
const heroSlideshow = document.querySelector('.hero-slideshow');

// ===== DYNAMIC HERO TEXT =====
(function() {
    const taglines = [
        'Authentic Indian Cuisine',
        'Crafted with Passion',
        'A Legacy of Flavour',
        'Where Taste Meets Art',
        'Born from Tradition'
    ];
    const subtitles = [
        'Tradition, Perfection & Soul in Every Dish',
        'Handcrafted Recipes Passed Down Generations',
        'An Unforgettable Culinary Journey Awaits',
        'Every Flavour Tells a Story of Heritage',
        'Experience the Art of Indian Fine Dining'
    ];

    const taglineEl = document.querySelector('.hero-tagline .hero-text-inner');
    const subtitleEl = document.querySelector('.hero-subtitle .hero-text-inner');
    if (!taglineEl || !subtitleEl) return;

    let index = 0;

    function rotateText() {
        index = (index + 1) % taglines.length;

        // Fade out via CSS transition (0.6s)
        taglineEl.classList.add('fade-out');
        subtitleEl.classList.add('fade-out');

        setTimeout(() => {
            taglineEl.textContent = taglines[index];
            subtitleEl.textContent = subtitles[index];

            // Scramble only the upper tagline
            if (window._scrambleReveal) {
                window._scrambleReveal(taglines[index], taglineEl);
            } else {
                taglineEl.classList.remove('fade-out');
            }

            // Subtitle just fades back in normally
            subtitleEl.classList.remove('fade-out');
        }, 700);
    }

    // 6s interval gives ~2.5s scramble + 3s visible before next fade-out
    setTimeout(() => {
        setInterval(rotateText, 6000);
    }, 5000);
})();

// Header Slideshow (random order)
(function() {
    const slides = document.querySelectorAll('.header-slideshow .slide');
    if (slides.length === 0) return;
    let current = 0;
    setInterval(() => {
        slides[current].classList.remove('active');
        let next;
        do {
            next = Math.floor(Math.random() * slides.length);
        } while (next === current && slides.length > 1);
        current = next;
        slides[current].classList.add('active');
    }, 3000);
})();

// Hero Background Slideshow + Symphony Gold Lines
(function() {
    var slides = document.querySelectorAll('#hero-slideshow .hero-slide');
    var sparkleContainer = document.getElementById('hero-sparkles');
    var current = 0;
    var isMobile = window.innerWidth <= 768;

    // ---- Symphony gold lines: persistent, slow, flowing, layered ----
    function initSymphonyLines() {
        if (!sparkleContainer) return;

        // Clear any existing elements
        sparkleContainer.innerHTML = '';

        var lineCount = isMobile ? 5 : 12;
        var dotCount = isMobile ? 3 : 6;
        var moteCount = isMobile ? 4 : 10;
        var glowCount = isMobile ? 2 : 4;

        // Layer 1: Ambient glow orbs (deepest layer — soft pulsing light pools)
        for (var g = 0; g < glowCount; g++) {
            var glow = document.createElement('span');
            glow.className = 'sp-glow';
            var gSize = 200 + Math.random() * 250;
            var gx = 10 + (g / glowCount) * 70 + Math.random() * 15;
            var gy = 20 + Math.random() * 50;
            var glowDur = 10 + Math.random() * 8;
            var glowDelay = g * 3 + Math.random() * 2;

            glow.style.cssText =
                'left:' + gx + '%;' +
                'top:' + gy + '%;' +
                'width:' + gSize + 'px;' +
                'height:' + gSize + 'px;' +
                '--glow-dur:' + glowDur + 's;' +
                '--glow-delay:' + glowDelay + 's;';

            sparkleContainer.appendChild(glow);
        }

        // Layer 2: Rising gold lines (the main symphony)
        for (var i = 0; i < lineCount; i++) {
            var line = document.createElement('span');

            // Cycle through line types for visual depth
            var types = ['', 'thin', 'accent', 'thin', ''];
            var type = types[i % types.length];
            line.className = 'sp-line' + (type ? ' ' + type : '');

            // Large heights — 140px to 320px
            var h = 140 + Math.random() * 180;
            var x = 3 + (i / lineCount) * 90 + Math.random() * 6;

            // Slow durations: 12s to 22s — like a grand symphony
            var dur = 12 + Math.random() * 10;
            // Stagger across the full cycle — always something moving
            var delay = (i / lineCount) * dur;
            var swayDur = 7 + Math.random() * 6;
            // Shimmer speed varies per line
            var shimmerDur = 2.5 + Math.random() * 2;

            line.style.cssText =
                'left:' + x + '%;' +
                'height:' + h + 'px;' +
                '--line-dur:' + dur + 's;' +
                '--line-delay:' + delay + 's;' +
                '--sway-dur:' + swayDur + 's;' +
                '--shimmer-dur:' + shimmerDur + 's;';

            sparkleContainer.appendChild(line);
        }

        // Layer 3: Floating dots — medium particles
        for (var j = 0; j < dotCount; j++) {
            var dot = document.createElement('span');
            dot.className = 'sp-dot';
            var size = 4 + Math.random() * 5;
            var dx = 8 + Math.random() * 84;
            var dotDur = 18 + Math.random() * 12;
            var dotDelay = j * 3.5 + Math.random() * 4;

            dot.style.cssText =
                'left:' + dx + '%;' +
                'width:' + size + 'px;' +
                'height:' + size + 'px;' +
                '--dot-dur:' + dotDur + 's;' +
                '--dot-delay:' + dotDelay + 's;';

            sparkleContainer.appendChild(dot);
        }

        // Layer 4: Tiny twinkling motes — finest detail
        for (var m = 0; m < moteCount; m++) {
            var mote = document.createElement('span');
            mote.className = 'sp-mote';
            var mSize = 2 + Math.random() * 3;
            var mx = 5 + Math.random() * 90;
            var moteDur = 18 + Math.random() * 14;
            var moteDelay = m * 2.5 + Math.random() * 3;
            var twinkleDur = 1.5 + Math.random() * 2;

            mote.style.cssText =
                'left:' + mx + '%;' +
                'width:' + mSize + 'px;' +
                'height:' + mSize + 'px;' +
                '--mote-dur:' + moteDur + 's;' +
                '--mote-delay:' + moteDelay + 's;' +
                '--twinkle-dur:' + twinkleDur + 's;';

            sparkleContainer.appendChild(mote);
        }
    }

    // Start the symphony
    initSymphonyLines();

    // Slideshow still runs independently — with cinematic Ken Burns variety
    var kbClasses = ['kb-zoom-left', 'kb-zoom-right', 'kb-pan-down', 'kb-zoom-center'];
    var slideshowInterval = null;

    function startSlideshow() {
        if (slideshowInterval) clearInterval(slideshowInterval);
        slides = document.querySelectorAll('#hero-slideshow .hero-slide');
        current = 0;
        if (slides.length > 1) {
            slideshowInterval = setInterval(function() {
                slides[current].classList.remove('active');
                current = (current + 1) % slides.length;
                for (var k = 0; k < kbClasses.length; k++) slides[current].classList.remove(kbClasses[k]);
                slides[current].classList.add(kbClasses[Math.floor(Math.random() * kbClasses.length)]);
                slides[current].classList.add('active');
            }, 2000);
        }
    }
    startSlideshow();

    // Dynamic hero slides from Firestore
    window.updateHeroSlides = function(firestoreSlides) {
        var container = document.getElementById('hero-slideshow');
        if (!container || firestoreSlides.length === 0) return;

        // Stop current slideshow
        if (slideshowInterval) clearInterval(slideshowInterval);

        // Remove existing slides
        var old = container.querySelectorAll('.hero-slide');
        for (var i = 0; i < old.length; i++) old[i].remove();

        // Create new slides from Firestore data
        firestoreSlides.forEach(function(slide, idx) {
            var div = document.createElement('div');
            div.className = 'hero-slide' + (idx === 0 ? ' active' : '');
            if (idx === 0) div.classList.add(kbClasses[Math.floor(Math.random() * kbClasses.length)]);

            if (slide.type === 'video') {
                div.classList.add('hero-slide-video');
                var video = document.createElement('video');
                video.src = slide.url;
                video.autoplay = true;
                video.muted = true;
                video.loop = true;
                video.playsInline = true;
                video.setAttribute('playsinline', '');
                video.setAttribute('webkit-playsinline', '');
                div.appendChild(video);
            } else {
                div.style.backgroundImage = 'url(' + slide.url + ')';
            }

            container.appendChild(div);
        });

        // Restart slideshow with new slides
        slides = container.querySelectorAll('.hero-slide');
        current = 0;
        if (slides.length > 1) {
            slideshowInterval = setInterval(function() {
                slides[current].classList.remove('active');
                // Pause video on outgoing slide
                var oldVid = slides[current].querySelector('video');
                if (oldVid) oldVid.pause();

                current = (current + 1) % slides.length;
                for (var k = 0; k < kbClasses.length; k++) slides[current].classList.remove(kbClasses[k]);
                slides[current].classList.add(kbClasses[Math.floor(Math.random() * kbClasses.length)]);
                slides[current].classList.add('active');

                // Play video on incoming slide
                var newVid = slides[current].querySelector('video');
                if (newVid) { newVid.currentTime = 0; newVid.play(); }
            }, 2000);
        }
    };
})();

// Shopping Cart
let cart = [];

// Mobile menu toggle with overlay
const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
const navLinks = document.getElementById('nav-links');
const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');

// Move nav-links to document.body on mobile so position:fixed works
// (header's position:sticky + transition:transform create containing blocks
//  that trap fixed-position children in Safari/Chrome mobile)
(function() {
    var navParent = navLinks.parentElement; // original parent (<nav>)
    function setupMobileNav() {
        if (window.innerWidth <= 768) {
            if (navLinks.parentElement !== document.body) {
                document.body.appendChild(navLinks);
            }
        } else {
            if (navLinks.parentElement === document.body) {
                navParent.appendChild(navLinks);
            }
        }
    }
    setupMobileNav();
    var resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(setupMobileNav, 100);
    });
})();

function closeMobileMenu() {
    navLinks.classList.remove('active');
    if (mobileMenuOverlay) mobileMenuOverlay.classList.remove('active');
    mobileMenuToggle.textContent = '\u2630';
    unlockScroll();
}

mobileMenuToggle.addEventListener('click', () => {
    const isActive = navLinks.classList.toggle('active');
    if (mobileMenuOverlay) mobileMenuOverlay.classList.toggle('active', isActive);
    mobileMenuToggle.textContent = isActive ? '\u2715' : '\u2630';
    if (isActive) {
        lockScroll();
    } else {
        unlockScroll();
    }
});

if (mobileMenuOverlay) {
    mobileMenuOverlay.addEventListener('click', closeMobileMenu);
}

// Close mobile menu when any nav link is clicked
navLinks.querySelectorAll('a').forEach(function(link) {
    link.addEventListener('click', function(e) {
        var href = link.getAttribute('href');
        // Skip scroll handling for Sign In button — openAuthModal() handles its own lockScroll
        var isSignIn = link.id === 'signin-btn' || link.closest('#signin-btn');
        if (isSignIn) {
            // Just close the nav visually without unlocking scroll
            navLinks.classList.remove('active');
            if (mobileMenuOverlay) mobileMenuOverlay.classList.remove('active');
            mobileMenuToggle.textContent = '\u2630';
            return; // Let the onclick handler on the button handle the rest
        }
        closeMobileMenu();
        // After unlocking scroll, manually navigate to anchor
        // (anchor links don't work while body was position:fixed)
        if (href && href.startsWith('#')) {
            e.preventDefault();
            var target = document.querySelector(href);
            if (target) {
                setTimeout(function() {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 50);
            }
        }
    });
});

// Load cart from localStorage
function loadCart() {
    try {
        const savedCart = safeGetItem('amoghaCart');
        if (savedCart) {
            cart = JSON.parse(savedCart);
            updateCartCount();
        }
    } catch(e) { cart = []; }
}

// Save cart to localStorage
function saveCart() {
    safeSetItem('amoghaCart', JSON.stringify(cart));
}

// Update cart count
function updateCartCount() {
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    var el = document.getElementById('cart-count');
    if (el) el.textContent = count;
}

// Add to cart
let pendingCartItem = null;

// Cached add-ons from Firestore (with localStorage cache)
var cachedAddons = [];
(function() {
    // Try localStorage first (10-min cache)
    try {
        var cached = localStorage.getItem('addons_cache');
        if (cached) {
            var p = JSON.parse(cached);
            if (p.ts && (Date.now() - p.ts) < 600000 && p.data) {
                cachedAddons = p.data;
                return;
            }
        }
    } catch(e) {}
    if (typeof db !== 'undefined') {
        db.collection('addons').where('active', '==', true).orderBy('sortOrder').get().then(function(snap) {
            snap.forEach(function(doc) { cachedAddons.push(doc.data()); });
            try { localStorage.setItem('addons_cache', JSON.stringify({ ts: Date.now(), data: cachedAddons })); } catch(e) {}
        }).catch(function() {});
    }
})();

// Pending addon selection state
var pendingAddonItem = null;
var selectedAddons = [];

function addToCart(itemName, price, btnEl) {
    // Prompt sign-in on first add (gentle — doesn't block)
    if (cart.length === 0 && !getCurrentUser()) {
        pendingCartItem = { name: itemName, price: price };
        showSignInPrompt();
    }

    // Capture spice level from the card
    var spiceLevel = 'medium';
    if (btnEl) {
        var card = btnEl.closest('.menu-item-card');
        if (card) {
            var activeSpice = card.querySelector('.spice-level.active');
            if (activeSpice) spiceLevel = activeSpice.textContent.trim().toLowerCase();
        }
    }

    // If add-ons available, show picker instead of adding directly
    if (cachedAddons.length > 0) {
        pendingAddonItem = { name: itemName, price: parseFloat(price), spiceLevel: spiceLevel, btnEl: btnEl };
        selectedAddons = [];
        openAddonPicker(itemName, parseFloat(price));
        return;
    }

    finalizeAddToCart(itemName, parseFloat(price), spiceLevel, []);
}

function finalizeAddToCart(itemName, price, spiceLevel, addons) {
    var addonKey = addons.map(function(a) { return a.name; }).sort().join(',');
    var existingItem = cart.find(function(item) {
        var itemAddonKey = (item.addons || []).map(function(a) { return a.name; }).sort().join(',');
        return item.name === itemName && item.spiceLevel === spiceLevel && itemAddonKey === addonKey;
    });

    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({
            name: itemName,
            price: price,
            quantity: 1,
            spiceLevel: spiceLevel,
            addons: addons || []
        });
    }

    updateCartCount();
    saveCart();
    updateButtonState(itemName);
    updateFloatingCart();
}

function openAddonPicker(itemName, basePrice) {
    var overlay = document.getElementById('addon-picker-overlay');
    var nameEl = document.getElementById('addon-item-name');
    var listEl = document.getElementById('addon-sheet-list');

    nameEl.textContent = itemName + ' — \u20B9' + basePrice;

    listEl.innerHTML = cachedAddons.map(function(addon, idx) {
        return '<div class="addon-option" data-idx="' + idx + '" onclick="toggleAddonOption(this, ' + idx + ')">' +
            '<div class="addon-checkbox"></div>' +
            '<div class="addon-option-info">' +
                '<div class="addon-option-name">' + addon.name + '</div>' +
                '<div class="addon-option-cat">' + (addon.category || '') + '</div>' +
            '</div>' +
            '<div class="addon-option-price">+\u20B9' + addon.price + '</div>' +
        '</div>';
    }).join('');

    updateAddonTotal();
    overlay.style.display = 'flex';
}

function toggleAddonOption(el, idx) {
    el.classList.toggle('selected');
    var addon = cachedAddons[idx];
    var checkbox = el.querySelector('.addon-checkbox');

    if (el.classList.contains('selected')) {
        selectedAddons.push({ name: addon.name, price: addon.price });
        checkbox.textContent = '\u2713';
    } else {
        selectedAddons = selectedAddons.filter(function(a) { return a.name !== addon.name; });
        checkbox.textContent = '';
    }
    updateAddonTotal();
}

function updateAddonTotal() {
    if (!pendingAddonItem) return;
    var addonSum = selectedAddons.reduce(function(s, a) { return s + a.price; }, 0);
    var total = pendingAddonItem.price + addonSum;
    document.getElementById('addon-total').textContent = 'Total: \u20B9' + total;
}

function closeAddonPicker() {
    document.getElementById('addon-picker-overlay').style.display = 'none';
    // If user closes without confirming, add item without addons
    if (pendingAddonItem) {
        finalizeAddToCart(pendingAddonItem.name, pendingAddonItem.price, pendingAddonItem.spiceLevel, []);
        pendingAddonItem = null;
        selectedAddons = [];
    }
}

function confirmAddonSelection() {
    if (!pendingAddonItem) return;
    var item = pendingAddonItem;
    var addons = selectedAddons.slice();
    pendingAddonItem = null;
    selectedAddons = [];
    document.getElementById('addon-picker-overlay').style.display = 'none';
    finalizeAddToCart(item.name, item.price, item.spiceLevel, addons);
}

function showCartCheckmark(btnEl) {
    var btn = btnEl.closest('.add-to-cart') || btnEl;
    var check = document.createElement('span');
    check.className = 'atc-checkmark';
    check.textContent = '\u2713';
    btn.appendChild(check);
    setTimeout(function() { check.remove(); }, 800);
}

function showSignInPrompt() {
    var prompt = document.getElementById('signin-prompt');
    if (!prompt) {
        prompt = document.createElement('div');
        prompt.id = 'signin-prompt';
        prompt.innerHTML = '<div class="signin-prompt-content">' +
            '<span class="signin-prompt-icon">🎉</span>' +
            '<div class="signin-prompt-text">' +
                '<strong>Sign up & get 25% OFF!</strong>' +
                '<span>Create an account to unlock your welcome bonus</span>' +
            '</div>' +
            '<button class="signin-prompt-btn" onclick="closeSignInPrompt(); openAuthModal();">Sign Up</button>' +
            '<button class="signin-prompt-close" onclick="closeSignInPrompt()">&times;</button>' +
        '</div>';
        document.body.appendChild(prompt);
    }
    prompt.classList.remove('visible');
    void prompt.offsetWidth;
    prompt.classList.add('visible');
    // Auto-dismiss after 8 seconds
    setTimeout(function() { closeSignInPrompt(); }, 8000);
}

function closeSignInPrompt() {
    var prompt = document.getElementById('signin-prompt');
    if (prompt) prompt.classList.remove('visible');
}

// Update button to show quantity controls
function updateButtonState(itemName) {
    document.querySelectorAll('.add-to-cart').forEach(btn => {
        if (btn.dataset.item === itemName) {
            const item = cart.find(i => i.name === itemName);
            const qty = item ? item.quantity : 0;

            if (qty > 0 && !btn.classList.contains('has-qty')) {
                btn.classList.add('has-qty');
                btn.innerHTML = `<span class="qty-minus" data-item="${itemName}">−</span><span class="qty-count">${qty}</span><span class="qty-plus" data-item="${itemName}">+</span>`;
            } else if (qty > 0) {
                btn.querySelector('.qty-count').textContent = qty;
            } else {
                btn.classList.remove('has-qty');
                btn.innerHTML = 'Add to Order';
            }
        }
    });
}

// Restore all button states on page load
function restoreButtonStates() {
    cart.forEach(item => updateButtonState(item.name));
}

// Floating cart preview
function updateFloatingCart() {
    let floatingCart = document.getElementById('floating-cart');
    if (!floatingCart) {
        floatingCart = document.createElement('div');
        floatingCart.id = 'floating-cart';
        floatingCart.innerHTML = `
            <div class="fc-header">
                <span class="fc-title">Your Order</span>
                <span class="fc-close" onclick="closeFloatingCart()">&times;</span>
            </div>
            <div class="fc-items"></div>
            <div class="fc-footer">
                <span class="fc-total"></span>
                <button class="fc-checkout" onclick="document.getElementById('cart-icon').click(); closeFloatingCart();">View Cart</button>
            </div>
        `;
        document.body.appendChild(floatingCart);
    }

    const itemsContainer = floatingCart.querySelector('.fc-items');
    const totalEl = floatingCart.querySelector('.fc-total');

    if (cart.length === 0) {
        floatingCart.classList.remove('visible');
        updateCartFab();
        return;
    }

    let html = '';
    let subtotal = 0;
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        html += `<div class="fc-item"><span>${item.name} x${item.quantity}</span><span>₹${itemTotal}</span></div>`;
    });

    itemsContainer.innerHTML = html;
    totalEl.textContent = `Total: ₹${subtotal}`;
    floatingCart.classList.add('visible');

    // Update mobile cart FAB
    updateCartFab();
}

function updateCartFab() {
    var fab = document.getElementById('cart-fab');
    if (!fab) {
        fab = document.createElement('div');
        fab.id = 'cart-fab';
        fab.className = 'cart-fab';
        fab.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg><span class="cart-fab-badge">0</span>';
        fab.addEventListener('click', function() {
            var cartIcon = document.getElementById('cart-icon');
            if (cartIcon) cartIcon.click();
        });
        document.body.appendChild(fab);
    }
    var badge = fab.querySelector('.cart-fab-badge');
    var count = cart.reduce(function(t, i) { return t + i.quantity; }, 0);
    if (count > 0) {
        badge.textContent = count;
        fab.classList.add('visible');
        fab.classList.remove('pop');
        void fab.offsetWidth;
        fab.classList.add('pop');
    } else {
        fab.classList.remove('visible');
    }
}

function closeFloatingCart() {
    const fc = document.getElementById('floating-cart');
    if (fc) fc.classList.remove('visible');
}

// Display cart
function displayCart() {
    const cartItemsContainer = document.getElementById('cart-items');
    if (!cartItemsContainer) return;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart">Your cart is empty</div>';
        var subEl = document.getElementById('subtotal-amount');
        var totEl = document.getElementById('total-amount');
        if (subEl) subEl.textContent = '0.00';
        if (totEl) totEl.textContent = '0.00';
        return;
    }
    
    let html = '';
    let subtotal = 0;
    
    cart.forEach((item, index) => {
        const addonTotal = (item.addons || []).reduce((s, a) => s + a.price, 0);
        const itemTotal = (item.price + addonTotal) * item.quantity;
        subtotal += itemTotal;
        const spiceTag = item.spiceLevel && item.spiceLevel !== 'medium' ? ' <span style="font-size:0.7rem;color:#e67e22">(' + item.spiceLevel + ')</span>' : '';
        const addonTags = (item.addons || []).map(a => '<span style="font-size:0.7rem;color:var(--gold,#D4A017)">+ ' + a.name + ' ₹' + a.price + '</span>').join(' ');

        html += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}${spiceTag}</div>
                    ${addonTags ? '<div style="margin-top:2px">' + addonTags + '</div>' : ''}
                    <div class="cart-item-price">₹${(item.price + addonTotal).toFixed(2)}</div>
                </div>
                <div class="cart-item-quantity">
                    <button class="qty-btn" onclick="updateQuantity(${index}, -1)">-</button>
                    <span>${item.quantity}</span>
                    <button class="qty-btn" onclick="updateQuantity(${index}, 1)">+</button>
                </div>
                <button class="remove-item" onclick="removeItem(${index})">Remove</button>
            </div>
        `;
    });
    
    cartItemsContainer.innerHTML = html;
    
    const deliveryFee = subtotal >= 500 ? 0 : 49;
    const total = subtotal + deliveryFee;

    var subtotalEl = document.getElementById('subtotal-amount');
    var totalEl = document.getElementById('total-amount');
    if (subtotalEl) subtotalEl.textContent = subtotal.toFixed(2);
    if (totalEl) totalEl.textContent = total.toFixed(2);
}

// Update quantity
function updateQuantity(index, change) {
    const itemName = cart[index].name;
    cart[index].quantity += change;

    if (cart[index].quantity <= 0) {
        cart.splice(index, 1);
    }

    updateCartCount();
    saveCart();
    displayCart();
    updateButtonState(itemName);
    updateFloatingCart();
}

// Remove item
function removeItem(index) {
    const itemName = cart[index].name;
    cart.splice(index, 1);
    updateCartCount();
    saveCart();
    displayCart();
    updateButtonState(itemName);
    updateFloatingCart();
}

// Clear cart
function clearCart() {
    if (confirm('Are you sure you want to clear your cart?')) {
        const itemNames = cart.map(i => i.name);
        cart = [];
        updateCartCount();
        saveCart();
        displayCart();
        itemNames.forEach(name => updateButtonState(name));
        updateFloatingCart();
        document.getElementById('cart-modal').style.display = 'none';
        unlockScroll();
    }
}

// ===== CHECKOUT FLOW =====
const MERCHANT_NAME = 'AMOGHA CAFE & RESTAURANT';
const WHATSAPP_NUMBER = '+919121004999';

// *** RAZORPAY CONFIG ***
// STEP 1: Sign up at https://dashboard.razorpay.com/signup and complete KYC
// STEP 2: Go to Settings → API Keys → Generate Key
// STEP 3: Replace the test key below with your live key (rzp_live_...)
const RAZORPAY_KEY = 'rzp_test_1DP5mmOlF5G5ag';

let selectedPayment = 'razorpay';

function checkout() {
    if (cart.length === 0) {
        showAuthToast('Your cart is empty!');
        return;
    }
    if (!getCurrentUser()) {
        document.getElementById('cart-modal').style.display = 'none';
        unlockScroll();
        openAuthModal();
        showAuthToast('Please sign in to continue with your order');
        return;
    }
    document.getElementById('cart-modal').style.display = 'none';
    lockScroll();
    openCheckout();
}

var appliedCoupon = null;

function getCheckoutTotal() {
    var subtotal = cart.reduce(function(sum, item) { return sum + (item.price * item.quantity); }, 0);
    var deliveryFee = subtotal >= 500 ? 0 : 49;
    var total = subtotal + deliveryFee;
    // Apply coupon discount
    if (appliedCoupon) {
        var discount = 0;
        if (appliedCoupon.type === 'percent') {
            discount = Math.floor(subtotal * appliedCoupon.discount / 100);
        } else if (appliedCoupon.type === 'flat') {
            discount = appliedCoupon.discount;
        }
        discount = Math.min(discount, subtotal);
        total = subtotal - discount + deliveryFee;
    }
    return { subtotal: subtotal, deliveryFee: deliveryFee, total: total };
}

function openCheckout() {
    var subtotal = cart.reduce(function(sum, item) { return sum + (item.price * item.quantity); }, 0);
    var deliveryFee = subtotal >= 500 ? 0 : 49;
    var total = subtotal + deliveryFee;

    var itemsHtml = '';
    cart.forEach(function(item) {
        itemsHtml += '<div class="co-item"><span>' + item.name + ' x' + item.quantity + '</span><span>\u20B9' + (item.price * item.quantity) + '</span></div>';
    });
    document.getElementById('checkout-items').innerHTML = itemsHtml;
    document.getElementById('co-subtotal').textContent = '\u20B9' + subtotal;
    document.getElementById('co-delivery').textContent = deliveryFee === 0 ? 'FREE' : '\u20B9' + deliveryFee;
    document.getElementById('co-total').textContent = '\u20B9' + total;

    // Show loyalty redeem button
    var loyaltyBtn = document.getElementById('loyalty-redeem-btn');
    if (loyaltyBtn) {
        var cUser = getCurrentUser();
        if (cUser && cUser.loyaltyPoints >= 100) {
            var redeemVal = Math.floor(cUser.loyaltyPoints / 100) * 10;
            loyaltyBtn.textContent = 'Redeem ' + cUser.loyaltyPoints + ' pts (\u20B9' + redeemVal + ' off)';
            loyaltyBtn.style.display = 'block';
        } else {
            loyaltyBtn.style.display = 'none';
        }
    }

    goToStep(1);
    document.getElementById('checkout-modal').style.display = 'block';

    // Auto-apply welcome bonus
    var currentUser = getCurrentUser();
    var couponInput = document.getElementById('coupon-code');
    var couponMsg = document.getElementById('coupon-msg');
    if (currentUser && !currentUser.usedWelcomeBonus) {
        appliedCoupon = { discount: 25, type: 'percent', label: '25% off (Welcome Bonus!)' };
        couponInput.value = 'WELCOME25';
        couponMsg.textContent = 'Welcome bonus applied! You get 25% off!';
        couponMsg.className = 'coupon-msg success';
        var discount = subtotal * 0.25;
        discount = Math.min(discount, subtotal);
        var discountedTotal = subtotal - discount + deliveryFee;
        document.getElementById('co-total').textContent = '\u20B9' + discountedTotal.toFixed(0);
    } else {
        appliedCoupon = null;
        couponInput.value = '';
        couponMsg.textContent = '';
        couponMsg.className = 'coupon-msg';
    }
}

function goToStep(step) {
    document.querySelectorAll('.checkout-step').forEach(function(s) { s.classList.remove('active'); });
    document.getElementById('checkout-step-' + step).classList.add('active');
    if (step === 3) setupPayment();
}

function validateAndPay() {
    var name = document.getElementById('co-name').value.trim();
    var phone = document.getElementById('co-phone').value.trim();
    var address = document.getElementById('co-address').value.trim();
    if (!name || !phone || !address) { showAuthToast('Please fill in all required fields.'); return; }
    if (phone.length < 10) { showAuthToast('Please enter a valid phone number.'); return; }
    // Validate scheduled order fields if enabled
    var schedule = window.getScheduleInfo ? window.getScheduleInfo() : null;
    if (schedule && (!schedule.date || !schedule.time)) {
        showAuthToast('Please select both date and time for scheduled order.');
        return;
    }
    goToStep(3);
}

// ===== PAYMENT SETUP =====

function setupPayment() {
    var totals = getCheckoutTotal();
    var total = totals.total;
    var totalStr = '\u20B9' + total.toFixed(0);

    document.getElementById('pay-total').textContent = totalStr;
    var codTotal = document.getElementById('cod-total');
    if (codTotal) codTotal.textContent = totalStr;

    // Default to Razorpay tab
    selectedPayment = 'razorpay';
    switchPayTab('razorpay');
}

// ===== PAYMENT TAB SWITCHING =====
function switchPayTab(tab) {
    ['razorpay', 'cod'].forEach(function(t) {
        var tabEl = document.getElementById('tab-' + t);
        var panelEl = document.getElementById('pay-panel-' + t);
        if (tabEl) tabEl.classList.toggle('active', t === tab);
        if (panelEl) panelEl.classList.toggle('active', t === tab);
    });
    selectedPayment = tab;
}

// ===== RAZORPAY PAYMENT GATEWAY (UPI + Cards + NetBanking + Wallets) =====
function openRazorpay() {
    if (typeof Razorpay === 'undefined') {
        showAuthToast('Payment gateway loading... please try again');
        return;
    }

    var totals = getCheckoutTotal();
    var name = document.getElementById('co-name').value.trim();
    var phone = document.getElementById('co-phone').value.trim();

    var options = {
        key: RAZORPAY_KEY,
        amount: Math.round(totals.total * 100), // Amount in paise
        currency: 'INR',
        name: MERCHANT_NAME,
        description: 'Food Order - Amogha Cafe',
        image: window.location.origin + '/amogha-logo.png',
        handler: function(response) {
            // Payment successful — Razorpay verified
            var paymentId = response.razorpay_payment_id;
            placeOrderToFirestore('Razorpay', paymentId, 'paid');
        },
        prefill: {
            name: name,
            contact: phone,
            method: 'upi' // Default to UPI tab in Razorpay checkout
        },
        method: {
            upi: true,
            card: true,
            netbanking: true,
            wallet: true
        },
        config: {
            display: {
                blocks: {
                    upi: {
                        name: 'Pay via UPI',
                        instruments: [
                            { method: 'upi', flows: ['qrcode', 'collect', 'intent'] }
                        ]
                    }
                },
                sequence: ['block.upi'],
                preferences: {
                    show_default_blocks: true
                }
            }
        },
        notes: {
            items: cart.map(function(i) { return i.name + ' x' + i.quantity; }).join(', ')
        },
        theme: {
            color: '#D4A017',
            backdrop_color: 'rgba(8,6,4,0.85)'
        },
        modal: {
            ondismiss: function() {
                var btn = document.getElementById('razorpay-pay-btn');
                if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg> Pay Now'; }
            }
        }
    };

    var btn = document.getElementById('razorpay-pay-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = 'Opening payment...'; }

    try {
        var rzp = new Razorpay(options);
        rzp.on('payment.failed', function(response) {
            showAuthToast('Payment failed: ' + (response.error.description || 'Please try again'));
            var btn = document.getElementById('razorpay-pay-btn');
            if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg> Retry Payment'; }
        });
        rzp.open();
    } catch(e) {
        showAuthToast('Error opening payment: ' + e.message);
        if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg> Pay Now'; }
    }
}

function placeCodOrder() {
    placeOrderToFirestore('Cash on Delivery', null, 'cod-pending');
}

function placeOrderToFirestore(payMethod, paymentRef, paymentStatus) {
    if (typeof db === 'undefined' || !db) {
        showAuthToast('Service unavailable. Please refresh and try again.');
        return;
    }
    var name = document.getElementById('co-name').value.trim();
    var phone = document.getElementById('co-phone').value.trim();
    var address = document.getElementById('co-address').value.trim();
    var notes = document.getElementById('co-notes').value.trim();
    var totals = getCheckoutTotal();

    document.getElementById('confirm-detail').textContent = 'Payment: ' + payMethod + (paymentRef ? ' (Ref: ' + paymentRef + ')' : '') + ' | Total: \u20B9' + totals.total.toFixed(0);

    // Build WhatsApp message
    var msg = '*New Order - Amogha Cafe*\n\n';
    msg += '*Customer:* ' + name + '\n*Phone:* ' + phone + '\n*Address:* ' + address + '\n';
    if (notes) msg += '*Notes:* ' + notes + '\n';
    msg += '\n*Items:*\n';
    cart.forEach(function(item) {
        msg += '- ' + item.name + ' x' + item.quantity + ' = \u20B9' + (item.price * item.quantity) + '\n';
    });
    msg += '\n*Subtotal:* \u20B9' + totals.subtotal;
    msg += '\n*Delivery:* ' + (totals.deliveryFee === 0 ? 'FREE' : '\u20B9' + totals.deliveryFee);
    msg += '\n*Total:* \u20B9' + totals.total.toFixed(0);
    msg += '\n*Payment:* ' + payMethod;
    if (paymentRef) msg += '\n*Payment Ref:* ' + paymentRef;

    var waLink = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(msg);
    document.getElementById('whatsapp-link').href = waLink;

    goToStep(4);

    // Save to Firestore
    var currentUser = getCurrentUser();
    var orderData = {
        customer: name,
        phone: phone,
        address: address,
        notes: notes,
        items: cart.map(function(item) { return { name: item.name, qty: item.quantity, price: item.price, spiceLevel: item.spiceLevel || 'medium', addons: item.addons || [] }; }),
        subtotal: totals.subtotal,
        deliveryFee: totals.deliveryFee,
        total: totals.total,
        payment: payMethod,
        paymentRef: paymentRef || null,
        paymentStatus: paymentStatus,
        paymentVerifiedAt: paymentRef ? new Date().toISOString() : null,
        status: 'pending',
        createdAt: new Date().toISOString(),
        userId: currentUser ? currentUser.phone : null
    };
    // Save items before clearing (for button state update)
    var itemNames = cart.map(function(i) { return i.name; });

    db.collection('orders').add(orderData).then(function(docRef) {
        var trackUrl = window.location.origin + '/track/index.html?id=' + docRef.id;
        var trackDiv = document.getElementById('order-tracking-link');
        if (trackDiv) {
            trackDiv.innerHTML = '<div style="margin-top:1rem;padding:1rem;background:rgba(212,160,23,0.08);border:1px solid rgba(212,160,23,0.15);border-radius:12px;text-align:center">' +
                '<p style="font-size:0.82rem;color:#a09080;margin-bottom:0.5rem">Track your order in real-time:</p>' +
                '<a href="' + trackUrl + '" target="_blank" rel="noopener noreferrer" style="color:#D4A017;font-weight:600;font-size:0.9rem;word-break:break-all">' + trackUrl + '</a>' +
                '<br><button onclick="safeCopy(\'' + trackUrl + '\',this)" style="margin-top:0.6rem;padding:0.4rem 1rem;background:linear-gradient(135deg,#D4A017,#B8860B);color:#1a0f08;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:0.78rem">Copy Link</button>' +
                '</div>';
        }

        // Mark welcome bonus as used (inside .then so it only fires on success)
        if (currentUser && !currentUser.usedWelcomeBonus && appliedCoupon && appliedCoupon.label && appliedCoupon.label.indexOf('Welcome') !== -1) {
            currentUser.usedWelcomeBonus = true;
            setCurrentUser(currentUser);
            db.collection('users').doc(currentUser.phone).update({ usedWelcomeBonus: true }).catch(function(e) { console.error('Bonus update error:', e); });
        }
        appliedCoupon = null;

        // Deduct gift card balance if used
        if (appliedGiftCard && appliedGiftCard.code) {
            var gcDeduction = Math.min(appliedGiftCard.balance, orderData.total);
            db.collection('giftCards').doc(appliedGiftCard.code).update({
                balance: firebase.firestore.FieldValue.increment(-gcDeduction),
                redeemedAt: new Date().toISOString()
            }).catch(function(e) { console.error('Gift card deduction error:', e); });
            appliedGiftCard = null;
        }

        // Clear cart only after successful save
        cart = [];
        updateCartCount();
        saveCart();
        itemNames.forEach(function(n) { updateButtonState(n); });
        updateFloatingCart();

        // Launch confetti for celebration
        if (typeof launchConfetti === 'function') launchConfetti();

        // Award loyalty points
        if (typeof awardLoyaltyPoints === 'function') awardLoyaltyPoints(orderData.total);

        // Award referrer points if current user was referred
        if (currentUser && typeof db !== 'undefined' && db) {
            db.collection('referrals').where('refereePhone', '==', currentUser.phone).where('redeemed', '==', false).limit(1).get().then(function(snap) {
                if (!snap.empty) {
                    var ref = snap.docs[0];
                    var referrerPhone = ref.data().referrerPhone;
                    db.collection('users').doc(referrerPhone).get().then(function(uDoc) {
                        if (uDoc.exists) {
                            var pts = (uDoc.data().loyaltyPoints || 0) + 100;
                            db.collection('users').doc(referrerPhone).update({ loyaltyPoints: pts }).catch(function(e) { console.error('Referrer points error:', e); });
                        }
                    });
                    ref.ref.update({ redeemed: true }).catch(function(e) { console.error('Referral redeem error:', e); });
                }
            }).catch(function(e) { console.error('Referral lookup error:', e); });
        }

        // Schedule review prompt
        if (typeof scheduleReviewPrompt === 'function') scheduleReviewPrompt(orderData.items.map(function(i) { return { name: i.name }; }));

        // Send push notification
        if (typeof sendPushNotification === 'function') sendPushNotification('Order Placed!', 'Your order from Amogha has been placed successfully.');
    }).catch(function(err) {
        console.error('Order save error:', err);
        showAuthToast('Order failed to save. Please try again or check your connection.');
    });
}

function closeCheckout() {
    document.getElementById('checkout-modal').style.display = 'none';
    unlockScroll();
    document.getElementById('co-name').value = '';
    document.getElementById('co-phone').value = '';
    document.getElementById('co-address').value = '';
    document.getElementById('co-notes').value = '';
}

// Modal functionality
const cartModal = document.getElementById('cart-modal');
const cartIcon = document.getElementById('cart-icon');
const closeButtons = document.querySelectorAll('.close');

if (cartIcon) {
    cartIcon.addEventListener('click', (e) => {
        e.preventDefault();
        displayCart();
        if (cartModal) cartModal.style.display = 'block';
        lockScroll();
    });
}

closeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        // Skip if this close button belongs to the auth modal (has its own closeAuthModal handler)
        if (btn.closest('#auth-modal')) return;
        if (cartModal) cartModal.style.display = 'none';
        var resModal = document.getElementById('reservation-modal');
        if (resModal) resModal.style.display = 'none';
        unlockScroll();
    });
});

window.addEventListener('click', (e) => {
    if (e.target === cartModal) {
        cartModal.style.display = 'none';
        unlockScroll();
    }
    if (e.target === document.getElementById('reservation-modal')) {
        document.getElementById('reservation-modal').style.display = 'none';
        unlockScroll();
    }
});

// Add to cart buttons
document.addEventListener('click', (e) => {
    // Clicking the + button
    if (e.target.classList.contains('qty-plus')) {
        const itemName = e.target.dataset.item;
        const btn = e.target.closest('.add-to-cart');
        addToCart(itemName, btn.dataset.price);
        return;
    }
    // Clicking the - button
    if (e.target.classList.contains('qty-minus')) {
        const itemName = e.target.dataset.item;
        const item = cart.find(i => i.name === itemName);
        if (item) {
            item.quantity--;
            if (item.quantity <= 0) cart.splice(cart.indexOf(item), 1);
            updateCartCount();
            saveCart();
            updateButtonState(itemName);
            updateFloatingCart();
        }
        return;
    }
    // Clicking "Add to Order" (first time)
    if (e.target.classList.contains('add-to-cart') && !e.target.classList.contains('has-qty')) {
        const itemName = e.target.dataset.item;
        const price = e.target.dataset.price;
        addToCart(itemName, price);
        showCartCheckmark(e.target);
    }
});

// Cart action buttons
var clearCartBtn = document.getElementById('clear-cart');
if (clearCartBtn) clearCartBtn.addEventListener('click', clearCart);
var checkoutBtn = document.getElementById('checkout');
if (checkoutBtn) checkoutBtn.addEventListener('click', checkout);

// Contact form submission
var contactForm = document.getElementById('contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        showAuthToast('Thank you for your message! We will get back to you shortly.');
        e.target.reset();
    });
}

// Reservation form submission
var reservationForm = document.getElementById('reservation-form');
if (reservationForm) {
    reservationForm.addEventListener('submit', (e) => {
        e.preventDefault();
        showAuthToast('Reservation request received! We will confirm shortly.');
        e.target.reset();
        var modal = document.getElementById('reservation-modal');
        if (modal) modal.style.display = 'none';
    });
}

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        if (this.id === 'cart-icon') return;
        
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
            // Close mobile menu if open
            closeMobileMenu();
        }
    });
});

// Add scroll effect to header
let lastScroll = 0;
const header = document.querySelector('header');

// Initialize cart on page load
loadCart();
restoreButtonStates();
updateCartFab();

// ===== CATEGORY CAROUSEL =====
(function() {
    const carousel = document.getElementById('category-carousel');
    const leftArrow = document.getElementById('cat-arrow-left');
    const rightArrow = document.getElementById('cat-arrow-right');
    if (!carousel || !leftArrow || !rightArrow) return;

    const scrollAmount = 250;

    function updateArrows() {
        leftArrow.disabled = carousel.scrollLeft <= 5;
        rightArrow.disabled = carousel.scrollLeft >= carousel.scrollWidth - carousel.clientWidth - 5;
    }

    leftArrow.addEventListener('click', () => {
        carousel.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    });

    rightArrow.addEventListener('click', () => {
        carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    });

    carousel.addEventListener('scroll', updateArrows);
    updateArrows();

    // Click on category item scrolls to menu category
    carousel.querySelectorAll('.category-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.getAttribute('href');
            const target = document.querySelector(targetId);
            if (target) {
                const offset = 100;
                const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
                window.scrollTo({ top, behavior: 'smooth' });
            }
        });
    });
})();

// ===== MENU SEARCH =====
(function() {
    var searchEl = document.getElementById('menu-search');
    if (!searchEl) return;
    searchEl.addEventListener('input', function(e) {
        var query = e.target.value.toLowerCase();
        document.querySelectorAll('.menu-item-card').forEach(function(card) {
            var nameEl = card.querySelector('h4');
            var descEl = card.querySelector('.item-description');
            var name = nameEl ? nameEl.textContent.toLowerCase() : '';
            var desc = descEl ? descEl.textContent.toLowerCase() : '';
            card.style.display = (name.includes(query) || desc.includes(query)) ? '' : 'none';
        });
    });
})();

// ===== VEG/NON-VEG FILTER =====
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.dataset.filter;
        document.querySelectorAll('.menu-item-card').forEach(card => {
            const hasVeg = card.querySelector('.veg-badge');
            const hasNonVeg = card.querySelector('.nonveg-badge');
            if (filter === 'all') {
                card.style.display = '';
            } else if (filter === 'veg') {
                card.style.display = hasVeg ? '' : 'none';
            } else if (filter === 'non-veg') {
                card.style.display = hasNonVeg ? '' : 'none';
            }
        });
    });
});

// ===== BACK TO TOP =====
const backToTop = document.getElementById('back-to-top');
if (backToTop) {
    backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ===== CONSOLIDATED SCROLL HANDLER (rAF-throttled) =====
const sections = document.querySelectorAll('section[id]');
const navAnchors = document.querySelectorAll('.nav-links a[href^="#"]');

// Cache DOM queries that were running every frame
var _scrollIndicator = document.querySelector('.hero-scroll-indicator');
var _ringFill = document.getElementById('btt-ring-fill');
var _stickyBar = document.getElementById('sticky-order-bar');
var _heroEl = document.querySelector('.hero');
var _circumference = 2 * Math.PI * 16;
var _cachedHeroHeight = _heroEl ? _heroEl.offsetHeight : 600;
var _cachedSectionTops = [];
(function cacheSectionTops() {
    sections.forEach(function(s) {
        _cachedSectionTops.push({ id: s.getAttribute('id'), top: s.offsetTop });
    });
})();
// Refresh cached layout values on resize
window.addEventListener('resize', function() {
    _cachedHeroHeight = _heroEl ? _heroEl.offsetHeight : 600;
    _cachedSectionTops = [];
    sections.forEach(function(s) {
        _cachedSectionTops.push({ id: s.getAttribute('id'), top: s.offsetTop });
    });
    // Refresh parallax section offsets
    _aboutTop = _aboutEl ? _aboutEl.offsetTop : 0;
    _chefTop = _chefSec ? _chefSec.offsetTop : 0;
    _statsTop = _statsSec ? _statsSec.offsetTop : 0;
});

// Cache parallax section references
var _aboutEl = document.querySelector('.about');
var _chefContentEl = document.querySelector('.chef-content');
var _statsGridEl = document.querySelector('.stats-grid');
var _aboutTop = _aboutEl ? _aboutEl.offsetTop : 0;
var _chefSec = _chefContentEl ? _chefContentEl.closest('section') || _chefContentEl.closest('.chef-section') : null;
var _chefTop = _chefSec ? _chefSec.offsetTop : 0;
var _statsSec = _statsGridEl ? _statsGridEl.closest('.stats-section') : null;
var _statsTop = _statsSec ? _statsSec.offsetTop : 0;

var _scrollTicking = false;
window.addEventListener('scroll', function() {
    if (!_scrollTicking) {
        requestAnimationFrame(function() {
            var currentScroll = window.pageYOffset;
            var isDesktop = window.innerWidth > 768;

            // Parallax hero (desktop only)
            if (heroSlideshow && isDesktop) {
                heroSlideshow.style.transform = 'translateY(' + (currentScroll * 0.35) + 'px)';
            }

            // Parallax for About, Chef, Stats (desktop only)
            if (isDesktop) {
                var wh = window.innerHeight;
                if (_aboutEl && currentScroll > _aboutTop - wh && currentScroll < _aboutTop + _aboutEl.offsetHeight) {
                    var offset = (currentScroll - _aboutTop + wh) * 0.06;
                    _aboutEl.style.setProperty('--section-parallax', offset + 'px');
                }
                if (_chefContentEl && currentScroll > _chefTop - wh && currentScroll < _chefTop + 800) {
                    _chefContentEl.style.transform = 'translateY(' + ((currentScroll - _chefTop + wh) * 0.04) + 'px)';
                }
                if (_statsGridEl && currentScroll > _statsTop - wh && currentScroll < _statsTop + 600) {
                    _statsGridEl.style.transform = 'translateY(' + ((currentScroll - _statsTop + wh) * 0.035) + 'px)';
                }
            }

            // Fade hero scroll indicator (skip once fully hidden)
            if (_scrollIndicator && currentScroll < 300) {
                _scrollIndicator.style.opacity = Math.max(0, 1 - currentScroll / 300);
            } else if (_scrollIndicator && _scrollIndicator.style.opacity !== '0') {
                _scrollIndicator.style.opacity = 0;
            }

            // Header hide/show (desktop only)
            if (isDesktop) {
                if (currentScroll > lastScroll && currentScroll > 100) {
                    header.style.transform = 'translateY(-100%)';
                } else {
                    header.style.transform = 'translateY(0)';
                }
            }
            lastScroll = currentScroll;

            // Back to top visibility (only toggle when state changes)
            if (backToTop) {
                var shouldShow = currentScroll > 400;
                var isVisible = backToTop.classList.contains('visible');
                if (shouldShow && !isVisible) backToTop.classList.add('visible');
                else if (!shouldShow && isVisible) backToTop.classList.remove('visible');
            }
            if (_ringFill) {
                var docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
                var scrollPercent = docHeight > 0 ? currentScroll / docHeight : 0;
                _ringFill.style.strokeDashoffset = _circumference * (1 - scrollPercent);
            }

            // Sticky order bar (only toggle when state changes)
            if (_stickyBar) {
                var barShouldShow = currentScroll > _cachedHeroHeight;
                var barIsVisible = _stickyBar.classList.contains('visible');
                if (barShouldShow && !barIsVisible) _stickyBar.classList.add('visible');
                else if (!barShouldShow && barIsVisible) _stickyBar.classList.remove('visible');
            }

            // Active nav link tracking — skip on mobile (nav hidden in hamburger)
            if (isDesktop) {
                var currentSection = '';
                for (var i = 0; i < _cachedSectionTops.length; i++) {
                    if (currentScroll >= _cachedSectionTops[i].top - 150) {
                        currentSection = _cachedSectionTops[i].id;
                    }
                }
                navAnchors.forEach(function(a) {
                    a.classList.remove('active');
                    if (a.getAttribute('href') === '#' + currentSection) {
                        a.classList.add('active');
                    }
                });
            }

            _scrollTicking = false;
        });
        _scrollTicking = true;
    }
}, { passive: true });

// ===== PREMIUM SCROLL REVEAL WITH STAGGER =====
(function() {
    const revealElements = document.querySelectorAll('.about-text, .special-card, .menu-category, .gallery-item, .review-card, .faq-item, .info-block, .contact-form-section, .stat-item, .chef-content, .trust-badge');

    revealElements.forEach((el) => {
        el.classList.add('reveal');
        const siblings = el.parentElement ? Array.from(el.parentElement.children).filter(c => c.classList.contains(el.classList[0])) : [];
        const siblingIndex = siblings.indexOf(el);
        if (siblingIndex > 0) {
            // Wave-like cascade using sine curve for organic feel
            var cascadeDelay = 0.07 * siblingIndex + 0.04 * Math.sin(siblingIndex * Math.PI / 4);
            el.style.transitionDelay = Math.max(0, cascadeDelay).toFixed(3) + 's';
        }
    });

    // Staggered reveal for individual menu item cards — alternating left/right sweep
    document.querySelectorAll('.menu-item-card').forEach((card) => {
        card.classList.add('reveal');
        const siblingCards = card.parentElement ? Array.from(card.parentElement.children) : [];
        const siblingIndex = siblingCards.indexOf(card);
        var row = Math.floor(siblingIndex / 2);
        var col = siblingIndex % 2;
        card.style.transitionDelay = (row * 0.12 + col * 0.06).toFixed(3) + 's';
    });

    // Section-level entrance animations
    document.querySelectorAll('.about, .specials, .menu, .gallery, .reviews, .contact, .faq').forEach(section => {
        section.classList.add('section-reveal');
    });

    // Directional reveals for chef section
    const chefImage = document.querySelector('.chef-image');
    const chefInfo = document.querySelector('#chef-info');
    if (chefImage) chefImage.classList.add('reveal-left');
    if (chefInfo) chefInfo.classList.add('reveal-right');

    // Scale reveal for stats
    document.querySelectorAll('.stat-item').forEach(el => {
        el.classList.remove('reveal');
        el.classList.add('reveal-scale');
    });

    const allReveals = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale, .section-reveal');

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -50px 0px' });

    allReveals.forEach(el => revealObserver.observe(el));
})();

// ===== CHEF SLIDESHOW =====
(function() {
    const slides = document.querySelectorAll('#chef-slideshow .chef-slide');
    const infoSlides = document.querySelectorAll('.chef-info-slide');
    if (slides.length <= 1) return;
    let current = 0;
    setInterval(() => {
        slides[current].classList.remove('active');
        if (infoSlides[current]) infoSlides[current].classList.remove('active');
        current = (current + 1) % slides.length;
        slides[current].classList.add('active');
        if (infoSlides[current]) infoSlides[current].classList.add('active');
    }, 4000);
})();

// ===== SPICE LEVEL SELECTOR =====
window.selectSpice = function(el) {
    const selector = el.parentElement;
    selector.querySelectorAll('.spice-level').forEach(s => s.classList.remove('active'));
    el.classList.add('active');
};

// ===== REVIEWS CAROUSEL =====
(function() {
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

    // Pause auto-scroll on hover
    const carouselWrapper = document.querySelector('.reviews-carousel-wrapper');
    if (carouselWrapper) {
        carouselWrapper.addEventListener('mouseenter', () => {
            clearInterval(autoSlide);
        });
        carouselWrapper.addEventListener('mouseleave', () => {
            resetAutoSlide();
        });
    }

    // Reset on resize
    window.addEventListener('resize', () => {
        carouselIndex = 0;
        slideToIndex();
        resetAutoSlide();
    });

    autoSlide = setInterval(autoAdvance, 4000);
})();

// ===== GALLERY SLIDESHOW =====
(function() {
    const slides = document.querySelectorAll('.gallery-slide');
    const dotsContainer = document.getElementById('gallery-dots');
    let currentSlide = 0;

    // Build dots
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
        slides[index].classList.add('active');
        currentSlide = index;
        const dots = document.querySelectorAll('.gallery-dot');
        dots.forEach((d, i) => d.classList.toggle('active', i === index));
    }

    window.moveGallerySlide = function(dir) {
        if (slides.length === 0) return;
        let next = (currentSlide + dir + slides.length) % slides.length;
        goToGallerySlide(next);
    };

    // Auto-advance gallery slideshow
    if (slides.length > 1) {
        setInterval(() => { window.moveGallerySlide(1); }, 5000);
    }
})();

// ===== GALLERY LIGHTBOX =====
(function() {
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
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') navigateLightbox(-1);
        if (e.key === 'ArrowRight') navigateLightbox(1);
    });
})();

// ===== CONFETTI ANIMATION =====
function launchConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const pieces = [];
    const colors = ['#EFB31A', '#8B1A1A', '#27ae60', '#e74c3c', '#3498db', '#f39c12', '#9b59b6'];

    for (let i = 0; i < 150; i++) {
        pieces.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            w: Math.random() * 10 + 5,
            h: Math.random() * 6 + 3,
            color: colors[Math.floor(Math.random() * colors.length)],
            vy: Math.random() * 3 + 2,
            vx: Math.random() * 2 - 1,
            rot: Math.random() * 360,
            rotSpeed: Math.random() * 6 - 3
        });
    }

    let frame = 0;
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        pieces.forEach(p => {
            p.y += p.vy;
            p.x += p.vx;
            p.rot += p.rotSpeed;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rot * Math.PI) / 180);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            ctx.restore();
        });
        frame++;
        if (frame < 200) {
            requestAnimationFrame(animate);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }
    animate();
}

// Confetti is now called directly inside placeOrderToFirestore().then() callback

// ===== COUPON / PROMO CODE =====
// appliedCoupon is declared earlier (before getCheckoutTotal)

window.applyCoupon = function() {
    const input = document.getElementById('coupon-code');
    const msg = document.getElementById('coupon-msg');
    const code = input.value.trim().toUpperCase();

    // Hardcoded fallback in case Firestore is unavailable
    const fallbackCoupons = {
        'AMOGHA20': { discount: 20, type: 'percent', label: '20% off' },
        'WELCOME50': { discount: 50, type: 'flat', label: '₹50 off' },
        'FIRST10': { discount: 10, type: 'percent', label: '10% off' },
        'WELCOME25': { discount: 25, type: 'percent', label: '25% off (Welcome Bonus!)' }
    };

    function applyCouponData(coupon) {
        appliedCoupon = coupon;
        msg.textContent = 'Coupon applied! ' + coupon.label;
        msg.className = 'coupon-msg success';
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const deliveryFee = subtotal >= 500 ? 0 : 49;
        let discount = coupon.type === 'percent' ? (subtotal * coupon.discount / 100) : coupon.discount;
        if (coupon.maxDiscount && coupon.type === 'percent') discount = Math.min(discount, coupon.maxDiscount);
        discount = Math.min(discount, subtotal);
        const total = subtotal - discount + deliveryFee;
        document.getElementById('co-total').textContent = '\u20B9' + total.toFixed(0);
    }

    // Try Firestore first, fallback to hardcoded
    if (typeof db !== 'undefined') {
        db.collection('coupons').doc(code).get().then(function(doc) {
            if (doc.exists) {
                var c = doc.data();
                if (!c.active) { msg.textContent = 'This coupon is no longer active.'; msg.className = 'coupon-msg error'; appliedCoupon = null; return; }
                if (c.expiresAt && new Date(c.expiresAt) < new Date()) { msg.textContent = 'This coupon has expired.'; msg.className = 'coupon-msg error'; appliedCoupon = null; return; }
                if (c.usageLimit && c.usedCount >= c.usageLimit) { msg.textContent = 'This coupon has reached its usage limit.'; msg.className = 'coupon-msg error'; appliedCoupon = null; return; }
                var subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
                if (c.minOrder && subtotal < c.minOrder) { msg.textContent = 'Minimum order \u20B9' + c.minOrder + ' required.'; msg.className = 'coupon-msg error'; appliedCoupon = null; return; }
                applyCouponData(c);
                db.collection('coupons').doc(code).update({ usedCount: firebase.firestore.FieldValue.increment(1) });
            } else if (fallbackCoupons[code]) {
                applyCouponData(fallbackCoupons[code]);
            } else {
                appliedCoupon = null;
                msg.textContent = 'Invalid coupon code. Please check and try again.';
                msg.className = 'coupon-msg error';
            }
        }).catch(function() {
            if (fallbackCoupons[code]) applyCouponData(fallbackCoupons[code]);
            else { appliedCoupon = null; msg.textContent = 'Invalid coupon code.'; msg.className = 'coupon-msg error'; }
        });
    } else if (fallbackCoupons[code]) {
        applyCouponData(fallbackCoupons[code]);
    } else {
        appliedCoupon = null;
        msg.textContent = 'Invalid coupon code. Please check and try again.';
        msg.className = 'coupon-msg error';
    }
};

// ===== FLOATING FOOD PARTICLES =====
(function() {
    const container = document.getElementById('food-particles');
    if (!container) return;
    const emojis = ['🍛', '🍚', '🌶️', '🍗', '🥘', '🫓', '☕', '🍲'];

    for (let i = 0; i < 12; i++) {
        const particle = document.createElement('span');
        particle.className = 'food-particle';
        particle.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDuration = (15 + Math.random() * 20) + 's';
        particle.style.animationDelay = (Math.random() * 15) + 's';
        particle.style.fontSize = (1 + Math.random() * 1.5) + 'rem';
        container.appendChild(particle);
    }
})();

// ===== GIFT CARD SYSTEM =====
var selectedGcAmount = 500;
var appliedGiftCard = null;

function selectGcAmount(amount, btn) {
    selectedGcAmount = amount;
    document.querySelectorAll('.gc-amount-btn').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
}

window.openGiftCardModal = function() {
    document.getElementById('giftcard-modal').style.display = 'block';
    lockScroll();
};

window.closeGiftCardModal = function() {
    document.getElementById('giftcard-modal').style.display = 'none';
    unlockScroll();
};

window.buyGiftCard = function() {
    var recipientPhone = document.getElementById('gc-recipient-phone').value.trim();
    var msg = document.getElementById('gc-msg');
    if (!recipientPhone || recipientPhone.length !== 10) {
        msg.textContent = 'Please enter a valid 10-digit phone number';
        msg.className = 'coupon-msg error';
        return;
    }
    var currentUser = getCurrentUser();
    var purchaserPhone = currentUser ? currentUser.phone : 'guest';
    var amount = selectedGcAmount;

    // Generate unique code
    var code = 'GC-' + Date.now().toString(36).toUpperCase().slice(-4) + '-' + Math.random().toString(36).toUpperCase().slice(2, 6);

    // Use Razorpay to collect payment
    if (typeof Razorpay === 'undefined') {
        msg.textContent = 'Payment system loading. Please try again.';
        msg.className = 'coupon-msg error';
        return;
    }

    var options = {
        key: 'rzp_live_bfHYCYWDyoSHFn',
        amount: amount * 100,
        currency: 'INR',
        name: 'Amogha Cafe',
        description: 'Gift Card - ' + code,
        image: 'https://amogha-cafe.web.app/amogha-logo.png',
        handler: function(response) {
            // Payment success — save gift card to Firestore
            db.collection('giftCards').doc(code).set({
                code: code,
                amount: amount,
                balance: amount,
                purchaserPhone: purchaserPhone,
                recipientPhone: recipientPhone,
                paymentRef: response.razorpay_payment_id,
                active: true,
                createdAt: new Date().toISOString()
            }).then(function() {
                msg.textContent = 'Gift card ' + code + ' created successfully! Share this code with the recipient.';
                msg.className = 'coupon-msg success';
                document.getElementById('gc-recipient-phone').value = '';
            }).catch(function(err) {
                msg.textContent = 'Payment received but error saving: ' + err.message;
                msg.className = 'coupon-msg error';
            });
        },
        prefill: {
            name: currentUser ? currentUser.name : '',
            contact: purchaserPhone
        },
        theme: { color: '#D4A017' }
    };
    var rzp = new Razorpay(options);
    rzp.open();
};

window.applyGiftCard = function() {
    var input = document.getElementById('giftcard-code');
    var msg = document.getElementById('giftcard-msg');
    var code = input.value.trim().toUpperCase();

    if (!code) { msg.textContent = 'Please enter a gift card code'; msg.className = 'coupon-msg error'; return; }

    if (typeof db === 'undefined') { msg.textContent = 'Service unavailable'; msg.className = 'coupon-msg error'; return; }

    db.collection('giftCards').doc(code).get().then(function(doc) {
        if (!doc.exists) { msg.textContent = 'Invalid gift card code'; msg.className = 'coupon-msg error'; appliedGiftCard = null; return; }
        var gc = doc.data();
        if (!gc.active) { msg.textContent = 'This gift card is no longer active'; msg.className = 'coupon-msg error'; appliedGiftCard = null; return; }
        if (gc.balance <= 0) { msg.textContent = 'This gift card has no remaining balance'; msg.className = 'coupon-msg error'; appliedGiftCard = null; return; }

        appliedGiftCard = { code: code, balance: gc.balance };
        msg.textContent = 'Gift card applied! Balance: \u20B9' + gc.balance;
        msg.className = 'coupon-msg success';

        // Recalculate total
        var subtotal = cart.reduce(function(s, i) { return s + i.price * i.quantity; }, 0);
        var deliveryFee = subtotal >= 500 ? 0 : 49;
        var couponDiscount = 0;
        if (appliedCoupon) {
            couponDiscount = appliedCoupon.type === 'percent' ? (subtotal * appliedCoupon.discount / 100) : appliedCoupon.discount;
            if (appliedCoupon.maxDiscount) couponDiscount = Math.min(couponDiscount, appliedCoupon.maxDiscount);
            couponDiscount = Math.min(couponDiscount, subtotal);
        }
        var afterCoupon = subtotal - couponDiscount + deliveryFee;
        var gcDeduction = Math.min(gc.balance, afterCoupon);
        var total = afterCoupon - gcDeduction;
        document.getElementById('co-total').textContent = '\u20B9' + total.toFixed(0);
    }).catch(function(err) {
        msg.textContent = 'Error: ' + err.message;
        msg.className = 'coupon-msg error';
    });
};

// ===== PWA INSTALL PROMPT =====
(function() {
    let deferredPrompt;
    var pwaPrompt = document.getElementById('pwa-prompt');
    var installBtn = document.getElementById('pwa-install-btn');
    var dismissBtn = document.getElementById('pwa-dismiss-btn');

    function hidePwaPrompt() {
        if (pwaPrompt) {
            pwaPrompt.style.opacity = '0';
            pwaPrompt.style.transform = 'translateX(-50%) translateY(30px)';
            setTimeout(function() { pwaPrompt.style.display = 'none'; }, 400);
        }
    }

    window.addEventListener('beforeinstallprompt', function(e) {
        e.preventDefault();
        deferredPrompt = e;
        if (pwaPrompt) pwaPrompt.style.display = 'flex';
    });

    if (installBtn) {
        installBtn.addEventListener('click', function() {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then(function() {
                    deferredPrompt = null;
                    hidePwaPrompt();
                });
            }
        });
    }

    if (dismissBtn) {
        dismissBtn.addEventListener('click', hidePwaPrompt);
    }
})();

// ===== MAGNETIC BUTTON EFFECT =====
(function() {
    if (window.innerWidth <= 768) return;

    const magneticButtons = document.querySelectorAll('.cta-button, .add-to-cart');
    magneticButtons.forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = '';
        });
    });
})();

// ===== BLUR-UP IMAGE REVEAL ON LOAD =====
(function() {
    function revealImage(img) {
        if (img.complete && img.naturalHeight > 0) {
            img.classList.add('loaded');
        } else {
            img.addEventListener('load', () => img.classList.add('loaded'));
        }
    }

    // Handle existing images
    document.querySelectorAll('img[loading="lazy"]').forEach(revealImage);

    // Handle dynamically added images via MutationObserver
    const imgObserver = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.tagName === 'IMG' && node.loading === 'lazy') {
                    revealImage(node);
                }
            });
        });
    });
    imgObserver.observe(document.body, { childList: true, subtree: true });
})();

// ===== TILT EFFECT ON CARDS (Premium - covers special + menu cards) =====
// (Moved to premium 3D tilt section below)

// ===== AUTH SYSTEM (Sign In / Sign Up) =====
function updateCarouselGreeting() {
    var el = document.getElementById('carousel-greeting');
    if (!el) return;
    var user = getCurrentUser();
    if (user && user.name) {
        el.textContent = 'Hey ' + user.name.split(' ')[0] + ', ';
    } else {
        el.textContent = '';
    }
}

(function() {
    try {
        const savedUser = safeGetItem('amoghaUser');
        if (savedUser) {
            updateSignInUI(JSON.parse(savedUser));
        }
        updateCarouselGreeting();
    } catch (e) {
        console.error('Auth restore error:', e);
    }
})();


function getCurrentUser() {
    try {
        const data = safeGetItem('amoghaUser');
        return data ? JSON.parse(data) : null;
    } catch(e) { return null; }
}

function setCurrentUser(user) {
    safeSetItem('amoghaUser', JSON.stringify(user));
    // Start listening for order status notifications
    if (user && user.phone && typeof db !== 'undefined' && !window._notifListenerActive) {
        window._notifListenerActive = true;
        db.collection('notifications').where('userPhone', '==', user.phone).where('read', '==', false)
            .onSnapshot(function(snap) {
                snap.docChanges().forEach(function(change) {
                    if (change.type === 'added') {
                        var n = change.doc.data();
                        if (typeof sendPushNotification === 'function') sendPushNotification(n.title, n.body);
                        change.doc.ref.update({ read: true });
                    }
                });
            }, function(err) { console.error('Notification listener error:', err); });
    }
}

function openAuthModal() {
    const user = getCurrentUser();
    if (user) {
        if (confirm('Signed in as ' + (user.name || 'Guest') + '\n\nDo you want to sign out?')) {
            signOut();
        }
        return;
    }
    document.getElementById('auth-modal').style.display = 'block';
    lockScroll();
    switchAuthView('signup');
}

function closeAuthModal() {
    document.getElementById('auth-modal').style.display = 'none';
    unlockScroll();
    document.getElementById('signup-name').value = '';
    document.getElementById('signup-phone').value = '';
    document.getElementById('signup-password').value = '';
    document.getElementById('signin-phone').value = '';
    document.getElementById('signin-password').value = '';
    document.getElementById('signup-msg').textContent = '';
    document.getElementById('signup-msg').className = 'auth-msg';
    document.getElementById('signin-msg').textContent = '';
    document.getElementById('signin-msg').className = 'auth-msg';
    document.getElementById('forgot-phone').value = '';
    document.getElementById('forgot-name').value = '';
    document.getElementById('forgot-new-password').value = '';
    document.getElementById('forgot-confirm-password').value = '';
    document.getElementById('forgot-msg').textContent = '';
    document.getElementById('forgot-msg').className = 'auth-msg';
    document.getElementById('forgot-step-1').style.display = '';
    document.getElementById('forgot-step-2').style.display = 'none';
    forgotPhoneVerified = null;
}

function switchAuthView(view) {
    document.querySelectorAll('.auth-view').forEach(v => v.classList.remove('active'));
    document.getElementById('auth-' + view).classList.add('active');
}

function handleSignUp() {
    var name = document.getElementById('signup-name').value.trim();
    var phone = document.getElementById('signup-phone').value.trim();
    var password = document.getElementById('signup-password').value;
    var msg = document.getElementById('signup-msg');

    if (!name) {
        msg.textContent = 'Please enter your name.';
        msg.className = 'auth-msg error';
        return;
    }
    if (!/^\d{10}$/.test(phone)) {
        msg.textContent = 'Please enter a valid 10-digit phone number.';
        msg.className = 'auth-msg error';
        return;
    }
    if (!/^\d{4}$/.test(password)) {
        msg.textContent = 'Please enter a 4-digit PIN.';
        msg.className = 'auth-msg error';
        return;
    }

    msg.textContent = 'Creating account...';
    msg.className = 'auth-msg';

    // Check if Firestore is available
    if (typeof db === 'undefined' || !db) {
        msg.textContent = 'Service unavailable. Please refresh and try again.';
        msg.className = 'auth-msg error';
        return;
    }

    db.collection('users').doc(phone).get().then(function(doc) {
        if (doc.exists) {
            msg.textContent = 'This phone number is already registered. Please sign in.';
            msg.className = 'auth-msg error';
            return;
        }
        var newUser = { name: name, phone: phone, pin: password, usedWelcomeBonus: false, createdAt: new Date().toISOString() };
        return db.collection('users').doc(phone).set(newUser).then(function() {
            try {
                setCurrentUser(newUser);
                updateSignInUI(newUser);
                updateCarouselGreeting();
                closeAuthModal();
                showAuthToast('Welcome, ' + (name || 'Guest') + '! 25% off applied to your first order!');
            } catch (uiErr) {
                console.error('SignUp UI error:', uiErr);
                closeAuthModal();
                showAuthToast('Account created successfully!');
            }
        });
    }).catch(function(err) {
        console.error('SignUp error:', err);
        var errMsg = err.code === 'permission-denied' ? 'Access denied. Please contact support.' : 'Connection error. Please check your internet and try again.';
        msg.textContent = errMsg + ' (' + (err.code || err.message || 'unknown') + ')';
        msg.className = 'auth-msg error';
    });
}

function handleSignIn() {
    var phone = document.getElementById('signin-phone').value.trim();
    var password = document.getElementById('signin-password').value;
    var msg = document.getElementById('signin-msg');

    if (!/^\d{10}$/.test(phone)) {
        msg.textContent = 'Please enter a valid 10-digit phone number.';
        msg.className = 'auth-msg error';
        return;
    }
    if (!/^\d{4}$/.test(password)) {
        msg.textContent = 'Please enter your 4-digit PIN.';
        msg.className = 'auth-msg error';
        return;
    }

    msg.textContent = 'Signing in...';
    msg.className = 'auth-msg';

    // Check if Firestore is available
    if (typeof db === 'undefined' || !db) {
        msg.textContent = 'Service unavailable. Please refresh and try again.';
        msg.className = 'auth-msg error';
        return;
    }

    db.collection('users').doc(phone).get().then(function(doc) {
        if (!doc.exists) {
            msg.textContent = 'No account found with this number. Please sign up.';
            msg.className = 'auth-msg error';
            return;
        }
        var user = doc.data();
        if ((user.pin || user.password) !== password) {
            msg.textContent = 'Incorrect PIN. Please try again.';
            msg.className = 'auth-msg error';
            return;
        }
        try {
            setCurrentUser(user);
            updateSignInUI(user);
            updateCarouselGreeting();
            closeAuthModal();
            var userName = user.name || 'Guest';
            var bonusMsg = !user.usedWelcomeBonus ? ' Your 25% welcome bonus is still active!' : '';
            showAuthToast('Welcome back, ' + userName + '!' + bonusMsg);
        } catch (uiErr) {
            console.error('SignIn UI error:', uiErr);
            closeAuthModal();
            showAuthToast('Signed in successfully!');
        }
    }).catch(function(err) {
        console.error('SignIn error:', err);
        msg.textContent = 'Connection error. Please check your internet and try again.';
        msg.className = 'auth-msg error';
    });
}

var forgotPhoneVerified = null;

function handleForgotPassword() {
    var phone = document.getElementById('forgot-phone').value.trim();
    var name = document.getElementById('forgot-name').value.trim();
    var msg = document.getElementById('forgot-msg');

    if (!/^\d{10}$/.test(phone)) {
        msg.textContent = 'Please enter a valid 10-digit phone number.';
        msg.className = 'auth-msg error';
        return;
    }
    if (!name) {
        msg.textContent = 'Please enter your registered name.';
        msg.className = 'auth-msg error';
        return;
    }

    msg.textContent = 'Verifying...';
    msg.className = 'auth-msg';

    if (typeof db === 'undefined' || !db) {
        msg.textContent = 'Service unavailable. Please refresh and try again.';
        msg.className = 'auth-msg error';
        return;
    }

    db.collection('users').doc(phone).get().then(function(doc) {
        if (!doc.exists) {
            msg.textContent = 'No account found with this phone number.';
            msg.className = 'auth-msg error';
            return;
        }
        var user = doc.data();
        if (user.name.toLowerCase() !== name.toLowerCase()) {
            msg.textContent = 'Name does not match our records.';
            msg.className = 'auth-msg error';
            return;
        }
        forgotPhoneVerified = phone;
        msg.textContent = '';
        msg.className = 'auth-msg';
        document.getElementById('forgot-step-1').style.display = 'none';
        document.getElementById('forgot-step-2').style.display = 'block';
    }).catch(function(err) {
        console.error('Forgot password error:', err);
        msg.textContent = err.code === 'permission-denied' ? 'Access denied. Please contact support.' : 'Network error. Please check your connection and try again.';
        msg.className = 'auth-msg error';
    });
}

function handleResetPassword() {
    var newPass = document.getElementById('forgot-new-password').value;
    var confirmPass = document.getElementById('forgot-confirm-password').value;
    var msg = document.getElementById('forgot-msg');

    if (!/^\d{4}$/.test(newPass)) {
        msg.textContent = 'Please enter a 4-digit PIN.';
        msg.className = 'auth-msg error';
        return;
    }
    if (newPass !== confirmPass) {
        msg.textContent = 'PINs do not match.';
        msg.className = 'auth-msg error';
        return;
    }

    msg.textContent = 'Resetting PIN...';
    msg.className = 'auth-msg';

    if (typeof db === 'undefined' || !db) {
        msg.textContent = 'Service unavailable. Please refresh and try again.';
        msg.className = 'auth-msg error';
        return;
    }

    db.collection('users').doc(forgotPhoneVerified).update({ pin: newPass }).then(function() {
        forgotPhoneVerified = null;
        msg.textContent = '';
        msg.className = 'auth-msg';
        closeAuthModal();
        showAuthToast('PIN reset successful! Please sign in.');
    }).catch(function() {
        msg.textContent = 'Something went wrong. Please try again.';
        msg.className = 'auth-msg error';
    });
}

function togglePassword(inputId, btn) {
    var input = document.getElementById(inputId);
    var eyeOpen = btn.querySelector('.eye-open');
    var eyeClosed = btn.querySelector('.eye-closed');
    if (input.type === 'password') {
        input.type = 'text';
        eyeOpen.style.display = 'none';
        eyeClosed.style.display = '';
    } else {
        input.type = 'password';
        eyeOpen.style.display = '';
        eyeClosed.style.display = 'none';
    }
}

function signOut() {
    try { localStorage.removeItem('amoghaUser'); } catch(e) {}
    const btn = document.getElementById('signin-btn');
    btn.className = 'signin-nav-btn';
    btn.innerHTML = '<svg class="signin-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span id="signin-text">Sign In</span>';
    updateCarouselGreeting();
    if (typeof updateLoyaltyWidget === 'function') updateLoyaltyWidget();
    showAuthToast('You have been signed out.');
}

function updateSignInUI(user) {
    const btn = document.getElementById('signin-btn');
    if (!btn || !user) return;
    var userName = user.name || 'Guest';
    var initials = userName.split(' ').filter(function(w) { return w.length > 0; }).map(function(w) { return w[0]; }).join('').toUpperCase().slice(0, 2) || 'G';
    btn.className = 'signin-nav-btn signed-in';
    btn.innerHTML = '<span class="user-avatar">' + initials + '</span><span id="signin-text">' + userName.split(' ')[0] + '</span>';
    if (typeof updateLoyaltyWidget === 'function') updateLoyaltyWidget();
}

function showAuthToast(message) {
    var toast = document.getElementById('auth-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'auth-toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.remove('visible');
    void toast.offsetWidth;
    toast.classList.add('visible');
    setTimeout(function() { toast.classList.remove('visible'); }, 4000);
}

// Close auth modal on backdrop click
window.addEventListener('click', function(e) {
    var authModal = document.getElementById('auth-modal');
    if (e.target === authModal) {
        closeAuthModal();
    }
});

// ===== PREMIUM: MOUSE-FOLLOW SPOTLIGHT ON HERO =====
(function() {
    if (window.innerWidth <= 768) return;
    const hero = document.querySelector('.hero');
    const spotlight = document.querySelector('.hero-mouse-spotlight');
    if (!hero || !spotlight) return;

    hero.addEventListener('mousemove', function(e) {
        const rect = hero.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        spotlight.style.setProperty('--mouse-x', x + 'px');
        spotlight.style.setProperty('--mouse-y', y + 'px');
    });
})();

// ===== PREMIUM: 3D CARD TILT EFFECT =====
(function() {
    if (window.innerWidth <= 768) return; // skip on mobile

    const cards = document.querySelectorAll('.menu-item-card');
    const maxTilt = 4; // degrees

    cards.forEach(function(card) {
        card.addEventListener('mousemove', function(e) {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = ((y - centerY) / centerY) * -maxTilt;
            const rotateY = ((x - centerX) / centerX) * maxTilt;

            card.style.transform = 'perspective(800px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) translateY(-4px)';
        });

        card.addEventListener('mouseleave', function() {
            card.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
            card.style.transform = 'perspective(800px) rotateX(0) rotateY(0) translateY(0)';
            setTimeout(function() {
                card.style.transition = '';
            }, 500);
        });
    });
})();

// ============================================================
// ULTRA-PREMIUM TIER 2 — NEXT-LEVEL FEATURES
// ============================================================

// ===== 1. CURSOR GLOW TRAIL =====
(function() {
    if (window.innerWidth <= 768) return;
    var glow = document.getElementById('cursor-glow');
    if (!glow) return;
    var mx = 0, my = 0, gx = 0, gy = 0;
    var active = false;

    document.addEventListener('mousemove', function(e) {
        mx = e.clientX;
        my = e.clientY;
        if (!active) {
            active = true;
            glow.classList.add('active');
        }
    });

    document.addEventListener('mouseleave', function() {
        active = false;
        glow.classList.remove('active');
    });

    function animate() {
        gx += (mx - gx) * 0.12;
        gy += (my - gy) * 0.12;
        glow.style.left = gx + 'px';
        glow.style.top = gy + 'px';
        requestAnimationFrame(animate);
    }
    animate();
})();

// ===== 2. SOFT BLUR UNREVEAL EFFECT — cinematic focus pull =====
(function() {
    var taglineEl = document.querySelector('.hero-tagline .hero-text-inner');
    if (!taglineEl) return;

    window._scrambleReveal = function(text, element) {
        element.textContent = text;
        element.classList.remove('fade-out');
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
        element.classList.remove('blur-reveal');
        void element.offsetWidth; // force reflow
        element.classList.add('blur-reveal');
    };

    // Run blur reveal on first load
    setTimeout(function() {
        window._scrambleReveal(taglineEl.textContent, taglineEl);
    }, 2800);
})();

// ===== 3. SCROLL-LINKED PARALLAX LAYERS =====
(function() {
    if (window.innerWidth <= 768) return;

    var parallaxItems = [];

    // Chef image
    var chefImg = document.querySelector('.chef-image');
    if (chefImg) parallaxItems.push({ el: chefImg, speed: 0.04 });

    // About text cards
    document.querySelectorAll('.about-text').forEach(function(el, i) {
        parallaxItems.push({ el: el, speed: 0.02 + (i * 0.01) });
    });

    // Stat items
    document.querySelectorAll('.stat-item').forEach(function(el, i) {
        parallaxItems.push({ el: el, speed: 0.015 + (i * 0.008) });
    });

    if (parallaxItems.length === 0) return;

    var pxTicking = false;
    window.addEventListener('scroll', function() {
        if (!pxTicking) {
            requestAnimationFrame(function() {
                parallaxItems.forEach(function(item) {
                    var rect = item.el.getBoundingClientRect();
                    var centerY = rect.top + rect.height / 2;
                    var viewCenter = window.innerHeight / 2;
                    var offset = (centerY - viewCenter) * item.speed;
                    item.el.style.transform = 'translateY(' + offset + 'px)';
                });
                pxTicking = false;
            });
            pxTicking = true;
        }
    }, { passive: true });
})();

// ===== 4. SVG ORNAMENT DRAW-ON-SCROLL =====
(function() {
    var ornaments = document.querySelectorAll('.svg-ornament');
    if (ornaments.length === 0) return;

    var ornObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.5 });

    ornaments.forEach(function(orn) {
        ornObserver.observe(orn);
    });
})();

// ===== 5. MENU ITEM IMAGE PREVIEW ON HOVER =====
(function() {
    if (window.innerWidth <= 768) return;

    var previewImg = document.getElementById('menu-preview-img');
    if (!previewImg) return;

    // Map food names to category images (using existing generated images)
    var categoryImages = {
        'starters': 'pics/Gemini_Generated_Image_wnzsqxwnzsqxwnzs.png',
        'curries': 'pics/Gemini_Generated_Image_tu348stu348stu34.png',
        'biryanis': 'pics/Gemini_Generated_Image_h1vezgh1vezgh1ve.png',
        'kebabs': 'pics/Gemini_Generated_Image_5jdcgq5jdcgq5jdc.png',
        'noodles': 'pics/Gemini_Generated_Image_1ojbou1ojbou1ojb.png',
        'friedrice': 'pics/Gemini_Generated_Image_bfgo8abfgo8abfgo.png',
        'rotis': 'pics/Gemini_Generated_Image_6lqqu6lqqu6lqqu6.png'
    };

    function getCategoryForCard(card) {
        var category = card.closest('.menu-category');
        if (!category) return null;
        var id = category.id || '';
        if (id.indexOf('starters') !== -1) return 'starters';
        if (id.indexOf('curries') !== -1) return 'curries';
        if (id.indexOf('biryanis') !== -1) return 'biryanis';
        if (id.indexOf('kebabs') !== -1) return 'kebabs';
        if (id.indexOf('noodles') !== -1) return 'noodles';
        if (id.indexOf('friedrice') !== -1) return 'friedrice';
        if (id.indexOf('rotis') !== -1) return 'rotis';
        return null;
    }

    document.querySelectorAll('.menu-item-card').forEach(function(card) {
        card.addEventListener('mouseenter', function() {
            // Prefer per-item image from Firestore (set by menu sync listener)
            var itemImg = card.dataset.imageUrl;
            if (itemImg) {
                previewImg.src = itemImg;
                previewImg.classList.add('active');
            } else {
                // Fallback to category image
                var cat = getCategoryForCard(card);
                if (cat && categoryImages[cat]) {
                    previewImg.src = categoryImages[cat];
                    previewImg.classList.add('active');
                }
            }
        });

        card.addEventListener('mousemove', function(e) {
            previewImg.style.left = (e.clientX + 20) + 'px';
            previewImg.style.top = (e.clientY - 90) + 'px';
        });

        card.addEventListener('mouseleave', function() {
            previewImg.classList.remove('active');
        });
    });
})();

// ===== 6. MAGNETIC CURSOR ON GALLERY/CHEF IMAGES =====
(function() {
    if (window.innerWidth <= 768) return;

    var magneticImgs = document.querySelectorAll('.chef-slide, .gallery-slide-item img, .gallery-item img');
    var strength = 0.03;

    magneticImgs.forEach(function(img) {
        img.classList.add('magnetic-image');

        img.addEventListener('mousemove', function(e) {
            var rect = img.getBoundingClientRect();
            var x = e.clientX - rect.left - rect.width / 2;
            var y = e.clientY - rect.top - rect.height / 2;
            img.style.transform = 'translate(' + (x * strength) + 'px, ' + (y * strength) + 'px) scale(1.02)';
        });

        img.addEventListener('mouseleave', function() {
            img.style.transform = '';
        });
    });
})();

// ===== 7. ANIMATED GRADIENT BACKGROUNDS — CSS only, no JS needed =====

// ===== 8. CURSOR-AWARE LIGHT REFLECTION ON CARDS =====
(function() {
    if (window.innerWidth <= 768) return;

    var cards = document.querySelectorAll('.menu-item-card, .about-text');
    cards.forEach(function(card) {
        // Create reflection element
        var ref = document.createElement('div');
        ref.className = 'card-reflection';
        card.appendChild(ref);

        card.addEventListener('mousemove', function(e) {
            var rect = card.getBoundingClientRect();
            var x = e.clientX - rect.left;
            var y = e.clientY - rect.top;
            ref.style.setProperty('--ref-x', x + 'px');
            ref.style.setProperty('--ref-y', y + 'px');
        });
    });
})();

// ===== 9. ANIMATED GRADIENT TEXT MASK — CSS only, no JS needed =====

// ===== 10. SECTION WIPE TRANSITIONS ON SCROLL =====
(function() {
    var wipes = document.querySelectorAll('.section-wipe');
    if (wipes.length === 0) return;

    var wipeObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting && !entry.target.classList.contains('wipe-active')) {
                entry.target.classList.add('wipe-active');
            }
        });
    }, { threshold: 0.15 });

    wipes.forEach(function(el) {
        wipeObserver.observe(el);
    });
})();

// ===== BACKGROUND MUSIC — handled inline in index.html =====

// ============================================================
// PHASE 2 — 15 PREMIUM FEATURES
// ============================================================

// ===== FEATURE 1: LOYALTY & REWARDS PROGRAM =====
var LOYALTY_TIERS = [
    { name: 'Bronze', min: 0, color: '#cd7f32', icon: '🥉' },
    { name: 'Silver', min: 500, color: '#c0c0c0', icon: '🥈' },
    { name: 'Gold', min: 1000, color: '#D4A017', icon: '🥇' }
];

function getLoyaltyTier(points) {
    for (var i = LOYALTY_TIERS.length - 1; i >= 0; i--) {
        if (points >= LOYALTY_TIERS[i].min) return LOYALTY_TIERS[i];
    }
    return LOYALTY_TIERS[0];
}

function awardLoyaltyPoints(orderTotal) {
    var user = getCurrentUser();
    if (!user) return;
    var points = Math.floor(orderTotal / 10);
    // Streak bonus: check if ordered 3 consecutive days
    var today = new Date().toISOString().split('T')[0];
    var dates = user.orderDates || [];
    if (dates[dates.length - 1] !== today) {
        dates.push(today);
    }
    // Check for 3-day streak
    if (dates.length >= 3) {
        var last3 = dates.slice(-3);
        var d1 = new Date(last3[0]), d2 = new Date(last3[1]), d3 = new Date(last3[2]);
        var diff1 = (d2 - d1) / 86400000, diff2 = (d3 - d2) / 86400000;
        if (diff1 === 1 && diff2 === 1) {
            points = points * 2;
        }
    }
    // Keep only last 30 dates
    if (dates.length > 30) dates = dates.slice(-30);
    var newPoints = (user.loyaltyPoints || 0) + points;
    var oldTier = getLoyaltyTier(user.loyaltyPoints || 0);
    var newTier = getLoyaltyTier(newPoints);
    user.loyaltyPoints = newPoints;
    user.loyaltyTier = newTier.name;
    user.orderDates = dates;
    setCurrentUser(user);
    if (typeof db !== 'undefined' && db) {
        db.collection('users').doc(user.phone).update({
            loyaltyPoints: newPoints,
            loyaltyTier: newTier.name,
            orderDates: dates
        }).catch(function(e) { console.error('Loyalty tier update error:', e); });
    }
    // Show points earned toast
    var streakMsg = points > Math.floor(orderTotal / 10) ? ' (2x Streak Bonus!)' : '';
    showAuthToast('+' + points + ' loyalty points earned!' + streakMsg);
    // Tier up celebration
    if (newTier.name !== oldTier.name) {
        setTimeout(function() {
            showAuthToast('Congratulations! You are now ' + newTier.icon + ' ' + newTier.name + ' tier!');
            launchConfetti();
        }, 2000);
    }
    updateLoyaltyWidget();
}

function updateLoyaltyWidget() {
    var widget = document.getElementById('loyalty-widget');
    if (!widget) return;
    var user = getCurrentUser();
    if (!user) {
        widget.style.display = 'none';
        return;
    }
    var points = user.loyaltyPoints || 0;
    var tier = getLoyaltyTier(points);
    widget.style.display = 'flex';
    widget.innerHTML = '<span class="loyalty-icon">' + tier.icon + '</span>' +
        '<span class="loyalty-pts">' + points + ' pts</span>';
    widget.title = tier.name + ' Tier | ' + points + ' Points | Redeem 100pts = Rs.10 off';
    widget.style.cursor = 'pointer';
    widget.onclick = function() { openLoyaltyModal(); };
}

function openLoyaltyModal() {
    var user = getCurrentUser();
    if (!user) { openAuthModal(); return; }
    var points = user.loyaltyPoints || 0;
    var tier = getLoyaltyTier(points);
    var nextTier = null;
    for (var i = 0; i < LOYALTY_TIERS.length; i++) {
        if (LOYALTY_TIERS[i].min > points) { nextTier = LOYALTY_TIERS[i]; break; }
    }
    var modal = document.getElementById('loyalty-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'loyalty-modal';
        modal.className = 'modal';
        modal.innerHTML = '<div class="modal-content loyalty-modal-content"></div>';
        document.body.appendChild(modal);
        modal.addEventListener('click', function(e) { if (e.target === modal) modal.style.display = 'none'; });
    }
    var progressPct = nextTier ? Math.min(100, ((points - tier.min) / (nextTier.min - tier.min)) * 100) : 100;
    var nextInfo = nextTier ? '<p class="loyalty-next">' + (nextTier.min - points) + ' points to ' + nextTier.icon + ' ' + nextTier.name + '</p>' : '<p class="loyalty-next">You have reached the highest tier!</p>';
    var redeemable = Math.floor(points / 100) * 10;
    modal.querySelector('.loyalty-modal-content').innerHTML =
        '<span class="close" onclick="document.getElementById(\'loyalty-modal\').style.display=\'none\'">&times;</span>' +
        '<div class="loyalty-header">' +
            '<div class="loyalty-tier-badge" style="background:' + tier.color + '">' + tier.icon + ' ' + tier.name + '</div>' +
            '<h2>' + points + ' Points</h2>' +
        '</div>' +
        '<div class="loyalty-progress-bar"><div class="loyalty-progress-fill" style="width:' + progressPct + '%;background:' + tier.color + '"></div></div>' +
        nextInfo +
        '<div class="loyalty-info">' +
            '<div class="loyalty-info-row"><span>Redeemable Value</span><span>Rs.' + redeemable + '</span></div>' +
            '<div class="loyalty-info-row"><span>Points per Rs.10 spent</span><span>1 point</span></div>' +
            '<div class="loyalty-info-row"><span>3-Day Streak Bonus</span><span>2x points</span></div>' +
        '</div>' +
        '<div class="loyalty-tiers-list">' +
            LOYALTY_TIERS.map(function(t) {
                var active = t.name === tier.name ? ' active' : '';
                return '<div class="loyalty-tier-item' + active + '"><span>' + t.icon + ' ' + t.name + '</span><span>' + t.min + '+ pts</span></div>';
            }).join('') +
        '</div>';
    modal.style.display = 'block';
}

function redeemLoyaltyAtCheckout() {
    var user = getCurrentUser();
    if (!user || !user.loyaltyPoints || user.loyaltyPoints < 100) return;
    var redeemable = Math.floor(user.loyaltyPoints / 100) * 10;
    var pointsToUse = Math.floor(user.loyaltyPoints / 100) * 100;
    var subtotal = cart.reduce(function(s, i) { return s + i.price * i.quantity; }, 0);
    var discount = Math.min(redeemable, subtotal);
    if (discount <= 0) return;
    var deliveryFee = subtotal >= 500 ? 0 : 49;
    var total = subtotal - discount + deliveryFee;
    appliedCoupon = { discount: discount, type: 'flat', label: 'Rs.' + discount + ' (Loyalty Points)' };
    document.getElementById('co-total').textContent = 'Rs.' + total.toFixed(0);
    var msg = document.getElementById('coupon-msg');
    msg.textContent = 'Redeemed ' + pointsToUse + ' points for Rs.' + discount + ' off!';
    msg.className = 'coupon-msg success';
    document.getElementById('coupon-code').value = 'LOYALTY';
    // Deduct points
    user.loyaltyPoints -= pointsToUse;
    setCurrentUser(user);
    if (typeof db !== 'undefined' && db) {
        db.collection('users').doc(user.phone).update({ loyaltyPoints: user.loyaltyPoints }).catch(function(e) { console.error('Loyalty update error:', e); });
    }
    updateLoyaltyWidget();
}

// Initialize loyalty widget on load
(function() { setTimeout(updateLoyaltyWidget, 500); })();

// ===== FEATURE 5: RE-ORDER FROM HISTORY =====
function openMyOrders() {
    var user = getCurrentUser();
    if (!user) { openAuthModal(); return; }
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
    if (typeof db === 'undefined' || !db) {
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
        // Cache in localStorage
        safeSetItem('amoghaMyOrders', JSON.stringify(snap.docs.map(function(d) { return { id: d.id, data: d.data() }; })));
    }).catch(function(err) {
        console.error('Load orders error:', err);
        // Try cached
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

function reorderFromHistory(orderId) {
    // Find order in cache or Firestore
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
    // Fallback: fetch from Firestore
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

// ===== FEATURE 2: CUSTOMER REVIEWS & RATINGS =====
function loadMenuRatings() {
    if (typeof db === 'undefined' || !db) return;

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
            var cached = safeGetItem('amoghaRatings');
            if (cached) {
                var parsed = JSON.parse(cached);
                if (parsed.data) applyRatings(parsed.data);
            }
        } catch(e) {}
    });
}

function getStarHTML(rating) {
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

function openReviewModal(orderItems) {
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

window.setReviewStar = function(el, idx, star) {
    window._reviewRatings[idx] = star;
    var container = el.parentElement;
    container.querySelectorAll('.review-star').forEach(function(s, i) {
        s.innerHTML = (i < star) ? '&#9733;' : '&#9734;';
        s.classList.toggle('active', i < star);
    });
};

window.submitReviews = function() {
    var user = getCurrentUser();
    if (!user) return;
    var text = document.getElementById('review-text').value.trim();
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
        setTimeout(loadMenuRatings, 1000);
    }).catch(function() {
        showAuthToast('Failed to submit review. Please try again.');
    });
};

// Prompt review after order (delayed)
function scheduleReviewPrompt(orderItems) {
    setTimeout(function() {
        if (getCurrentUser()) {
            openReviewModal(orderItems);
        }
    }, 60000); // 1 minute after order
}

// Load ratings on page load
(function() { setTimeout(loadMenuRatings, 2000); })();

// ===== FEATURE 3: TABLE RESERVATION SYSTEM (ENHANCED) =====
function openReservationModal() {
    var modal = document.getElementById('reservation-modal');
    if (!modal) return;
    // Enhance the existing reservation form
    var form = document.getElementById('reservation-form');
    if (!form || form.dataset.enhanced === 'true') {
        modal.style.display = 'block';
        return;
    }
    form.dataset.enhanced = 'true';
    // Replace existing form content with enhanced version
    var today = new Date().toISOString().split('T')[0];
    var maxDate = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    form.innerHTML =
        '<input type="text" id="res-name" placeholder="Your Name" required>' +
        '<input type="tel" id="res-phone" placeholder="Phone Number (10 digits)" required maxlength="10">' +
        '<input type="date" id="res-date" min="' + today + '" max="' + maxDate + '" required>' +
        '<div class="res-time-slots" id="res-time-slots"></div>' +
        '<input type="hidden" id="res-time" value="">' +
        '<div class="res-party-size">' +
            '<label>Party Size</label>' +
            '<div class="party-btns" id="party-btns"></div>' +
        '</div>' +
        '<textarea id="res-requests" placeholder="Special Requests (Optional)" rows="2"></textarea>' +
        '<div id="res-msg" class="auth-msg"></div>' +
        '<button type="submit" class="cta-button">Confirm Reservation</button>';
    // Generate party size buttons
    var partyBtns = document.getElementById('party-btns');
    for (var p = 1; p <= 12; p++) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'party-btn';
        btn.textContent = p;
        btn.dataset.size = p;
        btn.onclick = function() {
            document.querySelectorAll('.party-btn').forEach(function(b) { b.classList.remove('active'); });
            this.classList.add('active');
        };
        partyBtns.appendChild(btn);
    }
    // Time slots generation on date change
    document.getElementById('res-date').addEventListener('change', function() {
        generateTimeSlots(this.value);
    });
    // Override form submit
    form.onsubmit = function(e) {
        e.preventDefault();
        submitReservation();
    };
    // Pre-fill user info
    var user = getCurrentUser();
    if (user) {
        document.getElementById('res-name').value = user.name || '';
        document.getElementById('res-phone').value = user.phone || '';
    }
    modal.style.display = 'block';
}

function generateTimeSlots(dateStr) {
    var container = document.getElementById('res-time-slots');
    container.innerHTML = '<label>Select Time</label><div class="time-grid" id="time-grid"></div>';
    var grid = document.getElementById('time-grid');
    var day = new Date(dateStr).getDay();
    var startHour = (day === 0) ? 12 : 11; // Sunday opens at 12
    var endHour = (day === 5 || day === 6) ? 22 : 21; // Fri/Sat close at 22:30, else 21:30
    for (var h = startHour; h <= endHour; h++) {
        for (var m = 0; m < 60; m += 30) {
            if (h === endHour && m > 0) break;
            var timeStr = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
            var displayTime = (h > 12 ? h - 12 : h) + ':' + String(m).padStart(2, '0') + (h >= 12 ? ' PM' : ' AM');
            var slot = document.createElement('button');
            slot.type = 'button';
            slot.className = 'time-slot-btn';
            slot.textContent = displayTime;
            slot.dataset.time = timeStr;
            slot.onclick = function() {
                document.querySelectorAll('.time-slot-btn').forEach(function(b) { b.classList.remove('active'); });
                this.classList.add('active');
                document.getElementById('res-time').value = this.dataset.time;
            };
            grid.appendChild(slot);
        }
    }
}

function submitReservation() {
    var name = document.getElementById('res-name').value.trim();
    var phone = document.getElementById('res-phone').value.trim();
    var date = document.getElementById('res-date').value;
    var time = document.getElementById('res-time').value;
    var partyBtn = document.querySelector('.party-btn.active');
    var partySize = partyBtn ? parseInt(partyBtn.dataset.size) : 0;
    var requests = document.getElementById('res-requests').value.trim();
    var msg = document.getElementById('res-msg');
    if (!name || !phone || !date || !time || !partySize) {
        msg.textContent = 'Please fill in all required fields.';
        msg.className = 'auth-msg error';
        return;
    }
    if (!/^\d{10}$/.test(phone)) {
        msg.textContent = 'Please enter a valid 10-digit phone number.';
        msg.className = 'auth-msg error';
        return;
    }
    msg.textContent = 'Booking your table...';
    msg.className = 'auth-msg';
    if (typeof db === 'undefined' || !db) {
        msg.textContent = 'Service unavailable. Please refresh and try again.';
        msg.className = 'auth-msg error';
        return;
    }
    var resData = {
        name: name,
        phone: phone,
        date: date,
        time: time,
        partySize: partySize,
        requests: requests,
        status: 'pending',
        createdAt: new Date().toISOString()
    };
    db.collection('reservations').add(resData).then(function(docRef) {
        var form = document.getElementById('reservation-form');
        var displayDate = new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
        var displayTime = time;
        var h = parseInt(time.split(':')[0]);
        var mn = time.split(':')[1];
        displayTime = (h > 12 ? h - 12 : h) + ':' + mn + (h >= 12 ? ' PM' : ' AM');
        form.innerHTML =
            '<div class="res-confirmed">' +
                '<div class="res-check">&#10003;</div>' +
                '<h3>Reservation Confirmed!</h3>' +
                '<p class="res-id">Booking #' + docRef.id.slice(-6).toUpperCase() + '</p>' +
                '<div class="res-details">' +
                    '<p>' + displayDate + ' at ' + displayTime + '</p>' +
                    '<p>' + partySize + ' Guest' + (partySize > 1 ? 's' : '') + '</p>' +
                '</div>' +
                '<a class="whatsapp-btn" href="https://wa.me/919121004999?text=' + encodeURIComponent('Hi Amogha! I have a reservation:\nDate: ' + displayDate + '\nTime: ' + displayTime + '\nGuests: ' + partySize + '\nName: ' + name + '\nBooking: #' + docRef.id.slice(-6).toUpperCase()) + '" target="_blank">Confirm via WhatsApp</a>' +
                '<button class="cta-button" onclick="document.getElementById(\'reservation-modal\').style.display=\'none\'" style="margin-top:1rem">Done</button>' +
            '</div>';
    }).catch(function() {
        msg.textContent = 'Failed to book. Please try again.';
        msg.className = 'auth-msg error';
    });
}

// Override the reservation button
(function() {
    var resBtn = document.querySelector('.cta-button.secondary');
    if (resBtn && resBtn.textContent.indexOf('Reserve') !== -1) {
        resBtn.onclick = function() { openReservationModal(); };
    }
})();

// ===== FEATURE 7: REFERRAL PROGRAM =====
function generateReferralCode(user) {
    if (!user) return '';
    var namePart = (user.name || 'USER').replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 4);
    var phonePart = (user.phone || '0000').slice(-4);
    return namePart + phonePart;
}

function openReferralModal() {
    var user = getCurrentUser();
    if (!user) { openAuthModal(); return; }
    var code = user.referralCode || generateReferralCode(user);
    if (!user.referralCode) {
        user.referralCode = code;
        setCurrentUser(user);
        if (typeof db !== 'undefined' && db) {
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

function applyReferralAtSignup(referralCode) {
    if (!referralCode) return;
    if (typeof db === 'undefined' || !db) return;
    referralCode = referralCode.toUpperCase().trim();
    // Find referrer by code
    db.collection('users').where('referralCode', '==', referralCode).limit(1).get().then(function(snap) {
        if (snap.empty) return;
        var referrerDoc = snap.docs[0];
        var referrerData = referrerDoc.data();
        var newUser = getCurrentUser();
        if (!newUser || referrerData.phone === newUser.phone) return;
        // Save referral record
        db.collection('referrals').add({
            referrerPhone: referrerData.phone,
            refereePhone: newUser.phone,
            redeemed: false,
            createdAt: new Date().toISOString()
        }).catch(function(e) { console.error('Referral save error:', e); });
        // Auto-apply Rs.50 off coupon for referee
        newUser.referralDiscount = 50;
        setCurrentUser(newUser);
        showAuthToast('Referral applied! Rs.50 off your first order!');
    });
}

// ===== FEATURE 8: DYNAMIC HAPPY HOUR PRICING =====
var HAPPY_HOURS = [
    { days: [1, 2, 3, 4, 5], startHour: 14, endHour: 17, discount: 15, label: 'Happy Hour — 15% OFF!', categories: ['beverages'] },
    { days: [0, 1, 2, 3, 4, 5, 6], startHour: 22, endHour: 23, discount: 20, label: 'Late Night Deal — 20% OFF!', categories: ['all'] }
];

function getActiveHappyHour() {
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

function applyHappyHourPricing() {
    var hh = getActiveHappyHour();
    var banner = document.getElementById('happy-hour-banner');
    if (!hh) {
        if (banner) banner.style.display = 'none';
        // Remove any happy hour markings
        document.querySelectorAll('.hh-price').forEach(function(el) { el.remove(); });
        document.querySelectorAll('.price.hh-crossed').forEach(function(el) { el.classList.remove('hh-crossed'); });
        return;
    }
    // Show banner
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
    // Apply crossed prices
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

// Update happy hour every 60 seconds (not every second to save performance)
(function() {
    applyHappyHourPricing();
    setInterval(applyHappyHourPricing, 60000);
})();

// ===== FEATURE 6: AI RECOMMENDATIONS (RULE-BASED) =====
var ITEM_PAIRINGS = {
    'Chicken Dum Biryani': ['Raita', 'Mirchi ka Salan', 'Buttermilk'],
    'Chicken 65 Biryani': ['Raita', 'Mirchi ka Salan', 'Fresh Lime Soda'],
    'Veg Dum Biryani': ['Raita', 'Dal Tadka', 'Lassi'],
    'Mutton Dum Biryani': ['Raita', 'Mirchi ka Salan', 'Buttermilk'],
    'Egg Biryani': ['Raita', 'Buttermilk'],
    'Paneer Biryani': ['Raita', 'Dal Tadka'],
    'Butter Chicken': ['Butter Naan', 'Garlic Naan', 'Laccha Paratha'],
    'Paneer Butter Masala': ['Butter Naan', 'Garlic Naan', 'Tandoori Roti'],
    'Chicken Curry': ['Butter Naan', 'Butter Roti', 'Veg Fried Rice'],
    'Mutton Curry': ['Butter Naan', 'Laccha Paratha'],
    'Gongura Chicken': ['Butter Naan', 'Tandoori Roti'],
    'Dal Tadka': ['Butter Naan', 'Tandoori Roti', 'Veg Fried Rice'],
    'Chicken 65': ['Chicken Dum Biryani', 'Fresh Lime Soda'],
    'Paneer 65': ['Veg Dum Biryani', 'Lassi'],
    'Veg Manchurian': ['Veg Hakka Noodles', 'Veg Fried Rice'],
    'Chicken Hot Wings': ['Fresh Lime Soda', 'Chicken Hakka Noodles'],
    'Chicken Lollipop': ['Chicken Dum Biryani', 'Fresh Lime Soda'],
    'Veg Hakka Noodles': ['Veg Manchurian', 'Veg Spring Rolls'],
    'Chicken Hakka Noodles': ['Chicken 65', 'Fresh Lime Soda']
};

var ITEM_PRICES = {
    'Raita': 40, 'Mirchi ka Salan': 50, 'Veg Manchurian': 169, 'Paneer 65': 189,
    'Chicken 65': 200, 'Chicken Hot Wings': 220, 'Veg Spring Rolls': 149, 'Chicken Lollipop': 230,
    'Paneer Butter Masala': 199, 'Dal Tadka': 149, 'Butter Chicken': 249, 'Chicken Curry': 219,
    'Mutton Curry': 319, 'Gongura Chicken': 239, 'Veg Dum Biryani': 199, 'Chicken Dum Biryani': 249,
    'Chicken 65 Biryani': 249, 'Mutton Dum Biryani': 349, 'Egg Biryani': 199, 'Paneer Biryani': 229,
    'Paneer Tikka': 209, 'Chicken Seekh Kebab': 229, 'Tandoori Chicken': 269, 'Mutton Seekh Kebab': 289,
    'Veg Hakka Noodles': 169, 'Chicken Hakka Noodles': 199, 'Egg Noodles': 179, 'Schezwan Noodles': 189,
    'Veg Fried Rice': 169, 'Chicken Fried Rice': 199, 'Egg Fried Rice': 179, 'Schezwan Fried Rice': 189,
    'Butter Naan': 40, 'Garlic Naan': 50, 'Tandoori Roti': 30, 'Butter Roti': 35, 'Laccha Paratha': 45,
    'Tea': 30, 'Coffee': 40, 'Hot Chocolate': 60, 'Lassi': 50, 'Buttermilk': 35, 'Fresh Lime Soda': 45
};

function getRecommendations() {
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
    // Sort by frequency
    var sorted = Object.keys(recs).sort(function(a, b) { return recs[b] - recs[a]; });
    return sorted.slice(0, 4).map(function(name) {
        return { name: name, price: ITEM_PRICES[name] };
    });
}

function showRecommendations() {
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

// Hook into displayCart to show recommendations
var _origDisplayCart = displayCart;
displayCart = function() {
    _origDisplayCart();
    showRecommendations();
};

// ===== FEATURE 9: VOICE ORDERING (WEB SPEECH API) =====
var voiceActive = false;
var voiceRecognition = null;

function initVoiceOrdering() {
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return; // Not supported
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
    // Add voice button
    var voiceBtn = document.createElement('button');
    voiceBtn.id = 'voice-order-btn';
    voiceBtn.className = 'voice-order-btn';
    voiceBtn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';
    voiceBtn.title = 'Voice Order';
    voiceBtn.onclick = toggleVoice;
    document.body.appendChild(voiceBtn);
}

function toggleVoice() {
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

function showVoiceOverlay() {
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
    // Parse quantity
    var qtyMatch = text.match(/^(?:add\s+)?(\d+)\s+/);
    var qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
    var searchText = text.replace(/^(?:add\s+)?(\d+\s+)?/, '').replace(/^add\s+/, '');
    // Fuzzy match against menu items
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
        checkout();
        hideVoiceOverlay();
    } else if (text.indexOf('clear') !== -1) {
        clearCart();
        hideVoiceOverlay();
    } else {
        showAuthToast('Could not find: "' + searchText + '". Try again.');
    }
}

(function() { setTimeout(initVoiceOrdering, 1000); })();

// ===== FEATURE 10: MULTI-LANGUAGE SUPPORT =====
var TRANSLATIONS = {
    en: {
        home: 'Home', about: 'About', menu: 'Menu', specials: 'Specials',
        gallery: 'Gallery', reviews: 'Reviews', contact: 'Contact',
        signIn: 'Sign In', orderNow: 'Order Online', reserveTable: 'Reserve Table',
        addToOrder: 'Add to Order', yourOrder: 'Your Order', clearCart: 'Clear Cart',
        checkout: 'Proceed to Checkout', orderSummary: 'Order Summary',
        yourDetails: 'Your Details', payment: 'Payment', orderPlaced: 'Order Placed!',
        thankYou: 'Thank you! Your order has been received.',
        fullName: 'Full Name', phoneNumber: 'Phone Number',
        deliveryAddress: 'Delivery Address', specialInstructions: 'Special Instructions (Optional)',
        ourStory: 'Our Story', whyChooseUs: 'Why Choose Us?', ourMission: 'Our Mission',
        search: 'Search menu...', all: 'All', veg: 'Veg', nonVeg: 'Non-Veg'
    },
    hi: {
        home: 'होम', about: 'हमारे बारे में', menu: 'मेन्यू', specials: 'स्पेशल',
        gallery: 'गैलरी', reviews: 'समीक्षा', contact: 'संपर्क',
        signIn: 'साइन इन', orderNow: 'ऑर्डर करें', reserveTable: 'टेबल बुक करें',
        addToOrder: 'ऑर्डर में जोड़ें', yourOrder: 'आपका ऑर्डर', clearCart: 'कार्ट खाली करें',
        checkout: 'चेकआउट करें', orderSummary: 'ऑर्डर सारांश',
        yourDetails: 'आपकी जानकारी', payment: 'भुगतान', orderPlaced: 'ऑर्डर हो गया!',
        thankYou: 'धन्यवाद! आपका ऑर्डर मिल गया है।',
        fullName: 'पूरा नाम', phoneNumber: 'फोन नंबर',
        deliveryAddress: 'डिलीवरी पता', specialInstructions: 'विशेष निर्देश (वैकल्पिक)',
        ourStory: 'हमारी कहानी', whyChooseUs: 'हमें क्यों चुनें?', ourMission: 'हमारा मिशन',
        search: 'मेन्यू खोजें...', all: 'सभी', veg: 'शाकाहारी', nonVeg: 'मांसाहारी'
    },
    te: {
        home: 'హోమ్', about: 'మా గురించి', menu: 'మెనూ', specials: 'స్పెషల్',
        gallery: 'గ్యాలరీ', reviews: 'సమీక్షలు', contact: 'సంప్రదించండి',
        signIn: 'సైన్ ఇన్', orderNow: 'ఆర్డర్ చేయండి', reserveTable: 'టేబుల్ బుక్ చేయండి',
        addToOrder: 'ఆర్డర్‌లో జోడించండి', yourOrder: 'మీ ఆర్డర్', clearCart: 'కార్ట్ ఖాళీ చేయండి',
        checkout: 'చెక్ అవుట్', orderSummary: 'ఆర్డర్ సారాంశం',
        yourDetails: 'మీ వివరాలు', payment: 'చెల్లింపు', orderPlaced: 'ఆర్డర్ పూర్తయింది!',
        thankYou: 'ధన్యవాదాలు! మీ ఆర్డర్ అందింది.',
        fullName: 'పూర్తి పేరు', phoneNumber: 'ఫోన్ నంబర్',
        deliveryAddress: 'డెలివరీ చిరునామా', specialInstructions: 'ప్రత్యేక సూచనలు (ఐచ్ఛికం)',
        ourStory: 'మా కథ', whyChooseUs: 'మమ్మల్ని ఎందుకు ఎంచుకోవాలి?', ourMission: 'మా లక్ష్యం',
        search: 'మెనూ వెతకండి...', all: 'అన్నీ', veg: 'శాకాహారం', nonVeg: 'మాంసాహారం'
    }
};

var currentLang = safeGetItem('amoghaLang') || 'en';

function switchLanguage(lang) {
    currentLang = lang;
    safeSetItem('amoghaLang', lang);
    applyTranslations();
    // Update switcher active state
    document.querySelectorAll('.lang-btn').forEach(function(b) {
        b.classList.toggle('active', b.dataset.lang === lang);
    });
}

function applyTranslations() {
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

// Add language switcher to nav (will be initialized after DOM ready)
(function() {
    setTimeout(function() {
        var nav = document.querySelector('.nav-links');
        if (!nav) return;
        var langLi = document.createElement('li');
        langLi.className = 'lang-switcher';
        langLi.innerHTML = '<button class="lang-btn' + (currentLang === 'en' ? ' active' : '') + '" data-lang="en" onclick="switchLanguage(\'en\')">EN</button>' +
            '<button class="lang-btn' + (currentLang === 'hi' ? ' active' : '') + '" data-lang="hi" onclick="switchLanguage(\'hi\')">हि</button>' +
            '<button class="lang-btn' + (currentLang === 'te' ? ' active' : '') + '" data-lang="te" onclick="switchLanguage(\'te\')">తె</button>';
        // Insert before theme toggle
        var themeToggle = nav.querySelector('.theme-toggle');
        if (themeToggle) {
            nav.insertBefore(langLi, themeToggle.parentElement);
        } else {
            nav.appendChild(langLi);
        }
        applyTranslations();
    }, 500);
})();

// ===== FEATURE 11: PUSH NOTIFICATIONS (BROWSER API) =====
function requestNotificationPermission() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
        safeSetItem('amoghaNotifPerm', 'granted');
        return;
    }
    if (Notification.permission === 'denied') return;
    // Show custom banner
    var banner = document.getElementById('notif-banner');
    if (!banner && !safeGetItem('amoghaNotifDismissed')) {
        banner = document.createElement('div');
        banner.id = 'notif-banner';
        banner.className = 'notif-banner';
        banner.innerHTML = '<span class="notif-icon">🔔</span>' +
            '<span class="notif-text">Get notified when your order is ready!</span>' +
            '<button class="notif-allow" onclick="enableNotifications()">Enable</button>' +
            '<button class="notif-dismiss" onclick="dismissNotifBanner()">&times;</button>';
        document.body.appendChild(banner);
        setTimeout(function() { banner.classList.add('visible'); }, 3000);
    }
}

function enableNotifications() {
    Notification.requestPermission().then(function(perm) {
        safeSetItem('amoghaNotifPerm', perm);
        dismissNotifBanner();
        if (perm === 'granted') {
            showAuthToast('Notifications enabled!');
        }
    });
}

function dismissNotifBanner() {
    var banner = document.getElementById('notif-banner');
    if (banner) {
        banner.classList.remove('visible');
        setTimeout(function() { banner.remove(); }, 400);
    }
    safeSetItem('amoghaNotifDismissed', 'true');
}

function sendPushNotification(title, body) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
        new Notification(title, {
            body: body,
            icon: 'amogha-logo.png',
            badge: 'amogha-logo.png',
            tag: 'amogha-order'
        });
    } catch (e) {
        // Fallback for mobile
        if (navigator.serviceWorker && navigator.serviceWorker.ready) {
            navigator.serviceWorker.ready.then(function(reg) {
                reg.showNotification(title, {
                    body: body,
                    icon: 'amogha-logo.png',
                    tag: 'amogha-order'
                });
            });
        }
    }
}

(function() { setTimeout(requestNotificationPermission, 5000); })();

// ===== POST-ORDER HOOKS (loyalty, referral, review, push) =====
// These are now called directly inside placeOrderToFirestore().then() callback
// (Previously wrapped a non-existent confirmOrder function — fixed to call directly)

// ===== ADD REFERRAL CODE FIELD TO SIGNUP =====
(function() {
    setTimeout(function() {
        var signupForm = document.getElementById('signup-form');
        if (!signupForm || signupForm.dataset.refEnhanced === 'true') return;
        signupForm.dataset.refEnhanced = 'true';
        var pinField = signupForm.querySelector('.password-field');
        if (pinField) {
            var refInput = document.createElement('input');
            refInput.type = 'text';
            refInput.id = 'signup-referral';
            refInput.placeholder = 'Referral Code (Optional)';
            refInput.maxLength = 20;
            refInput.style.textTransform = 'uppercase';
            pinField.after(refInput);
        }
    }, 1000);
})();

// Hook into signup to apply referral
if (typeof handleSignUp === 'function') {
    var _origSignUp = handleSignUp;
    handleSignUp = function() {
        var refCode = document.getElementById('signup-referral');
        var code = refCode ? refCode.value.trim() : '';
        _origSignUp();
        // After signup, apply referral (with delay to let signup complete)
        if (code) {
            setTimeout(function() { applyReferralAtSignup(code); }, 2000);
        }
    };
}

// ===== USER PROFILE DROPDOWN (MY ORDERS + REFERRAL) =====
(function() {
    setTimeout(function() {
        var signinBtn = document.getElementById('signin-btn');
        if (!signinBtn) return;
        // Create dropdown menu for signed-in users
        var dropdown = document.createElement('div');
        dropdown.id = 'user-dropdown';
        dropdown.className = 'user-dropdown';
        dropdown.innerHTML =
            '<button onclick="openMyOrders(); closeUserDropdown();">My Orders</button>' +
            '<button onclick="openReferralModal(); closeUserDropdown();">Refer a Friend</button>' +
            '<button onclick="openLoyaltyModal(); closeUserDropdown();">Loyalty Points</button>' +
            '<button onclick="openAuthModal(); closeUserDropdown();">Sign Out</button>';
        signinBtn.parentElement.style.position = 'relative';
        signinBtn.parentElement.appendChild(dropdown);
        // Toggle dropdown on click (only for signed-in users)
        signinBtn.addEventListener('click', function(e) {
            var user = getCurrentUser();
            if (user) {
                e.preventDefault();
                e.stopPropagation();
                dropdown.classList.toggle('visible');
            }
        });
        document.addEventListener('click', function(e) {
            if (!signinBtn.parentElement.contains(e.target)) {
                dropdown.classList.remove('visible');
            }
        });
    }, 1000);
})();

window.closeUserDropdown = function() {
    var dd = document.getElementById('user-dropdown');
    if (dd) dd.classList.remove('visible');
};

// ===== CACHED FIRESTORE GET =====
// Reads from localStorage first, then refreshes from Firestore if stale.
// Saves thousands of Firestore reads per day.
// collectionName: Firestore collection
// cacheKey: localStorage key
// ttlSeconds: how long cache is valid
// transform: function(snapshot) → data array
// render: function(data) → renders UI
// opts: { orderBy: ['field'], where: [field, op, val] }
function cachedGet(collectionName, cacheKey, ttlSeconds, transform, render, opts) {
    if (typeof db === 'undefined') return;

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
            var cached = localStorage.getItem(cacheKey);
            if (cached) render(JSON.parse(cached).data);
        } catch(e) {}
    });
}

// ===== FIRESTORE MENU OVERLAY =====
// Syncs availability & prices from Firestore onto hardcoded menu HTML
(function() {
    if (typeof db === 'undefined') return;

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

            // Availability — use both class and inline styles for reliability
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
    }, function(error) {
        console.error('Menu listener error:', error);
    });

    // 2. Specials — cached .get() (changes rarely, saves reads vs onSnapshot)
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
})();

// ===== SEASONAL THEME LOADER (cached) =====
(function() {
    if (typeof db === 'undefined') return;
    // Try cache first
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
})();

// ===== TESTIMONIALS LOADER (cached) =====
(function() {
    if (typeof db === 'undefined') return;
    var grid = document.getElementById('testimonials-grid');
    if (!grid) return;

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
})();

window.openVideoLightbox = function(url) {
    if (!url) return;
    var lb = document.getElementById('video-lightbox');
    var vid = document.getElementById('lightbox-video');
    if (!lb || !vid) return;
    vid.src = url;
    lb.style.display = 'flex';
    vid.play();
};
window.closeVideoLightbox = function() {
    var lb = document.getElementById('video-lightbox');
    var vid = document.getElementById('lightbox-video');
    if (lb) lb.style.display = 'none';
    if (vid) { vid.pause(); vid.src = ''; }
};

// ===== SOCIAL FEED LOADER (cached) =====
(function() {
    if (typeof db === 'undefined') return;
    var strip = document.getElementById('social-feed-strip');
    if (!strip) return;

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
})();

// ===== LAZY IMAGE LOAD COMPLETION =====
document.addEventListener('DOMContentLoaded', function() {
    // Mark lazy images as loaded when complete
    document.querySelectorAll('img[loading="lazy"]').forEach(function(img) {
        if (img.complete) {
            img.classList.add('loaded');
        } else {
            img.addEventListener('load', function() { img.classList.add('loaded'); });
            img.addEventListener('error', function() { img.classList.add('loaded'); });
        }
    });
    // Observe dynamically added images
    var imgMo = new MutationObserver(function(mutations) {
        mutations.forEach(function(m) {
            m.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) {
                    var imgs = node.querySelectorAll ? node.querySelectorAll('img[loading="lazy"]') : [];
                    imgs.forEach(function(img) {
                        if (img.complete) { img.classList.add('loaded'); }
                        else { img.addEventListener('load', function() { img.classList.add('loaded'); }); }
                    });
                }
            });
        });
    });
    imgMo.observe(document.body, { childList: true, subtree: true });
});

// ===== BUTTON RIPPLE EFFECT =====
(function() {
    document.addEventListener('click', function(e) {
        var btn = e.target.closest('.add-to-cart, .cta-button, .btn-primary, .pay-now-btn, .combo-add-btn');
        if (!btn) return;
        var ripple = document.createElement('span');
        ripple.className = 'btn-ripple';
        var rect = btn.getBoundingClientRect();
        var size = Math.max(rect.width, rect.height) * 2;
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
        btn.appendChild(ripple);
        setTimeout(function() { ripple.remove(); }, 700);
    });
})();

// ===== GOLDEN PARTICLE BURST ON ADD-TO-CART =====
(function() {
    if (window.innerWidth <= 768) return; // Skip on mobile for perf

    function burstParticles(x, y) {
        var count = 10;
        for (var i = 0; i < count; i++) {
            var p = document.createElement('span');
            p.className = 'gold-particle';
            var angle = (i / count) * Math.PI * 2;
            var distance = 40 + Math.random() * 30;
            var tx = Math.cos(angle) * distance;
            var ty = Math.sin(angle) * distance;
            p.style.left = x + 'px';
            p.style.top = y + 'px';
            p.style.setProperty('--tx', tx + 'px');
            p.style.setProperty('--ty', ty + 'px');
            p.style.animationDelay = (Math.random() * 0.1) + 's';
            document.body.appendChild(p);
            p.addEventListener('animationend', function() { this.remove(); });
        }
    }

    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('add-to-cart') || e.target.closest('.add-to-cart')) {
            burstParticles(e.clientX, e.clientY);
        }
    });
})();

// ===== SPICE LEVEL TOOLTIPS =====
(function() {
    var descriptions = {
        'Mild': 'Subtle warmth, family-friendly',
        'Medium': 'Balanced heat, our recommendation',
        'Spicy': 'Andhra-level heat, for the brave!'
    };

    document.querySelectorAll('.spice-level').forEach(function(el) {
        var level = el.textContent.trim();
        if (descriptions[level]) {
            el.setAttribute('data-tooltip', descriptions[level]);
            el.classList.add('has-tooltip');
        }
    });
})();

// ===== GALLERY & REVIEWS TOUCH SWIPE =====
(function() {
    var threshold = 50;

    function addSwipe(wrapper, moveFn) {
        if (!wrapper) return;
        var startX = 0, startY = 0, isDragging = false;

        wrapper.addEventListener('touchstart', function(e) {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            isDragging = true;
        }, { passive: true });

        wrapper.addEventListener('touchmove', function(e) {
            if (!isDragging) return;
            var diffX = e.touches[0].clientX - startX;
            var diffY = e.touches[0].clientY - startY;
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
                e.preventDefault();
            }
        }, { passive: false });

        wrapper.addEventListener('touchend', function(e) {
            if (!isDragging) return;
            isDragging = false;
            var diff = e.changedTouches[0].clientX - startX;
            if (Math.abs(diff) > threshold) {
                moveFn(diff < 0 ? 1 : -1);
            }
        }, { passive: true });
    }

    addSwipe(document.querySelector('.gallery-slideshow-wrapper'), function(dir) {
        if (typeof window.moveGallerySlide === 'function') window.moveGallerySlide(dir);
    });

    addSwipe(document.querySelector('.reviews-carousel-wrapper'), function(dir) {
        if (typeof window.moveCarousel === 'function') window.moveCarousel(dir);
    });
})();

// ===== SMART SEARCH WITH AUTOCOMPLETE =====
(function() {
    var searchEl = document.getElementById('menu-search');
    if (!searchEl) return;

    // Create dropdown
    var dropdown = document.createElement('div');
    dropdown.id = 'search-autocomplete';
    dropdown.className = 'search-autocomplete-dropdown';
    searchEl.parentElement.classList.add('search-autocomplete-wrap');
    searchEl.parentElement.appendChild(dropdown);

    // Build search index from DOM
    var searchIndex = [];
    document.querySelectorAll('.menu-item-card').forEach(function(card) {
        var nameEl = card.querySelector('h4');
        var descEl = card.querySelector('.item-description');
        var priceEl = card.querySelector('.price');
        var isVeg = !!card.querySelector('.veg-badge');
        var category = card.closest('.menu-category');
        var catTitle = category ? category.querySelector('.category-title') : null;
        var catName = catTitle ? catTitle.textContent : '';
        searchIndex.push({
            name: nameEl ? nameEl.textContent.replace(/Bestseller|Popular|Chef's Pick|Must Try/g, '').trim() : '',
            desc: descEl ? descEl.textContent : '',
            price: priceEl ? priceEl.textContent : '',
            isVeg: isVeg,
            category: catName,
            card: card
        });
    });

    var debounceTimer;
    searchEl.addEventListener('input', function() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function() {
            var query = searchEl.value.toLowerCase().trim();

            // Filter visible cards (existing behavior)
            document.querySelectorAll('.menu-item-card').forEach(function(card) {
                var nameEl = card.querySelector('h4');
                var descEl = card.querySelector('.item-description');
                var name = nameEl ? nameEl.textContent.toLowerCase() : '';
                var desc = descEl ? descEl.textContent.toLowerCase() : '';
                card.style.display = (!query || name.includes(query) || desc.includes(query)) ? '' : 'none';
            });

            // Show autocomplete dropdown
            if (query.length < 2) {
                dropdown.classList.remove('visible');
                dropdown.innerHTML = '';
                return;
            }

            var matches = searchIndex.filter(function(item) {
                return item.name.toLowerCase().includes(query) ||
                       item.desc.toLowerCase().includes(query);
            }).slice(0, 6);

            if (matches.length === 0) {
                dropdown.classList.remove('visible');
                dropdown.innerHTML = '';
                return;
            }

            dropdown.innerHTML = matches.map(function(m) {
                var badge = m.isVeg ? '<span class="ac-badge veg">VEG</span>' : '<span class="ac-badge non-veg">NON-VEG</span>';
                return '<button class="ac-item" data-name="' + m.name + '">' +
                    '<div class="ac-info">' +
                        '<span class="ac-name">' + m.name + '</span>' +
                        '<span class="ac-meta">' + badge + ' <span class="ac-cat">' + m.category + '</span></span>' +
                    '</div>' +
                    '<span class="ac-price">' + m.price + '</span>' +
                '</button>';
            }).join('');
            dropdown.classList.add('visible');
        }, 150);
    });

    // Handle clicking an autocomplete result
    dropdown.addEventListener('click', function(e) {
        var item = e.target.closest('.ac-item');
        if (!item) return;
        var name = item.dataset.name;
        searchEl.value = name;
        dropdown.classList.remove('visible');
        // Scroll to and highlight the card
        var match = searchIndex.find(function(m) { return m.name === name; });
        if (match && match.card) {
            document.querySelectorAll('.menu-item-card').forEach(function(c) { c.style.display = ''; });
            match.card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            match.card.classList.add('search-highlight');
            setTimeout(function() { match.card.classList.remove('search-highlight'); }, 2000);
        }
    });

    // Close dropdown on click outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.search-autocomplete-wrap')) {
            dropdown.classList.remove('visible');
        }
    });

    // Close on Escape
    searchEl.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            dropdown.classList.remove('visible');
            searchEl.blur();
        }
    });
})();

// ===== SCHEDULED ORDERS =====
(function() {
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
})();

// ===== COMBO MEAL BUILDER =====
(function() {
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

        addBtn.disabled = !(selected.biryani && selected.starter && selected.drink);
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

    /* Close combo modal on outside click */
    var comboModalEl = document.getElementById('combo-modal');
    if (comboModalEl) {
        comboModalEl.addEventListener('click', function(e) {
            if (e.target === comboModalEl) closeComboModal();
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
        closeComboModal();
    };
})();
