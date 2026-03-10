// ===== PREMIUM INTERACTIONS MODULE V5 — WORLD CLASS =====
// V1-V4: Scroll reveals, ripple, 3D tilt, skeleton, particles, parallax, etc.
// V5: Dark mode spin, FAQ accordion, review quotes, gallery zoom,
//     countdown tick, floating cart bump, theme transitions, premium nav

export function initPremium() {
    initScrollReveal();
    initRippleEffect();
    initLazyImageFade();
    initSmartHeader();
    initSectionSpy();
    initCheckoutStepper();
    initCartEmptyState();
    initFormValidation();
    initAnimatedCounters();
    initKeyboardShortcuts();
    initAccessibilityEnhancements();
    initAddToCartFeedback();
    upgradeToast();
    init3DCardTilt();
    initMenuSkeleton();
    initParticleTrail();
    initParallaxDepth();
    initSearchGlow();
    initSwipeToClose();
    initCartItemAnimations();
    initOrderCelebration();
    initComboPricingPulse();
    initCartCountBump();
    // V5
    initDarkModeTransition();
    initFaqAccordionPremium();
    initGalleryZoom();
    initCountdownTick();
    initFloatingCartBump();
    initPremiumNavHighlight();
    initImageRevealOnLoad();
    // V6
    initOrnamentReveal();
    initFeaturesListReveal();
    initSocialLinksReveal();
    initSectionHeadingReveal();
    initLoyaltyPointsAnimation();
    initMobileMenuAnimation();
    initHamburgerMorph();
}

// ── Intersection Observer Scroll Reveal ──
function initScrollReveal() {
    var revealEls = document.querySelectorAll(
        '.special-card, .stat-item, .review-card, .gallery-item, ' +
        '.faq-item, .chef-section, .about-text, .contact-info-section, ' +
        '.contact-form-section, .newsletter-card, .trust-badge, .footer-section, ' +
        '.info-block, .daily-special-section, .combo-builder-section'
    );

    if (!revealEls.length || !('IntersectionObserver' in window)) return;

    var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                var el = entry.target;
                var delay = 0;
                var parent = el.parentElement;
                if (parent) {
                    var siblings = parent.querySelectorAll(
                        '.special-card, .stat-item, .review-card, .trust-badge, ' +
                        '.footer-section, .gallery-item, .faq-item, .info-block'
                    );
                    for (var i = 0; i < siblings.length; i++) {
                        if (siblings[i] === el) { delay = i * 80; break; }
                    }
                }
                setTimeout(function() {
                    el.classList.add('revealed');
                    el.style.opacity = '1';
                    el.style.transform = '';
                }, delay);
                observer.unobserve(el);
            }
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

    revealEls.forEach(function(el) {
        if (!el.classList.contains('reveal')) {
            el.style.opacity = '0';
            el.style.transform = 'translateY(24px)';
            el.style.transition = 'opacity .7s cubic-bezier(.22,1,.36,1), transform .7s cubic-bezier(.22,1,.36,1)';
        }
        observer.observe(el);
    });
}

// ── Ripple Effect on Buttons ──
function initRippleEffect() {
    document.addEventListener('click', function(e) {
        var btn = e.target.closest('.add-to-cart, .cta-button, .combo-add-btn, .pay-now-btn, .pay-confirm-btn, .filter-btn');
        if (!btn) return;

        btn.classList.remove('ripple');
        void btn.offsetWidth;
        btn.classList.add('ripple');

        setTimeout(function() { btn.classList.remove('ripple'); }, 500);
    });
}

// ── Lazy Image Fade-In ──
function initLazyImageFade() {
    document.querySelectorAll('img[loading="lazy"]').forEach(function(img) {
        if (img.complete && img.naturalWidth > 0) {
            img.classList.add('loaded');
        }
    });

    document.addEventListener('load', function(e) {
        if (e.target.tagName === 'IMG' && e.target.hasAttribute('loading')) {
            e.target.classList.add('loaded');
        }
    }, true);
}

