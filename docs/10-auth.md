# Authentication

**File:** `src/modules/auth.js`

---

## Overview

Authentication is handled via **Firebase Authentication** (Email/Password). Accounts are optional — customers can browse and order without signing in, but loyalty points and order history require an account.

---

## Sign In / Sign Up Modal

Triggered by the "Sign In" button in the header.

### Sign In Tab
| Field | Notes |
|-------|-------|
| Email | Registered email |
| Password | Account password |
| Sign In button | Authenticates via Firebase Auth |
| Forgot Password | Sends a reset email via Firebase |
| Switch to Sign Up | Tab switch |

### Sign Up Tab
| Field | Notes |
|-------|-------|
| Full Name | Stored in Firestore `users` collection |
| Email | Used as Firebase Auth identifier |
| Phone Number | Stored in user profile |
| Password | Min 6 characters (Firebase default) |
| Referral Code | Optional — enter a friend's referral link code |
| Sign Up button | Creates Firebase Auth user + Firestore user doc |

---

## After Sign In

- "Sign In" button in header changes to the user's initials (e.g. "RK")
- Loyalty widget appears showing tier and points
- Checkout forms pre-fill with saved name and phone
- Order history becomes accessible

---

## Sign Out

Clicking the user initials badge in the header opens a dropdown with a **Sign Out** option. Clears the local session.

---

## User Document in Firestore

On sign up, a document is created in `users` collection:

```json
{
  "uid": "firebase auth uid",
  "name": "Customer Name",
  "email": "customer@email.com",
  "phone": "9876543210",
  "loyaltyPoints": 0,
  "tier": "Bronze",
  "referralCode": "uid (used as referral link)",
  "referredBy": "uid of referrer (if any)",
  "createdAt": "timestamp"
}
```

---

## Security Notes

- Customers can only read/write their own user document (Firestore rules enforce this)
- Admin operations use Firebase Admin SDK (via Firebase Console), not the client SDK
- No admin login is built into `admin.html` — access control is by URL obscurity; consider adding Firebase Hosting password protection or IP whitelisting for production
