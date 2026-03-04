# Loyalty Points & Referral Program

---

## POS Loyalty System (Counter / Staff)

The POS terminal has a fully integrated loyalty earn-and-redeem flow for walk-in customers.

### Earning Points (POS)

| Spend | Points Earned |
|-------|--------------|
| ₹2,000 | 100 points |
| ₹1,000 | 50 points |
| ₹500 | 25 points |

- Rate: **100 points per ₹2,000** (0.05 pts/₹)
- Calculated automatically at order placement from the order total
- Saved as `pointsEarned` on the order doc
- Added to `loyaltyPoints` on the customer's `users/{phone}` doc

### Redeeming Points (POS)

- **100 points = ₹100 off** on any order of ₹250 or more
- Redeem button appears in the cart when the customer has ≥ 100 pts and subtotal ≥ ₹250
- On redemption, 100 points are deducted from the customer's balance
- Saved as `pointsRedeemed: true` + `discount: 100` on the order doc

### Points Reversal on Void

If a POS order is voided after placement:
- Earned points are **subtracted** from the customer's balance
- Redeemed points are **restored** to the customer's balance
- Ensures the balance is always consistent with actual completed sales

### Loyalty Balance Check Page

**URL:** `https://amogha-cafe.web.app/loyalty/`
**File:** `loyalty/index.html`

Customers can check their own balance:
- Enter phone number → shows name, points balance, progress bar, reward message
- Stats: visits, total spent, last visit date
- "How it works" panel explaining the earn/redeem rules
- Supports `?phone=XXXXXXXXXX` URL param (linked directly from WhatsApp bills)

---

## Online Ordering Loyalty (Web App)

**Files:** `src/modules/loyalty.js`, `src/modules/features.js`, `src/modules/badges.js`

### Earning Points

| Action | Points |
|--------|--------|
| Place an order | 1 point per ₹10 spent |
| Write a review | 25 points (1 per order cap) |
| Share an order (Social Sharing) | 10 points |

- Points are awarded automatically after each qualifying action
- Points are stored in Firestore `users` collection under the customer's phone

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

---

## Birthday Rewards

**File:** `src/modules/loyalty.js`

### Client-Side Birthday Banner
- On login, if the user has a `dob` field in their profile and the current month matches their birth month:
  - A gold gradient birthday banner appears at the top of the page
  - Auto-dismisses or can be closed manually
- Triggered by `checkBirthdayRewards(user)` called after sign-in

### Server-Side Birthday Coupon (Cloud Function)
- A scheduled Cloud Function (`birthdayRewards`) runs daily at 8 AM IST
- Queries all users whose `dob` matches today's MM-DD
- Auto-creates a coupon `BDAY-{phone}` with:
  - 30% discount
  - 1 use max
  - ₹200 minimum order
  - Valid for 7 days
- See [16-cloud-functions.md](16-cloud-functions.md) for details

---

## Gamification Badges

**File:** `src/modules/badges.js`

10 achievement badges that customers earn through various actions.

### Badge Definitions

| Badge | Requirement | Icon |
|-------|-------------|------|
| First Bite | Place first order | 🍽️ |
| Regular | Place 5 orders | ⭐ |
| Foodie | Place 10 orders | 🍕 |
| Super Fan | Place 25 orders | 👑 |
| Explorer | Order from all menu categories | 🗺️ |
| Streak Master | Order 3 days in a row | 🔥 |
| Big Spender | Single order over ₹1,000 | 💰 |
| Critic | Write 5 reviews | ✍️ |
| Night Owl | Place an order after 10 PM | 🦉 |
| Early Bird | Place an order before 9 AM | 🐦 |

### How It Works

1. After each order, `checkAndAwardBadges(user, order)` is called
2. Each badge definition has a check function that evaluates the user's history
3. Newly earned badges trigger:
   - Toast notification with badge icon and name
   - Confetti animation
   - Badge saved to user's Firestore document: `badges: [{badgeId, earnedAt}]`

### Badge Gallery

- Accessible from a badge icon in the navigation bar
- Modal shows all 10 badges in a grid
- Earned badges shown in full color with earned date
- Locked badges shown in grayscale with requirement description
- `openBadgeGallery()` / `closeBadgeGallery()` functions

---

## Review Rewards

**File:** `src/modules/features.js`

- "Write a Review" button shows an "Earn 25 pts" badge
- On review submission, 25 loyalty points are awarded to the user
- Limited to 1 reward per order to prevent abuse
