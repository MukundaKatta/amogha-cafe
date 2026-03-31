// ===== VOICE ORDERING MODULE =====
// Hands-free voice-based menu browsing and ordering
// Uses Web Speech API for recognition and synthesis
// Inspired by: Alexa ordering, Google Duplex, drive-through AI

var isListening = false;
var recognition = null;
var synthesis = window.speechSynthesis;
var voiceEnabled = false;
var consecutiveRestarts = 0;

var VOICE_COMMANDS = {
    greetings: /^(hi|hello|hey|namaste|howdy)/i,
    menu: /^(show|open|view|see)\s+(the\s+)?menu/i,
    search: /^(search|find|look for|i want|show me)\s+(.+)/i,
    addToCart: /^(add|order|get|i('ll|\s+will)\s+(have|take|get))\s+(.+)/i,
    cart: /^(show|open|view|see|check)\s+(my\s+)?(cart|bag|order)/i,
    checkout: /^(checkout|pay|proceed|place\s+order|confirm)/i,
    help: /^(help|what can (you|i) (do|say)|commands)/i,
    repeat: /^(repeat|say\s+again|what)/i,
    cancel: /^(cancel|stop|never\s*mind|go\s+back)/i,
    specials: /^(what('s| are) (the\s+)?(special|today|deal|offer))/i,
    popular: /^(what('s| is) popular|best\s+seller|recommend)/i,
    veg: /^(show|only)\s+(veg|vegetarian)/i,
    nonveg: /^(show|only)\s+(non.?veg|non.?vegetarian|meat)/i
};

var lastResponse = '';

function supportsVoice() {
    return !!window.SpeechRecognition || !!window.webkitSpeechRecognition;
}

function initRecognition() {
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;

    recognition.onresult = function(event) {
        consecutiveRestarts = 0;
        var transcript = '';
        for (var i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }

        updateTranscript(transcript, event.results[event.results.length - 1].isFinal);

        if (event.results[event.results.length - 1].isFinal) {
            processVoiceCommand(transcript.trim());
        }
    };

    recognition.onend = function() {
        isListening = false;
        updateMicButton();
        // Auto-restart if voice mode is enabled
        if (voiceEnabled) {
            consecutiveRestarts++;
            if (consecutiveRestarts >= 5) {
                voiceEnabled = false;
                updateMicButton();
                return;
            }
            setTimeout(function() {
                if (voiceEnabled) startListening();
            }, 1000);
        }
    };

    recognition.onerror = function(e) {
        isListening = false;
        updateMicButton();
        if (e.error === 'not-allowed' || e.error === 'audio-capture' || e.error === 'service-not-allowed') {
            speak('Microphone access was denied. Please enable it in your browser settings.');
            voiceEnabled = false;
        }
    };

    return recognition;
}

function startListening() {
    if (!recognition) initRecognition();
    if (!recognition || isListening) return;

    try {
        recognition.start();
        isListening = true;
        updateMicButton();
    } catch(e) {
        // Already started
    }
}

function stopListening() {
    if (recognition && isListening) {
        recognition.stop();
        isListening = false;
        updateMicButton();
    }
}

function speak(text) {
    if (!synthesis) return;
    synthesis.cancel();
    lastResponse = text;

    var utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-IN';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;

    // Try to find a good Indian English voice
    var voices = synthesis.getVoices();
    var preferred = voices.find(function(v) { return v.lang === 'en-IN'; }) ||
                    voices.find(function(v) { return v.lang.startsWith('en'); });
    if (preferred) utterance.voice = preferred;

    synthesis.speak(utterance);
}

function processVoiceCommand(text) {
    var lower = text.toLowerCase().trim();

    // Greetings
    if (VOICE_COMMANDS.greetings.test(lower)) {
        speak('Namaste! Welcome to Amogha Cafe. You can say things like "show menu", "search biryani", or "what\'s the special today".');
        return;
    }

    // Help
    if (VOICE_COMMANDS.help.test(lower)) {
        speak('You can say: show menu, search for a dish, add items to cart, view cart, checkout, or ask about specials and popular items.');
        return;
    }

    // Show menu
    if (VOICE_COMMANDS.menu.test(lower)) {
        speak('Opening the menu for you.');
        var menuSection = document.getElementById('menu') || document.querySelector('.menu-section');
        if (menuSection) menuSection.scrollIntoView({ behavior: 'smooth' });
        return;
    }

    // Search
    var searchMatch = lower.match(VOICE_COMMANDS.search);
    if (searchMatch) {
        var query = searchMatch[searchMatch.length - 1];
        speak('Searching for ' + query);
        var searchInput = document.getElementById('menuSearch') || document.querySelector('.menu-search input');
        if (searchInput) {
            searchInput.value = query;
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            searchInput.scrollIntoView({ behavior: 'smooth' });
        }
        return;
    }

    // Add to cart
    var addMatch = lower.match(VOICE_COMMANDS.addToCart);
    if (addMatch) {
        var itemName = addMatch[addMatch.length - 1];
        var found = findMenuItem(itemName);
        if (found) {
            speak('Adding ' + found.name + ' to your cart.');
            if (typeof window.addToCart === 'function') {
                window.addToCart(found.id || found.name);
            }
        } else {
            speak('Sorry, I couldn\'t find ' + itemName + ' on the menu. Try saying it differently.');
        }
        return;
    }

    // View cart
    if (VOICE_COMMANDS.cart.test(lower)) {
        speak('Opening your cart.');
        if (typeof window.displayCart === 'function') {
            window.displayCart();
        }
        return;
    }

    // Checkout
    if (VOICE_COMMANDS.checkout.test(lower)) {
        speak('Proceeding to checkout.');
        var checkoutBtn = document.getElementById('checkoutBtn') || document.querySelector('.checkout-btn');
        if (checkoutBtn) checkoutBtn.click();
        return;
    }

    // Specials
    if (VOICE_COMMANDS.specials.test(lower)) {
        speak('Let me show you today\'s specials.');
        var specialsSection = document.getElementById('specials') || document.querySelector('.daily-special');
        if (specialsSection) specialsSection.scrollIntoView({ behavior: 'smooth' });
        return;
    }

    // Popular
    if (VOICE_COMMANDS.popular.test(lower)) {
        speak('Here are our most popular items. Our Hyderabadi Biryani is the top favorite!');
        return;
    }

    // Veg filter
    if (VOICE_COMMANDS.veg.test(lower)) {
        speak('Showing vegetarian items.');
        var vegBtn = document.querySelector('[data-filter="veg"], .veg-filter');
        if (vegBtn) vegBtn.click();
        return;
    }

    // Non-veg filter
    if (VOICE_COMMANDS.nonveg.test(lower)) {
        speak('Showing non-vegetarian items.');
        var nonvegBtn = document.querySelector('[data-filter="nonveg"], .nonveg-filter');
        if (nonvegBtn) nonvegBtn.click();
        return;
    }

    // Repeat
    if (VOICE_COMMANDS.repeat.test(lower)) {
        if (lastResponse) speak(lastResponse);
        else speak('I haven\'t said anything yet. How can I help you?');
        return;
    }

    // Cancel
    if (VOICE_COMMANDS.cancel.test(lower)) {
        speak('Okay, cancelled.');
        voiceEnabled = false;
        stopListening();
        hideVoiceOverlay();
        return;
    }

    // Unknown command
    speak('I heard: ' + text + '. Try saying "help" to see what I can do.');
}

function findMenuItem(name) {
    var menuCards = document.querySelectorAll('.menu-card, .menu-item');
    var bestMatch = null;
    var bestScore = 0;

    menuCards.forEach(function(card) {
        var cardName = (card.querySelector('.menu-item-name, .item-name, h3, h4') || {}).textContent || '';
        var score = similarity(name.toLowerCase(), cardName.toLowerCase());
        if (score > bestScore && score > 0.3) {
            bestScore = score;
            bestMatch = { name: cardName, id: card.dataset.id || card.dataset.itemId, element: card };
        }
    });

    return bestMatch;
}

function similarity(s1, s2) {
    // Simple word overlap similarity
    var words1 = s1.split(/\s+/);
    var words2 = s2.split(/\s+/);
    var matches = 0;
    words1.forEach(function(w) {
        if (words2.some(function(w2) { return w2.includes(w) || w.includes(w2); })) matches++;
    });
    return matches / Math.max(words1.length, 1);
}

function updateMicButton() {
    var btn = document.getElementById('voiceMicBtn');
    if (btn) {
        btn.classList.toggle('listening', isListening);
        btn.setAttribute('aria-label', isListening ? 'Stop listening' : 'Start voice ordering');
    }

    var indicator = document.getElementById('voiceIndicator');
    if (indicator) {
        indicator.classList.toggle('active', isListening);
    }
}

function updateTranscript(text, isFinal) {
    var display = document.getElementById('voiceTranscript');
    if (display) {
        display.textContent = text;
        display.classList.toggle('final', isFinal);
    }
}

function showVoiceOverlay() {
    var existing = document.getElementById('voiceOverlay');
    if (existing) { existing.classList.add('active'); return; }

    var overlay = document.createElement('div');
    overlay.id = 'voiceOverlay';
    overlay.className = 'voice-overlay active';
    overlay.innerHTML =
        '<div class="voice-overlay-content">' +
            '<div class="voice-indicator" id="voiceIndicator">' +
                '<div class="voice-ripple"></div>' +
                '<div class="voice-ripple"></div>' +
                '<div class="voice-ripple"></div>' +
                '<button class="voice-mic-main" id="voiceMicBtn" aria-label="Toggle listening">' +
                    '<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>' +
                '</button>' +
            '</div>' +
            '<div class="voice-transcript" id="voiceTranscript">Say something...</div>' +
            '<p class="voice-hint">Try: "Show menu" · "Search biryani" · "Add to cart"</p>' +
            '<button class="voice-close-btn" id="voiceCloseBtn">Close</button>' +
        '</div>';

    document.body.appendChild(overlay);

    document.getElementById('voiceMicBtn').addEventListener('click', function() {
        if (isListening) stopListening();
        else startListening();
    });

    document.getElementById('voiceCloseBtn').addEventListener('click', function() {
        voiceEnabled = false;
        stopListening();
        hideVoiceOverlay();
    });
}

function hideVoiceOverlay() {
    var overlay = document.getElementById('voiceOverlay');
    if (overlay) overlay.classList.remove('active');
}

export function initVoiceOrder() {
    if (!supportsVoice()) return;

    // Create floating voice button
    var fab = document.createElement('button');
    fab.id = 'voiceOrderFab';
    fab.className = 'voice-order-fab';
    fab.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>';
    fab.setAttribute('aria-label', 'Voice ordering');
    fab.setAttribute('title', 'Order by voice');

    fab.addEventListener('click', function() {
        voiceEnabled = !voiceEnabled;
        if (voiceEnabled) {
            showVoiceOverlay();
            startListening();
        } else {
            stopListening();
            hideVoiceOverlay();
        }
    });

    document.body.appendChild(fab);

    // Load voices
    if (synthesis) {
        synthesis.getVoices();
        synthesis.onvoiceschanged = function() { synthesis.getVoices(); };
    }
}
