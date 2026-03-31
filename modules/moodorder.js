// ===== MOOD-BASED ORDERING MODULE =====
// Order food based on your mood or occasion
// AI-curated suggestions based on how you feel
// Inspired by: Spotify mood playlists, Netflix categories, Zomato occasions

var MOODS = [
    {
        id: 'comfort',
        emoji: '🤗',
        label: 'Comfort Food',
        description: 'Warm, hearty, and soul-soothing',
        color: '#FF8C00',
        keywords: ['biryani', 'dal', 'paneer', 'butter', 'cream', 'cheese', 'rich', 'ghee', 'gravy'],
        suggestions: ['Hyderabadi Biryani', 'Dal Makhani', 'Butter Chicken', 'Paneer Butter Masala']
    },
    {
        id: 'healthy',
        emoji: '🥗',
        label: 'Light & Healthy',
        description: 'Fresh, nutritious, and guilt-free',
        color: '#4CAF50',
        keywords: ['salad', 'soup', 'grilled', 'tandoori', 'raita', 'steamed', 'low', 'light'],
        suggestions: ['Tandoori Chicken', 'Mixed Veg Soup', 'Grilled Fish', 'Fresh Salad']
    },
    {
        id: 'spicy',
        emoji: '🌶️',
        label: 'Spicy & Bold',
        description: 'Fire up your taste buds!',
        color: '#F44336',
        keywords: ['spicy', 'chilli', 'hot', 'pepper', 'masala', 'andhra', 'mirchi', 'vindaloo'],
        suggestions: ['Andhra Chicken Curry', 'Mirchi Bajji', 'Chilli Paneer', 'Pepper Chicken']
    },
    {
        id: 'celebration',
        emoji: '🎉',
        label: 'Celebration',
        description: 'Special dishes for special moments',
        color: '#9C27B0',
        keywords: ['special', 'premium', 'combo', 'thali', 'biryani', 'dessert', 'feast'],
        suggestions: ['Amogha Special Thali', 'Family Biryani', 'Combo Meal', 'Double Ka Meetha']
    },
    {
        id: 'quickbite',
        emoji: '⚡',
        label: 'Quick Bite',
        description: 'Fast, tasty, on-the-go',
        color: '#2196F3',
        keywords: ['starter', 'snack', 'quick', 'fry', 'roll', 'wrap', 'samosa', 'vada'],
        suggestions: ['Samosa', 'Vada Pav', 'Spring Roll', 'Chicken 65']
    },
    {
        id: 'sweet',
        emoji: '🍰',
        label: 'Sweet Tooth',
        description: 'Indulge in desserts & sweets',
        color: '#E91E63',
        keywords: ['sweet', 'dessert', 'ice cream', 'halwa', 'gulab', 'kheer', 'payasam'],
        suggestions: ['Gulab Jamun', 'Double Ka Meetha', 'Ice Cream', 'Kheer']
    },
    {
        id: 'date',
        emoji: '💕',
        label: 'Date Night',
        description: 'Romantic dinner selections',
        color: '#E91E63',
        keywords: ['special', 'premium', 'paneer', 'biryani', 'dessert', 'mocktail', 'kebab'],
        suggestions: ['Paneer Tikka', 'Mutton Biryani', 'Kebab Platter', 'Rose Lassi']
    },
    {
        id: 'family',
        emoji: '👨‍👩‍👧‍👦',
        label: 'Family Feast',
        description: 'Large portions to share with loved ones',
        color: '#795548',
        keywords: ['family', 'combo', 'thali', 'biryani', 'large', 'sharing', 'platter'],
        suggestions: ['Family Pack Biryani', 'Veg Thali', 'Non-Veg Thali', 'Mixed Platter']
    }
];

function findMatchingItems(mood) {
    var menuCards = document.querySelectorAll('.menu-card, .menu-item');
    var matches = [];

    menuCards.forEach(function(card) {
        var name = (card.querySelector('.menu-item-name, .item-name, h3, h4') || {}).textContent || '';
        var desc = (card.querySelector('.menu-item-desc, .item-desc, p') || {}).textContent || '';
        var combined = (name + ' ' + desc).toLowerCase();

        var score = 0;
        mood.keywords.forEach(function(kw) {
            if (combined.includes(kw)) score++;
        });

        if (score > 0) {
            matches.push({
                element: card,
                name: name,
                score: score,
                id: card.dataset.id || card.dataset.itemId
            });
        }
    });

    matches.sort(function(a, b) { return b.score - a.score; });
    return matches.slice(0, 8);
}

