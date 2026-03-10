import { getCurrentUser, setCurrentUser, showAuthToast } from './auth.js';
import { getDb } from '../core/firebase.js';

// ===== SPIN-THE-WHEEL REWARDS GAME (KFC Rewards Arcade style) =====

var WHEEL_SEGMENTS = [
    { label: '+10 pts', value: 10, color: '#D4A017', type: 'points' },
    { label: 'Free Chai', value: 0, color: '#8B4513', type: 'freeitem', item: 'Masala Chai' },
    { label: '+25 pts', value: 25, color: '#2c1810', type: 'points' },
    { label: '5% Off', value: 5, color: '#B8860B', type: 'discount' },
    { label: '+50 pts', value: 50, color: '#654321', type: 'points' },
    { label: 'Try Again', value: 0, color: '#3c2815', type: 'none' },
    { label: '+15 pts', value: 15, color: '#DAA520', type: 'points' },
    { label: '10% Off', value: 10, color: '#704214', type: 'discount' }
];

var isSpinning = false;

export function openSpinWheel() {
    var user = getCurrentUser();
    if (!user) {
        if (typeof window.openAuthModal === 'function') window.openAuthModal();
        return;
    }
    // Check if user has spins available (1 free spin per order)
    var spinsAvailable = user.spinsAvailable || 0;
    if (spinsAvailable <= 0) {
        showAuthToast('No spins available! Place an order to earn a spin.');
        return;
    }
    var overlay = document.getElementById('spin-wheel-overlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    renderWheel();
}

export function closeSpinWheel() {
    var overlay = document.getElementById('spin-wheel-overlay');
    if (overlay) overlay.style.display = 'none';
}

function renderWheel() {
    var canvas = document.getElementById('spin-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var size = Math.min(300, window.innerWidth - 60);
    canvas.width = size;
    canvas.height = size;
    var cx = size / 2, cy = size / 2, r = size / 2 - 10;
    var segAngle = (2 * Math.PI) / WHEEL_SEGMENTS.length;

    WHEEL_SEGMENTS.forEach(function(seg, i) {
        var startAngle = i * segAngle;
        var endAngle = (i + 1) * segAngle;
        // Draw segment
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = seg.color;
        ctx.fill();
        ctx.strokeStyle = '#D4A017';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Draw text
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(startAngle + segAngle / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#fff';
        ctx.font = 'bold ' + Math.round(size / 22) + 'px sans-serif';
        ctx.fillText(seg.label, r - 15, 5);
        ctx.restore();
    });

    // Center circle
    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, 2 * Math.PI);
    ctx.fillStyle = '#D4A017';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Update spins count
    var user = getCurrentUser();
    var spinsEl = document.getElementById('spins-available');
    if (spinsEl && user) {
        spinsEl.textContent = (user.spinsAvailable || 0) + ' spin' + ((user.spinsAvailable || 0) !== 1 ? 's' : '') + ' available';
    }
}

export function spinTheWheel() {
    if (isSpinning) return;
    var user = getCurrentUser();
    if (!user || (user.spinsAvailable || 0) <= 0) {
        showAuthToast('No spins available!');
        return;
    }

    isSpinning = true;
    user.spinsAvailable = (user.spinsAvailable || 0) - 1;
    setCurrentUser(user);

    // Pick random result (weighted toward smaller rewards)
    var resultIdx = Math.floor(Math.random() * WHEEL_SEGMENTS.length);
    var result = WHEEL_SEGMENTS[resultIdx];

    // Calculate rotation
    var segAngle = 360 / WHEEL_SEGMENTS.length;
    var targetAngle = 360 - (resultIdx * segAngle + segAngle / 2);
    var totalRotation = 360 * 5 + targetAngle; // 5 full spins + landing

    var canvas = document.getElementById('spin-canvas');
    if (canvas) {
        canvas.style.transition = 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
        canvas.style.transform = 'rotate(' + totalRotation + 'deg)';
    }

    setTimeout(function() {
        isSpinning = false;
        if (canvas) {
            canvas.style.transition = 'none';
            canvas.style.transform = 'rotate(' + (totalRotation % 360) + 'deg)';
        }
        // Award the prize
        awardSpinPrize(result);
        renderWheel(); // Update spins count
    }, 4200);
}

function awardSpinPrize(result) {
    var user = getCurrentUser();
    if (!user) return;

    var message = '';
    if (result.type === 'points') {
        user.loyaltyPoints = (user.loyaltyPoints || 0) + result.value;
        setCurrentUser(user);
        message = 'You won +' + result.value + ' loyalty points!';
        if (typeof window.updateLoyaltyWidget === 'function') window.updateLoyaltyWidget();
    } else if (result.type === 'discount') {
        // Store discount for next order
        var discounts = user.pendingDiscounts || [];
        discounts.push({ percent: result.value, expires: Date.now() + 7 * 24 * 3600 * 1000 });
        user.pendingDiscounts = discounts;
        setCurrentUser(user);
        message = 'You won ' + result.value + '% off your next order!';
    } else if (result.type === 'freeitem') {
        var freeItems = user.freeItems || [];
        freeItems.push({ item: result.item, expires: Date.now() + 7 * 24 * 3600 * 1000 });
        user.freeItems = freeItems;
        setCurrentUser(user);
        message = 'You won a free ' + result.item + '!';
    } else {
        message = 'Better luck next time! Try again after your next order.';
    }

    // Show result modal
    var resultEl = document.getElementById('spin-result');
    if (resultEl) {
        resultEl.innerHTML = '<div class="spin-result-card">' +
            '<div class="spin-result-icon">' + (result.type !== 'none' ? '🎉' : '😅') + '</div>' +
            '<div class="spin-result-text">' + message + '</div>' +
            '<button class="spin-result-btn" onclick="document.getElementById(\'spin-result\').style.display=\'none\'">' +
            (result.type !== 'none' ? 'Awesome!' : 'Try Again Later') + '</button>' +
        '</div>';
        resultEl.style.display = 'flex';
    }

    if (result.type !== 'none' && typeof window.launchConfetti === 'function') {
        window.launchConfetti();
    }

    // Persist to Firestore
    var db = getDb();
    if (db && user.phone) {
        db.collection('users').doc(user.phone).update({
            loyaltyPoints: user.loyaltyPoints || 0,
            spinsAvailable: user.spinsAvailable || 0,
            pendingDiscounts: user.pendingDiscounts || [],
            freeItems: user.freeItems || []
        }).catch(function(e) { console.error('Spin prize save error:', e); });
    }
}

export function awardSpin() {
    var user = getCurrentUser();
    if (!user) return;
    user.spinsAvailable = (user.spinsAvailable || 0) + 1;
    setCurrentUser(user);
    showAuthToast('You earned a spin! Try the Rewards Wheel!');
}

export function initSpinWheel() {
    // Expose for order completion hook
}

Object.assign(window, { openSpinWheel, closeSpinWheel, spinTheWheel, awardSpin });
