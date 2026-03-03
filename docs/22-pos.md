# POS Terminal

**URL:** https://amoghahotels.com/pos/
**File:** `pos/index.html` (~self-contained, no build step)

A staff-facing Point-of-Sale terminal for fast counter-side order entry. Staff log in with a PIN, tap items, and submit orders directly to Firestore — no customer self-service needed.

> **Difference from Kiosk:** The kiosk (`/kiosk/`) is for customer self-ordering. The POS (`/pos/`) is operated by staff who take orders on behalf of customers (walk-in counter, phone orders, etc.).

---

## Access

- Open `/pos/` (or `/pos/?shop=teashop` to pre-select a shop)
- Enter the 6-digit admin PIN for the shop
- PIN is validated against all shops' `adminPin` field in Firestore `shops` collection
- Matching shop is auto-selected — no manual shop selection needed

---

## Layout (three-column)

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
- 3-column card grid with item name and price
- Click a card to add one unit to the cart
- Cards show running qty badge when in cart

### Right — Order Cart
- Line items with +/- quantity controls and remove (×) button
- Subtotal auto-calculated
- **Customer Name** field (optional)
- **Table Number** field (optional)
- **Payment method** selector: Cash / UPI / Card
- **Place Order** button → saves to Firestore, shows bill overlay
- **Clear** button empties the cart

---

## Order Placement

Orders are saved to the `orders` Firestore collection with:

```json
{
  "shopId": "amogha",
  "orderType": "pos",
  "status": "pos-pending",
  "items": [...],
  "total": 350,
  "customerName": "Ravi",
  "tableNo": "3",
  "paymentMethod": "Cash",
  "createdAt": "<timestamp>"
}
```

---

## Bill Overlay

After placing an order, a bill overlay slides up with:
- Order number
- Itemised list with quantities and prices
- Subtotal
- Customer name and table number (if provided)
- Payment method
- **Print Bill** button — triggers `window.print()` with thermal-optimised CSS
- **New Order** button — clears cart and closes overlay

### Thermal Print CSS
- `@media print` hides all UI except the bill
- 80mm paper width (300px)
- Monospace font, dotted dividers
- Prints cleanly on standard 80mm thermal receipt printers

---

## Firestore Collections Used

| Collection | Usage |
|------------|-------|
| shops | Load shop config and validate admin PIN on login |
| menu | Load menu items filtered by `shopId` and `available: true` |
| orders | Write placed orders with `orderType: 'pos'` |

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
