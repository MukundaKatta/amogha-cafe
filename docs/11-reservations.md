# Table Reservations

**File:** `src/modules/reservations.js`

---

## Overview

Customers can book a table in advance via the Reservation modal on the main site. Staff review and confirm reservations from the Admin Dashboard.

---

## Reservation Modal

Triggered by the "Reserve Table" button (hero section or nav). A modal opens with a form.

### Form Fields

| Field | Type | Notes |
|-------|------|-------|
| Full Name | Text | Required |
| Phone Number | Text | Required, 10 digits |
| Date | Date picker | Must be today or future |
| Time | Time picker | Restaurant hours enforced |
| Number of Guests | Number | 1–20 |
| Special Requests | Textarea | Dietary needs, occasion, seating preference |
| Submit | Button | Saves to Firestore |

### On Submit

1. Form validated client-side
2. Reservation document saved to Firestore `reservations` collection with `status: 'pending'`
3. Success message shown to customer
4. Admin sees the new reservation in the Dashboard → Reservations panel

---

## Reservation Document in Firestore

```json
{
  "id": "auto-generated",
  "name": "Customer Name",
  "phone": "9876543210",
  "date": "2024-12-25",
  "time": "19:30",
  "guests": 4,
  "specialRequests": "Window seat please, anniversary dinner",
  "status": "pending",
  "tableAssigned": null,
  "createdAt": "timestamp"
}
```

---

## Admin — Reservations Panel

| Action | Description |
|--------|-------------|
| Confirm | Changes status to `confirmed`; optionally assign a table |
| Cancel | Changes status to `cancelled` |
| Assign Table | Links a table number to the reservation |

---

## Tables

- 12 tables total (seeded in Firestore `tables` collection)
- Table capacities vary (2–8 seats)
- Status: Available / Occupied / Reserved / Cleaning
- Table status is managed manually from Admin → Tables panel

---

## No Automated Reminders

Currently there is no automated email/SMS reminder system. For production, consider integrating:
- Firebase Functions + SendGrid for email reminders
- Twilio or MSG91 for SMS reminders
