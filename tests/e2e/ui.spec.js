import { test, expect } from '@playwright/test';

async function installDbMock(page, seed = {}) {
    await page.addInitScript((seedData) => {
        const collections = {};
        const input = seedData || {};
        Object.keys(input).forEach((name) => {
            const docs = input[name] || {};
            collections[name] = Object.keys(docs).map((id) => ({ id, ...docs[id] }));
        });

        const store = { collections, seq: 1 };
        window.__e2eStore = store;
        window.__e2eOpenedUrls = [];

        window.open = function(url) {
            window.__e2eOpenedUrls.push(url);
            return null;
        };

        window.firebase = {
            firestore: {
                FieldValue: {
                    increment: function(by) {
                        return { __op: 'increment', by: Number(by) || 0 };
                    }
                }
            }
        };

        function ensureCollection(name) {
            if (!store.collections[name]) store.collections[name] = [];
            return store.collections[name];
        }

        function clone(v) {
            return JSON.parse(JSON.stringify(v));
        }

        function applyPatch(target, patch) {
            Object.keys(patch || {}).forEach((k) => {
                const val = patch[k];
                if (val && typeof val === 'object' && val.__op === 'increment') {
                    target[k] = (Number(target[k]) || 0) + val.by;
                } else {
                    target[k] = val;
                }
            });
        }

        function getDoc(name, id) {
            const col = ensureCollection(name);
            return col.find((d) => d.id === id) || null;
        }

        function makeDocSnap(name, doc) {
            return {
                id: doc.id,
                exists: true,
                data: () => clone(Object.fromEntries(Object.entries(doc).filter(([k]) => k !== 'id'))),
                ref: makeDocRef(name, doc.id)
            };
        }

        function makeQuerySnap(name, docs) {
            const snaps = docs.map((d) => makeDocSnap(name, d));
            return {
                empty: snaps.length === 0,
                docs: snaps,
                forEach: (cb) => snaps.forEach(cb),
                docChanges: () => []
            };
        }

        function sortDocs(docs, field, dir) {
            return docs.slice().sort((a, b) => {
                const av = a[field];
                const bv = b[field];
                if (av === bv) return 0;
                const less = av < bv ? -1 : 1;
                return dir === 'desc' ? -less : less;
            });
        }

        function makeQuery(name, state = {}) {
            const current = {
                filters: state.filters || [],
                order: state.order || null,
                lim: state.lim || null
            };

            function runQuery() {
                let docs = ensureCollection(name).slice();
                current.filters.forEach((f) => {
                    docs = docs.filter((d) => {
                        if (f.op === '==') return d[f.field] === f.value;
                        return true;
                    });
                });
                if (current.order) docs = sortDocs(docs, current.order.field, current.order.dir);
                if (typeof current.lim === 'number') docs = docs.slice(0, current.lim);
                return docs;
            }

            return {
                where: (field, op, value) => makeQuery(name, { ...current, filters: current.filters.concat([{ field, op, value }]) }),
                orderBy: (field, dir = 'asc') => makeQuery(name, { ...current, order: { field, dir } }),
                limit: (n) => makeQuery(name, { ...current, lim: n }),
                get: () => Promise.resolve(makeQuerySnap(name, runQuery())),
                onSnapshot: (cb) => {
                    cb(makeQuerySnap(name, runQuery()));
                    return () => {};
                }
            };
        }

        function makeDocRef(name, id) {
            return {
                get: () => {
                    const doc = getDoc(name, id);
                    if (!doc) return Promise.resolve({ id, exists: false, data: () => undefined, ref: makeDocRef(name, id) });
                    return Promise.resolve(makeDocSnap(name, doc));
                },
                set: (data) => {
                    const col = ensureCollection(name);
                    const existing = getDoc(name, id);
                    if (existing) {
                        Object.keys(existing).forEach((k) => { if (k !== 'id') delete existing[k]; });
                        applyPatch(existing, clone(data || {}));
                    } else {
                        col.push({ id, ...(clone(data || {})) });
                    }
                    return Promise.resolve();
                },
                update: (patch) => {
                    const doc = getDoc(name, id);
                    if (!doc) return Promise.reject(new Error('not-found'));
                    applyPatch(doc, clone(patch || {}));
                    return Promise.resolve();
                },
                onSnapshot: (cb) => {
                    const doc = getDoc(name, id);
                    if (!doc) cb({ id, exists: false, data: () => undefined, ref: makeDocRef(name, id) });
                    else cb(makeDocSnap(name, doc));
                    return () => {};
                }
            };
        }

        function collection(name) {
            return {
                doc: (id) => makeDocRef(name, id),
                add: (data) => {
                    const id = name + '_' + String(store.seq++);
                    ensureCollection(name).push({ id, ...(clone(data || {})) });
                    return Promise.resolve({ id, ...makeDocRef(name, id) });
                },
                where: (field, op, value) => makeQuery(name).where(field, op, value),
                orderBy: (field, dir = 'asc') => makeQuery(name).orderBy(field, dir),
                limit: (n) => makeQuery(name).limit(n),
                get: () => makeQuery(name).get(),
                onSnapshot: (cb) => makeQuery(name).onSnapshot(cb)
            };
        }

        const mockDb = {
            collection,
            batch: () => {
                const ops = [];
                return {
                    set: (ref, data) => ops.push(() => ref.set(data)),
                    update: (ref, data) => ops.push(() => ref.update(data)),
                    commit: () => Promise.all(ops.map((op) => op())).then(() => undefined)
                };
            }
        };

        Object.defineProperty(window, 'db', {
            configurable: false,
            get: () => mockDb,
            set: () => {}
        });
    }, seed);
}

