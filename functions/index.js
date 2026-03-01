// ===== AMOGHA CAFE — REST API (Firebase Cloud Functions) =====
// Powers ChatGPT / AI platform ordering integrations
const functions = require('firebase-functions');
const admin     = require('firebase-admin');
const express   = require('express');
const cors      = require('cors');

admin.initializeApp();
const db = admin.firestore();

// ===== GEMINI AI HELPER =====
var _geminiModel = null;

function getGeminiModel() {
    if (!_geminiModel) {
        var { VertexAI } = require('@google-cloud/vertexai');
        var vertexAI = new VertexAI({ project: 'amogha-cafe', location: 'us-central1' });
        _geminiModel = vertexAI.getGenerativeModel({ model: 'gemini-2.0-flash-001' });
    }
    return _geminiModel;
}

// In-memory menu cache (refreshes every 10 minutes)
var _menuCache = { items: null, ts: 0 };

async function getMenuData() {
    if (_menuCache.items && (Date.now() - _menuCache.ts) < 600000) return _menuCache.items;
    var snap = await db.collection('menu').get();
    var items = [];
    snap.forEach(function(doc) {
        var d = doc.data();
        items.push({
            name: doc.id, category: d.category || '', price: d.price || 0,
            description: d.description || '', isVeg: d.isVeg || false,
            allergens: d.allergens || [], available: d.available !== false, badge: d.badge || ''
        });
    });
    _menuCache = { items: items, ts: Date.now() };
    return items;
}

async function callGemini(systemPrompt, userMessage) {
    var model = getGeminiModel();
    var result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: systemPrompt + '\n\nUser request:\n' + userMessage }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048, responseMimeType: 'application/json' }
    });
    var text = result.response.candidates[0].content.parts[0].text.trim();
    if (text.startsWith('```')) text = text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    return JSON.parse(text);
}

const FREE_DELIVERY_THRESHOLD = 500;
const DELIVERY_FEE = 49;

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '4mb' }));

// Normalize path: strip /api prefix so both
// https://amogha-cafe.web.app/api/menu  (via hosting rewrite)
// https://us-central1-amogha-cafe.cloudfunctions.net/api/menu  (direct)
// both work with the same route definitions.
app.use(function(req, res, next) {
    if (req.url.startsWith('/api')) req.url = req.url.slice(4) || '/';
    next();
});

// -----------------------------------------------------------------------
// GET /menu  — full available menu
// -----------------------------------------------------------------------
app.get('/menu', async function(req, res) {
    try {
        const snap = await db.collection('menu').get();
        const items = [];
        snap.forEach(function(doc) {
            const d = doc.data();
            if (d.available !== false) {
                items.push({
                    name:        doc.id,
                    category:    d.category    || '',
                    price:       d.price       || 0,
                    description: d.description || '',
                    isVeg:       d.isVeg       || false
                });
            }
        });
        items.sort(function(a, b) { return a.category.localeCompare(b.category); });
        res.json({ items: items, count: items.length });
    } catch (e) {
        console.error('GET /menu error:', e);
        res.status(500).json({ error: 'Could not fetch menu' });
    }
});

// -----------------------------------------------------------------------
// GET /specials  — today's specials
// -----------------------------------------------------------------------
app.get('/specials', async function(req, res) {
    try {
        const snap = await db.collection('specials').get();
        const items = [];
        snap.forEach(function(doc) {
            items.push(Object.assign({ name: doc.id }, doc.data()));
        });
        res.json({ items: items });
    } catch (e) {
        console.error('GET /specials error:', e);
        res.status(500).json({ error: 'Could not fetch specials' });
    }
});

