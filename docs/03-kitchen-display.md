# Kitchen Display System (KDS)

**URL:** https://amogha-cafe.web.app/kitchen/
**File:** `kitchen/index.html` (2,234 lines)

A real-time display screen for kitchen staff. Shows all active orders, their status, and elapsed time. Designed to be shown on a tablet or monitor mounted in the kitchen.

---

## Purpose

- Replaces paper tickets / verbal communication between front-of-house and kitchen
- Updates instantly when new orders are placed or status changes
- Helps kitchen staff prioritize and track multiple orders simultaneously

---

## Layout

Full-screen grid of order cards. No sidebar — maximizes visible order space.

**Top bar:**
- Restaurant logo
- Current time (live clock)
- Active order count
- Sound toggle (🔔) — enables/disables chime for new orders

---

## Order Card

Each active order appears as a card:

| Element | Description |
|---------|-------------|
| Order ID | Short ID for reference |
| Order Type | Delivery / Takeaway / Dine-In (color-coded) |
| Table number | For dine-in orders |
| Elapsed timer | Live clock showing time since order was placed (turns red after threshold) |
| Items list | Each item with quantity, spice level, and add-ons |
| Special instructions | Customer notes (highlighted in amber) |

**Card border color by status:**
| Color | Status |
|-------|--------|
| Gold/amber | Pending — just received |
| Blue | Preparing — kitchen accepted |
| Green | Ready — awaiting pickup/delivery |

---

## Actions

| Button | Action |
|--------|--------|
| Accept / Start | Moves order from Pending → Preparing |
| Ready | Moves order from Preparing → Ready (notifies front-of-house) |

Completed/delivered orders disappear automatically from the KDS.

---

## Real-Time Sync

- Listens to Firestore `orders` collection in real time
- New orders appear instantly with a chime sound
- Status changes made in admin or by delivery staff reflect immediately
- No page refresh needed

---

## Sound Alerts

- New order chime plays when an order enters the queue
- Can be toggled off during busy service if needed

---

## Intended Setup

- Dedicated tablet or monitor in the kitchen, always-on
- Display stays active (no screen timeout recommended)
- Works offline briefly (cached last state) but real-time sync requires internet
