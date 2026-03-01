import { safeGetItem, safeSetItem, lockScroll, unlockScroll } from '../core/utils.js';

// ===== CONFETTI ANIMATION =====
export function launchConfetti() {
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

export function closeMobileMenu() {
    var navLinks = document.getElementById('nav-links');
    var mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
    var mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    if (navLinks) navLinks.classList.remove('active');
    if (mobileMenuOverlay) mobileMenuOverlay.classList.remove('active');
    if (mobileMenuToggle) mobileMenuToggle.textContent = '\u2630';
    unlockScroll();
}

export function initUI() {
    // ===== SCROLL TO TOP ON REFRESH =====
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);

    // ===== PAGE TRANSITION & PRELOADER =====
    window.addEventListener('load', () => {
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

    // ===== SCROLL REVEAL ANIMATIONS =====
    (function() {
        var revealEls = document.querySelectorAll('.reveal');
        if (!revealEls.length || typeof IntersectionObserver === 'undefined') return;
        var observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
        revealEls.forEach(function(el) { observer.observe(el); });
    })();

    // ===== MOBILE NAV SETUP =====
    (function() {
        var navLinks = document.getElementById('nav-links');
        var mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        var mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
        if (!navLinks || !mobileMenuToggle) return;

        var navParent = navLinks.parentElement;
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
                var isSignIn = link.id === 'signin-btn' || link.closest('#signin-btn');
                if (isSignIn) {
                    navLinks.classList.remove('active');
                    if (mobileMenuOverlay) mobileMenuOverlay.classList.remove('active');
                    mobileMenuToggle.textContent = '\u2630';
                    return;
                }
                closeMobileMenu();
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
    })();

    // ===== SMOOTH SCROLLING =====
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            if (this.id === 'cart-icon') return;
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                closeMobileMenu();
            }
        });
    });

    // ===== BACK TO TOP =====
    const backToTop = document.getElementById('back-to-top');
    if (backToTop) {
        backToTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // ===== SCROLL HANDLER (rAF-throttled) =====
    const heroSlideshow = document.querySelector('.hero-slideshow');
    const sections = document.querySelectorAll('section[id]');
    const navAnchors = document.querySelectorAll('.nav-links a[href^="#"]');
    const header = document.querySelector('header');
    var lastScroll = 0;

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

    var _aboutEl = document.querySelector('.about');
    var _chefContentEl = document.querySelector('.chef-content');
    var _statsGridEl = document.querySelector('.stats-grid');
    var _aboutTop = _aboutEl ? _aboutEl.offsetTop : 0;
    var _chefSec = _chefContentEl ? _chefContentEl.closest('section') || _chefContentEl.closest('.chef-section') : null;
    var _chefTop = _chefSec ? _chefSec.offsetTop : 0;
    var _statsSec = _statsGridEl ? _statsGridEl.closest('.stats-section') : null;
    var _statsTop = _statsSec ? _statsSec.offsetTop : 0;

    window.addEventListener('resize', function() {
        _cachedHeroHeight = _heroEl ? _heroEl.offsetHeight : 600;
        _cachedSectionTops = [];
        sections.forEach(function(s) {
            _cachedSectionTops.push({ id: s.getAttribute('id'), top: s.offsetTop });
        });
        _aboutTop = _aboutEl ? _aboutEl.offsetTop : 0;
        _chefTop = _chefSec ? _chefSec.offsetTop : 0;
        _statsTop = _statsSec ? _statsSec.offsetTop : 0;
    });

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

                // Fade hero scroll indicator
                if (_scrollIndicator && currentScroll < 300) {
                    _scrollIndicator.style.opacity = Math.max(0, 1 - currentScroll / 300);
                } else if (_scrollIndicator && _scrollIndicator.style.opacity !== '0') {
                    _scrollIndicator.style.opacity = 0;
                }

                // Header hide/show (desktop only)
                if (header && isDesktop) {
                    if (currentScroll > lastScroll && currentScroll > 100) {
                        header.style.transform = 'translateY(-100%)';
                    } else {
                        header.style.transform = 'translateY(0)';
                    }
                }
                lastScroll = currentScroll;

                // Back to top visibility
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

                // Sticky order bar
                if (_stickyBar) {
                    var barShouldShow = currentScroll > _cachedHeroHeight;
                    var barIsVisible = _stickyBar.classList.contains('visible');
                    if (barShouldShow && !barIsVisible) _stickyBar.classList.add('visible');
                    else if (!barShouldShow && barIsVisible) _stickyBar.classList.remove('visible');
                }

                // Active nav link tracking
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
                var cascadeDelay = 0.07 * siblingIndex + 0.04 * Math.sin(siblingIndex * Math.PI / 4);
                el.style.transitionDelay = Math.max(0, cascadeDelay).toFixed(3) + 's';
            }
        });

        document.querySelectorAll('.menu-item-card').forEach((card) => {
            card.classList.add('reveal');
            const siblingCards = card.parentElement ? Array.from(card.parentElement.children) : [];
            const siblingIndex = siblingCards.indexOf(card);
            var row = Math.floor(siblingIndex / 2);
            var col = siblingIndex % 2;
            card.style.transitionDelay = (row * 0.12 + col * 0.06).toFixed(3) + 's';
        });

        document.querySelectorAll('.about, .specials, .menu, .gallery, .reviews, .contact, .faq').forEach(section => {
            section.classList.add('section-reveal');
        });

        const chefImage = document.querySelector('.chef-image');
        const chefInfo = document.querySelector('#chef-info');
        if (chefImage) chefImage.classList.add('reveal-left');
        if (chefInfo) chefInfo.classList.add('reveal-right');

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

        carousel.addEventListener('scroll', updateArrows, { passive: true });
        updateArrows();

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

    // ===== CONTACT FORM =====
    var contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (typeof showAuthToast === 'function') showAuthToast('Thank you for your message! We will get back to you shortly.');
            e.target.reset();
        });
    }

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

        document.querySelectorAll('img[loading="lazy"]').forEach(revealImage);

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

    // ===== PREMIUM: 3D CARD TILT EFFECT =====
    (function() {
        if (window.innerWidth <= 768) return;

        const cards = document.querySelectorAll('.menu-item-card');
        const maxTilt = 4;

        cards.forEach(function(card) {
            var cachedRect = null;
            // Cache rect on enter — avoids getBoundingClientRect on every mousemove pixel
            card.addEventListener('mouseenter', function() {
                cachedRect = card.getBoundingClientRect();
            });
            card.addEventListener('mousemove', function(e) {
                if (!cachedRect) return;
                const x = e.clientX - cachedRect.left;
                const y = e.clientY - cachedRect.top;
                const centerX = cachedRect.width / 2;
                const centerY = cachedRect.height / 2;
                const rotateX = ((y - centerY) / centerY) * -maxTilt;
                const rotateY = ((x - centerX) / centerX) * maxTilt;
                card.style.transform = 'perspective(800px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) translateY(-4px)';
            });
            card.addEventListener('mouseleave', function() {
                cachedRect = null;
                card.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
                card.style.transform = 'perspective(800px) rotateX(0) rotateY(0) translateY(0)';
                setTimeout(function() { card.style.transition = ''; }, 500);
            });
        });
    })();

    // ===== CURSOR GLOW TRAIL =====
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

    // Secondary parallax removed — getBoundingClientRect loop on 15+ elements per frame caused layout thrashing

    // ===== SVG ORNAMENT DRAW-ON-SCROLL =====
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

    // ===== MENU ITEM IMAGE PREVIEW ON HOVER =====
    (function() {
        if (window.innerWidth <= 768) return;

        var previewImg = document.getElementById('menu-preview-img');
        if (!previewImg) return;

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
                var itemImg = card.dataset.imageUrl;
                if (itemImg) {
                    previewImg.src = itemImg;
                    previewImg.classList.add('active');
                } else {
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

    // ===== MAGNETIC CURSOR ON GALLERY/CHEF IMAGES =====
    (function() {
        if (window.innerWidth <= 768) return;

        var magneticImgs = document.querySelectorAll('.chef-slide, .gallery-slide-item img, .gallery-item img');
        var strength = 0.03;

        magneticImgs.forEach(function(img) {
            img.classList.add('magnetic-image');
            var cachedRect = null;
            img.addEventListener('mouseenter', function() { cachedRect = img.getBoundingClientRect(); });
            img.addEventListener('mousemove', function(e) {
                if (!cachedRect) return;
                var x = e.clientX - cachedRect.left - cachedRect.width / 2;
                var y = e.clientY - cachedRect.top - cachedRect.height / 2;
                img.style.transform = 'translate(' + (x * strength) + 'px, ' + (y * strength) + 'px) scale(1.02)';
            });
            img.addEventListener('mouseleave', function() {
                cachedRect = null;
                img.style.transform = '';
            });
        });
    })();

    // ===== CURSOR-AWARE LIGHT REFLECTION ON CARDS =====
    (function() {
        if (window.innerWidth <= 768) return;

        var cards = document.querySelectorAll('.menu-item-card, .about-text');
        cards.forEach(function(card) {
            var ref = document.createElement('div');
            ref.className = 'card-reflection';
            card.appendChild(ref);
            var cachedRect = null;
            card.addEventListener('mouseenter', function() { cachedRect = card.getBoundingClientRect(); });
            card.addEventListener('mousemove', function(e) {
                if (!cachedRect) return;
                ref.style.setProperty('--ref-x', (e.clientX - cachedRect.left) + 'px');
                ref.style.setProperty('--ref-y', (e.clientY - cachedRect.top) + 'px');
            });
            card.addEventListener('mouseleave', function() { cachedRect = null; });
        });
    })();

    // ===== SECTION WIPE TRANSITIONS ON SCROLL =====
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
        if (window.innerWidth <= 768) return;

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

        var dropdown = document.createElement('div');
        dropdown.id = 'search-autocomplete';
        dropdown.className = 'search-autocomplete-dropdown';
        searchEl.parentElement.classList.add('search-autocomplete-wrap');
        searchEl.parentElement.appendChild(dropdown);

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

                document.querySelectorAll('.menu-item-card').forEach(function(card) {
                    var nameEl = card.querySelector('h4');
                    var descEl = card.querySelector('.item-description');
                    var name = nameEl ? nameEl.textContent.toLowerCase() : '';
                    var desc = descEl ? descEl.textContent.toLowerCase() : '';
                    card.style.display = (!query || name.includes(query) || desc.includes(query)) ? '' : 'none';
                });

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

        dropdown.addEventListener('click', function(e) {
            var item = e.target.closest('.ac-item');
            if (!item) return;
            var name = item.dataset.name;
            searchEl.value = name;
            dropdown.classList.remove('visible');
            var match = searchIndex.find(function(m) { return m.name === name; });
            if (match && match.card) {
                document.querySelectorAll('.menu-item-card').forEach(function(c) { c.style.display = ''; });
                match.card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                match.card.classList.add('search-highlight');
                setTimeout(function() { match.card.classList.remove('search-highlight'); }, 2000);
            }
        });

        document.addEventListener('click', function(e) {
            if (!e.target.closest('.search-autocomplete-wrap')) {
                dropdown.classList.remove('visible');
            }
        });

        searchEl.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                dropdown.classList.remove('visible');
                searchEl.blur();
            }
        });

        // ===== AI-ENHANCED SEARCH (debounced, fires after 800ms) =====
        var aiSearchTimer;
        searchEl.addEventListener('input', function() {
            clearTimeout(aiSearchTimer);
            var query = searchEl.value.trim();
            if (query.length < 4) { removeAiSearchResults(); return; }
            aiSearchTimer = setTimeout(async function() {
                try {
                    var badge = document.getElementById('ai-search-badge');
                    if (!badge) {
                        badge = document.createElement('span');
                        badge.id = 'ai-search-badge';
                        badge.className = 'ai-search-badge';
                        searchEl.parentElement.appendChild(badge);
                    }
                    badge.textContent = 'AI searching...';
                    badge.style.display = 'inline-block';

                    var resp = await fetch('/api/smart-search', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ query: query })
                    });
                    var data = await resp.json();
                    badge.textContent = 'AI: ' + (data.interpretation || 'results');

                    if (data.results && data.results.length > 0) {
                        document.querySelectorAll('.menu-item-card').forEach(function(card) {
                            card.classList.remove('ai-highlighted');
                        });
                        data.results.forEach(function(r) {
                            var card = document.querySelector('.menu-item-card[data-id="' + r.name + '"]');
                            if (card) { card.style.display = ''; card.classList.add('ai-highlighted'); }
                        });
                    }
                } catch(e) { removeAiSearchResults(); }
            }, 800);
        });

        function removeAiSearchResults() {
            var badge = document.getElementById('ai-search-badge');
            if (badge) badge.style.display = 'none';
            document.querySelectorAll('.menu-item-card.ai-highlighted').forEach(function(c) {
                c.classList.remove('ai-highlighted');
            });
        }
    })();

    // ===== LAZY IMAGE LOAD COMPLETION =====
    document.addEventListener('DOMContentLoaded', function() {
        document.querySelectorAll('img[loading="lazy"]').forEach(function(img) {
            if (img.complete) {
                img.classList.add('loaded');
            } else {
                img.addEventListener('load', function() { img.classList.add('loaded'); });
                img.addEventListener('error', function() { img.classList.add('loaded'); });
            }
        });
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
}

Object.assign(window, { closeMobileMenu, launchConfetti });
