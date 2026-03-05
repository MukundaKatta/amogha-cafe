import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    requestNotificationPermission,
    enableNotifications,
    dismissNotifBanner,
    sendPushNotification,
    initFCM,
    initNotifications,
    sendSmartNotification,
} from '../src/modules/notifications.js';

// --- Module-level mocks ---

vi.mock('../src/modules/auth.js', () => ({
    showAuthToast: vi.fn(),
}));

vi.mock('../src/core/utils.js', () => ({
    safeGetItem: vi.fn(() => null),
    safeSetItem: vi.fn(),
}));

import { safeGetItem, safeSetItem } from '../src/core/utils.js';
import { showAuthToast } from '../src/modules/auth.js';

// --- DOM helpers ---

function setupDOM(html) {
    document.body.innerHTML = html || '';
    document.getElementById = (id) => document.body.querySelector('#' + id);
    document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
    document.querySelector = (sel) => document.body.querySelector(sel);
}

beforeEach(() => {
    setupDOM('');
    vi.clearAllMocks();

    // Mock window.Notification since jsdom doesn't have it
    window.Notification = vi.fn();
    window.Notification.permission = 'default';
    window.Notification.requestPermission = vi.fn(() => Promise.resolve('granted'));

    // Reset navigator.serviceWorker
    delete navigator.serviceWorker;

    // Reset firebase global
    delete global.firebase;

    // Reset localStorage
    localStorage.clear();
});

