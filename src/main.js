// ===== AMOGHA CAFE — ES6 MODULE ENTRY POINT =====
// Core utilities and constants (side-effect free imports, but trigger window exports)
import './core/utils.js';
import './core/constants.js';

// Critical modules — imported eagerly (needed above the fold)
import './modules/auth.js';
import './modules/cart.js';
import './modules/payment.js';
import './modules/menu.js';
import './modules/hero.js';
import './modules/ui.js';
import './modules/notifications.js';
import './modules/reservations.js';
import './modules/loyalty.js';
import './modules/features.js';

// Non-critical modules — loaded via dynamic import() for code splitting.
// These are deferred anyway and have no synchronous window exports,
// so lazy-loading them reduces the initial bundle size.

// Named imports for initialization
import { loadCart, initAddonCache, restoreButtonStates, updateCartFab, initCart, displayCart } from './modules/cart.js';
import { initMenuSync, loadMenuRatings } from './modules/menu.js';
import { initHero, initDynamicHeroText, initHeaderSlideshow } from './modules/hero.js';
import { initUI } from './modules/ui.js';
import { initAuth } from './modules/auth.js';
import { initNotifications } from './modules/notifications.js';
import { initReservations } from './modules/reservations.js';
import { initLoyalty } from './modules/loyalty.js';
import { initFeatures, showRecommendations, loadDailySpecial, initComboBuilder, showReorderToast, initLiveOrderTicker, initOrderAgainSection, initAiForYou } from './modules/features.js';
import { updateFloatingCartBar } from './modules/cart.js';
import { initPersonalize } from './modules/personalize.js';

// Note: script is loaded as a module (deferred by default), DOM is already parsed

// ===== CRITICAL PATH (above the fold) =====
initUI();            // Sets up scroll, dark mode, nav, parallax, all visual IIFEs
initHero();          // Hero slideshow + symphony gold lines + scramble reveal
initDynamicHeroText(); // Rotating taglines
initHeaderSlideshow(); // Header image rotation
initAuth();          // Restore user session, dropdown, referral field
loadCart();          // Restore cart from localStorage
restoreButtonStates(); // Show qty buttons for items already in cart
updateCartFab();     // Show cart FAB if cart has items
initCart();          // Cart modal, delegated click handlers

// Menu — highest priority Firestore call (what users come to see)
initMenuSync();      // Menu availability/price overlay, specials, hero slides, theme

// ===== DEFERRED INITIALIZATIONS (after first paint) =====
// Use requestIdleCallback where available, fall back to setTimeout
var deferInit = window.requestIdleCallback || function(cb) { setTimeout(cb, 100); };

deferInit(function() {
    initAddonCache();    // Pre-warm addon cache from Firestore
    initLoyalty();       // Loyalty widget
    initNotifications(); // Push notification banner
    initReservations();  // Reservation modal button override
    initFeatures();      // Reviews carousel, gallery, combos, happy hour, voice, i18n, etc.
    initPersonalize();   // Time greeting, reorder bar, meal-time menu highlights

    // Profile — dynamically imported (separate chunk)
    import('./modules/profile.js').then(function(m) { m.initProfile(); });

    // Badges — dynamically imported (separate chunk)
    import('./modules/badges.js');
});

// Safe dynamic import helper — logs failures gracefully without crashing the app
function safeImport(path, initFn) {
    return import(path).then(function(m) {
        if (initFn && typeof m[initFn] === 'function') m[initFn]();
    }).catch(function(err) {
        console.error('[Amogha] Module load failed: ' + path, err.message || err);
    });
}

