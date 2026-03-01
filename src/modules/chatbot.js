// ===== AMOGHA CAFE — AI CHATBOT MODULE =====
import { getCurrentUser } from './auth.js';
import { cart } from './cart.js';

var chatHistory = [];
var chatOpen = false;

function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

export function initChatbot() {
    // Chat FAB button
    var fab = document.createElement('button');
    fab.id = 'ai-chat-fab';
    fab.className = 'ai-chat-fab';
    fab.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span class="ai-fab-badge">AI</span>';
    fab.title = 'AI Chat Assistant';
    fab.onclick = toggleChat;
    document.body.appendChild(fab);

    // Chat modal
    var modal = document.createElement('div');
    modal.id = 'ai-chat-modal';
    modal.className = 'ai-chat-modal';
    modal.innerHTML =
        '<div class="ai-chat-container">' +
            '<div class="ai-chat-header">' +
                '<div class="ai-chat-header-info">' +
                    '<span class="ai-chat-avatar">🤖</span>' +
                    '<div><strong>Amogha AI</strong><br><span class="ai-chat-status">Online</span></div>' +
                '</div>' +
                '<button class="ai-chat-close" onclick="toggleChat()">&times;</button>' +
            '</div>' +
            '<div class="ai-chat-messages" id="ai-chat-messages">' +
                '<div class="ai-msg bot"><p>Hi! I\'m Amogha AI assistant. I can help you find dishes, answer questions, or take your order. Try:</p>' +
                '<div class="ai-chat-suggestions">' +
                    '<button class="ai-suggest-btn" onclick="sendChatMessage(\'What\\\'s good for lunch?\')">Good for lunch?</button>' +
                    '<button class="ai-suggest-btn" onclick="sendChatMessage(\'Something spicy under 300\')">Spicy under &#8377;300</button>' +
                    '<button class="ai-suggest-btn" onclick="sendChatMessage(\'Veg options\')">Veg options</button>' +
                    '<button class="ai-suggest-btn" onclick="sendChatMessage(\'What are your hours?\')">Your hours?</button>' +
                '</div></div>' +
            '</div>' +
            '<div class="ai-chat-input-area">' +
                '<input type="text" id="ai-chat-input" placeholder="Ask me anything..." autocomplete="off">' +
                '<button id="ai-chat-send" onclick="sendChatMessage()"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button>' +
            '</div>' +
        '</div>';
    document.body.appendChild(modal);

    document.getElementById('ai-chat-input').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') sendChatMessage();
    });
}

export function toggleChat() {
    chatOpen = !chatOpen;
    var modal = document.getElementById('ai-chat-modal');
    var fab = document.getElementById('ai-chat-fab');
    if (chatOpen) {
        modal.classList.add('open');
        fab.classList.add('active');
        document.getElementById('ai-chat-input').focus();
    } else {
        modal.classList.remove('open');
        fab.classList.remove('active');
    }
}

export async function sendChatMessage(presetMsg) {
    var input = document.getElementById('ai-chat-input');
    var message = presetMsg || (input ? input.value.trim() : '');
    if (!message) return;
    if (input) input.value = '';

    var messagesEl = document.getElementById('ai-chat-messages');

    // User bubble
    var userBubble = document.createElement('div');
    userBubble.className = 'ai-msg user';
    userBubble.innerHTML = '<p>' + escapeHtml(message) + '</p>';
    messagesEl.appendChild(userBubble);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    chatHistory.push({ role: 'user', text: message });

    // Typing indicator
    var typing = document.createElement('div');
    typing.className = 'ai-msg bot ai-typing';
    typing.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
    messagesEl.appendChild(typing);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    try {
        var user = getCurrentUser();
        var resp = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                cart: cart.map(function(i) { return { name: i.name, qty: i.quantity, price: i.price }; }),
                preferences: user ? { name: user.name, isVeg: (user.dietaryPrefs || []).includes('Vegetarian') } : {},
                history: chatHistory.slice(-6)
            })
        });
        var data = await resp.json();
        typing.remove();

        var botBubble = document.createElement('div');
        botBubble.className = 'ai-msg bot';
        var html = '<p>' + (data.reply || 'Sorry, please try again.') + '</p>';

        // Show suggested items as add-to-cart buttons
        if (data.suggestedItems && data.suggestedItems.length > 0) {
            html += '<div class="ai-chat-items">';
            data.suggestedItems.forEach(function(item) {
                html += '<button class="ai-item-btn" onclick="addToCart(\'' +
                    item.name.replace(/'/g, "\\'") + '\', ' + item.price +
                    '); showAuthToast(\'Added ' + item.name.replace(/'/g, "\\'") + ' to cart\');">' +
                    escapeHtml(item.name) + ' — &#8377;' + item.price + ' <span class="ai-add">+</span></button>';
            });
            html += '</div>';
        }
        botBubble.innerHTML = html;
        messagesEl.appendChild(botBubble);
        messagesEl.scrollTop = messagesEl.scrollHeight;

        chatHistory.push({ role: 'assistant', text: data.reply });

        if (data.action === 'checkout' && typeof window.checkout === 'function') window.checkout();
        else if (data.action === 'showMenu') document.getElementById('menu').scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
        typing.remove();
        var errBubble = document.createElement('div');
        errBubble.className = 'ai-msg bot';
        errBubble.innerHTML = '<p>Sorry, I couldn\'t process that. Try again or call us at +91 91210 04999.</p>';
        messagesEl.appendChild(errBubble);
    }
}

Object.assign(window, { toggleChat, sendChatMessage, initChatbot });
