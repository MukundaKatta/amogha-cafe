// ===== REFER-A-FRIEND MODULE =====
// Dedicated referral system with tracking, shareable links, and dual rewards
// Inspired by: Uber, Starbucks, Chick-fil-A referral programs

import { getDb } from '../core/firebase.js';

var REFERRAL_REWARD_REFERRER = 100; // points for the referrer
var REFERRAL_REWARD_REFEREE = 150;  // points for the new user (higher to incentivize sign-up)
var REFERRAL_TIERS = [
    { count: 1, badge: 'Friendly Face', emoji: '😊' },
    { count: 5, badge: 'Social Butterfly', emoji: '🦋' },
    { count: 10, badge: 'Brand Ambassador', emoji: '🌟' },
    { count: 25, badge: 'Community Champion', emoji: '👑' },
    { count: 50, badge: 'Legendary Referrer', emoji: '🏆' }
];

function generateReferralCode(name) {
    var prefix = (name || 'AMOGHA').substring(0, 4).toUpperCase().replace(/[^A-Z]/g, 'X');
    var suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return prefix + suffix;
}

function getReferralLink(code) {
    return 'https://amoghahotels.com/?ref=' + code;
}

export function initReferral() {
    // Check if user arrived via referral link
    var urlParams = new URLSearchParams(window.location.search);
    var refCode = urlParams.get('ref');
    if (refCode) {
        localStorage.setItem('amogha_referral_code', refCode);
        // Clean URL without reload
        if (window.history && window.history.replaceState) {
            var cleanUrl = window.location.pathname + window.location.hash;
            window.history.replaceState({}, '', cleanUrl);
        }
    }

    // Add referral section
    injectReferralWidget();
}

function injectReferralWidget() {
    var user = null;
    try { user = JSON.parse(localStorage.getItem('amoghaUser')); } catch(e) {}
    if (!user) return;

    // Create floating referral button
    var fab = document.createElement('button');
    fab.className = 'referral-fab';
    fab.innerHTML = '<span class="referral-fab-icon">👥</span><span class="referral-fab-text">Invite Friends</span>';
    fab.setAttribute('aria-label', 'Invite friends and earn rewards');
    fab.addEventListener('click', openReferralModal);
    document.body.appendChild(fab);
}

