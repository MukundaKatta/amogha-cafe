# All Features Catalog

This is the consolidated catalog of features currently documented for the Amogha Cafe platform.
For implementation details, open the linked docs per module.

---

## 1) Customer Ordering Experience (Web)

Reference docs:
- [01-main-page.md](01-main-page.md)
- [07-ordering-and-cart.md](07-ordering-and-cart.md)
- [08-payments.md](08-payments.md)
- [12-reviews-and-gallery.md](12-reviews-and-gallery.md)
- [18-customer-profile.md](18-customer-profile.md)

### Key features
- Public menu browsing with category tabs, search, and veg/non-veg filters
- Real-time menu loading from Firestore with local cache (TTL-based)
- Item customization: spice levels and add-ons
- Allergens on menu cards and "Safe for Me" filter (profile-driven)
- Smart pairing and upsell suggestions in cart/checkout
- Coupon apply flow with validation (active, expiry, min order, usage limits)
- Happy-hour discounts and combo discount logic
- Multi-step checkout with order summary, details, and payment
- Order placement to Firestore with immediate downstream sync
- Reviews, testimonials, gallery/lightbox, and contact/message forms
- Profile modal: DOB, dietary preferences, allergen alerts, saved addresses

---

## 2) Payments, Discounts, and Post-Checkout

Reference docs:
- [08-payments.md](08-payments.md)
- [09-loyalty-and-referrals.md](09-loyalty-and-referrals.md)

### Key features
- Razorpay online payments (UPI/cards/net banking/wallets)
- Cash-based flow for eligible order types
- Gift-card balance redemption
- Coupon engine (percentage and flat discount)
- Delivery fee logic with free-delivery threshold
- Split-bill flow with UPI deep links
- Share-and-earn points after order completion

---

## 3) Loyalty, Rewards, and Gamification

Reference docs:
- [09-loyalty-and-referrals.md](09-loyalty-and-referrals.md)
- [18-customer-profile.md](18-customer-profile.md)
- [20-subscriptions.md](20-subscriptions.md)

### Key features
- Points accrual based on spend
- Tiering model (Bronze/Silver/Gold) with progress display
- Loyalty widget and loyalty modal in customer UI
- Referral link flow and referral tracking
- Birthday rewards flow (client banner + scheduled coupon generation)
- Review reward points
- Achievement badges (10 badge types) with badge gallery
- Subscription meal plans (browse, subscribe, cancel)

---

## 4) Multi-Channel Ordering Surfaces

Reference docs:
- [05-qr-ordering.md](05-qr-ordering.md)
- [14-kiosk.md](14-kiosk.md)
- [04-order-tracking.md](04-order-tracking.md)

### QR dine-in
- Table-specific ordering via `?table=N`
- Dine-in optimized flow with table context and live status updates

### Kiosk
- Touch-first self-service ordering flow
- Language toggle, theme toggle, and accessibility toggle
- Voice ordering support
- Spice and add-on selection bottom sheets
- Reorder/recently-ordered shortcuts for returning users
- Kiosk success flow with estimated wait time and receipt sharing
- Screensaver mode, staff-call button, and QR table scanner

### Tracking
- Real-time order timeline (pending to delivered/cancelled states)
- Order details view with payment and item metadata
- Delivery live-map mode using driver GPS updates
- Preparing-state countdown using menu prep times

---

## 5) Operations, Admin, and Staff Tools

Reference docs:
- [02-admin-dashboard.md](02-admin-dashboard.md)
- [03-kitchen-display.md](03-kitchen-display.md)
- [06-display-board.md](06-display-board.md)
- [11-reservations.md](11-reservations.md)
- [15-delivery.md](15-delivery.md)

### Admin dashboard
- Order management (status changes, filtering, search)
- Menu/add-on/specials CRUD flows
- Inventory management with thresholds
- Tables and reservations management
- Customer, coupons, and gift-card management
- Expenses/staff and operational panels

### Kitchen display system (KDS)
- Live active-order queue
- Per-order timers, prep estimates, and status actions
- New-order sound alerts and real-time status sync

### Restaurant display board
- Public/front-of-house order status display

### Delivery app
- Delivery-person login
- Available order pickup and active-delivery workflow
- Navigation/call shortcuts for delivery staff
- Earnings and history dashboards
- GPS tracking with throttled Firestore updates

---

## 6) AI Features

Reference docs:
- [16-cloud-functions.md](16-cloud-functions.md)
- Source module: `src/modules/chatbot.js`

### Key features
- AI bill parsing endpoint (`POST /parse-bill`) using Gemini via Vertex AI
- AI smart-notification endpoint in functions (`/smart-notify`)
- In-app AI chat assistant UI (floating chat, menu suggestions, action triggers)

---

## 7) Backend APIs and Automation

Reference docs:
- [16-cloud-functions.md](16-cloud-functions.md)
- [17-ci-cd-and-seo.md](17-ci-cd-and-seo.md)

### Key features
- REST API for menu, specials, order creation, and order tracking
- Notification API endpoint for push delivery
- Hosting rewrite compatibility for `/api/*`
- Scheduled function for birthday coupon automation
- OpenAPI spec for external integrations (`openapi.json`)

---

## 8) PWA, Notifications, and Platform

Reference docs:
- [13-pwa-and-notifications.md](13-pwa-and-notifications.md)
- [17-ci-cd-and-seo.md](17-ci-cd-and-seo.md)

### Key features
- Installable PWA with manifest and service worker
- Cache strategy for static assets and images
- Firestore read optimization via local caching layer
- Browser notifications for order updates
- Firebase Cloud Messaging token registration and push pipeline
- SEO baseline: sitemap, robots, metadata, CI/CD deployment pipeline

---

## 9) Data and Security Foundations

Reference docs:
- [docs/README.md](README.md) (collections + structure)
- `firestore.rules`

### Key features
- Firestore collections for ordering, loyalty, staff ops, delivery, and marketing content
- Rule-based field-level protections on sensitive updates (e.g., coupons/gift cards)
- Collection model ready for expansion (including future branch support)

---

## 10) Feature-to-Doc Map

| Area | Primary Doc |
|------|-------------|
| Main customer site | [01-main-page.md](01-main-page.md) |
| Ordering & cart | [07-ordering-and-cart.md](07-ordering-and-cart.md) |
| Payments | [08-payments.md](08-payments.md) |
| Loyalty & referrals | [09-loyalty-and-referrals.md](09-loyalty-and-referrals.md) |
| Authentication | [10-auth.md](10-auth.md) |
| Reservations | [11-reservations.md](11-reservations.md) |
| Reviews & gallery | [12-reviews-and-gallery.md](12-reviews-and-gallery.md) |
| PWA & notifications | [13-pwa-and-notifications.md](13-pwa-and-notifications.md) |
| Kiosk | [14-kiosk.md](14-kiosk.md) |
| Delivery app | [15-delivery.md](15-delivery.md) |
| APIs & functions | [16-cloud-functions.md](16-cloud-functions.md) |
| CI/CD & SEO | [17-ci-cd-and-seo.md](17-ci-cd-and-seo.md) |
| Customer profile | [18-customer-profile.md](18-customer-profile.md) |
| Group ordering | [19-group-ordering.md](19-group-ordering.md) |
| Subscriptions | [20-subscriptions.md](20-subscriptions.md) |

---

Last updated: March 2, 2026
