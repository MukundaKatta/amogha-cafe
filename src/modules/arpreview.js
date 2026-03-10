// ===== AR MENU PREVIEW MODULE =====
// Augmented Reality food preview using WebXR / camera overlay
// Lets users see how dishes look on their table before ordering
// Inspired by: IKEA Place, Amazon AR View, Snapchat food filters

var AR_ITEMS = {
    'biryani': { model: '/assets/models/biryani.glb', scale: 0.3, name: 'Hyderabadi Biryani' },
    'tandoori': { model: '/assets/models/tandoori.glb', scale: 0.25, name: 'Tandoori Chicken' },
    'dosa': { model: '/assets/models/dosa.glb', scale: 0.35, name: 'Masala Dosa' },
    'thali': { model: '/assets/models/thali.glb', scale: 0.4, name: 'Amogha Special Thali' }
};

var isARActive = false;
var videoStream = null;

function supportsAR() {
    // Check for WebXR or basic camera access
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

function createARButton(itemId, itemName) {
    if (!supportsAR()) return null;

    var btn = document.createElement('button');
    btn.className = 'ar-preview-btn';
    btn.innerHTML = '<span class="ar-icon">📱</span> AR Preview';
    btn.setAttribute('aria-label', 'View ' + itemName + ' in AR');
    btn.setAttribute('title', 'See how this looks on your table');

    btn.addEventListener('click', function(e) {
        e.stopPropagation();
        openARPreview(itemId, itemName);
    });

    return btn;
}

function openARPreview(itemId, itemName) {
    if (isARActive) return;
    isARActive = true;

    var overlay = document.createElement('div');
    overlay.id = 'arOverlay';
    overlay.className = 'ar-overlay';
    overlay.innerHTML =
        '<div class="ar-header">' +
            '<span class="ar-title">AR Preview: ' + (itemName || 'Food Item') + '</span>' +
            '<button class="ar-close" aria-label="Close AR preview">&times;</button>' +
        '</div>' +
        '<div class="ar-camera-container">' +
            '<video id="arVideo" autoplay playsinline muted></video>' +
            '<canvas id="arCanvas"></canvas>' +
            '<div class="ar-food-overlay" id="arFoodOverlay">' +
                '<img src="/pics/' + (itemId || 'biryani') + '.jpg" alt="' + (itemName || 'Food') + '" class="ar-food-image" id="arFoodImage">' +
            '</div>' +
            '<div class="ar-instructions">Move your phone over a flat surface. Pinch to resize.</div>' +
        '</div>' +
        '<div class="ar-controls">' +
            '<button class="ar-ctrl-btn" id="arCapture" aria-label="Take photo">📸 Capture</button>' +
            '<button class="ar-ctrl-btn" id="arAddToCart" aria-label="Add to cart">🛒 Add to Cart</button>' +
        '</div>';

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    // Start camera
    navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
    }).then(function(stream) {
        videoStream = stream;
        var video = document.getElementById('arVideo');
        if (video) {
            video.srcObject = stream;
            video.play();
        }
    }).catch(function() {
        // Fallback: show item image without camera
        var container = overlay.querySelector('.ar-camera-container');
        if (container) {
            container.innerHTML =
                '<div class="ar-fallback">' +
                    '<img src="/pics/' + (itemId || 'biryani') + '.jpg" alt="' + (itemName || 'Food') + '" class="ar-fallback-image">' +
                    '<p>Camera access not available. Here\'s how your dish looks!</p>' +
                '</div>';
        }
    });

    // Make food overlay draggable and resizable
    var foodOverlay = document.getElementById('arFoodOverlay');
    if (foodOverlay) {
        makeDraggable(foodOverlay);
        makePinchResizable(foodOverlay);
    }

    // Close handler
    overlay.querySelector('.ar-close').addEventListener('click', closeAR);

    // Capture photo
    var captureBtn = document.getElementById('arCapture');
    if (captureBtn) {
        captureBtn.addEventListener('click', function() {
            captureARPhoto();
        });
    }

    // Add to cart
    var addBtn = document.getElementById('arAddToCart');
    if (addBtn) {
        addBtn.addEventListener('click', function() {
            closeAR();
            // Trigger add to cart for the item
            if (typeof window.addToCart === 'function') {
                window.addToCart(itemId);
            }
            if (typeof window.showToast === 'function') {
                window.showToast(itemName + ' added to cart!');
            }
        });
    }
}

function closeAR() {
    isARActive = false;
    if (videoStream) {
        videoStream.getTracks().forEach(function(track) { track.stop(); });
        videoStream = null;
    }
    var overlay = document.getElementById('arOverlay');
    if (overlay) overlay.remove();
    document.body.style.overflow = '';
}

