import { getCurrentUser } from './auth.js';
import { getDb } from '../core/firebase.js';

// ===== TABLE RESERVATION SYSTEM =====

export function openReservationModal() {
    var modal = document.getElementById('reservation-modal');
    if (!modal) return;

    // Enhance the existing reservation form
    var form = document.getElementById('reservation-form');
    if (!form || form.dataset.enhanced === 'true') {
        modal.style.display = 'block';
        return;
    }
    form.dataset.enhanced = 'true';
    // Replace existing form content with enhanced version
    var today = new Date().toISOString().split('T')[0];
    var maxDate = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    form.innerHTML =
        '<input type="text" id="res-name" placeholder="Your Name" required>' +
        '<input type="tel" id="res-phone" placeholder="Phone Number (10 digits)" required maxlength="10">' +
        '<input type="date" id="res-date" min="' + today + '" max="' + maxDate + '" required>' +
        '<div class="res-time-slots" id="res-time-slots"></div>' +
        '<input type="hidden" id="res-time" value="">' +
        '<div class="res-party-size">' +
            '<label>Party Size</label>' +
            '<div class="party-btns" id="party-btns"></div>' +
        '</div>' +
        '<textarea id="res-requests" placeholder="Special Requests (Optional)" rows="2"></textarea>' +
        '<div id="res-msg" class="auth-msg"></div>' +
        '<button type="submit" class="cta-button">Confirm Reservation</button>';
    // Generate party size buttons
    var partyBtns = document.getElementById('party-btns');
    for (var p = 1; p <= 12; p++) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'party-btn';
        btn.textContent = p;
        btn.dataset.size = p;
        btn.onclick = function() {
            document.querySelectorAll('.party-btn').forEach(function(b) { b.classList.remove('active'); });
            this.classList.add('active');
        };
        partyBtns.appendChild(btn);
    }
    // Time slots generation on date change
    document.getElementById('res-date').addEventListener('change', function() {
        generateTimeSlots(this.value);
    });
    // Override form submit
    form.onsubmit = function(e) {
        e.preventDefault();
        submitReservation();
    };
    // Pre-fill user info
    var user = getCurrentUser();
    if (user) {
        document.getElementById('res-name').value = user.name || '';
        document.getElementById('res-phone').value = user.phone || '';
    }
    modal.style.display = 'block';
}

export function closeReservationModal() {
    var modal = document.getElementById('reservation-modal');
    if (modal) modal.style.display = 'none';
}

export function generateTimeSlots(dateStr) {
    var container = document.getElementById('res-time-slots');
    if (!container) return;
    container.innerHTML = '<label>Select Time</label><div class="time-grid" id="time-grid"></div>';
    var grid = document.getElementById('time-grid');
    var day = new Date(dateStr).getDay();
    var startHour = (day === 0) ? 12 : 11; // Sunday opens at 12
    var endHour = (day === 5 || day === 6) ? 22 : 21; // Fri/Sat close at 22:30, else 21:30
    for (var h = startHour; h <= endHour; h++) {
        for (var m = 0; m < 60; m += 30) {
            if (h === endHour && m > 0) break;
            var timeStr = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
            var displayTime = (h > 12 ? h - 12 : h) + ':' + String(m).padStart(2, '0') + (h >= 12 ? ' PM' : ' AM');
            var slot = document.createElement('button');
            slot.type = 'button';
            slot.className = 'time-slot-btn';
            slot.textContent = displayTime;
            slot.dataset.time = timeStr;
            slot.onclick = function() {
                document.querySelectorAll('.time-slot-btn').forEach(function(b) { b.classList.remove('active'); });
                this.classList.add('active');
                document.getElementById('res-time').value = this.dataset.time;
            };
            grid.appendChild(slot);
        }
    }
}

export function submitReservation() {
    var name = document.getElementById('res-name').value.trim();
    var phone = document.getElementById('res-phone').value.trim();
    var date = document.getElementById('res-date').value;
    var time = document.getElementById('res-time').value;
    var partyBtn = document.querySelector('.party-btn.active');
    var partySize = partyBtn ? parseInt(partyBtn.dataset.size) : 0;
    var requests = document.getElementById('res-requests').value.trim();
    var msg = document.getElementById('res-msg');
    if (!name || !phone || !date || !time || !partySize) {
        msg.textContent = 'Please fill in all required fields.';
        msg.className = 'auth-msg error';
        return;
    }
    if (!/^\d{10}$/.test(phone)) {
        msg.textContent = 'Please enter a valid 10-digit phone number.';
        msg.className = 'auth-msg error';
        return;
    }
    msg.textContent = 'Booking your table...';
    msg.className = 'auth-msg';
    var db = getDb();
    if (!db) {
        msg.textContent = 'Service unavailable. Please refresh and try again.';
        msg.className = 'auth-msg error';
        return;
    }
    var resData = {
        name: name,
        phone: phone,
        date: date,
        time: time,
        partySize: partySize,
        requests: requests,
        status: 'pending',
        createdAt: new Date().toISOString()
    };
    db.collection('reservations').add(resData).then(function(docRef) {
        var form = document.getElementById('reservation-form');
        var displayDate = new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
        var displayTime = time;
        var h = parseInt(time.split(':')[0]);
        var mn = time.split(':')[1];
        displayTime = (h > 12 ? h - 12 : h) + ':' + mn + (h >= 12 ? ' PM' : ' AM');
        form.innerHTML =
            '<div class="res-confirmed">' +
                '<div class="res-check">&#10003;</div>' +
                '<h3>Reservation Confirmed!</h3>' +
                '<p class="res-id">Booking #' + docRef.id.slice(-6).toUpperCase() + '</p>' +
                '<div class="res-details">' +
                    '<p>' + displayDate + ' at ' + displayTime + '</p>' +
                    '<p>' + partySize + ' Guest' + (partySize > 1 ? 's' : '') + '</p>' +
                '</div>' +
                '<a class="whatsapp-btn" href="https://wa.me/919121004999?text=' + encodeURIComponent('Hi Amogha! I have a reservation:\nDate: ' + displayDate + '\nTime: ' + displayTime + '\nGuests: ' + partySize + '\nName: ' + name + '\nBooking: #' + docRef.id.slice(-6).toUpperCase()) + '" target="_blank">Confirm via WhatsApp</a>' +
                '<button class="cta-button" onclick="document.getElementById(\'reservation-modal\').style.display=\'none\'" style="margin-top:1rem">Done</button>' +
            '</div>';
    }).catch(function() {
        msg.textContent = 'Failed to book. Please try again.';
        msg.className = 'auth-msg error';
    });
}

export function initReservations() {
    // Override the reservation button
    var resBtn = document.querySelector('.cta-button.secondary');
    if (resBtn && resBtn.textContent.indexOf('Reserve') !== -1) {
        resBtn.onclick = function() { openReservationModal(); };
    }

    // Reservation form submission (basic fallback)
    var reservationForm = document.getElementById('reservation-form');
    if (reservationForm) {
        reservationForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (typeof showAuthToast === 'function') showAuthToast('Reservation request received! We will confirm shortly.');
            e.target.reset();
            var modal = document.getElementById('reservation-modal');
            if (modal) modal.style.display = 'none';
        });
    }
}

Object.assign(window, { openReservationModal, closeReservationModal, submitReservation });