// ── Smart Header: Scroll state + auto-hide on scroll down ──
function initSmartHeader() {
    var header = document.querySelector('header');
    if (!header) return;

    var lastScroll = 0;
    var ticking = false;
    var headerHeight = header.offsetHeight;

    function updateHeader() {
        var scrollY = window.scrollY || window.pageYOffset;

        if (scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }

        // Auto-hide on scroll down, show on scroll up (only on mobile or past hero)
        if (scrollY > headerHeight * 3) {
            if (scrollY > lastScroll + 10) {
                header.classList.add('header-hidden');
            } else if (scrollY < lastScroll - 5) {
                header.classList.remove('header-hidden');
            }
        } else {
            header.classList.remove('header-hidden');
        }

        lastScroll = scrollY;
        ticking = false;
    }

    window.addEventListener('scroll', function() {
        if (!ticking) {
            requestAnimationFrame(updateHeader);
            ticking = true;
        }
    }, { passive: true });

    updateHeader();
}

// ── Section Spy: Highlight active nav link based on scroll position ──
function initSectionSpy() {
    var sections = document.querySelectorAll('section[id]');
    var navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
    if (!sections.length || !navLinks.length) return;

    var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                var id = entry.target.getAttribute('id');
                navLinks.forEach(function(link) {
                    link.classList.remove('active-section');
                    if (link.getAttribute('href') === '#' + id) {
                        link.classList.add('active-section');
                    }
                });
            }
        });
    }, { threshold: 0.2, rootMargin: '-80px 0px -50% 0px' });

    sections.forEach(function(section) { observer.observe(section); });
}

// ── Checkout Progress Stepper ──
function initCheckoutStepper() {
    var checkoutModal = document.getElementById('checkout-modal');
    if (!checkoutModal) return;

    // Create stepper HTML
    var stepper = document.createElement('div');
    stepper.className = 'checkout-progress';
    stepper.id = 'checkout-stepper';
    stepper.innerHTML =
        '<div class="checkout-progress-step active" data-step="1">' +
            '<span class="checkout-progress-num">1</span>' +
            '<span>Summary</span>' +
        '</div>' +
        '<div class="checkout-progress-line" data-after="1"></div>' +
        '<div class="checkout-progress-step" data-step="2">' +
            '<span class="checkout-progress-num">2</span>' +
            '<span>Details</span>' +
        '</div>' +
        '<div class="checkout-progress-line" data-after="2"></div>' +
        '<div class="checkout-progress-step" data-step="3">' +
            '<span class="checkout-progress-num">3</span>' +
            '<span>Payment</span>' +
        '</div>';

    // Insert before first checkout step
    var modalContent = checkoutModal.querySelector('.modal-content');
    var firstStep = checkoutModal.querySelector('.checkout-step');
    if (modalContent && firstStep) {
        modalContent.insertBefore(stepper, firstStep);
    }

    // Observe step changes
    var origGoToStep = window.goToStep;
    if (typeof origGoToStep === 'function') {
        window.goToStep = function(step) {
            origGoToStep(step);
            updateStepper(step);
        };
    }

    // Also hook by observing active class changes
    var stepObserver = new MutationObserver(function() {
        var activeStep = checkoutModal.querySelector('.checkout-step.active');
        if (activeStep) {
            var stepId = activeStep.id;
            var num = stepId ? parseInt(stepId.replace('checkout-step-', '')) : 1;
            if (num >= 1 && num <= 4) updateStepper(num);
        }
    });

    checkoutModal.querySelectorAll('.checkout-step').forEach(function(s) {
        stepObserver.observe(s, { attributes: true, attributeFilter: ['class'] });
    });
}

function updateStepper(currentStep) {
    var stepper = document.getElementById('checkout-stepper');
    if (!stepper) return;

    // Hide stepper on confirmation step
    if (currentStep === 4) {
        stepper.style.display = 'none';
        return;
    }
    stepper.style.display = '';

    stepper.querySelectorAll('.checkout-progress-step').forEach(function(stepEl) {
        var stepNum = parseInt(stepEl.getAttribute('data-step'));
        stepEl.classList.remove('active', 'completed');
        if (stepNum < currentStep) stepEl.classList.add('completed');
        else if (stepNum === currentStep) stepEl.classList.add('active');

        // Update checkmark for completed
        var numEl = stepEl.querySelector('.checkout-progress-num');
        if (numEl) {
            numEl.textContent = stepNum < currentStep ? '\u2713' : stepNum;
        }
    });

    stepper.querySelectorAll('.checkout-progress-line').forEach(function(line) {
        var afterStep = parseInt(line.getAttribute('data-after'));
        line.classList.toggle('completed', afterStep < currentStep);
    });
}

