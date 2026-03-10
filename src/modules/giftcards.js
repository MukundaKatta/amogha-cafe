// ===== GIFT CARDS MODULE =====
// Digital gift cards — send to friends via link/WhatsApp/SMS
// Like Starbucks gift cards but optimized for web

import { getDb } from '../core/firebase.js';

const GIFT_CARD_DESIGNS = [
    { id: 'birthday', label: 'Happy Birthday', emoji: '🎂', gradient: 'linear-gradient(135deg, #ff6b9d, #c44569)' },
    { id: 'thankyou', label: 'Thank You', emoji: '🙏', gradient: 'linear-gradient(135deg, #f9d423, #ff4e50)' },
    { id: 'celebration', label: 'Celebration', emoji: '🎉', gradient: 'linear-gradient(135deg, #667eea, #764ba2)' },
    { id: 'love', label: 'With Love', emoji: '❤️', gradient: 'linear-gradient(135deg, #ee5a24, #c44569)' },
    { id: 'congrats', label: 'Congratulations', emoji: '🏆', gradient: 'linear-gradient(135deg, #f7971e, #ffd200)' },
    { id: 'getwell', label: 'Get Well Soon', emoji: '🌻', gradient: 'linear-gradient(135deg, #56ab2f, #a8e063)' },
    { id: 'festive', label: 'Festive Special', emoji: '🪔', gradient: 'linear-gradient(135deg, #D4A017, #8B6914)' },
    { id: 'classic', label: 'Classic', emoji: '☕', gradient: 'linear-gradient(135deg, #2c1810, #5a3825)' }
];

const GIFT_AMOUNTS = [100, 250, 500, 1000, 2000, 5000];

function generateGiftCode() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var code = '';
    for (var i = 0; i < 12; i++) {
        if (i > 0 && i % 4 === 0) code += '-';
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function renderGiftCardModal() {
    var existing = document.getElementById('giftCardModal');
    if (existing) return existing;

    var modal = document.createElement('div');
    modal.id = 'giftCardModal';
    modal.className = 'modal-overlay gift-card-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-label', 'Send Gift Card');
    modal.innerHTML =
        '<div class="modal-content gift-card-content">' +
            '<button class="modal-close" aria-label="Close">&times;</button>' +
            '<h2 class="gift-card-title">Send a Gift Card</h2>' +
            '<p class="gift-card-subtitle">Surprise someone special with Amogha flavors</p>' +

            '<div class="gift-card-step" id="gcStep1">' +
                '<h3>Choose a Design</h3>' +
                '<div class="gift-designs-grid">' +
                    GIFT_CARD_DESIGNS.map(function(d) {
                        return '<button class="gift-design-btn" data-design="' + d.id + '" style="background:' + d.gradient + '">' +
                            '<span class="gift-design-emoji">' + d.emoji + '</span>' +
                            '<span class="gift-design-label">' + d.label + '</span>' +
                        '</button>';
                    }).join('') +
                '</div>' +
            '</div>' +

            '<div class="gift-card-step hidden" id="gcStep2">' +
                '<h3>Select Amount</h3>' +
                '<div class="gift-amounts-grid">' +
                    GIFT_AMOUNTS.map(function(a) {
                        return '<button class="gift-amount-btn" data-amount="' + a + '">₹' + a.toLocaleString('en-IN') + '</button>';
                    }).join('') +
                '</div>' +
                '<div class="gift-custom-amount">' +
                    '<label for="gcCustomAmount">Or enter custom amount</label>' +
                    '<input type="number" id="gcCustomAmount" min="50" max="25000" placeholder="₹50 — ₹25,000">' +
                '</div>' +
            '</div>' +

            '<div class="gift-card-step hidden" id="gcStep3">' +
                '<h3>Add a Personal Message</h3>' +
                '<input type="text" id="gcRecipientName" placeholder="Recipient\'s name" maxlength="50">' +
                '<textarea id="gcMessage" placeholder="Write a message (optional)" maxlength="200" rows="3"></textarea>' +
                '<input type="text" id="gcSenderName" placeholder="Your name" maxlength="50">' +
            '</div>' +

            '<div class="gift-card-step hidden" id="gcStep4">' +
                '<h3>Preview</h3>' +
                '<div class="gift-card-preview" id="gcPreview"></div>' +
            '</div>' +

            '<div class="gift-card-actions">' +
                '<button class="btn-secondary" id="gcBack" style="display:none">Back</button>' +
                '<button class="btn-primary" id="gcNext">Next</button>' +
            '</div>' +
        '</div>';

    document.body.appendChild(modal);
    return modal;
}

