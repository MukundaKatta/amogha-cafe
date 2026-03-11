// ===== SAFE localStorage (works in private browsing) =====
export function safeGetItem(key) {
    try { return localStorage.getItem(key); } catch(e) { return null; }
}
export function safeSetItem(key, val) {
    try { localStorage.setItem(key, val); } catch(e) { /* quota or private mode */ }
}

// ===== SAFE CLIPBOARD COPY =====
export function safeCopy(text, btn) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function() {
            if (btn) btn.textContent = 'Copied!';
        }).catch(function() { fallbackCopy(text, btn); });
    } else {
        fallbackCopy(text, btn);
    }
}
export function fallbackCopy(text, btn) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); if (btn) btn.textContent = 'Copied!'; } catch(e) {}
    document.body.removeChild(ta);
}

// ===== iOS-SAFE SCROLL LOCK =====
export var _scrollLockPos = 0;
export function lockScroll() {
    _scrollLockPos = window.pageYOffset || document.documentElement.scrollTop;
    document.body.style.top = -_scrollLockPos + 'px';
    document.body.classList.add('modal-open');
}
export function unlockScroll() {
    document.body.classList.remove('modal-open');
    document.body.style.top = '';
    window.scrollTo(0, _scrollLockPos);
}

// ===== HTML SANITIZER (prevent XSS in dynamic content) =====
export function sanitizeHtml(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ===== DEBOUNCE (prevent excessive calls) =====
export function debounce(fn, delay) {
    var timer = null;
    return function() {
        var context = this, args = arguments;
        clearTimeout(timer);
        timer = setTimeout(function() { fn.apply(context, args); }, delay);
    };
}

// ===== THROTTLE (rate-limit calls) =====
export function throttle(fn, limit) {
    var lastCall = 0;
    return function() {
        var now = Date.now();
        if (now - lastCall >= limit) {
            lastCall = now;
            fn.apply(this, arguments);
        }
    };
}

// ===== SIMPLE EVENT BUS (decoupled module communication) =====
var _eventHandlers = {};
var MAX_HANDLERS_PER_EVENT = 50; // Prevent memory leaks from unbounded listener registration
export function emitEvent(name, data) {
    var handlers = _eventHandlers[name];
    if (handlers) handlers.forEach(function(fn) { try { fn(data); } catch(e) { console.error('[EventBus]', name, e); } });
}
export function onEvent(name, fn) {
    if (!_eventHandlers[name]) _eventHandlers[name] = [];
    // Guard against memory leaks from repeated registrations
    if (_eventHandlers[name].length >= MAX_HANDLERS_PER_EVENT) {
        console.warn('[EventBus] Too many handlers for "' + name + '", removing oldest');
        _eventHandlers[name].shift();
    }
    _eventHandlers[name].push(fn);
    return function() {
        _eventHandlers[name] = _eventHandlers[name].filter(function(h) { return h !== fn; });
    };
}

// ===== FORMAT CURRENCY (consistent ₹ formatting) =====
export function formatCurrency(amount) {
    return '\u20B9' + (typeof amount === 'number' ? amount.toLocaleString('en-IN') : amount);
}

// ===== SESSION EXPIRATION CHECK =====
var SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export function isSessionExpired() {
    try {
        var ts = localStorage.getItem('amoghaSessionTs');
        if (!ts) return false;
        return (Date.now() - parseInt(ts, 10)) > SESSION_MAX_AGE_MS;
    } catch(e) { return false; }
}
export function refreshSessionTimestamp() {
    try { localStorage.setItem('amoghaSessionTs', String(Date.now())); } catch(e) {}
}

// safeCopy and fallbackCopy are used inside innerHTML template strings like onclick="safeCopy(...)"
// unlockScroll is used in onclick attributes
Object.assign(window, { safeGetItem, safeCopy, fallbackCopy, unlockScroll, sanitizeHtml, formatCurrency });
