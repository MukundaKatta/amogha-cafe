// ===== AMOGHA CAFE — REST API (Firebase Cloud Functions) =====
// Powers ChatGPT / AI platform ordering integrations
const functions = require('firebase-functions');
const admin     = require('firebase-admin');
const express   = require('express');
const cors      = require('cors');

admin.initializeApp();
const db = admin.firestore();

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
