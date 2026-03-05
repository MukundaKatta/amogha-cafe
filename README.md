# Amogha Cafe & Restaurant

A full-featured, multi-surface restaurant platform built on Firebase — covering online ordering, dine-in, kiosk, POS, kitchen display, delivery, and admin operations.

**Live Site:** https://amoghahotels.com
**Alternate URL:** https://amogha-cafe.web.app

## Quick Start

```bash
# Install dependencies
npm install

# Start local dev server
npm run dev

# Build for production
npm run build

# Run unit/integration tests
npm test -- --run

# Run tests with coverage
npm run test:coverage

# Run E2E browser tests (requires build first)
npx playwright install
npm run test:e2e
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML / CSS / JS (no framework) |
| Build | Vite 5 (ES modules) |
| Backend | Firebase — Firestore, Cloud Functions, Storage, Hosting |
| AI | Google Gemini 2.0 Flash (Vertex AI) |
| Payments | Razorpay (UPI, Cards, Net Banking, Wallets) |
| Maps | Leaflet.js + OpenStreetMap |
| Charts | Chart.js 4.4 |
| Push | Firebase Cloud Messaging |
| PWA | Service Workers + Web App Manifest |
| CI/CD | GitHub Actions (test → deploy on push to master) |
| Tests | Vitest (2,059 tests) + Playwright E2E |

## Platform Surfaces

| Surface | URL Path | Description |
|---------|----------|-------------|
| Customer Ordering | `/` | Public menu, cart, checkout |
| Admin Dashboard | `/admin.html` | Orders, menu, inventory, analytics |
| Kitchen Display | `/kitchen/` | Live order queue with timers |
| Order Tracking | `/track/` | Real-time order status + delivery map |
| QR Dine-In | `/qr/` | Table-specific ordering via QR code |
| Display Board | `/display/` | Front-of-house order status |
| Self-Service Kiosk | `/kiosk/` | Touch-first ordering with voice support |
| Delivery App | `/delivery/` | Driver pickup, navigation, earnings |
| POS Terminal | `/pos/` | Staff counter-side ordering + receipts |
| Loyalty Balance | `/loyalty/` | Customer points check by phone |

## Project Structure

```
amogha-cafe/
├── index.html                  # Main public page
├── admin.html                  # Admin dashboard
├── script.js                   # Built JS (Vite output)
├── styles.css                  # All styles
├── kitchen/                    # Kitchen Display System
├── track/                      # Order tracking
├── qr/                         # QR dine-in ordering
├── display/                    # Restaurant display board
├── kiosk/                      # Self-service kiosk
├── delivery/                   # Delivery driver app
├── pos/                        # Staff POS terminal
├── functions/                  # Firebase Cloud Functions (REST API)
├── src/                        # Source modules (Vite entry)
│   ├── main.js
│   ├── core/                   # Firebase, constants, utils
│   └── modules/                # Feature modules (auth, cart, payment, etc.)
├── tests/                      # Vitest unit + Playwright E2E tests
├── docs/                       # Full documentation (24 docs)
├── .github/workflows/          # CI/CD pipeline
├── firebase.json               # Firebase config
├── firestore.rules             # Security rules
└── openapi.json                # REST API spec
```

## Documentation

Full documentation lives in the [`docs/`](docs/README.md) directory with 24 detailed guides covering architecture, every feature module, APIs, CI/CD, and testing.

## Deployment

```bash
# Deploy hosting + Firestore rules
firebase deploy --only hosting,firestore:rules --project amogha-cafe

# Deploy Cloud Functions
cd functions && npm install && firebase deploy --only functions
```

## License

Private — All rights reserved.
