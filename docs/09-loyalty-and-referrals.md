# Loyalty Points & Referral Program

**File:** `src/modules/loyalty.js`, `src/modules/features.js`

---

## Loyalty Program

### Earning Points

- **1 point earned per ₹10 spent** on every order
- Points are awarded automatically after a successful payment
- Points are stored in Firestore `users` collection under the customer's UID

### Loyalty Tiers

| Tier | Minimum Points | Icon | Color |
|------|---------------|------|-------|
| Bronze | 0 | 🥉 | Copper |
| Silver | 500 | 🥈 | Silver |
| Gold | 1,000 | 🥇 | Gold |

Tier is calculated live from current point balance — it updates automatically as points accumulate.

### Displaying Points

When a customer is signed in, the **Loyalty Widget** appears in the top navigation bar:
- Shows tier icon + current point balance
- Clicking it opens the **Loyalty Modal**

### Loyalty Modal

| Section | Content |
|---------|---------|
| Current tier & icon | Bronze / Silver / Gold with visual badge |
| Point balance | e.g. "650 points" |
| Progress bar | Shows progress to next tier |
| Points to next tier | e.g. "350 points to Gold" |
| Points history | Recent earn events (order ID, points, date) |
| Redemption info | How to use points (future feature placeholder) |

---

## Referral Program

### How It Works

1. A signed-in customer generates their unique referral link from their profile / loyalty modal
2. They share the link with friends
3. When a new customer signs up using the referral link, **both** get a credit:
   - **Referrer:** Loyalty points bonus
   - **New customer:** Discount on first order (or points bonus)

### Referral Data

Stored in Firestore `referrals` collection:

```json
{
  "referrerId": "uid of the person who shared",
  "referredId": "uid of the new signup",
  "createdAt": "timestamp",
  "credited": true
}
```

### Referral Link Format

```
https://amoghahotels.com/?ref=USER_UID
```

When the new user signs up, the `ref` parameter is read from the URL and the referral is recorded.

---

## Happy Hours (Automatic Discounts)

Happy Hours are not part of the loyalty program but are a related automatic discount system.

| Window | Days | Discount | Applies To |
|--------|------|----------|------------|
| 2:00 PM – 5:00 PM | Mon–Fri | 15% off | Beverages only |
| 10:00 PM – 11:00 PM | Every day | 20% off | All items |

- Discount is calculated automatically at checkout if the current time falls within a window
- A banner appears in the menu section and cart announcing the active deal
- No coupon code needed
