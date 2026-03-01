# CI/CD, SEO & Infrastructure

---

## CI/CD — GitHub Actions

**File:** `.github/workflows/deploy.yml`

Automated deployment pipeline triggered on every push to `master`.

### Pipeline Steps

| Step | Action |
|------|--------|
| 1. Checkout | Pull latest code |
| 2. Setup Node | Node.js 20 with npm cache |
| 3. Install | `npm ci` (clean install) |
| 4. Test | `npm test -- --run` (Vitest, 71 tests) |
| 5. Deploy | Firebase Hosting + Firestore rules |

### Configuration

- **Trigger:** Push to `master` branch
- **Runner:** `ubuntu-latest`
- **Secret:** `FIREBASE_TOKEN` stored in GitHub repo secrets
- **Deploys:** Hosting files + Firestore security rules (not Cloud Functions)

Tests must pass before deployment proceeds. Failed tests block the deploy.

---

## SEO

### robots.txt

```
User-agent: *
Allow: /
Sitemap: https://amogha-cafe.web.app/sitemap.xml
```

All pages are crawlable. Sitemap URL declared for search engines.

### sitemap.xml

| URL | Priority | Change Frequency |
|-----|----------|------------------|
| `/` (main page) | 1.0 | weekly |
| `/track/index.html` | 0.5 | never |

---

## Firebase Hosting Configuration

**File:** `firebase.json`

### Hosting Rewrites

| Source | Target |
|--------|--------|
| `/api/**` | Cloud Function `api` |

All other paths serve static files from the project root.

### Cache Headers

| File Type | Cache Duration |
|-----------|---------------|
| JS & CSS | 30 days (client), 1 year (CDN) |
| Images (jpg, png, webp, gif, svg, ico) | 30 days (client), 1 year (CDN) |
| Fonts (woff, woff2, ttf, eot) | 1 year |
| HTML | 5 minutes |

### Ignored Files (not deployed)

- `firebase.json`, dotfiles, `node_modules`
- `functions/`, `tests/`
- `vitest.config.js`, `vite.config.js`
- Source maps (`*.map`)

---

## Firestore Rules

**File:** `firestore.rules`

Hardened security rules for all 19+ collections. Key principles:

| Rule | Description |
|------|-------------|
| Menu, specials, addons, heroSlides, testimonials, socialPosts, settings | **Read-only** from client |
| Orders | Create allowed; update restricted to status fields only |
| Reviews | **Immutable** — create only, no update/delete |
| Coupons | Only `usedCount` field can be updated |
| Gift cards | Only `balance` and `redeemedAt` updatable |
| Inventory | Only `quantity` updatable (must be ≥ 0) |
| Tables | Only `status`, `currentOrder`, `updatedAt` updatable |
| Notifications | Only `read` field updatable (must be `true`) |
| Catering inquiries | Create-only (required: name, phone, eventType, guestCount, date) |
| **All collections** | No client-side delete |

---

## Storage Rules

**File:** `storage.rules`

Firebase Storage rules for uploaded images (menu items, gallery, etc.).

---

## Build System

**Tool:** Vite

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local development server |
| `npm run build` | Production build → `script.js` at root |
| `npm test` | Vitest test runner (71 tests) |

### Docker Build (for environments without Node.js)

```bash
docker run --rm -v $(pwd):/app -w /app node:20-alpine sh -c "npm install && npm run build"
```

### Docker Deploy

```bash
docker run --rm \
  -v $(pwd):/app \
  -v /Users/ubl/.config/configstore:/root/.config/configstore \
  -w /app node:20-alpine \
  sh -c "npm install -g firebase-tools --silent && firebase deploy --only hosting --project amogha-cafe"
```
