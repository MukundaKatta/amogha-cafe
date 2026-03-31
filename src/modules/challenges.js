import { getCurrentUser, setCurrentUser, showAuthToast } from './auth.js';
import { getDb } from '../core/firebase.js';
import { safeGetItem, safeSetItem } from '../core/utils.js';

// ===== CHALLENGES & WEEKLY GOALS (Starbucks-style) =====

var CHALLENGE_TEMPLATES = [
    { id: 'explorer', title: 'Menu Explorer', desc: 'Try 3 different categories this week', icon: '🗺️', target: 3, type: 'categories', reward: 50, duration: 'weekly' },
    { id: 'earlybird', title: 'Early Bird', desc: 'Place 2 orders before noon', icon: '🌅', target: 2, type: 'morning_orders', reward: 30, duration: 'weekly' },
    { id: 'streak3', title: '3-Day Streak', desc: 'Order 3 days in a row', icon: '🔥', target: 3, type: 'streak', reward: 75, duration: 'weekly' },
    { id: 'bigspender', title: 'Feast Mode', desc: 'Spend ₹1500 total this week', icon: '💰', target: 1500, type: 'spend', reward: 100, duration: 'weekly' },
    { id: 'social', title: 'Share the Love', desc: 'Share your order on social media', icon: '💕', target: 1, type: 'share', reward: 25, duration: 'weekly' },
    { id: 'reviewer', title: 'Food Critic', desc: 'Leave 2 reviews this week', icon: '⭐', target: 2, type: 'reviews', reward: 40, duration: 'weekly' },
    { id: 'combo', title: 'Combo Master', desc: 'Order 2 combos this week', icon: '🍱', target: 2, type: 'combos', reward: 60, duration: 'weekly' },
    { id: 'tryall', title: 'Taste Everything', desc: 'Try 5 unique items this month', icon: '🍽️', target: 5, type: 'unique_items', reward: 150, duration: 'monthly' }
];

export function getActiveChallenges() {
    var user = getCurrentUser();
    if (!user) return [];
    var saved = user.activeChallenges || [];
    // Refresh weekly challenges on Monday
    var now = new Date();
    var weekKey = now.getFullYear() + '-W' + getWeekNumber(now);
    if (user.lastChallengeWeek !== weekKey) {
        // Preserve unclaimed monthly challenges; refresh only weekly ones
        var existingMonthly = saved.filter(function(ch) {
            var tpl = CHALLENGE_TEMPLATES.find(function(t) { return t.id === ch.id; });
            return tpl && tpl.duration === 'monthly' && !ch.claimed;
        });
        var weekly = CHALLENGE_TEMPLATES.filter(function(c) { return c.duration === 'weekly'; });
        shuffle(weekly);
        var newWeekly = weekly.slice(0, 3).map(function(c) {
            return { id: c.id, progress: 0, completed: false, claimed: false };
        });
        // Keep existing monthly if still active, otherwise assign a new one
        if (existingMonthly.length === 0) {
            var monthly = CHALLENGE_TEMPLATES.filter(function(c) { return c.duration === 'monthly'; });
            existingMonthly = monthly.slice(0, 1).map(function(c) {
                return { id: c.id, progress: 0, completed: false, claimed: false };
            });
        }
        saved = newWeekly.concat(existingMonthly);
        user.activeChallenges = saved;
        user.lastChallengeWeek = weekKey;
        setCurrentUser(user);
    }
    return saved;
}

function getWeekNumber(d) {
    var oneJan = new Date(d.getFullYear(), 0, 1);
    return Math.ceil(((d - oneJan) / 86400000 + oneJan.getDay() + 1) / 7);
}

function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = arr[i]; arr[i] = arr[j]; arr[j] = temp;
    }
}

export function updateChallengeProgress(type, value) {
    var user = getCurrentUser();
    if (!user || !user.activeChallenges) return;
    var changed = false;
    user.activeChallenges.forEach(function(ch) {
        if (ch.completed) return;
        var template = CHALLENGE_TEMPLATES.find(function(t) { return t.id === ch.id; });
        if (!template) return;
        if (template.type !== type) return;
        ch.progress = Math.min((ch.progress || 0) + (value || 1), template.target);
        if (ch.progress >= template.target) {
            ch.completed = true;
            changed = true;
            showAuthToast('Challenge complete: ' + template.title + '! Claim your ' + template.reward + ' points!');
        }
    });
    // Save progress even if no challenge completed (incremental progress)
    if (changed || user.activeChallenges.some(function(ch) { return ch.progress > 0; })) {
        setCurrentUser(user);
        updateChallengesUI();
    }
}

