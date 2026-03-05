# Contributing to Amogha Cafe

## Development Setup

### Prerequisites
- Node.js 20+
- npm 9+
- Firebase CLI (`npm install -g firebase-tools`)

### Getting Started

```bash
# Clone the repository
git clone https://github.com/MukundaKatta/amogha-cafe.git
cd amogha-cafe

# Install dependencies
npm install

# Start local dev server
npm run dev
```

The dev server runs at `http://localhost:5173` with hot module replacement.

### Building

```bash
npm run build       # Production build via Vite
npm run preview     # Preview the production build locally
```

## Project Layout

| Directory | Purpose |
|-----------|---------|
| `src/main.js` | Frontend entry point |
| `src/core/` | Firebase config, constants, utility helpers |
| `src/modules/` | Feature modules (auth, cart, payment, loyalty, etc.) |
| `functions/` | Firebase Cloud Functions (Express REST API) |
| `tests/` | Vitest unit/integration tests |
| `tests/e2e/` | Playwright browser E2E tests |
| `docs/` | Full project documentation (24 guides) |

## Testing

### Unit & Integration Tests (Vitest)

```bash
npm test -- --run          # Run all tests once
npm test                   # Run in watch mode
npm run test:coverage      # Run with coverage report
```

### E2E Browser Tests (Playwright)

```bash
npx playwright install     # Install browsers (first time only)
npm run build              # Build the site first
npm run test:e2e           # Run E2E suite
```

### Writing Tests

- Place unit/integration tests in `tests/<module>.test.js`
- Place E2E tests in `tests/e2e/<feature>.spec.js`
- Use the setup file at `tests/setup.js` which mocks localStorage, Firestore (`db`), and browser APIs
- Run the full suite before submitting changes

## Code Style

- **No framework** — vanilla HTML/CSS/JS with ES modules
- Modules export functions via `Object.assign(window, { ... })` for global access from HTML
- Keep modules focused: one feature per file in `src/modules/`
- Use `src/core/constants.js` for business constants and `src/core/utils.js` for shared helpers

## Branching & Pull Requests

1. Create a feature branch from `master`
2. Make focused, small commits with clear messages
3. Ensure all tests pass (`npm test -- --run`)
4. Open a pull request with a description of changes and test plan
5. PRs are auto-deployed to Firebase Hosting after merge via GitHub Actions

## Deployment

Deployment happens automatically on push to `master` via GitHub Actions:

1. Install dependencies
2. Run test suite
3. Build with Vite
4. Deploy to Firebase Hosting

### Manual Deployment

```bash
# Hosting + Firestore rules
firebase deploy --only hosting,firestore:rules --project amogha-cafe

# Cloud Functions
cd functions && npm install && firebase deploy --only functions
```

## Documentation

When adding or modifying features, update the relevant doc in `docs/`. See [docs/README.md](docs/README.md) for the full index.