// -----------------------------------------------------------------------
// POST /order  — place a Cash-on-Delivery order
// -----------------------------------------------------------------------
app.post('/order', async function(req, res) {
    try {
        var body     = req.body || {};
        var items    = body.items;
        var customer = (body.customer || '').trim();
        var phone    = (body.phone    || '').trim();
        var address  = (body.address  || '').trim();
        var notes    = (body.notes    || '').trim();

        // Validate required fields
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'items array is required and must not be empty' });
        }
        if (!customer) return res.status(400).json({ error: 'customer name is required' });
        if (!phone)    return res.status(400).json({ error: 'phone number is required' });
        if (!address)  return res.status(400).json({ error: 'delivery address is required' });

        // Calculate totals
        var subtotal = items.reduce(function(sum, item) {
            return sum + ((parseFloat(item.price) || 0) * (parseInt(item.qty) || 1));
        }, 0);
        var deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
        var total = subtotal + deliveryFee;

        var orderData = {
            customer:       customer,
            phone:          phone,
            address:        address,
            notes:          notes,
            items:          items.map(function(item) {
                return {
                    name:       item.name  || '',
                    qty:        parseInt(item.qty)   || 1,
                    price:      parseFloat(item.price) || 0,
                    spiceLevel: item.spiceLevel || 'medium',
                    addons:     []
                };
            }),
            subtotal:       subtotal,
            deliveryFee:    deliveryFee,
            total:          total,
            payment:        'Cash on Delivery',
            paymentStatus:  'cod-pending',
            status:         'pending',
            createdAt:      new Date().toISOString(),
            source:         'chatgpt',
            userId:         null
        };

        var docRef = await db.collection('orders').add(orderData);
        var trackUrl = 'https://amogha-cafe.web.app/track/index.html?id=' + docRef.id;

        res.json({
            success:      true,
            orderId:      docRef.id,
            summary:      'Order confirmed for ' + customer + '! ' +
                          items.length + ' item(s). Total: \u20B9' + total +
                          (deliveryFee === 0 ? ' (FREE delivery)' : ' (incl. \u20B9' + deliveryFee + ' delivery)') +
                          '. Payment: Cash on Delivery. Please keep cash ready.',
            trackingUrl:  trackUrl,
            total:        total,
            deliveryFee:  deliveryFee
        });
    } catch (e) {
        console.error('POST /order error:', e);
        res.status(500).json({ error: 'Could not place order. Please try again.' });
    }
});

// -----------------------------------------------------------------------
// GET /order/:id  — track an order
// -----------------------------------------------------------------------
app.get('/order/:id', async function(req, res) {
    try {
        var doc = await db.collection('orders').doc(req.params.id).get();
        if (!doc.exists) return res.status(404).json({ error: 'Order not found' });
        var d = doc.data();
        res.json({
            orderId:     doc.id,
            status:      d.status,
            customer:    d.customer,
            items:       d.items,
            total:       d.total,
            createdAt:   d.createdAt,
            trackingUrl: 'https://amogha-cafe.web.app/track/index.html?id=' + doc.id
        });
    } catch (e) {
        console.error('GET /order error:', e);
        res.status(500).json({ error: 'Could not fetch order' });
    }
});

