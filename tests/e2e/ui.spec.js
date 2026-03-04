import { test, expect } from '@playwright/test';

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
    await page.locator('#checkout').click();
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