async function setSignedInUser(page, user) {
    await page.addInitScript((u) => {
        localStorage.setItem('amoghaUser', JSON.stringify(u));
    }, user);
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════════════

test('home page renders core UI', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('#signin-btn')).toBeVisible();
    await expect(page.locator('#cart-icon')).toBeVisible();
    await expect(page.locator('#menu')).toBeVisible();
});

test('cart flow opens checkout and redirects unauthenticated user to auth modal', async ({ page }) => {
    await page.goto('/');
    const addButtons = page.locator('.add-to-cart');
    await expect(addButtons.first()).toBeVisible();
    await addButtons.first().click();
    await expect(page.locator('#cart-count')).not.toHaveText('0');
    await page.locator('#cart-icon').click();
    await expect(page.locator('#cart-modal')).toBeVisible();
    const checkout = page.locator('#checkout');
    await checkout.waitFor({ state: 'visible' });
    await page.waitForTimeout(200);
    await checkout.click({ force: true });
    await expect(page.locator('#auth-modal')).toBeVisible();
    await expect(page.locator('#auth-signup.auth-view.active')).toBeVisible();
});

test('auth modal switches between signup and signin views', async ({ page }) => {
    await page.goto('/');
    await page.locator('#signin-btn').click();
    await expect(page.locator('#auth-signup.auth-view.active')).toBeVisible();
    await page.locator('#auth-signup .auth-switch a').click();
    await expect(page.locator('#auth-signin.auth-view.active')).toBeVisible();
    await expect(page.locator('#signin-phone')).toBeVisible();
    await expect(page.locator('#signin-password')).toBeVisible();
});

test('veg filter button is clickable', async ({ page }) => {
    await page.goto('/');
    const vegBtn = page.locator('button:has-text("Veg"), .filter-btn:has-text("Veg")').first();
    await expect(vegBtn).toBeVisible({ timeout: 10000 });
    await vegBtn.click();
});

// ═══════════════════════════════════════════════════════════════════════════
// Order Tracking
// ═══════════════════════════════════════════════════════════════════════════

test('tracking page handles unknown order id', async ({ page }) => {
    await page.goto('/track/?id=FAKE123');
    await expect(page.locator('text=Order not found')).toBeVisible({ timeout: 10000 });
});