// -----------------------------------------------------------------------
// POST /parse-bill  — OCR bill parsing via Gemini
// -----------------------------------------------------------------------
app.post('/parse-bill', async function(req, res) {
    try {
        var body = req.body || {};
        var fileData = body.fileData;
        var mimeType = body.mimeType;

        if (!fileData || !mimeType) {
            return res.status(400).json({ error: 'fileData (base64) and mimeType are required' });
        }

        var allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        if (!allowedTypes.includes(mimeType)) {
            return res.status(400).json({ error: 'Unsupported file type. Allowed: JPG, PNG, WebP, PDF' });
        }

        if (fileData.length > 4 * 1024 * 1024) {
            return res.status(413).json({ error: 'File too large. Maximum 2MB.' });
        }

        var { VertexAI } = require('@google-cloud/vertexai');
        var vertexAI = new VertexAI({ project: 'amogha-cafe', location: 'us-central1' });
        var model = vertexAI.getGenerativeModel({ model: 'gemini-2.0-flash-001' });

        var prompt = 'You are analyzing a restaurant expense bill/receipt/invoice. ' +
            'Extract the following information and return ONLY a JSON object (no markdown, no explanation):\n' +
            '{\n' +
            '  "amount": <total amount as a number, in INR>,\n' +
            '  "date": "<date in YYYY-MM-DD format, or empty string if not found>",\n' +
            '  "description": "<vendor name and/or brief description of what was purchased>",\n' +
            '  "category": "<one of: Ingredients, Utilities, Staff, Equipment, Rent, Marketing, Other>",\n' +
            '  "paidBy": "<name of the person who paid, or empty string if not found>",\n' +
            '  "confidence": "<high, medium, or low>"\n' +
            '}\n\n' +
            'Category guidelines for a restaurant:\n' +
            '- Ingredients: food supplies, raw materials, vegetables, meat, spices, cooking oil, groceries\n' +
            '- Utilities: electricity, water, gas, internet, phone bills\n' +
            '- Staff: salaries, wages, uniforms, training\n' +
            '- Equipment: kitchen equipment, furniture, repairs, maintenance, plumbing, AC service\n' +
            '- Rent: rent, lease payments, property tax\n' +
            '- Marketing: ads, printing, signage, social media, promotions\n' +
            '- Other: anything that does not fit the above\n\n' +
            'If you cannot read the bill clearly, still try your best and set confidence to "low".\n' +
            'Always return valid JSON only.';

        var result = await model.generateContent({
            contents: [{
                role: 'user',
                parts: [
                    { text: prompt },
                    { inlineData: { data: fileData, mimeType: mimeType } }
                ]
            }]
        });

        var text = result.response.candidates[0].content.parts[0].text.trim();

        // Strip markdown code fence if Gemini wraps it
        if (text.startsWith('```')) {
            text = text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
        }

        var parsed = JSON.parse(text);

        var validCategories = ['Ingredients','Utilities','Staff','Equipment','Rent','Marketing','Other'];
        var response = {
            amount: typeof parsed.amount === 'number' ? parsed.amount : parseFloat(parsed.amount) || 0,
            date: typeof parsed.date === 'string' ? parsed.date : '',
            description: typeof parsed.description === 'string' ? parsed.description.slice(0, 500) : '',
            category: validCategories.includes(parsed.category) ? parsed.category : 'Other',
            paidBy: typeof parsed.paidBy === 'string' ? parsed.paidBy.slice(0, 100) : '',
            confidence: ['high','medium','low'].includes(parsed.confidence) ? parsed.confidence : 'low'
        };

        res.json({ success: true, extracted: response });

    } catch (e) {
        console.error('POST /parse-bill error:', e);
        if (e instanceof SyntaxError) {
            return res.status(422).json({ error: 'Could not extract structured data from this bill. Please enter details manually.' });
        }
        res.status(500).json({ error: 'Bill parsing failed. Please try again or enter details manually.' });
    }
});

exports.api = functions.https.onRequest(app);

// -----------------------------------------------------------------------
// SCHEDULED: Birthday Auto-Rewards — runs daily at 8 AM IST
// Creates a BDAY coupon for users whose birthday is today
// -----------------------------------------------------------------------
exports.birthdayRewards = functions.pubsub
    .schedule('0 8 * * *')
    .timeZone('Asia/Kolkata')
    .onRun(async function() {
        try {
            var today = new Date();
            var month = String(today.getMonth() + 1).padStart(2, '0');
            var day = String(today.getDate()).padStart(2, '0');
            var todayMMDD = month + '-' + day;

            var usersSnap = await db.collection('users').get();
            var batch = db.batch();
            var count = 0;

            usersSnap.forEach(function(doc) {
                var user = doc.data();
                if (!user.dob) return;

                // dob format: YYYY-MM-DD
                var dobParts = user.dob.split('-');
                if (dobParts.length < 3) return;
                var userMMDD = dobParts[1] + '-' + dobParts[2];

                if (userMMDD === todayMMDD) {
                    var couponCode = 'BDAY-' + doc.id;
                    var couponRef = db.collection('coupons').doc(couponCode);
                    batch.set(couponRef, {
                        code: couponCode,
                        discount: 30,
                        type: 'percent',
                        maxUses: 1,
                        usedCount: 0,
                        minOrder: 200,
                        description: 'Happy Birthday! 30% off your order',
                        expiresAt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7).toISOString(),
                        createdAt: today.toISOString(),
                        source: 'birthday-auto'
                    }, { merge: true });
                    count++;
                }
            });

            if (count > 0) {
                await batch.commit();
                console.log('Birthday coupons created for ' + count + ' users');
            }
            return null;
        } catch (e) {
            console.error('Birthday rewards error:', e);
            return null;
        }
    });

