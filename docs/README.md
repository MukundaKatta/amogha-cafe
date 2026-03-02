# Amogha Cafe & Restaurant — Documentation Index

**Live Site:** https://amoghahotels.com
**Firebase Hosting:** https://amogha-cafe.web.app (same site, alternate URL)
**Firebase Console:** https://console.firebase.google.com/project/amogha-cafe
**REST API:** https://amogha-cafe.web.app/api

---

> 🚀 *New:* see [21-all-features.md](21-all-features.md) for a complete, consolidated
> feature catalog covering every user‑visible and admin capability in one place.
>
## Pages

| Doc | Page | URL |
|-----|------|-----|
| [01-main-page.md](01-main-page.md) | Main / Public Ordering | https://amoghahotels.com |
| [02-admin-dashboard.md](02-admin-dashboard.md) | Admin Dashboard | https://amoghahotels.com/admin.html |
| [03-kitchen-display.md](03-kitchen-display.md) | Kitchen Display System | https://amoghahotels.com/kitchen/ |
| [04-order-tracking.md](04-order-tracking.md) | Order Tracking | https://amoghahotels.com/track/ |
| [05-qr-ordering.md](05-qr-ordering.md) | QR Dine-In Ordering | https://amoghahotels.com/qr/ |
| [06-display-board.md](06-display-board.md) | Restaurant Display Board | https://amoghahotels.com/display/ |
| [14-kiosk.md](14-kiosk.md) | Self-Service Kiosk | https://amoghahotels.com/kiosk/ |
| [15-delivery.md](15-delivery.md) | Delivery Management | https://amoghahotels.com/delivery/ |

## Features

| Doc | Feature |
|-----|---------|
| [07-ordering-and-cart.md](07-ordering-and-cart.md) | Menu, Cart, Checkout, Allergen Warnings & Upsell |
| [08-payments.md](08-payments.md) | Payments (Razorpay, Cash, Gift Cards, Coupons, Split Bill) |
| [09-loyalty-and-referrals.md](09-loyalty-and-referrals.md) | Loyalty, Referrals, Badges, Birthday & Review Rewards |
| [10-auth.md](10-auth.md) | Authentication (Sign In / Sign Up) |
| [11-reservations.md](11-reservations.md) | Table Reservations |
| [12-reviews-and-gallery.md](12-reviews-and-gallery.md) | Reviews & Gallery |
| [13-pwa-and-notifications.md](13-pwa-and-notifications.md) | PWA, FCM Push Notifications & Caching |
| [18-customer-profile.md](18-customer-profile.md) | Customer Profile (DOB, Dietary Prefs, Addresses) |
| [19-group-ordering.md](19-group-ordering.md) | Group Ordering (Shared Carts) |
| [20-subscriptions.md](20-subscriptions.md) | Subscription Meal Plans |
| [21-all-features.md](21-all-features.md) | Consolidated Feature Catalog (All Modules) |

*The "All Features" document pulls together details from every other page and
serves as the canonical index for new developers or reviewers.*

## Infrastructure

| Doc | Feature |
|-----|---------|
| [16-cloud-functions.md](16-cloud-functions.md) | REST API, AI Chatbot Endpoints & Cloud Functions Automation |
| [17-ci-cd-and-seo.md](17-ci-cd-and-seo.md) | CI/CD (GitHub Actions), SEO, Firebase Config |

## API Coverage Notes

- **OpenAPI-documented endpoints (`openapi.json`):**
  - `GET /menu`
  - `GET /specials`
  - `POST /order`
  - `GET /order/{orderId}`
- **Additional deployed endpoints in `functions/index.js`:**
  - `POST /parse-bill`
  - `POST /notify`
  - `POST /chat`
  - `POST /smart-search`
  - `POST /recommend`
  - `POST /summarize-reviews`
  - `POST /forecast`
  - `POST /menu-insights`
  - `POST /smart-notify`
  - `POST /meal-plan`
  - `POST /smart-combo`

---

## Tech Stack

