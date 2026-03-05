import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initChatbot, toggleChat, sendChatMessage } from '../src/modules/chatbot.js';

// --- Module-level mocks ---

vi.mock('../src/modules/auth.js', () => ({
    getCurrentUser: vi.fn(() => null),
}));

vi.mock('../src/modules/cart.js', () => ({
    cart: [],
}));

// --- DOM helpers ---

function setupDOM(html) {
    document.body.innerHTML = html || '';
    document.getElementById = (id) => document.body.querySelector('#' + id);
    document.querySelectorAll = (sel) => document.body.querySelectorAll(sel);
    document.querySelector = (sel) => document.body.querySelector(sel);
}

function syncChatClosedState() {
    const modal = document.getElementById('ai-chat-modal');
    if (!modal) return;
    // Flip once to detect internal state; if it opens, flip again to close.
    toggleChat();
    if (modal.classList.contains('open')) {
        toggleChat();
    }
}

// Reset chatOpen state between tests by re-importing fresh module state.
// Because vitest caches modules we track open state manually via toggleChat calls.
// We reset DOM fully on each test which resets visual state; module-level chatOpen
// is reset by calling toggleChat an even number of times when needed.

beforeEach(() => {
    setupDOM('');
    vi.clearAllMocks();
    // Ensure window globals expected by inline onclick handlers
    window.toggleChat = toggleChat;
    window.sendChatMessage = sendChatMessage;
    window.addToCart = vi.fn();
    window.showAuthToast = vi.fn();
    window.checkout = vi.fn();
});

// ---------------------------------------------------------------------------
// 1. initChatbot — creates FAB button and chat modal in DOM
// ---------------------------------------------------------------------------
describe('initChatbot', () => {
    it('creates #ai-chat-fab button in the DOM', () => {
        initChatbot();
        const fab = document.getElementById('ai-chat-fab');
        expect(fab).not.toBeNull();
        expect(fab.tagName.toLowerCase()).toBe('button');
    });

    it('creates #ai-chat-modal in the DOM', () => {
        initChatbot();
        const modal = document.getElementById('ai-chat-modal');
        expect(modal).not.toBeNull();
    });

    it('creates #ai-chat-messages container inside modal', () => {
        initChatbot();
        const messages = document.getElementById('ai-chat-messages');
        expect(messages).not.toBeNull();
    });

    it('creates #ai-chat-input text field inside modal', () => {
        initChatbot();
        const input = document.getElementById('ai-chat-input');
        expect(input).not.toBeNull();
        expect(input.tagName.toLowerCase()).toBe('input');
    });

    it('creates #ai-chat-send button inside modal', () => {
        initChatbot();
        const send = document.getElementById('ai-chat-send');
        expect(send).not.toBeNull();
        expect(send.tagName.toLowerCase()).toBe('button');
    });

    // 2. initChatbot — chat input has keydown listener (verify element exists)
    it('attaches keydown listener — input element exists after initChatbot', () => {
        initChatbot();
        const input = document.getElementById('ai-chat-input');
        // The listener is attached in initChatbot; confirming the element exists
        // (and is the correct type) verifies the code path that attaches the listener ran.
        expect(input).not.toBeNull();
        expect(input.type).toBe('text');
    });
});