// -----------------------------------------------------------------------
// POST /notify — Send push notification (for admin/system use)
// -----------------------------------------------------------------------
app.post('/notify', async function(req, res) {
    try {
        var body = req.body || {};
        var phone = body.phone;
        var title = body.title || 'Amogha Cafe';
        var message = body.message || '';

        if (!phone || !message) {
            return res.status(400).json({ error: 'phone and message are required' });
        }

        var userDoc = await db.collection('users').doc(phone).get();
        if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });

        var userData = userDoc.data();
        if (!userData.fcmToken) {
            return res.status(400).json({ error: 'User has no FCM token registered' });
        }

        var fcmMessage = {
            notification: { title: title, body: message },
            token: userData.fcmToken
        };

        await admin.messaging().send(fcmMessage);
        res.json({ success: true, message: 'Notification sent' });
    } catch (e) {
        console.error('POST /notify error:', e);
        res.status(500).json({ error: 'Failed to send notification' });
    }
});

// -----------------------------------------------------------------------
// POST /chat — AI Chatbot (conversational ordering + FAQ)
// -----------------------------------------------------------------------
app.post('/chat', async function(req, res) {
    try {
        var body = req.body || {};
        var message = (body.message || '').trim();
        var cartItems = body.cart || [];
        var userPrefs = body.preferences || {};
        var history = body.history || [];

        if (!message) return res.status(400).json({ error: 'message is required' });

        var menuItems = await getMenuData();
        var available = menuItems.filter(function(i) { return i.available; });

        var systemPrompt = 'You are the AI assistant for Amogha Cafe & Restaurant in Hyderabad. ' +
            'Help customers with ordering, FAQs, and recommendations.\n\n' +
            'RESTAURANT INFO:\n' +
            '- Hours: Mon-Thu 11AM-9:30PM, Fri-Sat 11AM-10:30PM, Sun 12PM-9PM\n' +
            '- Address: Pragathi Nagar Rd, Kukatpally, Hyderabad 500085\n' +
            '- Phone: +91 91210 04999\n' +
            '- Free delivery over Rs.500, else Rs.49 delivery fee\n' +
            '- Delivery area: within 5km of Kukatpally\n\n' +
            'AVAILABLE MENU:\n' + JSON.stringify(available) + '\n\n' +
            'CURRENT CART: ' + JSON.stringify(cartItems) + '\n' +
            'USER PREFERENCES: ' + JSON.stringify(userPrefs) + '\n' +
            'CONVERSATION HISTORY:\n' + history.map(function(h) { return h.role + ': ' + h.text; }).join('\n') + '\n\n' +
            'Respond with JSON: { "reply": "your message", "suggestedItems": [{"name":"exact item name from menu","price":number}], "action": null|"addToCart"|"checkout"|"showMenu" }\n' +
            'Keep replies friendly, concise (under 150 words). Use Rs. for prices. Only suggest items from the menu above.';

        var parsed = await callGemini(systemPrompt, message);
        res.json({
            reply: parsed.reply || "I'm not sure about that. Would you like to see our menu?",
            suggestedItems: Array.isArray(parsed.suggestedItems) ? parsed.suggestedItems : [],
            action: parsed.action || null
        });
    } catch (e) {
        console.error('POST /chat error:', e);
        res.status(500).json({
            reply: "Sorry, I'm having trouble right now. Browse our menu or call +91 91210 04999.",
            suggestedItems: [], action: null
        });
    }
});

