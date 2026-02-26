// Firestore Seed Script — Run with: node seed-firestore.js
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, addDoc } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyCM0LIBRVreGCYBknlk_xEXoomzM3JAVBw",
    authDomain: "amogha-cafe.firebaseapp.com",
    projectId: "amogha-cafe",
    storageBucket: "amogha-cafe.firebasestorage.app",
    messagingSenderId: "1000994409697",
    appId: "1:1000994409697:web:983214bafab529d6a2fba0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seed() {
    console.log('Seeding Firestore...\n');

    // ===== 1. REVIEWS (30 realistic reviews) =====
    console.log('Adding reviews...');
    const reviews = [
        { itemName: 'Chicken Dum Biryani', rating: 5, text: 'Best biryani in town! Perfectly spiced and aromatic.', userName: 'Rajesh K', userPhone: '9876543210' },
        { itemName: 'Chicken Dum Biryani', rating: 5, text: 'Authentic Hyderabadi taste. Loved every bite!', userName: 'Priya S', userPhone: '9876543211' },
        { itemName: 'Chicken Dum Biryani', rating: 4, text: 'Very good biryani. Generous portions.', userName: 'Anil M', userPhone: '9876543212' },
        { itemName: 'Chicken Dum Biryani', rating: 5, text: 'Outstanding! The rice is perfectly cooked.', userName: 'Deepa R', userPhone: '9876543213' },
        { itemName: 'Butter Chicken', rating: 5, text: 'Creamy and rich. Just like restaurant quality!', userName: 'Suresh P', userPhone: '9876543214' },
        { itemName: 'Butter Chicken', rating: 4, text: 'Really good butter chicken. Slightly sweet but tasty.', userName: 'Meena V', userPhone: '9876543215' },
        { itemName: 'Butter Chicken', rating: 5, text: 'My favorite! Order every week.', userName: 'Kiran T', userPhone: '9876543216' },
        { itemName: 'Chicken 65', rating: 5, text: 'Super crispy and spicy! Perfect starter.', userName: 'Ravi N', userPhone: '9876543217' },
        { itemName: 'Chicken 65', rating: 4, text: 'Excellent taste. Perfectly fried.', userName: 'Lakshmi G', userPhone: '9876543218' },
        { itemName: 'Chicken 65', rating: 5, text: 'The best chicken 65 I have ever had!', userName: 'Venkat S', userPhone: '9876543219' },
        { itemName: 'Paneer Butter Masala', rating: 4, text: 'Rich and creamy. Good paneer quality.', userName: 'Sneha D', userPhone: '9876543220' },
        { itemName: 'Paneer Butter Masala', rating: 5, text: 'Amazing gravy! Goes perfectly with naan.', userName: 'Anitha K', userPhone: '9876543221' },
        { itemName: 'Gongura Chicken', rating: 5, text: 'Authentic Andhra taste! Tangy and spicy.', userName: 'Srinivas B', userPhone: '9876543222' },
        { itemName: 'Gongura Chicken', rating: 5, text: 'Reminds me of home cooking. Excellent!', userName: 'Padma L', userPhone: '9876543223' },
        { itemName: 'Mutton Dum Biryani', rating: 5, text: 'Tender mutton, perfect spices. Worth every rupee.', userName: 'Farhan A', userPhone: '9876543224' },
        { itemName: 'Mutton Dum Biryani', rating: 4, text: 'Very flavorful. Mutton is soft and juicy.', userName: 'Rehana S', userPhone: '9876543225' },
        { itemName: 'Tandoori Chicken', rating: 5, text: 'Smoky and perfectly charred. Restaurant quality!', userName: 'Arjun M', userPhone: '9876543226' },
        { itemName: 'Tandoori Chicken', rating: 4, text: 'Juicy and well marinated. Great appetizer.', userName: 'Divya P', userPhone: '9876543227' },
        { itemName: 'Veg Dum Biryani', rating: 4, text: 'Great vegetarian option. Flavorful rice.', userName: 'Kavitha R', userPhone: '9876543228' },
        { itemName: 'Veg Dum Biryani', rating: 5, text: 'Best veg biryani! So many vegetables.', userName: 'Ramesh N', userPhone: '9876543229' },
        { itemName: 'Chicken Hakka Noodles', rating: 4, text: 'Good Indo-Chinese flavors. Kids loved it!', userName: 'Sunitha G', userPhone: '9876543230' },
        { itemName: 'Dal Tadka', rating: 5, text: 'Comfort food at its best. Perfect tadka.', userName: 'Vijay K', userPhone: '9876543231' },
        { itemName: 'Garlic Naan', rating: 5, text: 'Soft and buttery. Best naan ever!', userName: 'Pooja T', userPhone: '9876543232' },
        { itemName: 'Chicken Lollipop', rating: 4, text: 'Crispy and well seasoned. Great starter!', userName: 'Manoj V', userPhone: '9876543233' },
        { itemName: 'Paneer 65', rating: 4, text: 'Crispy outside, soft inside. Nice spice level.', userName: 'Swathi B', userPhone: '9876543234' },
        { itemName: 'Chicken 65 Biryani', rating: 5, text: 'Unique combination! Chicken 65 in biryani is genius.', userName: 'Harish M', userPhone: '9876543235' },
        { itemName: 'Mutton Curry', rating: 5, text: 'Rich and hearty. Perfect with roti.', userName: 'Naveen R', userPhone: '9876543236' },
        { itemName: 'Lassi', rating: 5, text: 'Thick and refreshing. Perfect after spicy food!', userName: 'Asha P', userPhone: '9876543237' },
        { itemName: 'Hot Chocolate', rating: 4, text: 'Rich and warm. Great for cold evenings.', userName: 'Siddharth L', userPhone: '9876543238' },
        { itemName: 'Chicken Seekh Kebab', rating: 5, text: 'Juicy and perfectly grilled. Loved the mint chutney!', userName: 'Zara K', userPhone: '9876543239' }
    ];

    for (const review of reviews) {
        await addDoc(collection(db, 'reviews'), {
            ...review,
            createdAt: new Date(Date.now() - Math.floor(Math.random() * 30 * 86400000)).toISOString()
        });
    }
    console.log(`  ✓ Added ${reviews.length} reviews\n`);

    // ===== 2. INVENTORY (41 menu items) =====
    console.log('Setting up inventory...');
    const menuItems = [
        'Veg Manchurian', 'Paneer 65', 'Chicken 65', 'Chicken Hot Wings', 'Veg Spring Rolls', 'Chicken Lollipop',
        'Paneer Butter Masala', 'Dal Tadka', 'Butter Chicken', 'Chicken Curry', 'Mutton Curry', 'Gongura Chicken',
        'Veg Dum Biryani', 'Chicken Dum Biryani', 'Chicken 65 Biryani', 'Mutton Dum Biryani', 'Egg Biryani', 'Paneer Biryani',
        'Paneer Tikka', 'Chicken Seekh Kebab', 'Tandoori Chicken', 'Mutton Seekh Kebab',
        'Veg Hakka Noodles', 'Chicken Hakka Noodles', 'Egg Noodles', 'Schezwan Noodles',
        'Veg Fried Rice', 'Chicken Fried Rice', 'Egg Fried Rice', 'Schezwan Fried Rice',
        'Butter Naan', 'Garlic Naan', 'Tandoori Roti', 'Butter Roti', 'Laccha Paratha',
        'Tea', 'Coffee', 'Hot Chocolate', 'Lassi', 'Buttermilk', 'Fresh Lime Soda'
    ];

    const inventoryData = {};
    menuItems.forEach(item => {
        inventoryData[item] = 50;
    });
    inventoryData._lastReset = new Date().toISOString();

    await setDoc(doc(db, 'inventory', 'stock'), inventoryData);
    console.log(`  ✓ Initialized ${menuItems.length} items with stock=50\n`);

    // ===== 3. TABLES (12 tables) =====
    console.log('Setting up tables...');
    for (let i = 1; i <= 12; i++) {
        await setDoc(doc(db, 'tables', 'table-' + i), {
            number: i,
            status: 'available',
            orderId: null,
            updatedAt: new Date().toISOString()
        });
    }
    console.log('  ✓ Created 12 tables (all available)\n');

    // ===== 4. SAMPLE RESERVATIONS =====
    console.log('Adding sample reservations...');
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 86400000);
    const dayAfter = new Date(today.getTime() + 2 * 86400000);

    const reservations = [
        { name: 'Rajesh Kumar', phone: '9876543210', date: tomorrow.toISOString().split('T')[0], time: '19:00', partySize: 4, requests: 'Birthday celebration - need cake cutting arrangement', status: 'confirmed' },
        { name: 'Priya Sharma', phone: '9876543211', date: tomorrow.toISOString().split('T')[0], time: '20:30', partySize: 2, requests: '', status: 'pending' },
        { name: 'Anil Reddy', phone: '9876543212', date: dayAfter.toISOString().split('T')[0], time: '13:00', partySize: 6, requests: 'Window seat preferred', status: 'pending' },
        { name: 'Deepa Rao', phone: '9876543213', date: dayAfter.toISOString().split('T')[0], time: '19:30', partySize: 8, requests: 'Anniversary dinner - special decoration if possible', status: 'confirmed' },
        { name: 'Suresh Patil', phone: '9876543214', date: dayAfter.toISOString().split('T')[0], time: '12:30', partySize: 3, requests: '', status: 'pending' }
    ];

    for (const res of reservations) {
        await addDoc(collection(db, 'reservations'), {
            ...res,
            createdAt: new Date().toISOString()
        });
    }
    console.log(`  ✓ Added ${reservations.length} reservations\n`);

    // ===== 5. MENU ITEMS =====
    console.log('Seeding menu items...');
    const menuCatalog = [
        // Starters
        { name: 'Veg Manchurian', price: 169, category: 'Starters', type: 'veg', badge: '', sortOrder: 1 },
        { name: 'Paneer 65', price: 189, category: 'Starters', type: 'veg', badge: '', sortOrder: 2 },
        { name: 'Chicken 65', price: 200, category: 'Starters', type: 'non-veg', badge: 'Bestseller', sortOrder: 3 },
        { name: 'Chicken Hot Wings', price: 220, category: 'Starters', type: 'non-veg', badge: '', sortOrder: 4 },
        { name: 'Chilli Chicken', price: 200, category: 'Starters', type: 'non-veg', badge: '', sortOrder: 5 },
        { name: 'Chilli Prawns', price: 280, category: 'Starters', type: 'non-veg', badge: '', sortOrder: 6 },
        { name: 'Veg Spring Rolls', price: 149, category: 'Starters', type: 'veg', badge: '', sortOrder: 7 },
        { name: 'Chicken Lollipop', price: 230, category: 'Starters', type: 'non-veg', badge: '', sortOrder: 8 },
        // Curries
        { name: 'Paneer Butter Masala', price: 219, category: 'Curries', type: 'veg', badge: 'Popular', sortOrder: 1 },
        { name: 'Kadai Paneer', price: 239, category: 'Curries', type: 'veg', badge: '', sortOrder: 2 },
        { name: 'Mushroom Masala', price: 219, category: 'Curries', type: 'veg', badge: '', sortOrder: 3 },
        { name: 'Chicken Butter Masala', price: 239, category: 'Curries', type: 'non-veg', badge: "Chef's Pick", sortOrder: 4 },
        { name: 'Chicken Tikka Masala', price: 249, category: 'Curries', type: 'non-veg', badge: '', sortOrder: 5 },
        { name: 'Gongura Chicken', price: 239, category: 'Curries', type: 'non-veg', badge: '', sortOrder: 6 },
        { name: 'Dal Tadka', price: 149, category: 'Curries', type: 'veg', badge: '', sortOrder: 7 },
        { name: 'Butter Chicken', price: 249, category: 'Curries', type: 'non-veg', badge: 'Bestseller', sortOrder: 8 },
        { name: 'Chicken Curry', price: 219, category: 'Curries', type: 'non-veg', badge: '', sortOrder: 9 },
        { name: 'Mutton Curry', price: 319, category: 'Curries', type: 'non-veg', badge: '', sortOrder: 10 },
        // Biryanis
        { name: 'Veg Dum Biryani', price: 179, category: 'Biryanis', type: 'veg', badge: '', sortOrder: 1 },
        { name: 'Paneer Biryani', price: 219, category: 'Biryanis', type: 'veg', badge: '', sortOrder: 2 },
        { name: 'Egg Biryani', price: 189, category: 'Biryanis', type: 'non-veg', badge: '', sortOrder: 3 },
        { name: 'Chicken Fry Piece Biryani', price: 219, category: 'Biryanis', type: 'non-veg', badge: 'Popular', sortOrder: 4 },
        { name: 'Chicken 65 Biryani', price: 249, category: 'Biryanis', type: 'non-veg', badge: 'Bestseller', sortOrder: 5 },
        { name: 'Boneless Chicken Biryani', price: 219, category: 'Biryanis', type: 'non-veg', badge: '', sortOrder: 6 },
        { name: 'Chicken Dum Biryani', price: 249, category: 'Biryanis', type: 'non-veg', badge: 'Bestseller', sortOrder: 7 },
        { name: 'Mutton Dum Biryani', price: 349, category: 'Biryanis', type: 'non-veg', badge: '', sortOrder: 8 },
        // Kebabs & Grill
        { name: 'Chicken Seekh Kebab', price: 119, category: 'Kebabs & Grill', type: 'non-veg', badge: '', sortOrder: 1 },
        { name: 'Chicken Malai Kebab', price: 149, category: 'Kebabs & Grill', type: 'non-veg', badge: '', sortOrder: 2 },
        { name: 'Tandoori Chicken Half', price: 189, category: 'Kebabs & Grill', type: 'non-veg', badge: '', sortOrder: 3 },
        { name: 'Chicken Tikka', price: 149, category: 'Kebabs & Grill', type: 'non-veg', badge: '', sortOrder: 4 },
        { name: 'Paneer Tikka', price: 209, category: 'Kebabs & Grill', type: 'veg', badge: '', sortOrder: 5 },
        { name: 'Mutton Seekh Kebab', price: 289, category: 'Kebabs & Grill', type: 'non-veg', badge: '', sortOrder: 6 },
        // Noodles
        { name: 'Veg Noodles', price: 130, category: 'Noodles', type: 'veg', badge: '', sortOrder: 1 },
        { name: 'Chicken Schezwan Noodles', price: 170, category: 'Noodles', type: 'non-veg', badge: '', sortOrder: 2 },
        { name: 'Veg Hakka Noodles', price: 169, category: 'Noodles', type: 'veg', badge: '', sortOrder: 3 },
        { name: 'Chicken Hakka Noodles', price: 199, category: 'Noodles', type: 'non-veg', badge: '', sortOrder: 4 },
        { name: 'Egg Noodles', price: 179, category: 'Noodles', type: 'non-veg', badge: '', sortOrder: 5 },
        { name: 'Schezwan Noodles', price: 189, category: 'Noodles', type: 'veg', badge: '', sortOrder: 6 },
        // Fried Rice
        { name: 'Veg Fried Rice', price: 130, category: 'Fried Rice', type: 'veg', badge: '', sortOrder: 1 },
        { name: 'Chicken Fried Rice', price: 170, category: 'Fried Rice', type: 'non-veg', badge: '', sortOrder: 2 },
        { name: 'Egg Fried Rice', price: 179, category: 'Fried Rice', type: 'non-veg', badge: '', sortOrder: 3 },
        { name: 'Schezwan Fried Rice', price: 189, category: 'Fried Rice', type: 'veg', badge: '', sortOrder: 4 },
        // Rotis & Naan
        { name: 'Rumali Roti', price: 12, category: 'Rotis & Naan', type: 'veg', badge: '', sortOrder: 1 },
        { name: 'Butter Naan', price: 25, category: 'Rotis & Naan', type: 'veg', badge: '', sortOrder: 2 },
        { name: 'Garlic Naan', price: 35, category: 'Rotis & Naan', type: 'veg', badge: 'Popular', sortOrder: 3 },
        { name: 'Cheese Naan', price: 50, category: 'Rotis & Naan', type: 'veg', badge: '', sortOrder: 4 },
        { name: 'Tandoori Roti', price: 30, category: 'Rotis & Naan', type: 'veg', badge: '', sortOrder: 5 },
        { name: 'Butter Roti', price: 35, category: 'Rotis & Naan', type: 'veg', badge: '', sortOrder: 6 },
        { name: 'Laccha Paratha', price: 45, category: 'Rotis & Naan', type: 'veg', badge: '', sortOrder: 7 },
        // Beverages
        { name: 'Tea', price: 30, category: 'Beverages', type: 'veg', badge: '', sortOrder: 1 },
        { name: 'Coffee', price: 40, category: 'Beverages', type: 'veg', badge: '', sortOrder: 2 },
        { name: 'Hot Chocolate', price: 60, category: 'Beverages', type: 'veg', badge: '', sortOrder: 3 },
        { name: 'Lassi', price: 50, category: 'Beverages', type: 'veg', badge: '', sortOrder: 4 },
        { name: 'Buttermilk', price: 35, category: 'Beverages', type: 'veg', badge: '', sortOrder: 5 },
        { name: 'Fresh Lime Soda', price: 45, category: 'Beverages', type: 'veg', badge: '', sortOrder: 6 },
    ];

    for (const item of menuCatalog) {
        await setDoc(doc(db, 'menu', item.name), {
            ...item,
            available: true,
            updatedAt: new Date().toISOString()
        });
    }
    console.log(`  ✓ Added ${menuCatalog.length} menu items\n`);

    // ===== 6. TODAY'S SPECIALS =====
    console.log('Seeding today\'s specials...');
    const specials = [
        { name: 'Baghara Rice + Chicken Fry', price: 249, badge: 'Amogha Special', description: 'Aromatic baghara rice served with crispy chicken fry', sortOrder: 1 },
        { name: 'Chicken 65 Biryani', price: 249, badge: 'Bestseller', description: 'Our signature chicken 65 layered in fragrant biryani rice', sortOrder: 2 },
        { name: 'Gongura Chicken + Naan', price: 264, badge: 'Must Try', description: 'Tangy Andhra-style gongura chicken paired with fresh naan', sortOrder: 3 },
    ];

    for (const special of specials) {
        await addDoc(collection(db, 'specials'), {
            ...special,
            available: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
    }
    console.log(`  ✓ Added ${specials.length} specials\n`);

    console.log('========================================');
    console.log('Seeding complete!');
    console.log('  • 30 customer reviews');
    console.log('  • 41 inventory items (stock: 50 each)');
    console.log('  • 12 tables (all available)');
    console.log('  • 5 sample reservations');
    console.log(`  • ${menuCatalog.length} menu items`);
    console.log(`  • ${specials.length} today\'s specials`);
    console.log('========================================');
    process.exit(0);
}

seed().catch(err => {
    console.error('Seed error:', err);
    process.exit(1);
});