test('tracking page renders without crash when no ID given', async ({ page }) => {
    await page.goto('/track/');
    const body = await page.locator('body').textContent();
    expect(body.length).toBeGreaterThan(5);
});

// ═══════════════════════════════════════════════════════════════════════════
// Kiosk
// ═══════════════════════════════════════════════════════════════════════════

test('kiosk page loads without JS errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/kiosk/');
    await page.waitForTimeout(2000);
    const realErrors = errors.filter(
        (e) => !e.includes('firestore') && !e.includes('WebChannel') && !e.includes('firebase')
    );
    expect(realErrors).toHaveLength(0);
});

test('kiosk page has a title', async ({ page }) => {
    await page.goto('/kiosk/');
    expect((await page.title()).length).toBeGreaterThan(0);
});

// ═══════════════════════════════════════════════════════════════════════════
// Kitchen Display System
// ═══════════════════════════════════════════════════════════════════════════

test('kitchen display page loads without JS errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/kitchen/');
    await page.waitForTimeout(1500);
    const realErrors = errors.filter(
        (e) => !e.includes('firestore') && !e.includes('WebChannel') && !e.includes('firebase')
    );
    expect(realErrors).toHaveLength(0);
});

// ═══════════════════════════════════════════════════════════════════════════
// QR Dine-In
// ═══════════════════════════════════════════════════════════════════════════

test('QR page loads without JS errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/qr/');
    await page.waitForTimeout(1500);
    const realErrors = errors.filter(
        (e) => !e.includes('firestore') && !e.includes('WebChannel') && !e.includes('firebase')
    );
    expect(realErrors).toHaveLength(0);
});

test('QR page with table param loads without crash', async ({ page }) => {
    await page.goto('/qr/?table=5');
    await page.waitForTimeout(1000);
    expect((await page.locator('body').textContent()).length).toBeGreaterThan(5);
});

// ═══════════════════════════════════════════════════════════════════════════
// Loyalty Balance Page
// ═══════════════════════════════════════════════════════════════════════════

test('loyalty page shows phone input', async ({ page }) => {
    await page.goto('/loyalty/');
    const phoneInput = page.locator('input[type="tel"], input[placeholder*="phone"], input[placeholder*="Phone"]').first();
    await expect(phoneInput).toBeVisible({ timeout: 8000 });
});

test('loyalty page with phone URL param loads without crash', async ({ page }) => {
    await page.goto('/loyalty/?phone=9876543210');
    await page.waitForTimeout(1500);
    expect((await page.locator('body').textContent()).length).toBeGreaterThan(5);
});

// ═══════════════════════════════════════════════════════════════════════════
// POS Terminal
// ═══════════════════════════════════════════════════════════════════════════

test('POS page loads and shows PIN login screen', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/pos/');
    await page.waitForTimeout(1500);
    const realErrors = errors.filter(
        (e) => !e.includes('firestore') && !e.includes('WebChannel') && !e.includes('firebase')
    );
    expect(realErrors).toHaveLength(0);
    const pinInput = page.locator('input[type="password"], input[placeholder*="PIN"], input[placeholder*="pin"]').first();
    await expect(pinInput).toBeVisible({ timeout: 8000 });
});

// ═══════════════════════════════════════════════════════════════════════════
// Display Board & Delivery
// ═══════════════════════════════════════════════════════════════════════════

test('display board page loads without JS errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/display/');
    await page.waitForTimeout(1500);
    const realErrors = errors.filter(
        (e) => !e.includes('firestore') && !e.includes('WebChannel') && !e.includes('firebase')
    );
    expect(realErrors).toHaveLength(0);
});

test('delivery app page loads without JS errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/delivery/');
    await page.waitForTimeout(1500);
    const realErrors = errors.filter(
        (e) => !e.includes('firestore') && !e.includes('WebChannel') && !e.includes('firebase')
    );
    expect(realErrors).toHaveLength(0);
});

