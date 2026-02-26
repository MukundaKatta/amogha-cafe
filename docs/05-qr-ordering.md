# QR Dine-In Ordering

**URL:** https://amoghahotels.com/qr/
**File:** `qr/index.html` (1,023 lines)

A table-specific ordering page accessed by scanning a QR code placed at each table. Customers browse and order directly from their phones without needing a waiter to take their order.

---

## How It Works

1. A unique QR code is printed and placed on each table (Table 1 – Table 12)
2. QR code encodes the URL: `https://amoghahotels.com/qr/?table=3`
3. Customer scans the code → lands on the QR ordering page pre-loaded for their table number
4. Customer browses menu, adds items, and places order — it goes directly to the kitchen KDS

---

## Page Layout

Identical menu browsing experience to the main site, optimized for mobile:

| Section | Description |
|---------|-------------|
| Table badge | Prominently shows "Table 3" (or whichever table) at the top |
| Menu categories | Tabs for Starters, Mains, Biryani, etc. |
| Search | Filter items by name |
| Veg / Non-Veg filter | |
| Item cards | Same as main site — hover image, spice selector, add-ons, Add to Order |
| Cart panel | Slides in; shows running total |

---

## Ordering Flow

1. Customer adds items to cart
2. Taps "Place Order" — **no delivery address needed** (it's dine-in)
3. Optionally provides their name
4. Order is placed as **Dine-In** type, linked to their table number
5. Order appears on the KDS immediately
6. Customer can track their order status on the same page

---

## Differences from Main Site

| Feature | Main Site | QR Page |
|---------|-----------|---------|
| Order type | Delivery / Takeaway / Dine-In | Dine-In only |
| Address field | Required for Delivery | Not shown |
| Table selection | Manual | Pre-set from URL parameter |
| Payment | Razorpay / Cash / Gift Card | Cash (pay at table) by default |
| Account/Login | Optional | Optional |
| Loyalty points | Yes | Yes (if logged in) |

---

## Generating QR Codes

Each table needs its own QR code pointing to:
```
https://amoghahotels.com/qr/?table=TABLE_NUMBER
```

Example for Table 5:
```
https://amoghahotels.com/qr/?table=5
```

Use any QR code generator (e.g. qr-code-generator.com) to create, print, and laminate these for each table.

---

## Real-Time Status

After placing an order, the page shows a live status tracker (same as the tracking page) so customers know when their food is ready without asking staff.
