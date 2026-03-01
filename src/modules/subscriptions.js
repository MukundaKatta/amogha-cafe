import { getDb } from '../core/firebase.js';
import { getCurrentUser, setCurrentUser } from './auth.js';
import { lockScroll, unlockScroll } from '../core/utils.js';

// ===== SUBSCRIPTION MEAL PLANS =====
// Customers can subscribe to weekly meal plans for discounted pricing.

export function openSubscriptionModal() {
    var user = getCurrentUser();
    if (!user) {
        if (typeof window.openAuthModal === 'function') window.openAuthModal();
        if (typeof window.showAuthToast === 'function') window.showAuthToast('Please sign in to view meal plans');
        return;
    }

    var existing = document.getElementById('subscription-modal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'subscription-modal';
    modal.className = 'modal';
    modal.style.display = 'block';
    lockScroll();

    var db = getDb();
    if (!db) return;

    // Load subscription plans from Firestore
    db.collection('subscriptionPlans').where('active', '==', true).get().then(function(snap) {
        var plans = [];
        snap.forEach(function(doc) {
            var d = doc.data();
            d.id = doc.id;
            plans.push(d);
        });

        if (plans.length === 0) {
            plans = getDefaultPlans();
        }

        renderSubscriptionModal(modal, plans, user);
    }).catch(function() {
        renderSubscriptionModal(modal, getDefaultPlans(), user);
    });
}

function getDefaultPlans() {
    return [
        {
            id: 'lunch-basic',
            name: 'Lunch Basic',
            description: '5 lunches per week (Mon-Fri)',
            mealsPerWeek: 5,
            pricePerMonth: 2499,
            regularPrice: 3500,
            items: ['Chicken Dum Biryani', 'Veg Dum Biryani', 'Dal Tadka + Butter Naan'],
            active: true
        },
        {
            id: 'lunch-premium',
            name: 'Lunch Premium',
            description: '5 lunches + 2 dinners per week',
            mealsPerWeek: 7,
            pricePerMonth: 3999,
            regularPrice: 5600,
            items: ['Chicken Dum Biryani', 'Mutton Dum Biryani', 'Butter Chicken + Naan', 'Paneer Butter Masala + Naan'],
            active: true
        },
        {
            id: 'all-meals',
            name: 'All Meals',
            description: '7 lunches + 7 dinners per week',
            mealsPerWeek: 14,
            pricePerMonth: 6999,
            regularPrice: 9800,
            items: ['Full menu rotation - Chef\'s choice daily'],
            active: true
        }
    ];
}

function renderSubscriptionModal(modal, plans, user) {
    var html = '<div class="modal-content" style="max-width:500px;padding:1.5rem;max-height:85vh;overflow-y:auto">' +
        '<span class="close-modal" onclick="closeSubscriptionModal()">&times;</span>' +
        '<h2 style="color:#D4A017;margin-bottom:0.5rem">Meal Plans</h2>' +
        '<p style="color:#a09080;font-size:0.85rem;margin-bottom:1.2rem">Save up to 30% with weekly subscriptions</p>';

    plans.forEach(function(plan) {
        var savings = plan.regularPrice - plan.pricePerMonth;
        var savingsPercent = Math.round((savings / plan.regularPrice) * 100);
        html += '<div style="background:rgba(212,160,23,0.06);border:1px solid rgba(212,160,23,0.15);border-radius:14px;padding:1.2rem;margin-bottom:1rem">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">' +
                '<h3 style="color:#e8d5b5;margin:0;font-size:1.1rem">' + plan.name + '</h3>' +
                '<span style="background:#D4A017;color:#1a0f08;padding:0.15rem 0.5rem;border-radius:8px;font-size:0.7rem;font-weight:700">Save ' + savingsPercent + '%</span>' +
            '</div>' +
            '<p style="color:#a09080;font-size:0.8rem;margin-bottom:0.6rem">' + plan.description + '</p>' +
            '<div style="display:flex;align-items:baseline;gap:0.5rem;margin-bottom:0.6rem">' +
                '<span style="font-size:1.4rem;font-weight:700;color:#D4A017">Rs.' + plan.pricePerMonth + '</span>' +
                '<span style="color:#a09080;font-size:0.8rem;text-decoration:line-through">Rs.' + plan.regularPrice + '</span>' +
                '<span style="color:#a09080;font-size:0.75rem">/month</span>' +
            '</div>' +
            '<div style="margin-bottom:0.8rem">' +
                '<div style="font-size:0.75rem;color:#a09080;margin-bottom:0.3rem">Includes:</div>' +
                plan.items.map(function(item) {
                    return '<span style="display:inline-block;font-size:0.7rem;padding:0.15rem 0.4rem;border-radius:6px;background:rgba(255,255,255,0.05);color:#e8d5b5;margin:0.1rem">' + item + '</span>';
                }).join(' ') +
            '</div>' +
            '<button onclick="subscribeToPlan(\'' + plan.id + '\')" style="width:100%;padding:0.55rem;background:linear-gradient(135deg,#D4A017,#B8860B);color:#1a0f08;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-size:0.85rem">Subscribe Now</button>' +
        '</div>';
    });

    // Show active subscription if any
    if (user.activeSubscription) {
        html += '<div style="background:rgba(76,175,80,0.08);border:1px solid rgba(76,175,80,0.2);border-radius:14px;padding:1rem;margin-bottom:1rem">' +
            '<h4 style="color:#4CAF50;margin:0 0 0.3rem">Your Active Plan</h4>' +
            '<p style="color:#e8d5b5;font-size:0.85rem">' + user.activeSubscription.planName + '</p>' +
            '<p style="color:#a09080;font-size:0.75rem">Next delivery: ' + (user.activeSubscription.nextDeliveryDate || 'Tomorrow') + '</p>' +
            '<button onclick="cancelSubscription()" style="margin-top:0.5rem;padding:0.4rem 1rem;background:rgba(244,67,54,0.1);color:#f44336;border:1px solid rgba(244,67,54,0.2);border-radius:8px;font-size:0.75rem;cursor:pointer">Cancel Plan</button>' +
        '</div>';
    }

    html += '</div>';
    modal.innerHTML = html;
    document.body.appendChild(modal);
    modal.addEventListener('click', function(e) {
        if (e.target === modal) closeSubscriptionModal();
    });
}

export function closeSubscriptionModal() {
    var modal = document.getElementById('subscription-modal');
    if (modal) modal.style.display = 'none';
    unlockScroll();
}

export function subscribeToPlan(planId) {
    var user = getCurrentUser();
    if (!user) return;

    var plans = getDefaultPlans();
    var plan = plans.find(function(p) { return p.id === planId; });
    if (!plan) return;

    var subscription = {
        planId: planId,
        planName: plan.name,
        userPhone: user.phone,
        userName: user.name,
        status: 'active',
        pricePerMonth: plan.pricePerMonth,
        mealsPerWeek: plan.mealsPerWeek,
        startDate: new Date().toISOString(),
        nextDeliveryDate: getNextWeekday(),
        createdAt: new Date().toISOString()
    };

    var db = getDb();
    if (!db) return;

    db.collection('subscriptions').add(subscription).then(function(docRef) {
        // Update user profile with active subscription
        user.activeSubscription = {
            id: docRef.id,
            planId: planId,
            planName: plan.name,
            nextDeliveryDate: subscription.nextDeliveryDate
        };
        setCurrentUser(user);
        db.collection('users').doc(user.phone).update({
            activeSubscription: user.activeSubscription
        }).catch(function() {});

        closeSubscriptionModal();
        if (typeof window.showAuthToast === 'function') window.showAuthToast('Subscribed to ' + plan.name + '! Your first delivery is on the way.');
    }).catch(function(err) {
        console.error('Subscribe error:', err);
        if (typeof window.showAuthToast === 'function') window.showAuthToast('Failed to subscribe. Please try again.');
    });
}

export function cancelSubscription() {
    var user = getCurrentUser();
    if (!user || !user.activeSubscription) return;

    if (!confirm('Are you sure you want to cancel your meal plan?')) return;

    var db = getDb();
    if (db && user.activeSubscription.id) {
        db.collection('subscriptions').doc(user.activeSubscription.id).update({
            status: 'cancelled',
            cancelledAt: new Date().toISOString()
        }).catch(function() {});
    }

    delete user.activeSubscription;
    setCurrentUser(user);
    if (db) {
        db.collection('users').doc(user.phone).update({
            activeSubscription: null
        }).catch(function() {});
    }

    closeSubscriptionModal();
    if (typeof window.showAuthToast === 'function') window.showAuthToast('Meal plan cancelled.');
}

function getNextWeekday() {
    var d = new Date();
    d.setDate(d.getDate() + 1);
    while (d.getDay() === 0) d.setDate(d.getDate() + 1); // Skip Sundays
    return d.toISOString().split('T')[0];
}

export function initSubscriptions() {
    // No-op — modal opens on demand
}

Object.assign(window, {
    openSubscriptionModal,
    closeSubscriptionModal,
    subscribeToPlan,
    cancelSubscription,
    initSubscriptions
});