// ═══════════════════════════════════════════════════════════════════════════
// Static Assets
// ═══════════════════════════════════════════════════════════════════════════

test('kiosk manifest.json is accessible and valid JSON', async ({ page }) => {
    const res = await page.goto('/kiosk/manifest.json');
    expect(res.status()).toBe(200);
    const json = JSON.parse(await res.text());
    expect(json).toHaveProperty('name');
    expect(json).toHaveProperty('icons');
});

test('robots.txt is accessible', async ({ page }) => {
    const res = await page.goto('/robots.txt');
    expect(res.status()).toBe(200);
});

test('sitemap.xml is accessible', async ({ page }) => {
    const res = await page.goto('/sitemap.xml');
    expect(res.status()).toBe(200);
});

// additional user‑flow scenarios ---------------------------------------------------

// checkout as a signed‑in user should open the checkout modal directly
// (no auth prompt)
test('authenticated user can proceed to checkout without auth modal', async ({ page }) => {
    // inject a fake user before the page loads
    await page.addInitScript(() => {
        localStorage.setItem('amoghaUser', JSON.stringify({ name: 'E2E Tester', phone: '9000000000', pin: '1234' }));
    });
    await page.goto('/');
    await page.locator('.add-to-cart').first().click();
    await page.click('#cart-icon');
    await page.click('#checkout');
    await expect(page.locator('#auth-modal')).not.toBeVisible();
    await expect(page.locator('#checkout-modal')).toBeVisible();
    // advance to step 2 of checkout
    await page.click('#checkout-modal .cta-button');
    await expect(page.locator('#checkout-step-2')).toBeVisible();
});

// reservation modal validation checks
// the app will rewrite the form when the modal opens, so wait for the
// enhanced fields (#res-name etc.) before interacting

test('reservation modal shows validation messages on bad input', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Reserve")');
    await page.waitForSelector('#res-name');

    // call the submission function directly, since browser validation
    // prevents our handler from running on an empty form
    await page.evaluate(() => window.submitReservation());
    await expect(page.locator('#res-msg')).toHaveText(/Please fill/);

    // now fill required fields but give an invalid phone number
    await page.fill('#res-name', 'Test User');
    await page.fill('#res-phone', '12345');
    const tomorrow = new Date(Date.now()+864e5).toISOString().split('T')[0];
    await page.fill('#res-date', tomorrow);
    await page.evaluate(() => document.getElementById('res-date').dispatchEvent(new Event('change')));
    await page.waitForSelector('.time-slot-btn', { timeout: 5000 });
    await page.click('.time-slot-btn');
    await page.click('.party-btn[data-size="2"]');

    await page.evaluate(() => window.submitReservation());
    await expect(page.locator('#res-msg')).toHaveText(/valid 10-digit/);
});

// reviews carousel should respond to next/prev buttons

test('reviews carousel next/prev buttons move the track', async ({ page }) => {
    await page.goto('/');
    const carousel = page.locator('#reviews-carousel');
    const next = page.locator('.carousel-next');
    const prev = page.locator('.carousel-prev');

    await expect(next).toBeVisible({ timeout: 10000 });
    const before = await carousel.evaluate(el => el.style.transform);
    await next.click();
    const after = await carousel.evaluate(el => el.style.transform);
    expect(after).not.toBe(before);
    await prev.click();
    const after2 = await carousel.evaluate(el => el.style.transform);
    expect(after2).not.toBe(after);
});

// gallery lightbox open/close and keyboard navigation

test('gallery lightbox opens and can be navigated', async ({ page }) => {
    await page.goto('/');
    const firstImg = page.locator('.gallery-item img').first();
    await expect(firstImg).toBeVisible({ timeout: 10000 });
    await firstImg.click();
    await expect(page.locator('.lightbox.active')).toBeVisible();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Escape');
    await expect(page.locator('.lightbox.active')).not.toBeVisible();
});

// broader end-to-end scenarios -----------------------------------------------------

