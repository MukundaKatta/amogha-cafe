# Amogha Cafe & Restaurant

**A production-grade, multi-surface restaurant platform** — online ordering, admin dashboard, kitchen display, POS, self-service kiosk, delivery management, and more — built on Firebase with AI-powered features.

## Live Demo

[https://amogha-cafe.web.app](https://amogha-cafe.web.app)

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Application Surfaces](#application-surfaces)
  - [Customer App (Main)](#1-customer-app-main)
  - [Admin Dashboard](#2-admin-dashboard)
  - [Kitchen Display System](#3-kitchen-display-system-kds)
  - [Self-Service Kiosk](#4-self-service-kiosk)
  - [Point of Sale (POS)](#5-point-of-sale-pos)
  - [Delivery Partner App](#6-delivery-partner-app)
  - [Order Display Board](#7-order-display-board)
  - [QR Dine-In Ordering](#8-qr-dine-in-ordering)
  - [Order Tracking](#9-order-tracking)
  - [Loyalty Lookup](#10-loyalty-lookup)
  - [Menu Page](#11-menu-page)
- [Features](#features)
  - [Ordering & Cart](#ordering--cart)
  - [Payments](#payments)
  - [Authentication](#authentication)
  - [Loyalty & Gamification](#loyalty--gamification)
  - [AI-Powered Features](#ai-powered-features)
  - [Social & Engagement](#social--engagement)
  - [Real-Time Operations](#real-time-operations)
  - [Personalization](#personalization)
  - [Accessibility](#accessibility)
- [Modules Reference](#modules-reference)
- [Firebase Backend](#firebase-backend)
  - [Cloud Functions API](#cloud-functions-api)
  - [Firestore Collections](#firestore-collections)
  - [Security Model](#security-model)
- [Design System](#design-system)
- [PWA & Native Apps](#pwa--native-apps)
- [Testing](#testing)
- [CI/CD Pipelines](#cicd-pipelines)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Scripts Reference](#scripts-reference)
- [Configuration Files](#configuration-files)
- [Known Limitations](#known-limitations)

---

## Overview

Amogha Cafe is a full-stack restaurant management platform with **10+ distinct application surfaces** serving customers, kitchen staff, delivery partners, cashiers, and administrators. The platform handles the complete restaurant lifecycle: browsing menus, placing orders, processing payments, preparing food, delivering orders, and collecting feedback.

Key highlights:
- **44 modular JavaScript features** with intelligent lazy-loading
- **20+ REST API endpoints** powered by Firebase Cloud Functions and Google Gemini AI
- **2,059+ automated tests** (unit, integration, and E2E)
- **6 CI/CD pipelines** for web, Android, and iOS deployment
- **Real-time sync** across all surfaces via Firestore listeners
- **PWA + native mobile** support via Capacitor (iOS & Android)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML/CSS/JS (ES6 modules) |
| Build | Vite 5.0 with code-splitting and legacy browser support |
| Backend | Firebase (Firestore, Cloud Functions, Hosting, Storage) |
| API | Express.js on Cloud Functions (Node.js 20) |
| AI | Google Gemini 2.0 Flash via Vertex AI |
| Payments | Razorpay (UPI, cards, wallets, net banking) |
| Maps | Leaflet.js + OpenStreetMap |
| Push Notifications | Firebase Cloud Messaging (FCM) |
| Native Apps | Capacitor 8 (iOS + Android) |
| Testing | Vitest + Playwright |
| CI/CD | GitHub Actions |
| PWA | Service Worker + Web App Manifest |

---

## Project Structure

```
amogha-cafe/
├── index.html                 # Main customer-facing app
├── script.js                  # Vite-built application bundle
├── styles.css                 # Compiled main stylesheet
├── premium.css                # Luxury animations, glassmorphism
├── worldclass.css             # Gift cards, photo reviews, advanced features
├── worldclass2.css            # Accessibility panel, calorie counter, tables
├── mobile-responsive.css      # Mobile breakpoints and touch optimization
├── enhancements.css           # Bug fixes, animation fallbacks
├── manifest.json              # PWA web app manifest
├── sw.js                      # Service worker (v95, offline + caching)
│
├── src/                       # Source modules (pre-build)
│   ├── main.js                # Entry point with lazy-loading orchestration
│   ├── core/
│   │   ├── constants.js       # Business rules, pricing, tiers, translations
│   │   ├── utils.js           # Sanitization, debounce, clipboard, currency
│   │   └── firebase.js        # Firestore initialization
│   └── modules/               # 41 feature modules (see Modules Reference)
│
├── admin/                     # Admin dashboard
│   └── index.html             # Orders, menu CRUD, analytics, kiosk mgmt
├── kitchen/                   # Kitchen Display System
│   └── index.html             # Real-time order board, station filtering
├── kiosk/                     # Self-service kiosk
│   └── index.html             # Touchscreen ordering, multi-language
├── pos/                       # Point of Sale terminal
│   └── index.html             # Cashier interface, loyalty integration
├── delivery/                  # Delivery partner app
│   └── index.html             # Order acceptance, GPS tracking, POD
├── display/                   # Customer-facing display board
│   └── index.html             # Now serving, queue status
├── qr/                        # QR code dine-in ordering
│   └── index.html             # Table-linked digital menu
├── track/                     # Order tracking page
│   └── index.html             # Real-time status + delivery map
├── loyalty/                   # Loyalty points lookup
│   └── index.html             # Balance check, tier info
├── menu/                      # Public menu page
│   └── index.html             # Browsable menu with search/filters
│
├── functions/                 # Firebase Cloud Functions
│   ├── index.js               # Express API (20+ endpoints, Gemini AI)
│   ├── package.json
│   └── tests/                 # Jest API tests
│
├── tests/                     # Frontend test suite
│   ├── setup.js               # Global mocks (localStorage, Firestore, DOM)
│   ├── *.test.js              # 50 test files, 2,059+ tests
│   ├── e2e/                   # Playwright end-to-end tests
│   └── helpers/
│
├── scripts/                   # Build and seeding utilities
│   ├── prepare-ios.mjs        # Capacitor web bundle prep (used for iOS + Android)
│   ├── build-kiosk.sh         # Kiosk-specific Android build
│   ├── build-pos.sh           # POS-specific Android build
│   ├── seed-menu.js           # Menu data seeder (57 items)
│   └── seed-shops.js          # Multi-tenant shop seeder
│
├── .github/workflows/         # CI/CD pipelines
│   ├── deploy.yml             # Firebase deploy (hosting + functions)
│   ├── release-android.yml    # Google Play release (main/kiosk/POS)
│   ├── release-ios.yml        # App Store release
│   ├── build-kiosk-apk.yml    # Debug APK for kiosk
│   ├── build-pos-apk.yml      # Debug APK for POS
│   └── static.yml             # Static deployment check
│
├── docs/                      # 33 documentation files
├── assets/                    # Hashed chunks (Vite output)
├── pics/                      # Restaurant photos
├── android/                   # Capacitor Android project
├── ios/                       # Capacitor iOS project
│
├── firebase.json              # Hosting, rewrites, headers, CSP
├── firestore.rules            # Database security rules (22KB)
├── firestore.indexes.json     # Composite query indexes
├── storage.rules              # Storage security (menu images only)
├── capacitor.config.ts        # Native app configuration
├── vite.config.js             # Build config with code-splitting
├── vitest.config.js           # Test runner configuration
├── seed-firestore.js          # Initial database seeding
└── package.json               # Dependencies and scripts
```

---

## Application Surfaces

### 1. Customer App (Main)

**URL:** `/` (index.html)

The primary customer-facing ordering interface.

**Sections:**
- **Hero** — Full-viewport slideshow with parallax, rotating taglines, sparkle effects
- **About** — Restaurant story and values
- **Chef** — Chef slideshow with specialties and bios
- **Specials** — Today's special offers with badges (Bestseller, Must Try)
- **Menu** — Category-browsable menu with search, dietary filters (veg/non-veg), spice level picker, add-ons
- **Combo Builder** — Build custom combo meals with discount
- **Gallery** — Photo gallery with lightbox viewer
- **Reviews** — Customer testimonials carousel with photo reviews
- **Contact** — Location, hours, newsletter signup, reservation form
- **Footer** — Quick links, legal pages, social media, trust badges

**Floating Elements:**
- Cart FAB with live item count
- WhatsApp quick-contact button
- AI Chatbot FAB
- Accessibility panel (bottom-left)

---

### 2. Admin Dashboard

**URL:** `/admin/`

Management hub for restaurant operations. PIN-protected.

- **Order Management** — View, update status (new > preparing > ready > completed), filter by status
- **Menu CRUD** — Add/edit/remove items, upload images, manage pricing and categories
- **Dynamic Pricing** — Configure time-based and demand-based pricing rules
- **Kiosk Management** — Add/activate/deactivate self-service terminals
- **Printer Configuration** — Set receipt printer IP addresses per shop
- **Shop Settings** — Multi-location configuration (name, hours, theme)
- **Revenue Analytics** — Sales reports with CSV export
- **Add-ons Administration** — Manage optional item upgrades
- **Theme Toggles** — Seasonal themes (Diwali, Christmas, Holi, Monsoon)

---

### 3. Kitchen Display System (KDS)

**URL:** `/kitchen/`

Live order preparation board for kitchen staff.

- **Multi-Column Board** — New | Preparing | Waiting | Ready columns
- **Order Cards** — Color-coded by status, elapsed time tracking, priority flags
- **Station Filtering** — Filter by kitchen station (grill, fryer, assembly)
- **Actions** — Start, done, recall, rush, check-off individual items, batch operations
- **Inventory Tracking** — Live stock decrement on order start
- **Kitchen Chat** — Staff communication channel
- **Table Assignment** — Auto-assign dine-in orders
- **Theme Toggle** — Dark/bright mode for different kitchen lighting
- **Full-Screen Mode** — Optimized for wall-mounted displays

---

### 4. Self-Service Kiosk

**URL:** `/kiosk/`

Customer-facing touchscreen interface for in-store ordering.

- **Category Navigation** — Browse tabs with search and dietary filter (all/veg/non-veg)
- **Item Cards** — Image, price, description, "Add to Cart" with spice level and add-ons picker
- **Cart Management** — Sticky bottom bar with quantity controls and real-time totals
- **Checkout** — Customer name, phone, dine-in/delivery, payment method (cash/card/Razorpay)
- **Multi-Language** — English, Hindi, Telugu
- **Loyalty Lookup** — Check points balance by phone number
- **Haptic Feedback** — Vibration on interactions (mobile devices)
- **Multi-Tenant** — Configurable per shop with separate settings

---

### 5. Point of Sale (POS)

**URL:** `/pos/`

Counter-based cashier terminal for in-store transactions.

- **Staff Login** — PIN-based authentication
- **Token System** — Numbered order tokens per shop
- **Quick Menu** — Category-based item selection with frequency tracking
- **Customer Lookup** — Search by phone number, auto-create profiles
- **Loyalty Integration** — Check balance, apply points discount, update tier
- **Checkout** — Subtotal with tax, multiple payment methods (cash, card, Razorpay)
- **Invoice Generation** — Sequential numbering with receipt printing
- **Purchase History** — Track per-customer orders

---

### 6. Delivery Partner App

**URL:** `/delivery/`

Mobile interface for delivery partners.

- **Partner Login** — Phone + PIN authentication
- **Available Orders** — List of unassigned deliveries with address, fee, and customer info
- **Active Delivery** — GPS tracking, Google Maps navigation link
- **Proof of Delivery** — Photo capture at delivery location with retake option
- **Earnings Dashboard** — Daily/total earnings with per-order breakdown
- **Delivery History** — Past deliveries with details

**Status Flow:** Accept > Start Delivery (GPS begins) > Navigate > Capture Photo > Mark Complete

---

### 7. Order Display Board

**URL:** `/display/`

Customer-facing screen for wait areas.

- **Now Serving** — Large display of current order number
- **Call Next** — Staff triggers next order announcement
- **Order Queue** — Preparing, ready, and recently completed orders
- **Estimated Wait Times** — By order type (dine-in vs takeout)
- **Audio Announcements** — Bell/chime when orders are ready
- **Full-Screen** — Optimized for wall-mounted displays

---

### 8. QR Dine-In Ordering

**URL:** `/qr/`

Contactless table ordering via QR codes.

- **Table Detection** — Auto-detect table number from URL parameter or manual entry
- **Digital Menu** — Full menu with images, descriptions, search, and customization
- **Order Building** — Add items with spice levels and add-ons
- **Kitchen Sync** — Orders appear on KDS immediately with table assignment
- **Payment** — Integrated Razorpay or bill splitting

---

### 9. Order Tracking

**URL:** `/track/?id=[orderId]`

Public-facing order status page.

- **Status Timeline** — Placed > Confirmed > Preparing > Quality Check > Ready/Out for Delivery
- **Live Map** — Leaflet.js map showing delivery partner GPS location
- **ETA Countdown** — Estimated delivery time
- **Order Summary** — Items, total cost, delivery partner info
- **Real-Time Updates** — Auto-refresh every 10 seconds via Firestore listener
- **Share Status** — Share tracking link via native share or clipboard

---

### 10. Loyalty Lookup

**URL:** `/loyalty/`

Standalone loyalty balance checker.

- **Phone Lookup** — Enter 10-digit phone to query account
- **Points Display** — Current balance with progress bar to next redemption
- **Tier Info** — Current tier (Bronze/Silver/Gold/Platinum) with perks
- **Stats** — Total visits, total spent, last visit date
- **Redemption Rules** — 100 points = Rs.100 off next order of Rs.250+

---

### 11. Menu Page

**URL:** `/menu/`

SEO-optimized public menu page.

- **Full Menu** — All categories with images, prices, dietary indicators
- **Search & Filter** — Real-time item search with category filtering
- **Allergen Warnings** — Per-item allergen information
- **Order Links** — Direct links to kiosk or delivery ordering
- **SEO** — Meta tags, structured data, Open Graph tags

---

## Features

### Ordering & Cart

| Feature | Description |
|---------|-------------|
| **Category Menu** | 15+ categories (Biryanis, Curries, Starters, Noodles, Bread, Beverages, etc.) |
| **Spice Levels** | Per-item spice customization (mild, medium, spicy, extra-hot) |
| **Add-ons** | Optional upgrades (sides, sauces, extras) with pricing |
| **Cart Management** | Add, remove, update quantity (max 50), clear cart |
| **Fly-to-Cart Animation** | Micro-interaction on item add |
| **Floating Cart** | Sticky bottom bar (mobile) + FAB with badge count |
| **Checkout Flow** | 4-step: Summary > Customer Details > Payment > Confirmation |
| **Scheduled Orders** | Place orders for future date/time |
| **Reorder** | Quick reorder from 3 most recent orders |
| **Group Ordering** | Shared cart via URL, host-initiated checkout |
| **Combo Builder** | Custom combo meals with 15% discount |
| **Delivery/Pickup** | Toggle order type; free delivery above Rs.500, else Rs.49 fee |

### Payments

| Feature | Description |
|---------|-------------|
| **Razorpay** | UPI, credit/debit cards, net banking, wallets |
| **Cash on Delivery** | COD with pending status tracking |
| **Coupon Codes** | Percentage and flat discounts (AMOGHA20, WELCOME50, FIRST10) |
| **Gift Cards** | Purchase (Rs.50-25,000), send via WhatsApp/SMS, redeem at checkout |
| **Loyalty Redemption** | Redeem points as discount (100 pts = Rs.10 off) |
| **Split Bill** | Post-checkout UPI link generation for each person's share |
| **Server-Side Validation** | All prices recalculated server-side to prevent manipulation |

### Authentication

| Feature | Description |
|---------|-------------|
| **Phone + PIN** | Primary auth method with SHA-256 hashing |
| **Session Persistence** | 7-day sessions stored in localStorage |
| **Rate Limiting** | 5 login attempts per 5 minutes |
| **Guest Mode** | Browse and add to cart without sign-in |
| **Referral Signup** | Apply referral code during registration |
| **Staff Auth** | Separate PIN-based login for admin, kitchen, POS, delivery |

### Loyalty & Gamification

| Feature | Description |
|---------|-------------|
| **Points System** | 1 point per Rs.10 spent; 100 points = Rs.10 off |
| **4 Tiers** | Bronze (0) > Silver (500) > Gold (1000) > Platinum (2500) |
| **Tier Perks** | Escalating discounts (0-15%), free delivery, birthday bonuses |
| **Streaks** | Consecutive-day ordering bonuses (2x points on 3-day streak) |
| **Badges** | 10 achievement types (First Bite, Explorer, Streak Master, Night Owl, etc.) |
| **Milestones** | 12 levels (First Bite to VIP) with 25-1000 point rewards |
| **Challenges** | Weekly goals (Menu Explorer, Early Bird, 3-Day Streak, etc.) |
| **Spin-the-Wheel** | 1 free spin per order; prizes include points, discounts, free items |
| **Referral Program** | 100 pts for referrer, 150 for referee; 5 referral tiers |
| **Secret Menu** | Loyalty-tier-gated exclusive items (Gold/Platinum/Diamond unlock) |
| **Birthday Bonus** | Auto-generated 30% off coupon during birth month |

### AI-Powered Features

All AI endpoints use Google Gemini 2.0 Flash via Vertex AI.

| Feature | Endpoint | Description |
|---------|----------|-------------|
| **Chatbot** | `POST /api/chat` | Conversational ordering assistant with menu context |
| **Smart Search** | `POST /api/smart-search` | Natural language menu search with dietary filtering |
| **Recommendations** | `POST /api/recommend` | Personalized suggestions based on history + time of day |
| **Review Analysis** | `POST /api/summarize-reviews` | Sentiment analysis and theme extraction |
| **Demand Forecast** | `POST /api/forecast` | Predict next-day demand by item |
| **Menu Insights** | `POST /api/menu-insights` | Optimization recommendations (promote/reprice/retire) |
| **Smart Combos** | `POST /api/smart-combo` | AI-generated combo meals from order patterns |
| **Meal Planning** | `POST /api/meal-plan` | 7-day meal plans with budget and dietary constraints |
| **Analytics Q&A** | `POST /api/analytics-query` | Natural language data queries with chart generation |
| **Smart Notifications** | `POST /api/smart-notify` | Personalized push notification content |
| **Bill Parsing** | `POST /api/parse-bill` | OCR expense extraction from receipt photos |

### Social & Engagement

| Feature | Description |
|---------|-------------|
| **Instagram Stories** | Daily specials, behind-the-scenes, user content (auto-play, swipe nav) |
| **Social Sharing** | Share orders, menu items, achievements (WhatsApp, Twitter, clipboard) |
| **Photo Reviews** | Star ratings + photo upload for menu items |
| **Community Polls** | Vote on new menu items with result visualization |
| **Social Proof** | "Someone just ordered..." toast notifications |
| **Newsletter** | Email subscription via footer form |
| **WhatsApp Integration** | Order confirmations, reservation confirmations, referral sharing |

### Real-Time Operations

| Feature | Description |
|---------|-------------|
| **Order Sync** | Firestore real-time listeners across all surfaces |
| **Kitchen Board** | Live order queue with elapsed time and auto-bump alerts |
| **GPS Tracking** | Delivery partner location shared to tracking page |
| **Live Queue** | Wait time estimation with 4 busy levels (low/normal/busy/peak) |
| **Inventory** | Stock decrement on order start, live count in kitchen |
| **Table Status** | Real-time table availability across POS and QR systems |
| **Push Notifications** | FCM for order status, promotions, and alerts |
| **Geofencing** | 200m proximity alert, 50m arrival auto-notification |

### Personalization

| Feature | Description |
|---------|-------------|
| **Time-Aware Greetings** | Morning/lunch/evening/night greetings with relevant suggestions |
| **Mood Ordering** | Comfort Food, Light & Healthy, Party Mode, Romantic, Hungover Recovery |
| **Weather Recommendations** | Hot/cold/rainy/pleasant weather-based menu suggestions |
| **Seasonal Themes** | Diwali (lamps), Christmas (snow), Holi (rainbow), Monsoon (rain) |
| **Music Player** | 4 time-based playlists (Morning Brew, Afternoon Jazz, Evening Lounge, Classical) |
| **Recently Ordered** | Quick reorder carousel based on history |
| **Customer Profile** | Dietary preferences, allergen tracking (8 types), saved addresses |
| **Dynamic Pricing** | Happy hours (weekdays 2-5pm: 15% off beverages; daily 10-11pm: 20% off) |
| **Subscription Plans** | Weekly meal plans with up to 30% savings |

### Accessibility

| Feature | Description |
|---------|-------------|
| **Accessibility Panel** | Floating button with options for contrast, motion, text size, dyslexia font |
| **High Contrast Mode** | Enhanced contrast (1.3x) with stronger borders |
| **Reduced Motion** | Respects `prefers-reduced-motion`; animations reduced to 0.01ms |
| **Dyslexia Font** | OpenDyslexic with increased letter/word spacing |
| **ARIA Live Regions** | Screen reader announcements for cart, checkout, and payment changes |
| **Keyboard Navigation** | Full keyboard support with visible focus states (gold outline) |
| **Touch Targets** | 44-48px minimum for all interactive elements |
| **Voice Ordering** | Web Speech API with 12+ voice commands (English-India) |
| **Multi-Language** | English, Hindi, Telugu (Noto Serif Telugu font) |

---

## Modules Reference

41 feature modules loaded via intelligent lazy-loading in 3 tiers:

### Tier 1 — Critical (Eagerly Loaded)
| Module | Purpose |
|--------|---------|
| `auth.js` | Sign in/up, session management, PIN hashing, rate limiting |
| `cart.js` | Cart operations, add-ons, spice levels, floating UI, animations |
| `payment.js` | Razorpay, COD, invoice generation, order creation |
| `menu.js` | Cached Firestore reads, search, category filters, ratings |
| `hero.js` | Slideshow, rotating taglines, golden line animations |
| `ui.js` | Scroll utilities, dark mode, navigation, parallax |
| `notifications.js` | FCM push notifications, permission banners |
| `reservations.js` | Table booking with date/time picker, WhatsApp confirmation |
| `loyalty.js` | Points tracking, tier management, birthday rewards |
| `features.js` | Reviews, gallery, combos, happy hours, voice, i18n |

### Tier 2 — Deferred (Loaded on Idle/Interaction)
| Module | Purpose |
|--------|---------|
| `profile.js` | DOB, dietary preferences, allergens, saved addresses |
| `badges.js` | 10 achievement types with display |
| `group.js` | Shared carts via Firestore, URL-based joining |
| `chatbot.js` | AI ordering assistant, Gemini integration |
| `splitbill.js` | UPI link generation for bill splitting |
| `subscriptions.js` | Weekly meal plan management |
| `challenges.js` | Weekly goals with reward claiming |
| `spinwheel.js` | Canvas-based rewards wheel (8 segments) |
| `secretmenu.js` | Tier-gated exclusive menu items |
| `feedback.js` | Emoji ratings, tipping, 30s post-order prompt |
| `socialshare.js` | WhatsApp/Twitter sharing with bonus points |
| `polls.js` | Community voting on new menu items |
| `milestones.js` | 12 achievement milestones with confetti |
| `ordertracker.js` | 5-stage Domino's-style order tracking |
| `personalize.js` | Time-of-day greetings and reorder carousel |
| `enhancements.js` | Open/closed status, social proof, cookie consent |
| `premium.js` | Scroll reveals, ripple effects |

### Tier 3 — World-Class (Loaded via IntersectionObserver)
| Module | Purpose |
|--------|---------|
| `stories.js` | Instagram-style stories (5 groups, auto-play, swipe) |
| `moodorder.js` | Mood-based menu curation (5 moods) |
| `livequeue.js` | Real-time wait estimation (4 busy levels) |
| `streaks.js` | Consecutive-day ordering streaks (7 tiers) |
| `giftcards.js` | 8 design templates, QR codes, WhatsApp delivery |
| `referral.js` | Code generation, 5 referral tiers, dual rewards |
| `musicplayer.js` | 4 playlists, time-based auto-selection, volume memory |
| `arpreview.js` | AR food preview (4 demo models, camera overlay) |
| `voiceorder.js` | Web Speech API, 12+ commands, speech synthesis |
| `geofence.js` | Haversine distance, proximity alerts, auto-prep |
| `weather.js` | Open-Meteo API, 4 conditions, 15-min cache |
| `seasonal.js` | Festival themes with particle effects and countdowns |

---

## Firebase Backend

### Cloud Functions API

**Base URL:** `https://amogha-cafe.web.app/api`

#### Public Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | API health check with Firestore latency |
| `GET` | `/menu` | Menu items with pagination (`?limit=&offset=`) |
| `GET` | `/specials` | Today's special offers |
| `POST` | `/order` | Place COD order (server-side price validation) |
| `GET` | `/order/:id` | Track order by ID |
| `POST` | `/auth/kiosk-login` | POS/kiosk authentication |
| `POST` | `/auth/delivery-login` | Delivery partner authentication |
| `POST` | `/chat` | AI chatbot conversation |
| `POST` | `/smart-search` | Natural language menu search |
| `POST` | `/recommend` | Personalized recommendations |
| `POST` | `/meal-plan` | 7-day meal planning |
| `POST` | `/parse-bill` | OCR bill parsing (max 4MB) |

#### Admin Endpoints (API Key Required)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/notify` | Send FCM push notification |
| `POST` | `/analytics-query` | Natural language analytics Q&A |
| `POST` | `/forecast` | Demand prediction |
| `POST` | `/menu-insights` | Menu optimization recommendations |
| `POST` | `/summarize-reviews` | Review sentiment analysis |
| `POST` | `/smart-combo` | AI combo meal suggestions |
| `POST` | `/smart-notify` | AI notification content generation |
| `POST` | `/auth/hash-migrate` | One-time password hash migration |

#### Scheduled Functions

| Function | Schedule | Description |
|----------|----------|-------------|
| `birthdayRewards` | Daily 8:00 AM IST | Auto-generate 30% off coupons for birthday users |

#### Rate Limiting

- **AI endpoints:** 30 requests/minute/IP (Firestore-backed)
- **Order placement:** 5 orders/hour/phone
- **Login:** 5 attempts/5 minutes/identifier

### Firestore Collections

| Collection | Purpose | Access |
|------------|---------|--------|
| `users` | Customer profiles, loyalty points, phone-based ID | Read/Write |
| `orders` | Order lifecycle with status tracking | Read/Write |
| `menu` | Menu items with pricing, categories, availability | Read/Write |
| `shops` | Multi-location shop configuration | Read/Write |
| `kiosks` | Self-service terminal configurations | Read/Write |
| `inventory` | Stock levels (kitchen-only read via Console) | Write-only |
| `tables` | Dine-in table status mapping | Read/Write |
| `reservations` | Table booking records | Read/Write |
| `reviews` | Customer ratings and feedback (immutable) | Create/Read |
| `coupons` | Promotional codes with usage tracking | Read + usedCount update |
| `giftCards` | Digital gift cards with balance tracking | Read + balance update |
| `referrals` | Referral code tracking | Read/Write |
| `notifications` | Push notification records | Read/Write |
| `messages` | Kitchen staff chat (immutable) | Create/Read |
| `deliveryPersons` | Delivery partner credentials (fully protected) | None (Cloud Functions only) |
| `expenses` | Admin expense tracking | Read/Write |
| `staff` | Staff management | Read/Write |
| `groupCarts` | Shared group ordering carts | Read/Write |
| `subscriptions` | Meal plan subscriptions | Read/Write |
| `feedback` | Post-order feedback (write-only) | Create only |
| `cateringInquiries` | Catering event requests (write-only) | Create only |
| `chatHistory` | AI conversation logs (protected) | Cloud Functions only |
| `newsletter` | Email subscriptions (write-only) | Create only |
| `polls` | Community voting | Read + vote update |
| `settings` | Global config (6 allowed doc IDs) | Read/Write |
| `dynamicPricing` | Time/demand-based pricing rules | Read |
| `specials` | Daily special offers | Read/Write |
| `heroSlides` | Homepage banner content | Read/Write |
| `testimonials` | Customer testimonials (admin-managed) | Read only |
| `socialPosts` | Social media feed (admin-managed) | Read only |
| `addons` | Optional item upgrades (admin-managed) | Read only |

### Security Model

- **Authentication:** Custom phone+PIN (not Firebase Auth) with bcrypt/SHA-256 hashing
- **Field Validation:** Schema enforcement on create (required fields, type checks, length limits)
- **Immutable Fields:** phone, PIN, createdAt cannot be modified after creation
- **No Deletes:** All collections block deletions; soft deletes via status fields
- **Protected Collections:** `deliveryPersons`, `chatHistory`, `mealPlans` are read-blocked from clients
- **Server-Side Price Validation:** Order totals recalculated from menu DB to prevent tampering
- **CORS:** Restricted to `amogha-cafe.web.app`, `amogha-cafe.firebaseapp.com`, `amoghahotels.com`
- **Security Headers:** CSP, X-Frame-Options, HSTS, X-Content-Type-Options, Permissions-Policy
- **Prompt Injection Prevention:** AI inputs sanitized (control chars stripped, injection patterns filtered)

---

## Design System

### Color Palette
- **Primary Gold:** `#D4A017` (accent, CTAs, luxury branding)
- **Dark Brown:** `#1e140e` (primary background)
- **Deep Dark:** `#110b06` (secondary background)
- **Red Accent:** `#8B1A1A` (secondary highlights)
- **Cream:** `#faf7f2`, `#f2ece4` (light text surfaces)

### Typography
- **Playfair Display** — Serif headings (decorative, luxury feel)
- **Cormorant Garamond** — Serif body text (elegant readability)
- **Poppins** — Sans-serif UI (interface elements, buttons)
- **Noto Serif Telugu** — Regional script support
- **OpenDyslexic** — Accessibility (toggled via a11y panel)

### Animation Easing
- **Fast:** `0.2s cubic-bezier(.4, 0, .2, 1)` — Micro-interactions
- **Smooth:** `0.4s cubic-bezier(.16, 1, .3, 1)` — Standard transitions
- **Luxe:** `0.6s cubic-bezier(.22, 1, .36, 1)` — Premium feel
- **Spring:** `0.5s cubic-bezier(.34, 1.56, .64, 1)` — Bouncy feedback

### Key Patterns
- **Glassmorphism** — Semi-transparent backgrounds + `backdrop-filter: blur()` for modals
- **Gradient Text** — `background-clip: text` for premium headings
- **Staggered Reveals** — Sequential entrance animations via `.reveal-delay-*` classes
- **Notch-Safe Padding** — `env(safe-area-inset-*)` for iPhone X+ support
- **Layered Shadows** — Depth hierarchy with `--shadow-subtle/medium/heavy/glow/glass`

### Responsive Breakpoints
- **768px** — Tablet (2-column grids, adjusted spacing)
- **480px** — Phone (single column, enlarged touch targets, hamburger nav)
- **360px** — Small phone (minimal padding, maximum content density)

### CSS Architecture (486 KB total)
| File | Size | Purpose |
|------|------|---------|
| `styles.css` | 275 KB | Complete design system and base styles |
| `premium.css` | 121 KB | Luxury animations, glassmorphism, preloader |
| `worldclass.css` | 32 KB | Gift cards, photo reviews, advanced features |
| `worldclass2.css` | 16 KB | Accessibility panel, calorie counter, table selection |
| `mobile-responsive.css` | 22 KB | Mobile breakpoint overrides |
| `enhancements.css` | 20 KB | Bug fixes, animation fallbacks |

CSS is loaded progressively: critical styles inline, main async, premium/worldclass deferred.

---

## PWA & Native Apps

### Progressive Web App
- **Manifest:** Standalone display, portrait orientation, food/restaurant/lifestyle categories
- **Service Worker (v95):** Network-first for HTML, cache-first for hashed assets, offline SVG fallback
- **Cache Strategy:** Auto-trim at 200 items, runs every 50 fetches
- **Shortcuts:** View Menu, Today's Specials, Reserve a Table, Scan QR to Order
- **Icons:** 192x192 and 512x512 (both regular and maskable)

### Native Apps (Capacitor 8)
- **App ID:** `com.amoghahotels.cafe`
- **Platforms:** iOS and Android
- **Features:** StatusBar (dark), SplashScreen (1.5s), navigation allowlist for Razorpay/Firebase
- **Builds:**
  - Main app: `npm run build:ios` / `npm run build:android`
  - Kiosk app: `npm run build:kiosk-android`
  - POS app: `npm run build:pos-android`

### App Store Distribution
- **Android:** Google Play (internal/alpha/beta/production tracks via GitHub Actions)
- **iOS:** App Store via Fastlane

---

## Testing

### Framework
- **Unit/Integration:** Vitest with jsdom environment
- **E2E:** Playwright
- **Coverage:** Istanbul

### Test Suite (2,059+ tests across 50 files)

| Category | Files | Coverage |
|----------|-------|----------|
| Authentication | `auth.test.js`, `auth-extended.test.js`, `auth-flow.test.js` | Sign in/up, session, rate limiting, social login |
| Cart | `cart.test.js`, `cart-extended.test.js` | Add/remove, quantity, add-ons, customization |
| Menu | `menu.test.js`, `menu-extended.test.js` | Display, search, ratings, pricing rules |
| Payment | `payment.test.js`, `payment-extended.test.js`, `payment-extra.test.js` | Razorpay, COD, split bills, gift cards, coupons |
| Loyalty | `loyalty.test.js`, `loyalty-extended.test.js` | Points, tiers, referrals, badges |
| Hero | `hero.test.js` | Slideshow, animations, text rendering |
| Reservations | `reservations.test.js`, `reservations-extra.test.js` | Booking, availability |
| Profile | `profile.test.js` | Dietary preferences, addresses |
| Group | `group.test.js` | Shared carts |
| Split Bill | `splitbill.test.js` | UPI link generation |
| Badges | `badges.test.js` | 10 achievement types |
| Notifications | `notifications.test.js` | FCM, push, banners |
| Subscriptions | `subscriptions.test.js` | Meal plans |
| Chatbot | `chatbot.test.js` | AI conversation |
| Admin | `admin.test.js`, `admin-sw.test.js` | Dashboard, service worker |
| Kitchen | `kitchen.test.js`, `kitchen-sw.test.js` | KDS, service worker |
| Kiosk | `kiosk.test.js`, `kiosk-sw.test.js` | Kiosk operations, service worker |
| POS | `pos.test.js`, `pos-extended.test.js` | Terminal operations |
| Delivery | `delivery.test.js` | Driver tracking |
| Display | `display.test.js` | Order board |
| QR | `qr.test.js` | QR ordering |
| Tracking | `track.test.js` | Order tracking UI |
| Service Worker | `sw.test.js`, `caching.test.js` | Offline, cache strategies |
| UI | `ui.test.js` | Components, interactions, animations |
| Features | `features.test.js`, `features-extended.test.js` | Feature flags, integrations |
| Edge Cases | `edge-cases.test.js`, `coverage-gaps.test.js` | Error handling, boundary conditions |

### Running Tests

```bash
# Unit/integration tests
npm test

# With coverage report
npm run test:coverage

# E2E tests (Playwright)
npm run test:e2e
```

---

## CI/CD Pipelines

6 GitHub Actions workflows in `.github/workflows/`:

| Workflow | Trigger | What It Does |
|----------|---------|--------------|
| `deploy.yml` | Push to master | Build (Vite) + Deploy to Firebase (hosting, rules, functions) |
| `release-android.yml` | Manual | Sign AAB + upload to Google Play (main/kiosk/POS apps) |
| `release-ios.yml` | Manual | Build signed IPA + upload to App Store via Fastlane |
| `build-kiosk-apk.yml` | Manual | Debug APK for kiosk testing |
| `build-pos-apk.yml` | Manual | Debug APK for POS testing |
| `static.yml` | Manual | Static deployment verification |

---

## Getting Started

### Prerequisites
- Node.js 20+
- npm 9+
- Firebase CLI (`npm install -g firebase-tools`)

### Installation

```bash
# Clone the repository
git clone https://github.com/MukundaKatta/amogha-cafe.git
cd amogha-cafe

# Install dependencies
npm install

# Install Cloud Functions dependencies
cd functions && npm install && cd ..
```

### Development

```bash
# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Preview production build
npm run preview
```

### Database Seeding

```bash
# Seed menu items, inventory, tables, and sample data
node seed-firestore.js

# Seed menu items only
node scripts/seed-menu.js

# Seed shop configuration
node scripts/seed-shops.js
```

### Deployment

```bash
# Deploy everything to Firebase
firebase deploy

# Deploy only hosting
firebase deploy --only hosting

# Deploy only Cloud Functions
firebase deploy --only functions

# Deploy only Firestore rules
firebase deploy --only firestore:rules
```

### Native App Builds

```bash
# iOS
npm run build:ios

# Android (main app)
npm run build:android

# Android (kiosk-specific)
npm run build:kiosk-android

# Android (POS-specific)
npm run build:pos-android
```

---

## Environment Variables

### Cloud Functions

| Variable | Required | Description |
|----------|----------|-------------|
| `ADMIN_API_KEY` | Yes | Shared secret for admin API endpoints |
| `GCP_PROJECT` | Yes | Google Cloud project ID (`amogha-cafe`) |
| `GCLOUD_PROJECT` | Fallback | Alternative project ID variable |

### GitHub Actions Secrets (for CI/CD)

| Secret | Used By | Description |
|--------|---------|-------------|
| `FIREBASE_TOKEN` | deploy.yml | Firebase CLI authentication token |
| `SIGNING_KEY_BASE64` | release-android.yml | Base64-encoded Android keystore |
| `KEY_STORE_PASSWORD` | release-android.yml | Keystore password |
| `KEY_PASSWORD` | release-android.yml | Key password |
| `KEY_ALIAS` | release-android.yml | Key alias |
| `PLAY_SERVICE_ACCOUNT_JSON` | release-android.yml | Google Play upload credentials |

---

## Scripts Reference

| Script | Command | Description |
|--------|---------|-------------|
| Dev server | `npm run dev` | Start Vite development server with HMR |
| Build | `npm run build` | Production build with minification and code-splitting |
| Preview | `npm run preview` | Serve production build locally |
| Test | `npm test` | Run Vitest test suite |
| Coverage | `npm run test:coverage` | Tests with Istanbul coverage report |
| E2E | `npm run test:e2e` | Playwright browser tests |
| iOS build | `npm run build:ios` | Build + sync iOS (Capacitor) |
| Android build | `npm run build:android` | Build + sync Android (Capacitor) |
| Kiosk APK | `npm run build:kiosk-android` | Kiosk-specific Android build |
| POS APK | `npm run build:pos-android` | POS-specific Android build |

---

## Configuration Files

| File | Purpose |
|------|---------|
| `firebase.json` | Hosting config, rewrites (`/api/** > Cloud Functions`), caching headers, CSP |
| `firestore.rules` | Database security rules (22KB, field-level validation) |
| `firestore.indexes.json` | Composite indexes for orders, menu queries |
| `storage.rules` | Storage access (menu images only, 2MB max, JPEG/PNG/WebP) |
| `capacitor.config.ts` | Native app config (app ID, splash screen, status bar) |
| `vite.config.js` | Build config (4 code-split chunks, Terser, legacy browser support) |
| `vitest.config.js` | Test config (jsdom, Istanbul coverage, setup file) |
| `manifest.json` | PWA manifest (standalone, shortcuts, icons) |
| `.firebaserc` | Firebase project binding (`amogha-cafe`) |
| `robots.txt` | Search engine crawl directives |
| `sitemap.xml` | SEO sitemap |

### Vite Code-Splitting Strategy

| Chunk | Modules | Purpose |
|-------|---------|---------|
| `core` | utils.js, constants.js | Shared foundation (loaded first) |
| `worldclass` | stories, moodorder, livequeue, streaks, giftcards, referral, music, AR, voice, geofence | Premium features (lazy) |
| `engagement` | challenges, spinwheel, secretmenu, feedback, social, polls, milestones, ordertracker | Gamification (lazy) |
| `seasonal` | seasonal, weather | Contextual features (lazy) |

---

## Known Limitations

1. **No Row-Level Security** — Custom phone+PIN auth (not Firebase Auth) means `request.auth` is always null; true per-user data isolation is not enforceable via Firestore rules alone.

2. **Kiosk Passwords Readable** — The `kiosks` collection is currently readable from clients. Should be restricted to Cloud Functions.

3. **Inventory Read-Blocked** — Kitchen staff cannot query stock levels from the client; must use Firebase Console.

4. **No Email Service** — Newsletter collection is write-only; no email delivery integration (SendGrid/Mailgun) yet.

5. **Analytics Computed On-the-Fly** — Revenue/order analytics aggregate from raw orders each request; no daily roll-up summaries.

6. **Limited Offline Support** — Service worker caches assets but Firestore offline persistence is not configured for full offline ordering.

---

## Additional Resources

- [Architecture Overview](docs/00-architecture.md)
- [All Features Detailed](docs/00-all-features-detailed.md)
- [API Documentation](openapi.json)
- [Product Review](docs/PRODUCT_REVIEW.md)
- [Changelog](CHANGELOG.md)
- [Contributing Guide](CONTRIBUTING.md)
- [Privacy Policy](/privacy/)
- [Terms of Service](/terms/)

---

## License

All rights reserved. This is proprietary software for Amogha Cafe & Restaurant.

---

Built with care for [Amogha Hotels](https://amoghahotels.com) | Kukatpally, Hyderabad