afterEach(() => {
    vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// 1. requestNotificationPermission — returns early when Notification not in window
// ---------------------------------------------------------------------------
describe('requestNotificationPermission', () => {
    it('returns early when Notification is not in window', () => {
        delete window.Notification;
        // Should not throw and should not create any banner
        requestNotificationPermission();
        const banner = document.getElementById('notif-banner');
        expect(banner).toBeNull();
    });

    // 2. requestNotificationPermission — saves to localStorage when already granted
    it('saves granted permission to localStorage when already granted', () => {
        window.Notification.permission = 'granted';
        requestNotificationPermission();
        expect(safeSetItem).toHaveBeenCalledWith('amoghaNotifPerm', 'granted');
    });

    it('does not create a banner when already granted', () => {
        window.Notification.permission = 'granted';
        requestNotificationPermission();
        const banner = document.getElementById('notif-banner');
        expect(banner).toBeNull();
    });

    // 3. requestNotificationPermission — returns early when denied
    it('returns early without creating a banner when permission is denied', () => {
        window.Notification.permission = 'denied';
        requestNotificationPermission();
        const banner = document.getElementById('notif-banner');
        expect(banner).toBeNull();
    });

    it('does not call safeSetItem when permission is denied', () => {
        window.Notification.permission = 'denied';
        requestNotificationPermission();
        expect(safeSetItem).not.toHaveBeenCalled();
    });

    // 4. requestNotificationPermission — shows banner when permission is default
    it('creates #notif-banner in the DOM when permission is default', () => {
        window.Notification.permission = 'default';
        safeGetItem.mockReturnValue(null);
        requestNotificationPermission();
        const banner = document.getElementById('notif-banner');
        expect(banner).not.toBeNull();
    });

    it('creates banner with notif-banner class when permission is default', () => {
        window.Notification.permission = 'default';
        safeGetItem.mockReturnValue(null);
        requestNotificationPermission();
        const banner = document.getElementById('notif-banner');
        expect(banner.className).toContain('notif-banner');
    });

    it('banner contains enable button when permission is default', () => {
        window.Notification.permission = 'default';
        safeGetItem.mockReturnValue(null);
        requestNotificationPermission();
        const banner = document.getElementById('notif-banner');
        const enableBtn = banner.querySelector('.notif-allow');
        expect(enableBtn).not.toBeNull();
    });

    // 5. requestNotificationPermission — does not show banner when previously dismissed
    it('does not create a banner when amoghaNotifDismissed is set', () => {
        window.Notification.permission = 'default';
        safeGetItem.mockReturnValue('true');
        requestNotificationPermission();
        const banner = document.getElementById('notif-banner');
        expect(banner).toBeNull();
    });

    it('does not create duplicate banner if one already exists', () => {
        window.Notification.permission = 'default';
        safeGetItem.mockReturnValue(null);
        // Pre-insert a banner
        const existing = document.createElement('div');
        existing.id = 'notif-banner';
        document.body.appendChild(existing);
        requestNotificationPermission();
        const banners = document.body.querySelectorAll('#notif-banner');
        expect(banners.length).toBe(1);
    });
});

// ---------------------------------------------------------------------------
// 6. enableNotifications — requests permission and dismisses banner
// ---------------------------------------------------------------------------
describe('enableNotifications', () => {
    it('calls Notification.requestPermission', async () => {
        window.Notification.requestPermission = vi.fn(() => Promise.resolve('granted'));
        await enableNotifications();
        expect(window.Notification.requestPermission).toHaveBeenCalled();
    });

    it('saves the returned permission to localStorage', async () => {
        window.Notification.requestPermission = vi.fn(() => Promise.resolve('granted'));
        await enableNotifications();
        // Flush microtask queue so the .then() callback inside enableNotifications runs
        await new Promise((r) => setTimeout(r, 0));
        expect(safeSetItem).toHaveBeenCalledWith('amoghaNotifPerm', 'granted');
    });

    it('calls dismissNotifBanner after requesting permission', async () => {
        // Insert a banner so dismissNotifBanner has something to act on
        const banner = document.createElement('div');
        banner.id = 'notif-banner';
        banner.className = 'notif-banner visible';
        document.body.appendChild(banner);

        window.Notification.requestPermission = vi.fn(() => Promise.resolve('granted'));
        await enableNotifications();
        // Flush microtask queue so the .then() callback inside enableNotifications runs
        await new Promise((r) => setTimeout(r, 0));

        // safeSetItem('amoghaNotifDismissed', 'true') is called inside dismissNotifBanner
        expect(safeSetItem).toHaveBeenCalledWith('amoghaNotifDismissed', 'true');
    });

    // 7. enableNotifications — shows toast when granted
    it('calls showAuthToast when permission is granted', async () => {
        window.Notification.requestPermission = vi.fn(() => Promise.resolve('granted'));
        await enableNotifications();
        // Flush microtask queue so the .then() callback inside enableNotifications runs
        await new Promise((r) => setTimeout(r, 0));
        expect(showAuthToast).toHaveBeenCalledWith('Notifications enabled!');
    });

    it('does not call showAuthToast when permission is denied', async () => {
        window.Notification.requestPermission = vi.fn(() => Promise.resolve('denied'));
        await enableNotifications();
        await new Promise((r) => setTimeout(r, 0));
        expect(showAuthToast).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// 8. dismissNotifBanner — removes banner element
// ---------------------------------------------------------------------------
describe('dismissNotifBanner', () => {
    it('removes the visible class from the banner', () => {
        vi.useFakeTimers();
        const banner = document.createElement('div');
        banner.id = 'notif-banner';
        banner.className = 'notif-banner visible';
        document.body.appendChild(banner);

        dismissNotifBanner();
        expect(banner.classList.contains('visible')).toBe(false);
    });

    it('removes the banner element from DOM after timeout', () => {
        vi.useFakeTimers();
        const banner = document.createElement('div');
        banner.id = 'notif-banner';
        banner.className = 'notif-banner visible';
        document.body.appendChild(banner);

        dismissNotifBanner();
        vi.advanceTimersByTime(400);
        expect(document.body.contains(banner)).toBe(false);
    });

    // 9. dismissNotifBanner — sets dismissed flag in localStorage
    it('sets amoghaNotifDismissed in localStorage', () => {
        dismissNotifBanner();
        expect(safeSetItem).toHaveBeenCalledWith('amoghaNotifDismissed', 'true');
    });

    it('sets amoghaNotifDismissed even when banner is not present', () => {
        // No banner in DOM
        dismissNotifBanner();
        expect(safeSetItem).toHaveBeenCalledWith('amoghaNotifDismissed', 'true');
    });

    // 10. dismissNotifBanner — does nothing when no banner
    it('does not throw when no banner element exists', () => {
        expect(() => dismissNotifBanner()).not.toThrow();
    });
});

// ---------------------------------------------------------------------------
// 11. sendPushNotification — creates Notification when granted
// ---------------------------------------------------------------------------
describe('sendPushNotification', () => {
    it('creates a Notification instance when permission is granted', () => {
        window.Notification.permission = 'granted';
        sendPushNotification('Order Ready', 'Your order #123 is ready!');
        expect(window.Notification).toHaveBeenCalledWith('Order Ready', expect.objectContaining({
            body: 'Your order #123 is ready!',
        }));
    });

    it('passes correct options to Notification constructor', () => {
        window.Notification.permission = 'granted';
        sendPushNotification('Test Title', 'Test Body');
        expect(window.Notification).toHaveBeenCalledWith('Test Title', {
            body: 'Test Body',
            icon: 'amogha-logo.png',
            badge: 'amogha-logo.png',
            tag: 'amogha-order',
        });
    });

    // 12. sendPushNotification — does nothing when not granted
    it('does not create Notification when permission is denied', () => {
        window.Notification.permission = 'denied';
        sendPushNotification('Test', 'Body');
        expect(window.Notification).not.toHaveBeenCalledWith(expect.any(String), expect.any(Object));
    });

    it('does not create Notification when permission is default', () => {
        window.Notification.permission = 'default';
        sendPushNotification('Test', 'Body');
        expect(window.Notification).not.toHaveBeenCalledWith(expect.any(String), expect.any(Object));
    });

    // 13. sendPushNotification — does nothing when Notification not available
    it('does nothing when Notification is not in window', () => {
        delete window.Notification;
        // Should not throw
        expect(() => sendPushNotification('Test', 'Body')).not.toThrow();
    });

    // 14. sendPushNotification — falls back to service worker on error
    it('falls back to serviceWorker.ready.showNotification when Notification constructor throws', async () => {
        const showNotificationMock = vi.fn();
        window.Notification = vi.fn(() => { throw new Error('mobile'); });
        window.Notification.permission = 'granted';
        navigator.serviceWorker = {
            ready: Promise.resolve({ showNotification: showNotificationMock }),
        };

        sendPushNotification('Fallback Title', 'Fallback Body');

        // Wait for the serviceWorker.ready promise to resolve
        await navigator.serviceWorker.ready;
        await new Promise((r) => setTimeout(r, 0));

        expect(showNotificationMock).toHaveBeenCalledWith('Fallback Title', expect.objectContaining({
            body: 'Fallback Body',
        }));
    });

    it('does not throw when Notification throws and serviceWorker is not available', () => {
        window.Notification = vi.fn(() => { throw new Error('mobile'); });
        window.Notification.permission = 'granted';
        delete navigator.serviceWorker;
        expect(() => sendPushNotification('Title', 'Body')).not.toThrow();
    });
});

// ---------------------------------------------------------------------------
// 15. initFCM — returns early when firebase not defined
// ---------------------------------------------------------------------------
describe('initFCM', () => {
    it('returns early without throwing when firebase is undefined', () => {
        delete global.firebase;
        expect(() => initFCM()).not.toThrow();
    });

    it('returns early when firebase.messaging is falsy', () => {
        global.firebase = {};
        expect(() => initFCM()).not.toThrow();
    });

    it('calls firebase.messaging() when firebase is defined', () => {
        const onMessageMock = vi.fn();
        const getTokenMock = vi.fn(() => Promise.resolve(null));
        const messagingMock = { getToken: getTokenMock, onMessage: onMessageMock };
        global.firebase = { messaging: vi.fn(() => messagingMock) };

        initFCM();
        expect(global.firebase.messaging).toHaveBeenCalled();
    });

    it('calls messaging.getToken with vapidKey', () => {
        const onMessageMock = vi.fn();
        const getTokenMock = vi.fn(() => Promise.resolve(null));
        const messagingMock = { getToken: getTokenMock, onMessage: onMessageMock };
        global.firebase = { messaging: vi.fn(() => messagingMock) };

        initFCM();
        expect(getTokenMock).toHaveBeenCalledWith(expect.objectContaining({ vapidKey: expect.any(String) }));
    });

    it('does not throw when firebase.messaging() throws', () => {
        global.firebase = { messaging: vi.fn(() => { throw new Error('FCM init error'); }) };
        expect(() => initFCM()).not.toThrow();
    });

    it('logs error when getToken rejects (line 84)', async () => {
        const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
        const onMessageMock = vi.fn();
        const getTokenMock = vi.fn(() => Promise.reject(new Error('token denied')));
        const messagingMock = { getToken: getTokenMock, onMessage: onMessageMock };
        global.firebase = { messaging: vi.fn(() => messagingMock) };

        initFCM();
        await new Promise(r => setTimeout(r, 10));

        expect(consoleLog).toHaveBeenCalledWith(
            expect.stringContaining('FCM token error'),
            'token denied'
        );
        consoleLog.mockRestore();
    });
});

// ---------------------------------------------------------------------------
// 16. initNotifications — sets up delayed calls (use fake timers)
// ---------------------------------------------------------------------------
describe('initNotifications', () => {
    it('does not call requestNotificationPermission immediately', () => {
        vi.useFakeTimers();
        window.Notification.permission = 'default';
        safeGetItem.mockReturnValue(null);

        initNotifications();

        // No banner should be created before the 5s timer fires
        const banner = document.getElementById('notif-banner');
        expect(banner).toBeNull();
    });

    it('calls requestNotificationPermission after 5000ms', () => {
        vi.useFakeTimers();
        window.Notification.permission = 'default';
        safeGetItem.mockReturnValue(null);

        initNotifications();
        vi.advanceTimersByTime(5000);

        // After 5s, requestNotificationPermission should have run and created a banner
        const banner = document.getElementById('notif-banner');
        expect(banner).not.toBeNull();
    });

    it('does not call requestNotificationPermission before 5000ms', () => {
        vi.useFakeTimers();
        window.Notification.permission = 'default';
        safeGetItem.mockReturnValue(null);

        initNotifications();
        vi.advanceTimersByTime(4999);

        const banner = document.getElementById('notif-banner');
        expect(banner).toBeNull();
    });

    it('calls initFCM after 8000ms when firebase is available', () => {
        vi.useFakeTimers();
        const onMessageMock = vi.fn();
        const getTokenMock = vi.fn(() => Promise.resolve(null));
        const messagingMock = { getToken: getTokenMock, onMessage: onMessageMock };
        const messagingFn = vi.fn(() => messagingMock);
        global.firebase = { messaging: messagingFn };

        initNotifications();
        vi.advanceTimersByTime(8000);

        expect(messagingFn).toHaveBeenCalled();
    });

    it('does not call initFCM before 8000ms', () => {
        vi.useFakeTimers();
        const messagingFn = vi.fn(() => ({ getToken: vi.fn(() => Promise.resolve(null)), onMessage: vi.fn() }));
        global.firebase = { messaging: messagingFn };

        initNotifications();
        vi.advanceTimersByTime(7999);

        expect(messagingFn).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// 17. sendSmartNotification — fetches from /api/smart-notify
// ---------------------------------------------------------------------------
describe('sendSmartNotification', () => {
    beforeEach(() => {
        window.Notification.permission = 'granted';
        // Provide a logged-in user in localStorage
        localStorage.setItem('amoghaUser', JSON.stringify({ phone: '9999999999', name: 'Test User' }));
    });

    // 19. sendSmartNotification — does nothing for no user
    it('does nothing when no user in localStorage', async () => {
        localStorage.removeItem('amoghaUser');
        global.fetch = vi.fn();
        await sendSmartNotification('general');
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('does nothing when localStorage user is null', async () => {
        localStorage.setItem('amoghaUser', 'null');
        global.fetch = vi.fn();
        await sendSmartNotification('general');
        expect(global.fetch).not.toHaveBeenCalled();
    });

    // 17. sendSmartNotification — fetches from /api/smart-notify
    it('fetches /api/smart-notify with POST when user is present', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({
                json: () => Promise.resolve({ title: 'Hello', body: 'Come eat!' }),
            })
        );
        await sendSmartNotification('general');
        expect(global.fetch).toHaveBeenCalledWith('/api/smart-notify', expect.objectContaining({
            method: 'POST',
        }));
    });

    it('sends userId and context in the fetch body', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({
                json: () => Promise.resolve({ title: 'Hello', body: 'Come eat!' }),
            })
        );
        await sendSmartNotification('order-placed');
        const body = JSON.parse(global.fetch.mock.calls[0][1].body);
        expect(body.userId).toBe('9999999999');
        expect(body.context).toBe('order-placed');
    });

    it('uses default context "general" when context is not provided', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({
                json: () => Promise.resolve({ title: 'Hi', body: 'Welcome!' }),
            })
        );
        await sendSmartNotification();
        const body = JSON.parse(global.fetch.mock.calls[0][1].body);
        expect(body.context).toBe('general');
    });

    it('sends notification with title and body from API response', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({
                json: () => Promise.resolve({ title: 'Special Offer', body: 'Get 20% off today!' }),
            })
        );
        await sendSmartNotification('promo');
        expect(window.Notification).toHaveBeenCalledWith('Special Offer', expect.objectContaining({
            body: 'Get 20% off today!',
        }));
    });

    it('uses fallback title "Amogha Cafe" when API response has no title', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({
                json: () => Promise.resolve({ body: 'Check us out!' }),
            })
        );
        await sendSmartNotification('general');
        expect(window.Notification).toHaveBeenCalledWith('Amogha Cafe', expect.objectContaining({
            body: 'Check us out!',
        }));
    });

    it('uses fallback body when API response has no body', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({
                json: () => Promise.resolve({ title: 'Amogha Cafe' }),
            })
        );
        await sendSmartNotification('general');
        expect(window.Notification).toHaveBeenCalledWith('Amogha Cafe', expect.objectContaining({
            body: 'Something delicious awaits!',
        }));
    });

    // 18. sendSmartNotification — handles fetch error gracefully
    it('does not throw when fetch rejects', async () => {
        global.fetch = vi.fn(() => Promise.reject(new Error('network error')));
        await expect(sendSmartNotification('general')).resolves.not.toThrow();
    });

    it('sends fallback notification when fetch rejects', async () => {
        global.fetch = vi.fn(() => Promise.reject(new Error('network error')));
        await sendSmartNotification('general');
        expect(window.Notification).toHaveBeenCalledWith(
            'Amogha Cafe',
            expect.objectContaining({ body: 'We have something delicious waiting for you!' })
        );
    });

    it('sends fallback notification when fetch response parsing fails', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({
                json: () => Promise.reject(new Error('parse error')),
            })
        );
        await sendSmartNotification('general');
        expect(window.Notification).toHaveBeenCalledWith(
            'Amogha Cafe',
            expect.objectContaining({ body: 'We have something delicious waiting for you!' })
        );
    });
});

