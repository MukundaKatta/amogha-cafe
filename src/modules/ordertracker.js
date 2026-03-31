import { getCurrentUser, showAuthToast } from './auth.js';
import { getDb } from '../core/firebase.js';
import { safeGetItem, safeSetItem, sanitizeHtml } from '../core/utils.js';

// ===== REAL-TIME ORDER TRACKING (Domino's-style) =====

var TRACKER_STAGES = [
    { id: 'placed', label: 'Order Placed', icon: '📋', desc: 'Your order has been received' },
    { id: 'confirmed', label: 'Confirmed', icon: '✅', desc: 'Restaurant confirmed your order' },
    { id: 'preparing', label: 'Preparing', icon: '👨‍🍳', desc: 'Chef is preparing your food' },
    { id: 'quality', label: 'Quality Check', icon: '✨', desc: 'Final quality check in progress' },
    { id: 'ready', label: 'Ready!', icon: '🎉', desc: 'Your order is ready for pickup' }
];

var activeTrackers = {};
var trackerUnsubscribers = {};

export function showOrderTracker(orderId) {
    if (!orderId) return;
    var overlay = document.getElementById('order-tracker-overlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    var content = overlay.querySelector('.order-tracker-content');
    if (!content) return;

    content.innerHTML =
        '<button class="tracker-close" onclick="closeOrderTracker()" aria-label="Close tracker">&times;</button>' +
        '<h3 class="tracker-title">Order Tracker</h3>' +
        '<p class="tracker-order-id">Order #' + orderId.slice(-8).toUpperCase() + '</p>' +
        '<div class="tracker-eta" id="tracker-eta">Estimated: 15-20 min</div>' +
        '<div class="tracker-stages" id="tracker-stages">' +
        TRACKER_STAGES.map(function(stage, idx) {
            return '<div class="tracker-stage" id="stage-' + stage.id + '" data-index="' + idx + '">' +
                '<div class="tracker-stage-icon">' + stage.icon + '</div>' +
                '<div class="tracker-stage-info">' +
                    '<div class="tracker-stage-label">' + stage.label + '</div>' +
                    '<div class="tracker-stage-desc">' + stage.desc + '</div>' +
                '</div>' +
                '<div class="tracker-stage-check"></div>' +
            '</div>';
        }).join('<div class="tracker-connector"></div>') +
        '</div>' +
        '<div class="tracker-actions">' +
            '<button class="tracker-btn" data-share-order="' + sanitizeHtml(orderId) + '">Share Status</button>' +
        '</div>';

    // Bind share button via event delegation
    var shareBtn = content.querySelector('.tracker-btn[data-share-order]');
    if (shareBtn) {
        shareBtn.addEventListener('click', function() {
            shareOrderStatus(shareBtn.getAttribute('data-share-order'));
        });
    }

    // Start listening for real-time updates; only simulate if no Firestore
    var db = getDb();
    if (db) {
        listenToOrder(orderId);
    } else {
        simulateOrderProgress(orderId);
    }
}

function listenToOrder(orderId) {
    var db = getDb();
    if (!db) return;
    // Unsubscribe previous listener if any
    if (trackerUnsubscribers[orderId]) {
        trackerUnsubscribers[orderId]();
    }
    trackerUnsubscribers[orderId] = db.collection('orders').doc(orderId).onSnapshot(function(doc) {
        if (doc.exists) {
            var data = doc.data();
            if (data.trackingStage !== undefined) {
                updateTrackerUI(data.trackingStage);
            }
        }
    }, function(err) {
        console.error('Order tracking listener error:', err);
    });
}

function simulateOrderProgress(orderId) {
    // Auto-advance stages for demo (in production, kitchen staff updates Firestore)
    var currentStage = 0;
    updateTrackerUI(currentStage);
    // Clear any existing interval for this order to prevent duplicates
    if (activeTrackers[orderId]) clearInterval(activeTrackers[orderId]);
    activeTrackers[orderId] = setInterval(function() {
        currentStage++;
        if (currentStage >= TRACKER_STAGES.length) {
            clearInterval(activeTrackers[orderId]);
            delete activeTrackers[orderId];
            // Show completion celebration
            var eta = document.getElementById('tracker-eta');
            if (eta) eta.textContent = 'Your order is ready! 🎉';
            if (typeof window.launchConfetti === 'function') window.launchConfetti();
            return;
        }
        updateTrackerUI(currentStage);
        // Update ETA
        var eta = document.getElementById('tracker-eta');
        if (eta) {
            var remaining = Math.max(0, (TRACKER_STAGES.length - 1 - currentStage) * 4);
            eta.textContent = remaining > 0 ? 'Estimated: ~' + remaining + ' min' : 'Almost ready!';
        }
    }, 8000); // Advance every 8 seconds for demo
}

function updateTrackerUI(activeIndex) {
    TRACKER_STAGES.forEach(function(stage, idx) {
        var el = document.getElementById('stage-' + stage.id);
        if (!el) return;
        el.classList.remove('completed', 'active', 'pending');
        if (idx < activeIndex) {
            el.classList.add('completed');
        } else if (idx === activeIndex) {
            el.classList.add('active');
        } else {
            el.classList.add('pending');
        }
    });
    // Animate connectors
    var connectors = document.querySelectorAll('.tracker-connector');
    connectors.forEach(function(conn, idx) {
        conn.classList.toggle('filled', idx < activeIndex);
    });
}

export function closeOrderTracker() {
    var overlay = document.getElementById('order-tracker-overlay');
    if (overlay) overlay.style.display = 'none';
    // Clean up listeners
    Object.keys(trackerUnsubscribers).forEach(function(id) {
        if (trackerUnsubscribers[id]) trackerUnsubscribers[id]();
        delete trackerUnsubscribers[id];
    });
    Object.keys(activeTrackers).forEach(function(id) {
        clearInterval(activeTrackers[id]);
        delete activeTrackers[id];
    });
}

export function shareOrderStatus(orderId) {
    var text = 'Tracking my order at Amogha Cafe! Order #' + orderId.slice(-8).toUpperCase() + ' 🍛';
    if (navigator.share) {
        navigator.share({ title: 'Amogha Order', text: text }).catch(function() {});
    } else {
        if (typeof window.safeCopy === 'function') window.safeCopy(text);
        showAuthToast('Status copied to clipboard!');
    }
}

// Auto-show tracker after order placement
export function initOrderTracker() {
    // Listen for new orders
    var checkInterval = setInterval(function() {
        if (window._lastOrderId && !activeTrackers[window._lastOrderId]) {
            var orderId = window._lastOrderId;
            // Show a floating tracker notification
            showTrackerNotification(orderId);
            clearInterval(checkInterval);
        }
    }, 2000);
    // Clear after 60s if no order
    setTimeout(function() { clearInterval(checkInterval); }, 60000);
}

function showTrackerNotification(orderId) {
    var existing = document.getElementById('tracker-notification');
    if (existing) existing.remove();
    var notif = document.createElement('div');
    notif.id = 'tracker-notification';
    notif.className = 'tracker-notification';
    notif.innerHTML = '<span class="tracker-notif-pulse"></span>' +
        '<span>Your order is being prepared! </span>' +
        '<button class="tracker-notif-btn" data-track-order="' + sanitizeHtml(orderId) + '">Track Order</button>' +
        '<button class="tracker-notif-close">&times;</button>';
    notif.querySelector('.tracker-notif-btn').addEventListener('click', function() {
        showOrderTracker(this.getAttribute('data-track-order'));
    });
    notif.querySelector('.tracker-notif-close').addEventListener('click', function() {
        notif.remove();
    });
    document.body.appendChild(notif);
    setTimeout(function() { notif.classList.add('show'); }, 100);
}

Object.assign(window, { showOrderTracker, closeOrderTracker, shareOrderStatus, initOrderTracker });
