# Cloud Functions & REST API

**Files:** `functions/index.js`, `functions/package.json`
**Base URL:** https://amogha-cafe.web.app/api

Firebase Cloud Functions powering the REST API. Designed for ChatGPT / AI platform integrations and third-party ordering.

---

## Architecture

- **Runtime:** Node.js 20 on Firebase Cloud Functions
- **Framework:** Express.js with CORS enabled
- **Routing:** Both `/api/menu` (via Hosting rewrite) and direct Cloud Functions URL work
- **OpenAPI Spec:** `openapi.json` at project root — importable into ChatGPT Actions or any API client

---

## Endpoints

### GET /menu

Returns all available menu items.

**Response:**
```json
{
  "items": [
    {
      "name": "Chicken Dum Biryani",
      "category": "Biryani",
      "price": 249,
      "description": "...",
      "isVeg": false
    }
  ],
  "count": 53
}
```

- Filters out items where `available === false`
- Sorted by category

---

### GET /specials

Returns today's specials from Firestore `specials` collection.

**Response:**
```json
{
  "items": [
    { "name": "Weekend Special Biryani", "price": 199, "description": "..." }
  ]
}
```

---

### POST /order

Places a Cash on Delivery order.

**Request body:**
```json
{
  "customer": "Rahul Kumar",
  "phone": "9876543210",
  "address": "Flat 301, Kukatpally, Hyderabad",
  "notes": "Extra spicy, no onions",
  "items": [
    { "name": "Chicken Dum Biryani", "price": 249, "qty": 2, "spiceLevel": "hot" }
  ]
}
```

**Required fields:** `customer`, `phone`, `address`, `items` (non-empty array)

**Response:**
```json
{
  "success": true,
  "orderId": "abc123",
  "summary": "Order confirmed for Rahul Kumar! 1 item(s). Total: ₹498 (FREE delivery). Payment: Cash on Delivery.",
  "trackingUrl": "https://amogha-cafe.web.app/track/index.html?id=abc123",
  "total": 498,
  "deliveryFee": 0
}
```

**Pricing:**
- Delivery fee: ₹49 (waived if subtotal ≥ ₹500)
- Payment: Cash on Delivery only
- Order tagged with `source: 'chatgpt'`

---

### GET /order/:id

Track an existing order by ID.

**Response:**
```json
{
  "orderId": "abc123",
  "status": "preparing",
  "customer": "Rahul Kumar",
  "items": [...],
  "total": 498,
  "createdAt": "2026-02-28T12:00:00Z",
  "trackingUrl": "https://amogha-cafe.web.app/track/index.html?id=abc123"
}
```

**Status values:** `pending` → `preparing` → `ready` → `out_for_delivery` → `delivered`

Returns 404 if order not found.

---

### POST /parse-bill

AI-powered bill/receipt parsing using Google Gemini (Vertex AI).

**Request body:**
```json
{
  "fileData": "<base64-encoded image or PDF>",
  "mimeType": "image/jpeg"
}
```

**Supported types:** JPEG, PNG, WebP, PDF (max 2MB)

**Response:**
```json
{
  "success": true,
  "extracted": {
    "amount": 1250,
    "date": "2026-02-15",
    "description": "Fresh vegetables from Ratnadeep Supermarket",
    "category": "Ingredients",
    "paidBy": "Ravi",
    "confidence": "high"
  }
}
```

**Categories:** Ingredients, Utilities, Staff, Equipment, Rent, Marketing, Other

Uses Gemini 2.0 Flash model to extract structured data from bill images. Intended for the admin expense tracking feature.

---

## Dependencies

| Package | Purpose |
|---------|---------|
| express | HTTP routing |
| cors | Cross-origin requests |
| firebase-admin | Firestore access |
| firebase-functions | Cloud Functions runtime |
| @google-cloud/vertexai | Gemini AI for bill parsing |

---

## Deployment

```bash
# Deploy functions only
cd functions && npm install && firebase deploy --only functions

# View logs
firebase functions:log

# Local emulator
firebase emulators:start --only functions
```

---

## OpenAPI Specification

File: `openapi.json` at project root.

The OpenAPI 3.1.0 spec documents the menu, specials, order, and tracking endpoints. Can be imported into:
- **ChatGPT Actions** — enables AI-powered food ordering via conversation
- **Postman / Insomnia** — for API testing
- **Any OpenAPI-compatible client**
