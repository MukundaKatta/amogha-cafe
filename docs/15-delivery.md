# Delivery Management

**URL:** https://amoghahotels.com/delivery/
**File:** `delivery/index.html` (~888 lines)

A mobile-first app for delivery drivers to accept orders, navigate to customers, and track earnings. Designed to run on a delivery partner's phone.

---

## Authentication

- Login with phone number (10 digits) + PIN (up to 6 digits)
- Validated server-side via Cloud Function `POST /api/auth/delivery-login`
- The Cloud Function checks the `deliveryPersons` collection using the Admin SDK — credentials are never exposed to client-side Firestore reads
- Firestore rules block all client reads of `deliveryPersons` (`read: false`)
- Checks: phone registered, account active, PIN matches
- Session persisted via `sessionStorage` — auto-restores on page reload
- Logout clears session and unsubscribes from all Firestore listeners

---

## Layout

- **Header:** Logo + "Amogha Delivery" title, connection status badge (green/red), driver name, logout button
- **Bottom Navigation:** 4 tabs with icons and badge counts
  - 📦 Available · 🛵 Active · 📊 Earnings · 📋 History

---

## Tabs

### 1. Available Orders

Real-time Firestore listener for orders with `status: 'ready'` and no assigned delivery person.

Each order card shows:

| Element | Description |
|---------|-------------|
| Order ID | Last 6 characters, uppercase |
| Date | Order creation time |
| Total | Gold text (₹) |
| Item count | Number of items |
| Delivery fee | ₹49 or "Free delivery" |
| Address | 📍 Customer address |
| Customer | 👤 Name, 📞 Phone |
| Accept button | "Accept Delivery" |

**Accept flow:**
1. Confirmation dialog appears
2. On confirm: updates Firestore order with `status: 'out_for_delivery'`, `deliveryPerson`, `outForDeliveryAt`
3. Auto-switches to Active tab

---

### 2. Active Delivery

Real-time listener for orders assigned to the logged-in driver with `status: 'out_for_delivery'`.

Shows a prominent green-tinted card with:
- Customer name, address, phone
- Full item breakdown (name, qty, price)
- Total amount and payment method

**Action buttons:**

| Button | Action |
|--------|--------|
| 📍 Navigate | Opens Google Maps with customer address |
| 📞 Call | Initiates phone call to customer |
| ✅ Mark as Delivered | Confirms → updates Firestore: `status: 'delivered'`, `deliveredAt` timestamp |

---

### 3. Earnings

Analytics dashboard calculated from delivery history:

| Card | Description |
|------|-------------|
| This Month | Delivery count + total earned (full width) |
| Today | Delivery count + earnings |
| This Week | Delivery count + earnings |
| All Time | Lifetime delivery count + total earnings (full width) |

Earnings = sum of `deliveryFee` per order (default ₹49 per delivery).

---

### 4. History

Complete list of delivered orders, sorted newest first.

Each row shows:
- Date delivered (e.g. "15 Feb")
- Order ID
- Customer name
- Address (truncated)
- Order total
- Delivery fee earned (green text)

---

## Live GPS Tracking

When a driver accepts an order, GPS tracking starts automatically.

### How It Works

1. **Start:** `startGPSTracking(orderId)` is called when the driver accepts a delivery
2. **Geolocation:** Uses `navigator.geolocation.watchPosition()` with high accuracy
3. **Throttling:** GPS updates are sent to Firestore every **15 seconds** (not on every position change) to limit Firestore writes
4. **Data:** Writes `driverLocation: { lat, lng, timestamp }` to `orders/{orderId}`
5. **Stop:** `stopGPSTracking()` is called when the driver marks as delivered or logs out

### Firestore Update

```json
{
  "driverLocation": {
    "lat": 17.4947,
    "lng": 78.3996,
    "timestamp": "2026-03-01T10:30:00Z"
  }
}
```

### Customer Impact

The customer's tracking page ([04-order-tracking.md](04-order-tracking.md)) shows a live map with the driver's position and distance when `driverLocation` is present.

---

## Real-Time Features

- **Available orders:** Live Firestore `onSnapshot` listener — new ready orders appear instantly
- **Active delivery:** Live listener — status changes reflected immediately
- **GPS tracking:** Background position updates to Firestore while delivering
- **Connection badge:** Monitors `window.online/offline` events — green glow when online, red when offline

---

## Integrations

| Service | Usage |
|---------|-------|
| Cloud Functions API | `POST /api/auth/delivery-login` (authentication) |
| Firebase Firestore | `orders` (read/write via realtime listeners) |
| Google Maps | `maps.google.com/?q={address}` for navigation |
| Phone | `tel:{number}` for customer calls |

---

## Visual Design

- Dark theme with gold (#D4A017) accents — matches restaurant branding
- Poppins + Playfair Display fonts
- Glassmorphic header and bottom nav (backdrop blur)
- Green gradient on active delivery card
- Toast notifications for success (green) and error (red)
- Button press animations (scale 0.97-0.98)
- Safe area insets for notched devices

---

## Security

- **Server-side authentication** — credentials validated via Cloud Function, not client-side Firestore reads
- **Firestore read blocked** — `deliveryPersons` collection has `allow read: if false` in security rules
- XSS protection via `escHtml()` function on all displayed user data
- Session stored in `sessionStorage` (cleared on tab close)
- Firestore rules restrict order updates to allowed fields only

---

## Intended Setup

- Delivery partner's personal phone
- Mobile-first layout (max-width 480px on desktop)
- PWA-capable meta tags for "Add to Home Screen"
- Works on Android and iOS browsers
