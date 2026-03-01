# Self-Service Kiosk

**URL:** https://amoghahotels.com/kiosk/
**File:** `kiosk/index.html` (~2,384 lines)

A premium self-service ordering kiosk designed for tablets and touchscreens placed at the restaurant counter or tables. Customers browse the menu, customize items with spice levels and add-ons, and pay — all without staff assistance.

---

## Layout

**Header:**
- Logo + "Amogha Cafe" + "Self-Service Ordering" subtitle
- Language toggle: EN / తెలుగు / हिंदी
- Light/Dark mode toggle (☀/☾)
- Accessibility toggle (Aa — large font mode)
- Fullscreen button

**Featured Strip:**
- Auto-scrolling marquee of bestseller items with star icon, name, and price

**Search & Filters:**
- Live search bar with microphone button (voice ordering)
- Filter chips: All · Veg (🟢) · Non-Veg (🔴) · Popular (🔥) · Chef's Pick (⭐)

**Menu Grid:**
- Mobile: 2-column grid with horizontal category tabs
- Tablet (768px+): Sticky sidebar with category buttons + 3-column grid
- Desktop (1024px+): Sidebar + 4-column grid

**Floating Cart Bar:**
- Fixed to bottom, slides up when cart has items
- Shows item count, total price, "View Cart" button
- Bounces on item add

---

## Menu Item Cards

Each card shows:

| Element | Description |
|---------|-------------|
| Image | From Firestore `imageUrl` field, with placeholder fallback |
| Type badge | Green (Veg) or Red (Non-Veg) dot |
| Name | 2-line clamped |
| Price | Gold monospace text (₹) |
| Rating | Star rating + review count (e.g. ★4.5 (23)) |
| Badge | Bestseller / Popular / Chef's Pick (if applicable) |
| ADD button | Opens spice picker flow |
| ± controls | Shown when item is already in cart |

Cards use glassmorphic design with backdrop blur and staggered entrance animations via IntersectionObserver.

---

## Ordering Flow

### Step 1 — Spice Level
When "ADD" is tapped, a bottom sheet appears with 4 options:
- 😊 None
- 🌶 Mild
- 🌶🌶 Medium (default)
- 🌶🌶🌶 Hot

A "Skip (Medium)" button uses the default.

### Step 2 — Add-Ons
After selecting spice, an add-on picker sheet slides up:
- Checkboxes with name, category, and price per add-on
- Running total shown in header badge
- "Add to Cart" button with final price
- Add-ons are fetched from Firestore `addons` collection (cached in localStorage, 10-min TTL)

### Step 3 — Added to Cart
Item is added with the structure:
```
{ name, price, qty, spice: "medium", addons: [{name, price}], addonTotal: 35 }
```
Same item with different spice/addon combinations = separate cart entries.

### Combo Pairings
After adding certain items, a "Perfect Pairings" bar appears with quick-add chips:

| Item Added | Suggested |
|------------|-----------|
| Chicken Dum Biryani | Raita, Mirchi ka Salan, Buttermilk |
| Butter Chicken | Butter Naan, Garlic Naan, Laccha Paratha |
| Veg Manchurian | Veg Hakka Noodles, Veg Fried Rice |
| *(17 total pairings)* | |

---

## Item Detail View

Tapping an item card (not the ADD button) opens a centered detail modal:
- Larger image
- Full name, description, badges
- Star rating and review count
- Price and ADD button (triggers spice picker flow)

---

## Checkout

Triggered from cart bar → slides up as a bottom sheet (mobile) or right sidebar (tablet/desktop).

### Order Summary
- Each item with spice emoji and add-on names listed
- Subtotal and total (adjusted for loyalty discount if active)

### Customer Form

| Field | Notes |
|-------|-------|
| Name | Required |
| Phone | Required, 10 digits — triggers loyalty + recent orders lookup |
| Table Number | Manual entry or QR scan |
| Special Instructions | Optional |

### Loyalty Points (auto-detected)
When a recognized phone number is entered:
- Tier badge shown (🥉 Bronze / 🥈 Silver / 🥇 Gold)
- Current points balance
- Redeemable discount: `floor(points / 100) × ₹10`
- Toggle to apply discount to order

### Recently Ordered (auto-detected)
If the phone has previous orders:
- Shows up to 8 unique items from last 3 orders as quick-add chips
- "Reorder All" button adds everything at once

### Payment

| Method | Description |
|--------|-------------|
| Razorpay | UPI / Cards / Net Banking / Wallets — opens Razorpay modal |
| Pay at Counter | Cash payment — order saved with `cod-pending` status |

---

## Success Screen

After payment:
- Animated green checkmark with confetti (60-particle physics animation)
- Order details card: Order ID, item count, total, payment method
- **Estimated wait time** — queries pending/preparing orders from last 30 min, calculates `10 + (pendingOrders × 3)` minutes
- **WhatsApp Receipt** — "Send Receipt" button opens `wa.me/{phone}?text={orderSummary}`
- **Track Order** link to `/track/?id=ORDER_ID`
- **Auto-reset** — returns to menu after 60 seconds with countdown