test('signup validates inputs and creates account', async ({ page }) => {
    await installDbMock(page, { users: {} });
    await page.goto('/');
    await page.locator('#signin-btn').click();
    await page.fill('#signup-name', 'E2E User');
    await page.fill('#signup-phone', '12345');
    await page.fill('#signup-password', '1234');
    await page.click('#auth-signup .auth-submit-btn');
    await expect(page.locator('#signup-msg')).toHaveText(/valid 10-digit/);

    await page.fill('#signup-phone', '9000000001');
    await page.click('#auth-signup .auth-submit-btn');
    await page.waitForFunction(() => !!localStorage.getItem('amoghaUser'));
    await expect(page.locator('#signin-btn')).toContainText('E2E');
    const created = await page.evaluate(() =>
        window.__e2eStore.collections.users.some((u) => u.id === '9000000001')
    );
    expect(created).toBe(true);
});

test('signin succeeds and forgot-pin reset updates backend', async ({ page }) => {
    await installDbMock(page, {
        users: {
            '9000000002': { name: 'Ravi Kumar', phone: '9000000002', pin: '1111', usedWelcomeBonus: true }
        }
    });
    await page.goto('/');
    await page.locator('#signin-btn').click();
    await page.locator('#auth-signup .auth-switch a').click();
    await page.click('a:has-text("Forgot PIN?")');
    await page.fill('#forgot-phone', '9000000002');
    await page.fill('#forgot-name', 'Ravi Kumar');
    await page.click('#forgot-step-1 .auth-submit-btn');
    await expect(page.locator('#forgot-step-2')).toBeVisible();
    await page.fill('#forgot-new-password', '2222');
    await page.fill('#forgot-confirm-password', '2222');
    await page.click('#forgot-step-2 .auth-submit-btn');
    const updatedPin = await page.evaluate(() =>
        window.__e2eStore.collections.users.find((u) => u.id === '9000000002').pin
    );
    expect(updatedPin).toBe('2222');

    await page.locator('#signin-btn').click();
    await page.locator('#auth-signup .auth-switch a').click();
    await page.fill('#signin-phone', '9000000002');
    await page.fill('#signin-password', '2222');
    await page.click('#auth-signin .auth-submit-btn');
    await page.waitForFunction(() => !!localStorage.getItem('amoghaUser'));
    await expect(page.locator('#signin-btn')).toContainText('Ravi');
});

test('cart supports quantity updates, remove and clear actions', async ({ page }) => {
    await page.goto('/');
    await page.locator('.add-to-cart').first().click();
    await page.click('#cart-icon');
    await expect(page.locator('.cart-item').first()).toBeVisible();
    await page.locator('.cart-item .qty-btn:has-text("+")').first().click();
    await expect(page.locator('.cart-item .cart-item-quantity span').first()).toContainText('2');
    await page.locator('.cart-item .remove-item').first().click();
    await expect(page.locator('#cart-items')).toContainText('Your cart is empty');

    await page.click('#cart-modal .close');
    await page.locator('.add-to-cart').first().click();
    await page.click('#cart-icon');
    page.once('dialog', (dialog) => dialog.accept());
    await page.click('#clear-cart');
    await expect(page.locator('#cart-count')).toHaveText('0');
});

