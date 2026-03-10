// ===== PREMIUM INTERACTIONS MODULE V3 =====
// Scroll reveals, ripple effects, lazy image fades, header intelligence,
// checkout progress stepper, cart empty state, form validation,
// animated counters, section spy, keyboard shortcuts

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
