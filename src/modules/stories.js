// ===== STORIES / REELS MODULE =====
// Instagram-like stories for the cafe — daily specials, behind-the-scenes, UGC
// Inspired by: Instagram Stories, Swiggy Stories, Zomato Stories

import { getDb } from '../core/firebase.js';
import { sanitizeHtml } from '../core/utils.js';

var DEMO_STORIES = [
    {
        id: 'chef',
        author: 'Chef\'s Corner',
        avatar: '👨‍🍳',
        items: [
            { type: 'image', src: '/pics/gourmet-meal-with-grilled-meat-rice-generated-by-ai.jpg', caption: 'Today\'s special Hyderabadi Biryani — made with love!', duration: 5000 },
            { type: 'image', src: '/pics/Gemini_Generated_Image_umcuogumcuogumcu.png', caption: 'Fresh tandoori straight from the clay oven', duration: 5000 },
            { type: 'text', content: 'Ask your server about our secret masala blend!', bg: 'linear-gradient(135deg, #D4A017, #8B6914)', duration: 4000 }
        ]
    },
    {
        id: 'kitchen',
        author: 'Behind the Scenes',
        avatar: '🍳',
        items: [
            { type: 'image', src: '/pics/Gemini_Generated_Image_gax5k7gax5k7gax5.png', caption: 'Our kitchen runs on passion and fresh ingredients', duration: 5000 },
            { type: 'text', content: 'Did you know? We source spices directly from farms in Andhra Pradesh', bg: 'linear-gradient(135deg, #2c1810, #5a3825)', duration: 5000 }
        ]
    },
    {
        id: 'offers',
        author: 'Today\'s Offers',
        avatar: '🏷️',
        items: [
            { type: 'text', content: '20% OFF on all Biryanis today! Use code: BIRYANI20', bg: 'linear-gradient(135deg, #ff6b9d, #c44569)', duration: 5000 },
            { type: 'text', content: 'Free dessert with orders above ₹500!', bg: 'linear-gradient(135deg, #667eea, #764ba2)', duration: 4000 }
        ]
    },
    {
        id: 'reviews',
        author: 'Happy Customers',
        avatar: '⭐',
        items: [
            { type: 'text', content: '"Best biryani in Kukatpally!" — Ravi K. ⭐⭐⭐⭐⭐', bg: 'linear-gradient(135deg, #f7971e, #ffd200)', duration: 5000 },
            { type: 'text', content: '"My family\'s favorite weekend spot" — Priya M. ⭐⭐⭐⭐⭐', bg: 'linear-gradient(135deg, #56ab2f, #a8e063)', duration: 5000 }
        ]
    },
    {
        id: 'newmenu',
        author: 'New on Menu',
        avatar: '🆕',
        items: [
            { type: 'image', src: '/pics/Gemini_Generated_Image_h1vezgh1vezgh1ve.png', caption: 'Introducing: Double Ka Meetha — a Hyderabadi classic!', duration: 5000 },
            { type: 'text', content: 'Try our new Mango Lassi — perfect for summer!', bg: 'linear-gradient(135deg, #f9d423, #ff4e50)', duration: 4000 }
        ]
    }
];

var currentStoryGroup = 0;
var currentStoryItem = 0;
var storyTimer = null;
var storiesFetched = false;
var allStories = DEMO_STORIES;

function fetchStories() {
    var db = getDb();
    if (storiesFetched || !db) return Promise.resolve(allStories);
    return db.collection('stories')
        .where('active', '==', true)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get()
        .then(function(snap) {
            if (!snap.empty) {
                var dbStories = [];
                snap.forEach(function(doc) {
                    dbStories.push(Object.assign({ id: doc.id }, doc.data()));
                });
                if (dbStories.length > 0) allStories = dbStories;
            }
            storiesFetched = true;
            return allStories;
        })
        .catch(function() {
            storiesFetched = true;
            return allStories;
        });
}

function renderStoriesCarousel() {
    var container = document.getElementById('storiesCarousel');
    if (!container) return;

    container.innerHTML =
        '<div class="stories-scroll">' +
            allStories.map(function(story, idx) {
                var viewed = localStorage.getItem('amogha_story_viewed_' + story.id);
                return '<button class="story-bubble ' + (viewed ? 'viewed' : '') + '" data-story="' + idx + '" aria-label="View ' + sanitizeHtml(story.author) + ' story">' +
                    '<div class="story-avatar-ring">' +
                        '<div class="story-avatar">' + sanitizeHtml(story.avatar) + '</div>' +
                    '</div>' +
                    '<span class="story-author">' + sanitizeHtml(story.author) + '</span>' +
                '</button>';
            }).join('') +
        '</div>';

    container.querySelectorAll('.story-bubble').forEach(function(btn) {
        btn.addEventListener('click', function() {
            openStoryViewer(parseInt(btn.dataset.story));
        });
    });
}

