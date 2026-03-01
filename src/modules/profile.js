import { getCurrentUser, setCurrentUser, showAuthToast } from './auth.js';
import { getDb } from '../core/firebase.js';
import { lockScroll, unlockScroll } from '../core/utils.js';

// ===== CUSTOMER PROFILE MODULE =====

var DIETARY_OPTIONS = ['Vegetarian', 'Vegan', 'Gluten-Free'];
var ALLERGEN_OPTIONS = ['Nuts', 'Dairy', 'Gluten', 'Eggs', 'Soy', 'Shellfish', 'Sesame', 'Fish'];

export function openProfileModal() {
    var user = getCurrentUser();
    if (!user) {
        if (typeof window.openAuthModal === 'function') window.openAuthModal();
        return;
    }

    var modal = document.getElementById('profile-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'profile-modal';
        modal.className = 'modal';
        modal.innerHTML = '<div class="modal-content" style="max-width:520px;max-height:90vh;overflow-y:auto;"></div>';
        document.body.appendChild(modal);
        modal.addEventListener('click', function(e) {
            if (e.target === modal) closeProfileModal();
        });
    }

    var dietaryPrefs = user.dietaryPrefs || [];
    var allergenAlerts = user.allergenAlerts || [];
    var savedAddresses = user.savedAddresses || [];

    var dietaryHTML = DIETARY_OPTIONS.map(function(opt) {
        var checked = dietaryPrefs.indexOf(opt) !== -1 ? ' checked' : '';
        return '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;">' +
            '<input type="checkbox" class="profile-dietary-cb" value="' + opt + '"' + checked + '> ' + opt +
            '</label>';
    }).join('');

    var allergenHTML = ALLERGEN_OPTIONS.map(function(opt) {
        var checked = allergenAlerts.indexOf(opt) !== -1 ? ' checked' : '';
        return '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;">' +
            '<input type="checkbox" class="profile-allergen-cb" value="' + opt + '"' + checked + '> ' + opt +
            '</label>';
    }).join('');

    var addressListHTML = savedAddresses.length > 0
        ? savedAddresses.map(function(addr, i) {
            return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--bg-light,#f9f9f9);border-radius:8px;margin-bottom:6px;">' +
                '<div><strong>' + (addr.label || 'Address') + '</strong><br><span style="font-size:0.9em;color:#666;">' + (addr.address || '') + '</span></div>' +
                '<button onclick="removeAddress(' + i + ')" style="background:none;border:none;color:#e53935;cursor:pointer;font-size:1.2em;" title="Remove">&times;</button>' +
                '</div>';
        }).join('')
        : '<p style="color:#999;font-size:0.9em;">No saved addresses yet.</p>';

    modal.querySelector('.modal-content').innerHTML =
        '<span class="close" onclick="closeProfileModal()">&times;</span>' +
        '<h2 style="margin:0 0 20px;font-size:1.4em;">My Profile</h2>' +

        // Name field
        '<div style="margin-bottom:14px;">' +
            '<label style="font-weight:600;font-size:0.9em;display:block;margin-bottom:4px;">Name</label>' +
            '<input type="text" id="profile-name" value="' + (user.name || '').replace(/"/g, '&quot;') + '" style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:1em;box-sizing:border-box;">' +
        '</div>' +

        // Phone field (read-only)
        '<div style="margin-bottom:14px;">' +
            '<label style="font-weight:600;font-size:0.9em;display:block;margin-bottom:4px;">Phone</label>' +
            '<input type="text" id="profile-phone" value="' + (user.phone || '') + '" readonly style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:1em;box-sizing:border-box;background:#f0f0f0;color:#888;cursor:not-allowed;">' +
        '</div>' +

        // Date of Birth field
        '<div style="margin-bottom:14px;">' +
            '<label style="font-weight:600;font-size:0.9em;display:block;margin-bottom:4px;">Date of Birth</label>' +
            '<input type="date" id="profile-dob" value="' + (user.dob || '') + '" style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:1em;box-sizing:border-box;">' +
        '</div>' +

        // Dietary Preferences
        '<div style="margin-bottom:14px;">' +
            '<label style="font-weight:600;font-size:0.9em;display:block;margin-bottom:8px;">Dietary Preferences</label>' +
            '<div style="display:flex;flex-wrap:wrap;gap:10px;">' + dietaryHTML + '</div>' +
        '</div>' +

        // Allergen Alerts
        '<div style="margin-bottom:14px;">' +
            '<label style="font-weight:600;font-size:0.9em;display:block;margin-bottom:8px;">Allergen Alerts</label>' +
            '<div style="display:flex;flex-wrap:wrap;gap:10px;">' + allergenHTML + '</div>' +
        '</div>' +

        // Saved Addresses
        '<div style="margin-bottom:14px;">' +
            '<label style="font-weight:600;font-size:0.9em;display:block;margin-bottom:8px;">Saved Addresses</label>' +
            '<div id="profile-address-list">' + addressListHTML + '</div>' +
            '<div style="margin-top:10px;padding:12px;border:1px dashed #ccc;border-radius:8px;">' +
                '<div style="display:flex;gap:8px;margin-bottom:8px;">' +
                    '<input type="text" id="profile-addr-label" placeholder="Label (e.g. Home, Office)" style="flex:1;padding:8px 10px;border:1px solid #ddd;border-radius:6px;font-size:0.9em;">' +
                '</div>' +
                '<div style="display:flex;gap:8px;">' +
                    '<input type="text" id="profile-addr-address" placeholder="Full address" style="flex:1;padding:8px 10px;border:1px solid #ddd;border-radius:6px;font-size:0.9em;">' +
                    '<button onclick="addAddress()" style="padding:8px 16px;background:var(--accent,#ff9800);color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;white-space:nowrap;">Add</button>' +
                '</div>' +
            '</div>' +
        '</div>' +

        // Save button
        '<button onclick="saveProfile()" style="width:100%;padding:12px;background:var(--primary,#d4a259);color:#fff;border:none;border-radius:8px;font-size:1.05em;font-weight:600;cursor:pointer;margin-top:6px;">Save Profile</button>';

    modal.style.display = 'block';
    lockScroll();
}

export function closeProfileModal() {
    var modal = document.getElementById('profile-modal');
    if (modal) modal.style.display = 'none';
    unlockScroll();
}

export function saveProfile() {
    var user = getCurrentUser();
    if (!user) return;

    var name = document.getElementById('profile-name').value.trim();
    var dob = document.getElementById('profile-dob').value;

    // Gather dietary preferences
    var dietaryPrefs = [];
    var dietaryCBs = document.querySelectorAll('.profile-dietary-cb:checked');
    for (var i = 0; i < dietaryCBs.length; i++) {
        dietaryPrefs.push(dietaryCBs[i].value);
    }

    // Gather allergen alerts
    var allergenAlerts = [];
    var allergenCBs = document.querySelectorAll('.profile-allergen-cb:checked');
    for (var j = 0; j < allergenCBs.length; j++) {
        allergenAlerts.push(allergenCBs[j].value);
    }

    // Validate name
    if (!name) {
        showAuthToast('Please enter your name.');
        return;
    }

    // Update user object
    user.name = name;
    user.dob = dob;
    user.dietaryPrefs = dietaryPrefs;
    user.allergenAlerts = allergenAlerts;

    // Save to localStorage
    setCurrentUser(user);

    // Save to Firestore
    var db = getDb();
    if (db && user.phone) {
        db.collection('users').doc(user.phone).update({
            name: name,
            dob: dob,
            dietaryPrefs: dietaryPrefs,
            allergenAlerts: allergenAlerts,
            savedAddresses: user.savedAddresses || []
        }).then(function() {
            showAuthToast('Profile updated!');
            closeProfileModal();
            // Update the sign-in button to reflect name change
            if (typeof window.updateSignInUI === 'function') window.updateSignInUI(user);
        }).catch(function(err) {
            console.error('Profile save error:', err);
            showAuthToast('Profile saved locally. Sync failed.');
            closeProfileModal();
        });
    } else {
        showAuthToast('Profile updated!');
        closeProfileModal();
    }
}

export function addAddress() {
    var user = getCurrentUser();
    if (!user) return;

    var labelInput = document.getElementById('profile-addr-label');
    var addressInput = document.getElementById('profile-addr-address');
    var label = labelInput.value.trim();
    var address = addressInput.value.trim();

    if (!address) {
        showAuthToast('Please enter an address.');
        return;
    }

    if (!user.savedAddresses) user.savedAddresses = [];
    user.savedAddresses.push({
        label: label || 'Address',
        address: address
    });

    setCurrentUser(user);

    // Re-render the modal to show updated addresses
    openProfileModal();
}

export function removeAddress(index) {
    var user = getCurrentUser();
    if (!user || !user.savedAddresses) return;

    user.savedAddresses.splice(index, 1);
    setCurrentUser(user);

    // Re-render the modal to show updated addresses
    openProfileModal();
}

export function initProfile() {
    // Placeholder for future profile initialization logic
}

Object.assign(window, { openProfileModal, saveProfile, closeProfileModal, addAddress, removeAddress });
