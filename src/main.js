// ===== AMOGHA CAFE — ES6 MODULE ENTRY POINT =====
// Core utilities and constants (side-effect free imports, but trigger window exports)
import './core/utils.js';
import './core/constants.js';

// Modules — import for window exports side effects
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
import './modules/badges.js';
import './modules/profile.js';
import './modules/group.js';
import './modules/splitbill.js';
import './modules/subscriptions.js';
import './modules/chatbot.js';

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
import { initProfile } from './modules/profile.js';
import { initGroupOrdering } from './modules/group.js';
import { updateFloatingCartBar } from './modules/cart.js';
import { initChatbot } from './modules/chatbot.js';

// Note: script is loaded as a module (deferred by default), DOM is already parsed

// Core initializations (order matters)
initUI();            // Sets up scroll, dark mode, nav, parallax, all visual IIFEs
initHero();          // Hero slideshow + symphony gold lines + scramble reveal
initDynamicHeroText(); // Rotating taglines
initHeaderSlideshow(); // Header image rotation
initAuth();          // Restore user session, dropdown, referral field
loadCart();          // Restore cart from localStorage
initAddonCache();    // Pre-warm addon cache from Firestore
restoreButtonStates(); // Show qty buttons for items already in cart
updateCartFab();     // Show cart FAB if cart has items
initCart();          // Cart modal, delegated click handlers

// Firestore-dependent initializations
initMenuSync();      // Menu availability/price overlay, specials, hero slides, theme

// Feature modules
initLoyalty();       // Loyalty widget
initNotifications(); // Push notification banner
initReservations();  // Reservation modal button override
initFeatures();      // Reviews carousel, gallery, combos, happy hour, voice, i18n, etc.
initProfile();       // Customer profile module
loadDailySpecial();  // Daily special section (reads from Firestore settings/dailySpecial)
initComboBuilder();  // Combo builder dropdowns + pricing
initLiveOrderTicker(); // Replace static ticker with real recent orders from Firestore

// Show reorder toast after short delay (needs DOM + auth to be ready)
setTimeout(function() {
    var user = null;
    try { user = JSON.parse(localStorage.getItem('amoghaUser')); } catch(e) {}
    if (user) showReorderToast();
}, 2000);

// Order Again section (shows last 3 orders on main page)
initOrderAgainSection();

// Group ordering (check URL for ?group= parameter)
initGroupOrdering();

// AI Chatbot widget
initChatbot();

// AI For You recommendations (delayed to not block load)
setTimeout(initAiForYou, 3000);

// Init floating cart bar state
updateFloatingCartBar();

// Expose displayCart and showRecommendations at window level (used by features.js hook)
window.displayCart = function() {
    // Import is hoisted — call through the module's export directly
    displayCart();
    showRecommendations();
};

window.loadMenuRatings = loadMenuRatings;