// ---------------------------------------------------------------------------
// 20. window globals are set
// ---------------------------------------------------------------------------
describe('window globals', () => {
    it('exposes enableNotifications on window', () => {
        expect(typeof window.enableNotifications).toBe('function');
    });

    it('exposes dismissNotifBanner on window', () => {
        expect(typeof window.dismissNotifBanner).toBe('function');
    });

    it('exposes sendPushNotification on window', () => {
        expect(typeof window.sendPushNotification).toBe('function');
    });

    it('exposes initFCM on window', () => {
        expect(typeof window.initFCM).toBe('function');
    });

    it('exposes sendSmartNotification on window', () => {
        expect(typeof window.sendSmartNotification).toBe('function');
    });

    it('window.enableNotifications is the same function as the named export', () => {
        expect(window.enableNotifications).toBe(enableNotifications);
    });

    it('window.dismissNotifBanner is the same function as the named export', () => {
        expect(window.dismissNotifBanner).toBe(dismissNotifBanner);
    });

    it('window.sendPushNotification is the same function as the named export', () => {
        expect(window.sendPushNotification).toBe(sendPushNotification);
    });

    it('window.initFCM is the same function as the named export', () => {
        expect(window.initFCM).toBe(initFCM);
    });

    it('window.sendSmartNotification is the same function as the named export', () => {
        expect(window.sendSmartNotification).toBe(sendSmartNotification);
    });
});