function openReferralModal() {
    var user = null;
    try { user = JSON.parse(localStorage.getItem('amoghaUser')); } catch(e) {}
    if (!user) {
        if (typeof window.showToast === 'function') window.showToast('Please sign in first');
        return;
    }

    var existingModal = document.getElementById('referralModal');
    if (existingModal) existingModal.remove();

    // Get or create referral code
    var referralCode = user.referralCode || generateReferralCode(user.name);
    if (!user.referralCode) {
        user.referralCode = referralCode;
        localStorage.setItem('amoghaUser', JSON.stringify(user));
        var db = getDb();
        if (db) {
            db.collection('users').doc(user.phone || user.uid).update({ referralCode: referralCode }).catch(function() {});
        }
    }

    var referralLink = getReferralLink(referralCode);
    var referralCount = parseInt(localStorage.getItem('amogha_referral_count') || '0');
    var currentTier = null;
    var nextTier = REFERRAL_TIERS[0];
    for (var i = REFERRAL_TIERS.length - 1; i >= 0; i--) {
        if (referralCount >= REFERRAL_TIERS[i].count) {
            currentTier = REFERRAL_TIERS[i];
            nextTier = REFERRAL_TIERS[i + 1] || null;
            break;
        }
    }

    var progressHtml = '';
    if (nextTier) {
        var pct = Math.min(100, (referralCount / nextTier.count) * 100);
        progressHtml =
            '<div class="referral-progress">' +
                '<div class="referral-progress-bar" style="width:' + pct + '%"></div>' +
            '</div>' +
            '<p class="referral-progress-text">' + referralCount + '/' + nextTier.count + ' referrals — Next: ' + nextTier.emoji + ' ' + nextTier.badge + '</p>';
    }

    var shareText = 'Hey! Try Amogha Cafe — amazing food & you\'ll get ₹' + REFERRAL_REWARD_REFEREE + ' in rewards! Use my link: ' + referralLink;

    var modal = document.createElement('div');
    modal.id = 'referralModal';
    modal.className = 'modal-overlay referral-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-label', 'Invite Friends');
    modal.innerHTML =
        '<div class="modal-content referral-content">' +
            '<button class="modal-close" aria-label="Close">&times;</button>' +
            '<div class="referral-header">' +
                '<div class="referral-icon">👥</div>' +
                '<h2>Invite Friends, Earn Rewards</h2>' +
                '<p>You get <strong>' + REFERRAL_REWARD_REFERRER + ' points</strong> for each friend. They get <strong>' + REFERRAL_REWARD_REFEREE + ' points</strong> to start!</p>' +
            '</div>' +

            (currentTier ? '<div class="referral-badge-display">' + currentTier.emoji + ' ' + currentTier.badge + ' — ' + referralCount + ' referrals</div>' : '') +
            progressHtml +

            '<div class="referral-code-section">' +
                '<label>Your Referral Code</label>' +
                '<div class="referral-code-box">' +
                    '<span class="referral-code-text">' + referralCode + '</span>' +
                    '<button class="referral-copy-btn" id="refCopyCode" aria-label="Copy code">Copy</button>' +
                '</div>' +
            '</div>' +

            '<div class="referral-link-section">' +
                '<label>Your Referral Link</label>' +
                '<div class="referral-link-box">' +
                    '<input type="text" value="' + referralLink + '" readonly id="refLinkInput">' +
                    '<button class="referral-copy-btn" id="refCopyLink" aria-label="Copy link">Copy</button>' +
                '</div>' +
            '</div>' +

            '<div class="referral-share-grid">' +
                '<button class="referral-share-btn whatsapp" onclick="window.open(\'https://wa.me/?text=' + encodeURIComponent(shareText) + '\')">' +
                    '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492l4.636-1.467A11.93 11.93 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-2.17 0-4.207-.578-5.963-1.588l-4.162 1.318 1.342-4.063A9.69 9.69 0 012.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75z"/></svg>' +
                    ' WhatsApp' +
                '</button>' +
                '<button class="referral-share-btn sms" onclick="window.open(\'sms:?body=' + encodeURIComponent(shareText) + '\')">' +
                    '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>' +
                    ' SMS' +
                '</button>' +
                '<button class="referral-share-btn native" id="refNativeShare">' +
                    '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>' +
                    ' Share' +
                '</button>' +
            '</div>' +

            '<div class="referral-how-it-works">' +
                '<h3>How it works</h3>' +
                '<div class="referral-steps">' +
                    '<div class="referral-step"><span class="step-num">1</span><span>Share your link</span></div>' +
                    '<div class="referral-step"><span class="step-num">2</span><span>Friend signs up & orders</span></div>' +
                    '<div class="referral-step"><span class="step-num">3</span><span>Both earn rewards!</span></div>' +
                '</div>' +
            '</div>' +

            '<div class="referral-tiers">' +
                '<h3>Referral Milestones</h3>' +
                REFERRAL_TIERS.map(function(t) {
                    var achieved = referralCount >= t.count;
                    return '<div class="referral-tier ' + (achieved ? 'achieved' : '') + '">' +
                        '<span class="tier-emoji">' + t.emoji + '</span>' +
                        '<span class="tier-name">' + t.badge + '</span>' +
                        '<span class="tier-count">' + t.count + ' referrals</span>' +
                        (achieved ? '<span class="tier-check">✓</span>' : '') +
                    '</div>';
                }).join('') +
            '</div>' +
        '</div>';

    document.body.appendChild(modal);
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Event handlers
    function closeModal() {
        modal.remove();
        document.body.style.overflow = '';
    }
    modal.querySelector('.modal-close').onclick = closeModal;
    modal.addEventListener('click', function(e) {
        if (e.target === modal) closeModal();
    });

    document.getElementById('refCopyCode').addEventListener('click', function() {
        navigator.clipboard.writeText(referralCode).then(function() {
            document.getElementById('refCopyCode').textContent = 'Copied!';
            setTimeout(function() { document.getElementById('refCopyCode').textContent = 'Copy'; }, 2000);
        }).catch(function() {});
    });

    document.getElementById('refCopyLink').addEventListener('click', function() {
        navigator.clipboard.writeText(referralLink).then(function() {
            document.getElementById('refCopyLink').textContent = 'Copied!';
            setTimeout(function() { document.getElementById('refCopyLink').textContent = 'Copy'; }, 2000);
        }).catch(function() {});
    });

    // Native share
    var nativeBtn = document.getElementById('refNativeShare');
    if (navigator.share) {
        nativeBtn.addEventListener('click', function() {
            navigator.share({ title: 'Join Amogha Cafe', text: shareText, url: referralLink }).catch(function() {});
        });
    } else {
        nativeBtn.style.display = 'none';
    }
}

export { openReferralModal };

Object.assign(window, { openReferralModal, initReferral });
