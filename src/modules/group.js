import { getDb } from '../core/firebase.js';
import { getCurrentUser } from './auth.js';
import { cart } from './cart.js';
import { lockScroll, unlockScroll } from '../core/utils.js';

// ===== GROUP ORDERING =====
// Allows customers to create a shared cart via a link.
// Host creates group cart → shares link → participants add items → host checks out.

var groupCartId = null;
var groupUnsubscribe = null;
var isGroupHost = false;

export function initGroupOrdering() {
    // Check URL for group cart parameter
    var params = new URLSearchParams(window.location.search);
    var gid = params.get('group');
    if (gid) {
        joinGroupCart(gid);
    }
}

export function createGroupCart() {
    var user = getCurrentUser();
    if (!user) {
        if (typeof window.openAuthModal === 'function') window.openAuthModal();
        if (typeof window.showAuthToast === 'function') window.showAuthToast('Please sign in to start group ordering');
        return;
    }

    var db = getDb();
    if (!db) return;

    var cartData = {
        hostPhone: user.phone,
        hostName: user.name || 'Host',
        participants: [{ phone: user.phone, name: user.name || 'Host', items: [] }],
        status: 'open',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString() // 1 hour expiry
    };

    db.collection('groupCarts').add(cartData).then(function(docRef) {
        groupCartId = docRef.id;
        isGroupHost = true;
        var shareUrl = window.location.origin + window.location.pathname + '?group=' + groupCartId;

        showGroupModal(shareUrl);
        listenToGroupCart(groupCartId);
    }).catch(function(err) {
        console.error('Create group cart error:', err);
        if (typeof window.showAuthToast === 'function') window.showAuthToast('Failed to create group cart');
    });
}

function joinGroupCart(cartId) {
    var db = getDb();
    if (!db) return;

    db.collection('groupCarts').doc(cartId).get().then(function(doc) {
        if (!doc.exists) {
            if (typeof window.showAuthToast === 'function') window.showAuthToast('Group cart not found or expired');
            return;
        }
        var data = doc.data();
        if (data.status !== 'open') {
            if (typeof window.showAuthToast === 'function') window.showAuthToast('This group order has been closed');
            return;
        }

        groupCartId = cartId;
        isGroupHost = false;

        var user = getCurrentUser();
        if (user) {
            var alreadyJoined = data.participants.some(function(p) { return p.phone === user.phone; });
            if (!alreadyJoined) {
                data.participants.push({ phone: user.phone, name: user.name || 'Guest', items: [] });
                db.collection('groupCarts').doc(cartId).update({ participants: data.participants });
            }
        }

        if (typeof window.showAuthToast === 'function') window.showAuthToast('Joined group order by ' + data.hostName);
        listenToGroupCart(cartId);
        showGroupStatus();
    }).catch(function(err) {
        console.error('Join group cart error:', err);
    });
}

function listenToGroupCart(cartId) {
    var db = getDb();
    if (!db) return;
    if (groupUnsubscribe) groupUnsubscribe();

    groupUnsubscribe = db.collection('groupCarts').doc(cartId).onSnapshot(function(doc) {
        if (!doc.exists) return;
        var data = doc.data();
        updateGroupStatusUI(data);
    });
}