- **Frontend:** Vanilla HTML / CSS / JS (no framework)
- **Build:** Vite (ES modules → bundled `script.js`)
- **Backend:** Firebase — Firestore, Cloud Functions, Storage, Hosting
- **AI:** Google Gemini 2.0 Flash (Vertex AI) for bill parsing, chatbot replies, menu insights, and smart notifications
- **Payments:** Razorpay (UPI, Cards, Net Banking, Wallets) + Split Bill via UPI deep links
- **Maps:** Leaflet.js + OpenStreetMap (live delivery tracking)
- **Charts:** Chart.js 4.4 (admin analytics dashboard)
- **Push:** Firebase Cloud Messaging (background notifications)
- **PWA:** Service workers + Web App Manifest
- **CI/CD:** GitHub Actions (test → deploy on push to master)
- **Tests:** Vitest (71 tests)

## Project Structure

```
amogha-cafe/
├── index.html              # Main public page
├── admin.html              # Admin dashboard
├── script.js               # Built JS (Vite output)
├── styles.css              # All styles (9,189 lines)
├── kitchen/index.html      # Kitchen Display System
├── track/index.html        # Order tracking
├── qr/index.html           # QR dine-in ordering
├── display/index.html      # Restaurant display board
├── kiosk/                  # Self-service kiosk (22 premium features)
│   ├── index.html
│   ├── manifest.json
│   └── sw.js
├── delivery/index.html     # Delivery driver app
├── functions/              # Firebase Cloud Functions (REST API)
│   ├── index.js
│   └── package.json
├── src/                    # Source modules (Vite entry)
│   ├── main.js
│   ├── core/
│   │   ├── constants.js
│   │   ├── firebase.js
│   │   └── utils.js
│   └── modules/
│       ├── auth.js
│       ├── badges.js          # Gamification badges (10 achievements)
│       ├── cart.js
│       ├── features.js
│       ├── group.js           # Group ordering (shared carts)
│       ├── hero.js
│       ├── loyalty.js
│       ├── menu.js
│       ├── notifications.js
│       ├── payment.js
│       ├── profile.js         # Customer profile (DOB, dietary, addresses)
│       ├── chatbot.js         # AI chat assistant (conversational ordering + FAQ)
│       ├── reservations.js
│       ├── splitbill.js       # Post-checkout split bill
│       ├── subscriptions.js   # Subscription meal plans
│       └── ui.js
├── .github/workflows/deploy.yml  # CI/CD pipeline
├── firebase.json           # Firebase config
├── firestore.rules         # Security rules
├── openapi.json            # REST API spec (ChatGPT Actions)
├── robots.txt              # SEO
├── sitemap.xml             # SEO
└── docs/                   # This documentation
```

## Firestore Collections

| Collection | Purpose |
|------------|---------|
| orders | Customer orders (all channels) |
| menu | Menu items with prices, categories, images |
| addons | Add-on options (Extra Cheese, etc.) |
| users | Customer accounts, loyalty points |
| specials | Daily/weekly specials |
| reviews | Customer ratings and reviews |
| reservations | Table booking requests |
| inventory | Ingredient stock levels |
| tables | 12 dine-in tables with status |
| coupons | Discount coupon codes |
| giftCards | Pre-paid gift cards |
| referrals | Referral program tracking |
| messages | Contact form messages |
| notifications | Staff call alerts, push notifications |
| testimonials | Featured customer quotes |
| socialPosts | Gallery photos |
| heroSlides | Homepage slideshow images |
| settings | Site-wide configuration |
| cateringInquiries | Catering request forms |
| deliveryPersons | Delivery driver accounts |
| expenses | Restaurant expense tracking (admin) |
| staff | Staff members, roles, shifts, schedules |
| groupCarts | Shared group ordering carts |
| subscriptionPlans | Meal plan definitions (admin-managed) |
| subscriptions | Customer subscription records |
| branches | Multi-branch locations (future – schema already in place) |
| chatHistory | AI chatbot conversation history/context |
| mealPlans | AI-generated saved meal plans |

## Quick Commands

```bash
# Build
docker run --rm -v $(pwd):/app -w /app node:20-alpine sh -c "npm install && npm run build"

# Deploy hosting + Firestore rules
docker run --rm -v $(pwd):/app -v ~/.config/configstore:/root/.config/configstore \
  -w /app node:20-alpine sh -c "npm install -g firebase-tools --silent && firebase deploy --only hosting,firestore:rules --project amogha-cafe"

# Deploy Cloud Functions
cd functions && npm install && firebase deploy --only functions

# Run tests
docker run --rm -v $(pwd):/app -w /app node:20-alpine sh -c "npm install && npm test -- --run"
```
