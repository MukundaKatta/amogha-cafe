import { getCurrentUser, showAuthToast } from './auth.js';

// ===== SOCIAL SHARING WITH BRANDED ORDER CARDS =====

export function shareOrderCard(orderId, items, total) {
    var itemList = (items || []).map(function(i) { return i.name + ' x' + i.qty; }).join(', ');
    var text = 'Just ordered from Amogha Cafe! 🍛\n' +
        itemList + '\nTotal: ₹' + (total || 0) + '\n\n' +
        '#AmoghaCafe #FoodieLife';

    if (navigator.share) {
        navigator.share({
            title: 'My Amogha Cafe Order',
            text: text,
            url: window.location.origin
        }).then(function() {
            onShareComplete();
        }).catch(function() {});
    } else {
        showShareOptions(text);
    }
}

function showShareOptions(text) {
    var modal = document.getElementById('share-modal');
    if (!modal) return;
    var encodedText = encodeURIComponent(text);
    var encodedUrl = encodeURIComponent(window.location.origin);

    modal.querySelector('.share-modal-content').innerHTML =
        '<button class="share-close" onclick="closeShareModal()" aria-label="Close">&times;</button>' +
        '<h3 class="share-title">Share Your Order</h3>' +
        '<div class="share-preview">' +
            '<div class="share-card">' +
                '<div class="share-card-header">Amogha Cafe</div>' +
                '<div class="share-card-body">' + text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g, '<br>') + '</div>' +
            '</div>' +
        '</div>' +
        '<div class="share-buttons">' +
            '<a href="https://wa.me/?text=' + encodedText + '" target="_blank" rel="noopener" class="share-btn share-whatsapp" onclick="onShareComplete()">WhatsApp</a>' +
            '<a href="https://twitter.com/intent/tweet?text=' + encodedText + '&url=' + encodedUrl + '" target="_blank" rel="noopener" class="share-btn share-twitter" onclick="onShareComplete()">Twitter/X</a>' +
            '<button class="share-btn share-copy" onclick="copyShareText()">Copy Text</button>' +
        '</div>';
    modal.style.display = 'flex';
}

export function closeShareModal() {
    var modal = document.getElementById('share-modal');
    if (modal) modal.style.display = 'none';
}

function copyShareText() {
    var card = document.querySelector('.share-card-body');
    if (card && typeof window.safeCopy === 'function') {
        window.safeCopy(card.textContent);
        showAuthToast('Copied to clipboard!');
    }
}

function onShareComplete() {
    // Award points for sharing
    if (typeof window.updateChallengeProgress === 'function') {
        window.updateChallengeProgress('share', 1);
    }
    showAuthToast('+10 points for sharing!');
}

// Share a specific menu item
export function shareMenuItem(itemName, itemPrice) {
    var text = 'Check out ' + itemName + ' (₹' + itemPrice + ') at Amogha Cafe! 🍛 #AmoghaCafe';
    if (navigator.share) {
        navigator.share({ title: itemName + ' — Amogha Cafe', text: text, url: window.location.origin }).catch(function() {});
    } else {
        showShareOptions(text);
    }
}

// Share achievement
export function shareAchievement(badgeName, badgeIcon) {
    var text = 'I just earned the ' + badgeIcon + ' ' + badgeName + ' badge at Amogha Cafe! 🏆 #AmoghaCafe #FoodieAchievement';
    if (navigator.share) {
        navigator.share({ title: 'Achievement Unlocked!', text: text, url: window.location.origin }).catch(function() {});
    } else {
        showShareOptions(text);
    }
}

export function initSocialShare() {}

Object.assign(window, { shareOrderCard, closeShareModal, shareMenuItem, shareAchievement, copyShareText, onShareComplete });