function showGroupModal(shareUrl) {
    var existing = document.getElementById('group-modal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'group-modal';
    modal.className = 'modal';
    modal.style.display = 'block';
    lockScroll();

    modal.innerHTML = '<div class="modal-content" style="max-width:420px;padding:1.5rem">' +
        '<span class="close-modal" onclick="closeGroupModal()">&times;</span>' +
        '<h2 style="color:#D4A017;margin-bottom:1rem">Group Ordering</h2>' +
        '<p style="margin-bottom:0.8rem">Share this link with friends to order together:</p>' +
        '<div style="display:flex;gap:0.5rem;margin-bottom:1rem">' +
            '<input type="text" id="group-share-url" value="' + shareUrl + '" readonly style="flex:1;padding:0.5rem;border-radius:8px;border:1px solid rgba(212,160,23,0.2);background:rgba(0,0,0,0.2);color:#e8d5b5;font-size:0.8rem">' +
            '<button onclick="copyGroupLink()" style="padding:0.5rem 1rem;background:#D4A017;color:#1a0f08;border:none;border-radius:8px;font-weight:700;cursor:pointer">Copy</button>' +
        '</div>' +
        '<div id="group-participants" style="margin-bottom:1rem"></div>' +
        '<p style="font-size:0.75rem;color:#a09080">Cart expires in 1 hour. Only you (host) can checkout.</p>' +
        '<button onclick="lockGroupCart()" class="cta-button" style="width:100%;margin-top:0.5rem">Lock Cart & Checkout</button>' +
        '</div>';

    document.body.appendChild(modal);
    modal.addEventListener('click', function(e) {
        if (e.target === modal) closeGroupModal();
    });
}

export function closeGroupModal() {
    var modal = document.getElementById('group-modal');
    if (modal) modal.style.display = 'none';
    unlockScroll();
}

export function copyGroupLink() {
    var input = document.getElementById('group-share-url');
    if (input) {
        input.select();
        if (navigator.clipboard) {
            navigator.clipboard.writeText(input.value);
        } else {
            document.execCommand('copy');
        }
        if (typeof window.showAuthToast === 'function') window.showAuthToast('Link copied!');
    }
}

function updateGroupStatusUI(data) {
    var container = document.getElementById('group-participants');
    if (!container) return;

    var html = '<h4 style="color:#D4A017;margin-bottom:0.5rem">Participants (' + data.participants.length + ')</h4>';
    data.participants.forEach(function(p) {
        var itemCount = (p.items || []).length;
        html += '<div style="display:flex;justify-content:space-between;padding:0.4rem 0;border-bottom:1px solid rgba(255,255,255,0.05)">' +
            '<span>' + (p.name || p.phone) + (p.phone === data.hostPhone ? ' (Host)' : '') + '</span>' +
            '<span style="color:#D4A017">' + itemCount + ' item' + (itemCount !== 1 ? 's' : '') + '</span>' +
        '</div>';
    });
    container.innerHTML = html;
}

export function addToGroupCart(itemName, itemPrice) {
    if (!groupCartId) return;
    var user = getCurrentUser();
    if (!user) return;
    var db = getDb();
    if (!db) return;

    db.collection('groupCarts').doc(groupCartId).get().then(function(doc) {
        if (!doc.exists) return;
        var data = doc.data();
        var participant = data.participants.find(function(p) { return p.phone === user.phone; });
        if (!participant) return;
        if (!participant.items) participant.items = [];
        participant.items.push({ name: itemName, price: itemPrice, qty: 1 });
        db.collection('groupCarts').doc(groupCartId).update({ participants: data.participants });
        if (typeof window.showAuthToast === 'function') window.showAuthToast('Added to group cart!');
    });
}

export function lockGroupCart() {
    if (!groupCartId || !isGroupHost) return;
    var db = getDb();
    if (!db) return;

    db.collection('groupCarts').doc(groupCartId).update({ status: 'locked' }).then(function() {
        // Merge all participant items into the main cart
        db.collection('groupCarts').doc(groupCartId).get().then(function(doc) {
            if (!doc.exists) return;
            var data = doc.data();
            data.participants.forEach(function(p) {
                (p.items || []).forEach(function(item) {
                    if (typeof window.finalizeAddToCart === 'function') {
                        window.finalizeAddToCart(item.name, item.price, 1);
                    }
                });
            });
            closeGroupModal();
            if (typeof window.showAuthToast === 'function') window.showAuthToast('Group cart locked! Proceed to checkout.');
        });
    });
}

function showGroupStatus() {
    // Add a small floating indicator showing group order is active
    var existing = document.getElementById('group-indicator');
    if (existing) existing.remove();
    var indicator = document.createElement('div');
    indicator.id = 'group-indicator';
    indicator.style.cssText = 'position:fixed;bottom:80px;right:20px;background:linear-gradient(135deg,#D4A017,#B8860B);color:#1a0f08;padding:0.5rem 1rem;border-radius:20px;font-size:0.8rem;font-weight:700;cursor:pointer;z-index:999;box-shadow:0 4px 12px rgba(0,0,0,0.3)';
    indicator.textContent = 'Group Order Active';
    indicator.onclick = function() {
        if (isGroupHost) showGroupModal(window.location.origin + window.location.pathname + '?group=' + groupCartId);
    };
    document.body.appendChild(indicator);
}

Object.assign(window, {
    createGroupCart,
    closeGroupModal,
    copyGroupLink,
    addToGroupCart,
    lockGroupCart,
    initGroupOrdering
});
