// ===== GEOFENCING MODULE =====
// Location-aware features: "I'm Here" button, proximity alerts, auto-prep
// Inspired by: Chick-fil-A "I'm Here", McDonald's "Ready on Arrival"

import { getDb } from '../core/firebase.js';

var STORE_LOCATION = { lat: 17.4935, lng: 78.3911 }; // Amogha Cafe coordinates
var PROXIMITY_RADIUS_M = 200; // meters — trigger "nearby" state
var ARRIVAL_RADIUS_M = 50;    // meters — trigger "arrived" state
var GEOFENCE_CHECK_INTERVAL = 15000; // check every 15 seconds when active

var watchId = null;
var isNearby = false;
var hasArrived = false;

function haversineDistance(lat1, lon1, lat2, lon2) {
    var R = 6371e3; // Earth radius in meters
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLon = (lon2 - lon1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getActiveOrderId() {
    try {
        var orders = JSON.parse(localStorage.getItem('amogha_active_orders') || '[]');
        if (orders.length > 0) return orders[orders.length - 1];
        // Also check recent order
        return localStorage.getItem('amogha_last_order_id') || null;
    } catch(e) {
        return null;
    }
}

function showImHereButton() {
    var existing = document.getElementById('imHereBtn');
    if (existing) return;

    var orderId = getActiveOrderId();
    if (!orderId) return;

    var btn = document.createElement('button');
    btn.id = 'imHereBtn';
    btn.className = 'im-here-btn pulse-animation';
    btn.innerHTML =
        '<span class="im-here-icon">📍</span>' +
        '<span class="im-here-text">I\'m Here!</span>' +
        '<span class="im-here-sub">Tap to alert kitchen</span>';
    btn.setAttribute('aria-label', 'Let the kitchen know you have arrived');

    btn.addEventListener('click', function() {
        notifyArrival(orderId);
        btn.innerHTML =
            '<span class="im-here-icon">✅</span>' +
            '<span class="im-here-text">Kitchen Notified!</span>' +
            '<span class="im-here-sub">Your order is being prepared fresh</span>';
        btn.classList.remove('pulse-animation');
        btn.classList.add('im-here-confirmed');
        btn.disabled = true;

        setTimeout(function() { btn.remove(); }, 10000);
    });

    document.body.appendChild(btn);

    // Auto-remove after 5 minutes
    setTimeout(function() {
        if (btn.parentNode) btn.remove();
    }, 300000);
}

function notifyArrival(orderId) {
    var db = getDb();
    if (!db || !orderId) return;

    db.collection('orders').doc(orderId).update({
        customerArrived: true,
        arrivalTime: new Date().toISOString(),
        arrivalNotified: true
    }).catch(function() {});

    // Show toast
    if (typeof window.showToast === 'function') {
        window.showToast('Kitchen has been notified of your arrival!');
    }
}

function showNearbyBanner() {
    var existing = document.getElementById('nearbyBanner');
    if (existing) return;

    var orderId = getActiveOrderId();
    if (!orderId) return;

    var banner = document.createElement('div');
    banner.id = 'nearbyBanner';
    banner.className = 'nearby-banner slide-in';
    banner.innerHTML =
        '<div class="nearby-content">' +
            '<span class="nearby-icon">🏪</span>' +
            '<div class="nearby-text">' +
                '<strong>Almost there!</strong>' +
                '<p>We\'re preparing your order as you approach</p>' +
            '</div>' +
            '<button class="nearby-dismiss" aria-label="Dismiss">&times;</button>' +
        '</div>';

    banner.querySelector('.nearby-dismiss').addEventListener('click', function() {
        banner.classList.add('slide-out');
        setTimeout(function() { banner.remove(); }, 300);
    });

    document.body.appendChild(banner);

    // Notify backend to start preparation
    var db = getDb();
    if (db && orderId) {
        db.collection('orders').doc(orderId).update({
            customerNearby: true,
            nearbyTime: new Date().toISOString()
        }).catch(function() {});
    }
}

function handlePositionUpdate(position) {
    var distance = haversineDistance(
        position.coords.latitude,
        position.coords.longitude,
        STORE_LOCATION.lat,
        STORE_LOCATION.lng
    );

    // Store distance for other modules
    localStorage.setItem('amogha_store_distance', Math.round(distance));

    if (distance <= ARRIVAL_RADIUS_M && !hasArrived) {
        hasArrived = true;
        isNearby = true;
        showImHereButton();
    } else if (distance <= PROXIMITY_RADIUS_M && !isNearby) {
        isNearby = true;
        showNearbyBanner();
    }
}

export function initGeofence() {
    if (!('geolocation' in navigator)) return;

    // Only activate if user has an active order
    var orderId = getActiveOrderId();
    if (!orderId) {
        // Set up a listener for when orders are placed
        window.addEventListener('amogha-order-placed', function() {
            startGeofenceWatch();
        });
        return;
    }

    startGeofenceWatch();
}

function startGeofenceWatch() {
    if (watchId !== null) return; // Already watching

    // Check if we already have permission
    if (navigator.permissions) {
        navigator.permissions.query({ name: 'geolocation' }).then(function(result) {
            if (result.state === 'granted') {
                activateWatch();
            } else if (result.state === 'prompt') {
                // Show a non-intrusive opt-in
                showGeofenceOptIn();
            }
        }).catch(function() {
            // Permissions API not supported, show opt-in
            showGeofenceOptIn();
        });
    }
}

function showGeofenceOptIn() {
    var orderId = getActiveOrderId();
    if (!orderId) return;

    var banner = document.createElement('div');
    banner.id = 'geofenceOptIn';
    banner.className = 'geofence-optin slide-in';
    banner.innerHTML =
        '<div class="geofence-optin-content">' +
            '<span class="geofence-optin-icon">📍</span>' +
            '<div class="geofence-optin-text">' +
                '<strong>Enable arrival alerts?</strong>' +
                '<p>We\'ll start preparing your order as you approach</p>' +
            '</div>' +
            '<div class="geofence-optin-actions">' +
                '<button class="geofence-optin-yes">Enable</button>' +
                '<button class="geofence-optin-no">Not now</button>' +
            '</div>' +
        '</div>';

    banner.querySelector('.geofence-optin-yes').addEventListener('click', function() {
        banner.remove();
        activateWatch();
    });

    banner.querySelector('.geofence-optin-no').addEventListener('click', function() {
        banner.classList.add('slide-out');
        setTimeout(function() { banner.remove(); }, 300);
    });

    document.body.appendChild(banner);
}

function activateWatch() {
    watchId = navigator.geolocation.watchPosition(
        handlePositionUpdate,
        function() {}, // Silently fail on error
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
}

export function stopGeofence() {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
    isNearby = false;
    hasArrived = false;
}