test('checkout COD flow places order and updates coupon usage', async ({ page }) => {
    await installDbMock(page, {
        users: {
            '9000000003': { name: 'Checkout User', phone: '9000000003', pin: '1234', usedWelcomeBonus: true, loyaltyPoints: 0 }
        },
        coupons: {
            AMOGHA20: { active: true, type: 'percent', discount: 20, usedCount: 0, usageLimit: 10, minOrder: 0 }
        },
        inventory: {}
    });
    await setSignedInUser(page, { name: 'Checkout User', phone: '9000000003', pin: '1234', usedWelcomeBonus: true, loyaltyPoints: 0 });
    await page.goto('/');
    await page.evaluate(() => window.addToCart && window.addToCart('Chicken 65 Biryani', 249));
    await page.click('#cart-icon');
    await page.click('#checkout');
    await expect(page.locator('#checkout-modal')).toBeVisible();
    await page.fill('#coupon-code', 'AMOGHA20');
    await page.click('.coupon-apply-btn');
    await expect(page.locator('#coupon-msg')).toHaveText(/Coupon applied/);
    await page.click('#checkout-step-1 .cta-button');
    await page.fill('#co-name', 'Checkout User');
    await page.fill('#co-phone', '9000000003');
    await page.fill('#co-address', 'E2E Street 1');
    await page.click('#checkout-step-2 .cta-button');
    await page.click('#tab-cod');
    await page.click('#pay-panel-cod .pay-confirm-btn');
    await expect(page.locator('#checkout-step-4')).toBeVisible();
    await expect(page.locator('#confirm-detail')).toContainText('Cash on Delivery');
    const summary = await page.evaluate(() => {
        const orders = window.__e2eStore.collections.orders || [];
        const coupons = window.__e2eStore.collections.coupons || [];
        const c = coupons.find((item) => item.id === 'AMOGHA20');
        return { orders: orders.length, usedCount: c ? c.usedCount : 0 };
    });
    expect(summary.orders).toBe(1);
    const usedCountOk = typeof summary.usedCount === 'number'
        ? summary.usedCount === 1
        : JSON.stringify(summary.usedCount || {}).includes('increment');
    expect(usedCountOk).toBe(true);
});

test('gift card and loyalty redemption work at checkout', async ({ page }) => {
    await installDbMock(page, {
        users: {
            '9000000004': { name: 'Reward User', phone: '9000000004', pin: '1234', usedWelcomeBonus: true, loyaltyPoints: 250 }
        },
        giftCards: {
            TEST100: { active: true, balance: 100 }
        }
    });
    await setSignedInUser(page, { name: 'Reward User', phone: '9000000004', pin: '1234', usedWelcomeBonus: true, loyaltyPoints: 250 });
    await page.goto('/');
    await page.evaluate(() => window.addToCart && window.addToCart('Chicken 65 Biryani', 249));
    await page.click('#cart-icon');
    await page.click('#checkout');
    await page.fill('#giftcard-code', 'TEST100');
    await page.click('#checkout-step-1 .coupon-apply-btn:has-text("Redeem")');
    await expect(page.locator('#giftcard-msg')).toHaveText(/Gift card applied/i);
    await page.click('#loyalty-redeem-btn');
    await expect(page.locator('#coupon-msg')).toHaveText(/Redeemed/);
    const points = await page.evaluate(() => JSON.parse(localStorage.getItem('amoghaUser')).loyaltyPoints);
    expect(points).toBe(50);
});

test('profile modal saves user preferences and addresses', async ({ page }) => {
    await installDbMock(page, {
        users: {
            '9000000005': { name: 'Profile User', phone: '9000000005', pin: '1234', usedWelcomeBonus: true }
        }
    });
    await setSignedInUser(page, { name: 'Profile User', phone: '9000000005', pin: '1234', usedWelcomeBonus: true });
    await page.goto('/');
    await page.evaluate(() => window.openProfileModal());
    await expect(page.locator('#profile-modal')).toBeVisible();
    await page.evaluate(() => {
        const cb = document.querySelector('.profile-dietary-cb');
        if (cb) cb.checked = true;
    });
    await page.fill('#profile-addr-label', 'Home');
    await page.fill('#profile-addr-address', 'Street 123');
    await page.click('#profile-modal button:has-text("Add")');
    await page.fill('#profile-name', 'Profile Updated');
    await page.click('#profile-modal button:has-text("Save Profile")');
    const profile = await page.evaluate(() => JSON.parse(localStorage.getItem('amoghaUser')));
    expect(profile.name).toBe('Profile Updated');
    expect((profile.savedAddresses || []).length).toBeGreaterThan(0);
});