// ── Cart Empty State ──
function initCartEmptyState() {
    // Observe cart-items container for empty state
    var cartItems = document.getElementById('cart-items');
    if (!cartItems) return;

    var observer = new MutationObserver(function() {
        var hasItems = cartItems.children.length > 0 &&
            !cartItems.querySelector('.cart-empty-state');

        if (!hasItems && !cartItems.querySelector('.cart-empty-state') && cartItems.innerHTML.trim() === '') {
            cartItems.innerHTML =
                '<div class="cart-empty-state">' +
                    '<div class="cart-empty-icon">🛒</div>' +
                    '<h3 class="cart-empty-title">Your cart is empty</h3>' +
                    '<p class="cart-empty-text">Explore our menu and add your favorites</p>' +
                '</div>';
        }
    });

    observer.observe(cartItems, { childList: true, subtree: true });
}

// ── Form Validation with Real-Time Feedback ──
function initFormValidation() {
    // Checkout form fields
    var fields = [
        { id: 'co-name', validate: function(v) { return v.trim().length >= 2; }, msg: 'Name must be at least 2 characters' },
        { id: 'co-phone', validate: function(v) { return /^\d{10}$/.test(v.trim()); }, msg: 'Enter a valid 10-digit phone number' },
        { id: 'co-address', validate: function(v) { return v.trim().length >= 5; }, msg: 'Enter a valid delivery address' }
    ];

    fields.forEach(function(field) {
        var el = document.getElementById(field.id);
        if (!el) return;

        el.addEventListener('blur', function() {
            validateField(el, field);
        });

        el.addEventListener('input', function() {
            // Remove error state on typing
            el.classList.remove('field-invalid');
            var errMsg = el.parentElement.querySelector('.field-error-msg');
            if (errMsg) errMsg.classList.remove('show');

            // Add valid state
            if (field.validate(el.value)) {
                el.classList.add('field-valid');
            } else {
                el.classList.remove('field-valid');
            }
        });
    });
}

function validateField(el, field) {
    if (!el.value.trim()) return; // Don't validate empty on blur

    if (!field.validate(el.value)) {
        el.classList.add('field-invalid');
        el.classList.remove('field-valid');

        // Show error message
        var errMsg = el.parentElement.querySelector('.field-error-msg');
        if (!errMsg) {
            errMsg = document.createElement('div');
            errMsg.className = 'field-error-msg';
            el.parentElement.appendChild(errMsg);
        }
        errMsg.textContent = field.msg;
        setTimeout(function() { errMsg.classList.add('show'); }, 10);
    } else {
        el.classList.remove('field-invalid');
        el.classList.add('field-valid');
        var errMsg = el.parentElement.querySelector('.field-error-msg');
        if (errMsg) errMsg.classList.remove('show');
    }
}

// ── Animated Number Counters ──
function initAnimatedCounters() {
    var counters = document.querySelectorAll('.stat-number[data-target]');
    if (!counters.length || !('IntersectionObserver' in window)) return;

    var animated = new Set();

    var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting && !animated.has(entry.target)) {
                animated.add(entry.target);
                animateCounter(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(function(c) { observer.observe(c); });
}

function animateCounter(el) {
    var target = parseFloat(el.getAttribute('data-target'));
    var isDecimal = target % 1 !== 0;
    var duration = 2000;
    var startTime = null;

    function easeOutExpo(t) {
        return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }

    function step(timestamp) {
        if (!startTime) startTime = timestamp;
        var progress = Math.min((timestamp - startTime) / duration, 1);
        var easedProgress = easeOutExpo(progress);
        var current = easedProgress * target;

        el.textContent = isDecimal ? current.toFixed(1) : Math.floor(current).toLocaleString();

        if (progress < 1) {
            requestAnimationFrame(step);
        } else {
            el.textContent = isDecimal ? target.toFixed(1) : target.toLocaleString();
        }
    }

    requestAnimationFrame(step);
}

// ── Keyboard Shortcuts ──
function initKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Escape closes modals
        if (e.key === 'Escape') {
            var openModals = document.querySelectorAll('.modal[style*="block"], .modal.active');
            openModals.forEach(function(modal) {
                modal.style.display = 'none';
            });
            // Also close addon picker
            var addonOverlay = document.getElementById('addon-picker-overlay');
            if (addonOverlay && addonOverlay.style.display !== 'none') {
                addonOverlay.style.display = 'none';
            }
        }

        // / focuses search
        if (e.key === '/' && !isInputFocused()) {
            e.preventDefault();
            var search = document.getElementById('menu-search');
            if (search) {
                search.focus();
                search.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    });
}

