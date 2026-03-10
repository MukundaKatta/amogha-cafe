# Amogha Cafe & Restaurant — Complete Feature Documentation

> **Multi-surface restaurant platform** — online ordering, POS, kiosk, kitchen display, delivery, order tracking, and admin dashboard built on Firebase.

---

## Table of Contents

1. [Customer Website (Online Ordering)](#1-customer-website-online-ordering)
2. [Admin Dashboard](#2-admin-dashboard)
3. [POS Terminal](#3-pos-terminal)
4. [Self-Service Kiosk](#4-self-service-kiosk)
5. [Kitchen Display System (KDS)](#5-kitchen-display-system-kds)
6. [Delivery Partner App](#6-delivery-partner-app)
7. [Order Display Board](#7-order-display-board)
8. [Order Tracking](#8-order-tracking)
9. [QR Code Table Ordering (Dine-In)](#9-qr-code-table-ordering-dine-in)
10. [Loyalty Points Lookup](#10-loyalty-points-lookup)
11. [REST API (Cloud Functions)](#11-rest-api-cloud-functions)
12. [Cross-Cutting Concerns](#12-cross-cutting-concerns)
13. [Technology Stack](#13-technology-stack)

---

## 1. Customer Website (Online Ordering)

**Entry point:** `index.html` | **Modules:** `src/modules/`

### 1.1 Hero & Navigation
- **Animated hero slideshow** with multiple background images (food photos, chef portraits, restaurant shots)
- **Header slideshow ticker** rotating through today's specials, bestsellers, Telugu/English proverbs, and promotional messages
- **Scroll progress bar** at the top of the page
- **Cursor glow trail** and **floating gold ambient particles** for a premium visual feel
- **Grain texture overlay** for a cinematic aesthetic
- **Preloader** with animated gold progress bar and logo
- **Dark mode toggle** (moon icon)
- **Mobile hamburger menu** for responsive navigation
- **SEO-optimized** with Open Graph, Twitter Card, and Schema.org (Restaurant) structured data

### 1.2 Sections
- **About / Our Story** — brand story, mission, USP list with scroll-reveal animations
- **Stats counter** — animated counters (10,000+ customers, 50+ dishes, 20+ years, 4.8-star rating)
- **Meet Our Chefs** — slideshow of chefs (Polina, Usha, Bhavana) with bios and specialties
- **Today's Specials** — featured dishes with prices and "Order Now" buttons
- **Daily Special** — countdown timer section with "Today Only" badge and expiry countdown (hrs/min/sec)
- **Gallery** — image slideshow with dots navigation, lightbox with keyboard controls (Escape, Arrow keys)
- **Video lightbox** — embedded video player for promotional content
- **Reviews carousel** — auto-advancing customer reviews with mouse hover pause
- **Contact section** with restaurant info

### 1.3 Menu & Ordering
- **Live menu sync** — menu items loaded from Firestore in real-time
- **Category carousel** (Swiggy-style) — horizontal scrollable category pills with arrow navigation
- **Menu search** with type-ahead filtering
- **Veg/Non-veg filter** indicators on each item
- **Spice level selector** (Mild / Medium / Hot) per item
- **Add-ons & extras** support per menu item
- **Bestseller and badge tags** on menu items
- **Dynamic pricing rules** and happy hour pricing
- **Delivery banner** — estimated delivery time (30-45 mins) and free delivery threshold (orders above Rs.500)
- **Combo Meal Builder** — mix & match starters + main course + bread + drink with 15% discount
- **Allergen filter ("Safe for Me")** — filter menu based on dietary preferences and allergen alerts

### 1.4 AI-Powered Features
- **AI Chatbot** — floating chat FAB with AI assistant for menu queries, recommendations, and ordering help
- **AI Picks For You** — personalized AI-generated food recommendations based on order history
- **AI Meal Planner** — generate custom meal plans based on preferences
- **Item pairings** — suggested pairing items (e.g., biryani + raita)

### 1.5 Cart & Checkout
- **Shopping cart** with floating cart icon and item count badge
- **Floating cart FAB** on mobile
- **Cart modal** with item list, quantity controls (+/-), add-ons display, and total
- **Coupon code system** — apply discount codes at checkout
- **Gift card support** — redeem gift cards during checkout
- **Loyalty points redemption** — redeem earned points for discounts (100 pts = Rs.100 off, min Rs.250 order)
- **Payment methods:**
  - Razorpay (online payment gateway)
  - Cash on Delivery (COD)
  - UPI payment links
- **Delivery fee calculation** — Rs.49 fee, free above Rs.500
- **Order notes / special instructions** field
- **Address input** for delivery orders
- **XSS protection** — HTML escaping on all user inputs

### 1.6 Post-Order Features
- **Order confirmation** with order ID and tracking link
- **WhatsApp bill sharing** — send order summary via WhatsApp
- **Split Bill** — divide order total among 2-10 people with UPI payment link generation per person
- **Order Again / Reorder** — quick reorder from past orders
- **Review & Rating prompt** — automatic prompt 1 minute after order; rate individual items (1-5 stars) with text review; earns 25 loyalty points

### 1.7 Social & Group Features
- **Group Ordering** — host creates shared cart, shares link, participants add items, host checks out
- **Table Reservation** — book tables with date picker, time slots, party size (1-10+), and special requests; 7-day advance booking

### 1.8 Subscription Meal Plans
- **Weekly meal plan subscriptions** — subscribe to recurring meal plans at discounted prices
- **Plan catalog** loaded from Firestore

### 1.9 User Account
- **Sign In / Sign Up** modal with phone number authentication
- **Customer profile** with:
  - Dietary preferences (Vegetarian, Vegan, Gluten-Free)
  - Allergen alerts (Nuts, Dairy, Gluten, Eggs, Soy, Shellfish, Sesame, Fish)
  - Saved delivery addresses
- **Loyalty widget** in navbar showing points balance
- **Badge gallery** — gamification badges displayed in navigation

### 1.10 Gamification & Badges
| Badge | Criteria | Icon |
|-------|----------|------|
| First Bite | Place your first order | 🍽️ |
| Regular | 5 orders completed | ⭐ |
| Foodie | 10 orders completed | 🏅 |
| Super Fan | 25 orders completed | 🏆 |
| Explorer | Order from all menu categories | 🗺️ |
| Streak Master | 3 consecutive days with orders | 🔥 |
| Big Spender | Single order over Rs.1000 | 💎 |
| Critic | Write 5 reviews | 📝 |
| Night Owl | Order after 9 PM | 🦉 |
| Early Bird | Order before 10 AM | 🐦 |

### 1.11 Notifications
- **Browser push notifications** — custom opt-in banner ("Get notified when your order is ready!")
- **Order status notifications** via browser Notification API

### 1.12 PWA & Offline
- **PWA install prompt** — custom banner with "Install App" button
- **Service Worker** — offline caching with cache management
- **App manifest** — installable as native-like app on mobile
- **Apple mobile web app** support (status bar, touch icon)

### 1.13 Ambient Music
- **Background music player** with two ambient tracks (`bg-music.mp3`, `bg-music2.mp3`)

### 1.14 Internationalization (i18n)
- **Multi-language support** via `data-i18n` attributes
- **Telugu proverbs and taglines** displayed in the header slideshow
- **Translation constants** for UI strings

---

## 2. Admin Dashboard

**Entry point:** `admin/index.html`

### 2.1 Authentication & Access
- Admin login with PIN/password protection
- Multi-shop switching (dropdown selector for managing multiple locations)

### 2.2 Dashboard Overview
- Live order statistics (total orders, today's count, revenue)
- Real-time monitoring

### 2.3 Management Tabs
| Tab | Features |
|-----|----------|
| **Orders** | Filter by status (all, pending, confirmed, preparing, delivered, cancelled, POS); CSV export |
| **Menu** | Bulk edit, enable/disable items, add new items, manage add-ons and extras |
| **Specials** | Today's special offers management |
| **Daily Special** | Daily featured item with countdown timer |
| **Slideshow** | Hero slide management (images/videos), customer testimonials |
| **Analytics** | Performance metrics, insights, and reporting |
| **Coupons** | Create and manage discount codes |
| **Gift Cards** | Digital gift card system management |
| **Reviews** | Customer review moderation and management |
| **CRM (Customers)** | Customer database with profiles, order history, loyalty data |
| **Expenses** | Track operational costs; AI-powered OCR bill parsing via Gemini |
| **Staff** | Staff management (roles, schedules) |
| **Calendar** | Schedule and event management |
| **Marketing** | Marketing campaigns and promotions |
| **Pricing** | Dynamic pricing rules management |
| **Shops** | Multi-shop configuration (name, logo, tagline, theme, categories, admin PIN) |
| **Kiosks** | Kiosk terminal management and monitoring |

### 2.4 Theming
- Seasonal themes (e.g., gold/dark holiday theme)
- Light/dark mode toggle
- Theme selector with decorative noise background

---

## 3. POS Terminal

**Entry point:** `pos/index.html`

### 3.1 Authentication
- Username/password login for POS operators
- Server-side credential validation via Cloud Functions

### 3.2 Core POS Features
- **Real-time clock** display
- **Sales counter** — real-time daily sales tracking with visual display
- **Category navigation** — quick-access menu category buttons
- **Smart search** — type-ahead menu search with debouncing
- **Item frequency tracking** — most-used items highlighted for quick access

### 3.3 Cart & Checkout
- Visual cart display with quantity controls (+/-)
- Clear cart functionality
- Table number assignment
- Special notes/instructions (e.g., "extra spicy, no onion")
- Multiple payment methods: Cash, UPI, Card
- Order summary with real-time total calculation
- Bill generation and printing

### 3.4 Customer Integration
- Phone number lookup for existing customers
- Customer badge display (loyalty tier, points)
- Customer name input

### 3.5 Order Management
- Recent orders panel with filters (all, POS-only, today, pending)
- Session management with auto clock update
- Logout functionality

---

## 4. Self-Service Kiosk

**Entry point:** `kiosk/index.html`

### 4.1 Multi-Language Support
- English, Telugu (తెలుగు), Hindi (हिंदी)

### 4.2 Accessibility
- Light/Dark mode toggle
- Accessibility mode (adjustable font size with "Aa" button)
- Fullscreen functionality

### 4.3 Ordering Features
- **Voice ordering** — microphone button for voice-based item search
- **Menu search** with autocomplete
- **Filter chips** — All, Veg, Non-Veg, Popular (🔥), Chef's Pick (⭐)
- **Category tabs** and sidebar navigation
- **Item cards** with images, names, prices, veg/non-veg indicators, and bestseller tags
- **Quantity controls** per item

### 4.4 Cart & Checkout
- Floating cart bar (item count + total)
- Modal checkout sheet
- Customer info: name, phone number, table number
- QR code scanner for table identification
- Loyalty points display and redemption option
- "Order Again" section with recent items
- Payment options: Online payment or Pay at Counter

### 4.5 Order Confirmation
- Success screen with confetti animation
- Order ID, item count, total, payment method
- Wait time estimation
- WhatsApp bill sharing option

### 4.6 Offline Support
- Service worker caching for offline functionality

---

## 5. Kitchen Display System (KDS)

**Entry point:** `kitchen/index.html`

### 5.1 Authentication
- Kitchen PIN-based secure access

### 5.2 Dashboard Header
- Brand display with **LIVE** status indicator
- Active orders count
- Completed orders count
- Average prep time
- Revenue display
- Peak traffic visualization
- Current time display

### 5.3 View Modes
| View | Description |
|------|-------------|
| **Board View** | Kanban-style columns: NEW → COOKING → READY |
| **Expo View** | Detailed order layout for expeditor station |
| **Customer View** | Customer-facing display showing order status |
| **Batch View** | Batch operations for high-volume cooking |
| **Analytics View** | Performance metrics and kitchen efficiency |

### 5.4 Station Filtering
- All Stations view
- Individual stations: Starters, Curries, Biryanis, Grill & Kebabs, Noodles & Rice, Rotis & Naan

### 5.5 Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `/` | Search orders |
| `S` | Toggle sound alerts |
| `V` | Toggle voice notifications |
| `C` | Open chat/communication |
| `G` | Staff management |
| `I` | Inventory tracking |
| `L` | Table management |
| `R` | Reports |
| `H` | Order history |
| `T` | Theme toggle |
| `F` | Fullscreen mode |
| `?` | Keyboard shortcuts help |

### 5.6 Advanced Features
- **86 Management** — mark items as sold out ("86'd") across all surfaces
- **All-Day Count** — track item counts across the full day
- **Zoom Controls** — adjust display size (100%, +/-)
- **Batch operations** — START ALL / DONE ALL buttons
- **Order flash** — visual and audio alerts for new orders
- **Screensaver mode** — idle screen showing stats (completed orders, avg prep time, revenue)
- **Celebration confetti** — animation on order completion
- **Network status indicator** — connection monitoring
- **Service worker** — network-aware caching

---

## 6. Delivery Partner App

**Entry point:** `delivery/index.html`

### 6.1 Authentication
- Phone number + PIN login
- Server-side credential validation

### 6.2 Tab Navigation
| Tab | Features |
|-----|----------|
| **Available Orders** | Unclaimed delivery jobs with order ID, timestamp, total, item count, delivery fee, customer address/name/phone, "Accept Delivery" button |
| **Active Delivery** | Current delivery status badge, customer info, address with GPS navigation button, phone with call button, item breakdown, "Mark as Delivered" button |
| **Earnings** | Earnings grid with per-order commission details; Rs.49/order delivery fee structure |
| **Delivery History** | Past deliveries log |

### 6.3 Navigation Features
- **GPS tracking** — start/stop location monitoring
- **Google Maps integration** — one-tap navigation to delivery address
- **Direct call** — one-tap customer calling

### 6.4 Real-Time Features
- Live order notification badges
- Connectivity status indicator

---

## 7. Order Display Board

**Entry point:** `display/index.html`

### 7.1 Display Features
- **"Now Serving" section** — rotating carousel of ready orders with pagination dots
- **Three-column order board** — Preparing | Waiting | Ready (with count per status)
- **Order cards** with order number and customer name

### 7.2 Statistics Bar
- Completed orders today
- Average prep time
- Active orders count

### 7.3 Visual Effects
- LIVE status indicator with pulsing dot
- Current time and date
- Particle background animation
- Toast notifications for "Order Ready" events
- Flash overlay for new ready orders
- Fullscreen mode (click to enter)

### 7.4 Designed For
- Large displays and TVs in the restaurant
- Real-time Firebase synchronization

---

## 8. Order Tracking

**Entry point:** `track/index.html`

### 8.1 Order Lookup
- Query orders by order ID
- Short ID format with customer greeting

### 8.2 Progress Tracking
- **4-step visual stepper:** Placed → Confirmed → Cooking → Delivered
- Active step highlighting and completion progression
- Status card with icon, text, and description

### 8.3 Time Estimation
- Estimated completion time
- Countdown timer
- Progress bar (time elapsed vs. total estimate)

### 8.4 Live Delivery Tracking
- **Google Maps integration** for real-time delivery tracking
- Driver distance display
- Real-time location updates

### 8.5 Order Details
- Item-by-item breakdown (quantity, price)
- Delivery address and notes
- Payment method badge (COD/Online)
- Total calculation

### 8.6 Help & Contact
- Direct phone call button
- WhatsApp contact button

### 8.7 Order States
- Loading state with spinner
- Order found with full details
- Error state (order not found)
- Cancelled order state with badge
- Confetti celebration on order completion

---

## 9. QR Code Table Ordering (Dine-In)

**Entry point:** `qr/index.html`

### 9.1 Table Recognition
- Automatic table number parsing from QR code URL parameter
- Table badge display

### 9.2 Menu Browsing
- Category tabs
- Search bar
- Filter chips: All, Veg, Non-Veg
- Menu items with images, names, prices, veg/non-veg indicators, bestseller badges

### 9.3 Cart & Checkout
- Floating cart bar (item count + total)
- Modal checkout with item list, quantities, subtotal/total
- Customer name, phone (10-digit), and special notes input
- Payment: "Pay at Counter" (dine-in model)

### 9.4 Order Confirmation
- Success screen with table number, order ID, item count, total
- "Track Order" link
- "Place Another Order" button

---

## 10. Loyalty Points Lookup

**Entry point:** `loyalty/index.html`

### 10.1 Features
- Phone number lookup for loyalty account
- Current points balance display
- Visual progress bar (0-100 points goal)
- Customer statistics: total visits, total spent, last visit date

### 10.2 Program Rules
| Rule | Detail |
|------|--------|
| Earning rate | Rs.2000 spent = 100 points |
| Redemption | 100 points = Rs.100 off |
| Minimum order | Rs.250 for redemption |
| Expiry | Points never expire |
| Requirement | Phone number at checkout |

---

## 11. REST API (Cloud Functions)

**Entry point:** `functions/index.js` | **Runtime:** Firebase Cloud Functions + Express.js

### 11.1 Public Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/menu` | Full available menu with categories, prices, veg/non-veg flags |
| `GET` | `/specials` | Today's specials |
| `POST` | `/order` | Place a Cash-on-Delivery order with server-side price validation |
| `GET` | `/order/:id` | Track an order by ID |

### 11.2 AI-Powered Endpoints (Gemini 2.0 Flash)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/chat` | AI chatbot conversation |
| `POST` | `/smart-search` | AI-powered menu search |
| `POST` | `/recommend` | Personalized recommendations |
| `POST` | `/meal-plan` | AI meal plan generation |
| `POST` | `/smart-combo` | AI combo suggestions |
| `POST` | `/summarize-reviews` | AI review summarization |
| `POST` | `/parse-bill` | OCR bill parsing via Gemini Vision (JPG, PNG, WebP, PDF up to 4MB) |

### 11.3 Admin Endpoints (Require API Key)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/notify` | Send notifications |
| `POST` | `/analytics-query` | Natural language analytics queries |
| `POST` | `/forecast` | Demand forecasting |
| `POST` | `/menu-insights` | AI-generated menu insights |

### 11.4 Authentication Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/kiosk-login` | POS/Kiosk terminal server-side authentication |
| `POST` | `/auth/delivery-login` | Delivery partner server-side authentication |

### 11.5 Security
- **Rate limiting** — 30 requests/minute per IP on AI endpoints (in-memory with periodic cleanup)
- **Admin auth middleware** — API key validation via `x-api-key` header or Bearer token
- **CORS** — restricted to `amogha-cafe.web.app`, `amogha-cafe.firebaseapp.com`, `amoghahotels.com`
- **Server-side price validation** — order prices verified against menu DB to prevent manipulation
- **Input sanitization** — control character stripping and length limits before Gemini prompts
- **Menu cache** — 10-minute in-memory cache to reduce Firestore reads

---

## 12. Cross-Cutting Concerns

### 12.1 Multi-Tenancy
- Multiple shop support (Amogha Cafe, Tea Shop)
- Shop-specific: menus, themes, categories, admin PINs, taglines
- Shop switching in admin dashboard

### 12.2 Firebase Services
| Service | Usage |
|---------|-------|
| **Firestore** | Menu, orders, users, reviews, loyalty, coupons, gift cards, reservations, shops, kiosks, expenses, delivery persons |
| **Firebase Hosting** | Static file hosting with custom domain |
| **Cloud Functions** | REST API, AI integrations, server-side auth |
| **Firestore Rules** | Security rules for data access control |
| **Storage Rules** | File upload access control |

### 12.3 Mobile Apps (Capacitor)
- **iOS** build support via Capacitor
- **Android** build support via Capacitor
- Dedicated build scripts for kiosk and POS Android apps
- Asset path fixing for standalone builds

### 12.4 Performance Optimizations
- Font preloading with non-blocking load (`rel="preload"` → `onload` swap)
- DNS prefetch for Firebase, Google Fonts, Razorpay
- Critical CSS inlined in HTML for instant preloader render
- In-memory menu cache in Cloud Functions (10-min TTL)
- Debounced search inputs

### 12.5 Security
- XSS prevention via HTML escaping helpers (`escapeHtml`)
- Prompt injection prevention (input sanitization for Gemini)
- Server-side price validation on orders
- Rate limiting on expensive AI endpoints
- Admin API key authentication
- CORS restrictions

### 12.6 Accessibility
- Multi-language support (English, Telugu, Hindi)
- Font size adjustment mode
- Dark/light theme toggle
- Keyboard navigation (KDS shortcuts, lightbox arrow keys)
- ARIA labels on interactive elements
- Semantic HTML structure

### 12.7 Offline & PWA
- Service workers on all surfaces (website, kiosk, KDS)
- Web app manifest for installability
- Apple mobile web app meta tags
- Offline-first caching strategies

---

## 13. Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Vanilla JavaScript (ES modules), HTML5, CSS3 (CSS variables) |
| **Backend** | Firebase Cloud Functions, Express.js |
| **Database** | Firebase Firestore |
| **AI** | Google Vertex AI (Gemini 2.0 Flash) |
| **Payments** | Razorpay, UPI, Cash on Delivery |
| **Mobile** | Capacitor (iOS + Android) |
| **Maps** | Google Maps (delivery tracking) |
| **Build** | Vite (dev/build), custom shell scripts (kiosk/POS builds) |
| **Testing** | Vitest (2,509 unit tests), Playwright (E2E) |
| **Hosting** | Firebase Hosting |
| **Fonts** | Google Fonts (Cormorant Garamond, Playfair Display, Poppins, Noto Serif Telugu) |

---

## Menu Catalog

383+ items across 15+ categories:

| Category | Item Count |
|----------|-----------|
| Biryanis | 46 |
| Rice / Fried Rice | 41 |
| Noodles | 43 |
| Starters | 53 |
| Curries | 42 |
| Pulao | 46 |
| Soups | 20 |
| Tiffins | 43 |
| Breads | Various |
| Rolls | Various |
| Sides | Various |
| Beverages | Various |
| Sweets | Various |
| Tea Shop items | 10 |

---

*Generated from codebase analysis. Last updated: March 2026.*
