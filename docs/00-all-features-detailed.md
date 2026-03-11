# Amogha Cafe & Restaurant — Complete Features Guide

Everything our platform can do, explained in simple language.

---

## Table of Contents

1. [Customer Website](#1-customer-website)
2. [Menu & Ordering](#2-menu--ordering)
3. [Cart & Checkout](#3-cart--checkout)
4. [Payments](#4-payments)
5. [Order Tracking](#5-order-tracking)
6. [Customer Accounts & Profiles](#6-customer-accounts--profiles)
7. [Loyalty Program & Rewards](#7-loyalty-program--rewards)
8. [Referrals & Sharing](#8-referrals--sharing)
9. [Badges & Achievements](#9-badges--achievements)
10. [Meal Plans (Subscriptions)](#10-meal-plans-subscriptions)
11. [Group Ordering](#11-group-ordering)
12. [QR Dine-In Ordering](#12-qr-dine-in-ordering)
13. [Reservations](#13-reservations)
14. [Reviews & Ratings](#14-reviews--ratings)
15. [Gallery & Testimonials](#15-gallery--testimonials)
16. [Self-Service Kiosk](#16-self-service-kiosk)
17. [POS Terminal (Staff)](#17-pos-terminal-staff)
18. [Kitchen Display System](#18-kitchen-display-system)
19. [Restaurant Display Board](#19-restaurant-display-board)
20. [Delivery Partner App](#20-delivery-partner-app)
21. [Admin Dashboard](#21-admin-dashboard)
22. [AI Features](#22-ai-features)
23. [Push Notifications](#23-push-notifications)
24. [PWA & Offline Support](#24-pwa--offline-support)
25. [Backend API](#25-backend-api)
26. [Security](#26-security)
27. [CI/CD & Deployment](#27-cicd--deployment)
28. [Loyalty Balance Page](#28-loyalty-balance-page)

---

## 1. Customer Website

**URL:** https://amogha-cafe.web.app

The main website is the primary ordering interface for customers. It works on any device — phone, tablet, or desktop.

### What the customer sees

- **Hero Section:** A full-screen rotating slideshow of restaurant images with animated particle effects and a spotlight that follows the mouse. Includes a "View Menu" button and reservation CTA.
- **Menu Section:** All food items organized by category (Biryanis, Starters, Curries, Beverages, etc.) with images, prices, veg/non-veg badges, and spice selectors.
- **Specials Section:** Today's special items highlighted with badges.
- **Reviews Section:** Customer ratings with star display and review cards.
- **Gallery:** Food photos in a masonry grid with full-screen lightbox.
- **Testimonials:** Video testimonials carousel from happy customers.
- **Contact Section:** Message form and restaurant details.
- **Footer:** Links, social media, and restaurant info.

### Navigation features

- Sticky header that stays visible while scrolling
- Dark/light mode toggle (sun/moon icon)
- Language switcher: English, Hindi, Telugu
- Cart icon with item count badge
- Loyalty points widget (for logged-in users)
- Search bar to find menu items instantly

---

## 2. Menu & Ordering

### Browsing the menu

- Menu loads from the database and is cached locally for 5 minutes to keep the page fast
- **Category tabs** let customers jump between sections (Biryanis, Starters, Curries, etc.)
- **Search bar** filters items as you type
- **Veg/Non-veg filter** — toggle to show only veg or non-veg items
- **"Safe for Me" filter** — hides items containing allergens that the customer has flagged in their profile (e.g., nuts, dairy, gluten)
- Each item card shows: image (expands on hover), name, price, veg/non-veg badge, allergen icons, and any special badges (Bestseller, Chef's Pick, New)

### Adding items to cart

1. Customer clicks **"Add to Order"** on any item
2. A **spice selector** appears: Mild, Medium, or Spicy
3. An **add-ons picker** shows available extras with prices (e.g., Extra Cheese +₹30, Raita +₹40)
4. Item is added to the cart

### Smart suggestions

- **Pairing recommendations:** When you add Biryani, the system suggests Raita or Mirchi ka Salan. There are 19 pairing rules covering all categories.
- **Upsell suggestions:** At checkout, the system recommends 3 items from categories not already in your cart.

---

## 3. Cart & Checkout

### Cart panel

- Slide-out cart panel shows all items with quantities, spice levels, and add-ons
- **+/−** buttons to adjust quantity
- **Remove** button to delete items
- Running subtotal displayed

### Automatic discounts

- **Combo discount:** 15% off when you have items from 2+ different categories
- **Happy Hour discounts:**
  - Monday–Friday 2:00–5:00 PM → 15% off beverages
  - Daily 10:00–11:00 PM → 20% off everything
- **Coupon codes:** Enter a code to get percentage or flat discount (validated for expiry, min order, and usage limits)
- **Delivery fee:** ₹49 for delivery orders, waived if subtotal is ₹500 or more. No delivery fee for dine-in or takeaway.

### 3-step checkout

1. **Step 1 — Review Order:** See all items, discounts applied, and upsell suggestions
2. **Step 2 — Your Details:** Name, phone, delivery address (or select dine-in/takeaway), special instructions
3. **Step 3 — Payment:** Choose payment method and complete the order

### Allergen safety check

Before proceeding to payment, if any item in the cart contains allergens that match the customer's profile alerts, a warning popup appears listing the conflicts. The customer can proceed anyway or go back to remove those items.

---

## 4. Payments

### Payment methods

- **Razorpay (Online):** UPI, Debit/Credit Cards, Net Banking, Wallets — customer is redirected to the Razorpay payment gateway
- **Cash on Delivery:** Available for delivery orders only — no online payment needed
- **Gift Cards:** Pre-issued gift card codes with a stored balance. Partial redemption is supported — remaining balance carries over.
- **Coupon Codes:** Percentage or flat discount, validated for active status, expiry date, minimum order amount, and usage limits

### Split Bill

After placing an order, customers can split the bill:
- Choose 2, 3, 4, or custom number of people
- System generates UPI payment links for each person's share
- Each person pays their portion directly via UPI

### After payment

- Confetti animation plays on successful order
- **Share & Earn** button appears — share your order via WhatsApp or copy link to earn 10 loyalty points
- Order saved to database and appears on kitchen display immediately
- Customer redirected to order tracking page

---

## 5. Order Tracking

**URL:** /track/?id=ORDER_ID

After placing an order, customers see a real-time tracking page.

### Timeline view

A vertical progress tracker showing:
1. **Order Placed** — your order has been received
2. **Preparing** — kitchen is cooking your food (countdown timer shows estimated completion)
3. **Ready** — your food is ready for pickup/delivery
4. **Delivered** — order complete

### Real-time updates

- The page updates instantly when the kitchen or delivery person changes the order status — no need to refresh
- Sound notification plays when status advances
- If order is cancelled, a message appears with a link to go back to the menu

### Live delivery map

When the order is out for delivery:
- A map appears showing the restaurant location and the delivery driver's live position
- Distance from driver to delivery address is displayed
- Driver's position updates every 15 seconds

### Prep time countdown

During the "Preparing" stage, a countdown timer shows the estimated time remaining based on the most complex item's preparation time.

---

## 6. Customer Accounts & Profiles

### Signing up

- Email and password registration
- Fields: full name, email, phone number, password (min 6 characters)
- Optional referral code field (to credit the person who referred you)
- Account is optional — you can browse and order without signing in, but loyalty features require an account

### Signing in

- Email and password login
- Session persists across browser sessions (Firebase Auth)
- Header shows your initials with a dropdown menu: My Profile, Sign Out

### Profile settings

Click your initials → "My Profile" to access:

- **Full Name** — editable
- **Date of Birth** — enables birthday rewards during your birth month
- **Dietary Preferences** — multi-select: Vegetarian, Vegan, Gluten-Free, Halal, Jain
- **Allergen Alerts** — multi-select: nuts, dairy, gluten, eggs, soy, shellfish, sesame, fish. These power the "Safe for Me" menu filter.
- **Saved Addresses** — add/remove delivery addresses. These appear as dropdown options during checkout.

All changes save to the database and your local device.

---

## 7. Loyalty Program & Rewards

### How points work (Online orders)

- Earn **1 point for every ₹10 spent** on online orders
- Earn **25 points** for writing a review
- Earn **10 points** for sharing an order

### How points work (POS / counter orders)

- Earn **100 points for every ₹2,000 spent** at the counter
- Redeem **100 points = ₹100 off** (minimum order ₹250)
- Points are reversed if an order is voided by staff

### Loyalty tiers

| Tier | Points Required | Icon |
|------|----------------|------|
| Bronze | 0 | 🥉 |
| Silver | 500 | 🥈 |
| Gold | 1,000 | 🥇 |

Tier is calculated automatically from your current balance.

### Loyalty widget

Logged-in customers see a small loyalty widget in the header showing their tier icon and point balance. Click it to open the full loyalty modal with:
- Current tier and progress bar to next tier
- Point balance
- Points history
- How to earn and redeem points

### Birthday rewards

- During your birthday month, a gold banner appears on the website
- A **30% off coupon** (code: `BDAY-{phone}`) is automatically created for you by our system
- Valid for 7 days, minimum ₹200 order, single use

---

## 8. Referrals & Sharing

### Referral program

- Every registered user gets a unique referral link
- Share your link with friends — when they sign up using your link, both of you get loyalty points
- Referral link format: `https://amogha-cafe.web.app/?ref=YOUR_USER_ID`

### Share & Earn

After placing an order:
- A "Share & Earn" button appears
- Share via WhatsApp, copy link, or native share (on supported devices)
- Earn **10 loyalty points** for sharing

---

## 9. Badges & Achievements

There are **10 achievement badges** customers can earn:

| Badge | How to Earn |
|-------|------------|
| First Bite | Place your first order |
| Regular | Place 5 orders |
| Foodie | Place 10 orders |
| Super Fan | Place 25 orders |
| Explorer | Order from 5 different categories |
| Streak Master | Order 7 days in a row |
| Big Spender | Spend ₹5,000 total |
| Critic | Write 3 reviews |
| Night Owl | Place an order after 10 PM |
| Early Bird | Place an order before 8 AM |

### Badge gallery

A modal shows all 10 badges:
- **Earned badges** appear in full color with the date earned
- **Locked badges** appear greyed out with the requirements to unlock them
- Earning a badge triggers a celebration animation and notification

---

## 10. Meal Plans (Subscriptions)

### Available plans

| Plan | Frequency | Price | Includes |
|------|-----------|-------|----------|
| Lunch Basic | 5 meals/week | ₹2,499/month | 1 main + 1 side |
| Lunch Premium | 5 meals/week | ₹3,999/month | 1 main + 2 sides + dessert |
| All Meals | 7 meals/week | ₹7,999/month | Daily lunch + dinner |

### How it works

1. Click **"Meal Plans"** on the homepage
2. Browse available plans with descriptions and pricing
3. Click **Subscribe** on your chosen plan
4. Your subscription is saved with an active status
5. Cancel anytime — click **Cancel Subscription** to stop future deliveries

Plans are stored in the database and can be managed by the admin.

---

## 11. Group Ordering

### How it works

1. A logged-in customer clicks **"Group Order"** to create a shared cart
2. A shareable link is generated — copy it or share via WhatsApp
3. Friends open the link and automatically join the group cart
4. Everyone browses the menu and adds their own items
5. All additions appear in real-time for everyone in the group
6. When everyone is done, the **host** taps **Lock & Checkout** to finalize
7. Host completes the checkout with combined items and total

### Key details

- Each item is tagged with the name of the person who added it
- Only the host can lock the cart and proceed to checkout
- Group carts expire after 24 hours
- All participants see live updates as items are added or removed

---

## 12. QR Dine-In Ordering

### How it works

1. Each table has a unique QR code (Tables 1–12)
2. Customer scans the QR code with their phone camera
3. The menu opens with their **table number pre-filled**
4. They browse, add items, and place their order — no delivery address needed
5. Order type is automatically set to **Dine-In**
6. Cash payment is the default option
7. After ordering, a live status tracker shows their order progress
8. If logged in, loyalty points are earned

### QR code format

Each QR code encodes: `https://amogha-cafe.web.app/qr/?table=N`

A prominent badge shows "Table 3" (or whichever table) so the customer knows their table is recognized.

---

## 13. Reservations

### Making a reservation

1. Click **"Reserve Table"** from the hero section or navigation
2. Fill in the form:
   - Full name
   - Phone number (10 digits)
   - Date (today or future date)
   - Time (within restaurant hours)
   - Number of guests (1–20)
   - Special requests (optional)
3. Submit — reservation is saved with **pending** status

### Admin handling

- Admin sees all reservations in the dashboard
- Can **confirm** or **cancel** each reservation
- Can **assign a specific table** to the reservation
- Reservation calendar shows a week-view with color-coded slots (amber = pending, green = confirmed, red = cancelled)
- Conflict detection prevents double-booking a table

### Restaurant capacity

12 tables with varying capacities (2–8 seats each). Table statuses: Available, Occupied, Reserved, Cleaning.

---

## 14. Reviews & Ratings

### Writing a review

1. Click **"Write a Review"** button (must be logged in)
2. Select a star rating (1–5)
3. Write your review (minimum ~10 characters)
4. Submit — review is saved permanently (cannot be edited or deleted)
5. Earn **25 loyalty points** for your review (limit: 1 per order)

### How reviews are displayed

- **Overall rating:** Star average with a bar chart showing 1–5 star breakdown
- **Individual reviews:** Cards showing reviewer name, star rating, review text, and date
- **Menu item ratings:** Average star rating appears on each menu item card, calculated from all reviews mentioning that item

Reviews are read-only in the database — once submitted, they cannot be modified (enforced by security rules).

---

## 15. Gallery & Testimonials

### Photo gallery

- Masonry grid of food and restaurant photos
- Click any photo to open a **full-screen lightbox**
- Navigate between photos with arrow keys or swipe
- Click the backdrop to close

Photos are managed from the Admin Dashboard under Content → Social Posts.

### Video testimonials

- Carousel of customer testimonial videos
- Thumbnail preview with play button
- Click to play video in a lightbox player
- Customer name and optional caption displayed below each video

Testimonials are managed from Admin Dashboard under Content → Testimonials.

---

## 16. Self-Service Kiosk

**URL:** /kiosk/ (or /kiosk/?shop=teashop)

A premium tablet-first ordering interface for customer self-service inside the restaurant.

### Look and feel

- **Glassmorphism design:** Frosted glass cards with backdrop blur
- **Ambient particles:** Floating gold circles for an upscale feel
- **Grain texture overlay** and **gold gradient aura**
- **Light mode** (warm bamboo tones) and **dark mode** (deep black/brown)

### Ordering flow

1. **Screensaver** animates when idle for 2 minutes — breathing logo + "Touch to Start"
2. Customer taps the screen to start
3. **Browse menu** with search, voice ordering, category sidebar, and filter chips (All/Veg/Non-Veg/Popular/Chef's Pick)
4. Tap an item → **select spice level** (bottom sheet)
5. **Add-ons picker** (checkboxes with prices)
6. **Combo pairings bar** suggests related items
7. View **cart** via floating bottom bar
8. Enter phone number — system looks up loyalty points
9. **Redeem loyalty points** if eligible
10. **Recently ordered** section shows last 8 items for quick reorder
11. Choose payment: **Razorpay** or **Pay at Counter**
12. **Success screen:** Green checkmark, confetti (60 particles), order ID, estimated wait time
13. Optional: **Send receipt via WhatsApp** and **track order** link
14. Auto-resets after 60 seconds for the next customer

### Special features

- **Voice ordering:** Speak items in English, Hindi, or Telugu. System uses fuzzy matching and understands quantities.
- **QR table scanner:** Camera button → scans table QR → auto-fills table number
- **Staff call button:** "Need Help?" → sends notification to staff
- **Post-order feedback:** Quick emoji rating + optional text comment
- **Accessibility:** Large font toggle (Aa button, +20% scale), 42–48px touch targets
- **3 languages:** English, Hindi, Telugu — all labels switch; menu items stay in original language
- **Estimated wait time:** Calculated as `10 + (pending orders × 3)` minutes

---

## 17. POS Terminal (Staff)

**URL:** /pos/ (or /pos/?shop=teashop)

A staff-facing Point-of-Sale terminal for fast counter-side order entry.

### Login

- Staff enters username and password
- Credentials are verified **on the server** (Cloud Function) — never stored on the client
- On success, the shop's menu, categories, and branding are loaded

### Layout

**Tablet/Desktop (3-column):**
- **Left:** Category buttons to filter the menu
- **Center:** Menu grid with search bar — tap a card to add to cart
- **Right:** Cart with items, quantities, customer fields, and Place Order button

**Mobile (bottom drawer):**
- Full-screen menu
- Gold "View Cart" bar slides up from bottom showing item count and total
- Tap to open cart as a full-screen drawer

### Customer lookup

When staff enters a 10-digit phone number:
- **Returning customer:** Name auto-fills, gold badge shows "⭐ Name · N pts", loyalty balance loads
- **New customer:** Staff enters name manually; a new customer record is created on order placement

### Loyalty at the counter

- **Earning:** 100 points per ₹2,000 spent
- **Redeeming:** When customer has 100+ points and order is ₹250+, a "Redeem 100 pts → ₹100 off" button appears
- **On void:** Earned points are deducted and redeemed points are restored

### Token numbers

Every order gets a sequential daily token (T1, T2, T3…). Resets to T1 at midnight. Printed prominently on the kitchen ticket so the kitchen can call out orders in sequence.

### Printing

- **Kitchen Order Ticket (KOT):** Auto-prints 300ms after order placement — shows token number, order ID, customer, table, items
- **Bill:** Thermal-optimized 80mm receipt with itemized list, totals, payment method, loyalty footer, and a unique fortune cookie quote
- **WhatsApp bill:** Opens pre-formatted bill in WhatsApp (popup on desktop, app on mobile) with loyalty balance link

### Fortune cookie quotes

Every bill ends with a unique motivational phrase generated from a template engine with 15 million+ combinations. Example: "Your adventurous spirit draws greatness closer today."

### Recent orders

- Slide-in panel showing last 30 orders
- Filter by: All / POS / Today / Pending
- **Reprint** button reopens any past bill
- **Void** button cancels an order, reverses loyalty points, and excludes it from analytics

---

## 18. Kitchen Display System

**URL:** /kitchen/

A full-screen order queue for kitchen staff, designed for a mounted tablet.

### How it works

1. New order arrives → appears as an **amber card** with a chime sound
2. Kitchen staff tap **Accept** → card turns **blue** (preparing), timer starts counting
3. Staff complete the order and tap **Ready** → card turns **green**, front-of-house is notified
4. When the order is delivered or picked up, the card disappears

### What each card shows

- Order ID and order type (Delivery / Takeaway / Dine-In / POS)
- Table number (for dine-in)
- Elapsed timer (turns red when it exceeds the expected prep time)
- Each item with quantity, spice level, and add-ons
- Special instructions highlighted in amber
- Estimated preparation time (based on the longest-to-prepare item)

### Top bar

- Restaurant logo
- Live clock
- Active order count
- Sound toggle (enable/disable new order chime)

All updates happen in real-time — no need to refresh the page.

---

## 19. Restaurant Display Board

**URL:** /display/

A digital signage display for the restaurant lobby or waiting area.

### What it shows

- **Left panel:** Live list of **Ready** orders showing order ID, customer name, and order type. Orders appear instantly when marked ready and vanish when delivered.
- **Right panel:** Rotating promotional content — today's specials, hero slides, taglines
- **Bottom ticker:** Scrolling promotional text (thank you message, WhatsApp CTA)
- A soft chime plays when a new order becomes ready

### Setup

- Run full-screen in a browser on a dedicated TV or monitor
- No login required
- Updates automatically in real-time from the database

---

## 20. Delivery Partner App

**URL:** /delivery/

A mobile-first app for delivery partners to manage deliveries.

### Login

- Phone number (10 digits) + PIN
- Validated **on the server** (Cloud Function) — driver credentials are never readable from the client
- Session saved to the browser tab (auto-restores on refresh, clears on tab close)

### 4 tabs

1. **Available Orders:** Real-time list of ready orders waiting for a delivery partner. Each card shows order ID, total, items, address, customer name/phone. Tap **Accept Delivery** to claim the order.

2. **Active Delivery:** Shows the order you're currently delivering with full details — customer name, address, phone, items, payment method. Buttons for **Navigate** (opens Google Maps), **Call** (phone dialer), and **Mark as Delivered**.

3. **Earnings:** Dashboard showing earnings for today, this week, this month, and all time. Shows number of deliveries and total earned (based on ₹49 delivery fee per order).

4. **History:** List of all completed deliveries, sorted newest first. Shows date, order ID, customer, address, total, and delivery fee earned.

### GPS tracking

- When a delivery is active, the driver's phone shares GPS location
- Location updates sent to the database every 15 seconds (throttled to save battery)
- Customers see the driver's live position on their tracking page
- GPS stops when the delivery is marked complete or the driver logs out

---

## 21. Admin Dashboard

**URL:** /admin.html

A comprehensive management interface with 23 panels for running the entire restaurant.

### Dashboard

- Today's orders count, revenue, pending orders, and active tables at a glance

### Order management

- View all orders with filters: status, date range, search
- Update order status: Preparing → Ready → Delivered, or Cancel
- Voided orders are excluded from all revenue and count analytics

### Menu management

- Add, edit, or remove menu items
- Upload item images, set prices, categories, allergen info, prep times
- Toggle availability on/off
- Manage add-ons and specials separately

### Inventory

- Track stock levels for all ingredients
- Set low-stock threshold alerts
- Update quantities after stock-taking

### Tables & reservations

- View and manage 12 tables (status: Available/Occupied/Reserved/Cleaning)
- Reservation list with confirm/cancel/assign-table actions
- Week-view calendar with conflict detection

### Customer CRM

- View all customers with loyalty points, tier, order history
- Search by name or phone
- Adjust loyalty points manually

### Coupons & gift cards

- Create and manage coupon codes (percentage/flat, expiry, min order, usage limits)
- Issue and manage gift cards with balances

### Content management

- Hero slides, testimonials, social posts — add/edit/remove/reorder
- Changes appear on the website immediately

### Settings

- Restaurant name, hours, delivery radius and fee
- Combo discount configuration
- Maintenance mode toggle

### Analytics

- Revenue and average order value trends
- Category breakdown (which items sell most)
- Customer retention rates
- Busiest hours heatmap

### Staff management

- Add/edit staff members with name, role, shift, active status

### Marketing

- Customer segmentation for targeted messaging
- WhatsApp message templates with placeholder variables

### Dynamic pricing

- Set time-based or category-based pricing rules
- Rules display to customers when active

### Expenses

- Track restaurant expenses by category
- AI bill parsing: upload a receipt photo → Gemini AI extracts amount, date, description, and category automatically

### Multi-shop support

- Configure multiple shops (e.g., "amogha", "teashop") with separate menus, categories, branding, and admin credentials

---

## 22. AI Features

### AI bill parsing

- Upload a photo or PDF of any bill/receipt
- Google Gemini 2.0 Flash (AI) extracts: amount, date, description, category, who paid, and confidence score
- Used in the admin expenses panel for quick data entry

### AI chat assistant

- Floating chat bubble on the customer website
- Ask questions about the menu, get recommendations, or trigger actions (e.g., "show me vegetarian starters")
- Context-aware suggestions based on menu data

### Smart notifications

- AI-powered notification content for engaging customer messages

---

## 23. Push Notifications

### Browser notifications

- Permission requested after order placement
- Notifications fire when order status changes (Preparing, Ready, Delivered)
- Works even when the browser tab is in the background

### Firebase Cloud Messaging (FCM)

- Push notifications work even when the app is completely closed
- Customer's device token is saved on sign-in
- Kitchen/admin can trigger notifications to specific customers

---

## 24. PWA & Offline Support

### Installable app

- Customers can "Add to Home Screen" on any device
- Opens like a native app — no browser address bar
- Custom app icon and splash screen

### Offline support

- Service worker caches all pages, CSS, JavaScript, and images
- Menu and other data cached locally with time-based refresh:
  - Menu: 5 minutes
  - Add-ons: 30 minutes
  - Specials: 5 minutes
  - Hero slides: 30 minutes
  - Testimonials: 60 minutes
- Cached content loads instantly on repeat visits
- Database has offline persistence — recently viewed data available without internet

### Performance

- Local caching reduces database reads by ~90% on repeat visits
- Images and fonts cached for 30 days (client) to 1 year (CDN)
- HTML checked every 5 minutes for updates

---

## 25. Backend API

### REST endpoints

| Method | Endpoint | What it does |
|--------|----------|-------------|
| GET | /api/menu | Returns all available menu items |
| GET | /api/specials | Returns today's specials |
| POST | /api/order | Place an order (server validates prices against the database) |
| GET | /api/order/:id | Get order status and details |
| POST | /api/parse-bill | AI bill parsing — send a photo, get structured data back |
| POST | /api/notify | Send a push notification to a customer |
| POST | /api/auth/kiosk-login | Authenticate POS/kiosk staff (server-side) |
| POST | /api/auth/delivery-login | Authenticate delivery partners (server-side) |

### Scheduled tasks

- **Birthday rewards:** Runs daily at 8 AM. Checks for customers with birthdays today and creates a 30% off coupon for each one.

### External integrations

- OpenAPI specification (`openapi.json`) available for importing into ChatGPT Actions, Postman, or other API tools

---

## 26. Security

### Server-side protections

- **Price validation:** When an order is placed via the API, the server looks up actual prices from the database — client-supplied prices are ignored. This prevents price manipulation.
- **Server-side authentication:** POS and delivery partner logins are validated by Cloud Functions. Credentials are never sent to or readable from the client browser.
- **Delivery credentials locked:** The `deliveryPersons` database collection has `allow read: if false` — no client can ever read driver passwords.

### Database security rules

- Menu, specials, add-ons, testimonials, and settings are **read-only** for customers
- Orders can be created but customers cannot change their own order status
- Reviews are **immutable** — once submitted, they cannot be edited or deleted
- Coupon codes can only have their usage count updated (not price or limits)
- Gift card balances can only decrease (not be topped up by customers)
- Each customer can only read and write their own profile data

### Data protection

- No passwords stored in the client browser
- Session data for delivery partners clears when the browser tab closes
- All communication over HTTPS

---

## 27. CI/CD & Deployment

### Automated pipeline

Every push to the `master` branch triggers:

1. **Install dependencies**
2. **Run unit tests** (2,500+ tests using Vitest)
3. **Run API tests** (Jest + Supertest)
4. **Build the frontend** (Vite)
5. **Run end-to-end browser tests** (Playwright)
6. **Deploy** to Firebase Hosting + update database security rules + deploy Cloud Functions
7. **Cleanup** old hosting versions (keeps only the 3 most recent, auto-deletes the rest)

If any test fails, deployment is blocked.

### SEO

- `robots.txt` allows search engines to crawl all pages
- `sitemap.xml` lists all pages with priority and update frequency
- Proper meta tags and page titles

---

## 28. Loyalty Balance Page

**URL:** /loyalty/

A simple page where customers can check their loyalty points balance.

### How it works

1. Customer visits `/loyalty/` (or clicks the link on their printed receipt)
2. Enters their phone number
3. Sees their:
   - Current points balance
   - Progress bar to next reward
   - Total visits
   - Total amount spent
   - Date of last visit

Also accessible via direct link: `/loyalty/?phone=XXXXXXXXXX` (linked from WhatsApp bill receipts).

---

## Tech Stack Summary

| Component | Technology |
|-----------|-----------|
| Frontend | Vanilla HTML, CSS, JavaScript (no framework) |
| Build tool | Vite |
| Database | Firebase Firestore (real-time) |
| Backend | Firebase Cloud Functions (Node.js + Express) |
| Payments | Razorpay |
| AI | Google Gemini 2.0 Flash (Vertex AI) |
| Hosting | Firebase Hosting |
| Push notifications | Firebase Cloud Messaging |
| Maps | Leaflet.js + OpenStreetMap |
| Tests | Vitest (unit), Jest (API), Playwright (E2E) |
| CI/CD | GitHub Actions |

---

## Database Collections (20)

| Collection | Purpose |
|-----------|---------|
| orders | All customer orders from all channels |
| users | Customer profiles, loyalty, preferences |
| menu | All food items with prices and availability |
| addons | Extra items that can be added to any dish |
| specials | Today's special items |
| reviews | Customer ratings and review text |
| reservations | Table booking requests |
| inventory | Stock levels for ingredients |
| tables | Table status (available/occupied/reserved) |
| coupons | Discount codes with validation rules |
| giftCards | Gift card codes with balances |
| referrals | Referral tracking between users |
| messages | Contact form messages |
| notifications | Push notification records |
| testimonials | Video testimonial content |
| socialPosts | Gallery photos and social content |
| heroSlides | Homepage slideshow images |
| settings | Restaurant configuration |
| cateringInquiries | Catering request forms |
| deliveryPersons | Delivery partner credentials |

---

## Pages (8 + sub-apps)

| Page | URL | Who uses it |
|------|-----|------------|
| Main website | / | Customers |
| Admin dashboard | /admin.html | Restaurant staff |
| Kitchen display | /kitchen/ | Kitchen staff |
| Order tracking | /track/ | Customers |
| QR ordering | /qr/ | Dine-in customers |
| Display board | /display/ | Lobby TV/monitor |
| Self-service kiosk | /kiosk/ | In-store customers |
| Delivery app | /delivery/ | Delivery partners |
| POS terminal | /pos/ | Counter staff |
| Loyalty balance | /loyalty/ | Customers |

---

Last updated: March 10, 2026
