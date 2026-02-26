// ===== HERO SLIDESHOW AND ANIMATION =====

export function initDynamicHeroText() {
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
}

export function initHeaderSlideshow() {
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
}

export function initHero() {
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

            var types = ['', 'thin', 'accent', 'thin', ''];
            var type = types[i % types.length];
            line.className = 'sp-line' + (type ? ' ' + type : '');

            var h = 140 + Math.random() * 180;
            var x = 3 + (i / lineCount) * 90 + Math.random() * 6;
            var dur = 12 + Math.random() * 10;
            var delay = (i / lineCount) * dur;
            var swayDur = 7 + Math.random() * 6;
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

    // ===== SOFT BLUR UNREVEAL EFFECT — cinematic focus pull =====
    var taglineEl = document.querySelector('.hero-tagline .hero-text-inner');
    if (taglineEl) {
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
    }

    // ===== PREMIUM: MOUSE-FOLLOW SPOTLIGHT ON HERO =====
    if (window.innerWidth > 768) {
        const hero = document.querySelector('.hero');
        const spotlight = document.querySelector('.hero-mouse-spotlight');
        if (hero && spotlight) {
            hero.addEventListener('mousemove', function(e) {
                const rect = hero.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                spotlight.style.setProperty('--mouse-x', x + 'px');
                spotlight.style.setProperty('--mouse-y', y + 'px');
            });
        }
    }
}
