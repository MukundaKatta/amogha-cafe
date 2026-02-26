# Main Page — Public Ordering Site

**URL:** https://amogha-cafe.web.app
**File:** `index.html` (1,553 lines)

The primary customer-facing page. Customers browse the menu, place orders, make reservations, read reviews, and manage their account from here.

---

## Header & Navigation

**Sticky top bar** always visible while scrolling.

| Element | Description |
|---------|-------------|
| Logo | Amogha branding (top-left) |
| Header Slideshow | 8 rotating promotional banners in the center — Today's specials, discounts, Telugu taglines, bestseller highlights |
| Nav Links | Home · About · Menu · Specials · Gallery · Reviews · Contact (smooth-scroll) |
| Sign In Button | Shows "Sign In" when logged out; shows user initials when logged in |
| Loyalty Widget | Visible when logged in — shows tier icon (🥉🥈🥇) and current points |
| Cart Icon | Shows item count badge; opens cart panel |
| Theme Toggle | 🌙 / ☀️ switches dark/light mode |
| Language Switcher | EN / हि / తె — switches UI text between English, Hindi, Telugu |
| Mobile Menu | Hamburger icon on small screens; closes on link click |

---

## Hero Section

Full-screen visual at the top of the page.

- **Background:** 9-slide rotating slideshow with Ken Burns (slow zoom/pan) animation
- **Particle System:** Animated gold sparkles overlay
- **Mouse Spotlight:** Subtle glow that tracks the cursor
- **Scroll Indicator:** Animated line prompting users to scroll down

**Content:**
- Tagline: "Authentic Indian Cuisine"
- Title: "Amogha Hotels"
- Subtitle: "Tradition, Perfection & Soul in Every Dish"

**CTA Buttons:**
- **Order Online** — scrolls to Menu section
- **Reserve Table** — opens the Reservation modal

---

## About Section

Three cards highlighting the restaurant story:

| Card | Content |
|------|---------|
| Our Story | History of Amogha, 3 years of service |
| Why Choose Us | Quality, freshness, service pillars |
| Our Mission | Value proposition |

**Stats bar** below the cards (animated count-up on scroll):
- Happy Customers · Menu Items · Years of Excellence · Tables

---

## Menu Section

The core of the page. All items are loaded from Firestore in real time with client-side caching (localStorage TTL, reduces Firestore reads by 90%+).

### Filters & Search

| Control | Function |
|---------|----------|
| Search bar | Live filter by item name or description |
| All / Veg / Non-Veg toggle | Filters items by type |
| Category tabs | Starters · Mains · Biryani · Tandoor · Noodles & Rice · Breads · Beverages · Specials |

### Menu Item Card

Each card shows:
- Veg (🟢) or Non-Veg (🔴) badge
- Item name and price (₹)
- Special badge if applicable (Bestseller / Popular / Chef's Pick)
- Description
- **Hover → image slides in** (loaded from Firebase Storage)
- Spice level selector: Mild / Medium / Spicy
- Add-ons selector (e.g. extra cheese, extra sauce) — loaded from Firestore
- "Add to Order" button
- Smart Pairing suggestion — when you add certain items (e.g. Biryani), a suggestion appears to add Raita or Salan

### Unavailable Items

Items marked unavailable in admin show a grey overlay with "Currently Unavailable" and cannot be added to cart.

### Happy Hour Banner

Automatically appears when within a Happy Hour window:
- **Mon–Fri 2 PM – 5 PM:** 15% off Beverages
- **Daily 10 PM – 11 PM:** 20% off all items

---

## Specials Section

- Rotating display of daily/weekly specials fetched from Firestore (`specials` collection)
- Each special card shows: image, name, description, price, and "Add to Order" button

---

## Cart Panel

Slides in from the right when the cart icon is clicked.

| Element | Description |
|---------|-------------|
| Item list | Name, spice level, add-ons, quantity +/− controls, remove button |
| Combo Offer | If 2+ items from different categories, 15% combo discount is applied |
| Happy Hour | Active discount shown and applied automatically |
| Coupon field | Enter a coupon code to apply discount |
| Order Total | Subtotal, discount, delivery fee (₹49, free above ₹500), grand total |
| Checkout button | Proceeds to checkout flow |

---

## Checkout Flow (3-step modal)

### Step 1 — Order Summary
Review all items, quantities, add-ons, and the final price breakdown.

### Step 2 — Your Details
| Field | Notes |
|-------|-------|
| Full Name | Required |
| Phone Number | Required |
| Order Type | Delivery / Takeaway / Dine-In |
| Delivery Address | Required for Delivery |
| Special Instructions | Optional |
| Gift Card | Optional redemption field |

### Step 3 — Payment
| Method | Notes |
|--------|-------|
| Razorpay | UPI / Cards / Net Banking / Wallets — live payment gateway |
| Cash on Delivery | Available for Delivery orders |
| Gift Card | Redeems stored balance |

On successful payment:
- Order saved to Firestore `orders` collection
- Loyalty points awarded (1 point per ₹10 spent)
- Referral credit applied if applicable
- Confetti animation plays
- Customer redirected to order tracking

---

## Gallery Section

- Masonry photo grid loaded from Firestore (`socialPosts` collection)
- Click any image to open a full-screen lightbox
- Lightbox supports keyboard navigation (← →) and close on backdrop click

---

## Reviews Section

- Star ratings (1–5) and text reviews from Firestore (`reviews` collection)
- Average rating displayed with star breakdown
- "Write a Review" button — opens review modal (requires login)
- Reviews are immutable after submission (Firestore rules enforce this)

---

## Testimonials Section

- Carousel of featured customer testimonials from Firestore (`testimonials` collection)
- Auto-rotates every 5 seconds

---

## Contact Section

| Info | Details |
|------|---------|
| Address | Restaurant address |
| Phone | +91 9121004999 |
| WhatsApp | Click-to-chat link |
| Hours | Operating hours |
| Map | Embedded Google Maps iframe |
| Message Form | Name + message → saved to Firestore `messages` collection |

---

## Modals

| Modal | Trigger |
|-------|---------|
| Sign In / Sign Up | "Sign In" button in header |
| Reservation | "Reserve Table" button in hero or nav |
| Loyalty Program | Loyalty widget in header (when logged in) |
| Cart | Cart icon in header |
| Checkout | "Proceed to Checkout" in cart |
| Lightbox | Click gallery image |
| Review | "Write a Review" button |
| Voice Order | Microphone icon in menu section |

---

## Voice Ordering

- Microphone button in the menu section
- Customer speaks an item name
- Speech recognition matches it to menu items and adds to cart

---

## PWA Features

- Installable on mobile (Add to Home Screen prompt)
- Offline support via service worker
- Network-first for HTML/CSS/JS; cache-first for images
