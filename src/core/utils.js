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

// safeCopy and fallbackCopy are used inside innerHTML template strings like onclick="safeCopy(...)"
// unlockScroll is used in onclick attributes
Object.assign(window, { safeGetItem, safeCopy, fallbackCopy, unlockScroll });
