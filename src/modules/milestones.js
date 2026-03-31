import { getCurrentUser, setCurrentUser, showAuthToast } from './auth.js';
import { getDb } from '../core/firebase.js';

// ===== ACHIEVEMENT MILESTONES WITH CELEBRATIONS =====

var MILESTONES = [
    { id: 'first_order', title: 'First Bite', desc: 'Place your first order', icon: '🎉', orders: 1, reward: 25 },
    { id: 'orders_5', title: 'Regular', desc: 'Complete 5 orders', icon: '⭐', orders: 5, reward: 50 },
    { id: 'orders_10', title: 'Loyal Fan', desc: 'Complete 10 orders', icon: '🌟', orders: 10, reward: 100 },
    { id: 'orders_25', title: 'Super Foodie', desc: 'Complete 25 orders', icon: '🏅', orders: 25, reward: 200 },
    { id: 'orders_50', title: 'Legend', desc: 'Complete 50 orders', icon: '🏆', orders: 50, reward: 500 },
    { id: 'orders_100', title: 'Amogha VIP', desc: 'Complete 100 orders', icon: '💎', orders: 100, reward: 1000 },
    { id: 'spend_5k', title: 'Big Spender', desc: 'Total spend reaches ₹5,000', icon: '💰', spend: 5000, reward: 75 },
    { id: 'spend_25k', title: 'Premium Guest', desc: 'Total spend reaches ₹25,000', icon: '💳', spend: 25000, reward: 250 },
    { id: 'spend_100k', title: 'Platinum Patron', desc: 'Total spend reaches ₹1,00,000', icon: '👑', spend: 100000, reward: 1000 },
    { id: 'streak_7', title: 'Week Warrior', desc: '7-day ordering streak', icon: '🔥', streak: 7, reward: 100 },
    { id: 'streak_30', title: 'Monthly Maven', desc: '30-day ordering streak', icon: '🔥🔥', streak: 30, reward: 500 },
    { id: 'referrals_3', title: 'Social Butterfly', desc: 'Refer 3 friends', icon: '🦋', referrals: 3, reward: 150 }
];

export function checkMilestones(user, orderData) {
    if (!user) return;
    var earned = user.earnedMilestones || [];
    var newMilestones = [];
    var totalOrders = (user.totalOrders || 0) + 1;
    var totalSpend = (user.totalSpend || 0) + (orderData ? orderData.total || 0 : 0);
    var currentStreak = calculateStreak(user.orderDates || []);
    var referralCount = user.referralCount || 0;

    MILESTONES.forEach(function(ms) {
        if (earned.indexOf(ms.id) !== -1) return; // Already earned
        var qualified = false;
        if (ms.orders && totalOrders >= ms.orders) qualified = true;
        if (ms.spend && totalSpend >= ms.spend) qualified = true;
        if (ms.streak && currentStreak >= ms.streak) qualified = true;
        if (ms.referrals && referralCount >= ms.referrals) qualified = true;
        if (qualified) {
            earned.push(ms.id);
            newMilestones.push(ms);
        }
    });

    if (newMilestones.length > 0) {
        // Calculate total reward points upfront (before Firestore write)
        var totalReward = newMilestones.reduce(function(sum, ms) { return sum + ms.reward; }, 0);
        user.earnedMilestones = earned;
        user.totalOrders = totalOrders;
        user.totalSpend = totalSpend;
        user.loyaltyPoints = (user.loyaltyPoints || 0) + totalReward;
        setCurrentUser(user);

        // Show celebrations with delay between each (visual only, points already awarded)
        newMilestones.forEach(function(ms, idx) {
            setTimeout(function() {
                showMilestoneCelebration(ms);
            }, (idx + 1) * 3000);
        });

        // Persist to Firestore with correct loyaltyPoints (includes all rewards)
        var db = getDb();
        if (db && user.phone) {
            db.collection('users').doc(user.phone).update({
                earnedMilestones: earned,
                totalOrders: totalOrders,
                totalSpend: totalSpend,
                loyaltyPoints: user.loyaltyPoints
            }).catch(function(e) { console.error('Milestone save error:', e); });
        }
    } else {
        // Still update counts
        user.totalOrders = totalOrders;
        user.totalSpend = totalSpend;
        setCurrentUser(user);
    }
}

