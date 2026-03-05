# End-to-End Test Plan for Amogha Cafe

This document outlines scenarios that should be covered by the Playwright end-to-end suite (and associated unit tests) to bring the application closer to full functional coverage. The unit/integration suite now contains 2,059 Vitest tests across 30 files. The items below target additional E2E browser scenarios covering business logic and user journeys that deliver value.

---

## 1. Ordering & Checkout

1. **Full order placement**
   - Sign in or anonymously create an order.
   - Add multiple items, including upsells and modifiers.
   - Apply a coupon or gift card and verify discount calculation.
   - Schedule order (future date/time) and ensure `schedule` object stored.
   - Submit customer details and intercept the Razorpay/UPI network request (use a stubbed response) to simulate success and failure.
   - Confirm cart resets and success toast appears.

2. **Cart edge cases**
   - Try checkout with empty cart.
   - Add an item then remove it; ensure checkout button disables.
   - Test `maxQuantity` and invalid quantity entries.

3. **Allergen/"Safe for me" warnings**
   - Set a user with allergen alerts in localStorage.
   - Add a conflicting menu item to cart and verify warning modal appears.

4. **Loyalty redeeming**
   - With a user having loyalty points, test redeem button appears and reduces total.
   - When points are insufficient, ensure button hides.

## 2. Authentication & Profile

1. **Signup/signin flows**
   - Fill and submit signup form with valid/invalid data; intercept cloud function or Firestore calls to simulate success/failure.
   - Sign out and sign in again; verify `amoghaUser` stored and carousel greeting updates.
   - Attempt signin with wrong PIN and verify error message.

2. **Password reset**
   - Trigger reset flow, enter mismatched/new PINs, confirm validation and eventual success toast.

3. **Profile editing**
   - Open profile modal; change name/phone/allergens; verify updates reflected in localStorage and UI.

## 3. Reservations

1. **Complete reservation**
   - Fill reservation modal with valid data and submit; intercept Firestore `add` call to return a fake `docRef`.
   - Verify confirmation message, ID format, and WhatsApp link.

2. **Time slot availability**
   - Choose different dates (weekend vs weekday) and ensure time grid updates.

3. **Phone/email validation**
   - Enter incorrect formats and confirm error messaging.

## 4. Reviews & Gallery

1. **Carousel behaviour**
   - Test automatic sliding and pause on hover (via `mouseenter`/`mouseleave`).

2. **Submit review**
   - Fill rating and text; intercept Firestore `add` to simulate result; verify reward points awarded and UI resets.

3. **Gallery slideshow**
   - Navigate using dots and verify the `active` class moves correctly.

## 5. Loyalty & Rewards

1. **Earning points**
   - After placing an order (mocked), simulate backend call that increments `loyaltyPoints` and ensure widget updates.

2. **Birthday banner**
   - Set a user with today's birthday and verify banner appears then can be dismissed.

3. **Badges**
   - Simulate writing reviews or completing other badge criteria; verify badge display logic.

## 6. Group Orders & Split Bills

1. **Create group order**
   - Add items, invite others (mock network request), and verify shared cart operations.

2. **Split bill calculation**
   - Add items to cart, split by number of people, confirm UI breakdown.

## 7. Subscriptions & Passes

1. **Purchase a subscription**
   - Navigate to subscriptions page, select plan, simulate Razorpay checkout, and verify recurring order data persists.

2. **Cancel/modify subscription**
   - Use profile page controls to update or cancel; intercept API to confirm.

## 8. Chatbot & Notifications

1. **Send chat message**
   - Open chatbot, type a message, stub reply via network intercept, and verify the UI adds the bot response.

2. **Push notifications**
   - Simulate receiving FCM notification via `page.evaluate` injecting `onMessage` callback; verify toast appears.

## 9. Kitchen & POS Workflows

1. **Order flow to kitchen**
   - After placing an order, intercept Firestore `onSnapshot` in kitchen page to feed a fake order; verify table updates.

2. **POS login and sales**
   - Input PIN, mock validation, add an order via POS interface, and confirm cart behaviour.

## 10. Error Handling & Offline

1. **Network failures**
   - Use Playwright's `page.route` to block/return 500 for API endpoints (menu, reservations, checkout) and assert error messages.

2. **Offline PWA**
   - Emulate offline mode (`page.setOffline(true)`) and reload; confirm menu is served from cache and UI shows offline notice.

3. **Service worker caching**
   - Verify SW precaches core assets by querying `caches.keys()` via `evaluate` and ensure versioning.

## 11. Static Pages & Assets

- Add tests confirming `/admin/`, `/delivery/`, `/kiosk/` interactions (already covered) plus login to admin dashboard, navigating sections.

---

### Test data and environment
- Maintain a **test Firebase project** or stub Firestore calls; avoid altering production data.
- Use Playwright's `page.route` to intercept requests and return fixtures (JSON) for predictable outcomes.
- When persistent state is needed, clear localStorage at the start of tests.

### Organizing tests
- Group related tests into separate files (e.g. `checkout.spec.js`, `auth.spec.js`, `reservations.spec.js`) for clarity and parallelism.
- Add tags/annotations (e.g. `test.describe.parallel`) if some suites require isolated servers or states.

### CI integration
- Ensure `npm run test:e2e` is executed after build in GitHub Actions (already in README instructions).
- Cache Playwright browsers and node_modules to speed up runs.

---

This plan should serve as a roadmap for gradually expanding coverage. Prioritize flows that directly impact revenue (orders, payments, loyalty) then expand outward to admin features and edge cases.