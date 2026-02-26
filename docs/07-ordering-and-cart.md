# Ordering & Cart

**Files:** `src/modules/cart.js`, `src/modules/menu.js`, `src/modules/features.js`

---

## Menu Loading

Menu items are fetched from Firestore `menu` collection and cached in `localStorage` with a TTL (time-to-live). This reduces Firestore reads by ~90% on repeat visits.

- **Cache key:** `menu_cache` in localStorage
- **TTL:** Refreshes automatically when stale
- **Ratings:** Item average star ratings are merged in from the `reviews` collection

---

## Adding Items to Cart

### Basic Flow
1. Customer selects a spice level (Mild / Medium / Spicy)
2. Optionally selects add-ons (e.g. Extra Cheese +₹20)
3. Clicks "Add to Order"
4. Item is appended to the in-memory cart array
5. Cart icon badge updates with count

### Smart Pairings
When certain items are added, a suggestion toast appears recommending complementary items:

| Item Added | Suggested Pairings |
|------------|-------------------|
| Chicken Dum Biryani | Raita, Mirchi ka Salan, Buttermilk |
| Butter Chicken | Butter Naan, Garlic Naan, Laccha Paratha |
| Veg Manchurian | Veg Hakka Noodles, Veg Fried Rice |
| *(and 16 more pairings)* | |

---

## Cart Panel

Opened by clicking the cart icon in the header.

### Item Controls
| Control | Action |
|---------|--------|
| + button | Increase quantity |
| − button | Decrease quantity (removes item at 0) |
| × button | Remove item entirely |

### Pricing Logic

```
Subtotal = sum of (item price × quantity) + add-on prices

Combo Discount (15%) = applied if 2+ items from different categories are in cart

Happy Hour Discount = applied automatically if within active time window:
  - Mon–Fri 2–5 PM: 15% off Beverages
  - Daily 10–11 PM: 20% off all items

Coupon Discount = applied if a valid coupon code is entered

Delivery Fee = ₹49 (waived if subtotal ≥ ₹500, or for Dine-In/Takeaway)

Grand Total = Subtotal − Combo − Happy Hour − Coupon + Delivery Fee
```

### Coupon Code Field
- Customer types a code and clicks "Apply"
- Validated against Firestore `coupons` collection
- Checks: active, not expired, min order met, uses remaining
- Discount applied and shown in price breakdown

---

## Checkout Steps

### Step 1 — Review
- Final item list with all modifiers
- Full price breakdown

### Step 2 — Details
| Field | Validation |
|-------|------------|
| Full Name | Required |
| Phone | Required, 10 digits |
| Order Type | Delivery / Takeaway / Dine-In |
| Address | Required only for Delivery |
| Special Instructions | Optional |
| Gift Card Code | Optional — redeems balance against total |

### Step 3 — Payment
See [08-payments.md](08-payments.md) for full details.

---

## After Order Placement

1. Order document created in Firestore `orders` collection
2. Order appears on KDS immediately
3. Loyalty points awarded: **1 point per ₹10 spent**
4. If a referral code was used at signup, referrer gets credit
5. Cart is cleared
6. Confetti animation plays
7. Customer is redirected to `track/?id=ORDER_ID`

---

## Cart Persistence

The cart is stored in memory only — it is **not persisted** across page refreshes. This is intentional to keep orders fresh.