function isInputFocused() {
    var active = document.activeElement;
    return active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT' || active.isContentEditable);
}

// ── Add to Cart Visual Feedback ──
function initAddToCartFeedback() {
    document.addEventListener('click', function(e) {
        var btn = e.target.closest('.add-to-cart');
        if (!btn) return;

        // Brief success flash
        btn.classList.add('cart-added');
        var origText = btn.textContent;
        btn.textContent = '\u2713 Added';

        setTimeout(function() {
            btn.classList.remove('cart-added');
            // Only restore text if it wasn't changed by other code
            if (btn.textContent === '\u2713 Added') {
                btn.textContent = origText;
            }
        }, 800);

        // Animate cart icon
        var cartIcon = document.getElementById('cart-icon');
        if (cartIcon) {
            cartIcon.style.transform = 'scale(1.3)';
            cartIcon.style.transition = 'transform .3s cubic-bezier(.34,1.56,.64,1)';
            setTimeout(function() {
                cartIcon.style.transform = '';
            }, 300);
        }
    });
}

// ── Upgrade Toast with Type Support ──
function upgradeToast() {
    var origShowAuthToast = window.showAuthToast;
    if (typeof origShowAuthToast !== 'function') return;

    window.showAuthToast = function(message, type) {
        // Call original
        origShowAuthToast(message);

        // Add type class
        var toast = document.getElementById('auth-toast');
        if (toast) {
            toast.classList.remove('toast-success', 'toast-error', 'toast-info');
            if (type) {
                toast.classList.add('toast-' + type);
            } else {
                // Auto-detect type from message
                var lower = message.toLowerCase();
                if (lower.indexOf('error') >= 0 || lower.indexOf('fail') >= 0 || lower.indexOf('invalid') >= 0) {
                    toast.classList.add('toast-error');
                } else if (lower.indexOf('success') >= 0 || lower.indexOf('added') >= 0 || lower.indexOf('saved') >= 0 ||
                           lower.indexOf('points') >= 0 || lower.indexOf('congratulations') >= 0) {
                    toast.classList.add('toast-success');
                }
            }
        }
    };
}

// ── Accessibility Enhancements ──
function initAccessibilityEnhancements() {
    // Add aria-labels to icon-only buttons
    document.querySelectorAll('button:not([aria-label])').forEach(function(btn) {
        var text = btn.textContent.trim();
        if (!text || text.length < 2) {
            var title = btn.getAttribute('title');
            if (title) btn.setAttribute('aria-label', title);
        }
    });

    // Modal roles
    document.querySelectorAll('.modal').forEach(function(modal) {
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
    });

    // Nav role
    var nav = document.querySelector('nav');
    if (nav && !nav.getAttribute('role')) {
        nav.setAttribute('role', 'navigation');
        nav.setAttribute('aria-label', 'Main navigation');
    }

    // Mark decorative elements
    document.querySelectorAll('.grain-overlay, .cursor-glow, .food-particles, .ambient-particles').forEach(function(el) {
        el.setAttribute('aria-hidden', 'true');
    });

    // Skip-to-content link
    if (!document.querySelector('.skip-to-content')) {
        var skip = document.createElement('a');
        skip.href = '#menu';
        skip.className = 'skip-to-content';
        skip.textContent = 'Skip to Menu';
        skip.setAttribute('style',
            'position:fixed;top:-100%;left:50%;transform:translateX(-50%);' +
            'background:var(--gold);color:#1a0f08;padding:8px 20px;border-radius:0 0 10px 10px;' +
            'font-weight:700;font-size:.85rem;z-index:100001;transition:top .3s ease;text-decoration:none;'
        );
        skip.addEventListener('focus', function() { skip.style.top = '0'; });
        skip.addEventListener('blur', function() { skip.style.top = '-100%'; });
        document.body.insertBefore(skip, document.body.firstChild);
    }

    // Ensure main content region
    var main = document.querySelector('main');
    if (!main) {
        var hero = document.getElementById('home');
        if (hero) hero.setAttribute('role', 'main');
    }
}

