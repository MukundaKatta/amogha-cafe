# Subscription Meal Plans

**File:** `src/modules/subscriptions.js`

---

## Overview

Customers can subscribe to recurring meal plans with weekly deliveries. The admin creates plan templates, and customers browse and subscribe from the main page. A Cloud Function handles automatic daily order creation for active subscriptions.

---

## Customer Flow

### Browse Plans
1. Customer clicks the "Meal Plans" button on the main page
2. `openSubscriptionModal()` opens a modal displaying available plans
3. Plans are loaded from Firestore `subscriptionPlans` collection

### Subscribe
1. Customer selects a plan and clicks "Subscribe"
2. `subscribeToPlan(planId)` creates a subscription document in Firestore
3. Subscription starts immediately with `status: 'active'`

### Cancel
- Customer can cancel via `cancelSubscription()`
- Sets `status: 'cancelled'` on the subscription document

---

## Default Plans

Three pre-configured plans (loaded from Firestore, or defaults if collection is empty):

| Plan | Meals/Week | Price/Month | Description |
|------|-----------|-------------|-------------|
| Lunch Basic | 5 | ₹2,499 | Weekday lunch delivery — 1 main + 1 side |
| Lunch Premium | 5 | ₹3,999 | Weekday lunch — 1 main + 2 sides + dessert |
| All Meals | 7 | ₹7,999 | Daily lunch & dinner delivery |

---

## Firestore Collections

### subscriptionPlans (admin-managed)

```json
{
  "name": "Lunch Basic",
  "mealsPerWeek": 5,
  "pricePerMonth": 2499,
  "items": ["Chicken Dum Biryani", "Raita"],
  "description": "Weekday lunch delivery — 1 main + 1 side",
  "active": true
}
```

### subscriptions (customer records)

```json
{
  "planId": "lunch-basic",
  "planName": "Lunch Basic",
  "userPhone": "9876543210",
  "userName": "Rahul Kumar",
  "status": "active",
  "startDate": "2026-03-01",
  "nextDeliveryDate": "2026-03-03",
  "pricePerMonth": 2499,
  "createdAt": "timestamp"
}
```

### Status Values
| Status | Meaning |
|--------|---------|
| `active` | Subscription is active, orders will be auto-created |
| `paused` | Temporarily paused (future feature) |
| `cancelled` | Customer cancelled, no more orders |

---

## Firestore Rules

```
match /subscriptionPlans/{planId} {
  allow read: if true;
  allow write: if false;  // Admin-only via Console
}

match /subscriptions/{subId} {
  allow read: if true;
  allow create: if true;
  allow update: if true;
  allow delete: if false;
}
```

---

## Admin Management

Subscription plans are managed via the Firebase Console or Admin SDK. The admin panel's Settings section can be extended to include a plan editor in the future.

---

## Functions

| Function | Description |
|----------|-------------|
| `openSubscriptionModal()` | Opens the subscription plans browser modal |
| `closeSubscriptionModal()` | Closes the modal |
| `subscribeToPlan(planId)` | Creates a new active subscription for the logged-in user |
| `cancelSubscription()` | Cancels the user's active subscription |
