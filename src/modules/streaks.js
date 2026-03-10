// ===== DAILY STREAK REWARDS MODULE =====
// Consecutive visit/order streaks with escalating rewards
// Inspired by: Duolingo streaks, Starbucks bonus stars, Snapchat streaks

import { getDb } from '../core/firebase.js';

var STREAK_MILESTONES = [
    { days: 3, reward: 50, label: '3-Day Streak', emoji: '🔥', description: 'Order 3 days in a row' },
    { days: 7, reward: 150, label: 'Week Warrior', emoji: '⚡', description: '7 consecutive days' },
    { days: 14, reward: 350, label: 'Fortnight Foodie', emoji: '🌟', description: '14 days straight' },
    { days: 21, reward: 500, label: 'Dedication Master', emoji: '💎', description: '21-day streak' },
    { days: 30, reward: 1000, label: 'Monthly Legend', emoji: '👑', description: '30 consecutive days' },
    { days: 60, reward: 2500, label: 'Unstoppable', emoji: '🏆', description: '60-day streak' },
    { days: 100, reward: 5000, label: 'Century Champion', emoji: '💯', description: '100 consecutive days!' }
];

var DAILY_BONUS_BASE = 10; // base points per day of streak

function getStreakData() {
    try {
        return JSON.parse(localStorage.getItem('amogha_streak') || '{}');
    } catch(e) {
        return {};
    }
}

function saveStreakData(data) {
    localStorage.setItem('amogha_streak', JSON.stringify(data));
}

function todayStr() {
    return new Date().toISOString().split('T')[0];
}

function isToday(dateStr) {
    if (!dateStr) return false;
    return dateStr === todayStr();
}

function isYesterday(dateStr) {
    if (!dateStr) return false;
    var yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return dateStr === yesterday.toISOString().split('T')[0];
}

function getCurrentStreak() {
    var data = getStreakData();
    if (!data.lastOrderDate) return 0;

    if (isToday(data.lastOrderDate)) return data.currentStreak || 0;
    if (isYesterday(data.lastOrderDate)) return data.currentStreak || 0;

    // Streak broken
    return 0;
}

function getBestStreak() {
    var data = getStreakData();
    return data.bestStreak || 0;
}

function recordDailyOrder() {
    var data = getStreakData();
    var today = new Date().toISOString().split('T')[0];

    // Already recorded today
    if (data.lastOrderDate && isToday(data.lastOrderDate)) return data;

    if (data.lastOrderDate && isYesterday(data.lastOrderDate)) {
        // Continuing streak
        data.currentStreak = (data.currentStreak || 0) + 1;
    } else if (!data.lastOrderDate || !isToday(data.lastOrderDate)) {
        // Starting new streak
        data.currentStreak = 1;
    }

    data.lastOrderDate = today;
    data.bestStreak = Math.max(data.bestStreak || 0, data.currentStreak);
    data.totalDays = (data.totalDays || 0) + 1;

    // Check milestone rewards
    var milestoneReached = null;
    for (var i = STREAK_MILESTONES.length - 1; i >= 0; i--) {
        if (data.currentStreak === STREAK_MILESTONES[i].days) {
            milestoneReached = STREAK_MILESTONES[i];
            break;
        }
    }

    // Calculate daily bonus
    var dailyBonus = Math.min(DAILY_BONUS_BASE * data.currentStreak, 200);
    data.todayBonus = dailyBonus + (milestoneReached ? milestoneReached.reward : 0);

    saveStreakData(data);

    // Show celebration if milestone reached
    if (milestoneReached) {
        showStreakMilestone(milestoneReached, data.currentStreak);
    } else if (data.currentStreak > 1) {
        showStreakContinued(data.currentStreak, dailyBonus);
    }

    // Sync to Firestore
    syncStreak(data);

    return data;
}

function syncStreak(data) {
    var user = null;
    try { user = JSON.parse(localStorage.getItem('amoghaUser')); } catch(e) {}
    var db = getDb();
    if (!user || !db) return;

    db.collection('users').doc(user.phone || user.uid).update({
        streak: {
            current: data.currentStreak,
            best: data.bestStreak,
            lastOrder: data.lastOrderDate,
            totalDays: data.totalDays
        }
    }).catch(function() {});
}