// ── 3D Card Tilt Effect ──
function init3DCardTilt() {
    if (typeof window.matchMedia !== 'function') return;
    if (window.matchMedia('(max-width: 768px)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var cards = document.querySelectorAll('.menu-item-card, .special-card');
    cards.forEach(function(card) {
        card.classList.add('tilt-card');

        // Add shine overlay
        var shine = document.createElement('div');
        shine.className = 'tilt-shine';
        card.appendChild(shine);

        card.addEventListener('mousemove', function(e) {
            var rect = card.getBoundingClientRect();
            var x = ((e.clientX - rect.left) / rect.width) * 100;
            var y = ((e.clientY - rect.top) / rect.height) * 100;

            card.style.setProperty('--mouse-x', x + '%');
            card.style.setProperty('--mouse-y', y + '%');

            var rotateX = ((y - 50) / 50) * -2;
            var rotateY = ((x - 50) / 50) * 2;
            card.style.transform = 'perspective(1200px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) scale(1.01)';
        });

        card.addEventListener('mouseleave', function() {
            card.style.transform = '';
        });
    });
}

// ── Menu Skeleton Loading ──
function initMenuSkeleton() {
    var menuContainer = document.getElementById('dynamic-menu-container');
    if (!menuContainer) return;

    // Only show skeleton if container is empty (menu not loaded yet)
    if (menuContainer.children.length > 0) return;

    var grid = document.createElement('div');
    grid.className = 'menu-skeleton-grid';
    grid.id = 'menu-skeleton';

    for (var i = 0; i < 6; i++) {
        grid.innerHTML += '<div class="menu-skeleton-item">' +
            '<div class="skel-title"></div>' +
            '<div class="skel-desc"></div>' +
            '<div class="skel-desc-2"></div>' +
            '<div class="skel-price"></div>' +
            '<div class="skel-btn"></div>' +
        '</div>';
    }

    menuContainer.appendChild(grid);

    // Remove skeleton when real content arrives
    var observer = new MutationObserver(function() {
        var skeleton = document.getElementById('menu-skeleton');
        if (skeleton && menuContainer.querySelector('.menu-item-card')) {
            skeleton.style.opacity = '0';
            skeleton.style.transition = 'opacity .3s ease';
            setTimeout(function() { skeleton.remove(); }, 300);
            observer.disconnect();
        }
    });

    observer.observe(menuContainer, { childList: true, subtree: true });
}

// ── Fly-to-Cart Particle Trail ──
function initParticleTrail() {
    if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Observe for .cart-fly-item being added to DOM
    var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(m) {
            m.addedNodes.forEach(function(node) {
                if (node.classList && node.classList.contains('cart-fly-item')) {
                    spawnParticleTrail(node);
                }
            });
        });
    });

    observer.observe(document.body, { childList: true });
}

function spawnParticleTrail(flyItem) {
    var interval = setInterval(function() {
        if (!document.body.contains(flyItem)) {
            clearInterval(interval);
            return;
        }
        var rect = flyItem.getBoundingClientRect();
        var particle = document.createElement('div');
        particle.className = 'cart-fly-particle';
        particle.style.left = rect.left + 'px';
        particle.style.top = rect.top + 'px';
        document.body.appendChild(particle);
        setTimeout(function() { particle.remove(); }, 500);
    }, 50);

    // Safety cleanup
    setTimeout(function() { clearInterval(interval); }, 2000);
}

