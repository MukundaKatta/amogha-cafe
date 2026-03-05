# Amogha Cafe — Architecture Overview

This document explains the current end-to-end architecture of the application as implemented in the repository.

## 1. System Scope

Amogha Cafe is a multi-surface restaurant platform built on Firebase:

- Customer ordering web app (`/index.html`)
- Admin dashboard (`/admin.html`)
- Kitchen display (`/kitchen/`)
- Order tracking (`/track/`)
- QR ordering (`/qr/`)
- Display board (`/display/`)
- Kiosk (`/kiosk/`)
- Delivery app (`/delivery/`)
- POS terminal (`/pos/`)

## 2. High-Level Architecture

```text
[Browser Clients]
  |  (Firestore SDK reads/writes)
  v
[Cloud Firestore] <---- [Firestore Rules]
  ^
  |  (Admin SDK)
[Cloud Functions: Express API + Scheduled Jobs]
  |
  +--> Vertex AI (Gemini)

[Firebase Hosting]
  |- serves static files from repo root
  |- rewrites /api/** to Cloud Function "api"
```

## 3. Frontend Architecture

### 3.1 Build and Runtime

- Source code: `src/`
- Entry point: `src/main.js`
- Bundler: Vite (`npm run build`)
- Output: `script.js` (+ source map)
- Styling: `styles.css`

The frontend is modular ES JavaScript (no framework). Modules are imported for both side effects and named initializers.

### 3.2 Initialization Sequence

`src/main.js` initializes modules in this order:

1. UI and visual systems (`initUI`, hero text/slider)
2. Auth restoration (`initAuth`)
3. Cart restoration + addon cache + button sync (`loadCart`, `initAddonCache`, `restoreButtonStates`)
4. Cart event wiring (`initCart`)
5. Firestore-driven menu sync (`initMenuSync`)
6. Feature modules (`initLoyalty`, `initNotifications`, `initReservations`, `initFeatures`, `initProfile`)
7. Secondary async sections (daily special, combo builder, live ticker, reorder toast, chatbot, AI recommendations)

This ordering is important because many modules depend on previous window exports and DOM state.

### 3.3 Module Structure

Core:

- `src/core/firebase.js`: thin accessor (`getDb()`) to `window.db`
- `src/core/constants.js`: business constants (pricing thresholds, tiers, static dictionaries)
- `src/core/utils.js`: safe localStorage, clipboard fallback, scroll lock helpers

Feature modules (`src/modules/*.js`) include:

- `auth.js`, `profile.js`
- `cart.js`, `payment.js`, `splitbill.js`
- `menu.js`, `hero.js`, `ui.js`
- `features.js` (cross-cutting UX features)
- `loyalty.js`, `badges.js`, `group.js`, `subscriptions.js`
- `reservations.js`, `notifications.js`, `chatbot.js`

A key implementation pattern is explicit `Object.assign(window, { ... })` exports so HTML attributes and other modules can call functions globally.

## 4. Backend Architecture

### 4.1 Hosting + Routing

`firebase.json`:

- Static hosting root is project root (`"public": "."`)
- `/api/**` rewrites to Cloud Function `api`
- Cache headers configured by file type

### 4.2 Cloud Functions

Primary backend is `functions/index.js`:

- Express app exported as `exports.api`
- Pub/Sub scheduled function `exports.birthdayRewards`
- CORS allowlist for deployed Firebase domains
- Uses Firestore Admin SDK

Representative API endpoints:

- `GET /menu`, `GET /specials`
- `POST /order`, `GET /order/:id`
- AI endpoints: `/parse-bill`, `/chat`, `/smart-search`, `/recommend`, `/summarize-reviews`, `/forecast`, `/menu-insights`, `/smart-notify`, `/meal-plan`, `/smart-combo`, `/analytics-query`

AI endpoints call Vertex AI Gemini (`gemini-2.0-flash-001`) and use JSON-formatted responses.

## 5. Data Architecture (Firestore)

Main collections used by the platform:

- Commerce: `menu`, `orders`, `addons`, `coupons`, `giftCards`, `specials`
- Users and engagement: `users`, `reviews`, `referrals`, `notifications`, `chatHistory`
- Operations: `inventory`, `tables`, `deliveryPersons`, `messages`
- Config and multi-tenant: `settings`, `shops`, `kiosks`, `branches`
- Other features: `reservations`, `groupCarts`, `subscriptionPlans`, `subscriptions`, `mealPlans`, `heroSlides`, `socialPosts`, `testimonials`

Security rules are defined in `firestore.rules` with field/type validation and selective update constraints.

## 6. Auth and Security Model

Current app auth is custom (phone + PIN/password in app logic), not Firebase Authentication.

Consequences:

- `request.auth` is not available in Firestore rules
- true user-isolation guarantees are limited
- client-side trust boundaries are weaker than Firebase Auth + custom claims model

Mitigations currently present:

- field validation in Firestore rules
- restricted writes on sensitive collections
- blocked deletes in most collections

## 7. Key Runtime Flows

### 7.1 Customer Ordering Flow

1. Menu rendered and synchronized from Firestore
2. Cart managed in browser memory + localStorage
3. Checkout computes subtotal, delivery fee, discounts
4. Payment path (Razorpay or COD)
5. Order persisted to `orders`
6. Tracking link generated (`/track/index.html?id=<orderId>`)

### 7.2 Reservation Flow

1. Reservation modal generated/enhanced on demand
2. Inputs validated on client
3. Reservation persisted to `reservations`
4. Confirmation rendered in modal with WhatsApp link

### 7.3 AI/Smart Features Flow

1. Frontend calls `/api/*` Cloud Function endpoint
2. Function fetches contextual data (menu/orders/reviews)
3. Function prompts Gemini and normalizes response
4. Frontend consumes structured result

## 8. Testing Architecture

Two layers:

- Unit/integration style tests: Vitest (`tests/*.test.js`)
- Browser E2E tests: Playwright (`tests/e2e/*.spec.js`)

Commands:

- `npm test`
- `npm run test:coverage`
- `npm run test:e2e`

## 9. Architectural Strengths

- Clear modular split in `src/modules`
- Fast static hosting and simple deployment model
- Realtime backend via Firestore across all surfaces
- AI capabilities isolated to server-side Cloud Functions
- Multi-surface support (customer, ops, kiosk, POS)

## 10. Current Constraints and Risks

- Heavy reliance on global `window` exports across modules
- Client-heavy business logic with many DOM-coupled functions
- Custom auth model limits robust row-level access control
- Tight coupling between page-specific DOM structure and module code
- Mixed fallback behavior (Firestore vs hardcoded data) can diverge over time

## 11. Recommended Evolution Path

1. Introduce Firebase Auth (at least anonymous/phone auth) to enable secure per-user rules.
2. Move critical business invariants (pricing/discount validation) to callable/server endpoints.
3. Reduce global `window` API surface by introducing explicit module contracts.
4. Add schema/version checks for key collections (`orders`, `coupons`, `giftCards`).
5. Strengthen contract tests around checkout/payment and admin mutation paths.

## 12. Reference Files

- Frontend entry: `src/main.js`
- Frontend modules: `src/modules/*.js`
- Frontend core helpers: `src/core/*.js`
- Cloud Functions API: `functions/index.js`
- Hosting and rewrites: `firebase.json`
- Firestore security: `firestore.rules`
- Endpoint contract: `openapi.json`