// ---------------------------------------------------------------------------
// Branch coverage: sendSmartNotification — cached order history parsing (line 125)
// ---------------------------------------------------------------------------
describe('sendSmartNotification — cached order history (line 125)', () => {
    beforeEach(() => {
        window.Notification.permission = 'granted';
        localStorage.setItem('amoghaUser', JSON.stringify({ phone: '9999999999', name: 'Test' }));
    });

    it('sends order history from localStorage amoghaMyOrders when cached', async () => {
        const orders = [
            { data: { items: ['Biryani'], total: 249 } },
            { data: { items: ['Naan'], total: 40 } },
        ];
        localStorage.setItem('amoghaMyOrders', JSON.stringify(orders));

        global.fetch = vi.fn(() =>
            Promise.resolve({
                json: () => Promise.resolve({ title: 'Welcome back', body: 'Try biryani again!' }),
            })
        );
        await sendSmartNotification('returning-user');
        const body = JSON.parse(global.fetch.mock.calls[0][1].body);
        expect(body.orderHistory).toHaveLength(2);
        expect(body.orderHistory[0].items).toContain('Biryani');
    });

    it('sends empty orderHistory when amoghaMyOrders is not in localStorage', async () => {
        localStorage.removeItem('amoghaMyOrders');
        global.fetch = vi.fn(() =>
            Promise.resolve({
                json: () => Promise.resolve({ title: 'Hi', body: 'Welcome!' }),
            })
        );
        await sendSmartNotification('general');
        const body = JSON.parse(global.fetch.mock.calls[0][1].body);
        expect(body.orderHistory).toEqual([]);
    });

    it('sends empty orderHistory when amoghaMyOrders is invalid JSON', async () => {
        localStorage.setItem('amoghaMyOrders', 'not-json');
        global.fetch = vi.fn(() =>
            Promise.resolve({
                json: () => Promise.resolve({ title: 'Hi', body: 'Welcome!' }),
            })
        );
        await sendSmartNotification('general');
        const body = JSON.parse(global.fetch.mock.calls[0][1].body);
        expect(body.orderHistory).toEqual([]);
    });

    it('limits orderHistory to at most 5 entries', async () => {
        const orders = Array.from({ length: 10 }, (_, i) => ({
            data: { items: [`Item${i}`], total: i * 100 },
        }));
        localStorage.setItem('amoghaMyOrders', JSON.stringify(orders));

        global.fetch = vi.fn(() =>
            Promise.resolve({
                json: () => Promise.resolve({ title: 'Hi', body: 'Order again!' }),
            })
        );
        await sendSmartNotification('general');
        const body = JSON.parse(global.fetch.mock.calls[0][1].body);
        expect(body.orderHistory.length).toBeLessThanOrEqual(5);
    });

    it('handles amoghaUser parsing failure gracefully (returns early)', async () => {
        localStorage.setItem('amoghaUser', 'broken-json');
        global.fetch = vi.fn();
        await sendSmartNotification('general');
        // user will be null due to JSON.parse failure, should return early
        expect(global.fetch).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// 21. initFCM — getToken resolves with truthy token → saveFCMToken called
// ---------------------------------------------------------------------------
describe('initFCM — saveFCMToken via getToken', () => {
    it('saves FCM token to localStorage when getToken resolves with a token', async () => {
        const onMessageMock = vi.fn();
        const getTokenMock = vi.fn(() => Promise.resolve('mock-fcm-token-123'));
        const messagingMock = { getToken: getTokenMock, onMessage: onMessageMock };
        global.firebase = { messaging: vi.fn(() => messagingMock) };

        initFCM();
        // Flush promise queue so getToken .then() runs
        await new Promise((r) => setTimeout(r, 0));

        expect(safeSetItem).toHaveBeenCalledWith('amoghaFcmToken', 'mock-fcm-token-123');
    });

    it('calls db.collection.doc.update when user exists in localStorage and db is available', async () => {
        const updateMock = vi.fn(() => Promise.resolve());
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({ update: updateMock })),
            })),
        };
        localStorage.setItem('amoghaUser', JSON.stringify({ phone: '9876543210', name: 'Test' }));

        const onMessageMock = vi.fn();
        const getTokenMock = vi.fn(() => Promise.resolve('fcm-token-xyz'));
        const messagingMock = { getToken: getTokenMock, onMessage: onMessageMock };
        global.firebase = { messaging: vi.fn(() => messagingMock) };

        initFCM();
        await new Promise((r) => setTimeout(r, 0));

        expect(window.db.collection).toHaveBeenCalledWith('users');
        expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
            fcmToken: 'fcm-token-xyz',
        }));
    });

    it('still saves to localStorage even when db update fails', async () => {
        const updateMock = vi.fn(() => Promise.reject(new Error('update failed')));
        window.db = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({ update: updateMock })),
            })),
        };
        localStorage.setItem('amoghaUser', JSON.stringify({ phone: '9876543210', name: 'Test' }));

        const onMessageMock = vi.fn();
        const getTokenMock = vi.fn(() => Promise.resolve('fcm-token-abc'));
        const messagingMock = { getToken: getTokenMock, onMessage: onMessageMock };
        global.firebase = { messaging: vi.fn(() => messagingMock) };

        initFCM();
        await new Promise((r) => setTimeout(r, 0));

        expect(safeSetItem).toHaveBeenCalledWith('amoghaFcmToken', 'fcm-token-abc');
    });

    it('saves token to localStorage even without user or db', async () => {
        localStorage.removeItem('amoghaUser');
        delete window.db;

        const onMessageMock = vi.fn();
        const getTokenMock = vi.fn(() => Promise.resolve('fcm-token-nouser'));
        const messagingMock = { getToken: getTokenMock, onMessage: onMessageMock };
        global.firebase = { messaging: vi.fn(() => messagingMock) };

        initFCM();
        await new Promise((r) => setTimeout(r, 0));

        expect(safeSetItem).toHaveBeenCalledWith('amoghaFcmToken', 'fcm-token-nouser');
    });
});