---

## Voice Ordering

- Tap the microphone icon in the search bar
- Full-screen voice overlay with pulsing mic icon
- Uses Web Speech API (`webkitSpeechRecognition`)
- Language auto-set to match current UI language (en-IN / hi-IN / te-IN)
- Fuzzy matching against menu items by word overlap
- Parses quantity: "add 2 butter chicken" → adds 2 with default spice
- Commands: "checkout", "pay", "cart", "clear"

---

## Post-Order Feedback

After order completion, a feedback prompt appears on the success screen:

- **Emoji rating** with 4 levels: 😠 (Bad) · 😐 (Okay) · 😊 (Good) · 😍 (Loved it!)
- **Optional text comment** field for detailed feedback
- Saves to Firestore `reviews` collection with `source: 'kiosk'`
- Skippable — auto-dismissed after the 60-second reset timer

This provides quick, low-friction feedback collection from dine-in and counter customers.

---

## Screensaver

- Activates after 2 minutes of inactivity (no touch/mouse/key/scroll)
- Full-screen overlay with:
  - Breathing Amogha logo (scale + glow pulse animation)
  - "Touch to Start Ordering" text (pulsing)
- Any interaction dismisses it

---

## Staff Call Button

- Floating "Need Help?" button (bottom-left corner)
- Creates a notification document in Firestore `notifications` collection:
  ```json
  { "type": "staff-call", "table": "5", "source": "kiosk", "createdAt": "...", "read": false }
  ```
- Shows toast: "Staff has been notified!"

---

## QR Table Scanner

- Camera icon button next to table number input
- Opens device camera via `getUserMedia`
- Uses `BarcodeDetector` API to scan QR codes
- Extracts table number and auto-fills the input
- Falls back to manual entry if camera unavailable

---

## Visual Design

### Glassmorphism
- All overlays use `backdrop-filter: blur(20-30px)` with semi-transparent backgrounds
- Inset white edge highlights for depth

### Ambient Effects
- 6 floating gold particles (blurred circles, 20s animation cycle)
- Grain texture overlay (SVG fractal noise, subtle)
- Gold radial gradient aura at top-left and bottom-right

### Color Palette
```
Gold: #D4A017 (primary), #F5D76E (light), #B8860B (dark)
Text: #ede2d2 (primary), #a09080 (dim), #6a5a4a (faint)
Background: #080604 (dark mode), #f5f0e8 (light mode)
Cards: rgba(18,15,12,0.82) (dark), rgba(255,252,248,0.92) (light)
```

### Custom Easing
```css
--ease: cubic-bezier(0.4, 0, 0.2, 1)         /* Material Design */
--ease-out: cubic-bezier(0.16, 1, 0.3, 1)    /* Quick decelerate */
--ease-luxe: cubic-bezier(0.22, 1, 0.36, 1)  /* Smooth overshoot */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1) /* Bouncy */
```

---

## Light / Dark Mode

- Toggle in header (persists to localStorage)
- Dark mode (default): deep black/brown backgrounds, gold accents, cream text
- Light mode: warm white backgrounds, darker text, preserved gold accents

---

## Accessibility

- **Large Font Mode:** Toggle (Aa button) scales fonts up 20%, increases touch targets. Persists to localStorage.
- Semantic HTML elements (`<button>`, `<nav>`, `<main>`, `<header>`)
- `aria-hidden` on decorative particles
- Minimum 42-48px touch targets
- XSS protection via `escHtml()` on all dynamic content

---

## Three-Language Support

| Language | Code | Voice Recognition |
|----------|------|-------------------|
| English | en | en-IN |
| Telugu | te | te-IN |
| Hindi | hi | hi-IN |

All UI labels, buttons, placeholders, and category names switch. Menu item names remain in their original language.

---

## PWA

- Service worker (`kiosk/sw.js`) — network-first for HTML/JS, cache-first for images
- Cache name: `amogha-kiosk-v2`
- Web App Manifest (`kiosk/manifest.json`):
  - Display: fullscreen
  - Orientation: portrait
  - Theme: gold (#D4A017)
- Apple mobile web app meta tags for iOS standalone mode

---

## Firestore Collections Used

| Collection | Usage |
|------------|-------|
| menu | Load menu items (name, price, category, type, badge, imageUrl, description) |
| addons | Load add-on options (name, category, price) |
| reviews | Aggregate item ratings (avg stars, count) |
| orders | Place orders, query recent orders for loyalty/reorder, estimate wait time |
| users | Loyalty points lookup by phone |
| notifications | Staff call button creates notification docs |
| reviews | Post-order feedback saved with `source: 'kiosk'` |

---

## Intended Setup

- Dedicated tablet (10"+ recommended) mounted at counter or table
- Set browser to fullscreen for immersive experience
- Screensaver activates during idle periods
- Works offline briefly (cached menu via localStorage + service worker)
- Auto-resets after each order completes
