import { safeGetItem, safeSetItem } from '../core/utils.js';
import { showAuthToast } from './auth.js';

// ===== PUSH NOTIFICATIONS (BROWSER API) =====

export var _notifListenerActive = false;

export function requestNotificationPermission() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
        safeSetItem('amoghaNotifPerm', 'granted');
        return;
    }
    if (Notification.permission === 'denied') return;
    // Show custom banner
    var banner = document.getElementById('notif-banner');
    if (!banner && !safeGetItem('amoghaNotifDismissed')) {
        banner = document.createElement('div');
        banner.id = 'notif-banner';
        banner.className = 'notif-banner';
        banner.innerHTML = '<span class="notif-icon">🔔</span>' +
            '<span class="notif-text">Get notified when your order is ready!</span>' +
            '<button class="notif-allow" onclick="enableNotifications()">Enable</button>' +
            '<button class="notif-dismiss" onclick="dismissNotifBanner()">&times;</button>';
        document.body.appendChild(banner);
        setTimeout(function() { banner.classList.add('visible'); }, 3000);
    }
}

export function enableNotifications() {
    Notification.requestPermission().then(function(perm) {
        safeSetItem('amoghaNotifPerm', perm);
        dismissNotifBanner();
        if (perm === 'granted') {
            showAuthToast('Notifications enabled!');
        }
    });
}

export function dismissNotifBanner() {
    var banner = document.getElementById('notif-banner');
    if (banner) {
        banner.classList.remove('visible');
        setTimeout(function() { banner.remove(); }, 400);
    }
    safeSetItem('amoghaNotifDismissed', 'true');
}

export function sendPushNotification(title, body) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
        new Notification(title, {
            body: body,
            icon: 'amogha-logo.png',
            badge: 'amogha-logo.png',
            tag: 'amogha-order'
        });
    } catch (e) {
        // Fallback for mobile
        if (navigator.serviceWorker && navigator.serviceWorker.ready) {
            navigator.serviceWorker.ready.then(function(reg) {
                reg.showNotification(title, {
                    body: body,
                    icon: 'amogha-logo.png',
                    tag: 'amogha-order'
                });
            });
        }
    }
}

// ===== FIREBASE CLOUD MESSAGING (FCM) =====
export function initFCM() {
    // Check if Firebase Messaging is available
    if (typeof firebase === 'undefined' || !firebase.messaging) return;

    try {
        var messaging = firebase.messaging();
        messaging.getToken({ vapidKey: 'BAmoghaVapidKeyPlaceholder' }).then(function(token) {
            if (token) {
                saveFCMToken(token);
            }
        }).catch(function(err) {
            console.log('FCM token error (expected on some browsers):', err.message);
        });

        // Handle foreground messages
        messaging.onMessage(function(payload) {
            var title = payload.notification ? payload.notification.title : 'Amogha Cafe';
            var body = payload.notification ? payload.notification.body : '';
            sendPushNotification(title, body);
            showAuthToast(body || title);
        });
    } catch (e) {
        // FCM not available — browser notifications still work
    }
}

function saveFCMToken(token) {
    try {
        var user = JSON.parse(localStorage.getItem('amoghaUser'));
        if (user && user.phone && window.db) {
            window.db.collection('users').doc(user.phone).update({
                fcmToken: token,
                fcmUpdatedAt: new Date().toISOString()
            }).catch(function() {});
        }
    } catch (e) {}
    safeSetItem('amoghaFcmToken', token);
}

export function initNotifications() {
    setTimeout(requestNotificationPermission, 5000);
    // Try FCM after a delay
    setTimeout(initFCM, 8000);
}

Object.assign(window, { enableNotifications, dismissNotifBanner, sendPushNotification, initFCM });