// -----------------------------------------------------------------------
// POST /smart-search — Natural language menu search
// -----------------------------------------------------------------------
app.post('/smart-search', async function(req, res) {
    try {
        var query = ((req.body || {}).query || '').trim();
        if (!query) return res.status(400).json({ error: 'query is required' });

        var available = (await getMenuData()).filter(function(i) { return i.available; });

        var systemPrompt = 'You are a menu search engine for Amogha Cafe.\n' +
            'Given a natural language query, return matching items ranked by relevance.\n\n' +
            'MENU: ' + JSON.stringify(available) + '\n\n' +
            'Return JSON: { "results": [{"name":"exact item name from menu","price":number,"relevance":"high|medium|low"}], "interpretation": "brief explanation" }\n' +
            'Max 10 results. Only include items from the menu. For dietary queries filter by isVeg. For allergen queries check allergens array.';

        var parsed = await callGemini(systemPrompt, 'Search: "' + query + '"');
        res.json({
            results: Array.isArray(parsed.results) ? parsed.results : [],
            interpretation: parsed.interpretation || ''
        });
    } catch (e) {
        console.error('POST /smart-search error:', e);
        res.status(500).json({ error: 'Search failed', results: [], interpretation: '' });
    }
});

// -----------------------------------------------------------------------
// POST /recommend — Personalized AI recommendations
// -----------------------------------------------------------------------
app.post('/recommend', async function(req, res) {
    try {
        var body = req.body || {};
        var orderHistory = body.orderHistory || [];
        var currentCart = body.currentCart || [];
        var timeOfDay = body.timeOfDay || new Date().getHours();
        var isVegOnly = body.isVegOnly || false;

        var available = (await getMenuData()).filter(function(i) { return i.available; });

        var systemPrompt = 'You are a personalized food recommendation engine for Amogha Cafe.\n' +
            'Analyze the user\'s history and context to suggest items they would enjoy.\n\n' +
            'MENU: ' + JSON.stringify(available) + '\n' +
            'ORDER HISTORY (recent): ' + JSON.stringify(orderHistory.slice(0, 10)) + '\n' +
            'CURRENT CART: ' + JSON.stringify(currentCart) + '\n' +
            'TIME: ' + timeOfDay + 'h, VEG ONLY: ' + isVegOnly + '\n\n' +
            'Return JSON: { "recommendations": [{"name":"exact menu item","price":number,"reason":"brief personalized reason","score":0.0-1.0}] }\n' +
            'Give 4-6 recommendations. Consider: time of day, past preferences, complementary items, variety.';

        var parsed = await callGemini(systemPrompt, 'Generate recommendations');
        res.json({ recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [] });
    } catch (e) {
        console.error('POST /recommend error:', e);
        res.status(500).json({ recommendations: [] });
    }
});

// -----------------------------------------------------------------------
// POST /summarize-reviews — AI review summary + sentiment
// -----------------------------------------------------------------------
app.post('/summarize-reviews', async function(req, res) {
    try {
        var itemName = (req.body || {}).itemName || null;
        var query = db.collection('reviews');
        if (itemName) query = query.where('itemName', '==', itemName);
        var snap = await query.orderBy('createdAt', 'desc').limit(100).get();

        var reviews = [];
        snap.forEach(function(doc) {
            var r = doc.data();
            reviews.push({ rating: r.rating, text: r.text || '', item: r.itemName || '', user: r.userName || '' });
        });

        if (reviews.length === 0) {
            return res.json({ summary: 'No reviews found.', sentiment: 'neutral', themes: [], avgRating: 0, suggestions: [] });
        }

        var systemPrompt = 'Analyze customer reviews for ' + (itemName || 'Amogha Cafe') + '.\n\n' +
            'REVIEWS: ' + JSON.stringify(reviews) + '\n\n' +
            'Return JSON: { "summary": "2-3 sentence overview", "sentiment": "positive|negative|mixed|neutral", ' +
            '"themes": [{"theme":"name","sentiment":"positive|negative","count":number}], ' +
            '"avgRating": number, "suggestions": ["actionable suggestion"] }';

        var parsed = await callGemini(systemPrompt, 'Analyze reviews');
        res.json(parsed);
    } catch (e) {
        console.error('POST /summarize-reviews error:', e);
        res.status(500).json({ error: 'Review analysis failed' });
    }
});