function showStreakMilestone(milestone, days) {
    var overlay = document.createElement('div');
    overlay.className = 'streak-milestone-overlay';
    overlay.innerHTML =
        '<div class="streak-milestone-card">' +
            '<div class="streak-milestone-emoji">' + milestone.emoji + '</div>' +
            '<h2 class="streak-milestone-title">' + milestone.label + '!</h2>' +
            '<p class="streak-milestone-days">' + days + '-day streak</p>' +
            '<div class="streak-milestone-reward">+' + milestone.reward + ' bonus points!</div>' +
            '<div class="streak-fire-animation">' +
                '<span>🔥</span><span>🔥</span><span>🔥</span>' +
            '</div>' +
            '<button class="streak-milestone-btn">Awesome!</button>' +
        '</div>';

    document.body.appendChild(overlay);
    requestAnimationFrame(function() { overlay.classList.add('active'); });

    overlay.querySelector('.streak-milestone-btn').addEventListener('click', function() {
        overlay.classList.remove('active');
        setTimeout(function() { overlay.remove(); }, 300);
    });

    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            overlay.classList.remove('active');
            setTimeout(function() { overlay.remove(); }, 300);
        }
    });
}

function showStreakContinued(days, bonus) {
    if (typeof window.showToast === 'function') {
        window.showToast('🔥 ' + days + '-day streak! +' + bonus + ' bonus points');
    }
}

function renderStreakWidget() {
    var streak = getCurrentStreak();
    var best = getBestStreak();
    var data = getStreakData();

    var widget = document.getElementById('streakWidget');
    if (!widget) {
        widget = document.createElement('div');
        widget.id = 'streakWidget';
        widget.className = 'streak-widget';

        // Insert as a standalone section after the header, not inside nav
        var header = document.querySelector('header');
        if (header && header.nextSibling) {
            header.parentNode.insertBefore(widget, header.nextSibling);
        } else {
            var main = document.querySelector('main') || document.body;
            main.prepend(widget);
        }
    }

    // Next milestone
    var nextMilestone = null;
    for (var i = 0; i < STREAK_MILESTONES.length; i++) {
        if (streak < STREAK_MILESTONES[i].days) {
            nextMilestone = STREAK_MILESTONES[i];
            break;
        }
    }

    var isActive = streak > 0 && (isToday(data.lastOrderDate) || isYesterday(data.lastOrderDate));
    var streakClass = isActive ? 'active' : 'inactive';

    widget.innerHTML =
        '<div class="streak-card ' + streakClass + '">' +
            '<div class="streak-header">' +
                '<span class="streak-fire">' + (isActive ? '🔥' : '❄️') + '</span>' +
                '<h3 class="streak-title">' + (isActive ? 'Streak Active!' : 'Start a Streak!') + '</h3>' +
            '</div>' +
            '<div class="streak-number">' + streak + '</div>' +
            '<div class="streak-label">day' + (streak !== 1 ? 's' : '') + '</div>' +
            (best > streak ? '<div class="streak-best">Personal best: ' + best + ' days</div>' : '') +
            (nextMilestone ?
                '<div class="streak-next">' +
                    '<div class="streak-progress">' +
                        '<div class="streak-progress-fill" style="width:' + ((streak / nextMilestone.days) * 100) + '%"></div>' +
                    '</div>' +
                    '<span>Next: ' + nextMilestone.emoji + ' ' + nextMilestone.label + ' (' + (nextMilestone.days - streak) + ' more days)</span>' +
                '</div>'
            : '<div class="streak-max">🏆 Maximum streak achieved!</div>') +
            '<div class="streak-daily-bonus">Daily bonus: +' + Math.min(DAILY_BONUS_BASE * Math.max(streak, 1), 200) + ' pts</div>' +
            (!isActive && streak === 0 ?
                '<p class="streak-cta">Place an order today to start your streak!</p>' : '') +
        '</div>';
}

export function initStreaks() {
    var user = null;
    try { user = JSON.parse(localStorage.getItem('amoghaUser')); } catch(e) {}
    if (!user) return;

    renderStreakWidget();

    // Listen for order completion to record streak
    window.addEventListener('amogha-order-placed', function() {
        recordDailyOrder();
        renderStreakWidget();
    });

    // Also check on page load if today was already recorded
    var data = getStreakData();
    if (data.lastOrderDate && !isToday(data.lastOrderDate) && !isYesterday(data.lastOrderDate)) {
        // Streak broken — reset
        data.currentStreak = 0;
        saveStreakData(data);
    }
}

// Expose for external use
export { recordDailyOrder, getCurrentStreak };