export function claimChallengeReward(challengeId) {
    var user = getCurrentUser();
    if (!user || !user.activeChallenges) return;
    var ch = user.activeChallenges.find(function(c) { return c.id === challengeId; });
    if (!ch || !ch.completed || ch.claimed) return;
    var template = CHALLENGE_TEMPLATES.find(function(t) { return t.id === challengeId; });
    if (!template) return;
    ch.claimed = true;
    user.loyaltyPoints = (user.loyaltyPoints || 0) + template.reward;
    setCurrentUser(user);
    showAuthToast('+' + template.reward + ' bonus points from ' + template.title + '!');
    if (typeof window.launchConfetti === 'function') window.launchConfetti();
    if (typeof window.updateLoyaltyWidget === 'function') window.updateLoyaltyWidget();
    updateChallengesUI();
    // Persist to Firestore
    var db = getDb();
    if (db && user.phone) {
        db.collection('users').doc(user.phone).update({
            activeChallenges: user.activeChallenges,
            loyaltyPoints: user.loyaltyPoints
        }).catch(function(e) { console.error('Challenge claim error:', e); });
    }
}

export function openChallengesModal() {
    var user = getCurrentUser();
    if (!user) {
        if (typeof window.openAuthModal === 'function') window.openAuthModal();
        return;
    }
    getActiveChallenges(); // Ensure challenges are loaded
    var modal = document.getElementById('challenges-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    updateChallengesUI();
}

export function closeChallengesModal() {
    var modal = document.getElementById('challenges-modal');
    if (modal) modal.style.display = 'none';
}

function updateChallengesUI() {
    var container = document.getElementById('challenges-list');
    if (!container) return;
    var user = getCurrentUser();
    if (!user || !user.activeChallenges) return;
    var completedCount = user.activeChallenges.filter(function(c) { return c.completed; }).length;
    var totalCount = user.activeChallenges.length;

    container.innerHTML = '<div class="challenges-header-info">' +
        '<span class="challenges-completed">' + completedCount + '/' + totalCount + ' completed</span>' +
        '</div>' +
        user.activeChallenges.map(function(ch) {
            var template = CHALLENGE_TEMPLATES.find(function(t) { return t.id === ch.id; });
            if (!template) return '';
            var pct = Math.min(100, Math.round((ch.progress / template.target) * 100));
            var statusClass = ch.claimed ? 'claimed' : ch.completed ? 'completed' : 'active';
            return '<div class="challenge-card ' + statusClass + '">' +
                '<div class="challenge-icon">' + template.icon + '</div>' +
                '<div class="challenge-info">' +
                    '<div class="challenge-title">' + template.title + '</div>' +
                    '<div class="challenge-desc">' + template.desc + '</div>' +
                    '<div class="challenge-progress-bar"><div class="challenge-progress-fill" style="width:' + pct + '%"></div></div>' +
                    '<div class="challenge-progress-text">' + ch.progress + '/' + template.target +
                        (ch.claimed ? ' — Claimed!' : ch.completed ? '' : '') + '</div>' +
                '</div>' +
                '<div class="challenge-reward">' +
                    (ch.claimed ? '<span class="challenge-claimed-badge">Claimed</span>' :
                     ch.completed ? '<button class="challenge-claim-btn" data-challenge-id="' + (ch.id || '').replace(/[^a-zA-Z0-9_-]/g, '') + '">Claim +' + template.reward + 'pts</button>' :
                     '<span class="challenge-reward-badge">+' + template.reward + '</span>') +
                '</div>' +
            '</div>';
        }).join('');
    // Bind claim buttons via event delegation (avoids inline onclick XSS risk)
    container.querySelectorAll('.challenge-claim-btn[data-challenge-id]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            claimChallengeReward(btn.getAttribute('data-challenge-id'));
        });
    });
}

export function initChallenges() {
    var user = getCurrentUser();
    if (user) getActiveChallenges();
}

Object.assign(window, { openChallengesModal, closeChallengesModal, claimChallengeReward, updateChallengeProgress, initChallenges });
