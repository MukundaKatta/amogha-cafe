import { getCurrentUser, setCurrentUser, showAuthToast } from './auth.js';
import { getDb } from '../core/firebase.js';

// ===== GAMIFICATION / BADGE SYSTEM =====

var BADGE_DEFINITIONS = [
    { id: 'first_bite', name: 'First Bite', description: 'Place your first order', icon: '🍽️' },
    { id: 'regular', name: 'Regular', description: '5 orders completed', icon: '⭐' },
    { id: 'foodie', name: 'Foodie', description: '10 orders completed', icon: '🏅' },
    { id: 'super_fan', name: 'Super Fan', description: '25 orders completed', icon: '🏆' },
    { id: 'explorer', name: 'Explorer', description: 'Order from all menu categories', icon: '🗺️' },
    { id: 'streak_master', name: 'Streak Master', description: '3 consecutive days with orders', icon: '🔥' },
    { id: 'big_spender', name: 'Big Spender', description: 'Single order over ₹1000', icon: '💎' },
    { id: 'critic', name: 'Critic', description: 'Write 5 reviews', icon: '📝' },
    { id: 'night_owl', name: 'Night Owl', description: 'Order after 9 PM', icon: '🦉' },
    { id: 'early_bird', name: 'Early Bird', description: 'Order before 10 AM', icon: '🐦' }
];

var MENU_CATEGORIES = ['starters', 'curries', 'biryani', 'tandoor', 'noodles', 'rice', 'breads', 'beverages'];

export function getBadgeDefinitions() {
    return BADGE_DEFINITIONS.slice();
}

function hasBadge(user, badgeId) {
    var badges = user.badges || [];
    for (var i = 0; i < badges.length; i++) {
        if (badges[i].badgeId === badgeId) return true;
    }
    return false;
}

function awardBadge(user, badgeId) {
    if (!user.badges) user.badges = [];
    user.badges.push({ badgeId: badgeId, earnedAt: new Date().toISOString() });
    setCurrentUser(user);

    // Persist to Firestore
    var db = getDb();
    if (db && user.phone) {
        db.collection('users').doc(user.phone).update({
            badges: user.badges
        }).catch(function(e) { console.error('Badge save error:', e); });
    }

    // Show toast
    var badge = null;
    for (var i = 0; i < BADGE_DEFINITIONS.length; i++) {
        if (BADGE_DEFINITIONS[i].id === badgeId) { badge = BADGE_DEFINITIONS[i]; break; }
    }
    if (badge) {
        showBadgeToast(badge);
    }
}

function showBadgeToast(badge) {
    var toast = document.getElementById('badge-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'badge-toast';
        toast.className = 'badge-toast';
        document.body.appendChild(toast);
    }
    toast.innerHTML = '<span style="font-size:1.4rem">' + badge.icon + '</span> Badge Unlocked: ' + badge.name + '!';
    toast.classList.remove('visible');
    void toast.offsetWidth;
    toast.classList.add('visible');
    setTimeout(function() { toast.classList.remove('visible'); }, 4000);
}

