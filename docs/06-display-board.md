# Restaurant Display Board

**URL:** https://amoghahotels.com/display/
**File:** `display/index.html` (1,014 lines)

A TV/monitor display intended for public areas of the restaurant — lobby, waiting area, or above the counter. Shows ready orders, today's specials, and promotional content.

---

## Purpose

- Lets waiting customers see when their order is ready (without needing staff to call out names)
- Displays current specials and promotions passively
- Acts as a digital signage board

---

## Layout

Full-screen, designed for landscape TV/monitor.

### Left Panel — Ready Orders

Live list of orders that are **Ready for Pickup**:

| Element | Description |
|---------|-------------|
| Order ID | Large, readable token number |
| Customer name | First name or table number |
| Order type badge | Delivery / Takeaway / Dine-In |

Orders disappear from this panel once marked as Delivered in admin/KDS.

Updates in real time via Firestore listener — no refresh needed.

### Right Panel — Specials & Promotions

Rotating slides showing:
- Today's specials (from `specials` Firestore collection)
- Happy hour announcements (Mon–Fri 2–5 PM, Daily 10–11 PM)
- Promotional banners (hero slides from `heroSlides` collection)
- Restaurant taglines

### Bottom Ticker

Scrolling text ticker showing:
- "Thank you for dining with us!"
- Current promotions
- WhatsApp ordering CTA

---

## Real-Time Sync

- Listens to Firestore `orders` collection filtered by `status == 'ready'`
- New ready orders appear automatically with a soft chime
- Delivered orders vanish automatically

---

## Setup

- Open on a dedicated TV/monitor connected to a computer or smart TV browser
- Set browser to fullscreen (F11)
- Keep the page open — it auto-updates indefinitely
- No login required
