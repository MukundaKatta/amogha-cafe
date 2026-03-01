# Customer Profile

**File:** `src/modules/profile.js`

---

## Overview

Customers can manage their personal profile including date of birth, dietary preferences, allergen alerts, and saved delivery addresses. Accessed via the "My Profile" link in the user dropdown (click initials in header).

---

## Profile Modal

| Field | Notes |
|-------|-------|
| Full Name | Pre-filled from user doc, editable |
| Date of Birth | Date picker — used for birthday rewards |
| Dietary Preferences | Multi-select: Vegetarian, Vegan, Gluten-Free, Halal, Jain |
| Allergen Alerts | Multi-select: nuts, dairy, gluten, eggs, soy, shellfish, sesame, fish |
| Saved Addresses | List of delivery addresses with add/remove controls |

---

## Features

### Date of Birth
- Stored as `dob: "YYYY-MM-DD"` in Firestore `users/{phone}`
- Enables birthday rewards — a gold banner appears during the user's birthday month
- Cloud Function creates auto-coupon `BDAY-{phone}` on the actual birthday (see [16-cloud-functions.md](16-cloud-functions.md))

### Dietary Preferences
- Stored as `dietaryPrefs: string[]` in user doc
- Currently used for display; future use for personalized menu recommendations

### Allergen Alerts
- Stored as `allergenAlerts: string[]` in user doc
- Powers the "Safe for Me" menu filter (hides items with matching allergens)
- Triggers the allergen warning popup at checkout if cart items contain flagged allergens

### Saved Addresses
- Stored as `savedAddresses: string[]` in user doc
- Add new addresses via text input
- Remove addresses with × button
- Addresses auto-populate the delivery address dropdown during checkout

---

## Data Model

User document fields added by the profile module:

```json
{
  "dob": "1995-06-15",
  "dietaryPrefs": ["Vegetarian"],
  "allergenAlerts": ["nuts", "dairy"],
  "savedAddresses": [
    "Flat 301, Kukatpally, Hyderabad",
    "Office: Tech Park, Gachibowli"
  ]
}
```

---

## Functions

| Function | Description |
|----------|-------------|
| `openProfileModal()` | Opens the profile modal, pre-fills fields from user data |
| `closeProfileModal()` | Closes the modal |
| `saveProfile()` | Validates and saves all fields to Firestore + localStorage |
| `addAddress()` | Appends a new address to the saved addresses list |
| `removeAddress(index)` | Removes an address by index |
| `initProfile()` | Called on page load — no-op until modal is opened |
