// ===== PREMIUM INTERACTIONS MODULE =====
// Smooth scroll reveals, ripple effects, lazy image fades, parallax, header scroll state

export function initPremium() {
    initScrollReveal();
    initRippleEffect();
    initLazyImageFade();
    initHeaderScrollState();
    initSmoothAnchorScroll();
    initAccessibilityEnhancements();
}

// ── Intersection Observer Scroll Reveal ──
function initScrollReveal() {
    var revealEls = document.querySelectorAll(
        '.special-card, .stat-item, .review-card, .gallery-item, ' +
        '.faq-item, .chef-section, .about-text, .contact-info-section, ' +
        '.contact-form-section, .newsletter-card, .trust-badge, .footer-section'
    );

    if (!revealEls.length || !('IntersectionObserver' in window)) return;

    var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                var el = entry.target;
                var delay = 0;
                // Stagger siblings
                var parent = el.parentElement;
                if (parent) {
                    var siblings = parent.querySelectorAll('.special-card, .stat-item, .review-card, .trust-badge, .footer-section, .gallery-item, .faq-item');
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
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach(function(el) {
        if (!el.classList.contains('reveal')) {
            el.style.opacity = '0';
            el.style.transform = 'translateY(24px)';
            el.style.transition = 'opacity .7s cubic-bezier(.22,1,.36,1), transform .7s cubic-bezier(.22,1,.36,1)';
        }
        observer.observe(el);
    });
}

// ── Ripple Effect on Add-to-Cart Buttons ──
function initRippleEffect() {
    document.addEventListener('click', function(e) {
        var btn = e.target.closest('.add-to-cart, .cta-button, .combo-add-btn, .pay-now-btn, .pay-confirm-btn');
        if (!btn) return;

        // Remove old ripple
        btn.classList.remove('ripple');
        void btn.offsetWidth; // force reflow
        btn.classList.add('ripple');

        setTimeout(function() {
            btn.classList.remove('ripple');
        }, 500);
    });
}

// ── Lazy Image Fade-In ──
function initLazyImageFade() {
    // Handle images that are already loaded
    document.querySelectorAll('img[loading="lazy"]').forEach(function(img) {
        if (img.complete && img.naturalWidth > 0) {
            img.classList.add('loaded');
        }
    });

    // Handle images loading in the future
    document.addEventListener('load', function(e) {
        if (e.target.tagName === 'IMG' && e.target.hasAttribute('loading')) {
            e.target.classList.add('loaded');
        }
    }, true);
}

// ── Header Scroll State ──
function initHeaderScrollState() {
    var header = document.querySelector('header');
    if (!header) return;

    var lastScroll = 0;
    var ticking = false;

    function updateHeader() {
        var scrollY = window.scrollY || window.pageYOffset;

        if (scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
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

    // Set initial state
    updateHeader();
}

// ── Smooth Anchor Scrolling with Offset ──
function initSmoothAnchorScroll() {
    document.addEventListener('click', function(e) {
        var link = e.target.closest('a[href^="#"]');
        if (!link) return;

        var href = link.getAttribute('href');
        if (href === '#' || href.length < 2) return;

        var target = document.querySelector(href);
        if (!target) return;

        e.preventDefault();

        var headerHeight = document.querySelector('header') ?
            document.querySelector('header').offsetHeight : 0;

        window.scrollTo({
            top: target.offsetTop - headerHeight - 16,
            behavior: 'smooth'
        });

        // Update URL without jumping
        if (history.pushState) {
            history.pushState(null, null, href);
        }
    });
}

// ── Accessibility Enhancements ──
function initAccessibilityEnhancements() {
    // Add aria-labels to icon-only buttons that are missing them
    document.querySelectorAll('button:not([aria-label])').forEach(function(btn) {
        var text = btn.textContent.trim();
        if (!text || text.length < 2) {
            // Try to infer from title or nearby text
            var title = btn.getAttribute('title');
            if (title) {
                btn.setAttribute('aria-label', title);
            }
        }
    });

    // Ensure modals trap focus
    document.querySelectorAll('.modal').forEach(function(modal) {
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
    });

    // Add role="navigation" to nav if missing
    var nav = document.querySelector('nav');
    if (nav && !nav.getAttribute('role')) {
        nav.setAttribute('role', 'navigation');
        nav.setAttribute('aria-label', 'Main navigation');
    }

    // Mark decorative elements
    document.querySelectorAll('.grain-overlay, .cursor-glow, .food-particles, .ambient-particles').forEach(function(el) {
        el.setAttribute('aria-hidden', 'true');
    });

    // Improve skip-to-content: add if missing
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
}
