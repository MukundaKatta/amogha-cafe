import { getCurrentUser, setCurrentUser, showAuthToast } from './auth.js';
import { getDb } from '../core/firebase.js';

// ===== DIGITAL TIPPING & QUICK EMOJI FEEDBACK =====

var TIP_PRESETS = [
    { percent: 0, label: 'No Tip' },
    { percent: 5, label: '5%' },
    { percent: 10, label: '10%' },
    { percent: 15, label: '15%' },
    { percent: 20, label: '20%' }
];

var FEEDBACK_EMOJIS = [
    { emoji: '😍', label: 'Loved it', value: 5 },
    { emoji: '😊', label: 'Great', value: 4 },
    { emoji: '😐', label: 'Okay', value: 3 },
    { emoji: '😕', label: 'Not great', value: 2 },
    { emoji: '😞', label: 'Poor', value: 1 }
];

export function showPostOrderFeedback(orderId, orderTotal) {
    var overlay = document.getElementById('feedback-overlay');
    if (!overlay) return;

    var content = overlay.querySelector('.feedback-content');
    if (!content) return;

    content.innerHTML =
        '<button class="feedback-close" onclick="closeFeedback()" aria-label="Close">&times;</button>' +
        '<div class="feedback-header">' +
            '<h3>How was your experience?</h3>' +
            '<p class="feedback-subtitle">Your feedback helps us improve!</p>' +
        '</div>' +
        '<div class="feedback-emojis" id="feedback-emojis">' +
        FEEDBACK_EMOJIS.map(function(fb) {
            return '<button class="feedback-emoji-btn" data-value="' + fb.value + '" onclick="selectFeedbackEmoji(this,' + fb.value + ')" aria-label="' + fb.label + '">' +
                '<span class="feedback-emoji">' + fb.emoji + '</span>' +
                '<span class="feedback-emoji-label">' + fb.label + '</span>' +
            '</button>';
        }).join('') +
        '</div>' +
        '<div class="feedback-comment">' +
            '<textarea id="feedback-text" placeholder="Any comments? (optional)" maxlength="300" rows="2"></textarea>' +
        '</div>' +
        '<div class="feedback-tip-section">' +
            '<h4>Leave a tip for the team</h4>' +
            '<div class="tip-options" id="tip-options">' +
            TIP_PRESETS.map(function(tip) {
                var amount = tip.percent > 0 ? '₹' + Math.round(orderTotal * tip.percent / 100) : '';
                return '<button class="tip-btn' + (tip.percent === 0 ? ' selected' : '') + '" data-percent="' + tip.percent + '" onclick="selectTip(this,' + tip.percent + ',' + orderTotal + ')">' +
                    '<span class="tip-percent">' + tip.label + '</span>' +
                    (amount ? '<span class="tip-amount">' + amount + '</span>' : '') +
                '</button>';
            }).join('') +
            '</div>' +
            '<div class="tip-custom">' +
                '<input type="number" id="custom-tip" placeholder="Custom ₹" min="0" max="1000" class="tip-custom-input">' +
            '</div>' +
        '</div>' +
        '<button class="feedback-submit-btn" id="feedback-submit-btn" data-order-id="' + (orderId || '').replace(/[^a-zA-Z0-9_-]/g, '') + '" data-order-total="' + (parseInt(orderTotal, 10) || 0) + '">Submit Feedback</button>';
    // Bind submit via event listener (avoids inline onclick XSS risk)
    var submitBtn = document.getElementById('feedback-submit-btn');
    if (submitBtn) {
        submitBtn.addEventListener('click', function() {
            submitFeedback(submitBtn.getAttribute('data-order-id'), parseFloat(submitBtn.getAttribute('data-order-total')) || 0);
        });
    }

    overlay.style.display = 'flex';
}

export function selectFeedbackEmoji(btn, value) {
    document.querySelectorAll('.feedback-emoji-btn').forEach(function(b) {
        b.classList.remove('selected');
    });
    btn.classList.add('selected');
}

export function selectTip(btn, percent, orderTotal) {
    document.querySelectorAll('.tip-btn').forEach(function(b) {
        b.classList.remove('selected');
    });
    btn.classList.add('selected');
    var customInput = document.getElementById('custom-tip');
    if (customInput) customInput.value = '';
}

export function submitFeedback(orderId, orderTotal) {
    var selectedEmoji = document.querySelector('.feedback-emoji-btn.selected');
    var rating = selectedEmoji ? parseInt(selectedEmoji.dataset.value) : 0;
    var comment = (document.getElementById('feedback-text') || {}).value || '';
    var selectedTip = document.querySelector('.tip-btn.selected');
    var tipPercent = selectedTip ? parseInt(selectedTip.dataset.percent) : 0;
    var customTip = parseInt((document.getElementById('custom-tip') || {}).value) || 0;
    var tipAmount = customTip > 0 ? customTip : Math.round(orderTotal * tipPercent / 100);

    if (rating === 0) {
        showAuthToast('Please select a rating!');
        return;
    }

    var user = getCurrentUser();
    var feedbackData = {
        orderId: orderId,
        rating: rating,
        comment: comment,
        tipAmount: tipAmount,
        timestamp: new Date().toISOString(),
        userPhone: user ? user.phone : 'anonymous'
    };

    var db = getDb();
    if (db) {
        db.collection('feedback').add(feedbackData).then(function() {
            showAuthToast('Thank you for your feedback!');
            // Award bonus points for feedback
            if (user) {
                user.loyaltyPoints = (user.loyaltyPoints || 0) + 5;
                setCurrentUser(user);
                if (typeof window.updateLoyaltyWidget === 'function') window.updateLoyaltyWidget();
                showAuthToast('+5 bonus points for your feedback!');
                // Update challenge progress
                if (typeof window.updateChallengeProgress === 'function') {
                    window.updateChallengeProgress('reviews', 1);
                }
            }
        }).catch(function(e) {
            console.error('Feedback save error:', e);
        });
    }

    closeFeedback();
}

export function closeFeedback() {
    var overlay = document.getElementById('feedback-overlay');
    if (overlay) overlay.style.display = 'none';
}

// Auto-prompt feedback after order (delayed)
export function schedulePostOrderFeedback(orderId, orderTotal) {
    setTimeout(function() {
        showPostOrderFeedback(orderId, orderTotal);
    }, 30000); // Show 30 seconds after order
}

export function initFeedback() {
    // Hook into order completion
}

if (!window._feedbackGlobalsSet) {
    window._feedbackGlobalsSet = true;
    Object.assign(window, { showPostOrderFeedback, closeFeedback, selectFeedbackEmoji, selectTip, submitFeedback, schedulePostOrderFeedback });
}
