/**
 * seed-shops.js — Multi-tenant seed script
 * Run: GOOGLE_APPLICATION_CREDENTIALS=~/.config/gcloud/application_default_credentials.json node scripts/seed-shops.js
 */
const admin = require('firebase-admin');

admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'amogha-cafe'
});
const db = admin.firestore();

async function seed() {
    console.log('=== Amogha Multi-Tenant Seed ===\n');

    // 1. Add shopId:'amogha' to all existing menu items that don't have one
    console.log('1. Tagging existing menu items with shopId: amogha ...');
    const menuSnap = await db.collection('menu').get();
    const batch1 = db.batch();
    let tagged = 0;
    menuSnap.forEach(doc => {
        if (!doc.data().shopId) {
            batch1.update(doc.ref, { shopId: 'amogha' });
            tagged++;
        }
    });
    if (tagged > 0) await batch1.commit();
    console.log(`   Tagged ${tagged} menu items.\n`);

    // 2. Create shops/amogha doc
    console.log('2. Creating shops/amogha ...');
    await db.collection('shops').doc('amogha').set({
        name: 'Amogha Cafe & Restaurant',
        logo: 'https://amogha-cafe.web.app/amogha-logo.png',
        tagline: 'Self-Service Ordering',
        categories: ['Starters', 'Biryanis', 'Curries', 'Kebabs & Grill', 'Noodles', 'Fried Rice', 'Breads', 'Beverages'],
        theme: { gold: '#D4A017', bg: '#080604' },
        adminPin: '240124',
        createdAt: new Date().toISOString()
    }, { merge: true });
    console.log('   Done.\n');

    // 3. Create shops/teashop doc
    console.log('3. Creating shops/teashop ...');
    await db.collection('shops').doc('teashop').set({
        name: 'Tea Shop',
        logo: '',
        tagline: 'Fresh Teas & Snacks',
        categories: ['Teas & Chai', 'Snacks', 'Cigarettes'],
        theme: { gold: '#c8a96e', bg: '#050302' },
        adminPin: '112233',
        createdAt: new Date().toISOString()
    }, { merge: true });
    console.log('   Done.\n');

    // 4. Seed tea shop menu items
    console.log('4. Seeding tea shop menu items ...');
    const teaItems = [
        { name: 'Masala Chai',       price: 20, category: 'Teas & Chai', type: 'veg', badge: 'Bestseller', sortOrder: 1 },
        { name: 'Ginger Tea',        price: 20, category: 'Teas & Chai', type: 'veg', badge: '',           sortOrder: 2 },
        { name: 'Filter Coffee',     price: 25, category: 'Teas & Chai', type: 'veg', badge: 'Popular',    sortOrder: 3 },
        { name: 'Lemon Tea',         price: 20, category: 'Teas & Chai', type: 'veg', badge: '',           sortOrder: 4 },
        { name: 'Bun Butter',        price: 15, category: 'Snacks',      type: 'veg', badge: '',           sortOrder: 5 },
        { name: 'Glucose Biscuits',  price: 10, category: 'Snacks',      type: 'veg', badge: '',           sortOrder: 6 },
        { name: 'Samosa',            price: 10, category: 'Snacks',      type: 'veg', badge: 'Popular',    sortOrder: 7 },
        { name: 'Wills Navy Cut',    price: 15, category: 'Cigarettes',  type: 'veg', badge: '',           sortOrder: 8 },
        { name: 'Gold Flake Kings',  price: 15, category: 'Cigarettes',  type: 'veg', badge: 'Popular',    sortOrder: 9 },
        { name: 'Classic Milds',     price: 15, category: 'Cigarettes',  type: 'veg', badge: '',           sortOrder: 10 },
    ];

    const batch2 = db.batch();
    teaItems.forEach(item => {
        const ref = db.collection('menu').doc('teashop__' + item.name.replace(/\s+/g, '_'));
        batch2.set(ref, {
            ...item,
            shopId: 'teashop',
            available: true,
            description: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }, { merge: true });
    });
    await batch2.commit();
    console.log(`   Seeded ${teaItems.length} tea shop items.\n`);

    console.log('=== Seed complete! ===');
    console.log('Kiosk URLs:');
    console.log('  Amogha: https://amogha-cafe.web.app/kiosk/');
    console.log('  Tea Shop: https://amogha-cafe.web.app/kiosk/?shop=teashop');
    process.exit(0);
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
