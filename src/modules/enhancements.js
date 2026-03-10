// ===== ENHANCEMENTS MODULE =====
// Open/Closed status, Social proof toasts, Cookie consent, Newsletter, Tilt effects, Search suggestions

// ── Open / Closed Status Indicator ──
export function initOpenStatus() {
    var badge = document.getElementById('open-status');
    if (!badge) return;

    function update() {
        var now = new Date();
        var day = now.getDay(); // 0=Sun
        var h = now.getHours();
        var m = now.getMinutes();
        var t = h * 60 + m;

        var open, close;
        if (day === 0) { // Sunday
            open = 12 * 60; close = 21 * 60;
        } else if (day >= 5) { // Fri-Sat
            open = 11 * 60; close = 22 * 60 + 30;
        } else { // Mon-Thu
            open = 11 * 60; close = 21 * 60 + 30;
        }

        var isOpen = t >= open && t < close;
        var dot = badge.querySelector('.status-dot');
        var text = badge.querySelector('.status-text');

        if (isOpen) {
            badge.classList.add('is-open');
            badge.classList.remove('is-closed');
            dot.style.background = '#22c55e';
            dot.style.boxShadow = '0 0 8px rgba(34,197,94,.6)';
            var minsLeft = close - t;
            if (minsLeft <= 60) {
                text.textContent = 'Closing in ' + minsLeft + 'm';
                badge.classList.add('closing-soon');
            } else {
                text.textContent = 'Open Now';
                badge.classList.remove('closing-soon');
            }
        } else {
            badge.classList.remove('is-open');
            badge.classList.add('is-closed');
            dot.style.background = '#ef4444';
            dot.style.boxShadow = '0 0 8px rgba(239,68,68,.5)';
            text.textContent = 'Closed';
        }
    }

    update();
    setInterval(update, 60000);
}


// ── Social Proof Toasts ──
var SP_NAMES = ['Priya', 'Rahul', 'Sneha', 'Vikram', 'Ananya', 'Arjun', 'Lakshmi', 'Kiran', 'Deepa', 'Arun', 'Meera', 'Suresh', 'Kavya', 'Ravi', 'Divya'];
var SP_ITEMS = ['Chicken 65 Biryani', 'Baghara Rice + Chicken Fry', 'Gongura Chicken + Naan', 'Paneer Butter Masala', 'Chicken Biryani', 'Veg Biryani', 'Tandoori Chicken', 'Masala Dosa', 'Butter Naan Combo'];
var SP_TIMES = ['2 minutes ago', '5 minutes ago', 'just now', '8 minutes ago', '12 minutes ago'];
var SP_COLORS = ['#e8445a', '#4a90d9', '#50c878', '#f5a623', '#9b59b6', '#e74c3c', '#1abc9c', '#e67e22'];

export function initSocialProof() {
    var toast = document.getElementById('social-proof-toast');
    if (!toast) return;

    function show() {
        var name = SP_NAMES[Math.floor(Math.random() * SP_NAMES.length)];
        var item = SP_ITEMS[Math.floor(Math.random() * SP_ITEMS.length)];
        var time = SP_TIMES[Math.floor(Math.random() * SP_TIMES.length)];
        var color = SP_COLORS[Math.floor(Math.random() * SP_COLORS.length)];
        var initial = name.charAt(0);

        toast.querySelector('.sp-avatar').textContent = initial;
        toast.querySelector('.sp-avatar').style.background = color;
        toast.querySelector('.sp-text').textContent = name + ' ordered ' + item;
        toast.querySelector('.sp-time').textContent = time;

        toast.style.display = 'flex';
        toast.classList.remove('sp-hide');
        toast.classList.add('sp-show');

        setTimeout(function () {
            toast.classList.remove('sp-show');
            toast.classList.add('sp-hide');
            setTimeout(function () { toast.style.display = 'none'; }, 500);
        }, 4500);
    }

    // First toast after 15s, then every 30-60s
    setTimeout(show, 15000);
    setInterval(function () {
        // Only show if user hasn't scrolled to checkout
        if (!document.querySelector('.modal[style*="block"]')) {
            show();
        }
    }, 30000 + Math.random() * 30000);
}


// ── Cookie Consent ──
// Handled by ui.js — this is a no-op to avoid duplicate logic
export function initCookieConsent() {}


// ── Newsletter ──
window.submitNewsletter = function () {
    var email = document.getElementById('newsletter-email').value.trim();
    var msg = document.getElementById('newsletter-msg');
    if (!email) return;

    // Save to Firestore if available
    if (window.db) {
        window.db.collection('newsletter').doc(email).set({
            email: email,
            subscribedAt: new Date().toISOString()
        }).catch(function () { });
    }

    msg.textContent = 'You\'re in! Watch your inbox for delicious updates.';
    msg.style.color = '#22c55e';
    document.getElementById('newsletter-email').value = '';
    document.getElementById('newsletter-form').querySelector('button').textContent = 'Subscribed!';
    document.getElementById('newsletter-form').querySelector('button').disabled = true;
};


// ── 3D Tilt on Cards ──
export function initTiltEffect() {
    var cards = document.querySelectorAll('.special-card, .review-card');
    cards.forEach(function (card) {
        card.addEventListener('mousemove', function (e) {
            var rect = card.getBoundingClientRect();
            var x = e.clientX - rect.left;
            var y = e.clientY - rect.top;
            var centerX = rect.width / 2;
            var centerY = rect.height / 2;
            var rotateX = (y - centerY) / centerY * -4;
            var rotateY = (x - centerX) / centerX * 4;
            card.style.transform = 'perspective(800px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) scale(1.02)';
            card.style.transition = 'transform 0.1s ease';
        });
        card.addEventListener('mouseleave', function () {
            card.style.transform = '';
            card.style.transition = 'transform 0.4s cubic-bezier(.22,1,.36,1)';
        });
    });
}


// ── Trending Search Suggestions ──
export function initSearchSuggestions() {
    var searchInput = document.getElementById('menu-search');
    if (!searchInput) return;

    var trends = ['Biryani', 'Chicken 65', 'Paneer', 'Naan', 'Gongura', 'Tea', 'Dosa', 'Tandoori'];
    var wrapper = document.createElement('div');
    wrapper.className = 'search-suggestions';
    wrapper.style.display = 'none';

    var header = document.createElement('div');
    header.className = 'search-suggestions-header';
    header.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg> Trending';
    wrapper.appendChild(header);

    trends.forEach(function (term) {
        var item = document.createElement('button');
        item.className = 'search-suggestion-item';
        item.textContent = term;
        item.type = 'button';
        item.onclick = function () {
            searchInput.value = term;
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            wrapper.style.display = 'none';
        };
        wrapper.appendChild(item);
    });

    searchInput.parentElement.style.position = 'relative';
    searchInput.parentElement.appendChild(wrapper);

    searchInput.addEventListener('focus', function () {
        if (!searchInput.value.trim()) wrapper.style.display = 'block';
    });
    searchInput.addEventListener('input', function () {
        wrapper.style.display = searchInput.value.trim() ? 'none' : 'block';
    });
    document.addEventListener('click', function (e) {
        if (!searchInput.parentElement.contains(e.target)) wrapper.style.display = 'none';
    });
}


// ── Init All Enhancements ──
export function initEnhancements() {
    initOpenStatus();
    initSocialProof();
    initCookieConsent();
    initTiltEffect();
    initSearchSuggestions();
}