function calculateStreak(dates) {
    if (!dates || dates.length === 0) return 0;
    var sorted = dates.slice().sort().reverse();
    // Verify the most recent date is today or yesterday (streak must be active)
    var today = new Date();
    var mostRecent = new Date(sorted[0] + 'T12:00:00');
    var daysSinceLast = Math.round((today - mostRecent) / 86400000);
    if (daysSinceLast > 1) return 0; // Streak is broken

    var streak = 1;
    for (var i = 0; i < sorted.length - 1; i++) {
        var d1 = new Date(sorted[i] + 'T12:00:00');
        var d2 = new Date(sorted[i + 1] + 'T12:00:00');
        if (Math.round((d1 - d2) / 86400000) === 1) {
            streak++;
        } else {
            break;
        }
    }
    return streak;
}

function showMilestoneCelebration(milestone) {
    // Create full-screen celebration overlay
    var overlay = document.createElement('div');
    overlay.className = 'milestone-celebration';
    overlay.innerHTML =
        '<div class="milestone-card">' +
            '<div class="milestone-icon-large">' + milestone.icon + '</div>' +
            '<h2 class="milestone-title">Milestone Unlocked!</h2>' +
            '<h3 class="milestone-name">' + milestone.title + '</h3>' +
            '<p class="milestone-desc">' + milestone.desc + '</p>' +
            '<div class="milestone-reward">+' + milestone.reward + ' bonus points!</div>' +
            '<button class="milestone-dismiss" onclick="this.closest(\'.milestone-celebration\').remove()">Awesome!</button>' +
        '</div>';
    document.body.appendChild(overlay);
    setTimeout(function() { overlay.classList.add('show'); }, 50);
    if (typeof window.launchConfetti === 'function') window.launchConfetti();

    // Auto-dismiss after 8 seconds
    setTimeout(function() {
        if (overlay.parentNode) {
            overlay.classList.remove('show');
            setTimeout(function() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 500);
        }
    }, 8000);
}

export function openMilestonesModal() {
    var user = getCurrentUser();
    if (!user) {
        if (typeof window.openAuthModal === 'function') window.openAuthModal();
        return;
    }
    var modal = document.getElementById('milestones-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    renderMilestones();
}

export function closeMilestonesModal() {
    var modal = document.getElementById('milestones-modal');
    if (modal) modal.style.display = 'none';
}

function renderMilestones() {
    var container = document.getElementById('milestones-list');
    if (!container) return;
    var user = getCurrentUser();
    if (!user) return;
    var earned = user.earnedMilestones || [];
    var totalOrders = user.totalOrders || 0;
    var totalSpend = user.totalSpend || 0;

    container.innerHTML =
        '<div class="milestones-stats">' +
            '<div class="ms-stat"><span class="ms-stat-num">' + totalOrders + '</span><span class="ms-stat-label">Orders</span></div>' +
            '<div class="ms-stat"><span class="ms-stat-num">₹' + totalSpend.toLocaleString() + '</span><span class="ms-stat-label">Total Spent</span></div>' +
            '<div class="ms-stat"><span class="ms-stat-num">' + earned.length + '/' + MILESTONES.length + '</span><span class="ms-stat-label">Milestones</span></div>' +
        '</div>' +
        MILESTONES.map(function(ms) {
            var isEarned = earned.indexOf(ms.id) !== -1;
            var progress = getMilestoneProgress(ms, user);
            return '<div class="milestone-item ' + (isEarned ? 'earned' : '') + '">' +
                '<div class="milestone-item-icon">' + (isEarned ? ms.icon : '🔒') + '</div>' +
                '<div class="milestone-item-info">' +
                    '<div class="milestone-item-title">' + ms.title + '</div>' +
                    '<div class="milestone-item-desc">' + ms.desc + '</div>' +
                    (isEarned ? '<div class="milestone-item-earned">Earned! +' + ms.reward + ' pts</div>' :
                        '<div class="milestone-item-progress"><div class="milestone-progress-bar"><div class="milestone-progress-fill" style="width:' + progress + '%"></div></div><span>' + progress + '%</span></div>') +
                '</div>' +
            '</div>';
        }).join('');
}

function getMilestoneProgress(ms, user) {
    if (ms.orders) return Math.min(100, Math.round(((user.totalOrders || 0) / ms.orders) * 100));
    if (ms.spend) return Math.min(100, Math.round(((user.totalSpend || 0) / ms.spend) * 100));
    if (ms.streak) {
        var streak = calculateStreak(user.orderDates || []);
        return Math.min(100, Math.round((streak / ms.streak) * 100));
    }
    if (ms.referrals) return Math.min(100, Math.round(((user.referralCount || 0) / ms.referrals) * 100));
    return 0;
}

export function initMilestones() {}

Object.assign(window, { checkMilestones, openMilestonesModal, closeMilestonesModal });
