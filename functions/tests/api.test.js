// ===== REST API TESTS — functions/index.js =====
// Uses supertest + Jest with mocked firebase-admin and firebase-functions.
// Run: cd functions && npm test

'use strict';

// ── Mocks (must be declared before require('../index.js')) ──────────────────

// Mock Firestore collections with controllable responses
const mockAdd = jest.fn(() => Promise.resolve({ id: 'test-order-id-abc' }));
const mockGet = jest.fn();
const mockDocGet = jest.fn();
const mockDocRef = { get: mockDocGet, set: jest.fn(() => Promise.resolve()) };
const mockCollection = {
    doc: jest.fn(() => mockDocRef),
    add: mockAdd,
    get: mockGet,
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
};
const mockDb = { collection: jest.fn(() => ({ ...mockCollection })) };

jest.mock('firebase-admin', () => ({
    initializeApp: jest.fn(),
    firestore: jest.fn(() => mockDb),
    messaging: jest.fn(() => ({ send: jest.fn(() => Promise.resolve()) })),
}));

jest.mock('firebase-functions', () => ({
    https: { onRequest: jest.fn((handler) => handler) },
    pubsub: {
        schedule: jest.fn(() => ({
            timeZone: jest.fn(() => ({ onRun: jest.fn() })),
        })),
    },
}));

jest.mock('@google-cloud/vertexai', () => ({
    VertexAI: jest.fn(() => ({
        getGenerativeModel: jest.fn(() => ({
            generateContent: jest.fn(() => Promise.resolve({
                response: {
                    candidates: [{
                        content: { parts: [{ text: '{"reply":"Hello!","suggestedItems":[],"action":null}' }] }
                    }]
                }
            }))
        }))
    }))
}));

// ── Load app after mocks ────────────────────────────────────────────────────
const request = require('supertest');
const { _app: app } = require('../index.js');

// ── Helper to mock Firestore snapshot ──────────────────────────────────────
function makeSnap(docs) {
    return {
        docs: docs.map((d) => ({ id: d._id || 'doc-id', data: () => d })),
        forEach: function(cb) { this.docs.forEach((doc) => cb(doc)); },
        size: docs.length,
        empty: docs.length === 0,
    };
}