// ---------------------------------------------------------------------------
// 22. initFCM — onMessage callback fires (foreground FCM message)
// ---------------------------------------------------------------------------
describe('initFCM — onMessage foreground handler', () => {
    it('calls sendPushNotification and showAuthToast when foreground message arrives', async () => {
        let onMessageCallback = null;
        const onMessageMock = vi.fn((cb) => { onMessageCallback = cb; });
        const getTokenMock = vi.fn(() => Promise.resolve(null));
        const messagingMock = { getToken: getTokenMock, onMessage: onMessageMock };
        global.firebase = { messaging: vi.fn(() => messagingMock) };

        window.Notification.permission = 'granted';
        initFCM();

        expect(onMessageMock).toHaveBeenCalled();
        expect(typeof onMessageCallback).toBe('function');

        // Simulate a foreground message with notification payload
        onMessageCallback({
            notification: { title: 'Order Ready', body: 'Your biryani is done!' },
        });

        expect(window.Notification).toHaveBeenCalledWith('Order Ready', expect.objectContaining({
            body: 'Your biryani is done!',
        }));
        expect(showAuthToast).toHaveBeenCalledWith('Your biryani is done!');
    });

    it('uses fallback title and body when notification payload is missing', async () => {
        let onMessageCallback = null;
        const onMessageMock = vi.fn((cb) => { onMessageCallback = cb; });
        const getTokenMock = vi.fn(() => Promise.resolve(null));
        const messagingMock = { getToken: getTokenMock, onMessage: onMessageMock };
        global.firebase = { messaging: vi.fn(() => messagingMock) };

        window.Notification.permission = 'granted';
        initFCM();

        // Simulate message without notification field
        onMessageCallback({});

        expect(window.Notification).toHaveBeenCalledWith('Amogha Cafe', expect.objectContaining({
            body: '',
        }));
        // When body is empty, showAuthToast receives title
        expect(showAuthToast).toHaveBeenCalledWith('Amogha Cafe');
    });
});