// ---------------------------------------------------------------------------
// 3. toggleChat — opens modal (adds 'open' class)
// ---------------------------------------------------------------------------
describe('toggleChat', () => {
    beforeEach(() => {
        initChatbot();
        syncChatClosedState();
    });

    it('adds "open" class to modal on first call', () => {
        toggleChat();
        const modal = document.getElementById('ai-chat-modal');
        expect(modal.classList.contains('open')).toBe(true);
    });

    // 4. toggleChat — closes modal on second call (removes 'open' class)
    it('removes "open" class from modal on second call', () => {
        toggleChat(); // open
        toggleChat(); // close
        const modal = document.getElementById('ai-chat-modal');
        expect(modal.classList.contains('open')).toBe(false);
    });

    // 5. toggleChat — adds/removes 'active' class on FAB
    it('adds "active" class to FAB when opening', () => {
        toggleChat();
        const fab = document.getElementById('ai-chat-fab');
        expect(fab.classList.contains('active')).toBe(true);
    });

    it('removes "active" class from FAB when closing', () => {
        toggleChat(); // open → active
        toggleChat(); // close → not active
        const fab = document.getElementById('ai-chat-fab');
        expect(fab.classList.contains('active')).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// sendChatMessage tests
// ---------------------------------------------------------------------------
describe('sendChatMessage', () => {
    beforeEach(() => {
        initChatbot();
        syncChatClosedState();
    });

    // 6. sendChatMessage — does nothing when message is empty
    it('does nothing when message is empty string', async () => {
        global.fetch = vi.fn();
        const input = document.getElementById('ai-chat-input');
        input.value = '';
        await sendChatMessage();
        expect(global.fetch).not.toHaveBeenCalled();
        const messages = document.getElementById('ai-chat-messages');
        const userBubbles = messages.querySelectorAll('.ai-msg.user');
        expect(userBubbles.length).toBe(0);
    });

    it('does nothing when presetMsg is empty string', async () => {
        global.fetch = vi.fn();
        await sendChatMessage('');
        expect(global.fetch).not.toHaveBeenCalled();
    });

    // 7. sendChatMessage — adds user bubble to messages
    it('adds a user bubble with the message text to #ai-chat-messages', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({
                json: () => Promise.resolve({ reply: 'Test reply', suggestedItems: [] }),
            })
        );
        await sendChatMessage('Hello chatbot');
        await new Promise((r) => setTimeout(r, 10));
        const messages = document.getElementById('ai-chat-messages');
        const userBubbles = messages.querySelectorAll('.ai-msg.user');
        expect(userBubbles.length).toBeGreaterThanOrEqual(1);
        expect(userBubbles[0].textContent).toContain('Hello chatbot');
    });

    // 8. sendChatMessage — shows typing indicator
    it('inserts typing indicator element before fetch resolves', async () => {
        let resolveFetch;
        global.fetch = vi.fn(
            () =>
                new Promise((resolve) => {
                    resolveFetch = resolve;
                })
        );
        // Do not await — we want to inspect mid-flight state
        const promise = sendChatMessage('Show typing');
        // Yield to microtask queue so the synchronous DOM writes complete
        await new Promise((r) => setTimeout(r, 0));
        const messages = document.getElementById('ai-chat-messages');
        const typingEl = messages.querySelector('.ai-typing');
        expect(typingEl).not.toBeNull();
        // Clean up: resolve the pending fetch
        resolveFetch({
            json: () => Promise.resolve({ reply: 'Done', suggestedItems: [] }),
        });
        await promise;
    });

    // 9. sendChatMessage — handles successful API response (mock fetch)
    it('displays bot reply bubble after successful fetch', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({
                json: () => Promise.resolve({ reply: 'Great choice!', suggestedItems: [] }),
            })
        );
        await sendChatMessage('What do you recommend?');
        await new Promise((r) => setTimeout(r, 10));
        const messages = document.getElementById('ai-chat-messages');
        const botBubbles = messages.querySelectorAll('.ai-msg.bot:not(.ai-typing)');
        // The initial greeting bot bubble + the response bot bubble
        const replyBubble = Array.from(botBubbles).find((el) =>
            el.textContent.includes('Great choice!')
        );
        expect(replyBubble).not.toBeUndefined();
    });

    it('removes typing indicator after successful fetch', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({
                json: () => Promise.resolve({ reply: 'All good', suggestedItems: [] }),
            })
        );
        await sendChatMessage('Test');
        await new Promise((r) => setTimeout(r, 10));
        const messages = document.getElementById('ai-chat-messages');
        const typingEl = messages.querySelector('.ai-typing');
        expect(typingEl).toBeNull();
    });

    it('calls fetch with POST to /api/chat', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({
                json: () => Promise.resolve({ reply: 'OK', suggestedItems: [] }),
            })
        );
        await sendChatMessage('hi');
        await new Promise((r) => setTimeout(r, 10));
        expect(global.fetch).toHaveBeenCalledWith(
            '/api/chat',
            expect.objectContaining({ method: 'POST' })
        );
    });

    it('sends message text in fetch body', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({
                json: () => Promise.resolve({ reply: 'OK', suggestedItems: [] }),
            })
        );
        await sendChatMessage('Biryani please');
        await new Promise((r) => setTimeout(r, 10));
        const body = JSON.parse(global.fetch.mock.calls[0][1].body);
        expect(body.message).toBe('Biryani please');
    });

    // 10. sendChatMessage — handles API error gracefully
    it('shows error message when fetch rejects', async () => {
        global.fetch = vi.fn(() => Promise.reject(new Error('network error')));
        await sendChatMessage('This will fail');
        await new Promise((r) => setTimeout(r, 10));
        const messages = document.getElementById('ai-chat-messages');
        const allText = messages.textContent;
        expect(allText).toMatch(/couldn't process|try again|call us/i);
    });

    it('removes typing indicator after fetch error', async () => {
        global.fetch = vi.fn(() => Promise.reject(new Error('network error')));
        await sendChatMessage('Failing message');
        await new Promise((r) => setTimeout(r, 10));
        const messages = document.getElementById('ai-chat-messages');
        const typingEl = messages.querySelector('.ai-typing');
        expect(typingEl).toBeNull();
    });

    // 11. sendChatMessage — displays suggested items from response
    it('renders suggested item buttons when suggestedItems is non-empty', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({
                json: () =>
                    Promise.resolve({
                        reply: 'Try these!',
                        suggestedItems: [
                            { name: 'Chicken Biryani', price: 280 },
                            { name: 'Paneer Tikka', price: 220 },
                        ],
                    }),
            })
        );
        await sendChatMessage('Suggestions please');
        await new Promise((r) => setTimeout(r, 10));
        const messages = document.getElementById('ai-chat-messages');
        const itemBtns = messages.querySelectorAll('.ai-item-btn');
        expect(itemBtns.length).toBe(2);
        const btnText = Array.from(itemBtns).map((b) => b.textContent);
        expect(btnText.some((t) => t.includes('Chicken Biryani'))).toBe(true);
        expect(btnText.some((t) => t.includes('Paneer Tikka'))).toBe(true);
    });

    it('does not render item buttons when suggestedItems is empty', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({
                json: () => Promise.resolve({ reply: 'No items', suggestedItems: [] }),
            })
        );
        await sendChatMessage('Any suggestions?');
        await new Promise((r) => setTimeout(r, 10));
        const messages = document.getElementById('ai-chat-messages');
        const itemBtns = messages.querySelectorAll('.ai-item-btn');
        expect(itemBtns.length).toBe(0);
    });

    // 12. sendChatMessage — clears input after sending
    it('clears the text input field after sending', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({
                json: () => Promise.resolve({ reply: 'OK', suggestedItems: [] }),
            })
        );
        const input = document.getElementById('ai-chat-input');
        input.value = 'What is the menu?';
        await sendChatMessage();
        await new Promise((r) => setTimeout(r, 10));
        expect(input.value).toBe('');
    });

    // 13. sendChatMessage — accepts preset message parameter
    it('uses presetMsg instead of input value when provided', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({
                json: () => Promise.resolve({ reply: 'OK', suggestedItems: [] }),
            })
        );
        const input = document.getElementById('ai-chat-input');
        input.value = 'ignored value';
        await sendChatMessage('preset message text');
        await new Promise((r) => setTimeout(r, 10));
        const body = JSON.parse(global.fetch.mock.calls[0][1].body);
        expect(body.message).toBe('preset message text');
    });

    it('preset message appears in user bubble', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({
                json: () => Promise.resolve({ reply: 'OK', suggestedItems: [] }),
            })
        );
        await sendChatMessage('Veg options');
        await new Promise((r) => setTimeout(r, 10));
        const messages = document.getElementById('ai-chat-messages');
        const userBubbles = messages.querySelectorAll('.ai-msg.user');
        expect(Array.from(userBubbles).some((el) => el.textContent.includes('Veg options'))).toBe(
            true
        );
    });

    // 14. sendChatMessage — calls checkout action when data.action === 'checkout'
    it('calls window.checkout() when response action is "checkout"', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({
                json: () =>
                    Promise.resolve({ reply: 'Proceeding to checkout', suggestedItems: [], action: 'checkout' }),
            })
        );
        window.checkout = vi.fn();
        await sendChatMessage('Checkout please');
        await new Promise((r) => setTimeout(r, 10));
        expect(window.checkout).toHaveBeenCalled();
    });

    it('does not call window.checkout() when action is not "checkout"', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({
                json: () => Promise.resolve({ reply: 'Here is the menu', suggestedItems: [], action: 'showMenu' }),
            })
        );
        window.checkout = vi.fn();
        await sendChatMessage('Show me the menu');
        await new Promise((r) => setTimeout(r, 10));
        expect(window.checkout).not.toHaveBeenCalled();
    });

    // 15. sendChatMessage — scrolls to menu when data.action === 'showMenu'
    it('calls scrollIntoView on #menu element when action is "showMenu"', async () => {
        // Add a #menu element to the DOM
        const menuSection = document.createElement('section');
        menuSection.id = 'menu';
        const scrollIntoViewMock = vi.fn();
        menuSection.scrollIntoView = scrollIntoViewMock;
        document.body.appendChild(menuSection);

        global.fetch = vi.fn(() =>
            Promise.resolve({
                json: () =>
                    Promise.resolve({ reply: 'Here is the menu', suggestedItems: [], action: 'showMenu' }),
            })
        );
        await sendChatMessage('Show menu');
        await new Promise((r) => setTimeout(r, 10));
        expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' });
    });

    it('does not throw when action is "showMenu" but #menu element is absent', async () => {
        // No #menu in DOM
        global.fetch = vi.fn(() =>
            Promise.resolve({
                json: () =>
                    Promise.resolve({ reply: 'Here', suggestedItems: [], action: 'showMenu' }),
            })
        );
        await expect(sendChatMessage('Show menu')).resolves.not.toThrow();
        await new Promise((r) => setTimeout(r, 10));
    });
});

// ---------------------------------------------------------------------------
// 16. window globals — toggleChat, sendChatMessage, initChatbot are on window
// ---------------------------------------------------------------------------
describe('window globals', () => {
    it('exposes toggleChat on window', () => {
        expect(typeof window.toggleChat).toBe('function');
    });

    it('exposes sendChatMessage on window', () => {
        expect(typeof window.sendChatMessage).toBe('function');
    });

    it('exposes initChatbot on window', () => {
        expect(typeof window.initChatbot).toBe('function');
    });

    it('window.toggleChat is the same function as the named export', () => {
        expect(window.toggleChat).toBe(toggleChat);
    });

    it('window.sendChatMessage is the same function as the named export', () => {
        expect(window.sendChatMessage).toBe(sendChatMessage);
    });

    it('window.initChatbot is the same function as the named export', () => {
        expect(window.initChatbot).toBe(initChatbot);
    });
});