// -----------------------------------------------------------------------
// POST /forecast — AI demand prediction
// -----------------------------------------------------------------------
app.post('/forecast', async function(req, res) {
    try {
        var since = new Date();
        since.setDate(since.getDate() - 30);
        var snap = await db.collection('orders').where('createdAt', '>=', since.toISOString()).orderBy('createdAt', 'desc').limit(500).get();

        var orderData = [];
        snap.forEach(function(doc) {
            var o = doc.data();
            orderData.push({
                date: o.createdAt ? o.createdAt.split('T')[0] : '',
                items: (o.items || []).map(function(i) { return { name: i.name, qty: i.qty || 1 }; }),
                total: o.total || 0, dayOfWeek: new Date(o.createdAt).getDay()
            });
        });

        var tomorrow = new Date(Date.now() + 86400000);
        var systemPrompt = 'You are a restaurant demand forecasting AI for Amogha Cafe.\n' +
            'Analyze 30 days of orders and predict tomorrow\'s demand.\n\n' +
            'ORDER DATA: ' + JSON.stringify(orderData) + '\n' +
            'Tomorrow: ' + tomorrow.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' }) + '\n\n' +
            'Return JSON: { "predictions": [{"item":"name","expectedQty":number,"confidence":"high|medium|low"}], ' +
            '"totalExpectedOrders": number, "peakHours": [{"hour":number,"expectedOrders":number}], "insights": ["pattern insight"] }\n' +
            'Top 15 items by expected quantity. Factor in day-of-week patterns.';

        var parsed = await callGemini(systemPrompt, 'Generate forecast');
        res.json(parsed);
    } catch (e) {
        console.error('POST /forecast error:', e);
        res.status(500).json({ error: 'Forecast generation failed' });
    }
});

// -----------------------------------------------------------------------
// POST /menu-insights — AI menu optimization suggestions
// -----------------------------------------------------------------------
app.post('/menu-insights', async function(req, res) {
    try {
        var menuItems = await getMenuData();
        var since = new Date();
        since.setDate(since.getDate() - 30);
        var orderSnap = await db.collection('orders').where('createdAt', '>=', since.toISOString()).limit(500).get();

        var orderSummary = {};
        var totalRevenue = 0;
        orderSnap.forEach(function(doc) {
            var o = doc.data();
            totalRevenue += o.total || 0;
            (o.items || []).forEach(function(item) {
                if (!orderSummary[item.name]) orderSummary[item.name] = { qty: 0, revenue: 0 };
                orderSummary[item.name].qty += (item.qty || 1);
                orderSummary[item.name].revenue += (item.price || 0) * (item.qty || 1);
            });
        });

        var systemPrompt = 'You are a restaurant menu optimization consultant for Amogha Cafe.\n\n' +
            'MENU: ' + JSON.stringify(menuItems) + '\n' +
            'SALES (30 days): ' + JSON.stringify(orderSummary) + '\n' +
            'Revenue: Rs.' + totalRevenue + ', Orders: ' + orderSnap.size + '\n\n' +
            'Return JSON: { "insights": [{"item":"name","recommendation":"keep|promote|reprice|retire","reason":"brief","suggestedAction":"specific action"}], ' +
            '"combos": [{"name":"combo name","items":["item1","item2"],"suggestedPrice":number,"reason":"why"}], "overallHealth": "brief assessment" }';

        var parsed = await callGemini(systemPrompt, 'Analyze menu performance');
        res.json(parsed);
    } catch (e) {
        console.error('POST /menu-insights error:', e);
        res.status(500).json({ error: 'Menu analysis failed' });
    }
});

