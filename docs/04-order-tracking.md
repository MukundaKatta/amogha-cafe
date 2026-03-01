# Order Tracking

**URL:** https://amoghahotels.com/track/
**File:** `track/index.html` (~1,383 lines)

Lets customers track the live status of their order after checkout. Customers are redirected here automatically after placing an order, or can return by bookmarking the URL.

---

## How It Works

1. After placing an order, the customer is redirected to `track/?id=ORDER_ID`
2. The page listens to the Firestore `orders` document in real time
3. Status updates made in admin or KDS are reflected instantly — no refresh needed

---

## Page Layout

### Order Status Timeline

A vertical progress tracker showing four stages:

| Stage | Meaning |
|-------|---------|
| Order Placed | Order received by the restaurant |
| Preparing | Kitchen is preparing the order |
| Ready | Food is ready for pickup / out for delivery |
| Delivered | Order completed |

The current stage is highlighted; completed stages are checked.

### Order Details Panel

| Field | Description |
|-------|-------------|
| Order ID | Unique reference number |
| Order Type | Delivery / Takeaway / Dine-In |
| Customer name | |
| Items | Full list with quantities, spice levels, add-ons |
| Special instructions | If provided |
| Payment method | Razorpay / Cash / Gift Card |
| Amount paid | Grand total |
| Estimated time | Shown while preparing |

---

## Real-Time Updates

- Uses Firestore `onSnapshot` listener — zero polling
- Status badge and timeline update live as kitchen/admin updates the order
- Sound notification plays when status advances (optional, based on browser permission)

---

## Cancelled Orders

If an order is cancelled, the tracking page shows a "Cancelled" state with a message. Customers can click to return to the menu.

---

## Not Found

If the order ID in the URL doesn't exist, a "Order not found" message is shown with a link back to the homepage.

---

## Live Delivery Map

When the order status is `out_for_delivery` and the driver is sharing GPS location, a live map appears on the tracking page.

**Technology:**
- **Leaflet.js 1.9.4** CDN with OpenStreetMap tiles (free, no API key required)
- Map card shown only when `status === 'out_for_delivery'`

**Map features:**
- Restaurant marker pin (fixed at 17.4065, 78.4772 — Hyderabad)
- Driver marker pin (updates in real-time from `orders/{id}.driverLocation`)
- **Distance display:** "Your delivery partner is X.X km away" using Haversine distance calculation
- Auto-pans to fit both markers on screen

**Data source:** The delivery driver's app sends GPS coordinates to Firestore every 15 seconds (see [15-delivery.md](15-delivery.md)). The tracking page listens via the existing `onSnapshot` listener.

---

## Prep Time Countdown

When the order is in `preparing` status:
- Shows a countdown timer: "Estimated ready in X:XX"
- Computed from `kitchenStartedAt` timestamp + max `prepTimeMinutes` across all items in the order
- Prep times are loaded from Firestore `menu` collection via `loadMenuPrepTimes()`
- Updates every second; when it reaches 0, shows "Ready any moment now!"

---

## Sharing

The tracking URL contains the order ID as a query parameter:
```
https://amoghahotels.com/track/?id=abc123
```
Customers can share this link with others to let them track the same order.