function openStoryViewer(groupIndex) {
    currentStoryGroup = groupIndex;
    currentStoryItem = 0;

    var existing = document.getElementById('storyViewer');
    if (existing) existing.remove();

    var viewer = document.createElement('div');
    viewer.id = 'storyViewer';
    viewer.className = 'story-viewer';
    viewer.setAttribute('role', 'dialog');
    viewer.setAttribute('aria-label', 'Story viewer');
    viewer.innerHTML =
        '<div class="story-progress-bar" id="storyProgressBar"></div>' +
        '<div class="story-header">' +
            '<div class="story-header-info">' +
                '<span class="story-header-avatar" id="storyAvatar"></span>' +
                '<span class="story-header-name" id="storyAuthor"></span>' +
            '</div>' +
            '<button class="story-close" aria-label="Close story">&times;</button>' +
        '</div>' +
        '<div class="story-content" id="storyContent"></div>' +
        '<div class="story-nav">' +
            '<button class="story-nav-prev" aria-label="Previous story"></button>' +
            '<button class="story-nav-next" aria-label="Next story"></button>' +
        '</div>';

    document.body.appendChild(viewer);
    document.body.style.overflow = 'hidden';

    // Show current story
    showStoryItem();

    // Navigation
    viewer.querySelector('.story-close').addEventListener('click', closeStoryViewer);
    viewer.querySelector('.story-nav-prev').addEventListener('click', function() {
        if (currentStoryItem > 0) {
            currentStoryItem--;
            showStoryItem();
        } else if (currentStoryGroup > 0) {
            currentStoryGroup--;
            currentStoryItem = allStories[currentStoryGroup].items.length - 1;
            showStoryItem();
        }
    });
    viewer.querySelector('.story-nav-next').addEventListener('click', advanceStory);

    // Keyboard nav
    function handleKey(e) {
        if (e.key === 'Escape') closeStoryViewer();
        if (e.key === 'ArrowRight' || e.key === ' ') advanceStory();
        if (e.key === 'ArrowLeft') {
            if (currentStoryItem > 0) { currentStoryItem--; showStoryItem(); }
        }
    }
    document.addEventListener('keydown', handleKey);
    viewer._keyHandler = handleKey;

    // Touch swipe
    var touchStartX = 0;
    viewer.addEventListener('touchstart', function(e) { touchStartX = e.touches[0].clientX; }, { passive: true });
    viewer.addEventListener('touchend', function(e) {
        var diff = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(diff) > 50) {
            if (diff < 0) advanceStory();
            else if (currentStoryItem > 0) { currentStoryItem--; showStoryItem(); }
        }
    });
}

function showStoryItem() {
    var story = allStories[currentStoryGroup];
    if (!story) { closeStoryViewer(); return; }

    var item = story.items[currentStoryItem];
    if (!item) { advanceStory(); return; }

    // Update header
    var avatar = document.getElementById('storyAvatar');
    var author = document.getElementById('storyAuthor');
    if (avatar) avatar.textContent = story.avatar;
    if (author) author.textContent = story.author;

    // Update progress bar
    var progressBar = document.getElementById('storyProgressBar');
    if (progressBar) {
        progressBar.innerHTML = story.items.map(function(_, i) {
            var cls = i < currentStoryItem ? 'filled' : (i === currentStoryItem ? 'active' : '');
            return '<div class="story-progress-segment ' + cls + '"><div class="story-progress-fill"></div></div>';
        }).join('');
    }

    // Update content
    var content = document.getElementById('storyContent');
    if (!content) return;

    if (item.type === 'image') {
        content.innerHTML =
            '<div class="story-image-container">' +
                '<img src="' + sanitizeHtml(item.src) + '" alt="' + sanitizeHtml(item.caption || 'Story image') + '" class="story-image" loading="eager">' +
                (item.caption ? '<div class="story-caption">' + sanitizeHtml(item.caption) + '</div>' : '') +
            '</div>';
    } else if (item.type === 'text') {
        content.innerHTML =
            '<div class="story-text-container" style="background:' + sanitizeHtml(item.bg || '#2c1810') + '">' +
                '<p class="story-text-content">' + sanitizeHtml(item.content) + '</p>' +
            '</div>';
    }

    // Mark as viewed
    localStorage.setItem('amogha_story_viewed_' + story.id, '1');
    var bubble = document.querySelector('.story-bubble[data-story="' + currentStoryGroup + '"]');
    if (bubble) bubble.classList.add('viewed');

    // Auto-advance timer
    clearTimeout(storyTimer);
    storyTimer = setTimeout(advanceStory, item.duration || 5000);
}

function advanceStory() {
    var story = allStories[currentStoryGroup];
    if (!story) { closeStoryViewer(); return; }

    if (currentStoryItem < story.items.length - 1) {
        currentStoryItem++;
        showStoryItem();
    } else if (currentStoryGroup < allStories.length - 1) {
        currentStoryGroup++;
        currentStoryItem = 0;
        showStoryItem();
    } else {
        closeStoryViewer();
    }
}

function closeStoryViewer() {
    clearTimeout(storyTimer);
    var viewer = document.getElementById('storyViewer');
    if (viewer) {
        if (viewer._keyHandler) document.removeEventListener('keydown', viewer._keyHandler);
        viewer.remove();
    }
    document.body.style.overflow = '';
}

export function initStories() {
    // Create stories carousel container
    var heroSection = document.querySelector('.hero') || document.querySelector('header');
    if (!heroSection) return;

    var carousel = document.createElement('div');
    carousel.id = 'storiesCarousel';
    carousel.className = 'stories-carousel';
    carousel.setAttribute('aria-label', 'Stories');

    // Insert after hero section
    heroSection.parentNode.insertBefore(carousel, heroSection.nextSibling);

    // Fetch and render stories
    fetchStories().then(function() {
        renderStoriesCarousel();
    });
}
