// ===== TOP-LEVEL CONSTANTS =====

// *** RAZORPAY CONFIG ***
// STEP 1: Sign up at https://dashboard.razorpay.com/signup and complete KYC
// STEP 2: Go to Settings → API Keys → Generate Key
// STEP 3: Replace the test key below with your live key (rzp_live_...)
export const RAZORPAY_KEY = 'rzp_test_1DP5mmOlF5G5ag';

export const WHATSAPP_NUMBER = '+919121004999';
export const MERCHANT_NAME = 'AMOGHA CAFE & RESTAURANT';
export const FREE_DELIVERY_THRESHOLD = 500;
export const DELIVERY_FEE = 49;
export const COMBO_DISCOUNT = 0.20;

export var LOYALTY_TIERS = [
    { name: 'Bronze', min: 0, color: '#cd7f32', icon: '🥉' },
    { name: 'Silver', min: 500, color: '#c0c0c0', icon: '🥈' },
    { name: 'Gold', min: 1000, color: '#D4A017', icon: '🥇' }
];

export var HAPPY_HOURS = [
    { days: [1, 2, 3, 4, 5], startHour: 14, endHour: 17, discount: 15, label: 'Happy Hour — 15% OFF!', categories: ['beverages'] },
    { days: [0, 1, 2, 3, 4, 5, 6], startHour: 22, endHour: 23, discount: 20, label: 'Late Night Deal — 20% OFF!', categories: ['all'] }
];

export var ITEM_PRICES = {
    'Raita': 40, 'Mirchi ka Salan': 50, 'Veg Manchurian': 169, 'Paneer 65': 189,
    'Chicken 65': 200, 'Chicken Hot Wings': 220, 'Veg Spring Rolls': 149, 'Chicken Lollipop': 230,
    'Paneer Butter Masala': 199, 'Dal Tadka': 149, 'Butter Chicken': 249, 'Chicken Curry': 219,
    'Mutton Curry': 319, 'Gongura Chicken': 239, 'Veg Dum Biryani': 199, 'Chicken Dum Biryani': 249,
    'Chicken 65 Biryani': 249, 'Mutton Dum Biryani': 349, 'Egg Biryani': 199, 'Paneer Biryani': 229,
    'Paneer Tikka': 209, 'Chicken Seekh Kebab': 229, 'Tandoori Chicken': 269, 'Mutton Seekh Kebab': 289,
    'Veg Hakka Noodles': 169, 'Chicken Hakka Noodles': 199, 'Egg Noodles': 179, 'Schezwan Noodles': 189,
    'Veg Fried Rice': 169, 'Chicken Fried Rice': 199, 'Egg Fried Rice': 179, 'Schezwan Fried Rice': 189,
    'Butter Naan': 40, 'Garlic Naan': 50, 'Tandoori Roti': 30, 'Butter Roti': 35, 'Laccha Paratha': 45,
    'Tea': 30, 'Coffee': 40, 'Hot Chocolate': 60, 'Lassi': 50, 'Buttermilk': 35, 'Fresh Lime Soda': 45
};