// ── Parallax Depth on Sections ──
function initParallaxDepth() {
    if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var sections = document.querySelectorAll('.parallax-section .parallax-bg');
    if (!sections.length) return;

    var ticking = false;
    window.addEventListener('scroll', function() {
        if (!ticking) {
            requestAnimationFrame(function() {
                var scrollY = window.scrollY || window.pageYOffset;
                sections.forEach(function(bg) {
                    var parent = bg.parentElement;
                    var rect = parent.getBoundingClientRect();
                    if (rect.bottom > 0 && rect.top < window.innerHeight) {
                        var offset = (rect.top / window.innerHeight) * 15;
                        bg.style.transform = 'translate3d(0,' + offset + 'px,0)';
                    }
                });
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
}

// ── Premium Search Glow & Spinner ──
function initSearchGlow() {
    var searchInput = document.getElementById('menu-search');
    if (!searchInput) return;

    var wrapper = searchInput.parentElement;
    if (!wrapper) return;

    // Add glow element
    if (!wrapper.querySelector('.search-glow')) {
        wrapper.style.position = 'relative';
        var glow = document.createElement('div');
        glow.className = 'search-glow';
        wrapper.appendChild(glow);
    }

    // Add spinner element
    if (!wrapper.querySelector('.search-loading-spinner')) {
        var spinner = document.createElement('div');
        spinner.className = 'search-loading-spinner';
        wrapper.appendChild(spinner);
    }

    var searchTimer = null;
    searchInput.addEventListener('input', function() {
        searchInput.classList.add('searching');
        clearTimeout(searchTimer);
        searchTimer = setTimeout(function() {
            searchInput.classList.remove('searching');
        }, 400);
    });
}

// ── Swipe-to-Close for Mobile Modals ──
function initSwipeToClose() {
    if (!('ontouchstart' in window)) return;

    document.querySelectorAll('.modal .modal-content').forEach(function(content) {
        // Add swipe indicator
        if (!content.querySelector('.swipe-indicator')) {
            var indicator = document.createElement('div');
            indicator.className = 'swipe-indicator';
            content.insertBefore(indicator, content.firstChild);
        }

        var startY = 0;
        var currentY = 0;
        var isDragging = false;

        content.addEventListener('touchstart', function(e) {
            var target = e.target;
            if (target.classList.contains('swipe-indicator') || target === content) {
                startY = e.touches[0].clientY;
                isDragging = true;
                content.classList.add('swiping');
            }
        }, { passive: true });

        content.addEventListener('touchmove', function(e) {
            if (!isDragging) return;
            currentY = e.touches[0].clientY;
            var dy = currentY - startY;
            if (dy > 0) {
                content.style.transform = 'translateY(' + dy + 'px)';
                content.style.opacity = Math.max(0.5, 1 - dy / 400);
            }
        }, { passive: true });

        content.addEventListener('touchend', function() {
            if (!isDragging) return;
            isDragging = false;
            content.classList.remove('swiping');
            var dy = currentY - startY;

            if (dy > 120) {
                // Close the modal
                var modal = content.closest('.modal');
                if (modal) modal.style.display = 'none';
            }

            content.style.transform = '';
            content.style.opacity = '';
            currentY = 0;
        });
    });
}

// ── Cart Item Slide Animations ──
function initCartItemAnimations() {
    var cartItems = document.getElementById('cart-items');
    if (!cartItems) return;

    // Watch for cart items being removed — animate out before DOM removal
    var origRemoveChild = cartItems.removeChild.bind(cartItems);
    cartItems.removeChild = function(child) {
        if (child.classList && child.classList.contains('cart-item')) {
            child.classList.add('removing');
            setTimeout(function() {
                try { origRemoveChild(child); } catch(e) { /* already removed */ }
            }, 300);
            return child;
        }
        return origRemoveChild(child);
    };
}

// ── Order Confirmation Celebration ──
function initOrderCelebration() {
    // Watch for checkout step 4 (confirmation) becoming active
    var checkoutStep4 = document.getElementById('checkout-step-4');
    if (!checkoutStep4) return;

    var observer = new MutationObserver(function() {
        if (checkoutStep4.classList.contains('active')) {
            var confirmed = checkoutStep4.querySelector('.order-confirmed');
            if (confirmed && !confirmed.querySelector('.confirm-rings')) {
                addCelebrationEffects(confirmed);
            }
        }
    });

    observer.observe(checkoutStep4, { attributes: true, attributeFilter: ['class'] });
}

function addCelebrationEffects(container) {
    var icon = container.querySelector('.confirm-icon, h2, h3');
    if (!icon) return;

    // Add rings
    var rings = document.createElement('div');
    rings.className = 'confirm-rings';
    rings.innerHTML = '<div class="confirm-ring"></div><div class="confirm-ring"></div><div class="confirm-ring"></div>';
    icon.style.position = 'relative';
    icon.appendChild(rings);

    // Add particles
    var colors = ['#22c55e', '#D4A017', '#f59e0b', '#10b981'];
    for (var i = 0; i < 12; i++) {
        var particle = document.createElement('div');
        particle.className = 'confirm-particle';
        var angle = (i / 12) * Math.PI * 2;
        var dist = 60 + Math.random() * 40;
        particle.style.cssText =
            'background:' + colors[i % colors.length] + ';' +
            '--dx:' + (Math.cos(angle) * dist) + 'px;' +
            '--dy:' + (Math.sin(angle) * dist) + 'px;' +
            'left:50%;top:50%;animation-delay:' + (i * .05) + 's;';
        icon.appendChild(particle);
    }

    // Cleanup after animation
    setTimeout(function() {
        rings.remove();
        container.querySelectorAll('.confirm-particle').forEach(function(p) { p.remove(); });
    }, 3000);
}

// ── Combo Pricing Pulse ──
function initComboPricingPulse() {
    var pricing = document.querySelector('.combo-pricing');
    if (!pricing) return;

    var observer = new MutationObserver(function() {
        pricing.classList.add('updated');
        setTimeout(function() { pricing.classList.remove('updated'); }, 400);
    });

    observer.observe(pricing, { childList: true, subtree: true, characterData: true });
}

// ── Cart Count Badge Bump ──
function initCartCountBump() {
    var cartCount = document.getElementById('cart-count');
    if (!cartCount) return;

    var observer = new MutationObserver(function() {
        var parent = cartCount.parentElement;
        if (parent) {
            parent.classList.add('cart-count-bump');
            setTimeout(function() { parent.classList.remove('cart-count-bump'); }, 300);
        }
    });

    observer.observe(cartCount, { childList: true, characterData: true, subtree: true });
}

// ══════════════════════════════════════════════════════
// V5 — WORLD CLASS ENHANCEMENTS
// ══════════════════════════════════════════════════════

// ── Dark Mode Transition Spin ──
function initDarkModeTransition() {
    var toggle = document.getElementById('theme-toggle');
    if (!toggle) return;

    toggle.addEventListener('click', function() {
        document.body.classList.add('theme-transitioning');
        setTimeout(function() {
            document.body.classList.remove('theme-transitioning');
        }, 500);
    });
}

// ── Premium FAQ Accordion ──
function initFaqAccordionPremium() {
    document.querySelectorAll('.faq-item').forEach(function(item) {
        var heading = item.querySelector('h4');
        if (!heading) return;

        heading.addEventListener('click', function() {
            // Close other items
            document.querySelectorAll('.faq-item.open').forEach(function(other) {
                if (other !== item) other.classList.remove('open');
            });
            item.classList.toggle('open');
        });
    });
}

// ── Gallery Zoom on Click ──
function initGalleryZoom() {
    document.querySelectorAll('.gallery-item img').forEach(function(img) {
        img.style.cursor = 'zoom-in';
    });
}

// ── Countdown Timer Tick Animation ──
function initCountdownTick() {
    var countdownNums = document.querySelectorAll('.countdown-num');
    if (!countdownNums.length) return;

    // Watch for text changes and add tick class
    countdownNums.forEach(function(num) {
        var observer = new MutationObserver(function() {
            num.classList.add('tick');
            setTimeout(function() { num.classList.remove('tick'); }, 300);
        });
        observer.observe(num, { childList: true, characterData: true, subtree: true });
    });
}

// ── Floating Cart Bar Bump on Update ──
function initFloatingCartBump() {
    var bar = document.getElementById('floating-cart-bar');
    if (!bar) return;

    var total = bar.querySelector('.floating-cart-total');
    if (!total) return;

    var observer = new MutationObserver(function() {
        bar.classList.add('floating-cart-bar-bump');
        setTimeout(function() { bar.classList.remove('floating-cart-bar-bump'); }, 300);
    });

    observer.observe(total, { childList: true, characterData: true, subtree: true });
}

// ── Premium Nav Link Highlight ──
function initPremiumNavHighlight() {
    document.querySelectorAll('.nav-links a').forEach(function(link) {
        link.addEventListener('mouseenter', function() {
            link.style.textShadow = '0 0 8px rgba(212, 160, 23, .2)';
        });
        link.addEventListener('mouseleave', function() {
            link.style.textShadow = '';
        });
    });
}

// ── Image Reveal on Load ──
function initImageRevealOnLoad() {
    if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    document.querySelectorAll('.gallery-item img, .chef-slide img, .special-card img').forEach(function(img) {
        if (img.complete && img.naturalWidth > 0) {
            img.classList.add('img-revealed');
            return;
        }
        img.style.opacity = '0';
        img.style.transition = 'opacity .5s ease, transform .5s ease';
        img.style.transform = 'scale(1.03)';
        img.addEventListener('load', function() {
            img.style.opacity = '1';
            img.style.transform = 'scale(1)';
            img.classList.add('img-revealed');
        });
    });
}

// ══════════════════════════════════════════════════════
// V6 — TOP OF ALL ENHANCEMENTS
// ══════════════════════════════════════════════════════

// ── SVG Ornament Line-Draw Reveal ──
function initOrnamentReveal() {
    var ornaments = document.querySelectorAll('.section-ornament-wrap');
    if (!ornaments.length || !('IntersectionObserver' in window)) return;

    var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    ornaments.forEach(function(el) { observer.observe(el); });
}

// ── Features List Stagger Reveal ──
function initFeaturesListReveal() {
    var lists = document.querySelectorAll('.features-list');
    if (!lists.length || !('IntersectionObserver' in window)) return;

    var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                var items = entry.target.querySelectorAll('li');
                items.forEach(function(li, i) {
                    setTimeout(function() {
                        li.classList.add('revealed');
                    }, i * 100);
                });
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.3 });

    lists.forEach(function(list) { observer.observe(list); });
}

// ── Social Links Stagger on Footer Scroll ──
function initSocialLinksReveal() {
    var socialLinks = document.querySelectorAll('.social-links');
    if (!socialLinks.length || !('IntersectionObserver' in window)) return;

    var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    socialLinks.forEach(function(el) { observer.observe(el); });
}

// ── Section Heading Underline Reveal ──
function initSectionHeadingReveal() {
    var headings = document.querySelectorAll('section h2');
    if (!headings.length || !('IntersectionObserver' in window)) return;

    var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    headings.forEach(function(h) { observer.observe(h); });
}

// ── Loyalty Points Float Animation ──
function initLoyaltyPointsAnimation() {
    // Listen for loyalty point awards — watch for toast messages about points
    var origToast = window.showAuthToast;
    if (typeof origToast !== 'function') return;

    window.showAuthToast = function(message, type) {
        origToast(message, type);

        // If message contains points info, show floating points
        var pointsMatch = message.match(/(\+?\d+)\s*points?/i);
        if (pointsMatch) {
            showFloatingPoints('+' + pointsMatch[1] + ' pts');
        }
    };
}

function showFloatingPoints(text) {
    var widget = document.getElementById('loyalty-widget');
    var target = widget || document.getElementById('cart-icon');
    if (!target) return;

    var rect = target.getBoundingClientRect();
    var float = document.createElement('div');
    float.className = 'loyalty-points-float';
    float.textContent = text;
    float.style.left = rect.left + 'px';
    float.style.top = rect.top + 'px';
    document.body.appendChild(float);

    setTimeout(function() { float.remove(); }, 1500);
}

// ── Mobile Menu Animation Enhancement ──
function initMobileMenuAnimation() {
    var overlay = document.getElementById('mobile-menu-overlay');
    if (!overlay) return;

    // Watch for overlay becoming active
    var observer = new MutationObserver(function() {
        if (overlay.classList.contains('active')) {
            overlay.style.display = '';
        }
    });

    observer.observe(overlay, { attributes: true, attributeFilter: ['class'] });
}

// ── Hamburger Menu Morph ──
function initHamburgerMorph() {
    var toggle = document.getElementById('mobile-menu-toggle');
    if (!toggle) return;

    toggle.addEventListener('click', function() {
        toggle.classList.toggle('active');
    });
}
