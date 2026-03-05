# Changelog

All notable changes to the Amogha Cafe platform are documented in this file.

---

## [1.0.0] — 2026-03-05

### Added
- **POS Terminal** (`/pos/`) — staff counter-side ordering with PIN login, customer CRM lookup, loyalty earn/redeem, sequential token numbers, thermal printing (Bluetooth + browser), WhatsApp bill sharing, void bill with loyalty reversal
- **Loyalty Balance Page** (`/loyalty/`) — customers check points by phone number
- **Self-Service Kiosk** (`/kiosk/`) — multi-tenant touch-first ordering with language toggle, voice support, accessibility features, screensaver mode, and QR table scanner
- **Delivery App** (`/delivery/`) — driver login, order pickup, active delivery workflow, GPS tracking, earnings dashboard
- **Group Ordering** — shared carts for group/split ordering via Firestore
- **Subscription Meal Plans** — browse, subscribe, cancel meal plans with admin management
- **AI Chatbot** — in-app chat assistant with conversational ordering and FAQ via Gemini
- **Achievement Badges** — 10 gamification badge types with badge gallery
- **Customer Profile** — DOB, dietary preferences, allergen alerts, saved addresses
- **Comprehensive Test Suite** — 2,059 Vitest unit/integration tests + Playwright E2E tests
- **CI/CD Pipeline** — GitHub Actions workflow: test → build → deploy on push to master
- **Full Documentation** — 24 docs covering architecture, features, APIs, and test plans

### Features (Customer)
- Public menu with category tabs, search, veg/non-veg filters
- Real-time Firestore menu sync with TTL-based local cache
- Item customization (spice levels, add-ons) with allergen warnings
- Smart pairing and upsell suggestions
- Coupon engine (percentage/flat), happy-hour discounts, combo discounts
- Multi-step checkout with Razorpay payments (UPI, cards, net banking, wallets)
- Cash-on-delivery flow, gift card redemption, split bill via UPI deep links
- Loyalty tiers (Bronze/Silver/Gold), referral tracking, birthday rewards, review rewards
- Table reservations with time slot selection and WhatsApp confirmation
- Reviews, testimonials, gallery with lightbox
- PWA with service workers, Firebase Cloud Messaging push notifications
- QR dine-in ordering with table context

### Features (Operations)
- Admin dashboard: orders, menu CRUD, inventory, reservations, customers, analytics, expenses, staff
- Kitchen Display System with live order queue, timers, and sound alerts
- Restaurant Display Board for front-of-house status
- Order Tracking with real-time timeline and delivery GPS map (Leaflet + OpenStreetMap)

### Features (API & AI)
- REST API: menu, specials, order creation, order tracking
- AI endpoints: bill parsing, smart search, recommendations, review summarization, forecasting, menu insights, smart notifications, meal plans, smart combos
- OpenAPI spec for external integrations
- Scheduled birthday coupon automation

### Security
- Firestore rules with field/type validation and restricted writes
- Security hardening across all pages
- Comprehensive bug audit (23 bugs fixed)

---

## [0.1.0] — 2026-03-03 (Pre-release)

### Added
- Initial project setup with Vite build system
- Firebase Firestore integration
- Core ordering flow (menu → cart → checkout)
- Basic admin dashboard
- Kitchen display and order tracking pages