// -----------------------------------------------------------------------
// POST /smart-notify — AI-generated personalized notification
// -----------------------------------------------------------------------
app.post('/smart-notify', async function(req, res) {
    try {
        var body = req.body || {};
        var context = body.context || 'general';
        var orderHistory = body.orderHistory || [];

        var specials = [];
        var specialsSnap = await db.collection('specials').get();
        specialsSnap.forEach(function(doc) { specials.push(doc.data()); });

        var systemPrompt = 'Write a push notification for an Amogha Cafe customer.\n\n' +
            'CONTEXT: ' + context + '\n' +
            'ORDER HISTORY: ' + JSON.stringify(orderHistory.slice(0, 5)) + '\n' +
            'SPECIALS: ' + JSON.stringify(specials) + '\n' +
            'Time: ' + new Date().toLocaleTimeString('en-IN') + '\n\n' +
            'Return JSON: { "title": "short title (max 50 chars)", "body": "notification body (max 100 chars)", "bestTime": "HH:MM" }\n' +
            'Be warm, personal. Use emojis. Reference their favorite items.';

        var parsed = await callGemini(systemPrompt, 'Generate notification for: ' + context);
        res.json(parsed);
    } catch (e) {
        console.error('POST /smart-notify error:', e);
        res.status(500).json({ error: 'Notification generation failed' });
    }
});

// -----------------------------------------------------------------------
// POST /meal-plan — AI 7-day meal planner
// -----------------------------------------------------------------------
app.post('/meal-plan', async function(req, res) {
    try {
        var body = req.body || {};
        var dietary = body.dietary || 'all';
        var budget = body.budget || 0;
        var people = body.people || 1;

        var available = (await getMenuData()).filter(function(i) { return i.available; });

        var systemPrompt = 'Create a 7-day meal plan using ONLY items from this menu.\n\n' +
            'MENU: ' + JSON.stringify(available) + '\n\n' +
            'Diet: ' + dietary + ', Budget/day: ' + (budget || 'no limit') + ', People: ' + people + '\n\n' +
            'Return JSON: { "days": [{"day":"Monday","meals":[{"mealType":"lunch|dinner","items":[{"name":"exact menu item","price":number,"qty":number}]}]}], ' +
            '"totalCost": number, "dailyAverage": number, "tips": ["tip"] }\n' +
            'Ensure variety. Only use exact item names from the menu. If veg, only isVeg=true items.';

        var parsed = await callGemini(systemPrompt, 'Generate 7-day meal plan');
        res.json(parsed);
    } catch (e) {
        console.error('POST /meal-plan error:', e);
        res.status(500).json({ error: 'Meal plan generation failed' });
    }
});

// -----------------------------------------------------------------------
// POST /smart-combo — AI-optimized combo suggestions
// -----------------------------------------------------------------------
app.post('/smart-combo', async function(req, res) {
    try {
        var available = (await getMenuData()).filter(function(i) { return i.available; });

        var since = new Date();
        since.setDate(since.getDate() - 30);
        var snap = await db.collection('orders').where('createdAt', '>=', since.toISOString()).limit(300).get();

        var baskets = [];
        snap.forEach(function(doc) {
            baskets.push((doc.data().items || []).map(function(i) { return i.name; }));
        });

        var systemPrompt = 'You are a combo meal optimizer for Amogha Cafe.\n\n' +
            'MENU: ' + JSON.stringify(available) + '\n' +
            'RECENT ORDER BASKETS: ' + JSON.stringify(baskets.slice(0, 100)) + '\n\n' +
            'Return JSON: { "combos": [{"name":"creative combo name","items":["item1","item2","item3"],"originalPrice":number,"suggestedPrice":number,"discount":number,"reason":"why","isVeg":boolean}] }\n' +
            'Suggest 5-8 combos (2-4 items each). Combos should make culinary sense. Discount 10-20%. Include 2+ veg combos.';

        var parsed = await callGemini(systemPrompt, 'Generate smart combos');
        res.json(parsed);
    } catch (e) {
        console.error('POST /smart-combo error:', e);
        res.status(500).json({ error: 'Combo generation failed' });
    }
});
