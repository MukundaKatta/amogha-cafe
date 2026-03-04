# POS Terminal

**URL:** https://amogha-cafe.web.app/pos/
**File:** `pos/index.html` (self-contained, no build step)

A staff-facing Point-of-Sale terminal for fast counter-side order entry. Staff log in with a PIN, tap items, and submit orders directly to Firestore — no customer self-service needed.

> **Difference from Kiosk:** The kiosk (`/kiosk/`) is for customer self-ordering. The POS (`/pos/`) is operated by staff who take orders on behalf of customers (walk-in counter, phone orders, etc.).

---

## Access

- Open `/pos/` (or `/pos/?shop=teashop` to pre-select a shop)
- Enter the 6-digit admin PIN for the shop
- PIN is validated against all shops' `adminPin` field in Firestore `shops` collection
- Matching shop is auto-selected — no manual shop selection needed

---

## Layout

### Tablet / Desktop (>640px) — three-column

```
[ Categories ] [ Menu Grid + Search ] [ Order Cart ]
   110px wide      flex (fills width)    320px wide
```

### Left — Categories
- Vertical list of all menu categories for the active shop
- Click to filter the menu grid
- Active category highlighted in gold

### Center — Menu Grid + Search
- Search bar at top
- 3-column card grid with item name and price (2-column on narrow screens)
- Click a card to add one unit to the cart
- Cards show running qty badge when in cart

### Right — Order Cart
- Line items with +/- quantity controls and remove (×) button
- Subtotal auto-calculated
- **Phone** field — triggers customer CRM lookup on entry (see below)
- **Customer Name** field — auto-filled from CRM; editable
- **Table Number** field (optional)
- **Payment method** selector: Cash / UPI / Card
- **Place Order** button → saves to Firestore, shows bill overlay
- **Clear** button empties the cart
- Footer (customer fields, payment, total, Place Order) pinned to bottom; hides when cart is empty

### Mobile (≤640px) — full-width menu + bottom drawer cart

- Cart column is hidden; menu fills the full screen
- When items are added, a gold **"View Cart"** bar slides up from the bottom showing item count and total
- Tapping the bar opens the cart as a **full-screen drawer** that slides up
- The drawer has an **×** close button to slide it back down
- Clearing the cart hides the bar and closes the drawer automatically

---

## Customer CRM Lookup

When staff enter a phone number in the cart:

1. After 10 digits, the POS queries `users/{phone}` in Firestore
2. If found (**returning customer**):
   - Name is auto-filled
   - A gold badge shows: `⭐ <name> · <N> pts`
   - Loyalty points balance is loaded for redeem flow (see below)
3. If not found (**new customer**):
   - Staff enter the name manually
   - On order placement, a new `users/{phone}` document is created with `name`, `phone`, `createdAt`, `visits: 1`, `totalSpent`, `loyaltyPoints`

The customer's `totalSpent`, `visits`, and `loyaltyPoints` are updated automatically after every POS order.

---

## Loyalty Points in POS

### Earning
- 100 points are earned for every ₹2,000 spent (rate: 0.05 pts/₹)
- `pointsEarned` is calculated at order placement and saved to the order doc
- `loyaltyPoints` on the user doc is incremented by `pointsEarned`

### Redeeming
- When a returning customer has ≥ 100 points and subtotal ≥ ₹250:
  - A **"Redeem 100 pts → ₹100 off"** button appears in the cart
  - Tapping it applies a ₹100 discount and marks the order `pointsRedeemed: true`
  - A cancel tag appears to undo redemption before placing the order
- On order placement, if redeemed: 100 points are deducted from the user doc

### Points on Printed Bill
- Printed bills show a loyalty footer:
  - Current balance after the transaction
  - Points earned this visit
  - Points needed to reach the next 100-point reward
  - URL to the loyalty balance check page

### Customer-Facing Balance Page
- URL: `https://amogha-cafe.web.app/loyalty/`
- Customer enters their phone number → sees balance, progress bar, stats (visits, total spent, last visit)
- Also accessible via `?phone=XXXXXXXXXX` URL param (linked from WhatsApp bill)
- File: `loyalty/index.html`

---

## Token Numbers

Every order placed from the POS gets a sequential **daily token number** (T1, T2, T3 …).

- Tokens reset to T1 at midnight (keyed by date in `localStorage`)
- Token is printed prominently at the top of the KOT (Kitchen Order Ticket)
- Allows kitchen to call out orders in sequence regardless of Firestore order IDs

---

## KOT Printing (Kitchen Order Ticket)