function makeDraggable(el) {
    var startX = 0, startY = 0, offsetX = 0, offsetY = 0;
    var isDragging = false;

    el.addEventListener('touchstart', function(e) {
        if (e.touches.length === 1) {
            isDragging = true;
            startX = e.touches[0].clientX - offsetX;
            startY = e.touches[0].clientY - offsetY;
        }
    }, { passive: true });

    el.addEventListener('touchmove', function(e) {
        if (isDragging && e.touches.length === 1) {
            offsetX = e.touches[0].clientX - startX;
            offsetY = e.touches[0].clientY - startY;
            el.style.transform = 'translate(' + offsetX + 'px,' + offsetY + 'px) scale(' + (el._scale || 1) + ')';
        }
    }, { passive: true });

    el.addEventListener('touchend', function() { isDragging = false; });

    // Mouse support
    el.addEventListener('mousedown', function(e) {
        isDragging = true;
        startX = e.clientX - offsetX;
        startY = e.clientY - offsetY;
        e.preventDefault();
    });

    document.addEventListener('mousemove', function(e) {
        if (isDragging) {
            offsetX = e.clientX - startX;
            offsetY = e.clientY - startY;
            el.style.transform = 'translate(' + offsetX + 'px,' + offsetY + 'px) scale(' + (el._scale || 1) + ')';
        }
    });

    document.addEventListener('mouseup', function() { isDragging = false; });
}

function makePinchResizable(el) {
    var initialDistance = 0;
    el._scale = 1;

    el.addEventListener('touchstart', function(e) {
        if (e.touches.length === 2) {
            initialDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
        }
    }, { passive: true });

    el.addEventListener('touchmove', function(e) {
        if (e.touches.length === 2 && initialDistance > 0) {
            var currentDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            var scaleFactor = currentDistance / initialDistance;
            el._scale = Math.max(0.3, Math.min(3, el._scale * scaleFactor));
            initialDistance = currentDistance;
            el.style.transform = 'scale(' + el._scale + ')';
        }
    }, { passive: true });
}

function captureARPhoto() {
    var video = document.getElementById('arVideo');
    var canvas = document.getElementById('arCanvas');
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    // Draw food overlay
    var foodImg = document.getElementById('arFoodImage');
    if (foodImg) {
        var foodOverlay = document.getElementById('arFoodOverlay');
        var rect = foodOverlay ? foodOverlay.getBoundingClientRect() : { left: 100, top: 200, width: 200, height: 200 };
        ctx.drawImage(foodImg, rect.left, rect.top, rect.width, rect.height);
    }

    // Convert to shareable image
    canvas.toBlob(function(blob) {
        if (!blob) return;
        var url = URL.createObjectURL(blob);

        if (navigator.share) {
            var file = new File([blob], 'amogha-ar-preview.jpg', { type: 'image/jpeg' });
            navigator.share({
                title: 'Check out this dish from Amogha Cafe!',
                files: [file]
            }).catch(function() {
                downloadImage(url);
            });
        } else {
            downloadImage(url);
        }
    }, 'image/jpeg', 0.9);
}

function downloadImage(url) {
    var a = document.createElement('a');
    a.href = url;
    a.download = 'amogha-ar-preview.jpg';
    a.click();
    if (typeof window.showToast === 'function') {
        window.showToast('Photo saved!');
    }
}

export function initARPreview() {
    if (!supportsAR()) return;

    // Add AR buttons to menu items
    addARButtonsToMenu();

    // Re-add after menu updates
    var observer = new MutationObserver(function() {
        addARButtonsToMenu();
    });

    var menuGrid = document.getElementById('menuGrid') || document.querySelector('.menu-grid');
    if (menuGrid) {
        observer.observe(menuGrid, { childList: true, subtree: true });
    }
}

function addARButtonsToMenu() {
    var menuCards = document.querySelectorAll('.menu-card, .menu-item');
    menuCards.forEach(function(card) {
        if (card.querySelector('.ar-preview-btn')) return; // Already has button

        var itemName = (card.querySelector('.menu-item-name, .item-name, h3, h4') || {}).textContent || '';
        var itemId = card.dataset.id || card.dataset.itemId || itemName.toLowerCase().replace(/\s+/g, '-');

        var btn = createARButton(itemId, itemName);
        if (btn) {
            var actions = card.querySelector('.menu-item-actions, .card-actions') || card;
            actions.appendChild(btn);
        }
    });
}