test('referral and order-history reorder flows work', async ({ page }) => {
    await installDbMock(page, {
        users: {
            '9000000006': { name: 'History User', phone: '9000000006', pin: '1234', usedWelcomeBonus: true }
        },
        orders: {
            ord1: {
                userId: '9000000006',
                total: 498,
                status: 'delivered',
                createdAt: '2025-01-15T10:00:00.000Z',
                items: [{ name: 'Chicken 65 Biryani', qty: 2, price: 249 }]
            }
        }
    });
    await setSignedInUser(page, { name: 'History User', phone: '9000000006', pin: '1234', usedWelcomeBonus: true });
    await page.goto('/');
    await page.evaluate(() => window.openReferralModal());
    await expect(page.locator('#referral-modal')).toBeVisible();
    await expect(page.locator('.referral-code')).toContainText(/[A-Z0-9]{6,}/);
    await page.evaluate(() => window.closeReferralModal());
    await page.evaluate(() => window.openMyOrders());
    await page.waitForSelector('.myorder-card', { timeout: 10000 });
    await page.click('.myorder-reorder-btn');
    await expect(page.locator('#cart-count')).not.toHaveText('0');
});

test('group ordering and subscriptions complete main interactions', async ({ page }) => {
    await installDbMock(page, {
        users: {
            '9000000007': { name: 'Group User', phone: '9000000007', pin: '1234', usedWelcomeBonus: true }
        },
        subscriptionPlans: {}
    });
    await setSignedInUser(page, { name: 'Group User', phone: '9000000007', pin: '1234', usedWelcomeBonus: true });
    await page.goto('/');
    await page.evaluate(() => window.createGroupCart());
    await expect(page.locator('#group-modal')).toBeVisible();
    await expect(page.locator('#group-share-url')).toHaveValue(/group=/);
    await page.evaluate(() => window.addToGroupCart('Group Test Meal', 99));
    await page.evaluate(() => window.lockGroupCart());
    const groupStatus = await page.evaluate(() => (window.__e2eStore.collections.groupCarts || [])[0]?.status);
    expect(groupStatus).toBe('locked');

    await page.evaluate(() => window.openSubscriptionModal());
    await expect(page.locator('#subscription-modal')).toBeVisible();
    await page.locator('#subscription-modal button:has-text("Subscribe Now")').first().click();
    const hasActivePlan = await page.evaluate(() => {
        const u = JSON.parse(localStorage.getItem('amoghaUser'));
        return !!(u && u.activeSubscription);
    });
    expect(hasActivePlan).toBe(true);
});

test('badges, split bill and meal planner modals render correctly', async ({ page }) => {
    await setSignedInUser(page, {
        name: 'Badge User',
        phone: '9000000008',
        pin: '1234',
        usedWelcomeBonus: true,
        badges: [{ badgeId: 'first_bite', earnedAt: '2025-01-01T00:00:00.000Z' }]
    });
    await page.goto('/');
    await page.click('button[title="My Badges"]');
    await expect(page.locator('#badge-gallery-modal')).toHaveClass(/show/);

    await page.evaluate(() => window.openSplitBill('ORDER123', 900));
    await page.click('#split-bill-modal .split-num-btn:has-text("3")');
    await expect(page.locator('#split-result')).toContainText('Rs.300');

    await page.evaluate(() => window.openMealPlannerModal());
    await expect(page.locator('#meal-planner-overlay')).toBeVisible();
    await page.click('#meal-planner-overlay button:has-text("×")');
    await expect(page.locator('#meal-planner-overlay')).toHaveCount(0);
});

test('delivery and POS login validations show proper errors', async ({ page }) => {
    await page.goto('/delivery/');
    await page.click('.login-btn');
    await expect(page.locator('#login-err')).toHaveText(/10-digit phone number/);

    await page.goto('/pos/');
    await page.click('#pos-login-btn');
    await expect(page.locator('#pos-login-err')).toHaveText(/Enter username and password/);
});