// Lower-priority features deferred further + dynamically imported non-critical modules
setTimeout(function() {
    loadDailySpecial();
    initComboBuilder();
    initLiveOrderTicker();
    initOrderAgainSection();

    // Group ordering, chatbot, splitbill, subscriptions — separate chunks
    safeImport('./modules/group.js', 'initGroupOrdering');
    safeImport('./modules/chatbot.js', 'initChatbot');
    safeImport('./modules/splitbill.js');
    safeImport('./modules/subscriptions.js');

    // Enhancements — open/closed status, social proof, cookie consent, tilt, search suggestions
    safeImport('./modules/enhancements.js', 'initEnhancements');

    // Premium interactions — scroll reveals, ripple effects, accessibility
    safeImport('./modules/premium.js', 'initPremium');

    // ===== WORLD-CLASS FEATURES =====
    safeImport('./modules/challenges.js', 'initChallenges');
    safeImport('./modules/spinwheel.js', 'initSpinWheel');
    safeImport('./modules/secretmenu.js', 'initSecretMenu');
    safeImport('./modules/feedback.js', 'initFeedback');
    safeImport('./modules/socialshare.js', 'initSocialShare');
    safeImport('./modules/polls.js', 'initPolls');
    safeImport('./modules/milestones.js');
    safeImport('./modules/ordertracker.js', 'initOrderTracker');
}, 1500);

// Show reorder toast after short delay (needs DOM + auth to be ready)
setTimeout(function() {
    var user = null;
    try { user = JSON.parse(localStorage.getItem('amoghaUser')); } catch(e) {}
    if (user) showReorderToast();
}, 2500);

// Seasonal theme + weather (delayed to not block main rendering)
setTimeout(function() {
    safeImport('./modules/seasonal.js', 'initSeasonal');
    safeImport('./modules/weather.js', 'initWeather');
}, 3000);

// ===== WORLD-CLASS FEATURES (Phase 12) =====
setTimeout(function() {
    safeImport('./modules/stories.js', 'initStories');
    safeImport('./modules/moodorder.js', 'initMoodOrder');
    safeImport('./modules/livequeue.js', 'initLiveQueue');
    safeImport('./modules/streaks.js', 'initStreaks');
    safeImport('./modules/giftcards.js', 'initGiftCards');
    safeImport('./modules/referral.js', 'initReferral');
    safeImport('./modules/musicplayer.js', 'initMusicPlayer');
    safeImport('./modules/arpreview.js', 'initARPreview');
    safeImport('./modules/voiceorder.js', 'initVoiceOrder');
    safeImport('./modules/geofence.js', 'initGeofence');
}, 3500);

// ===== WORLD-CLASS FEATURES (Phase 13) =====
setTimeout(function() {
    safeImport('./modules/worldclass2.js', 'initWorldClass2');
}, 4000);

// AI For You recommendations (delayed to not block load)
setTimeout(initAiForYou, 4500);

// Init floating cart bar state
updateFloatingCartBar();

// Safety: clear stuck overflow from modals that didn't clean up
document.body.style.overflow = '';
document.body.classList.remove('modal-open');

// Expose displayCart at window level (features.js hooks into this to add showRecommendations)
window.displayCart = displayCart;

window.loadMenuRatings = loadMenuRatings;

// ===== GLOBAL ERROR BOUNDARY =====
// Catch unhandled errors to prevent silent failures
window.addEventListener('error', function(event) {
    console.error('[Amogha] Unhandled error:', event.message, 'at', event.filename, ':', event.lineno);
});
window.addEventListener('unhandledrejection', function(event) {
    console.error('[Amogha] Unhandled promise rejection:', event.reason);
});

// ===== PERFORMANCE MONITORING =====
// Mark key rendering milestones for Core Web Vitals diagnostics
if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark('amogha-app-init-complete');
}

// Report Core Web Vitals (LCP, FID, CLS) when available
if (typeof PerformanceObserver !== 'undefined') {
    try {
        // Largest Contentful Paint
        new PerformanceObserver(function(list) {
            var entries = list.getEntries();
            var last = entries[entries.length - 1];
            if (last) console.info('[Amogha] LCP:', Math.round(last.startTime) + 'ms');
        }).observe({ type: 'largest-contentful-paint', buffered: true });

        // Cumulative Layout Shift
        var clsValue = 0;
        new PerformanceObserver(function(list) {
            list.getEntries().forEach(function(entry) {
                if (!entry.hadRecentInput) clsValue += entry.value;
            });
        }).observe({ type: 'layout-shift', buffered: true });

        // Report CLS when page is hidden
        document.addEventListener('visibilitychange', function() {
            if (document.visibilityState === 'hidden' && clsValue > 0) {
                console.info('[Amogha] CLS:', clsValue.toFixed(4));
            }
        });
    } catch(e) { /* PerformanceObserver not supported for this entry type */ }
}

