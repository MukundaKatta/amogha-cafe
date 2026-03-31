// ===== LIVE WAIT TIME MODULE =====
// Real-time queue estimation and wait time predictions
// Inspired by: Chick-fil-A estimated ready time, McDonald's Ready On Arrival

import { getDb } from '../core/firebase.js';

var AVERAGE_PREP_TIMES = {
    'biryani': 20,
    'starters': 10,
    'curries': 15,
    'bread': 5,
    'rice': 12,
    'desserts': 8,
    'beverages': 3,
    'combos': 18,
    'default': 12
};

var currentQueueData = {
    activeOrders: 0,
    averageWait: 0,
    busyLevel: 'normal', // low, normal, busy, peak
    lastUpdated: null
};

function calculateBusyLevel(activeOrders) {
    if (activeOrders <= 3) return 'low';
    if (activeOrders <= 8) return 'normal';
    if (activeOrders <= 15) return 'busy';
    return 'peak';
}

function estimateWaitTime(cartItems) {
    if (!cartItems || cartItems.length === 0) return 0;

    // Base prep time from items
    var maxPrepTime = 0;
    cartItems.forEach(function(item) {
        var category = (item.category || 'default').toLowerCase();
        var prepTime = AVERAGE_PREP_TIMES[category] || AVERAGE_PREP_TIMES['default'];
        maxPrepTime = Math.max(maxPrepTime, prepTime);
    });

    // Adjust for queue depth
    var queueMultiplier = 1;
    switch (currentQueueData.busyLevel) {
        case 'low': queueMultiplier = 0.8; break;
        case 'normal': queueMultiplier = 1.0; break;
        case 'busy': queueMultiplier = 1.4; break;
        case 'peak': queueMultiplier = 1.8; break;
    }

    return Math.round(maxPrepTime * queueMultiplier);
}

function getBusyIndicator(level) {
    switch (level) {
        case 'low': return { label: 'Not Busy', color: '#4CAF50', icon: '🟢', message: 'Short wait times right now!' };
        case 'normal': return { label: 'Moderate', color: '#FF9800', icon: '🟡', message: 'Normal wait times' };
        case 'busy': return { label: 'Busy', color: '#FF5722', icon: '🟠', message: 'Longer wait times expected' };
        case 'peak': return { label: 'Very Busy', color: '#F44336', icon: '🔴', message: 'Peak hours — order ahead to skip the wait!' };
        default: return { label: 'Unknown', color: '#9E9E9E', icon: '⚪', message: '' };
    }
}

function renderQueueWidget() {
    var widget = document.getElementById('liveQueueWidget');
    if (!widget) {
        widget = document.createElement('div');
        widget.id = 'liveQueueWidget';
        widget.className = 'live-queue-widget';

        // Insert near order section or hero
        var target = document.querySelector('.order-info') || document.querySelector('#menu') || document.querySelector('.hero');
        if (target) {
            target.parentNode.insertBefore(widget, target.nextSibling);
        } else {
            document.body.appendChild(widget);
        }
    }

    var indicator = getBusyIndicator(currentQueueData.busyLevel);
    var hour = new Date().getHours();
    var isOpen = (hour >= 11 && hour <= 22);

    widget.innerHTML =
        '<div class="queue-card">' +
            '<div class="queue-header">' +
                '<span class="queue-status-dot" style="background:' + indicator.color + '"></span>' +
                '<span class="queue-status-label">' + (isOpen ? indicator.label : 'Closed') + '</span>' +
                '<span class="queue-live-badge">LIVE</span>' +
            '</div>' +
            (isOpen ?
                '<div class="queue-body">' +
                    '<div class="queue-metric">' +
                        '<span class="queue-metric-value">' + currentQueueData.averageWait + '</span>' +
                        '<span class="queue-metric-label">min avg wait</span>' +
                    '</div>' +
                    '<div class="queue-metric">' +
                        '<span class="queue-metric-value">' + currentQueueData.activeOrders + '</span>' +
                        '<span class="queue-metric-label">orders ahead</span>' +
                    '</div>' +
                    '<div class="queue-bar">' +
                        '<div class="queue-bar-fill" style="width:' + Math.min(100, (currentQueueData.activeOrders / 20) * 100) + '%;background:' + indicator.color + '"></div>' +
                    '</div>' +
                    '<p class="queue-message">' + indicator.icon + ' ' + indicator.message + '</p>' +
                '</div>'
            :
                '<div class="queue-closed">' +
                    '<p>We\'re currently closed. Opens at 11:00 AM</p>' +
                '</div>'
            ) +
            '<div class="queue-footer">' +
                '<span class="queue-peak-hours">Peak hours: 12-1pm, 7-9pm</span>' +
            '</div>' +
        '</div>';
}

function renderCheckoutEstimate(cartItems) {
    var estimate = estimateWaitTime(cartItems);
    var el = document.getElementById('checkoutTimeEstimate');
    if (!el) return;

    el.innerHTML =
        '<div class="checkout-estimate">' +
            '<span class="estimate-icon">⏱️</span>' +
            '<span class="estimate-text">Estimated ready in <strong>' + estimate + ' min</strong></span>' +
        '</div>';
}

function subscribeToQueue() {
    var db = getDb();
    if (!db) {
        // Use time-based estimation without real data
        var hour = new Date().getHours();
        var dayOfWeek = new Date().getDay();
        var isPeakHour = (hour >= 12 && hour <= 14) || (hour >= 19 && hour <= 21);
        var isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        var estimatedOrders = isPeakHour ? (isWeekend ? 15 : 12) : (isWeekend ? 6 : 4);
        currentQueueData.activeOrders = estimatedOrders;
        currentQueueData.busyLevel = calculateBusyLevel(estimatedOrders);
        currentQueueData.averageWait = Math.round(estimatedOrders * 2.5);
        currentQueueData.lastUpdated = new Date().toISOString();
        renderQueueWidget();
        return;
    }

    // Unsubscribe previous listener if any to prevent leaks
    if (window._liveQueueUnsubscribe) {
        window._liveQueueUnsubscribe();
        window._liveQueueUnsubscribe = null;
    }
    // Listen to active orders in real-time
    window._liveQueueUnsubscribe = db.collection('orders')
        .where('status', 'in', ['pending', 'preparing', 'confirmed'])
        .onSnapshot(function(snap) {
            currentQueueData.activeOrders = snap.size;
            currentQueueData.busyLevel = calculateBusyLevel(snap.size);
            currentQueueData.averageWait = Math.round(snap.size * 2.5);
            currentQueueData.lastUpdated = new Date().toISOString();
            renderQueueWidget();
        }, function() {
            // Fallback on error
            renderQueueWidget();
        });
}

export function initLiveQueue() {
    // Render initial widget
    renderQueueWidget();

    // Subscribe to real-time updates
    subscribeToQueue();

    // Refresh every 30 seconds if not using real-time listener
    if (!getDb()) {
        if (window._liveQueueInterval) clearInterval(window._liveQueueInterval);
        window._liveQueueInterval = setInterval(function() {
            subscribeToQueue();
        }, 30000);
    }

    // Hook into checkout to show estimates (avoid duplicate listeners)
    if (window._liveQueueCartHandler) {
        window.removeEventListener('amogha-cart-updated', window._liveQueueCartHandler);
    }
    window._liveQueueCartHandler = function(e) {
        var items = (e.detail && e.detail.items) || [];
        renderCheckoutEstimate(items);
    };
    window.addEventListener('amogha-cart-updated', window._liveQueueCartHandler);
}

export { estimateWaitTime, currentQueueData };