A KOT is automatically printed 300ms after order placement (non-blocking — bill screen appears first):

- Prints to the configured kitchen thermal printer
- Shows: Token number (large), order ID, customer name, table, items with quantities
- Uses the same `doPrint()` mechanism as the bill

---

## Bill Overlay & Printing

After placing an order, a bill overlay slides up:

| Element | Detail |
|---------|--------|
| Token number | Large `T{n}` display |
| Order ID | Last 6 chars uppercase |
| Itemised list | Qty × Name → Price |
| Subtotal, discount, total | With loyalty discount if redeemed |
| Payment method | Cash / UPI / Card |
| Loyalty footer | Balance, earned pts, URL |
| Fortune quote | Unique motivational/fun phrase (see below) |
| **Print Bill** | Thermal-optimised via `window.print()` |
| **Send WhatsApp** | Opens WhatsApp with pre-filled bill |
| **New Order** | Clears cart and closes overlay |

### Thermal Print CSS
- `@media print` hides all UI except the bill area
- 80 mm paper width (300 px)
- Monospace font, dotted dividers
- Prints cleanly on standard 80 mm thermal receipt printers
- `afterprint` event resets iPad/iOS viewport so layout doesn't shift after print dialog closes

---

## WhatsApp Bill

The **Send WhatsApp** button opens a pre-formatted bill in WhatsApp:

- **Desktop:** opens a small 480×700 px popup window (so cashier stays on POS screen)
- **Mobile / Tablet:** opens WhatsApp app (or web) full-screen

Bill format uses WhatsApp markdown:
- `*bold*` for totals and headers
- `---` dividers
- Emoji section markers (🧾 🍽️ 💳 ⭐ etc.)
- Includes loyalty balance and `/loyalty/?phone=...` link
- If phone was entered after ordering (e.g. collected at payment time), the order in Firestore is back-patched with the phone number

---

## Fortune Cookie Quotes

Every bill (print and WhatsApp) ends with a unique motivational phrase generated at runtime using a template engine:

- Template slots: 10 openers × 13 traits × 10 verbs × 15 goods × 8 times × 10 closers
- **15 million+ unique combinations** — practically never repeats
- Examples: *"Your adventurous spirit draws greatness closer today."*

---

## Recent Orders Panel

A slide-in panel (top-right toggle) shows the last 30 orders:

- Filter tabs: **All / POS / Today / Pending**
- Each order card shows: ID, time, customer, items summary, total, payment, status badge
- **🖨 Reprint** button — reopens the bill overlay for any past order
- **🚫 Void** button — appears on all non-voided, non-cancelled orders

### Voiding an Order

1. Staff taps **🚫 Void** on an order card
2. Confirmation dialog shows order ID and total
3. On confirm:
   - Firestore order doc: `status` → `"voided"`, `voidedAt` timestamp added
   - Loyalty points reversed: earned points deducted, redeemed points restored to customer account
   - Order card updates to show **Voided** status badge (dark red)
   - Admin analytics automatically exclude voided orders from revenue/count totals

---

## Order Placement — Firestore Schema

```json
{
  "shopId": "amogha",
  "orderType": "pos",
  "status": "pending",
  "items": [{"name": "Masala Dosa", "qty": 2, "price": 80}],
  "total": 160,
  "customer": "Ravi",
  "phone": "9121004999",
  "tableNumber": "3",
  "payment": "Cash",
  "tokenNumber": 5,
  "pointsEarned": 8,
  "pointsRedeemed": false,
  "discount": 0,
  "createdAt": "2026-03-04T10:30:00.000Z"
}
```

For voided orders, additionally:
```json
{
  "status": "voided",
  "voidedAt": "2026-03-04T10:45:00.000Z"
}
```

---

## Firestore Collections Used

| Collection | Usage |
|------------|-------|
| shops | Load shop config and validate admin PIN on login |
| menu | Load menu items filtered by `shopId` and `available: true` |
| orders | Write placed orders; update status on void |
| users | CRM lookup; create/update on order placement; adjust loyalty points |

---

## URL Parameters

| Param | Example | Effect |
|-------|---------|--------|
| `shop` | `?shop=teashop` | Pre-selects the shop on the PIN screen (still requires correct PIN) |

---

## Intended Setup

- Staff-facing tablet or PC at the counter
- Bookmark `/pos/` as a browser home page or PWA shortcut
- Use a different device from the customer kiosk
- Orders placed via POS appear in the Admin → Orders panel and Kitchen Display System alongside kiosk/online orders
