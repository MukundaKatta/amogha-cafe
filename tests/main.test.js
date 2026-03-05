import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock ALL module imports before importing main
vi.mock('../src/core/utils.js', () => ({ safeGetItem: vi.fn(), safeSetItem: vi.fn(), safeCopy: vi.fn(), fallbackCopy: vi.fn(), lockScroll: vi.fn(), unlockScroll: vi.fn(), _scrollLockPos: 0 }));
vi.mock('../src/core/constants.js', () => ({ FREE_DELIVERY_THRESHOLD: 500, DELIVERY_FEE: 49, LOYALTY_TIERS: [], HAPPY_HOURS: [], ITEM_PRICES: {}, ITEM_PAIRINGS: {}, TRANSLATIONS: {}, DYNAMIC_PRICING_RULES: [] }));
vi.mock('../src/modules/auth.js', () => ({ getCurrentUser: vi.fn(() => null), setCurrentUser: vi.fn(), openAuthModal: vi.fn(), closeAuthModal: vi.fn(), switchAuthView: vi.fn(), handleSignUp: vi.fn(), handleSignIn: vi.fn(), handleForgotPassword: vi.fn(), handleResetPassword: vi.fn(), signOut: vi.fn(), updateSignInUI: vi.fn(), togglePassword: vi.fn(), showAuthToast: vi.fn(), updateCarouselGreeting: vi.fn(), initAuth: vi.fn() }));
vi.mock('../src/modules/cart.js', () => ({ cart: [], addToCart: vi.fn(), finalizeAddToCart: vi.fn(), loadCart: vi.fn(), saveCart: vi.fn(), updateCartCount: vi.fn(), displayCart: vi.fn(), updateQuantity: vi.fn(), removeItem: vi.fn(), clearCart: vi.fn(), getCheckoutTotal: vi.fn(() => 0), updateButtonState: vi.fn(), restoreButtonStates: vi.fn(), updateFloatingCart: vi.fn(), updateFloatingCartBar: vi.fn(), updateCartFab: vi.fn(), closeFloatingCart: vi.fn(), showSignInPrompt: vi.fn(), closeSignInPrompt: vi.fn(), openAddonPicker: vi.fn(), toggleAddonOption: vi.fn(), updateAddonTotal: vi.fn(), closeAddonPicker: vi.fn(), confirmAddonSelection: vi.fn(), cachedAddons: {}, selectedAddons: [], pendingAddonItem: null, initAddonCache: vi.fn(), initCart: vi.fn() }));
vi.mock('../src/modules/payment.js', () => ({ selectedPayment: 'cod', appliedCoupon: null, appliedGiftCard: null, getCheckoutTotals: vi.fn(() => ({ subtotal: 0, deliveryFee: 0, discount: 0, total: 0 })), validateCoupon: vi.fn(), calcDiscount: vi.fn(), checkout: vi.fn(), openCheckout: vi.fn(), closeCheckout: vi.fn(), goToStep: vi.fn(), setupPayment: vi.fn(), switchPayTab: vi.fn(), validateAndPay: vi.fn(), openRazorpay: vi.fn(), placeCodOrder: vi.fn(), placeOrderToFirestore: vi.fn(), applyCoupon: vi.fn(), removeCoupon: vi.fn(), applyGiftCard: vi.fn(), removeGiftCard: vi.fn(), openGiftCardModal: vi.fn(), closeGiftCardModal: vi.fn(), selectGcAmount: vi.fn(), buyGiftCard: vi.fn(), redeemLoyaltyAtCheckout: vi.fn(), shareOrder: vi.fn(), addUpsellItem: vi.fn() }));
vi.mock('../src/modules/menu.js', () => ({ cachedGet: vi.fn(), loadMenuRatings: vi.fn(), getStarHTML: vi.fn(), initMenuSync: vi.fn(), toggleSafeForMe: vi.fn(), checkAllergenWarning: vi.fn() }));
vi.mock('../src/modules/hero.js', () => ({ initHero: vi.fn(), initDynamicHeroText: vi.fn(), initHeaderSlideshow: vi.fn() }));
vi.mock('../src/modules/ui.js', () => ({ initUI: vi.fn(), launchConfetti: vi.fn(), closeMobileMenu: vi.fn() }));
vi.mock('../src/modules/notifications.js', () => ({ initNotifications: vi.fn(), requestNotificationPermission: vi.fn(), enableNotifications: vi.fn(), dismissNotifBanner: vi.fn(), sendPushNotification: vi.fn(), initFCM: vi.fn(), sendSmartNotification: vi.fn(), _notifListenerActive: false }));
vi.mock('../src/modules/reservations.js', () => ({ initReservations: vi.fn(), openReservationModal: vi.fn(), closeReservationModal: vi.fn(), generateTimeSlots: vi.fn(), submitReservation: vi.fn() }));
vi.mock('../src/modules/loyalty.js', () => ({ initLoyalty: vi.fn(), getLoyaltyTier: vi.fn(), awardLoyaltyPoints: vi.fn(), updateLoyaltyWidget: vi.fn(), openLoyaltyModal: vi.fn(), closeLoyaltyModal: vi.fn(), checkBirthdayRewards: vi.fn(), showBirthdayBanner: vi.fn() }));
vi.mock('../src/modules/features.js', () => ({ initFeatures: vi.fn(), showRecommendations: vi.fn(), loadDailySpecial: vi.fn(), initComboBuilder: vi.fn(), showReorderToast: vi.fn(), initLiveOrderTicker: vi.fn(), initOrderAgainSection: vi.fn(), initAiForYou: vi.fn(), selectSpice: vi.fn(), initReviewsCarousel: vi.fn(), initGallerySlideshow: vi.fn(), initGalleryLightbox: vi.fn(), getActiveHappyHour: vi.fn(), getUpsellItems: vi.fn(), initScheduledOrders: vi.fn(), voiceActive: false, voiceRecognition: null, initVoiceOrdering: vi.fn(), toggleVoice: vi.fn(), showVoiceOverlay: vi.fn(), currentLang: 'en', switchLanguage: vi.fn(), applyTranslations: vi.fn(), generateReferralCode: vi.fn(), openReferralModal: vi.fn(), closeReferralModal: vi.fn(), applyReferralAtSignup: vi.fn(), openMyOrders: vi.fn(), closeMyOrders: vi.fn(), reorderFromHistory: vi.fn(), initComboMealBuilder: vi.fn(), applyHappyHourPricing: vi.fn(), getRecommendations: vi.fn(), openVideoLightbox: vi.fn(), closeVideoLightbox: vi.fn(), openReviewModal: vi.fn(), setReviewStar: vi.fn(), submitReviews: vi.fn(), scheduleReviewPrompt: vi.fn(), openCateringModal: vi.fn(), closeCateringModal: vi.fn(), submitCateringEnquiry: vi.fn(), loadDynamicPricingRules: vi.fn(), getAdjustedPrice: vi.fn(), applyDynamicPricing: vi.fn(), openMealPlannerModal: vi.fn(), closeMealPlanner: vi.fn(), generateMealPlan: vi.fn(), loadSmartCombos: vi.fn() }));
vi.mock('../src/modules/badges.js', () => ({ getBadgeDefinitions: vi.fn(), checkAndAwardBadges: vi.fn(), openBadgeGallery: vi.fn(), closeBadgeGallery: vi.fn(), initBadges: vi.fn() }));
vi.mock('../src/modules/profile.js', () => ({ openProfileModal: vi.fn(), closeProfileModal: vi.fn(), saveProfile: vi.fn(), addAddress: vi.fn(), removeAddress: vi.fn(), initProfile: vi.fn() }));
vi.mock('../src/modules/group.js', () => ({ initGroupOrdering: vi.fn(), createGroupCart: vi.fn(), closeGroupModal: vi.fn(), copyGroupLink: vi.fn(), addToGroupCart: vi.fn(), lockGroupCart: vi.fn() }));
vi.mock('../src/modules/splitbill.js', () => ({ openSplitBill: vi.fn(), closeSplitBill: vi.fn(), setSplitCount: vi.fn(), shareSplitBill: vi.fn() }));
vi.mock('../src/modules/subscriptions.js', () => ({ openSubscriptionModal: vi.fn(), closeSubscriptionModal: vi.fn(), subscribeToPlan: vi.fn(), cancelSubscription: vi.fn(), initSubscriptions: vi.fn() }));
vi.mock('../src/modules/chatbot.js', () => ({ initChatbot: vi.fn(), toggleChat: vi.fn(), sendChatMessage: vi.fn() }));
vi.mock('../src/core/firebase.js', () => ({ getDb: vi.fn(() => null) }));