export function checkAndAwardBadges(user, order) {
    if (!user) return;
    var newBadges = [];

    // Count total orders (from orderDates or a counter)
    var orderCount = (user.orderDates || []).length;
    // If orderDates doesn't have today yet, count +1 for this order
    var today = new Date().toISOString().split('T')[0];
    var dates = user.orderDates || [];
    if (dates.indexOf(today) === -1) orderCount++;

    // 1. First Bite - first order
    if (!hasBadge(user, 'first_bite') && orderCount >= 1) {
        newBadges.push('first_bite');
    }

    // 2. Regular - 5 orders
    if (!hasBadge(user, 'regular') && orderCount >= 5) {
        newBadges.push('regular');
    }

    // 3. Foodie - 10 orders
    if (!hasBadge(user, 'foodie') && orderCount >= 10) {
        newBadges.push('foodie');
    }

    // 4. Super Fan - 25 orders
    if (!hasBadge(user, 'super_fan') && orderCount >= 25) {
        newBadges.push('super_fan');
    }

    // 5. Explorer - ordered from all menu categories
    if (!hasBadge(user, 'explorer')) {
        var categories = user.categoriesOrdered || [];
        if (order && order.items) {
            order.items.forEach(function(item) {
                if (item.category && categories.indexOf(item.category) === -1) {
                    categories.push(item.category);
                }
            });
            user.categoriesOrdered = categories;
        }
        if (categories.length >= MENU_CATEGORIES.length) {
            newBadges.push('explorer');
        }
    }

    // 6. Streak Master - 3 consecutive days
    if (!hasBadge(user, 'streak_master')) {
        var allDates = (user.orderDates || []).slice();
        if (allDates.indexOf(today) === -1) allDates.push(today);
        if (allDates.length >= 3) {
            var last3 = allDates.slice(-3);
            var d1 = new Date(last3[0]);
            var d2 = new Date(last3[1]);
            var d3 = new Date(last3[2]);
            var diff1 = (d2 - d1) / 86400000;
            var diff2 = (d3 - d2) / 86400000;
            if (diff1 === 1 && diff2 === 1) {
                newBadges.push('streak_master');
            }
        }
    }

    // 7. Big Spender - single order over 1000
    if (!hasBadge(user, 'big_spender') && order && order.total > 1000) {
        newBadges.push('big_spender');
    }

    // 8. Critic - write 5 reviews
    if (!hasBadge(user, 'critic') && (user.reviewCount || 0) >= 5) {
        newBadges.push('critic');
    }

    // 9. Night Owl - order after 9 PM
    if (!hasBadge(user, 'night_owl')) {
        var hour = new Date().getHours();
        if (hour >= 21) {
            newBadges.push('night_owl');
        }
    }

    // 10. Early Bird - order before 10 AM
    if (!hasBadge(user, 'early_bird')) {
        var earlyHour = new Date().getHours();
        if (earlyHour < 10) {
            newBadges.push('early_bird');
        }
    }

    // Award all new badges with staggered toasts
    var delay = 0;
    newBadges.forEach(function(badgeId) {
        setTimeout(function() {
            awardBadge(user, badgeId);
        }, delay);
        delay += 1500;
    });
}

export function openBadgeGallery() {
    var user = getCurrentUser();
    var userBadges = (user && user.badges) ? user.badges : [];

    var modal = document.getElementById('badge-gallery-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'badge-gallery-modal';
        modal.className = 'badge-gallery-modal';
        modal.innerHTML = '<div class="badge-gallery-content"></div>';
        document.body.appendChild(modal);
        modal.addEventListener('click', function(e) {
            if (e.target === modal) closeBadgeGallery();
        });
    }

    var earnedCount = userBadges.length;
    var totalCount = BADGE_DEFINITIONS.length;

    var cardsHtml = '';
    BADGE_DEFINITIONS.forEach(function(badge) {
        var earned = false;
        var earnedAt = '';
        for (var i = 0; i < userBadges.length; i++) {
            if (userBadges[i].badgeId === badge.id) {
                earned = true;
                var d = new Date(userBadges[i].earnedAt);
                earnedAt = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                break;
            }
        }
        var stateClass = earned ? 'earned' : 'unearned';
        cardsHtml += '<div class="badge-card ' + stateClass + '">' +
            '<span class="badge-card-icon">' + badge.icon + '</span>' +
            '<div class="badge-card-name">' + badge.name + '</div>' +
            '<div class="badge-card-desc">' + badge.description + '</div>' +
            (earned ? '<div class="badge-card-date">' + earnedAt + '</div>' : '') +
        '</div>';
    });

    modal.querySelector('.badge-gallery-content').innerHTML =
        '<button class="badge-gallery-close" onclick="closeBadgeGallery()">&times;</button>' +
        '<div class="badge-gallery-title">Your Badges</div>' +
        '<div class="badge-gallery-subtitle">' + earnedCount + ' of ' + totalCount + ' badges earned</div>' +
        '<div class="badge-grid">' + cardsHtml + '</div>';

    modal.classList.add('show');
}

export function closeBadgeGallery() {
    var modal = document.getElementById('badge-gallery-modal');
    if (modal) modal.classList.remove('show');
}

export function initBadges() {
    // No initialization needed; badges are checked after each order
}

Object.assign(window, {
    checkAndAwardBadges: checkAndAwardBadges,
    openBadgeGallery: openBadgeGallery,
    closeBadgeGallery: closeBadgeGallery,
    getBadgeDefinitions: getBadgeDefinitions
});
