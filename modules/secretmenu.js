import { getCurrentUser, showAuthToast } from './auth.js';
import { getLoyaltyTier } from './loyalty.js';

// ===== SECRET / HIDDEN MENU (Starbucks-style) =====

var SECRET_ITEMS = [
    { name: 'Golden Masala Latte', desc: 'Turmeric-infused latte with cardamom and honey', price: 199, tier: 'Silver', icon: '✨', category: 'Beverages' },
    { name: 'Chef\'s Secret Thali', desc: 'Off-menu thali with seasonal specials only the chef knows', price: 449, tier: 'Gold', icon: '👨‍🍳', category: 'Main Course' },
    { name: 'Midnight Chocolate Kulfi', desc: 'Dark chocolate kulfi with rose petal crumble', price: 179, tier: 'Silver', icon: '🍫', category: 'Desserts' },
    { name: 'Phoenix Fire Curry', desc: 'Ultra-spicy curry challenge — not for the faint-hearted', price: 349, tier: 'Gold', icon: '🔥', category: 'Main Course' },
    { name: 'Diamond Biryani', desc: 'Saffron-infused biryani with edible silver leaf', price: 599, tier: 'Diamond', icon: '💎', category: 'Main Course' },
    { name: 'Founder\'s Special Chai', desc: 'The original chai recipe from Amogha\'s founding day', price: 99, tier: 'Bronze', icon: '🏆', category: 'Beverages' },
    { name: 'Mystery Dessert Box', desc: 'A surprise dessert selection — different every time', price: 249, tier: 'Platinum', icon: '🎁', category: 'Desserts' },
    { name: 'Monsoon Magic Soup', desc: 'Seasonal soup available only during rainy weather', price: 149, tier: 'Silver', icon: '🌧️', category: 'Starters' }
];

var TIER_ORDER = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];

function canAccessItem(userTier, itemTier) {
    return TIER_ORDER.indexOf(userTier) >= TIER_ORDER.indexOf(itemTier);
}

export function openSecretMenu() {
    var user = getCurrentUser();
    if (!user) {
        if (typeof window.openAuthModal === 'function') window.openAuthModal();
        return;
    }
    var points = user.loyaltyPoints || 0;
    var tier = getLoyaltyTier(points);
    var modal = document.getElementById('secret-menu-modal');
    if (!modal) return;
    modal.style.display = 'flex';

    var content = modal.querySelector('.secret-menu-content');
    if (!content) return;

    content.innerHTML =
        '<button class="secret-menu-close" onclick="closeSecretMenu()" aria-label="Close secret menu">&times;</button>' +
        '<div class="secret-menu-header">' +
            '<h3 class="secret-menu-title">Secret Menu</h3>' +
            '<p class="secret-menu-subtitle">Exclusive items unlocked by your loyalty tier</p>' +
            '<div class="secret-menu-tier">Your tier: ' + tier.icon + ' ' + tier.name + '</div>' +
        '</div>' +
        '<div class="secret-menu-items">' +
        SECRET_ITEMS.map(function(item) {
            var unlocked = canAccessItem(tier.name, item.tier);
            return '<div class="secret-item ' + (unlocked ? 'unlocked' : 'locked') + '">' +
                '<div class="secret-item-icon">' + item.icon + '</div>' +
                '<div class="secret-item-info">' +
                    '<div class="secret-item-name">' + (unlocked ? item.name : '???') + '</div>' +
                    '<div class="secret-item-desc">' + (unlocked ? item.desc : 'Unlock at ' + item.tier + ' tier') + '</div>' +
                    (unlocked ? '<div class="secret-item-price">₹' + item.price + '</div>' : '') +
                '</div>' +
                '<div class="secret-item-action">' +
                    (unlocked ?
                        '<button class="secret-item-add" onclick="addSecretItemToCart(\'' + item.name.replace(/'/g, "\\'") + '\',' + item.price + ')">Add to Cart</button>' :
                        '<span class="secret-item-lock">🔒 ' + item.tier + '</span>') +
                '</div>' +
            '</div>';
        }).join('') +
        '</div>' +
        '<div class="secret-menu-footer">' +
            '<p>Unlock more items by reaching higher loyalty tiers!</p>' +
        '</div>';
}

export function closeSecretMenu() {
    var modal = document.getElementById('secret-menu-modal');
    if (modal) modal.style.display = 'none';
}

export function addSecretItemToCart(name, price) {
    // Use existing addToCart if available
    if (typeof window.addToCart === 'function') {
        window.addToCart(name, price, 'Secret Menu');
        showAuthToast('Added ' + name + ' to cart!');
        closeSecretMenu();
    }
}

export function initSecretMenu() {
    // Secret menu is triggered from the menu section or a hidden easter egg
}

Object.assign(window, { openSecretMenu, closeSecretMenu, addSecretItemToCart });
