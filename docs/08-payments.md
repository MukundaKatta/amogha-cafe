# Payments

**File:** `src/modules/payment.js`

Three payment methods are supported: Razorpay (online), Cash on Delivery, and Gift Cards. Post-checkout features include Split Bill and Social Sharing.

---

## 1. Razorpay (Online Payment)

Handles UPI, Debit/Credit Cards, Net Banking, and Wallets.

### Flow
1. Customer selects "Pay Online" in checkout Step 3
2. Razorpay checkout modal opens (full-screen on mobile)
3. Customer completes payment via their preferred method
4. On success, Razorpay returns a `payment_id`
5. Order is saved to Firestore with `paymentId` and `paymentStatus: 'paid'`

### Configuration
The Razorpay key is set in `src/core/constants.js`:
```js
export const RAZORPAY_KEY = 'rzp_test_...';  // Replace with rzp_live_... for production
```

**To go live:**
1. Sign up at https://dashboard.razorpay.com/signup and complete KYC
2. Go to Settings → API Keys → Generate Live Key
3. Replace the key in `constants.js`
4. Run `npm run build` and deploy

### Razorpay Checkout Options Passed
| Option | Value |
|--------|-------|
| key | RAZORPAY_KEY from constants |
| amount | Grand total in paise (× 100) |
| currency | INR |
| name | AMOGHA CAFE & RESTAURANT |
| description | Order summary |
| prefill.name | Customer name from checkout form |
| prefill.contact | Customer phone from checkout form |
| theme.color | `#8B1A1A` (restaurant red) |

---

## 2. Cash on Delivery

- Available for **Delivery** order type only
- No payment processing required
- Order is saved with `paymentMethod: 'cash'` and `paymentStatus: 'pending'`
- Admin marks payment as received manually

---

## 3. Gift Cards

Gift cards are pre-issued codes stored in Firestore `giftCards` collection with a balance.

### Redemption Flow
1. Customer enters gift card code in checkout (Step 2 — Details section)
2. Code is validated: exists, has balance, not already fully redeemed
3. Gift card balance is applied to the order total
4. If balance covers the full order → order placed for free (no Razorpay needed)
5. If balance is partial → customer pays the remainder via Razorpay or Cash
6. On order placement, card's `balance` is reduced and `redeemedAt` timestamp is set

### Issuing Gift Cards
Done via the Admin Dashboard → Gift Cards panel. See [02-admin-dashboard.md](02-admin-dashboard.md).

---

## Coupon Codes

Coupons are separate from gift cards — they apply a percentage or flat discount.

### Validation Rules (checked at time of apply)
| Check | Description |
|-------|-------------|
| Code exists | Must be in Firestore `coupons` collection |
| Active | `active: true` |
| Not expired | `expiryDate` must be in the future |
| Min order met | `subtotal >= minOrder` |
| Uses remaining | `usedCount < maxUses` |

### Discount Types
| Type | Example |
|------|---------|
| Percentage | 25% off → `WELCOME25` |
| Flat amount | ₹50 off → `FLAT50` |

### After Redemption
- `usedCount` on the coupon document is incremented by 1
- Firestore rules only allow `usedCount` to be updated (no other field changes from client)

---

## Order Document in Firestore

After payment, a document is written to `orders` collection:

```json
{
  "id": "auto-generated",
  "customerId": "uid or anonymous",
  "customerName": "...",
  "customerPhone": "...",
  "orderType": "delivery | takeaway | dinein",
  "address": "...",
  "items": [
    {
      "name": "Chicken Dum Biryani",
      "price": 249,
      "quantity": 2,
      "spiceLevel": "Medium",
      "addons": ["Raita"],
      "addonPrice": 40
    }
  ],
  "subtotal": 538,
  "discount": 80.7,
  "deliveryFee": 0,
  "total": 457.3,
  "coupon": "WELCOME25",
  "giftCard": null,
  "paymentMethod": "razorpay | cash | giftcard",
  "paymentId": "pay_...",
  "paymentStatus": "paid | pending",
  "status": "pending",
  "specialInstructions": "...",
  "loyaltyPointsAwarded": 45,
  "createdAt": "timestamp",
  "splitBill": null,
  "driverLocation": null
}
```

---

## Split Bill

**File:** `src/modules/splitbill.js`

After a successful order placement, a "Split Bill" button appears in the confirmation screen.

### Flow
1. Customer clicks "Split Bill"
2. Modal opens with split options: 2, 3, 4, or custom N
3. Per-person amount calculated: `ceil(total / N)`
4. For each share, a UPI payment link is generated: `upi://pay?pa=amogha@upi&pn=Amogha+Cafe&am=AMOUNT&cu=INR&tn=Split+ORDER_ID`
5. "Share" button sends the split details via Web Share API (WhatsApp / SMS / copy link fallback)

### Data
Split bill data is stored on the order document:
```json
{
  "splitBill": {
    "count": 3,
    "perPerson": 153,
    "createdAt": "timestamp"
  }
}
```

---

## Social Sharing (Share & Earn)

**File:** `src/modules/payment.js`

After order placement, a "Share & Earn 10 pts" button appears.

### Flow
1. Customer clicks "Share & Earn"
2. Web Share API opens native share sheet (on supported browsers)
3. Fallback: opens WhatsApp with pre-filled order message + link
4. Clipboard copy fallback if neither is available
5. **10 loyalty points** are awarded for sharing (one-time per order)

### Shared Content
```
I just ordered from Amogha Cafe! Try it out: https://amoghahotels.com
```
