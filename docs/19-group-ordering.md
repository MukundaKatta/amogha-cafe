# Group Ordering

**File:** `src/modules/group.js`

---

## Overview

Group ordering lets multiple people contribute items to a shared cart. One person creates the group cart, shares a link, and others join to add their items. The host locks the cart and checks out when everyone is ready.

---

## Flow

### 1. Create Group Cart
1. Logged-in user clicks the "Group Order" button on the main page
2. `createGroupCart()` creates a document in Firestore `groupCarts` collection
3. A shareable URL is generated: `https://amoghahotels.com/?group=CART_ID`
4. User can copy the link via `copyGroupLink()` (clipboard + toast notification)

### 2. Join Group Cart
1. Another user opens the shared URL with `?group=CART_ID`
2. `initGroupOrdering()` detects the URL parameter on page load
3. `joinGroupCart(cartId)` adds the user as a participant in the Firestore document
4. Real-time Firestore listener syncs the shared cart across all participants

### 3. Add Items
- Each participant can add items to the group cart via `addToGroupCart()`
- Items are tagged with the participant's name/phone
- All participants see updates in real-time

### 4. Lock & Checkout
- Only the host (creator) can lock the cart via `lockGroupCart()`
- Once locked, no more items can be added
- Host proceeds to normal checkout flow with the combined cart

---

## Firestore Document

Collection: `groupCarts/{cartId}`

```json
{
  "hostPhone": "9876543210",
  "hostName": "Rahul",
  "participants": [
    { "phone": "9876543210", "name": "Rahul" },
    { "phone": "9876543211", "name": "Priya" }
  ],
  "items": [
    { "name": "Chicken Biryani", "price": 249, "qty": 1, "addedBy": "Rahul" },
    { "name": "Butter Naan", "price": 40, "qty": 2, "addedBy": "Priya" }
  ],
  "status": "open",
  "createdAt": "timestamp",
  "expiresAt": "timestamp (24h from creation)"
}
```

### Status Values
| Status | Meaning |
|--------|---------|
| `open` | Participants can add items |
| `locked` | Host locked the cart, ready for checkout |
| `ordered` | Checkout completed |

---

## Firestore Rules

```
match /groupCarts/{cartId} {
  allow read: if true;
  allow create: if true;
  allow update: if true;
  allow delete: if false;
}
```

---

## Functions

| Function | Description |
|----------|-------------|
| `createGroupCart()` | Creates new group cart document, copies share link |
| `joinGroupCart(cartId)` | Adds current user as participant |
| `copyGroupLink()` | Copies the share URL to clipboard |
| `addToGroupCart()` | Adds current cart items to the group cart |
| `lockGroupCart()` | Host-only: locks the cart for checkout |
| `initGroupOrdering()` | Checks URL for `?group=` parameter on page load |
