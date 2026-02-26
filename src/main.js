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

// Named imports for initialization
import { loadCart, initAddonCache, restoreButtonStates, updateCartFab, initCart, displayCart } from './modules/cart.js';
import { initMenuSync, loadMenuRatings } from './modules/menu.js';
import { initHero, initDynamicHeroText, initHeaderSlideshow } from './modules/hero.js';
import { initUI } from './modules/ui.js';
import { initAuth } from './modules/auth.js';
import { initNotifications } from './modules/notifications.js';
import { initReservations } from './modules/reservations.js';
import { initLoyalty } from './modules/loyalty.js';
import { initFeatures, showRecommendations } from './modules/features.js';

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

// Expose displayCart and showRecommendations at window level (used by features.js hook)
window.displayCart = function() {
    // Import is hoisted — call through the module's export directly
    displayCart();
    showRecommendations();
};

window.loadMenuRatings = loadMenuRatings;
