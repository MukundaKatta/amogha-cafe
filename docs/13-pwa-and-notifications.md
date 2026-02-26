# PWA, Push Notifications & Caching

**Files:** `src/modules/notifications.js`, `src/modules/ui.js`, `sw.js`, `manifest.json`

---

## Progressive Web App (PWA)

The site is a fully installable PWA.

### Install Prompt

- On supported browsers (Chrome/Edge on Android, Safari on iOS), an "Add to Home Screen" prompt appears
- The app installs like a native app — standalone window, no browser chrome
- App icon and splash screen come from `manifest.json`

### manifest.json

| Field | Value |
|-------|-------|
| name | Amogha Cafe & Restaurant |
| short_name | Amogha Cafe |
| theme_color | `#8B1A1A` (restaurant red) |
| background_color | `#FFF8F0` |
| display | standalone |
| start_url | / |
| icons | Multiple sizes (192×192, 512×512) |

---

## Service Worker (Caching Strategy)

File: `sw.js`

### Cache Strategy by Resource Type

| Resource | Strategy | Reason |
|----------|----------|--------|
| HTML pages | Network-first | Always get latest content |
| CSS & JS | Network-first | Always get latest styles/logic |
| Images (.jpg, .png, .webp, etc.) | Cache-first | Images rarely change; fast load |
| Google Fonts | Cache-first | Stable external resource |

### Cache Names

- `amogha-cache-v1` — static assets
- Cache is versioned — incrementing the version in `sw.js` forces a refresh on next visit

### Offline Behavior

- If the network is unavailable:
  - Images load from cache instantly
  - HTML/CSS/JS fall back to cached version if network fails
  - Firestore itself has offline persistence built in (queued writes sync when back online)

---

## Firestore Client-Side Cache (`cachedGet`)

**File:** `src/modules/menu.js`

A custom caching layer on top of Firestore reads using `localStorage`.

### How It Works

```
cachedGet(collectionName, ttlMinutes)
  1. Check localStorage for cached data + timestamp
  2. If cache is fresh (within TTL) → return cached data immediately
  3. If stale or missing → fetch from Firestore → store in localStorage with timestamp
```

### TTL by Collection

| Collection | TTL | Reason |
|------------|-----|--------|
| menu | 10 min | Changes occasionally |
| addons | 30 min | Rarely changes |
| specials | 5 min | Updated daily |
| heroSlides | 30 min | Rarely changes |
| testimonials | 60 min | Very rarely changes |

### Impact

- ~90% reduction in Firestore reads on repeat visits
- Pages load menu instantly on return visits without waiting for network
- Stays within Firestore free tier limits easily

---

## Push Notifications

**File:** `src/modules/notifications.js`

### Order Status Notifications

When a customer places an order and grants notification permission:
- A Firestore listener watches their order document
- When the order status changes (Pending → Preparing → Ready → Delivered), a browser push notification fires:
  - "Your order is being prepared! 🍳"
  - "Your order is ready! 🎉"
  - "Order delivered! Enjoy your meal 🙏"

### Permission Request

- Requested after a successful order placement
- Only requested once — browser remembers the decision
- Falls back silently if denied (no error shown)

### Implementation

Uses the Web Notifications API (no FCM/server-side push required):
```js
new Notification('Order Update', {
  body: 'Your order is being prepared!',
  icon: '/icons/icon-192.png'
});
```

Notifications only fire while the tab is open (no background push without a service worker push subscription + server).

---

## Dark Mode

**File:** `src/modules/ui.js`

- Toggle via 🌙/☀️ button in the header
- Preference saved to `localStorage` (`theme: 'dark' | 'light'`)
- Restored on next visit
- All UI elements — cards, modals, inputs, KDS, admin — support dark mode via CSS `body.dark-mode` class

---

## Language Switcher

- Three languages: English (EN), Hindi (हि), Telugu (తె)
- Preference saved to `localStorage`
- All navigation labels, button text, and form labels switch language
- Menu item names and descriptions remain in their original language (as stored in Firestore)
