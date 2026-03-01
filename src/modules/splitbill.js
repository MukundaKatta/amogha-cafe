import { getDb } from '../core/firebase.js';
import { getCurrentUser } from './auth.js';
import { lockScroll, unlockScroll } from '../core/utils.js';

// ===== SPLIT BILL =====
// Post-checkout feature to split the order total among multiple people.
// Generates UPI payment links for each person's share.

export function openSplitBill(orderId, total) {
    var existing = document.getElementById('split-bill-modal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'split-bill-modal';
    modal.className = 'modal';
    modal.style.display = 'block';
    lockScroll();

    modal.innerHTML = '<div class="modal-content" style="max-width:420px;padding:1.5rem">' +
        '<span class="close-modal" onclick="closeSplitBill()">&times;</span>' +
        '<h2 style="color:#D4A017;margin-bottom:1rem">Split Bill</h2>' +
        '<p style="margin-bottom:0.5rem">Order Total: <strong style="color:#D4A017">Rs.' + total + '</strong></p>' +
        '<div style="margin-bottom:1rem">' +
            '<label style="font-size:0.85rem;color:#a09080">Split between how many people?</label>' +
            '<div style="display:flex;gap:0.5rem;margin-top:0.5rem">' +
                '<button class="split-num-btn" onclick="setSplitCount(2)" style="flex:1;padding:0.5rem;border-radius:8px;border:1px solid rgba(212,160,23,0.2);background:rgba(212,160,23,0.1);color:#D4A017;font-weight:700;cursor:pointer">2</button>' +
                '<button class="split-num-btn" onclick="setSplitCount(3)" style="flex:1;padding:0.5rem;border-radius:8px;border:1px solid rgba(212,160,23,0.2);background:rgba(212,160,23,0.1);color:#D4A017;font-weight:700;cursor:pointer">3</button>' +
                '<button class="split-num-btn" onclick="setSplitCount(4)" style="flex:1;padding:0.5rem;border-radius:8px;border:1px solid rgba(212,160,23,0.2);background:rgba(212,160,23,0.1);color:#D4A017;font-weight:700;cursor:pointer">4</button>' +
                '<input type="number" id="split-custom-count" min="2" max="10" placeholder="Custom" style="width:70px;padding:0.5rem;border-radius:8px;border:1px solid rgba(212,160,23,0.2);background:rgba(0,0,0,0.2);color:#e8d5b5;text-align:center" onchange="setSplitCount(parseInt(this.value))">' +
            '</div>' +
        '</div>' +
        '<div id="split-result" style="margin-bottom:1rem"></div>' +
        '<div id="split-links" style="margin-bottom:1rem"></div>' +
        '</div>';

    modal.dataset.orderId = orderId;
    modal.dataset.total = total;
    document.body.appendChild(modal);
    modal.addEventListener('click', function(e) {
        if (e.target === modal) closeSplitBill();
    });
}

export function closeSplitBill() {
    var modal = document.getElementById('split-bill-modal');
    if (modal) modal.style.display = 'none';
    unlockScroll();
}

export function setSplitCount(n) {
    if (!n || n < 2 || n > 10) return;
    var modal = document.getElementById('split-bill-modal');
    if (!modal) return;

    var total = parseInt(modal.dataset.total) || 0;
    var orderId = modal.dataset.orderId || '';
    var perPerson = Math.ceil(total / n);

    var resultDiv = document.getElementById('split-result');
    if (resultDiv) {
        resultDiv.innerHTML = '<div style="background:rgba(212,160,23,0.08);border:1px solid rgba(212,160,23,0.15);border-radius:12px;padding:1rem;text-align:center">' +
            '<div style="font-size:0.85rem;color:#a09080;margin-bottom:0.3rem">Each person pays</div>' +
            '<div style="font-size:1.8rem;font-weight:700;color:#D4A017">Rs.' + perPerson + '</div>' +
            '<div style="font-size:0.75rem;color:#a09080">' + n + ' people x Rs.' + perPerson + ' = Rs.' + (perPerson * n) + '</div>' +
        '</div>';
    }

    // Generate UPI payment links
    var linksDiv = document.getElementById('split-links');
    if (linksDiv) {
        var upiId = '9121004999@upi'; // Restaurant UPI ID
        var html = '<h4 style="color:#D4A017;margin:0.8rem 0 0.5rem;font-size:0.9rem">Share Payment Links</h4>';
        for (var i = 0; i < n; i++) {
            var label = i === 0 ? 'You' : 'Person ' + (i + 1);
            var upiLink = 'upi://pay?pa=' + upiId + '&pn=Amogha%20Cafe&am=' + perPerson + '&tn=Split%20Bill%20' + orderId.slice(-6);
            html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid rgba(255,255,255,0.05)">' +
                '<span style="font-size:0.85rem">' + label + '</span>' +
                '<a href="' + upiLink + '" style="padding:0.3rem 0.8rem;background:linear-gradient(135deg,#D4A017,#B8860B);color:#1a0f08;border-radius:8px;font-weight:700;font-size:0.75rem;text-decoration:none">Pay Rs.' + perPerson + '</a>' +
            '</div>';
        }
        html += '<button onclick="shareSplitBill(' + n + ',' + perPerson + ')" style="width:100%;margin-top:0.8rem;padding:0.5rem;background:linear-gradient(135deg,#25D366,#128C7E);color:#fff;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-size:0.85rem">Share via WhatsApp</button>';
        linksDiv.innerHTML = html;
    }

    // Save split bill info to Firestore
    var db = getDb();
    if (db && orderId) {
        db.collection('orders').doc(orderId).update({
            splitBill: { count: n, perPerson: perPerson, total: total }
        }).catch(function(err) { console.error('Split bill save error:', err); });
    }
}

export function shareSplitBill(count, perPerson) {
    var text = 'Hey! Let\'s split the bill from Amogha Cafe. Each person pays Rs.' + perPerson + ' (' + count + ' ways). Pay via UPI to 9121004999@upi. Thanks!';
    if (navigator.share) {
        navigator.share({ text: text }).catch(function() {});
    } else {
        window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
    }
}

Object.assign(window, {
    openSplitBill,
    closeSplitBill,
    setSplitCount,
    shareSplitBill
});
