# Admin Dashboard

**URL:** https://amoghahotels.com/admin.html
**File:** `admin.html` (3,657 lines)

The internal management interface for restaurant staff. Handles orders, menu, inventory, reservations, tables, customers, and site content.

> **Access:** No built-in auth gate on the URL — restrict access via Firebase Hosting rewrites or share only with trusted staff.

---

## Layout

- **Left sidebar** — navigation between panels
- **Main content area** — panel content
- **Top bar** — restaurant name, current date/time, quick stats

---

## Panels

### 1. Dashboard (Overview)

Live stats at a glance:

| Stat | Description |
|------|-------------|
| Today's Orders | Count of orders placed today |
| Today's Revenue | Sum of today's order totals |
| Pending Orders | Orders awaiting preparation |
| Active Tables | Tables currently occupied |

Recent orders list with quick status controls.

---

### 2. Orders

Full order management panel.

**Filters:**
- By status: All · Pending · Preparing · Ready · Delivered · Cancelled
- By date range
- Search by order ID or customer name

**Order card shows:**
- Order ID, timestamp, customer name & phone
- Order type: Delivery / Takeaway / Dine-In
- Items list with quantities, spice levels, add-ons
- Subtotal, discounts, delivery fee, total
- Payment method
- Special instructions

**Status buttons (per order):**
| Button | Action |
|--------|--------|
| Preparing | Marks order as being prepared; appears on KDS |
| Ready | Marks order ready for pickup/delivery |
| Delivered | Closes the order |
| Cancel | Cancels the order |

---

### 3. Menu Management

Add, edit, and control all menu items.

**Item form fields:**
| Field | Notes |
|-------|-------|
| Name | Item name (used as document ID in Firestore) |
| Category | Starters / Mains / Biryani / Tandoor / Noodles & Rice / Breads / Beverages / Specials |
| Price | In ₹ |
| Description | Short description shown on card |
| Type | Veg / Non-Veg |
| Badge | None / Bestseller / Popular / Chef's Pick |
| Available | Toggle on/off (unavailable items show grey overlay to customers) |
| Image | Upload via Firebase Storage; URL stored in Firestore |

**Bulk actions:**
- Toggle availability for multiple items at once
- Reorder items within a category (affects display order)

---

### 4. Add-Ons Management

Manage the add-on options shown with menu items (e.g. Extra Cheese, Extra Sauce).

| Field | Notes |
|-------|-------|
| Name | Add-on label |
| Price | Extra charge (₹) |
| Available | Toggle |

---

### 5. Specials

Manage daily/weekly specials that appear in the Specials section on the main page.

| Field | Notes |
|-------|-------|
| Title | Special name |
| Description | Short promo text |
| Price | Display price |
| Image | Upload photo |
| Active | Toggle visibility |

---

### 6. Inventory

Track stock levels for ingredients and supplies.

| Column | Description |
|--------|-------------|
| Item name | Ingredient / supply name |
| Quantity | Current stock with unit |
| Min Level | Low-stock threshold |
| Status | OK / Low / Out of Stock (auto-calculated) |
| Last Updated | Timestamp |

**Actions:**
- Update quantity (restock)
- Edit item details
- Low-stock items highlighted in red

41 inventory items pre-seeded (matching menu ingredients).

---

### 7. Tables

Manage the 12 dine-in tables.

| Column | Description |
|--------|-------------|
| Table number | 1–12 |
| Capacity | Seats |
| Status | Available / Occupied / Reserved / Cleaning |
| Current Order | Linked order ID if occupied |

**Actions:**
- Change table status manually
- Link an order to a table
- Mark as cleaning after guests leave

---

### 8. Reservations

View and manage incoming table reservations.

| Column | Description |
|--------|-------------|
| Customer name | |
| Phone | |
| Date & Time | Requested slot |
| Guests | Party size |
| Table assigned | |
| Status | Pending / Confirmed / Cancelled |
| Notes | Special requests |

**Actions:**
- Confirm or cancel a reservation
- Assign a specific table

---

### 9. Customers

View registered customers.

| Column | Description |
|--------|-------------|
| Name | |
| Email | |
| Phone | |
| Loyalty Points | Current balance |
| Loyalty Tier | Bronze / Silver / Gold |
| Total Orders | Lifetime order count |
| Total Spent | Lifetime spend (₹) |
| Joined | Registration date |

---

### 10. Coupons

Create and manage discount coupons.

| Field | Notes |
|-------|-------|
| Code | Coupon code (e.g. WELCOME25) |
| Type | Percentage / Flat amount |
| Discount | % or ₹ value |
| Min Order | Minimum order value to apply |
| Max Uses | Usage limit |
| Used Count | How many times redeemed |
| Expiry | Expiry date |
| Active | Toggle |

---

### 11. Gift Cards

Issue and track gift cards.

| Field | Notes |
|-------|-------|
| Code | Unique gift card code |
| Balance | Remaining balance (₹) |
| Original Amount | Face value when issued |
| Issued To | Customer name/email |
| Redeemed At | Timestamp of redemption |

---

### 12. Reviews

View all customer reviews submitted via the main site.

| Column | Description |
|--------|-------------|
| Customer name | |
| Rating | 1–5 stars |
| Review text | |
| Date | |

> Reviews are immutable (Firestore rules prevent edits/deletes). Contact Firebase Console to remove inappropriate reviews.

---

### 13. Messages

Customer messages submitted via the Contact section.

| Column | Description |
|--------|-------------|
| Name | Sender name |
| Message | Message text |
| Timestamp | |
| Read | Toggle to mark as read |

---

### 14. Hero Slides

Manage the 9 background slides on the homepage hero section.

| Field | Notes |
|-------|-------|
| Image URL | Firebase Storage URL |
| Caption | Optional overlay text |
| Order | Display sequence |
| Active | Toggle |

---

### 15. Content — Testimonials & Social Posts

**Testimonials** (`testimonials` collection):
- Customer quote, name, designation, avatar image
- Shown in the testimonials carousel on the main page

**Social Posts** (`socialPosts` collection):
- Photo + caption
- Shown in the Gallery section on the main page

---

### 16. Settings

Site-wide configuration stored in Firestore `settings` collection.

| Setting | Description |
|---------|-------------|
| Restaurant name | Display name |
| Phone / WhatsApp | Contact numbers |
| Address | Full address |
| Operating hours | Open/close times per day |
| Delivery radius | km/area |
| Delivery fee | Default: ₹49 |
| Free delivery above | Default: ₹500 |
| Combo discount | Default: 15% |
| Maintenance mode | Hides ordering UI |

---

## Key Notes

- All changes are **live immediately** — Firestore real-time sync pushes updates to customers without page reload
- Menu images uploaded here appear in customer cards on hover
- Use **Firebase Console** for bulk operations, data export, or emergency corrections