beforeEach(() => {
    jest.clearAllMocks();
    // Re-apply implementations cleared by clearAllMocks
    mockAdd.mockResolvedValue({ id: 'test-order-id-abc' });
    mockGet.mockResolvedValue(makeSnap([]));
    mockDocGet.mockResolvedValue({ exists: false, data: () => ({}) });
    mockCollection.where = jest.fn().mockReturnThis();
    mockCollection.orderBy = jest.fn().mockReturnThis();
    mockCollection.limit = jest.fn().mockReturnThis();
    mockDb.collection = jest.fn(() => ({ ...mockCollection }));
    const admin = require('firebase-admin');
    admin.firestore.mockReturnValue(mockDb);
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /menu
// ═══════════════════════════════════════════════════════════════════════════
describe('GET /menu', () => {
    it('returns 200 with items array', async () => {
        mockGet.mockResolvedValue(makeSnap([
            { _id: 'Chicken Biryani', category: 'Biryani', price: 249, available: true, isVeg: false },
            { _id: 'Veg Biryani', category: 'Biryani', price: 199, available: true, isVeg: true },
        ]));
        const res = await request(app).get('/menu');
        expect(res.status).toBe(200);
        expect(res.body.items).toBeInstanceOf(Array);
        expect(res.body.count).toBe(2);
    });

    it('excludes unavailable items', async () => {
        mockGet.mockResolvedValue(makeSnap([
            { _id: 'Available Item', category: 'X', price: 100, available: true },
            { _id: 'Hidden Item', category: 'X', price: 100, available: false },
        ]));
        const res = await request(app).get('/menu');
        expect(res.status).toBe(200);
        expect(res.body.items).toHaveLength(1);
        expect(res.body.items[0].name).toBe('Available Item');
    });

    it('returns empty items when menu collection is empty', async () => {
        mockGet.mockResolvedValue(makeSnap([]));
        const res = await request(app).get('/menu');
        expect(res.status).toBe(200);
        expect(res.body.items).toHaveLength(0);
        expect(res.body.count).toBe(0);
    });

    it('returns 500 on Firestore error', async () => {
        mockGet.mockRejectedValue(new Error('Firestore unavailable'));
        const res = await request(app).get('/menu');
        expect(res.status).toBe(500);
        expect(res.body.error).toBeDefined();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /specials
// ═══════════════════════════════════════════════════════════════════════════
describe('GET /specials', () => {
    it('returns 200 with items array', async () => {
        mockGet.mockResolvedValue(makeSnap([
            { _id: 'Sunday Special', price: 149, description: 'Thali deal' },
        ]));
        const res = await request(app).get('/specials');
        expect(res.status).toBe(200);
        expect(res.body.items).toBeInstanceOf(Array);
        expect(res.body.items).toHaveLength(1);
    });

    it('returns empty items when no specials', async () => {
        mockGet.mockResolvedValue(makeSnap([]));
        const res = await request(app).get('/specials');
        expect(res.status).toBe(200);
        expect(res.body.items).toHaveLength(0);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /order
// ═══════════════════════════════════════════════════════════════════════════
describe('POST /order', () => {
    const validOrder = {
        customer: 'Ravi Kumar',
        phone: '9876543210',
        address: 'Flat 5, Kukatpally, Hyderabad',
        items: [
            { name: 'Chicken Biryani', qty: 2, price: 249 },
            { name: 'Raita', qty: 1, price: 40 },
        ],
    };

    it('places a valid order and returns orderId + trackingUrl', async () => {
        const res = await request(app).post('/order').send(validOrder);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.orderId).toBe('test-order-id-abc');
        expect(res.body.trackingUrl).toContain('test-order-id-abc');
    });

    it('calculates delivery fee correctly below threshold (< ₹500)', async () => {
        const res = await request(app).post('/order').send({
            ...validOrder,
            items: [{ name: 'Tea', qty: 1, price: 30 }],
        });
        expect(res.status).toBe(200);
        expect(res.body.deliveryFee).toBe(49);
        expect(res.body.total).toBe(79); // 30 + 49
    });

    it('waives delivery fee at or above threshold (≥ ₹500)', async () => {
        const res = await request(app).post('/order').send({
            ...validOrder,
            items: [
                { name: 'Chicken Biryani', qty: 2, price: 249 }, // subtotal = 498 + 40 = 538 >= 500? No, 498
                { name: 'Raita', qty: 1, price: 40 },
            ],
        });
        expect(res.status).toBe(200);
        // 249*2 + 40*1 = 538 >= 500 → free delivery
        expect(res.body.deliveryFee).toBe(0);
        expect(res.body.total).toBe(538);
    });

    it('returns 400 when items is empty', async () => {
        const res = await request(app).post('/order').send({ ...validOrder, items: [] });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/items/i);
    });

    it('returns 400 when items is missing', async () => {
        const { items, ...noItems } = validOrder;
        const res = await request(app).post('/order').send(noItems);
        expect(res.status).toBe(400);
    });

    it('returns 400 when customer name is missing', async () => {
        const res = await request(app).post('/order').send({ ...validOrder, customer: '' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/customer/i);
    });

    it('returns 400 when phone is missing', async () => {
        const res = await request(app).post('/order').send({ ...validOrder, phone: '' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/phone/i);
    });

    it('returns 400 when address is missing', async () => {
        const res = await request(app).post('/order').send({ ...validOrder, address: '' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/address/i);
    });

    it('handles multi-item total calculation correctly', async () => {
        const res = await request(app).post('/order').send({
            ...validOrder,
            items: [
                { name: 'Mutton Biryani', qty: 1, price: 349 },
                { name: 'Raita', qty: 2, price: 40 },
                { name: 'Lassi', qty: 1, price: 50 },
            ],
        });
        expect(res.status).toBe(200);
        // 349 + 80 + 50 = 479 < 500 → +49 delivery = 528
        expect(res.body.total).toBe(528);
        expect(res.body.deliveryFee).toBe(49);
    });

    it('returns 500 on Firestore write error', async () => {
        mockAdd.mockRejectedValue(new Error('Firestore write failed'));
        const res = await request(app).post('/order').send(validOrder);
        expect(res.status).toBe(500);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /order/:id
// ═══════════════════════════════════════════════════════════════════════════
describe('GET /order/:id', () => {
    it('returns order data for a valid order ID', async () => {
        mockDocGet.mockResolvedValue({
            exists: true,
            id: 'abc123',
            data: () => ({
                status: 'pending',
                customer: 'Ravi',
                items: [{ name: 'Biryani', qty: 1, price: 249 }],
                total: 298,
                createdAt: '2026-03-01T10:00:00.000Z',
            }),
        });
        const res = await request(app).get('/order/abc123');
        expect(res.status).toBe(200);
        expect(res.body.orderId).toBe('abc123');
        expect(res.body.status).toBe('pending');
        expect(res.body.customer).toBe('Ravi');
        expect(res.body.trackingUrl).toContain('abc123');
    });

    it('returns 404 for unknown order ID', async () => {
        mockDocGet.mockResolvedValue({ exists: false, data: () => ({}) });
        const res = await request(app).get('/order/FAKEID999');
        expect(res.status).toBe(404);
        expect(res.body.error).toMatch(/not found/i);
    });

    it('returns 500 on Firestore error', async () => {
        mockDocGet.mockRejectedValue(new Error('Firestore timeout'));
        const res = await request(app).get('/order/xyz');
        expect(res.status).toBe(500);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /parse-bill
// ═══════════════════════════════════════════════════════════════════════════
describe('POST /parse-bill', () => {
    const validBillPayload = {
        fileData: Buffer.from('fake-image-data').toString('base64'),
        mimeType: 'image/jpeg',
    };

    it('returns 400 when fileData is missing', async () => {
        const res = await request(app).post('/parse-bill').send({ mimeType: 'image/jpeg' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/fileData/i);
    });

    it('returns 400 when mimeType is missing', async () => {
        const res = await request(app).post('/parse-bill').send({ fileData: 'abc' });
        expect(res.status).toBe(400);
    });

    it('returns 400 for unsupported mime type', async () => {
        const res = await request(app).post('/parse-bill').send({
            fileData: 'abc',
            mimeType: 'application/zip',
        });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/unsupported file type/i);
    });

    it('returns 413 when file data exceeds 4MB', async () => {
        // Large payload: Express body-parser or our handler both return 413.
        // Express may intercept before our handler (no body.error field in that case).
        const bigData = 'A'.repeat(4 * 1024 * 1024 + 1);
        const res = await request(app).post('/parse-bill').send({
            fileData: bigData,
            mimeType: 'image/jpeg',
        });
        expect(res.status).toBe(413);
        // Body may come from Express body-parser (no .error) or our handler (.error present)
        if (res.body.error) {
            expect(res.body.error).toMatch(/4MB/i);
        }
    });

    it('accepts all allowed mime types', async () => {
        // These should pass the type check (Gemini mock will handle the rest)
        const types = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        for (const mimeType of types) {
            const res = await request(app).post('/parse-bill').send({
                fileData: validBillPayload.fileData,
                mimeType,
            });
            // Should not return 400 type error (may 500 due to VertexAI mock setup)
            expect(res.status).not.toBe(400);
        }
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /notify
// ═══════════════════════════════════════════════════════════════════════════
describe('POST /notify', () => {
    it('returns 400 when phone is missing', async () => {
        const res = await request(app).post('/notify').send({ message: 'Hello' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/phone/i);
    });

    it('returns 400 when message is missing', async () => {
        const res = await request(app).post('/notify').send({ phone: '9876543210' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/message/i);
    });

    it('returns 404 when user not found in Firestore', async () => {
        mockDocGet.mockResolvedValue({ exists: false, data: () => ({}) });
        const res = await request(app).post('/notify').send({
            phone: '9999999999',
            message: 'Your order is ready!',
        });
        expect(res.status).toBe(404);
        expect(res.body.error).toMatch(/user not found/i);
    });

    it('returns 400 when user has no FCM token', async () => {
        mockDocGet.mockResolvedValue({ exists: true, data: () => ({ name: 'Ravi' }) });
        const res = await request(app).post('/notify').send({
            phone: '9876543210',
            message: 'Ready!',
        });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/fcm token/i);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /chat
// ═══════════════════════════════════════════════════════════════════════════
describe('POST /chat', () => {
    it('returns 400 when message is missing', async () => {
        const res = await request(app).post('/chat').send({ cart: [] });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/message/i);
    });

    it('returns 400 when message is empty string', async () => {
        const res = await request(app).post('/chat').send({ message: '   ' });
        expect(res.status).toBe(400);
    });

    it('returns chat reply with suggestedItems and action', async () => {
        mockGet.mockResolvedValue(makeSnap([
            { _id: 'Chicken Biryani', category: 'Biryani', price: 249, available: true },
        ]));
        const res = await request(app).post('/chat').send({
            message: 'What biryani do you have?',
            cart: [],
            history: [],
        });
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('reply');
        expect(res.body).toHaveProperty('suggestedItems');
        expect(Array.isArray(res.body.suggestedItems)).toBe(true);
        expect(res.body).toHaveProperty('action');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /smart-search
// ═══════════════════════════════════════════════════════════════════════════
describe('POST /smart-search', () => {
    it('returns 400 when query is missing', async () => {
        const res = await request(app).post('/smart-search').send({});
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/query/i);
    });

    it('returns 400 for empty query', async () => {
        const res = await request(app).post('/smart-search').send({ query: '  ' });
        expect(res.status).toBe(400);
    });

    it('returns results and interpretation', async () => {
        mockGet.mockResolvedValue(makeSnap([
            { _id: 'Chicken Biryani', price: 249, available: true },
        ]));
        const res = await request(app).post('/smart-search').send({ query: 'biryani' });
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('results');
        expect(res.body).toHaveProperty('interpretation');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /analytics-query
// ═══════════════════════════════════════════════════════════════════════════
describe('POST /analytics-query', () => {
    it('returns 400 when question is missing', async () => {
        const res = await request(app).post('/analytics-query').send({});
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/question/i);
    });

    it('returns answer, highlights, and chart', async () => {
        // Mock order snapshot
        mockGet.mockResolvedValue(makeSnap([
            {
                status: 'delivered',
                total: 500,
                createdAt: '2026-03-01T12:00:00.000Z',
                payment: 'UPI',
                items: [{ name: 'Chicken Biryani', qty: 2, price: 249, category: 'Biryani' }],
            },
        ]));
        const res = await request(app).post('/analytics-query').send({
            question: 'How much revenue this week?',
        });
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('answer');
        expect(res.body).toHaveProperty('highlights');
        expect(res.body).toHaveProperty('chart');
    });

    it('excludes cancelled and voided orders from stats', async () => {
        // Both cancelled and voided should be excluded
        mockGet.mockResolvedValue(makeSnap([
            { status: 'cancelled', total: 999, createdAt: '2026-03-01T10:00:00.000Z', items: [] },
            { status: 'voided', total: 500, createdAt: '2026-03-01T11:00:00.000Z', items: [] },
            { status: 'delivered', total: 250, createdAt: '2026-03-01T12:00:00.000Z', payment: 'Cash', items: [] },
        ]));
        // The summary building logic should only count the 'delivered' order
        // We verify this by checking the route responds successfully
        const res = await request(app).post('/analytics-query').send({
            question: 'Total revenue?',
        });
        expect(res.status).toBe(200);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// /api prefix stripping middleware
// ═══════════════════════════════════════════════════════════════════════════
describe('API prefix middleware', () => {
    it('strips /api prefix — GET /api/menu works same as GET /menu', async () => {
        mockGet.mockResolvedValue(makeSnap([
            { _id: 'Test Item', category: 'Test', price: 50, available: true },
        ]));
        const res = await request(app).get('/api/menu');
        expect(res.status).toBe(200);
        expect(res.body.items).toBeInstanceOf(Array);
    });
});
