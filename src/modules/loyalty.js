import { LOYALTY_TIERS } from '../core/constants.js';
import { getCurrentUser, setCurrentUser, showAuthToast } from './auth.js';
import { getDb } from '../core/firebase.js';

// ===== LOYALTY & REWARDS PROGRAM =====

export function getLoyaltyTier(points) {
    for (var i = LOYALTY_TIERS.length - 1; i >= 0; i--) {
        if (points >= LOYALTY_TIERS[i].min) return LOYALTY_TIERS[i];
    }
    return LOYALTY_TIERS[0];
}

export function awardLoyaltyPoints(orderTotal) {
    var user = getCurrentUser();
    if (!user) return;
    var points = Math.floor(orderTotal / 10);
    // Streak bonus: check if ordered 3 consecutive days
    var today = new Date().toISOString().split('T')[0];
    var dates = user.orderDates || [];
    if (dates[dates.length - 1] !== today) {
        dates.push(today);
    }
    // Check for 3-day streak
    if (dates.length >= 3) {
        var last3 = dates.slice(-3);
        var d1 = new Date(last3[0]), d2 = new Date(last3[1]), d3 = new Date(last3[2]);
        var diff1 = (d2 - d1) / 86400000, diff2 = (d3 - d2) / 86400000;
        if (diff1 === 1 && diff2 === 1) {
            points = points * 2;
        }
    }
    // Keep only last 30 dates
    if (dates.length > 30) dates = dates.slice(-30);
    var newPoints = (user.loyaltyPoints || 0) + points;
    var oldTier = getLoyaltyTier(user.loyaltyPoints || 0);
    var newTier = getLoyaltyTier(newPoints);
    user.loyaltyPoints = newPoints;
    user.loyaltyTier = newTier.name;
    user.orderDates = dates;
    setCurrentUser(user);
    var db = getDb();
    if (db) {
        db.collection('users').doc(user.phone).update({
            loyaltyPoints: newPoints,
            loyaltyTier: newTier.name,
            orderDates: dates
        }).catch(function(e) { console.error('Loyalty tier update error:', e); });
    }
    // Show points earned toast
    var streakMsg = points > Math.floor(orderTotal / 10) ? ' (2x Streak Bonus!)' : '';
    showAuthToast('+' + points + ' loyalty points earned!' + streakMsg);
    // Tier up celebration
    if (newTier.name !== oldTier.name) {
        setTimeout(function() {
            showAuthToast('Congratulations! You are now ' + newTier.icon + ' ' + newTier.name + ' tier!');
            if (typeof launchConfetti === 'function') launchConfetti();
        }, 2000);
    }
    updateLoyaltyWidget();
}

export function updateLoyaltyWidget() {
    var widget = document.getElementById('loyalty-widget');
    if (!widget) return;
    var user = getCurrentUser();
    if (!user) {
        widget.style.display = 'none';
        return;
    }
    var points = user.loyaltyPoints || 0;
    var tier = getLoyaltyTier(points);
    widget.style.display = 'flex';
    widget.innerHTML = '<span class="loyalty-icon">' + tier.icon + '</span>' +
        '<span class="loyalty-pts">' + points + ' pts</span>';
    widget.title = tier.name + ' Tier | ' + points + ' Points | Redeem 100pts = Rs.10 off';
    widget.style.cursor = 'pointer';
    widget.onclick = function() { openLoyaltyModal(); };
}

export function openLoyaltyModal() {
    var user = getCurrentUser();
    if (!user) {
        if (typeof window.openAuthModal === 'function') window.openAuthModal();
        return;
    }
    var points = user.loyaltyPoints || 0;
    var tier = getLoyaltyTier(points);
    var nextTier = null;
    for (var i = 0; i < LOYALTY_TIERS.length; i++) {
        if (LOYALTY_TIERS[i].min > points) { nextTier = LOYALTY_TIERS[i]; break; }
    }
    var modal = document.getElementById('loyalty-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'loyalty-modal';
        modal.className = 'modal';
        modal.innerHTML = '<div class="modal-content loyalty-modal-content"></div>';
        document.body.appendChild(modal);
        modal.addEventListener('click', function(e) { if (e.target === modal) modal.style.display = 'none'; });
    }
    var progressPct = nextTier ? Math.min(100, ((points - tier.min) / (nextTier.min - tier.min)) * 100) : 100;
    var nextInfo = nextTier ? '<p class="loyalty-next">' + (nextTier.min - points) + ' points to ' + nextTier.icon + ' ' + nextTier.name + '</p>' : '<p class="loyalty-next">You have reached the highest tier!</p>';
    var redeemable = Math.floor(points / 100) * 10;
    modal.querySelector('.loyalty-modal-content').innerHTML =
        '<span class="close" onclick="document.getElementById(\'loyalty-modal\').style.display=\'none\'">&times;</span>' +
        '<div class="loyalty-header">' +
            '<div class="loyalty-tier-badge" style="background:' + tier.color + '">' + tier.icon + ' ' + tier.name + '</div>' +
            '<h2>' + points + ' Points</h2>' +
        '</div>' +
        '<div class="loyalty-progress-bar"><div class="loyalty-progress-fill" style="width:' + progressPct + '%;background:' + tier.color + '"></div></div>' +
        nextInfo +
        '<div class="loyalty-info">' +
            '<div class="loyalty-info-row"><span>Redeemable Value</span><span>Rs.' + redeemable + '</span></div>' +
            '<div class="loyalty-info-row"><span>Points per Rs.10 spent</span><span>1 point</span></div>' +
            '<div class="loyalty-info-row"><span>3-Day Streak Bonus</span><span>2x points</span></div>' +
        '</div>' +
        '<div class="loyalty-tiers-list">' +
            LOYALTY_TIERS.map(function(t) {
                var active = t.name === tier.name ? ' active' : '';
                return '<div class="loyalty-tier-item' + active + '"><span>' + t.icon + ' ' + t.name + '</span><span>' + t.min + '+ pts</span></div>';
            }).join('') +
        '</div>';
    modal.style.display = 'block';
}

export function closeLoyaltyModal() {
    var modal = document.getElementById('loyalty-modal');
    if (modal) modal.style.display = 'none';
}

export function initLoyalty() {
    // Initialize loyalty widget on load
    setTimeout(updateLoyaltyWidget, 500);
}

Object.assign(window, { openLoyaltyModal, closeLoyaltyModal, updateLoyaltyWidget, awardLoyaltyPoints, getLoyaltyTier });