export var TRANSLATIONS = {
    en: {
        home: 'Home', about: 'About', menu: 'Menu', specials: 'Specials',
        gallery: 'Gallery', reviews: 'Reviews', contact: 'Contact',
        signIn: 'Sign In', orderNow: 'Order Online', reserveTable: 'Reserve Table',
        addToOrder: 'Add to Order', yourOrder: 'Your Order', clearCart: 'Clear Cart',
        checkout: 'Proceed to Checkout', orderSummary: 'Order Summary',
        yourDetails: 'Your Details', payment: 'Payment', orderPlaced: 'Order Placed!',
        thankYou: 'Thank you! Your order has been received.',
        fullName: 'Full Name', phoneNumber: 'Phone Number',
        deliveryAddress: 'Delivery Address', specialInstructions: 'Special Instructions (Optional)',
        ourStory: 'Our Story', whyChooseUs: 'Why Choose Us?', ourMission: 'Our Mission',
        search: 'Search menu...', all: 'All', veg: 'Veg', nonVeg: 'Non-Veg'
    },
    hi: {
        home: 'होम', about: 'हमारे बारे में', menu: 'मेन्यू', specials: 'स्पेशल',
        gallery: 'गैलरी', reviews: 'समीक्षा', contact: 'संपर्क',
        signIn: 'साइन इन', orderNow: 'ऑर्डर करें', reserveTable: 'टेबल बुक करें',
        addToOrder: 'ऑर्डर में जोड़ें', yourOrder: 'आपका ऑर्डर', clearCart: 'कार्ट खाली करें',
        checkout: 'चेकआउट करें', orderSummary: 'ऑर्डर सारांश',
        yourDetails: 'आपकी जानकारी', payment: 'भुगतान', orderPlaced: 'ऑर्डर हो गया!',
        thankYou: 'धन्यवाद! आपका ऑर्डर मिल गया है।',
        fullName: 'पूरा नाम', phoneNumber: 'फोन नंबर',
        deliveryAddress: 'डिलीवरी पता', specialInstructions: 'विशेष निर्देश (वैकल्पिक)',
        ourStory: 'हमारी कहानी', whyChooseUs: 'हमें क्यों चुनें?', ourMission: 'हमारा मिशन',
        search: 'मेन्यू खोजें...', all: 'सभी', veg: 'शाकाहारी', nonVeg: 'मांसाहारी'
    },
    te: {
        home: 'హోమ్', about: 'మా గురించి', menu: 'మెనూ', specials: 'స్పెషల్',
        gallery: 'గ్యాలరీ', reviews: 'సమీక్షలు', contact: 'సంప్రదించండి',
        signIn: 'సైన్ ఇన్', orderNow: 'ఆర్డర్ చేయండి', reserveTable: 'టేబుల్ బుక్ చేయండి',
        addToOrder: 'ఆర్డర్‌లో జోడించండి', yourOrder: 'మీ ఆర్డర్', clearCart: 'కార్ట్ ఖాళీ చేయండి',
        checkout: 'చెక్ అవుట్', orderSummary: 'ఆర్డర్ సారాంశం',
        yourDetails: 'మీ వివరాలు', payment: 'చెల్లింపు', orderPlaced: 'ఆర్డర్ పూర్తయింది!',
        thankYou: 'ధన్యవాదాలు! మీ ఆర్డర్ అందింది.',
        fullName: 'పూర్తి పేరు', phoneNumber: 'ఫోన్ నంబర్',
        deliveryAddress: 'డెలివరీ చిరునామా', specialInstructions: 'ప్రత్యేక సూచనలు (ఐచ్ఛికం)',
        ourStory: 'మా కథ', whyChooseUs: 'మమ్మల్ని ఎందుకు ఎంచుకోవాలి?', ourMission: 'మా లక్ష్యం',
        search: 'మెనూ వెతకండి...', all: 'అన్నీ', veg: 'శాకాహారం', nonVeg: 'మాంసాహారం'
    }
};

// Multi-branch support (future-ready)
export var CURRENT_BRANCH = 'main';
export var BRANCHES = [
    { id: 'main', name: 'Amogha Cafe - Main Branch', code: 'MAIN', address: 'Kukatpally, Hyderabad', coordinates: { lat: 17.4947, lng: 78.3996 }, active: true }
];

// Dynamic pricing rules (loaded from Firestore settings/dynamicPricing)
export var DYNAMIC_PRICING_RULES = [];

export var ITEM_PAIRINGS = {
    'Chicken Dum Biryani': ['Raita', 'Mirchi ka Salan', 'Buttermilk'],
    'Chicken 65 Biryani': ['Raita', 'Mirchi ka Salan', 'Fresh Lime Soda'],
    'Veg Dum Biryani': ['Raita', 'Dal Tadka', 'Lassi'],
    'Mutton Dum Biryani': ['Raita', 'Mirchi ka Salan', 'Buttermilk'],
    'Egg Biryani': ['Raita', 'Buttermilk'],
    'Paneer Biryani': ['Raita', 'Dal Tadka'],
    'Butter Chicken': ['Butter Naan', 'Garlic Naan', 'Laccha Paratha'],
    'Paneer Butter Masala': ['Butter Naan', 'Garlic Naan', 'Tandoori Roti'],
    'Chicken Curry': ['Butter Naan', 'Butter Roti', 'Veg Fried Rice'],
    'Mutton Curry': ['Butter Naan', 'Laccha Paratha'],
    'Gongura Chicken': ['Butter Naan', 'Tandoori Roti'],
    'Dal Tadka': ['Butter Naan', 'Tandoori Roti', 'Veg Fried Rice'],
    'Chicken 65': ['Chicken Dum Biryani', 'Fresh Lime Soda'],
    'Paneer 65': ['Veg Dum Biryani', 'Lassi'],
    'Veg Manchurian': ['Veg Hakka Noodles', 'Veg Fried Rice'],
    'Chicken Hot Wings': ['Fresh Lime Soda', 'Chicken Hakka Noodles'],
    'Chicken Lollipop': ['Chicken Dum Biryani', 'Fresh Lime Soda'],
    'Veg Hakka Noodles': ['Veg Manchurian', 'Veg Spring Rolls'],
    'Chicken Hakka Noodles': ['Chicken 65', 'Fresh Lime Soda']
};