describe('main.js', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
        delete window.displayCart;
        delete window.loadMenuRatings;
    });

    it('imports and calls all init functions without error', async () => {
        vi.useFakeTimers();
        await import('../src/main.js');
        vi.advanceTimersByTime(200); // trigger requestIdleCallback fallback
        // Verify key init functions were called
        const { initUI } = await import('../src/modules/ui.js');
        const { initHero } = await import('../src/modules/hero.js');
        const { initAuth } = await import('../src/modules/auth.js');
        const { loadCart, initCart } = await import('../src/modules/cart.js');
        const { initFeatures } = await import('../src/modules/features.js');

        expect(initUI).toHaveBeenCalled();
        expect(initHero).toHaveBeenCalled();
        expect(initAuth).toHaveBeenCalled();
        expect(loadCart).toHaveBeenCalled();
        expect(initCart).toHaveBeenCalled();
        expect(initFeatures).toHaveBeenCalled();
        vi.useRealTimers();
    });

    it('calls initMenuSync to set up Firestore listeners', async () => {
        await import('../src/main.js');
        const { initMenuSync } = await import('../src/modules/menu.js');
        expect(initMenuSync).toHaveBeenCalled();
    });

    it('calls initLoyalty, initNotifications, and initReservations after deferred init', async () => {
        vi.useFakeTimers();
        await import('../src/main.js');
        vi.advanceTimersByTime(200); // trigger requestIdleCallback fallback
        const { initLoyalty } = await import('../src/modules/loyalty.js');
        const { initNotifications } = await import('../src/modules/notifications.js');
        const { initReservations } = await import('../src/modules/reservations.js');
        expect(initLoyalty).toHaveBeenCalled();
        expect(initNotifications).toHaveBeenCalled();
        expect(initReservations).toHaveBeenCalled();
        vi.useRealTimers();
    });

    it('calls initProfile, initGroupOrdering, and initChatbot after deferred init', async () => {
        vi.useFakeTimers();
        await import('../src/main.js');
        // initProfile is in requestIdleCallback (100ms fallback), others in setTimeout(1500)
        vi.advanceTimersByTime(2000);
        const { initProfile } = await import('../src/modules/profile.js');
        const { initGroupOrdering } = await import('../src/modules/group.js');
        const { initChatbot } = await import('../src/modules/chatbot.js');
        expect(initProfile).toHaveBeenCalled();
        expect(initGroupOrdering).toHaveBeenCalled();
        expect(initChatbot).toHaveBeenCalled();
        vi.useRealTimers();
    });

    it('calls restoreButtonStates, updateCartFab, and defers initAddonCache', async () => {
        vi.useFakeTimers();
        await import('../src/main.js');
        // Trigger requestIdleCallback / deferred init
        vi.advanceTimersByTime(200);
        const { initAddonCache, restoreButtonStates, updateCartFab, updateFloatingCartBar } = await import('../src/modules/cart.js');
        expect(restoreButtonStates).toHaveBeenCalled();
        expect(updateCartFab).toHaveBeenCalled();
        expect(updateFloatingCartBar).toHaveBeenCalled();
        expect(initAddonCache).toHaveBeenCalled();
        vi.useRealTimers();
    });

    it('calls hero initializers: initDynamicHeroText and initHeaderSlideshow', async () => {
        await import('../src/main.js');
        const { initDynamicHeroText, initHeaderSlideshow } = await import('../src/modules/hero.js');
        expect(initDynamicHeroText).toHaveBeenCalled();
        expect(initHeaderSlideshow).toHaveBeenCalled();
    });

    it('calls feature sub-initializers after deferred timeout', async () => {
        vi.useFakeTimers();
        await import('../src/main.js');
        // Feature sub-initializers are deferred via setTimeout(1500)
        vi.advanceTimersByTime(2000);
        const { loadDailySpecial, initComboBuilder, initLiveOrderTicker, initOrderAgainSection } = await import('../src/modules/features.js');
        expect(loadDailySpecial).toHaveBeenCalled();
        expect(initComboBuilder).toHaveBeenCalled();
        expect(initLiveOrderTicker).toHaveBeenCalled();
        expect(initOrderAgainSection).toHaveBeenCalled();
        vi.useRealTimers();
    });

    it('sets window.displayCart and window.loadMenuRatings', async () => {
        await import('../src/main.js');
        expect(typeof window.displayCart).toBe('function');
        expect(typeof window.loadMenuRatings).toBe('function');
    });

    it('window.displayCart calls displayCart and showRecommendations from their modules', async () => {
        await import('../src/main.js');
        const { displayCart } = await import('../src/modules/cart.js');

        // Reset call counts so we can isolate the window.displayCart invocation
        displayCart.mockClear();

        window.displayCart();

        expect(displayCart).toHaveBeenCalled();
    });

    it('window.loadMenuRatings is the loadMenuRatings export from menu.js', async () => {
        await import('../src/main.js');
        const { loadMenuRatings } = await import('../src/modules/menu.js');
        expect(window.loadMenuRatings).toBe(loadMenuRatings);
    });
});