function showMoodResults(mood) {
    var matches = findMatchingItems(mood);

    var overlay = document.createElement('div');
    overlay.className = 'mood-results-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', mood.label + ' recommendations');

    overlay.innerHTML =
        '<div class="mood-results-content">' +
            '<button class="modal-close" aria-label="Close">&times;</button>' +
            '<div class="mood-results-header" style="background:' + mood.color + '">' +
                '<span class="mood-results-emoji">' + mood.emoji + '</span>' +
                '<h2>' + mood.label + '</h2>' +
                '<p>' + mood.description + '</p>' +
            '</div>' +
            '<div class="mood-results-list">' +
                (matches.length > 0 ?
                    matches.map(function(m) {
                        return '<div class="mood-result-item" data-id="' + (m.id || '') + '">' +
                            '<span class="mood-result-name">' + escapeHtml(m.name) + '</span>' +
                            '<button class="mood-add-btn" data-item="' + escapeHtml(m.id || m.name) + '">+ Add</button>' +
                        '</div>';
                    }).join('')
                :
                    '<div class="mood-no-results">' +
                        '<p>Our chef recommends these for ' + mood.label.toLowerCase() + ':</p>' +
                        mood.suggestions.map(function(s) {
                            return '<div class="mood-suggestion">' + s + '</div>';
                        }).join('') +
                    '</div>'
                ) +
            '</div>' +
        '</div>';

    document.body.appendChild(overlay);
    requestAnimationFrame(function() { overlay.classList.add('active'); });

    // Close
    overlay.querySelector('.modal-close').addEventListener('click', function() {
        overlay.classList.remove('active');
        setTimeout(function() { overlay.remove(); }, 300);
    });
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            overlay.classList.remove('active');
            setTimeout(function() { overlay.remove(); }, 300);
        }
    });

    // Add to cart buttons
    overlay.querySelectorAll('.mood-add-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var itemId = btn.dataset.item;
            if (typeof window.addToCart === 'function') {
                window.addToCart(itemId);
            }
            btn.textContent = '✓ Added';
            btn.disabled = true;
            if (typeof window.showToast === 'function') {
                window.showToast('Added to cart!');
            }
        });
    });

    // Scroll matching items into view if user closes overlay
    if (matches.length > 0) {
        highlightMenuItems(matches);
    }
}

function highlightMenuItems(matches) {
    // Briefly highlight matching items in the menu
    matches.forEach(function(m) {
        if (m.element) {
            m.element.classList.add('mood-highlight');
            setTimeout(function() { m.element.classList.remove('mood-highlight'); }, 5000);
        }
    });
}

function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}

function renderMoodSelector() {
    var section = document.createElement('div');
    section.id = 'moodOrderSection';
    section.className = 'mood-order-section';
    section.innerHTML =
        '<div class="section-header">' +
            '<h2 class="mood-title">How are you feeling?</h2>' +
            '<p class="mood-subtitle">Let your mood guide your meal</p>' +
        '</div>' +
        '<div class="mood-grid">' +
            MOODS.map(function(m) {
                return '<button class="mood-card" data-mood="' + m.id + '" style="--mood-color:' + m.color + '">' +
                    '<span class="mood-emoji">' + m.emoji + '</span>' +
                    '<span class="mood-label">' + m.label + '</span>' +
                    '<span class="mood-desc">' + m.description + '</span>' +
                '</button>';
            }).join('') +
        '</div>';

    // Insert before menu
    var menuSection = document.getElementById('menu') || document.querySelector('.menu-section');
    if (menuSection) {
        menuSection.parentNode.insertBefore(section, menuSection);
    }

    // Click handlers
    section.querySelectorAll('.mood-card').forEach(function(card) {
        card.addEventListener('click', function() {
            var moodId = card.dataset.mood;
            var mood = MOODS.find(function(m) { return m.id === moodId; });
            if (mood) showMoodResults(mood);
        });
    });
}

export function initMoodOrder() {
    renderMoodSelector();
}
