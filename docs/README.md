# Amogha Cafe & Restaurant — Documentation Index

**Live Site:** https://amoghahotels.com
**Firebase Hosting:** https://amogha-cafe.web.app (same site, alternate URL)
**Firebase Console:** https://console.firebase.google.com/project/amogha-cafe

---

## Pages

| Doc | Page | URL |
|-----|------|-----|
| [01-main-page.md](01-main-page.md) | Main / Public Ordering | https://amoghahotels.com |
| [02-admin-dashboard.md](02-admin-dashboard.md) | Admin Dashboard | https://amoghahotels.com/admin.html |
| [03-kitchen-display.md](03-kitchen-display.md) | Kitchen Display System | https://amoghahotels.com/kitchen/ |
| [04-order-tracking.md](04-order-tracking.md) | Order Tracking | https://amoghahotels.com/track/ |
| [05-qr-ordering.md](05-qr-ordering.md) | QR Dine-In Ordering | https://amoghahotels.com/qr/ |
| [06-display-board.md](06-display-board.md) | Restaurant Display Board | https://amoghahotels.com/display/ |

## Features

| Doc | Feature |
|-----|---------|
| [07-ordering-and-cart.md](07-ordering-and-cart.md) | Menu, Cart & Checkout |
| [08-payments.md](08-payments.md) | Payments (Razorpay, Cash, Gift Cards, Coupons) |
| [09-loyalty-and-referrals.md](09-loyalty-and-referrals.md) | Loyalty Points, Tiers & Referral Program |
| [10-auth.md](10-auth.md) | Authentication (Sign In / Sign Up) |
| [11-reservations.md](11-reservations.md) | Table Reservations |
| [12-reviews-and-gallery.md](12-reviews-and-gallery.md) | Reviews & Gallery |
| [13-pwa-and-notifications.md](13-pwa-and-notifications.md) | PWA, Push Notifications & Caching |

---

## Tech Stack

- **Frontend:** Vanilla HTML / CSS / JS (no framework)
- **Build:** Vite (ES modules → bundled `script.js`)
- **Backend:** Firebase — Firestore, Storage, Hosting
- **Payments:** Razorpay
- **PWA:** Service workers + Web App Manifest
- **Tests:** Vitest (71 tests)

## Quick Commands

```bash
# Build
docker run --rm -v $(pwd):/app -w /app node:20-alpine sh -c "npm install && npm run build"

# Deploy (requires firebase login)
ELECTRON_RUN_AS_NODE=1 "/Applications/Visual Studio Code.app/Contents/MacOS/Electron" ./node_modules/.bin/firebase deploy --only hosting

# Deploy Firestore rules only
ELECTRON_RUN_AS_NODE=1 "/Applications/Visual Studio Code.app/Contents/MacOS/Electron" ./node_modules/.bin/firebase deploy --only firestore
```