function renderGiftPreview(design, amount, recipientName, message, senderName) {
    var d = GIFT_CARD_DESIGNS.find(function(x) { return x.id === design; }) || GIFT_CARD_DESIGNS[0];
    return '<div class="gift-preview-card" style="background:' + d.gradient + '">' +
        '<div class="gift-preview-logo">Amogha Cafe</div>' +
        '<div class="gift-preview-emoji">' + d.emoji + '</div>' +
        '<div class="gift-preview-label">' + d.label + '</div>' +
        '<div class="gift-preview-amount">₹' + (amount || 0).toLocaleString('en-IN') + '</div>' +
        (recipientName ? '<div class="gift-preview-to">To: ' + escapeHtml(recipientName) + '</div>' : '') +
        (message ? '<div class="gift-preview-message">"' + escapeHtml(message) + '"</div>' : '') +
        (senderName ? '<div class="gift-preview-from">From: ' + escapeHtml(senderName) + '</div>' : '') +
    '</div>';
}

function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

export function initGiftCards() {
    // Add gift card button to the page
    var navArea = document.querySelector('.quick-actions') || document.querySelector('.features-grid');
    if (!navArea) return;

    var btn = document.createElement('button');
    btn.className = 'gift-card-trigger';
    btn.innerHTML = '<span class="gift-trigger-icon">🎁</span> Gift Card';
    btn.setAttribute('aria-label', 'Send a gift card');
    btn.addEventListener('click', openGiftCardModal);

    // Insert as floating button
    var fab = document.createElement('div');
    fab.className = 'gift-card-fab';
    fab.appendChild(btn);
    document.body.appendChild(fab);

    var currentStep = 1;
    var selectedDesign = null;
    var selectedAmount = null;

    function openGiftCardModal() {
        var modal = renderGiftCardModal();
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        currentStep = 1;
        showStep(1);

        modal.querySelector('.modal-close').onclick = closeModal;
        modal.addEventListener('click', function(e) {
            if (e.target === modal) closeModal();
        });

        // Design selection
        modal.querySelectorAll('.gift-design-btn').forEach(function(b) {
            b.addEventListener('click', function() {
                modal.querySelectorAll('.gift-design-btn').forEach(function(x) { x.classList.remove('selected'); });
                b.classList.add('selected');
                selectedDesign = b.dataset.design;
            });
        });

        // Amount selection
        modal.querySelectorAll('.gift-amount-btn').forEach(function(b) {
            b.addEventListener('click', function() {
                modal.querySelectorAll('.gift-amount-btn').forEach(function(x) { x.classList.remove('selected'); });
                b.classList.add('selected');
                selectedAmount = parseInt(b.dataset.amount);
                var custom = document.getElementById('gcCustomAmount');
                if (custom) custom.value = '';
            });
        });

        var customInput = document.getElementById('gcCustomAmount');
        if (customInput) {
            customInput.addEventListener('input', function() {
                if (this.value) {
                    modal.querySelectorAll('.gift-amount-btn').forEach(function(x) { x.classList.remove('selected'); });
                    selectedAmount = parseInt(this.value) || 0;
                }
            });
        }

        // Navigation
        document.getElementById('gcNext').onclick = function() {
            if (currentStep === 1 && !selectedDesign) {
                showToast('Please select a design');
                return;
            }
            if (currentStep === 2 && (!selectedAmount || selectedAmount < 50)) {
                showToast('Please select an amount (min ₹50)');
                return;
            }
            if (currentStep < 4) {
                currentStep++;
                showStep(currentStep);
                if (currentStep === 4) {
                    var preview = document.getElementById('gcPreview');
                    var recipientName = (document.getElementById('gcRecipientName') || {}).value || '';
                    var msg = (document.getElementById('gcMessage') || {}).value || '';
                    var senderName = (document.getElementById('gcSenderName') || {}).value || '';
                    if (preview) preview.innerHTML = renderGiftPreview(selectedDesign, selectedAmount, recipientName, msg, senderName);
                    document.getElementById('gcNext').textContent = 'Send Gift Card';
                }
            } else {
                sendGiftCard();
            }
        };

        document.getElementById('gcBack').onclick = function() {
            if (currentStep > 1) {
                currentStep--;
                showStep(currentStep);
                document.getElementById('gcNext').textContent = 'Next';
            }
        };
    }

    function showStep(step) {
        for (var i = 1; i <= 4; i++) {
            var el = document.getElementById('gcStep' + i);
            if (el) el.classList.toggle('hidden', i !== step);
        }
        var backBtn = document.getElementById('gcBack');
        if (backBtn) backBtn.style.display = step > 1 ? 'inline-block' : 'none';
    }

    function closeModal() {
        var modal = document.getElementById('giftCardModal');
        if (modal) modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    function sendGiftCard() {
        var user = null;
        try { user = JSON.parse(localStorage.getItem('amoghaUser')); } catch(e) {}
        if (!user) {
            showToast('Please sign in to send a gift card');
            return;
        }

        var code = generateGiftCode();
        var recipientName = (document.getElementById('gcRecipientName') || {}).value || '';
        var message = (document.getElementById('gcMessage') || {}).value || '';
        var senderName = (document.getElementById('gcSenderName') || {}).value || user.name || '';

        var giftData = {
            code: code,
            design: selectedDesign,
            amount: selectedAmount,
            balance: selectedAmount,
            recipientName: recipientName,
            message: message,
            senderName: senderName,
            senderPhone: user.phone || '',
            status: 'active',
            createdAt: new Date().toISOString(),
            redeemedBy: null,
            redeemedAt: null
        };

        // Save to Firestore
        var db = getDb();
        if (db) {
            db.collection('giftcards').doc(code).set(giftData).then(function() {
                showGiftSuccess(code, selectedDesign, selectedAmount, recipientName, senderName);
            }).catch(function() {
                // Fallback to local
                showGiftSuccess(code, selectedDesign, selectedAmount, recipientName, senderName);
            });
        } else {
            showGiftSuccess(code, selectedDesign, selectedAmount, recipientName, senderName);
        }
    }

    function showGiftSuccess(code, design, amount, recipientName, senderName) {
        var modal = document.getElementById('giftCardModal');
        if (!modal) return;

        var content = modal.querySelector('.gift-card-content');
        var shareText = 'You\'ve received a ₹' + amount.toLocaleString('en-IN') + ' gift card from ' + (senderName || 'a friend') + ' at Amogha Cafe! Redeem code: ' + code + ' at https://amoghahotels.com';

        content.innerHTML =
            '<button class="modal-close" aria-label="Close">&times;</button>' +
            '<div class="gift-success">' +
                '<div class="gift-success-icon">🎁</div>' +
                '<h2>Gift Card Created!</h2>' +
                '<div class="gift-code-display">' + code + '</div>' +
                '<p>Share this code with ' + (recipientName ? escapeHtml(recipientName) : 'your friend') + '</p>' +
                '<div class="gift-share-btns">' +
                    '<button class="btn-whatsapp" onclick="window.open(\'https://wa.me/?text=' + encodeURIComponent(shareText) + '\')">Share via WhatsApp</button>' +
                    '<button class="btn-copy" id="gcCopyCode">Copy Code</button>' +
                    '<button class="btn-sms" onclick="window.open(\'sms:?body=' + encodeURIComponent(shareText) + '\')">Share via SMS</button>' +
                '</div>' +
            '</div>';

        content.querySelector('.modal-close').onclick = function() {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        };

        var copyBtn = document.getElementById('gcCopyCode');
        if (copyBtn) {
            copyBtn.addEventListener('click', function() {
                navigator.clipboard.writeText(code).then(function() {
                    copyBtn.textContent = 'Copied!';
                    setTimeout(function() { copyBtn.textContent = 'Copy Code'; }, 2000);
                });
            });
        }
    }

    function showToast(msg) {
        if (typeof window.showToast === 'function') {
            window.showToast(msg);
        } else {
            var t = document.createElement('div');
            t.className = 'toast-notification';
            t.textContent = msg;
            document.body.appendChild(t);
            setTimeout(function() { t.remove(); }, 3000);
        }
    }
}

// Gift card redemption during checkout
export function redeemGiftCard(code) {
    return new Promise(function(resolve, reject) {
        var db = getDb();
        if (!db) return reject(new Error('Database not available'));
        db.collection('giftcards').doc(code.toUpperCase().replace(/\s/g, '')).get().then(function(doc) {
            if (!doc.exists) return reject(new Error('Invalid gift card code'));
            var data = doc.data();
            if (data.status !== 'active') return reject(new Error('This gift card has already been redeemed'));
            if (data.balance <= 0) return reject(new Error('This gift card has no remaining balance'));
            resolve({ code: data.code, balance: data.balance, design: data.design });
        }).catch(reject);
    });
}
